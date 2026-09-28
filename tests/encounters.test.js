import { t } from "../src/i18n.js";
import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createEncounters, findBossContact } from "../src/encounters.js";
import { createBossState } from "../src/boss_rules.js";
import { createPlayer, tickVitals } from "../src/simulation.js";

// 场景逻辑测试仅替换二维贴图绘制，不替换三维网格、状态机、弹体或接触判定。
const noop = () => {};
const context = new Proxy(
  {
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
  },
  { get: (target, key) => target[key] ?? noop },
);
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => context }),
};

function fixture(kind) {
  const scene = new THREE.Scene();
  const events = { hits: 0, bites: 0, warnings: [] };
  const encounters = createEncounters(scene, {
    seabedHeight: () => -900,
    audio: { hit: noop, eat: noop, bossAttack: noop },
    notify: (message) => events.warnings.push(t(message)),
    onDamage: () => events.hits++,
    onBite: () => events.bites++,
  });
  const entry = encounters.bosses.find(
    (boss) => boss.state.species.kind === kind,
  );
  for (const boss of encounters.bosses) boss.enabled = boss === entry;
  entry.state = createBossState(entry.state.species);
  entry.previousPhase = "dormant";
  entry.home.set(0, -400, 0);
  entry.mesh.position.copy(entry.home);
  entry.heading.set(0, 0, -1);
  entry.mesh.quaternion.identity();
  entry.disorientedUntil = 0;
  const player = createPlayer();
  const position = new THREE.Vector3(0, -400, -95);
  const forward = new THREE.Vector3(0, 0, -1);
  let time = 0;
  const step = (dt = 1 / 60, blockedBetween = () => false) => {
    time += dt;
    tickVitals(player, dt);
    return encounters.update(dt, time, player, position, forward, {
      blockedBetween,
    });
  };
  return {
    scene,
    encounters,
    entry,
    player,
    position,
    forward,
    events,
    step,
    get time() {
      return time;
    },
  };
}

for (const kind of ["kraken", "mayan", "hydra", "leviathan"]) {
  test(`${kind} 进入领地后的首轮技能可以命中停留玩家，锁定后变向能够躲开`, () => {
    const standing = fixture(kind);
    while (standing.time < 6 && !standing.events.hits) standing.step();
    assert.ok(standing.entry.state.attackCount > 0);
    assert.ok(
      standing.events.hits > 0,
      `${kind} did not hit a stationary target`,
    );
    assert.ok(standing.player.health < 100);
    assert.ok(
      standing.events.warnings.some((message) => message.includes("·")),
    );

    const dodging = fixture(kind);
    let evading = false;
    while (dodging.time < 6) {
      const state = dodging.entry.state;
      if (
        state.phase === "windup" &&
        state.timer >= state.phaseDuration - state.species.lockWindow
      )
        evading = true;
      if (evading) {
        if (kind === "mayan") dodging.position.y += 32 / 60;
        else dodging.position.x += 32 / 60;
      }
      dodging.step();
    }
    assert.equal(
      dodging.events.hits,
      0,
      `${kind} hit a target evading after lock`,
    );
    assert.equal(dodging.player.health, 100);
  });
}

test("已发招领主可被喷墨打断且停止移动整整10秒，离开后不会立刻重新追杀", () => {
  const f = fixture("hydra");
  while (f.entry.state.phase !== "windup") f.step();
  const until = f.time + 10;
  const frozen = f.entry.mesh.position.clone();
  assert.equal(f.encounters.disorient(f.position, 150, f.time), 1);
  assert.equal(f.entry.state.phase, "disoriented");
  f.position.x += 160;
  while (f.time + 1 / 60 < until) {
    f.step();
    assert.equal(f.entry.state.phase, "disoriented");
    assert.ok(f.entry.mesh.position.distanceTo(frozen) < 1e-9);
  }
  assert.equal(f.entry.state.attackCount, 0);
  assert.equal(f.events.hits, 0);
  f.step(0.05);
  assert.equal(f.entry.state.phase, "return");
  assert.equal(f.encounters.disorient(f.position, 500, f.time), 0);
});

test("领主在真实侧翼网格接触时只咬一次，离开实体后可以重新进入攻击", () => {
  const f = fixture("kraken");
  f.player.length = 30;
  f.player.mass = 125;
  f.entry.state.phase = f.entry.previousPhase = "recover";
  f.entry.state.phaseDuration = 99;
  f.forward.set(-1, 0, 0);
  let contactX = 0;
  for (let x = 40; x > 0; x -= 0.1) {
    if (findBossContact(f.entry.mesh, new THREE.Vector3(x, -400, 6.3), 1.8)) {
      contactX = x;
      break;
    }
  }
  assert.ok(contactX > 0);
  f.position.set(contactX + 30 * 0.38, -400, 6.3);
  f.step();
  assert.equal(f.events.bites, 1);
  assert.equal(f.entry.lastAttackSide, true);
  assert.equal(f.entry.lastBiteResult.hit, true);
  const health = f.entry.state.health;
  for (let i = 0; i < 100; i++) f.step();
  assert.equal(f.entry.state.health, health);
  assert.equal(f.entry.lastBiteResult.reason, "must_disengage");
  const attackPosition = f.position.clone();
  f.position.x += 40;
  for (let i = 0; i < 23; i++) f.step();
  assert.equal(f.entry.state.contactArmed, true);
  f.position.copy(attackPosition);
  f.step();
  assert.equal(f.events.bites, 2);
  assert.ok(f.entry.state.health < health);
});
