import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { uprightHeadingQuaternion } from "../src/ground_creatures.js";
import {
  aerialFormationPose,
  createAerialSpacing,
} from "../src/aerial_flocks.js";
import {
  createBossState,
  bossEngagement,
  tickBoss,
} from "../src/boss_rules.js";
import { PENGLAI_LORDS } from "../src/penglai_lords.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import { PENGLAI_SUMMIT_ROUTES } from "../src/penglai_routes.js";
import { createPenglaiOcean } from "../src/penglai_ocean.js";
import { penglaiHeightAt } from "../src/penglai_config.js";
import { createCreature } from "../src/creatures.js";
import {
  schoolSlot,
  schoolPopulationGroups,
  schoolHabitat,
} from "../src/ecosystem_population.js";

test("Ground turns retain world up through opposite headings and vertical jump targets", () => {
  const q = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= 360; i++) {
    const a = (i * Math.PI) / 180,
      d = new THREE.Vector3(Math.sin(a), Math.sin(a) * 100, Math.cos(a));
    uprightHeadingQuaternion(q, d);
    assert.ok(up.clone().applyQuaternion(q).distanceTo(up) < 1e-10);
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    assert.ok(Math.abs(f.y) < 1e-10);
    assert.ok(f.x * d.x + f.z * d.z > 0.99999);
  }
  uprightHeadingQuaternion(q, { x: 0, y: 100, z: 0 }, 1.3);
  assert.ok(up.clone().applyQuaternion(q).distanceTo(up) < 1e-10);
});
test("Sage pursuit starts on unlock without territorial entry, persists outside, resets and leaves other guardians territorial", () => {
  const sage = createBossState(
    PENGLAI_LORDS.find((s) => s.kind === "sword_sage"),
  );
  sage.locked = true;
  assert.equal(bossEngagement(sage, true), false);
  assert.equal(sage.pursuitStarted, false);
  sage.locked = false;
  assert.equal(bossEngagement(sage, false), true);
  assert.equal(bossEngagement(sage, true), true);
  assert.equal(bossEngagement(sage, false), true);
  tickBoss(sage, 0.1, {
    inTerritory: bossEngagement(sage, false),
    distance: 100,
  });
  assert.equal(sage.phase, "hunt");
  assert.equal(createBossState(sage.species).pursuitStarted, false);
  const tiger = createBossState(
    PENGLAI_LORDS.find((s) => s.kind === "white_tiger"),
  );
  bossEngagement(tiger, true);
  assert.equal(bossEngagement(tiger, false), false);
  const hidden = createBossState(sage.species);
  hidden.pursuitStarted = true;
  tickBoss(hidden, 0.1, {
    inTerritory: true,
    distance: 500,
    lineOfSight: false,
  });
  assert.equal(hidden.phase, "hunt");
  sage.defeated = true;
  assert.equal(bossEngagement(sage, true), false);
});
test("Aerial formation has a moving tangent and wing clearance; separation excludes retired birds", () => {
  const s = getRegionSpecies("penglai").find((s) => s.kind === "cloud_crane"),
    school = { species: s, center: new THREE.Vector3(0, 150, 0), seed: 0 },
    p = new THREE.Vector3(),
    t = new THREE.Vector3();
  aerialFormationPose(school, schoolSlot(s, 0), 0, p, t);
  const before = p.clone();
  aerialFormationPose(school, schoolSlot(s, 0), 1, p, t);
  assert.ok(p.distanceTo(before) > 12);
  assert.ok(Math.abs(t.length() - 1) < 1e-8);
  const a = {
      species: s,
      mesh: { position: new THREE.Vector3(0, 0, 0) },
      hiddenFor: 0,
    },
    b = {
      species: s,
      mesh: { position: new THREE.Vector3(2, 0, 0) },
      hiddenFor: 0,
    },
    spacing = createAerialSpacing(),
    d = new THREE.Vector3(0, 0, -1);
  spacing.rebuild([a, b]);
  spacing.steer(a, d);
  assert.ok(d.x < -0.4);
  b.hiddenFor = 10;
  spacing.rebuild([a, b]);
  d.set(0, 0, -1);
  spacing.steer(a, d);
  assert.equal(d.x, 0);
});
test("Northern pool provides real medium food school profiles and large hunters with ordinary respawn homes", () => {
  const roster = getRegionSpecies("penglai"),
    carp = roster.find((s) => s.kind === "spirit_carp"),
    h = roster.find((s) => s.kind === "hujiao");
  const groups = schoolPopulationGroups(carp).map((g) => ({
    ...g,
    habitat: schoolHabitat(carp, g.index),
  }));
  const northern = groups.filter(
    (g) =>
      g.habitat.depthMin > 0 &&
      g.habitat.schoolAnchors?.some((p) => p[2] < -1000),
  );
  assert.equal(
    northern.reduce((n, g) => n + g.count, 0),
    18,
  );
  assert.equal(h.spawnAnchors.filter((p) => p[2] < -995).length, 16);
  assert.ok(
    new Set(
      h.spawnAnchors.filter((p) => p[2] < -995).map((p) => `${p[0]},${p[2]}`),
    ).size >= 4,
  );
  assert.ok(carp.length >= 6 && h.length >= 15 && h.length < 25);
});
test("Complete summit paths attach to terrain and monastery has physical facade/soffit closure", () => {
  const o = createPenglaiOcean(new THREE.Group());
  assert.equal(PENGLAI_SUMMIT_ROUTES.length, 6);
  for (const r of PENGLAI_SUMMIT_ROUTES) {
    assert.deepEqual(r.points.at(-1), r.top);
    for (let i = 1; i < r.points.length; i++)
      assert.ok(
        Math.hypot(
          r.points[i].x - r.points[i - 1].x,
          r.points[i].z - r.points[i - 1].z,
        ) < 9,
      );
  }
  const paths = o.root.getObjectByName("continuous_summit_stone_paths");
  assert.equal(paths.children.length, 6);
  for (const m of paths.children) {
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++)
      assert.ok(
        Math.abs(p.getY(i) - penglaiHeightAt(p.getX(i), p.getZ(i)) - 0.65) <
          0.005,
      );
  }
  for (const kind of [
    "monastery_side_wall",
    "monastery_rear_wall",
    "monastery_closed_doors",
    "monastery_eave_soffit",
    "monastery_upper_chamber",
  ]) {
    assert.ok(
      o.colliders.some((c) => c.kind === kind),
      kind,
    );
  }
  o.dispose();
});
test("Tiger poses have connected independent limb joints and leave gameplay root upright", () => {
  const a = createCreature("white_tiger", 48),
    b = createCreature("white_tiger", 48);
  const poses = [];
  for (const phase of ["dormant", "windup", "attack", "recover"]) {
    a.userData.setBossPhase(phase);
    a.userData.animate(1, 1.5);
    a.updateMatrixWorld(true);
    poses.push(
      a.children[0].children[0].children
        .find((n) => n.isGroup && n.position.x > 0.1)
        .matrixWorld.clone(),
    );
    assert.deepEqual(a.quaternion.toArray(), [0, 0, 0, 1]);
  }
  assert.notDeepEqual(poses[1].elements, poses[2].elements);
  assert.deepEqual(b.quaternion.toArray(), [0, 0, 0, 1]);
});

