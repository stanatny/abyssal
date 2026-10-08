import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { PLAYER_CHARACTERS } from "../src/character_rules.js";
import { isPositionBlocked } from "../src/collision.js";
import { DEEP_GIANT_SPECIES } from "../src/deep_giants.js";
import {
  habitatPosition,
  initialSpeciesAnchor,
} from "../src/ecosystem_population.js";
import {
  MARIANA_GATES,
  MARIANA_REFUGE,
  MARIANA_WORLD,
} from "../src/mariana_config.js";
import { createMarianaOcean } from "../src/mariana_ocean.js";
import { canPredatorRetaliate } from "../src/predator_combat.js";
import { canPredatorHunt, isNursery } from "../src/nursery_rules.js";
import { ALL_SPECIES, getRegionSpecies } from "../src/region_ecology.js";
import {
  canEat,
  consumePrey,
  createPlayer,
  preyMealReward,
} from "../src/simulation.js";

const roster = getRegionSpecies("mariana");
const giant = roster.find((s) => s.kind === "ichthyotitan");
const recovery = roster.filter((s) =>
  ["basilosaurus", "megalodon"].includes(s.kind),
);
const ocean = createMarianaOcean(new THREE.Scene());
const allSolids = [...ocean.colliders, ...ocean.barriers];
const nursery = new THREE.Vector3(0, -18, 75);
const band = (anchor) =>
  [...MARIANA_GATES.map((g) => g.depth), Infinity].findIndex(
    (depth) => -anchor[1] < depth,
  );
after(() => ocean.dispose());

test("The final Mariana pipeline keeps two unchanged adult hunters in each pre-gate layer", () => {
  assert.equal(giant.population, 8);
  assert.equal(giant.schoolSize, 1);
  assert.equal(giant.spawnAnchors.length, giant.population);
  assert.equal(new Set(giant.spawnAnchors.map(String)).size, 8);
  assert.deepEqual(
    MARIANA_GATES.map(
      (_, i) => giant.spawnAnchors.filter((a) => band(a) === i).length,
    ),
    [2, 2, 2, 2],
  );
  assert.equal(
    giant.spawnAnchors.some((a) => band(a) === 4),
    false,
  );
  const original = DEEP_GIANT_SPECIES[0];
  for (const key of [
    "length",
    "speed",
    "chaseSpeed",
    "nutrition",
    "growth",
    "tier",
    "predator",
    "hunterAbility",
  ])
    assert.equal(giant[key], original[key], key);
  assert.equal(canPredatorRetaliate(30, giant.length), true);
  assert.equal(canEat({ length: 30 }, giant.length), true);
  assert.equal(canEat({ length: 28 }, giant.length), false);
});

test("Only five ordinary instances are added and the other seven regional inventories stay intact", () => {
  assert.equal(roster.length, 22);
  assert.equal(
    roster.reduce((n, s) => n + s.population, 0),
    458,
  );
  for (const [region, count] of Object.entries({
    hawaii: 516,
    atlantis: 560,
    bermuda: 467,
    amazon: 409,
    europa: 352,
    penglai: 437,
    odyssey: 269,
  }))
    assert.equal(
      getRegionSpecies(region).reduce((n, s) => n + s.population, 0),
      count,
      region,
    );
  for (const s of roster.filter(
    (s) => s.category === "ancient" || s.kind === "sperm_whale",
  )) {
    const original = ALL_SPECIES.find((entry) => entry.kind === s.kind);
    for (const key of ["length", "nutrition", "growth"])
      assert.equal(s[key], original[key], `${s.kind} ${key}`);
  }
});

test("All giant homes and nominal turning envelopes clear real terrain and closed seals", () => {
  const turnRadius = giant.length * 0.55;
  const envelope = giant.residentRadius + turnRadius;
  for (let i = 0; i < giant.population; i++) {
    const anchor = initialSpeciesAnchor(giant, i);
    const point = habitatPosition(giant, {
      anchor,
      heightAt: ocean.heightAt,
      colliders: ocean.colliders,
      populationIndex: i,
      random: () => 0.5,
    });
    assert.ok(point, `giant ${i} has a legal spawn`);
    assert.ok(point.distanceTo(anchor) < 1e-8, `giant ${i} needs no fallback`);
    assert.equal(
      isPositionBlocked(point, { colliders: allSolids, radius: envelope }),
      false,
      `giant ${i} nominal home envelope`,
    );
    assert.ok(point.y - ocean.heightAt(point.x, point.z) > envelope);
    for (const g of MARIANA_GATES)
      assert.ok(Math.abs(point.y + g.depth) >= 80, `giant ${i} ${g.id}`);
    for (const [axis, min, max] of [
      ["x", MARIANA_WORLD.minX, MARIANA_WORLD.maxX],
      ["z", MARIANA_WORLD.minZ, MARIANA_WORLD.maxZ],
    ])
      assert.ok(point[axis] - envelope > min && point[axis] + envelope < max);
    assert.equal(isNursery(point), false);
    assert.equal(canPredatorHunt(giant, i, point, point), true);
    assert.equal(canPredatorHunt(giant, i, point, nursery), false);
  }
  // 活动半径不是移动硬约束；这里只证明出生点及名义转身空间，追击另由真实主循环验收。
  assert.ok(giant.depthMin > 72);
  assert.ok(giant.depthMax + turnRadius < MARIANA_GATES.at(-1).depth);
  assert.ok(
    MARIANA_REFUGE.y < -giant.depthMax - turnRadius - MARIANA_REFUGE.radius,
  );
});

