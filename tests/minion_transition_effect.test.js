import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createMinionTransitionEffect } from "../src/minion_transition_effect.js";

function resources(effect) {
  const geometries = new Set(),
    materials = new Set();
  let meshes = 0,
    sprites = 0,
    triangles = 0;
  effect.group.traverse((part) => {
    if (part.isMesh) {
      meshes++;
      triangles +=
        (part.geometry.index?.count ??
          part.geometry.attributes.position.count) / 3;
      geometries.add(part.geometry);
    }
    if (part.isSprite) sprites++;
    if (part.material) materials.add(part.material);
  });
  return { geometries, materials, meshes, sprites, triangles };
}
test("双槽真实位姿：显形随仆从移动，解体留在最后位置，重召可重叠但资源有界", () => {
  const scene = new THREE.Scene(),
    parent = new THREE.Group(),
    source = new THREE.Group();
  parent.position.set(4, -10, 7);
  parent.rotation.y = 0.7;
  scene.add(parent, source);
  const fx = createMinionTransitionEffect(parent),
    before = resources(fx);
  assert.equal(before.meshes, 40);
  assert.equal(before.sprites, 8);
  assert.equal(before.geometries.size, 9);
  assert.ok(before.triangles < 7000);
  source.position.set(8, -30, -6);
  source.rotation.set(0.3, 1.2, 0);
  source.scale.setScalar(9.75);
  assert.equal(fx.emit(source), true);
  fx.update(0.3);
  const live = fx.group.children.find((x) => x.visible);
  scene.updateMatrixWorld(true);
  assert.ok(
    live.matrixWorld.equals(source.matrixWorld) ||
      live.getWorldPosition(new THREE.Vector3()).distanceTo(source.position) <
        1e-10,
  );
  source.position.x += 20;
  fx.update(0.1);
  assert.ok(
    live.getWorldPosition(new THREE.Vector3()).distanceTo(source.position) <
      1e-10,
  );
  fx.reset();
  assert.equal(fx.emit(source, "depart"), true);
  const ghost = fx.group.children.find((x) => x.visible);
  const last = ghost.getWorldPosition(new THREE.Vector3());
  source.visible = false;
  source.position.x += 30;
  fx.update(0.2);
  assert.ok(
    ghost.getWorldPosition(new THREE.Vector3()).distanceTo(last) < 1e-10,
  );
  assert.equal(fx.emit(source), false);
  source.visible = true;
  assert.equal(fx.emit(source), true);
  assert.equal(fx.snapshot().filter((s) => s.active).length, 2);
  const pose = JSON.stringify(fx.snapshot());
  fx.update(0);
  fx.update(NaN);
  assert.equal(JSON.stringify(fx.snapshot()), pose);
  fx.update(2);
  assert.equal(
    fx.snapshot().some((s) => s.active),
    false,
  );
  for (let i = 0; i < 40; i++) {
    fx.emit(source);
    fx.update(0.4);
    fx.emit(source, "depart");
    fx.reset();
  }
  const after = resources(fx);
  assert.deepEqual(after, before);
  let disposed = 0;
  for (const resource of [...before.geometries, ...before.materials])
    resource.addEventListener("dispose", () => disposed++);
  fx.dispose();
  fx.dispose();
  assert.equal(disposed, before.geometries.size + before.materials.size);
  assert.equal(parent.children.length, 0);
  assert.equal(fx.emit(source), false);
});
test("减少动态效果只改变透明度；复用源模型，不改姿态/材质/几何", () => {
  const scene = new THREE.Scene(),
    source = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial(),
    );
  scene.add(source);
  const fx = createMinionTransitionEffect(scene, { reducedMotion: () => true });
  const original = source.matrix.clone(),
    originalMaterial = source.material,
    originalGeometry = source.geometry;
  fx.emit(source, "depart");
  fx.update(0.2);
  const slot = fx.group.children.find((x) => x.visible);
  const transforms = () =>
    slot.children.map((m) => [
      m.position.toArray(),
      m.rotation.toArray(),
      m.scale.toArray(),
    ]);
  const before = transforms();
  fx.update(0.4);
  assert.deepEqual(transforms(), before);
  assert.equal(source.material, originalMaterial);
  assert.equal(source.geometry, originalGeometry);
  assert.deepEqual(source.matrix, original);
  assert.equal(fx.snapshot().find((s) => s.active).quiet, true);
  fx.dispose();
});

