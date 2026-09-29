import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createPlayer } from "../src/simulation.js";
import { createHumanActivity } from "../src/human_activity.js";

test("Distant human, submarine and mine targets do not query world blockers", () => {
  const worldColliders = [];
  const activity = createHumanActivity(new THREE.Scene(), {
    worldColliders,
    random: () => 0.5,
  });
  const player = createPlayer();
  let blockerReads = 0;
  // 仅统计本帧移动中的查询，不把初次安全出生定位计入性能断言。
  worldColliders.push({
    get x() {
      blockerReads++;
      return 10000;
    },
    y: 10000,
    z: 10000,
    radius: 1,
  });
  try {
    const before = new THREE.Vector3(270, -60, 150);
    const after = new THREE.Vector3(270, -60, 149);
    const contacts = activity.onMovement(
      player,
      before,
      after,
      new THREE.Vector3(0, 0, -1),
      { speed: 12, now: 1 },
    );
    assert.deepEqual(contacts, []);
    assert.equal(blockerReads, 0);
    assert.equal(player.health, 100);
  } finally {
    activity.dispose();
  }
});

for (const [name, wallOffset, exploded] of [
  ["wall before target", -10, false],
  ["wall after target", 10, true],
  ["unobstructed crossing", null, true],
]) {
  test(`Fast mine contact preserves ordering: ${name}`, () => {
    const worldColliders = [];
    const activity = createHumanActivity(new THREE.Scene(), {
      worldColliders,
      random: () => 0.5,
    });
    try {
      const player = createPlayer();
      const hazard = activity.hazards[0];
      const center = hazard.mesh.position.clone();
      if (wallOffset !== null)
        worldColliders.push({
          x: center.x + wallOffset,
          y: center.y,
          z: center.z,
          radius: 2,
        });
      const contacts = activity.onMovement(
        player,
        center.clone().add(new THREE.Vector3(-25, 0, 0)),
        center.clone().add(new THREE.Vector3(25, 0, 0)),
        new THREE.Vector3(1, 0, 0),
        { speed: 72, now: 1 },
      );
      assert.equal(hazard.active, !exploded);
      assert.equal(player.health, exploded ? 72 : 100);
      assert.equal(
        contacts.some((entry) => entry.kind === "torpedo"),
        exploded,
      );
    } finally {
      activity.dispose();
    }
  });
}

test("Stationary endpoint contact preserves same-time overlap priority and single detonation", () => {
  for (const blocked of [false, true]) {
    const worldColliders = [];
    const activity = createHumanActivity(new THREE.Scene(), {
      worldColliders,
      random: () => 0.5,
    });
    try {
      const player = createPlayer();
      const hazard = activity.hazards[0];
      const point = hazard.mesh.position.clone();
      if (blocked)
        worldColliders.push({
          x: point.x,
          y: point.y,
          z: point.z,
          radius: 8,
        });
      activity.onMovement(player, point, point, new THREE.Vector3(1, 0, 0), {
        speed: 0,
        now: 1,
      });
      // 已在水雷实体内部时，接触与遮挡同为 t=0，沿用原有命中优先规则。
      assert.equal(hazard.active, false);
      assert.equal(player.health, 72);
      const contacts = activity.onMovement(
        player,
        point,
        point,
        new THREE.Vector3(1, 0, 0),
        { speed: 0, now: 2 },
      );
      assert.equal(
        contacts.some((entry) => entry.kind === "torpedo"),
        false,
      );
    } finally {
      activity.dispose();
    }
  }
});
