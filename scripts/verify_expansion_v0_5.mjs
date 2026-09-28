import { selectCharacter } from "./menu_picker_helpers.mjs";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

// 开发接口仅用于布置确定场景，技能、移动、碰撞、拾取和伤害由真实主循环驱动。
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(25000);
const checks = [],
  errors = [],
  measurements = {};
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const isolate = async (length = 6) =>
  page.evaluate((length) => {
    const g = window.__ABYSSAL__;
    g.startGame();
    g.setLength(length);
    g.setFacing(0);
    g.setPosition(180, -100, -400);
    g.entities.forEach((e) => (e.hiddenFor = 999));
    g.encounters.bosses.forEach((b) => (b.enabled = false));
    g.player.invulnerable = 999;
  }, length);
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178/");
  await page.waitForFunction(() => window.__ABYSSAL__);
  await page.click("#quality");
  await page.click("#open-guide");
  assert.equal(await page.locator(".guide-entry").count(), 35);
  for (const [category, count] of [
    ["player", 2],
    ["hunter", 5],
    ["ancient", 6],
    ["human", 4],
    ["reward", 3],
  ]) {
    await page.click(`[data-category="${category}"]`);
    assert.equal(await page.locator(".guide-entry").count(), count);
  }
  await page.click('[data-category="player"]');
  await page.locator(".guide-entry").filter({ hasText: "大王乌贼" }).click();
  assert.match(await page.locator(".guide-info").innerText(), /主动/);
  assert.match(await page.locator(".guide-info").innerText(), /被动/);
  assert.equal(
    await page.locator('.guide-entry[aria-pressed="true"]').count(),
    1,
  );
  assert.equal(
    await page
      .locator('.guide-entry[aria-pressed="true"]')
      .getAttribute("data-catalog-id"),
    "player_squid",
  );
  await page.waitForTimeout(220);
  await page.screenshot({ path: ".local/v5_guide_squid.png" });
  await page.click('[data-category="ancient"]');
  await page.locator(".guide-entry").filter({ hasText: "沧龙" }).click();
  await page.screenshot({ path: ".local/v5_guide_ancient.png" });
  await page.click(".guide-close");
  checks.push(
    "35 guide records include two playable characters, six ancient giants and human activity",
  );

  await selectCharacter(page, "squid");
  assert.match(await page.locator(".specimen strong").innerText(), /大王乌贼/);
  await page.click("#start");
  await isolate();
  assert.equal(
    await page.evaluate(
      () =>
        window.__ABYSSAL__.entities.filter((e) => e.species.kind === "squid")
          .length,
    ),
    0,
  );
  assert.equal(
    await page.evaluate(
      () =>
        window.__ABYSSAL__.entities.filter((e) => e.species.kind === "octopus")
          .length,
    ),
    5,
  );
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.avatar.name),
    "creature_squid",
  );
  await page.keyboard.down("KeyS");
  await page.waitForFunction(() => window.__ABYSSAL__.controls.pitch < -1.4);
  await page.keyboard.up("KeyS");
  measurements.squidPitch = await page.evaluate(
    () => window.__ABYSSAL__.controls.pitch,
  );
  const heldPitch = measurements.squidPitch;
  await page.waitForTimeout(400);
  assert.ok(
    Math.abs(
      (await page.evaluate(() => window.__ABYSSAL__.controls.pitch)) -
        heldPitch,
    ) < 1e-7,
    "Releasing vertical input must hold the current dive angle",
  );
  await page.keyboard.down("Space");
  await page.waitForFunction(() => window.__ABYSSAL__.controls.speed > 25);
  assert.ok(
    Math.abs(
      (await page.evaluate(() => window.__ABYSSAL__.controls.pitch)) -
        heldPitch,
    ) < 1e-7,
    "Sprinting must retain the near-vertical angle instead of forcing it back to 49 degrees",
  );
  await page.keyboard.up("Space");
  checks.push(
    "Squid reaches near-vertical diving and retains the chosen angle after release and during sprint",
  );

  await isolate();
  await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      e = g.entities.find((e) => e.species.kind === "sperm_whale");
    e.hiddenFor = 0;
    e.mesh.position.copy(g.position);
    e.mesh.position.z += 34;
    e.chase = 4;
    window.__inkHunter = e;
  });
  await page.waitForFunction(
    () =>
      window.__inkHunter.chase > 0 &&
      document.querySelector("#threat").hidden === false,
  );
  const beforeInk = await page.evaluate(() => ({
    position: window.__ABYSSAL__.position.toArray(),
    hunter: window.__inkHunter.mesh.position.toArray(),
  }));
  await page.keyboard.press("KeyJ");
  await page.waitForFunction(
    () =>
      window.__inkHunter.disorientedUntil > window.__ABYSSAL__.player.elapsed,
  );
  const hunterFrozen = await page.evaluate(() =>
    window.__inkHunter.mesh.position.toArray(),
  );
  assert.equal(await page.locator("#sonar-control").isDisabled(), true);
  await page.waitForFunction(
    () =>
      window.__ABYSSAL__.player.elapsed >=
      window.__ABYSSAL__.inkAbility.jetUntil,
  );
  const afterInk = await page.evaluate(() => ({
    position: window.__ABYSSAL__.position.toArray(),
    hunter: window.__inkHunter.mesh.position.toArray(),
    until: window.__inkHunter.disorientedUntil,
    now: window.__ABYSSAL__.player.elapsed,
  }));
  assert.ok(
    Math.hypot(...afterInk.position.map((v, i) => v - beforeInk.position[i])) >
      20,
  );
  assert.deepEqual(afterInk.hunter, hunterFrozen);
  await page.keyboard.press("KeyP");
  const paused = await page.evaluate(() => window.__ABYSSAL__.player.elapsed);
  await page.waitForTimeout(300);
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.player.elapsed),
    paused,
  );
  await page.click("#resume");
  await page.screenshot({ path: ".local/v5_ink_escape.png" });
  await page.waitForFunction(
    () =>
      window.__ABYSSAL__.player.elapsed >=
      window.__inkHunter.disorientedUntil + 0.3,
  );
  const afterRecovery = await page.evaluate(() =>
    window.__inkHunter.mesh.position.toArray(),
  );
  assert.ok(
    Math.hypot(...afterRecovery.map((v, i) => v - hunterFrozen[i])) > 0.02,
  );
  assert.equal(await page.locator("#sonar-control").isDisabled(), true);
  measurements.ink = { beforeInk, afterInk, afterRecovery };
  checks.push(
    "J ink freezes a real chasing hunter for ten active seconds, jets forward and keeps cooldown after pause",
  );

  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.startGame();
    g.setPosition(150, -8, -300);
    g.setFacing(0);
    g.entities.forEach((e) => (e.hiddenFor = 999));
    g.encounters.bosses.forEach((b) => (b.enabled = false));
    const e = g.entities.find((e) => e.species.kind === "flying_fish");
    e.hiddenFor = 0;
    e.mesh.position.copy(g.position);
    e.mesh.position.x += 16;
    e.mesh.position.y = -3;
    e.flightReadyAt = 0;
    window.__flyingFish = e;
  });
  await page.waitForFunction(() => window.__flyingFish.mesh.position.y > 5);
  assert.equal(await page.evaluate(() => !!window.__flyingFish.flight), true);
  await page.screenshot({ path: ".local/v5_flying_fish.png" });
  await page.waitForFunction(
    () =>
      !window.__flyingFish.flight && window.__flyingFish.mesh.position.y < 0,
  );
  checks.push(
    "Approached flying fish breaches, glides above the surface and returns underwater",
  );

  await isolate(10);
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    window.__sub = g.humans.submarines[0];
    // 使用生成的真实艇壳，沿其横向撞击；不改耐久或直接调用伤害函数。
    const p = window.__sub.mesh.position;
    g.setFacing(Math.PI / 2);
    g.setPosition(p.x + 55, p.y, p.z);
  });
  await page.keyboard.down("Space");
  for (let hit = 0; hit < 3; hit++) {
    if (hit > 0) {
      await page.evaluate(() => {
        const g = window.__ABYSSAL__,
          p = window.__sub.mesh.position;
        g.setFacing(Math.PI / 2);
        g.setPosition(p.x + 55, p.y, p.z);
      });
      await page.waitForFunction(() => window.__sub.state.armed);
    }
    await page.waitForFunction(
      (expected) => window.__sub.state.health === expected,
      2 - hit,
      { timeout: 25000 },
    );
    if (hit === 0) {
      await page.waitForTimeout(650);
      assert.equal(await page.evaluate(() => window.__sub.state.health), 2);
      await page.screenshot({ path: ".local/v5_submarine_impact.png" });
    }
  }
  await page.keyboard.up("Space");
  assert.equal(await page.evaluate(() => window.__sub.state.destroyed), true);
  assert.equal(
    await page.evaluate(() =>
      window.__ABYSSAL__.humans.colliders.includes(window.__sub.collider),
    ),
    false,
  );
  const rescued = await page.evaluate(
    () =>
      window.__ABYSSAL__.humans.entities.filter(
        (e) => e.alive && e.protectedUntil > 0,
      ).length,
  );
  assert.equal(rescued, 3);
  await page.screenshot({ path: ".local/v5_submarine_divers.png" });
  checks.push(
    "Three real sprint impacts break the hull, holding contact cannot multi-hit, three divers are released",
  );

  await isolate();
  await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      h = g.humans.hazards[0];
    g.player.invulnerable = 0;
    g.player.health = 100;
    g.setPosition(h.mesh.position.x, h.mesh.position.y, h.mesh.position.z + 3);
    window.__torpedo = h;
  });
  await page.waitForFunction(() => !window.__torpedo.active);
  assert.equal(await page.evaluate(() => window.__ABYSSAL__.player.health), 72);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__ABYSSAL__.player.health), 72);
  await page.screenshot({ path: ".local/v5_torpedo.png" });
  checks.push(
    "Contact torpedo explodes once for 28 health and cannot repeatedly damage the player",
  );
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.startGame();
    g.entities.forEach((e) => (e.hiddenFor = 999));
    g.encounters.bosses.forEach((b) => (b.enabled = false));
    const diver = g.humans.entities.find((e) => e.kind === "diver" && e.alive);
    g.player.health = 50;
    g.setPosition(
      diver.mesh.position.x,
      diver.mesh.position.y,
      diver.mesh.position.z,
    );
    window.__diver = diver;
  });
  await page.waitForFunction(() => !window.__diver.alive);
  assert.ok((await page.evaluate(() => window.__ABYSSAL__.player.health)) > 50);
  checks.push(
    "Actual diver contact feeds and heals using the normal nutrition rules",
  );

  // 独立窄屏上下文避免桌面输入状态污染触屏验证。
  await page.close();
  for (const viewport of [
    { width: 390, height: 667 },
    { width: 320, height: 568 },
  ]) {
    const mobile = await browser.newPage({
      viewport,
      hasTouch: true,
      isMobile: true,
    });
    mobile.on("pageerror", (e) => errors.push(e.message));
    await mobile.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178/");
    await mobile.waitForFunction(() => window.__ABYSSAL__);
    await selectCharacter(mobile, "squid");
    await mobile.click("#open-guide");
    await mobile.click('[data-category="ancient"]');
    const size = await mobile
      .locator(".guide-content")
      .evaluate((e) => ({ scroll: e.scrollWidth, width: e.clientWidth }));
    assert.ok(size.scroll <= size.width + 1);
    await mobile.screenshot({
      path: `.local/v5_mobile_guide_${viewport.width}.png`,
    });
    await mobile.click(".guide-close");
    await mobile.click("#quality");
    await mobile.locator("#start").tap();
    await mobile.locator("#touch-sonar").tap();
    assert.equal(
      await mobile.locator("#touch-sonar").getAttribute("data-skill"),
      "ink",
    );
    assert.equal(await mobile.locator("#touch-sonar").isDisabled(), true);
    await mobile.screenshot({
      path: `.local/v5_mobile_squid_${viewport.width}.png`,
    });
    await mobile.close();
  }
  checks.push(
    "390px and 320px guide fits; the mobile skill changes to ink with disabled countdown",
  );
  assert.deepEqual(errors, []);
  const result = { checks, measurements, errors };
  await writeFile(
    ".local/v5_expansion_results.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  if (!page.isClosed()) {
    console.log(
      await page.evaluate(() => ({
        mode: window.__ABYSSAL__?.mode,
        player: window.__ABYSSAL__?.player,
        position: window.__ABYSSAL__?.position,
        controls: window.__ABYSSAL__?.controls,
        sub: window.__sub?.state,
        errors: document.querySelector("#loading")?.textContent,
      })),
    );
    await page.screenshot({ path: ".local/v5_expansion_failure.png" });
  }
  throw error;
} finally {
  await browser.close();
}
