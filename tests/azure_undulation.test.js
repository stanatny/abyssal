import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCreature } from "../src/creatures.js";
import { azureFlightRequest } from "../src/azure_flight_motion.js";
import {
  steerPenglaiFlight,
  updatePenglaiFlightAttitude,
} from "../src/penglai_flight_attitude.js";

test("Azure actual trunk and tail skin carry a visible travelling bend; pause freezes the complete pose", () => {
  const r = createCreature("azure_dragon", 56, 8),
    m = r.userData.hfRig.mesh,
    p = m.geometry.attributes.position;
  const bins = [
      [-0.22, -0.17],
      [-0.02, 0.02],
      [0.22, 0.26],
    ],
    groups = bins.map(([a, b]) => {
      const ids = [];
      for (let i = 0; i < p.count; i++)
        if (p.getZ(i) > a && p.getZ(i) < b && Math.abs(p.getX(i)) < 0.03)
          ids.push(i);
      return ids;
    });
  const samples = groups.map(() => []),
    v = new T.Vector3();
  for (let f = 0; f < 420; f++) {
    r.userData.setSwimTravel(24 / 60, 1 / 60);
    r.userData.animate(f / 60, 1.2);
    r.updateMatrixWorld(true);
    m.skeleton.update();
    if (f > 100)
      groups.forEach((g, j) => {
        samples[j].push(
          g.reduce((sum, i) => sum + m.getVertexPosition(i, v).x, 0) / g.length,
        );
      });
  }
  const spans = samples.map((s) => Math.max(...s) - Math.min(...s));
  assert.ok(
    spans[1] > 0.1,
    "middle skin must visibly undulate, not only the tail",
  );
  assert.ok(spans[2] > spans[1] * 1.3, "rearward amplitude grows");
  assert.ok(spans[0] < spans[1] * 0.5, "head/chest stay steadier than trunk");
  assert.ok(
    samples[1].some((x, i) => x * samples[2][i] < -0.001),
    "trunk and tail must occupy opposite sides during a travelling S bend",
  );
  const frozen = Float32Array.from(m.skeleton.boneMatrices),
    phase = r.userData.azureUndulation.phase;
  r.userData.animate(419 / 60, 2.5);
  r.updateMatrixWorld(true);
  m.skeleton.update();
  assert.deepEqual(m.skeleton.boneMatrices, frozen);
  assert.equal(r.userData.azureUndulation.phase, phase);
  r.userData.disposeLocalMotion();
});

test("Azure cadence follows actual displacement, settles after stopping, and resets without coupling instances", () => {
  const a = createCreature("azure_dragon", 56, 8),
    b = createCreature("azure_dragon", 56, 8);
  for (let i = 0; i < 240; i++) {
    a.userData.setSwimTravel(30 / 60, 1 / 60);
    b.userData.setSwimTravel(0, 1 / 60);
    a.userData.animate(i / 60, 1);
    b.userData.animate(i / 60, 1);
  }
  assert.ok(
    a.userData.azureUndulation.phase > b.userData.azureUndulation.phase * 2,
  );
  for (let i = 240; i < 420; i++) {
    a.userData.setSwimTravel(0, 1 / 60);
    a.userData.animate(i / 60, 1);
  }
  assert.ok(a.userData.azureUndulation.drive < 0.001);
  const prior = b.userData.azureUndulation.phase;
  a.userData.resetSwimTravel();
  assert.equal(a.userData.azureUndulation.phase, 0);
  assert.equal(b.userData.azureUndulation.phase, prior);
  a.userData.disposeLocalMotion();
  b.userData.disposeLocalMotion();
});

test("Azure world request accelerates into a continuous curved path without changing locked attacks or speed cap", () => {
  for (const hz of [30, 60, 120]) {
    const out = new T.Vector3(),
      aim = new T.Vector3(0, 0, -1),
      q = new T.Quaternion(),
      p = new T.Vector3();
    let speed = 0,
      previous = 0,
      span = 0,
      maxJump = 0;
    for (let f = 0; f < hz * 6; f++) {
      speed = azureFlightRequest(
        out,
        aim,
        (f / hz) * 3,
        32,
        speed,
        1 / hz,
        true,
      );
      assert.ok(speed <= 32);
      maxJump = Math.max(maxJump, speed - previous);
      previous = speed;
      steerPenglaiFlight(out, q, out, 1 / hz);
      updatePenglaiFlightAttitude(q, out, 1 / hz);
      p.addScaledVector(out, speed / hz);
      span = Math.max(span, Math.abs(p.x));
      assert.ok(
        new T.Vector3(0, 0, -1).applyQuaternion(q).distanceTo(out) < 1e-6,
      );
    }
    assert.ok(
      span > 0.8,
      "actual root trajectory curves, not a straight translation",
    );
    assert.ok(p.z < -165);
    assert.ok(maxJump < 5.1);
    assert.ok(speed > 31.9);
    const locked = new T.Vector3(0.2, 0.1, -1).normalize();
    assert.equal(azureFlightRequest(out, locked, 5, 6, 32, 1 / hz, false), 6);
    assert.deepEqual(out, locked);
    assert.equal(azureFlightRequest(out, aim, 1, 32, 32, 0, true), 32);
    assert.deepEqual(out, aim);
  }
});
