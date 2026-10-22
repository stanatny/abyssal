import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  acquireAtlantisFurnitureAsset,
  createAtlantisFurnitureVisuals,
} from "../src/atlantis_furniture_asset.js";
import { createAtlantisRelic } from "../src/atlantis_relic.js";

test("Furniture skins preserve finite indexed surfaces, closed bounds and colored download fallback", () => {
  for (const kind of ["bench", "table", "chest", "amphora"]) {
    const a = acquireAtlantisFurnitureAsset(kind);
    try {
      const g = a.geometry;
      for (const v of Object.values(g.attributes))
        assert.ok(v.array.every(Number.isFinite));
      assert.equal(g.attributes.skinWeight, undefined);
      assert.equal(g.attributes.uv.count, g.attributes.position.count);
      assert.ok(g.index.array.every((i) => i < g.attributes.position.count));
      assert.ok(g.index.count / 3 < 1600);
      assert.ok(g.boundingBox.min.y >= -1e-5);
      assert.ok(g.boundingBox.max.y < 2.5);
      assert.ok(new Set(g.attributes.color.array).size > 32);
      assert.equal(a.material.vertexColors, true);
      assert.equal(a.material.map, null);
    } finally {
      a.release();
    }
  }
});

test("Furnishing instances release their own buffers while shared geometry survives another owner", () => {
  const parent = new THREE.Group(),
    p = [
      { kind: "bench", matrix: new THREE.Matrix4() },
      { kind: "bench", matrix: new THREE.Matrix4().makeTranslation(5, 0, 0) },
    ];
  const a = createAtlantisFurnitureVisuals(parent, p),
    b = createAtlantisFurnitureVisuals(parent, p),
    [m, n] = parent.children;
  assert.equal(m.geometry, n.geometry);
  assert.equal(m.material, n.material);
  assert.equal(m.count, 2);
  let instances = 0,
    geometry = 0,
    material = 0;
  m.addEventListener("dispose", () => instances++);
  m.geometry.addEventListener("dispose", () => geometry++);
  m.material.addEventListener("dispose", () => material++);
  a.dispose();
  a.dispose();
  assert.deepEqual([instances, geometry, material], [1, 0, 0]);
  assert.equal(parent.children.length, 1);
  b.dispose();
  b.dispose();
  assert.deepEqual([instances, geometry, material], [1, 1, 1]);
  assert.equal(parent.children.length, 0);
  const c = acquireAtlantisFurnitureAsset("bench");
  assert.notEqual(c.geometry, m.geometry);
  c.release();
});

test("Key aura is soft at every border, remains occluded and follows collection/reset ownership", () => {
  const r = createAtlantisRelic(new THREE.Group());
  const k = r.keyArt,
    g = k.key.getObjectByName("conch_key_soft_glow"),
    data = g.material.map.image.data;
  try {
    for (let i = 0; i < 64; i++)
      for (const j of [i, 63 * 64 + i, i * 64, i * 64 + 63])
        assert.equal(data[j * 4 + 3], 0);
    assert.ok(data[(32 * 64 + 32) * 4 + 3] > 230);
    assert.equal(g.material.depthTest, true);
    assert.equal(g.material.depthWrite, false);
    assert.equal(g.material.transparent, false);
    assert.ok(g.renderOrder < 0);
    const site = k.locations[0];
    k.setState({ keySiteId: site.id, keyCollected: false });
    k.update(0, site.point, false);
    assert.equal(k.key.visible, true);
    k.setState({ keySiteId: site.id, keyCollected: true });
    k.update(1, site.point, false);
    assert.equal(k.key.visible, false);
    k.setState({ keySiteId: site.id, keyCollected: false });
    k.update(2, site.point, true);
    assert.equal(g.material.opacity, 0.18);
    k.reset();
    assert.equal(k.key.visible, false);
    let tex = 0,
      mat = 0;
    g.material.map.addEventListener("dispose", () => tex++);
    g.material.addEventListener("dispose", () => mat++);
    r.dispose();
    r.dispose();
    assert.deepEqual([tex, mat], [1, 1]);
  } finally {
    r.dispose();
  }
});
