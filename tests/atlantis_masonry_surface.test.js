import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { masonrySurfaces } from "../src/atlantis_masonry_surface.js";
import { createAtlantisPoseidonTemple } from "../src/atlantis_poseidon_temple.js";
import { atlantisSeabedHeight as heightAt } from "../src/atlantis_terrain.js";
import { createAtlantisLightPool } from "../src/atlantis_light_pool.js";
const source = new T.BoxGeometry(1, 1, 1);
source.setAttribute(
  "color",
  new T.Float32BufferAttribute(new Float32Array(72).fill(1), 3),
);
test("相交砌体只保留联合外皮，共面铺装由后加入的面单独承担", () => {
  const boxes = [
    { material: "stone", size: [10, 10, 10], center: [0, 0, 0] },
    { material: "marble", size: [10, 1, 10], center: [0, 4.5, 0] },
  ];
  const parts = masonrySurfaces(boxes, () => source);
  const root = new T.Group();
  for (const p of parts)
    root.add(
      new T.Mesh(p.geometry, new T.MeshBasicMaterial({ side: T.DoubleSide })),
    );
  root.updateMatrixWorld(true);
  const hits = new T.Raycaster(
    new T.Vector3(0.13, 8, 0.23),
    new T.Vector3(0, -1, 0),
    0,
    4,
  ).intersectObjects(root.children);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].point.y, 5);
  assert.equal(
    parts.find((p) => p.geometry === hits[0].object.geometry).material,
    "marble",
  );
  for (const p of parts) p.geometry.dispose();
});
test("主殿台基上方铺地与后墙不再存在重叠外皮，竖井仍开放", () => {
  const a = createAtlantisPoseidonTemple(new T.Group(), { heightAt });
  a.root.updateMatrixWorld(true);
  for (const [origin, dir, far] of [
    [[-55.23, -604, -920.31], [0, -1, 0], 6],
    [[31.13, -680, -963], [0, 0, 1], 3],
  ]) {
    const hits = new T.Raycaster(
      new T.Vector3(...origin),
      new T.Vector3(...dir),
      0,
      far,
    ).intersectObject(a.root, true);
    assert.equal(hits.length, 1, JSON.stringify(origin));
  }
  assert.equal(
    new T.Raycaster(
      new T.Vector3(0, -530, -922),
      new T.Vector3(0, -1, 0),
      0,
      175,
    ).intersectObject(a.root, true).length,
    0,
  );
  a.dispose();
});
test("灯池在等距处保持身份，亮灯不瞬移，暂停不推进淡变，数量不增长", () => {
  const r = new T.Group(),
    sources = [-12, 12, 30, 42, 54, 66].map((x) => ({
      position: new T.Vector3(x, 0, 0),
      color: "#ffe0aa",
      distance: 50,
      intensity: 100,
    }));
  const p = createAtlantisLightPool(r, sources);
  p.update(0, 0, new T.Vector3(-25, 0, 0), false);
  const lights = r.children,
    initial = lights.filter((l) => l.visible).map((l) => l.position.x);
  for (let i = 0; i < 20; i++)
    p.update(
      i / 60,
      1 / 60,
      new T.Vector3(-25 + Math.sin(i) * 0.1, 0, 0),
      false,
    );
  assert.deepEqual(
    lights.filter((l) => l.visible).map((l) => l.position.x),
    initial,
  );
  for (let i = 0; i < 120; i++) {
    let old = lights.map((l) => ({ x: l.position.x, intensity: l.intensity }));
    p.update(i / 60, 1 / 60, new T.Vector3(-25 + i * 0.6, 0, 0), false);
    for (let k = 0; k < 5; k++)
      if (old[k].x !== lights[k].position.x)
        assert.ok(lights[k].intensity < 1e-8);
    assert.equal(lights.filter((l) => l.visible).length, 3);
  }
  const before = lights.map((l) => [l.position.x, l.intensity]);
  p.update(119 / 60, 0, new T.Vector3(47, 0, 0), false);
  assert.deepEqual(
    lights.map((l) => [l.position.x, l.intensity]),
    before,
  );
  assert.equal(r.children.length, 5);
});
