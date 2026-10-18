import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { createPlayerMotion } from "../src/player_motion.js";

test("两种鲨鱼冲刺尾拍明显加快，急停/反打平滑且暂停不推进时钟", () => {
  for (const kind of ["zombie_shark", "mechanical_shark"]) {
    const motion = createPlayerMotion(kind, 0);
    const rate = (boosting) => {
      const input = { dt: 1 / 60, speed: boosting ? 32 : 12, boosting };
      for (let i = 0; i < 180; i++) motion.update(i / 60, 1, input);
      const before = motion.state.phase;
      for (let i = 0; i < 60; i++) motion.update(i / 60, 1, input);
      return motion.state.phase - before;
    };
    const cruise = rate(false),
      sprint = rate(true);
    assert.ok(cruise > 2.5 && cruise < 4);
    assert.ok(sprint > cruise * 2 && sprint < cruise * 2.6);
    const snapshot = { ...motion.state };
    motion.update(999, 3, { dt: 0, speed: 0, turn: -1, pitchInput: 1 });
    assert.deepEqual(motion.state, { ...snapshot, dt: 0 });
    motion.update(1000, 1, {
      dt: 1 / 60,
      speed: 12,
      turn: -1,
      boosting: false,
    });
    assert.ok(motion.state.boost > 0.9 && motion.state.boost < 1);
    assert.ok(motion.state.turn < 0 && motion.state.turn > -0.1);
    motion.reset();
    assert.equal(motion.state.phase, 0);
    assert.equal(motion.state.boost, 0);
    assert.equal(motion.state.turn, 0);
  }
});

function advance(root, frames, input, offset = 0) {
  for (let frame = 1; frame <= frames; frame++)
    root.userData.animate((offset + frame) / 60, 0.9, {
      dt: 1 / 60,
      speed: 12,
      ...input,
    });
}

function meshes(root) {
  const result = [];
  root.traverse((object) => {
    if (object.isMesh) result.push(object);
  });
  return result;
}

function vertices(mesh) {
  mesh.parent.updateWorldMatrix(true, true);
  mesh.skeleton.update();
  const positions = mesh.geometry.attributes.position;
  const result = [],
    vertex = new THREE.Vector3();
  for (let index = 0; index < positions.count; index++) {
    mesh.getVertexPosition(index, vertex);
    result.push(...vertex.toArray());
  }
  return result;
}

test("角色第三参数平滑进入冲刺、喷射和转向，完全保留控制器根变换", () => {
  for (const kind of ["orca", "squid"]) {
    const root = createCreature(kind, 6, 18);
    root.position.set(2, -12, 4);
    root.rotation.set(0.2, -0.7, 0.1);
    root.scale.setScalar(9);
    const transform = [...root.position, ...root.quaternion, ...root.scale];
    advance(root, 60, {});
    const phase = root.userData.motionState.phase;
    advance(root, 1, { boosting: true, jet: kind === "squid", turn: 1 }, 60);
    assert.ok(
      root.userData.motionState.boost > 0 &&
        root.userData.motionState.boost < 0.2,
    );
    assert.ok(root.userData.motionState.phase > phase);
    assert.ok(root.userData.motionState.phase - phase < 0.15);
    advance(
      root,
      90,
      { speed: 72, boosting: true, jet: true, turn: 1, pitchInput: -1 },
      61,
    );
    assert.ok(root.userData.motionState.boost > 0.99);
    assert.ok(root.userData.motionState.jet > 0.99);
    assert.ok(Math.abs(root.userData.pose.bank) > 0.1);
    assert.deepEqual(
      [...root.position, ...root.quaternion, ...root.scale],
      transform,
    );
    const pose = JSON.stringify(root.userData.pose);
    root.userData.animate(3, 0.9, { dt: 0, speed: 12, boosting: false });
    assert.equal(JSON.stringify(root.userData.pose), pose);
    advance(root, 90, { speed: 5 }, 151);
    assert.ok(root.userData.motionState.boost < 0.001);
    assert.ok(root.userData.motionState.jet < 0.001);
  }
});

