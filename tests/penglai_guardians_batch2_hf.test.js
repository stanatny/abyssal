import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
const kinds = ["azure_dragon", "black_tortoise"];
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
    assert.equal(r.userData.artRevision, "penglai_guardians_hf_v2");
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
      r.userData.setSwimTravel?.((f < 180 ? 0.2 : 0.9) / 60, 1 / 60);
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
    assert.ok(peak < 0.06, `frame jump ${peak}`);
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
    assert.equal(m.material, n.material);
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
    assert.equal(material, 0);
    assert.equal(shared, 0);
    assert.ok(n.skeleton.boneTexture);
    b.userData.disposeLocalMotion();
  });
}

test("Black Tortoise rigid shell stays fixed while actual paddle tips and free serpent neck articulate", () => {
  const r = createCreature("black_tortoise", 1, 1),
    m = r.userData.hfRig.mesh,
    p = m.geometry.attributes.position,
    shell = [],
    snake = [],
    feet = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    if (Math.abs(x) < 0.1 && y > -0.1 && z > -0.1 && z < 0.2) shell.push(i);
    if (x < -0.19 && y > 0.205) snake.push(i);
    if (Math.abs(x) > 0.38 && y < -0.15) feet.push(i);
  }
  assert.ok(shell.length > 100 && snake.length > 20 && feet.length > 300);
  pose(r, 0);
  const initial = (ids) =>
      ids.map((i) => m.getVertexPosition(i, new THREE.Vector3())),
    s0 = initial(shell),
    n0 = initial(snake),
    f0 = initial(feet),
    v = new THREE.Vector3();
  let snakeMotion = 0,
    paddleMotion = 0;
  for (let f = 1; f <= 240; f++) {
    r.userData.setSwimTravel(0.006, 1 / 60);
    pose(r, f / 60, 1.2);
    for (let j = 0; j < shell.length; j += 7)
      assert.ok(m.getVertexPosition(shell[j], v).distanceTo(s0[j]) < 1e-7);
    for (let j = 0; j < snake.length; j += 3)
      snakeMotion = Math.max(
        snakeMotion,
        m.getVertexPosition(snake[j], v).distanceTo(n0[j]),
      );
    for (let j = 0; j < feet.length; j += 17)
      paddleMotion = Math.max(
        paddleMotion,
        m.getVertexPosition(feet[j], v).distanceTo(f0[j]),
      );
  }
  assert.ok(snakeMotion > 0.001 && snakeMotion < 0.04);
  assert.ok(paddleMotion > 0.08);
  r.userData.disposeLocalMotion();
});

test("Azure Dragon posed neighbouring skin vertices remain connected across neck, claw and tail bindings", () => {
  const r = createCreature("azure_dragon", 1, 8),
    m = r.userData.hfRig.mesh,
    g = m.geometry,
    p = g.attributes.position,
    a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    edges = [];
  for (let i = 0; i < g.index.count; i += 3) {
    let j = g.index.getX(i),
      k = g.index.getX(i + 1),
      d = a.fromBufferAttribute(p, j).distanceTo(b.fromBufferAttribute(p, k));
    if (d > 0.001) edges.push({ j, k, d });
  }
  let peakStretch = 0;
  for (let f = 0; f < 60; f++) {
    pose(r, f / 10, 2.2);
    for (let e = 0; e < edges.length; e += 11) {
      const v = edges[e];
      m.getVertexPosition(v.j, a);
      m.getVertexPosition(v.k, b);
      const d = a.distanceTo(b);
      peakStretch = Math.max(peakStretch, d / v.d);
      assert.ok(d < v.d * 2 + 0.004);
    }
  }
  assert.ok(peakStretch < 3);
  r.userData.disposeLocalMotion();
});

test("Azure Dragon breath origin follows its actual snout while the long tail carries a delayed wave", () => {
  const r = createCreature("azure_dragon", 1, 7),
    m = r.userData.hfRig.mesh,
    p = m.geometry.attributes.position,
    ids = [],
    tail = [];
  for (let i = 0; i < p.count; i++) {
    if (
      p.getZ(i) < -0.44 &&
      Math.abs(p.getX(i)) < 0.025 &&
      p.getY(i) > 0.01 &&
      p.getY(i) < 0.07
    )
      ids.push(i);
    if (p.getZ(i) > 0.4) tail.push(i);
  }
  assert.ok(ids.length > 10 && tail.length > 50);
  let min = Infinity,
    max = -Infinity,
    previous;
  const v = new THREE.Vector3();
  for (let f = 0; f < 240; f++) {
    r.userData.setBossPhase(f < 120 ? "hunt" : "attack");
    pose(r, f / 30, 2);
    const at = r.userData.getHeadWorldPositions()[0];
    let nearest = Infinity;
    for (const i of ids)
      nearest = Math.min(nearest, m.getVertexPosition(i, v).distanceTo(at));
    assert.ok(nearest < 0.025, "breath stays at actual snout");
    if (previous) assert.ok(at.distanceTo(previous) < 0.005);
    previous = at;
    const x = m.getVertexPosition(tail[tail.length >> 1], v).x;
    min = Math.min(min, x);
    max = Math.max(max, x);
  }
  assert.ok(max - min > 0.09);
  r.userData.disposeLocalMotion();
});
