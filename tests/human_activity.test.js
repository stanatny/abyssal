import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createPlayer } from "../src/simulation.js";
import { bodyRadius, resolveMotion } from "../src/collision.js";
import { createHumanActivity } from "../src/human_activity.js";
import {
  HUMAN_RULES,
  consumeHuman,
  createSubmarineState,
  detonateTorpedo,
  stepSubmarineImpact,
} from "../src/human_rules.js";
import { HUMAN_CATALOG, createHumanModel } from "../src/vehicle_models.js";

function impact(state, now, extra = {}) {
  return stepSubmarineImpact(state, {
    touching: true,
    speed: 32,
    length: HUMAN_RULES.impactLength,
    now,
    ...extra,
  });
}

test("艇壳至少三次独立冲撞；贴壳、低速和体型不足不扣耐久", () => {
  const state = createSubmarineState();
  assert.equal(impact(state, 0, { length: 6 }).hit, false);
  assert.equal(state.health, 3);
  stepSubmarineImpact(state, { clear: true });
  assert.equal(impact(state, 1, { speed: 12 }).hit, false);
  stepSubmarineImpact(state, { clear: true });
  assert.equal(impact(state, 2).hit, true);
  assert.equal(state.health, 2);
  assert.equal(impact(state, 9).hit, false);
  stepSubmarineImpact(state, { clear: true });
  assert.equal(impact(state, 10).hit, true);
  stepSubmarineImpact(state, { clear: true });
  assert.deepEqual(impact(state, 12), {
    hit: true,
    destroyed: true,
    release: true,
  });
  assert.equal(impact(state, 20, { clear: true }).release, false);
  assert.equal(state.health, 0);
  assert.equal(createSubmarineState().armed, true);
});

test("离艇后过快重复碰撞也不计入有效冲撞", () => {
  const state = createSubmarineState();
  impact(state, 10);
  assert.equal(impact(state, 10.2, { clear: true }).hit, false);
  assert.equal(state.health, 2);
  assert.equal(impact(state, 11, { clear: true }).hit, true);
});

test("成年人沿用回血捕食；释放保护期与重复捕食不会绕过", () => {
  const player = createPlayer();
  player.health = 50;
  const entity = {
    alive: true,
    protectedUntil: 2,
    species: { length: 2.4, nutrition: 18, growth: 0.035 },
  };
  assert.equal(consumeHuman(player, entity, 1.9), false);
  assert.equal(consumeHuman(player, entity, 2), true);
  assert.ok(player.health > 50);
  assert.equal(player.eaten, 1);
  assert.equal(consumeHuman(player, entity, 3), false);
});

test("鱼雷爆炸一次并遵守受击无敌；重开新雷恢复可引爆", () => {
  const player = createPlayer(),
    hazard = { active: true };
  assert.deepEqual(detonateTorpedo(player, hazard, true), {
    exploded: true,
    damaged: true,
  });
  assert.equal(player.health, 72);
  assert.equal(detonateTorpedo(player, hazard, true).exploded, false);
  assert.deepEqual(detonateTorpedo(player, { active: true }, true), {
    exploded: true,
    damaged: false,
  });
  player.invulnerable = 0;
  assert.equal(detonateTorpedo(player, { active: true }, true).damaged, true);
});

test("真实扫掠在物理推开前计一次撞击，破艇移除碰撞并仅释放三个分散潜水员", () => {
  const scene = new THREE.Scene();
  const activity = createHumanActivity(scene, { random: () => 0.5 });
  const player = createPlayer();
  player.length = HUMAN_RULES.impactLength;
  const forward = new THREE.Vector3(1, 0, 0),
    sub = activity.submarines[0];
  const origin = sub.mesh.position.clone();
  const identities = new Map(
    activity.entities.map((entity) => [entity.id, entity.sex]),
  );
  const previous = origin.clone().add(new THREE.Vector3(-24, 0, 0));
  const desired = origin.clone().add(new THREE.Vector3(-3, 0, 0));
  const initialCount = activity.entities.filter(
    (entity) => entity.alive,
  ).length;
  const first = activity.onMovement(player, previous, desired, forward, {
    speed: 32,
    now: 1,
  });
  assert.equal(first.filter((entry) => entry.kind === "submarine").length, 1);
  const physics = resolveMotion(previous, desired, {
    colliders: activity.colliders,
    radius: bodyRadius(player.length),
    forward,
    length: player.length,
  });
  assert.equal(physics.blocked, true);
  const resolved = new THREE.Vector3().copy(physics.position);
  activity.onMovement(player, resolved, resolved, forward, {
    speed: 32,
    now: 5,
  });
  assert.equal(sub.state.health, 2);
  activity.onMovement(player, previous, desired, forward, {
    speed: 32,
    now: 6,
  });
  activity.onMovement(player, previous, desired, forward, {
    speed: 32,
    now: 8,
  });
  assert.equal(sub.state.destroyed, true);
  assert.equal(activity.colliders.includes(sub.collider), false);
  assert.equal(
    activity.entities.filter((entity) => entity.alive).length,
    initialCount + 3,
  );
  const released = activity.entities.filter(
    (entity) => entity.reserved && entity.alive,
  );
  assert.equal(released.length, 3);
  for (const diver of released) {
    assert.equal(diver.sex, identities.get(diver.id));
    assert.equal(diver.species.sex, diver.sex);
    assert.equal(diver.mesh.userData.sex, diver.sex);
    assert.ok(diver.mesh.position.distanceTo(origin) >= 16);
    assert.equal(diver.protectedUntil, 10);
  }
  activity.onMovement(player, previous, desired, forward, {
    speed: 32,
    now: 12,
  });
  assert.equal(
    activity.entities.filter((entity) => entity.alive).length,
    initialCount + 3,
  );
  const colliders = activity.colliders;
  activity.reset();
  assert.equal(activity.colliders, colliders);
  assert.equal(activity.colliders.length, HUMAN_RULES.submarineCount);
  assert.equal(
    activity.entities.filter((entity) => entity.alive).length,
    initialCount,
  );
  assert.equal(activity.submarines[0].state.health, 3);
  activity.dispose();
  assert.equal(scene.children.length, 0);
});

