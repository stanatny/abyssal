import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createStaticColliderGrid } from "../src/static_collider_grid.js";
import { castSegment } from "../src/collision.js";

const point = (x, z, y = -200) => ({ x, y, z });
const box = (x, z, halfSize = { x: 4, y: 12, z: 4 }, rotation) => ({
  type: "box",
  x,
  y: -200,
  z,
  halfSize,
  rotation,
});

function assertHitIncluded(collider, start, end, radius = 0) {
  const full = castSegment(start, end, [collider], radius);
  assert.ok(full, "the reference path must actually hit the precise shape");
  const candidates = createStaticColliderGrid([collider], {
    cellSize: 10,
  }).query(start, end, { radius });
  assert.deepEqual(candidates, [collider]);
  assert.deepEqual(castSegment(start, end, candidates, radius), full);
}

test("negative cells and exact grid boundaries retain contact candidates", () => {
  const colliders = [box(-84, -84), box(4, 4), box(84, 84)];
  const grid = createStaticColliderGrid(colliders);
  assert.deepEqual(grid.query(point(-80, -80)), [colliders[0]]);
  assert.deepEqual(grid.query(point(0, 0)), [colliders[1]]);
  assert.deepEqual(grid.query(point(80, 80)), [colliders[2]]);
  assert.deepEqual(grid.query(point(-20, -20)), []);
  assert.deepEqual(grid.query(point(-180, -180), point(180, 180)), colliders);
});

test("repeated queries retain independent results and original duplicate entry order", () => {
  const shared = box(0, 0, { x: 35, y: 12, z: 35 });
  const colliders = [shared, box(-10, -10), shared, box(150, 150)];
  const grid = createStaticColliderGrid(colliders, { cellSize: 10 });
  const first = grid.query(point(0, 0), point(20, 20), { padding: 10 });
  assert.deepEqual(first, colliders.slice(0, 3));
  for (let i = 0; i < 2000; i++) {
    assert.deepEqual(grid.query(point(150, 150)), [colliders[3]]);
    assert.deepEqual(grid.query(point(500, 500)), []);
    assert.deepEqual(
      grid.query(point(0, 0), point(20, 20), { padding: 10 }),
      first,
    );
  }
  const second = grid.query(point(0, 0), point(20, 20), { padding: 10 });
  assert.notEqual(second, first);
  second.length = 0;
  assert.deepEqual(first, colliders.slice(0, 3));
});

test("all corners of a box rotated on three axes remain indexed", () => {
  const rotation = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0.7, 0.83, 0.4),
  );
  const collider = box(79, -81, { x: 29, y: 21, z: 37 }, rotation);
  const grid = createStaticColliderGrid([collider], { cellSize: 10 });
  for (const x of [-29, 29])
    for (const y of [-21, 21])
      for (const z of [-37, 37]) {
        const corner = new THREE.Vector3(x, y, z)
          .applyQuaternion(rotation)
          .add(collider);
        assert.deepEqual(grid.query(corner, corner, { padding: 1e-8 }), [
          collider,
        ]);
      }
  // 半径在盒局部三轴各外扩，查询不能仅用世界轴上的 radius。
  const thin = box(
    0,
    0,
    { x: 0.1, y: 20, z: 0.1 },
    new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 4,
    ),
  );
  assertHitIncluded(thin, point(1.1, -8), point(1.1, 8), 1);
});

test("capsules spanning multiple cells keep both tips and their connecting shaft", () => {
  const capsule = {
    type: "capsule",
    a: point(-180, -200),
    b: point(190, 180),
    radius: 3,
  };
  const grid = createStaticColliderGrid([capsule], { cellSize: 20 });
  for (const position of [capsule.a, capsule.b, point(5, -10)])
    assert.deepEqual(grid.query(position), [capsule]);
  assertHitIncluded(capsule, point(-30, -10), point(30, -10), 5);
});

test("rotated ellipsoids and their conservative inflated long axes cannot be omitted", () => {
  const rotated = {
    type: "ellipsoid",
    x: 78,
    y: -200,
    z: -82,
    axes: { x: 2, y: 10, z: 34 },
    rotation: new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0.5, 0.8, 0.6),
    ),
  };
  const grid = createStaticColliderGrid([rotated], { cellSize: 10 });
  for (let i = 0; i < 80; i++) {
    const angle = (i * Math.PI * 2) / 80;
    const surface = new THREE.Vector3(
      2 * Math.cos(angle),
      0,
      34 * Math.sin(angle),
    )
      .applyQuaternion(rotated.rotation)
      .add(rotated);
    assert.deepEqual(grid.query(surface, surface, { padding: 1e-8 }), [
      rotated,
    ]);
  }
  const slender = {
    type: "ellipsoid",
    x: 0,
    y: -200,
    z: 0,
    axes: { x: 100, y: 0.1, z: 0.1 },
  };
  // collision.js 的 Minkowski 外包椭球在此远超原长轴加 2m，粗筛必须保持其保守行为。
  assertHitIncluded(slender, point(145, -20), point(145, 20), 2);
});

test("oversized walls and enormous queries are finite, deduplicated and stable", () => {
  const giant = box(0, 0, { x: 2000, y: 20, z: 0.5 });
  const small = box(79, 0);
  const colliders = [small, giant, box(-79, 0)];
  const grid = createStaticColliderGrid(colliders, {
    cellSize: 10,
    maxCellsPerCollider: 4,
  });
  assert.deepEqual(grid.query(point(1900, 0)), [giant]);
  assert.deepEqual(grid.query(point(1900, 20)), []);
  assert.deepEqual(grid.query(point(-1e8, -1e8), point(1e8, 1e8)), colliders);
  assert.deepEqual(grid.query(point(-100, -10), point(100, 10)), colliders);
});

