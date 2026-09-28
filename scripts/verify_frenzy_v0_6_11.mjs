import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// 隔离、定位真实猎物后，捕食、吸引、成长与特效均由游戏主循环推进。
const url = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178/";
const directory = ".local/frenzy_verification";
await mkdir(directory, { recursive: true });
const report = {
  at: new Date().toISOString(),
  checks: [],
  errors: [],
  screenshots: [],
  limits: [
    "Controlled prey and pickup positioning; no natural encounter or full-round balance claim.",
    "Chrome viewport/touch emulation; no physical-phone performance claim.",
  ],
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
let page;
async function capture(name) {
  const path = `${directory}/${name}.png`;
  await page.screenshot({ path });
  report.screenshots.push(path);
}
try {
  for (const [character, width, height] of [
    ["orca", 1440, 900],
    ["squid", 1440, 900],
    ["orca", 390, 667],
    ["squid", 320, 568],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      locale: "en-US",
      reducedMotion: "reduce",
      isMobile: width < 900,
      hasTouch: width < 900,
    });
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (e) => report.errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") report.errors.push(m.text());
    });
    await page.goto(url);
    await page.waitForFunction(() => window.__ABYSSAL__);
    await page.locator("#character-select").selectOption(character);
    await page.click("#start");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      g.entities.forEach((e) => (e.hiddenFor = 999));
      g.encounters.bosses.forEach((b) => (b.enabled = false));
      const pickup = g.pickups.find((p) => p.id === "nursery_frenzy");
      if (!pickup) throw new Error("Missing fixed nursery Frenzy pickup");
      g.setPosition(
        pickup.mesh.position.x,
        pickup.mesh.position.y,
        pickup.mesh.position.z,
      );
    });
    await page.waitForFunction(
      () => window.__ABYSSAL__.player.buffs.frenzy > 28,
    );
    const pickup = await page.evaluate(() => ({
      length: window.__ABYSSAL__.player.length,
      mass: window.__ABYSSAL__.player.mass,
    }));
    assert.deepEqual(pickup, { length: 3, mass: 0.125 });
    if (width >= 900) await page.keyboard.down("KeyK");
    const staged = await page.evaluate(async () => {
      const g = window.__ABYSSAL__;
      const { preyCaptureRadius, frenzyReachBonus } = await import(
        "/src/prey_capture.js"
      );
      const { consumePrey, createPlayer, canEat } = await import(
        "/src/simulation.js"
      );
      g.setPosition(180, -18, -20);
      g.setFacing(0);
      const e = g.entities.find((e) => e.species.kind === "fish");
      e.hiddenFor = 0;
      e.mesh.visible = true;
      e.velocity.set(0, 0, 0);
      e.chase = 0;
      e.school = null;
      const mouth = g.getCapturePoint();
      const normal = preyCaptureRadius(3, e.species.length, false, false);
      const buffed = preyCaptureRadius(3, e.species.length, false, true);
      const distance = buffed + frenzyReachBonus(3) * 0.62;
      e.mesh.position.copy(mouth).add({ x: distance, y: 0, z: 0 });
      const baseline = createPlayer(g.player.characterId);
      consumePrey(baseline, e.species);
      return {
        normal,
        buffed,
        distance,
        expectedMass: baseline.mass,
        largerPreyEdible: canEat(g.player, 6.4),
      };
    });
    assert.ok(staged.distance > staged.normal + 1);
    assert.equal(staged.largerPreyEdible, false);
    await page.waitForFunction(
      () => window.__ABYSSAL__.player.eaten === 1,
      {},
      { timeout: 7000 },
    );
    const meal = await page.evaluate(() => ({
      length: window.__ABYSSAL__.player.length,
      mass: window.__ABYSSAL__.player.mass,
      eaten: window.__ABYSSAL__.player.eaten,
      effect: window.__ABYSSAL__.frenzyEffect.root.visible,
    }));
    assert.ok(Math.abs(meal.mass - staged.expectedMass) < 1e-8);
    assert.equal(meal.effect, true);
    await capture(`${character}_${width}_frenzy`);
    assert.match(await page.locator("#buffs").innerText(), /Frenzy.*Suction/);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.keyboard.press("KeyP");
    const frozen = await page.evaluate(() =>
      JSON.stringify(window.__ABYSSAL__.player),
    );
    await page.waitForTimeout(180);
    assert.equal(
      await page.evaluate(() => JSON.stringify(window.__ABYSSAL__.player)),
      frozen,
    );
    await page.keyboard.press("KeyP");
    // 只缩短等待到期，仍走实际计时与淡出，不直接隐藏效果。
    await page.evaluate(() => (window.__ABYSSAL__.player.buffs.frenzy = 0.04));
    await page.waitForFunction(
      () =>
        window.__ABYSSAL__.player.buffs.frenzy === 0 &&
        !window.__ABYSSAL__.frenzyEffect.root.visible,
    );
    const expired = await page.evaluate(() => ({
      mass: window.__ABYSSAL__.player.mass,
      length: window.__ABYSSAL__.player.length,
      effect: window.__ABYSSAL__.frenzyEffect.root.visible,
    }));
    assert.equal(expired.mass, meal.mass);
    assert.equal(expired.length, meal.length);
    assert.equal(expired.effect, false);
    await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      g.setLength(26);
      g.collectPickup("frenzy");
    });
    const mature = await page.evaluate(async () => {
      const { canEat } = await import("/src/simulation.js");
      const g = window.__ABYSSAL__;
      return { length: g.player.length, tooLarge: canEat(g.player, 26.01) };
    });
    assert.deepEqual(mature, { length: 26, tooLarge: false });
    await page.evaluate(() => window.__ABYSSAL__.startGame());
    assert.deepEqual(
      await page.evaluate(() => ({
        buff: window.__ABYSSAL__.player.buffs.frenzy,
        effect: window.__ABYSSAL__.frenzyEffect.root.visible,
      })),
      { buff: 0, effect: false },
    );
    if (width >= 900) await page.keyboard.up("KeyK");
    report.checks.push({
      character,
      viewport: { width, height },
      pickup,
      staged,
      meal,
      expired,
      mature,
      pauseFrozen: true,
      restartCleared: true,
    });
    await context.close();
  }
  const context = await browser.newContext({
    viewport: { width: 390, height: 667 },
    locale: "en-US",
  });
  page = await context.newPage();
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__ABYSSAL__);
  for (const locale of ["en", "zh-CN"]) {
    await page.locator("header [data-language-select]").selectOption(locale);
    await page.click("#open-guide");
    await page.fill("#guide-search", locale === "en" ? "Frenzy" : "狂食");
    await page.locator('[data-catalog-id="reward_frenzy"]').click();
    const info = await page.locator(".guide-info").innerText();
    assert.match(info, locale === "en" ? /does not enlarge/ : /不会临时变大/);
    assert.equal(
      /1\.6|21\s?m|24\s?m|消化储备|digestion reserve/.test(info),
      false,
    );
    if (locale === "en") assert.equal(/[\u3400-\u9fff]/u.test(info), false);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await capture(`guide_${locale}`);
    await page.click(".guide-close");
    report.checks.push({ guideLocale: locale, suctionOnlyCopy: true });
  }
  await context.close();
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (e) {
  report.passed = false;
  report.failure = String(e.stack || e);
  process.exitCode = 1;
  if (page && !page.isClosed()) {
    await capture("failure").catch(() => {});
    report.lastState = await page
      .evaluate(() => ({
        mode: window.__ABYSSAL__?.mode,
        text: document.body.innerText.slice(-1000),
      }))
      .catch(() => null);
  }
} finally {
  await browser.close();
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(JSON.stringify(report, null, 2));
