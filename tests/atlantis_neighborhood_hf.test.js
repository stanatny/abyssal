import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { acquireAtlantisNeighborhoodKit } from "../src/atlantis_neighborhood_asset.js";
import { acquireAtlantisCivicKit } from "../src/atlantis_civic_asset.js";
import { cityArchitecture } from "../src/atlantis_architecture.js";
import { GEOMETRIES } from "../src/atlantis_art_geometry.js";
const digest = (g) => {
  const h = createHash("sha256");
  for (const name of Object.keys(g.attributes).sort())
    h.update(name).update(Buffer.from(g.attributes[name].array.buffer));
  if (g.index) h.update(Buffer.from(g.index.array.buffer));
  return h.digest("hex");
};
const count = (parts) =>
  parts.reduce(
    (n, p) =>
      n + (p.geometry.index?.count ?? p.geometry.attributes.position.count) / 3,
    0,
  );
test("街区构件保持同序实体、尺寸、发光层和旧模板，限制重复几何成本", () => {
  for (const [kind, budget] of [
    ["courtyard", 12000],
    ["villa", 4500],
    ["stoa", 13000],
    ["tower", 20000],
  ]) {
    const original = cityArchitecture(kind),
      hashes = original.parts.map((p) => digest(p.geometry)),
      globalCount = GEOMETRIES.size;
    const kit = acquireAtlantisNeighborhoodKit(kind);
    try {
      assert.deepEqual(kit.colliders, original.colliders);
      for (const key of ["width", "height", "depth"])
        assert.equal(kit[key], original[key]);
      assert.deepEqual(
        original.parts.map((p) => digest(p.geometry)),
        hashes,
      );
      assert.equal(GEOMETRIES.size, globalCount);
      assert.ok(
        count(kit.parts) - count(original.parts) < budget,
        `${kind}: ${count(kit.parts) - count(original.parts)}`,
      );
      const fresh = kit.parts.filter(
        (p) =>
          p.material.name.startsWith("atlantis_neighborhood_") ||
          p.material.name.startsWith("atlantis_civic_"),
      );
      assert.equal(fresh.length, kind === "tower" ? 2 : 1);
      for (const part of fresh) {
        for (const a of Object.values(part.geometry.attributes))
          assert.ok(a.array.every(Number.isFinite));
        assert.equal(
          part.geometry.attributes.uv.count,
          part.geometry.attributes.position.count,
        );
        if (part.material.name.startsWith("atlantis_neighborhood_"))
          assert.ok(new Set(part.geometry.attributes.color.array).size > 32);
        part.geometry.computeBoundingBox();
        assert.ok(!part.geometry.boundingBox.isEmpty());
      }
      for (const p of original.parts.filter((p) =>
        /glow|pearl|teal/i.test(p.geometry.name),
      ))
        assert.ok(
          kit.parts.some((q) => digest(q.geometry) === digest(p.geometry)),
          p.geometry.name,
        );
    } finally {
      kit.release();
    }
  }
});
test("庭院门柱保留七米门洞，塔冠和山花不生成封闭房屋外壳", () => {
  for (const [kind, origin, distance] of [
    ["courtyard", [0, 4, 14], 4],
    ["villa", [0, 7, 12], 5],
    ["stoa", [0, 10, 12], 5],
    ["tower", [0, 36, 10], 15],
  ]) {
    const kit = acquireAtlantisNeighborhoodKit(kind);
    try {
      const group = new THREE.Group();
      kit.parts.forEach((p) =>
        group.add(new THREE.Mesh(p.geometry, p.material)),
      );
      group.updateMatrixWorld(true);
      const ray = new THREE.Raycaster(
        new THREE.Vector3(...origin),
        new THREE.Vector3(0, 0, -1),
        0,
        distance,
      );
      assert.equal(ray.intersectObject(group, true).length, 0, kind);
      if (kind === "courtyard")
        for (const x of [-3.35, 3.35]) {
          ray.ray.origin.x = x;
          assert.equal(ray.intersectObject(group, true).length, 0);
        }
    } finally {
      kit.release();
    }
  }
});
test("街区与公共建筑交错持有共用柱材质，最后所有者才回收且可以重建", () => {
  for (const civicFirst of [true, false]) {
    const a = acquireAtlantisNeighborhoodKit("tower"),
      b = acquireAtlantisNeighborhoodKit("tower"),
      c = acquireAtlantisCivicKit("temple");
    const material = a.parts.find(
      (p) => p.material.name === "atlantis_civic_column_hf_stone",
    ).material;
    assert.ok(c.parts.some((p) => p.material === material));
    assert.equal(a.parts[0].geometry, b.parts[0].geometry);
    let geometryDisposals = 0,
      materialDisposals = 0;
    a.parts[0].geometry.addEventListener("dispose", () => geometryDisposals++);
    material.addEventListener("dispose", () => materialDisposals++);
    if (civicFirst) c.release();
    a.release();
    a.release();
    assert.equal(geometryDisposals, 0);
    assert.equal(materialDisposals, 0);
    b.release();
    assert.equal(geometryDisposals, 1);
    assert.equal(materialDisposals, civicFirst ? 1 : 0);
    c.release();
    assert.equal(materialDisposals, 1);
    const next = acquireAtlantisNeighborhoodKit("tower");
    assert.notEqual(next.parts[0].geometry, a.parts[0].geometry);
    next.release();
  }
});
