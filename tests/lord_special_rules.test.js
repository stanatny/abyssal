import test from "node:test";
import assert from "node:assert/strict";
import {
  createKrakenGrapple,
  tickKrakenGrapple,
  KRAKEN_GRAPPLE,
  krakenGrappleForces,
  inWaterBreath,
} from "../src/lord_special_rules.js";

test("A vortex requires sustained exposure, gives a sprint escape window, and never repeats a bite", () => {
  const context = { coreDistance: 0, mouthDistance: 10, clear: true };
  const state = createKrakenGrapple();
  assert.equal(tickKrakenGrapple(state, 0.5, context), null);
  assert.equal(tickKrakenGrapple(state, 0, context), null);
  assert.equal(tickKrakenGrapple(state, 0.1, context), "grabbed");
  assert.equal(
    tickKrakenGrapple(state, 0.1, { ...context, mouthDistance: 28 }),
    "escaped",
  );
  assert.equal(tickKrakenGrapple(state, 10, context), null);
  const trapped = createKrakenGrapple();
  tickKrakenGrapple(trapped, 0.6, context);
  assert.equal(tickKrakenGrapple(trapped, 0, context), null);
  assert.equal(tickKrakenGrapple(trapped, 1.49, context), null);
  assert.equal(tickKrakenGrapple(trapped, 0.02, context), "bite");
  assert.equal(tickKrakenGrapple(trapped, 10, context), null);
  const cover = createKrakenGrapple();
  tickKrakenGrapple(cover, 0.6, context);
  assert.equal(
    tickKrakenGrapple(cover, 0.1, { ...context, clear: false }),
    "escaped",
  );
});

test("Kraken's pull and stamina pressure increase continuously toward the actual maw", () => {
  const out = {};
  let previous = null;
  for (const distance of [40, 27, 22, 16, 10, 4, 0]) {
    assert.equal(krakenGrappleForces(distance, out), out);
    for (const key of ["pullSpeed", "gripPullSpeed", "staminaDrain"]) {
      assert.ok(out[key] >= KRAKEN_GRAPPLE[key].far);
      assert.ok(out[key] <= KRAKEN_GRAPPLE[key].near);
      if (previous) assert.ok(out[key] >= previous[key]);
    }
    previous = { ...out };
  }
  const edge = krakenGrappleForces(27);
  const outside = krakenGrappleForces(Infinity);
  assert.deepEqual(edge, outside);
  assert.ok(
    Math.abs(krakenGrappleForces(26.99).gripPullSpeed - edge.gripPullSpeed) <
      0.01,
  );
});

test("A prepared baseline sprint escapes even the inner grip; distance gives a faster escape", () => {
  // 最慢角色已在预警中开始冲刺；延迟转向或体力耗尽不是这个可逃脱保证的前提。
  function escapeFrom(start) {
    const state = { ...createKrakenGrapple(), held: true };
    let distance = start;
    for (let elapsed = 0; elapsed < 2; elapsed += 1 / 120) {
      distance += 32 / 120;
      const event = tickKrakenGrapple(state, 1 / 120, {
        coreDistance: 0,
        mouthDistance: distance,
        clear: true,
      });
      if (event) return { event, elapsed };
      distance -= Math.min(
        krakenGrappleForces(distance).gripPullSpeed / 120,
        distance,
      );
    }
    assert.fail("Unbounded grapple");
  }
  const near = escapeFrom(0);
  const far = escapeFrom(20);
  assert.equal(near.event, "escaped");
  assert.equal(far.event, "escaped");
  assert.ok(near.elapsed > far.elapsed + 0.5);
  assert.ok(near.elapsed < KRAKEN_GRAPPLE.biteDelay);
});

test("Water breath has a finite front-only corridor and supports perpendicular escape", () => {
  const origin = { x: 3, y: 4, z: 5 },
    forward = { x: 0, y: 0, z: -1 };
  assert.equal(
    inWaterBreath({ x: 3, y: 4, z: -140 }, origin, forward, 145, 7),
    true,
  );
  assert.equal(
    inWaterBreath({ x: 3, y: 4, z: -141 }, origin, forward, 145, 7),
    false,
  );
  assert.equal(
    inWaterBreath({ x: 3, y: 4, z: 6 }, origin, forward, 145, 7),
    false,
  );
  assert.equal(
    inWaterBreath({ x: 11, y: 4, z: -20 }, origin, forward, 145, 7),
    false,
  );
  assert.equal(
    inWaterBreath({ x: 3, y: 12, z: -20 }, origin, forward, 145, 7),
    false,
  );
  assert.equal(
    inWaterBreath({ x: 11, y: 4, z: -20 }, origin, forward, 145, 7, 2),
    true,
  );
});
