import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getRegionSpecies } from "../src/region_ecology.js";
import {
  ODYSSEY_WORLD as W,
  odysseySeabedHeight as floor,
  odysseyLegacySeabedHeight as oldFloor,
} from "../src/odyssey_config.js";
import { ODYSSEY_BOSS_INSTANCES as bosses } from "../src/odyssey_lords.js";
import { createOdysseyOcean } from "../src/odyssey_ocean.js";
import {
  habitatPosition,
  initialSpeciesAnchor,
} from "../src/ecosystem_population.js";
import { canPredatorRetaliate } from "../src/predator_combat.js";
import { bodyRadius, resolveMotion } from "../src/collision.js";
import { createOdysseyShallows } from "../src/odyssey_shallows.js";
const roster = getRegionSpecies("odyssey");

test("expanded Odyssey preserves the accepted shoreline and opens the deeper route", () => {
  assert.ok((W.maxX - W.minX) * (W.maxZ - W.minZ) > 2 * 600 * 1290);
  for (let x = -295; x < 300; x += 11)
    for (let z = -199; z < 140; z += 13)
      assert.equal(floor(x, z), oldFloor(x, z));
  assert.ok(floor(190, -1430) < -850);
  for (let x = -470; x < 480; x += 12)
    assert.ok(Math.abs(floor(x, -200.001) - floor(x, -199.999)) < 0.02);
});

test("final population, full-body placement and normal resident replenishment fit the expanded terrain", () => {
  const ocean = createOdysseyOcean(new THREE.Group());
  try {
    assert.equal(roster.length, 21);
    assert.equal(
      roster.reduce((n, s) => n + s.population, 0),
      323,
    );
    let seed = 73;
    const random = () =>
      (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (const species of roster)
      for (let i = 0; i < species.population; i++) {
        const p = habitatPosition(species, {
          heightAt: floor,
          colliders: ocean.colliders,
          populationIndex: i,
          random,
        });
        assert.ok(p, `${species.kind}:${i}`);
        assert.ok(p.x > W.minX && p.x < W.maxX && p.z > W.minZ && p.z < W.maxZ);
        if (species.residentRadius) {
          const respawn = habitatPosition(species, {
            heightAt: floor,
            colliders: ocean.colliders,
            populationIndex: i,
            random,
            near: true,
            playerPosition: new THREE.Vector3(0, -20, 75),
          });
          assert.ok(respawn, `respawn ${species.kind}:${i}`);
          const home = initialSpeciesAnchor(species, i);
          assert.ok(
            Math.hypot(respawn.x - home.x, respawn.z - home.z) <=
              species.residentRadius + 0.01,
          );
        }
      }
  } finally {
    ocean.dispose();
  }
});

test("each guardian has a nearby adult threat and two or three adult meals outside its centre", () => {
  for (const boss of bosses) {
    const nearby = roster.flatMap((s) =>
      s.spawnAnchors.map((p) => ({
        s,
        p,
        d: Math.hypot(...p.map((v, i) => v - boss.home[i])),
      })),
    );
    const hunters = nearby.filter(
      (e) =>
        e.d < 140 &&
        e.s.predator &&
        canPredatorRetaliate(30, e.s.length, e.s.threatCeilingLength),
    );
    assert.equal(hunters.length, 1, boss.kind);
    const meals = nearby.filter(
      (e) => e.d < 185 && !e.s.predator && e.s.length >= 16,
    );
    assert.ok(
      meals.length >= 2 && meals.length <= 3,
      `${boss.kind}: ${meals.length}`,
    );
    assert.ok(meals.every((e) => e.d > 100));
  }
});

test("adult bodies can reach guardian side supplies and return through the final collider set", () => {
  const ocean = createOdysseyOcean(new THREE.Group()),
    radius = bodyRadius(30);
  try {
    for (const boss of bosses) {
      const meals = roster
        .filter((s) => !s.predator && s.length >= 16)
        .flatMap((s) => s.spawnAnchors)
        .filter((p) => Math.hypot(...p.map((v, i) => v - boss.home[i])) < 185);
      for (const meal of meals)
        for (const direction of [1, -1]) {
          const start = new THREE.Vector3(
              ...(direction === 1 ? boss.home : meal),
            ),
            end = new THREE.Vector3(...(direction === 1 ? meal : boss.home));
          let prev = start.clone();
          for (let i = 1; i <= 40; i++) {
            const next = start.clone().lerp(end, i / 40);
            next.y = Math.max(next.y, floor(next.x, next.z) + 24);
            const result = resolveMotion(prev, next, {
              colliders: ocean.colliders,
              radius,
              length: 30,
              forward: next.clone().sub(prev).normalize(),
              floorHeight: floor,
              bounds: W,
            });
            assert.equal(result.stuck, false, boss.kind);
            assert.ok(
              new THREE.Vector3(
                result.position.x,
                result.position.y,
                result.position.z,
              ).distanceTo(next) < 0.1,
              `${boss.kind} supply route`,
            );
            prev = next;
          }
        }
    }
  } finally {
    ocean.dispose();
  }
});

test("late scenery import after region exit cannot attach resources; failures retain existing scenery", async () => {
  const parent = new THREE.Group(),
    held = [],
    keep = (r) => (held.push(r), r);
  let resolve;
  const pending = new Promise((r) => (resolve = r));
  let created = false;
  const a = createOdysseyShallows(parent, keep, {
    rows: {},
    fallbacks: [],
    heightAt: () => 0,
    loadAssets: () => pending,
  });
  const done = a.prepare();
  held[0].dispose();
  resolve({
    createOdysseyShallowAssets() {
      created = true;
      return {};
    },
  });
  await done;
  assert.equal(created, false);
  assert.equal(parent.children.length, 0);
  const fallback = new THREE.Group();
  const b = createOdysseyShallows(parent, keep, {
    rows: {},
    fallbacks: [fallback],
    heightAt: () => 0,
    loadAssets: () => Promise.reject(Error("offline")),
  });
  await b.prepare();
  assert.equal(b.state.status, "error");
  assert.equal(fallback.visible, true);
  held.at(-1).dispose();
});
