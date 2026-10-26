import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
const kinds = ["brine_regent", "lumen_stalker", "abyss_weaver"];
function pose(r, t, s = 1) {
  r.userData.animate(t, s);
  r.updateMatrixWorld(true);
  r.userData.hfRig.mesh.skeleton.update();
}
for (const kind of kinds) {
  test(`${kind}: normalized HF skin has valid seam weights and bounded continuous active-clock motion`, () => {
    const r = createCreature(kind, 1, 17),
      m = r.userData.hfRig.mesh,
      p = m.geometry.attributes.position,
      w = m.geometry.attributes.skinWeight,
      ix = m.geometry.attributes.skinIndex;
    assert.equal(r.userData.artRevision, "trellis_europa_lords_20261026");
    assert.ok(m.geometry.index.count / 3 <= 30000);
    assert.ok(
      Math.abs(
        new THREE.Box3().setFromObject(r).getSize(new THREE.Vector3()).z - 1,
      ) < 0.003,
    );
    const seams = new Map();
    for (let i = 0; i < p.count; i++) {
      const weights = [w.getX(i), w.getY(i), w.getZ(i), w.getW(i)],
        ids = [ix.getX(i), ix.getY(i), ix.getZ(i), ix.getW(i)];
      assert.ok(weights.every((v) => v >= 0 && Number.isFinite(v)));
      assert.ok(Math.abs(weights.reduce((s, v) => s + v, 0) - 1) < 1e-6);
      assert.ok(ids.every((v) => v < m.skeleton.bones.length));
      const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
      if (seams.has(key))
        assert.deepEqual([...ids, ...weights], seams.get(key));
      else seams.set(key, [...ids, ...weights]);
    }
    pose(r, 0, 0.2);
    const samples = [];
    for (let i = 0; i < p.count; i += 71)
      samples.push({
        i,
        start: m.getVertexPosition(i, new THREE.Vector3()),
        last: m.getVertexPosition(i, new THREE.Vector3()),
      });
    let peak = 0,
      motion = 0;
    const v = new THREE.Vector3();
    for (let f = 1; f <= 360; f++) {
      r.userData.setBossPhase(
        f < 90 ? "hunt" : f < 180 ? "windup" : f < 270 ? "attack" : "recover",
      );
      pose(r, f / 60, f < 180 ? 1 : 3);
      for (const s of samples) {
        m.getVertexPosition(s.i, v);
        assert.ok(v.toArray().every(Number.isFinite));
        assert.ok(m.boundingSphere.distanceToPoint(v) < 1e-6);
        peak = Math.max(peak, v.distanceTo(s.last));
        motion = Math.max(motion, v.distanceTo(s.start));
        s.last.copy(v);
      }
    }
    assert.ok(motion > 0.01);
    assert.ok(peak < 0.035, `frame jump ${peak}`);
    const frozen = Float32Array.from(m.skeleton.boneMatrices);
    pose(r, 6, 3);
    assert.deepEqual(m.skeleton.boneMatrices, frozen);
    r.userData.disposeLocalMotion();
  });
  test(`${kind}: local skeleton/material disposal does not retire shared geometry or another instance`, () => {
    const a = createCreature(kind, 1, 31),
      b = createCreature(kind, 1, 32),
      m = a.userData.hfRig.mesh,
      n = b.userData.hfRig.mesh;
    assert.equal(m.geometry, n.geometry);
    assert.notEqual(m.skeleton, n.skeleton);
    assert.notEqual(m.material, n.material);
    pose(b, 0);
    const frozen = Float32Array.from(n.skeleton.boneMatrices),
      raw = Float32Array.from(m.geometry.attributes.position.array);
    for (let f = 0; f < 120; f++) pose(a, f / 60, 3);
    assert.deepEqual(n.skeleton.boneMatrices, frozen);
    assert.deepEqual(m.geometry.attributes.position.array, raw);
    m.skeleton.computeBoneTexture();
    n.skeleton.computeBoneTexture();
    let disposed = 0,
      shared = 0,
      material = 0;
    m.skeleton.boneTexture.addEventListener("dispose", () => disposed++);
    m.geometry.addEventListener("dispose", () => shared++);
    m.material.addEventListener("dispose", () => material++);
    a.userData.disposeLocalMotion();
    a.userData.disposeLocalMotion();
    assert.equal(disposed, 1);
    assert.equal(material, 1);
    assert.equal(shared, 0);
    assert.ok(n.skeleton.boneTexture);
    b.userData.disposeLocalMotion();
  });
}
test("Lumen actual three lash tips retain the 88m reach under translated and rotated parents", () => {
  const r = createCreature("lumen_stalker", 62, 31),
    parent = new THREE.Group();
  parent.position.set(31, -460, -500);
  parent.rotation.y = 0.7;
  parent.add(r);
  r.rotation.set(0.1, 0.3, -0.05);
  r.userData.setBossPhase("attack");
  pose(r, 0);
  assert.equal(r.userData.hfRig.chains.length, 8);
  const origin = r.localToWorld(new THREE.Vector3()),
    direction = new THREE.Vector3(0, 0, -1).transformDirection(r.matrixWorld),
    targets = [-4, 0, 4].map((x) =>
      origin
        .clone()
        .addScaledVector(direction, 82)
        .add(new THREE.Vector3(x, 0, 0)),
    );
  r.userData.poseLumenLash(targets, [
    { amount: 1 },
    { amount: 1 },
    { amount: 1 },
  ]);
  for (let i = 0; i < 3; i++) {
    const tip = r.userData.lashArms[i].userData.tentacle.bones
      .at(-1)
      .getWorldPosition(new THREE.Vector3());
    assert.ok(
      tip.distanceTo(targets[i]) < 0.01,
      `tip ${i} gap ${tip.distanceTo(targets[i])}`,
    );
  }
  r.userData.resetLumenLash();
  pose(r, 1);
  const m = r.userData.hfRig.mesh;
  for (let i = 0; i < m.geometry.attributes.position.count; i += 89)
    assert.ok(
      m
        .getVertexPosition(i, new THREE.Vector3())
        .toArray()
        .every(Number.isFinite),
    );
  r.userData.disposeLocalMotion();
});
