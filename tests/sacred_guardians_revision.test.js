import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCreature } from "../src/creatures.js";
import { updateLordBody } from "../src/lord_body.js";
import { findBossContact } from "../src/encounters.js";
import { disposePenglaiTigerMotion } from "../src/creature_penglai_tiger.js";
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
    assert.equal(m.userData.artRevision, "penglai_guardians_v3");
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
    r = a.userData.azureAxialRig,
    s = b.userData.azureAxialRig;
  assert.equal(r.trunk.geometry, s.trunk.geometry);
  assert.notEqual(r.bones[4], s.bones[4]);
  assert.notEqual(r.trunk.skeleton, s.trunk.skeleton);
  const original = Array.from(r.trunk.geometry.attributes.position.array);
  r.trunk.skeleton.computeBoneTexture();
  s.trunk.skeleton.computeBoneTexture();
  const p = new T.Vector3(),
    q = new T.Vector3();
  let moved = false;
  a.userData.animate(0, 0.5);
  b.userData.animate(0, 0.5);
  const frozen = b.userData.azureAxialRig.bones.map((n) =>
    n.position.toArray(),
  );
  for (let frame = 1; frame <= 240; frame++) {
    a.userData.animate(frame / 30, 1.8);
    a.updateMatrixWorld(true);
    r.trunk.skeleton.update();
    for (let row = 0; row < 144; row += 3) {
      const n = row * 25;
      r.trunk.getVertexPosition(n, p);
      r.trunk.getVertexPosition(n + 25, q);
      assert.ok(p.distanceTo(q) < 0.04, "adjacent rings remain continuous");
      assert.ok(r.trunk.boundingSphere.containsPoint(p));
      if (Math.abs(p.x) > 0.1) moved = true;
    }
  }
  assert.ok(moved);
  assert.deepEqual(
    r.trunk.geometry.attributes.position.array,
    new Float32Array(original),
  );
  assert.deepEqual(
    s.bones.map((n) => n.position.toArray()),
    frozen,
  );
  let sharedDisposals = 0;
  r.trunk.geometry.addEventListener("dispose", () => sharedDisposals++);
  disposePenglaiTigerMotion(a);
  disposePenglaiTigerMotion(a);
  assert.equal(r.trunk.skeleton.boneTexture, null);
  assert.ok(s.trunk.skeleton.boneTexture);
  assert.equal(sharedDisposals, 0);
  disposePenglaiTigerMotion(b);
});

test("Four detailed guardian assets stay within the measured source triangle/draw envelope and add no textures or lights", () => {
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
        for (const value of Object.values(n.material))
          assert.ok(!value?.isTexture);
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
    [buildPenglaiTiger, "tiger_broad_skull_v5", "tiger_neck_v3", 0.95],
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
  const chest = boxFor(bird, "bird_v2_vermilion_bird").getSize(new T.Vector3());
  assert.ok(
    chest.x > 52 * 0.195 && chest.y > 52 * 0.23,
    "substantial world chest behind the wings",
  );
  assert.ok(Math.abs(bounds.z - 52) < 0.01);
});
