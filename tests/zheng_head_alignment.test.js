import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCreature } from "../src/creatures.js";

// Corresponding ridges on the original skull, fitted independently of horn tips.
const pairs = [
  [505, 1765],
  [5043, 2500],
  [9760, 1986],
];
test("Zheng's facial ridges face along its travel axis in neutral and walking poses", () => {
  const root = createCreature("zheng", 1),
    mesh = root.userData.hfRig.mesh;
  for (let f = -1; f < 120; f++) {
    if (f >= 0)
      root.userData.animate(f / 60, 1, {
        gaitPhase: f / 30,
        speed: 1,
        phase: "walk",
      });
    root.updateMatrixWorld(true);
    mesh.skeleton.update();
    for (const [a, b] of pairs) {
      const left = mesh.getVertexPosition(a, new T.Vector3()),
        right = mesh.getVertexPosition(b, new T.Vector3());
      assert.ok(
        Math.abs(left.z - right.z) < 0.004,
        "skull must not retain sideways yaw",
      );
      assert.ok(Math.abs(left.y - right.y) < 0.003, "skull must stay upright");
    }
  }
  assert.deepEqual(
    root.userData.getHeadWorldPositions()[0].toArray(),
    [0, 0.0633821951165253, -0.49856400000036627],
  );
  root.userData.disposeLocalMotion();
});
