import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { selectCharacter } from "./menu_picker_helpers.mjs";

// 初始位置、猎物与测试墙用于隔离接触；之后由实际移动、碰撞与捕食循环结算。
const dir = ".local/squid_dual_capture_20261110";
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(60000);
const report = {
  checks: [],
  cases: [],
  errors: [],
  limits:
    "Controlled live-loop fixtures, not an unassisted full expedition or physical-phone test.",
};
page.on("pageerror", (e) => report.errors.push(e.message));
async function pause() {
  if (await page.evaluate(() => window.__ABYSSAL__.mode === "playing"))
    await page.click("#pause");
}
async function stage({
  index = 1,
  yaw = 0,
  covered = false,
  wall = false,
  predator = false,
  oversized = false,
  natural = false,
} = {}) {
  await pause();
  return page.evaluate(
    async (options) => {
      const g = window.__ABYSSAL__;
      if (window.__SQUID_WALL__) {
        const i = g.ocean.barriers.indexOf(window.__SQUID_WALL__);
        if (i >= 0) g.ocean.barriers.splice(i, 1);
        window.__SQUID_WALL__ = null;
      }
      g.startGame();
      // 同一帧冻结模式；通过真实按钮恢复。
      document.querySelector("#pause").click();
      g.entities.forEach((e) => {
        e.hiddenFor = 999;
        e.mesh.visible = false;
      });
      g.encounters.bosses.forEach((b) => (b.enabled = false));
      g.pickups.forEach((p) => (p.cooldown = 999));
      const e = g.entities.find((e) =>
        options.predator || options.oversized
          ? e.species.predator && e.species.length > 4 && e.species.length < 15
          : e.species.category === "rare",
      );
      const length = options.predator
        ? e.species.length + 0.7
        : options.oversized
          ? 3
          : 6;
      g.setLength(length);
      g.avatar.scale.setScalar(length);
      g.setFacing(options.yaw);
      const base = g.position.clone().set(0, -120, -180);
      if (options.natural)
        base.copy(e.mesh.position).addScaledVector(g.forward, -16);
      g.setPosition(...base.toArray());
      const point = g.getCapturePoints()[options.index];
      if (options.wall) {
        const center = base.clone().addScaledVector(g.forward, 5);
        const wall = {
          type: "box",
          id: "squid_capture_fixture_wall",
          x: center.x,
          y: center.y,
          z: center.z,
          halfSize: { x: 12, y: 12, z: 0.5 },
        };
        g.ocean.barriers.push(wall);
        window.__SQUID_WALL__ = wall;
        e.mesh.position
          .copy(center)
          .addScaledVector(g.forward, options.covered ? 0.8 : -0.8);
      } else if (!options.natural)
        e.mesh.position
          .copy(point)
          .addScaledVector(g.forward, options.index === 0 ? -0.1 : 0.1);
      e.hiddenFor = 0;
      e.mesh.visible = true;
      e.disorientedUntil = options.natural ? 0 : 999;
      e.velocity.set(0, 0, 0);
      e.cooldown = 0;
      g.player.health = 100;
      g.player.invulnerable = 0;
      window.__SQUID_TARGET__ = e;
      window.__SQUID_TRACE__ = [];
      if (!g.feeding.__traceWrapped) {
        const original = g.feeding.start;
        g.feeding.start = (mesh, length, options) => {
          if (mesh === window.__SQUID_TARGET__?.mesh)
            window.__SQUID_TRACE__.push({
              time: g.elapsed,
              carrying: !!options?.carryFrame,
              originalGap: g.getCapturePoint().distanceTo(mesh.position),
              frontGap: g.getCapturePoints()[1].distanceTo(mesh.position),
              position: mesh.position.toArray(),
            });
          return original(mesh, length, options);
        };
        g.feeding.__traceWrapped = true;
      }
      return {
        kind: e.species.kind,
        preyLength: e.species.length,
        playerLength: length,
        point: point.toArray(),
        prey: e.mesh.position.toArray(),
        originalGap: g.getCapturePoint().distanceTo(e.mesh.position),
        frontGap: g.getCapturePoints()[1].distanceTo(e.mesh.position),
        position: g.position.toArray(),
        ...options,
      };
    },
    { index, yaw, covered, wall, predator, oversized, natural },
  );
}
async function snapshot() {
  return page.evaluate(() => {
    const g = window.__ABYSSAL__,
      e = window.__SQUID_TARGET__;
    return {
      time: g.elapsed,
      eaten: g.player.eaten,
      health: g.player.health,
      cap: g.player.vitalCap,
      hidden: e.hiddenFor,
      trace: window.__SQUID_TRACE__,
      feeding: g.feeding.snapshot(),
      position: g.position.toArray(),
      prey: e.mesh.position.toArray(),
      pose: g.avatar.userData.pose,
    };
  });
}
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5190/");
  await page.waitForFunction(
    () => window.__ABYSSAL__ && !window.__ABYSSAL__.regionLoading,
  );
  await page.locator("[data-language-select]").selectOption("zh-CN");
  await page.click("#region-select");
  await page.click('#expedition-picker [data-choice-value="mariana"]');
  await page.waitForFunction(() => !window.__ABYSSAL__.regionLoading);
  await selectCharacter(page, "squid");
  await page.click("#quality");
  await page.click("#start");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  for (const c of [
    { wall: true },
    { wall: true, yaw: Math.PI },
    { index: 0, predator: true },
    { oversized: true },
    { wall: true, covered: true },
  ]) {
    const setup = await stage(c);
    await page.click("#resume");
    await page.keyboard.down("KeyK");
    if (!c.oversized && !c.covered)
      await page.waitForFunction(() => window.__SQUID_TRACE__.length > 0);
    else
      await page.waitForFunction(
        (start) => window.__ABYSSAL__.elapsed > start + 0.5,
        (await snapshot()).time,
      );
    await page.keyboard.up("KeyK");
    await pause();
    const result = await snapshot();
    assert.equal(result.trace.length, c.oversized || c.covered ? 0 : 1);
    if (c.predator) {
      assert.equal(result.health, 100);
      assert.equal(result.trace[0].carrying, false);
    }
    if (c.wall && !c.covered) {
      assert.ok(result.trace[0].originalGap > 4);
      assert.equal(result.trace[0].carrying, true);
      assert.equal(result.cap, 150);
      assert.equal(result.hidden, Infinity);
      const frozen = await snapshot();
      await page.waitForTimeout(180);
      assert.deepEqual(await snapshot(), frozen);
      await page.screenshot({
        path: `${dir}/front_capture_${c.yaw ? "reverse" : "forward"}.png`,
      });
      await page.click("#resume");
      await page.waitForFunction(
        () => window.__ABYSSAL__.feeding.snapshot().activeCount === 0,
      );
      await pause();
      const completed = await snapshot();
      assert.equal(completed.trace.length, 1);
      assert.equal(completed.feeding.completedCount, 1);
    }
    report.cases.push({ setup, result });
    report.checks.push(
      c.predator
        ? "original arm intake eats a near-sized retaliating hunter before damage"
        : c.oversized
          ? "oversized prey is not consumed"
          : c.covered
            ? "solid wall blocks both capture points"
            : `wall-hugging Mariana rare captured from front at yaw ${c.yaw || 0}; pause, true-mouth completion and one reward`,
    );
  }
  // 稀有生物原栖地保持正常逃逸；只设置玩家一次初始接近位置，实际键盘冲刺追捕。
  const setup = await stage({ natural: true });
  await page.click("#resume");
  await page.keyboard.down("Space");
  const held = new Set(["Space"]);
  const pursuit = [];
  for (let step = 0; step < 100; step++) {
    const state = await page.evaluate(() => {
      const g = window.__ABYSSAL__,
        d = window.__SQUID_TARGET__.mesh.position.clone().sub(g.position);
      return {
        captured: window.__SQUID_TRACE__.length === 1,
        yaw: g.controls.yaw,
        pitch: g.controls.pitch,
        desiredYaw: Math.atan2(-d.x, -d.z),
        desiredPitch: Math.atan2(d.y, Math.hypot(d.x, d.z)),
        distance: d.length(),
        speed: g.controls.speed,
      };
    });
    pursuit.push(state);
    if (state.captured) break;
    const error = Math.atan2(
      Math.sin(state.desiredYaw - state.yaw),
      Math.cos(state.desiredYaw - state.yaw),
    );
    const vertical = state.desiredPitch - state.pitch;
    const next = new Set([
      "Space",
      ...(Math.abs(error) > 0.04 ? [error > 0 ? "KeyA" : "KeyD"] : []),
      ...(Math.abs(vertical) > 0.04 ? [vertical > 0 ? "KeyW" : "KeyS"] : []),
    ]);
    for (const key of held) if (!next.has(key)) await page.keyboard.up(key);
    for (const key of next) if (!held.has(key)) await page.keyboard.down(key);
    held.clear();
    next.forEach((key) => held.add(key));
    await page.waitForTimeout(100);
  }
  for (const key of held) await page.keyboard.up(key);
  report.pursuit = pursuit;
  assert.equal((await snapshot()).trace.length, 1);
  await page.keyboard.up("Space");
  await pause();
  report.cases.push({ setup, result: await snapshot() });
  report.checks.push(
    "native sprint captures the normally moving Mariana rare in its original habitat",
  );
  await page.click("#return-menu");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "menu");
  assert.equal(
    await page.evaluate(
      () => window.__ABYSSAL__.feeding.snapshot().activeCount,
    ),
    0,
  );
  report.checks.push("return home clears an unfinished carried meal");
  for (const [locale, width] of [
    ["zh-CN", 1280],
    ["en", 390],
  ]) {
    await page.setViewportSize({ width, height: 800 });
    await page.locator("[data-language-select]").selectOption(locale);
    await page.click("#open-guide");
    await page.click('.guide-entry[data-kind="squid"]');
    const copy = await page.locator(".guide-detail").innerText();
    assert.ok(
      copy.includes(
        locale === "en"
          ? "Both the leading end and the arms"
          : "行进前端和腕部都能捕获",
      ),
    );
    await page.screenshot({ path: `${dir}/guide_${locale}.png` });
    await page.click(".guide-close");
  }
  report.checks.push(
    "Chinese desktop and English narrow Guide describe both capture ends",
  );
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (e) {
  report.failure = String(e.stack || e);
  report.failureState = await snapshot().catch(() => null);
  await page.screenshot({ path: `${dir}/failure.png` }).catch(() => {});
  throw e;
} finally {
  await writeFile(`${dir}/native.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report));
