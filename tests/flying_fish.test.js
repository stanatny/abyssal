import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  stepFlyingFish,
  takeFlyingFishEvent,
  resetFlyingFishFlight,
} from "../src/flying_fish.js";
import { castSegment, isPositionBlocked } from "../src/collision.js";

function specimen(position = [0, -5, 0]) {
  const mesh = new THREE.Object3D();
  mesh.position.fromArray(position);
  mesh.userData.setGliding = (active) => {
    mesh.userData.airborne = active;
  };
  return {
    species: {
      kind: "flying_fish",
      length: 0.4,
      speed: 7,
      depthMin: 2,
      depthMax: 10,
    },
    mesh,
    velocity: new THREE.Vector3(0, 0, -1),
    hiddenFor: 0,
  };
}
const water = {
  surfaceMode: "open",
  bounds: { minX: -300, maxX: 300, minZ: -1000, maxZ: 140, maxDepth: 740 },
  waterHeightAt: () => 4,
  heightAt: () => -60,
};
function hunter(entity, gap = 12) {
  return {
    position: entity.mesh.position.clone().add(new THREE.Vector3(0, 0, gap)),
    velocity: new THREE.Vector3(0, 0, -12),
    length: 3,
  };
}
function run(entity, context = water, dt = 1 / 60, duration = 10) {
  const threat = hunter(entity),
    events = [],
    trace = [];
  let now = 100,
    started = false;
  for (let i = 0; i < duration / dt; i++) {
    const previous = entity.mesh.position.clone();
    const handled = stepFlyingFish(entity, dt, now, threat, context);
    started ||= handled;
    const event = takeFlyingFishEvent(entity);
    if (event) {
      events.push(event);
      assert.equal(takeFlyingFishEvent(entity), null);
    }
    trace.push({
      point: entity.mesh.position.clone(),
      phase: entity.flight?.phase,
      glide: entity.mesh.userData.airborne,
      horizontal: Math.hypot(
        entity.mesh.position.x - previous.x,
        entity.mesh.position.z - previous.z,
      ),
      delta: entity.mesh.position.distanceTo(previous),
    });
    now += dt;
    if (started && !entity.flight) break;
  }
  return { started, events, trace, now };
}

test("a live pursuit accelerates underwater, breaches, glides and returns to a legal swimming layer", () => {
  const entity = specimen(),
    { started, events, trace } = run(entity);
  assert.ok(started);
  assert.equal(entity.flight, null);
  assert.deepEqual(
    events.map((e) => e.kind),
    ["exit", "reentry"],
  );
  assert.ok(events.every((e) => Math.abs(e.position.y - 4) < 1e-9));
  assert.ok(events[1].position.z < events[0].position.z - 25);
  assert.ok(
    trace.some((s) => s.phase === "runup" && !s.glide && s.point.y < 4),
  );
  assert.ok(trace.some((s) => s.phase === "glide" && s.glide && s.point.y > 7));
  assert.ok(
    trace.some((s) => s.phase === "reentry" && !s.glide && s.point.y < 4),
  );
  assert.ok(Math.max(...trace.map((s) => s.point.y)) < 10);
  assert.ok(trace.every((s) => s.horizontal <= 16 / 60 + 1e-9));
  assert.ok(
    trace.every((s) => s.delta < 0.34),
    "no launch or landing teleport",
  );
  assert.ok(entity.mesh.position.y <= -2 && entity.mesh.position.y >= -10);
  assert.equal(entity.mesh.userData.airborne, false);
});

