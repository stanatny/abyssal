import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCreature } from "../src/creatures.js";
import { createBermudaFleet } from "../src/bermuda_fleet.js";
import { acquireBermudaFleetAsset } from "../src/bermuda_fleet_asset.js";

for (const [kind, length, width] of [
  ["storm_freighter", 120, 23],
  ["storm_tanker", 145, 27],
]) {
  test(`${kind}: visible hull preserves original navigable beam, length and draft`, () => {
    const a = acquireBermudaFleetAsset(kind);
    try {
      const g = a.geometry,
        box = g.boundingBox,
        size = box.getSize(new T.Vector3());
      assert.ok(Math.abs(size.z - 1) < 1e-6);
      assert.ok(Math.abs(size.x * length - width) < 0.001);
      assert.ok(Math.abs(box.min.y * length + 7) < 0.001);
      assert.ok(Math.abs(box.max.y * length - 26) < 0.001);
      assert.ok(g.index.count / 3 < 17000);
      assert.ok(g.attributes.color.count === g.attributes.position.count);
      for (let i = 0; i < g.attributes.normal.count; i++)
        assert.ok(
          Math.abs(
            new T.Vector3()
              .fromBufferAttribute(g.attributes.normal, i)
              .length() - 1,
          ) < 0.001,
        );
    } finally {
      a.release();
    }
  });
}
test("Bermuda fleets share surfaces until the final owner leaves; movement and disposal stay independent", () => {
  const scene = new T.Scene(),
    a = createBermudaFleet(scene),
    b = createBermudaFleet(scene),
    disposed = { geometry: 0, material: 0 };
  a.ships.forEach((s, i) => {
    const m = s.root.userData.shipArt.body,
      other = b.ships[i].root.userData.shipArt.body;
    assert.equal(m.geometry, other.geometry);
    assert.equal(m.material, other.material);
    m.geometry.addEventListener("dispose", () => disposed.geometry++);
    m.material.addEventListener("dispose", () => disposed.material++);
  });
  a.update(40);
  const saved = a.ships.map((s) => s.root.matrixWorld.clone());
  b.update(150);
  a.ships.forEach((s, i) => assert.ok(s.root.matrixWorld.equals(saved[i])));
  a.dispose();
  a.dispose();
  assert.deepEqual(disposed, { geometry: 0, material: 0 });
  b.update(200);
  b.dispose();
  b.dispose();
  assert.deepEqual(disposed, { geometry: 2, material: 2 });
  assert.equal(scene.children.length, 0);
});
test("Crimson Sail shares immutable surface with normalized weights and independent disposable skeletons", () => {
  const a = createCreature("crimson_sail", 1, 42),
    b = createCreature("crimson_sail", 1, 42),
    m = a.userData.hfRig.mesh,
    g = m.geometry;
  assert.equal(g, b.userData.hfRig.mesh.geometry);
  assert.equal(m.material, b.userData.hfRig.mesh.material);
  assert.notEqual(m.skeleton, b.userData.hfRig.mesh.skeleton);
  assert.ok(Math.abs(g.boundingBox.getSize(new T.Vector3()).z - 1) < 1e-6);
  assert.ok(g.index.count / 3 < 6500);
  const w = g.attributes.skinWeight,
    ids = g.attributes.skinIndex;
  for (let i = 0; i < w.count; i++) {
    assert.ok(
      Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < 1e-6,
    );
    for (let j = 0; j < 4; j++)
      assert.ok(ids.array[i * 4 + j] < m.skeleton.bones.length);
  }
  const old = b.userData.hfRig.bones.map((x) => x.matrix.toArray());
  a.userData.animate(2, 3);
  assert.deepEqual(
    b.userData.hfRig.bones.map((x) => x.matrix.toArray()),
    old,
  );
  m.skeleton.computeBoneTexture();
  let count = 0;
  m.skeleton.boneTexture.addEventListener("dispose", () => count++);
  a.userData.disposeLocalMotion();
  a.userData.disposeLocalMotion();
  assert.equal(count, 1);
  b.userData.disposeLocalMotion();
});
test("Crimson Sail's bill stays rigid while actual tail, sail and paired fin vertices move continuously", () => {
  const r = createCreature("crimson_sail", 1, 42),
    { mesh, bones, body, sail, pec } = r.userData.hfRig,
    g = mesh.geometry,
    p = g.attributes.position;
  const vertex = (i) => mesh.getVertexPosition(i, new T.Vector3()),
    update = (f, e) => {
      r.userData.animate(f, e);
      r.updateMatrixWorld(true);
      mesh.skeleton.update();
    };
  update(0, 0.7);
  const bill = [],
    tips = [];
  for (let i = 0; i < p.count; i++)
    if (p.getZ(i) < -0.35) bill.push([i, vertex(i)]);
  for (const id of [body.at(-1), sail[0], ...pec]) {
    let best = -1,
      index = -1;
    for (let i = 0; i < p.count; i++) {
      let weight = 0;
      for (let j = 0; j < 4; j++)
        if (g.attributes.skinIndex.array[i * 4 + j] === id)
          weight += g.attributes.skinWeight.array[i * 4 + j];
      if (weight > best) {
        best = weight;
        index = i;
      }
    }
    assert.ok(best > 0.5);
    tips.push({ index, poses: [] });
  }
  for (let i = 0; i < 240; i++) {
    update(i / 60, i < 80 ? 0.7 : i < 160 ? 3 : 0.7);
    for (const [id, rest] of bill)
      assert.ok(vertex(id).distanceTo(rest) < 1e-7);
    for (const t of tips) {
      const v = vertex(t.index);
      assert.ok(mesh.boundingSphere.containsPoint(v));
      if (t.poses.length) assert.ok(v.distanceTo(t.poses.at(-1)) < 0.03);
      t.poses.push(v);
    }
  }
  for (const t of tips)
    assert.ok(
      new T.Box3().setFromPoints(t.poses).getSize(new T.Vector3()).length() >
        0.001,
    );
  const snapshot = bones.map((b) => b.rotation.toArray());
  update(239 / 60, 3);
  assert.deepEqual(
    bones.map((b) => b.rotation.toArray()),
    snapshot,
  );
  const seams = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
    if (seams.has(key))
      assert.ok(vertex(i).distanceTo(vertex(seams.get(key))) < 1e-7);
    else seams.set(key, i);
  }
  r.userData.disposeLocalMotion();
});
