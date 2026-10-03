import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ECOSYSTEM_SPECIES } from "../src/ecosystem_config.js";
import { ATLANTIS_SPECIES } from "../src/atlantis_species.js";
import {
  ALL_SPECIES,
  REGION_SPECIES_KINDS,
  getRegionSpecies,
} from "../src/region_ecology.js";
import {
  habitatPosition,
  initialSchoolAnchor,
  initialSpeciesAnchor,
  schoolHabitat,
  schoolPopulationGroups,
  schoolSlot,
  sharesHabitat,
  speciesVisibilityDistance,
} from "../src/ecosystem_population.js";
import {
  canPredatorHunt,
  inPredatorTerritory,
  isNursery,
  predatorTerritory,
} from "../src/nursery_rules.js";
import { createAtlantisCity } from "../src/atlantis_city.js";
import { atlantisDistrict } from "../src/atlantis_city_plan.js";
import {
  ATLANTIS_EXCAVATION_SITES,
  atlantisSeabedHeight as seabedHeight,
} from "../src/atlantis_terrain.js";
import { isPositionBlocked } from "../src/collision.js";
import { steerWithinHabitat } from "../src/navigation.js";
import {
  SPECIES,
  canEat,
  consumePrey,
  createPlayer,
  hungerDrainRate,
} from "../src/simulation.js";

const SPAWN = new THREE.Vector3(0, -18, 75);
// 使用最终城市的完整碰撞体，避免代表方盒掩盖真实街道与廊道阻塞。
const CITY = createAtlantisCity(new THREE.Scene(), { heightAt: seabedHeight });
const CITY_COLLIDERS = CITY.colliders;

test("海域名单隔离，夏威夷522个体与亚特兰蒂斯568个体保持各自实际库存", () => {
  assert.equal(SPECIES, ECOSYSTEM_SPECIES);
  const hawaii = getRegionSpecies().filter(
    (s) => s.category !== "invertebrate",
  );
  assert.deepEqual(
    hawaii.map((s) => s.kind),
    ECOSYSTEM_SPECIES.map((s) => s.kind),
  );
  assert.equal(
    getRegionSpecies().reduce((sum, s) => sum + s.population, 0),
    522,
  );
  for (const s of hawaii) {
    const original = ECOSYSTEM_SPECIES.find((entry) => entry.kind === s.kind);
    for (const key of [
      "length",
      "nutrition",
      "growth",
      "speed",
      "predator",
      "depthMin",
      "depthMax",
    ])
      assert.equal(s[key], original[key], `${s.kind}: ${key}`);
  }
  assert.equal(SPECIES.length, 26);
  assert.equal(
    SPECIES.reduce((sum, s) => sum + s.population, 0),
    293,
  );
  assert.equal(
    ALL_SPECIES.filter((s) => s.category !== "alien" && s.category !== "mythic")
      .length,
    69,
  );
  assert.equal(ALL_SPECIES.filter((s) => s.category === "alien").length, 16);
  assert.equal(ALL_SPECIES.length, 103);
  assert.equal(new Set(ALL_SPECIES.map((s) => s.kind)).size, 103);
  const atlantis = getRegionSpecies("atlantis");
  assert.equal(atlantis.length, 20);
  assert.equal(
    atlantis.reduce((sum, s) => sum + s.population, 0),
    568,
  );
  assert.deepEqual(
    REGION_SPECIES_KINDS.atlantis,
    atlantis.map((s) => s.kind),
  );
  assert.deepEqual(
    REGION_SPECIES_KINDS.hawaii,
    getRegionSpecies("hawaii").map((s) => s.kind),
  );
  assert.equal(
    atlantis.filter((s) => REGION_SPECIES_KINDS.hawaii.includes(s.kind)).length,
    13,
  );
  for (const unique of ATLANTIS_SPECIES) {
    assert.ok(REGION_SPECIES_KINDS.atlantis.includes(unique.kind));
    assert.equal(REGION_SPECIES_KINDS.hawaii.includes(unique.kind), false);
  }
  for (const species of atlantis) {
    assert.ok(Object.isFrozen(species));
    assert.notEqual(
      species,
      ALL_SPECIES.find((s) => s.kind === species.kind),
    );
  }
  const schools = atlantis.find((s) => s.kind === "spadefish");
  assert.ok(Object.isFrozen(schools.schoolAnchors[0]));
  assert.throws(() => (schools.schoolAnchors[0][0] = 99), TypeError);
  assert.throws(() => getRegionSpecies("missing"), /Unknown ecology region/);
  assert.throws(() => getRegionSpecies("__proto__"), /Unknown ecology region/);
});

