import { disposePenglaiTigerMotion } from "../src/creature_penglai_tiger.js";
import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCreature } from "../src/creatures.js";
import { updateLordBody } from "../src/lord_body.js";
import { findBossContact } from "../src/encounters.js";
const kinds = [
  "azure_dragon",
  "white_tiger",
  "black_tortoise",
  "vermilion_bird",
];
const stats = (m) => {
  let triangles = 0,
    meshes = 0;
  m.traverse((n) => {
    if (n.isMesh) {
      meshes++;
      triangles +=
        (n.geometry.index?.count ?? n.geometry.attributes.position.count) / 3;
    }
  });
  return { meshes, triangles };
};

test("All four guardian factories preserve full length, finite articulated surfaces and reachable solid cores", () => {
  for (const k of kinds) {
    const m = createCreature(k, 50, 8);
    m.updateMatrixWorld(true);
    assert.equal(
      m.userData.artRevision,
      ["white_tiger", "vermilion_bird"].includes(k)
        ? "penglai_guardians_hf_v1"
        : "penglai_guardians_hf_v2",
    );
    assert.ok(
      Math.abs(
        new T.Box3().setFromObject(m, true).getSize(new T.Vector3()).z - 50,
      ) < 0.01,
    );
    let time = 0;
    for (const phase of ["dormant", "hunt", "windup", "attack", "recover"]) {
      m.userData.setBossPhase?.(phase);
      for (let i = 0; i < 12; i++) {
        time += 1 / 30;
        m.userData.setSwimTravel?.((phase === "hunt" ? 22 : 3.4) / 30, 1 / 30);
        m.userData.setGroundTravel?.(
          (phase === "hunt" ? 44 : 3.4) / 30,
          1 / 30,
        );
        m.userData.animate(time, phase === "hunt" ? 1.8 : 0.5);
        m.updateMatrixWorld(true);
        m.traverse((n) => {
          if (n.isMesh) {
            const p = n.geometry.attributes.position,
              v = new T.Vector3();
            for (
              let j = 0;
              j < p.count;
              j += Math.max(1, Math.floor(p.count / 21))
            ) {
              n.isSkinnedMesh
                ? n.getVertexPosition(j, v)
                : v.fromBufferAttribute(p, j);
              assert.ok(v.toArray().every(Number.isFinite));
            }
          }
        });
      }
      const cs = updateLordBody(m),
        core = cs.toSorted(
          (a, b) =>
            b.axes.x * b.axes.y * b.axes.z - a.axes.x * a.axes.y * a.axes.z,
        )[0];
      assert.ok(core);
      assert.ok(
        findBossContact(m, new T.Vector3(core.x, core.y, core.z), 0.4, {
          visibleBody: true,
        }),
        k + " solid core belongs to real posed geometry",
      );
    }
  }
});

test("Continuous Azure skin shares immutable geometry, bends without tears and retires private bone textures only", () => {
  const a = createCreature("azure_dragon", 1, 3),
    b = createCreature("azure_dragon", 1, 3),
    r = a.userData.hfRig,
    s = b.userData.hfRig;
  assert.equal(r.mesh.geometry, s.mesh.geometry);
  assert.notEqual(r.bones[4], s.bones[4]);
  assert.notEqual(r.mesh.skeleton, s.mesh.skeleton);
  const original = Array.from(r.mesh.geometry.attributes.position.array);
  r.mesh.skeleton.computeBoneTexture();
  s.mesh.skeleton.computeBoneTexture();
  const p = new T.Vector3(),
    q = new T.Vector3();
  let moved = false;
  a.userData.animate(0, 0.5);
  b.userData.animate(0, 0.5);
  const frozen = b.userData.hfRig.bones.map((n) => n.position.toArray());
  for (let frame = 1; frame <= 240; frame++) {
    a.userData.animate(frame / 30, 1.8);
    a.updateMatrixWorld(true);
    r.mesh.skeleton.update();
    const pos = r.mesh.geometry.attributes.position;
    for (let n = 0; n < pos.count; n += 113) {
      r.mesh.getVertexPosition(n, p);
      assert.ok(p.toArray().every(Number.isFinite));
      assert.ok(r.mesh.boundingSphere.containsPoint(p));
      q.fromBufferAttribute(pos, n);
      if (p.distanceTo(q) > 0.01) moved = true;
    }
  }
  assert.ok(moved);
  assert.deepEqual(
    r.mesh.geometry.attributes.position.array,
    new Float32Array(original),
  );
  assert.deepEqual(
    s.bones.map((n) => n.position.toArray()),
    frozen,
  );
  let sharedDisposals = 0;
  r.mesh.geometry.addEventListener("dispose", () => sharedDisposals++);
  a.userData.disposeLocalMotion();
  a.userData.disposeLocalMotion();
  assert.equal(r.mesh.skeleton.boneTexture, null);
  assert.ok(s.mesh.skeleton.boneTexture);
  assert.equal(sharedDisposals, 0);
  b.userData.disposeLocalMotion();
});

