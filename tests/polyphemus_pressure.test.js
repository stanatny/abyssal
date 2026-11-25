import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createBossState, tickBoss } from "../src/boss_rules.js";
import { ODYSSEY_LORDS } from "../src/odyssey_lords.js";
import { POLYPHEMUS_SITE } from "../src/odyssey_polyphemus_site.js";
import {
  BOULDER,
  boulderFlight,
  createPolyphemusBoulders,
} from "../src/polyphemus_boulder.js";
import { creatureGuideSkills } from "../src/creature_guide_skills.js";
import { CREATURE_SKILLS_EN } from "../src/locales/creature_skills_en.js";
const giant = ODYSSEY_LORDS.find((s) => s.kind === "polyphemus");
function sample(species, distance, seconds = 60) {
  const state = createBossState(species),
    starts = [];
  for (let frame = 0; frame < seconds * 100; frame++) {
    const count = state.attackCount;
    tickBoss(state, 0.01, {
      inTerritory: distance < POLYPHEMUS_SITE.radius,
      distance,
      lineOfSight: true,
    });
    if (state.attackCount !== count) starts.push((frame + 1) / 100);
  }
  return { state, starts };
}
test("the live giant has materially denser volleys and genuinely engages beyond the old territory", () => {
  const previous = {
    ...giant,
    huntDuration: 1,
    windupDuration: 3,
    attackDuration: 2,
    abilityTimings: { boulder: { windup: 3, attack: 2, recover: 4.5 } },
  };
  const now = sample(giant, 100),
    old = sample(previous, 100);
  assert.ok(now.starts.length >= old.starts.length * 1.45);
  for (let i = 1; i < now.starts.length; i++)
    assert.ok(Math.abs(now.starts[i] - now.starts[i - 1] - 6.8) < 0.011);
  assert.ok(
    sample(giant, 190).starts.length > 0,
    "the expanded range must work outside the old170m territory",
  );
  assert.equal(
    sample(giant, 605).starts.length,
    0,
    "new attacks still need actual engagement range",
  );
  assert.equal(
    sample(giant, 625).starts.length,
    0,
    "the giant cannot follow the player out of its territory",
  );
  assert.equal(giant.damage, 30);
  assert.equal(giant.minAttackLength, 25);
  assert.ok(giant.abilityTimings.boulder.recover >= 2.8);
});
test("a warned throw arrives faster without homing or removing its finite flight floor", () => {
  const a = new THREE.Vector3(0, -70, 0),
    b = new THREE.Vector3(0, -70, -150);
  const old = boulderFlight(a, b, 70),
    now = boulderFlight(a, b, giant.projectileSpeed);
  assert.ok(now.duration <= old.duration * 0.68);
  assert.equal(
    boulderFlight(
      a,
      a.clone().add(new THREE.Vector3(0, 0, -1)),
      giant.projectileSpeed,
    ).duration,
    0.16,
  );
  assert.equal(BOULDER.speed, giant.projectileSpeed);
  assert.equal(BOULDER.release, 0.42);
});
function impactFixture(t) {
  const scene = new THREE.Scene(),
    root = new THREE.Group(),
    anchor = new THREE.Object3D();
  root.add(anchor);
  scene.add(root);
  root.userData.throwAnchor = anchor;
  root.userData.getThrowAnchorWorldPosition = (out) =>
    anchor.getWorldPosition(out);
  const entry = {
    enabled: true,
    mesh: root,
    lockTarget: new THREE.Vector3(0, 0, -100),
    playerRadius: 30 * 0.16,
    state: {
      phase: "windup",
      timer: 0,
      phaseDuration: giant.windupDuration,
      defeated: false,
      species: giant,
    },
  };
  const system = createPolyphemusBoulders(scene),
    hits = [],
    position = entry.lockTarget.clone().add(new THREE.Vector3(35, 0, 0));
  t.after(() => system.dispose());
  const step = (dt) =>
    system.update(entry, dt, 0, position, position, {
      hit: (n) => hits.push(n),
    });
  step(0.01);
  return { entry, system, hits, position, step };
}
test("the wider visible warning and actual same-layer ring threaten the old safe fringe once, but a depth escape remains clear", (t) => {
  const f = impactFixture(t),
    d = f.system.entries.get(f.entry);
  assert.equal(d.surge.scale.x, 42);
  assert.ok(
    35 > 24 + 3 + f.entry.playerRadius,
    "station was outside the preceding attack",
  );
  f.entry.state.phase = "attack";
  f.entry.state.phaseDuration = giant.attackDuration;
  f.entry.state.timer = giant.attackDuration * BOULDER.release;
  for (let i = 0; i < 350; i++) f.step(0.01);
  assert.deepEqual(f.hits, [21]);
  assert.equal(d.flight, null);
  assert.equal(d.wave.visible, false);
  const escaped = impactFixture(t);
  escaped.position.y += 20;
  escaped.entry.state.phase = "attack";
  escaped.entry.state.phaseDuration = giant.attackDuration;
  escaped.entry.state.timer = giant.attackDuration * BOULDER.release;
  for (let i = 0; i < 350; i++) escaped.step(0.01);
  assert.deepEqual(escaped.hits, []);
});
test("the bilingual live Guide exposes the faster windup, enlarged ring and real remaining counter window", () => {
  const [skill] = creatureGuideSkills(giant);
  assert.ok(skill.description.includes(`${giant.windupDuration}秒`));
  assert.ok(skill.description.includes(`${giant.projectileSpeed}米/秒`));
  assert.ok(skill.description.includes(`${BOULDER.waveRadius}米`));
  const en = CREATURE_SKILLS_EN[skill.description];
  assert.ok(en && !/[\u4e00-\u9fff]/.test(en));
  assert.ok(en.includes("6.8 seconds") && en.includes("38 m"));
});
