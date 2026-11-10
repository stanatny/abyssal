import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createFeedingTransition } from "../src/feeding_transition.js";
import { createCombatEffects } from "../src/combat_effects.js";
import { createCreature } from "../src/creatures.js";
import { castSegment } from "../src/collision.js";

function pose(mesh) {
  return {
    position: mesh.position.toArray(),
    quaternion: mesh.quaternion.toArray(),
    scale: mesh.scale.toArray(),
  };
}

function anchor() {
  return {
    mouth: new THREE.Vector3(0, 0, -3),
    direction: new THREE.Vector3(0, 0, -1),
  };
}

test("猎物保留可见收拢过程，后段才发一次余雾并恢复原始模型姿态", () => {
  const mist = [];
  const feeding = createFeedingTransition({
    onMist: (point, length) => mist.push({ point, length }),
  });
  const prey = createCreature("sardine", 0.3, 1);
  prey.position.set(1, 0, -1);
  prey.rotation.set(0.1, 0.7, -0.2);
  const original = pose(prey),
    { mouth, direction } = anchor();
  const initialDistance = prey.position.distanceTo(mouth);
  assert.equal(feeding.start(prey, 0.3), true);
  assert.equal(feeding.start(prey, 0.3), false);
  assert.equal(prey.visible, true);
  assert.equal(mist.length, 0);
  feeding.update(0.08, { mouth, direction });
  assert.ok(prey.position.distanceTo(mouth) < initialDistance);
  assert.equal(mist.length, 0);
  feeding.update(0.15, { mouth, direction });
  assert.equal(mist.length, 1);
  assert.ok(prey.visible);
  assert.ok(prey.scale.x < original.scale[0]);
  assert.ok(prey.scale.z > prey.scale.x);
  assert.ok(mist[0].point.distanceTo(mouth) < 0.1);
  assert.equal(mist[0].length, 0.3);
  feeding.update(0.2, { mouth, direction });
  assert.equal(prey.visible, false);
  assert.equal(feeding.has(prey), false);
  assert.deepEqual(pose(prey), original);
  feeding.update(1, { mouth, direction });
  assert.equal(mist.length, 1);
});

test("世界坐标嘴部在旋转缩放父节点下仍正确，目标移动后猎物继续跟随", () => {
  const parent = new THREE.Group();
  parent.position.set(10, -4, 8);
  parent.rotation.set(0.2, 1.1, -0.1);
  parent.scale.setScalar(2);
  const prey = createCreature("shark", 2, 3);
  prey.position.set(1, 0, -1);
  parent.add(prey);
  parent.updateMatrixWorld(true);
  const original = pose(prey);
  const source = prey.getWorldPosition(new THREE.Vector3());
  const mouth = source.clone().add(new THREE.Vector3(2, 0, -2));
  const direction = new THREE.Vector3(1, 0, -1).normalize();
  const feeding = createFeedingTransition();
  feeding.start(prey, 2);
  feeding.update(0.1, { mouth, direction });
  const first = prey.getWorldPosition(new THREE.Vector3());
  assert.ok(first.distanceTo(mouth) < source.distanceTo(mouth));
  mouth.add(new THREE.Vector3(1, -0.5, -1));
  feeding.update(0.18, { mouth, direction });
  const second = prey.getWorldPosition(new THREE.Vector3());
  assert.ok(second.distanceTo(mouth) < 0.4);
  assert.strictEqual(prey.parent, parent);
  feeding.reset();
  assert.deepEqual(pose(prey), original);
  assert.strictEqual(prey.parent, parent);
  assert.equal(prey.visible, false);
});

test("暂停与无效输入冻结过渡，重开还原缩放且不会补发延迟血雾", () => {
  let emissions = 0;
  const feeding = createFeedingTransition({ onMist: () => emissions++ });
  const prey = createCreature("octopus", 5, 4),
    original = pose(prey),
    target = anchor();
  assert.equal(feeding.start(prey, NaN), false);
  assert.equal(feeding.start(prey, -1), false);
  feeding.start(prey, 5);
  feeding.update(0.1, target);
  const frozen = pose(prey),
    age = feeding.snapshot().entries[0].age;
  for (const dt of [0, -1, NaN, Infinity]) feeding.update(dt, target);
  feeding.update(0.1, {
    mouth: { x: NaN, y: 0, z: 0 },
    direction: target.direction,
  });
  feeding.update(0.1, { mouth: target.mouth, direction: new THREE.Vector3() });
  assert.deepEqual(pose(prey), frozen);
  assert.equal(feeding.snapshot().entries[0].age, age);
  feeding.reset();
  assert.deepEqual(pose(prey), original);
  assert.equal(feeding.snapshot().activeCount, 0);
  feeding.update(1, target);
  assert.equal(emissions, 0);
  prey.visible = true;
  feeding.start(prey, 5);
  feeding.update(10, target);
  assert.equal(emissions, 1);
  assert.deepEqual(pose(prey), original);
  assert.equal(prey.visible, false);
});

