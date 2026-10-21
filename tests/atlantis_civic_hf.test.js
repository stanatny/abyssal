import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { acquireAtlantisCivicKit } from "../src/atlantis_civic_asset.js";
import { cityArchitecture } from "../src/atlantis_architecture.js";
import { GEOMETRIES } from "../src/atlantis_art_geometry.js";
const kinds = ["temple", "rotunda", "gateway"];
const digest = (g) => {
  const h = createHash("sha256");
  for (const k of Object.keys(g.attributes).sort())
    h.update(k).update(Buffer.from(g.attributes[k].array.buffer));
  if (g.index) h.update(Buffer.from(g.index.array.buffer));
  return h.digest("hex");
};
test("公共建筑只替换指定绘制构件，尺寸与同序碰撞保持原套件契约", () => {
  for (const kind of kinds) {
    const old = cityArchitecture(kind),
      before = old.parts.map((p) => digest(p.geometry));
    const globalCount = GEOMETRIES.size,
      asset = acquireAtlantisCivicKit(kind);
    try {
      assert.deepEqual(asset.colliders, old.colliders);
      for (const k of ["width", "height", "depth"])
        assert.equal(asset[k], old[k]);
      assert.deepEqual(
        old.parts.map((p) => digest(p.geometry)),
        before,
      );
      assert.equal(GEOMETRIES.size, globalCount);
      for (const p of old.parts.filter((p) =>
        /glow|pearl|teal/i.test(p.geometry.name),
      ))
        assert.ok(
          asset.parts.some((a) => digest(a.geometry) === digest(p.geometry)),
          p.geometry.name,
        );
      const hf = asset.parts.filter((p) => p.material.name.includes("civic_"));
      assert.equal(hf.length, kind === "rotunda" ? 1 : 3);
      for (const part of hf) {
        const g = part.geometry;
        for (const a of Object.values(g.attributes))
          assert.ok(a.array.every(Number.isFinite));
        assert.equal(g.attributes.uv.count, g.attributes.position.count);
        assert.equal(g.attributes.color.count, g.attributes.position.count);
        assert.ok(new Set(g.attributes.uv.array).size > 100);
        g.computeBoundingBox();
        assert.ok(!g.boundingBox.isEmpty());
      }
      const cost = asset.parts.reduce(
        (n, p) =>
          n +
          (p.geometry.index?.count ?? p.geometry.attributes.position.count) / 3,
        0,
      );
      assert.ok(
        cost <
          (kind === "temple" ? 125000 : kind === "rotunda" ? 46000 : 55000),
        `${kind}: ${cost}`,
      );
    } finally {
      asset.release();
    }
  }
});
test("多城市共享构件与套件，最后所有者释放且可重新创建", () => {
  const a = acquireAtlantisCivicKit("temple"),
    b = acquireAtlantisCivicKit("temple"),
    c = acquireAtlantisCivicKit("rotunda");
  assert.equal(a.parts[0].geometry, b.parts[0].geometry);
  const material = a.parts.find(
    (p) => p.material.name === "atlantis_civic_column_hf_stone",
  ).material;
  assert.equal(material, c.parts.find((p) => p.material === material).material);
  let g = 0,
    m = 0;
  a.parts[0].geometry.addEventListener("dispose", () => g++);
  material.addEventListener("dispose", () => m++);
  a.release();
  a.release();
  assert.equal(g, 0);
  assert.equal(m, 0);
  b.release();
  assert.equal(g, 1);
  assert.equal(m, 0);
  c.release();
  c.release();
  assert.equal(m, 1);
  const d = acquireAtlantisCivicKit("temple");
  assert.notEqual(d.parts[0].geometry, a.parts[0].geometry);
  d.release();
});
test("大拱门中央开口保持无可见封板", () => {
  const a = acquireAtlantisCivicKit("gateway");
  try {
    const group = new THREE.Group();
    a.parts.forEach((p) => group.add(new THREE.Mesh(p.geometry, p.material)));
    group.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0, 24.5, 20),
      new THREE.Vector3(0, 0, -1),
      0,
      40,
    );
    assert.equal(ray.intersectObject(group, true).length, 0);
    const side = new THREE.Raycaster(
      new THREE.Vector3(25, 24.5, 20),
      new THREE.Vector3(0, 0, -1),
      0,
      40,
    );
    assert.ok(side.intersectObject(group, true).length > 0);
  } finally {
    a.release();
  }
});