test("真实嘴点跟随成长和父变换，乌贼所有游姿保持外套膜领先与腕足拖后", () => {
  const expected = { orca: [0, -0.052, -0.43], squid: [0, -0.004, 0.09] };
  for (const kind of ["orca", "squid"]) {
    const root = createCreature(kind, 6, 2);
    const parent = new THREE.Group();
    parent.position.set(4, -3, 7);
    parent.rotation.y = 0.8;
    parent.add(root);
    root.position.set(-1, 2, 4);
    root.rotation.x = -0.3;
    root.scale.setScalar(11);
    const point = root.userData.getFeedingMouth(new THREE.Vector3());
    root.worldToLocal(point);
    assert.ok(point.distanceTo(new THREE.Vector3(...expected[kind])) < 1e-12);
    if (kind === "squid") {
      const arm = root.getObjectByName("squid_tentacle_-1_0");
      const tipBone = root.getObjectByName("squid_tentacle_-1_5");
      for (const input of [
        { speed: 12 },
        { speed: 32, boosting: true },
        { speed: 72, jet: true },
      ]) {
        advance(root, 60, input);
        root.updateMatrixWorld(true);
        const mouth = root.worldToLocal(
          root.userData.getFeedingMouth(new THREE.Vector3()),
        );
        const center = root.worldToLocal(
          arm.getWorldPosition(new THREE.Vector3()),
        );
        const tip = root.worldToLocal(
          tipBone.getWorldPosition(new THREE.Vector3()),
        );
        assert.ok(mouth.z > 0 && center.z > 0 && tip.z > 0.3);
        assert.equal(
          root.getObjectByName("squid_swimming_frame").rotation.y,
          0,
        );
      }
    }
  }
});

test("乌贼腕足与吸盘连续蒙皮，各实例独立而几何和材质跨实例复用", () => {
  const left = createCreature("squid", 6, 7),
    right = createCreature("squid", 6, 7);
  const leftMeshes = meshes(left),
    rightMeshes = meshes(right);
  assert.equal(leftMeshes.length, rightMeshes.length);
  leftMeshes.forEach((mesh, index) => {
    assert.strictEqual(mesh.geometry, rightMeshes[index].geometry);
    assert.strictEqual(mesh.material, rightMeshes[index].material);
  });
  const body = left.getObjectByName("squid_hf_body"),
    other = right.getObjectByName("squid_hf_body");
  assert.ok(body.isSkinnedMesh);
  const arms = body.skeleton.bones.filter((b) =>
    /^squid_arm_\d_0$/.test(b.name),
  );
  assert.equal(arms.length, 8);
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 5; j++)
      assert.ok(left.getObjectByName(`squid_arm_${i}_${j}`).isBone);
  const beforeLeft = vertices(body),
    beforeRight = vertices(other);
  const geometry = Array.from(body.geometry.attributes.position.array);
  advance(left, 70, { turn: 0.8 });
  assert.notDeepEqual(vertices(body), beforeLeft);
  assert.deepEqual(vertices(other), beforeRight);
  assert.deepEqual(
    Array.from(body.geometry.attributes.position.array),
    geometry,
  );
  assert.notStrictEqual(body.skeleton, other.skeleton);
  assert.notEqual(
    left.getObjectByName("squid_arm_0_1").rotation.x,
    left.getObjectByName("squid_arm_0_3").rotation.x,
  );
  assert.ok(Math.abs(arms[0].rotation.x) < 0.05);
});

test("虎鲸尾鳍与尾柄共用连续骨架，空中收敛划水但不改飞行姿态", () => {
  const root = createCreature("orca", 6, 4);
  const fluke = root.getObjectByName("orca_flukes");
  assert.ok(fluke.parent.isBone);
  advance(root, 60, { speed: 42, boosting: true });
  const flippers = [-1, 1].map((side) =>
    root.getObjectByName(`orca_flipper_${side}`),
  );
  assert.ok(flippers[0].rotation.y > 0.3);
  assert.ok(flippers[1].rotation.y < -0.3);
  advance(root, 120, { airborne: true });
  assert.ok(Math.abs(root.userData.pose.tailBeat) < 0.045);
  assert.equal(root.children[0].position.y, 0);
});

