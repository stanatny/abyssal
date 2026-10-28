import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  prepareOrdinaryBody,
  updateOrdinaryBody,
} from "../src/ordinary_body.js";
import {
  buildOdysseyFinalHF,
  ODYSSEY_HF_FINAL,
} from "../src/creature_odyssey_final_hf.js";
function build(kind) {
  const root = new T.Group(),
    motions = [];
  buildOdysseyFinalHF(kind, root, motions);
  root.updateMatrixWorld(true);
  return { root, motions, ...root.userData.hfRig };
}
function pose(a, t, s = 1) {
  a.motions.forEach((f) => f(t, s));
  a.root.updateMatrixWorld(true);
  a.mesh.skeleton.update();
}
function surface(a) {
  return Array.from(
    { length: a.mesh.geometry.attributes.position.count },
    (_, i) => a.mesh.getVertexPosition(i, new T.Vector3()),
  );
}
for (const kind of ODYSSEY_HF_FINAL) {
  test(`${kind}: continuous, finite normalized skin with independently owned motion`, () => {
    const a = build(kind),
      b = build(kind),
      g = a.mesh.geometry,
      si = g.attributes.skinIndex,
      sw = g.attributes.skinWeight;
    assert.equal(g, b.mesh.geometry);
    assert.equal(a.mesh.material, b.mesh.material);
    assert.notEqual(a.mesh.skeleton, b.mesh.skeleton);
    for (let i = 0; i < sw.count; i++) {
      let total = 0;
      for (let j = 0; j < 4; j++) {
        const w = sw.array[i * 4 + j];
        assert.ok(w >= 0 && w <= 1);
        total += w;
        assert.ok(si.array[i * 4 + j] < a.bones.length);
      }
      assert.ok(Math.abs(total - 1) < 1e-6);
    }
    const fixed = surface(b),
      origin = surface(a),
      groups = new Map();
    for (let i = 0; i < g.attributes.position.count; i++) {
      const key = origin[i]
        .toArray()
        .map((x) => x.toFixed(5))
        .join(",");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(i);
    }
    let excursion = 0;
    for (let f = 0; f <= 180; f++) {
      pose(a, f / 30, f < 90 ? 1 : 3);
      if (f % 15) continue;
      const p = surface(a);
      for (let i = 0; i < p.length; i++) {
        assert.ok(p[i].toArray().every(Number.isFinite));
        excursion = Math.max(excursion, p[i].distanceTo(origin[i]));
        assert.ok(
          a.mesh.boundingSphere.containsPoint(p[i]),
          `culling bound at ${i}`,
        );
      }
      for (const ids of groups.values())
        for (const i of ids)
          assert.ok(
            p[i].distanceTo(p[ids[0]]) < 0.00005,
            "UV seam must stay joined",
          );
    }
    assert.ok(excursion > 0.01, `actual skin excursion ${excursion}`);
    assert.deepEqual(surface(b), fixed);
    const frozen = surface(a);
    pose(a, 6, 3);
    assert.deepEqual(surface(a), frozen);
    assert.equal(a.root.position.length(), 0);
    assert.deepEqual(a.root.scale.toArray(), [1, 1, 1]);
    let disposed = 0;
    const dispose = a.mesh.skeleton.dispose.bind(a.mesh.skeleton);
    a.mesh.skeleton.dispose = () => {
      disposed++;
      dispose();
    };
    a.root.userData.disposeLocalMotion();
    a.root.userData.disposeLocalMotion();
    assert.equal(disposed, 1);
    b.root.userData.disposeLocalMotion();
  });
}

test("Final creature factory returns correct first bounds and keeps feeding anchors attached", async () => {
  const { createCreature } = await import("../src/creatures.js");
  for (const kind of ODYSSEY_HF_FINAL)
    for (const length of [1, 3]) {
      const a = createCreature(kind, length),
        box = new T.Box3().setFromObject(a.userData.hfRig.mesh),
        size = box.getSize(new T.Vector3());
      assert.ok(
        Math.abs(size[a.userData.lengthAxis || "z"] - length) < 1e-5,
        kind,
      );
      assert.equal(a.userData.mouthAnchors.length, 1);
      assert.ok(
        a.userData.mouthAnchors[0]
          .getWorldPosition(new T.Vector3())
          .toArray()
          .every(Number.isFinite),
      );
      a.userData.disposeLocalMotion();
    }
});

