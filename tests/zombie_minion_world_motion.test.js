import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseAst } from "rolldown/parseAst";
import * as THREE from "three";
import {
  bodyOffsets,
  bodyRadius,
  isPositionBlocked,
} from "../src/collision.js";
import { resolveIndexedMotion } from "../src/static_collider_grid.js";
import { bodyTerrainFloor } from "../src/terrain_contact.js";
import { createIceCoveredSurface } from "../src/ice_surface.js";
import { createAetherSurface } from "../src/aether_surface.js";
import { createZombieMinion } from "../src/zombie_minion.js";
import { createCreature } from "../src/creatures.js";
import { createPlayer } from "../src/simulation.js";
import { WORLD } from "../src/world_config.js";

// 提取实际集成回调；环境能力与地形为合成夹具，不冒充六张地图的实机验收。
const source = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const declaration = parseAst(source).body.find(
  (node) =>
    node.type === "FunctionDeclaration" &&
    node.id.name === "resolveMinionMotion",
);
assert.ok(declaration, "The actual minion movement integration must exist");
const callback = source.slice(declaration.start, declaration.end);
console.log(
  "Actual main minion callback SHA-256:",
  createHash("sha256").update(callback).digest("hex"),
);
const bindMotion = new Function(
  "bodyRadius",
  "resolveIndexedMotion",
  "ocean",
  "surface",
  "humans",
  "encounters",
  "activeWorld",
  "WORLD_EDGE_INSET",
  "WORLD",
  "bodyTerrainFloor",
  "activeContactSurface",
  "return (" + callback + ");",
);

function motionFixture({
  surface = { colliders: [] },
  colliders = [],
  heightAt = () => -180,
} = {}) {
  return bindMotion(
    bodyRadius,
    resolveIndexedMotion,
    { colliders, barriers: [] },
    surface,
    { colliders: [] },
    { bodyColliders: () => [] },
    () => WORLD,
    5,
    WORLD,
    bodyTerrainFloor,
    () => heightAt,
  );
}

function near(actual, expected, message, tolerance = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    message + ": " + actual + " differs from " + expected,
  );
}

const headings = [
  new THREE.Vector3(0, 0, -1),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0.3, 0.8, -0.5).normalize(),
  new THREE.Vector3(0.3, -0.8, -0.5).normalize(),
];

function highestBodyPoint(position, heading, length) {
  const radius = bodyRadius(length);
  return (
    position.y +
    radius +
    Math.max(
      ...bodyOffsets({ radius, forward: heading, length }).map((p) => p.y),
    )
  );
}

for (const length of [3, 15, 30])
  test(
    "actual main callback: open-water capability preserves full-body surface clearance at " +
      length +
      " m",
    () => {
      const motion = motionFixture();
      for (const heading of headings) {
        const previous = new THREE.Vector3(0, -100, -20);
        const desired = new THREE.Vector3(0, 100, -20);
        const before = [
          previous.toArray(),
          desired.toArray(),
          heading.toArray(),
        ];
        const result = motion(previous, desired, heading, length);
        assert.ok(Object.values(result.position).every(Number.isFinite));
        near(
          highestBodyPoint(result.position, heading, length),
          WORLD.surfaceY - 0.4,
          "The complete collision body must stay below the existing surface margin",
        );
        assert.deepEqual(
          [previous.toArray(), desired.toArray(), heading.toArray()],
          before,
          "Movement queries must not mutate their input vectors",
        );
      }
    },
  );

for (const [kind, surface, ceiling] of [
  [
    "ice",
    createIceCoveredSurface({ worldBounds: { ...WORLD, surfaceY: -12 } }),
    -12,
  ],
  [
    "aether",
    createAetherSurface({ worldBounds: { ...WORLD, maxAltitude: 120 } }),
    120,
  ],
])
  test(
    "actual main callback: explicit " +
      kind +
      " ceiling capability takes precedence",
    () => {
      const motion = motionFixture({ surface });
      for (const length of [3, 15, 30])
        for (const heading of headings) {
          const result = motion(
            new THREE.Vector3(0, -100, -20),
            new THREE.Vector3(0, 200, -20),
            heading,
            length,
          );
          near(
            highestBodyPoint(result.position, heading, length),
            ceiling - 0.4,
            "The surface capability must retain its original body-aware limit",
          );
        }
    },
  );

function spawnFixture(length = 3, values = {}) {
  const scene = new THREE.Scene();
  const position = new THREE.Vector3(0, -25, 20);
  const forward = new THREE.Vector3(0, 0, -1);
  const owner = createCreature("zombie_shark", length);
  owner.position.copy(position);
  scene.add(owner);
  const player = createPlayer("zombie_shark", Math.min(length, 29.9));
  Object.assign(player, { length, mass: (length / 6) ** 3 }, values);
  const minion = createZombieMinion(scene, {
    resolveMovement: motionFixture(),
    blockedBetween: () => false,
    getOwnerMesh: () => owner,
    effects: { mealMist() {}, bite() {} },
  });
  return {
    scene,
    position,
    forward,
    owner,
    player,
    minion,
    close() {
      minion.reset();
      minion.mesh?.userData.disposeLocalMotion?.();
      owner.userData.disposeLocalMotion?.();
      scene.clear();
    },
  };
}

