import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  castIndexedSegment,
  resolveIndexedMotion,
} from "../src/static_collider_grid.js";
import { castSegment } from "../src/collision.js";
import { createAtlantisCity } from "../src/atlantis_city.js";
import { seabedHeight } from "../src/ocean.js";

const point = (x, y = -200, z = -700) => ({ x, y, z });
const box = (x, halfSize = { x: 1, y: 20, z: 20 }, rotation) => ({
  type: "box",
  x,
  y: -200,
  z: -700,
  halfSize,
  rotation,
});
const DISTANT = Array.from({ length: 200 }, (_, i) => ({
  ...box(-270 + (i % 11) * 54),
  z: -100 - Math.floor(i / 11) * 20,
  halfSize: { x: 3, y: 12, z: 3 },
}));

function assertMatches(start, end, options) {
  const { staticColliders = [], dynamicColliders = [], radius = 0 } = options;
  const expected = castSegment(
    start,
    end,
    [...staticColliders, ...dynamicColliders],
    radius,
  );
  const actual = castIndexedSegment(start, end, options);
  assert.deepEqual(actual, expected);
  if (expected) assert.equal(actual.collider, expected.collider);
  return actual;
}

test("rotated boxes, capsules and elongated ellipsoids retain exact hits at nonzero radius", () => {
  const shapes = [
    box(
      0,
      { x: 0.2, y: 30, z: 24 },
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0.7, 0.4)),
    ),
    {
      type: "capsule",
      a: point(-18, -235, -735),
      b: point(18, -170, -665),
      radius: 3,
    },
    {
      type: "ellipsoid",
      x: 0,
      y: -200,
      z: -700,
      axes: { x: 40, y: 2, z: 0.2 },
      rotation: new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0.2, 0.4, 0.1),
      ),
    },
  ];
  for (const shape of shapes)
    for (const radius of [0, 0.65, 3.9]) {
      const result = assertMatches(point(-100), point(100), {
        staticColliders: [
          ...DISTANT.slice(0, 100),
          shape,
          ...DISTANT.slice(100),
        ],
        radius,
      });
      assert.ok(result);
      assert.equal(result.collider, shape);
    }
  const slender = {
    type: "ellipsoid",
    x: 0,
    y: -200,
    z: -700,
    axes: { x: 100, y: 0.1, z: 0.1 },
  };
  assert.ok(
    assertMatches(point(145, -200, -720), point(145, -200, -680), {
      staticColliders: [...DISTANT, slender],
      radius: 2,
    }),
  );
});

test("nearest wall and equal-distance ties preserve full input order", () => {
  const first = box(0),
    twin = box(0),
    behind = box(25),
    inFront = box(-20);
  const options = {
    staticColliders: [...DISTANT, behind, first, twin],
    dynamicColliders: [box(0)],
  };
  assert.equal(assertMatches(point(-50), point(50), options).collider, first);
  assert.equal(assertMatches(point(50), point(-50), options).collider, behind);
  options.dynamicColliders.push(inFront);
  assert.equal(assertMatches(point(-50), point(50), options).collider, inFront);
  assert.equal(assertMatches(point(-50), point(-30), options), null);
  assert.equal(assertMatches(point(30), point(50), options), null);
});

test("zero-length casts retain penetration hits and empty-space misses", () => {
  const wall = box(0);
  const options = { staticColliders: [...DISTANT, wall], radius: 3.9 };
  assert.ok(assertMatches(point(0), point(0), options));
  assert.ok(assertMatches(point(3), point(3), options));
  assert.equal(assertMatches(point(50), point(50), options), null);
  assert.equal(castIndexedSegment(point(0), point(0)), null);
});

test("ships can move or be replaced at the same array length without stale rays", () => {
  const ship = box(0);
  const dynamicColliders = [ship];
  const options = { staticColliders: DISTANT, dynamicColliders, radius: 0.65 };
  const start = point(-40),
    end = point(40);
  assert.equal(assertMatches(start, end, options).collider, ship);
  ship.x = 100;
  assert.equal(assertMatches(start, end, options), null);
  ship.x = 20;
  ship.rotation = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    Math.PI / 4,
  );
  assert.equal(assertMatches(start, end, options).collider, ship);
  const human = {
    type: "capsule",
    a: point(-15, -202),
    b: point(-15, -198),
    radius: 0.5,
  };
  dynamicColliders[0] = human;
  assert.equal(assertMatches(start, end, options).collider, human);
  assert.equal(assertMatches(start, end, { dynamicColliders }).collider, human);
});

test("motion and ray calls share immutable static geometry and rebuild after append", () => {
  const staticColliders = [...DISTANT];
  const start = point(-30),
    end = point(30);
  assert.equal(
    resolveIndexedMotion(start, end, { staticColliders, radius: 2 }).blocked,
    false,
  );
  assert.equal(assertMatches(start, end, { staticColliders }), null);
  const wall = box(0);
  staticColliders.push(wall);
  const original = structuredClone({ start, end, staticColliders });
  assert.equal(assertMatches(start, end, { staticColliders }).collider, wall);
  assert.ok(
    resolveIndexedMotion(start, end, { staticColliders, radius: 2 }).blocked,
  );
  assert.deepEqual({ start, end, staticColliders }, original);
});

test("representative real-city street and clear-water rays match full geometry", () => {
  const scene = new THREE.Scene();
  const city = createAtlantisCity(scene, { heightAt: seabedHeight });
  try {
    const buildings = city.colliders.filter(
      (entry) => entry.type === "box" && entry.halfSize.y > 4,
    );
    assert.ok(buildings.length > 50);
    let hits = 0;
    for (let i = 0; i < 12; i++) {
      const wall = buildings[Math.floor((i * buildings.length) / 12)];
      const start = { x: wall.x - 45, y: wall.y, z: wall.z };
      const end = { x: wall.x + 45, y: wall.y, z: wall.z };
      if (
        assertMatches(start, end, {
          staticColliders: city.colliders,
          radius: i % 2 ? 3.9 : 0,
        })
      )
        hits++;
    }
    assert.equal(hits, 12);
    for (const z of [-180, -500, -730, -1000]) {
      assert.equal(
        assertMatches(point(-275, 30, z), point(275, 30, z), {
          staticColliders: city.colliders,
          radius: 0.65,
        }),
        null,
      );
    }
  } finally {
    city.dispose();
  }
  assert.equal(scene.children.length, 0);
});
