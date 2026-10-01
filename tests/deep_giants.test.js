import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { DEEP_GIANT_ANCHORS, DEEP_GIANT_SPECIES } from "../src/deep_giants.js";
import { ALL_SPECIES, getRegionSpecies } from "../src/region_ecology.js";
import {
  habitatPosition,
  initialSpeciesAnchor,
  sharesHabitat,
} from "../src/ecosystem_population.js";
import { createOcean, seabedHeight } from "../src/ocean.js";
import { createAtlantisOcean } from "../src/atlantis_ocean.js";
import { isPositionBlocked } from "../src/collision.js";
import { canPredatorHunt, isNursery } from "../src/nursery_rules.js";
import { characterMovement } from "../src/character_rules.js";
import {
  canEat,
  collectPickup,
  consumePrey,
  createPlayer,
} from "../src/simulation.js";

const NURSERY_POSITION = new THREE.Vector3(0, -18, 75);

test("新增巨兽只加两只，不扩大旧物种或幼年食物库存", () => {
  assert.equal(DEEP_GIANT_SPECIES.length, 1);
  assert.equal(
    ALL_SPECIES.filter((species) => species.kind === "ichthyotitan").length,
    1,
  );
  for (const [region, count, kinds] of [
    ["hawaii", 285, 24],
    ["atlantis", 390, 17],
  ]) {
    const population = getRegionSpecies(region);
    const old = population.filter(
      (species) =>
        !["ichthyotitan", "archelon"].includes(species.kind) &&
        species.category !== "invertebrate",
    );
    const giant = population.find((species) => species.kind === "ichthyotitan");
    assert.equal(old.length, kinds);
    assert.equal(
      old.reduce((sum, species) => sum + species.population, 0),
      count,
    );
    assert.equal(giant.population, 2);
    assert.equal(giant.schoolSize, 1);
    assert.equal(giant.tier, 2);
    assert.equal(giant.category, "ancient");
    assert.equal(giant.extinct, true);
    assert.equal(giant.predator, true);
    assert.deepEqual(giant.spawnAnchors, DEEP_GIANT_ANCHORS[region]);
    assert.equal(Object.isFrozen(giant.spawnAnchors[0]), true);
    assert.equal(old.find((s) => s.kind === "megalodon").length, 20);
    assert.equal(old.find((s) => s.kind === "basilosaurus").length, 18);
    assert.equal(old.find((s) => s.kind === "pliosaur").length, 11);
  }
});

test("两张完整地图的四个巨兽锚点均合法、独立，深海补位不能迁入幼年区", () => {
  for (const region of ["hawaii", "atlantis"]) {
    const ocean =
      region === "hawaii"
        ? createOcean(new THREE.Scene())
        : createAtlantisOcean(new THREE.Scene());
    const heightAt = ocean.heightAt || seabedHeight;
    const species = getRegionSpecies(region).find(
      (entry) => entry.kind === "ichthyotitan",
    );
    const positions = [];
    try {
      for (let index = 0; index < species.population; index++) {
        const anchor = initialSpeciesAnchor(species, index);
        const point = habitatPosition(species, {
          heightAt,
          colliders: ocean.colliders,
          populationIndex: index,
        });
        assert.ok(point, `${region}:${index} spawn`);
        assert.ok(
          point.distanceTo(anchor) < 0.001,
          `${region}:${index} anchor`,
        );
        assert.equal(isNursery(point), false);
        assert.equal(sharesHabitat(species, point, 0), true);
        assert.equal(
          isPositionBlocked(point, {
            colliders: ocean.colliders,
            radius: species.length * 0.55,
          }),
          false,
          `${region}:${index} full-turn clearance`,
        );
        assert.ok(point.y - heightAt(point.x, point.z) > species.length);
        assert.equal(canPredatorHunt(species, index, point, point), true);
        assert.equal(
          canPredatorHunt(species, index, point, NURSERY_POSITION),
          false,
        );
        assert.equal(
          habitatPosition(species, {
            heightAt,
            colliders: ocean.colliders,
            populationIndex: index,
            near: true,
            playerPosition: NURSERY_POSITION,
          }),
          null,
        );
        positions.push(point);
      }
      assert.ok(positions[0].distanceTo(positions[1]) > 250);
    } finally {
      ocean.dispose();
    }
  }
});

test("20至25米两角色与狂食均不能吞食28米巨兽，普通冲刺能甩开巡游追击", () => {
  const giant = DEEP_GIANT_SPECIES[0];
  for (const character of ["orca", "squid"]) {
    const movement = characterMovement(character, true);
    assert.ok(giant.speed > movement.cruiseSpeed);
    assert.ok(giant.chaseSpeed < movement.sprintSpeed);
    for (const length of [20, 25, 28])
      for (const frenzy of [false, true]) {
        const player = createPlayer(character);
        player.length = length;
        player.mass = (length / 6) ** 3;
        if (frenzy) collectPickup(player, "frenzy");
        const before = structuredClone(player);
        assert.equal(canEat(player, giant.length), false);
        assert.equal(consumePrey(player, giant), false);
        assert.deepEqual(player, before);
      }
    const adult = createPlayer(character);
    adult.length = 28.001;
    adult.mass = (adult.length / 6) ** 3;
    adult.hunger = 0;
    assert.equal(canEat(adult, giant.length), true);
    assert.equal(consumePrey(adult, giant), true);
    assert.equal(adult.hunger, 86);
    assert.equal(adult.lastMeal.nutrition, 86);
    assert.ok(Math.abs(adult.lastMeal.growth - giant.growth) < 1e-9);
  }
});
