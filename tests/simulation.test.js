import assert from "node:assert/strict";
import test from "node:test";
import {
  SPECIES,
  canEat,
  collectPickup,
  consumePrey,
  createPlayer,
  getProgress,
  getZone,
  takeDamage,
  tickVitals,
} from "../src/simulation.js";

function approximately(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
}

test("冲刺消耗体力，耗尽后恢复到阈值才能再次冲刺", () => {
  const player = createPlayer();
  assert.equal(tickVitals(player, 2, { boosting: true }).boosting, true);
  assert.equal(player.stamina, 56);
  assert.equal(tickVitals(player, 3, { boosting: true }).boosting, false);
  assert.equal(player.stamina, 0);
  assert.equal(player.health, 100);
  assert.equal(player.exhausted, true);
  assert.equal(tickVitals(player, 1, { boosting: true }).boosting, false);
  assert.equal(player.stamina, 16);
  tickVitals(player, 1);
  assert.equal(player.exhausted, false);
  tickVitals(player, 20);
  assert.equal(player.stamina, 100);
});

test("大体型饥饿更快，饥饿耗尽后才按实际饥饿时间扣血", () => {
  const young = createPlayer();
  const large = createPlayer();
  large.length = 26;
  tickVitals(young, 10);
  tickVitals(large, 10);
  approximately(young.hunger, 93.5);
  approximately(large.hunger, 70);
  young.hunger = 0.65;
  tickVitals(young, 3);
  approximately(young.health, 86);
  assert.equal(young.hunger, 0);
});

test("攻击无敌避免连续接触伤害，期满后可再次受伤", () => {
  const player = createPlayer();
  assert.equal(takeDamage(player, 35), true);
  assert.equal(player.health, 65);
  assert.equal(takeDamage(player, 35), false);
  tickVitals(player, 1.49);
  assert.equal(takeDamage(player, 35), false);
  tickVitals(player, 0.02);
  assert.equal(takeDamage(player, 35), true);
  assert.equal(player.health, 30);
});

test("普通吞食只允许更小的鱼，狂食允许1.6倍并在10秒后失效", () => {
  const player = createPlayer();
  assert.equal(canEat(player, 5.9), true);
  assert.equal(canEat(player, 6), false);
  assert.equal(canEat(player, 8), false);
  collectPickup(player, "frenzy");
  assert.equal(canEat(player, 9.6), true);
  assert.equal(canEat(player, 9.61), false);
  tickVitals(player, 9.9);
  assert.equal(canEat(player, 8), true);
  tickVitals(player, 0.11);
  assert.equal(canEat(player, 8), false);
});

test("洋流奖励提供12秒免费冲刺，并正确计算跨越到期时间的一帧", () => {
  const player = createPlayer();
  collectPickup(player, "flow");
  tickVitals(player, 10, { boosting: true });
  assert.equal(player.stamina, 100);
  assert.equal(player.buffs.flow, 2);
  tickVitals(player, 3, { boosting: true });
  assert.equal(player.buffs.flow, 0);
  assert.equal(player.stamina, 78);
  player.stamina = 0;
  player.exhausted = true;
  collectPickup(player, "flow");
  assert.equal(tickVitals(player, 1, { boosting: true }).boosting, true);
});

test("同类奖励刷新而非叠加，体力奖励立即解除疲惫", () => {
  const player = createPlayer();
  player.stamina = 0;
  player.exhausted = true;
  assert.equal(collectPickup(player, "stamina"), true);
  assert.equal(player.stamina, 100);
  assert.equal(player.exhausted, false);
  collectPickup(player, "frenzy");
  tickVitals(player, 3);
  collectPickup(player, "frenzy");
  assert.equal(player.buffs.frenzy, 10);
  assert.equal(collectPickup(player, "unknown"), false);
});

test("吞食增长符合体积规律，过小猎物的营养与成长显著递减", () => {
  const prey = SPECIES.find((species) => species.kind === "fish");
  const young = createPlayer();
  const large = createPlayer();
  young.hunger = 0;
  large.hunger = 0;
  large.length = 24;
  large.mass = 64;
  assert.equal(consumePrey(young, prey), true);
  assert.equal(consumePrey(large, prey), true);
  assert.ok(large.hunger < young.hunger / 10);
  assert.ok(large.mass - 64 < (young.mass - 1) / 10);
  approximately(young.length, 6 * Math.cbrt(young.mass));
  assert.equal(young.eaten, 1);
});

