import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import {
  disposeTentacleMotion,
  tentacleWorldBounds,
  tentacleChunkBounds,
} from "../src/tentacle_motion.js";
import { findBossContact } from "../src/encounters.js";

const kinds = [
  // Octopus now has one integrated HF skin; its eight arms and instance lifecycle
  // are exercised by hawaii_batch7_hf.test.js rather than eight procedural meshes.
  "cuttlefish",
  "crown_filterer",
  "abyss_weaver",
  "lumen_stalker",
  "cameroceras",
  "pearl_nautilus",
  "spiral_grazer",
  "bell_carrier",
];
function arms(root) {
  const result = [];
  root.traverse((p) => {
    if (p.userData.tentacle) result.push(p);
  });
  return result;
}
function pose(root, time, effort = 1) {
  root.userData.animate(time, effort);
  root.updateMatrixWorld(true);
}
function vertices(mesh) {
  const points = [];
  for (let i = 0; i < mesh.geometry.attributes.position.count; i += 41) {
    points.push(mesh.getVertexPosition(i, new THREE.Vector3()));
  }
  return points;
}
for (const kind of kinds)
  test(`${kind}: continuous arms deform the rendered vertices without mutating shared buffers`, () => {
    const first = createCreature(kind, 12, 71),
      second = createCreature(kind, 12, 72);
    // These HF surfaces integrate all soft parts in one skinned mesh.
    // Exercise their rendered skin instead of the retired procedural arm count.
    if (
      [
        "cuttlefish",
        "pearl_nautilus",
        "cameroceras",
        "lumen_stalker",
        "abyss_weaver",
        "crown_filterer",
        "bell_carrier",
        "spiral_grazer",
      ].includes(kind)
    ) {
      const mesh = first.userData.hfRig.mesh,
        other = second.userData.hfRig.mesh;
      assert.equal(mesh.geometry, other.geometry);
      assert.notEqual(mesh.skeleton, other.skeleton);
      const immutable = Float32Array.from(
        mesh.geometry.attributes.position.array,
      );
      pose(first, 0);
      pose(second, 0);
      const before = vertices(mesh),
        otherBefore = vertices(other);
      let moved = 0;
      for (let frame = 1; frame <= 720; frame++) {
        pose(first, frame / 60, frame < 360 ? 1 : 3);
        if (frame % 30 !== 0) continue;
        const current = vertices(mesh);
        for (let i = 0; i < current.length; i++) {
          assert.ok(current[i].toArray().every(Number.isFinite));
          assert.ok(mesh.boundingSphere.containsPoint(current[i]));
          moved = Math.max(moved, current[i].distanceTo(before[i]));
        }
      }
      assert.ok(moved > 0.001, `${kind} soft skin did not move`);
      const frozen = vertices(mesh);
      pose(first, 12, 3);
      assert.deepEqual(vertices(mesh), frozen);
      assert.deepEqual(vertices(other), otherBefore);
      assert.deepEqual(mesh.geometry.attributes.position.array, immutable);
      let released = 0,
        geometries = 0;
      mesh.skeleton.computeBoneTexture();
      other.skeleton.computeBoneTexture();
      mesh.skeleton.boneTexture.addEventListener("dispose", () => released++);
      mesh.geometry.addEventListener("dispose", () => geometries++);
      first.userData.disposeLocalMotion();
      first.userData.disposeLocalMotion();
      assert.equal(released, 1);
      assert.equal(geometries, 0);
      assert.ok(other.skeleton.boneTexture);
      second.userData.disposeLocalMotion();
      return;
    }
    const a = arms(first),
      b = arms(second);
    assert.equal(
      a.length,
      {
        abyss_weaver: 6,
        cuttlefish: 10,
        pearl_nautilus: 12,
        spiral_grazer: 2,
        bell_carrier: 6,
      }[kind] ?? 8,
    );
    pose(first, 0);
    pose(second, 0);
    const mesh = a[0].userData.tentacle.meshes[0],
      other = b[0].userData.tentacle.meshes[0];
    assert.equal(mesh.geometry, other.geometry);
    assert.notEqual(mesh.skeleton, other.skeleton);
    const immutable = Float32Array.from(
      mesh.geometry.attributes.position.array,
    );
    const before = vertices(mesh),
      otherBefore = vertices(other);
    let moved = 0;
    for (let frame = 1; frame <= 720; frame++) {
      pose(first, frame / 60, frame < 360 ? 1 : 3);
      if (frame % 30 === 0) {
        const current = vertices(mesh);
        for (let i = 0; i < current.length; i++) {
          assert.ok(current[i].toArray().every(Number.isFinite));
          assert.ok(
            tentacleWorldBounds(mesh, new THREE.Box3()).containsPoint(
              current[i].clone().applyMatrix4(mesh.matrixWorld),
            ),
            "Conservative bone bounds must cover real deformed skin",
          );
          assert.ok(
            tentacleChunkBounds(
              mesh,
              mesh.userData.tentacleChunks[Math.floor((i * 41) / 192)],
              new THREE.Box3(),
            ).containsPoint(current[i].clone().applyMatrix4(mesh.matrixWorld)),
            "Chunk bounds must contain the actual weighted surface",
          );
          moved = Math.max(moved, current[i].distanceTo(before[i]));
        }
        for (const arm of a) {
          const joints = arm.userData.tentacle.bones;
          assert.ok(
            joints
              .slice(1)
              .some(
                (bone) =>
                  Math.abs(bone.rotation.x) + Math.abs(bone.rotation.y) > 0.01,
              ),
          );
          assert.ok(
            joints[0].rotation
              .toArray()
              .slice(0, 3)
              .every((value) => value === 0),
          );
        }
      }
    }
    assert.ok(
      moved > a[0].userData.tentacle.restLength * 0.025,
      `${kind} distal skin did not move`,
    );
    const frozen = vertices(mesh);
    pose(first, 12, 3);
    assert.deepEqual(vertices(mesh), frozen);
    assert.deepEqual(vertices(other), otherBefore);
    assert.deepEqual(mesh.geometry.attributes.position.array, immutable);
    // 骨骼贴图属于实例；释放一只不会释放另一只或共享几何。
    let released = 0,
      geometries = 0;
    mesh.skeleton.computeBoneTexture();
    other.skeleton.computeBoneTexture();
    mesh.skeleton.boneTexture.addEventListener("dispose", () => released++);
    mesh.geometry.addEventListener("dispose", () => geometries++);
    disposeTentacleMotion(first);
    disposeTentacleMotion(first);
    assert.equal(released, 1);
    assert.equal(geometries, 0);
    assert.ok(other.skeleton.boneTexture);
    disposeTentacleMotion(second);
  });

