import assert from "node:assert/strict";
import test from "node:test";
import {
  BOSS_SPECIES,
  bossRequiredHits,
  createBossState,
  hitBoss,
  hitBossWithTorpedo,
  tickBoss,
  updateBossContact,
} from "../src/boss_rules.js";
import { createPlayer } from "../src/simulation.js";
import { finishNextBossAttack } from "./helpers/boss_cycle.js";

const close = { inTerritory: true, distance: 0, lineOfSight: true };
const flank = { inRange: true, isFlank: true };
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
      // 普通领主首次允许侧背偷袭；真君必须先完成技能才暴露收势破绽。
      if (species.counterPhases) finishNextBossAttack(boss);
      assert.equal(hitBoss(player, boss, flank).hit, true);
      for (let i = 1; i <= bossRequiredHits(species); i++) {
        if (i > 1) {
          finishNextBossAttack(boss);
          assert.equal(boss.phase, "recover");
          assert.equal(
            boss.attackCount,
            i - 1 + (species.counterPhases ? 1 : 0),
          );
          reapproach(player, boss);
          assert.equal(hitBoss(player, boss, { inRange: true }).hit, true);
        }
        if (i === bossRequiredHits(species)) break;
        reapproach(player, boss);
        const before = structuredClone({ player, boss });
        assert.equal(hitBoss(player, boss, flank).reason, "opening_spent");
        if (role === "mechanical_shark")
          assert.equal(
            hitBossWithTorpedo(player, boss).reason,
            "opening_spent",
          );
        assert.deepEqual({ player, boss }, before);
      }
      assert.equal(boss.health, 0);
      assert.equal(boss.validatedHits, bossRequiredHits(species));
      assert.equal(player.bossesDefeated, 1);
      assert.equal(hitBoss(player, boss, flank).reason, "boss_defeated");
    }
  });
}

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
