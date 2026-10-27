import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCreature } from "../src/creatures.js";
function pose(root, t, e = 1) {
  root.userData.animate(t, e);
  root.updateMatrixWorld(true);
  root.userData.hfRig.mesh.skeleton.update();
}
test("Sage HF skin has seam-consistent normalized weights and independent shared resources", () => {
  const a = createCreature("sword_sage", 1),
    b = createCreature("sword_sage", 1),
    m = a.userData.hfRig.mesh,
    g = m.geometry,
    p = g.attributes.position,
    w = g.attributes.skinWeight,
    ids = g.attributes.skinIndex,
    seams = new Map();
  assert.equal(g, b.userData.hfRig.mesh.geometry);
  assert.equal(m.material, b.userData.hfRig.mesh.material);
  assert.notEqual(m.skeleton, b.userData.hfRig.mesh.skeleton);
  assert.ok(g.index.count / 3 <= 28000);
  assert.equal(a.userData.lordBody.sections.length, 2);
  assert.ok(
    Math.abs(
      new T.Box3().setFromObject(a, true).getSize(new T.Vector3()).z - 1,
    ) < 1e-6,
  );
  for (let i = 0; i < p.count; i++) {
    const ws = [w.getX(i), w.getY(i), w.getZ(i), w.getW(i)],
      ix = [ids.getX(i), ids.getY(i), ids.getZ(i), ids.getW(i)];
    assert.ok(ws.every((x) => Number.isFinite(x) && x >= 0));
    assert.ok(Math.abs(ws.reduce((a, b) => a + b) - 1) < 1e-6);
    assert.ok(ix.every((x) => x < m.skeleton.bones.length));
    const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
    if (seams.has(key)) assert.deepEqual([...ix, ...ws], seams.get(key));
    else seams.set(key, [...ix, ...ws]);
  }
  pose(a, 0);
  pose(b, 0);
  const frozen = Float32Array.from(b.userData.hfRig.mesh.skeleton.boneMatrices);
  pose(a, 1);
  assert.deepEqual(b.userData.hfRig.mesh.skeleton.boneMatrices, frozen);
  let released = 0;
  const dispose = m.skeleton.dispose.bind(m.skeleton);
  m.skeleton.dispose = () => {
    released++;
    dispose();
  };
  a.userData.disposeLocalMotion();
  a.userData.disposeLocalMotion();
  assert.equal(released, 1);
  pose(b, 1);
  b.userData.disposeLocalMotion();
});
test("Sage boots stay supported by the riding blade while sleeves and robe move without seam jumps", () => {
  const r = createCreature("sword_sage", 1),
    m = r.userData.hfRig.mesh,
    g = m.geometry,
    p = g.attributes.position,
    blade = r.userData.ridingSword.getObjectByName("sword_blade"),
    feet = [],
    arms = [],
    robe = [],
    edges = [],
    v = new T.Vector3(),
    v2 = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) < -0.465) feet.push(i);
    if (Math.abs(p.getX(i)) > 0.18 && p.getY(i) > -0.08 && p.getY(i) < 0.02)
      arms.push(i);
    if (p.getY(i) < -0.28 && p.getY(i) > -0.34) robe.push(i);
  }
  assert.ok(feet.length > 80 && arms.length > 20 && robe.length > 50);
  for (let i = 0; i < g.index.count; i += 27) {
    const a = g.index.getX(i),
      b = g.index.getX(i + 1),
      d = v.fromBufferAttribute(p, a).distanceTo(v2.fromBufferAttribute(p, b));
    if (d > 0.001) edges.push({ a, b, d });
  }
  pose(r, 0);
  let maxArm = 0,
    maxRobe = 0,
    maxStep = 0;
  const sample = [
      ...arms.filter((_, i) => i % 13 === 0),
      ...robe.filter((_, i) => i % 41 === 0),
    ],
    start = sample.map((i) => m.getVertexPosition(i, new T.Vector3())),
    last = start.map((v) => v.clone());
  for (let f = 1; f <= 360; f++) {
    r.userData.setBossPhase(
      f < 60 ? "hunt" : f < 160 ? "windup" : f < 220 ? "recover" : "attack",
      f < 220 ? "swords" : "charge",
    );
    r.userData.setSwimTravel((f < 220 ? 25 : 110) / 60, 1 / 60);
    pose(r, f / 60, f < 220 ? 1 : 3);
    sample.forEach((i, j) => {
      m.getVertexPosition(i, v);
      maxStep = Math.max(maxStep, v.distanceTo(last[j]));
      last[j].copy(v);
      if (arms.includes(i)) maxArm = Math.max(maxArm, v.distanceTo(start[j]));
      else maxRobe = Math.max(maxRobe, v.distanceTo(start[j]));
      assert.ok(m.boundingSphere.distanceToPoint(v) < 1e-6);
    });
    if (f % 15 === 0) {
      const contacts = [0, 0],
        gaps = [Infinity, Infinity];
      for (const i of feet) {
        const side = p.getX(i) < 0 ? 0 : 1;
        m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld);
        const hit = new T.Raycaster(
          v.clone().add(new T.Vector3(0, 0.05, 0)),
          new T.Vector3(0, -1, 0),
        ).intersectObject(blade)[0];
        assert.ok(hit);
        const gap = v.y - hit.point.y;
        assert.ok(gap > -0.0002 && gap < 0.004);
        gaps[side] = Math.min(gaps[side], gap);
        contacts[side]++;
      }
      assert.ok(contacts.every((n) => n > 20));
      assert.ok(gaps.every((g) => g < 0.0002));
      for (const e of edges) {
        const d = m
          .getVertexPosition(e.a, v)
          .distanceTo(m.getVertexPosition(e.b, v2));
        assert.ok(d < e.d * 2 + 0.004, `stretched seam ${d / e.d}`);
      }
    }
  }
  assert.ok(maxArm > 0.07, `arm motion ${maxArm}`);
  assert.ok(maxRobe > 0.015, `robe motion ${maxRobe}`);
  assert.ok(maxStep < 0.04);
  const frozen = Float32Array.from(m.skeleton.boneMatrices),
    ring = r.getObjectByName("orbiting_sword_array").quaternion.clone();
  pose(r, 6, 3);
  assert.deepEqual(m.skeleton.boneMatrices, frozen);
  assert.ok(ring.equals(r.getObjectByName("orbiting_sword_array").quaternion));
  r.userData.disposeLocalMotion();
});
test("Sage ward toggles alone; command anchor follows the head and resets preserve rest", () => {
  const r = createCreature("sword_sage", 38),
    m = r.userData.hfRig.mesh;
  pose(r, 0);
  r.userData.setLocked(false);
  assert.equal(r.getObjectByName("four_symbol_ward").visible, false);
  assert.equal(m.visible, true);
  r.userData.setLocked(true);
  assert.equal(r.getObjectByName("four_symbol_ward").visible, true);
  const old = new T.Vector3(
    0,
    0.23453388939389444,
    -0.007090697219829287,
  ).multiplyScalar(38);
  assert.ok(r.userData.getHeadWorldPositions()[0].distanceTo(old) < 1e-5);
  for (let f = 1; f < 180; f++) {
    r.userData.setBossPhase("attack", "swords");
    pose(r, f / 60);
    const at = r.userData.getHeadWorldPositions()[0];
    assert.ok(at.toArray().every(Number.isFinite));
    assert.ok(at.distanceTo(old) < 2);
  }
  r.userData.resetSwimTravel();
  pose(r, 4);
  assert.equal(r.userData.sageMotion.cast, 0);
  r.userData.disposeLocalMotion();
});

