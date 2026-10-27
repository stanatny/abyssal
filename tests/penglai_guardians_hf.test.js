import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
const kinds = ["white_tiger", "vermilion_bird"];
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
    assert.equal(r.userData.artRevision, "penglai_guardians_hf_v1");
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
      r.userData.setGroundTravel?.((f < 180 ? 0.2 : 0.9) / 60, 1 / 60);
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

test("White Tiger roar plants actual paw surfaces while its leap lifts the forepaws", () => {
  const a = createCreature("white_tiger", 1, 17),
    m = a.userData.hfRig.mesh,
    p = m.geometry.attributes.position;
  const paw = [];
  for (let i = 0; i < p.count; i++)
    if (p.getY(i) < -0.235 && p.getZ(i) < -0.19) paw.push(i);
  assert.ok(paw.length > 100);
  const sample = () => {
    const v = new THREE.Vector3();
    return (
      paw.reduce((s, i) => s + m.getVertexPosition(i, v).y, 0) / paw.length
    );
  };
  pose(a, 0, 1);
  const rest = sample();
  a.userData.setBossPhase("attack", "roar");
  for (let i = 1; i <= 180; i++) {
    a.userData.setGroundTravel(0, 1 / 60);
    pose(a, i / 60, 1);
  }
  const roar = sample();
  assert.ok(Math.abs(roar - rest) < 0.015, `roar paw drift ${roar - rest}`);
  a.userData.setBossPhase("attack", "leap");
  for (let i = 181; i <= 360; i++) pose(a, i / 60, 1);
  assert.ok(
    sample() - roar > 0.045,
    "pounce really lifts the skinned forepaws",
  );
  a.userData.disposeLocalMotion();
});
test("Vermilion Bird moves both actual wingtips without moving their shared root apart", () => {
  const a = createCreature("vermilion_bird", 1, 17),
    m = a.userData.hfRig.mesh,
    p = m.geometry.attributes.position;
  const ids = [-1, 1].map((side) => {
    let best = 0;
    for (let i = 1; i < p.count; i++)
      if (p.getX(i) * side > p.getX(best) * side) best = i;
    return best;
  });
  const ys = [[], []];
  for (let f = 0; f <= 180; f++) {
    pose(a, f / 60, 1);
    ids.forEach((i, k) =>
      ys[k].push(m.getVertexPosition(i, new THREE.Vector3()).y),
    );
  }
  for (const y of ys)
    assert.ok(
      Math.max(...y) - Math.min(...y) > 0.35,
      "wingtip excursion must be visible at game scale",
    );
  a.userData.disposeLocalMotion();
});

test("HF Tiger actual planted paw vertices follow 44m/s travel and freeze at obstruction", () => {
  const a = createCreature("white_tiger", 48, 1),
    r = a.userData.hfRig,
    m = r.mesh,
    p = m.geometry.attributes.position,
    w = m.geometry.attributes.skinWeight,
    ix = m.geometry.attributes.skinIndex;
  const picks = r.legs.map((c) => {
    let best = -1,
      score = Infinity;
    for (let i = 0; i < p.count; i++) {
      let weight = 0;
      for (let j = 0; j < 4; j++)
        if (ix.array[i * 4 + j] === c.ids[2]) weight += w.array[i * 4 + j];
      if (weight < 0.9999) continue;
      const d =
        Math.abs(p.getX(i) - c.points[2][0]) +
        Math.abs(p.getZ(i) - c.points[2][2]) +
        Math.abs(p.getY(i) - c.points[2][1]);
      if (d < score) {
        score = d;
        best = i;
      }
    }
    assert.ok(best >= 0);
    return best;
  });
  const prev = [],
    v = new THREE.Vector3();
  let slip = 0,
    samples = 0;
  for (let f = 0; f < 360; f++) {
    a.position.z -= 44 / 60;
    a.userData.setGroundTravel(44 / 60, 1 / 60);
    pose(a, f / 60, 1.2);
    for (let k = 0; k < 4; k++) {
      m.getVertexPosition(picks[k], v).applyMatrix4(m.matrixWorld);
      if (f > 240 && Math.abs(v.y - prev[k].y) < 1e-5) {
        slip = Math.max(slip, Math.abs(v.z - prev[k].z));
        samples++;
      }
      prev[k] = v.clone();
    }
  }
  assert.ok(samples > 200, `support samples ${samples}`);
  assert.ok(slip < 0.005, `actual skin support slip ${slip}`);
  const gait = a.userData.groundGaitState,
    cadence = ((gait.speed / 48) * gait.duty) / (2 * gait.stride);
  assert.ok(cadence > 2 && cadence < 3);
  const frozen = picks.map((i) =>
      m.getVertexPosition(i, new THREE.Vector3()).toArray(),
    ),
    phase = gait.phase;
  for (let f = 360; f < 390; f++) {
    a.userData.setGroundTravel(0, 1 / 60);
    pose(a, f / 60, 1.2);
  }
  assert.equal(gait.phase, phase);
  assert.deepEqual(
    picks.map((i) => m.getVertexPosition(i, new THREE.Vector3()).toArray()),
    frozen,
  );
  a.userData.resetGroundTravel();
  assert.equal(gait.active, false);
  assert.equal(gait.distance, 0);
  a.userData.disposeLocalMotion();
});

test("White Tiger tail binding leaves the rear paws independent and moves the actual tapered tail smoothly", () => {
  const a = createCreature("white_tiger", 1, 9),
    r = a.userData.hfRig,
    g = r.mesh.geometry,
    p = g.attributes.position,
    ix = g.attributes.skinIndex,
    w = g.attributes.skinWeight;
  const tailIds = new Set(r.tail.ids),
    tips = [];
  let paws = 0;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) < -0.2 && p.getZ(i) > 0.18) {
      paws++;
      for (let j = 0; j < 4; j++)
        if (tailIds.has(ix.array[i * 4 + j]))
          assert.equal(w.array[i * 4 + j], 0, "tail must not pull hind feet");
    }
    if (p.getZ(i) > 0.46 && p.getY(i) > -0.16) tips.push(i);
  }
  assert.ok(paws > 100 && tips.length > 50);
  const v = new THREE.Vector3(),
    xs = [],
    ys = [];
  let last,
    step = 0;
  for (let f = 0; f < 300; f++) {
    a.userData.setGroundTravel(0.3 / 60, 1 / 60);
    pose(a, f / 60, 1);
    v.set(0, 0, 0);
    const q = new THREE.Vector3();
    for (const i of tips) v.add(r.mesh.getVertexPosition(i, q));
    v.divideScalar(tips.length);
    xs.push(v.x);
    ys.push(v.y);
    if (last) step = Math.max(step, last.distanceTo(v));
    last = v.clone();
  }
  assert.ok(
    Math.max(...xs) - Math.min(...xs) > 0.005,
    "visible restrained tail sway",
  );
  assert.ok(
    Math.max(...ys) - Math.min(...ys) < 0.025,
    "no whipping or lifting the tail into a ring",
  );
  assert.ok(step < 0.004, "continuous tail surface");
  a.userData.disposeLocalMotion();
});
