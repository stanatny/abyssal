import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  buildOdysseyLargeHF,
  ODYSSEY_HF_LARGE,
} from "../src/creature_odyssey_large_hf.js";
function build(kind) {
  const root = new T.Group(),
    motions = [];
  buildOdysseyLargeHF(kind, root, motions);
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
for (const kind of ODYSSEY_HF_LARGE) {
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

test("Large factory returns correct first bounds and keeps feeding anchors attached", async () => {
  const { createCreature } = await import("../src/creatures.js");
  for (const kind of ODYSSEY_HF_LARGE)
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
test("Sturgeon armored head stays rigid while its asymmetric tail and both pectorals move", () => {
  const a = build("aegis_sturgeon");
  assert.ok(regionRange(a, (x, y, z) => z < -0.36) < 1e-7);
  assert.ok(regionRange(a, (x, y, z) => z > 0.42) > 0.035);
  for (const side of [-1, 1])
    assert.ok(regionRange(a, (x, y, z) => x * side > 0.12 && z < -0.2) > 0.005);
  a.root.userData.disposeLocalMotion();
});
test("Manta has bilateral travelling wing motion and a steady central feeding disc", () => {
  const a = build("thalassa_manta");
  for (const side of [-1, 1])
    assert.ok(regionRange(a, (x, y, z) => x * side > 0.38) > 0.08);
  assert.ok(
    regionRange(a, (x, y, z) => Math.abs(x) < 0.05 && z > -0.3 && z < 0) < 1e-7,
  );
  a.root.userData.disposeLocalMotion();
});
test("Sea hound posterior propulsion moves actual hind paddles, not just steering foreflippers", () => {
  const a = build("cerulean_hound");
  for (const side of [-1, 1])
    assert.ok(regionRange(a, (x, y, z) => x * side > 0.13 && z > 0.29) > 0.04);
  assert.ok(regionRange(a, (x, y, z) => z < -0.4) < 1e-7);
  a.root.userData.disposeLocalMotion();
});
test("Bronze turtle retains rigid carapace and plastron with two independently skinned paddles", () => {
  const a = build("bronze_turtle");
  assert.ok(
    regionRange(a, (x, y, z) => z > -0.12 && z < 0.2 && y > -0.03) < 1e-7,
  );
  assert.ok(
    regionRange(
      a,
      (x, y, z) => Math.abs(x) < 0.1 && z > -0.12 && z < 0.2 && y < -0.08,
    ) < 1e-7,
  );
  for (const side of [-1, 1])
    assert.ok(regionRange(a, (x, y, z) => x * side > 0.35 && z < -0.14) > 0.09);
  a.root.userData.disposeLocalMotion();
});
