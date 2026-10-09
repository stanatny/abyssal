import test from "node:test";
import assert from "node:assert/strict";
import { disperseLargePrey } from "../src/large_prey_distribution.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import {
  schoolPopulationGroups,
  initialSchoolAnchor,
} from "../src/ecosystem_population.js";
import {
  createPlayer,
  preyMealReward,
  consumeDefeatedPrey,
  collectPickup,
  canEat,
} from "../src/simulation.js";
import { EUROPA_SPECIES } from "../src/europa_species.js";
import { WORLD } from "../src/world_config.js";
test("大型食物群改为独立栖地，每一个原深度补给点保留，收益不变且不会修改输入", () => {
  const source = {
    kind: "test_giant",
    length: 18,
    population: 12,
    schoolSize: 6,
    depthMin: 250,
    depthMax: 700,
    nutrition: 80,
    growth: 1.4,
    schoolProfiles: [
      { count: 6, anchor: [-70, -400, -500], depthMin: 380, depthMax: 420 },
      { count: 6, anchor: [80, -600, -720], depthMin: 580, depthMax: 620 },
    ],
  };
  const before = JSON.stringify(source),
    s = disperseLargePrey([source])[0];
  assert.equal(s.population, 9);
  assert.equal(s.schoolSize, 1);
  assert.ok(s.independentMovement);
  assert.ok(s.residentRadius <= 30);
  assert.equal(s.schoolProfiles, undefined);
  assert.deepEqual(
    s.spawnAnchors.slice(0, 2),
    source.schoolProfiles.map((p) => p.anchor),
  );
  assert.equal(s.nutrition, 80);
  assert.equal(s.growth, 1.4);
  assert.equal(JSON.stringify(source), before);
  assert.ok(Object.isFrozen(s.spawnAnchors[0]));
});
test("幼年食物、室内补给、地面及飞行生态和25米以上天敌不被大型水生密度调整删减", () => {
  for (const fixture of [
    { length: 3 },
    {
      length: 20,
      schoolProfiles: [
        { count: 5, anchor: [0, -500, -600], fixedHabitat: true },
      ],
    },
    { length: 20, groundbound: true },
    { length: 20, flying: true },
    { length: 29, predator: true },
    { length: 20, vehicle: true },
  ]) {
    const s = { kind: "fixture", population: 5, schoolSize: 1, ...fixture };
    assert.equal(disperseLargePrey([s])[0], s);
  }
});
test("木卫二各大型食物层保持覆盖，实际独居库存降低而单只中后期补给和成长完全保留", () => {
  const species = getRegionSpecies("europa");
  for (const kind of [
    "crown_filterer",
    "bell_carrier",
    "siphon_colossus",
    "spiral_grazer",
  ]) {
    const s = species.find((e) => e.kind === kind),
      base = EUROPA_SPECIES.find((e) => e.kind === kind);
    assert.equal(s.schoolSize, 1);
    assert.ok(s.population >= base.schoolAnchors.length);
    for (const a of base.schoolAnchors)
      assert.ok(
        s.spawnAnchors.some((b) => a[1] === b[1] && a[2] === b[2]),
        `${kind}: layer`,
      );
    for (const length of [10, 15, 20, 25, 30])
      assert.deepEqual(preyMealReward(length, s), preyMealReward(length, base));
  }
  const p = createPlayer();
  collectPickup(p, "frenzy");
  assert.equal(canEat(p, 11.5), false);
  assert.equal(p.length, 3);
  const original = getRegionSpecies("europa").find(
    (s) => s.kind === "siphon_colossus",
  );
  p.length = 25;
  p.mass = (25 / 6) ** 3;
  p.health = 50;
  assert.ok(consumeDefeatedPrey(p, original));
  assert.equal(p.health, 50);
  assert.ok(p.mealRecovery > 40);
  assert.ok(p.length > 25);
});
test("七海域配置保持完整可分段、不越界，大型个体拥有稳定单独锚点", () => {
  for (const region of [
    "hawaii",
    "atlantis",
    "bermuda",
    "mariana",
    "amazon",
    "europa",
    "penglai",
  ])
    for (const s of getRegionSpecies(region)) {
      if (s.schoolSize > 1)
        assert.equal(
          schoolPopulationGroups(s).reduce((n, p) => n + p.count, 0),
          s.population,
        );
      if (s.largePreyDispersed) {
        assert.equal(s.spawnAnchors.length, s.population);
        assert.ok(s.spawnAnchors.every((a) => a.every(Number.isFinite)));
        const world = s.worldBounds || WORLD;
        assert.ok(
          s.spawnAnchors.every(
            (a) =>
              a[0] > world.minX &&
              a[0] < world.maxX &&
              a[2] > world.minZ &&
              a[2] < world.maxZ,
          ),
        );
      }
    }
});
