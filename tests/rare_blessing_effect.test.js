import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createRareBlessingEffect } from "../src/rare_blessing_effect.js";

test("恩赐以捕获点开始，收束到玩家，暂停不计时，有限淡出且资源恒定", () => {
  const scene = new THREE.Scene();
  const effect = createRareBlessingEffect(scene);
  const origin = new THREE.Vector3(9, -140, -20),
    owner = new THREE.Vector3(0, -140, -20),
    camera = new THREE.Vector3(0, -130, 10);
  const geometries = new Set(),
    materials = new Set();
  effect.group.traverse((m) => {
    if (m.isMesh) {
      geometries.add(m.geometry);
      materials.add(m.material);
    }
  });
  assert.equal(effect.group.children.length, 12);
  assert.equal(geometries.size, 2);
  assert.equal(effect.active, false);
  effect.emit(origin, 30);
  assert.ok(effect.group.position.equals(origin));
  effect.update(0.6, camera, owner);
  assert.ok(effect.group.position.equals(owner));
  const pose = effect.group.children.map((m) => [
    m.position.toArray(),
    m.rotation.toArray(),
    m.material.opacity,
  ]);
  effect.update(0, camera, owner);
  assert.deepEqual(
    effect.group.children.map((m) => [
      m.position.toArray(),
      m.rotation.toArray(),
      m.material.opacity,
    ]),
    pose,
  );
  effect.update(1.9, camera, owner);
  assert.equal(effect.active, true);
  assert.ok(effect.group.children[0].material.opacity < 0.2);
  effect.update(0.11, camera, owner);
  assert.equal(effect.active, false);
  for (let i = 0; i < 20; i++) {
    effect.emit(origin, 5);
    effect.update(0.3, camera, owner);
    effect.reset();
  }
  assert.equal(effect.group.children.length, 12);
  const disposed = [];
  for (const r of [...geometries, ...materials])
    r.addEventListener("dispose", () => disposed.push(r));
  effect.dispose();
  effect.dispose();
  assert.equal(disposed.length, 14);
  assert.equal(scene.children.length, 0);
  assert.equal(effect.emit(origin), false);
});

test("减少动态效果仅淡入淡出，不旋转、脉动或移动星芒", () => {
  const effect = createRareBlessingEffect(new THREE.Scene(), {
    reducedMotion: () => true,
  });
  const owner = new THREE.Vector3(),
    camera = new THREE.Vector3(0, 0, 20);
  effect.emit(owner, 10);
  effect.update(0.3, camera, owner);
  const before = effect.group.children.map((m) => [
    m.position.toArray(),
    m.rotation.toArray(),
    m.scale.toArray(),
  ]);
  effect.update(1, camera, owner);
  assert.deepEqual(
    effect.group.children.map((m) => [
      m.position.toArray(),
      m.rotation.toArray(),
      m.scale.toArray(),
    ]),
    before,
  );
  effect.reset();
  assert.equal(effect.active, false);
  effect.dispose();
});