test("Kraken mouth is central and recessed, and collision follows the moving arm skin", () => {
  const root = createCreature("kraken", 48, 71);
  pose(root, 0);
  const { mesh, chains } = root.userData.hfRig;
  assert.equal(chains.filter((c) => c.type === "arm").length, 8);
  assert.equal(root.userData.mouthAnchors.length, 1);
  for (let frame = 1; frame <= 240; frame++) pose(root, frame / 60);
  root.userData.setKrakenGrip(1);
  pose(root, 4.05);
  const positions = mesh.geometry.attributes.position,
    weights = mesh.geometry.attributes.skinIndex;
  let tipIndex = 0;
  for (let i = 0; i < positions.count; i++)
    if (positions.getX(i) > 0.45) {
      tipIndex = i;
      break;
    }
  const live = mesh
    .getVertexPosition(tipIndex, new THREE.Vector3())
    .applyMatrix4(mesh.matrixWorld);
  assert.ok(
    findBossContact(root, live, 0.015),
    "Moved tip must be hittable through the real triangle surface",
  );
  // 腕间空隙仍是空水域，并非整片包围盒。
  assert.equal(findBossContact(root, new THREE.Vector3(0, 0, -15), 0.05), null);
});

test("Tentacle chunk filtering preserves brute-force surface and interior contact under world transforms", () => {
  const root = createCreature("kraken", 48, 81);
  root.position.set(48, -250, -820);
  root.rotation.set(0.12, 1.4, -0.07);
  root.scale.multiply(new THREE.Vector3(1.1, 0.95, 1.05));
  const parts = [root.userData.hfRig.mesh];
  for (const time of [0, 1.5, 4]) {
    pose(root, time);
    const part = parts[0];
    const points = [
      ...[0, 600, 1800].map((i) =>
        part
          .getVertexPosition(i, new THREE.Vector3())
          .applyMatrix4(part.matrixWorld),
      ),
      root.localToWorld(new THREE.Vector3(0, 0, -0.3)),
      root.localToWorld(new THREE.Vector3(0.09, 0.09, -0.3)),
    ];
    for (const point of points) {
      const filtered = findBossContact(root, point, 0.08);
      const saved = parts.map((part) => part.userData.tentacleChunks);
      parts.forEach((part) => delete part.userData.tentacleChunks);
      const full = findBossContact(root, point, 0.08);
      parts.forEach((part, i) => (part.userData.tentacleChunks = saved[i]));
      assert.equal(Boolean(filtered), Boolean(full));
      if (full) assert.ok(filtered.distanceTo(full) < 1e-7);
    }
  }
  root.userData.disposeLocalMotion();
});

