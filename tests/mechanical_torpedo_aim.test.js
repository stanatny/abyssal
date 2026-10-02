import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createMechanicalTorpedoes } from "../src/mechanical_torpedoes.js";
import { createPlayer } from "../src/simulation.js";
import { castSegment } from "../src/collision.js";

function fixture(angle = 5, wall = false) {
  const scene = new THREE.Scene(),
    p = createPlayer("mechanical_shark", 20),
    origin = new THREE.Vector3(0, -50, 0),
    direction = new THREE.Vector3(0, 0, -1);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5),
    new THREE.MeshBasicMaterial(),
  );
  mesh.position.set(Math.tan((angle * Math.PI) / 180) * 65, -50, -65);
  const e = {
    mesh,
    hiddenFor: 0,
    species: { length: 3, nutrition: 20, growth: 1, label: "试验猎物" },
    velocity: new THREE.Vector3(),
  };
  const prey = [e],
    hits = [];
  const solids = wall
    ? [{ type: "box", x: 0, y: -50, z: -25, halfSize: { x: 40, y: 40, z: 1 } }]
    : [];
  const tube = createMechanicalTorpedoes(scene, {
    entities: () => prey,
    castWorld: (a, b, r) => castSegment(a, b, solids, r),
    onBlast: (x) => hits.push({ ...x }),
  });
  return { scene, p, origin, direction, e, prey, hits, tube, solids };
}
function frame(h, n = 1, move = () => {}) {
  for (let i = 0; i < n; i++) {
    h.tube.beforePreyMotion();
    move();
    h.p.elapsed += 1 / 60;
    h.tube.update(1 / 60, h.p);
  }
}
test("瞄准锁定与发射选择同一目标，真实制导弹体命中", () => {
  const h = fixture();
  const target = h.tube.previewAim(h.origin, h.direction, h.p);
  assert.equal(target.entity, h.e);
  h.tube.activate(h.p, h.origin, h.direction);
  assert.equal(h.tube.projectiles[0].target.entity, target.entity);
  let max = 0;
  for (let i = 0; i < 120; i++) {
    frame(h);
    max = Math.max(
      max,
      (h.direction.angleTo(h.tube.projectiles[0].direction) * 180) / Math.PI,
    );
  }
  assert.equal(h.hits.length, 1);
  assert.equal(h.hits[0].killed, 1);
  assert.equal(h.p.eaten, 1);
  assert.ok(max >= 4.9);
  h.tube.dispose();
});
test("七度之外、背后、超射程和墙后不提示或追踪", () => {
  for (const [angle, wall] of [
    [7.1, false],
    [170, false],
    [5, true],
  ]) {
    const h = fixture(angle, wall);
    assert.equal(h.tube.previewAim(h.origin, h.direction, h.p), null);
    h.tube.activate(h.p, h.origin, h.direction);
    frame(h, 20);
    assert.equal(h.tube.projectiles[0].direction.x, 0);
    if (wall) {
      frame(h, 40);
      assert.equal(h.p.eaten, 0);
    }
    h.tube.dispose();
  }
  const h = fixture();
  h.e.mesh.position.multiplyScalar(3);
  assert.equal(h.tube.previewAim(h.origin, h.direction, h.p), null);
  h.tube.dispose();
});
test("近处小鱼在窄角内锁定后直接朝目标发射", () => {
  for (const distance of [15, 25, 40]) {
    const h = fixture(6);
    h.e.mesh.position.set(
      Math.tan((6 * Math.PI) / 180) * distance,
      -50,
      -distance,
    );
    h.tube.activate(h.p, h.origin, h.direction);
    const initial =
      (h.direction.angleTo(h.tube.projectiles[0].direction) * 180) / Math.PI;
    assert.ok(initial >= 5.99 && initial <= 6.00001);
    frame(h, 120);
    assert.equal(h.p.eaten, 1);
    h.tube.dispose();
  }
});
test("目标横移超出旧九度走廊仍持续追踪，距离裁剪不解除存活锁定", () => {
  const h = fixture();
  h.tube.activate(h.p, h.origin, h.direction);
  frame(h, 8);
  h.e.mesh.position.x = 45;
  h.e.mesh.visible = false;
  frame(h);
  const shot = h.tube.projectiles[0];
  assert.equal(shot.target.entity, h.e);
  frame(h, 110, () => (h.e.mesh.position.x += 0.08));
  assert.equal(h.p.eaten, 1);
  assert.ok(h.direction.angleTo(shot.direction) > Math.PI / 12);
  h.tube.dispose();
});
test("退休后不自动改锁别的猎物，丢失目标仍受射程限制", () => {
  const h = fixture();
  h.tube.activate(h.p, h.origin, h.direction);
  h.e.hiddenFor = 10;
  const extra = { ...h.e, hiddenFor: 0, mesh: h.e.mesh.clone() };
  extra.mesh.position.set(65, -50, -50);
  h.prey.push(extra);
  frame(h);
  assert.equal(h.tube.projectiles[0].target, null);
  frame(h, 125);
  assert.equal(h.hits.length, 1);
  assert.equal(h.p.eaten, 0);
  assert.ok(h.tube.projectiles.every((p) => !p.active));
  h.tube.dispose();
});
test("慢速移动目标可命中，已退休目标不会继续追踪", () => {
  const h = fixture(3);
  h.tube.activate(h.p, h.origin, h.direction);
  frame(h, 110, () => (h.e.mesh.position.x += 0.005));
  assert.equal(h.p.eaten, 1);
  h.tube.dispose();
  const k = fixture();
  k.tube.activate(k.p, k.origin, k.direction);
  k.e.hiddenFor = 10;
  frame(k);
  assert.equal(k.tube.projectiles[0].target, null);
  assert.equal(k.p.eaten, 0);
  k.tube.dispose();
});
test("领主预览提示体型门槛，未到门槛不启动校准", () => {
  const h = fixture(4);
  h.prey.length = 0;
  const boss = {
    mesh: h.e.mesh,
    enabled: true,
    state: { defeated: false, species: { length: 48, minAttackLength: 25 } },
  };
  h.scene.add(boss.mesh);
  h.tube.dispose();
  h.tube = createMechanicalTorpedoes(h.scene, { bosses: () => [boss] });
  const target = h.tube.previewAim(h.origin, h.direction, h.p);
  assert.equal(target?.eligible, false);
  h.tube.activate(h.p, h.origin, h.direction);
  assert.equal(h.tube.projectiles[0].target, null);
  h.tube.reset();
  h.p.length = 25;
  assert.equal(h.tube.previewAim(h.origin, h.direction, h.p)?.eligible, true);
  h.tube.activate(h.p, h.origin, h.direction);
  assert.equal(h.tube.projectiles[0].target.entity, boss);
  h.tube.dispose();
});
test("发射后新增遮挡会解除校准，弹体撞墙且不穿墙结算", () => {
  const h = fixture();
  h.tube.activate(h.p, h.origin, h.direction);
  frame(h, 2);
  h.solids.push({
    type: "box",
    x: 0,
    y: -50,
    z: -25,
    halfSize: { x: 40, y: 40, z: 1 },
  });
  frame(h, 8);
  assert.equal(h.tube.projectiles[0].target, null);
  frame(h, 80);
  assert.equal(h.hits.length, 1);
  assert.equal(h.p.eaten, 0);
  assert.ok(h.hits[0].point.z > -26);
  h.tube.dispose();
});
