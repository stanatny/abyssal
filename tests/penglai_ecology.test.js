import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getRegionSpecies } from "../src/region_ecology.js";
import { createPenglaiOcean } from "../src/penglai_ocean.js";
import { PENGLAI_GUARDIANS } from "../src/penglai_config.js";
import {
  initialSpeciesAnchor,
  habitatPosition,
  schoolHabitat,
  schoolPopulationGroups,
  schoolSlot,
} from "../src/ecosystem_population.js";
import { aerialFormationPose } from "../src/aerial_flocks.js";
import { canPredatorRetaliate } from "../src/predator_combat.js";
import { canPredatorHunt } from "../src/nursery_rules.js";
import { preyMealReward } from "../src/simulation.js";
import { castBodySegment, bodyRadius } from "../src/collision.js";

const roster = getRegionSpecies("penglai"),
  find = (kind) => roster.find((s) => s.kind === kind);
const centers = Object.fromEntries(
  PENGLAI_GUARDIANS.map((b) => [b.id, new THREE.Vector3(...b.home)]),
);
// 真君由实际模型与山顶巨剑的净空拟合抬升；原生测试另核对真实 home。
centers.penglai_sage = new THREE.Vector3(0, 385, -650);

test("Penglai retains all 20 base species with less stock and finite adult reserves", () => {
  assert.equal(roster.length, 20);
  assert.equal(
    roster.reduce((n, s) => n + s.population, 0),
    393,
  );
  assert.equal(find("jade_minnow").population, 40);
  assert.equal(find("lotus_sprite").population, 32);
  for (const s of roster) {
    assert.ok(Object.isFrozen(s));
    if (s.schoolProfiles)
      assert.equal(
        schoolPopulationGroups(s).reduce((n, g) => n + g.count, 0),
        s.population,
      );
  }
  assert.equal(find("bashe").population, 6);
  assert.equal(find("taotie").population, 2);
  assert.equal(find("pool_hujiao").population, 1);
  assert.equal(
    find("spirit_carp")
      .schoolProfiles.filter((p) => p.depthMin > 0)
      .reduce((n, p) => n + p.count, 0),
    6,
  );
});

test("Five lord territories each have a legal resident capable of retaliating against 30m", () => {
  const ocean = createPenglaiOcean(new THREE.Group());
  try {
    for (const [id, kind, index] of [
      ["penglai_azure", "bashe", 1],
      ["penglai_bird", "bashe", 0],
      ["penglai_sage", "bashe", 2],
      ["penglai_tiger", "taotie", 0],
      ["penglai_tortoise", "pool_hujiao", 0],
    ]) {
      const s = find(kind),
        home = initialSpeciesAnchor(s, index),
        p = habitatPosition(s, {
          anchor: home,
          populationIndex: index,
          heightAt: s.groundbound ? ocean.groundHeightAt : ocean.heightAt,
          colliders: ocean.colliders,
        });
      assert.ok(p, `${id} spawn`);
      assert.ok(p.distanceTo(centers[id]) < 120, `${id} nearby home`);
      assert.ok(canPredatorRetaliate(30, s.length, s.threatCeilingLength));
      assert.ok(canPredatorHunt(s, index, p, centers[id]));
      assert.equal(
        canPredatorHunt(s, index, p, new THREE.Vector3(0, -18, 75)),
        false,
      );
      const respawn = habitatPosition(s, {
        near: true,
        playerPosition: new THREE.Vector3(0, -18, 75),
        populationIndex: index,
        heightAt: s.groundbound ? ocean.groundHeightAt : ocean.heightAt,
        colliders: ocean.colliders,
      });
      assert.ok(
        respawn &&
          Math.hypot(respawn.x - home.x, respawn.z - home.z) <=
            s.residentRadius,
      );
    }
  } finally {
    ocean.dispose();
  }
});