test("Redistributed recovery keeps stock and at least two homes of each kind in every stage", () => {
  assert.deepEqual(
    recovery.map((s) => [s.kind, s.population]),
    [
      ["basilosaurus", 12],
      ["megalodon", 15],
    ],
  );
  for (const s of recovery) {
    assert.equal(s.spawnAnchors.length, s.population);
    for (let i = 0; i < MARIANA_GATES.length + 1; i++)
      assert.ok(
        s.spawnAnchors.filter((a) => band(a) === i).length >= 2,
        `${s.kind} stage ${i + 1}`,
      );
    for (const length of [25, 30])
      assert.equal(canPredatorRetaliate(length, s.length), false);
  }
});

test("Final recovery homes and offscreen replacement stay legal in their feeding layers", () => {
  for (const s of [...recovery, giant])
    for (let i = 0; i < s.population; i++) {
      const anchor = initialSpeciesAnchor(s, i);
      for (const near of [false, true]) {
        const point = habitatPosition(s, {
          anchor,
          heightAt: ocean.heightAt,
          colliders: ocean.colliders,
          populationIndex: i,
          playerPosition: nursery,
          near,
          random: () => 0.5,
        });
        assert.ok(point, `${s.kind} ${i} ${near ? "replacement" : "spawn"}`);
        assert.ok(
          point.distanceTo(anchor) < 1e-8,
          `${s.kind} ${i} no fallback`,
        );
        assert.equal(band(point.toArray()), band(anchor.toArray()));
        assert.equal(
          isPositionBlocked(point, {
            colliders: allSolids,
            radius: s.length * 0.55,
          }),
          false,
          `${s.kind} ${i} full turn`,
        );
      }
    }
});

test("All four characters receive unchanged substantial recovery at 25 and 30 meters", () => {
  for (const character of PLAYER_CHARACTERS.filter((c) => c.available))
    for (const length of [25, 30])
      for (const s of recovery) {
        const player = createPlayer(character.id, 15);
        player.length = length;
        player.mass = (length / 6) ** 3;
        player.hunger = 0;
        player.health = 20;
        const nutrition = s.kind === "basilosaurus" ? 99 : 105;
        assert.ok(
          Math.abs(preyMealReward(length, s).nutrition - nutrition) < 1e-8,
        );
        assert.equal(consumePrey(player, s), true);
        assert.ok(Math.abs(player.hunger - Math.min(100, nutrition)) < 1e-8);
        assert.ok(
          Math.abs(player.lastMeal.healed - Math.min(80, nutrition * 0.8)) <
            1e-8,
        );
        assert.equal(player.eaten, 1);
      }
});

test("Upper first-stock meals still reach the 25-meter gate without respawn or reward changes", () => {
  const stock = roster
    .flatMap((s) =>
      (s.spawnAnchors || [])
        .filter((a) => -a[1] < 610 && s.length >= 11 && s.length < 28)
        .map((anchor) => ({ ...s, anchor })),
    )
    .sort((a, b) => a.length - b.length);
  assert.ok(stock.length >= 40);
  // 这是按体长排序、无搜索/耗时/再次受伤的首批库存预算，不是自然通关时间。
  for (const character of PLAYER_CHARACTERS.filter((c) => c.available))
    for (const initialHealth of [100, 70, 50]) {
      const player = createPlayer(character.id, 15);
      player.health = initialHealth;
      player.hunger = 0;
      for (const prey of stock) {
        consumePrey(player, prey);
        if (player.length >= 25) break;
      }
      assert.equal(
        player.eaten,
        17,
        `${character.id} ${initialHealth} captures`,
      );
      assert.ok(player.length >= 25 && player.length < 26);
      assert.equal(player.health, 100);
      assert.equal(player.elapsed, 0);
      assert.equal(player.won, false);
    }
});
