import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getRegionSpecies } from "../src/region_ecology.js";
import { createEuropaOcean } from "../src/europa_ocean.js";
import { getExpedition } from "../src/expedition_config.js";
import {
  habitatPosition,
  initialSpeciesAnchor,
} from "../src/ecosystem_population.js";
import { bodyRadius, castBodySegment } from "../src/collision.js";
import { canPredatorRetaliate } from "../src/predator_combat.js";
import { canPredatorHunt, isNursery } from "../src/nursery_rules.js";
import { preyMealReward, hungerDrainRate } from "../src/simulation.js";
import { fitEuropaEcology } from "../src/europa_ecology.js";

const stocks = {
  glass_seed: 65,
  ribbon_spore: 50,
  tripod_bloom: 35,
  sail_crawler: 40,
  lantern_pod: 36,
  veil_glider: 32,
  forkjaw_stalker: 12,
  crown_filterer: 15,
  prism_hunter: 10,
  bell_carrier: 12,
  siphon_colossus: 9,
  spiral_grazer: 9,
  rift_reaver: 3,
  void_siphon: 2,
  brine_rosette: 10,
  hinge_walker: 12,
};

test("Europa fitting retains each final stock and immutable, independent homes", () => {
  const species = getRegionSpecies("europa");
  assert.deepEqual(
    Object.fromEntries(species.map((s) => [s.kind, s.population])),
    stocks,
  );
  assert.equal(
    species.reduce((n, s) => n + s.population, 0),
    352,
  );
  const before = JSON.stringify(species);
  const fitted = fitEuropaEcology(species);
  assert.equal(JSON.stringify(species), before);
  for (const s of fitted.filter((s) => s.largePreyDispersed && !s.predator)) {
    assert.equal(s.schoolSize, 1);
    assert.equal(s.spawnAnchors.length, s.population);
    assert.equal(
      new Set(s.spawnAnchors.map((a) => a.join())).size,
      s.population,
    );
    assert.ok(Object.isFrozen(s.spawnAnchors));
  }
});

test("Every Europa lord has three accessible adult meals and one 30m threat, without nursery or ship food", () => {
  const ocean = createEuropaOcean(new THREE.Group());
  try {
    const adults = [];
    for (const s of getRegionSpecies("europa").filter((s) => s.length >= 10)) {
      const occupied = [];
      for (let i = 0; i < s.population; i++) {
        const home = initialSpeciesAnchor(s, i);
        const p = habitatPosition(s, {
          heightAt: ocean.heightAt,
          colliders: ocean.colliders,
          anchor: home,
          populationIndex: i,
          occupied,
        });
        assert.ok(p, `${s.kind} ${i}`);
        assert.ok(p.distanceTo(home) <= s.residentRadius + 1e-8);
        occupied.push(p);
        const local = ocean.researchWreck.root.worldToLocal(p.clone());
        assert.ok(
          Math.abs(local.x) > 32 ||
            Math.abs(local.z) > 82 ||
            local.y < 0 ||
            local.y > 41,
          `${s.kind} is outside the pressure hull`,
        );
        adults.push({ s, p, i });
      }
    }
    for (const boss of getExpedition("europa").region.bossInstances) {
      const center = new THREE.Vector3(...boss.home);
      const near = adults.filter((e) => e.p.distanceTo(center) < 180);
      const food = near.filter((e) => !e.s.predator && e.s.length < 25);
      assert.equal(food.length, 3, `${boss.id} finite reserve`);
      for (const e of food) {
        assert.ok(
          e.p.distanceTo(center) >= 60 && e.p.distanceTo(center) <= 130,
        );
        for (const length of [25, 30]) {
          assert.equal(
            !!castBodySegment(center, e.p, {
              colliders: ocean.colliders,
              radius: bodyRadius(length),
              length,
              forward: e.p.clone().sub(center).normalize(),
            }),
            false,
            `${boss.id} ${e.s.kind}: adult food route`,
          );
          assert.ok(preyMealReward(length, e.s).nutrition >= 40);
          const travel = e.p.distanceTo(center) / 12;
          assert.ok(travel * hungerDrainRate(length, -center.y) < 40);
        }
      }
      const threats = near.filter(
        (e) =>
          e.s.predator &&
          canPredatorRetaliate(30, e.s.length, e.s.threatCeilingLength),
      );
      assert.equal(threats.length, 1, boss.id);
      const e = threats[0];
      for (const prey of food)
        assert.ok(
          prey.p.distanceTo(e.p) >
            prey.s.length * prey.s.swimClearance +
              e.s.length * e.s.swimClearance +
              3,
          `${boss.id}: feeding and predator bodies spawn separately`,
        );
      assert.ok(e.p.distanceTo(center) < 110);
      assert.ok(canPredatorHunt(e.s, e.i, e.p, center));
      assert.ok(-center.y >= e.s.depthMin - 20);
      assert.equal(isNursery(e.p), false);
      assert.equal(
        canPredatorHunt(e.s, e.i, e.p, new THREE.Vector3(0, -18, 75)),
        false,
      );
    }
  } finally {
    ocean.dispose();
  }
});
