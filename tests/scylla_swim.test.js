import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCreature } from "../src/creatures.js";
import {
  SCYLLA_SWIM,
  scyllaCanAim,
  steerScyllaSwim,
  updateScyllaSwimAttitude,
} from "../src/scylla_swim.js";

test("Scylla reverses through an upright arc; swim displacement follows the actual body at every frame rate", () => {
  for (const hz of [30, 60, 120]) {
    const q = new T.Quaternion(),
      before = new T.Quaternion(),
      move = new T.Vector3(),
      up = new T.Vector3(),
      forward = new T.Vector3();
    for (const xyz of [
      [0, 0.2, 1],
      [0, 1, 0],
      [0, -1, 0],
      [1, 0, -1],
      [-1, 0.4, 1],
    ]) {
      const wanted = new T.Vector3(...xyz).normalize();
      for (let i = 0; i < hz * 5; i++) {
        before.copy(q);
        steerScyllaSwim(move, q, wanted, 1 / hz, 1, 26 / hz, 54);
        updateScyllaSwimAttitude(
          q,
          move.clone().multiplyScalar(26 / hz),
          1 / hz,
          54,
        );
        assert.ok(up.set(0, 1, 0).applyQuaternion(q).y > 0.92);
        assert.ok(q.angleTo(before) < 1.5 / hz);
        assert.ok(Math.abs(move.y) <= Math.sin(SCYLLA_SWIM.pitchLimit) + 1e-6);
        assert.ok(
          forward.set(0, 0, -1).applyQuaternion(q).distanceTo(move) < 1e-6,
        );
        assert.ok(Math.abs(move.length() - 1) < 1e-6);
      }
    }
    before.copy(q);
    updateScyllaSwimAttitude(q, new T.Vector3(0, 1, 0), 0);
    assert.deepEqual(q, before);
  }
});

test("Stationary or blocked Scylla holds its full attitude instead of rotating toward the aim", () => {
  const q = new T.Quaternion().setFromEuler(new T.Euler(0.2, 1.1, 0, "YXZ")),
    before = q.clone(),
    direction = new T.Vector3(),
    forward = new T.Vector3(0, 0, -1).applyQuaternion(q);
  for (const target of [
    new T.Vector3(0, 0.5, 1),
    new T.Vector3(0, 1, 0),
    new T.Vector3(-1, -0.8, -1),
  ]) {
    for (let f = 0; f < 240; f++) {
      steerScyllaSwim(direction, q, target, 1 / 60, 1, 0, 54);
      assert.ok(direction.distanceTo(forward) < 1e-9);
      // A nonzero proposed movement that the world rejects does not turn the body.
      updateScyllaSwimAttitude(q, new T.Vector3(), 1 / 60, 54);
      assert.deepEqual(q, before);
    }
  }
});

test("Slow and fast reversals cover a body-sized arc, with no speed-dependent pivot", () => {
  for (const hz of [30, 60, 120])
    for (const speed of [3.4, 26]) {
      const q = new T.Quaternion(),
        previous = q.clone(),
        move = new T.Vector3(),
        wanted = new T.Vector3(0, 0, 1),
        position = new T.Vector3();
      let totalAngle = 0,
        distance = 0;
      for (let i = 0; i < hz * 30; i++) {
        previous.copy(q);
        steerScyllaSwim(move, q, wanted, 1 / hz, 1, speed / hz, 54);
        move.multiplyScalar(speed / hz);
        updateScyllaSwimAttitude(q, move, 1 / hz, 54);
        position.add(move);
        const angle = q.angleTo(previous);
        assert.ok(
          angle <= speed / hz / (54 * SCYLLA_SWIM.turnRadiusLengths) + 1e-8,
        );
        totalAngle += angle;
        distance += speed / hz;
        if (totalAngle > Math.PI - 1e-5) break;
      }
      assert.ok(
        Math.abs(totalAngle - Math.PI) < 1e-5,
        "rear target is reachable",
      );
      assert.ok(
        distance > 80 && distance < 86,
        "half-turn must actually advance",
      );
      assert.ok(Math.abs(position.x) > 53 && Math.abs(position.x) < 55);
    }
});