for (const length of [3, 15, 30])
  test(
    "real minion plus main callback: one paid activation forms and releases at " +
      length +
      " m",
    () => {
      const h = spawnFixture(length);
      try {
        assert.equal(h.minion.activate(h.player, h.position, h.forward), true);
        assert.deepEqual(
          [h.player.health, h.player.stamina, h.player.hunger],
          [50, 50, 50],
        );
        assert.equal(h.minion.active, true);
        assert.equal(h.minion.forming, true);
        assert.equal(h.minion.mesh.visible, true);
        assert.ok(h.minion.mesh.position.distanceTo(h.position) < length * 0.2);
        assert.equal(h.minion.activate(h.player, h.position, h.forward), false);
        for (let frame = 0; frame < 90; frame++) {
          h.player.elapsed += 1 / 60;
          h.owner.userData.animate(h.player.elapsed, 0.5, {
            dt: 1 / 60,
            speed: 0,
          });
          h.minion.update(1 / 60, h.player, h.position, h.forward, []);
        }
        assert.equal(h.minion.active, true);
        assert.equal(h.minion.forming, false);
        assert.equal(h.minion.mesh.visible, true);
        near(h.minion.mesh.scale.x, length * 0.65, "Released companion size");
        assert.ok(h.minion.mesh.position.distanceTo(h.position) < 64);
        assert.ok(h.minion.mesh.position.toArray().every(Number.isFinite));
        assert.deepEqual(
          [h.player.health, h.player.stamina, h.player.hunger],
          [50, 50, 50],
        );
        assert.equal(h.minion.state.activeUntil, 60);
      } finally {
        h.close();
      }
    },
  );

test("actual movement integration retains insufficient-resource rejection without payment", () => {
  for (const vital of ["health", "stamina", "hunger"]) {
    const h = spawnFixture(3, { [vital]: 49 });
    try {
      const before = [h.player.health, h.player.stamina, h.player.hunger];
      assert.equal(h.minion.activate(h.player, h.position, h.forward), false);
      assert.deepEqual(
        [h.player.health, h.player.stamina, h.player.hunger],
        before,
      );
      assert.equal(h.minion.active, false);
      assert.equal(h.minion.mesh, null);
    } finally {
      h.close();
    }
  }
});

test("actual movement integration retains the explicitly legal lethal 50-health sacrifice", () => {
  const h = spawnFixture(3, { health: 50 });
  try {
    assert.equal(h.minion.activate(h.player, h.position, h.forward), true);
    assert.deepEqual(
      [h.player.health, h.player.stamina, h.player.hunger],
      [0, 50, 50],
    );
    assert.equal(h.player.dead, true);
    assert.equal(h.minion.active, false);
    assert.equal(h.minion.mesh.visible, false);
  } finally {
    h.close();
  }
});

test("actual main callback retains final-floor body support on a synthetic rising slope", () => {
  const heightAt = (x) => -60 + x * 0.4;
  const heading = new THREE.Vector3(1, 0, 0);
  const motion = motionFixture({ heightAt });
  for (const length of [3, 15, 30]) {
    const result = motion(
      new THREE.Vector3(0, -20, -20),
      new THREE.Vector3(12, -100, -20),
      heading,
      length,
    );
    const radius = bodyRadius(length);
    const margin = 0.4 + length * 0.008;
    for (const offset of bodyOffsets({ radius, forward: heading, length }))
      assert.ok(
        result.position.y + offset.y - radius >=
          heightAt(result.position.x + offset.x) + margin - 1e-6,
        "Every body sample must stay supported above the rising floor",
      );
  }
});

test("actual main callback still sweeps the whole companion body against a synthetic wall", () => {
  const wall = {
    type: "box",
    id: "synthetic_companion_wall",
    x: 0,
    y: -25,
    z: -10,
    halfSize: new THREE.Vector3(20, 50, 1),
  };
  const heading = new THREE.Vector3(0, 0, -1);
  const motion = motionFixture({ colliders: [wall] });
  for (const length of [3, 15, 30]) {
    const result = motion(
      new THREE.Vector3(0, -25, 15),
      new THREE.Vector3(0, -25, -30),
      heading,
      length,
    );
    assert.ok(result.contacts.some((contact) => contact.collider === wall));
    assert.ok(
      result.position.z > -9,
      "No movement to the far side of the wall",
    );
    assert.equal(
      isPositionBlocked(result.position, {
        colliders: [wall],
        forward: heading,
        length,
        radius: bodyRadius(length),
      }),
      false,
    );
  }
});
