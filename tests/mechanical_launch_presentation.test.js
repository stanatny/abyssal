import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { createMechanicalTorpedoes } from "../src/mechanical_torpedoes.js";
import { createMechanicalTorpedoFx } from "../src/mechanical_torpedo_fx.js";
import { createAttackTorpedoModel } from "../src/submarine_defense.js";
import { createPlayer } from "../src/simulation.js";

test("3/12/30m腹部挂弹与飞行弹共用完整实体，弹鼻和尺寸连续", () => {
  const scene = new THREE.Scene(),
    weapon = createMechanicalTorpedoes(scene);
  const muzzle = new THREE.Vector3();
  for (const length of [3, 12, 30]) {
    const avatar = createCreature("mechanical_shark", length);
    avatar.position.set(7, -60, 15);
    avatar.rotation.set(0.4, 0.9, -0.2);
    avatar.userData.animate(0, 1, { dt: 0 });
    avatar.updateMatrixWorld(true);
    const port = avatar.getObjectByName("ventral_torpedo_exit");
    avatar.userData.getTorpedoMuzzle(muzzle);
    const axis = new THREE.Vector3(0, 0, -1).transformDirection(
      port.matrixWorld,
    );
    const player = createPlayer("mechanical_shark", Math.min(length, 29));
    player.length = length;
    assert.ok(weapon.activate(player, muzzle, axis));
    const shot = weapon.projectiles.find((p) => p.active);
    assert.ok(shot.mesh.position.distanceTo(muzzle) < 1e-10);
    shot.mesh.updateMatrixWorld(true);
    const body = shot.mesh.userData.vehicleArt.body;
    const bounds =
      body.geometry.boundingBox ||
      (body.geometry.computeBoundingBox(), body.geometry.boundingBox);
    const inverse = port.matrixWorld.clone().invert();
    const first = new THREE.Vector3(0, -body.position.y, bounds.min.z)
      .applyMatrix4(body.matrixWorld)
      .applyMatrix4(inverse);
    assert.ok(Math.abs(first.z) < 1e-6, "弹鼻不再突然出现在出口前1.1m");
    const loaded = avatar.getObjectByName("launcher_loaded_torpedo");
    const mountedBody = loaded.userData.vehicleArt.body;
    assert.equal(mountedBody.geometry, body.geometry);
    assert.equal(mountedBody.material, body.material);
    const mountedNose = new THREE.Vector3(0, -body.position.y, bounds.min.z)
      .applyMatrix4(mountedBody.matrixWorld)
      .applyMatrix4(inverse);
    assert.ok(mountedNose.distanceTo(first) < 1e-6);
    assert.ok(
      Math.abs(
        loaded.getWorldScale(new THREE.Vector3()).x - shot.visualLength,
      ) < 1e-6,
    );
    assert.ok(port.position.z > -0.3 && port.position.z < -0.22);
    assert.ok(port.position.y < -0.1, "弹体在腹部而非嘴部");
    assert.equal(avatar.getObjectByName("launcher_ready_nose"), undefined);
    weapon.reset();
    avatar.userData.disposeLocalMotion();
  }
  weapon.dispose();
});

test("腹部空架后连续降出新弹，夹具在2秒内锁紧；暂停/独立实例/重开正常", () => {
  const a = createCreature("mechanical_shark", 12),
    b = createCreature("mechanical_shark", 12);
  const round = a.getObjectByName("launcher_loaded_torpedo"),
    clamp = a.getObjectByName("launcher_clamp_1");
  a.userData.triggerLaunch();
  assert.equal(round.visible, false);
  for (let i = 0; i < 36; i++) a.userData.animate(i / 60, 1, { dt: 1 / 60 });
  assert.equal(round.visible, true);
  assert.ok(round.position.y > 0.25);
  assert.equal(b.getObjectByName("launcher_loaded_torpedo").position.y, 0);
  const frozen = [round.position.y, clamp.rotation.z];
  for (let i = 0; i < 60; i++) a.userData.animate(3 + i, 1, { dt: 0 });
  assert.deepEqual([round.position.y, clamp.rotation.z], frozen);
  let previous = round.position.y;
  for (let i = 0; i < 78; i++) {
    a.userData.animate(i / 60, 1, { dt: 1 / 60 });
    assert.ok(round.position.y <= previous);
    assert.ok(previous - round.position.y < 0.011, "下降轨迹连续");
    previous = round.position.y;
  }
  assert.equal(a.userData.pose.mechanical.chamberLoaded, true);
  assert.equal(round.position.y, 0);
  assert.equal(clamp.rotation.z, 0);
  assert.equal(a.userData.pose.mechanical.chamberOpen, 0);
  a.userData.triggerLaunch();
  a.userData.resetMotion();
  assert.equal(a.userData.pose.mechanical.chamberLoaded, true);
  assert.equal(a.userData.pose.mechanical.launch, 0);
  a.userData.disposeLocalMotion();
  b.userData.disposeLocalMotion();
});

