import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import baseline from "./fixtures/odyssey_ecology_48355ee.json" with { type: "json" };
import { getRegionSpecies } from "../src/region_ecology.js";
import {
  ODYSSEY_WORLD as W,
  odysseySeabedHeight as floor,
} from "../src/odyssey_config.js";
import { ODYSSEY_BOSS_INSTANCES as bosses } from "../src/odyssey_lords.js";
import { createOdysseyOcean } from "../src/odyssey_ocean.js";
import {
  habitatPosition,
  initialSpeciesAnchor,
  initialSchoolAnchor,
  schoolHabitat,
  schoolPopulationGroups,
} from "../src/ecosystem_population.js";
import { canPredatorHunt } from "../src/nursery_rules.js";
import { canPredatorRetaliate } from "../src/predator_combat.js";
import { bodyRadius, resolveMotion } from "../src/collision.js";
import { preyMealReward } from "../src/simulation.js";

const roster = getRegionSpecies("odyssey");
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

test("expanded Odyssey preserves all 22 kinds, reward rules and the exact 144 northern residents", () => {
  assert.deepEqual(
    roster.map((s) => s.kind),
    baseline.species.map((s) => s.kind),
  );
  let northern = 0;
  for (const s of roster) {
    const old = baseline.species.find((b) => b.kind === s.kind);
    for (const key of [
      "length",
      "speed",
      "nutrition",
      "growth",
      "predator",
      "schoolSize",
      "residentRadius",
    ])
      assert.equal(s[key], old[key], `${s.kind}: ${key}`);
    const before = old.spawnAnchors.filter((p) => p[2] >= -200);
    assert.deepEqual(
      s.spawnAnchors.filter((p) => p[2] >= -200),
      before,
      s.kind,
    );
    northern += before.length;
    assert.deepEqual(
      s.schoolProfiles?.filter((p) => p.anchor[2] >= -200),
      old.schoolProfiles?.filter((p) => p.anchor[2] >= -200),
      `${s.kind}: northern school depth/capacity`,
    );
    assert.equal(s.population, s.spawnAnchors.length);
    assert.equal(
      schoolPopulationGroups(s).reduce((n, g) => n + g.count, 0),
      s.population,
    );
  }
  assert.equal(northern, 144);
});

test("ordinary stock grows with actual wet area rather than just bounding area", () => {
  let wetArea = 0;
  for (let x = W.minX + 5; x < W.maxX; x += 10)
    for (let z = W.minZ + 5; z < W.maxZ; z += 10)
      if (floor(x, z) < baseline.grid.wetThreshold) wetArea += 100;
  const stock = roster.reduce((n, s) => n + s.population, 0);
  const oldStock = baseline.species.reduce((n, s) => n + s.population, 0);
  assert.equal(stock, 662);
  assert.ok(wetArea > baseline.grid.wetArea * 1.7);
  assert.ok(stock / wetArea >= oldStock / baseline.grid.wetArea);
  assert.equal(roster.find((s) => s.kind === "ceto_serpent").population, 3);
  assert.equal(roster.find((s) => s.kind === "black_sea_nettle").population, 6);
});

test("both side routes offer proportionate food through six descent stages, including the far south", () => {
  for (const z of [-500, -850, -1200, -1550, -1900, -2200])
    for (const x of [-360, 360]) {
      const point = [x, floor(x, z) + 55, z];
      for (const length of [3, 6, 10, 16, 25, 30]) {
        const candidates = roster
          .filter(
            (s) => s.length < length && s.length >= Math.min(18, length * 0.3),
          )
          .flatMap((s) =>
            s.spawnAnchors.map((p) => ({ s, d: distance(point, p) })),
          );
        assert.ok(
          candidates.some(
            ({ s, d }) => d < 250 && preyMealReward(length, s).nutrition >= 14,
          ),
          `${x},${z}: ${length}m food`,
        );
      }
    }
  for (const side of [-1, 1]) {
    const farSchools = roster.flatMap((s) =>
      (s.schoolProfiles || []).filter(
        (p) => p.anchor[2] < -1900 && Math.sign(p.anchor[0]) === side,
      ),
    );
    assert.ok(farSchools.length >= 3);
    assert.ok(farSchools.every((p) => p.count >= 4 && !p.nurseryResident));
  }
});

