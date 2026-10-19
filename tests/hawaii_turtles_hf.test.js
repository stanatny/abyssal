import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { getRegionSpecies } from "../src/region_ecology.js";

const kinds = ["archelon", "turtle"];
function posed(model, id) {
  model.updateMatrixWorld(true);
  const mesh = model.userData.hfRig.mesh;
  mesh.skeleton.update();
  return mesh.getVertexPosition(id, new THREE.Vector3());
}
for (const kind of kinds) {
  test(`${kind}: shared bounded HF assets retain unit length and independent, disposable skeletons`, () => {
    const a = createCreature(kind, 1, 31),
      b = createCreature(kind, 1, 31),
      ma = a.userData.hfRig.mesh,
      mb = b.userData.hfRig.mesh,
      g = ma.geometry,
      p = g.attributes.position,
      n = g.attributes.normal,
      w = g.attributes.skinWeight;
    assert.equal(a.userData.artRevision, "trellis_hawaii_turtles_20261019");
    assert.equal(ma.geometry, mb.geometry);
    assert.equal(ma.material, mb.material);
    assert.notEqual(ma.skeleton, mb.skeleton);
    assert.ok(g.index.count / 3 <= (kind === "archelon" ? 8000 : 6500));
    assert.ok(Math.abs(g.boundingBox.max.z - g.boundingBox.min.z - 1) < 1e-6);
    assert.ok(g.boundingBox.getCenter(new THREE.Vector3()).length() < 1e-6);
    for (let i = 0; i < p.count; i++) {
      assert.ok(
        new THREE.Vector3()
          .fromBufferAttribute(p, i)
          .toArray()
          .every(Number.isFinite),
      );
      assert.ok(
        Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1) <
          0.002,
      );
      assert.ok(
        Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < 1e-6,
      );
    }
    const unchanged = posed(b, p.count - 1);
    for (let i = 0; i < 100; i++) a.userData.animate(i / 60, 3);
    assert.deepEqual(posed(b, p.count - 1), unchanged);
    let disposed = 0;
    ma.skeleton.computeBoneTexture();
    ma.skeleton.boneTexture.addEventListener("dispose", () => disposed++);
    a.userData.disposeLocalMotion();
    a.userData.disposeLocalMotion();
    assert.equal(disposed, 1);
  });
  test(`${kind}: four actual foils move, fore flippers drive and carapace stays rigid across acceleration`, () => {
    const m = createCreature(kind, 1, 51),
      { mesh, chains, bones } = m.userData.hfRig,
      g = mesh.geometry,
      p = g.attributes.position,
      w = g.attributes.skinWeight,
      ids = g.attributes.skinIndex;
    const fins = chains.map((c) => {
      let id = -1,
        score = -Infinity;
      const box = new THREE.Box3();
      for (let i = 0; i < p.count; i++)
        if (ids.getW(i) === c.ids[0] && w.getW(i) > 0.8) {
          const v = new THREE.Vector3().fromBufferAttribute(p, i);
          box.expandByPoint(v);
          if (Math.abs(v.x) > score) {
            score = Math.abs(v.x);
            id = i;
          }
        }
      assert.ok(id >= 0, c.name);
      assert.ok(box.getSize(new THREE.Vector3()).length() > 0.05);
      return { c, id, records: [] };
    });
    assert.equal(fins.length, 4);
    const shell = [];
    for (let i = 0; i < p.count; i++)
      if (
        Math.abs(p.getX(i)) < 0.09 &&
        p.getZ(i) > -0.18 &&
        p.getZ(i) < 0.16 &&
        p.getY(i) > 0.06
      )
        shell.push([i, posed(m, i)]);
    assert.ok(shell.length > 10);
    let maxStep = 0;
    for (let frame = 0; frame < 600; frame++) {
      m.userData.animate(frame / 60, frame < 180 ? 0.7 : frame < 420 ? 3 : 0.7);
      for (const f of fins) {
        const parent = bones[f.c.ids[0]].parent;
        const q = posed(m, f.id)
          .applyMatrix4(mesh.matrixWorld)
          .applyMatrix4(parent.matrixWorld.clone().invert());
        assert.ok(
          q.x * f.c.side > 0.085,
          "fin never crosses the belly centerline",
        );
        if (f.records.length)
          maxStep = Math.max(maxStep, q.distanceTo(f.records.at(-1)));
        f.records.push(q);
      }
      for (const [id, start] of shell)
        assert.ok(
          posed(m, id).distanceTo(start) < 1e-7,
          "rigid shell does not flap with its limbs",
        );
    }
    const excursion = (f) =>
      Math.max(...f.records.map((v) => v.y)) -
      Math.min(...f.records.map((v) => v.y));
    for (const f of fins)
      assert.ok(
        excursion(f) > (f.c.rear ? 0.005 : 0.08),
        `${f.c.name} actual excursion ${excursion(f)}`,
      );
    for (const s of [-1, 1])
      assert.ok(
        excursion(fins.find((f) => !f.c.rear && f.c.side === s)) >
          excursion(fins.find((f) => f.c.rear && f.c.side === s)) * 2,
        "fore flippers dominate propulsion",
      );
    assert.ok(maxStep < 0.035, `continuous effort transition ${maxStep}`);
    const freeze = fins.map((f) => posed(m, f.id));
    m.userData.animate(599 / 60, 3);
    assert.deepEqual(
      fins.map((f) => posed(m, f.id)),
      freeze,
    );
    const groups = new Map();
    let seams = 0;
    for (let i = 0; i < p.count; i++) {
      const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
      if (groups.has(key)) {
        seams++;
        assert.ok(posed(m, i).distanceTo(posed(m, groups.get(key))) < 1e-7);
      } else groups.set(key, i);
    }
    assert.ok(seams > 50);
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0, 2, 0),
      new THREE.Vector3(0, -1, 0),
    );
    assert.ok(
      ray.intersectObject(m, true).length > 0,
      "real shell remains raycastable",
    );
  });
}
test("both turtle types retain regional memberships, lengths and stocks", () => {
  const expected = {
    hawaii: [
      ["turtle", 1.2, 10, 2],
      ["archelon", 4.5, 9, 1],
    ],
    atlantis: [],
    bermuda: [["turtle", 1.2, 8, 2]],
    mariana: [],
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
      species.map((s) => [s.kind, s.length, s.population, s.schoolSize]),
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