test("Limited aerial/pool food has adult access, meaningful meals and a legal complete flight circuit", () => {
  const ocean = createPenglaiOcean(new THREE.Group());
  try {
    for (const [id, kind, group] of [
      ["penglai_azure", "bifang", 1],
      ["penglai_bird", "cloud_crane", 1],
      ["penglai_sage", "bifang", 2],
      ["penglai_tortoise", "spirit_carp", 4],
      ["penglai_tortoise", "spirit_carp", 5],
      ["penglai_tortoise", "spirit_carp", 6],
    ]) {
      const s = find(kind),
        h = schoolHabitat(s, group),
        center = new THREE.Vector3(...h.anchor),
        school = { species: s, habitat: h, center, seed: 0 };
      assert.ok(h.count <= 3 && h.fixedHabitat);
      assert.ok(preyMealReward(30, s).nutrition >= 7);
      for (let phase = 0; phase < 24; phase++)
        for (let slot = 0; slot < h.count; slot++) {
          const p = center.clone();
          if (h.depthMin < 0)
            aerialFormationPose(
              school,
              schoolSlot(s, slot),
              (((phase * Math.PI) / 12) * h.flightRadius) / (s.speed * 0.85),
              p,
              new THREE.Vector3(),
            );
          else p.add(schoolSlot(s, slot));
          assert.ok(
            p.distanceTo(centers[id]) < 155,
            `${id} food remains local`,
          );
          for (const length of [25, 30])
            assert.equal(
              !!castBodySegment(centers[id], p, {
                colliders: ocean.colliders,
                radius: bodyRadius(length),
                length,
                forward: p.clone().sub(centers[id]).normalize(),
              }),
              false,
              `${id} food route`,
            );
          assert.ok(
            p.y > ocean.heightAt(p.x, p.z) + s.length * 0.35 + 3,
            `${id} terrain`,
          );
        }
    }
  } finally {
    ocean.dispose();
  }
});

test("Tiger food uses three separated ground homes, not an aerial school", () => {
  const s = find("lushu");
  assert.ok(s.groundbound && s.independentMovement && !s.flying);
  assert.equal(s.scatterPopulation, false);
  const points = [0, 1, 2].map((i) => initialSpeciesAnchor(s, i));
  for (const p of points) assert.ok(p.distanceTo(centers.penglai_tiger) < 115);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < i; j++) assert.ok(points[i].distanceTo(points[j]) > 45);
});

test("Profile flight radius does not change ordinary flocks", () => {
  const s = find("cloud_crane"),
    center = new THREE.Vector3(),
    slot = new THREE.Vector3(),
    a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    t = new THREE.Vector3();
  for (let time = 0; time < 30; time++) {
    aerialFormationPose({ species: s, center, seed: 1 }, slot, time, a, t);
    aerialFormationPose(
      { species: s, center, seed: 1, habitat: { depthMin: -100 } },
      slot,
      time,
      b,
      t,
    );
    assert.deepEqual(a, b);
  }
});

test("Kun residents include a visible monastery cloud route and retain two high-cloud homes", () => {
  const s = find("kun"),
    ocean = createPenglaiOcean(new THREE.Group());
  try {
    assert.equal(s.population, 4);
    for (let i = 0; i < 4; i++) {
      const home = initialSpeciesAnchor(s, i);
      const p = habitatPosition(s, {
        anchor: home,
        populationIndex: i,
        heightAt: ocean.heightAt,
        colliders: ocean.colliders,
      });
      assert.ok(p && p.distanceTo(home) < 1);
      assert.ok(p.y > ocean.heightAt(p.x, p.z) + s.length);
      if (i < 2) {
        const overlook = new THREE.Vector3(0, 330, -750);
        assert.ok(p.distanceTo(overlook) < s.smoothVisibilityDistance);
        assert.ok(p.y < 400);
      } else assert.ok(p.y >= 470);
    }
  } finally {
    ocean.dispose();
  }
});
