import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  REGIONAL_RARES,
  getRegionalRare,
  chooseRareHabitat,
  preyRespawnDelay,
} from "../src/regional_rare.js";
import {
  createPlayer,
  consumePrey,
  consumeDefeatedPrey,
  applyNutrition,
  tickVitals,
  collectPickup,
  vitalLimit,
} from "../src/simulation.js";
import {
  activateSummon,
  createSummonState,
  consumeMinionPrey,
} from "../src/zombie_shark_rules.js";
import { createCreature } from "../src/creatures.js";
import { steerElusiveRare } from "../src/regional_rare_pursuit.js";
import { BOSS_SPECIES, createBossState, hitBoss } from "../src/boss_rules.js";
import { aquaticHeading } from "../src/aquatic_reptile_motion.js";

test("seven exclusive rares leave the ordinary roster separate and require sprint-speed pursuit", () => {
  assert.equal(REGIONAL_RARES.length, 7);
  assert.equal(new Set(REGIONAL_RARES.map((s) => s.regionId)).size, 7);
  for (const s of REGIONAL_RARES) {
    assert.equal(getRegionalRare(s.regionId), s);
    assert.equal(s.population, 1);
    assert.ok(s.speed > 12 && s.escapeSpeed < 32);
    assert.equal(preyRespawnDelay(s), Infinity);
    assert.ok(s.length < 3);
  }
  assert.equal(preyRespawnDelay({ schoolSize: 8 }), 18);
  assert.equal(preyRespawnDelay({ schoolSize: 1 }), 28);
});
for (const consume of [consumePrey, consumeDefeatedPrey])
  test(`${consume.name} awards once without changing body length, and new rounds reset caps`, () => {
    const p = createPlayer();
    p.health = 21;
    p.hunger = 14;
    p.stamina = 8;
    p.exhausted = true;
    const before = { length: p.length, mass: p.mass };
    assert.equal(consume(p, REGIONAL_RARES[0]), true);
    assert.equal(vitalLimit(p), 150);
    for (const k of ["health", "hunger", "stamina"]) assert.equal(p[k], 150);
    assert.equal(p.length, before.length);
    assert.equal(p.mass, before.mass);
    assert.equal(p.eaten, 1);
    assert.equal(p.exhausted, false);
    assert.equal(consume(p, REGIONAL_RARES[0]), false);
    assert.equal(p.eaten, 1);
    assert.equal(vitalLimit(createPlayer()), 100);
    p.health = 120;
    p.hunger = 120;
    p.stamina = 120;
    applyNutrition(p, { nutrition: 100, growth: 0 });
    collectPickup(p, "stamina");
    for (const k of ["health", "hunger", "stamina"]) assert.equal(p[k], 150);
    p.stamina = 1;
    collectPickup(p, "flow");
    assert.equal(p.stamina, 150);
    p.stamina = 145;
    tickVitals(p, 1);
    assert.equal(p.stamina, 150);
  });
test("companion meal preserves the 150 cap; settled rounds cannot claim", () => {
  const p = createPlayer("zombie_shark", 10),
    s = createSummonState();
  activateSummon(s, p);
  assert.equal(consumeMinionPrey(s, p, REGIONAL_RARES[0]), true);
  assert.equal(p.stamina, 150);
  assert.equal(p.eaten, 1);
  for (const k of ["dead", "won", "timedOut"]) {
    const q = createPlayer();
    q[k] = true;
    assert.equal(consumePrey(q, REGIONAL_RARES[0]), false);
    assert.equal(q.vitalCap, 100);
  }
});
test("rare models have finite fully posed geometry, distinct silhouettes and independent motion", () => {
  const shapes = [];
  for (const s of REGIONAL_RARES) {
    const m = createCreature(s.kind, 1),
      b = createCreature(s.kind, 1);
    const poses = [];
    for (let t = 0; t < 4; t += 0.2) {
      m.userData.animate(t, 2);
      m.updateMatrixWorld(true);
      const bounds = new THREE.Box3(),
        v = new THREE.Vector3();
      m.traverse((o) => {
        if (!o.isMesh) return;
        if (o.isSkinnedMesh) o.skeleton.update();
        for (let i = 0; i < o.geometry.attributes.position.count; i++) {
          o.getVertexPosition(i, v).applyMatrix4(o.matrixWorld);
          assert.ok(v.toArray().every(Number.isFinite), s.kind);
          bounds.expandByPoint(v);
        }
      });
      poses.push(bounds.getSize(new THREE.Vector3()).toArray());
    }
    shapes.push(poses[0]);
    assert.equal(b.userData.artRevision, "regional_rare_v1");
    assert.ok(poses[0][2] > 0.8 && poses[0][2] < 1.2, s.kind);
  }
  assert.equal(
    new Set(shapes.map((s) => s.map((v) => v.toFixed(2)).join(","))).size,
    7,
  );
});
test("aquatic heading preserves dorsal-up turns without upside-down flips", () => {
  const q = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 32; i++) {
    const d = new THREE.Vector3(
      Math.sin(i * 0.3),
      Math.cos(i * 0.8),
      Math.cos(i * 0.3),
    );
    aquaticHeading(q, d);
    assert.ok(up.clone().applyQuaternion(q).y > 0.79);
  }
});

