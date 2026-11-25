import assert from "node:assert/strict";
import test from "node:test";
import {
  BOSS_SPECIES,
  bossRequiredHits,
  createBossState,
  hitBoss,
  hitBossWithTorpedo,
  hitBossWithCorpseBlast,
  tickBoss,
  updateBossContact,
} from "../src/boss_rules.js";
import { createPlayer } from "../src/simulation.js";
import { finishNextBossAttack } from "./helpers/boss_cycle.js";

const close = { inTerritory: true, distance: 0, lineOfSight: true };
const flank = { inRange: true, isFlank: true };
// 接触几何由场景负责；此规则夹具仅为专属弱点显式提供已确认的眼部命中。
function confirmedImpact(boss) {
  return boss.species.damageTarget === "eye" ? { weakpointHit: true } : {};
}

function reapproach(player, boss) {
  player.biteCooldown = boss.biteCooldown = 0;
  updateBossContact(boss, false, 0.35);
}

for (const species of BOSS_SPECIES) {
  test(`${species.kind}: 四角色每轮一次，不能脱离、等待冷却或混合鱼雷连续结算`, () => {
    for (const role of ["orca", "squid", "zombie_shark", "mechanical_shark"]) {
      const player = createPlayer(role, 25);
      const boss = createBossState(species);
      player.hunger = 30;
      // 普通领主首次允许侧背偷袭；限制收势的领主必须先完成技能。
      if (species.counterPhases) finishNextBossAttack(boss);
      const contact = { ...flank, ...confirmedImpact(boss) };
      assert.equal(hitBoss(player, boss, contact).hit, true);
      for (let i = 1; i <= bossRequiredHits(species); i++) {
        if (i > 1) {
          finishNextBossAttack(boss);
          assert.equal(boss.phase, "recover");
          assert.equal(
            boss.attackCount,
            i - 1 + (species.counterPhases ? 1 : 0),
          );
          reapproach(player, boss);
          assert.equal(hitBoss(player, boss, contact).hit, true);
        }
        if (i === bossRequiredHits(species)) break;
        reapproach(player, boss);
        const before = structuredClone({ player, boss });
        assert.equal(hitBoss(player, boss, contact).reason, "opening_spent");
        if (role === "mechanical_shark")
          assert.equal(
            hitBossWithTorpedo(player, boss, confirmedImpact(boss)).reason,
            "opening_spent",
          );
        if (role === "zombie_shark")
          assert.equal(
            hitBossWithCorpseBlast(player, boss, confirmedImpact(boss)).reason,
            "opening_spent",
          );
        assert.deepEqual({ player, boss }, before);
      }
      assert.equal(boss.health, 0);
      assert.equal(boss.validatedHits, bossRequiredHits(species));
      assert.equal(player.bossesDefeated, 1);
      assert.equal(hitBoss(player, boss, contact).reason, "boss_defeated");
    }
  });
}

const eyeAttacks = [
  ["orca", (p, b, impact) => hitBoss(p, b, { ...flank, ...impact })],
  ["mechanical_shark", hitBossWithTorpedo],
  ["zombie_shark", hitBossWithCorpseBlast],
];

test("独眼巨人的三种伤害通道默认拒绝无眼部证明或身体命中，既不消耗破绽也不产生伤害补给", () => {
  const species = BOSS_SPECIES.find((s) => s.kind === "polyphemus");
  assert.equal(species.damageTarget, "eye");
  assert.deepEqual(species.counterPhases, ["recover"]);
  for (const [role, hit] of eyeAttacks) {
    const player = createPlayer(role, 25),
      boss = createBossState(species);
    player.hunger = 30;
    finishNextBossAttack(boss);
    for (const impact of [undefined, {}, { weakpointHit: false }]) {
      const before = structuredClone({ player, boss }),
        result = hit(player, boss, impact);
      assert.equal(result.reason, "eye_required", role);
      assert.equal(result.hit, false);
      assert.equal(result.damage, 0);
      assert.equal(result.hungerRestored, 0);
      assert.equal(result.defeated, false);
      assert.deepEqual({ player, boss }, before);
    }
    assert.equal(hit(player, boss, { weakpointHit: true }).hit, true);
    assert.equal(boss.validatedHits, 1);
    assert.equal(boss.openingSpent, true);
  }
});