test("Lumen lance poses reach the real locked point, retain shared surfaces and reset to swimming", () => {
  const root = createCreature("lumen_stalker", 62, 71),
    swimming = createCreature("lumen_stalker", 62, 71);
  root.userData.setBossPhase("attack");
  swimming.userData.setBossPhase("attack");
  pose(root, 0);
  pose(swimming, 0);
  const arms = root.userData.lashArms;
  const target = new THREE.Vector3(0, 0, -70),
    targets = [
      target,
      target.clone().add(new THREE.Vector3(5, 0, 0)),
      target.clone().add(new THREE.Vector3(-5, 0, 0)),
    ];
  const surface = root.userData.hfRig.mesh,
    immutable = Float32Array.from(surface.geometry.attributes.position.array);
  for (let i = 0; i <= 60; i++) {
    pose(root, i / 60);
    pose(swimming, i / 60);
    root.userData.poseLumenLash(
      targets,
      Array.from({ length: 3 }, () => ({ amount: i / 60 })),
    );
    root.updateMatrixWorld(true);
    for (const chunk of surface.userData.tentacleChunks) {
      const bounds = tentacleChunkBounds(surface, chunk, new THREE.Box3());
      for (let j = chunk.start; j < chunk.end; j += 47) {
        const v = surface.geometry.index.getX(j),
          point = surface
            .getVertexPosition(v, new THREE.Vector3())
            .applyMatrix4(surface.matrixWorld);
        assert.ok(
          bounds.containsPoint(point),
          "Indexed HF triangle chunk encloses its posed skin",
        );
      }
    }
  }

  const tip = arms[0].userData.tentacle.bones
    .at(-1)
    .getWorldPosition(new THREE.Vector3());
  assert.ok(
    tip.distanceTo(target) < 0.01,
    "Damage point is a real rendered arm joint",
  );
  assert.ok(
    findBossContact(root, tip, 1),
    "Visible skin is at the attack point",
  );
  assert.deepEqual(surface.geometry.attributes.position.array, immutable);
  root.userData.setBossPhase("recover");
  swimming.userData.setBossPhase("recover");
  pose(root, 1.05);
  pose(swimming, 1.05);
  const before = swimming.userData.lashArms[0].userData.tentacle.bones
    .at(-1)
    .getWorldPosition(new THREE.Vector3());
  const reset = arms[0].userData.tentacle.bones
    .at(-1)
    .getWorldPosition(new THREE.Vector3());
  assert.ok(
    reset.distanceTo(before) < 1e-7,
    "Next normal pose rejoins the same live swimming pose without residual attack",
  );
  root.userData.disposeLocalMotion();
  swimming.userData.disposeLocalMotion();
});
