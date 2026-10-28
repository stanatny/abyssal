import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  buildOdysseyGardenHF,
  ODYSSEY_HF_GARDEN,
} from "../src/creature_odyssey_garden_hf.js";
function build(kind) {
  const root = new T.Group(),
    motions = [];
  buildOdysseyGardenHF(kind, root, motions);
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
for (const kind of ODYSSEY_HF_GARDEN) {
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

test("Garden factory returns correct first bounds and keeps feeding anchors attached", async () => {
  const { createCreature } = await import("../src/creatures.js");
  for (const kind of ODYSSEY_HF_GARDEN)
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
test("Cuttlefish propulsion moves both fin edges while its central mantle stays intact", () => {
  const a = build("iris_cuttlefish");
  for (const side of [-1, 1])
    assert.ok(
      regionRange(a, (x, y, z) => x * side > 0.23 && z > -0.06 && z < 0.3) >
        0.025,
    );
  assert.ok(
    regionRange(
      a,
      (x, y, z) => Math.abs(x) < 0.06 && z > 0.08 && z < 0.36 && y < -0.06,
    ) < 1e-7,
  );
  a.root.userData.disposeLocalMotion();
});
test("Hermit's ceramic shelter remains rigid while all four fitted walking branches move", () => {
  const a = build("amphora_hermit"),
    g = a.mesh.geometry,
    sw = g.attributes.skinWeight,
    si = g.attributes.skinIndex;
  assert.ok(regionRange(a, (x, y, z) => z > 0.16) < 1e-7);
  for (const c of a.chains.filter((c) => c.name.startsWith("walking"))) {
    const range = regionRange(a, (x, y, z, i) => {
      let w = 0;
      for (let j = 0; j < 4; j++)
        if (c.ids.includes(si.array[i * 4 + j])) w += sw.array[i * 4 + j];
      return w > 0.8;
    });
    assert.ok(range > 0.008, c.name + " visible skin motion");
  }
  a.root.userData.disposeLocalMotion();
});
test("Garden packed meshes stay within their actual Uint16 index budget", () => {
  for (const kind of ODYSSEY_HF_GARDEN) {
    const a = build(kind),
      g = a.mesh.geometry;
    assert.ok(g.attributes.position.count <= 65535);
    for (const i of g.index.array) assert.ok(i < g.attributes.position.count);
    a.root.userData.disposeLocalMotion();
  }
});

test("Pipefish dorsal and both pectoral fins retain distinct weights and actual motion", () => {
  const a = build("silver_pipefish"),
    g = a.mesh.geometry,
    si = g.attributes.skinIndex,
    sw = g.attributes.skinWeight;
  for (const c of a.chains.filter((c) => c.name !== "body_tail")) {
    const delta = regionRange(a, (x, y, z, i) => {
      let w = 0;
      for (let j = 0; j < 4; j++)
        if (c.ids.includes(si.array[i * 4 + j])) w += sw.array[i * 4 + j];
      return w > 0.75;
    });
    assert.ok(delta > 0.006, c.name + " visible fin excursion");
  }
  a.root.userData.disposeLocalMotion();
});
