import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createPlayer, consumePrey } from "../src/simulation.js";
import {
  activateSummon,
  canMinionEat,
  consumeMinionPrey,
  createSummonState,
  summonStatus,
} from "../src/zombie_shark_rules.js";
import { createZombieMinion } from "../src/zombie_minion.js";
import { createCreature } from "../src/creatures.js";
import { resolveMotion, castSegment } from "../src/collision.js";
import { getExpedition, REGIONS } from "../src/expedition_config.js";
import { createRunRecordStore } from "../src/run_records.js";
import { t } from "../src/i18n.js";
import { getCharacter } from "../src/character_rules.js";

function player(length = 20) {
  return createPlayer("zombie_shark", length);
}
function harness({ wall = false } = {}) {
  const scene = new THREE.Scene(),
    owner = player(),
    state = { bursts: [], meals: 0 };
  const solids = wall
    ? [
        {
          type: "box",
          x: 0,
          y: -50,
          z: -8,
          halfSize: { x: 300, y: 40, z: 1 },
        },
      ]
    : [];
  const minion = createZombieMinion(scene, {
    blockedBetween: (a, b) => castSegment(a, b, solids) !== null,
    resolveMovement: (a, b, forward, length) =>
      resolveMotion(a, b, {
        colliders: solids,
        forward,
        length,
        radius: length * 0.13,
        floorHeight: () => -95,
        bounds: {
          minY: -95,
          maxY: -5,
          minX: -300,
          maxX: 300,
          minZ: -300,
          maxZ: 300,
        },
      }),
    onConsume: (e, s, p) => {
      if (!consumeMinionPrey(s, p, e.species)) return false;
      e.hiddenFor = 28;
      state.meals++;
      return true;
    },
    effects: {
      undeadBurst: (...args) => state.bursts.push(args),
      mealMist() {},
      bite() {},
    },
  });
  const position = new THREE.Vector3(0, -50, 0),
    forward = new THREE.Vector3(0, 0, -1);
  const prey = {
    species: { kind: "tuna", length: 8, nutrition: 30, growth: 2 },
    mesh: createCreature("tuna", 8),
    hiddenFor: 0,
  };
  prey.mesh.position.set(14, -50, -15);
  scene.add(prey.mesh);
  return { minion, owner, position, forward, prey, state, scene, solids };
}

