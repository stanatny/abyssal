import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getRegionSpecies } from "../src/region_ecology.js";
import { NONFISH_SPECIES } from "../src/nonfish_ecology.js";
import { createOcean, seabedHeight } from "../src/ocean.js";
import {
  habitatPosition,
  initialSchoolAnchor,
  schoolPopulationGroups,
  schoolHabitat,
  schoolSlot,
} from "../src/ecosystem_population.js";
import { isPositionBlocked } from "../src/collision.js";

const hawaii = getRegionSpecies("hawaii"),
  jelly = hawaii.find((s) => s.kind === "moon_jelly"),
  fish = hawaii.find((s) => s.kind === "flying_fish");

test("Hawaii keeps small real jellies in nine discoverable loose groups without changing other seas", () => {
  assert.equal(jelly.population, 36);
  assert.equal(jelly.residentRadius, 6);
  const original = NONFISH_SPECIES.find((s) => s.kind === "moon_jelly");
  for (const key of ["length", "speed", "escapeSpeed", "nutrition", "growth"])
    assert.equal(jelly[key], original[key]);
  for (const region of ["bermuda", "atlantis", "mariana"])
    assert.equal(
      getRegionSpecies(region).find((s) => s.kind === "moon_jelly").population,
      12,
    );
  const o = createOcean(new THREE.Group());
  try {
    for (let group = 0; group < 9; group++) {
      const homes = jelly.spawnAnchors.slice(group * 4, group * 4 + 4),
        center = homes.reduce(
          (p, h) => p.add(new THREE.Vector3(...h).multiplyScalar(0.25)),
          new THREE.Vector3(),
        );
      assert.ok(Math.abs(center.x) <= 12);
      for (let member = 0; member < homes.length; member++) {
        const index = group * 4 + member,
          point = habitatPosition(jelly, {
            heightAt: seabedHeight,
            colliders: o.colliders,
            populationIndex: index,
            random: () => 0.5,
          });
        assert.ok(point);
        assert.ok(point.distanceTo(center) < 7);
        assert.equal(
          isPositionBlocked(point, { colliders: o.colliders, radius: 0.45 }),
          false,
        );
        const replacement = habitatPosition(jelly, {
          heightAt: seabedHeight,
          colliders: o.colliders,
          populationIndex: index,
          playerPosition: new THREE.Vector3(170, -500, -900),
          near: true,
          random: () => 0.5,
        });
        assert.ok(replacement.distanceTo(point) < 1e-8);
      }
    }
  } finally {
    o.dispose();
  }
});

test("thirty flying fish populate four fixed surface schools, including the departure route", () => {
  assert.equal(fish.population, 30);
  const groups = schoolPopulationGroups(fish);
  assert.deepEqual(
    groups.map((g) => g.count),
    [9, 9, 6, 6],
  );
  assert.equal(fish.length, 0.4);
  const o = createOcean(new THREE.Group());
  try {
    const points = [];
    for (const group of groups) {
      const habitat = schoolHabitat(fish, group.index);
      assert.equal(habitat.fixedHabitat, true);
      assert.equal(habitat.nurseryResident, false);
      for (let member = 0; member < group.count; member++) {
        const anchor = initialSchoolAnchor(fish, group.index).add(
            schoolSlot(fish, member),
          ),
          point = habitatPosition(habitat, {
            heightAt: seabedHeight,
            colliders: o.colliders,
            anchor,
            populationIndex: group.start + member,
            random: () => 0.5,
          });
        assert.ok(point);
        assert.ok(-point.y >= 2 && -point.y <= 10);
        assert.equal(
          isPositionBlocked(point, { colliders: o.colliders, radius: 0.45 }),
          false,
        );
        points.push(point);
      }
    }
    const start = new THREE.Vector3(0, -18, 75);
    assert.equal(points.filter((p) => p.distanceTo(start) < 40).length, 9);
    assert.ok(Math.min(...points.map((p) => p.distanceTo(start))) < 22);
    assert.equal(points.length, fish.population);
  } finally {
    o.dispose();
  }
});
