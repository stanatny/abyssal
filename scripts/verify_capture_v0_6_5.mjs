import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

// 只设置一次遭遇位置；保留鱼群正常转向、逃逸与主循环捕食，不直接调用结算。
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const checks = [],
  errors = [],
  traces = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178/");
  await page.waitForFunction(() => !!window.__ABYSSAL__);
  await page.click("#quality");
  await page.click("#start");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      original = g.audio.eatFish;
    g.audio.eatFish = function (...args) {
      const t = window.__CAPTURE_TRACE__;
      if (t) {
        const mouth = g.position.clone().addScaledVector(g.forward, 3 * 0.36);
        t.captures.push({
          distance: mouth.distanceTo(t.target.mesh.position),
          velocity: t.target.velocity.length(),
          time: g.elapsed,
        });
      }
      return original.apply(this, args);
    };
  });
  for (const offset of [1.25, 2.2]) {
    await page.evaluate((offset) => {
      const g = window.__ABYSSAL__;
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
      const target = g.entities.find((e) => e.species.kind === "fish");
      target.mesh.position
        .copy(g.position)
        .addScaledVector(g.forward, 3 * 0.36);
      target.mesh.position.x += offset;
      target.hiddenFor = 0;
      target.disorientedUntil = 0;
      target.mesh.visible = true;
      target.velocity.set(0, 0, 0);
      window.__CAPTURE_TRACE__ = {
        target,
        offset,
        captures: [],
        started: g.elapsed,
        frames: [],
      };
      const t = window.__CAPTURE_TRACE__;
      function sample() {
        if (window.__CAPTURE_TRACE__ !== t) return;
        t.frames.push({
          time: g.elapsed,
          eaten: g.player.eaten,
          velocity: target.velocity.length(),
          hidden: target.hiddenFor,
        });
        if (g.elapsed - t.started < 0.32) requestAnimationFrame(sample);
        else t.done = true;
      }
      requestAnimationFrame(sample);
    }, offset);
    await page.waitForFunction(() => window.__CAPTURE_TRACE__.done);
    const trace = await page.evaluate(() => {
      const { target, ...t } = window.__CAPTURE_TRACE__;
      return {
        ...t,
        preyLength: target.species.length,
        disorientedUntil: target.disorientedUntil,
      };
    });
    traces.push(trace);
    assert.equal(trace.disorientedUntil, 0);
    if (offset === 1.25) {
      assert.equal(trace.captures.length, 1);
      const base = 3 * 0.22 + trace.preyLength * 0.28 + 0.25;
      assert.ok(
        trace.captures[0].distance > base,
        "A true near miss outside the old radius must be captured",
      );
      assert.ok(trace.captures[0].distance < base * 1.24);
      assert.ok(
        trace.captures[0].velocity > 0,
        "The live prey must still steer and flee",
      );
      checks.push(
        "A 3 m newborn captures a naturally moving fish at a lateral near miss beyond the old radius",
      );
    } else {
      assert.equal(trace.captures.length, 0);
      assert.ok(trace.frames.some((f) => f.velocity > 0));
      checks.push(
        "A fish 2.2 m to the side keeps swimming without remote capture",
      );
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, traces, errors }, null, 2));
} finally {
  await writeFile(
    ".local/v6_5_capture_verification.json",
    JSON.stringify({ checks, traces, errors }, null, 2),
  );
  await browser.close();
}
