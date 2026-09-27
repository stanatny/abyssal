import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// 借助开发接口设置确定场景，技能、吞食、遮蔽和清理由真实主循环执行。
await mkdir(".local", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(30000);
// 观察图鉴自己的渲染器，验证重复选取和打开不会累积缓冲区或动画循环。
await page.addInitScript(() => {
  window.__feedbackBuffers = [];
  window.__feedbackGuideFrames = {};
  const prototype = WebGL2RenderingContext.prototype;
  const createBuffer = prototype.createBuffer;
  const deleteBuffer = prototype.deleteBuffer;
  const stats = (context) => {
    let value = window.__feedbackBuffers.find(
      (entry) => entry.canvas === context.canvas,
    );
    if (!value) {
      value = { canvas: context.canvas, created: 0, deleted: 0 };
      window.__feedbackBuffers.push(value);
    }
    return value;
  };
  prototype.createBuffer = function (...args) {
    stats(this).created++;
    return createBuffer.apply(this, args);
  };
  prototype.deleteBuffer = function (...args) {
    stats(this).deleted++;
    return deleteBuffer.apply(this, args);
  };
  const request = window.requestAnimationFrame;
  const guideCallbacks = new WeakMap();
  window.requestAnimationFrame = function (callback) {
    if (!guideCallbacks.has(callback))
      guideCallbacks.set(callback, callback.toString().includes("dialog.open"));
    if (!guideCallbacks.get(callback)) return request(callback);
    return request((now) => {
      window.__feedbackGuideFrames[now] =
        (window.__feedbackGuideFrames[now] || 0) + 1;
      callback(now);
    });
  };
});
const checks = [],
  errors = [],
  measurements = {};
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const snapshot = () =>
  page.evaluate(() => {
    const game = window.__ABYSSAL__;
    return {
      elapsed: game.player.elapsed,
      timedOut: game.player.timedOut,
      mode: game.mode,
      eaten: game.player.eaten,
      particles: game.effects.activeParticles,
      clouds: game.effects.clouds.length,
      ink: game.effects.ink,
      overlay: Number(document.querySelector("#ink-overlay").style.opacity),
    };
  });
const isolate = async (kind, depth, z, distance) => {
  await page.evaluate(
    ({ kind, depth, z, distance }) => {
      const game = window.__ABYSSAL__;
      game.startGame();
      game.entities.forEach((entity) => (entity.hiddenFor = 999));
      game.encounters.bosses.forEach((boss) => (boss.enabled = false));
      game.player.invulnerable = 999;
      game.setPosition(220, -depth, z);
      const entity = game.entities.find((entry) => entry.species.kind === kind);
      entity.hiddenFor = 0;
      entity.mesh.position.copy(game.position);
      entity.mesh.position.z += distance;
      entity.velocity.set(0, 0, -1);
      entity.chase = 4;
      entity.hunter.cooldown = 0;
      window.__feedbackEntity = entity;
      window.__feedbackPhases = [];
      const observe = () => {
        if (window.__feedbackEntity !== entity) return;
        const phases = window.__feedbackPhases;
        if (phases.at(-1)?.phase !== entity.hunter.phase)
          phases.push({
            phase: entity.hunter.phase,
            elapsed: game.player.elapsed,
            telegraph: entity.telegraph?.visible || false,
            speedMultiplier: entity.hunter.speedMultiplier,
          });
        requestAnimationFrame(observe);
      };
      requestAnimationFrame(observe);
    },
    { kind, depth, z, distance },
  );
};

try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178");
  await page.waitForFunction(() => window.__ABYSSAL__);
  await page.click("#quality");
  await page.click("#open-guide");
  assert.equal(await page.locator(".guide-entry").count(), 32);
  assert.equal(
    await page.locator("#ocean-guide").evaluate((e) => e.open),
    true,
  );
  assert.equal(
    await page.locator('[data-catalog-id="player_squid"]').count(),
    1,
  );
  assert.equal(await page.locator('[data-catalog-id="squid"]').count(), 0);
  assert.equal(await page.locator('[data-catalog-id="octopus"]').count(), 1);
  checks.push(
    "Guide opens with 32 records, squid only as playable and octopus as wildlife",
  );
  await page.evaluate(() => {
    window.__feedbackGuideFrames = {};
    window.__ABYSSAL__.guide.open();
    window.__ABYSSAL__.guide.open();
  });
  await page.waitForFunction(
    () => Object.keys(window.__feedbackGuideFrames).length >= 3,
  );
  measurements.guideMaxCallbacksPerFrame = await page.evaluate(() =>
    Math.max(...Object.values(window.__feedbackGuideFrames)),
  );
  assert.equal(measurements.guideMaxCallbacksPerFrame, 1);
  const guideBuffers = () =>
    page.evaluate(() =>
      window.__feedbackBuffers
        .filter((entry) => entry.canvas.closest(".guide-preview"))
        .reduce((sum, entry) => sum + entry.created - entry.deleted, 0),
    );
  const before = await guideBuffers();
  for (let index = 0; index < 3; index++) {
    await page.click('.guide-entry[data-kind="orca"]');
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  }
  measurements.guideBuffers = { before, after: await guideBuffers() };
  assert.equal(measurements.guideBuffers.after, before);
  checks.push(
    "Repeated guide opens keep one animation loop and model selection reuses GPU buffers",
  );
  await page.click('[data-category="lord"]');
  assert.equal(await page.locator(".guide-entry").count(), 4);
  await page.click('.guide-entry[data-kind="kraken"]');
  await page.screenshot({ path: ".local/v3_guide.png" });
  checks.push("Lord category contains four distinct bosses");
  await page.fill("#guide-search", "no-such-ocean-creature");
  assert.equal(await page.locator(".guide-entry").count(), 0);
  assert.match(await page.locator(".guide-info").innerText(), /无结果/);
  await page.fill("#guide-search", "");
  assert.equal(await page.locator(".guide-entry").count(), 4);
  await page.click('[data-category="all"]');
  assert.equal(await page.locator(".guide-entry").count(), 32);
  await page.fill("#guide-search", "白鲨");
  assert.equal(await page.locator(".guide-entry").count(), 1);
  await page.fill("#guide-search", "");
  checks.push("Empty search recovers and name search filters correctly");
  await page.keyboard.press("Escape");
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "open-guide",
  );
  checks.push("Escape closes guide and restores trigger focus");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.click("#open-guide");
  measurements.mobile = await page.evaluate(() => {
    const dialog = document.querySelector("#ocean-guide");
    const content = dialog.querySelector(".guide-content");
    const preview = dialog.querySelector(".guide-preview");
    const rect = dialog.getBoundingClientRect();
    return {
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      dialogLeft: rect.left,
      dialogRight: rect.right,
      dialogTop: rect.top,
      dialogBottom: rect.bottom,
      viewportHeight: innerHeight,
      contentWidth: content.clientWidth,
      contentScrollWidth: content.scrollWidth,
      previewWidth: preview.clientWidth,
    };
  });
  assert.ok(measurements.mobile.documentWidth <= 390);
  assert.ok(measurements.mobile.dialogLeft >= 0);
  assert.ok(measurements.mobile.dialogRight <= 390);
  assert.ok(measurements.mobile.dialogTop >= 0);
  assert.ok(measurements.mobile.dialogBottom <= 844);
  assert.ok(
    measurements.mobile.contentScrollWidth <=
      measurements.mobile.contentWidth + 1,
  );
  assert.ok(
    measurements.mobile.previewWidth <= measurements.mobile.contentWidth + 1,
  );
  await page.screenshot({ path: ".local/v3_guide_mobile.png" });
  await page.click(".guide-close");
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "open-guide",
  );
  checks.push("390 px layout stays within viewport and close restores focus");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("#start").focus();
  await page.keyboard.press("Space");
  assert.equal(
    await page.evaluate(() => document.activeElement.tagName),
    "CANVAS",
  );

  await page.evaluate(() => {
    const game = window.__ABYSSAL__;
    game.startGame();
    game.entities.forEach((entity) => (entity.hiddenFor = 999));
    game.encounters.bosses.forEach((boss) => (boss.enabled = false));
    game.setLength(18);
    game.setPosition(160, -65, -250);
    const fish = game.entities.find(
      (entity) => entity.species.kind === "shark",
    );
    fish.hiddenFor = 0;
    fish.mesh.position.copy(game.position);
    fish.mesh.position.x += 5;
    fish.mesh.position.z -= 6.4;
  });
  await page.waitForFunction(() => window.__ABYSSAL__.player.eaten > 0);
  measurements.blood = await snapshot();
  assert.ok(measurements.blood.particles > 0);
  await page.waitForFunction(() => window.__ABYSSAL__.player.elapsed > 0.35);
  await page.screenshot({ path: ".local/v3_blood.png" });
  checks.push("Actual prey consumption emits blood particles");
  await page.waitForFunction(
    () => window.__ABYSSAL__.effects.activeParticles === 0,
  );
  checks.push("Blood particles expire through the main update loop");

  await isolate("shark", 100, -350, 24);
  await page.waitForFunction(
    () => window.__feedbackEntity.hunter.phase === "windup",
  );
  assert.equal(
    await page.evaluate(() => window.__feedbackEntity.telegraph.visible),
    true,
  );
  await page.waitForFunction(
    () => window.__feedbackEntity.hunter.phase === "active",
  );
  measurements.shark = await page.evaluate(() => ({
    triggerCount: window.__feedbackEntity.hunter.triggerCount,
    speedMultiplier: window.__feedbackEntity.hunter.speedMultiplier,
    phases: window.__feedbackPhases,
  }));
  assert.equal(measurements.shark.triggerCount, 1);
  assert.ok(measurements.shark.speedMultiplier > 1.7);
  await page.waitForFunction(
    () => window.__feedbackEntity.hunter.phase === "recover",
  );
  assert.ok(
    await page.evaluate(
      () => window.__feedbackEntity.hunter.speedMultiplier < 1,
    ),
  );
  checks.push(
    "Shark telegraph, burst, and recovery run in the actual entity loop",
  );

  await isolate("octopus", 100, -400, 18);
  await page.evaluate(() => {
    const game = window.__ABYSSAL__;
    // 真实6米角色接近可捕食的5米章鱼，防御喷墨不依赖章鱼能否追杀玩家。
    window.__feedbackEntity.mesh.position.z = game.position.z - 18;
    window.__feedbackEntity.chase = 0;
  });
  await page.waitForFunction(
    () => window.__feedbackEntity.hunter.phase === "windup",
  );
  await page.waitForFunction(
    () => window.__ABYSSAL__.effects.clouds.length > 0,
  );
  await page.evaluate(() => {
    const game = window.__ABYSSAL__;
    const point = game.effects.clouds[0].point;
    game.setPosition(point.x, point.y, point.z);
    window.__feedbackEntity.hiddenFor = 999;
  });
  await page.waitForFunction(() => window.__ABYSSAL__.effects.ink > 0.35);
  measurements.inkInside = await snapshot();
  assert.ok(measurements.inkInside.overlay > 0.2);
  await page.screenshot({ path: ".local/v3_ink.png" });
  await page.evaluate(() => {
    const game = window.__ABYSSAL__;
    const point = game.effects.clouds[0].point;
    game.setPosition(point.x - 100, point.y, point.z - 50);
  });
  await page.waitForFunction(() => window.__ABYSSAL__.effects.ink < 0.03);
  measurements.inkOutside = await snapshot();
  assert.equal(measurements.inkOutside.clouds, 1);
  assert.ok(measurements.inkOutside.overlay < 0.03);
  checks.push(
    "Octopus defensive skill spawns obscuring ink and visibility recovers outside the live cloud",
  );
  await page.waitForFunction(
    () => window.__ABYSSAL__.effects.clouds.length === 0,
  );
  checks.push("Ink cloud expires through the main update loop");

  measurements.reset = await page.evaluate(() => {
    const game = window.__ABYSSAL__;
    game.effects.blood(game.position, 8);
    game.effects.spawnInk(game.position);
    if (game.markersEnabled) game.toggleMarkers();
    const before = {
      particles: game.effects.activeParticles,
      clouds: game.effects.clouds.length,
      markersEnabled: game.markersEnabled,
    };
    // 同一重开入口也必须清理上一轮的到期状态，不能保留旧时钟。
    game.player.elapsed = 1800;
    game.player.timedOut = true;
    game.startGame();
    return {
      before,
      elapsed: game.player.elapsed,
      timedOut: game.player.timedOut,
      markersEnabled: game.markersEnabled,
      particles: game.effects.activeParticles,
      clouds: game.effects.clouds.length,
      ink: game.effects.ink,
      overlay: Number(document.querySelector("#ink-overlay").style.opacity),
      visibleEffects: game.effects.group.children.filter(
        (child) => child.visible,
      ).length,
    };
  });
  assert.ok(measurements.reset.before.particles > 0);
  assert.ok(measurements.reset.before.clouds > 0);
  for (const key of ["particles", "clouds", "ink", "overlay", "visibleEffects"])
    assert.equal(measurements.reset[key], 0);
  assert.equal(measurements.reset.elapsed, 0);
  assert.equal(measurements.reset.timedOut, false);
  assert.equal(
    measurements.reset.markersEnabled,
    measurements.reset.before.markersEnabled,
  );
  checks.push(
    "Restart clears particles, ink clouds, overlay, and expired round state while preserving the marker preference",
  );
  assert.deepEqual(errors, []);
  checks.push("No browser runtime or console errors");
  console.log(
    JSON.stringify({ status: "passed", checks, measurements }, null, 2),
  );
} catch (error) {
  measurements.failure = { message: error.message, stack: error.stack };
  await page
    .screenshot({ path: ".local/v3_feedback_failure.png" })
    .catch(() => {});
  throw error;
} finally {
  await writeFile(
    ".local/v3_feedback_results.json",
    JSON.stringify({ checks, errors, measurements }, null, 2),
  );
  await browser.close();
}
