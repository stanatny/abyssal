import test from "node:test";
import assert from "node:assert/strict";
import { separateNurserySchools } from "../src/feeding_distribution.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import {
  applyNutrition,
  createPlayer,
  consumeDefeatedPrey,
  consumePrey,
  preyMealReward,
  PREY_REWARD_RULES,
} from "../src/simulation.js";
import {
  initialSchoolAnchor,
  schoolPopulationGroups,
} from "../src/ecosystem_population.js";

// 同一原始生态也必须保留持续补给；不能用全地图减食物掩盖早期成长过快。
test("八海域保持数量、各水层食物和领主阶段的大型猎物", () => {
  for (const [region, total] of Object.entries({
    hawaii: 516,
    atlantis: 560,
    bermuda: 467,
    mariana: 453,
    amazon: 409,
    europa: 352,
    penglai: 437,
    odyssey: 269,
  })) {
    const ss = getRegionSpecies(region);
    assert.equal(
      ss.reduce((n, s) => n + s.population, 0),
      total,
      region,
    );
    for (const l of [3, 6, 10, 16, 25]) {
      const food = ss.filter((s) => s.length < l && !s.elusive && !s.vehicle);
      assert.ok(
        food.some((s) => s.length >= Math.min(1, l * 0.3)),
        region + ":food" + l,
      );
    }
    assert.ok(
      ss.some((s) => s.length >= 12 && s.length < 25),
      region + ":battlefood",
    );
  }
});

test("育幼重复鱼群只分开同种重复中心，不改数量、水层、固定建筑或原始对象", () => {
  const base = {
    kind: "test_school",
    length: 2.2,
    population: 20,
    schoolSize: 5,
    worldBounds: { minX: -100, maxX: 100, minZ: -300, maxZ: 150 },
    schoolProfiles: [
      {
        anchor: [20, -28, 40],
        count: 5,
        nurseryResident: true,
        depthMin: 10,
        depthMax: 50,
      },
      {
        anchor: [20, -28, 40],
        count: 5,
        nurseryResident: true,
        depthMin: 10,
        depthMax: 50,
      },
      {
        anchor: [20, -28, 40],
        count: 5,
        nurseryResident: true,
        depthMin: 10,
        depthMax: 50,
      },
      {
        anchor: [20, -28, 40],
        count: 5,
        nurseryResident: true,
        fixedHabitat: true,
      },
    ],
  };
  const before = JSON.stringify(base),
    [s] = separateNurserySchools([base]);
  assert.equal(JSON.stringify(base), before);
  assert.equal(s.population, 20);
  assert.deepEqual(s.schoolProfiles[0], base.schoolProfiles[0]);
  assert.deepEqual(s.schoolProfiles[3], base.schoolProfiles[3]);
  assert.equal(
    new Set(s.schoolProfiles.slice(0, 3).map((p) => p.anchor.join(","))).size,
    3,
  );
  for (let i = 0; i < 3; i++) {
    const { anchor, ...a } = s.schoolProfiles[i],
      { anchor: old, ...b } = base.schoolProfiles[i];
    assert.deepEqual(a, b);
    assert.equal(anchor[1], old[1]);
    assert.ok(anchor[2] >= -120);
  }
  assert.ok(Object.isFrozen(s.schoolProfiles[1].anchor));
  assert.deepEqual(separateNurserySchools([s]), [s]);
});

test("木卫二和百慕大真实幼年鱼群中心不再重复", () => {
  for (const [region, kind] of [
    ["europa", "glass_seed"],
    ["europa", "ribbon_spore"],
    ["europa", "tripod_bloom"],
    ["bermuda", "sardine"],
  ]) {
    const s = getRegionSpecies(region).find((s) => s.kind === kind),
      groups = schoolPopulationGroups(s);
    const keys = groups.map((g) =>
      initialSchoolAnchor(s, g.index).toArray().join(","),
    );
    assert.equal(new Set(keys).size, keys.length, `${region}:${kind}`);
  }
});

