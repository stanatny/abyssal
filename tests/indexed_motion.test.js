import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { resolveIndexedMotion } from "../src/static_collider_grid.js";
import {
  resolveMotion,
  bodyRadius,
  isPositionBlocked,
} from "../src/collision.js";

const point = (x, y, z) => ({ x, y, z });
const box = (x, y, z, hx, hy, hz, rotation) => ({
  type: "box",
  x,
  y,
  z,
  halfSize: point(hx, hy, hz),
  rotation,
});
const BOUNDS = {
  minX: -295,
  maxX: 295,
  minZ: -1145,
  maxZ: 135,
  minY: -736.1,
  maxY: -0.5,
};
const DISTANT = Array.from({ length: 550 }, (_, i) =>
  box(-270 + (i % 11) * 54, -500, -1080 + Math.floor(i / 11) * 18, 3, 12, 3),
);

function assertMatches(previous, desired, options) {
  const { staticColliders = [], dynamicColliders = [], ...exact } = options;
  const expected = resolveMotion(previous, desired, {
    ...exact,
    colliders: [...staticColliders, ...dynamicColliders],
  });
  const actual = resolveIndexedMotion(previous, desired, options);
  assert.deepEqual(actual, expected);
  return actual;
}

test("25 and 30 m diagonal fast player sweeps match all static and dynamic contacts", () => {
  const rotation = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    Math.PI / 5,
  );
  const staticColliders = [
    ...DISTANT,
    box(82, -200, -730, 0.3, 60, 50, rotation),
  ];
  for (const length of [25, 30]) {
    const previous = point(10, -200, -680);
    const desired = point(140, -200, -780);
    const forward = new THREE.Vector3()
      .subVectors(desired, previous)
      .normalize();
    const options = {
      staticColliders,
      dynamicColliders: [box(230, -200, -820, 4, 10, 12)],
      length,
      radius: bodyRadius(length),
      forward,
      floorHeight: () => -650,
      bounds: BOUNDS,
    };
    const result = assertMatches(previous, desired, options);
    assert.ok(result.blocked);
    assert.equal(result.stuck, false);
    assert.equal(
      isPositionBlocked(result.position, {
        ...options,
        colliders: staticColliders,
      }),
      false,
    );
  }
});

test("a moving ship and same-count collider replacement always use current transforms", () => {
  const ship = box(0, -2, 40, 2, 5, 15);
  const dynamicColliders = [ship];
  const previous = point(-80, -2, 40),
    desired = point(80, -2, 40);
  const options = {
    staticColliders: DISTANT,
    dynamicColliders,
    radius: 3.9,
    length: 30,
    forward: point(1, 0, 0),
    floorHeight: () => -30,
    bounds: BOUNDS,
  };
  const first = assertMatches(previous, desired, options);
  assert.ok(first.blocked);
  assert.equal(first.contacts[0].collider, ship);
  ship.x = 190;
  assert.equal(assertMatches(previous, desired, options).blocked, false);
  ship.x = -35;
  ship.rotation = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    Math.PI / 4,
  );
  const moved = assertMatches(previous, desired, options);
  assert.ok(moved.blocked);
  assert.ok(moved.contacts[0].time < first.contacts[0].time);
  const swimmer = {
    type: "capsule",
    a: point(25, -6, 40),
    b: point(25, 0, 40),
    radius: 0.5,
  };
  dynamicColliders[0] = swimmer;
  const replaced = assertMatches(previous, desired, options);
  assert.ok(replaced.blocked);
  assert.equal(replaced.contacts[0].collider, swimmer);
});

test("30 m growth recovery includes neighboring buildings outside the original query", () => {
  const staticColliders = [
    box(0, -200, -500, 75, 200, 130),
    box(90, -200, -500, 3, 200, 130),
    ...DISTANT,
  ];
  const previous = point(1, -200, -500),
    desired = point(1.1, -200, -500);
  const result = assertMatches(previous, desired, {
    staticColliders,
    dynamicColliders: [box(-95, -200, -500, 3, 200, 130)],
    radius: bodyRadius(30),
    length: 30,
    forward: point(1, 0, 0),
    floorHeight: () => -650,
    bounds: BOUNDS,
  });
  assert.ok(result.recovered);
});

test("sloped floors, partial bounds and airborne ceilings preserve exact projection", () => {
  const roof = box(
    40,
    -100,
    -720,
    70,
    1,
    30,
    new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      Math.PI / 5,
    ),
  );
  const staticColliders = [...DISTANT, roof];
  const options = {
    staticColliders,
    radius: bodyRadius(30),
    length: 30,
    forward: point(0.6, 0.8, 0),
    floorHeight: (x, z) => -200 + x * 0.4 + (z + 720) * 0.1,
    bounds: { minX: -100, maxX: 180, minZ: -900, maxZ: -600, minY: -300 },
  };
  const hit = assertMatches(
    point(20, -160, -720),
    point(100, -60, -720),
    options,
  );
  assert.ok(hit.contacts.some((contact) => Math.abs(contact.normal.y) > 0.1));
  const outside = assertMatches(
    point(400, -160, -720),
    point(400.1, -160, -720),
    options,
  );
  assert.ok(outside.position.x <= 180);
  const noStatic = assertMatches(point(0, -220, -700), point(400, 80, -700), {
    ...options,
    staticColliders: [],
  });
  assert.equal(noStatic.position.x, 180);
  // 起点先从 -220 校正至斜坡 -198，再保留原始向上 300m 的位移。
  assert.equal(noStatic.position.y, 102);
});

test("an empty local candidate set still enforces floor and world constraints", () => {
  const result = assertMatches(point(0, -40, 70), point(0, -60, 80), {
    staticColliders: DISTANT,
    radius: bodyRadius(30),
    length: 30,
    forward: point(0, -0.8, -0.6),
    floorHeight: () => -24,
    bounds: BOUNDS,
  });
  assert.equal(result.position.y, -24);
  assert.equal(result.blocked, false);
});

test("static array growth rebuilds cached geometry without mutating any inputs", () => {
  const staticColliders = [...DISTANT];
  const previous = point(-40, -200, 50),
    desired = point(40, -200, 50);
  const options = {
    staticColliders,
    radius: 3.9,
    length: 30,
    forward: point(1, 0, 0),
  };
  assert.equal(assertMatches(previous, desired, options).blocked, false);
  staticColliders.push(box(0, -200, 50, 0.4, 20, 20));
  const original = structuredClone({ previous, desired, options });
  assert.ok(assertMatches(previous, desired, options).blocked);
  assert.deepEqual({ previous, desired, options }, original);
});

test("vertical projection into another floor retains the full exact solution", () => {
  const staticColliders = [
    box(0, -190, -500, 8, 2, 8),
    box(12, -140, -500, 8, 2, 8),
    ...DISTANT,
  ];
  for (const [previous, desired, options] of [
    [point(0, -250, -500), point(1, -249, -500), { floorHeight: () => -190 }],
    [
      point(0, -250, -500),
      point(1, -249, -500),
      { bounds: { minY: -190, maxY: 0 } },
    ],
    [
      point(-20, -200, -500),
      point(20, -200, -500),
      { floorHeight: (x) => (x > 0 ? -140 : -220) },
    ],
    [
      point(-20, -200, -500),
      point(20, -160, -500),
      { floorHeight: () => -600 },
    ],
  ])
    assertMatches(previous, desired, {
      staticColliders,
      radius: 2,
      length: 9,
      forward: point(1, 0, 0),
      ...options,
    });
});
