import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { ALL_SPECIES, getRegionSpecies } from "../src/region_ecology.js";
import { fitBermudaExpansionEcology } from "../src/bermuda_ecology.js";
import { BERMUDA_WORLD } from "../src/bermuda_config.js";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import { BERMUDA_REEF_FIELDS } from "../src/bermuda_reef_fields.js";
import {
  habitatPosition,
  initialSchoolAnchor,
  initialSpeciesAnchor,
  schoolHabitat,
  schoolPopulationGroups,
  schoolSlot,
  speciesVisibilityDistance,
} from "../src/ecosystem_population.js";
import { isPositionBlocked } from "../src/collision.js";
import { isNursery } from "../src/nursery_rules.js";
import {
  oceanCurrentRoutes,
  nearestCurrentPoint,
} from "../src/ocean_current_rules.js";
import { preyRespawnDelay } from "../src/regional_rare.js";
import {
  consumePrey,
  createPlayer,
  preyMealReward,
} from "../src/simulation.js";

const species = getRegionSpecies("bermuda");
const protectedHome = (home) => isNursery({ y: home[1], z: home[2] });

// 用户允许全图重排；真正的育幼栖地与三组船舱补给仍严格匹配发布版0.11.31。
test("Whole-map Bermuda ecology retains the exact nursery and liner supplies, with bounded stock, four original lord guards and two explicit lair hunters", () => {
  const records = species.map((s) => ({
    kind: s.kind,
    profiles: s.schoolProfiles?.filter((p) => !p.bermudaRouteSchool) || null,
    homes: s.schoolProfiles
      ? null
      : Array.from({ length: s.population }, (_, i) =>
          initialSpeciesAnchor(s, i).toArray(),
        ).filter(protectedHome),
  }));
  assert.equal(
    createHash("sha256").update(JSON.stringify(records)).digest("hex"),
    "35d517d7f2b1592245162e2dbd92c3727d695b66a874cdc62bb567d1b9e1385f",
  );
  assert.equal(
    species.reduce((n, s) => n + s.population, 0),
    1082,
  );
  assert.equal(species.find((s) => s.kind === "ichthyotitan").population, 6);
  assert.equal(species.find((s) => s.kind === "tuna").population, 344);
  assert.equal(species.find((s) => s.kind === "ray").population, 132);
  assert.equal(species.find((s) => s.kind === "sunfish").population, 76);
  assert.ok(species.every((s) => s.worldBounds === BERMUDA_WORLD));
  assert.deepEqual(fitBermudaExpansionEcology(species), species);
  for (const s of species) {
    const original = ALL_SPECIES.find((a) => a.kind === s.kind);
    for (const key of [
      "length",
      "nutrition",
      "growth",
      "speed",
      "damage",
      "threatCeilingLength",
    ])
      assert.equal(s[key], original[key], `${s.kind}: unchanged ${key}`);
    assert.ok(Object.isFrozen(s));
  }
});

let fixture;
after(() => fixture?.ocean.dispose());
function finalPopulation() {
  if (fixture) {
    assert.ok(
      fixture.ocean.root.parent && fixture.ocean.colliders.length > 0,
      "Shared test world must remain alive through every collision case",
    );
    return fixture;
  }
  const ocean = createBermudaOcean(new THREE.Group()),
    population = [],
    pockets = [];
  for (const s of species) {
    if (s.schoolProfiles) {
      for (const group of schoolPopulationGroups(s)) {
        const habitat = schoolHabitat(s, group.index),
          center = initialSchoolAnchor(s, group.index),
          members = [];
        for (let slot = 0; slot < group.count; slot++) {
          const home = center.clone().add(schoolSlot(s, slot)),
            index = group.start + slot;
          const point = habitatPosition(habitat, {
            heightAt: ocean.heightAt,
            colliders: ocean.colliders,
            populationIndex: index,
            anchor: home,
            random: () => 0.5,
          });
          assert.ok(point, `${s.kind}/${index}: real legal school spawn`);
          members.push(point);
          population.push({ s, habitat, index, home, point });
        }
        pockets.push({
          s,
          count: group.count,
          point: members
            .reduce((p, m) => p.add(m), new THREE.Vector3())
            .multiplyScalar(1 / members.length),
        });
      }
    } else
      for (let index = 0; index < s.population; index++) {
        const home = initialSpeciesAnchor(s, index),
          point = habitatPosition(s, {
            heightAt: ocean.heightAt,
            colliders: ocean.colliders,
            populationIndex: index,
            random: () => 0.5,
          });
        assert.ok(point, `${s.kind}/${index}: real legal resident spawn`);
        population.push({ s, habitat: s, index, home, point });
        pockets.push({ s, count: 1, point });
      }
  }
  fixture = { ocean, population, pockets };
  return fixture;
}

