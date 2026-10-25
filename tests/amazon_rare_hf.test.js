import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { getRegionSpecies } from "../src/region_ecology.js";
const kinds = ["jade_arowana"];
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
    assert.equal(a.userData.artRevision, "trellis_amazon_rare_20261025");
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

test("jade fins have independent, visible surface movement on both sides", () => {
  const m = createCreature("jade_arowana", 1, 37),
    { mesh, chains } = m.userData.hfRig;
  const g = mesh.geometry,
    ids = g.attributes.skinIndex.array,
    weights = g.attributes.skinWeight.array;
  for (const c of chains.filter(
    (c) => c.name.startsWith("pectoral") || c.name.startsWith("pelvic"),
  )) {
    const vertices = [];
    for (let i = 0; i < g.attributes.position.count; i++)
      for (let j = 0; j < 4; j++)
        if (c.ids.includes(ids[4 * i + j]) && weights[4 * i + j] > 0.8) {
          vertices.push(i);
          break;
        }
    assert.ok(vertices.length > 5, c.name + " fitted vertices");
    let delta = 0;
    const rest = vertices.map((i) =>
      new THREE.Vector3().fromBufferAttribute(g.attributes.position, i),
    );
    for (let f = 0; f < 120; f++) {
      pose(m, f / 60, 1.8);
      vertices.forEach((id, j) => {
        const v = mesh.getVertexPosition(id, new THREE.Vector3());
        delta = Math.max(delta, v.distanceTo(rest[j]));
        assert.ok(c.side * v.x > 0, "fin stays outside torso");
      });
    }
    assert.ok(delta > 0.002, c.name + " actual motion " + delta);
  }
  m.userData.disposeLocalMotion();
});