test("密集鱼群最多借用16个模型，挤出和重置均恢复原姿态且快照不能修改内部状态", () => {
  const feeding = createFeedingTransition();
  const prey = Array.from({ length: 18 }, (_, index) => {
    const mesh = new THREE.Group();
    mesh.position.set(index, 0, 0);
    mesh.scale.setScalar(index + 1);
    return mesh;
  });
  const originals = prey.map(pose);
  prey.forEach((mesh) => feeding.start(mesh, 0.3));
  assert.equal(feeding.snapshot().activeCount, 16);
  assert.equal(feeding.snapshot().evictedCount, 2);
  assert.equal(feeding.has(prey[0]), false);
  assert.equal(prey[0].visible, false);
  feeding.update(0.1, anchor());
  const snapshot = feeding.snapshot();
  snapshot.entries[0].age = 100;
  snapshot.entries.length = 0;
  assert.equal(feeding.snapshot().activeCount, 16);
  assert.ok(feeding.snapshot().entries[0].age < 1);
  feeding.reset();
  prey.forEach((mesh, index) => {
    assert.deepEqual(pose(mesh), originals[index]);
    assert.equal(mesh.visible, false);
  });
});

test("吞食只变换原节点，不改变共享几何材质或另一条鱼的骨骼", () => {
  const prey = createCreature("mackerel", 0.55, 9);
  const neighbour = createCreature("mackerel", 0.55, 9);
  prey.userData.animate(0);
  neighbour.userData.animate(0);
  const shared = [],
    otherPose = [];
  prey.traverse((node) => {
    if (node.isMesh)
      shared.push({
        node,
        geometry: node.geometry,
        material: node.material,
        opacity: node.material.opacity,
      });
  });
  neighbour.traverse((node) => otherPose.push(pose(node)));
  const feeding = createFeedingTransition();
  feeding.start(prey, 0.55);
  feeding.update(0.2, anchor());
  for (const entry of shared) {
    assert.strictEqual(entry.node.geometry, entry.geometry);
    assert.strictEqual(entry.node.material, entry.material);
    assert.equal(entry.node.material.opacity, entry.opacity);
  }
  let index = 0;
  neighbour.traverse((node) =>
    assert.deepEqual(pose(node), otherPose[index++]),
  );
  feeding.reset();
});

test("紧凑吞食余雾复用粒子池，微小猎物的雾团克制并能自然清空", () => {
  const scene = new THREE.Scene(),
    effects = createCombatEffects(scene),
    point = new THREE.Vector3();
  const resources = effects.group.children.map((node) => ({
    node,
    geometry: node.geometry,
    material: node.material,
  }));
  effects.mealMist(point, 0.18);
  assert.ok(effects.activeParticles > 0 && effects.activeParticles <= 10);
  effects.update(0.2, point, point);
  for (const node of effects.group.children.filter(
    (child) => child.isSprite && child.visible,
  ))
    assert.ok(Math.max(node.scale.x, node.scale.y) < 1);
  effects.update(2, point, point);
  assert.equal(effects.activeParticles, 0);
  for (let i = 0; i < 100; i++) effects.mealMist(point, i % 2 ? 0.18 : 20);
  assert.ok(effects.activeParticles <= 80);
  assert.equal(effects.group.children.length, resources.length);
  for (const saved of resources) {
    assert.strictEqual(saved.node.material, saved.material);
    assert.strictEqual(saved.node.geometry, saved.geometry);
  }
  effects.reset();
  assert.equal(effects.activeParticles, 0);
  effects.dispose();
  assert.equal(scene.children.includes(effects.group), false);
});

test("front-caught squid prey travels outside the mantle before shrinking at the real mouth", () => {
  for (const side of [-1, 1]) {
    const squid = createCreature("squid", 10, 3);
    squid.position.set(12, -8, 6);
    squid.rotation.set(0.3, side * 1.1, 0);
    const prey = createCreature("fish", 0.6, 4);
    prey.position.copy(
      squid.localToWorld(new THREE.Vector3(side * 0.01, 0, -0.5)),
    );
    const original = pose(prey),
      mist = [];
    const feeding = createFeedingTransition({ onMist: (p) => mist.push(p) });
    feeding.start(prey, 0.6, { carryFrame: squid });
    const duration = feeding.snapshot().entries[0].duration;
    assert.ok(duration > 0.55 && duration <= 0.95);
    let previous = prey.position.clone();
    for (let i = 1; i <= 100; i++) {
      const mouth = squid.userData.getFeedingMouth(new THREE.Vector3());
      const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(
        squid.quaternion,
      );
      feeding.update(duration / 100, { mouth, direction });
      if (!feeding.has(prey)) break;
      const p = squid.worldToLocal(prey.position.clone());
      if (p.z > -0.38 && p.z < -0.035)
        assert.ok(
          Math.hypot(p.x, p.y) > 0.065,
          "prey stays outside the mantle",
        );
      if (i < 65) assert.ok(prey.scale.x > original.scale[0] * 0.98);
      assert.ok(
        prey.position.distanceTo(previous) < 0.5,
        "continuous transport",
      );
      previous.copy(prey.position);
      if (i < 90) assert.equal(mist.length, 0);
      if (i === 92) assert.ok(prey.position.distanceTo(mouth) < 0.15);
    }
    feeding.update(duration, {
      mouth: squid.userData.getFeedingMouth(new THREE.Vector3()),
      direction: new THREE.Vector3(0, 0, 1),
    });
    assert.equal(mist.length, 1);
    assert.deepEqual(pose(prey), original);
    assert.equal(prey.visible, false);
  }
});

