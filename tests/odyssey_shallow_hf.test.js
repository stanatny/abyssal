import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  buildOdysseyShallowHF,
  ODYSSEY_HF_SHALLOWS,
} from "../src/creature_odyssey_shallow_hf.js";
function build(kind) {
  const root = new T.Group(),
    motions = [];
  buildOdysseyShallowHF(kind, root, motions);
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
for (const kind of ODYSSEY_HF_SHALLOWS) {
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
test("Upright seahorse is uniformly fitted crown-to-tail, without stretching its anatomy", () => {
  const a = build("pearl_seahorse"),
    body = a.mesh.parent,
    size = new T.Box3().setFromObject(a.root).getSize(new T.Vector3());
  assert.ok(Math.abs(size.y - 1) < 1e-6);
  assert.ok(size.z < 0.6);
  assert.equal(body.scale.x, body.scale.y);
  assert.equal(body.scale.y, body.scale.z);
  assert.equal(a.root.userData.aquaticUpright, true);
  a.root.userData.disposeLocalMotion();
});
test("Scallop hinge stays attached while the front of the upper valve opens", () => {
  const a = build("moon_scallop"),
    p = a.mesh.geometry.attributes.position;
  let hinge = -1,
    front = -1;
  for (let i = 0; i < p.count; i++) {
    if (p.getZ(i) > 0.49) hinge = i;
    if (p.getY(i) > 0.06 && p.getZ(i) < -0.35) front = i;
  }
  assert.ok(hinge >= 0 && front >= 0);
  const start = surface(a);
  pose(a, 2);
  const end = surface(a);
  assert.ok(end[hinge].distanceTo(start[hinge]) < 1e-6);
  assert.ok(end[front].distanceTo(start[front]) > 0.025);
  a.root.userData.disposeLocalMotion();
});

// Box3.updateWorldMatrix alone does not refresh SkinnedMesh.bindMatrixInverse.
// The factory must synchronize it before the Guide's first cached bounds query.
test("New shallow factory gives correct bounds on the first query, including scaled seahorses", async () => {
  const { createCreature } = await import("../src/creatures.js");
  for (const length of [1, 2.4]) {
    const a = createCreature("pearl_seahorse", length);
    const size = new T.Box3().setFromObject(a).getSize(new T.Vector3());
    assert.ok(Math.abs(size.y - length) < 1e-5);
    a.userData.disposeLocalMotion();
  }
});
