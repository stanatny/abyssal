import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createPlayer } from "../src/simulation.js";
import { castSegment } from "../src/collision.js";
import { createSubmarineDefense } from "../src/submarine_defense.js";

function fixture(t, { position = [0, -200, -490], length = 10 } = {}) {
  const scene = new THREE.Scene(),
    submarine = {
      id: "pressure_submarine",
      mesh: new THREE.Group(),
      state: { destroyed: false },
    },
    launches = [],
    warnings = [],
    damage = [],
    explosions = [];
  submarine.mesh.position.set(0, -200, -400);
  submarine.mesh.userData.launchTorpedoVisual = (_, now) => launches.push(now);
  scene.add(submarine.mesh);
  let walls = [];
  const defense = createSubmarineDefense(scene, {
    submarines: [submarine],
    castWorld: (from, to, radius) => castSegment(from, to, walls, radius),
    notify: (text) => warnings.push(typeof text === "string" ? text : ""),
    onDamage: (amount) => damage.push(amount),
    explode: (point) => explosions.push(new THREE.Vector3().copy(point)),
  });
  t.after(() => defense.dispose());
  const player = createPlayer("orca", length),
    at = new THREE.Vector3(...position),
    forward = new THREE.Vector3(1, 0, 0);
  return {
    defense,
    submarine,
    player,
    at,
    forward,
    launches,
    warnings,
    damage,
    explosions,
    step: (dt, now) => defense.update(dt, now, player, at, forward),
    setWalls: (next) => (walls = next),
    arm: (point, direction = [0, 0, -1]) => {
      submarine.state.destroyed = true;
      const projectile = defense.projectiles[0];
      projectile.active = true;
      projectile.mesh.visible = true;
      projectile.mesh.position.set(...point);
      projectile.previous.copy(projectile.mesh.position);
      projectile.direction.set(...direction);
      projectile.age = 0;
      return projectile;
    },
  };
}

test("Sustained submarine pressure repeats its full warning and fires four straight shots within 43 active seconds", (t) => {
  const w = fixture(t),
    pool = w.defense.projectiles.map((p) => p.mesh.uuid);
  for (let frame = 0; frame < 43 * 20; frame++)
    w.step(0.05, (frame + 1) * 0.05);
  assert.equal(w.launches.length, 4);
  t.diagnostic(JSON.stringify({ launchTimes: w.launches }));
  for (let i = 1; i < w.launches.length; i++) {
    const interval = w.launches[i] - w.launches[i - 1];
    assert.ok(
      interval >= 10.1 && interval <= 10.3,
      `Launch interval ${interval}`,
    );
  }
  assert.ok(
    w.launches[1] < 19,
    "The next shot no longer waits for the old 14-second cooldown",
  );
  assert.equal(w.warnings.filter((s) => s.includes("潜艇正在锁定")).length, 4);
  assert.equal(w.warnings.filter((s) => s.includes("鱼雷已发射")).length, 4);
  assert.deepEqual(
    w.defense.projectiles.map((p) => p.mesh.uuid),
    pool,
  );
  assert.equal(pool.length, 6);
});

test("Faster torpedoes travel twelve metres per quarter second without homing; zero-delta pause freezes flight and windup", (t) => {
  const w = fixture(t),
    p = w.arm([0, -200, -400]),
    direction = p.direction.clone();
  w.at.set(50, -200, -460);
  w.step(0.25, 10);
  assert.ok(
    p.mesh.position.distanceTo(new THREE.Vector3(0, -200, -412)) < 1e-8,
  );
  assert.deepEqual(p.direction, direction);
  const position = p.mesh.position.clone(),
    age = p.age;
  w.step(0, 100);
  assert.deepEqual(p.mesh.position, position);
  assert.equal(p.age, age);
  w.defense.reset();
  w.submarine.state.destroyed = false;
  w.at.set(0, -200, -490);
  w.step(0.1, 10);
  const remaining = w.defense.states.get(w.submarine.id).remaining;
  assert.ok(remaining > 2);
  w.step(0, 500);
  assert.equal(w.defense.states.get(w.submarine.id).remaining, remaining);
  assert.equal(w.launches.length, 0);
});

test("A faster long step cannot cross thin cover or skip a moving player, and each actual hit settles once", (t) => {
  const cover = fixture(t),
    coveredShot = cover.arm([0, -200, -400]);
  cover.setWalls([
    { type: "box", x: 0, y: -200, z: -420, halfSize: { x: 4, y: 4, z: 0.15 } },
  ]);
  cover.step(0.5, 10);
  assert.equal(coveredShot.active, false);
  assert.equal(cover.explosions.length, 1);
  assert.ok(cover.explosions[0].z > -420);
  assert.deepEqual(cover.damage, []);
  assert.equal(cover.player.health, 100);

  const crossing = fixture(t),
    shot = crossing.arm([0, -200, -430]),
    previous = new THREE.Vector3(20, -200, -440);
  crossing.at.set(-20, -200, -440);
  crossing.forward.set(0, 0, -1);
  crossing.defense.recordMovement(previous, crossing.at);
  crossing.step(0.4, 12);
  assert.equal(shot.active, false);
  assert.deepEqual(crossing.damage, [20]);
  assert.equal(crossing.player.health, 80);
  crossing.step(0.4, 13);
  assert.deepEqual(crossing.damage, [20]);
  assert.equal(crossing.explosions.length, 1);
});

test("Juvenile and nursery protection still applies to faster incoming shots; reset reuses and clears the pool", (t) => {
  for (const mode of ["juvenile", "nursery"]) {
    const w = fixture(t, { length: mode === "juvenile" ? 7.99 : 10 }),
      point = mode === "nursery" ? [0, -18, 70] : [0, -200, -440];
    w.at.set(...point);
    const p = w.arm([point[0], point[1], point[2] + 10]),
      pool = w.defense.projectiles.map((entry) => entry.mesh.uuid);
    w.step(0.5, 12);
    assert.equal(p.active, false, mode);
    assert.equal(w.player.health, 100, mode);
    assert.deepEqual(w.damage, [], mode);
    w.defense.reset();
    assert.equal(w.defense.threat, null);
    assert.equal(w.defense.states.size, 1);
    assert.ok(
      w.defense.projectiles.every(
        (entry) => !entry.active && !entry.mesh.visible,
      ),
    );
    assert.deepEqual(
      w.defense.projectiles.map((entry) => entry.mesh.uuid),
      pool,
    );
  }
});
