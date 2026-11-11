import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { getRegionSpecies } from "../src/region_ecology.js";
import { getExpedition } from "../src/expedition_config.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";
import {
  fitHawaiiEncounterHabitats,
  fitRegionalLordHabitats,
} from "../src/regional_lord_habitats.js";
import {
  habitatPosition,
  initialSpeciesAnchor,
  steerResidentHabitat,
} from "../src/ecosystem_population.js";
import { canPredatorHunt, isNursery } from "../src/nursery_rules.js";
import { canPredatorRetaliate } from "../src/predator_combat.js";
import { bodyRadius, castBodySegment } from "../src/collision.js";
import { preyMealReward } from "../src/simulation.js";
import { createOcean, seabedHeight } from "../src/ocean.js";
import { createAtlantisOcean } from "../src/atlantis_ocean.js";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import { createAmazonOcean } from "../src/amazon_ocean.js";
import { createMarianaOcean } from "../src/mariana_ocean.js";

const nursery = new T.Vector3(0, -18, 75);
function population(species, ocean) {
  return species
    .filter((s) => s.length >= 10)
    .flatMap((s) =>
      Array.from({ length: s.population }, (_, i) => {
        const p = habitatPosition(s, {
          heightAt: ocean.heightAt || seabedHeight,
          colliders: ocean.colliders,
          populationIndex: i,
          random: () => 0.5,
        });
        assert.ok(p, `${s.kind}/${i} legal home`);
        assert.equal(isNursery(p), false);
        if (s.predator) assert.equal(canPredatorHunt(s, i, p, nursery), false);
        return { s, i, p };
      }),
    );
}
function checkSite(center, pop, ocean, id) {
  const guards = pop.filter(
    (e) =>
      e.s.predator &&
      canPredatorRetaliate(30, e.s.length, e.s.threatCeilingLength) &&
      e.p.distanceTo(center) < 115,
  );
  assert.equal(guards.length, 1, `${id}: one ordinary 30 m threat`);
  const g = guards[0];
  assert.ok(
    canPredatorHunt(g.s, g.i, g.p, center),
    `${id}: legal attack territory`,
  );
  assert.ok(
    -center.y >= g.s.depthMin - 20 && -center.y <= g.s.depthMax + 20,
    `${id}: actual pursuit depth`,
  );
  const meals = pop.filter(
    (e) =>
      e.s.length < 25 &&
      e.p.distanceTo(center) < 180 &&
      preyMealReward(30, e.s).nutrition >= 30,
  );
  const reachable = meals.filter(
    (e) =>
      e.p.distanceTo(center) >= 60 &&
      !castBodySegment(center, e.p, {
        colliders: ocean.colliders,
        radius: bodyRadius(30),
        length: 30,
        forward: e.p.clone().sub(center).normalize(),
      }),
  );
  assert.ok(reachable.length >= 2, `${id}: accessible adult meals`);
  assert.ok(
    reachable.some((e) => e.s.predator),
    `${id}: medium/large hunter supply`,
  );
  return meals;
}

for (const [id, create] of Object.entries({
  atlantis: createAtlantisOcean,
  bermuda: createBermudaOcean,
  amazon: createAmazonOcean,
  mariana: createMarianaOcean,
}))
  test(`${id}: real terrain supports each lord's guard and a bounded adult reserve`, () => {
    const ocean = create(new T.Group());
    try {
      const pop = population(getRegionSpecies(id), ocean);
      for (const b of getExpedition(id).region.bossInstances) {
        const center = new T.Vector3(...b.home),
          meals = checkSite(center, pop, ocean, b.id);
        assert.ok(
          meals.filter((e) => e.p.distanceTo(center) < 140).length <= 4,
          `${b.id}: avoid a food pile inside the arena`,
        );
      }
    } finally {
      ocean.dispose();
    }
  });