test("无法吞食的猎物不会改变状态，极端输入不污染数值", () => {
  const player = createPlayer();
  const before = structuredClone(player);
  assert.equal(consumePrey(player, { length: 10 }), false);
  assert.equal(consumePrey(player, { length: NaN }), false);
  assert.equal(consumePrey(player, null), false);
  assert.equal(canEat(player, -1), false);
  assert.equal(takeDamage(player, Infinity), false);
  assert.equal(takeDamage(player, -20), false);
  tickVitals(player, -10);
  tickVitals(player, NaN);
  assert.deepEqual(player, before);
});

test("30米只完成成长，已击败主宰后到达30米才触发胜利", () => {
  const player = createPlayer();
  assert.equal(getProgress(player), 0);
  player.length = 29;
  player.mass = (29 / 6) ** 3;
  const prey = SPECIES.find((species) => species.kind === "dunkleosteus");
  assert.equal(consumePrey(player, prey), true);
  assert.equal(player.won, false);
  player.bossesDefeated = 1;
  consumePrey(player, prey);
  assert.equal(player.length, 30);
  assert.equal(player.mass, 125);
  assert.equal(player.won, true);
  assert.equal(getProgress(player), 100);
  assert.equal(takeDamage(player, 1000), false);
  tickVitals(player, 1000);
  assert.equal(player.dead, false);
});

test("致命攻击与饥饿均可死亡，死亡后不再进食或收集奖励", () => {
  const attacked = createPlayer();
  assert.equal(takeDamage(attacked, 200), true);
  assert.equal(attacked.dead, true);
  assert.equal(attacked.health, 0);
  assert.equal(consumePrey(attacked, { length: 2 }), false);
  assert.equal(collectPickup(attacked, "stamina"), false);
  const starved = createPlayer();
  starved.hunger = 0;
  starved.invulnerable = 100;
  tickVitals(starved, 15);
  assert.equal(starved.dead, true);
  assert.equal(starved.health, 0);
});

test("重伤进食优先回血，仍保留30%成长且照常恢复饱食", () => {
  const player = createPlayer();
  player.health = 30;
  player.hunger = 10;
  consumePrey(player, { length: 5, nutrition: 20, growth: 10 });
  assert.equal(player.health, 46);
  assert.equal(player.hunger, 30);
  approximately(player.mass, 4);
  approximately(player.lastMeal.healed, 16);
  approximately(player.lastMeal.growth, 3);
  approximately(player.lastMeal.nutrition, 20);
});

test("轻伤只扣实际治疗份额，满血进食获得完整成长", () => {
  const injured = createPlayer();
  const healthy = createPlayer();
  injured.health = 97;
  const prey = { length: 5, nutrition: 20, growth: 10 };
  consumePrey(injured, prey);
  consumePrey(healthy, prey);
  assert.equal(injured.health, 100);
  approximately(injured.mass, 1 + 10 * (1 - (3 / 16) * 0.7));
  approximately(healthy.mass, 11);
  assert.equal(injured.lastMeal.healed, 3);
  assert.equal(healthy.lastMeal.healed, 0);
});

test("深度边界与物种配置覆盖浅海至巨兽区", () => {
  assert.equal(getZone(0).id, "reef");
  assert.equal(getZone(90).id, "twilight");
  assert.equal(getZone(250).id, "abyss");
  assert.equal(getZone(500).id, "hadal");
  assert.equal(getZone(NaN).id, "reef");
  assert.equal(SPECIES.length, 7);
  for (const species of SPECIES) {
    assert.ok(species.depthMin < species.depthMax);
    assert.ok(species.depthMax <= 740);
    assert.ok(species.length > 0 && species.growth > 0);
  }
  const shark = SPECIES.find((species) => species.kind === "shark");
  assert.ok(shark.speed > 12 && shark.speed < 24);
});
