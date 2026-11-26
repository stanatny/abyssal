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
import { assertNumericReference } from "./helpers/bermuda_numeric_reference.js";

import previousTideEcology from "./fixtures/odyssey_tide_ecology_665_20261125.json" with { type: "json" };
import {
  TIDE_GATE_SITES,
  TIDE_MEAL_HABITATS,
  createTideLayout,
} from "../src/odyssey_tide_layout.js";
import { castBodySegment, isPositionBlocked } from "../src/collision.js";
const roster = getRegionSpecies("odyssey");
const oldAnchors = (s) =>
  previousTideEcology.species.find((p) => p.kind === s.kind).spawnAnchors;
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

function assertPriorTideAnchors(actual, expected, label) {
  return assertNumericReference(actual, expected, {
    label,
    // 仅计算得到的非整数坐标允许纳米级libm差异；整数、类型、顺序和形状保持精确。
    toleranceFor: (path, value) =>
      /^\/\d+\/[012]$/.test(path) && !Number.isInteger(value) ? 1e-9 : 0,
  });
}

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
  assert.equal(stock, 677);
  assert.deepEqual(
    roster.map((s) => s.kind),
    previousTideEcology.species.map((s) => s.kind),
    "all prior665 species identities and order",
  );
  for (const s of roster)
    assertPriorTideAnchors(
      s.spawnAnchors.slice(0, oldAnchors(s).length),
      oldAnchors(s),
      `${s.kind}: all prior665 anchors preserved`,
    );
  assert.ok(wetArea > baseline.grid.wetArea * 1.7);
  assert.ok(stock / wetArea >= oldStock / baseline.grid.wetArea);
  assert.equal(roster.find((s) => s.kind === "ceto_serpent").population, 3);
  assert.equal(roster.find((s) => s.kind === "black_sea_nettle").population, 6);
});

