import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";

function arms(root) {
  const result = [];
  root.traverse((node) => {
    if (node.userData.tentacle) result.push(node);
  });
  return result;
}

test("Kraken curled tips keep neighbouring surface triangles on neighbouring joints", () => {
  const model = createCreature("kraken", 1);
  assert.equal(arms(model).length, 8);
  for (const arm of arms(model))
    for (const mesh of arm.userData.tentacle.meshes) {
      const indices = mesh.geometry.attributes.skinIndex,
        weights = mesh.geometry.attributes.skinWeight;
      for (let vertex = 0; vertex < indices.count; vertex += 3) {
        let low = Infinity,
          high = -Infinity;
        for (let offset = 0; offset < 3; offset++)
          for (let influence = 0; influence < 2; influence++) {
            const i = (vertex + offset) * 4 + influence;
            if (weights.array[i] <= 0.0001) continue;
            low = Math.min(low, indices.array[i]);
            high = Math.max(high, indices.array[i]);
          }
        assert.ok(
          high - low <= 2,
          "a curled surface cannot jump wrist segments",
        );
      }
    }
});

test("Kraken full swimming and grip cycles do not stretch triangles across its returning tip", () => {
  const model = createCreature("kraken", 1),
    surfaces = arms(model).flatMap((arm) => arm.userData.tentacle.meshes),
    restA = new THREE.Vector3(),
    restB = new THREE.Vector3(),
    posedA = new THREE.Vector3(),
    posedB = new THREE.Vector3();
  let maxStretch = 0;
  for (let phase = 0; phase <= 12; phase += 0.5) {
    model.userData.setKrakenGrip(phase > 6 ? 1 : 0);
    model.userData.animate(phase, 0.4, { gaitPhase: phase });
    model.updateMatrixWorld(true);
    for (const mesh of surfaces) {
      mesh.skeleton.update();
      const positions = mesh.geometry.attributes.position;
      for (let vertex = 0; vertex < positions.count; vertex += 3)
        for (let edge = 0; edge < 3; edge++) {
          const a = vertex + edge,
            b = vertex + ((edge + 1) % 3);
          restA.fromBufferAttribute(positions, a);
          restB.fromBufferAttribute(positions, b);
          const rest = restA.distanceTo(restB);
          if (rest < 0.000001) continue;
          mesh.getVertexPosition(a, posedA);
          mesh.getVertexPosition(b, posedB);
          assert.ok(posedA.toArray().every(Number.isFinite));
          maxStretch = Math.max(maxStretch, posedA.distanceTo(posedB) / rest);
        }
    }
  }
  assert.ok(maxStretch < 1.5, `Unnatural skin stretch: ${maxStretch}`);
  assert.deepEqual(model.position.toArray(), [0, 0, 0]);
  assert.deepEqual(model.quaternion.toArray(), [0, 0, 0, 1]);
});