test("大型空中猎手各自的初始栖地不重叠，地下城后方补给有固定巡游范围", () => {
  const s = getRegionSpecies("penglai").find((s) => s.kind === "gudiao");
  assert.equal(s.population, 18);
  assert.equal(
    new Set(s.spawnAnchors.map((a) => a.join(","))).size,
    s.population,
  );
  for (const kind of ["basilosaurus", "megalodon"]) {
    const s = getRegionSpecies("atlantis").find((s) => s.kind === kind);
    assert.equal(s.residentRadius, 65);
    assert.ok(s.spawnAnchors.length >= s.population);
  }
});

test("共享普通食物收益不包含机械鱼雷的越级成长限制", () => {
  const prey = { length: 32, nutrition: 98, growth: 3.7 };
  for (const length of [3, 6, 10, 15, 20, 25]) {
    const r = preyMealReward(length, prey);
    const stage = Math.max(0, Math.min(1, (length - 10) / 15));
    assert.ok(Math.abs(r.growth - prey.growth * (1 + 3 * stage)) < 1e-9);
    assert.ok(
      Math.abs(r.nutrition - prey.nutrition * (1 + 0.5 * stage)) < 1e-9,
    );
  }
});

test("只有机械鲨鱼的越级投射物击杀减少成长，回血与营养不减", () => {
  const prey = { length: 32, nutrition: 98, growth: 3.7 };
  for (const id of ["orca", "squid", "zombie_shark", "mechanical_shark"]) {
    for (const length of [3, 6, 10, 15, 20, 25]) {
      const player = createPlayer(id, length);
      player.health = 30;
      player.hunger = 0;
      const expected = structuredClone(player);
      const ordinary = structuredClone(player);
      const reward = preyMealReward(length, prey);
      applyNutrition(ordinary, reward);
      if (id === "mechanical_shark") {
        reward.growth *=
          Math.min(
            1,
            (length * PREY_REWARD_RULES.oversizeGraceRatio) / prey.length,
          ) ** PREY_REWARD_RULES.oversizeGrowthExponent;
      }
      applyNutrition(expected, reward);
      expected.eaten++;
      assert.equal(consumeDefeatedPrey(player, prey), true);
      assert.deepEqual(player, expected, `${id}:${length}`);
      assert.equal(player.health, ordinary.health);
      assert.equal(player.hunger, ordinary.hunger);
      assert.ok(player.lastMeal.growth > 0);
      if (id === "mechanical_shark") {
        assert.ok(player.lastMeal.growth < ordinary.lastMeal.growth);
      } else {
        assert.equal(player.lastMeal.growth, ordinary.lastMeal.growth);
      }
    }
  }
});

test("机械鲨鱼正常吞食及不超过1.25倍的鱼雷猎物保留完整成长", () => {
  for (const id of ["orca", "squid", "zombie_shark", "mechanical_shark"]) {
    const contact = createPlayer(id);
    const ranged = structuredClone(contact);
    const small = { length: 2.2, nutrition: 16, growth: 0.09 };
    assert.ok(consumePrey(contact, small));
    assert.ok(consumeDefeatedPrey(ranged, small));
    assert.deepEqual(contact, ranged);
  }
  for (const preyLength of [24.9, 25, 25.001]) {
    const player = createPlayer("mechanical_shark", 20);
    const expected = structuredClone(player);
    const prey = { length: preyLength, nutrition: 80, growth: 2 };
    applyNutrition(expected, preyMealReward(20, prey));
    assert.ok(consumeDefeatedPrey(player, prey));
    if (preyLength <= 25) assert.equal(player.mass, expected.mass);
    else {
      assert.ok(player.mass < expected.mass);
      assert.ok(expected.mass - player.mass < 0.001);
    }
  }
});

test("两次巨大鱼雷击杀仍有成长和完整治疗，但不会跳过幼年阶段", () => {
  const player = createPlayer("mechanical_shark");
  player.hunger = 0;
  for (let i = 0; i < 2; i++) {
    player.health -= 20;
    assert.ok(
      consumeDefeatedPrey(player, { length: 32, nutrition: 98, growth: 3.7 }),
    );
    assert.equal(player.health, 100);
    assert.ok(player.lastMeal.growth > 0);
  }
  assert.ok(player.length > 3 && player.length < 3.4);
  assert.equal(player.eaten, 2);
});