test("实际坡度与真实城市下，568个出生位置合法且幼年补给就在前方", () => {
  const population = seedPopulation();
  assert.equal(population.length, 568);
  const nursery = population.filter(({ point }) => isNursery(point));
  assert.ok(nursery.length >= 206);
  assert.ok(nursery.every(({ species }) => !species.predator));
  const juvenile = createPlayer();
  const edible = nursery.filter(({ species }) =>
    canEat(juvenile, species.length),
  );
  assert.equal(
    edible.filter(
      ({ species }) => !species.benthic && species.category !== "invertebrate",
    ).length,
    206,
  );
  assert.ok(
    edible.filter(({ species }) => species.category === "invertebrate")
      .length >= 16,
  );
  assert.equal(
    edible.filter(({ species }) => species.schoolSize > 1).length,
    190,
  );
  const close = edible.filter(({ point }) => point.distanceTo(SPAWN) < 35);
  assert.ok(close.length >= 28);
  assert.ok(close.some(({ point }) => point.z < SPAWN.z));
  assert.ok(edible.some(({ point }) => point.z > SPAWN.z));
  assert.ok(nursery.some(({ species }) => species.kind === "sunfish"));
  const foodBridge = population.filter(
    ({ species, point }) =>
      species.length >= 3 &&
      species.length < 6 &&
      -point.y >= 90 &&
      -point.y < 165,
  );
  assert.ok(foodBridge.length >= 12);
  const deep = population.filter(
    ({ species, point }) => species.length >= 10 && -point.y >= 250,
  );
  assert.ok(deep.length >= 20);
  assert.ok(deep.some(({ point }) => -point.y > 590));
});

test("海马与乌贼分散为独立居民，配置锚点不会被位置与鱼群计算改写", () => {
  for (const kind of ["seahorse", "cuttlefish"]) {
    const species = getRegionSpecies("atlantis").find((s) => s.kind === kind);
    assert.equal(species.schoolSize, 1);
    assert.equal(species.nurseryResident, true);
    assert.ok(species.speed < 2);
    const anchors = new Set();
    for (let index = 0; index < species.population; index++) {
      const point = initialSpeciesAnchor(species, index);
      assert.ok(isNursery(point));
      anchors.add(point.toArray().join(","));
      point.x = 999;
      assert.notEqual(initialSpeciesAnchor(species, index).x, 999);
    }
    assert.equal(anchors.size, species.population);
  }
});

test("中型鱼群的生成、导航、补位与重生沿用初始水层", () => {
  for (const species of getRegionSpecies("atlantis").filter(
    (s) => s.layeredSchools,
  )) {
    const groupCount = schoolPopulationGroups(species).length;
    for (let group = 0; group < groupCount; group++) {
      const anchor = initialSchoolAnchor(species, group);
      const habitat = schoolHabitat(species, group);
      assert.ok(sharesHabitat(habitat, anchor, 0));
      assert.ok(habitat.depthMax - habitat.depthMin <= 36);
      const rising = steerWithinHabitat(
        { x: anchor.x, y: -habitat.depthMin, z: anchor.z },
        { x: 0, y: 1, z: -1 },
        habitat,
        () => -700,
      );
      const sinking = steerWithinHabitat(
        { x: anchor.x, y: -habitat.depthMax, z: anchor.z },
        { x: 0, y: -1, z: -1 },
        habitat,
        () => -700,
      );
      assert.ok(rising.y <= 0);
      assert.ok(sinking.y >= 0);
      const respawn = habitatPosition(habitat, {
        heightAt: seabedHeight,
        colliders: CITY_COLLIDERS,
        anchor,
      });
      assert.ok(respawn && sharesHabitat(habitat, respawn, 0));
    }
    const deep = schoolHabitat(species, groupCount - 1);
    assert.equal(
      habitatPosition(deep, {
        heightAt: seabedHeight,
        near: true,
        playerPosition: SPAWN,
      }),
      null,
    );
  }
  const custom = {
    ...getRegionSpecies("atlantis")[0],
    layeredSchools: true,
    schoolAnchors: [[0, -25, -50]],
  };
  delete custom.schoolProfiles;
  assert.equal(schoolHabitat(custom).depthMin, 7);
  assert.deepEqual(initialSchoolAnchor(custom).toArray(), [0, -25, -50]);
});

