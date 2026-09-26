import assert from "node:assert/strict";
import test from "node:test";
import {
  BOSS_SPECIES,
  createBossState,
  hitBoss,
  tickBoss,
} from "../src/boss_rules.js";
import {
  collectPickup,
  consumePrey,
  createPlayer,
  tickVitals,
} from "../src/simulation.js";
import { WORLD } from "../src/world_config.js";

const CLOSE = { inTerritory: true, distance: 40, lineOfSight: true };

function grownPlayer(length = 30) {
  const player = createPlayer();
  player.length = length;
  player.mass = (length / 6) ** 3;
  return player;
}

test("四位主宰均大于玩家上限，技能不同且栖息区在世界之内", () => {
  assert.equal(BOSS_SPECIES.length, 4);
  assert.equal(new Set(BOSS_SPECIES.map((s) => s.ability)).size, 4);
  for (const species of BOSS_SPECIES) {
    assert.equal(species.tier, 3);
    assert.ok(species.length > 30);
    assert.ok(species.depthMax <= WORLD.maxDepth);
    assert.ok(species.depthMin < species.depthMax);
    assert.ok(species.speed > 24);
    assert.ok(species.windupDuration >= 1.6 && species.windupDuration <= 2.5);
  }
});

test("只有领地内发现玩家才苏醒，接近前保持追猎", () => {
  const boss = createBossState(BOSS_SPECIES[0]);
  tickBoss(boss, 5, { ...CLOSE, inTerritory: false });
  assert.equal(boss.phase, "dormant");
  tickBoss(boss, 2, { ...CLOSE, lineOfSight: false });
  assert.equal(boss.phase, "dormant");
  tickBoss(boss, 2, { ...CLOSE, distance: 150 });
  assert.equal(boss.phase, "hunt");
  assert.equal(boss.timer, 0);
});

test("主宰完整经历蓄力预警、攻击和3秒虚弱，再开始下一轮", () => {
  const boss = createBossState(BOSS_SPECIES[0]);
  tickBoss(boss, 1, CLOSE);
  assert.equal(boss.phase, "windup");
  tickBoss(boss, 2, CLOSE);
  assert.equal(boss.phase, "windup");
  tickBoss(boss, 0.1, CLOSE);
  assert.equal(boss.phase, "attack");
  assert.equal(boss.attackCount, 1);
  tickBoss(boss, boss.species.attackDuration, CLOSE);
  assert.equal(boss.phase, "recover");
  assert.equal(boss.phaseDuration, 3);
  tickBoss(boss, 2.9, CLOSE);
  assert.equal(boss.phase, "recover");
  tickBoss(boss, 0.1, CLOSE);
  assert.equal(boss.phase, "hunt");
});

test("离开领地或死亡会终止攻击，回巢后保留已造成的伤害", () => {
  const boss = createBossState(BOSS_SPECIES[0]);
  boss.health = 100;
  tickBoss(boss, 3.2, CLOSE);
  assert.equal(boss.phase, "attack");
  tickBoss(boss, 1, { ...CLOSE, inTerritory: false });
  assert.equal(boss.phase, "return");
  tickBoss(boss, 3, { ...CLOSE, inTerritory: false });
  assert.equal(boss.phase, "dormant");
  assert.equal(boss.health, 100);
  tickBoss(boss, 2, CLOSE);
  tickBoss(boss, 4, { ...CLOSE, playerAlive: false });
  assert.equal(boss.phase, "dormant");
});

test("普通攻击门槛24米，狂食降至21米但不会允许直接吞噬主宰", () => {
  const boss = createBossState(BOSS_SPECIES[0]);
  const player = grownPlayer(23);
  assert.equal(hitBoss(player, boss).reason, "too_small");
  collectPickup(player, "frenzy");
  assert.equal(hitBoss(player, boss).hit, true);
  const tiny = grownPlayer(20.9);
  collectPickup(tiny, "frenzy");
  assert.equal(hitBoss(tiny, boss).reason, "too_small");
  const full = grownPlayer(30);
  collectPickup(full, "frenzy");
  const before = structuredClone(full);
  assert.equal(consumePrey(full, BOSS_SPECIES[0]), false);
  assert.deepEqual(full, before);
});

test("咬击检查距离，冷却为玩家全局1.2秒，不能交替主宰绕过", () => {
  const player = grownPlayer();
  const first = createBossState(BOSS_SPECIES[0]);
  const second = createBossState(BOSS_SPECIES[1]);
  assert.equal(
    hitBoss(player, first, { inRange: false }).reason,
    "out_of_range",
  );
  assert.equal(hitBoss(player, first).hit, true);
  assert.equal(hitBoss(player, first).reason, "cooldown");
  assert.equal(hitBoss(player, second).reason, "cooldown");
  tickVitals(player, 1.21);
  tickBoss(first, 1.21, CLOSE);
  assert.equal(hitBoss(player, first).hit, true);
});

test("虚弱期间咬击伤害显著增加，所有主宰均需至少五次攻击", () => {
  for (const species of BOSS_SPECIES) {
    const regularBoss = createBossState(species);
    const weakBoss = createBossState(species);
    weakBoss.phase = "recover";
    const regularHit = hitBoss(grownPlayer(), regularBoss);
    const weakHit = hitBoss(grownPlayer(), weakBoss);
    assert.ok(weakHit.damage > regularHit.damage * 1.7);
    assert.ok(weakHit.damage < species.health / 4);
    const player = grownPlayer();
    const boss = createBossState(species);
    let hits = 0;
    while (!boss.defeated && hits < 20) {
      boss.phase = "recover";
      assert.equal(hitBoss(player, boss).hit, true);
      hits += 1;
      tickVitals(player, 1.21);
      tickBoss(boss, 1.21, CLOSE);
    }
    assert.ok(hits >= 5 && hits < 20);
    assert.equal(player.bossesDefeated, 1);
    assert.equal(player.won, true);
  }
});

test("击败奖励只结算一次，24米先击败主宰后还需继续成长", () => {
  const player = grownPlayer(24);
  player.health = 20;
  player.hunger = 10;
  const boss = createBossState(BOSS_SPECIES[0]);
  while (!boss.defeated) {
    boss.phase = "recover";
    assert.equal(hitBoss(player, boss).hit, true);
    if (boss.defeated) break;
    tickVitals(player, 1.21);
    tickBoss(boss, 1.21, CLOSE);
  }
  assert.equal(player.bossesDefeated, 1);
  assert.ok(player.health > 90);
  assert.ok(player.lastMeal.healed > 70);
  assert.ok(player.length < 30);
  assert.equal(player.won, false);
  const before = structuredClone(player);
  assert.equal(hitBoss(player, boss).reason, "boss_defeated");
  assert.deepEqual(player, before);
  assert.equal(boss.phase, "defeated");
});
