import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { acquireBermudaWreckAsset } from "../src/bermuda_wreck_asset.js";
import { createBermudaWreck } from "../src/bermuda_wreck.js";

const kinds = [
  "wreck_funnel",
  "wreck_window",
  "wreck_boiler",
  "liner_sofa",
  "liner_bed",
  "liner_wardrobe",
  "liner_trunk",
];

test("Generated liner components keep finite colors, normals and bounded geometry without animation attributes", () => {
  for (const kind of kinds) {
    const a = acquireBermudaWreckAsset(kind);
    try {
      const g = a.geometry;
      assert.ok(
        g.index.count / 3 <
          (kind === "wreck_boiler"
            ? 11000
            : ["liner_sofa", "liner_wardrobe"].includes(kind)
              ? 9000
              : 6500),
      );
      assert.ok(!g.attributes.skinWeight && !g.attributes.skinIndex);
      for (const name of ["position", "normal", "color", "uv"])
        assert.ok(
          [...g.attributes[name].array].every(Number.isFinite),
          `${kind}/${name}`,
        );
      assert.equal(g.attributes.color.count, g.attributes.position.count);
      for (let i = 0; i < g.attributes.normal.count; i++)
        assert.ok(
          Math.abs(
            new THREE.Vector3()
              .fromBufferAttribute(g.attributes.normal, i)
              .length() - 1,
          ) < 0.002,
        );
      assert.equal(a.material.vertexColors, true);
      assert.equal(a.material.map, null);
      assert.equal(a.material.transparent, false);
    } finally {
      a.release();
    }
  }
});

test("Two live wrecks share all generated asset leases and release each resource only after the final owner", () => {
  const scene = new THREE.Scene(),
    a = createBermudaWreck(scene),
    b = createBermudaWreck(scene);
  const assets = a.root.userData.wreckArt.assets,
    retired = [];
  for (let i = 0; i < kinds.length; i++) {
    const other = b.root.userData.wreckArt.assets[i];
    assert.equal(assets[i].geometry, other.geometry);
    assert.equal(assets[i].material, other.material);
    for (const r of [assets[i].geometry, assets[i].material])
      r.addEventListener("dispose", () => retired.push(r));
  }
  const placements = b.root.userData.wreckArt.placements;
  assert.deepEqual(
    kinds.map((k) => placements.filter((p) => p.kind === k).length),
    [4, 17, 4, 4, 4, 4, 10],
  );
  assert.equal(b.colliders.length, 402);
  assert.equal(b.fixtures.length, 204);
  assert.equal(b.rooms.length, 11);
  a.dispose();
  a.dispose();
  assert.equal(retired.length, 0);
  assert.equal(b.root.children.length, 17);
  b.dispose();
  b.dispose();
  assert.equal(retired.length, 14);
  assert.equal(new Set(retired).size, 14);
  assert.equal(scene.children.length, 0);
  const next = acquireBermudaWreckAsset("wreck_funnel");
  assert.notEqual(next.geometry, assets[0].geometry);
  next.release();
});
