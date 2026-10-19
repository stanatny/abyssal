import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { getRegionSpecies } from "../src/region_ecology.js";

const kinds = ["plesiosaur", "dunkleosteus"];
const point = new THREE.Vector3();
function posed(model, vertex) {
  model.updateMatrixWorld(true);
  const mesh = model.userData.hfRig.mesh;
  mesh.skeleton.update();
  return mesh.getVertexPosition(vertex, new THREE.Vector3());
}
for (const kind of kinds) {
  test(`${kind}: actual HF geometry is finite, normalized, budgeted and shared with independent skeletons`, () => {
    const a = createCreature(kind, 1, 31),
      b = createCreature(kind, 1, 31);
    const ga = a.userData.hfRig.mesh,
      gb = b.userData.hfRig.mesh;
    assert.equal(a.userData.ancientAnatomy, kind);
    assert.equal(a.userData.artRevision, "trellis_hawaii_prehistoric_20261019");
    assert.equal(ga.geometry, gb.geometry);
    assert.equal(ga.material, gb.material);
    assert.notEqual(ga.skeleton, gb.skeleton);
    const g = ga.geometry,
      p = g.attributes.position,
      n = g.attributes.normal;
    // The thin armored-fish fins retain source topology after reduced versions visibly folded.
    assert.ok(g.index.count / 3 <= (kind === "dunkleosteus" ? 19000 : 7500));
    assert.ok(Math.abs(g.boundingBox.max.z - g.boundingBox.min.z - 1) < 1e-6);
    for (let i = 0; i < p.count; i++) {
      assert.ok(
        point.fromBufferAttribute(p, i).toArray().every(Number.isFinite),
      );
      assert.ok(Math.abs(point.fromBufferAttribute(n, i).length() - 1) < 0.002);
      const w = g.attributes.skinWeight;
      assert.ok(
        Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < 1e-6,
      );
    }
    const unchanged = posed(b, p.count - 1);
    for (let i = 0; i < 100; i++) a.userData.animate(i / 60, 3);
    assert.deepEqual(posed(b, p.count - 1), unchanged);
    let disposed = 0;
    ga.skeleton.computeBoneTexture();
    ga.skeleton.boneTexture.addEventListener("dispose", () => disposed++);
    a.userData.disposeLocalMotion();
    a.userData.disposeLocalMotion();
    assert.equal(disposed, 1);
  });

  test(`${kind}: actual tail/pectoral tips move continuously, pause freezes and UV duplicates stay welded`, () => {
    const m = createCreature(kind, 1, 51),
      g = m.userData.hfRig.mesh.geometry,
      p = g.attributes.position;
    const tip = (predicate, score) => {
      let found = -1,
        max = -Infinity;
      for (let i = 0; i < p.count; i++)
        if (predicate(i) && score(i) > max) {
          max = score(i);
          found = i;
        }
      assert.ok(found >= 0);
      return found;
    };
    const { chains } = m.userData.hfRig;
    const tips = chains
      .filter((c) => c.type === "fin")
      .map((fin) =>
        tip(
          (i) =>
            g.attributes.skinIndex.getW(i) === fin.ids[0] &&
            g.attributes.skinWeight.getW(i) > 0.8,
          (i) => Math.abs(p.getX(i)),
        ),
      );
    assert.equal(tips.length, 4);
    const tail = tip(
      (i) => p.getZ(i) > 0.4,
      (i) => p.getZ(i),
    );
    const records = tips.concat(tail).map(() => []);
    let maxStep = 0;
    for (let frame = 0; frame < 480; frame++) {
      m.userData.animate(frame / 60, frame < 180 ? 0.7 : frame < 360 ? 3 : 0.7);
      for (const [j, id] of tips.concat(tail).entries()) {
        const q = posed(m, id);
        if (records[j].length)
          maxStep = Math.max(maxStep, q.distanceTo(records[j].at(-1)));
        records[j].push(q);
      }
    }
    for (const series of records.slice(0, 4))
      assert.ok(
        Math.max(...series.map((v) => v.y)) -
          Math.min(...series.map((v) => v.y)) >
          0.01,
        "actual pectoral excursion",
      );
    const tailTravel =
      Math.max(...records[4].map((v) => v.x)) -
      Math.min(...records[4].map((v) => v.x));
    assert.ok(
      kind === "dunkleosteus" ? tailTravel > 0.1 : tailTravel < 0.05,
      "tail propulsion for Dunkleosteus, a stable steering tail for Plesiosaur",
    );
    assert.ok(maxStep < 0.03, `no pose pop: ${maxStep}`);
    const freeze = posed(m, tail);
    m.userData.animate(479 / 60, 3);
    assert.deepEqual(posed(m, tail), freeze);
    const groups = new Map();
    let seams = 0;
    for (let i = 0; i < p.count; i++) {
      const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
      if (groups.has(key)) {
        seams++;
        assert.ok(posed(m, i).distanceTo(posed(m, groups.get(key))) < 1e-7);
      } else groups.set(key, i);
    }
    assert.ok(seams > 100);
  });
}
test("all regional instances retain the existing creature size and populations", () => {
  const expected = {
    hawaii: [
      ["dunkleosteus", 6, 7],
      ["plesiosaur", 12, 7],
    ],
    atlantis: [["plesiosaur", 12, 8]],
    bermuda: [
      ["dunkleosteus", 6, 5],
      ["plesiosaur", 12, 5],
    ],
    mariana: [["plesiosaur", 12, 20]],
    odyssey: [],
    europa: [],
    amazon: [],
    penglai: [],
  };
  for (const [region, values] of Object.entries(expected)) {
    const species = getRegionSpecies(region).filter((s) =>
      kinds.includes(s.kind),
    );
    assert.deepEqual(
      species.map((s) => [s.kind, s.length, s.population]),
      values,
    );
    for (const s of species) {
      const m = createCreature(s.kind, s.length);
      assert.equal(m.scale.x, s.length);
      assert.equal(m.userData.length, s.length);
      assert.equal(m.userData.hfRig.kind, s.kind);
    }
  }
});

