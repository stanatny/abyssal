import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createPlayer } from "../src/simulation.js";
import { createHumanActivity } from "../src/human_activity.js";
import { castIndexedSegment } from "../src/static_collider_grid.js";

for (const wallOffset of [-10, 10, null]) {
  test(`Indexed human world queries retain mine contact ordering at offset ${wallOffset}`, () => {
    const colliders = [];
    let queries = 0;
    const activity = createHumanActivity(new THREE.Scene(), {
      worldColliders: colliders,
      random: () => 0.5,
      castWorld: (from, to, radius) => {
        queries++;
        return castIndexedSegment(from, to, {
          staticColliders: colliders,
          radius,
        });
      },
    });
    try {
      const player = createPlayer(),
        hazard = activity.hazards[0];
      const center = hazard.mesh.position.clone();
      if (wallOffset !== null)
        colliders.push({
          x: center.x + wallOffset,
          y: center.y,
          z: center.z,
          radius: 2,
        });
      for (let i = 0; i < 200; i++)
        colliders.push({ x: 1000 + i * 5, y: 0, z: 1000, radius: 2 });
      const contacts = activity.onMovement(
        player,
        center.clone().add(new THREE.Vector3(-25, 0, 0)),
        center.clone().add(new THREE.Vector3(25, 0, 0)),
        new THREE.Vector3(1, 0, 0),
        { speed: 72, now: 1 },
      );
      const exploded = wallOffset !== -10;
      assert.ok(queries > 0);
      assert.equal(hazard.active, !exploded);
      assert.equal(player.health, exploded ? 72 : 100);
      assert.equal(
        contacts.some((c) => c.kind === "torpedo"),
        exploded,
      );
    } finally {
      activity.dispose();
    }
  });
}

test("Human movement with indexed blockers matches the full query over repeated live updates", () => {
  const colliders = [];
  let queries = 0;
  const full = createHumanActivity(new THREE.Scene(), {
    worldColliders: colliders,
    random: () => 0.5,
  });
  const indexed = createHumanActivity(new THREE.Scene(), {
    worldColliders: colliders,
    random: () => 0.5,
    castWorld: (from, to, radius) => {
      queries++;
      return castIndexedSegment(from, to, {
        staticColliders: colliders,
        radius,
      });
    },
  });
  const p = full.entities[0].mesh.position;
  colliders.push({
    type: "box",
    x: p.x + 2,
    y: p.y,
    z: p.z,
    halfSize: { x: 0.4, y: 4, z: 7 },
  });
  for (let i = 0; i < 200; i++)
    colliders.push({ x: 1000 + i * 5, y: 0, z: 1000, radius: 2 });
  const playerA = createPlayer(),
    playerB = createPlayer(),
    position = new THREE.Vector3(270, -70, 130),
    forward = new THREE.Vector3(0, 0, -1);
  try {
    for (let i = 0; i < 20; i++) {
      full.update(0.1, i * 0.1, playerA, position, forward, { speed: 0 });
      indexed.update(0.1, i * 0.1, playerB, position, forward, { speed: 0 });
      const snapshot = (a) =>
        a.entities.map((e) => ({
          alive: e.alive,
          position: e.mesh.position.toArray(),
          direction: e.direction.toArray(),
          anchor: e.anchor.toArray(),
        }));
      assert.deepEqual(snapshot(indexed), snapshot(full));
      assert.deepEqual(playerB, playerA);
    }
    assert.ok(queries > 20);
  } finally {
    full.dispose();
    indexed.dispose();
  }
});