test("分裂血肉来自当前主角的真实侧腹，连到碰撞解算后的仆从；尸爆向外飞散且不跟随隐藏尸体", () => {
  const scene = new THREE.Scene(),
    parent = new THREE.Group(),
    owner = new THREE.Group(),
    minion = new THREE.Group(),
    anchor = new THREE.Object3D();
  scene.add(parent, owner, minion);
  parent.position.set(7, -6, 3);
  parent.rotation.y = 0.7;
  owner.position.set(-8, -40, -15);
  owner.rotation.set(0.2, 0.9, 0.1);
  owner.scale.setScalar(15);
  owner.add(anchor);
  anchor.position.set(0.094, 0.005, -0.035);
  owner.userData.getFissionSource = (out) => anchor.getWorldPosition(out);
  minion.position.set(2, -40, -13);
  minion.rotation.y = 0.9;
  minion.scale.setScalar(9.75);
  const fx = createMinionTransitionEffect(parent);
  fx.emit(minion, "appear", owner);
  fx.update(0.1);
  const active = fx.group.children.find((p) => p.visible),
    state = fx.snapshot().find((p) => p.active);
  const actualOrigin = new THREE.Vector3(...state.origin);
  active.localToWorld(actualOrigin);
  assert.ok(
    actualOrigin.distanceTo(anchor.getWorldPosition(new THREE.Vector3())) <
      1e-9,
  );
  owner.position.z -= 6;
  owner.rotation.y += 0.5;
  minion.position.x += 4;
  fx.update(0.2);
  const next = fx.snapshot().find((p) => p.active);
  const followed = active.localToWorld(new THREE.Vector3(...next.origin));
  assert.ok(
    followed.distanceTo(anchor.getWorldPosition(new THREE.Vector3())) < 1e-9,
  );
  const cord = active.children[9]; // 两条实体血肉束，不是屏幕坐标或固定原点光圈。
  const endpoints = [0, 1].map((t) => {
    const center = new THREE.Vector3();
    let count = 0;
    const uv = cord.geometry.attributes.uv,
      p = cord.geometry.attributes.position;
    for (let i = 0; i < 7; i++) {
      const row = t ? 0 : 8,
        n = row * 7 + i;
      // 柱面端环的重复接缝顶点不参与均值。
      if (i < 6) {
        center.add(new THREE.Vector3().fromBufferAttribute(p, n));
        count++;
      }
    }
    return cord.localToWorld(center.divideScalar(count));
  });
  assert.ok(Math.min(...endpoints.map((v) => v.distanceTo(followed))) < 1e-6);
  const originalMatrix = owner.matrixWorld.clone();
  fx.reset();
  fx.emit(minion, "depart");
  const corpse = fx.group.children.find((p) => p.visible);
  const flesh = corpse.children[11],
    first = flesh.position.length();
  minion.visible = false;
  minion.position.set(100, 100, 100);
  fx.update(0.55);
  assert.ok(flesh.position.length() > first + 0.1);
  assert.ok(
    corpse.children.filter((p) => p.isSprite).every((p) => p.scale.x > 0.4),
  );
  assert.ok(corpse.children.every((p) => !p.material || p.material.depthTest));
  assert.ok(owner.matrixWorld.equals(originalMatrix));
  fx.update(2);
  assert.equal(
    fx.snapshot().some((p) => p.active),
    false,
  );
  fx.dispose();
});

test("分裂特效沿最终体积连接，成形中的真实鲨鱼不会再套一个完整骨架", () => {
  const scene = new THREE.Scene(),
    minion = new THREE.Group();
  scene.add(minion);
  minion.scale.setScalar(0.78);
  minion.userData.fissionVisualLength = 9.75;
  const fx = createMinionTransitionEffect(scene),
    before = resources(fx);
  fx.emit(minion, "appear");
  fx.update(0.1);
  const slot = fx.group.children.find((p) => p.visible);
  assert.ok(Math.abs(slot.scale.x - 9.75) < 1e-9);
  assert.ok(slot.children.slice(3, 9).every((p) => p.visible === false));
  minion.scale.setScalar(6);
  fx.update(0.3);
  assert.ok(Math.abs(slot.scale.x - 9.75) < 1e-9);
  assert.deepEqual(resources(fx), before);
  fx.dispose();
});