test("高速穿过鱼雷仍被扫掠捕获，销毁和重开不遗留雷体", () => {
  const scene = new THREE.Scene(),
    activity = createHumanActivity(scene);
  const player = createPlayer(),
    hazard = activity.hazards[0];
  const forward = new THREE.Vector3(1, 0, 0),
    origin = hazard.mesh.position.clone();
  activity.onMovement(
    player,
    origin.clone().add(new THREE.Vector3(-25, 0, 0)),
    origin.clone().add(new THREE.Vector3(25, 0, 0)),
    forward,
    { speed: 72, now: 1 },
  );
  assert.equal(player.health, 72);
  assert.equal(hazard.active, false);
  assert.equal(hazard.mesh.visible, false);
  assert.equal(hazard.warning.visible, false);
  activity.reset();
  assert.equal(hazard.active, true);
  assert.equal(hazard.mesh.visible, true);
  activity.dispose();
});

test("岩石先于鱼雷被命中时不引爆；近距离潜水员也不能隔墙捕食", () => {
  const worldColliders = [],
    activity = createHumanActivity(new THREE.Scene(), { worldColliders }),
    player = createPlayer(),
    forward = new THREE.Vector3(1, 0, 0),
    hazard = activity.hazards[0],
    origin = hazard.mesh.position.clone();
  // 此用例只验证遮挡边界，保留原六米躯干与潜水员的接触距离。
  player.length = 6;
  player.mass = 1;
  worldColliders.push({
    x: origin.x - 10,
    y: origin.y,
    z: origin.z,
    radius: 4,
  });
  activity.onMovement(
    player,
    origin.clone().add(new THREE.Vector3(-25, 0, 0)),
    origin.clone().add(new THREE.Vector3(25, 0, 0)),
    forward,
    { speed: 72, now: 1 },
  );
  assert.equal(hazard.active, true);
  assert.equal(player.health, 100);

  const diver = activity.entities.find((e) => e.kind === "diver" && e.alive);
  diver.mesh.position.set(0.9, -100, 0);
  diver.anchor.copy(diver.mesh.position);
  worldColliders.splice(0, 1, { x: 0, y: -100, z: 0, radius: 0.4 });
  const position = new THREE.Vector3(-1.4, -100, 0);
  forward.set(0, 0, -1);
  activity.update(0, 2, player, position, forward);
  assert.equal(diver.alive, true);
  assert.equal(player.eaten, 0);
  worldColliders.length = 0;
  activity.update(0, 2, player, position, forward);
  assert.equal(diver.alive, false);
  assert.equal(player.eaten, 1);
  activity.dispose();
});

test("模型种类辨识资源均可独立释放，重复dispose不双重释放", () => {
  for (const entry of HUMAN_CATALOG) {
    const model = createHumanModel(entry.kind, entry.length);
    assert.equal(model.userData.kind, entry.kind);
    model.userData.animate(2);
    const resources = new Set();
    model.traverse((node) => {
      if (node.geometry) resources.add(node.geometry);
      if (node.material) resources.add(node.material);
    });
    let disposed = 0;
    for (const resource of resources)
      resource.addEventListener("dispose", () => disposed++);
    model.userData.dispose();
    model.userData.dispose();
    assert.equal(disposed, resources.size);
  }
});

test("出生海面12名游泳者在前方且部分身体露水，共享水沫批次跟随活动", () => {
  const activity = createHumanActivity(new THREE.Scene());
  try {
    const swimmers = activity.entities.filter(
      (entity) => entity.kind === "swimmer",
    );
    assert.equal(swimmers.length, 12);
    for (const swimmer of swimmers) {
      swimmer.mesh.userData.animate(0.5);
      swimmer.mesh.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(swimmer.mesh);
      assert.ok(
        bounds.min.y < 4 && bounds.max.y > 4,
        "Swimming body must meet the surface",
      );
      assert.ok(swimmer.mesh.position.z < 75 && swimmer.mesh.position.z > -50);
      assert.ok(Math.abs(swimmer.mesh.position.x) <= 30);
    }
    assert.equal(activity.swimmerFoam.count, 24);
  } finally {
    activity.dispose();
  }
});

