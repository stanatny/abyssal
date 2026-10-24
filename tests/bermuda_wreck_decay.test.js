import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createBermudaWreck } from "../src/bermuda_wreck.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import { bodyRadius, resolveMotion } from "../src/collision.js";

const point = (x, y, z) =>
  new THREE.Vector3(x, y, z)
    .multiplyScalar(2.5)
    .add(new THREE.Vector3(-65, -486, -650));

test("Wreck breaches are open geometry on both sides, with intact plating beside them", () => {
  const wreck = createBermudaWreck(new THREE.Scene());
  try {
    wreck.root.updateMatrixWorld(true);
    const hull = wreck.root.children.find(
      (m) => m.material.name === "double_hull",
    );
    const cast = (side, y, z) =>
      new THREE.Raycaster(
        point(side * 42, y, z),
        new THREE.Vector3(-side, 0, 0),
        0,
        65,
      ).intersectObject(hull);
    for (const [side, y, z] of [
      [-1, 16, -60],
      [1, 16, 50],
      [1, 14, -66],
    ])
      assert.equal(cast(side, y, z).length, 0, `Opening ${side}/${z}`);
    for (const [side, y, z] of [
      [-1, 16, -90],
      [1, 16, 0],
      [-1, 33, -60],
      [1, 4, 50],
    ])
      assert.ok(cast(side, y, z).length > 0, `Adjacent solid ${side}/${z}`);
    assert.equal(hull.material.transparent, false);
    const upper = wreck.root.children.find(
      (m) => m.material.name === "aged_enamel",
    );
    assert.ok(upper);
    for (const [side, z] of [
      [1, -42],
      [-1, 32],
    ]) {
      const ray = new THREE.Raycaster(
        point(side * 35, 53, z),
        new THREE.Vector3(-side, 0, 0),
        0,
        40,
      );
      assert.equal(
        ray.intersectObject(upper).length,
        0,
        "Collapsed upper wall is a real gap",
      );
    }
  } finally {
    wreck.dispose();
  }
});

test("New port breach admits a complete 32 m body in both directions without an invisible wall", () => {
  const wreck = createBermudaWreck(new THREE.Scene(), {
    heightAt: bermudaSeabedHeight,
  });
  try {
    const radius = bodyRadius(32),
      ends = [point(-42, 16, -60), point(-12, 16, -60)];
    for (const reverse of [false, true]) {
      const [from, to] = reverse ? [...ends].reverse() : ends;
      const forward = to.clone().sub(from).normalize();
      for (const fast of [false, true]) {
        let current = from.clone();
        const steps = fast ? 1 : 50;
        for (let i = 1; i <= steps; i++) {
          const target = from.clone().lerp(to, i / steps);
          const result = resolveMotion(current, target, {
            colliders: wreck.colliders,
            radius,
            length: 32,
            forward,
            floorHeight: (x, z) => bermudaSeabedHeight(x, z) + radius,
          });
          assert.equal(result.blocked, false);
          assert.equal(result.stuck, false);
          assert.ok(
            new THREE.Vector3().copy(result.position).distanceTo(target) < 0.01,
          );
          current.copy(result.position);
        }
      }
    }
  } finally {
    wreck.dispose();
  }
});
