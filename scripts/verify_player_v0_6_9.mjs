import { selectCharacter } from "./menu_picker_helpers.mjs";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

// 普通鱼保留自主逃逸；喷射用定点猎物隔离低帧率连续接触，捕食仍走真实主循环。
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [],
  traces = [],
  errors = [];
try {
  for (const kind of ["orca", "squid"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      let simulationTime;
      window.requestAnimationFrame = (callback) =>
        raf((time) => {
          simulationTime = window.__FIXED_FRAME__
            ? (simulationTime ?? time) + 40
            : time;
          callback(simulationTime);
        });
    });
    await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178/");
    await page.waitForFunction(() => !!window.__ABYSSAL__);
    await selectCharacter(page, kind);
    await page.click("#quality");
    await page.click("#start");
    await page.evaluate(() => {
      const g = window.__ABYSSAL__,
        original = g.audio.eatFish;
      g.audio.eatFish = function (...args) {
        const t = window.__CAPTURE_TRACE__;
        if (t)
          t.captures.push({
            before: g.getCaptureStart().distanceTo(t.target.mesh.position),
            after: g.getCapturePoint().distanceTo(t.target.mesh.position),
            speed: g.controls.speed,
            velocity: t.target.velocity.length(),
            mouth: g.getFeedingMouth().toArray(),
          });
        return original.apply(this, args);
      };
    });
    for (const offset of [1.25, 2.2]) {
      await reset(page);
      await page.evaluate((offset) => {
        const g = window.__ABYSSAL__;
        const target = g.entities.find((e) => e.species.kind === "fish");
        target.mesh.position.copy(g.getCapturePoint());
        target.mesh.position.x += offset;
        target.hiddenFor = 0;
        target.disorientedUntil = 0;
        target.mesh.visible = true;
        target.velocity.set(0, 0, 0);
        window.__CAPTURE_TRACE__ = { target, captures: [] };
      }, offset);
      await page.waitForTimeout(500);
      const trace = await page.evaluate(() => ({
        captures: window.__CAPTURE_TRACE__.captures,
        velocity: window.__CAPTURE_TRACE__.target.velocity.length(),
        disoriented: window.__CAPTURE_TRACE__.target.disorientedUntil,
      }));
      assert.equal(trace.disoriented, 0);
      assert.equal(trace.captures.length, offset === 1.25 ? 1 : 0);
      assert.ok((trace.captures[0]?.velocity ?? trace.velocity) > 0);
      traces.push({ kind, offset, ...trace });
      checks.push(
        `${kind}: live fish at ${offset} m ${offset === 1.25 ? "captured" : "not pulled in"}`,
      );
    }
    await reset(page);
    await page.evaluate(() => {
      const g = window.__ABYSSAL__,
        mouth = g.getCapturePoint();
      // 移动现有碰撞体到测试接触路径，只隔离遮挡判断；保存后原样还原。
      const wall = g.ocean.colliders.find((c) => c.type === "ellipsoid");
      window.__TEST_WALL__ = { wall, original: structuredClone(wall) };
      Object.assign(wall, {
        x: mouth.x + 0.92,
        y: mouth.y,
        z: mouth.z,
        axes: { x: 0.06, y: 3, z: 6 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      });
      const target = g.entities.find((e) => e.species.kind === "fish");
      target.mesh.position.copy(mouth);
      target.mesh.position.x += 1.25;
      target.hiddenFor = 0;
      target.disorientedUntil = 999;
      target.mesh.visible = true;
      target.velocity.set(0, 0, 0);
      window.__CAPTURE_TRACE__ = { target, captures: [] };
    });
    await page.waitForTimeout(200);
    assert.equal(
      await page.evaluate(() => window.__CAPTURE_TRACE__.captures.length),
      0,
    );
    await page.evaluate(() => {
      const { wall, original } = window.__TEST_WALL__;
      Object.assign(wall, original);
      delete window.__TEST_WALL__;
    });
    checks.push(`${kind}: nearby prey across a solid wall remains uncaptured`);
    await reset(page);
    await page.keyboard.down("KeyD");
    await page.keyboard.down("Space");
    await page.waitForFunction(
      () => window.__ABYSSAL__.avatar.userData.motionState.boost > 0.9,
    );
    const motion = await page.evaluate(() => {
      const g = window.__ABYSSAL__,
        m = g.avatar;
      const expected = m.position
        .clone()
        .set(0, 0, -g.player.length * 0.36)
        .applyQuaternion(m.quaternion)
        .add(g.position);
      return {
        state: m.userData.motionState,
        pose: m.userData.pose,
        captureError: expected.distanceTo(g.getCapturePoint()),
        mouthLocal: m.worldToLocal(g.getFeedingMouth()).toArray(),
      };
    });
    assert.ok(motion.state.turn > 0.9);
    assert.ok(motion.captureError < 1e-8);
    assert.ok(
      motion.mouthLocal[2] < 0,
      "Actual mouth must face the swimming direction",
    );
    traces.push({ kind, motion });
    checks.push(
      `${kind}: real turn and sprint drive pose; capture follows visible orientation`,
    );
    await page.screenshot({ path: `.local/v6_9_${kind}_game_sprint.png` });
    await page.keyboard.up("KeyD");
    await page.keyboard.up("Space");
    await reset(page);
    const state = await page.evaluate(
      () => window.__ABYSSAL__.avatar.userData.motionState,
    );
    assert.ok(state.boost < 0.05 && Math.abs(state.turn) < 0.05);
    checks.push(`${kind}: restart clears previous sprint and turn`);
    if (kind === "squid") {
      await page.evaluate(() => {
        window.__FIXED_FRAME__ = true;
      });
      await page.keyboard.press("KeyJ");
      await page.waitForFunction(() => window.__ABYSSAL__.controls.speed > 69);
      await page.evaluate(() => {
        const g = window.__ABYSSAL__,
          target = g.entities.find((e) => e.species.kind === "anchovy");
        target.mesh.position
          .copy(g.getCapturePoint())
          .addScaledVector(g.forward, 1.4);
        target.hiddenFor = 0;
        target.disorientedUntil = 999;
        target.mesh.visible = true;
        target.velocity.set(0, 0, 0);
        window.__CAPTURE_TRACE__ = { target, captures: [] };
      });
      await page.waitForFunction(
        () => window.__CAPTURE_TRACE__.captures.length === 1,
      );
      const trace = await page.evaluate(() => ({
        captures: window.__CAPTURE_TRACE__.captures,
        state: window.__ABYSSAL__.avatar.userData.motionState,
      }));
      const radius = (3 * 0.22 + 0.18 * 0.28 + 0.25) * 1.24;
      assert.ok(
        trace.captures[0].before > radius && trace.captures[0].after > radius,
        "Both sampled endpoints must miss the fish",
      );
      assert.ok(trace.state.jet > 0.8);
      traces.push({ kind, jet: trace });
      checks.push(
        "Squid real ink jet captures crossed prey at 40 ms frames despite both endpoints missing",
      );
    }
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, traces, errors }, null, 2));
} finally {
  await writeFile(
    ".local/v6_9_player_verification.json",
    JSON.stringify({ checks, traces, errors }, null, 2),
  );
  await browser.close();
}
async function reset(page) {
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    window.__CAPTURE_TRACE__ = null;
    g.startGame();
    g.setPosition(0, -18, 75);
    g.setFacing(0, 0);
    g.entities.forEach((e) => {
      e.hiddenFor = 999;
      e.mesh.visible = false;
    });
    g.encounters.bosses.forEach((b) => (b.enabled = false));
    g.pickups.forEach((p) => (p.cooldown = 999));
    g.humans.entities.forEach((e) => {
      e.alive = false;
      e.mesh.visible = false;
    });
    g.surface.birds.forEach((b) => (b.cooldown = 999));
  });
}