test("Every redistributed animal fits final terrain and solids, then replenishes in its own bounded habitat", () => {
  const { ocean, population } = finalPopulation();
  assert.equal(population.length, 1082);
  for (const { s, habitat, index, home, point } of population) {
    assert.ok(
      point.x > -480 && point.x < 480 && point.z > -1740 && point.z < 122,
    );
    assert.ok(
      -point.y >= habitat.depthMin && -point.y <= habitat.depthMax,
      `${s.kind}/${index}: original species layer`,
    );
    assert.equal(
      isPositionBlocked(point, {
        colliders: ocean.colliders,
        radius: Math.max(0.45, s.length * 0.18),
      }),
      false,
    );
    if (s.benthic)
      assert.ok(
        Math.abs(point.y - ocean.heightAt(point.x, point.z) - s.floorOffset) <
          1e-6,
      );
    else
      assert.ok(
        point.distanceTo(home) < 1e-6,
        `${s.kind}/${index}: source placement must not rely on collider relocation`,
      );
    if (s.predator) assert.equal(isNursery(point), false);
    const again = habitatPosition(habitat, {
      heightAt: ocean.heightAt,
      colliders: ocean.colliders,
      populationIndex: index,
      anchor: home,
      near: false,
      random: () => 0.5,
    });
    assert.ok(again?.distanceTo(point) < 1e-6);
    if (!s.schoolProfiles && !s.benthic && !protectedHome(home.toArray())) {
      const afterRetreat = habitatPosition(habitat, {
        heightAt: ocean.heightAt,
        colliders: ocean.colliders,
        populationIndex: index,
        near: true,
        playerPosition: new THREE.Vector3(0, -18, 75),
        random: () => 0.5,
      });
      assert.ok(afterRetreat?.distanceTo(point) < 1e-6);
    }
    assert.equal(preyRespawnDelay(s), s.schoolSize > 1 ? 18 : 28);
  }
});

test("All fifteen horizontal sectors contain actual medium food and every non-nursery sector contains adult meals", () => {
  const { population } = finalPopulation();
  const xs = [-500, -166, 166, 500],
    zs = [140, -350, -700, -1050, -1400, -1760];
  for (let row = 0; row < zs.length - 1; row++)
    for (let column = 0; column < xs.length - 1; column++) {
      const cell = population.filter(
        ({ point }) =>
          point.x >= xs[column] &&
          point.x < xs[column + 1] &&
          point.z < zs[row] &&
          point.z >= zs[row + 1],
      );
      assert.ok(
        cell.length >= 10,
        `${column}/${row}: populated horizontal sector`,
      );
      assert.ok(
        cell.filter(({ s }) => s.length >= 3 && s.length <= 6).length >= 4,
        `${column}/${row}: meaningful medium meals`,
      );
      if (row > 0)
        assert.ok(
          cell.some(({ s }) => s.length >= 10 && s.length < 25),
          `${column}/${row}: adult nutrition`,
        );
    }
});

