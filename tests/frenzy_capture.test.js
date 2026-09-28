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
  assert.ok(frenzy + frenzyReachBonus(3) > 6);
  assert.ok(frenzy + frenzyReachBonus(3) < 8);
  assert.ok(
    preyCaptureRadius(26, 0.3, false, true) > preyCaptureRadius(26, 0.3),
  );
  assert.equal(frenzyReachBonus(100), 10);
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

test("suction compensates for cruise and sprint while the trailing capture point retreats", () => {
  const capture = preyCaptureRadius(3, 0.8, false, true);
  for (const swimSpeed of [12, 32, 41.6]) {
    let distance = capture + frenzyReachBonus(3) * 0.7;
    // 猎物正常逃离，捕获点也向相反方向移动；吸力必须能完成收束。
    for (let i = 0; i < 120 && distance > capture; i++) {
      distance += (swimSpeed + 10) / 60;
      distance -= frenzyPullDistance(distance, capture, 3, 1 / 60, swimSpeed);
    }
    assert.ok(distance <= capture, `Uncaught prey at ${swimSpeed} m/s`);
  }
  assert.equal(frenzyPullDistance(5, capture, 3, 1 / 60, Infinity), 0);
});

test("intake effect shares fixed resources, fades after expiry and resets cleanly", () => {
  const scene = new THREE.Scene();
  const effect = createFrenzyEffect(scene);
  const streaks = effect.root.children[0];
  const geometry = streaks.geometry,
    material = streaks.material,
    positionBuffer = geometry.attributes.position.array,
    texture = material.map;
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
  assert.equal(geometry.attributes.position.array, positionBuffer);
  assert.equal(material.map, texture);
  assert.equal(geometry.drawRange.count, 10 * 20 * 6);
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
  const disposed = { geometry: 0, material: 0, texture: 0 };
  geometry.addEventListener("dispose", () => disposed.geometry++);
  material.addEventListener("dispose", () => disposed.material++);
  texture.addEventListener("dispose", () => disposed.texture++);
  effect.dispose();
  effect.dispose();
  assert.deepEqual(disposed, { geometry: 1, material: 1, texture: 1 });
  assert.equal(scene.children.length, 0);
});

test("intake ribbons move inward within the same suction radius", () => {
  const effect = createFrenzyEffect(new THREE.Scene());
  const args = {
    active: true,
    dt: 1 / 60,
    position: new THREE.Vector3(0, -18, 0),
    length: 3,
  };
  const radiusAtMiddle = () => {
    const vertices = effect.root.children[0].geometry.attributes.position.array;
    const offset = 10 * 6;
    return Math.hypot(
      (vertices[offset] + vertices[offset + 3]) * 0.5,
      (vertices[offset + 1] + vertices[offset + 4]) * 0.5,
      (vertices[offset + 2] + vertices[offset + 5]) * 0.5,
    );
  };
  effect.update({ ...args, time: 0.1 });
  const start = radiusAtMiddle();
  effect.update({ ...args, time: 0.3 });
  const end = radiusAtMiddle();
  assert.ok(start < effect.root.userData.radius);
  assert.ok(end < start && end > 0);
  effect.dispose();
});