test("仅一只大青鲨提供外礁挑战，所有猎手都无法进入或追杀幼年区", () => {
  const population = seedPopulation();
  const outerReef = population.filter(
    ({ species, point }) => species.predator && point.z > -370,
  );
  assert.equal(outerReef.length, 1);
  assert.equal(outerReef[0].species.kind, "blue_shark");
  for (const { species, index, point } of population.filter(
    ({ species }) => species.predator,
  )) {
    assert.equal(canPredatorHunt(species, index, point, SPAWN), false);
    assert.equal(
      habitatPosition(species, {
        heightAt: seabedHeight,
        near: true,
        playerPosition: SPAWN,
        populationIndex: index,
      }),
      null,
    );
  }
  const shark = outerReef[0];
  assert.equal(predatorTerritory(shark.species, 0).edge, true);
  assert.equal(predatorTerritory(shark.species, 1).edge, false);
  assert.equal(
    canPredatorHunt(shark.species, 0, shark.point, shark.point),
    true,
  );
});

test("两角色各体长阶段都有真实可食补给，营养按共享规则覆盖行程与战斗预留", (t) => {
  const population = seedPopulation();
  const report = [];
  for (const character of ["orca", "squid"]) {
    for (const [length, minimumPrey, minimumDepth, maximumDepth] of [
      [3, 0.1, 0, 72],
      [6, 3, 30, 180],
      [10, 5, 100, 320],
      [16, 10, 180, 520],
      [25, 12, 300, 650],
      [30, 13, 330, 650],
    ]) {
      const player = createPlayer(character);
      player.length = length;
      player.mass = (length / 6) ** 3;
      const meals = population.filter(
        ({ species, point }) =>
          canEat(player, species.length) &&
          species.length >= minimumPrey &&
          -point.y >= minimumDepth &&
          -point.y <= maximumDepth,
      );
      assert.ok(
        meals.length >= (length >= 25 ? 8 : 12),
        `${character} ${length}m food stock`,
      );
      let best = null;
      for (const { species, point } of meals) {
        const fed = createPlayer(character);
        Object.assign(fed, {
          length,
          mass: (length / 6) ** 3,
          hunger: 0,
          health: 60,
        });
        assert.equal(consumePrey(fed, species), true);
        const drain = hungerDrainRate(length, -point.y);
        const seconds = fed.lastMeal.nutrition / drain;
        if (!best || seconds > best.seconds)
          best = {
            kind: species.kind,
            seconds,
            healed: fed.lastMeal.healed,
            growth: fed.lastMeal.growth,
          };
      }
      // 幼年小群连续进食，一口预留12秒；中大型单口预留20秒机动预算，不等同于自然游玩捕食频率。
      assert.ok(
        best.seconds > (length === 3 ? 12 : 20),
        `${character} ${length}m reserve`,
      );
      assert.ok(best.healed > 0);
      if (length < 30) assert.ok(best.growth > 0);
      if (character === "orca")
        report.push({
          length,
          meals: meals.length,
          best: best.kind,
          foodSeconds: Number(best.seconds.toFixed(1)),
        });
    }
  }
  t.diagnostic(JSON.stringify(report));
});

