import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  sampleCanopyTraverse,
  solveCanopyElbow,
} from "../src/amazon_canopy_motion.js";

test("canopy traverse retains a supporting grip through both turnarounds", () => {
  for (const span of [9, 16, 25]) {
    const state = { hands: [{}, {}] };
    let previous;
    for (let frame = 0; frame <= 120 * 60; frame++) {
      const time = frame / 60;
      sampleCanopyTraverse(time, span, state);
      assert.ok(state.hands.some((h) => h.gripping));
      assert.ok(Math.abs(state.x) < span * 0.5 - 3);
      for (let side = 0; side < 2; side++) {
        const hand = state.hands[side];
        assert.ok(Math.abs(hand.x) < span * 0.5 - 2);
        assert.ok(hand.drop >= 0 && hand.drop <= 0.621);
        if (previous?.hands[side].gripping && hand.gripping)
          assert.ok(Math.abs(hand.x - previous.hands[side].x) < 1e-9);
      }
      if (previous) assert.ok(Math.abs(state.x - previous.x) < 0.06);
      previous = structuredClone(state);
    }
  }
});

test("canopy arm solver preserves limb lengths at reachable targets", () => {
  const shoulder = new THREE.Vector3(0.1, 0.17, 0),
    hand = new THREE.Vector3(),
    pole = new THREE.Vector3(0.35, -0.35, 1),
    elbow = new THREE.Vector3(),
    scratch = { direction: new THREE.Vector3(), bend: new THREE.Vector3() };
  for (let i = 0; i < 1000; i++) {
    const distance = 0.08 + (i % 91) * 0.003;
    hand.set(Math.cos(i) * 0.6, 0.8, Math.sin(i) * 0.4).normalize();
    hand.multiplyScalar(distance).add(shoulder);
    solveCanopyElbow(shoulder, hand, pole, 0.23, 0.19, elbow, scratch);
    assert.ok(Math.abs(shoulder.distanceTo(elbow) - 0.23) < 1e-10);
    assert.ok(Math.abs(elbow.distanceTo(hand) - 0.19) < 1e-10);
  }
});

// Faster travel must retain a whole, smooth out-and-back cycle and fixed grips.
test("shore monkey crosses its route in about fifteen seconds", () => {
  const state = { hands: [{}, {}] };
  let low = Infinity,
    high = -Infinity,
    reversals = 0,
    direction = 0,
    last;
  for (let frame = 0; frame <= 32 * 60; frame++) {
    const x = sampleCanopyTraverse(frame / 60, 25, state).x;
    low = Math.min(low, x);
    high = Math.max(high, x);
    if (last !== undefined) {
      const next = Math.sign(x - last);
      if (direction && next !== direction) reversals++;
      direction = next;
    }
    last = x;
  }
  assert.ok(high - low > 18.5);
  assert.equal(reversals, 2);
});
