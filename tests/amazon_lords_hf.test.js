import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { findBossContact } from "../src/encounters.js";
import { aquaticHeading } from "../src/aquatic_reptile_motion.js";
const kinds = ["thunderbarbel", "yacumama", "rootjaw"];
const pose = (r, t, s = 1) => {
  r.userData.animate(t, s);
  r.updateMatrixWorld(true);
  r.userData.hfRig.mesh.skeleton.update();
};
for (const kind of kinds) {
  test(`${kind}: actual HF surface remains continuous, bounded and pause-stable through cruise/attack/braking`, () => {
    const r = createCreature(kind, 1, 17),
      { mesh: m } = r.userData.hfRig,
      p = m.geometry.attributes.position,
      w = m.geometry.attributes.skinWeight,
      ids = m.geometry.attributes.skinIndex;
    assert.equal(r.userData.artRevision, "trellis_amazon_lords_20261025");
    assert.ok(m.geometry.index.count / 3 <= 24000);
    const same = new Map();
    for (let i = 0; i < p.count; i++) {
      const weights = [w.getX(i), w.getY(i), w.getZ(i), w.getW(i)];
      assert.ok(weights.every((x) => Number.isFinite(x) && x >= 0));
      assert.ok(Math.abs(weights.reduce((a, b) => a + b, 0) - 1) < 1e-6);
      const key = [p.getX(i), p.getY(i), p.getZ(i)].join(","),
        v = [ids.getX(i), ids.getY(i), ids.getZ(i), ids.getW(i), ...weights];
      if (same.has(key))
        assert.deepEqual(
          v,
          same.get(key),
          "UV seams have identical skin weights",
        );
      else same.set(key, v);
    }
    pose(r, 0, 0.2);
    const sample = [];
    for (let i = 0; i < p.count; i += 37)
      sample.push({
        i,
        start: m.getVertexPosition(i, new THREE.Vector3()),
        last: m.getVertexPosition(i, new THREE.Vector3()),
      });
    let peak = 0,
      tail = 0;
    const point = new THREE.Vector3();
    for (let f = 1; f <= 480; f++) {
      r.userData.setBossPhase(
        f >= 120 && f < 240 ? "windup" : f < 360 ? "attack" : "recover",
      );
      pose(r, f / 60, f >= 120 && f < 360 ? 3 : 0.2);
      for (const s of sample) {
        m.getVertexPosition(s.i, point);
        assert.ok(point.toArray().every(Number.isFinite));
        assert.ok(m.boundingSphere.distanceToPoint(point) < 1e-6);
        peak = Math.max(peak, point.distanceTo(s.last));
        if (p.getZ(s.i) > 0.2) tail = Math.max(tail, point.distanceTo(s.start));
        s.last.copy(point);
      }
    }
    assert.ok(tail > 0.025, `Actual tail wave ${tail}`);
    assert.ok(peak < 0.018, `No pose jump: ${peak}`);
    const frozen = Float32Array.from(m.skeleton.boneMatrices);
    pose(r, 8, 0.2);
    assert.deepEqual(m.skeleton.boneMatrices, frozen);
    assert.deepEqual(r.position.toArray(), [0, 0, 0]);
    assert.deepEqual(r.quaternion.toArray(), [0, 0, 0, 1]);
    r.userData.disposeLocalMotion();
  });
  test(`${kind}: instances share immutable buffers and textures, with independently disposed skeletons`, () => {
    const a = createCreature(kind, 1, 31),
      b = createCreature(kind, 1, 32),
      m = a.userData.hfRig.mesh,
      n = b.userData.hfRig.mesh;
    assert.equal(m.geometry, n.geometry);
    assert.equal(
      a.userData.hfRig.asset.material,
      b.userData.hfRig.asset.material,
    );
    assert.notEqual(m.skeleton, n.skeleton);
    const raw = Float32Array.from(m.geometry.attributes.position.array);
    pose(b, 0);
    const frozen = Float32Array.from(n.skeleton.boneMatrices);
    for (let f = 0; f < 180; f++) pose(a, f / 60, 3);
    assert.deepEqual(m.geometry.attributes.position.array, raw);
    assert.deepEqual(n.skeleton.boneMatrices, frozen);
    let disposed = 0,
      shared = 0;
    m.skeleton.computeBoneTexture();
    n.skeleton.computeBoneTexture();
    m.skeleton.boneTexture.addEventListener("dispose", () => disposed++);
    m.geometry.addEventListener("dispose", () => shared++);
    a.userData.disposeLocalMotion();
    a.userData.disposeLocalMotion();
    assert.equal(disposed, 1);
    assert.equal(shared, 0);
    assert.ok(n.skeleton.boneTexture);
    b.userData.disposeLocalMotion();
  });
  test(`${kind}: collision follows posed skin rather than filling empty water`, () => {
    const r = createCreature(kind, 49, 17),
      m = r.userData.hfRig.mesh,
      p = m.geometry.attributes.position;
    r.position.set(40, -320, -800);
    aquaticHeading(r.quaternion, new THREE.Vector3(0.9, 0.3, -0.4));
    for (const time of [0, 1, 2]) {
      pose(r, time, 2);
      const tests = [(i) => p.getZ(i) > 0.35];
      if (kind === "rootjaw")
        tests.push((i) => Math.abs(p.getX(i)) > 0.18 && p.getY(i) < -0.1);
      for (const condition of tests) {
        let i = 0;
        while (i < p.count && !condition(i)) i++;
        assert.ok(i < p.count);
        const v = m
          .getVertexPosition(i, new THREE.Vector3())
          .applyMatrix4(m.matrixWorld);
        assert.ok(
          findBossContact(r, v, 0.005),
          "Actual posed surface remains hittable",
        );
      }
      assert.equal(
        findBossContact(r, new THREE.Vector3(80, -270, -740), 0.05),
        null,
      );
    }
    r.userData.disposeLocalMotion();
  });
}
test("Rootjaw cruising and fast-swimming palms trail beside the body instead of splaying or crawling", () => {
  const r = createCreature("rootjaw", 1, 31),
    { mesh: m, chains, bones } = r.userData.hfRig,
    p = m.geometry.attributes.position,
    ix = m.geometry.attributes.skinIndex;
  const limbs = chains.filter((c) => c.type === "limb");
  const samples = limbs.map((c) =>
    Array.from({ length: p.count }, (_, i) => i).filter(
      (i) => p.getZ(i) > c.points[2][2] - 0.015 && c.ids.includes(ix.getX(i)),
    ),
  );
  for (const speed of [0.2, 1, 3]) {
    for (let f = 0; f < 300; f++) {
      pose(r, f / 60, speed);
      if (f < 120 || f % 6) continue;
      limbs.forEach((c, j) => {
        const inverse = new THREE.Matrix4()
            .copy(bones[c.ids[0]].parent.matrixWorld)
            .invert(),
          v = new THREE.Vector3();
        for (const i of samples[j])
          v.add(
            m
              .getVertexPosition(i, new THREE.Vector3())
              .applyMatrix4(m.matrixWorld)
              .applyMatrix4(inverse),
          );
        v.divideScalar(samples[j].length).sub(bones[c.ids[0]].position);
        assert.ok(samples[j].length > 100);
        assert.ok(v.z > 0.065, `${c.name} feet trail: ${v.z}`);
        assert.ok(
          c.side * v.x > 0 && c.side * v.x < 0.1,
          `${c.name} feet beside body: ${v.x}`,
        );
        assert.ok(v.y > -0.065, "Feet lift from standing posture");
        assert.ok(
          v.z > Math.abs(v.x) * 1.5,
          "Palm points back rather than sideways",
        );
      });
    }
  }
  r.userData.disposeLocalMotion();
});
test("Yacumama head remains stable while its continuous body carries a lateral S wave", () => {
  const r = createCreature("yacumama", 1, 17),
    m = r.userData.hfRig.mesh,
    p = m.geometry.attributes.position;
  pose(r, 0);
  const stable = [],
    body = [];
  for (let i = 0; i < p.count; i += 31) {
    if (p.getZ(i) < -0.43 && p.getY(i) > 0)
      stable.push([i, m.getVertexPosition(i, new THREE.Vector3())]);
    if (p.getZ(i) > 0.08 && p.getZ(i) < 0.25) body.push(i);
  }
  let span = 0;
  const values = [];
  for (let f = 1; f < 240; f++) {
    pose(r, f / 60, 2);
    for (const [i, v] of stable)
      assert.ok(
        m.getVertexPosition(i, new THREE.Vector3()).distanceTo(v) < 1e-7,
      );
    values.push(m.getVertexPosition(body[0], new THREE.Vector3()).x);
  }
  span = Math.max(...values) - Math.min(...values);
  assert.ok(stable.length && body.length && span > 0.04);
  r.userData.disposeLocalMotion();
});
