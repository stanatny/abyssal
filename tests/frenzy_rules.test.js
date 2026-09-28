import assert from "node:assert/strict";
import test from "node:test";
import { REWARDS } from "../src/reward_config.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";
import {
  SPECIES,
  canEat,
  collectPickup,
  consumePrey,
  createPlayer,
  tickVitals,
} from "../src/simulation.js";

function createAtLength(length) {
  const player = createPlayer();
  player.length = length;
  player.mass = (length / 6) ** 3;
  return player;
}

test("狂食只开启30秒吸食，重复拾取不改变体型或玩家收益", () => {
  assert.equal(REWARDS.frenzy.duration, 30);
  for (const characterId of ["orca", "squid"]) {
    const player = createPlayer(characterId);
    const before = structuredClone(player);
    for (let index = 0; index < 5; index += 1) collectPickup(player, "frenzy");
    before.buffs.frenzy = 30;
    assert.deepEqual(player, before);
    assert.equal(Object.hasOwn(player, "pendingGrowth"), false);
    assert.equal(Object.hasOwn(player.lastMeal, "storedGrowth"), false);
    tickVitals(player, 4);
    const beforeRefresh = structuredClone(player);
    collectPickup(player, "frenzy");
    beforeRefresh.buffs.frenzy = 30;
    assert.deepEqual(player, beforeRefresh);
  }
});

test("任何体型的狂食都不能解锁同长或更大的猎物，更不能吞掉领主", () => {
  for (const length of [3, 6, 24, 25, 30]) {
    const player = createAtLength(length);
    const ordinary = structuredClone(player);
    collectPickup(player, "frenzy");
    for (const preyLength of [0.8, 3, 6, 12, 24, 25, 30, 42]) {
      assert.equal(canEat(player, preyLength), preyLength < length);
      assert.equal(canEat(player, preyLength), canEat(ordinary, preyLength));
    }
    const before = structuredClone(player);
    assert.equal(consumePrey(player, { length, growth: 100 }), false);
    assert.equal(
      consumePrey(player, { length: length + 1, growth: 100 }),
      false,
    );
    assert.equal(consumePrey(player, BOSS_SPECIES[0]), false);
    assert.deepEqual(player, before);
  }
});

test("狂食前、中、后的普通进食保持同样的即时成长与治疗", () => {
  const prey = SPECIES.find((species) => species.kind === "fish");
  for (const health of [30, 97, 100]) {
    const ordinary = createPlayer();
    ordinary.health = health;
    ordinary.hunger = 10;
    const active = structuredClone(ordinary);
    const expired = structuredClone(ordinary);
    collectPickup(expired, "frenzy");
    for (const player of [ordinary, active, expired]) tickVitals(player, 30);
    collectPickup(active, "frenzy");
    const massBefore = ordinary.mass;
    for (const player of [ordinary, active, expired]) {
      assert.equal(consumePrey(player, prey), true);
      assert.ok(player.mass > massBefore);
      assert.ok(player.length > 3);
      assert.equal(Object.hasOwn(player, "pendingGrowth"), false);
      assert.equal(Object.hasOwn(player.lastMeal, "storedGrowth"), false);
    }
    const activeWithoutBuff = structuredClone(active);
    activeWithoutBuff.buffs.frenzy = 0;
    assert.deepEqual(activeWithoutBuff, ordinary);
    assert.deepEqual(expired, ordinary);
  }
});

test("狂食结束保留正常进食成果，继续等待不会自动增加体型", () => {
  const player = createPlayer();
  collectPickup(player, "frenzy");
  consumePrey(
    player,
    SPECIES.find((species) => species.kind === "fish"),
  );
  const mass = player.mass;
  const length = player.length;
  tickVitals(player, 29.9);
  assert.ok(player.buffs.frenzy > 0);
  assert.equal(player.mass, mass);
  assert.equal(player.length, length);
  tickVitals(player, 0.11);
  assert.equal(player.buffs.frenzy, 0);
  tickVitals(player, 10);
  assert.equal(player.mass, mass);
  assert.equal(player.length, length);
});

test("暂停不消耗吸食时长，结束远征不能刷新奖励，新局没有遗留状态", () => {
  const player = createPlayer();
  collectPickup(player, "frenzy");
  const before = structuredClone(player);
  tickVitals(player, 0);
  assert.deepEqual(player, before);
  for (const status of ["dead", "won", "timedOut"]) {
    const ended = structuredClone(player);
    ended[status] = true;
    const snapshot = structuredClone(ended);
    assert.equal(collectPickup(ended, "frenzy"), false);
    tickVitals(ended, 30);
    assert.deepEqual(ended, snapshot);
  }
  assert.equal(createPlayer().buffs.frenzy, 0);
});
