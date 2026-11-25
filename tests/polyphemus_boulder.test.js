import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  BOULDER,
  boulderFlight,
  boulderPoint,
  boulderContactTime,
  polyphemusCanAim,
  polyphemusThrowTarget,
  createPolyphemusBoulders,
} from "../src/polyphemus_boulder.js";

function fixture(t, target = new THREE.Vector3(0, -70, -70)) {
  const scene = new THREE.Scene(),
    root = new THREE.Group(),
    anchor = new THREE.Object3D();
  root.position.set(5, -100, 3);
  anchor.position.set(-5, 30, -3);
  root.add(anchor);
  scene.add(root);
  root.userData.throwAnchor = anchor;
  root.userData.getThrowAnchorWorldPosition = (out) =>
    anchor.getWorldPosition(out);
  const entry = {
    enabled: true,
    mesh: root,
    lockTarget: target.clone(),
    playerRadius: 1,
    state: {
      phase: "windup",
      timer: 0,
      phaseDuration: 2,
      defeated: false,
      species: { length: 90, projectileSpeed: 70, damage: 30 },
    },
  };
  const system = createPolyphemusBoulders(scene),
    hits = [];
  t.after(() => system.dispose());
  const position = new THREE.Vector3(100, -70, -70),
    from = position.clone();
  const step = (dt = 0.05, options = {}) => {
    system.update(entry, dt, 0, from, position, {
      hit: (...args) => {
        hits.push(args);
        return true;
      },
      ...options,
    });
    from.copy(position);
    return system.entries.get(entry);
  };
  const launch = () => {
    entry.state.phase = "attack";
    entry.state.phaseDuration = 2;
    entry.state.timer = 2 * BOULDER.release;
    return step();
  };
  return {
    scene,
    root,
    anchor,
    entry,
    system,
    hits,
    position,
    from,
    step,
    launch,
  };
}

test("the finite parabola reaches its exact locked target and relative sweep catches crossing motion", () => {
  const origin = new THREE.Vector3(4, -50, 10),
    target = new THREE.Vector3(-5, -90, -80),
    flight = boulderFlight(origin, target);
  assert.ok(boulderPoint(flight, 0).distanceTo(origin) < 1e-9);
  assert.ok(boulderPoint(flight, flight.duration).distanceTo(target) < 1e-9);
  assert.ok(
    flight.duration >= BOULDER.minFlightTime &&
      flight.duration <= BOULDER.maxFlightTime,
  );
  assert.equal(
    boulderContactTime(
      new THREE.Vector3(-10, 0, 0),
      new THREE.Vector3(10, 0, 0),
      new THREE.Vector3(0, -10, 0),
      new THREE.Vector3(0, 10, 0),
      1,
    ) !== null,
    true,
  );
  assert.equal(
    boulderContactTime(
      new THREE.Vector3(-10, 0, 0),
      new THREE.Vector3(10, 0, 0),
      new THREE.Vector3(0, -10, 8),
      new THREE.Vector3(0, 10, 8),
      1,
    ),
    null,
  );
});

test("only the fixed giant's frontal160-degree sector can begin aiming", () => {
  const identity = new THREE.Quaternion();
  for (const degrees of [-80, -45, 0, 45, 80]) {
    const direction = new THREE.Vector3(
      Math.sin((degrees * Math.PI) / 180),
      20,
      -Math.cos((degrees * Math.PI) / 180),
    );
    assert.equal(polyphemusCanAim(identity, direction), true, String(degrees));
  }
  for (const degrees of [-100, 100, 180]) {
    const direction = new THREE.Vector3(
      Math.sin((degrees * Math.PI) / 180),
      0,
      -Math.cos((degrees * Math.PI) / 180),
    );
    assert.equal(polyphemusCanAim(identity, direction), false, String(degrees));
  }
});

test("actual palm release, locked warning endpoints and rock/maximum-wave footprints share dimensions", (t) => {
  const f = fixture(t),
    d = f.step();
  assert.equal(d.held.parent, f.anchor);
  assert.equal(d.held.scale.x, BOULDER.size / 90);
  assert.equal(d.landing.scale.x, f.system.radius);
  assert.equal(d.surge.scale.x, BOULDER.waveRadius + BOULDER.waveWidth);
  const p = d.warning.geometry.attributes.position;
  const first = new THREE.Vector3().fromBufferAttribute(p, 0),
    last = new THREE.Vector3().fromBufferAttribute(p, p.count - 1);
  assert.ok(
    first.distanceTo(f.anchor.getWorldPosition(new THREE.Vector3())) < 1e-5,
  );
  assert.ok(last.distanceTo(f.entry.lockTarget) < 1e-5);
  const rootBefore = f.root.position.clone(),
    qBefore = f.root.quaternion.clone();
  f.launch();
  assert.ok(
    d.flight.origin.distanceTo(f.anchor.getWorldPosition(new THREE.Vector3())) <
      1e-9,
  );
  assert.ok(d.flying.position.distanceTo(d.flight.origin) < 1e-9);
  assert.equal(d.held.visible, false);
  assert.equal(d.warning.visible, false);
  assert.deepEqual(f.root.position, rootBefore);
  assert.deepEqual(f.root.quaternion.toArray(), qBefore.toArray());
});

