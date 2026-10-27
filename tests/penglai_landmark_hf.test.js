import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createPenglaiGuardianLandmarks } from "../src/penglai_guardian_landmarks.js";
import { createPenglaiLandmarkAsset } from "../src/penglai_landmark_asset.js";

test("HF landmark contacts cover actual carved surfaces without a whole-wing blocking box", () => {
  for (const kind of ["dragon_column", "tiger_que", "vermilion_statue"]) {
    const owned = new Set(),
      a = createPenglaiLandmarkAsset(kind, (r) => (owned.add(r), r));
    try {
      assert.equal(a.packed.source, "Microsoft TRELLIS.2-4B");
      assert.match(a.packed.sourceSha256, /^[0-9a-f]{64}$/);
      assert.ok(a.geometry.attributes.color.array.some((v) => v > 0));
      assert.ok(a.geometry.attributes.color.array.some((v) => v < 180));
      const p = a.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const v = [p.getX(i), p.getY(i), p.getZ(i)];
        assert.ok(
          a.packed.contacts.some((c) =>
            v.every((x, j) => x >= c.min[j] - 2e-5 && x <= c.max[j] + 2e-5),
          ),
          `${kind} vertex ${i}`,
        );
      }
      if (kind === "vermilion_statue")
        for (const c of a.packed.contacts)
          assert.ok(c.max[0] - c.min[0] < 0.17);
      assert.ok(a.packed.triangles < 14000);
    } finally {
      owned.forEach((r) => r.dispose());
    }
  }
});

test("Paired carvings share within one region and remain opaque before image download", () => {
  const owner = new Set(),
    parent = new THREE.Group(),
    o = createPenglaiGuardianLandmarks(
      parent,
      (r) => (owner.add(r), r),
      [],
      () => 30,
    );
  try {
    const meshes = [];
    parent.traverse((n) => {
      if (n.userData.hfLandmarkKind) meshes.push(n);
    });
    assert.equal(meshes.length, 5);
    assert.equal(new Set(meshes.map((n) => n.geometry)).size, 3);
    assert.equal(new Set(meshes.map((n) => n.material)).size, 3);
    for (const n of meshes) {
      assert.equal(n.material.transparent, false);
      assert.equal(n.material.vertexColors, true);
      assert.equal(n.material.map, null);
      assert.equal(n.material.depthWrite, true);
      assert.equal(typeof n.userData.prepareMaterials, "function");
    }
    assert.equal(o.roots.length, 3);
  } finally {
    owner.forEach((r) => r.dispose());
  }
});
