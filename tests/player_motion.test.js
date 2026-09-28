import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";

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
      const arm = root.getObjectByName("squid_tentacle_-1");
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
          arm.skeleton.bones.at(-1).getWorldPosition(new THREE.Vector3()),
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
  const arms = leftMeshes.filter((mesh) => mesh.name.startsWith("squid_arm_"));
  assert.equal(arms.length, 16);
  assert.ok(
    arms.every(
      (mesh) => mesh.isSkinnedMesh && mesh.skeleton.bones.length === 5,
    ),
  );
  const beforeLeft = vertices(arms[0]);
  const rightArm = rightMeshes.find((mesh) => mesh.name === arms[0].name);
  const beforeRight = vertices(rightArm);
  const geometry = Array.from(arms[0].geometry.attributes.position.array);
  advance(left, 70, { turn: 0.8 });
  assert.notDeepEqual(vertices(arms[0]), beforeLeft);
  assert.deepEqual(vertices(rightArm), beforeRight);
  assert.deepEqual(
    Array.from(arms[0].geometry.attributes.position.array),
    geometry,
  );
  assert.strictEqual(meshes(left)[0], leftMeshes[0]);
  const bones = arms[0].skeleton.bones;
  assert.notEqual(bones[1].rotation.x, bones[3].rotation.x);
  assert.ok(Math.abs(bones[0].rotation.x) < 0.05);
});

test("虎鲸尾鳍与尾柄共用连续骨架，空中收敛划水但不改飞行姿态", () => {
  const root = createCreature("orca", 6, 4);
  const fluke = root.getObjectByName("orca_flukes");
  assert.ok(fluke.parent.isBone);
  advance(root, 60, { speed: 42, boosting: true });
  const flippers = [-1, 1].map((side) =>
    root.getObjectByName(`orca_flipper_${side}`),
  );
  assert.ok(flippers[0].rotation.y > 0.55);
  assert.ok(flippers[1].rotation.y < -0.55);
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

test("虎鲸双叶尾鳍保持完整弦长、无自交轮廓和非退化三角形", () => {
  const root = createCreature("orca");
  const geometry = root.getObjectByName("orca_flukes").children[0].geometry;
  const positions = geometry.attributes.position;
  const edges = new Map();
  const point = (index) => [positions.getX(index), positions.getZ(index)];
  const key = (index) =>
    point(index)
      .map((value) => value.toFixed(6))
      .join(",");
  const cross = (a, b, c) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  let area = 0;
  for (let index = 0; index < geometry.index.count; index += 3) {
    const vertices = [0, 1, 2].map((offset) =>
      geometry.index.getX(index + offset),
    );
    const projectedArea = Math.abs(cross(...vertices.map(point))) / 2;
    assert.ok(projectedArea > 1e-10, "尾鳍不能包含退化三角形");
    area += projectedArea;
    for (let edge = 0; edge < 3; edge++) {
      const id = [key(vertices[edge]), key(vertices[(edge + 1) % 3])]
        .sort()
        .join("|");
      edges.set(id, (edges.get(id) ?? 0) + 1);
    }
  }
  // 上下表面各贡献一次平面面积；旧交叉轮廓在半翼处失去有效弦长。
  assert.ok(area / 2 > 0.03 && area / 2 < 0.055);
  const boundary = [];
  for (const [id, count] of edges) {
    assert.ok(count === 2 || count === 4, "投影边应只有边界或内部两类");
    if (count === 2)
      boundary.push(id.split("|").map((point) => point.split(",").map(Number)));
  }
  assert.ok(boundary.length > 20);
  for (let first = 0; first < boundary.length; first++) {
    for (let second = first + 1; second < boundary.length; second++) {
      const [a, b] = boundary[first],
        [c, d] = boundary[second];
      const intersects =
        cross(a, b, c) * cross(a, b, d) < -1e-15 &&
        cross(c, d, a) * cross(c, d, b) < -1e-15;
      assert.equal(intersects, false, "尾鳍前后缘不能穿过彼此");
    }
  }
});