test("Real surface and deep current routes have bounded distances and gaps between edible nutritious pockets", () => {
  const { pockets } = finalPopulation();
  for (const route of oceanCurrentRoutes("bermuda")) {
    const lengths =
      route.id === "deep_west"
        ? [10, 16]
        : route.id === "deep_east"
          ? [25, 30]
          : [3, 6, 10];
    for (const length of lengths) {
      const edible = pockets.filter(
        ({ s, count }) =>
          s.length < length &&
          preyMealReward(length, s).nutrition * count >= 20,
      );
      const maxNearest = Math.max(
        ...route.points.map((p) =>
          Math.min(...edible.map((food) => food.point.distanceTo(p))),
        ),
      );
      assert.ok(
        maxNearest < 220,
        `${route.id}/${length}: nearest meaningful feeding pocket ${maxNearest}`,
      );
      const sample = {
        point: new THREE.Vector3(),
        direction: new THREE.Vector3(),
      };
      const progress = edible
        .map((food) => {
          nearestCurrentPoint(route, food.point, sample);
          return { distance: sample.distance, progress: sample.progress };
        })
        .filter((food) => food.distance <= 220)
        .map((food) => food.progress)
        .sort((a, b) => a - b);
      progress.unshift(0);
      progress.push(route.length);
      const maxGap = Math.max(
        ...progress.slice(1).map((value, i) => value - progress[i]),
      );
      const limit =
        length === 3 ? 400 : route.id.startsWith("deep") ? 190 : 300;
      assert.ok(
        maxGap < limit,
        `${route.id}/${length}: along-route feeding gap ${maxGap}`,
      );
    }
  }
});

test("Redistributed fish settle through unchanged shared meals at each growth stage and reject equal-sized contact", () => {
  const { pockets } = finalPopulation();
  for (const length of [3, 6, 10, 16, 25, 30]) {
    const eligible = pockets.filter(({ s }) => s.length < length);
    const meal = eligible.reduce((best, e) =>
      e.s.length > best.s.length ? e : best,
    ).s;
    const player = createPlayer("orca", Math.min(length, 29));
    player.length = length;
    player.mass = (length / 6) ** 3;
    player.hunger = 30;
    const reward = preyMealReward(length, meal),
      expectedGrowth =
        Math.min(125, player.mass + reward.growth * Math.min(1, length / 6)) -
        player.mass;
    assert.ok(consumePrey(player, meal));
    assert.equal(player.eaten, 1);
    assert.equal(player.hunger, Math.min(100, 30 + reward.nutrition));
    assert.ok(Math.abs(player.lastMeal.growth - expectedGrowth) < 1e-9);
    player.length = length;
    assert.equal(consumePrey(player, { ...meal, length }), false);
    assert.equal(player.eaten, 1);
  }
});

test("Each real reef garden has a nearby twelve-fish feeding school inside both quality culling ranges", () => {
  const { ocean, pockets } = finalPopulation();
  const chosen = new Set();
  for (const field of BERMUDA_REEF_FIELDS) {
    const observer = new THREE.Vector3(
      field.x,
      ocean.heightAt(field.x, field.z) + 25,
      field.z,
    );
    const school = pockets
      .filter((p) => p.s.kind === "tuna" && p.count === 12)
      .sort(
        (a, b) => a.point.distanceTo(observer) - b.point.distanceTo(observer),
      )[0];
    assert.ok(
      school.point.distanceTo(observer) < 90,
      `${field.id}: nearby moving school`,
    );
    chosen.add(school);
    for (const length of [10, 16])
      assert.ok(
        preyMealReward(length, school.s).nutrition * school.count >= 20,
      );
    for (const high of [false, true])
      assert.ok(
        school.point.distanceTo(observer) <
          speciesVisibilityDistance(school.s, high),
      );
    assert.ok(
      school.point.y >= -600,
      `${field.id}: retain original tuna depth limit`,
    );
  }
  assert.equal(
    chosen.size,
    12,
    "twelve gardens need twelve local groups, not one group counted repeatedly",
  );
  const hunter = species.find((s) => s.kind === "megalodon");
  for (const field of BERMUDA_REEF_FIELDS.filter((f) =>
    ["western_deep_garden", "abyssal_fan_bridge"].includes(f.id),
  )) {
    const observer = new THREE.Vector3(
      field.x,
      ocean.heightAt(field.x, field.z) + 25,
      field.z,
    );
    const distance = Math.min(
      ...hunter.spawnAnchors.map((p) =>
        new THREE.Vector3(...p).distanceTo(observer),
      ),
    );
    assert.ok(distance < 90, `${field.id}: visible deep adult predator/meal`);
  }
});
