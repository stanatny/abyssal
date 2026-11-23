import test from "node:test";
import assert from "node:assert/strict";
import { createTitanPickupTremor } from "../src/bermuda_titan_camera.js";

test("pickup tremor is once per expedition, bounded, and settles", () => {
  const tremor = createTitanPickupTremor();
  assert.deepEqual(tremor.step(1), { x: 0, y: 0, z: 0 });
  assert.equal(tremor.trigger(), true);
  let peak = 0;
  for (let i = 0; i < 420; i++) {
    const v = tremor.step(1 / 60);
    peak = Math.max(peak, Math.hypot(v.x, v.y, v.z));
    assert.ok(Object.values(v).every(Number.isFinite));
    assert.ok(Math.hypot(v.x, v.y, v.z) < 0.6);
  }
  assert.ok(peak > 0.25);
  assert.deepEqual(tremor.step(1), { x: 0, y: 0, z: 0 });
  assert.equal(tremor.trigger(), false);
  tremor.reset();
  assert.equal(tremor.trigger(), true);
});

test("paused time is frozen and reduced motion suppresses camera displacement", () => {
  const tremor = createTitanPickupTremor();
  tremor.trigger();
  const v = tremor.step(0.25);
  assert.deepEqual(tremor.step(0), v);
  assert.deepEqual(tremor.step(1, { reducedMotion: true }), {
    x: 0,
    y: 0,
    z: 0,
  });
  // 减少动态模式仍消耗活跃时间，切换设置不会重播取宝震颤。
  tremor.step(10, { reducedMotion: true });
  assert.deepEqual(tremor.step(0), { x: 0, y: 0, z: 0 });
  tremor.reset();
  assert.deepEqual(tremor.step(0), { x: 0, y: 0, z: 0 });
});
