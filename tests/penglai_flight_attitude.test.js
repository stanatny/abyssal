import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  isPenglaiFlyingGuardian,
  steerPenglaiFlight,
  updatePenglaiFlightAttitude,
} from "../src/penglai_flight_attitude.js";

test("Penglai flying guardians turn through upright headings, including rear and vertical targets", () => {
  const q = new T.Quaternion(),
    d = new T.Vector3(),
    old = new T.Quaternion(),
    up = new T.Vector3();
  for (const hz of [30, 60, 120]) {
    q.identity();
    for (const target of [
      [0, 0, 1],
      [0, 1, 0],
      [0, -1, 0],
      [1, 1, -1],
      [-1, 0, 1],
      [0, 0, -1],
    ]) {
      const wanted = new T.Vector3(...target).normalize();
      for (let i = 0; i < hz * 5; i++) {
        old.copy(q);
        steerPenglaiFlight(d, q, wanted, 1 / hz);
        updatePenglaiFlightAttitude(q, d, 1 / hz);
        up.set(0, 1, 0).applyQuaternion(q);
        assert.ok(up.y > 0.65, `inversion ${up.y}`);
        assert.ok(q.angleTo(old) < 2 / hz, "bounded angular speed");
        const forward = new T.Vector3(0, 0, -1).applyQuaternion(q);
        assert.ok(
          forward.distanceTo(d) < 1e-6,
          "visible heading follows movement",
        );
        assert.ok(Math.abs(forward.y) <= Math.SQRT1_2 + 1e-6);
      }
    }
    old.copy(q);
    updatePenglaiFlightAttitude(q, new T.Vector3(1, 0, 0), 0);
    assert.deepEqual(q, old);
  }
});
test("attack aim settles without a shortest-arc roll; ordinary lords and upright sage stay outside this policy", () => {
  assert.ok(isPenglaiFlyingGuardian("azure_dragon"));
  assert.ok(isPenglaiFlyingGuardian("vermilion_bird"));
  for (const kind of [
    "white_tiger",
    "black_tortoise",
    "sword_sage",
    "hydra",
    "leviathan",
    "kraken",
  ])
    assert.equal(isPenglaiFlyingGuardian(kind), false);
  const q = new T.Quaternion(),
    target = new T.Vector3(0.001, 0.15, 1).normalize(),
    up = new T.Vector3();
  for (let i = 0; i < 600; i++) {
    updatePenglaiFlightAttitude(q, target, 1 / 60);
    assert.ok(up.set(0, 1, 0).applyQuaternion(q).y > 0.65);
  }
  assert.ok(
    new T.Vector3(0, 0, -1).applyQuaternion(q).distanceTo(target) < 1e-5,
  );
  assert.ok(
    Math.abs(new T.Euler().setFromQuaternion(q, "YXZ").z) < 1e-4,
    "straight flight returns level",
  );
});