test("收腕事件逐步收拢再释放，旧两参数调用与其他物种入口仍可用", () => {
  const squid = createCreature("squid", 6, 4);
  advance(squid, 60, {});
  squid.userData.triggerFeed();
  advance(squid, 10, {}, 60);
  assert.ok(squid.userData.pose.feed > 0.3);
  advance(squid, 120, {}, 70);
  assert.ok(squid.userData.pose.feed < 0.001);
  for (const kind of ["orca", "squid", "shark"]) {
    const root = createCreature(kind, 6, 4);
    root.userData.animate(0, 1);
    root.userData.animate(0.1, 2.5);
    root.updateMatrixWorld(true);
    assert.ok(root.matrixWorld.elements.every(Number.isFinite));
  }
});

test("重开立即恢复角色初始姿势并清除上一局时钟和待收腕事件", () => {
  for (const kind of ["orca", "squid"]) {
    const root = createCreature(kind, 6, 42);
    const fresh = createCreature(kind, 6, 42);
    fresh.userData.animate(0, 1);
    const stateReference = root.userData.motionState;
    advance(root, 90, {
      speed: 72,
      boosting: true,
      jet: true,
      turn: 1,
      pitchInput: -1,
      airborne: true,
    });
    root.userData.triggerFeed();
    advance(root, 5, { boosting: true, jet: true }, 90);
    root.userData.triggerFeed();
    root.userData.resetMotion();
    assert.strictEqual(root.userData.motionState, stateReference);
    assert.deepEqual(root.userData.motionState, fresh.userData.motionState);
    assert.deepEqual(root.userData.pose, fresh.userData.pose);
    const snapshot = (model) => {
      model.updateMatrixWorld(true);
      const matrices = [];
      model.traverse((object) => matrices.push(...object.matrixWorld.elements));
      return matrices;
    };
    assert.deepEqual(snapshot(root), snapshot(fresh));
    // 首次使用新时钟仍是零增量，不能继承上一局最后一帧的时间差。
    root.userData.animate(100, 1);
    assert.deepEqual(root.userData.motionState, fresh.userData.motionState);
    root.userData.animate(100.1, 1);
    fresh.userData.animate(0.1, 1);
    assert.equal(root.userData.motionState.feed, 0);
    assert.ok(
      Math.abs(
        root.userData.motionState.phase - fresh.userData.motionState.phase,
      ) < 1e-12,
    );
  }
});

test("HF虎鲸完整水平尾鳍具有双侧弦长，蒙皮保持整片尾扇刚性", () => {
  const root = createCreature("orca", 1, 4),
    body = root.getObjectByName("orca_hf_body"),
    geometry = body.geometry,
    p = geometry.attributes.position,
    w = geometry.attributes.skinWeight,
    ids = geometry.attributes.skinIndex;
  const tail = [];
  for (let i = 0; i < p.count; i++)
    if (p.getZ(i) > 0.382) {
      tail.push(i);
      let weight = 0;
      for (let j = 0; j < 4; j++)
        if (ids.getComponent(i, j) === 4) weight += w.getComponent(i, j);
      assert.ok(Math.abs(weight - 1) < 1e-6);
    }
  assert.ok(tail.length > 100);
  for (const side of [-1, 1])
    for (const x of [0.06, 0.09, 0.12]) {
      const z = tail
        .filter((i) => Math.abs(p.getX(i) - side * x) < 0.008)
        .map((i) => p.getZ(i));
      assert.ok(z.length > 3);
      assert.ok(Math.max(...z) - Math.min(...z) > 0.025);
    }
  const points = tail.filter((i) => Math.abs(p.getX(i)) > 0.12).slice(0, 30),
    before = points.map((i) => new THREE.Vector3().fromBufferAttribute(p, i));
  advance(root, 90, { speed: 32, boosting: true, turn: 1 });
  root.updateMatrixWorld(true);
  body.skeleton.update();
  const after = points.map((i) =>
    body.getVertexPosition(i, new THREE.Vector3()),
  );
  for (let i = 1; i < after.length; i++)
    assert.ok(
      Math.abs(
        after[i].distanceTo(after[0]) - before[i].distanceTo(before[0]),
      ) < 1e-6,
    );
});
