import assert from "node:assert/strict";
import test from "node:test";
import { BOSS_SPECIES, BOSS_BITE_HUNGER } from "../src/boss_rules.js";
import {
  SPECIES,
  ROUND_DURATION,
  PLAYER_MOVEMENT,
  applyNutrition,
  canEat,
  collectPickup,
  consumePrey,
  createPlayer,
  getProgress,
  getZone,
  hungerDrainRate,
  takeDamage,
  tickVitals,
} from "../src/simulation.js";

function approximately(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
}

function createAtLength(length) {
  const player = createPlayer();
  player.length = length;
  player.mass = (length / 6) ** 3;
  return player;
}

test("两个角色均从3米开始，首口小鱼之后才能解锁同为3米的猎物", () => {
  for (const id of ["orca", "squid"]) {
    const player = createPlayer(id);
    assert.equal(player.length, 3);
    approximately(player.mass, 0.125);
    assert.equal(getProgress(player), 0);
    assert.equal(canEat(player, 2.999), true);
    assert.equal(canEat(player, 3), false);
    for (const kind of ["fish", "anchovy", "sardine", "turtle"]) {
      assert.equal(
        canEat(player, SPECIES.find((entry) => entry.kind === kind).length),
        true,
      );
    }
    for (const kind of ["tuna", "sunfish", "hammerhead", "shark"]) {
      assert.equal(
        canEat(player, SPECIES.find((entry) => entry.kind === kind).length),
        false,
      );
    }
    const initial = structuredClone(player);
    assert.equal(
      consumePrey(
        player,
        SPECIES.find((entry) => entry.kind === "tuna"),
      ),
      false,
    );
    assert.deepEqual(player, initial);
    consumePrey(
      player,
      SPECIES.find((entry) => entry.kind === "fish"),
    );
    assert.equal(canEat(player, 3), true);
    assert.equal(canEat(player, 4), false);
    assert.equal(canEat(player, 6.4), false);
    player.length = (3 + 30) / 2;
    assert.equal(getProgress(player), 50);
    player.length = 30;
    assert.equal(getProgress(player), 100);
    player.length = 1;
    assert.equal(getProgress(player), 0);
  }
});

test("冲刺消耗体力，耗尽后恢复到阈值才能再次冲刺", () => {
  const player = createPlayer();
  assert.equal(tickVitals(player, 2, { boosting: true }).boosting, true);
  assert.equal(player.stamina, 72);
  assert.equal(tickVitals(player, 6, { boosting: true }).boosting, false);
  assert.equal(player.stamina, 0);
  assert.equal(player.health, 100);
  assert.equal(player.exhausted, true);
  assert.equal(tickVitals(player, 1, { boosting: true }).boosting, false);
  assert.equal(player.stamina, 19);
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
  approximately(young.hunger, 95.6);
  approximately(large.hunger, 82.4);
  young.hunger = 0.44;
  tickVitals(young, 3);
  approximately(young.health, 86);
  assert.equal(young.hunger, 0);
});

test("基础消耗翻倍，深水对幼年更苛刻且随成长连续缓解", () => {
  for (const [length, shallow, factor] of [
    [3, 0.44, 6],
    [6, 0.56, 5.1],
    [10, 0.8, 1.5 + (4.5 * 8) / 15],
    [16, 1.16, 1.5 + (4.5 * 2) / 15],
    [25, 1.7, 1.5],
    [30, 2, 1.5],
  ]) {
    approximately(hungerDrainRate(length, 0), shallow);
    approximately(hungerDrainRate(length, 45), shallow);
    approximately(
      hungerDrainRate(length, 272.5),
      shallow * (1 + (factor - 1) / 2),
    );
    approximately(hungerDrainRate(length, 500), shallow * factor);
    approximately(hungerDrainRate(length, 2780), shallow * factor);
    let previous = shallow;
    for (let depth = 0; depth <= 2780; depth++) {
      const rate = hungerDrainRate(length, depth);
      assert.ok(rate >= previous);
      previous = rate;
    }
    for (const boundary of [45, 500])
      assert.ok(
        Math.abs(
          hungerDrainRate(length, boundary + 0.001) -
            hungerDrainRate(length, boundary - 0.001),
        ) < 0.00003,
      );
  }
});