test("A rear target requires a moving turn before the stationary volley can start", () => {
  const q = new T.Quaternion(),
    v = new T.Vector3(),
    target = new T.Vector3(0, 0, 1);
  assert.equal(scyllaCanAim(q, target), false);
  assert.equal(scyllaCanAim(q, new T.Vector3(0, 1, 0)), true);
  let travel = 0;
  while (!scyllaCanAim(q, target) && travel < 100) {
    steerScyllaSwim(v, q, target, 1 / 60, 1, 26 / 60, 54);
    updateScyllaSwimAttitude(q, v.multiplyScalar(26 / 60), 1 / 60, 54);
    travel += 26 / 60;
  }
  assert.ok(travel > 55 && travel < 58);
  assert.equal(scyllaCanAim(q, target), true);
});

test("Actual-speed paddling is independent of attack effort, slows when blocked and freezes on pause", () => {
  const cruise = createCreature("scylla", 54),
    attack = createCreature("scylla", 54);
  for (let i = 0; i <= 600; i++) {
    for (const m of [cruise, attack]) m.userData.setSwimTravel(26 / 60, 1 / 60);
    cruise.userData.setBossPhase("hunt");
    attack.userData.setBossPhase("attack");
    cruise.userData.animate(i / 60, 1.2);
    attack.userData.animate(i / 60, 2.5);
  }
  assert.ok(
    Math.abs(
      cruise.userData.scyllaSwim.stroke - attack.userData.scyllaSwim.stroke,
    ) < 1e-8,
  );
  const rig = cruise.userData.hfRig,
    feet = () =>
      rig.feet.flatMap((f) =>
        f.ids.flatMap((id) => rig.bones[id].quaternion.toArray()),
      );
  const moving = feet();
  for (let i = 601; i <= 900; i++) {
    cruise.userData.setSwimTravel(0, 1 / 60);
    cruise.userData.animate(i / 60, 2.5);
  }
  assert.ok(cruise.userData.scyllaSwim.drive < 1e-6);
  assert.notDeepEqual(feet(), moving);
  const before = feet(),
    state = { ...cruise.userData.scyllaSwim };
  cruise.userData.setSwimTravel(999, 0);
  cruise.userData.animate(15, 2.5);
  assert.deepEqual(feet(), before);
  assert.deepEqual(cruise.userData.scyllaSwim, state);
  cruise.userData.resetSwimTravel();
  assert.equal(cruise.userData.scyllaSwim.speed, null);
  assert.equal(cruise.userData.scyllaSwim.stroke, 0);
  cruise.userData.disposeLocalMotion();
  attack.userData.disposeLocalMotion();
});

test("Slow patrol visibly moves every head, fin-foot and the tail on the actual skin", () => {
  const root = createCreature("scylla", 1),
    { mesh, heads, feet, tail } = root.userData.hfRig,
    g = mesh.geometry,
    p = g.attributes.position,
    v = new T.Vector3();
  const probes = [...heads, ...feet, tail].map((chain) => {
    const end = new T.Vector3(...chain.points.at(-1));
    let index = -1,
      distance = Infinity;
    for (let i = 0; i < p.count; i++) {
      let weight = 0;
      for (let j = 0; j < 4; j++)
        if (chain.ids.includes(g.attributes.skinIndex.array[i * 4 + j]))
          weight += g.attributes.skinWeight.array[i * 4 + j];
      if (weight < 0.85) continue;
      const d = v.fromBufferAttribute(p, i).distanceToSquared(end);
      if (d < distance) {
        index = i;
        distance = d;
      }
    }
    assert.ok(index >= 0, `${chain.name} needs actual skin ownership`);
    return { chain, index, bounds: new T.Box3() };
  });
  for (let frame = 0; frame <= 900; frame++) {
    root.userData.setSwimTravel(4 / 60, 1 / 60);
    root.userData.setBossPhase("dormant");
    root.userData.animate(frame / 60, 0.7);
    root.updateMatrixWorld(true);
    mesh.skeleton.update();
    if (frame < 120 || frame % 6) continue;
    for (const probe of probes)
      probe.bounds.expandByPoint(mesh.getVertexPosition(probe.index, v));
  }
  for (const probe of probes) {
    const span = probe.bounds.getSize(v).length();
    assert.ok(
      span > (probe.chain === tail ? 0.075 : 0.035),
      `${probe.chain.name}: ${span}`,
    );
  }
  root.userData.disposeLocalMotion();
});