test("a direct moving boulder calls shared damage once and finishes its bounded lifecycle", (t) => {
  const f = fixture(t);
  f.step();
  f.position.copy(f.entry.lockTarget);
  f.from.copy(f.position);
  const d = f.launch();
  for (let i = 0; i < 100; i++) f.step();
  assert.equal(f.hits.length, 1);
  assert.equal(f.hits[0][0], 30);
  assert.equal(d.flight, null);
  assert.equal(d.flying.visible, false);
  assert.equal(d.wave.visible, false);
  assert.equal(f.entry.state.health, undefined);
});

test("lateral or depth dodge avoids the real stone and impact ring", (t) => {
  const f = fixture(t);
  f.step();
  const d = f.launch();
  f.position.copy(f.entry.lockTarget).add(new THREE.Vector3(35, 20, 0));
  f.from.copy(f.position);
  for (let i = 0; i < 100; i++) f.step();
  assert.equal(f.hits.length, 0);
  assert.equal(d.flight, null);
  assert.equal(d.wave.visible, false);
});

test("finite-radius cover clips warning and actual impact before a wall and protects the far side", (t) => {
  const f = fixture(t);
  f.position.copy(f.entry.lockTarget);
  f.from.copy(f.position);
  let radiusQueries = 0;
  const blocked = (a, b, radius = 0) => {
    if (radius > 0) radiusQueries++;
    return Math.min(a.z, b.z) - radius <= -30;
  };
  const d = f.step(0.05, { blocked });
  assert.ok(d.landing.position.z > -30 + f.system.radius - 0.01);
  f.entry.state.phase = "attack";
  f.entry.state.phaseDuration = 2;
  f.entry.state.timer = 2 * BOULDER.release;
  f.step(0.05, { blocked });
  for (let i = 0; i < 100; i++) f.step(0.05, { blocked });
  assert.ok(radiusQueries > 0);
  assert.equal(f.hits.length, 0);
  assert.ok(d.wave.position.z > -30 + f.system.radius - 0.05);
  assert.equal(d.flight, null);
});

test("an expanding ring is consumed once even when shared damage rejects due to protection", (t) => {
  const f = fixture(t),
    d = f.step();
  f.launch();
  f.position.copy(f.entry.lockTarget).add(new THREE.Vector3(18, 0, 0));
  f.from.copy(f.position);
  let attempts = 0;
  for (let i = 0; i < 100; i++)
    f.step(0.05, {
      hit: () => {
        attempts++;
        return false;
      },
    });
  assert.equal(attempts, 1);
  assert.equal(d.hit, true);
  assert.equal(d.wave.visible, false);
});

test("paused/invalid updates cannot launch, move, grade or delay damage; reset and disposal clear resources", async (t) => {
  const f = fixture(t);
  const d = f.step();
  f.launch();
  f.step(0.1);
  const age = d.age,
    position = d.flying.position.clone(),
    hits = f.hits.length;
  for (const dt of [0, -1, NaN, Infinity]) f.step(dt);
  f.step(10, { active: false });
  assert.equal(d.age, age);
  assert.deepEqual(d.flying.position, position);
  assert.equal(f.hits.length, hits);
  let disposed = 0;
  d.warning.geometry.addEventListener("dispose", () => disposed++);
  d.wave.geometry.addEventListener("dispose", () => disposed++);
  d.wave.material.addEventListener("dispose", () => disposed++);
  f.system.reset();
  assert.equal(f.system.entries.size, 0);
  assert.equal(disposed, 3);
  assert.equal(f.anchor.children.length, 0);
  assert.ok(
    !f.scene.children.some((child) => child.name.startsWith("polyphemus_")),
  );
  f.system.dispose();
  f.system.dispose();
  assert.equal(await f.system.prepare(), false);
});

test("defeat and disabled entries clear an already released hazard without future damage", (t) => {
  for (const state of ["defeated", "disabled"]) {
    const f = fixture(t);
    f.step();
    const d = f.launch();
    if (state === "defeated") f.entry.state.defeated = true;
    else f.entry.enabled = false;
    f.step(0);
    assert.equal(d.flight, null);
    assert.equal(d.flying.visible, false);
    assert.equal(d.wave.visible, false);
    assert.equal(d.held.visible, false);
    for (let i = 0; i < 100; i++) f.step();
    assert.equal(f.hits.length, 0);
  }
});

test("a fast frontal approach cannot predict a throw behind the fixed giant", () => {
  const origin = new THREE.Vector3(),
    q = new THREE.Quaternion();
  const current = new THREE.Vector3(0, -5, -20),
    velocity = new THREE.Vector3(0, 0, 70);
  const predicted = current.clone().addScaledVector(velocity, 2.2);
  assert.ok(predicted.z > 0);
  assert.equal(polyphemusCanAim(q, current), true);
  const out = polyphemusThrowTarget(origin, q, current, predicted);
  assert.deepEqual(out, current);
  assert.notEqual(out, current);
  const valid = new THREE.Vector3(20, -5, -40);
  assert.deepEqual(polyphemusThrowTarget(origin, q, current, valid), valid);
  assert.deepEqual(current.toArray(), [0, -5, -20]);
});