test("城市十群120尾小鱼与50尾中型食物保持原营养值，不削减巨兽", () => {
  const population = seedPopulation();
  const schools = getRegionSpecies("atlantis").flatMap((species) =>
    schoolPopulationGroups(species)
      .filter(() => species.schoolSize > 1)
      .map((group) => ({
        species,
        group,
        habitat: schoolHabitat(species, group.index),
      })),
  );
  const residents = schools.filter(({ habitat }) => habitat.cityResident);
  assert.equal(
    residents.filter(({ species }) => species.length < 1).length,
    10,
  );
  assert.equal(
    residents
      .filter(({ species }) => species.length < 1)
      .reduce((sum, { group }) => sum + group.count, 0),
    120,
  );
  assert.equal(
    residents
      .filter(({ species }) => species.length >= 3)
      .reduce((sum, { group }) => sum + group.count, 0),
    50,
  );
  const districts = new Set();
  for (const entry of population.filter(
    ({ habitat }) => habitat.cityResident,
  )) {
    assert.equal(entry.habitat.nurseryResident, false);
    assert.equal(isNursery(entry.point), false);
    assert.ok(entry.habitat.depthMax - entry.habitat.depthMin <= 24);
    districts.add(atlantisDistrict(entry.point.x, entry.point.z)?.id);
  }
  assert.equal(districts.size, 5);
  for (const species of getRegionSpecies("atlantis")) {
    const source = ALL_SPECIES.find((entry) => entry.kind === species.kind);
    for (const key of ["length", "nutrition", "growth", "speed", "predator"])
      assert.equal(species[key], source[key], `${species.kind} ${key}`);
    assert.equal(
      schoolPopulationGroups(species).reduce(
        (sum, group) => sum + group.count,
        0,
      ),
      species.population,
    );
  }
});

test("逐群规模不能越界或遗失个体，学校深度和数量配置不会变异", () => {
  const species = getRegionSpecies("atlantis").find(
    (entry) => entry.kind === "sardine",
  );
  const groups = schoolPopulationGroups(species);
  assert.deepEqual(
    groups.map((group) => group.count),
    [20, 20, 20, 20, 20, 12, 12, 12, 12, 12, 12],
  );
  assert.ok(Object.isFrozen(species.schoolProfiles[0].anchor));
  assert.throws(
    () =>
      schoolPopulationGroups({
        ...species,
        population: species.population - 1,
      }),
    /Invalid school population/,
  );
  assert.throws(
    () =>
      schoolPopulationGroups({
        ...species,
        population: species.population + 1,
      }),
    /Mismatched school profiles/,
  );
});

test("两处地下厅与纪念廊道各有十二尾常驻小鱼，实际建筑和陈设不堵住群心", () => {
  const profiles = getRegionSpecies("atlantis").flatMap((species) =>
    (species.schoolProfiles || [])
      .filter((profile) =>
        ["harbor_sanctuary", "agora_bridges", "memorial_terrace"].includes(
          profile.citySite,
        ),
      )
      .map((profile) => ({ species, profile })),
  );
  assert.equal(profiles.length, 3);
  for (const { species, profile } of profiles) {
    const excavation = ATLANTIS_EXCAVATION_SITES.find(
      (entry) => entry.reservation === profile.citySite,
    );
    const gallery = CITY.underways.records.find(
      (entry) => entry.id === profile.citySite,
    );
    const sanctuary = excavation?.fishSanctuary;
    const center = sanctuary?.anchor || excavation?.turningCircle;
    const site = center ? { ...center, lowerY: center.y } : gallery;
    assert.ok(site);
    assert.equal(profile.count, 12);
    assert.ok(Math.abs(profile.anchor[0] - site.x) < 0.001);
    assert.ok(Math.abs(profile.anchor[1] - site.lowerY) < 0.001);
    assert.ok(Math.abs(profile.anchor[2] - site.z) < 0.001);
    assert.equal(profile.depthMax - profile.depthMin, 12);
    const anchor = new THREE.Vector3(...profile.anchor);
    assert.equal(
      isPositionBlocked(anchor, { colliders: CITY_COLLIDERS, radius: 10 }),
      false,
    );
    const spawn = habitatPosition(
      { ...species, ...profile },
      { heightAt: seabedHeight, colliders: CITY_COLLIDERS, anchor },
    );
    assert.ok(spawn.distanceTo(anchor) < 0.001);
  }
});

