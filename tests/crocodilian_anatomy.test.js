import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import {
  aquaticHeading,
  disposeCrocodilianMotion,
} from "../src/aquatic_reptile_motion.js";
import { findBossContact } from "../src/encounters.js";

const KINDS = [
  "black_caiman",
  "saltwater_crocodile",
  "purussaurus",
  "rootback_colossus",
  "rootjaw",
];
function rig(root) {
  let result;
  root.traverse((part) => {
    if (part.userData.crocodilianRig) result = part;
  });
  assert.ok(result);
  return result;
}
function pose(root, time, effort = 1) {
  root.userData.animate(time, effort);
  root.updateMatrixWorld(true);
  rig(root).skeleton.update();
}
for (const kind of KINDS) {
  test(`${kind}: complete slow/fast/attack cycle stays finite, bounded with a stable shoulder and head`, () => {
    const root = createCreature(kind, 1, 71),
      body = rig(root),
      p = body.geometry.attributes.position,
      ids = body.geometry.attributes.skinIndex;
    pose(root, 0, 0.2);
    const trunk = [],
      tail = [],
      limbs = [],
      point = new THREE.Vector3();
    for (let i = 0; i < p.count; i += 13) {
      if (p.getZ(i) < 0.1 && ids.getX(i) < 7)
        trunk.push([i, body.getVertexPosition(i, new THREE.Vector3())]);
      if (p.getZ(i) > 0.7 && ids.getX(i) < 7)
        tail.push([i, body.getVertexPosition(i, new THREE.Vector3())]);
      if (ids.getX(i) >= 7)
        limbs.push([i, body.getVertexPosition(i, new THREE.Vector3())]);
    }
    assert.ok(trunk.length && tail.length && limbs.length);
    let tailMotion = 0,
      limbMotion = 0;
    for (let frame = 1; frame <= 720; frame += 6) {
      root.userData.setHunterPhase(
        frame >= 240 && frame < 420 ? "attack" : "patrol",
      );
      pose(root, frame / 60, frame >= 180 && frame < 480 ? 3 : 0.2);
      for (let i = 0; i < p.count; i += 13) {
        body.getVertexPosition(i, point);
        assert.ok(point.toArray().every(Number.isFinite));
        assert.ok(
          body.boundingSphere.distanceToPoint(point) <= 1e-6,
          `${kind}: conservative culling sphere`,
        );
      }
      for (const [i, before] of trunk)
        assert.ok(body.getVertexPosition(i, point).distanceTo(before) < 1e-6);
      for (const [i, before] of tail)
        tailMotion = Math.max(
          tailMotion,
          body.getVertexPosition(i, point).distanceTo(before),
        );
      for (const [i, before] of limbs)
        limbMotion = Math.max(
          limbMotion,
          body.getVertexPosition(i, point).distanceTo(before),
        );
      assert.deepEqual(root.position.toArray(), [0, 0, 0]);
      assert.deepEqual(root.quaternion.toArray(), [0, 0, 0, 1]);
    }
    assert.ok(tailMotion > 0.04 && limbMotion > 0.025);
    const before = Float32Array.from(body.skeleton.boneMatrices),
      jaw = root.getObjectByName("crocodilian_jaw").rotation.x;
    pose(root, 715 / 60, 0.2);
    assert.deepEqual(
      body.skeleton.boneMatrices,
      before,
      "Frozen clock freezes the entire pose",
    );
    assert.equal(root.getObjectByName("crocodilian_jaw").rotation.x, jaw);
  });
}
test("species retain distinct normalized silhouettes; fast-swimming feet stay along their own flanks through the rear-body wave", () => {
  const heads = new Map();
  for (const kind of KINDS) {
    const root = createCreature(kind, 1, 17),
      body = rig(root);
    pose(root, 0, 0.2);
    const bounds = new THREE.Box3()
      .setFromObject(root)
      .getSize(new THREE.Vector3());
    assert.ok(Math.abs(bounds.z - 1) < 0.01);
    heads.set(
      kind,
      new THREE.Box3()
        .setFromObject(root.getObjectByName("crocodilian_head"))
        .getSize(new THREE.Vector3()),
    );
    const shoulders = [7, 11].map((i) =>
      body.skeleton.bones[i].getWorldPosition(new THREE.Vector3()),
    );
    for (let frame = 1; frame <= 120; frame++) pose(root, frame / 60, 3);
    [7, 11].forEach((index, i) => {
      assert.ok(
        body.skeleton.bones[index]
          .getWorldPosition(new THREE.Vector3())
          .distanceTo(shoulders[i]) < 1e-7,
      );
    });
    const positions = body.geometry.attributes.position,
      ids = body.geometry.attributes.skinIndex,
      restRoots = [7, 9, 11, 13].map((i) =>
        new THREE.Vector3().setFromMatrixPosition(
          new THREE.Matrix4().copy(body.skeleton.boneInverses[i]).invert(),
        ),
      ),
      supportInverse = new THREE.Matrix4(),
      point = new THREE.Vector3();
    for (let frame = 121; frame <= 361; frame++) {
      pose(root, frame / 60, 3);
      for (let i = 0; i < 4; i++) {
        const upper = body.skeleton.bones[7 + i * 2],
          side = i < 2 ? -1 : 1,
          foot = new THREE.Vector3();
        supportInverse.copy(upper.parent.matrixWorld).invert();
        let samples = 0;
        for (let v = 0; v < positions.count; v += 7) {
          // 取实际足端蒙皮，检查其体侧位置，而不是只对照关节角常量。
          const restZ = restRoots[i].z;
          if (ids.getX(v) !== 8 + i * 2 || positions.getZ(v) < restZ + 0.12)
            continue;
          body
            .getVertexPosition(v, point)
            .applyMatrix4(body.matrixWorld)
            .applyMatrix4(supportInverse);
          foot.add(point);
          samples++;
        }
        assert.ok(samples > 0);
        foot.multiplyScalar(1 / samples).sub(upper.position);
        assert.ok(
          side * foot.x > 0.005,
          `${kind}: foot remains outside its flank`,
        );
        assert.ok(foot.z > 0.08, `${kind}: toes trail behind their limb root`);
        assert.ok(
          foot.y > -0.06,
          `${kind}: tucked feet do not hang below the belly`,
        );
      }
    }
  }
  assert.ok(heads.get("purussaurus").x > heads.get("black_caiman").x * 1.3);
  assert.ok(
    heads.get("saltwater_crocodile").z > heads.get("purussaurus").z * 1.1,
  );
  assert.ok(heads.get("rootjaw").x > heads.get("saltwater_crocodile").x * 1.6);
});
test("independent skeletons do not mutate shared buffers; retiring a lord releases only its texture", () => {
  const first = createCreature("rootjaw", 49, 71),
    second = createCreature("rootjaw", 49, 72),
    a = rig(first),
    b = rig(second);
  assert.equal(a.geometry, b.geometry);
  assert.equal(a.material, b.material);
  assert.notEqual(a.skeleton, b.skeleton);
  const immutable = Float32Array.from(a.geometry.attributes.position.array);
  pose(second, 0);
  const frozen = Float32Array.from(b.skeleton.boneMatrices);
  for (let frame = 0; frame < 180; frame++) pose(first, frame / 60, 3);
  assert.deepEqual(a.geometry.attributes.position.array, immutable);
  assert.deepEqual(b.skeleton.boneMatrices, frozen);
  let retired = 0,
    shared = 0;
  a.skeleton.computeBoneTexture();
  b.skeleton.computeBoneTexture();
  a.skeleton.boneTexture.addEventListener("dispose", () => retired++);
  a.geometry.addEventListener("dispose", () => shared++);
  disposeCrocodilianMotion(first);
  disposeCrocodilianMotion(first);
  assert.equal(retired, 1);
  assert.equal(shared, 0);
  assert.ok(b.skeleton.boneTexture);
  disposeCrocodilianMotion(second);
});
test("posed lord tail and feet retain actual contact; empty water stays empty", () => {
  const root = createCreature("rootjaw", 49, 17),
    body = rig(root),
    p = body.geometry.attributes.position,
    ids = body.geometry.attributes.skinIndex;
  root.position.set(40, -320, -800);
  aquaticHeading(root.quaternion, new THREE.Vector3(0.9, 0.3, -0.4));
  for (const time of [0, 1, 2]) {
    pose(root, time, 2);
    for (const condition of [
      (i) => p.getZ(i) > 0.78 && ids.getX(i) < 7,
      (i) => ids.getX(i) === 14,
    ]) {
      let index = 0;
      while (!condition(index)) index++;
      const live = body
        .getVertexPosition(index, new THREE.Vector3())
        .applyMatrix4(body.matrixWorld);
      assert.ok(findBossContact(root, live, 0.005));
    }
    assert.equal(
      findBossContact(root, new THREE.Vector3(80, -270, -740), 0.05),
      null,
    );
  }
});