test("rare search areas vary per expedition without mutating the shared registry", () => {
  for (const spec of REGIONAL_RARES) {
    const original = JSON.stringify(spec);
    const homes = [0, 0.4, 0.8].map((n) => chooseRareHabitat(spec, () => n));
    assert.equal(
      new Set(homes.map((s) => JSON.stringify(s.spawnAnchors))).size,
      3,
    );
    for (const home of homes) {
      assert.equal(home.spawnAnchors.length, 1);
      assert.equal(home.population, 1);
      assert.ok(Math.abs(home.spawnAnchors[0][2]) > 180);
      assert.equal(home.depthMax - home.depthMin, 60);
    }
    assert.equal(JSON.stringify(spec), original);
  }
});

test("a dodging rare outruns ordinary swimming but can be intercepted with baseline sprint", () => {
  for (const speed of [12, 32]) {
    const point = new THREE.Vector3(0, 0, -24),
      player = new THREE.Vector3(),
      direction = new THREE.Vector3(),
      velocity = new THREE.Vector3(0, 0, -1),
      state = {};
    let caught = false;
    const headings = [];
    for (let i = 0; i < 12 * 60; i++) {
      direction.copy(point).sub(player).normalize();
      const preySpeed = steerElusiveRare(
        state,
        1 / 60,
        point,
        player,
        direction,
        7,
        REGIONAL_RARES[0],
      );
      velocity.lerp(direction, 4 / 60).normalize();
      point.addScaledVector(velocity, preySpeed / 60);
      player.addScaledVector(
        new THREE.Vector3().copy(point).sub(player).normalize(),
        speed / 60,
      );
      headings.push(Math.atan2(velocity.x, -velocity.z));
      if (point.distanceTo(player) < 2.5) {
        caught = true;
        break;
      }
    }
    assert.equal(caught, speed === 32);
    assert.ok(Math.max(...headings) - Math.min(...headings) > 0.15);
  }
});

test("crocodilian shoulders remain stable while the posterior body and tail deform", () => {
  for (const kind of [
    "black_caiman",
    "saltwater_crocodile",
    "purussaurus",
    "rootback_colossus",
    "rootjaw",
  ]) {
    const model = createCreature(kind, 1),
      skin = [];
    model.traverse((o) => {
      if (o.isSkinnedMesh && o.userData.crocodilianRig) skin.push(o);
    });
    assert.ok(skin.length, kind);
    const body = skin[0],
      p = body.geometry.attributes.position,
      rigid = [],
      tail = [];
    for (let i = 0; i < p.count; i += 7) {
      if (p.getZ(i) < 0.1 && body.geometry.attributes.skinIndex.getX(i) < 7)
        rigid.push(i);
      if (p.getZ(i) > 0.7) tail.push(i);
    }
    model.userData.animate(0, 1);
    model.updateMatrixWorld(true);
    body.skeleton.update();
    const before = rigid.map((i) =>
      body.getVertexPosition(i, new THREE.Vector3()),
    );
    const tailBefore = tail.map((i) =>
      body.getVertexPosition(i, new THREE.Vector3()),
    );
    let maximum = 0;
    for (let t = 0.1; t < 7; t += 0.1) {
      model.userData.animate(t, 2.2);
      model.updateMatrixWorld(true);
      body.skeleton.update();
      rigid.forEach((i, k) =>
        assert.ok(
          body.getVertexPosition(i, new THREE.Vector3()).distanceTo(before[k]) <
            1e-6,
          kind,
        ),
      );
      tail.forEach(
        (i, k) =>
          (maximum = Math.max(
            maximum,
            body
              .getVertexPosition(i, new THREE.Vector3())
              .distanceTo(tailBefore[k]),
          )),
      );
    }
    assert.ok(maximum > 0.015, kind);
  }
});

test("validated lord hits replenish hunger to the raised limit without granting health or growth", () => {
  const p = createPlayer();
  consumePrey(p, REGIONAL_RARES[0]);
  p.length = 25;
  p.mass = (25 / 6) ** 3;
  p.health = 110;
  p.hunger = 146;
  const b = createBossState(BOSS_SPECIES[0]),
    mass = p.mass;
  const result = hitBoss(p, b, { inRange: true, isFlank: true });
  assert.equal(result.hit, true);
  assert.equal(result.hungerRestored, 4);
  assert.equal(p.hunger, 150);
  assert.equal(p.health, 110);
  assert.equal(p.mass, mass);
  const repeated = hitBoss(p, b, { inRange: true, isFlank: true });
  assert.equal(repeated.hit, false);
  assert.equal(p.hunger, 150);
});
