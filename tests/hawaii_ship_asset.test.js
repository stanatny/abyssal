import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createShips } from "../src/ships.js";
import { acquireHawaiiShipAsset } from "../src/hawaii_ship_asset.js";

for (const [kind, length, width] of [
  ["cruise", 64, 11],
  ["schooner", 29, 6.4],
  ["sloop", 21, 5.1],
]) {
  test(`${kind}: fitted visible hull retains shallow underpass and original beam/length`, () => {
    const asset = acquireHawaiiShipAsset(kind);
    try {
      const box = asset.geometry.boundingBox,
        size = box.getSize(new THREE.Vector3());
      assert.ok(Math.abs(size.z * length - length) < 0.001);
      assert.ok(Math.abs(size.x * length - width) < 0.001);
      assert.ok(Math.abs(box.min.y * length + 1.8) < 0.001);
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

test("Hawaii fleet shares immutable art without disposing another live fleet or changing independent transforms", () => {
  const scene = new THREE.Scene(),
    a = createShips(scene),
    b = createShips(scene);
  const counts = { geometry: 0, material: 0 };
  for (let i = 0; i < 3; i++) {
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
  assert.deepEqual(counts, { geometry: 3, material: 3 });
  assert.equal(scene.children.length, 0);
});