test("Sage white hair mask keeps face, crown and robe colors while covering scalp and beard", async () => {
  const { sageHairWeight } = await import("../src/sage_hair_material.js");
  for (const point of [
    [0.018, 0.396, -0.025],
    [0, 0.2, 0.115],
    [0, 0.29, -0.04],
  ])
    assert.ok(sageHairWeight(...point) > 0.9);
  for (const point of [
    [0, 0.35, -0.039],
    [0, 0.44, 0],
    [0.08, 0.28, 0.03],
    [0, 0.1, -0.04],
  ])
    assert.equal(sageHairWeight(...point), 0);
  const root = createCreature("sword_sage", 1),
    g = root.userData.hfRig.mesh.geometry,
    seen = new Map();
  for (let i = 0; i < g.attributes.position.count; i++) {
    const p = new T.Vector3()
        .fromBufferAttribute(g.attributes.position, i)
        .toArray()
        .join(","),
      w = g.attributes.sageHair.getX(i);
    assert.ok(w >= 0 && w <= 1);
    if (seen.has(p)) assert.equal(w, seen.get(p));
    else seen.set(p, w);
  }
  root.userData.disposeLocalMotion();
});

test("Sage riding, orbiting and fired swords share HF kit without changing forward axis", async () => {
  const { createSageJian, sageJianAsset } = await import("../src/sage_jian.js");
  const r = createCreature("sword_sage", 1),
    kit = sageJianAsset(),
    ring = r.getObjectByName("orbiting_sword_array");
  assert.equal(ring.children.length, 7);
  assert.equal(
    r.userData.ridingSword.getObjectByName("sword_blade").geometry,
    kit.ridingGeometry,
  );
  for (const sword of ring.children) {
    assert.equal(sword.children[0].geometry, kit.geometry);
    assert.equal(sword.children[0].material, kit.material);
  }
  const projectile = new T.Group(),
    sword = createSageJian(projectile, [0, 0, 0], 6);
  sword.rotation.x = -Math.PI / 2;
  projectile.scale.setScalar(2.6);
  projectile.updateMatrixWorld(true);
  const tip = new T.Vector3(0, kit.geometry.boundingBox.max.y, 0).applyMatrix4(
    sword.matrixWorld,
  );
  assert.ok(tip.z < -5.8 && Math.abs(tip.x) < 1e-8 && Math.abs(tip.y) < 1e-8);
  assert.equal(sword.children[0].geometry, kit.geometry);
  assert.ok(kit.geometry.index.count / 3 < 5000);
  for (const g of [kit.geometry, kit.ridingGeometry])
    for (const i of new Set(g.index.array)) {
      const n = new T.Vector3().fromBufferAttribute(g.attributes.normal, i);
      assert.ok(
        Number.isFinite(n.length()) && Math.abs(n.length() - 1) < 0.001,
      );
    }
  const old = kit.material.uuid;
  r.userData.disposeLocalMotion();
  assert.equal(sageJianAsset().material.uuid, old);
});

test("Sage riding blade has a continuous straight face from the guard to the point bevel", async () => {
  const { sageJianAsset } = await import("../src/sage_jian.js");
  const blade = new T.Mesh(
    sageJianAsset().ridingGeometry,
    new T.MeshBasicMaterial(),
  );
  blade.updateMatrixWorld(true);
  // Sample actual triangles along the whole blade, including both ends of the
  // old raised foot platform. A center-only lift would produce a visible bend.
  for (const x of [-0.022, 0, 0.022]) {
    for (let y = -0.015; y < 0.32; y += 0.01) {
      const hit = new T.Raycaster(
        new T.Vector3(x, y, 0.1),
        new T.Vector3(0, 0, -1),
      ).intersectObject(blade)[0];
      assert.ok(hit, `blade face missing at ${x}, ${y}`);
      assert.ok(Math.abs(hit.point.z - 0.009) < 1e-5);
    }
  }
  blade.material.dispose();
});
