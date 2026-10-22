import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { ALL_SPECIES } from "../src/region_ecology.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";
import {
  prepareOrdinaryBody,
  updateOrdinaryBody,
  ordinaryBodyEnabled,
  nearbyOrdinaryBodies,
  stopOrdinaryAtPlayer,
} from "../src/ordinary_body.js";
import {
  bodyRadius,
  resolveMotion,
  isPositionBlocked,
} from "../src/collision.js";
import { predatorBiteContact } from "../src/predator_combat.js";

const roster = [
  ...new Map(
    ALL_SPECIES.filter((s) => s.length >= 8).map((s) => [s.kind, s]),
  ).values(),
];
const forward = new THREE.Vector3(0, 0, -1);
const options = (length) => ({ radius: bodyRadius(length), length, forward });

test("all large ordinary kinds block player body sweeps and follow actual instance transforms", () => {
  for (const s of roster) {
    const mesh = createCreature(s.kind, s.length, 91),
      parent = new THREE.Group();
    parent.add(mesh);
    parent.position.set(13, -200, -270);
    parent.rotation.y = 0.8;
    for (const t of [0, 1.3, 3]) {
      mesh.userData.animate(t, 2);
      const colliders = updateOrdinaryBody(mesh);
      assert.ok(colliders.length > 0 && colliders.length <= 30, s.kind);
      const c = [...colliders].sort(
        (a, b) =>
          b.axes.x * b.axes.y * b.axes.z - a.axes.x * a.axes.y * a.axes.z,
      )[0];
      const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(c.rotation),
        center = new THREE.Vector3(c.x, c.y, c.z);
      const start = center.clone().addScaledVector(axis, s.length + 10),
        end = center.clone().addScaledVector(axis, -s.length - 10);
      const opts = { ...options(3), forward: axis, colliders };
      const motion = resolveMotion(start, end, opts);
      assert.ok(motion.blocked, s.kind);
      assert.ok(!motion.stuck, s.kind);
      assert.ok(!isPositionBlocked(motion.position, opts), s.kind);
    }
    const before = updateOrdinaryBody(mesh).map((c) => c.x);
    parent.position.x += 100;
    updateOrdinaryBody(mesh).forEach((c, i) =>
      assert.ok(Math.abs(c.x - before[i] - 100) < 1e-4, s.kind),
    );
    mesh.userData.disposeLocalMotion?.();
  }
});

test("relative sweep stops a fast pursuer without moving the player, regardless of damage immunity/cooldown", () => {
  for (const kind of ["ichthyotitan", "sperm_whale", "pliosaur", "megalodon"]) {
    const mesh = createCreature(kind, 28, 91),
      e = { mesh, species: { length: 28 }, hiddenFor: 0, cooldown: 100 };
    const player = new THREE.Vector3(0, 0, 0),
      previous = new THREE.Vector3(0, 0, 35);
    mesh.position.set(0, 0, -35);
    assert.ok(stopOrdinaryAtPlayer(e, previous, player, forward, 3), kind);
    assert.deepEqual(player.toArray(), [0, 0, 0]);
    assert.ok(mesh.position.distanceTo(previous) < 70, kind);
    assert.ok(
      !isPositionBlocked(player, {
        ...options(3),
        colliders: updateOrdinaryBody(mesh),
      }),
      kind,
    );
    mesh.userData.disposeLocalMotion?.();
  }
});

test("mouth attacks remain reachable before solid core contact", () => {
  for (const species of roster.filter((s) => s.predator)) {
    const kind = species.kind;
    const mesh = createCreature(kind, species.length, 91),
      e = { mesh, species, hiddenFor: 0 };
    const player = new THREE.Vector3(0, 0, -species.length);
    let hit = false;
    for (let i = 0; i < Math.ceil(species.length * 8); i++) {
      const previous = mesh.position.clone();
      mesh.position.z -= 0.25;
      hit ||= predatorBiteContact({
        previousPredator: previous,
        predator: mesh.position,
        predatorForward: forward,
        predatorLength: species.length,
        previousPlayer: player,
        player,
        playerForward: forward,
        playerLength: 3,
        edible: false,
      });
      stopOrdinaryAtPlayer(e, previous, player, forward, 3);
    }
    assert.ok(hit, kind);
    mesh.userData.disposeLocalMotion?.();
  }
});

test("edible, retired, small prey and existing lord collision remain separate", () => {
  const mesh = createCreature("ichthyotitan", 28),
    e = { mesh, species: { length: 28 }, hiddenFor: 0 };
  assert.ok(ordinaryBodyEnabled(e, 3));
  assert.ok(!ordinaryBodyEnabled(e, 30));
  e.hiddenFor = 2;
  assert.ok(!ordinaryBodyEnabled(e, 3));
  assert.equal(nearbyOrdinaryBodies([e], new THREE.Vector3(), 3).length, 0);
  e.hiddenFor = 0;
  mesh.position.x = 1000;
  assert.equal(nearbyOrdinaryBodies([e], new THREE.Vector3(), 3).length, 0);
  for (const s of BOSS_SPECIES) {
    const lord = createCreature(s.kind, s.length);
    assert.ok(lord.userData.lordBody);
    assert.equal(lord.userData.ordinaryBody, undefined);
    lord.userData.disposeLocalMotion?.();
  }
  const small = createCreature("fish", 1);
  assert.equal(small.userData.ordinaryBody, undefined);
  mesh.userData.disposeLocalMotion?.();
  small.userData.disposeLocalMotion?.();
});

test("fitting and updates preserve skin buffers, independent bodies and bounded shared profiles", () => {
  const a = createCreature("ichthyotitan", 28),
    b = createCreature("ichthyotitan", 28);
  const skin = a.userData.hfRig.mesh,
    p = skin.geometry.attributes.position.array,
    before = p.slice();
  const cs = updateOrdinaryBody(a),
    original = cs.map((c) => [c.x, c.y, c.z]);
  b.position.set(100, 100, 100);
  b.userData.animate(4, 3);
  updateOrdinaryBody(b);
  assert.deepEqual(
    cs.map((c) => [c.x, c.y, c.z]),
    original,
  );
  assert.deepEqual(p, before);
  const state = a.userData.ordinaryBody;
  prepareOrdinaryBody(a);
  assert.equal(a.userData.ordinaryBody, state);
  a.userData.disposeLocalMotion();
  b.userData.disposeLocalMotion();
});