test("prior665 anchor preservation accepts the Linux libm witness while rejecting real reference mutations", () => {
  const expected = oldAnchors({ kind: "naga_huntress" }),
    linux = structuredClone(expected);
  assert.equal(expected.length, 12);
  assert.equal(expected[6][0], -14.136729153913464);
  linux[6][0] = -14.136729153913455;
  const report = assertPriorTideAnchors(
    linux,
    expected,
    "actual Linux witness",
  );
  assert.equal(report.numbers, 36);
  assert.equal(report.toleratedDifferences, 1);
  assert.equal(report.maxAbsoluteDifference, 8.881784197001252e-15);
  const reject = (label, mutate) => {
    const changed = structuredClone(linux);
    mutate(changed);
    assert.throws(
      () => assertPriorTideAnchors(changed, expected, label),
      { name: "AssertionError" },
      label,
    );
  };
  reject("computed coordinate drift", (a) => (a[6][0] += 1e-6));
  reject("row reorder", (a) => ([a[0], a[1]] = [a[1], a[0]]));
  reject("missing prior resident", (a) => a.pop());
  reject("extra prior resident", (a) => a.push(a[0].slice()));
  reject("coordinate shape", (a) => a[6].push(0));
  reject("stringified coordinate", (a) => (a[6][0] = String(a[6][0])));
  assert.equal(Number.isInteger(expected[0][0]), true);
  reject("raw integer coordinate stays exact", (a) => (a[0][0] += 1e-10));
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
    for (const boss of bosses.filter((b) =>
      ["karkinos", "scylla", "charybdis"].includes(b.kind),
    )) {
      const near = roster.flatMap((s) =>
        oldAnchors(s).map((p) => ({ s, p, d: distance(p, boss.home) })),
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

test("the fourth territory retains three independent adult meals without moving the existing reserve or adding Ceto", () => {
  const boss = bosses.find((b) => ["ladon", "polyphemus"].includes(b.kind));
  assert.ok(boss);
  const meals = ["bronze_turtle", "oracle_whale", "thalassa_manta"].map(
    (kind) => {
      const species = roster.find((entry) => entry.kind === kind);
      const anchor = oldAnchors(species).at(-1);
      assert.ok(!species.predator && species.length >= 16, kind);
      assert.ok(
        distance(anchor, boss.home) > 100 && distance(anchor, boss.home) < 220,
        kind,
      );
      return { kind, anchor };
    },
  );
  assert.equal(new Set(meals.map(({ anchor }) => anchor.join(","))).size, 3);
  assert.equal(roster.find((s) => s.kind === "ceto_serpent").population, 3);
  for (const { kind, anchor } of meals) {
    const species = roster.find((s) => s.kind === kind);
    assert.equal(species.population, species.spawnAnchors.length);
    assert.notDeepEqual(anchor, species.spawnAnchors[0]);
    assert.ok(
      anchor[1] > floor(anchor[0], anchor[2]) + bodyRadius(species.length),
    );
  }
});

test("each tide station adds three real adult meals with ordinary refill and two grown-body roundtrip routes", () => {
  const ocean = createOdysseyOcean(new T.Group());
  try {
    assert.equal(TIDE_MEAL_HABITATS.length, 12);
    assert.equal(
      new Set(TIDE_MEAL_HABITATS.map((m) => m.anchor.join(","))).size,
      12,
    );
    assert.equal(
      previousTideEcology.species.reduce(
        (n, s) => n + s.spawnAnchors.length,
        0,
      ),
      665,
    );
    let seed = 62631;
    const random = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (const species of roster) {
      const additions = TIDE_MEAL_HABITATS.filter(
        (m) => m.kind === species.kind,
      );
      assert.deepEqual(
        species.spawnAnchors.slice(oldAnchors(species).length),
        additions.map((m) => m.anchor),
      );
      if (!additions.length) continue;
      assert.equal(additions.length, 4);
      assert.equal(species.predator, false);
      assert.ok(
        species.length < 30 && preyMealReward(30, species).nutrition >= 99,
      );
      for (let i = 0; i < additions.length; i++) {
        const index = oldAnchors(species).length + i,
          home = new T.Vector3(...additions[i].anchor);
        for (const near of [false, true]) {
          const placed = habitatPosition(species, {
            heightAt: floor,
            colliders: ocean.colliders,
            populationIndex: index,
            random,
            near,
            playerPosition: new T.Vector3(0, -18, 75),
          });
          assert.ok(
            placed,
            `${species.kind}: ordinary ${near ? "refill" : "spawn"}`,
          );
          assert.ok(placed.distanceTo(home) <= species.residentRadius + 1e-6);
        }
        for (let angle = 0; angle < 8; angle++)
          assert.equal(
            isPositionBlocked(home, {
              colliders: ocean.colliders,
              length: species.length,
              radius: bodyRadius(species.length),
              forward: new T.Vector3(
                Math.sin((angle * Math.PI) / 4),
                0,
                Math.cos((angle * Math.PI) / 4),
              ),
            }),
            false,
            `${additions[i].gate}: prey visible body`,
          );
      }
    }
    for (const definition of TIDE_GATE_SITES) {
      const layout = createTideLayout(definition, floor),
        front = new T.Vector3(...layout.front);
      const meals = TIDE_MEAL_HABITATS.filter((m) => m.gate === definition.id);
      assert.equal(meals.length, 3);
      for (const control of [...layout.rotors, layout.master]) {
        const start = new T.Vector3(...control.position).addScaledVector(
          front,
          30 * 0.42 + 1,
        );
        let reachable = 0;
        for (const meal of meals) {
          const species = roster.find((s) => s.kind === meal.kind),
            end = new T.Vector3(...meal.anchor),
            forward = end.clone().sub(start).normalize();
          if (
            castBodySegment(start, end, {
              colliders: ocean.colliders,
              length: 30,
              radius: bodyRadius(30),
              forward,
            })
          )
            continue;
          let minimum = Infinity;
          for (let t = 0; t <= 1.0001; t += 0.025)
            for (const offset of [-12.6, 0, 12.6])
              for (const dx of [-3.9, 0, 3.9]) {
                const point = start
                  .clone()
                  .lerp(end, t)
                  .addScaledVector(forward, offset);
                minimum = Math.min(
                  minimum,
                  point.y - 3.9 - ocean.contactSurface(point.x + dx, point.z),
                );
              }
          // 12m/s普通游速，计入鱼在30m栖地内远离的追逐与额外返程，不借助冲刺或保护。
          const seconds =
            (2 * start.distanceTo(end)) / 12 +
            species.residentRadius / (12 - species.speed) +
            species.residentRadius / 12;
          if (minimum > 0.25 && seconds < 30) reachable++;
        }
        assert.ok(
          reachable >= 2,
          `${control.id}: ordinary adult feeding roundtrip`,
        );
      }
    }
  } finally {
    ocean.dispose();
  }
});
