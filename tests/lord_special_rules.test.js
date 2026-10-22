import test from "node:test";
import assert from "node:assert/strict";
import {
  createKrakenGrapple,
  tickKrakenGrapple,
  KRAKEN_GRAPPLE,
  krakenGrappleForces,
  inWaterBreath,
  krakenEscapeCost,
  tryKrakenEscape,
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

test("Outward sprint pays the distance budget once; normal100 cannot buy a near120 release", () => {
  for (const [distance, stamina, succeeds] of [
    [0, 100, false],
    [6, 119, false],
    [6, 120, true],
    [6, 150, true],
    [24, 100, true],
    [42, 30, true],
  ]) {
    const state = { ...createKrakenGrapple(), held: true },
      player = { stamina, exhausted: false };
    const cost = krakenEscapeCost(distance);
    assert.equal(
      tryKrakenEscape(state, player, {
        dt: 0.02,
        distance,
        active: true,
        boosting: true,
        outward: 1,
      }),
      succeeds,
    );
    assert.equal(player.stamina, succeeds ? stamina - cost : stamina);
    assert.equal(state.held, !succeeds);
    if (succeeds) {
      assert.equal(
        tryKrakenEscape(state, player, {
          dt: 0.02,
          distance,
          active: true,
          boosting: true,
          outward: 1,
        }),
        false,
      );
      assert.equal(player.stamina, stamina - cost);
      assert.equal(
        tickKrakenGrapple(state, 10, {
          coreDistance: 0,
          mouthDistance: 0,
          clear: true,
        }),
        null,
      );
    }
  }
});
test("Escape price is continuous, bounded and lower farther from the actual maw", () => {
  assert.equal(krakenEscapeCost(0), 120);
  assert.equal(krakenEscapeCost(42), 24);
  let previous = 120;
  for (let d = 0; d < 100; d += 0.05) {
    const cost = krakenEscapeCost(d);
    assert.ok(cost <= previous && cost >= 24);
    assert.ok(previous - cost <= 1);
    previous = cost;
  }
});
test("Pause, sideward/inward travel and no active tether never spend the release cost", () => {
  for (const patch of [
    { dt: 0 },
    { boosting: false },
    { outward: 0 },
    { outward: -1 },
    { active: false },
  ]) {
    const state = createKrakenGrapple(),
      player = { stamina: 150, exhausted: false };
    assert.equal(
      tryKrakenEscape(state, player, {
        dt: 0.02,
        distance: 6,
        active: true,
        boosting: true,
        outward: 1,
        ...patch,
      }),
      false,
    );
    assert.equal(player.stamina, 150);
    assert.equal(state.spent, false);
  }
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
