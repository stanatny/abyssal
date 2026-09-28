import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  NURSERY_FRENZY_PICKUP,
  nurseryFrenzyPosition,
} from "../src/pickup_placement.js";
import { createOcean, seabedHeight } from "../src/ocean.js";
import {
  bodyRadius,
  castSegment,
  isPositionBlocked,
} from "../src/collision.js";
import { REGIONS, CHARACTERS } from "../src/expedition_config.js";
import { isNursery } from "../src/nursery_rules.js";

test("固定狂食点按海域提供独立副本，漂浮或重开不会改变基础位置", () => {
  const original = { x: 6, y: -18, z: 34 };
  assert.equal(NURSERY_FRENZY_PICKUP.id, "nursery_frenzy");
  assert.equal(NURSERY_FRENZY_PICKUP.kind, "frenzy");
  const first = nurseryFrenzyPosition();
  assert.deepEqual(first, original);
  first.y += 0.6;
  first.x = 99;
  const restarted = nurseryFrenzyPosition("hawaii");
  assert.deepEqual(restarted, original);
  assert.notStrictEqual(first, restarted);
  assert.deepEqual(NURSERY_FRENZY_PICKUP.position, original);
  assert.equal(nurseryFrenzyPosition("mariana"), null);
});

test("奖励在安全浅滩出生视线内且不会自动拾取，与原三枚新手奖励分开", () => {
  const region = REGIONS.find((entry) => entry.id === "hawaii");
  const spawn = new THREE.Vector3(...region.spawn);
  const point = new THREE.Vector3().copy(nurseryFrenzyPosition(region.id));
  const distance = point.distanceTo(spawn);
  assert.ok(isNursery(point));
  assert.equal(point.y, spawn.y, "新生角色无需先学俯仰即可接近");
  assert.ok(point.z < spawn.z, "出生朝向-Z，固定补给必须在前方");
  assert.ok(
    distance >= 25 && distance < 75,
    "保留接近过程且进入现有名称显示距离",
  );
  assert.ok(
    Math.abs(Math.atan2(point.x - spawn.x, spawn.z - point.z)) < Math.PI / 12,
  );
  for (const character of CHARACTERS)
    assert.ok(distance > character.startLength * 0.28 + 1.8 + 0.6);
  for (let index = 0; index < 3; index++) {
    const starter = new THREE.Vector3(
      (index - 1) * 13,
      -19 - index * 5,
      40 - index * 28,
    );
    assert.ok(point.distanceTo(starter) > 8, "不与原有新手奖励叠在一起");
  }
});

test("完整漂浮包络与出生接近路线通过真实海床和场景碰撞校验", () => {
  const ocean = createOcean(new THREE.Scene());
  try {
    const region = REGIONS.find((entry) => entry.id === "hawaii");
    const spawn = new THREE.Vector3(...region.spawn);
    const base = new THREE.Vector3().copy(nurseryFrenzyPosition(region.id));
    // 可见外环半径约1.7米；另外留到2.5米检查辉光附近没有实体穿入。
    for (const bob of [-0.6, 0, 0.6]) {
      const point = base.clone();
      point.y += bob;
      assert.ok(point.y - 1.7 - seabedHeight(point.x, point.z) >= 3);
      assert.equal(
        isPositionBlocked(point, { colliders: ocean.colliders, radius: 2.5 }),
        false,
      );
      assert.equal(
        castSegment(spawn, point, ocean.colliders, 0),
        null,
        "出生视线无遮挡",
      );
    }
    const forward = base.clone().sub(spawn).normalize();
    for (const character of CHARACTERS) {
      const radius = bodyRadius(character.startLength);
      assert.equal(castSegment(spawn, base, ocean.colliders, radius), null);
      for (let step = 0; step <= 40; step++) {
        const point = spawn.clone().lerp(base, step / 40);
        assert.ok(
          point.y >=
            seabedHeight(point.x, point.z) + character.startLength * 0.28 + 2,
        );
        assert.equal(
          isPositionBlocked(point, {
            colliders: ocean.colliders,
            radius,
            length: character.startLength,
            forward,
          }),
          false,
          `${character.id}: ${step}`,
        );
      }
    }
  } finally {
    ocean.dispose();
  }
});
