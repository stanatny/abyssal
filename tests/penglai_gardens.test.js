import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createPenglaiOcean } from "../src/penglai_ocean.js";
import {
  createPenglaiGardenAsset,
  createPenglaiLotusLeaf,
} from "../src/penglai_garden_asset.js";

test("Garden meshes retain colored opaque fallback and one source for both tree detail levels", () => {
  const owned = new Set(),
    keep = (r) => (owned.add(r), r);
  try {
    const a = createPenglaiGardenAsset("peach_tree", keep),
      b = createPenglaiGardenAsset("peach_tree_far", keep),
      f = createPenglaiGardenAsset("lotus_bloom", keep);
    assert.equal(a.packed.sourceSha256, b.packed.sourceSha256);
    for (const [m, limit] of [
      [a, 16000],
      [b, 3000],
      [f, 4000],
    ]) {
      assert.ok(m.packed.triangles <= limit);
      assert.ok(!m.geometry.hasAttribute("skinWeight"));
      assert.ok(new Set(m.geometry.attributes.color.array).size > 40);
      assert.equal(m.material.transparent, false);
      assert.equal(m.material.depthWrite, true);
      assert.equal(m.material.map, null);
      assert.ok(m.material.vertexColors);
      assert.ok(m.geometry.boundingBox.min.y >= -0.06);
    }
    assert.ok(
      a.geometry.boundingBox
        .getCenter(new T.Vector3())
        .distanceTo(b.geometry.boundingBox.getCenter(new T.Vector3())) < 0.35,
    );
  } finally {
    owned.forEach((r) => r.dispose());
  }
});

test("Every tree bucket has one visible detail level with identical instance placement", () => {
  const o = createPenglaiOcean(new T.Group());
  try {
    const ms = [];
    o.root.traverse((n) => {
      if (n.userData.hfGardenKind?.startsWith("peach_tree")) ms.push(n);
    });
    assert.equal(o.root.userData.peachTrees, 395);
    assert.equal(o.root.userData.skyPeachTrees, 30);
    const near = ms.filter((n) => n.userData.detailLevel === "near");
    assert.equal(
      near.reduce((s, m) => s + m.count, 0),
      425,
    );
    for (const a of near) {
      const b = ms.find(
        (m) =>
          m.userData.detailLevel === "far" &&
          m.userData.anchor.equals(a.userData.anchor),
      );
      assert.ok(b);
      assert.deepEqual(a.instanceMatrix.array, b.instanceMatrix.array);
      for (const [high, boundary] of [
        [true, 170],
        [false, 120],
      ])
        for (const d of [0, boundary - 0.1, boundary, boundary + 0.1, 250]) {
          o.update(
            0,
            a.userData.anchor.clone().add(new T.Vector3(d, 0, 0)),
            0,
            high,
          );
          assert.notEqual(a.visible, b.visible);
          assert.equal(a.visible, d < boundary);
        }
    }
  } finally {
    o.dispose();
  }
});

test("Garden foundations meet rendered terrain and small roofs have connected pillars", () => {
  const o = createPenglaiOcean(new T.Group());
  o.root.updateMatrixWorld(true);
  try {
    for (const c of o.colliders.filter(
      (c) => c.kind === "monastery_platform" && !(c.x === 0 && c.z === -650),
    )) {
      for (let i = 0; i <= 16; i++)
        for (let j = 0; j <= 16; j++) {
          const x = c.x + (i / 16 - 0.5) * c.halfSize.x * 2,
            z = c.z + (j / 16 - 0.5) * c.halfSize.z * 2;
          assert.ok(c.y + c.halfSize.y > o.groundHeightAt(x, z) + 0.7);
        }
    }
    const roofs = o.root.getObjectsByProperty(
      "name",
      "penglai_hf_pavilion_roof",
    );
    assert.equal(roofs.length, 10);
    for (const c of o.colliders.filter(
      (c) => c.kind === "pavilion_roof_support",
    )) {
      roofs[0].material.side = T.DoubleSide;
      const ray = new T.Raycaster(
          new T.Vector3(c.x, c.y - c.halfSize.y, c.z),
          new T.Vector3(0, 1, 0),
          0,
          15,
        ),
        hit = ray.intersectObjects(roofs)[0];
      assert.ok(hit && Math.abs(hit.point.y - c.y - c.halfSize.y) < 0.2);
    }
    const groundTrees = o.colliders.filter((c) => c.kind === "peach_trunk");
    for (const c of groundTrees)
      assert.ok(c.y - c.halfSize.y <= o.groundHeightAt(c.x, c.z));
    assert.ok(o.root.userData.lotusBeds.blooms > 20);
  } finally {
    o.dispose();
  }
});

test("Lotus leaves have a connected central attachment, cupped rim and finite normals", () => {
  const g = createPenglaiLotusLeaf();
  try {
    const p = g.attributes.position,
      n = g.attributes.normal;
    assert.equal(p.getX(0), 0);
    assert.equal(p.getZ(0), 0);
    assert.ok(p.getY(p.count - 1) > p.getY(0) + 0.08);
    for (const v of n.array) assert.ok(Number.isFinite(v));
  } finally {
    g.dispose();
  }
});
