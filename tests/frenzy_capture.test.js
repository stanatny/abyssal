import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import {
  preyCaptureRadius,
  frenzyReachBonus,
  frenzyPullDistance,
} from "../src/prey_capture.js";
import { createFrenzyEffect } from "../src/frenzy_effect.js";

test("frenzy increases actual close-contact capture modestly for juveniles and mature characters", () => {
  const normal = preyCaptureRadius(3, 0.3, true);
  const frenzy = preyCaptureRadius(3, 0.3, true, true);
  assert.ok(frenzy > normal && frenzy < normal + 1.6);
  assert.ok(frenzy + frenzyReachBonus(3) < 5);
  assert.ok(
    preyCaptureRadius(26, 0.3, false, true) > preyCaptureRadius(26, 0.3),
  );
  assert.equal(frenzyReachBonus(100), 5);
});

test("suction approaches the capture zone smoothly, stays finite and does not reach distant prey", () => {
  const capture = preyCaptureRadius(3, 0.8, false, true);
  let distance = capture + frenzyReachBonus(3) - 0.05;
  const initial = distance;
  for (let i = 0; i < 60; i++)
    distance -= frenzyPullDistance(distance, capture, 3, 1 / 60);
  assert.ok(distance < capture && distance > 0);
  assert.ok(initial > capture + 2);
  assert.equal(
    frenzyPullDistance(capture + frenzyReachBonus(3), capture, 3, 1 / 60),
    0,
  );
  assert.equal(frenzyPullDistance(initial, capture, 3, 0), 0);
  assert.equal(frenzyPullDistance(Infinity, capture, 3, 1), 0);
  assert.equal(frenzyPullDistance(1000, capture, 3, 1), 0);
});

test("intake effect shares fixed resources, fades after expiry and resets cleanly", () => {
  const scene = new THREE.Scene();
  const effect = createFrenzyEffect(scene);
  const streaks = effect.root.children[0];
  const geometry = streaks.geometry,
    material = streaks.material;
  const args = {
    active: true,
    dt: 1 / 60,
    time: 0,
    position: new THREE.Vector3(1, 2, 3),
    length: 3,
  };
  for (let i = 0; i < 180; i++)
    effect.update({ ...args, time: i / 60, highQuality: i < 90 });
  assert.equal(streaks.geometry, geometry);
  assert.equal(streaks.material, material);
  assert.equal(geometry.drawRange.count, 8 * 16 * 6);
  assert.equal(effect.root.visible, true);
  assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
  assert.equal(
    effect.root.userData.radius,
    preyCaptureRadius(3, 0.8, false, true) + frenzyReachBonus(3),
  );
  for (let i = 0; i < 120; i++)
    effect.update({ ...args, active: false, time: 3 + i / 60 });
  assert.equal(effect.root.visible, false);
  effect.update(args);
  effect.reset();
  assert.equal(effect.root.visible, false);
  let disposed = 0;
  geometry.addEventListener("dispose", () => disposed++);
  effect.dispose();
  effect.dispose();
  assert.equal(disposed, 1);
  assert.equal(scene.children.length, 0);
});
