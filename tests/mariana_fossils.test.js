import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import {
  createMarianaOcean,
  createMarianaOceanAsync,
} from "../src/mariana_ocean.js";
import { acquireMarianaFossilAsset } from "../src/mariana_fossil_asset.js";

test("化石完整基底嵌入真实岩台且可读凸纹保持在低矮装饰范围", () => {
  const ocean = createMarianaOcean(new THREE.Group());
  try {
    const f = ocean.root.userData.marianaFossils;
    assert.equal(f.placements.length, 35);
    assert.equal(f.batches.length, 5);
    const g = f.asset.geometry,
      p = g.attributes.position;
    const band =
      g.boundingBox.min.y + (g.boundingBox.max.y - g.boundingBox.min.y) * 0.08;
    const ray = new THREE.Raycaster(),
      down = new THREE.Vector3(0, -1, 0),
      point = new THREE.Vector3();
    ocean.root.updateMatrixWorld(true);
    for (const row of f.placements) {
      const m = new THREE.Matrix4().fromArray(row.matrix);
      const host = ocean.root.getObjectByName(
        `mariana_landmark_${row.site}_stone`,
      );
      let maxTop = -Infinity,
        minBase = Infinity,
        maxBase = -Infinity;
      for (let i = 0; i < p.count; i++) {
        point.fromBufferAttribute(p, i).applyMatrix4(m);
        ray.set(new THREE.Vector3(point.x, row.source.y + 5, point.z), down);
        ray.far = 10;
        const hit = ray.intersectObject(host, false)[0];
        assert.ok(hit, row.site + " missing real apron support");
        const gap = point.y - hit.point.y;
        maxTop = Math.max(maxTop, gap);
        if (p.getY(i) <= band) {
          maxBase = Math.max(maxBase, gap);
          minBase = Math.min(minBase, gap);
        }
      }
      assert.ok(
        maxBase <= -0.42 && minBase > -0.7,
        `${row.site} root ${minBase}/${maxBase}`,
      );
      assert.ok(maxTop > 0.25 && maxTop < 1.2, `${row.site} top ${maxTop}`);
    }
  } finally {
    ocean.dispose();
  }
});

test("化石原型保留实际几何螺旋、有限法线、有效UV和失效时的源色", () => {
  const a = acquireMarianaFossilAsset();
  try {
    const g = a.geometry;
    assert.equal(g.index.count / 3, 3500);
    assert.equal(g.attributes.color.count, g.attributes.position.count);
    const values = new Set();
    for (let i = 0; i < g.attributes.color.array.length; i++)
      values.add(g.attributes.color.array[i]);
    assert.ok(values.size > 30);
    for (const n of ["position", "normal", "uv"])
      assert.ok([...g.attributes[n].array].every(Number.isFinite));
    for (let i = 0; i < g.attributes.normal.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(g.attributes.normal, i);
      assert.ok(v.length() > 0.98 && v.length() < 1.02);
    }
    const p = g.attributes.position;
    let min = Infinity,
      max = -Infinity;
    for (let i = 0; i < p.count; i++)
      if (Math.hypot(p.getX(i), p.getZ(i)) < 0.25 && p.getY(i) > 0) {
        min = Math.min(min, p.getY(i));
        max = Math.max(max, p.getY(i));
      }
    assert.ok(
      max - min > 0.05,
      "central relief must be geometry, not flat color",
    );
  } finally {
    a.release();
  }
});

test("两个海沟共享化石原型，一个退出不破坏另一地图；最后退出和取消均释放", async () => {
  const a = createMarianaOcean(new THREE.Group()),
    b = createMarianaOcean(new THREE.Group());
  const x = a.root.userData.marianaFossils.asset,
    y = b.root.userData.marianaFossils.asset;
  assert.equal(x.geometry, y.geometry);
  assert.equal(x.material, y.material);
  let geo = 0,
    mat = 0;
  x.geometry.addEventListener("dispose", () => geo++);
  x.material.addEventListener("dispose", () => mat++);
  a.dispose();
  a.dispose();
  assert.equal(geo, 0);
  assert.equal(mat, 0);
  b.dispose();
  b.dispose();
  assert.equal(geo, 1);
  assert.equal(mat, 1);
  const parent = new THREE.Group();
  let partial,
    partialDisposals = 0;
  await assert.rejects(
    createMarianaOceanAsync(parent, {
      onStep(label) {
        if (label === "landmark") {
          partial = parent.children[0].userData.marianaFossils.asset;
          partial.geometry.addEventListener(
            "dispose",
            () => partialDisposals++,
          );
          throw Error("Canceled fossil build");
        }
      },
    }),
    /Canceled fossil build/,
  );
  assert.equal(parent.children.length, 0);
  assert.equal(partialDisposals, 1);
  const c = acquireMarianaFossilAsset();
  assert.notEqual(c.geometry, partial.geometry);
  c.release();
});

// UV 图集会拆点，先按空间位置焊接，再核对每条边恰有两个方向相反的相邻面。
test("化石实体修整后没有裸边或反向接缝", () => {
  const asset = acquireMarianaFossilAsset();
  const copy = asset.geometry.clone();
  for (const key of Object.keys(copy.attributes))
    if (key !== "position") copy.deleteAttribute(key);
  const solid = mergeVertices(copy, 1e-5),
    edges = new Map();
  const index = solid.index.array;
  try {
    for (let t = 0; t < index.length; t += 3) {
      const ids = [index[t], index[t + 1], index[t + 2]];
      for (let i = 0; i < 3; i++) {
        const a = ids[i],
          b = ids[(i + 1) % 3],
          key = a < b ? `${a},${b}` : `${b},${a}`;
        const e = edges.get(key) || { count: 0, direction: 0 };
        e.count++;
        e.direction += a < b ? 1 : -1;
        edges.set(key, e);
      }
    }
    for (const [key, edge] of edges) {
      assert.equal(edge.count, 2, `non-manifold edge ${key}`);
      assert.equal(edge.direction, 0, `inconsistent winding ${key}`);
    }
  } finally {
    copy.dispose();
    solid.dispose();
    asset.release();
  }
});
