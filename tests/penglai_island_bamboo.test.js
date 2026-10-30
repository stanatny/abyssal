import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createPenglaiSkyIslands,
  PENGLAI_SKY_ISLANDS,
} from "../src/penglai_sky_islands.js";
import { createPenglaiBambooAsset } from "../src/penglai_bamboo_asset.js";

test("Every floating island is opaque and its actual outer triangles occlude rays from above and below", () => {
  const parent = new THREE.Group(),
    colliders = [];
  const islands = createPenglaiSkyIslands(parent, colliders);
  parent.updateMatrixWorld(true);
  for (const [i, site] of PENGLAI_SKY_ISLANDS.entries()) {
    const mesh = islands.root.getObjectByName(`floating_island_${i}`);
    assert.equal(mesh.material.transparent, false);
    assert.equal(mesh.material.side, THREE.FrontSide);
    const x = site.x + site.rx * 0.23,
      z = site.z + site.rz * 0.17;
    const top = new THREE.Raycaster(
      new THREE.Vector3(x, site.y + 30, z),
      new THREE.Vector3(0, -1, 0),
    ).intersectObject(mesh);
    const bottom = new THREE.Raycaster(
      new THREE.Vector3(x, site.y - site.drop - 30, z),
      new THREE.Vector3(0, 1, 0),
    ).intersectObject(mesh);
    assert.equal(top.length, 1, `island ${i} outer top must exist`);
    assert.equal(bottom.length, 1, `island ${i} outer underside must exist`);
    assert.ok(top[0].face.normal.y > 0.7);
    assert.ok(bottom[0].face.normal.y < -0.05);
    assert.ok(top[0].point.y > bottom[0].point.y);
  }
  assert.equal(colliders.length, 24);
  islands.dispose();
  islands.dispose();
  assert.equal(parent.children.length, 0);
});

test("Bamboo retains decoded color during loading, bounded foliage and map-owned resources", () => {
  const owned = new Set(),
    keep = (x) => (owned.add(x), x),
    a = createPenglaiBambooAsset(keep);
  assert.equal(a.geometry.userData.hfGardenKind, "bamboo_clump");
  assert.equal(a.geometry.userData.prepareMaterials, a.prepare);
  assert.equal(a.material.transparent, false);
  assert.equal(a.material.vertexColors, true);
  assert.equal(
    a.geometry.attributes.color.count,
    a.geometry.attributes.position.count,
  );
  assert.ok(a.geometry.index.count / 3 <= 7100);
  assert.ok(Math.abs(a.geometry.boundingBox.min.y) < 0.001);
  assert.ok(Math.abs(a.geometry.boundingBox.max.y - 20) < 0.001);
  assert.ok(a.geometry.boundingBox.max.x - a.geometry.boundingBox.min.x < 11);
  assert.ok(a.geometry.boundingBox.max.z - a.geometry.boundingBox.min.z < 10);
  assert.ok(!a.geometry.attributes.skinIndex);
  let freed = 0;
  for (const r of owned)
    if (r.addEventListener) r.addEventListener("dispose", () => freed++);
  for (const r of owned) r.dispose();
  assert.equal(freed, 2);
});
