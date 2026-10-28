import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  prepareOrdinaryBody,
  updateOrdinaryBody,
} from "../src/ordinary_body.js";
import {
  buildOdysseyDeepHF,
  ODYSSEY_HF_DEEP,
} from "../src/creature_odyssey_deep_hf.js";
function build(kind) {
  const root = new T.Group(),
    motions = [];
  buildOdysseyDeepHF(kind, root, motions);
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
for (const kind of ODYSSEY_HF_DEEP) {
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

test("Deep factory returns correct first bounds and keeps feeding anchors attached", async () => {
  const { createCreature } = await import("../src/creatures.js");
  for (const kind of ODYSSEY_HF_DEEP)
    for (const length of [1, 3]) {
      const a = createCreature(kind, length),
        box = new T.Box3().setFromObject(a),
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
test("Ketos has a stable toothed head, lateral tail propulsion and two attached moving flippers", () => {
  const a = build("ketos");
  assert.ok(regionRange(a, (x, y, z) => z < -0.4) < 1e-7);
  assert.ok(regionRange(a, (x, y, z) => z > 0.4) > 0.035);
  for (const side of [-1, 1])
    assert.ok(
      regionRange(a, (x, y, z) => x * side > 0.25 && z < -0.17) > 0.025,
    );
  a.root.userData.disposeLocalMotion();
});
test("Whale flukes advance vertically while crown and upper chest retain their shape", () => {
  const a = build("oracle_whale");
  assert.ok(regionRange(a, (x, y, z) => z < -0.32) < 1e-7);
  const g = a.mesh.geometry.attributes.position;
  let tip = 0;
  for (let i = 1; i < g.count; i++) if (g.getZ(i) > g.getZ(tip)) tip = i;
  const ys = [],
    xs = [];
  for (let t = 0; t < 10; t += 0.12) {
    pose(a, t, 1.4);
    const p = a.mesh.getVertexPosition(tip, new T.Vector3());
    ys.push(p.y);
    xs.push(p.x);
  }
  assert.ok(Math.max(...ys) - Math.min(...ys) > 0.09);
  assert.ok(Math.max(...xs) - Math.min(...xs) < 0.001);
  for (const side of [-1, 1])
    assert.ok(regionRange(a, (x, y, z) => x * side > 0.16 && z < -0.1) > 0.012);
  a.root.userData.disposeLocalMotion();
});
for (const kind of ["abyss_lamprey", "ceto_serpent"])
  test(`${kind}: head, middle and tail skin participate without separating the mouth`, () => {
    const a = build(kind);
    assert.ok(regionRange(a, (x, y, z) => z < -0.43) > 0.002);
    assert.ok(regionRange(a, (x, y, z) => z > -0.1 && z < 0.15) > 0.015);
    assert.ok(regionRange(a, (x, y, z) => z > 0.38) > 0.06);
    const p = a.mesh.geometry.attributes.position,
      front = [];
    for (let i = 0; i < p.count; i++) if (p.getZ(i) < -0.43) front.push(i);
    const i = front[0],
      j = front[Math.floor(front.length / 2)],
      v = new T.Vector3(),
      u = new T.Vector3();
    const d = a.mesh
      .getVertexPosition(i, v)
      .distanceTo(a.mesh.getVertexPosition(j, u));
    for (let t = 0; t < 8; t += 0.17) {
      pose(a, t, 2);
      assert.ok(
        Math.abs(
          a.mesh
            .getVertexPosition(i, v)
            .distanceTo(a.mesh.getVertexPosition(j, u)) - d,
        ) < 1e-6,
      );
    }
    a.root.userData.disposeLocalMotion();
  });

test("Deep body contact retains the moving axial trunk and excludes paddles", () => {
  for (const kind of ODYSSEY_HF_DEEP) {
    const a = build(kind);
    prepareOrdinaryBody(a.root);
    const { sections } = a.root.userData.ordinaryBody;
    assert.ok(
      sections.some((s) => s.center.z < -0.1),
      kind + " chest",
    );
    assert.ok(
      sections.some((s) => s.center.z > 0.2),
      kind + " rear body",
    );
    const fins = new Set(
      a.chains.filter((c) => c.type === "pectoral").flatMap((c) => c.ids),
    );
    const ids = a.mesh.geometry.attributes.skinIndex;
    const weights = a.mesh.geometry.attributes.skinWeight;
    for (const s of sections)
      for (const index of s.samples) {
        let weight = 0;
        for (let j = 0; j < 4; j++)
          if (fins.has(ids.getComponent(index, j)))
            weight += weights.getComponent(index, j);
        assert.ok(weight <= 0.35, kind + " paddle is not solid trunk");
      }
    const before = updateOrdinaryBody(a.root).map(
      (c) => new T.Vector3(c.x, c.y, c.z),
    );
    pose(a, 1.7, 2);
    const after = updateOrdinaryBody(a.root);
    assert.ok(
      after.some(
        (c, i) => new T.Vector3(c.x, c.y, c.z).distanceTo(before[i]) > 0.005,
      ),
      kind + " contact follows skin",
    );
    a.root.userData.disposeLocalMotion();
  }
});