test("非法海深按浅滩处理，非法体长保留有限幼年消耗", () => {
  for (const depth of [-10, NaN, Infinity, -Infinity])
    approximately(hungerDrainRate(25, depth), 1.7);
  for (const length of [-10, 0, NaN, Infinity, -Infinity])
    approximately(hungerDrainRate(length, 18), 0.44);
});

test("两个幼年角色浅海两分钟仍有补给余地，深潜无食约52秒死亡，返浅立即降低压力", () => {
  for (const characterId of ["orca", "squid"]) {
    const shallow = createPlayer(characterId);
    tickVitals(shallow, 120, { depth: 18 });
    approximately(shallow.hunger, 47.2);
    assert.equal(shallow.health, 100);
    tickVitals(shallow, 10, { depth: 550 });
    approximately(shallow.hunger, 20.8);
    tickVitals(shallow, 10, { depth: 18 });
    approximately(shallow.hunger, 16.4);
    const deep = createPlayer(characterId);
    tickVitals(deep, 40, { depth: 550 });
    assert.ok(deep.health > 80 && deep.health < 90);
    assert.equal(deep.hunger, 0);
    tickVitals(deep, 13, { depth: 550 });
    assert.equal(deep.dead, true);
  }
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

test("狂食持续20秒，开始和结束都不改变只能吃小鱼的资格", () => {
  const player = createAtLength(6);
  assert.equal(canEat(player, 5.9), true);
  assert.equal(canEat(player, 6), false);
  assert.equal(canEat(player, 8), false);
  collectPickup(player, "frenzy");
  assert.equal(canEat(player, 5.9), true);
  assert.equal(canEat(player, 6), false);
  assert.equal(canEat(player, 8), false);
  tickVitals(player, 19.9);
  assert.ok(player.buffs.frenzy > 0);
  assert.equal(canEat(player, 8), false);
  tickVitals(player, 0.11);
  assert.equal(player.buffs.frenzy, 0);
  assert.equal(canEat(player, 5.9), true);
  assert.equal(canEat(player, 8), false);
});

test("洋流立即补满体力并提供30秒免费冲刺，到期后恢复消耗", () => {
  const player = createPlayer();
  player.health = 40;
  player.hunger = 60;
  player.stamina = 10;
  player.exhausted = true;
  collectPickup(player, "flow");
  assert.equal(player.stamina, 100);
  assert.equal(player.exhausted, false);
  assert.equal(player.health, 40);
  assert.equal(player.hunger, 60);
  tickVitals(player, 28, { boosting: true });
  assert.equal(player.stamina, 100);
  assert.equal(player.buffs.flow, 2);
  tickVitals(player, 3, { boosting: true });
  assert.equal(player.buffs.flow, 0);
  assert.equal(player.stamina, 86);
  player.stamina = 0;
  player.exhausted = true;
  collectPickup(player, "flow");
  assert.equal(player.stamina, 100);
  assert.equal(player.exhausted, false);
  assert.equal(player.buffs.flow, 30);
  assert.equal(tickVitals(player, 1, { boosting: true }).boosting, true);
});

test("同类奖励刷新而非叠加，生命补给恢复体力后立即解除疲惫", () => {
  const player = createPlayer();
  player.stamina = 0;
  player.exhausted = true;
  assert.equal(collectPickup(player, "stamina"), true);
  assert.equal(player.stamina, 50);
  assert.equal(player.exhausted, false);
  collectPickup(player, "frenzy");
  tickVitals(player, 3);
  collectPickup(player, "frenzy");
  assert.equal(player.buffs.frenzy, 20);
  assert.equal(collectPickup(player, "unknown"), false);
});

test("两种角色的生命补给各加50并独立封顶，不产生额外成长或改变限时技能", () => {
  for (const character of ["orca", "squid"]) {
    for (const [before, expected] of [
      [
        [1, 0, 10],
        [51, 50, 60],
      ],
      [
        [50, 65, 90],
        [100, 100, 100],
      ],
      [
        [100, 100, 100],
        [100, 100, 100],
      ],
    ]) {
      const player = createPlayer(character);
      [player.health, player.stamina, player.hunger] = before;
      player.buffs = { frenzy: 12, flow: 8 };
      const initial = structuredClone(player);
      assert.equal(collectPickup(player, "stamina"), true);
      assert.deepEqual(
        [player.health, player.stamina, player.hunger],
        expected,
      );
      assert.equal(player.length, initial.length);
      assert.equal(player.mass, initial.mass);
      assert.deepEqual(player.buffs, initial.buffs);
      assert.deepEqual(player.lastMeal, initial.lastMeal);
    }
  }
});

test("吞食增长符合体积规律，过小猎物的营养与成长显著递减", () => {
  const prey = SPECIES.find((species) => species.kind === "fish");
  const young = createPlayer();
  const large = createPlayer();
  young.hunger = 0;
  const youngMass = young.mass;
  large.hunger = 0;
  large.length = 24;
  large.mass = 64;
  assert.equal(consumePrey(young, prey), true);
  assert.equal(consumePrey(large, prey), true);
  assert.ok(large.hunger < young.hunger / 10);
  assert.ok(large.mass - 64 < (young.mass - youngMass) / 10);
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

test("30米只完成成长，体长与击败主宰两个条件同时达成才胜利", () => {
  const player = createPlayer();
  assert.equal(getProgress(player), 0);
  player.length = 29.8;
  player.mass = (29.8 / 6) ** 3;
  const prey = SPECIES.find((species) => species.kind === "megalodon");
  const withoutBoss = structuredClone(player);
  assert.equal(consumePrey(withoutBoss, prey), true);
  assert.equal(withoutBoss.length, 30);
  assert.equal(getProgress(withoutBoss), 100);
  assert.equal(withoutBoss.won, false);
  player.bossesDefeated = 1;
  assert.equal(consumePrey(player, prey), true);
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
  const player = createAtLength(6);
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
  const injured = createAtLength(6);
  const healthy = createAtLength(6);
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
  assert.equal(SPECIES.length, 26);
  assert.equal(new Set(SPECIES.map((species) => species.kind)).size, 26);
  assert.deepEqual(
    new Set(SPECIES.map((species) => species.category)),
    new Set(["shoal", "hunter", "ancient"]),
  );
  for (const species of SPECIES) {
    assert.ok(species.depthMin < species.depthMax);
    assert.ok(species.depthMax <= 740);
    assert.ok(species.length > 0 && species.growth > 0);
    assert.ok(species.nutrition > 0 && species.population > 0);
    assert.equal(!!species.extinct, species.category === "ancient");
  }
  assert.ok(
    SPECIES.some((species) => species.length < 1 && species.schoolSize > 1),
  );
  assert.ok(
    SPECIES.some(
      (species) => species.category === "hunter" && species.length >= 12,
    ),
  );
  assert.ok(
    SPECIES.some(
      (species) => species.category === "ancient" && species.length >= 20,
    ),
  );
  const shark = SPECIES.find((species) => species.kind === "shark");
  assert.ok(
    shark.speed > PLAYER_MOVEMENT.cruiseSpeed &&
      shark.speed < PLAYER_MOVEMENT.sprintSpeed,
  );
});

test("满体力可维持超过7秒冲刺，冲刺速度明显高于巡游", () => {
  const player = createPlayer();
  assert.ok(PLAYER_MOVEMENT.sprintSpeed > PLAYER_MOVEMENT.cruiseSpeed * 2.5);
  assert.equal(tickVitals(player, 7, { boosting: true }).boosting, true);
  approximately(player.stamina, 2);
  assert.equal(tickVitals(player, 0.15, { boosting: true }).boosting, false);
  tickVitals(player, 100 / PLAYER_MOVEMENT.staminaRecovery);
  assert.equal(player.stamina, 100);
  assert.equal(player.exhausted, false);
});

test("跨越30分钟边界只结算剩余时间，并独立结束远征而非胜利或死亡", () => {
  const player = createPlayer();
  player.elapsed = ROUND_DURATION - 0.5;
  player.buffs.frenzy = 10;
  assert.equal(tickVitals(player, 10, { boosting: true }).boosting, false);
  assert.equal(player.elapsed, 1800);
  assert.equal(player.timedOut, true);
  assert.equal(player.won, false);
  assert.equal(player.dead, false);
  approximately(player.stamina, 93);
  approximately(player.hunger, 99.78);
  approximately(player.buffs.frenzy, 9.5);

  const ended = structuredClone(player);
  tickVitals(player, 100);
  assert.equal(consumePrey(player, SPECIES[0]), false);
  assert.equal(applyNutrition(player, BOSS_SPECIES[0]), null);
  assert.equal(collectPickup(player, "flow"), false);
  assert.equal(takeDamage(player, 1000), false);
  assert.deepEqual(player, ended);
});

test("低帧率下物理步长截断不会将30分钟远征时钟拉长", () => {
  const player = createPlayer();
  // 模拟10FPS、物理仅走0.04秒，资源与活跃时间都必须走0.1秒。
  // 持续供食隔离饥饿死亡，让测试只观察时钟。
  for (let frame = 0; frame < ROUND_DURATION * 10; frame++) {
    player.hunger = 100;
    tickVitals(player, 0.04, { roundDt: 0.1 });
  }
  assert.equal(player.elapsed, ROUND_DURATION);
  assert.equal(player.timedOut, true);
  assert.equal(player.dead, false);
  assert.equal(player.won, false);
});

test("远征最后半帧按实际剩余份额扣资源并保留独立结束状态", () => {
  const player = createPlayer();
  player.elapsed = ROUND_DURATION - 0.02;
  player.buffs.frenzy = 10;
  tickVitals(player, 0.04, { roundDt: 0.1, boosting: true });
  assert.equal(player.elapsed, ROUND_DURATION);
  assert.equal(player.timedOut, true);
  approximately(player.stamina, 100 - 0.02 * PLAYER_MOVEMENT.staminaDrain);
  approximately(player.hunger, 100 - 0.02 * 0.44);
  approximately(player.buffs.frenzy, 10 - 0.02);
});

test("非法远征步长不推进状态，合法独立时钟不依赖资源步长", () => {
  for (const roundDt of [0, -1, NaN, Infinity, -Infinity]) {
    const player = createPlayer();
    const before = structuredClone(player);
    tickVitals(player, 0.04, { roundDt, boosting: true });
    assert.deepEqual(player, before);
  }
  for (const dt of [-1, NaN, Infinity, -Infinity]) {
    const player = createPlayer();
    tickVitals(player, dt, { roundDt: 0.1, boosting: true });
    approximately(player.elapsed, 0.1);
    assert.equal(player.stamina, 100);
    assert.equal(player.hunger, 100);
  }
  const defaultClock = createPlayer();
  tickVitals(defaultClock, 0.04);
  approximately(defaultClock.elapsed, 0.04);
});

test("胜利或死亡后不再累计时间，新远征清除到时状态", () => {
  for (const status of ["won", "dead"]) {
    const player = createPlayer();
    player.elapsed = 100;
    player[status] = true;
    const before = structuredClone(player);
    tickVitals(player, 30);
    assert.deepEqual(player, before);
  }
  const expired = createPlayer();
  expired.length = 30;
  expired.mass = 125;
  expired.elapsed = ROUND_DURATION - 1;
  tickVitals(expired, 2);
  assert.equal(expired.timedOut, true);
  assert.equal(expired.won, false);
  const fresh = createPlayer();
  assert.equal(fresh.elapsed, 0);
  assert.equal(fresh.timedOut, false);
});

test("25米深海无食会在约54秒死亡，大型食物仍可覆盖搜寻而小鱼不足", () => {
  const empty = createAtLength(25);
  tickVitals(empty, 55, { depth: 550 });
  assert.equal(empty.dead, true);
  const little = createAtLength(25);
  little.hunger = 20;
  const small = SPECIES.find((s) => s.kind === "fish");
  for (let i = 0; i < 12; i++) consumePrey(little, small);
  assert.ok(little.hunger < 20.4);
  tickVitals(little, 10, { depth: 550 });
  assert.equal(little.hunger, 0);
  const fed = createAtLength(25);
  fed.hunger = 0;
  consumePrey(
    fed,
    SPECIES.find((s) => s.kind === "megalodon"),
  );
  approximately(fed.hunger, 100);
  tickVitals(fed, 18, { depth: 550 });
  assert.ok(fed.hunger > 12);
  assert.equal(fed.health, 100);
});

test("深水慢帧不再延缓饥饿和奖励到期，生存按实际活跃时间结算", () => {
  const slow = createPlayer(),
    normal = createPlayer();
  slow.buffs.flow = normal.buffs.flow = 2;
  for (let i = 0; i < 400; i++) {
    tickVitals(slow, 0.04, { roundDt: 0.1, depth: 550, boosting: true });
    tickVitals(normal, 0.1, { depth: 550, boosting: true });
  }
  for (const property of ["hunger", "health", "stamina", "elapsed"])
    approximately(slow[property], normal[property]);
  assert.deepEqual(slow.buffs, normal.buffs);
});

test("幼年首口长约7厘米，首群12尾达到3.6至3.9米且还不能捕食锤头鲨", () => {
  const player = createPlayer();
  const reefFish = SPECIES.find((species) => species.kind === "fish");
  consumePrey(player, reefFish);
  approximately(player.length, 3.0703379681472294);
  for (let index = 1; index < 12; index++) consumePrey(player, reefFish);
  approximately(player.length, 3.7596665492525867);
  assert.ok(player.length >= 3.6 && player.length <= 3.9);
  assert.equal(canEat(player, 3), true);
  assert.equal(canEat(player, 4), false);
  assert.equal(
    canEat(player, SPECIES.find((species) => species.kind === "shark").length),
    false,
  );
  assert.equal(player.elapsed, 0);
});

test("满血连续捕食珊瑚鱼在第17、27、66尾分别超过4、4.5、6米", () => {
  const player = createPlayer();
  const reefFish = SPECIES.find((species) => species.kind === "fish");
  for (const [count, threshold, expected] of [
    [17, 4, 4.034823481028074],
    [27, 4.5, 4.53590850679719],
    [66, 6, 6.012604741525039],
  ]) {
    while (player.eaten < count - 1) consumePrey(player, reefFish);
    assert.ok(player.length < threshold);
    assert.equal(canEat(player, threshold), false);
    consumePrey(player, reefFish);
    approximately(player.length, expected);
    assert.equal(canEat(player, threshold), true);
  }
});

test("幼年成长抑制不影响营养与治疗，成年小鱼继续按原规则衰减", () => {
  const prey = SPECIES.find((species) => species.kind === "fish");
  const player = createPlayer();
  player.health = 50;
  player.hunger = 0;
  consumePrey(player, prey);
  approximately(player.health, 56.4);
  approximately(player.hunger, 8);
  approximately(player.lastMeal.growth, 0.018 * (3 / 6) * 0.3);
  for (const length of [6, 12, 24]) {
    const grown = createAtLength(length);
    grown.hunger = 0;
    const originalEfficiency = Math.max(
      Math.min(1, (prey.length / (length * 0.5)) ** 2),
      0.7 * (6 / length) ** 4,
    );
    consumePrey(grown, prey);
    approximately(grown.lastMeal.growth, prey.growth * originalEfficiency);
    approximately(grown.hunger, prey.nutrition * originalEfficiency);
  }
});

test("成长需要多个食物链阶段，连续捕食仍能升级而无等待时间锁", () => {
  const player = createPlayer();
  const visited = new Set();
  while (player.length < 30 && player.eaten < 200) {
    const prey = selectGrowthPrey(player);
    visited.add(prey.kind);
    assert.equal(consumePrey(player, prey), true);
  }
  assert.equal(player.length, 30);
  assert.ok(player.eaten >= 30 && player.eaten <= 50);
  assert.ok(visited.size >= 6);
  assert.ok(
    [...visited].some(
      (kind) =>
        SPECIES.find((species) => species.kind === kind).category === "hunter",
    ),
  );
  assert.ok(
    [...visited].some(
      (kind) =>
        SPECIES.find((species) => species.kind === kind).category === "ancient",
    ),
  );
  assert.equal(player.elapsed, 0);
  assert.equal(player.won, false);
});

test("补给意识明确的3米参考路线在快慢节奏下均可完成", (context) => {
  const quick = referenceExpedition(0.8);
  const normal = referenceExpedition(1);
  const completed = referenceExpedition(1.25);
  for (const { player, route } of [quick, normal, completed]) {
    assert.equal(player.won, true);
    assert.equal(player.dead, false);
    assert.equal(player.timedOut, false);
    assert.equal(player.bossesDefeated, 1);
    assert.ok(player.elapsed < ROUND_DURATION);
    const categories = new Set(route.map((entry) => entry.category));
    assert.ok(categories.has("hunter") && categories.has("ancient"));
  }
  assert.ok(quick.player.elapsed > 250 && quick.player.elapsed < 500);
  assert.ok(normal.player.elapsed < ROUND_DURATION);
  assert.ok(completed.player.elapsed < ROUND_DURATION);
  assert.ok(quick.player.elapsed < normal.player.elapsed);
  assert.ok(normal.player.elapsed < completed.player.elapsed);
  context.diagnostic(
    JSON.stringify(
      [quick, normal, completed].map(({ player, route }) => ({
        seconds: player.elapsed,
        meals: player.eaten,
        route: route.map((entry) => `${entry.kind}:${entry.count}`),
      })),
    ),
  );
});

test("显式6米起点仍可完成带中途补给的快慢参考路线", () => {
  for (const pace of [0.8, 1, 1.25]) {
    const { player } = referenceExpedition(pace, Infinity, 6);
    assert.equal(player.won, true);
    assert.equal(player.dead, false);
    assert.ok(player.elapsed < ROUND_DURATION);
  }
});

// 事件节奏模型，不代表真实导航试玩：有效捕食间隔已包含寻找与追逐；
// 另计两次转场及战损，25米后保守预留75秒完成三次有效侧咬击败克拉肯。
// 沿用金枪鱼7秒、蝠鲼12秒、白鲨10秒、鮟鱇11秒、章鱼13秒、邓氏鱼16秒；
// 相近猎手取10/16秒，龙王鲸与巨齿鲨按稀疏大猎物假设20秒。
// 每图仅两只的新巨型鱼龙假定60秒，属于保守模型输入而非实测遭遇率。
// 这些间隔没有模拟地图刷新与稀有领地，不能当作自然整局试玩时长。
// 快慢档统一缩放捕食、转场及领主战时间，战损与回血仍走真实生存规则。
// 捕食采用各物种水层内35%的代表深度，领主交战在世界深度550米；
// 深度消耗因此走真实规则，但不会把该假设当作实际航行或遇敌证据。
// 新规则要求战中补给；模型每25秒（按pace缩放）记一次有效咬击，前两段额外吃巨齿鲨。
// 这是显式可获得食物的假设，不是自然遇敌、领主命中或完整导航证据。
const REFERENCE_INTERVALS = Object.freeze({
  fish: 1,
  anchovy: 1,
  sardine: 1,
  herring: 1,
  mackerel: 1,
  flying_fish: 1,
  // 礁鱼按小群与较分散的驻点假设2/4/6秒；并非实测捕捉间隔。
  boxfish: 2,
  parrotfish: 4,
  wrasse: 6,
  turtle: 7,
  sunfish: 7,
  tuna: 7,
  ray: 12,
  angler: 11,
  hammerhead: 10,
  shark: 10,
  octopus: 13,
  sperm_whale: 16,
  dunkleosteus: 16,
  pliosaur: 16,
  plesiosaur: 16,
  mosasaur: 16,
  basilosaurus: 20,
  megalodon: 20,
  ichthyotitan: 60,
  archelon: 20,
});

// 使用实际进食收益选猎物，不依赖按类别排序的目录顺序；参考路线再按觅食间隔比较收益率。
function selectGrowthPrey(player, intervals = null) {
  return SPECIES.filter((species) => canEat(player, species.length))
    .map((species) => {
      const sampled = structuredClone(player);
      consumePrey(sampled, species);
      const interval = intervals ? intervals[species.kind] : 1;
      assert.ok(
        Number.isFinite(interval) && interval > 0,
        `Missing reference interval for ${species.kind}`,
      );
      return { species, score: (sampled.mass - player.mass) / interval };
    })
    .sort(
      (a, b) =>
        b.score - a.score || b.species.population - a.species.population,
    )[0]?.species;
}

function referenceExpedition(paceScale, stopAt = Infinity, startLength) {
  const player =
    startLength === undefined ? createPlayer() : createAtLength(startLength);
  const route = [];
  const report = { player, route };
  const transitions = new Set();
  let depth = 18;
  const advance = (seconds) => {
    tickVitals(player, Math.min(seconds * paceScale, stopAt - player.elapsed), {
      depth,
    });
    return player.elapsed < stopAt;
  };
  for (let index = 0; index < 12; index++) {
    if (!advance(1)) return report;
    consumePrey(
      player,
      SPECIES.find((species) => species.kind === "fish"),
    );
  }
  for (
    let meals = 0;
    meals < 500 && !player.won && !player.dead && !player.timedOut;
    meals++
  ) {
    if (player.length >= 25 && !player.bossesDefeated) {
      depth = 550;
      for (let bite = 0; bite < 3; bite++) {
        if (!advance(25)) return report;
        if (bite === 0) takeDamage(player, 40);
        player.hunger = Math.min(100, player.hunger + BOSS_BITE_HUNGER);
        if (bite < 2)
          consumePrey(
            player,
            SPECIES.find((s) => s.kind === "megalodon"),
          );
      }
      if (!player.dead && !player.timedOut) {
        player.bossesDefeated += 1;
        applyNutrition(player, BOSS_SPECIES[0]);
      }
      continue;
    }
    for (const [threshold, travelSeconds] of [
      [10, 20],
      [18, 30],
    ]) {
      if (player.length >= threshold && !transitions.has(threshold)) {
        transitions.add(threshold);
        if (
          player.hunger <
          hungerDrainRate(player.length, depth) * travelSeconds * paceScale + 20
        ) {
          const meal = selectGrowthPrey(player, REFERENCE_INTERVALS);
          consumePrey(player, meal);
        }
        if (!advance(travelSeconds)) return report;
        takeDamage(player, 28);
      }
    }
    const prey = selectGrowthPrey(player, REFERENCE_INTERVALS);
    depth = prey.depthMin + (prey.depthMax - prey.depthMin) * 0.35;
    if (!advance(REFERENCE_INTERVALS[prey.kind])) return report;
    if (consumePrey(player, prey)) {
      if (route.at(-1)?.kind !== prey.kind)
        route.push({ kind: prey.kind, category: prey.category, count: 0 });
      route.at(-1).count++;
    }
  }
  return report;
}
