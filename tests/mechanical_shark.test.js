import { finishNextBossAttack } from "./helpers/boss_cycle.js";
import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createPlayer,
  takeDamage,
  consumeDefeatedPrey,
  consumePrey,
  tickVitals,
} from "../src/simulation.js";
import {
  createBossState,
  hitBoss,
  hitBossWithTorpedo,
  BOSS_SPECIES,
} from "../src/boss_rules.js";
import {
  MECHANICAL_RULES as RULES,
  createTorpedoState,
  torpedoStatus,
  activateTorpedo,
  hitOrdinaryWithTorpedo,
} from "../src/mechanical_shark_rules.js";
import { createMechanicalTorpedoes } from "../src/mechanical_torpedoes.js";
import { createCreature } from "../src/creatures.js";
import { castSegment } from "../src/collision.js";
import { getCharacter, characterMovement } from "../src/character_rules.js";
import { REGIONS, getExpedition } from "../src/expedition_config.js";
import { registerHooks } from "node:module";
const hook = registerHooks({
  load(url, context, next) {
    if (url.endsWith(".css"))
      return { format: "module", source: "", shortCircuit: true };
    return next(url, context);
  },
});
const { buildOceanCatalog } = await import("../src/ocean_guide.js");
hook.deregister();
import { createRunRecordStore } from "../src/run_records.js";
import { t, setLanguage } from "../src/i18n.js";
const player = (length = 20) => createPlayer("mechanical_shark", length);
function creature(length = 5, z = -20) {
  const mesh = createCreature("tuna", length);
  mesh.position.set(0, -50, z);
  return {
    mesh,
    species: { kind: "tuna", length, nutrition: 30, growth: 2 },
    hiddenFor: 0,
    velocity: new THREE.Vector3(),
  };
}
function harness({ wall = false } = {}) {
  const p = player(),
    scene = new THREE.Scene(),
    prey = [creature()],
    shots = [],
    solids = wall
      ? [
          {
            type: "box",
            x: 0,
            y: -50,
            z: -10,
            halfSize: { x: 30, y: 30, z: 1 },
          },
        ]
      : [];
  const tube = createMechanicalTorpedoes(scene, {
    entities: () => prey,
    castWorld: (a, b, r) => castSegment(a, b, solids, r),
    onBlast: (e) => shots.push({ ...e, point: e.point.clone() }),
  });
  return {
    p,
    scene,
    prey,
    tube,
    shots,
    origin: new THREE.Vector3(0, -50, 0),
    direction: new THREE.Vector3(0, 0, -1),
  };
}
function step(h, n = 60) {
  for (let i = 0; i < n; i++) {
    h.tube.beforePreyMotion();
    h.p.elapsed += 1 / 60;
    h.tube.update(1 / 60, h.p);
  }
}

