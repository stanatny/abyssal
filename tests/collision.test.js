import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveMotion,
  castSegment,
  segmentBlocked,
  isPositionBlocked,
  bodyRadius,
} from "../src/collision.js";

const point = (x, y = 0, z = 0) => ({ x, y, z });
const box = (x, y, z, hx, hy, hz, rotation) => ({
  type: "box",
  x,
  y,
  z,
  halfSize: point(hx, hy, hz),
  rotation,
});
const near = (actual, expected, tolerance = 0.05) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} should be near ${expected}`,
  );

test("continuous sweep stops a 32 m/s sprint crossing a thin hull", () => {
  const hull = box(0, 4, 0, 0.15, 1.8, 12);
  const result = resolveMotion(point(-16, 4), point(16, 4), {
    colliders: [hull],
    radius: 1,
  });
  assert.ok(result.blocked);
  near(result.position.x, -1.175);
  assert.ok(
    !isPositionBlocked(result.position, { colliders: [hull], radius: 1 }),
  );
});

test("oblique impacts preserve tangent movement along a wall", () => {
  const wall = box(0, 0, 0, 0.5, 20, 30);
  const result = resolveMotion(point(-8, 0, -6), point(8, 0, 10), {
    colliders: [wall],
    radius: 1,
  });
  assert.ok(result.blocked);
  near(result.position.x, -1.52);
  near(result.position.z, 10);
});

test("a finite rotated boat permits a deep underwater route but blocks its side", () => {
  const angle = Math.PI / 4;
  const rotation = {
    x: 0,
    y: Math.sin(angle / 2),
    z: 0,
    w: Math.cos(angle / 2),
  };
  const hull = box(0, 4, 0, 4, 1.8, 18, rotation);
  const underwater = resolveMotion(point(-30, -1), point(30, -1), {
    colliders: [hull],
    radius: 1,
  });
  assert.equal(underwater.blocked, false);
  near(underwater.position.x, 30);
  const atHull = resolveMotion(point(-30, 4), point(30, 4), {
    colliders: [hull],
    radius: 1,
  });
  assert.ok(atHull.blocked);
  assert.ok(
    !isPositionBlocked(atHull.position, { colliders: [hull], radius: 1 }),
  );
});

test("airborne descent cannot tunnel through a thin ship deck", () => {
  const deck = box(0, 5.5, 0, 5, 0.2, 20);
  const result = resolveMotion(point(0, 24), point(0, -8), {
    colliders: [deck],
    radius: 1,
  });
  near(result.position.y, 6.725);
  assert.ok(result.contacts.some(({ normal }) => normal.y > 0.9));
  const beneath = resolveMotion(point(0, -8), point(0, 24), {
    colliders: [deck],
    radius: 1,
  });
  near(beneath.position.y, 4.275);
  assert.ok(beneath.contacts.some(({ normal }) => normal.y < -0.9));
});

test("long fish nose contacts the reef before its center enters", () => {
  const reef = { x: 0, y: 0, z: 0, radius: 2 };
  const result = resolveMotion(point(-20), point(2), {
    colliders: [reef],
    radius: 2,
    length: 20,
    forward: point(1),
  });
  assert.ok(result.position.x < -10.3);
  assert.ok(
    !isPositionBlocked(result.position, {
      colliders: [reef],
      radius: 2,
      length: 20,
      forward: point(1),
    }),
  );
});

test("continuous arch segments keep the opening passable but stop rim crossings", () => {
  const arch = [];
  for (let index = 0; index < 24; index++) {
    const a = (index / 24) * Math.PI,
      b = ((index + 1) / 24) * Math.PI;
    arch.push({
      type: "capsule",
      a: point(Math.cos(a) * 15, Math.sin(a) * 15),
      b: point(Math.cos(b) * 15, Math.sin(b) * 15),
      radius: 2,
    });
  }
  assert.equal(
    segmentBlocked(point(0, 5, -20), point(0, 5, 20), arch, 1),
    false,
  );
  const result = resolveMotion(point(0, 15, -20), point(0, 15, 20), {
    colliders: arch,
    radius: 1,
  });
  assert.ok(result.position.z < -3);
});

test("growth in a tight rock gap recovers without sinking through the seabed", () => {
  const colliders = [box(-4, 3, 0, 2, 4, 4), box(4, 3, 0, 2, 4, 4)];
  const options = {
    colliders,
    radius: bodyRadius(30),
    length: 30,
    forward: point(0, 0, -1),
    floorHeight: () => 3.9,
    bounds: { minX: -40, maxX: 40, minZ: -40, maxZ: 40, minY: 3.9, maxY: 10 },
  };
  const result = resolveMotion(point(0, 3.9), point(0, 3.9), options);
  assert.ok(result.recovered);
  assert.equal(result.stuck, false);
  assert.ok(result.position.y >= 3.9 && result.position.y <= 10);
  assert.equal(isPositionBlocked(result.position, options), false);
});

test("growing inside an ellipsoid exits using a finite outward normal", () => {
  const rock = { type: "ellipsoid", x: 0, y: 0, z: 0, axes: point(4, 9, 3) };
  const result = resolveMotion(point(0), point(0), {
    colliders: [rock],
    radius: 3,
  });
  assert.equal(result.stuck, false);
  assert.ok(
    Number.isFinite(result.position.x + result.position.y + result.position.z),
  );
  assert.equal(
    isPositionBlocked(result.position, { colliders: [rock], radius: 3 }),
    false,
  );
});

test("sliding around a corner cannot cross the second wall", () => {
  const colliders = [box(0, 0, 0, 0.5, 20, 30), box(-10, 0, 7, 10, 20, 0.5)];
  const result = resolveMotion(point(-10, 0, -10), point(20, 0, 25), {
    colliders,
    radius: 1,
  });
  assert.ok(result.position.x <= -1.5 && result.position.z <= 5.5);
  assert.equal(
    isPositionBlocked(result.position, { colliders, radius: 1 }),
    false,
  );
});

test("camera cast returns nearest distance and supports legacy obstacle balls", () => {
  const obstacles = [
    { x: 0, y: 0, z: 6, radius: 1 },
    { x: 0, y: 0, z: 14, radius: 2 },
  ];
  const hit = castSegment(point(0), point(0, 0, 20), obstacles, 0.4);
  near(hit.distance, 4.6, 0.00001);
  assert.equal(hit.collider, obstacles[0]);
  assert.equal(castSegment(point(5), point(5, 0, 20), obstacles), null);
});

test("empty habitat permits a 30 m fish and respects center floor and bounds", () => {
  const result = resolveMotion(point(0, -18, 75), point(500, -40, 200), {
    radius: bodyRadius(30),
    length: 30,
    forward: point(0, 0, -1),
    floorHeight: () => -20,
    bounds: { minX: -290, maxX: 290, minZ: -1140, maxZ: 130, maxY: 4 },
  });
  assert.equal(result.stuck, false);
  assert.deepEqual(result.position, point(290, -20, 130));
});

test("collision checks do not mutate input transforms or obstacle data", () => {
  const start = Object.freeze(point(-5));
  const end = Object.freeze(point(5));
  const collider = Object.freeze({ x: 0, y: 0, z: 0, radius: 1 });
  const result = resolveMotion(start, end, {
    colliders: [collider],
    radius: 1,
  });
  assert.ok(result.blocked);
  assert.equal(start.x, -5);
  assert.equal(end.x, 5);
});

test("repeated sprint input cannot accumulate penetration into a hull", () => {
  const hull = box(0, 4, 0, 0.1, 1.8, 18);
  let position = point(-4, 4);
  for (let frame = 0; frame < 300; frame++) {
    position = resolveMotion(position, point(position.x + 32 / 60, 4), {
      colliders: [hull],
      radius: 0.78,
    }).position;
  }
  assert.ok(position.x <= -0.88);
  assert.equal(
    isPositionBlocked(position, { colliders: [hull], radius: 0.78 }),
    false,
  );
});

test("capsule pillar blocks high and low sections as well as its center", () => {
  const pillar = {
    type: "capsule",
    a: point(0, -12),
    b: point(0, 12),
    radius: 2,
  };
  for (const y of [-11, 0, 11]) {
    const hit = castSegment(point(-30, y), point(30, y), [pillar], 1);
    near(hit.point.x, -3, 0.00001);
  }
});

test("actual scene keeps the default spawn clear at 6, 20 and 30 m", async () => {
  const THREE = await import("three");
  const { createOcean, seabedHeight } = await import("../src/ocean.js");
  const scene = new THREE.Scene();
  const ocean = createOcean(scene);
  try {
    assert.ok(
      ocean.colliders.filter((collider) => collider.kind === "reef").length ===
        280,
    );
    assert.ok(ocean.colliders.some((collider) => collider.kind === "arch"));
    assert.ok(ocean.colliders.some((collider) => collider.kind === "landmark"));
    for (const length of [6, 20, 30]) {
      const start = point(0, -18, 75);
      const options = {
        colliders: ocean.colliders,
        radius: bodyRadius(length),
        length,
        forward: point(0, 0, -1),
        floorHeight: (x, z) => seabedHeight(x, z) + bodyRadius(length) + 0.5,
        bounds: {
          minX: -290,
          maxX: 290,
          minZ: -1140,
          maxZ: 130,
          maxY: 4 - length * 0.15,
        },
      };
      const result = resolveMotion(start, start, options);
      assert.deepEqual(result.position, start);
      assert.equal(result.stuck, false);
      assert.equal(result.blocked, false);
    }
  } finally {
    ocean.dispose();
  }
  assert.equal(scene.children.length, 0);
});