test("a 30 m creature consults a local fraction of a map-wide dense city", () => {
  const colliders = [];
  for (let x = -265; x <= 265; x += 53) {
    for (let z = -1060; z <= -100; z += 40) {
      for (const offset of [-8, 8])
        colliders.push(box(x + offset, z, { x: 5, y: 14, z: 9 }));
    }
  }
  const grid = createStaticColliderGrid(colliders);
  const radius = 30 * 0.18;
  const candidates = grid.query(point(0, -700), point(0.2, -700.2), {
    radius,
    padding: 30 * 0.42 - radius + 0.5,
  });
  assert.ok(candidates.length > 0);
  assert.ok(
    candidates.length < colliders.length * 0.05,
    `${candidates.length} candidates from ${colliders.length} colliders`,
  );
  assert.deepEqual(grid.query(point(0, 75)), []);
});

test("query and grid dimensions reject non-finite or negative input", () => {
  assert.throws(
    () => createStaticColliderGrid([], { cellSize: 0 }),
    /cell size/,
  );
  assert.throws(
    () => createStaticColliderGrid([], { maxCellsPerCollider: 0 }),
    /cell limit/,
  );
  const grid = createStaticColliderGrid([]);
  assert.throws(() => grid.query(point(Infinity, 0)), /finite nonnegative/);
  assert.throws(
    () => grid.query(point(0, 0), point(0, 0), { radius: -1 }),
    /finite nonnegative/,
  );
});

test("stacked streets exclude other floors but retain vertical sweeps and 2D callers", () => {
  const levels = [-600, -400, -200].map((y) => ({ ...box(0, 0), y }));
  const grid = createStaticColliderGrid(levels);
  assert.deepEqual(grid.query(point(0, 0, -400)), [levels[1]]);
  assert.deepEqual(grid.query(point(0, 0, -650), point(0, 0, -150)), levels);
  assert.deepEqual(grid.query({ x: 0, z: 0 }), levels);
  assert.deepEqual(
    grid.query(point(0, 0, -400), undefined, { vertical: false }),
    levels,
  );
  const overhead = {
    ...box(
      0,
      0,
      { x: 20, y: 0.1, z: 0.1 },
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0.7, 0.5, 0.9)),
    ),
    y: -400,
  };
  const full = castSegment(point(0, 0, -450), point(0, 0, -350), [overhead], 2);
  assert.ok(full);
  assert.deepEqual(
    castSegment(
      point(0, 0, -450),
      point(0, 0, -350),
      createStaticColliderGrid([overhead]).query(
        point(0, 0, -450),
        point(0, 0, -350),
        { radius: 2 },
      ),
      2,
    ),
    full,
  );
});

test("deep stacked habitats match a full 3D bounds oracle for varied sweeps", () => {
  const colliders = [];
  for (let level = 0; level < 100; level++)
    for (const x of [-80, 0, 80])
      colliders.push({
        type: "sphere",
        x,
        y: -level * 30,
        z: -400,
        radius: 8,
      });
  const grid = createStaticColliderGrid(colliders, { cellSize: 40 });
  let seed = 41237;
  const random = () =>
    (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 2400; i++) {
    const start = { x: random() * 220 - 110, y: -random() * 3000, z: -400 };
    const end = {
      x: start.x + random() * 50 - 25,
      y: start.y + random() * (i % 2 ? 2000 : 80) - 40,
      z: -400 + random() * 40 - 20,
    };
    const padding = random() * 15;
    const radius = random() * 7;
    const vertical = i % 7 !== 0;
    const margin = padding + radius + 1e-7;
    const expected = colliders.filter(
      (c) =>
        c.x + c.radius >= Math.min(start.x, end.x) - margin &&
        c.x - c.radius <= Math.max(start.x, end.x) + margin &&
        c.z + c.radius >= Math.min(start.z, end.z) - margin &&
        c.z - c.radius <= Math.max(start.z, end.z) + margin &&
        (!vertical ||
          (c.y + c.radius >= Math.min(start.y, end.y) - margin &&
            c.y - c.radius <= Math.max(start.y, end.y) + margin)),
    );
    assert.deepEqual(
      grid.query(start, end, { padding, radius, vertical }),
      expected,
    );
  }
});

test("tall oversized solids and exact height-cell boundaries retain narrow-phase hits", () => {
  const wall = { ...box(0, 0, { x: 2, y: 2000, z: 2 }), y: -1500 };
  const floors = [-80, -160, -240].map((y) => ({
    ...box(0, 0, { x: 20, y: 0, z: 20 }),
    y,
  }));
  const colliders = [floors[0], wall, floors[1], wall, floors[2]];
  const grid = createStaticColliderGrid(colliders, {
    cellSize: 80,
    maxCellsPerCollider: 4,
  });
  for (const y of [-80, -160, -240, -1600]) {
    const start = point(-40, 0, y),
      end = point(40, 0, y);
    const candidates = grid.query(start, end);
    assert.deepEqual(
      castSegment(start, end, candidates),
      castSegment(start, end, colliders),
    );
    assert.equal(candidates.filter((c) => c === wall).length, 2);
  }
  assert.deepEqual(grid.query({ x: 0, z: 0 }), colliders);
});
