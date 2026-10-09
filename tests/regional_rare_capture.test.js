import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { REGIONAL_RARES, preyRespawnDelay } from "../src/regional_rare.js";
import { steerElusiveRare } from "../src/regional_rare_pursuit.js";
import {
  createPlayer,
  tickVitals,
  collectPickup,
  consumePrey,
} from "../src/simulation.js";
import { createZombieMinion } from "../src/zombie_minion.js";
import {
  activateSummon,
  canMinionEat,
  consumeMinionPrey,
  createSummonState,
} from "../src/zombie_shark_rules.js";
import {
  preyCaptureRadius,
  frenzyReachBonus,
  frenzyPullDistance,
} from "../src/prey_capture.js";
import { createCreature } from "../src/creatures.js";
import { castSegment } from "../src/collision.js";

test("a legal 5 m summon can capture registered rares without relaxing ordinary prey or exclusions", () => {
  for (const rare of REGIONAL_RARES) {
    const owner = createPlayer("zombie_shark", 5),
      state = createSummonState();
    assert.equal(activateSummon(state, owner), true);
    assert.equal(canMinionEat(owner, rare), true);
    assert.equal(
      canMinionEat(owner, { kind: "tuna", category: "rare", length: 1.8 }),
      false,
    );
    assert.equal(canMinionEat(owner, { kind: "tuna", length: 0.01 }), false);
    for (const flag of [
      { tier: 3 },
      { category: "lord" },
      { boss: true },
      { vehicle: true },
    ])
      assert.equal(canMinionEat(owner, { ...rare, ...flag }), false);
    assert.equal(canMinionEat(owner, { ...rare, length: 5 }), false);
    const mass = owner.mass;
    assert.equal(consumeMinionPrey(state, owner, rare), true);
    assert.deepEqual(
      [owner.health, owner.stamina, owner.hunger],
      [150, 150, 150],
    );
    assert.equal(owner.mass, mass);
    assert.equal(owner.length, 5);
    assert.equal(state.meals, 1);
    assert.equal(consumeMinionPrey(state, owner, rare), false);
    assert.equal(consumePrey(owner, rare), false);
    assert.equal(state.meals, 1);
    assert.equal(owner.eaten, 1);
    assert.equal(preyRespawnDelay(rare), Infinity);
  }
  assert.equal(
    activateSummon(createSummonState(), createPlayer("zombie_shark", 4.99)),
    false,
  );
});

test("Frenzy closes a moving rare within its existing near intake, not from outside its reach", () => {
  for (const rare of REGIONAL_RARES) {
    const player = createPlayer();
    collectPickup(player, "frenzy");
    const radius = preyCaptureRadius(player.length, rare.length, false, true);
    const reach = radius + frenzyReachBonus(player.length);
    assert.equal(
      frenzyPullDistance(reach, radius, player.length, 1 / 60, 12),
      0,
    );
    let distance = radius + frenzyReachBonus(player.length) * 0.65;
    let caught = false;
    for (let i = 0; i < 120; i++) {
      distance += (rare.escapeSpeed - 12) / 60;
      distance -= frenzyPullDistance(
        distance,
        radius,
        player.length,
        1 / 60,
        12,
      );
      if (distance < radius) {
        caught = true;
        break;
      }
    }
    assert.equal(caught, true, rare.kind);
    assert.equal(consumePrey(player, rare), true);
    assert.equal(player.vitalCap, 150);
    assert.equal(consumePrey(player, rare), false);
    assert.equal(player.eaten, 1);
  }
});