test("真实眼部命中证明不绕过独眼巨人的收势限制、25米门槛、护阵或玩家终局状态", () => {
  const species = BOSS_SPECIES.find((s) => s.kind === "polyphemus");
  for (const [role, hit] of eyeAttacks) {
    for (const phase of [
      "dormant",
      "hunt",
      "windup",
      "attack",
      "return",
      "disoriented",
    ]) {
      const player = createPlayer(role, 25),
        boss = createBossState(species);
      boss.phase = phase;
      const before = structuredClone({ player, boss }),
        result = hit(player, boss, { weakpointHit: true });
      assert.equal(result.reason, "opening_closed", `${role}/${phase}`);
      assert.deepEqual({ player, boss }, before);
    }
    for (const mode of ["too_small", "locked", "dead", "won", "timedOut"]) {
      const player = createPlayer(role, mode === "too_small" ? 24.99 : 25),
        boss = createBossState(species);
      finishNextBossAttack(boss);
      if (mode === "locked") boss.locked = true;
      else if (mode !== "too_small") player[mode] = true;
      const before = structuredClone({ player, boss }),
        result = hit(player, boss, { weakpointHit: true });
      assert.equal(result.hit, false, `${role}/${mode}`);
      assert.equal(result.damage, 0);
      assert.deepEqual({ player, boss }, before);
    }
  }
});

test("独眼巨人的咬击、鱼雷与尸爆共用三次真实收势破绽，身体命中不能刷新或代替眼部命中", () => {
  const species = BOSS_SPECIES.find((s) => s.kind === "polyphemus"),
    boss = createBossState(species),
    attackers = eyeAttacks.map(([role, hit]) => ({
      player: createPlayer(role, 25),
      hit,
    }));
  for (let cycle = 0; cycle < 3; cycle++) {
    finishNextBossAttack(boss);
    assert.equal(boss.attackCount, cycle + 1);
    const { player, hit } = attackers[cycle];
    reapproach(player, boss);
    assert.equal(hit(player, boss).reason, "eye_required");
    assert.equal(boss.validatedHits, cycle);
    assert.equal(boss.openingSpent, false);
    const result = hit(player, boss, { weakpointHit: true });
    assert.equal(result.hit, true);
    assert.equal(result.defeated, cycle === 2);
    assert.equal(boss.validatedHits, cycle + 1);
    if (result.defeated) break;
    for (const other of attackers) {
      reapproach(other.player, boss);
      const before = structuredClone({ player: other.player, boss });
      assert.equal(
        other.hit(other.player, boss, { weakpointHit: true }).reason,
        "opening_spent",
      );
      assert.deepEqual({ player: other.player, boss }, before);
    }
  }
  assert.equal(boss.health, 0);
  assert.equal(boss.defeated, true);
  assert.equal(
    attackers.reduce((total, { player }) => total + player.bossesDefeated, 0),
    1,
  );
});

test("破绽不会因喷墨、撤出回巢、重新进入或下一次技能开始而刷新", () => {
  const player = createPlayer("squid", 25);
  const boss = createBossState(BOSS_SPECIES[0]);
  assert.equal(hitBoss(player, boss, flank).hit, true);
  reapproach(player, boss);
  tickBoss(boss, 5, { ...close, disoriented: true });
  assert.equal(boss.openingSpent, true);
  assert.equal(hitBoss(player, boss, flank).reason, "opening_spent");
  tickBoss(boss, 4, { ...close, inTerritory: false });
  assert.equal(boss.phase, "dormant");
  assert.equal(boss.openingSpent, true);
  tickBoss(boss, 1, close);
  assert.equal(boss.phase, "windup");
  tickBoss(boss, boss.phaseDuration, close);
  assert.equal(boss.phase, "attack");
  assert.equal(hitBoss(player, boss, flank).reason, "opening_spent");
  tickBoss(boss, boss.phaseDuration - 0.01, close);
  assert.equal(boss.openingSpent, true);
  tickBoss(boss, 0.01, close);
  assert.equal(boss.phase, "recover");
  assert.equal(hitBoss(player, boss, { inRange: true }).hit, true);
  assert.equal(createBossState(boss.species).openingSpent, false);
});

test("鱼雷保留远程先手，和近身共用一次破绽，三轮混合攻击只结算一次击败", () => {
  const player = createPlayer("mechanical_shark", 25);
  const boss = createBossState(BOSS_SPECIES[0]);
  assert.equal(hitBossWithTorpedo(player, boss).hit, true);
  reapproach(player, boss);
  assert.equal(hitBoss(player, boss, flank).reason, "opening_spent");
  finishNextBossAttack(boss);
  reapproach(player, boss);
  assert.equal(hitBoss(player, boss, { inRange: true }).hit, true);
  reapproach(player, boss);
  assert.equal(hitBossWithTorpedo(player, boss).reason, "opening_spent");
  finishNextBossAttack(boss);
  reapproach(player, boss);
  assert.equal(hitBossWithTorpedo(player, boss).defeated, true);
  assert.equal(player.bossesDefeated, 1);
  assert.equal(hitBossWithTorpedo(player, boss).hit, false);
});
