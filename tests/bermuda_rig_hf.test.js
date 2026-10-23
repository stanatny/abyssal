import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createBermudaFleet } from "../src/bermuda_fleet.js";
import { acquireBermudaRigAsset } from "../src/bermuda_rig_asset.js";

test("HF oil rig keeps the fixed deck/support collision corridor and terrain-dependent foundations", () => {
  const fleet = createBermudaFleet(new THREE.Scene(), { heightAt: () => -390 });
  try {
    assert.deepEqual(fleet.rig.root.position.toArray(), [210, 4, -450]);
    const c = fleet.rig.colliders;
    assert.equal(c.length, 10);
    assert.deepEqual([c[0].x, c[0].y, c[0].z], [194, -185.5, -470]);
    assert.deepEqual(c[0].halfSize.toArray(), [2.25, 204.5, 2.25]);
    assert.deepEqual([c[1].x, c[1].y, c[1].z], [194, -388, -470]);
    assert.deepEqual(c[1].halfSize.toArray(), [5, 2, 5]);
    assert.deepEqual([c[8].x, c[8].y, c[8].z], [210, 19, -450]);
    assert.deepEqual(c[8].halfSize.toArray(), [24, 1.5, 27.5]);
    assert.deepEqual([c[9].x, c[9].y, c[9].z], [197, 25, -445]);
    assert.deepEqual(c[9].halfSize.toArray(), [7, 5, 12.5]);
    const a = fleet.rig.root.userData.rigArt;
    assert.ok(a.topside.geometry.attributes.color);
    assert.equal(typeof fleet.rig.root.userData.prepareMaterials, "function");
  } finally {
    fleet.dispose();
  }
});

test("Rig material and mesh remain live until their final fleet owner leaves", () => {
  const scene = new THREE.Scene(),
    a = createBermudaFleet(scene),
    b = createBermudaFleet(scene);
  const x = a.rig.root.userData.rigArt.topside,
    y = b.rig.root.userData.rigArt.topside;
  assert.equal(x.geometry, y.geometry);
  assert.equal(x.material, y.material);
  let releasedGeometry = 0,
    releasedMaterial = 0;
  x.geometry.addEventListener("dispose", () => releasedGeometry++);
  x.material.addEventListener("dispose", () => releasedMaterial++);
  const start = y.matrixWorld.toArray();
  a.dispose();
  a.dispose();
  assert.equal(releasedGeometry, 0);
  assert.equal(releasedMaterial, 0);
  b.update(100);
  assert.deepEqual(y.matrixWorld.toArray(), start);
  b.dispose();
  b.dispose();
  assert.equal(releasedGeometry, 1);
  assert.equal(releasedMaterial, 1);
  assert.equal(scene.children.length, 0);
  const next = acquireBermudaRigAsset();
  assert.notEqual(next.geometry, x.geometry);
  next.release();
});

test("Rig packed surfaces retain finite unit normals and per-vertex fallback colors within the scenery budget", () => {
  const asset = acquireBermudaRigAsset();
  try {
    const g = asset.geometry;
    assert.ok(g.index.count / 3 < 45000);
    assert.equal(g.attributes.position.count, g.attributes.color.count);
    for (const name of ["position", "normal", "uv", "color"])
      assert.ok([...g.attributes[name].array].every(Number.isFinite), name);
    for (let i = 0; i < g.attributes.normal.count; i++)
      assert.ok(
        Math.abs(
          new THREE.Vector3()
            .fromBufferAttribute(g.attributes.normal, i)
            .length() - 1,
        ) < 0.002,
      );
    assert.ok(g.boundingBox.min.y >= 12);
    assert.ok(g.boundingBox.max.y < 80);
    assert.ok(g.boundingBox.min.x > -32 && g.boundingBox.max.x < 32);
    assert.ok(g.boundingBox.min.z > -34 && g.boundingBox.max.z < 34);
  } finally {
    asset.release();
  }
});