test("Hawaii: all ordered lord pairs and placement extremes reuse two guards and reachable food without mutating the catalogue", () => {
  const ocean = createOcean(new T.Group()),
    source = getRegionSpecies("hawaii"),
    before = JSON.stringify(source);
  const lords = BOSS_SPECIES.filter((s) =>
    getExpedition("hawaii").region.bossKinds.includes(s.kind),
  );
  try {
    for (const a of lords)
      for (const b of lords) {
        if (a === b) continue;
        for (const t of [0, 0.5, 1]) {
          const bosses = [a, b].map((s, i) => {
            const x = (i === 0 ? -1 : 1) * (145 + t * 20),
              target = s.depthMin + 25 + t * 35;
            let z = T.MathUtils.clamp(
              -200 - (target + 75 - 140) / 0.72,
              -1110,
              -520,
            );
            for (
              let j = 0;
              j < 12 && seabedHeight(x, z) + s.length * 0.24 + 35 > -s.depthMin;
              j++
            )
              z = Math.max(-1120, z - 25);
            const depth = Math.min(
              target,
              -(seabedHeight(x, z) + s.length * 0.24 + 35),
              s.depthMax,
            );
            return { enabled: true, home: new T.Vector3(x, -depth, z) };
          });
          const fitted = fitHawaiiEncounterHabitats(source, bosses),
            pop = population(fitted, ocean);
          assert.equal(
            fitted.reduce((n, s) => n + s.population, 0),
            565,
          );
          for (const [i, boss] of bosses.entries())
            checkSite(boss.home, pop, ocean, `${a.kind}/${b.kind}/${t}/${i}`);
          assert.equal(JSON.stringify(source), before);
        }
      }
  } finally {
    ocean.dispose();
  }
});

test("Fitting is repeatable and preserves every nursery, species identity, body size and reward", () => {
  for (const id of [
    "hawaii",
    "atlantis",
    "bermuda",
    "mariana",
    "amazon",
    "europa",
    "penglai",
    "odyssey",
  ]) {
    const source = getRegionSpecies(id),
      before = JSON.stringify(source),
      again = fitRegionalLordHabitats(id, source);
    assert.equal(JSON.stringify(source), before);
    assert.deepEqual(again, source);
    for (let i = 0; i < source.length; i++)
      for (const key of [
        "kind",
        "length",
        "nutrition",
        "growth",
        "speed",
        "hunterAbility",
      ])
        assert.equal(again[i][key], source[i][key]);
    assert.ok(source.every((s) => s.population > 0));
  }
});

test("Bermuda adult reserves keep their homes while escaping and respawn there after the player retreats", () => {
  const ocean = createBermudaOcean(new T.Group());
  try {
    for (const s of getRegionSpecies("bermuda").filter((e) =>
      ["livyatan", "plesiosaur"].includes(e.kind),
    )) {
      for (let i = 0; i < s.population; i++) {
        const home = initialSpeciesAnchor(s, i),
          position = home.clone(),
          velocity = new T.Vector3();
        for (let frame = 0; frame < 3600; frame++) {
          const desired = steerResidentHabitat(s, i, position, {
            x: -1,
            y: 0,
            z: 1,
          });
          velocity.lerp(
            new T.Vector3(desired.x, desired.y, desired.z).normalize(),
            2 / 30,
          );
          position.addScaledVector(velocity, (s.speed * 1.3) / 30);
          assert.ok(
            position.distanceTo(home) < 38,
            `${s.kind}/${i}: bounded flight`,
          );
        }
        for (const playerPosition of [
          nursery,
          new T.Vector3(230, -550, -1070),
        ]) {
          const p = habitatPosition(s, {
            heightAt: ocean.heightAt,
            colliders: ocean.colliders,
            populationIndex: i,
            near: true,
            playerPosition,
            random: () => 0.5,
          });
          assert.ok(
            p && p.distanceTo(home) < 26,
            `${s.kind}/${i}: resident replenishment`,
          );
        }
      }
    }
  } finally {
    ocean.dispose();
  }
});
