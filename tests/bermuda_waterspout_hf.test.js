import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createWaterspoutVisuals } from "../src/bermuda_waterspout_visuals.js";
import { createBermudaWeather } from "../src/bermuda_weather.js";

test("Waterspout HF visuals share bounded resources and retain every cue in Smooth", () => {
  const time = { value: 9 },
    art = createWaterspoutVisuals(time),
    a = art.create(0),
    b = art.create(1);
  assert.equal(a.funnel.geometry, b.funnel.geometry);
  assert.equal(a.clouds.geometry, b.clouds.geometry);
  assert.equal(a.clouds.material, b.clouds.material);
  assert.notEqual(a.group, b.group);
  const types = () =>
    new Set(
      [...a.clouds.geometry.attributes.particle.array]
        .filter((_, i) => i % 4 === 3)
        .slice(0, a.clouds.geometry.instanceCount),
    );
  art.update(true, false);
  assert.equal(a.clouds.geometry.instanceCount, 68);
  assert.deepEqual(types(), new Set([0, 1, 2]));
  art.update(false, false);
  assert.equal(a.clouds.geometry.instanceCount, 52);
  assert.deepEqual(types(), new Set([0, 1, 2]));
  assert.equal(art.motionTime.value, 9);
  art.update(true, true);
  assert.equal(art.motionTime.value, 0);
  let disposals = 0;
  const count = art.resources.size;
  for (const r of art.resources)
    r.addEventListener("dispose", () => disposals++);
  art.dispose();
  art.dispose();
  assert.equal(disposals, count);
  assert.equal(art.prepare.state, "disposed");
});

test("Waterspout surface footprint stays at the existing danger centers through travel", () => {
  const scene = new THREE.Scene(),
    weather = createBermudaWeather(scene),
    position = new THREE.Vector3(0, 7, -500);
  assert.equal(weather.spouts.length, 7);
  const anchors = [
    [-235, -410],
    [115, -715],
    [-125, -280],
    [230, -350],
    [45, -500],
    [-235, -885],
    [210, -1010],
  ];
  for (const t of [0, 1, 17, 68, 140, 301]) {
    weather.update(t, position, 0.016, true, position);
    for (const [i, s] of weather.spouts.entries()) {
      assert.deepEqual(s.anchor, anchors[i]);
      assert.equal(s.radius, 10);
      assert.equal(s.x, anchors[i][0] + Math.sin(t * 0.014 + i * 1.7) * 12);
      assert.equal(s.z, anchors[i][1] + Math.cos(t * 0.017 + i * 1.7) * 10);
      assert.deepEqual(s.group.position.toArray(), [s.x, 4, s.z]);
      assert.equal(s.skirt.position.y, 0.32);
      for (const object of [s.funnel, s.clouds, s.skirt]) {
        assert.ok(
          [...object.geometry.attributes.position.array].every(Number.isFinite),
        );
        assert.equal(object.material.depthWrite, false);
      }
    }
  }
  weather.dispose();
  weather.dispose();
  assert.equal(scene.children.length, 0);
});
