import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createPenglaiOcean } from "../src/penglai_ocean.js";
import { PENGLAI_WORLD } from "../src/penglai_config.js";
import { PENGLAI_WARD } from "../src/penglai_ward.js";
import { RANDOM_REWARD_COUNT } from "../src/reward_config.js";
import { habitatPosition } from "../src/ecosystem_population.js";
import { isPositionBlocked } from "../src/collision.js";

test("Penglai random supplies stay legal and distributed outside the nursery and locked monastery", () => {
  const ocean = createPenglaiOcean(new THREE.Group()),
    birth = new THREE.Vector3(0, -20, 75),
    ward = new THREE.Vector3(PENGLAI_WARD.x, PENGLAI_WARD.y, PENGLAI_WARD.z);
  try {
    for (const value of [0, 0.25, 0.5, 0.75, 0.999]) {
      const points = [];
      for (let index = 0; index < RANDOM_REWARD_COUNT; index++) {
        const anchor = ocean.rewardAnchor(() => value, index),
          point = habitatPosition(
            { ...ocean.rewardHabitat, length: 2, worldBounds: PENGLAI_WORLD },
            {
              anchor,
              heightAt: ocean.heightAt,
              colliders: ocean.colliders,
              random: () => value,
            },
          );
        assert.ok(point, `slot ${index} must not need a distant fallback`);
        assert.ok(point.distanceTo(anchor) < 45);
        assert.ok(point.distanceTo(birth) > 180);
        assert.ok(point.distanceTo(ward) > PENGLAI_WARD.radius + 2);
        assert.equal(
          isPositionBlocked(point, { radius: 1, colliders: ocean.colliders }),
          false,
        );
        assert.ok(point.y > ocean.heightAt(point.x, point.z) + 3);
        points.push(point);
      }
      assert.ok(points.some((p) => p.y < 0));
      assert.ok(points.some((p) => p.y > 30));
      for (let i = 0; i < points.length; i++)
        for (let j = i + 1; j < points.length; j++)
          assert.ok(
            points[i].distanceTo(points[j]) > 45,
            "rewards must not collapse onto the same fallback",
          );
    }
  } finally {
    ocean.dispose();
  }
});

test("Monastery stair treads clear rendered terrain and the platform with matching solid geometry", () => {
  const ocean = createPenglaiOcean(new THREE.Group());
  try {
    const steps = ocean.colliders.filter(
      (c) => c.kind === "monastery_entrance_step",
    );
    assert.equal(steps.length, 8);
    const platform = ocean.colliders.find(
      (c) => c.kind === "monastery_platform" && c.z === -650,
    );
    assert.equal(
      steps[0].z - steps[0].halfSize.z,
      platform.z + platform.halfSize.z,
    );
    assert.ok(
      steps[0].y + steps[0].halfSize.y < platform.y + platform.halfSize.y,
    );
    const matrix = new THREE.Matrix4(),
      position = new THREE.Vector3(),
      scale = new THREE.Vector3(),
      q = new THREE.Quaternion();
    for (const step of steps) {
      const top = step.y + step.halfSize.y;
      let visibleMatch = false;
      ocean.root.traverse((mesh) => {
        if (!mesh.isInstancedMesh) return;
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          matrix.decompose(position, q, scale);
          if (
            position.distanceTo(new THREE.Vector3(step.x, step.y, step.z)) >
            0.001
          )
            continue;
          if (
            Math.abs(scale.x - step.halfSize.x * 2) < 0.001 &&
            Math.abs(scale.y - step.halfSize.y * 2) < 0.001 &&
            Math.abs(scale.z - step.halfSize.z * 2) < 0.001
          )
            visibleMatch = true;
        }
      });
      assert.ok(
        visibleMatch,
        "solid step must match a rendered stone instance",
      );
      // 沿整个踏面射向最终地形网格，不只检查解析高度或踏面中心。
      for (
        let x = step.x - step.halfSize.x;
        x <= step.x + step.halfSize.x;
        x += 5
      )
        for (
          let z = step.z - step.halfSize.z;
          z <= step.z + step.halfSize.z;
          z += 1
        ) {
          const ray = new THREE.Raycaster(
            new THREE.Vector3(x, 500, z),
            new THREE.Vector3(0, -1, 0),
          );
          const hits = ray.intersectObjects(
            ocean.root.children.filter(
              (m) => m.name === "same_source_mountain_floor",
            ),
          );
          assert.ok(hits.length);
          assert.ok(
            top - hits[0].point.y > 0.7,
            "no terrain/tread intersection or near-coplanar surface",
          );
        }
    }
    for (let i = 1; i < steps.length; i++) {
      assert.ok(
        steps[i].z - steps[i].halfSize.z >=
          steps[i - 1].z + steps[i - 1].halfSize.z,
      );
      assert.ok(
        steps[i].y + steps[i].halfSize.y <
          steps[i - 1].y + steps[i - 1].halfSize.y,
      );
    }
  } finally {
    ocean.dispose();
  }
});
