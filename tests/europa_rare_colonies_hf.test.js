import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCreature } from "../src/creatures.js";
import { createEuropaOcean } from "../src/europa_ocean.js";
import { acquireEuropaColony } from "../src/europa_colony_asset.js";

test("Seraph: all six continuous membranes move; surface seams and independent instances survive", () => {
  const a = createCreature("crystal_seraph", 1),
    b = createCreature("crystal_seraph", 1),
    r = a.userData.hfRig,
    g = r.mesh.geometry,
    p = g.attributes.position;
  assert.equal(r.chains.length, 6);
  assert.equal(g, b.userData.hfRig.mesh.geometry);
  assert.notEqual(r.mesh.skeleton, b.userData.hfRig.mesh.skeleton);
  const duplicates = new Map(),
    seams = [];
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
    if (duplicates.has(key)) seams.push([duplicates.get(key), i]);
    else duplicates.set(key, i);
  }
  const tips = r.chains.map((c) => {
    let best = -Infinity,
      id = -1;
    for (let i = 0; i < p.count; i++) {
      let w = 0;
      for (let j = 0; j < 4; j++)
        if (c.ids.includes(g.attributes.skinIndex.array[i * 4 + j]))
          w += g.attributes.skinWeight.array[i * 4 + j];
      if (w > 0.8 && Math.abs(p.getX(i)) > best) {
        id = i;
        best = Math.abs(p.getX(i));
      }
    }
    assert.ok(id >= 0);
    return { id, box: new T.Box3() };
  });
  const untouched = b.userData.hfRig.bones.map((x) => [
    ...x.position,
    ...x.quaternion,
  ]);
  const v = new T.Vector3(),
    w = new T.Vector3();
  let min = 1,
    max = 1;
  for (let f = 0; f < 240; f++) {
    a.userData.animate(f / 30, f < 80 ? 1 : f < 160 ? 2 : 0.15);
    a.updateMatrixWorld(true);
    r.mesh.skeleton.update();
    for (const tip of tips)
      tip.box.expandByPoint(r.mesh.getVertexPosition(tip.id, v));
    if (f % 12) continue;
    for (const [i, j] of seams)
      assert.ok(
        r.mesh
          .getVertexPosition(i, v)
          .distanceTo(r.mesh.getVertexPosition(j, w)) < 1e-6,
      );
    for (let i = 0; i < g.index.count; i += 3)
      for (let j = 0; j < 3; j++) {
        const x = g.index.array[i + j],
          y = g.index.array[i + ((j + 1) % 3)],
          len = v
            .fromBufferAttribute(p, x)
            .distanceTo(w.fromBufferAttribute(p, y));
        if (len < 0.004) continue;
        const ratio =
          r.mesh
            .getVertexPosition(x, v)
            .distanceTo(r.mesh.getVertexPosition(y, w)) / len;
        min = Math.min(min, ratio);
        max = Math.max(max, ratio);
      }
    for (let i = 0; i < p.count; i++) {
      r.mesh.getVertexPosition(i, v);
      assert.ok(v.toArray().every(Number.isFinite));
      assert.ok(r.mesh.boundingSphere.containsPoint(v));
    }
  }
  assert.ok(min > 0.65 && max < 1.45, `surface strain ${min}..${max}`);
  for (const t of tips)
    assert.ok(
      t.box.getSize(v).length() > 0.04,
      "actual membrane tip must visibly move",
    );
  assert.deepEqual(
    b.userData.hfRig.bones.map((x) => [...x.position, ...x.quaternion]),
    untouched,
  );
  const pose = r.bones.map((x) => x.quaternion.toArray());
  a.userData.animate(239 / 30, 0.15);
  assert.deepEqual(
    r.bones.map((x) => x.quaternion.toArray()),
    pose,
  );
  r.mesh.skeleton.computeBoneTexture();
  let disposed = 0;
  r.mesh.skeleton.boneTexture.addEventListener("dispose", () => disposed++);
  a.userData.disposeLocalMotion();
  a.userData.disposeLocalMotion();
  assert.equal(disposed, 1);
  b.userData.disposeLocalMotion();
});

test("Europa colonies: retained rooted/hanging population, upright fans and bounded near detail", () => {
  const ocean = createEuropaOcean(new T.Group());
  assert.equal(
    ocean.colonyBatches
      .filter((b) => !b.mesh.name.includes("fans"))
      .reduce((n, b) => n + b.count, 0),
    329,
  );
  let fans = 0;
  ocean.root.traverse((n) => {
    if (n.name === "europa_rooted_fans_hf") {
      fans += n.count;
      assert.ok(n.geometry.boundingBox.min.y > -0.001);
      assert.ok(n.geometry.boundingBox.max.y > 8);
    }
  });
  assert.equal(fans, 305);
  for (const pos of [
    new T.Vector3(0, -80, 80),
    new T.Vector3(0, -260, -310),
    new T.Vector3(0, -700, -820),
  ]) {
    ocean.update(1, pos, 1 / 60, true);
    let near = 0;
    for (const b of ocean.colonyBatches) {
      assert.equal(b.mesh.count + b.far.count, b.count);
      near += b.mesh.count;
      assert.ok(b.far.geometry.index.count / 3 < 1300);
      assert.equal(
        b.mesh.geometry.attributes.position,
        b.far.geometry.attributes.position,
      );
    }
    assert.ok(near < 65, `near population ${near}`);
  }
  ocean.dispose();
  ocean.dispose();
  assert.equal(ocean.root.children.length, 0);
});

test("Colony shared buffers/texture queue release only when the last ocean releases", () => {
  const a = acquireEuropaColony("siphon"),
    b = acquireEuropaColony("siphon");
  assert.equal(a.geometry, b.geometry);
  assert.equal(a.prepare, b.prepare);
  let n = 0;
  a.geometry.addEventListener("dispose", () => n++);
  a.release();
  a.release();
  assert.equal(n, 0);
  b.release();
  assert.equal(n, 1);
  assert.equal(b.prepare.state, "disposed");
  const c = acquireEuropaColony("siphon");
  assert.notEqual(c.geometry, a.geometry);
  c.release();
});
