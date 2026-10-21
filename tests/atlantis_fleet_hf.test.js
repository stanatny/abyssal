import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createAtlantisFleet } from "../src/atlantis_surface.js";
import { acquireAtlantisFleetAsset } from "../src/atlantis_fleet_asset.js";

for (const [kind, length, width, draft] of [
  ["fisher", 12, 3.9, 1],
  ["ketch", 15.5, 4.3, 1.1],
  ["launch", 9.5, 2.9, 0.75],
]) {
  test(`${kind}: fitted visible hull retains shallow underpass and original beam/length`, () => {
    const asset = acquireAtlantisFleetAsset(kind);
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

test("Atlantis fleet shares immutable art without disposing another live fleet or changing independent transforms", () => {
  const scene = new THREE.Scene(),
    a = createAtlantisFleet(scene),
    b = createAtlantisFleet(scene);
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

test("Steam launch funnel remains aligned with its retained solid collider", () => {
  const a = acquireAtlantisFleetAsset("launch"),
    p = a.geometry.attributes.position;
  try {
    let count = 0,
      z = 0;
    for (let i = 0; i < p.count; i++)
      if (p.getY(i) * 9.5 > 2.2) {
        z += p.getZ(i);
        count++;
      }
    assert.ok(count > 10);
    assert.ok(Math.abs(z / count + 0.08) * 9.5 < 0.05);
  } finally {
    a.release();
  }
});
