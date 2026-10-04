import test from "node:test";
import assert from "node:assert/strict";
import {
  createKrakenGrapple,
  tickKrakenGrapple,
  KRAKEN_GRAPPLE,
  inWaterBreath,
} from "../src/lord_special_rules.js";

test("A vortex requires sustained exposure, gives a sprint escape window, and never repeats a bite", () => {
  const context = { coreDistance: 0, mouthDistance: 10, clear: true };
  const state = createKrakenGrapple();
  assert.equal(tickKrakenGrapple(state, 0.5, context), null);
  assert.equal(tickKrakenGrapple(state, 0, context), null);
  assert.equal(tickKrakenGrapple(state, 0.1, context), "grabbed");
  // 从口器零距离出发，最慢角色的正常冲刺仍能在绞咬前挣脱，非无解控制。
  assert.ok(
    (32 - KRAKEN_GRAPPLE.gripPullSpeed) * KRAKEN_GRAPPLE.biteDelay >
      KRAKEN_GRAPPLE.escapeDistance,
  );
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