for (const wall of [false, true])
  test(`moving rare companion capture respects ${wall ? "a solid wall" : "swept contact, active time and once-only retirement"}`, () => {
    const owner = createPlayer("zombie_shark", 5),
      position = new THREE.Vector3(0, -50, 0),
      forward = new THREE.Vector3(0, 0, -1),
      scene = new THREE.Scene();
    const species = REGIONAL_RARES.find((s) => s.regionId === "hawaii");
    const prey = {
      species,
      mesh: createCreature(species.kind, species.length),
      hiddenFor: 0,
    };
    prey.mesh.position.set(0, -50, -14);
    scene.add(prey.mesh);
    const solids = wall
      ? [
          {
            type: "box",
            x: 0,
            y: -50,
            z: -8,
            halfSize: { x: 300, y: 40, z: 1 },
          },
        ]
      : [];
    let meals = 0;
    const minion = createZombieMinion(scene, {
      blockedBetween: (a, b) => castSegment(a, b, solids) !== null,
      onConsume: (e, state, p) => {
        if (!consumeMinionPrey(state, p, e.species)) return false;
        e.hiddenFor = preyRespawnDelay(e.species);
        meals++;
        return true;
      },
      effects: { mealMist() {}, bite() {}, undeadBurst() {} },
    });
    assert.equal(minion.activate(owner, position, forward), true);
    const before = minion.snapshot();
    minion.update(0, owner, position, forward, [prey]);
    assert.deepEqual(minion.snapshot(), before);
    const direction = new THREE.Vector3(),
      velocity = new THREE.Vector3(0, 0, -1),
      state = {};
    let capturedAt = null;
    for (let i = 0; i < 600; i++) {
      minion.beforePreyMotion();
      tickVitals(owner, 1 / 60);
      if (!wall) position.addScaledVector(forward, 12 / 60);
      if (prey.hiddenFor <= 0) {
        direction.copy(velocity);
        const speed = steerElusiveRare(
          state,
          1 / 60,
          prey.mesh.position,
          position,
          direction,
          7,
          species,
        );
        velocity.lerp(direction, 4 / 60).normalize();
        prey.mesh.position.addScaledVector(velocity, speed / 60);
      }
      minion.update(1 / 60, owner, position, forward, [prey]);
      if (meals && !capturedAt) capturedAt = owner.elapsed;
    }
    assert.equal(meals, wall ? 0 : 1);
    assert.equal(minion.state.meals, meals);
    assert.equal(owner.eaten, meals);
    if (!wall) {
      assert.ok(
        capturedAt > 0.1 && capturedAt < 5,
        `Capture time ${capturedAt}`,
      );
      assert.equal(owner.rareRewardClaimed, species.kind);
      assert.equal(prey.hiddenFor, Infinity);
      assert.equal(owner.length, 5);
      assert.equal(owner.vitalCap, 150);
    } else {
      assert.equal(owner.vitalCap, 100);
      assert.equal(prey.hiddenFor, 0);
    }
    minion.reset();
    assert.equal(minion.active, false);
  });

test("a large companion aligns its posed mouth with a moving rare after a sideways summon", () => {
  for (const seed of [0, 3, 7, 9]) {
    const owner = createPlayer("zombie_shark", 15),
      position = new THREE.Vector3(0, 150, 0),
      forward = new THREE.Vector3(-1, 0, 0);
    const species = REGIONAL_RARES.find((s) => s.regionId === "penglai");
    const prey = {
      species,
      mesh: createCreature(species.kind, species.length),
      hiddenFor: 0,
      velocity: new THREE.Vector3(-1, 0, 0),
    };
    prey.mesh.position.set(0, 150, -12);
    let meals = 0;
    const minion = createZombieMinion(new THREE.Scene(), {
      accessible: () => true,
      blockedBetween: () => false,
      onConsume: (e, state, p) => {
        if (!consumeMinionPrey(state, p, e.species)) return false;
        e.hiddenFor = preyRespawnDelay(e.species);
        meals++;
        return true;
      },
      effects: { mealMist() {}, bite() {}, undeadBurst() {} },
    });
    assert.equal(minion.activate(owner, position, forward), true);
    const direction = new THREE.Vector3(),
      state = {};
    for (let i = 0; i < 6 * 60 && !meals; i++) {
      minion.beforePreyMotion();
      tickVitals(owner, 1 / 60);
      position.addScaledVector(
        forward,
        (5 + 7 * Math.exp(-3 * owner.elapsed)) / 60,
      );
      direction.copy(prey.velocity);
      const speed = steerElusiveRare(
        state,
        1 / 60,
        prey.mesh.position,
        position,
        direction,
        seed,
        species,
      );
      prey.velocity.lerp(direction, 4 / 60).normalize();
      prey.mesh.position.addScaledVector(prey.velocity, speed / 60);
      minion.update(1 / 60, owner, position, forward, [prey]);
    }
    assert.equal(meals, 1, `Sideways seed ${seed}`);
    assert.equal(minion.state.meals, 1);
    assert.equal(prey.hiddenFor, Infinity);
    assert.equal(owner.length, 15);
    assert.equal(owner.vitalCap, 150);
    minion.reset();
  }
});
