import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { aquaticHeading } from "../src/aquatic_reptile_motion.js";

import { disposeTentacleMotion } from "../src/tentacle_motion.js";

function pose(root, time, effort = 1) {
  root.userData.animate(time, effort);
  root.updateMatrixWorld(true);
}
function skinSamples(root, stride = 89) {
  const samples = [];
  root.traverse((mesh) => {
    if (!mesh.isSkinnedMesh) return;
    for (
      let index = 0;
      index < mesh.geometry.attributes.position.count;
      index += stride
    )
      samples.push({
        mesh,
        index,
        point: mesh.getVertexPosition(index, new THREE.Vector3()),
      });
  });
  return samples;
}
// HF anatomy, continuous shoulder surfaces and caudal propulsion are covered in odyssey_people_hf.test.js.

test("all five Odyssean people use upright aquatic headings through reversal and ascent", () => {
  const forward = new THREE.Vector3(0, 0, -1),
    up = new THREE.Vector3(0, 1, 0),
    direction = new THREE.Vector3();
  for (const kind of [
    "nereid",
    "triton_guard",
    "naga_huntress",
    "siren_eel",
    "hippocampus",
  ]) {
    const root = createCreature(kind, 1, 71);
    assert.equal(root.userData.aquaticUpright, true, kind);
    for (let step = 0; step <= 32; step++) {
      const yaw = (step * Math.PI) / 16;
      direction.set(Math.sin(yaw), 0.25, -Math.cos(yaw)).normalize();
      aquaticHeading(root.quaternion, direction, yaw);
      root.updateMatrixWorld(true);
      assert.ok(up.clone().applyQuaternion(root.quaternion).y > 0.95, kind);
      assert.ok(
        forward.clone().applyQuaternion(root.quaternion).dot(direction) > 0.999,
        kind,
      );
      assert.ok(
        root.userData.mouthAnchors[0]
          .getWorldPosition(new THREE.Vector3())
          .toArray()
          .every(Number.isFinite),
      );
    }
    assert.deepEqual(root.position.toArray(), [0, 0, 0]);
    disposeTentacleMotion(root);
  }
});

for (const kind of [
  "nereid",
  "triton_guard",
  "naga_huntress",
  "siren_eel",
  "hippocampus",
]) {
  test(`${kind}: speed transitions keep the posed surfaces continuous and freeze at an unchanged clock`, () => {
    const first = createCreature(kind, 1, 71),
      second = createCreature(kind, 1, 71);
    pose(first, 0, 0.4);
    pose(second, 0, 0.4);
    const initial = skinSamples(first),
      untouched = skinSamples(second),
      rootMatrix = first.matrixWorld.clone();
    pose(first, 0, 3);
    assert.deepEqual(
      skinSamples(first).map(({ point }) => point.toArray()),
      initial.map(({ point }) => point.toArray()),
      "Changing speed at a frozen clock must not snap tail, hair or limb skin",
    );
    let previous = initial,
      maxStep = 0;
    for (let frame = 1; frame <= 360; frame++) {
      pose(first, frame / 60, frame < 180 ? 3 : 0.4);
      const current = skinSamples(first);
      for (let index = 0; index < current.length; index++) {
        assert.ok(current[index].point.toArray().every(Number.isFinite));
        maxStep = Math.max(
          maxStep,
          current[index].point.distanceTo(previous[index].point),
        );
      }
      previous = current;
    }
    assert.ok(maxStep < 0.035, `${kind}: per-frame surface step ${maxStep}`);
    assert.deepEqual(first.matrixWorld.elements, rootMatrix.elements);
    pose(first, 6, 3);
    assert.deepEqual(
      skinSamples(first).map(({ point }) => point.toArray()),
      previous.map(({ point }) => point.toArray()),
    );
    assert.deepEqual(
      skinSamples(second).map(({ point }) => point.toArray()),
      untouched.map(({ point }) => point.toArray()),
      "Neighbouring cached instances must keep independent poses",
    );
    disposeTentacleMotion(first);
    disposeTentacleMotion(second);
  });
}
