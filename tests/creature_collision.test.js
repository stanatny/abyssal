import assert from "node:assert/strict";
import test from "node:test";
import { resolveCreatureMotion } from "../src/navigation.js";
import { isPositionBlocked } from "../src/collision.js";

const SPECIES = { length: 13, speed: 17, depthMin: 100, depthMax: 280 };
const FLOOR = () => -320;
const wall = {
  type: "box",
  x: 0,
  y: -200,
  z: -500,
  halfSize: { x: 45, y: 60, z: 0.4 },
};

function resolve(previous, desired, heading, colliders, extra = {}) {
  return resolveCreatureMotion(previous, desired, heading, SPECIES, {
    colliders,
    heightAt: FLOOR,
    ...extra,
  });
}

function assertClear(result, colliders, forward) {
  assert.ok(result);
  assert.equal(result.stuck, false);
  assert.equal(
    isPositionBlocked(result.position, {
      radius: SPECIES.length * 0.18,
      length: SPECIES.length,
      forward,
      colliders,
    }),
    false,
  );
}

test("high-speed NPC motion cannot cross a thin city wall", () => {
  const colliders = [wall];
  const heading = { x: 0, y: 0, z: 1 };
  const result = resolve(
    { x: 0, y: -200, z: -550 },
    { x: 0, y: -200, z: -450 },
    heading,
    colliders,
  );
  assertClear(result, colliders, heading);
  assert.ok(result.position.z < -505);
  assert.ok(result.blocked);
  assert.ok(Math.abs(result.direction.x) > 0.9);
});

test("rotated masonry and capsule columns retain their actual contact shape", () => {
  const angle = Math.PI / 4;
  const rotated = {
    ...wall,
    halfSize: { x: 0.5, y: 60, z: 30 },
    rotation: { x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) },
  };
  const heading = { x: Math.SQRT1_2, y: 0, z: -Math.SQRT1_2 };
  const result = resolve(
    { x: -30, y: -200, z: -470 },
    { x: 30, y: -200, z: -530 },
    heading,
    [rotated],
  );
  assertClear(result, [rotated], heading);
  assert.ok(result.blocked);
  const column = {
    type: "capsule",
    a: { x: 0, y: -260, z: -500 },
    b: { x: 0, y: -150, z: -500 },
    radius: 3,
  };
  const straight = { x: 0, y: 0, z: 1 };
  const hit = resolve(
    { x: 0, y: -200, z: -530 },
    { x: 0, y: -200, z: -480 },
    straight,
    [column],
  );
  assertClear(hit, [column], straight);
  assert.ok(hit.position.z < -505);
});

test("a head-on patrol turns away and keeps swimming instead of sticking", () => {
  const colliders = [wall];
  let point = { x: 0, y: -200, z: -520 };
  let heading = { x: 0, y: 0, z: 1 };
  let contactFrames = 0;
  let distance = 0;
  for (let i = 0; i < 600; i++) {
    const desired = Object.fromEntries(
      ["x", "y", "z"].map((axis) => [
        axis,
        point[axis] + (heading[axis] * 17) / 60,
      ]),
    );
    const result = resolve(point, desired, heading, colliders);
    const next = result?.position || desired;
    if (result) {
      assertClear(result, colliders, heading);
      if (result.blocked) contactFrames++;
    }
    const step = Math.hypot(
      next.x - point.x,
      next.y - point.y,
      next.z - point.z,
    );
    assert.ok(
      step < 2,
      `local contact correction was unexpectedly large: ${step}`,
    );
    distance += step;
    point = next;
    if (result?.blocked) heading = result.direction;
  }
  assert.ok(distance > 145, `patrol traveled only ${distance}`);
  assert.ok(Math.abs(point.x) > 100);
  assert.ok(contactFrames > 0 && contactFrames < 20);
});