test("all actual groups and independent residents fit final terrain/solids and ordinary replenishment", () => {
  const ocean = createOdysseyOcean(new T.Group());
  try {
    let seed = 8341;
    const random = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    const nursery = new T.Vector3(0, -18, 75);
    for (const s of roster) {
      if (s.schoolProfiles) {
        for (const group of schoolPopulationGroups(s)) {
          const habitat = schoolHabitat(s, group.index);
          const p = habitatPosition(habitat, {
            heightAt: floor,
            colliders: ocean.colliders,
            anchor: initialSchoolAnchor(s, group.index),
            random,
          });
          assert.ok(p, `${s.kind}: group ${group.index}`);
          assert.ok(-p.y >= habitat.depthMin && -p.y <= habitat.depthMax);
          assert.ok(
            p.x > W.minX && p.x < W.maxX && p.z > W.minZ && p.z < W.maxZ,
          );
        }
      } else {
        const occupied = [];
        for (let i = 0; i < s.population; i++) {
          const p = habitatPosition(s, {
            heightAt: floor,
            colliders: ocean.colliders,
            populationIndex: i,
            occupied,
            random,
          });
          assert.ok(p, `${s.kind}: resident ${i}`);
          occupied.push(p);
          const home = initialSpeciesAnchor(s, i);
          assert.ok(
            p.distanceTo(home) <= s.residentRadius + 1e-6,
            `${s.kind}: fixed home ${i}`,
          );
          if (s.predator)
            assert.equal(canPredatorHunt(s, i, p, nursery), false);
          const respawn = habitatPosition(s, {
            heightAt: floor,
            colliders: ocean.colliders,
            populationIndex: i,
            random,
            near: true,
            playerPosition: nursery,
          });
          assert.ok(respawn, `${s.kind}: ordinary refill ${i}`);
          assert.ok(
            respawn.distanceTo(home) <= s.residentRadius + 1e-6,
            `${s.kind}: refill stays local ${i}`,
          );
        }
      }
    }
  } finally {
    ocean.dispose();
  }
});

test("each moved lord keeps a single adult threat and three reachable bounded recovery meals", () => {
  const ocean = createOdysseyOcean(new T.Group());
  try {
    for (const boss of bosses) {
      const near = roster.flatMap((s) =>
        s.spawnAnchors.map((p) => ({ s, p, d: distance(p, boss.home) })),
      );
      assert.equal(
        near.filter(
          ({ s, d }) =>
            d < 140 &&
            s.predator &&
            canPredatorRetaliate(30, s.length, s.threatCeilingLength),
        ).length,
        1,
        boss.kind,
      );
      const meals = near.filter(
        ({ s, d }) => d < 185 && !s.predator && s.length >= 16,
      );
      assert.equal(meals.length, 3, `${boss.kind}: finite adult reserve`);
      assert.ok(meals.every(({ d }) => d > 100));
      assert.ok(
        near.some(
          ({ s, d }) =>
            d < 180 && s.predator && s.length >= 10 && s.length < 25,
        ),
      );
      for (const { p } of meals)
        for (const reverse of [false, true]) {
          const start = new T.Vector3(...(reverse ? p : boss.home)),
            end = new T.Vector3(...(reverse ? boss.home : p));
          let prev = start.clone();
          for (let step = 1; step <= 40; step++) {
            const next = start.clone().lerp(end, step / 40);
            next.y = Math.max(next.y, floor(next.x, next.z) + 24);
            const moved = resolveMotion(prev, next, {
              colliders: ocean.colliders,
              radius: bodyRadius(30),
              length: 30,
              forward: next.clone().sub(prev).normalize(),
              floorHeight: floor,
              bounds: W,
            });
            assert.equal(
              moved.stuck,
              false,
              `${boss.kind}: adult supply ${reverse}`,
            );
            assert.ok(
              new T.Vector3(
                moved.position.x,
                moved.position.y,
                moved.position.z,
              ).distanceTo(next) < 0.1,
              `${boss.kind}: adult approach ${reverse}`,
            );
            prev = next;
          }
        }
    }
  } finally {
    ocean.dispose();
  }
});
