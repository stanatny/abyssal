import test from "node:test";
import assert from "node:assert/strict";
import {
  createPlayer,
  tickVitals,
  consumePrey,
  consumeDefeatedPrey,
  collectPickup,
  healthRecoveryStatus,
  HEALTH_RECOVERY_RULES,
} from "../src/simulation.js";
import {
  activateSummon,
  createSummonState,
  consumeMinionPrey,
} from "../src/zombie_shark_rules.js";
import { getRegionalRare } from "../src/regional_rare.js";
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const prey = { length: 5, nutrition: 20, growth: 0 };
function injured(character = "orca") {
  const p = createPlayer(character, 10);
  p.health = 30;
  p.hunger = 100;
  return p;
}

test("fed living players slowly recover across all four roles; empty hunger never heals", () => {
  for (const role of ["orca", "squid", "zombie_shark", "mechanical_shark"]) {
    const p = injured(role);
    tickVitals(p, 4);
    near(p.health, 32);
    assert.equal(healthRecoveryStatus(p).boosted, false);
    p.hunger = 0;
    tickVitals(p, 1);
    near(p.health, 25);
    assert.equal(healthRecoveryStatus(p).rate, 0);
  }
});
test("an ordinary meal never adds immediate health; its independent lifetime raises the active recovery rate then expires", () => {
  const p = injured();
  assert.equal(consumePrey(p, prey), true);
  assert.equal(p.health, 30);
  near(p.mealRecovery, 16);
  assert.equal(p.lastMeal.healed, 0);
  assert.equal(healthRecoveryStatus(p).rate, 2);
  tickVitals(p, 1);
  near(p.health, 32);
  near(p.mealRecovery, 14);
  tickVitals(p, 20);
  near(p.health, 52.5);
  assert.equal(p.mealRecovery, 0);
  assert.equal(healthRecoveryStatus(p).rate, 0.5);
});
test("repeated meals are capped at three independent layers without double-charging growth allocation", () => {
  const p = injured();
  for (let i = 0; i < 10; i++) consumePrey(p, prey);
  near(p.mealRecovery, 48);
  assert.equal(healthRecoveryStatus(p).stacks, 3);
  assert.equal(healthRecoveryStatus(p).rate, 6);
  assert.equal(p.health, 30);
  tickVitals(p, 40);
  near(p.health, 94);
  tickVitals(p, 12);
  assert.equal(p.health, 100);
  assert.equal(p.mealRecovery, 0);
  assert.equal(healthRecoveryStatus(p).rate, 0.5);
  const light = injured();
  light.health = 99;
  consumePrey(light, prey);
  assert.equal(healthRecoveryStatus(light).rate, 2);
  assert.equal(healthRecoveryStatus(light).stacks, 1);
  tickVitals(light, 1);
  assert.equal(light.health, 100);
  assert.equal(light.mealRecovery, 0);
});
test("pause/invalid resource time and terminal rounds cannot advance healing or recovery credit", () => {
  for (const state of [{}, { dead: true }, { won: true }, { timedOut: true }]) {
    const p = injured();
    consumePrey(p, prey);
    Object.assign(p, state);
    const before = structuredClone(p);
    tickVitals(p, 0);
    assert.deepEqual(p, before);
    tickVitals(p, NaN, { roundDt: 0 });
    assert.deepEqual(p, before);
    if (Object.keys(state).length) {
      tickVitals(p, 10);
      assert.deepEqual(p, before);
    }
  }
});
test("one long active step and split steps agree, including the fed-to-starving boundary and boost expiry", () => {
  const p = injured();
  p.hunger = 2.2;
  consumePrey(p, { length: 5, nutrition: 0, growth: 0 });
  p.mealRecovery = 4.8;
  p.recoveryMeals = [
    { duration: 2.5, remaining: 2.5 },
    { duration: 6, remaining: 6 },
  ];
  const split = structuredClone(p);
  tickVitals(p, 10);
  for (let i = 0; i < 100; i++) tickVitals(split, 0.1);
  near(p.health, split.health);
  near(p.hunger, split.hunger);
  near(p.mealRecovery, split.mealRecovery);
  assert.equal(p.dead, split.dead);
  const fed = injured();
  consumePrey(fed, prey);
  consumePrey(fed, { length: 5, nutrition: 10, growth: 0 });
  consumePrey(fed, { length: 5, nutrition: 6, growth: 0 });
  const fedSplit = structuredClone(fed);
  tickVitals(fed, 20);
  for (let i = 0; i < 200; i++) tickVitals(fedSplit, 0.1);
  near(fed.health, fedSplit.health);
  near(fed.mealRecovery, fedSplit.mealRecovery);
});
test("150-cap recovery and special supplies/blessings retain their finite limits and clear covered credit", () => {
  const p = injured();
  p.vitalCap = 150;
  p.health = 149;
  consumePrey(p, prey);
  tickVitals(p, 1);
  assert.equal(p.health, 150);
  assert.equal(p.mealRecovery, 0);
  p.health = 80;
  consumePrey(p, prey);
  collectPickup(p, "stamina");
  assert.equal(p.health, 130);
  assert.ok(p.mealRecovery <= 20);
  consumePrey(p, getRegionalRare("hawaii"));
  assert.equal(p.health, 150);
  assert.equal(p.mealRecovery, 0);
  assert.equal(p.lastMeal.rare, "golden_manta");
  const fresh = createPlayer();
  assert.equal(fresh.mealRecovery, 0);
});
test("mouth, confirmed torpedo and companion meals share delayed recovery, with no settlement on nonlethal hits", () => {
  const mouth = injured("mechanical_shark"),
    torpedo = structuredClone(mouth);
  consumePrey(mouth, prey);
  consumeDefeatedPrey(torpedo, prey);
  for (const key of ["health", "mealRecovery", "mass", "length", "hunger"])
    assert.equal(mouth[key], torpedo[key]);
  const owner = createPlayer("zombie_shark", 10),
    state = createSummonState();
  activateSummon(state, owner);
  const direct = structuredClone(owner);
  consumePrey(direct, prey);
  assert.equal(consumeMinionPrey(state, owner, prey), true);
  assert.equal(owner.health, 50);
  assert.equal(owner.mealRecovery, direct.mealRecovery);
  tickVitals(owner, 1);
  near(owner.health, 52);
});