test("city contact preserves assigned depth, territory and terrain clearance", () => {
  const colliders = [wall];
  const territory = { minX: -25, maxX: 25, minZ: -560, maxZ: -440 };
  const result = resolve(
    { x: 24, y: -200, z: -520 },
    { x: 40, y: -90, z: -495 },
    { x: 0.6, y: 0.3, z: 0.74 },
    colliders,
    { territory },
  );
  assert.ok(result.position.x <= 25);
  assert.ok(result.position.y <= -100 && result.position.y >= -280);
  assert.ok(result.position.z >= -560 && result.position.z <= -440);
  const shelf = (x, z) => -240 + (z + 530) * 2;
  const onSlope = resolve(
    { x: 0, y: -180, z: -530 },
    { x: 0, y: -120, z: -450 },
    { x: 0, y: 0, z: 1 },
    colliders,
    { heightAt: shelf },
  );
  assert.ok(
    onSlope.position.y >= shelf(onSlope.position.x, onSlope.position.z) + 5.64,
  );
  assert.ok(onSlope.position.y <= -100);
});

test("distant nursery movement and an absent city collider list stay unchanged", () => {
  const previous = { x: 0, y: -18, z: 75 };
  const desired = { x: 0, y: -18, z: 74 };
  const heading = { x: 0, y: 0, z: -1 };
  const original = structuredClone({ previous, desired, heading, wall });
  assert.equal(resolve(previous, desired, heading, [wall]), null);
  assert.equal(resolve(previous, desired, heading, []), null);
  assert.deepEqual({ previous, desired, heading, wall }, original);
});

test("25 and 30 m diagonal high-speed city sweeps agree with the full exact solver", async () => {
  const { resolveMotion } = await import("../src/collision.js");
  for (const length of [25, 30]) {
    const habitat = { length, speed: 32, depthMin: 100, depthMax: 680 };
    const radius = length * 0.18;
    const angle = Math.PI / 5;
    const blockingWall = {
      ...wall,
      x: 81,
      z: -720,
      halfSize: { x: 0.5, y: 65, z: 48 },
      rotation: { x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) },
    };
    const distant = Array.from({ length: 160 }, (_, i) => ({
      ...wall,
      x: -275 + (i % 10) * 55,
      z: -150 - Math.floor(i / 10) * 25,
      halfSize: { x: 4, y: 15, z: 4 },
    }));
    const colliders = [
      ...distant.slice(0, 80),
      blockingWall,
      ...distant.slice(80),
    ];
    const previous = { x: 14, y: -200, z: -682 };
    const desired = { x: 144, y: -200, z: -770 };
    const size = Math.hypot(130, 88);
    const heading = { x: 130 / size, y: 0, z: -88 / size };
    const result = resolveCreatureMotion(previous, desired, heading, habitat, {
      colliders,
      heightAt: () => -720,
    });
    const expected = resolveMotion(previous, desired, {
      colliders,
      radius,
      length,
      forward: heading,
      floorHeight: () => -720 + length * 0.28 + 2,
      bounds: {
        minX: -292,
        maxX: 292,
        minZ: -1142,
        maxZ: 132,
        minY: -680,
        maxY: -100,
      },
    });
    assert.ok(result?.blocked);
    assert.deepEqual(result.position, expected.position);
    assert.equal(result.stuck, expected.stuck);
    assert.equal(
      isPositionBlocked(result.position, {
        colliders,
        radius,
        length,
        forward: heading,
      }),
      false,
    );
  }
});

test("growth recovery falls back to complete geometry before escaping a local cell", async () => {
  const { resolveMotion } = await import("../src/collision.js");
  const habitat = { length: 30, speed: 17, depthMin: 100, depthMax: 680 };
  const colliders = [
    { ...wall, halfSize: { x: 75, y: 200, z: 130 } },
    { ...wall, x: 90, halfSize: { x: 3, y: 200, z: 130 } },
    { ...wall, x: -230, z: -1000, halfSize: { x: 2, y: 10, z: 2 } },
  ];
  const previous = { x: 1, y: -200, z: -500 };
  const desired = { x: 1.1, y: -200, z: -500 };
  const heading = { x: 1, y: 0, z: 0 };
  const result = resolveCreatureMotion(previous, desired, heading, habitat, {
    colliders,
    heightAt: () => -720,
  });
  const expected = resolveMotion(previous, desired, {
    colliders,
    radius: 5.4,
    length: 30,
    forward: heading,
    floorHeight: () => -709.6,
    bounds: {
      minX: -292,
      maxX: 292,
      minZ: -1142,
      maxZ: 132,
      minY: -680,
      maxY: -100,
    },
  });
  assert.ok(result.recovered);
  assert.deepEqual(result.position, expected.position);
  assert.equal(result.stuck, expected.stuck);
});

