import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createMarianaFleet } from "../src/mariana_surface.js";
import { acquireMarianaFleetAsset } from "../src/mariana_fleet_asset.js";

for (const [kind, length, width, draft] of [
  ["research", 68, 14, 2],
  ["tender", 22, 5.8, 2],
]) {
  test(`${kind}: fitted visible hull retains shallow underpass and original beam/length`, () => {
    const asset = acquireMarianaFleetAsset(kind);
    try {
      const box = asset.geometry.boundingBox,
        size = box.getSize(new THREE.Vector3());
      assert.ok(Math.abs(size.z * length - length) < 0.001);
      assert.ok(Math.abs(size.x * length - width) < 0.001);
      assert.ok(Math.abs(box.min.y * length + draft) < 0.001);
      const p = asset.geometry.attributes.position,
        n = asset.geometry.attributes.normal;
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        assert.ok([p.getX(i), p.getY(i), p.getZ(i)].every(Number.isFinite));
        assert.ok(Math.abs(v.fromBufferAttribute(n, i).length() - 1) < 0.001);
      }
      assert.ok(asset.geometry.index.count / 3 < 20000);
    } finally {
      asset.release();
    }
  });
}

test("Mariana fleet shares immutable art without disposing another live fleet or changing independent transforms", () => {
  const scene = new THREE.Scene(),
    a = createMarianaFleet(scene),
    b = createMarianaFleet(scene);
  const counts = { geometry: 0, material: 0 };
  for (let i = 0; i < 2; i++) {
    const ma = a.ships[i].root.userData.shipArt.body,
      mb = b.ships[i].root.userData.shipArt.body;
    assert.equal(ma.geometry, mb.geometry);
    assert.equal(ma.material, mb.material);
    ma.geometry.addEventListener("dispose", () => counts.geometry++);
    ma.material.addEventListener("dispose", () => counts.material++);
  }
  a.update(50);
  const position = a.ships[0].root.position.clone();
  b.update(100);
  assert.ok(a.ships[0].root.position.equals(position));
  a.dispose();
  a.dispose();
  assert.deepEqual(counts, { geometry: 0, material: 0 });
  b.update(200);
  b.dispose();
  b.dispose();
  assert.deepEqual(counts, { geometry: 2, material: 2 });
  assert.equal(scene.children.length, 0);
});

test("Mariana ships retain intact submerged hull surfaces and original deck working heights", () => {
  for (const [kind, length, deck] of [
    ["research", 68, 4],
    ["tender", 22, 0.8],
  ]) {
    const asset = acquireMarianaFleetAsset(kind);
    const mesh = new THREE.Mesh(asset.geometry, asset.material),
      ray = new THREE.Raycaster();
    mesh.updateMatrixWorld(true);
    try {
      ray.set(new THREE.Vector3(0.04, 1, 0.15), new THREE.Vector3(0, -1, 0));
      const top = ray.intersectObject(mesh)[0];
      assert.ok(top);
      assert.ok(Math.abs(top.point.y * length - deck) < 0.2);
      for (const z of [-0.25, 0, 0.25]) {
        ray.set(new THREE.Vector3(0, -1, z), new THREE.Vector3(0, 1, 0));
        const bottom = ray.intersectObject(mesh)[0];
        assert.ok(bottom);
        assert.ok(bottom.point.y < 0);
      }
      assert.equal(asset.material.transparent, false);
      assert.equal(asset.material.opacity, 1);
      assert.equal(
        asset.geometry.attributes.color.count,
        asset.geometry.attributes.position.count,
      );
    } finally {
      asset.release();
    }
  }
});
