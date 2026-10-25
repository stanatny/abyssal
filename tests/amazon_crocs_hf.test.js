import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { getRegionSpecies } from "../src/region_ecology.js";
const kinds = [
  "black_caiman",
  "saltwater_crocodile",
  "purussaurus",
  "rootback_colossus",
];
const pose = (m, t, s) => {
  m.userData.animate(t, s);
  m.updateMatrixWorld(true);
  m.userData.hfRig.mesh.skeleton.update();
};
for (const kind of kinds) {
  test(`${kind}: fitted HF skin keeps scale, independent bones and shared recoverable materials`, () => {
    const a = createCreature(kind, 1, 37),
      b = createCreature(kind, 1, 37),
      { mesh, bones } = a.userData.hfRig,
      g = mesh.geometry;
    assert.equal(a.userData.artRevision, "trellis_amazon_crocs_20261025");
    assert.equal(g, b.userData.hfRig.mesh.geometry);
    assert.equal(mesh.material, b.userData.hfRig.mesh.material);
    assert.notEqual(mesh.skeleton, b.userData.hfRig.mesh.skeleton);
    assert.ok(Math.abs(g.boundingBox.max.z - g.boundingBox.min.z - 1) < 1e-6);
    assert.ok(g.index.count / 3 <= 10000);
    const p = g.attributes.position,
      w = g.attributes.skinWeight,
      ids = g.attributes.skinIndex,
      n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      let sum = 0;
      for (let j = 0; j < 4; j++) {
        sum += w.array[4 * i + j];
        assert.ok(ids.array[4 * i + j] < bones.length);
      }
      assert.ok(Math.abs(sum - 1) < 1e-6);
      assert.ok(
        Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1) <
          0.002,
      );
    }
    pose(b, 0, 0.3);
    const frozen = Float32Array.from(
      b.userData.hfRig.mesh.skeleton.boneMatrices,
    );
    pose(a, 0, 0.3);
    pose(a, 1, 3);
    assert.deepEqual(b.userData.hfRig.mesh.skeleton.boneMatrices, frozen);
    mesh.skeleton.computeBoneTexture();
    let releases = 0;
    mesh.skeleton.boneTexture.addEventListener("dispose", () => releases++);
    a.userData.disposeLocalMotion();
    a.userData.disposeLocalMotion();
    assert.equal(releases, 1);
    assert.equal(g, b.userData.hfRig.mesh.geometry);
  });
  test(`${kind}: actual head, continuous skin, tail wave and trailing feet survive cruise/chase/attack/pause`, () => {
    const m = createCreature(kind, 1, 37),
      { mesh, chains, bones } = m.userData.hfRig,
      p = mesh.geometry.attributes.position,
      ids = mesh.geometry.attributes.skinIndex,
      w = mesh.geometry.attributes.skinWeight,
      points = [],
      feet = [];
    for (let i = 0; i < p.count; i += 17)
      points.push({
        i,
        last: null,
        rest: new THREE.Vector3().fromBufferAttribute(p, i),
      });
    for (const c of chains.filter((c) => c.type === "leg")) {
      const distal = [];
      for (let i = 0; i < p.count; i++) {
        let weight = 0;
        for (let j = 0; j < 4; j++)
          if (ids.array[i * 4 + j] === c.ids.at(-1))
            weight += w.array[i * 4 + j];
        if (weight > 0.7) distal.push(i);
      }
      assert.ok(distal.length > 8, c.name + " has actual toe surfaces");
      feet.push({ c, distal });
    }
    const original = Float32Array.from(p.array),
      v = new THREE.Vector3();
    let maximumStep = 0,
      tailMotion = 0;
    const seam = new Map(),
      pairs = [];
    for (let i = 0; i < p.count; i++) {
      const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
      if (seam.has(key)) pairs.push([seam.get(key), i]);
      else seam.set(key, i);
    }
    for (let frame = 0; frame <= 480; frame++) {
      const speed = frame < 120 || frame > 360 ? 0.5 : 3;
      m.userData.setHunterPhase(
        frame > 220 && frame < 320 ? "attack" : "patrol",
      );
      pose(m, frame / 60, speed);
      for (const q of points) {
        mesh.getVertexPosition(q.i, v);
        assert.ok(v.toArray().every(Number.isFinite));
        assert.ok(mesh.boundingSphere.distanceToPoint(v) < 1e-6);
        if (q.last) maximumStep = Math.max(maximumStep, q.last.distanceTo(v));
        q.last = v.clone();
        if (q.rest.z < -0.38 && q.rest.y > 0.015)
          assert.ok(v.distanceTo(q.rest) < 1e-6, "stable upper snout");
        if (q.rest.z > 0.4)
          tailMotion = Math.max(tailMotion, v.distanceTo(q.rest));
      }
      if (frame % 30 === 0) {
        for (const [a, b] of pairs)
          assert.ok(
            mesh
              .getVertexPosition(a, new THREE.Vector3())
              .distanceTo(mesh.getVertexPosition(b, v)) < 1e-7,
            "UV seams remain joined",
          );
      }
      if (frame > 140 && frame < 350)
        for (const { c, distal } of feet) {
          const inv = bones[c.ids[0]].parent.matrixWorld.clone().invert(),
            foot = new THREE.Vector3();
          for (const i of distal)
            foot.add(
              mesh
                .getVertexPosition(i, v)
                .applyMatrix4(mesh.matrixWorld)
                .applyMatrix4(inv),
            );
          foot.divideScalar(distal.length);
          const anchor = bones[c.ids[0]].position;
          assert.ok(
            c.side * foot.x > 0.035,
            c.name + " foot does not cross body center",
          );
          assert.ok(
            foot.z - anchor.z > 0.035,
            c.name + " feet trail their root",
          );
          assert.ok(
            foot.y - anchor.y > -0.12,
            c.name + " no dangling crawl stance",
          );
        }
    }
    assert.ok(tailMotion > 0.035);
    assert.ok(maximumStep < 0.014, `no pose pop: ${maximumStep}`);
    assert.deepEqual(p.array, original);
    assert.deepEqual(m.position.toArray(), [0, 0, 0]);
    assert.deepEqual(m.quaternion.toArray(), [0, 0, 0, 1]);
    const frozen = Float32Array.from(mesh.skeleton.boneMatrices);
    pose(m, 8, 0.5);
    assert.deepEqual(mesh.skeleton.boneMatrices, frozen);
  });
}
test("Amazon crocodilian stock, lengths and original abilities remain exact", () => {
  const species = getRegionSpecies("amazon");
  for (const [kind, length, population] of [
    ["black_caiman", 5.4, 5],
    ["saltwater_crocodile", 6.4, 4],
    ["purussaurus", 12.5, 8],
    ["rootback_colossus", 27, 3],
  ]) {
    const s = species.find((x) => x.kind === kind);
    assert.equal(s.length, length);
    assert.equal(s.population, population);
    assert.ok(s.predator);
  }
});

// 收足时不把腹侧拉成尖片，也不让足端权重在截断边界突然归零。
test("folded crocodilian skin avoids stretched flank/toe patches across tail phases", () => {
  for (const kind of kinds) {
    const m = createCreature(kind, 1, 37),
      mesh = m.userData.hfRig.mesh,
      p = mesh.geometry.attributes.position,
      index = mesh.geometry.index.array,
      rest = Array.from({ length: p.count }, (_, i) =>
        new THREE.Vector3().fromBufferAttribute(p, i),
      );
    for (let f = 0; f < 40; f++) {
      pose(m, f * 0.1, 3);
      const deformed = rest.map((_, i) =>
        mesh.getVertexPosition(i, new THREE.Vector3()),
      );
      for (let j = 0; j < index.length; j += 3)
        for (const [a, b] of [
          [index[j], index[j + 1]],
          [index[j + 1], index[j + 2]],
          [index[j + 2], index[j]],
        ]) {
          const length = rest[a].distanceTo(rest[b]);
          if (length < 0.0001) continue;
          assert.ok(
            deformed[a].distanceTo(deformed[b]) / length < 2.5,
            kind + " skin overstretch",
          );
        }
    }
    m.userData.disposeLocalMotion();
  }
});