test("carried prey follows a turning growing squid; pause and reset retain bounded ownership", () => {
  const squid = createCreature("squid", 6, 3),
    prey = createCreature("fish", 0.6, 4);
  prey.position.set(0, 0, -3);
  const original = pose(prey),
    feeding = createFeedingTransition();
  let covered = true;
  feeding.start(prey, 0.6, {
    carryFrame: squid,
    blockedBetween: (a, b) => covered && b.x > 0,
  });
  const frame = () => ({
    mouth: squid.userData.getFeedingMouth(new THREE.Vector3()),
    direction: new THREE.Vector3(0, 0, 1).applyQuaternion(squid.quaternion),
  });
  feeding.update(0.15, frame());
  assert.ok(
    squid.worldToLocal(prey.position.clone()).x < 0,
    "uses the clear flank",
  );
  const frozen = pose(prey);
  feeding.update(0, frame());
  assert.deepEqual(pose(prey), frozen);
  covered = false;
  squid.position.set(8, -12, 3);
  squid.rotation.set(-0.4, 2.1, 0);
  squid.scale.setScalar(10);
  feeding.update(0.25, frame());
  assert.ok(prey.position.distanceTo(squid.position) < 5);
  assert.equal(feeding.snapshot().activeCount, 1);
  feeding.reset();
  squid.userData.resetMotion();
  assert.deepEqual(pose(prey), original);
  assert.equal(squid.userData.pose.capture, 0);
  assert.equal(feeding.snapshot().activeCount, 0);
});

test("moving squid cannot carry the visible prey through its adjacent wall", () => {
  const squid = createCreature("squid", 6, 3),
    prey = createCreature("fish", 1.8, 4);
  prey.position.set(0, 0, -4.2);
  const wall = {
    type: "box",
    x: 0,
    y: 0,
    z: -5,
    halfSize: { x: 12, y: 12, z: 0.5 },
  };
  const feeding = createFeedingTransition();
  feeding.start(prey, 1.8, {
    carryFrame: squid,
    blockedBetween: (a, b) => castSegment(a, b, [wall]) !== null,
  });
  for (let i = 1; i <= 40; i++) {
    squid.position.z = -Math.min(1.95, i * 0.12);
    feeding.update(0.016, {
      mouth: squid.userData.getFeedingMouth(new THREE.Vector3()),
      direction: new THREE.Vector3(0, 0, 1),
    });
    if (feeding.has(prey))
      assert.ok(prey.position.z > -4.5, "prey remains on the accessible side");
  }
  assert.ok(
    prey.position.distanceTo(
      squid.userData.getFeedingMouth(new THREE.Vector3()),
    ) < 0.25,
  );
});

test("a clipped carry resumes continuously in a narrow legal corridor", () => {
  const squid = createCreature("squid", 10, 3),
    prey = createCreature("fish", 4, 4);
  prey.position.set(0, 0, -5);
  const walls = [-2, 2].map((x) => ({
    type: "box",
    x,
    y: 0,
    z: 0,
    halfSize: { x: 0.5, y: 10, z: 12 },
  }));
  const mouth = squid.userData.getFeedingMouth(new THREE.Vector3());
  const mist = [];
  const feeding = createFeedingTransition({
    onMist: (point) => mist.push({ point, prey: prey.position.clone() }),
  });
  feeding.start(prey, 4, {
    carryFrame: squid,
    blockedBetween: (a, b) => castSegment(a, b, walls) !== null,
  });
  let previous = prey.position.clone();
  for (let i = 0; i < 50 && feeding.has(prey); i++) {
    feeding.update(0.016, { mouth, direction: new THREE.Vector3(0, 0, 1) });
    if (!feeding.has(prey)) break;
    assert.ok(
      prey.position.distanceTo(previous) <= 22 * 0.016 + 1e-10,
      "no catch-up snap after cover clears",
    );
    assert.ok(
      Math.abs(prey.position.x) < 1.5,
      "visible center remains inside corridor",
    );
    previous.copy(prey.position);
  }
  assert.equal(feeding.snapshot().activeCount, 0);
  assert.equal(mist.length, 1);
  assert.ok(
    mist[0].prey.distanceTo(mouth) < 0.6,
    "mist occurs only at the mouth stage",
  );
});