test("ancient heads remain aligned with travel and steering fins stay outside the torso", () => {
  for (const kind of kinds) {
    const m = createCreature(kind, 1, 13),
      { mesh, chains, bones } = m.userData.hfRig;
    const p = mesh.geometry.attributes.position,
      w = mesh.geometry.attributes.skinWeight,
      ids = mesh.geometry.attributes.skinIndex;
    const head = [];
    for (let i = 0; i < p.count; i++)
      if (p.getZ(i) < -0.36) head.push([i, posed(m, i)]);
    const fins = chains.filter((c) => c.type === "fin");
    const tips = fins.map((fin) => {
      let id = -1,
        score = -Infinity;
      for (let i = 0; i < p.count; i++)
        if (
          ids.getW(i) === fin.ids[0] &&
          w.getW(i) > 0.8 &&
          Math.abs(p.getX(i)) > score
        ) {
          id = i;
          score = Math.abs(p.getX(i));
        }
      assert.ok(id >= 0, fin.name + " has an actual distal surface");
      return { fin, id, local: [] };
    });
    for (let i = 0; i < 360; i++) {
      m.userData.animate(i / 60, i < 180 ? 0.7 : 3);
      m.updateMatrixWorld(true);
      for (const t of tips) {
        const parent = bones[t.fin.ids[0]].parent;
        const v = posed(m, t.id)
          .applyMatrix4(mesh.matrixWorld)
          .applyMatrix4(parent.matrixWorld.clone().invert());
        assert.ok(
          v.x * t.fin.side > 0.05,
          "fin tip stays outside the trunk centerline",
        );
        t.local.push(v.clone());
      }
      for (const [id, initial] of head)
        assert.ok(
          posed(m, id).distanceTo(initial) < 1e-7,
          "anatomical front must not wander away from existing attack direction",
        );
    }
    for (const t of tips)
      assert.ok(
        Math.max(...t.local.map((v) => v.y)) -
          Math.min(...t.local.map((v) => v.y)) >
          0.004,
        "each actual fin moves relative to its torso support",
      );
  }
});

test("Plesiosaur has four supported hydrofoils; Dunkleosteus retains a whole vertical tail", () => {
  for (const kind of kinds) {
    const { mesh, chains } = createCreature(kind, 1).userData.hfRig;
    const g = mesh.geometry,
      p = g.attributes.position,
      ids = g.attributes.skinIndex,
      weights = g.attributes.skinWeight;
    const bounds = chains
      .filter((c) => c.type === "fin")
      .map((c) => {
        const box = new THREE.Box3();
        for (let i = 0; i < p.count; i++)
          if (ids.getW(i) === c.ids[0] && weights.getW(i) > 0.8)
            box.expandByPoint(new THREE.Vector3().fromBufferAttribute(p, i));
        const size = box.getSize(new THREE.Vector3());
        assert.ok(
          size.x > (kind === "plesiosaur" ? 0.025 : 0.012) && size.z > 0.025,
          "actual foil surface; armored fish pelvic fins are smaller than reptile hydrofoils",
        );
        return { rear: c.rear, side: c.side, size };
      });
    assert.equal(bounds.length, 4);
    if (kind === "plesiosaur") {
      for (const side of [-1, 1]) {
        const fore = bounds.find((b) => !b.rear && b.side === side),
          rear = bounds.find((b) => b.rear && b.side === side);
        assert.ok(
          rear.size.length() > fore.size.length() * 0.35,
          "rear hydrofoils have useful area",
        );
      }
    } else {
      const fan = new THREE.Box3();
      for (let i = 0; i < p.count; i++)
        if (p.getZ(i) > 0.39) {
          fan.expandByPoint(new THREE.Vector3().fromBufferAttribute(p, i));
          assert.equal(ids.getW(i), chains[0].ids.at(-1));
          assert.ok(weights.getW(i) > 0.999);
        }
      const size = fan.getSize(new THREE.Vector3());
      assert.ok(
        size.y > size.x * 4,
        "vertical bilobed fin instead of whale flukes",
      );
    }
  }
});
