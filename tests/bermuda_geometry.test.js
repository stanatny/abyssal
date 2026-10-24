import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createBermudaBuilder } from "../src/bermuda_geometry.js";

test("Replacing box visuals keeps ordered solid IDs, rotation and following collider unchanged", () => {
  function build(visible) {
    const root = new THREE.Group();
    root.name = "liner";
    const resources = [],
      material = new THREE.MeshStandardMaterial();
    const b = createBermudaBuilder(
      root,
      (g) => (resources.push(g), g),
      new THREE.Vector3(12, -80, 7),
    );
    b.box(material, [1, 2, 3], [4, 5, 6], true, [0.2, -0.6, 0.4], visible);
    b.box(material, [-1, 4, 5], [2, 3, 4], true);
    b.finish();
    const result = {
      colliders: b.colliders,
      triangles: root.children.reduce(
        (n, m) => n + m.geometry.index.count / 3,
        0,
      ),
    };
    resources.forEach((g) => g.dispose());
    material.dispose();
    return result;
  }
  const original = build(true),
    replacement = build(false);
  assert.deepEqual(replacement.colliders, original.colliders);
  assert.deepEqual(
    replacement.colliders.map((c) => c.id),
    ["liner_0", "liner_1"],
  );
  assert.equal(original.triangles, 24);
  assert.equal(replacement.triangles, 12);
});