test("a cached city grid rebuilds when a structural collider is appended", () => {
  const colliders = [{ ...wall, x: -220, z: -1000 }];
  const previous = { x: 0, y: -200, z: -530 };
  const desired = { x: 0, y: -200, z: -480 };
  const heading = { x: 0, y: 0, z: 1 };
  assert.equal(resolve(previous, desired, heading, colliders), null);
  colliders.push(wall);
  const result = resolve(previous, desired, heading, colliders);
  assert.ok(result.blocked);
  assertClear(result, colliders, heading);
});

test("world and territory edge projection cannot bypass an unqueried wall", async () => {
  const { resolveMotion } = await import("../src/collision.js");
  const habitat = { length: 30, speed: 17, depthMin: 100, depthMax: 680 };
  const colliders = [
    { ...wall, x: 288, z: -760, halfSize: { x: 3, y: 40, z: 20 } },
    { ...wall, x: -260, z: -1040, halfSize: { x: 3, y: 40, z: 20 } },
  ];
  for (const [previous, desired, territory] of [
    [{ x: 260, y: -200, z: -710 }, { x: 320, y: -200, z: -790 }, null],
    [{ x: 440, y: -200, z: -760 }, { x: 440.1, y: -200, z: -760 }, null],
    [
      { x: -275, y: -200, z: -1000 },
      { x: -274.9, y: -200, z: -1000 },
      { minX: -280, maxX: -230, minZ: -1080, maxZ: -1040 },
    ],
  ]) {
    const heading = { x: 0, y: 0, z: -1 };
    const result = resolveCreatureMotion(previous, desired, heading, habitat, {
      colliders,
      heightAt: () => -720,
      territory,
    });
    const expected = resolveMotion(previous, desired, {
      colliders,
      radius: 5.4,
      length: 30,
      forward: heading,
      floorHeight: () => -709.6,
      bounds: {
        minX: territory?.minX ?? -292,
        maxX: territory?.maxX ?? 292,
        minZ: territory?.minZ ?? -1142,
        maxZ: territory?.maxZ ?? 132,
        minY: -680,
        maxY: -100,
      },
    });
    assert.ok(result);
    assert.deepEqual(result.position, expected.position);
    assert.equal(result.stuck, expected.stuck);
  }
});

test("a desired position outside territory keeps collision after boundary terrain projection", async () => {
  const { resolveMotion } = await import("../src/collision.js");
  const previous = { x: 0, y: -100, z: 0 };
  const desired = { x: 2, y: -100, z: 0 };
  const direction = { x: 1, y: 0, z: 0 };
  const habitat = { length: 2, depthMin: 5, depthMax: 150 };
  const territory = { minX: -10, maxX: 1, minZ: -10, maxZ: 10 };
  // 目标在边界外深水中，但夹回领地后的目标点位于高海床上方。
  const heightAt = (x) => (Math.abs(x - 1) < 0.2 ? -10 : -200);
  const colliders = [
    {
      type: "box",
      x: 1,
      y: -8,
      z: 0,
      halfSize: { x: 1, y: 2, z: 2 },
    },
  ];
  const result = resolveCreatureMotion(previous, desired, direction, habitat, {
    colliders,
    heightAt,
    territory,
  });
  const expected = resolveMotion(previous, desired, {
    colliders,
    radius: 0.45,
    forward: direction,
    length: habitat.length,
    floorHeight: (x, z) => heightAt(x, z) + habitat.length * 0.28 + 2,
    bounds: { ...territory, minY: -150, maxY: -5 },
  });
  assert.ok(expected.blocked);
  assert.ok(result, "projected target must not skip exact collision");
  assert.deepEqual(result.position, expected.position);
  assert.equal(result.blocked, expected.blocked);
  assert.equal(result.stuck, expected.stuck);
});