test("深城增密增加实际中鱼与大型食物库存，仍保留原有水层与城区锚点", () => {
  const species = getRegionSpecies("atlantis");
  const counts = Object.fromEntries(
    species.map((entry) => [entry.kind, entry.population]),
  );
  assert.deepEqual([counts.sunfish, counts.tuna, counts.ray], [24, 74, 36]);
  assert.deepEqual(
    [
      counts.plesiosaur,
      counts.pliosaur,
      counts.mosasaur,
      counts.basilosaurus,
      counts.megalodon,
    ],
    [9, 9, 11, 9, 11],
  );
  const medium = species.filter((entry) =>
    ["sunfish", "tuna", "ray"].includes(entry.kind),
  );
  assert.equal(
    medium.reduce((sum, entry) => sum + entry.population, 0),
    134,
  );
  for (const [kind, expected] of [
    ["sunfish", [6, 6]],
    ["tuna", [14, 9, 3]],
    ["ray", [3, 3, 3, 3]],
  ]) {
    const entry = species.find((item) => item.kind === kind);
    assert.deepEqual(
      entry.schoolProfiles
        .filter((profile) => profile.cityResident)
        .map((profile) => profile.count),
      expected,
    );
  }
  const cityProfiles = species.flatMap((entry) =>
    (entry.schoolProfiles || [])
      .filter((profile) => profile.cityResident)
      .map((profile) => ({ ...profile, length: entry.length })),
  );
  assert.equal(
    cityProfiles.reduce((sum, profile) => sum + profile.count, 0),
    170,
  );
  assert.equal(
    cityProfiles
      .filter((profile) => profile.length < 1 && -profile.anchor[1] >= 300)
      .reduce((sum, profile) => sum + profile.count, 0),
    // 深层八个小鱼栖地各自增密50%，继续留在300m以下水层。
    96,
  );
  const schools = species
    .filter((entry) => entry.schoolSize > 1)
    .flatMap((entry) => schoolPopulationGroups(entry));
  assert.equal(schools.length, 47);
  const sardine = species.find((entry) => entry.kind === "sardine");
  const extra = sardine.schoolProfiles
    .slice(-2)
    .map((profile) => new THREE.Vector3(...profile.anchor));
  assert.ok(
    extra[0].distanceTo(extra[1]) >
      speciesVisibilityDistance(sardine, true) * 2 + 20,
  );
  const population = seedPopulation();
  const bridge = population.filter(
    ({ species, point }) =>
      species.length >= 3 &&
      species.length < 6 &&
      -point.y >= 90 &&
      -point.y < 165,
  );
  assert.ok(bridge.length >= 12);
});

function seedPopulation() {
  const population = [];
  for (const species of getRegionSpecies("atlantis")) {
    for (let index = 0; index < species.population; index++) {
      let anchor = initialSpeciesAnchor(species, index);
      let habitat = species;
      if (species.schoolSize > 1) {
        const group = schoolPopulationGroups(species).find(
          (entry) => index >= entry.start && index < entry.start + entry.count,
        );
        const groupIndex = group.index;
        habitat = schoolHabitat(species, groupIndex);
        const center = habitatPosition(habitat, {
          heightAt: seabedHeight,
          colliders: CITY_COLLIDERS,
          anchor: initialSchoolAnchor(species, groupIndex),
          populationIndex: index,
        });
        assert.ok(center, `${species.kind} school ${groupIndex}`);
        anchor = center.add(schoolSlot(species, index - group.start));
      }
      const point = habitatPosition(habitat, {
        heightAt: seabedHeight,
        colliders: CITY_COLLIDERS,
        anchor,
        populationIndex: index,
      });
      assert.ok(point, `${species.kind}:${index} spawn`);
      assert.ok(
        inPredatorTerritory(species, index, point),
        `${species.kind}:${index} territory`,
      );
      assert.ok(
        sharesHabitat(habitat, point, 0),
        `${species.kind}:${index} depth`,
      );
      assert.ok(
        point.y >=
          seabedHeight(point.x, point.z) +
            (species.benthic
              ? species.floorOffset
              : species.length * 0.35 + 3) -
            0.001,
      );
      assert.equal(
        isPositionBlocked(point, {
          colliders: CITY_COLLIDERS,
          radius: Math.max(0.45, species.length * 0.18),
        }),
        false,
      );
      population.push({ species, habitat, index, point });
    }
  }
  return population;
}
