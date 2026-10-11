import { chromium, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { selectCharacter } from "./menu_picker_helpers.mjs";

const url =
  process.env.ABYSSAL_PREVIEW_URL ||
  process.env.ABYSSAL_DEV_URL ||
  "http://127.0.0.1:5188/";
const out = process.env.ABYSSAL_REVIEW_OUT || ".local/zombie_companion_review";
const engine = process.env.ABYSSAL_BROWSER_ENGINE || "chrome";
await mkdir(out, { recursive: true });
const report = {
  url,
  engine,
  cases: [],
  errors: [],
  limits: [
    "Native desktop browser with touch emulation, not a physical phone.",
    "DEV food/lord fixtures isolate contact and settlement; compiled cases use native controls without debug hooks.",
  ],
};
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  ...(engine === "webkit" ? {} : { channel: "chrome" }),
  headless: false,
});
let page;
async function press(touch) {
  await page
    .locator(touch ? "#touch-sonar" : "#sonar-control")
    [touch ? "tap" : "click"]();
}
async function snapshot() {
  return page.evaluate(() => {
    const g = window.__ABYSSAL__;
    return {
      button: document.querySelector("#sonar-control").textContent,
      touch: document.querySelector("#touch-sonar-status").textContent,
      disabled: document.querySelector("#touch-sonar").disabled,
      width: innerWidth,
      height: innerHeight,
      scroll: document.documentElement.scrollWidth,
      scale: visualViewport.scale,
      ...(g
        ? {
            minion: g.minion.snapshot(),
            elapsed: g.player.elapsed,
            eaten: g.player.eaten,
            length: g.player.length,
            vitals: [g.player.health, g.player.stamina, g.player.hunger],
            boss: window.__testBoss
              ? {
                  health: window.__testBoss.state.health,
                  hits: window.__testBoss.state.validatedHits,
                }
              : null,
          }
        : {}),
    };
  });
}
try {
  for (const [language, width] of [
    ["zh-CN", 1440],
    ["en", 320],
    ["zh-CN", 390],
  ]) {
    const touch = width < 500;
    page = await browser.newPage({
      viewport: { width, height: width === 320 ? 568 : touch ? 667 : 900 },
      hasTouch: touch,
      isMobile: touch,
    });
    page.setDefaultTimeout(30000);
    page.on("pageerror", (e) => report.errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction(
      () => document.querySelector("#region-loading").hidden,
    );
    await page.locator("[data-language-select]").selectOption(language);
    await selectCharacter(page, "zombie_shark");
    await page.locator("#start")[touch ? "tap" : "click"]();
    await page.waitForFunction(
      () =>
        !document.body.classList.contains("launching") &&
        !document.querySelector("#hud").inert &&
        !document.querySelector("#pause").hidden,
    );
    const dev = await page.evaluate(() => !!window.__ABYSSAL__);
    if (process.env.ABYSSAL_PREVIEW_URL)
      assert.equal(dev, false, "compiled preview must not expose fixtures");
    if (dev)
      await page.evaluate(() => {
        const g = window.__ABYSSAL__;
        g.setPosition(0, -50, -80);
        g.setFacing(0);
        g.player.invulnerable = 999;
        for (const e of g.entities) {
          e.hiddenFor = 9999;
          e.mesh.visible = false;
        }
      });
    const initial = await snapshot();
    if (dev) assert.equal(initial.length, 3);
    await press(touch);
    const box = await page
      .locator(touch ? "#touch-sonar" : "#sonar-control")
      .boundingBox();
    // Trusted raw taps on the now-disabled button: locator.tap would wait until re-enabled.
    for (let i = 0; i < 2; i++) {
      if (touch)
        await page.touchscreen.tap(
          box.x + box.width / 2,
          box.y + box.height / 2,
        );
      else await page.keyboard.press("KeyJ");
    }
    const protectedState = await snapshot();
    assert.equal(protectedState.disabled, true);
    if (dev) {
      assert.equal(protectedState.minion.alive, true);
      assert.equal(protectedState.minion.commanded, false);
      assert.equal(
        protectedState.minion.state.activeUntil -
          protectedState.minion.state.activatedAt,
        60,
      );
    }
    await page.locator("#pause").click();
    const paused = await snapshot();
    await page.waitForTimeout(1100);
    const pausedLater = await snapshot();
    if (dev) {
      assert.deepEqual(pausedLater.minion, paused.minion);
      assert.equal(pausedLater.elapsed, paused.elapsed);
    }
    await page.locator("#resume").click();
    await page.waitForFunction(
      () => !document.querySelector("#touch-sonar").disabled,
    );
    const ready = await snapshot();
    if (dev)
      assert.equal(
        ready.minion.commanded,
        false,
        "early taps must not queue a command",
      );
    assert.ok(ready.scroll <= ready.width + 1);
    assert.ok(Math.abs(ready.scale - 1) < 0.01);
    await page.screenshot({ path: `${out}/ready_${language}_${width}.png` });
    const item = {
      language,
      width,
      dev,
      initial,
      protectedState,
      paused,
      ready,
    };
    if (dev) {
      await press(touch);
      await page.waitForFunction(() =>
        /No nearby target|附近没有可追击目标/.test(
          document.querySelector("#notification").textContent,
        ),
      );
      assert.equal((await snapshot()).minion.commanded, false);
      // Reposition one actual ordinary creature for an equal-owner-size contact regression.
      // The existing AI/movement/feeding and reward code still run normally.
      await page.evaluate(() => {
        const g = window.__ABYSSAL__,
          e = g.entities.find((e) => e.species.kind === "tuna");
        e.species = { ...e.species, length: 3, nutrition: 30, growth: 2 };
        e.mesh.scale.setScalar(3);
        e.hiddenFor = 0;
        e.mesh.visible = true;
        e.velocity.set(0, 0, 0);
        e.chase = 0;
        e.mesh.position.copy(g.minion.mesh.position).add({ x: 7, y: 0, z: -4 });
        window.__testFood = e;
      });
      await page.waitForFunction(
        () => window.__ABYSSAL__.player.eaten >= 1,
        null,
        { timeout: 15000 },
      );
      item.meal = await snapshot();
      assert.ok(item.meal.length > 3);
      assert.equal(item.meal.minion.meals, 1);
      assert.ok(item.meal.vitals[1] > 50);
      await page.locator("#pause").click();
      await page.evaluate(() => {
        const g = window.__ABYSSAL__;
        g.minion.reset();
        for (const e of g.entities) {
          e.hiddenFor = 9999;
          e.mesh.visible = false;
        }
        const b = g.encounters.bosses.find((b) => b.enabled);
        window.__testBoss = b;
        g.setLength(25);
        g.setPosition(
          b.mesh.position.x + 25,
          b.mesh.position.y,
          b.mesh.position.z + 22,
        );
        g.setFacing(0);
        g.player.health = g.player.stamina = g.player.hunger = 150;
        g.player.invulnerable = 999;
      });
      await page.locator("#resume").click();
      await press(touch);
      await page.waitForFunction(
        () => !document.querySelector("#touch-sonar").disabled,
      );
      await page.evaluate(() => {
        const g = window.__ABYSSAL__,
          b = window.__testBoss;
        b.mesh.position
          .copy(g.minion.mesh.position)
          .add({ x: 0, y: 0, z: -22 });
        b.home.copy(b.mesh.position);
        const stay = g.minion.mesh.position.clone().add({ x: 0, y: 0, z: 30 });
        g.setPosition(stay.x, stay.y, stay.z);
        g.setFacing(Math.PI);
        g.player.biteCooldown = 0;
        b.state.validatedHits = 0;
        b.state.health = b.state.maxHealth;
        // Stage one available recovery opening. The actual lord motion and body resolver remain active.
        b.state.phase = "recover";
        b.state.timer = 0;
        b.state.phaseDuration = 8;
        b.state.openingSpent = false;
        b.state.biteCooldown = 0;
        const small = g.entities.find(
          (e) => e !== window.__testFood && e.species.length < 1,
        );
        small.hiddenFor = 0;
        small.mesh.visible = true;
        small.mesh.position
          .copy(g.minion.mesh.position)
          .add({ x: 1, y: 0, z: 0 });
      });
      item.lordBefore = await snapshot();
      await press(touch);
      item.lordCommand = await snapshot();
      report.pending = item;
      await page.waitForFunction(
        () =>
          window.__testBoss.state.validatedHits === 1 &&
          !window.__ABYSSAL__.minion.active,
        null,
        { timeout: 10000 },
      );
      item.lordHit = await snapshot();
      assert.equal(item.lordHit.minion.alive, false);
      assert.equal(item.lordHit.boss.hits, 1);
      await page.screenshot({
        path: `${out}/lord_hit_${language}_${width}.png`,
      });
      // No post-blast cooldown; another summon pays again and gets a fresh protection.
      await press(touch);
      item.recast = await snapshot();
      assert.equal(item.recast.minion.alive, true);
      assert.equal(item.recast.disabled, true);
    }
    await page.locator("#pause").click();
    await page.locator("#return-menu").click();
    if (dev)
      assert.equal(
        await page.evaluate(() => window.__ABYSSAL__.minion.active),
        false,
      );
    await page.locator("#open-guide").click();
    await page.locator('[data-category="player"]').click();
    await page.locator('.guide-entry[data-kind="zombie_shark"]').click();
    const guide = await page.locator(".guide-info").innerText();
    assert.match(guide, language === "en" ? /first 2s/ : /前2秒/);
    assert.match(
      guide,
      language === "en" ? /minimum ceiling of 3 m/ : /3米（含）/,
    );
    if (language === "en") assert.equal(/[\u3400-\u9fff]/u.test(guide), false);
    await page.screenshot({ path: `${out}/guide_${language}_${width}.png` });
    item.guide = guide;
    report.cases.push(item);
    await page.close();
  }
  assert.deepEqual(report.errors, []);
  report.completed = true;
} catch (e) {
  report.error = e.stack;
  report.failedState = await snapshot().catch(() => null);
  process.exitCode = 1;
  await page?.screenshot({ path: `${out}/failed.png` }).catch(() => {});
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      completed: report.completed,
      cases: report.cases.length,
      errors: report.errors,
      error: report.error,
    }),
  );
}
