import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { getRegionSpecies } from "../src/region_ecology.js";
const kinds = ["green_anaconda", "titanoboa", "stupendemys", "flood_arapaima"];
const pose = (m, t, s) => {
  m.userData.animate(t, s);
  m.updateMatrixWorld(true);
  m.userData.hfRig.mesh.skeleton.update();
};
for (const kind of kinds) {
  test(`${kind}: shared HF surface, independent motion, bounded skin and repeatable disposal`, () => {
    const a = createCreature(kind, 1, 37),
      b = createCreature(kind, 1, 37),
      { mesh, bones } = a.userData.hfRig,
      g = mesh.geometry,
      p = g.attributes.position,
      w = g.attributes.skinWeight,
      ids = g.attributes.skinIndex;
    assert.equal(a.userData.artRevision, "trellis_amazon_final_20261025");
    assert.equal(g, b.userData.hfRig.mesh.geometry);
    assert.equal(mesh.material, b.userData.hfRig.mesh.material);
    assert.notEqual(mesh.skeleton, b.userData.hfRig.mesh.skeleton);
    assert.ok(Math.abs(g.boundingBox.max.z - g.boundingBox.min.z - 1) < 1e-6);
    assert.ok(g.index.count / 3 <= 10000);
    const raw = Float32Array.from(p.array),
      frozen = Float32Array.from(b.userData.hfRig.mesh.skeleton.boneMatrices),
      v = new THREE.Vector3(),
      last = [],
      seam = new Map(),
      pairs = [];
    for (let i = 0; i < p.count; i++) {
      let sum = 0;
      for (let j = 0; j < 4; j++) {
        sum += w.array[4 * i + j];
        assert.ok(ids.array[4 * i + j] < bones.length);
      }
      assert.ok(Math.abs(sum - 1) < 1e-6);
      const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
      if (seam.has(key)) pairs.push([seam.get(key), i]);
      else seam.set(key, i);
    }
    let maxStep = 0,
      tail = 0;
    for (let f = 0; f <= 240; f++) {
      pose(a, f / 60, f < 60 || f > 180 ? 0.5 : 3);
      for (let i = 0; i < p.count; i += 19) {
        mesh.getVertexPosition(i, v);
        assert.ok(v.toArray().every(Number.isFinite));
        assert.ok(mesh.boundingSphere.distanceToPoint(v) < 1e-6);
        if (last[i]) maxStep = Math.max(maxStep, last[i].distanceTo(v));
        last[i] = v.clone();
        const rest = new THREE.Vector3().fromBufferAttribute(p, i);
        if (kind === "stupendemys" && p.getY(i) > 0.085)
          assert.ok(v.distanceTo(rest) < 1e-6, "rigid shell");
        if (kind !== "stupendemys" && p.getZ(i) < -0.435)
          assert.ok(v.distanceTo(rest) < 1e-6, "stable head");
        if (p.getZ(i) > 0.42) tail = Math.max(tail, v.distanceTo(rest));
      }
      if (f % 30 === 0)
        for (const [x, y] of pairs)
          assert.ok(
            mesh
              .getVertexPosition(x, new THREE.Vector3())
              .distanceTo(mesh.getVertexPosition(y, v)) < 1e-7,
            "joined atlas seam",
          );
    }
    assert.ok(maxStep < 0.015, `pose continuity ${maxStep}`);
    assert.ok(tail > 0.007, "actual tail surface moves");
    assert.deepEqual(p.array, raw);
    assert.deepEqual(b.userData.hfRig.mesh.skeleton.boneMatrices, frozen);
    const paused = Float32Array.from(mesh.skeleton.boneMatrices);
    pose(a, 4, 0.5);
    assert.deepEqual(mesh.skeleton.boneMatrices, paused);
    assert.deepEqual(a.position.toArray(), [0, 0, 0]);
    assert.deepEqual(a.quaternion.toArray(), [0, 0, 0, 1]);
    mesh.skeleton.computeBoneTexture();
    let releases = 0;
    mesh.skeleton.boneTexture.addEventListener("dispose", () => releases++);
    a.userData.disposeLocalMotion();
    a.userData.disposeLocalMotion();
    assert.equal(releases, 1);
  });
}
test("fitted webbed feet and pectoral fins move on both sides without crossing the torso", () => {
  for (const kind of ["stupendemys", "flood_arapaima"]) {
    const m = createCreature(kind, 1, 37),
      { mesh, chains } = m.userData.hfRig,
      g = mesh.geometry,
      ids = g.attributes.skinIndex,
      w = g.attributes.skinWeight;
    for (const c of chains.filter(
      (c) => c.type === "leg" || c.type === "pectoral",
    )) {
      const distal = [];
      for (let i = 0; i < g.attributes.position.count; i++) {
        let weight = 0;
        for (let j = 0; j < 4; j++)
          if (ids.array[i * 4 + j] === c.ids.at(-1))
            weight += w.array[i * 4 + j];
        if (weight > 0.7) distal.push(i);
      }
      assert.ok(distal.length > 8, c.name + " actual weighted foot/fin");
      const values = [];
      for (let f = 0; f <= 180; f++) {
        pose(m, f / 60, 1.4);
        const v = new THREE.Vector3(),
          q = new THREE.Vector3();
        for (const i of distal) v.add(mesh.getVertexPosition(i, q));
        v.divideScalar(distal.length);
        assert.ok(c.side * v.x > 0.035, "appendage stays on its own side");
        values.push(v);
      }
      let span = 0;
      for (const v of values) span = Math.max(span, v.distanceTo(values[0]));
      assert.ok(span > 0.008, c.name + " readable surface stroke");
    }
  }
});
test("final Amazon skin edges do not stretch into isolated spikes", () => {
  for (const kind of kinds) {
    const m = createCreature(kind, 1, 37),
      mesh = m.userData.hfRig.mesh,
      p = mesh.geometry.attributes.position,
      idx = mesh.geometry.index.array,
      edges = [];
    for (let i = 0; i < idx.length; i += 3)
      for (let j = 0; j < 3; j++) {
        const a = idx[i + j],
          b = idx[i + ((j + 1) % 3)],
          rest = new THREE.Vector3()
            .fromBufferAttribute(p, a)
            .distanceTo(new THREE.Vector3().fromBufferAttribute(p, b));
        if (rest > 0.002) edges.push([a, b, rest]);
      }
    let ratio = 1;
    for (let f = 0; f < 120; f += 7) {
      pose(m, f / 30, 3);
      const v = new THREE.Vector3(),
        q = new THREE.Vector3();
      for (const [a, b, d] of edges)
        ratio = Math.max(
          ratio,
          mesh
            .getVertexPosition(a, v)
            .distanceTo(mesh.getVertexPosition(b, q)) / d,
        );
    }
    assert.ok(ratio < 2.3, `${kind} edge stretch ${ratio}`);
  }
});
test("last four Amazon ordinary kinds keep their existing ecological contract", () => {
  const species = getRegionSpecies("amazon");
  for (const [k, length, population, speed] of [
    ["green_anaconda", 8.2, 5, 15],
    ["titanoboa", 13, 8, 21],
    ["stupendemys", 7, 9, 4],
    ["flood_arapaima", 7.8, 36, 6.2],
  ]) {
    const s = species.find((s) => s.kind === k);
    assert.equal(s.length, length);
    assert.equal(s.population, population);
    assert.equal(s.speed, speed);
  }
});
