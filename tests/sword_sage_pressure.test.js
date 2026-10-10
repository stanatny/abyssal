import test from "node:test";
import assert from "node:assert/strict";
import {
  BOSS_SPECIES,
  steerBossPursuit,
  bossEngagement,
  bossRequiredHits,
  createBossState,
  hitBoss,
  hitBossWithTorpedo,
  tickBoss,
  updateBossContact,
} from "../src/boss_rules.js";
import { createPlayer } from "../src/simulation.js";
import { finishNextBossAttack } from "./helpers/boss_cycle.js";

const species = BOSS_SPECIES.find((s) => s.kind === "sword_sage");
const close = { inTerritory: true, distance: 40, lineOfSight: true };
const flank = { inRange: true, isFlank: true };

// 过期的收势不能储存到追猎/喷墨期间；失败也不能给营养或消耗可用破绽。
test("Sage counter expires with recovery, including an unused opening and ink interruption", () => {
  const player = createPlayer("mechanical_shark", 25);
  const boss = createBossState(species);
  finishNextBossAttack(boss);
  assert.equal(boss.phase, "recover");
  tickBoss(boss, boss.phaseDuration, close);
  assert.equal(boss.phase, "hunt");
  for (const phase of [
    "dormant",
    "hunt",
    "windup",
    "attack",
    "return",
    "disoriented",
  ]) {
    boss.phase = phase;
    const before = structuredClone({ player, boss });
    assert.equal(hitBoss(player, boss, flank).reason, "opening_closed");
    assert.equal(hitBossWithTorpedo(player, boss).reason, "opening_closed");
    assert.deepEqual({ player, boss }, before);
  }
});

test("Sage survives three real counters; five completed skills with mixed body/torpedo hits settle once", () => {
  const player = createPlayer("mechanical_shark", 25);
  player.hunger = 10;
  player.health = 40;
  const boss = createBossState(species);
  assert.equal(hitBoss(player, boss, flank).reason, "opening_closed");
  for (let i = 1; i <= 5; i++) {
    finishNextBossAttack(boss);
    player.biteCooldown = boss.biteCooldown = 0;
    updateBossContact(boss, false, 0.35);
    const hit =
      i % 2
        ? hitBoss(player, boss, { inRange: true })
        : hitBossWithTorpedo(player, boss);
    assert.equal(hit.hit, true);
    assert.equal(hit.damage, 70);
    assert.equal(boss.validatedHits, i);
    assert.equal(hit.defeated, i === 5);
    if (i < 5) {
      assert.equal(player.health, 40);
      assert.equal(player.bossesDefeated, 0);
      assert.equal(player.length, 25);
      assert.equal(boss.health, 350 - 70 * i);
      player.biteCooldown = boss.biteCooldown = 0;
      updateBossContact(boss, false, 0.35);
      assert.equal(hitBossWithTorpedo(player, boss).reason, "opening_spent");
    }
  }
  assert.equal(boss.attackCount, 5);
  assert.equal(player.bossesDefeated, 1);
  assert.equal(boss.health, 0);
  assert.equal(hitBossWithTorpedo(player, boss).hit, false);
  assert.equal(player.bossesDefeated, 1);
});

test("Remote unlock starts Sage pursuit without sight; other fifteen lords keep three-hit territorial rules", () => {
  const boss = createBossState(species);
  boss.locked = true;
  assert.equal(bossEngagement(boss, false), false);
  assert.equal(boss.pursuitStarted, false);
  boss.locked = false;
  assert.equal(bossEngagement(boss, false), true);
  tickBoss(boss, 0.5, { ...close, distance: 700, lineOfSight: false });
  assert.equal(boss.phase, "hunt");
  assert.equal(boss.timer, 0);
  tickBoss(boss, 0.8, close);
  assert.equal(boss.phase, "windup");
  assert.ok(boss.phaseDuration - species.lockWindow >= 1);
  boss.defeated = true;
  assert.equal(bossEngagement(boss, false), false);
  assert.equal(createBossState(species).pursuitStarted, false);
  for (const other of BOSS_SPECIES.filter((s) => s !== species)) {
    const territorial = createBossState(other);
    assert.equal(bossEngagement(territorial, false), false);
    assert.equal(bossRequiredHits(other), 3);
    assert.equal(other.counterPhases, undefined);
  }
});

test("Sage turns through a rear target within the angular limit, retaining vertical pursuit", () => {
  const heading = { x: 0, y: 0, z: -1 };
  const target = { x: 0, y: -0.6, z: 0.8 };
  const out = {};
  let previous = Math.atan2(heading.x, heading.z);
  for (let i = 0; i < 90; i++) {
    steerBossPursuit(heading, target, 1 / 60, 2.4, out);
    assert.ok(Math.abs(Math.hypot(out.x, out.y, out.z) - 1) < 1e-10);
    const yaw = Math.atan2(out.x, out.z);
    const delta = Math.atan2(
      Math.sin(yaw - previous),
      Math.cos(yaw - previous),
    );
    assert.ok(Math.abs(delta) <= 2.4 / 60 + 1e-10);
    assert.equal(out.y, target.y);
    Object.assign(heading, out);
    heading.y = 0; // 模型在每帧最后保持直立。
    previous = yaw;
  }
  assert.ok(out.z > 0.7999);
  assert.ok(Math.abs(out.x) < 1e-8);
});