test("quiet, covered, too-deep and invalid encounters cannot launch a new escape", () => {
  const cases = [
    { threat: () => null },
    { threat: (e) => hunter(e, 25) },
    { threat: (e) => ({ ...hunter(e), length: 0.3 }) },
    {
      threat: (e) => ({ ...hunter(e), velocity: new THREE.Vector3(0, 0, 12) }),
    },
    { context: { ...water, castWorld: () => true } },
    { context: { ...water, surfaceMode: "ice" } },
    { context: { ...water, surfaceMode: "aether" } },
    { context: { ...water, surfaceMode: "river" } },
    { context: { ...water, heightAt: () => 2 } },
    { position: [0, -16, 0] },
    { disorientedUntil: 101 },
    { readyAt: 101 },
  ];
  for (const c of cases) {
    const e = specimen(c.position);
    e.disorientedUntil = c.disorientedUntil;
    e.flightReadyAt = c.readyAt;
    const original = e.mesh.position.clone();
    assert.equal(
      stepFlyingFish(
        e,
        1 / 60,
        100,
        c.threat ? c.threat(e) : hunter(e),
        c.context ?? water,
      ),
      false,
    );
    assert.ok(e.mesh.position.equals(original));
    assert.equal(e.flight, undefined);
    assert.equal(takeFlyingFishEvent(e), null);
  }
  const e = specimen();
  assert.equal(stepFlyingFish(e, 1 / 60, 100, hunter(e, 6), water), true);
});

test("old position-vector callers remain supported and flight does not home after takeoff", () => {
  const entity = specimen(),
    source = new THREE.Vector3(-10, -5, 10);
  assert.equal(stepFlyingFish(entity, 1 / 60, 100, source), true);
  const direction = { x: entity.flight.x, z: entity.flight.z };
  assert.ok(direction.x > 0 && direction.z < 0);
  for (let i = 1; i < 140 && entity.flight; i++) {
    source.set(100, -4, -100);
    stepFlyingFish(entity, 1 / 60, 100 + i / 60, source);
    assert.equal(entity.flight.x, direction.x);
    assert.equal(entity.flight.z, direction.z);
  }
  assert.ok(entity.mesh.position.x > 10 && entity.mesh.position.z < -10);
});

test("pause freezes every escape phase, reset clears cues, cooldown and wing state", () => {
  for (const wanted of ["runup", "glide", "reentry"]) {
    const e = specimen(),
      threat = hunter(e);
    let now = 100;
    for (let i = 0; e.flight?.phase !== wanted && i < 600; i++) {
      stepFlyingFish(e, 1 / 60, now, threat, water);
      now += 1 / 60;
    }
    assert.equal(e.flight.phase, wanted);
    const original = e.mesh.position.clone(),
      state = structuredClone(e.flight);
    for (const dt of [0, -1, NaN, Infinity])
      stepFlyingFish(e, dt, now, threat, water);
    stepFlyingFish(e, 0.1, now, threat, { ...water, active: false });
    assert.ok(e.mesh.position.equals(original));
    assert.deepEqual(e.flight, state);
    resetFlyingFishFlight(e);
    assert.equal(e.flight, null);
    assert.equal(e.flightReadyAt, 0);
    assert.equal(e.mesh.userData.airborne, false);
    assert.equal(takeFlyingFishEvent(e), null);
  }
});

test("an escape retains the 18-second cooldown and retirement cannot leave open wings", () => {
  const e = specimen(),
    result = run(e),
    landed = e.mesh.position.clone();
  assert.equal(e.flightReadyAt, 118);
  assert.equal(stepFlyingFish(e, 1 / 60, 117.9, hunter(e, 6), water), false);
  assert.ok(e.mesh.position.equals(landed));
  assert.equal(stepFlyingFish(e, 1 / 60, 118, hunter(e, 6), water), true);
  e.hiddenFor = 5;
  assert.equal(stepFlyingFish(e, 1 / 60, 118.1, hunter(e, 6), water), false);
  assert.equal(e.flight, null);
  assert.equal(e.mesh.userData.airborne, false);
  assert.deepEqual(
    result.events.map((v) => v.kind),
    ["exit", "reentry"],
  );
});

test("airborne motion stays outside a real boat hull and lands without crossing it", () => {
  const boat = {
    type: "box",
    x: 0,
    y: 4,
    z: -25,
    halfSize: { x: 3, y: 3, z: 3 },
  };
  const context = {
    ...water,
    castWorld: (a, b, radius) => castSegment(a, b, [boat], radius),
  };
  const e = specimen(),
    { trace, events } = run(e, context);
  assert.ok(trace.some((v) => v.phase === "glide"));
  assert.ok(
    trace.every(
      (v) => !isPositionBlocked(v.point, { colliders: [boat], radius: 0.08 }),
    ),
  );
  assert.ok(trace.every((v) => v.horizontal <= 16 / 60 + 1e-9));
  assert.ok(trace.every((v) => v.delta < 0.34));
  assert.equal(e.flight, null);
  assert.deepEqual(
    events.map((v) => v.kind),
    ["exit", "reentry"],
  );
});

