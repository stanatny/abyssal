import test from "node:test";
import assert from "node:assert/strict";
import {
  densifyFeedingSchools,
  FEEDING_DENSITY_RULES,
} from "../src/feeding_distribution.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import { schoolPopulationGroups } from "../src/ecosystem_population.js";

const WORLD = { minX: -300, maxX: 300, minZ: -1200, maxZ: 150 };

test("分群后增密扩大真实群体而不再次拆散，营养和栖地语义不变", () => {
  const source = {
    kind: "fixture",
    predator: false,
    length: 3,
    population: 12,
    schoolSize: 6,
    nutrition: 24,
    growth: 0.1,
    depthMin: 5,
    depthMax: 400,
    schoolProfiles: [
      { anchor: [0, -15, 20], count: 4, nurseryResident: true },
      { anchor: [64, -80, -300], count: 3, depthMin: 62, depthMax: 98 },
      { anchor: [-64, -180, -500], count: 3, depthMin: 162, depthMax: 198 },
      { anchor: [0, -300, -700], count: 2, fixedHabitat: true },
    ],
  };
  const before = JSON.stringify(source);
  const result = densifyFeedingSchools([source])[0];
  assert.equal(JSON.stringify(source), before);
  assert.deepEqual(
    result.schoolProfiles.map((p) => p.count),
    [5, 6, 6, 3],
  );
  assert.equal(result.population, 20);
  assert.equal(schoolPopulationGroups(result).length, 4);
  for (let i = 0; i < source.schoolProfiles.length; i++) {
    const { count, ...a } = source.schoolProfiles[i];
    const { count: nextCount, ...b } = result.schoolProfiles[i];
    assert.deepEqual(b, a);
  }
  assert.equal(result.nutrition, source.nutrition);
  assert.equal(result.growth, source.growth);
  assert.ok(Object.isFrozen(result.schoolProfiles[1]));
});

test("成年补给保留原独立锚点，新个体分开，不能增殖早期猎手、巨型天敌或载具", () => {
  const species = {
    kind: "adult",
    length: 18,
    predator: true,
    population: 4,
    schoolSize: 1,
    depthMin: 200,
    depthMax: 400,
    residentRadius: 40,
    worldBounds: WORLD,
    spawnAnchors: [
      [-20, -210, -500],
      [20, -300, -700],
    ],
  };
  const [adult, early, giant, vehicle] = densifyFeedingSchools([
    species,
    { ...species, length: 6 },
    { ...species, length: 28 },
    { ...species, vehicle: true },
  ]);
  assert.equal(adult.population, 6);
  assert.deepEqual(adult.spawnAnchors.slice(0, 4), [
    ...species.spawnAnchors,
    ...species.spawnAnchors,
  ]);
  assert.equal(adult.spawnAnchors.length, 6);
  assert.notDeepEqual(adult.spawnAnchors[4], adult.spawnAnchors[0]);
  assert.equal(adult.spawnAnchors[4][1], adult.spawnAnchors[1][1]);
  assert.equal(adult.spawnAnchors[5][1], adult.spawnAnchors[3][1]);
  assert.equal(early.population, 4);
  assert.equal(giant.population, 4);
  assert.equal(vehicle.population, 4);
});

test("五海域都增加真实库存、完整保留独特种类与固定栖地，巨型天敌数量不变", () => {
  for (const [region, expected, kinds, giantCount] of [
    ["hawaii", 522, 28, 2],
    ["atlantis", 568, 20, 2],
    ["bermuda", 474, 24, 2],
    ["mariana", 473, 22, 3],
    ["europa", 369, 16, 5],
  ]) {
    const species = getRegionSpecies(region);
    assert.equal(species.length, kinds);
    assert.equal(
      species.reduce((n, s) => n + s.population, 0),
      expected,
    );
    assert.equal(
      species
        .filter((s) => s.predator && s.length >= 25)
        .reduce((n, s) => n + s.population, 0),
      giantCount,
    );
    for (const s of species.filter((s) => s.schoolSize > 1))
      assert.equal(
        schoolPopulationGroups(s).reduce((n, g) => n + g.count, 0),
        s.population,
      );
  }
  assert.equal(FEEDING_DENSITY_RULES.roamingSchool, 2);
  const atlantis = getRegionSpecies("atlantis");
  assert.equal(
    atlantis
      .flatMap((s) => s.schoolProfiles || [])
      .filter((p) => p.cityResident)
      .reduce((n, p) => n + p.count, 0),
    170,
  );
  assert.ok(
    atlantis
      .filter((s) => s.schoolSize > 1)
      .flatMap((s) => s.schoolProfiles || [])
      .filter((p) => p.nurseryResident)
      .every((p) => !p.cityResident),
  );
  for (const r of ["hawaii", "bermuda", "mariana"])
    assert.equal(
      getRegionSpecies(r).find((s) => s.kind === "sardine").nurseryResident,
      true,
    );
});

test("狭窄地下栖地按验收容量增密，不得把额外中鱼挤出既定通道", () => {
  const source = {
    kind: "fixture",
    predator: false,
    length: 3,
    schoolSize: 3,
    population: 6,
    schoolProfiles: [
      {
        anchor: [0, -400, -600],
        count: 3,
        cityResident: true,
        densityLimit: 3,
      },
      { anchor: [0, -120, -400], count: 3 },
    ],
  };
  const result = densifyFeedingSchools([source])[0];
  assert.deepEqual(
    result.schoolProfiles.map((p) => p.count),
    [3, 6],
  );
  assert.equal(result.population, 9);
  assert.equal(result.schoolProfiles[0].densityLimit, 3);
});