test("普通人延迟并避开玩家视野补位，潜艇释放者不会自动重刷，吞食过渡独占网格", () => {
  const swallowing = new Set();
  const activity = createHumanActivity(new THREE.Scene(), {
    isSwallowing: (mesh) => swallowing.has(mesh),
    onEat: (point, length, entity) => swallowing.add(entity.mesh),
  });
  const player = createPlayer();
  player.length = 6;
  const forward = new THREE.Vector3(0, 0, -1);
  try {
    const swimmer = activity.entities[0],
      point = swimmer.mesh.position.clone();
    activity.onMovement(player, point, point, forward, { now: 1 });
    assert.equal(swimmer.alive, false);
    assert.equal(swimmer.mesh.visible, true, "Transition owns visibility");
    const before = swimmer.mesh.position.clone();
    activity.update(1, 2, player, new THREE.Vector3(0, -50, -500), forward);
    assert.deepEqual(swimmer.mesh.position.toArray(), before.toArray());
    swallowing.delete(swimmer.mesh);
    swimmer.mesh.visible = false;
    activity.update(1, 50, player, new THREE.Vector3(0, -50, -500), forward);
    assert.equal(swimmer.alive, false);
    activity.update(1, 100, player, point, forward);
    assert.equal(swimmer.alive, false, "Nearby player must not see a respawn");
    activity.update(1, 101, player, new THREE.Vector3(0, -50, -500), forward);
    assert.equal(swimmer.alive, true);
    const reserved = activity.entities.find((entity) => entity.reserved);
    reserved.alive = false;
    reserved.respawnAt = 0;
    activity.update(1, 1000, player, new THREE.Vector3(0, -50, -500), forward);
    assert.equal(reserved.alive, false);
  } finally {
    activity.dispose();
  }
});

test("游泳组、潜水组和每艇释放组稳定交替男女，重开不改ID或性别", () => {
  const activity = createHumanActivity(new THREE.Scene());
  try {
    assert.equal(HUMAN_CATALOG.length, 4);
    const groups = [
      activity.entities.filter((entity) => entity.kind === "swimmer"),
      activity.entities.filter(
        (entity) => entity.kind === "diver" && !entity.reserved,
      ),
    ];
    const reserved = activity.entities.filter((entity) => entity.reserved);
    for (
      let index = 0;
      index < reserved.length;
      index += HUMAN_RULES.releaseCount
    )
      groups.push(reserved.slice(index, index + HUMAN_RULES.releaseCount));
    for (const group of groups)
      group.forEach((entity, index) => {
        assert.equal(entity.sex, index % 2 ? "female" : "male");
        assert.equal(entity.species.sex, entity.sex);
        assert.equal(entity.mesh.userData.sex, entity.sex);
      });
    const snapshot = () =>
      activity.entities.map((entity) => [
        entity.id,
        entity.sex,
        entity.species.sex,
        entity.mesh.userData.sex,
        entity.species.length,
        entity.species.nutrition,
        entity.species.growth,
      ]);
    const before = snapshot();
    for (let repeat = 0; repeat < 3; repeat++) {
      activity.reset();
      assert.deepEqual(snapshot(), before);
    }
  } finally {
    activity.dispose();
  }
});

test("男女游泳者与潜水员结算传递同源性别，普通复活继续保留原身份", () => {
  const calls = [];
  const activity = createHumanActivity(new THREE.Scene(), {
    audio: { eatHuman: (...args) => calls.push(args) },
  });
  const player = createPlayer();
  player.length = 6;
  const forward = new THREE.Vector3(0, 0, -1);
  try {
    for (const kind of ["swimmer", "diver"])
      for (const sex of ["male", "female"]) {
        const entity = activity.entities.find(
          (candidate) =>
            candidate.kind === kind &&
            candidate.sex === sex &&
            !candidate.reserved,
        );
        const beforeId = entity.id;
        entity.mesh.position.set(300, -100, 400);
        entity.anchor.copy(entity.mesh.position);
        const now = 1 + calls.length;
        activity.onMovement(
          player,
          entity.mesh.position.clone(),
          entity.mesh.position.clone(),
          forward,
          { now },
        );
        assert.equal(entity.alive, false);
        assert.deepEqual(calls.at(-1), [entity.species.length, sex]);
        activity.update(
          0,
          now + 100,
          player,
          new THREE.Vector3(0, -100, -1000),
          forward,
        );
        assert.equal(entity.alive, true);
        assert.equal(entity.id, beforeId);
        assert.equal(entity.sex, sex);
        assert.equal(entity.species.sex, sex);
        assert.equal(entity.mesh.userData.sex, sex);
      }
    assert.equal(calls.length, 4);
  } finally {
    activity.dispose();
  }
});
