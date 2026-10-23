import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { predatorBiteContact } from "../src/predator_combat.js";

const direction = (model, z = 1) =>
  new THREE.Vector3(0, 0, z).applyQuaternion(
    model.getObjectByName("cameroceras_attitude").quaternion,
  );
const advance = (model, start, end, travelSpeed, hunting = false) => {
  for (let f = start; f <= end; f++)
    model.userData.animate(f / 60, travelSpeed / 6, { travelSpeed, hunting });
};

test("Cameroceras hovers apex-up, travels apex-first and presents arms toward prey without moving the gameplay root", () => {
  const m = createCreature("cameroceras", 6, 17);
  m.position.set(12, -100, 4);
  const original = m.position.clone();
  advance(m, 0, 120, 0);
  assert.ok(direction(m).y > 0.9);
  assert.ok(direction(m, -1).y < -0.9);
  advance(m, 121, 360, 10.5);
  assert.ok(direction(m).z < -0.97, "shell apex leads the -Z travel axis");
  assert.ok(direction(m, -1).z > 0.97, "arms trail rather than swim ahead");
  const dorsal = new THREE.Vector3(0, 1, 0).applyQuaternion(
    m.getObjectByName("cameroceras_attitude").quaternion,
  );
  assert.ok(dorsal.y > 0.9, "do not flip the animal upside down");
  advance(m, 361, 600, 15, true);
  assert.ok(direction(m, -1).z < -0.995);
  assert.deepEqual(m.position, original);
  assert.deepEqual(m.quaternion.toArray(), [0, 0, 0, 1]);
  assert.deepEqual(m.scale.toArray(), [6, 6, 6]);
  m.userData.disposeLocalMotion();
});

test("Cameroceras transitions remain continuous, pause is exact, and jet pulses leave a longer quiet interval", () => {
  const a = createCreature("cameroceras", 1, 23),
    b = createCreature("cameroceras", 1, 23),
    body = a.getObjectByName("cameroceras_attitude"),
    untouched = b.getObjectByName("cameroceras_attitude").quaternion.toArray();
  let previous;
  let pumping = 0,
    quiet = 0;
  for (let f = 0; f < 1200; f++) {
    const travelSpeed = f < 180 ? 0 : f < 900 ? 12 : 0,
      hunting = f >= 500 && f < 750;
    a.userData.animate(f / 60, travelSpeed / 6, { travelSpeed, hunting });
    if (previous) assert.ok(body.quaternion.angleTo(previous) < 0.065);
    previous = body.quaternion.clone();
    if (f > 200 && f < 500) {
      if (a.userData.camerocerasMotion.jet > 0.05) pumping++;
      else quiet++;
    }
  }
  assert.ok(pumping > 15 && quiet > pumping * 2);
  const before = body.quaternion.toArray();
  const bones = a.userData.hfRig.bones.map((b) => [
    b.rotation.toArray(),
    b.scale.toArray(),
  ]);
  a.userData.animate(1199 / 60, 3, { travelSpeed: 20, hunting: true });
  assert.deepEqual(body.quaternion.toArray(), before);
  assert.deepEqual(
    a.userData.hfRig.bones.map((b) => [
      b.rotation.toArray(),
      b.scale.toArray(),
    ]),
    bones,
  );
  assert.deepEqual(
    b.getObjectByName("cameroceras_attitude").quaternion.toArray(),
    untouched,
  );
  a.userData.disposeLocalMotion();
  b.userData.disposeLocalMotion();
});

test("Cameroceras bite direction follows the posed arm crown, never the leading shell tip", () => {
  const m = createCreature("cameroceras", 6, 8);
  m.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 1.2);
  for (const hunting of [false, true]) {
    advance(m, hunting ? 241 : 0, hunting ? 480 : 240, 12, hunting);
    const forward = m.userData.getPredatorForward(new THREE.Vector3());
    const shell = direction(m).applyQuaternion(m.quaternion);
    assert.ok(forward.dot(shell) < -0.99999);
    const check = (side) => {
      const p = forward.clone().multiplyScalar(6 * 0.36 * side);
      return predatorBiteContact({
        previousPredator: m.position,
        predator: m.position,
        predatorForward: forward,
        predatorLength: 6,
        previousPlayer: p,
        player: p,
        playerForward: new THREE.Vector3(1, 0, 0),
        playerLength: 3,
        edible: false,
      });
    };
    assert.equal(check(1), true);
    assert.equal(check(-1), false);
  }
  m.userData.disposeLocalMotion();
});
