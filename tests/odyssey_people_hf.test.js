import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  prepareOrdinaryBody,
  updateOrdinaryBody,
} from "../src/ordinary_body.js";
import {
  buildOdysseyPeopleHF,
  ODYSSEY_HF_PEOPLE,
} from "../src/creature_odyssey_people_hf.js";
function build(kind) {
  const root = new T.Group(),
    motions = [];
  buildOdysseyPeopleHF(kind, root, motions);
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
for (const kind of ODYSSEY_HF_PEOPLE) {
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

test("People factory returns correct first bounds and keeps feeding anchors attached", async () => {
  const { createCreature } = await import("../src/creatures.js");
  for (const kind of ODYSSEY_HF_PEOPLE)
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

function regionRange(a, accepts) {
  const p = a.mesh.geometry.attributes.position,
    indices = [];
  for (let i = 0; i < p.count; i++)
    if (accepts(p.getX(i), p.getY(i), p.getZ(i), i)) indices.push(i);
  assert.ok(indices.length > 10, "anatomical region must contain real skin");
  const rest = indices.map((i) => a.mesh.getVertexPosition(i, new T.Vector3()));
  let max = 0;
  for (let t = 0; t <= 8; t += 0.25) {
    pose(a, t, 1.5);
    indices.forEach((i, j) => {
      max = Math.max(
        max,
        a.mesh.getVertexPosition(i, new T.Vector3()).distanceTo(rest[j]),
      );
    });
  }
  return max;
}

for (const kind of ODYSSEY_HF_PEOPLE)
  test(`${kind}: appendage surface actually propels in a bounded cycle`, () => {
    const a = build(kind);
    assert.ok(regionRange(a, (x, y, z) => z > 0.38) > 0.035);
    const p = a.mesh.geometry.attributes.position,
      si = a.mesh.geometry.attributes.skinIndex,
      sw = a.mesh.geometry.attributes.skinWeight;
    for (const c of a.chains.filter((c) =>
      ["arm", "leg", "fin"].includes(c.type),
    )) {
      let count = 0,
        excursion = 0;
      const picks = [];
      for (let i = 0; i < p.count; i++) {
        let w = 0;
        for (let j = 0; j < 4; j++)
          if (c.ids.includes(si.array[i * 4 + j])) w += sw.array[i * 4 + j];
        if (w > 0.8 && i % 7 === 0) picks.push(i);
      }
      assert.ok(picks.length > 3, c.name + " visible skin ownership");
      const rest = picks.map((i) =>
        a.mesh.getVertexPosition(i, new T.Vector3()),
      );
      for (let t = 0; t < 8; t += 0.17) {
        pose(a, t, 1.5);
        picks.forEach(
          (i, j) =>
            (excursion = Math.max(
              excursion,
              a.mesh.getVertexPosition(i, new T.Vector3()).distanceTo(rest[j]),
            )),
        );
      }
      assert.ok(excursion > 0.005, c.name + " excursion " + excursion);
    }
    a.root.userData.disposeLocalMotion();
  });
for (const kind of ["nereid", "triton_guard"])
  test(`${kind}: torso armor and shoulder skin stay continuous, without added joint covers`, () => {
    const a = build(kind),
      g = a.mesh.geometry,
      p = g.attributes.position,
      idx = g.index.array;
    let maxStretch = 1,
      minAreaRatio = 1;
    const triangles = [];
    for (let j = 0; j < idx.length; j += 3) {
      const ids = Array.from(idx.slice(j, j + 3)),
        pts = ids.map((i) => new T.Vector3().fromBufferAttribute(p, i));
      if (!pts.every((v) => v.z < -0.1)) continue;
      const area = pts[1]
        .clone()
        .sub(pts[0])
        .cross(pts[2].clone().sub(pts[0]))
        .length();
      const edge2 = Math.max(
        pts[0].distanceToSquared(pts[1]),
        pts[0].distanceToSquared(pts[2]),
        pts[1].distanceToSquared(pts[2]),
      );
      if (area > 1e-6 && area / edge2 > 0.08) triangles.push({ ids, area });
    }
    for (let t = 0; t < 7; t += 0.25) {
      pose(a, t, 2);
      for (const tri of triangles) {
        const pts = tri.ids.map((i) =>
          a.mesh.getVertexPosition(i, new T.Vector3()),
        );
        const ratio =
          pts[1]
            .clone()
            .sub(pts[0])
            .cross(pts[2].clone().sub(pts[0]))
            .length() / tri.area;
        minAreaRatio = Math.min(minAreaRatio, ratio);
        maxStretch = Math.max(maxStretch, ratio);
      }
    }
    assert.ok(
      minAreaRatio > 0.55,
      kind + " collapsed triangle " + minAreaRatio,
    );
    assert.ok(maxStretch < 1.65, kind + " stretched triangle " + maxStretch);
    let meshes = 0;
    a.root.traverse((n) => {
      if (n.isMesh && !n.userData.visualOnly) meshes++;
    });
    assert.equal(meshes, 1);
    a.root.userData.disposeLocalMotion();
  });