test("Four detailed guardian assets stay within the measured source triangle/draw envelope and add no lights or extra material maps", () => {
  let triangles = 0,
    meshes = 0;
  for (const k of kinds) {
    const m = createCreature(k, 1),
      s = stats(m);
    triangles += s.triangles;
    meshes += s.meshes;
    m.traverse((n) => {
      assert.ok(!n.isLight);
      if (n.isMesh)
        for (const [key, value] of Object.entries(n.material))
          if (value?.isTexture) assert.equal(key, "map");
    });
  }
  assert.ok(triangles < 220000);
  assert.ok(meshes <= 170);
});

test("Tortoise acceleration increases stroke frequency with continuous paired power and smaller steering strokes", () => {
  const m = createCreature("black_tortoise", 50, 6),
    r = m.userData.tortoiseSwimRig;
  let t = 0;
  const run = (speed, frames) => {
    for (let i = 0; i < frames; i++) {
      t += 1 / 60;
      m.userData.setSwimTravel(speed / 60, 1 / 60);
      m.userData.animate(t, 0.8);
      m.updateMatrixWorld(true);
    }
  };
  m.userData.animate(0, 0.8);
  run(3.4, 180);
  const from = r.state.strokePhase;
  run(3.4, 120);
  const cruiseRate = (r.state.strokePhase - from) / 2;
  let previous = r.limbs.map((l) => l.limb.quaternion.clone());
  for (let i = 0; i < 90; i++) {
    run(22, 1);
    r.limbs.forEach((l, j) => {
      assert.ok(previous[j].angleTo(l.limb.quaternion) < 0.08);
      previous[j].copy(l.limb.quaternion);
    });
  }
  const fastFrom = r.state.strokePhase;
  run(22, 120);
  assert.ok((r.state.strokePhase - fastFrom) / 2 > cruiseRate * 1.8);
  const phase = r.state.strokePhase;
  m.userData.animate(t, 0.8);
  assert.equal(r.state.strokePhase, phase);
  assert.deepEqual(m.position.toArray(), [0, 0, 0]);
});

test("Guardian head/neck joins and Vermilion world silhouette retain imposing proportions", async () => {
  const { buildSacredDragon } = await import(
      "../src/creature_sacred_dragon.js"
    ),
    { buildPenglaiTiger } = await import("../src/creature_penglai_tiger.js");
  const boxFor = (root, key) => {
    let part;
    root.traverse((n) => {
      if (n.userData.anatomyKey === key) part = n;
    });
    assert.ok(part, key);
    return new T.Box3().setFromObject(part, true);
  };
  for (const [build, skullKey, neckKey, minimumRatio] of [
    [
      buildSacredDragon,
      "sacred_azure_ridged_skull",
      "dragon_v2_azure_dragon_0",
      1.18,
    ],
  ]) {
    const root = new T.Group(),
      anatomy = new T.Group();
    root.add(anatomy);
    build(anatomy, [], root);
    root.updateMatrixWorld(true);
    const skull = boxFor(root, skullKey),
      neck = boxFor(root, neckKey),
      ratio =
        skull.getSize(new T.Vector3()).x / neck.getSize(new T.Vector3()).x;
    assert.ok(
      ratio >= minimumRatio && ratio < 1.6,
      "skull remains substantial beside neck",
    );
    const join = skull.clone().intersect(neck).getSize(new T.Vector3());
    assert.ok(
      join.x > 0.02 && join.y > 0.02 && join.z > 0.02,
      "closed head and neck volumes overlap",
    );
    disposePenglaiTigerMotion(root);
  }
  const bird = createCreature("vermilion_bird", 52),
    bounds = new T.Box3().setFromObject(bird, true).getSize(new T.Vector3());
  assert.ok(
    bounds.x > 52 * 1.5,
    "lord has broad actual world wings, independent of Guide zoom",
  );
  const chestBox = new T.Box3(),
    positions = bird.userData.hfRig.mesh.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const p = new T.Vector3().fromBufferAttribute(positions, i);
    if (Math.abs(p.x) < 0.16 && p.z > -0.35 && p.z < -0.12)
      chestBox.expandByPoint(p.multiplyScalar(52));
  }
  const chest = chestBox.getSize(new T.Vector3());
  assert.ok(
    chest.x > 52 * 0.195 && chest.y > 52 * 0.23,
    "substantial world chest behind the wings",
  );
  assert.ok(Math.abs(bounds.z - 52) < 0.01);
});
