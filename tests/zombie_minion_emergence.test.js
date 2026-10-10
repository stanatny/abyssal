import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { createZombieMinion } from "../src/zombie_minion.js";
import { createPlayer } from "../src/simulation.js";
import { MINION_RULES } from "../src/zombie_shark_rules.js";
import { REGIONAL_RARES } from "../src/regional_rare.js";

function setup(length = 15, options = {}) {
  const scene = new THREE.Scene(),
    player = createPlayer("zombie_shark", Math.min(length, 29.9)),
    position = new THREE.Vector3(0, -50, 0),
    forward = new THREE.Vector3(0, 0, -1),
    owner = createCreature("zombie_shark", length);
  player.length = length;
  player.mass = (length / 6) ** 3;
  owner.position.copy(position);
  scene.add(owner);
  let meals = 0;
  const minion = createZombieMinion(scene, {
    blockedBetween: () => false,
    getOwnerMesh: () => owner,
    onConsume: () => {
      meals++;
      return true;
    },
    effects: { mealMist() {}, bite() {} },
    ...options,
  });
  return {
    scene,
    player,
    position,
    forward,
    owner,
    minion,
    get meals() {
      return meals;
    },
  };
}
function step(h, dt = 1 / 60, prey = []) {
  h.player.elapsed += dt;
  h.owner.position.copy(h.position);
  h.owner.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), h.forward);
  h.owner.userData.animate(h.player.elapsed, 0.5, { dt, speed: 12, turn: 0.1 });
  h.minion.update(dt, h.player, h.position, h.forward, prey);
}

test("真实仆从从本尊体内逐渐长出，沿连续轨迹挣脱；未成形不能捕食", () => {
  for (const length of [5, 15, 30]) {
    const h = setup(length);
    assert.equal(h.minion.activate(h.player, h.position, h.forward), true);
    const mesh = h.minion.mesh,
      id = mesh.uuid;
    assert.ok(mesh.position.distanceTo(h.position) < length * 0.1);
    assert.ok(mesh.scale.x < length * 0.1);
    assert.equal(h.minion.forming, true);
    const prey = {
      species: REGIONAL_RARES[0],
      mesh: createCreature(REGIONAL_RARES[0].kind, REGIONAL_RARES[0].length),
      hiddenFor: 0,
    };
    prey.mesh.position.copy(mesh.position);
    let oldPosition = mesh.position.clone(),
      oldLength = mesh.scale.x;
    for (
      let i = 0;
      i < Math.floor(MINION_RULES.fissionDuration * 60) - 1;
      i++
    ) {
      h.position.addScaledVector(h.forward, 12 / 60);
      step(h, 1 / 60, [prey]);
      assert.equal(h.minion.mesh.uuid, id);
      assert.equal(h.minion.forming, true);
      assert.equal(h.meals, 0);
      assert.ok(mesh.scale.x >= oldLength - 1e-9);
      assert.ok(mesh.position.distanceTo(oldPosition) < length * 0.055 + 0.21);
      assert.ok(
        [...mesh.position.toArray(), ...mesh.quaternion.toArray()].every(
          Number.isFinite,
        ),
      );
      oldPosition.copy(mesh.position);
      oldLength = mesh.scale.x;
    }
    const frozen = h.minion.snapshot();
    h.minion.update(0, h.player, h.position, h.forward, [prey]);
    assert.deepEqual(h.minion.snapshot(), frozen);
    step(h, 0.04, []);
    assert.equal(h.minion.forming, false);
    assert.ok(Math.abs(mesh.scale.x - length * 0.65) < 1e-9);
    assert.ok(mesh.position.distanceTo(h.position) > length * 0.2);
    assert.ok(h.minion.presentation.weight > 0.5);
    step(h, 1.3, []);
    assert.equal(h.minion.presentation, null);
    assert.equal(h.minion.state.activeUntil, 60);
    assert.equal(h.minion.state.readyAt, 60);
    h.minion.reset();
    assert.equal(mesh.visible, false);
    assert.equal(h.minion.presentation, null);
    h.player.health = h.player.stamina = h.player.hunger = 100;
    assert.equal(h.minion.activate(h.player, h.position, h.forward), true);
    assert.equal(h.minion.mesh.uuid, id);
    assert.ok(mesh.scale.x < length * 0.1);
  }
});

test("分裂选择容得下身体的一侧，兼容碰撞回调普通坐标，重叠推出不能穿墙", () => {
  const h = setup(15, {
    resolveMovement: (a, b) => ({ position: b.x > 0 ? { ...a } : b }),
    blockedBetween: (a, b) => b.z < -3,
  });
  assert.equal(h.minion.activate(h.player, h.position, h.forward), true);
  for (let i = 0; i < 90; i++) step(h);
  assert.ok(h.minion.mesh.position.x < 0);
  assert.ok(h.minion.mesh.position.z >= -3);
  h.minion.reset();
  h.player.health = 50;
  h.player.stamina = h.player.hunger = 100;
  assert.equal(h.minion.activate(h.player, h.position, h.forward), true);
  assert.equal(h.player.dead, true);
  assert.equal(h.minion.mesh.visible, false);
  assert.equal(h.minion.presentation, null);
});

test("分裂期间只记住合法邻近珍兽，牵绳范围内保持追踪；远处不能直接锁定", () => {
  const h = setup(5),
    species = REGIONAL_RARES[0],
    prey = {
      species,
      mesh: createCreature(species.kind, species.length),
      hiddenFor: 0,
    };
  prey.mesh.position.set(0, -50, -14);
  h.minion.activate(h.player, h.position, h.forward);
  step(h, 0.1, [prey]);
  assert.equal(h.minion.snapshot().target, species.kind);
  assert.equal(h.meals, 0);
  prey.mesh.position.z = -42;
  step(h, 0.1, [prey]);
  assert.equal(h.minion.snapshot().target, species.kind);
  prey.mesh.position.z = -100;
  step(h, 0.3, [prey]);
  assert.equal(h.minion.snapshot().target, null);
  h.minion.reset();
  h.player.health = h.player.stamina = h.player.hunger = 100;
  h.minion.activate(h.player, h.position, h.forward);
  prey.mesh.position.z = -40;
  step(h, 0.1, [prey]);
  assert.equal(h.minion.snapshot().target, null);
  assert.equal(h.meals, 0);
});