test("挂弹资源引用保持独立，失败发射不卸弹，反复装填不创建网格", () => {
  const a = createCreature("mechanical_shark", 12),
    b = createCreature("mechanical_shark", 12),
    weapon = createMechanicalTorpedoes(new THREE.Scene(), {
      onLaunch: () => a.userData.triggerLaunch(),
    });
  const round = a.getObjectByName("launcher_loaded_torpedo"),
    geometry = round.userData.vehicleArt.body.geometry;
  let disposed = 0;
  geometry.addEventListener("dispose", () => disposed++);
  const p = createPlayer("mechanical_shark", 12);
  p.health = 20;
  assert.equal(
    weapon.activate(p, new THREE.Vector3(), new THREE.Vector3(0, 0, -1)),
    false,
  );
  assert.equal(round.visible, true);
  const nodes = [];
  a.traverse((o) => nodes.push(o));
  for (let i = 0; i < 1200; i++) {
    a.userData.triggerLaunch();
    a.userData.animate(i, 1, { dt: 2 });
  }
  const after = [];
  a.traverse((o) => after.push(o));
  assert.deepEqual(after, nodes);
  a.userData.disposeLocalMotion();
  a.userData.disposeLocalMotion();
  assert.equal(disposed, 0);
  b.userData.disposeLocalMotion();
  assert.equal(disposed, 0);
  weapon.dispose();
  assert.equal(disposed, 1);
});

test("尾迹按已飞行距离展开，不从角色腹下瞬间补出整条，资源有界", () => {
  const scene = new THREE.Scene(),
    fx = createMechanicalTorpedoFx(scene);
  const shot = {
    active: true,
    mesh: new THREE.Object3D(),
    direction: new THREE.Vector3(0, 0, -1),
    distance: 0,
  };
  for (const distance of [0, 1, 2.2, 3, 6, 15, 140]) {
    shot.distance = distance;
    shot.mesh.position.z = -distance;
    fx.update(1 / 60, [shot]);
    assert.ok(fx.bubbles.count <= 12);
    if (distance <= 2.2) assert.equal(fx.bubbles.count, 0);
    for (let i = 0; i < fx.bubbles.count; i++) {
      const matrix = new THREE.Matrix4();
      fx.bubbles.getMatrixAt(i, matrix);
      const position = new THREE.Vector3().setFromMatrixPosition(matrix);
      assert.ok(position.z <= 0, "不得补画在发射点后方");
      assert.ok(position.z >= shot.mesh.position.z + 2.2999, "气泡来自弹尾");
    }
  }
  assert.equal(fx.bubbles.count, 12);
  fx.reset();
  assert.equal(fx.bubbles.count, 0);
  fx.dispose();
  fx.dispose();
});

test("机械弹体外观偏移为实例状态，不改变潜艇共用模型和物理弹道", () => {
  const submarine = createAttackTorpedoModel(2.2),
    scene = new THREE.Scene();
  const original = submarine.children.map((m) => m.position.clone());
  const weapon = createMechanicalTorpedoes(scene),
    player = createPlayer("mechanical_shark", 12);
  const origin = new THREE.Vector3(3, -70, 8),
    direction = new THREE.Vector3(1, 0.2, -1).normalize();
  assert.ok(weapon.activate(player, origin, direction));
  const shot = weapon.projectiles.find((p) => p.active);
  for (let frame = 0; frame < 60; frame++) {
    player.elapsed += 1 / 60;
    weapon.update(1 / 60, player);
  }
  assert.ok(
    shot.mesh.position.distanceTo(
      origin.clone().addScaledVector(direction, 70),
    ) < 1e-9,
  );
  assert.equal(player.health, 80);
  assert.equal(player.stamina, 80);
  submarine.children.forEach((m, i) =>
    assert.deepEqual(m.position, original[i]),
  );
  weapon.dispose();
  submarine.userData.disposeLocalMotion();
});