test("three meals expire independently: rates fall from 6 to 4 to 2 to baseline without extending earlier layers", () => {
  const p = injured();
  consumePrey(p, { length: 5, nutrition: 20, growth: 0 }); // 8秒。
  tickVitals(p, 1);
  consumePrey(p, { length: 5, nutrition: 10, growth: 0 }); // 4秒。
  tickVitals(p, 1);
  consumePrey(p, { length: 5, nutrition: 6, growth: 0 }); // 最短2.5秒。
  assert.deepEqual(
    p.recoveryMeals.map((m) => m.remaining),
    [6, 3, 2.5],
  );
  assert.equal(healthRecoveryStatus(p).rate, 6);
  tickVitals(p, 2.5);
  assert.equal(healthRecoveryStatus(p).rate, 4);
  tickVitals(p, 0.5);
  assert.equal(healthRecoveryStatus(p).rate, 2);
  tickVitals(p, 3);
  assert.equal(healthRecoveryStatus(p).rate, 0.5);
  near(p.health, 59);
});

test("a fourth meal only replaces the earliest expiry, never extends the other two or shortens a stronger layer", () => {
  const p = injured();
  for (const nutrition of [25, 20, 10])
    consumePrey(p, { length: 5, nutrition, growth: 0 });
  tickVitals(p, 1);
  const before = structuredClone(p.recoveryMeals);
  consumePrey(p, { length: 5, nutrition: 1, growth: 0 });
  assert.deepEqual(p.recoveryMeals, before);
  assert.equal(p.lastMeal.recoveryAdded, false);
  assert.equal(p.lastMeal.recovery, 0);
  consumePrey(p, { length: 5, nutrition: 30, growth: 0 });
  assert.deepEqual(p.recoveryMeals.slice(0, 2), before.slice(0, 2));
  assert.deepEqual(p.recoveryMeals[2], { duration: 10, remaining: 10 });
  assert.equal(healthRecoveryStatus(p).rate, 6);
});

test("full health preserves finite meal effects, supplies clamp allocation, rare blessings and new rounds clear layers", () => {
  const p = createPlayer("orca", 10);
  consumePrey(p, prey);
  assert.equal(p.health, 100);
  assert.equal(p.mealRecovery, 0);
  assert.equal(healthRecoveryStatus(p).rate, 2);
  tickVitals(p, 2);
  assert.equal(p.health, 100);
  assert.equal(p.recoveryMeals[0].remaining, 6);
  p.health = 90;
  tickVitals(p, 1);
  assert.equal(p.health, 92);
  collectPickup(p, "stamina");
  assert.equal(p.health, 100);
  assert.equal(p.recoveryMeals.length, 1);
  consumePrey(p, getRegionalRare("hawaii"));
  assert.equal(p.recoveryMeals.length, 0);
  assert.equal(createPlayer().recoveryMeals.length, 0);
});

test("starvation and terminal state cannot heal, and each timer uses active time rather than movement or wall time", () => {
  const p = injured();
  consumePrey(p, prey);
  p.hunger = 0;
  tickVitals(p, 0.05, { roundDt: 3 });
  assert.equal(p.health, 9);
  assert.equal(p.recoveryMeals[0].remaining, 5);
  assert.equal(healthRecoveryStatus(p).rate, 0);
  const paused = structuredClone(p);
  tickVitals(p, 0, { roundDt: 0 });
  assert.deepEqual(p, paused);
});
