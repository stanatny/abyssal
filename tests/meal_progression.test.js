import assert from "node:assert/strict";
import test from "node:test";
import { BOSS_SPECIES } from "../src/boss_rules.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import {
  applyNutrition,
  canEat,
  collectPickup,
  consumePrey,
  consumeDefeatedPrey,
  createPlayer,
  preyNutritionEfficiency,
  preyMealReward,
} from "../src/simulation.js";
import {
  activateSummon,
  consumeMinionPrey,
  createSummonState,
} from "../src/zombie_shark_rules.js";

const approximately = (a, b) =>
  assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const atLength = (length, id = "orca") => {
  const p = createPlayer(id);
  p.length = length;
  p.mass = (length / 6) ** 3;
  return p;
};

test("10米前和2米以下食物保持旧收益，不能靠成年加成在浅滩速刷", () => {
  for (const [length, size] of [
    [3, 0.8],
    [6, 4],
    [9.999, 6],
    [10, 6],
    [20, 0.8],
    [25, 2],
    [30, 1.9],
  ]) {
    const p = atLength(length),
      old = structuredClone(p),
      prey = { length: size, nutrition: 30, growth: 2 };
    p.health = old.health = 50;
    p.hunger = old.hunger = 0;
    applyNutrition(old, prey, preyNutritionEfficiency(length, prey));
    assert.equal(consumePrey(p, prey), true);
    for (const key of ["health", "hunger", "mass", "length"])
      approximately(p[key], old[key]);
  }
});

test("成长加成连续从10米到25米提高，6米以上猎物有明显中后期收益且封顶", () => {
  const prey = { length: 6, nutrition: 30, growth: 2 };
  for (const [length, growthFactor, nutritionFactor] of [
    [10, 1, 1],
    [15, 2, 7 / 6],
    [20, 3, 4 / 3],
    [25, 4, 1.5],
    [30, 4, 1.5],
  ]) {
    const r = preyMealReward(length, prey),
      efficiency = preyNutritionEfficiency(length, prey);
    approximately(r.growth, prey.growth * efficiency * growthFactor);
    approximately(r.nutrition, prey.nutrition * efficiency * nutritionFactor);
  }
  const before = preyMealReward(10 - 1e-5, prey),
    after = preyMealReward(10 + 1e-5, prey);
  assert.ok(Math.abs(after.growth - before.growth) < 1e-4);
  const below = preyMealReward(25 - 1e-5, prey),
    above = preyMealReward(25 + 1e-5, prey);
  assert.ok(Math.abs(above.growth - below.growth) < 1e-4);
  const intermediate = preyMealReward(20, { ...prey, length: 4 });
  approximately(
    intermediate.growth,
    2 * preyNutritionEfficiency(20, { length: 4 }) * 2,
  );
});

test("大型猎物提高实际回血与饱食，治疗仍优先且保留成长，满饱不会吞掉成长收益", () => {
  const p = atLength(25),
    prey = { length: 12, nutrition: 54, growth: 1.2 };
  p.health = 35;
  p.hunger = 0;
  assert.equal(consumePrey(p, prey), true);
  approximately(p.lastMeal.healed, 59.71968);
  approximately(p.lastMeal.nutrition, 74.6496);
  approximately(p.lastMeal.growth, 1.327104);
  const hungry = atLength(25),
    full = atLength(25);
  hungry.hunger = 0;
  consumePrey(hungry, prey);
  consumePrey(full, prey);
  approximately(hungry.mass, full.mass);
  assert.equal(full.hunger, 100);
});

test("四角色的接触、击杀与仆从结算使用同一收益，仆从体力按加成后有效营养计算一次", () => {
  const prey = { length: 8, nutrition: 30, growth: 2 };
  for (const id of ["orca", "squid", "zombie_shark", "mechanical_shark"]) {
    const contact = atLength(20, id),
      ranged = structuredClone(contact);
    contact.health = ranged.health = 40;
    contact.hunger = ranged.hunger = 0;
    assert.equal(consumePrey(contact, prey), true);
    assert.equal(consumeDefeatedPrey(ranged, prey), true);
    assert.deepEqual(contact, ranged);
  }
  const p = atLength(20, "zombie_shark"),
    s = createSummonState();
  assert.equal(activateSummon(s, p), true);
  p.stamina = 0;
  p.hunger = 100;
  const expected = preyMealReward(p.length, prey),
    direct = structuredClone(p);
  consumePrey(direct, prey);
  assert.equal(consumeMinionPrey(s, p, prey), true);
  for (const key of ["health", "hunger", "mass", "length", "eaten"])
    approximately(p[key], direct[key]);
  approximately(p.stamina, expected.nutrition);
  assert.equal(s.meals, 1);
});

test("成年加成不放宽捕食资格、30米上限、领主战利品或补给结算", () => {
  const p = atLength(25);
  assert.equal(canEat(p, 25), false);
  assert.equal(consumePrey(p, { length: 24, tier: 3 }), false);
  const old = structuredClone(p);
  assert.equal(
    consumePrey(p, { length: 26, nutrition: 100, growth: 30 }),
    false,
  );
  assert.deepEqual(p, old);
  const lord = BOSS_SPECIES[0];
  applyNutrition(p, lord);
  approximately(p.mass, old.mass + lord.growth);
  const pickup = atLength(20);
  pickup.health = pickup.hunger = pickup.stamina = 25;
  collectPickup(pickup, "stamina");
  assert.equal(pickup.health, 75);
  assert.equal(pickup.hunger, 75);
  assert.equal(pickup.stamina, 75);
  assert.equal(pickup.length, 20);
  const adult = atLength(29.9);
  consumePrey(adult, { length: 20, nutrition: 100, growth: 50 });
  assert.equal(adult.length, 30);
  assert.equal(adult.mass, 125);
  assert.equal(adult.won, false);
});

test("五海域真实目录的成年食物获得加成，小型生态和人口不因收益调整变化", () => {
  for (const region of ["hawaii", "atlantis", "bermuda", "mariana", "europa"]) {
    const species = getRegionSpecies(region),
      medium = species.filter(
        (s) => s.length >= 6 && s.length < 20 && !s.vehicle && s.tier !== 3,
      );
    assert.ok(medium.length >= 3, `${region}: missing medium food`);
    for (const prey of medium) {
      const p = atLength(20),
        old = structuredClone(p);
      applyNutrition(old, prey, preyNutritionEfficiency(20, prey));
      consumePrey(p, prey);
      approximately(p.lastMeal.growth, (old.mass - (20 / 6) ** 3) * 3);
    }
  }
});