test("第四角色共享区域起点、成长与基本冲刺，菜单和图鉴文案完整双语", () => {
  setLanguage("en");
  const c = getCharacter("mechanical_shark");
  assert.equal(c.active.cooldown, RULES.cooldown);
  assert.equal(c.active.range, RULES.range);
  for (const r of REGIONS.filter((r) => r.available)) {
    assert.equal(
      getExpedition(r.id, c.id).startLength,
      ["mariana", "penglai"].includes(r.id) ? 15 : 3,
    );
    const entry = buildOceanCatalog(r.id).find((e) => e.characterId === c.id);
    assert.ok(entry);
    assert.match(t(entry.activeSkill.description, [], "en"), /immediately/);
    assert.match(t(entry.passiveSkill.description, [], "en"), /two-thirds/);
  }
  assert.equal(characterMovement(c.id, true).sprintSpeed, 32);
  assert.equal(characterMovement("orca", true).sprintSpeed / 32, 1.3);
  for (const text of [
    c.name,
    c.description,
    c.ability,
    c.active.description,
    c.passive.description,
  ])
    assert.equal(/[\u3400-\u9fff]/u.test(t(text, [], "en")), false);
});
test("钢铁之躯抵抗普通攻击和危害，固定献祭及饥饿不减免", () => {
  const p = player();
  assert.equal(takeDamage(p, 30), true);
  assert.equal(p.health, 80);
  assert.equal(takeDamage(p, 30), false);
  const s = createTorpedoState();
  assert.equal(activateTorpedo(s, p), true);
  assert.equal(p.health, 70);
  assert.equal(p.stamina, 90);
  p.invulnerable = 0;
  p.hunger = 0;
  const before = p.health;
  tickVitals(p, 1, false, 600);
  assert.equal(before - p.health, 7);
});
test("10点固定最大属性支付与2秒冷却原子结算，低血量不可自杀，失败不扣费", () => {
  const p = player(),
    s = createTorpedoState();
  p.elapsed = 3;
  p.health = 11;
  p.stamina = 10;
  assert.equal(activateTorpedo(s, p), true);
  assert.equal(p.health, 1);
  assert.equal(p.stamina, 0);
  assert.equal(s.readyAt, 5);
  assert.equal(s.shots, 1);
  const before = structuredClone({ p, s });
  assert.equal(activateTorpedo(s, p), false);
  assert.deepEqual({ p, s }, before);
  for (const mutate of [
    (p) => (p.health = 10),
    (p) => (p.stamina = 9.9),
    (p) => (p.health = NaN),
    (p) => (p.dead = true),
    (p) => (p.won = true),
    (p) => (p.timedOut = true),
    (p) => (p.characterId = "orca"),
    (p) => (p.elapsed = NaN),
  ]) {
    const p = player(),
      s = createTorpedoState();
    mutate(p);
    const frozen = structuredClone({ p, s });
    assert.equal(activateTorpedo(s, p), false);
    assert.deepEqual({ p, s }, frozen);
  }
  const q = player(),
    v = createTorpedoState();
  assert.equal(activateTorpedo(v, q, false), false);
  activateTorpedo(v, q);
  q.elapsed = 1.99;
  assert.equal(torpedoStatus(v, q).usable, false);
  q.elapsed = 2;
  assert.equal(torpedoStatus(v, q).usable, true);
});
test("射程末端自动爆炸且仅结算一次，资源池保持有界", () => {
  const h = harness();
  h.prey.length = 0;
  h.tube.activate(h.p, h.origin, h.direction);
  step(h, 125);
  assert.equal(h.shots.length, 1);
  assert.ok(Math.abs(h.shots[0].point.z + 140) < 1e-5);
  step(h, 120);
  assert.equal(h.shots.length, 1);
  assert.equal(h.tube.projectiles.length, 2);
});
test("爆炸成片击杀立即按共享营养结算，普通大猎物可被武器击杀，不能重复发放", () => {
  const h = harness();
  h.prey.push(creature(4, -21));
  h.tube.activate(h.p, h.origin, h.direction);
  const before = structuredClone(h.p),
    expected = structuredClone(h.p);
  h.prey.forEach((e) => consumeDefeatedPrey(expected, e.species));
  step(h, 40);
  assert.equal(h.shots[0].killed, 2);
  assert.equal(h.p.mass, expected.mass);
  assert.equal(h.p.health, expected.health);
  assert.equal(h.p.eaten, 2);
  assert.ok(h.prey.every((e) => e.hiddenFor > 0));
  step(h, 120);
  assert.equal(h.p.eaten, 2);
  const tooBig = creature(28);
  assert.equal(consumePrey(h.p, tooBig.species), false);
  assert.equal(consumeDefeatedPrey(h.p, tooBig.species), true);
});
test("相对体型相等或更大的生物需要两发，退休后不能重复命中", () => {
  for (const length of [20, 28]) {
    const e = creature(length),
      p = player();
    assert.equal(hitOrdinaryWithTorpedo(e, p), false);
    assert.equal(hitOrdinaryWithTorpedo(e, p), true);
    e.hiddenFor = 28;
    assert.equal(hitOrdinaryWithTorpedo(e, p), false);
    assert.equal(e.torpedoHits, 2);
  }
});
test("真实弹体两次爆炸击杀更大的普通猎物，首发无收益，第二发只结算一次", () => {
  const h = harness();
  h.prey[0] = creature(28, -35);
  assert.equal(consumePrey(h.p, h.prey[0].species), false);
  assert.equal(h.tube.activate(h.p, h.origin, h.direction), true);
  const initialMass = h.p.mass;
  step(h, 40);
  assert.equal(h.shots[0].killed, 0);
  assert.equal(h.prey[0].torpedoHits, 1);
  assert.equal(h.prey[0].hiddenFor, 0);
  assert.equal(h.p.mass, initialMass);
  assert.equal(h.p.eaten, 0);
  step(h, 120);
  assert.equal(h.tube.activate(h.p, h.origin, h.direction), true);
  const expected = structuredClone(h.p);
  consumeDefeatedPrey(expected, h.prey[0].species);
  step(h, 40);
  assert.equal(h.shots[1].killed, 1);
  assert.ok(h.prey[0].hiddenFor > 0);
  assert.equal(h.p.eaten, 1);
  for (const key of ["mass", "length", "health", "hunger"])
    assert.equal(h.p[key], expected[key]);
  step(h, 120);
  assert.equal(h.p.eaten, 1);
  h.tube.dispose();
});
test("实墙及海床阻挡发射与范围伤害，目标同时移动仍能被扫掠命中", () => {
  const h = harness({ wall: true });
  h.tube.activate(h.p, h.origin, h.direction);
  step(h, 40);
  assert.equal(h.shots.length, 1);
  assert.equal(h.shots[0].killed, 0);
  assert.equal(h.prey[0].torpedoHits || 0, 0);
  const m = harness();
  m.prey[0].mesh.position.set(5, -50, -1.75);
  m.tube.activate(m.p, m.origin, m.direction);
  m.tube.beforePreyMotion();
  m.prey[0].mesh.position.x = -5;
  m.p.elapsed = 0.05;
  m.tube.update(0.05, m.p);
  assert.equal(m.shots.length, 1);
  assert.equal(m.shots[0].killed, 1);
  const f = harness();
  f.prey.length = 0;
  f.tube.dispose();
  f.tube = createMechanicalTorpedoes(f.scene, { heightAt: () => -51 });
  f.tube.activate(f.p, f.origin, new THREE.Vector3(0, -1, 0));
  step(f, 3);
  assert.equal(f.tube.projectiles[0].active, false);
});
test("领主规则保留冷却和25米门槛，第三击只记一次击败", () => {
  const p = player(25),
    boss = createBossState(BOSS_SPECIES[0]);
  const s = createTorpedoState();
  for (let i = 0; i < 3; i++) {
    if (i) finishNextBossAttack(boss);
    p.elapsed = i * 5;
    assert.equal(activateTorpedo(s, p), true);
    p.biteCooldown = boss.biteCooldown = 0;
    const result = hitBossWithTorpedo(p, boss);
    assert.equal(result.hit, true);
    assert.equal(result.defeated, i === 2);
  }
  assert.equal(boss.validatedHits, 3);
  assert.equal(p.bossesDefeated, 1);
  assert.equal(hitBossWithTorpedo(p, boss).hit, false);
  const small = player(24.99),
    fresh = createBossState(BOSS_SPECIES[0]);
  assert.equal(hitBossWithTorpedo(small, fresh).hit, false);
  assert.equal(fresh.health, fresh.maxHealth);
  const b = createBossState(BOSS_SPECIES[0]);
  p.biteCooldown = 0;
  assert.equal(hitBoss(p, b, { inRange: true, isFlank: true }).hit, true);
  assert.equal(hitBossWithTorpedo(p, b).hit, false);
  p.biteCooldown = b.biteCooldown = 0;
  assert.equal(hitBossWithTorpedo(p, b).reason, "opening_spent");
  finishNextBossAttack(b);
  assert.equal(hitBossWithTorpedo(p, b).hit, true);
  assert.equal(b.validatedHits, 2);
});
test("暂停无推进，重开清理死亡、耐久、弹体与特效，dispose幂等", () => {
  const h = harness();
  h.tube.activate(h.p, h.origin, h.direction);
  step(h, 40);
  const frozen = JSON.stringify(h.tube.state);
  h.tube.update(0, h.p);
  assert.equal(JSON.stringify(h.tube.state), frozen);
  h.tube.reset();
  assert.equal(h.prey[0].torpedoHits, 0);
  assert.ok(h.tube.projectiles.every((p) => !p.active));
  assert.ok(h.tube.fx.events.every((e) => !e.active));
  h.tube.dispose();
  h.tube.dispose();
  assert.equal(h.scene.children.length, 0);
});
test("共享装甲资源但独立关节和尾焰，真实口部/发射口朝前且完整动作有变化", () => {
  const a = createCreature("mechanical_shark", 1),
    b = createCreature("mechanical_shark", 1);
  a.userData.animate(0);
  b.userData.animate(0);
  const bounds = new THREE.Box3();
  a.updateWorldMatrix(true, true);
  a.traverse((o) => {
    if (!o.isMesh || o.name === "thruster_plume") return;
    o.geometry.computeBoundingBox();
    bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
  });
  assert.ok(
    bounds.max.z - bounds.min.z > 0.96 && bounds.max.z - bounds.min.z < 1.04,
  );
  const am = [],
    bm = [];
  a.traverse((o) => {
    if (o.isMesh) am.push(o);
  });
  b.traverse((o) => {
    if (o.isMesh) bm.push(o);
  });
  assert.equal(am.length, bm.length);
  am.forEach((m, i) => {
    assert.equal(m.geometry, bm[i].geometry);
    for (const value of m.geometry.attributes.position.array)
      assert.ok(Number.isFinite(value));
  });
  assert.ok(a.userData.getFeedingMouth(new THREE.Vector3()).z < -0.39);
  assert.ok(a.userData.getTorpedoMuzzle(new THREE.Vector3()).z < -0.44);
  const tail = a.getObjectByName("tail_servo");
  let min = Infinity,
    max = -Infinity;
  for (let i = 0; i < 100; i++) {
    a.userData.animate(i / 60, 2.2, {
      dt: 1 / 60,
      speed: 32,
      boosting: true,
      turn: 0.3,
    });
    min = Math.min(min, tail.rotation.y);
    max = Math.max(max, tail.rotation.y);
  }
  assert.ok(max - min > 0.15);
  assert.equal(a.userData.pose.mechanical.plumes, 2);
  assert.equal(b.userData.pose.mechanical.plumes, 0);
  a.userData.resetMotion();
  assert.equal(a.userData.pose.mechanical.plumes, 0);
});
test("机械角色可记录本地成绩，实际身份不会降级成其他鱼", () => {
  const store = createRunRecordStore(undefined, ["hawaii"]);
  const row = store.record({
    region: "hawaii",
    character: "mechanical_shark",
    seconds: 10,
    id: "mech-test",
    won: true,
  });
  assert.equal(row?.character, "mechanical_shark");
});

test("耐久随本次相对体型变化，体型相等需要两发，成长后可一发击杀", () => {
  const e = creature(20),
    p = player();
  assert.equal(hitOrdinaryWithTorpedo(e, p), false);
  p.length = 20.01;
  assert.equal(hitOrdinaryWithTorpedo(e, p), true);
  for (const traits of [
    { tier: 3 },
    { category: "lord" },
    { boss: true },
    { vehicle: true },
  ])
    assert.equal(
      hitOrdinaryWithTorpedo(
        { ...creature(2), species: { length: 2, ...traits } },
        p,
      ),
      false,
    );
});
test("空池或无效朝向不支付、不触发冷却，清理后可以正常发射", () => {
  const h = harness();
  for (const q of h.tube.projectiles) q.active = true;
  const before = structuredClone(h.p);
  assert.equal(h.tube.activate(h.p, h.origin, h.direction), false);
  assert.deepEqual(h.p, before);
  h.tube.reset();
  assert.equal(h.tube.activate(h.p, h.origin, new THREE.Vector3()), false);
  assert.deepEqual(h.p, before);
  assert.equal(h.tube.activate(h.p, h.origin, h.direction), true);
});