for (const kind of ODYSSEY_HF_FINAL)
  test(`${kind}: skin preserves area through articulated poses`, () => {
    const a = build(kind),
      p = a.mesh.geometry.attributes.position,
      idx = a.mesh.geometry.index.array,
      tri = [];
    for (let j = 0; j < idx.length; j += 3) {
      const ids = Array.from(idx.slice(j, j + 3)),
        v = ids.map((i) => new T.Vector3().fromBufferAttribute(p, i)),
        area = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).length(),
        edge = Math.max(
          v[0].distanceToSquared(v[1]),
          v[1].distanceToSquared(v[2]),
          v[2].distanceToSquared(v[0]),
        );
      if (area > 1e-6 && area / edge > 0.08) tri.push({ ids, area });
    }
    for (let t = 0; t < 8; t += 0.25) {
      pose(a, t, 3);
      for (const q of tri) {
        const [x, y, z] = q.ids.map((i) =>
            a.mesh.getVertexPosition(i, new T.Vector3()),
          ),
          ratio = y.sub(x).cross(z.sub(x)).length() / q.area;
        assert.ok(
          ratio > 0.5 && ratio < 1.7,
          `${kind}: surface area ratio ${ratio}`,
        );
      }
    }
    a.root.userData.disposeLocalMotion();
  });

test("Argonaut: rigid eggcase stays fixed while every free-arm chain owns moving skin", () => {
  const a = build("golden_argonaut"),
    p = a.mesh.geometry.attributes.position,
    si = a.mesh.geometry.attributes.skinIndex,
    sw = a.mesh.geometry.attributes.skinWeight;
  const shell = [],
    arms = a.chains
      .filter((c) => c.type === "tentacle")
      .map((c) => ({ c, indices: [], max: 0 }));
  for (let i = 0; i < p.count; i++) {
    if (p.getZ(i) > 0.05) shell.push(i);
    for (const q of arms) {
      let w = 0;
      for (let j = 0; j < 4; j++)
        if (q.c.ids.includes(si.array[i * 4 + j])) w += sw.array[i * 4 + j];
      if (w > 0.7) q.indices.push(i);
    }
  }
  assert.ok(shell.length > 1000);
  for (const q of arms) assert.ok(q.indices.length > 100, q.c.name);
  for (let t = 0; t < 8; t += 0.2) {
    pose(a, t, 2);
    for (const i of shell)
      assert.ok(
        a.mesh
          .getVertexPosition(i, new T.Vector3())
          .distanceTo(new T.Vector3().fromBufferAttribute(p, i)) < 1e-7,
      );
    for (const q of arms)
      for (const i of q.indices)
        q.max = Math.max(
          q.max,
          a.mesh
            .getVertexPosition(i, new T.Vector3())
            .distanceTo(new T.Vector3().fromBufferAttribute(p, i)),
        );
  }
  for (const q of arms)
    assert.ok(q.max > 0.015, q.c.name + " must visibly flex");
  a.root.userData.disposeLocalMotion();
});

test("Naga: tail drives travel and both hands move without dragging the hood", () => {
  const a = build("naga_huntress"),
    p = a.mesh.geometry.attributes.position,
    groups = { tail: [], left: [], right: [] },
    range = { tail: 0, left: 0, right: 0 };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    if (z > 0.35) groups.tail.push(i);
    if (y < -0.04 && z < -0.35 && Math.abs(x) > 0.13)
      groups[x < 0 ? "left" : "right"].push(i);
  }
  for (const ids of Object.values(groups)) assert.ok(ids.length > 10);
  for (let t = 0; t < 8; t += 0.2) {
    pose(a, t, 2);
    for (const [name, ids] of Object.entries(groups))
      for (const i of ids)
        range[name] = Math.max(
          range[name],
          a.mesh
            .getVertexPosition(i, new T.Vector3())
            .distanceTo(new T.Vector3().fromBufferAttribute(p, i)),
        );
  }
  assert.ok(range.tail > 0.07);
  assert.ok(range.left > 0.01 && range.right > 0.01);
  a.root.userData.disposeLocalMotion();
});
