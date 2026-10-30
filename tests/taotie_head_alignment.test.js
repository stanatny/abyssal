import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCreature } from "../src/creatures.js";

// Corresponding left/right points on the original forehead and muzzle ridge.
// A yawed rest skull placed the partners 0.038–0.058 unit lengths apart in Z.
const pairs = [
  [20012, 2586],
  [8042, 14698],
  [8001, 7113],
];
test("Taotie's actual facial ridges face forward in rest and throughout ground gait", () => {
  const root = createCreature("taotie", 1, 31),
    mesh = root.userData.hfRig.mesh;
  const samples = [null, ...Array.from({ length: 120 }, (_, i) => i / 30)];
  for (const t of samples) {
    if (t !== null)
      root.userData.animate(t, 1, {
        gaitPhase: t * 3,
        speed: 1,
        phase: t < 2 ? "walk" : "leap",
      });
    root.updateMatrixWorld(true);
    mesh.skeleton.update();
    for (const [a, b] of pairs) {
      const left = mesh.getVertexPosition(a, new T.Vector3()),
        right = mesh.getVertexPosition(b, new T.Vector3());
      assert.ok(
        Math.abs(left.z - right.z) < 0.006,
        "face must not retain sideways rest yaw",
      );
      assert.ok(
        Math.abs(left.y - right.y) < 0.006,
        "face must not acquire a lateral tilt",
      );
    }
  }
  assert.ok(Math.abs(root.userData.getHeadWorldPositions()[0].x) < 0.002);
  root.userData.disposeLocalMotion();
});