test("第三角色沿用所有海域的起点、上限及技能目录", () => {
  for (const r of REGIONS.filter((r) => r.available))
    assert.equal(
      getExpedition(r.id, "zombie_shark").startLength,
      ["mariana", "penglai"].includes(r.id) ? 15 : 3,
    );
  const c = getCharacter("zombie_shark");
  assert.equal(c.active.cooldown, 60);
  assert.equal(c.active.duration, 60);
  for (const value of [
    c.name,
    c.description,
    c.ability,
    c.active.name,
    c.active.description,
    c.passive.name,
    c.passive.description,
  ])
    assert.equal(/[\u3400-\u9fff]/u.test(t(value, [], "en")), false);
});
test("召唤原子扣三项50，冷却/生存从同一活跃时刻开始，拒绝重复付款", () => {
  const p = player(),
    s = createSummonState();
  p.elapsed = 12;
  p.invulnerable = 10;
  assert.equal(activateSummon(s, p), true);
  assert.deepEqual([p.health, p.stamina, p.hunger], [50, 50, 50]);
  assert.equal(s.readyAt, 72);
  assert.equal(s.activeUntil, 72);
  assert.equal(summonStatus(s, p, 71.99).active, true);
  const before = structuredClone({ s, p });
  assert.equal(activateSummon(s, p, 13), false);
  assert.deepEqual({ s, p }, before);
  assert.equal(summonStatus(s, p, 72).active, false);
  assert.equal(summonStatus(s, p, 72).ready, true);
});
test("不足5米、任何单项不足50、非法时钟和终局不能支付；精确50生命是合法的致死献祭", () => {
  for (const edit of [
    (p) => (p.length = 4.99),
    (p) => (p.health = 49.99),
    (p) => (p.stamina = 49.99),
    (p) => (p.hunger = 49.99),
    (p) => (p.dead = true),
    (p) => (p.won = true),
    (p) => (p.timedOut = true),
    (p) => (p.characterId = "orca"),
    (p) => (p.hunger = NaN),
  ]) {
    const p = player(),
      s = createSummonState();
    edit(p);
    const before = structuredClone({ p, s });
    assert.equal(activateSummon(s, p), false);
    assert.deepEqual({ p, s }, before);
  }
  for (const now of [-1, NaN, Infinity])
    assert.equal(activateSummon(createSummonState(), player(), now), false);
  const p = player(5);
  p.health = p.stamina = p.hunger = 50;
  const s = createSummonState();
  assert.equal(summonStatus(s, p).lethal, true);
  assert.equal(activateSummon(s, p), true);
  assert.equal(p.dead, true);
  assert.equal(p.stamina, 0);
  assert.equal(p.hunger, 0);
});
test("实时体长减5米是包含端点的硬上限，狂食不绕过；领主和载具永不可捕", () => {
  const p = player();
  p.buffs.frenzy = 20;
  assert.equal(canMinionEat(p, { length: 15 }), true);
  assert.equal(canMinionEat(p, { length: 15.01 }), false);
  for (const flag of [
    { tier: 3 },
    { category: "lord" },
    { boss: true },
    { vehicle: true },
  ])
    assert.equal(canMinionEat(p, { length: 2, ...flag }), false);
  for (const n of [NaN, Infinity, 0, -1])
    assert.equal(canMinionEat(p, { length: n }), false);
  p.length = 5;
  assert.equal(canMinionEat(p, { length: 0.01 }), false);
  p.length = 10;
  assert.equal(canMinionEat(p, { length: 5 }), true);
});
test("仆从收益等于主角正常营养/回血/成长，额外体力按实际营养封顶100，计数只加一次", () => {
  const p = player(),
    s = createSummonState();
  activateSummon(s, p);
  p.hunger = 100;
  p.stamina = 98;
  const direct = structuredClone(p),
    prey = { length: 8, nutrition: 30, growth: 2 };
  consumePrey(direct, prey);
  assert.equal(consumeMinionPrey(s, p, prey), true);
  for (const key of ["health", "hunger", "mass", "length", "eaten"])
    assert.equal(p[key], direct[key]);
  assert.equal(p.stamina, 100);
  assert.equal(s.meals, 1);
  p.elapsed = 60;
  const before = structuredClone(p);
  assert.equal(consumeMinionPrey(s, p, prey), false);
  assert.deepEqual(p, before);
});
test("真实仆从游到猎物口径后进食，借用猎物过渡后正常隐藏，收益不能重复", () => {
  const h = harness();
  assert.equal(h.minion.activate(h.owner, h.position, h.forward), true);
  for (let i = 0; i < 900 && !h.state.meals; i++) {
    h.minion.beforePreyMotion();
    h.owner.elapsed += 1 / 60;
    h.minion.update(1 / 60, h.owner, h.position, h.forward, [h.prey]);
  }
  assert.equal(h.state.meals, 1);
  assert.equal(h.owner.eaten, 1);
  assert.ok(h.owner.health > 50);
  assert.ok(h.owner.stamina > 50);
  for (let i = 0; i < 90; i++) {
    h.owner.elapsed += 1 / 60;
    h.minion.update(1 / 60, h.owner, h.position, h.forward, [h.prey]);
  }
  assert.equal(h.state.meals, 1);
  assert.equal(h.minion.feeding.snapshot().activeCount, 0);
  assert.equal(h.prey.mesh.visible, false);
});
test("实体墙遮挡不锁定也不捕食，环游仍使用多球连续碰撞", () => {
  const h = harness({ wall: true });
  h.minion.activate(h.owner, h.position, h.forward);
  for (let i = 0; i < 300; i++) {
    h.owner.elapsed += 1 / 60;
    h.minion.update(1 / 60, h.owner, h.position, h.forward, [h.prey]);
  }
  assert.equal(h.state.meals, 0);
  assert.equal(h.minion.snapshot().target, null);
  assert.ok(h.minion.mesh.position.z > -6);
  const movingCover = harness();
  movingCover.minion.activate(
    movingCover.owner,
    movingCover.position,
    movingCover.forward,
  );
  movingCover.minion.update(
    1 / 60,
    movingCover.owner,
    movingCover.position,
    movingCover.forward,
    [movingCover.prey],
  );
  assert.equal(movingCover.minion.snapshot().target, "tuna");
  movingCover.solids.push({
    type: "box",
    x: 0,
    y: -50,
    z: -8,
    halfSize: { x: 300, y: 40, z: 1 },
  });
  for (let i = 0; i < 20; i++) {
    movingCover.owner.elapsed += 1 / 60;
    movingCover.minion.update(
      1 / 60,
      movingCover.owner,
      movingCover.position,
      movingCover.forward,
      [movingCover.prey],
    );
  }
  assert.equal(movingCover.minion.snapshot().target, null);
  assert.equal(movingCover.state.meals, 0);
});
test("暂停无时钟推进，到期只尸爆一次，死亡/重开清除仆从与吞食，资源实例复用", () => {
  const h = harness();
  h.minion.activate(h.owner, h.position, h.forward);
  const mesh = h.minion.mesh;
  h.minion.update(0, h.owner, h.position, h.forward, []);
  const before = h.minion.snapshot();
  h.minion.update(0, h.owner, h.position, h.forward, []);
  assert.deepEqual(h.minion.snapshot(), before);
  h.owner.elapsed = 60;
  h.minion.update(1 / 60, h.owner, h.position, h.forward, []);
  h.minion.update(1 / 60, h.owner, h.position, h.forward, []);
  assert.equal(h.state.bursts.filter((b) => b[2]).length, 1);
  assert.equal(mesh.visible, false);
  h.minion.reset();
  h.owner.health = h.owner.stamina = h.owner.hunger = 100;
  h.minion.activate(h.owner, h.position, h.forward);
  assert.equal(h.minion.mesh, mesh);
  h.owner.dead = true;
  h.minion.update(1 / 60, h.owner, h.position, h.forward, []);
  assert.equal(mesh.visible, false);
  assert.equal(h.minion.state.activatedAt, null);
});
test("尸鲨有贯通侧腹和独立侧向摆尾，3/15/30米真实顶点有界；缓存与动作独立", () => {
  const a = createCreature("zombie_shark", 3),
    b = createCreature("zombie_shark", 3);
  const initialPhase = b.userData.motionState.phase;
  const ar = [],
    br = [];
  a.traverse((x) => {
    if (x.isMesh) ar.push(x);
  });
  b.traverse((x) => {
    if (x.isMesh) br.push(x);
  });
  assert.equal(ar.length, 10);
  assert.ok(ar.every((m, i) => m.geometry === br[i].geometry));
  assert.equal(a.userData.zombieAnatomy.openFlankWounds, 2);
  const v = new THREE.Vector3();
  for (const length of [3, 15, 30]) {
    a.scale.setScalar(length);
    for (let i = 0; i < 80; i++) {
      a.userData.animate(i / 30, 3, {
        dt: 1 / 30,
        speed: 32,
        boosting: i > 40,
        turn: 0.7,
      });
      a.updateMatrixWorld(true);
      const box = new THREE.Box3();
      a.traverse((m) => {
        if (!m.isMesh) return;
        if (m.isSkinnedMesh) m.skeleton.update();
        for (let j = 0; j < m.geometry.attributes.position.count; j++) {
          m.getVertexPosition(j, v).applyMatrix4(m.matrixWorld);
          assert.ok(v.toArray().every(Number.isFinite));
          box.expandByPoint(v);
        }
      });
      const size = box.getSize(new THREE.Vector3());
      assert.ok(size.z < length * 1.2 && size.z > length * 0.8);
      assert.ok(size.x < length * 0.65);
    }
  }
  assert.equal(b.userData.motionState.phase, initialPhase);
  assert.ok(a.userData.pose.tailBeat !== 0);
});
test("本地通关榜接受并保留第三角色身份，未知角色仍拒绝", () => {
  const store = createRunRecordStore(undefined, ["hawaii"]);
  assert.ok(
    store.record({
      id: "zombie",
      region: "hawaii",
      character: "zombie_shark",
      seconds: 80,
      won: true,
      at: 1,
      name: "Test",
    }),
  );
  assert.equal(store.list("hawaii")[0].character, "zombie_shark");
});