test("Ground locomotion locks a horizontal leap and limits normal turning, with travel-driven gait", async () => {
  const { stepGroundHeading, stepGroundCreature, groundGaitState } =
    await import("../src/ground_creatures.js");
  const direction = new THREE.Vector3(0, 0, -1),
    state = { cooldown: 0 };
  const ctx = {
    hunting: true,
    distance: 8,
    targetHeight: 4,
    groundHeight: 0,
    length: 13,
  };
  stepGroundCreature(state, 1 / 60, ctx);
  const initial = direction.clone();
  stepGroundHeading(direction, { x: 0, y: 100, z: 1 }, 1 / 60, state);
  assert.ok(direction.distanceTo(initial) < 1e-10);
  stepGroundCreature(state, 0.7, ctx);
  for (let i = 0; i < 70; i++) {
    stepGroundCreature(state, 1 / 60, ctx);
    stepGroundHeading(
      direction,
      { x: Math.sin(i), y: 100, z: 1 },
      1 / 60,
      state,
    );
    assert.ok(direction.distanceTo(initial) < 1e-10);
    const q = uprightHeadingQuaternion(new THREE.Quaternion(), direction);
    assert.equal(new THREE.Vector3(0, 1, 0).applyQuaternion(q).y, 1);
  }
  const resting = groundGaitState(state, 0, 13, 1 / 60);
  assert.equal(
    groundGaitState(state, 0, 13, 1 / 60).gaitPhase,
    resting.gaitPhase,
  );
  assert.ok(groundGaitState(state, 4, 13, 1).gaitPhase > resting.gaitPhase);
  state.phase = "walk";
  const before = direction.clone();
  stepGroundHeading(direction, { x: 0, y: 0, z: 1 }, 1 / 60, state);
  assert.ok(direction.angleTo(before) <= 1.8 / 60 + 1e-8);
  assert.ok(Math.abs(direction.length() - 1) < 1e-10);
});