test("a covered launch is canceled continuously and coast or regional boundaries cannot be crossed", () => {
  const overhead = {
    type: "box",
    x: 0,
    y: 1,
    z: -8,
    halfSize: { x: 6, y: 0.6, z: 6 },
  };
  const covered = specimen();
  const c = run(covered, {
    ...water,
    castWorld: (a, b, r) => castSegment(a, b, [overhead], r),
  });
  assert.equal(covered.flight, null);
  assert.equal(c.events.length, 0);
  assert.ok(c.trace.every((v) => v.point.y < 0.4));
  for (const context of [
    { ...water, heightAt: (_x, z) => (z < -26 ? 2 : -60) },
    { ...water, bounds: { ...water.bounds, minZ: -38 } },
  ]) {
    const e = specimen(),
      result = run(e, context);
    assert.ok(result.trace.every((v) => v.point.z >= -26));
    assert.ok(result.trace.every((v) => v.delta < 0.34));
    assert.equal(e.flight, null);
    assert.ok(e.mesh.position.y <= -2);
  }
});

test("different frame rates preserve a finite arc and a legal local-water landing", () => {
  const samples = [1 / 30, 1 / 60, 1 / 120].map((dt) => {
    const e = specimen();
    const result = run(e, { ...water, waterHeightAt: () => 1 }, dt);
    assert.deepEqual(
      result.events.map((v) => v.kind),
      ["exit", "reentry"],
    );
    assert.ok(result.events.every((v) => Math.abs(v.position.y - 1) < 1e-9));
    assert.equal(e.flight, null);
    assert.ok(e.mesh.position.y <= -2);
    return { time: result.now, point: e.mesh.position.clone() };
  });
  assert.ok(
    Math.max(...samples.map((v) => v.time)) -
      Math.min(...samples.map((v) => v.time)) <
      0.15,
  );
  assert.ok(samples[0].point.distanceTo(samples[2].point) < 1.2);
});

test("an interrupted rise returns continuously instead of snapping to the ordinary depth ceiling", () => {
  const roof = {
    type: "box",
    x: 0,
    y: 2,
    z: -15,
    halfSize: { x: 6, y: 0.5, z: 12 },
  };
  const e = specimen(),
    result = run(e, {
      ...water,
      castWorld: (a, b, r) => castSegment(a, b, [roof], r),
    });
  assert.ok(result.trace.some((s) => s.phase === "reentry"));
  assert.equal(e.flight, null);
  assert.equal(result.events.length, 0);
  assert.ok(result.trace.every((s) => s.delta < 0.34));
  assert.ok(e.mesh.position.y <= -2);
});

test("the ordinary swimming boundary band cannot start an escape that traps recovery", () => {
  for (const position of [
    [290, -1, 0],
    [-290, -1, 0],
    [0, -1, -990],
    [0, -1, 130],
  ]) {
    const e = specimen(position),
      original = e.mesh.position.clone(),
      threat = hunter(e, position[2] > 0 ? -6 : 6);
    // 这些点都在普通游泳允许的8单位边界内；不能进入需要12单位余量的飞行状态。
    for (let frame = 0; frame < 600; frame++) {
      assert.equal(
        stepFlyingFish(e, 1 / 60, 100 + frame / 60, threat, water),
        false,
      );
      assert.equal(e.flight, undefined);
      assert.ok(e.mesh.position.equals(original));
    }
    assert.equal(takeFlyingFishEvent(e), null);
    assert.notEqual(e.mesh.userData.airborne, true);
    // 游回12单位边界内后仍能正常起跳，不能用整片边区禁用来掩盖恢复卡死。
    e.mesh.position.x = Math.max(-287, Math.min(287, e.mesh.position.x));
    e.mesh.position.z = Math.max(-987, Math.min(127, e.mesh.position.z));
    assert.equal(stepFlyingFish(e, 1 / 60, 111, hunter(e, 6), water), true);
    assert.equal(e.flight.phase, "runup");
  }
});
