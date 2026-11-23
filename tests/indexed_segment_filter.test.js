import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import {
  createStaticColliderGrid,
  castIndexedSegment,
} from "../src/static_collider_grid.js";
import { castSegment } from "../src/collision.js";

test("Long diagonal sight rays exclude off-ray solids while preserving exact nearest hits and duplicate order", () => {
  const solids = [];
  for (let x = -180; x <= 180; x += 9)
    for (let z = -180; z <= 180; z += 9)
      solids.push({
        type: "box",
        x,
        y: -500,
        z,
        halfSize: new T.Vector3(1, 12, 1),
      });
  const duplicate = solids[Math.floor(solids.length / 2)];
  solids.push(duplicate, duplicate);
  const grid = createStaticColliderGrid(solids),
    a = new T.Vector3(-210, -500, -210),
    b = new T.Vector3(210, -500, 210),
    broad = grid.query(a, b, { radius: 0.45 }),
    narrow = grid.query(a, b, { radius: 0.45, segment: true });
  assert.equal(broad.length, solids.length);
  assert.ok(narrow.length < broad.length / 8);
  assert.deepEqual(narrow.slice(-2), [duplicate, duplicate]);
  assert.deepEqual(
    castSegment(a, b, narrow, 0.45),
    castSegment(a, b, solids, 0.45),
  );
  assert.deepEqual(
    castIndexedSegment(a, b, { staticColliders: solids, radius: 0.45 }),
    castSegment(a, b, solids, 0.45),
  );
  assert.deepEqual(grid.query(a, b, { radius: 0.45 }), broad);
});

test("Padded mixed-shape rays retain exact full-solver results at arbitrary headings and both travel directions", () => {
  let seed = 12719;
  const random = () =>
      (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32,
    solids = Array.from({ length: 160 }, (_, i) => {
      const x = random() * 260 - 130,
        y = random() * 180 - 600,
        z = random() * 260 - 130,
        rotation = new T.Quaternion().setFromEuler(
          new T.Euler(random(), random(), random()),
        );
      if (i % 4 === 0)
        return { type: "sphere", x, y, z, radius: 0.5 + random() * 4 };
      if (i % 4 === 1)
        return {
          type: "capsule",
          a: new T.Vector3(x - 3, y, z - 6),
          b: new T.Vector3(x + 8, y + 12, z + 7),
          radius: 1.2,
        };
      return {
        type: i % 4 === 2 ? "box" : "ellipsoid",
        x,
        y,
        z,
        rotation,
        ...(i % 4 === 2
          ? { halfSize: new T.Vector3(0.3, 15, 6) }
          : { axes: new T.Vector3(40, 0.25, 2) }),
      };
    });
  for (let i = 0; i < 600; i++) {
    const a = new T.Vector3(
        random() * 340 - 170,
        random() * 220 - 620,
        random() * 340 - 170,
      ),
      b =
        i % 9 === 0
          ? a.clone()
          : new T.Vector3(
              random() * 340 - 170,
              random() * 220 - 620,
              random() * 340 - 170,
            ),
      radius = [0, 0.45, 3.9][i % 3];
    assert.deepEqual(
      castIndexedSegment(a, b, { staticColliders: solids, radius }),
      castSegment(a, b, solids, radius),
      `Exact ray ${i}`,
    );
  }
});

test("Point penetrations, axis-parallel tangencies and shells keep the previous candidate semantics", () => {
  const sphere = { type: "sphere", x: 0, y: -100, z: 0, radius: 2 },
    shell = {
      type: "sphere_shell",
      x: 20,
      y: -100,
      z: 20,
      radius: 10,
      thickness: 2,
    },
    solids = [sphere, shell],
    grid = createStaticColliderGrid(solids);
  for (const [a, b, radius] of [
    [new T.Vector3(0, -100, 0), new T.Vector3(0, -100, 0), 1],
    [new T.Vector3(2, -100, -10), new T.Vector3(2, -100, 10), 0],
    [new T.Vector3(20, -100, 20), new T.Vector3(50, -100, 20), 0.45],
  ])
    assert.deepEqual(
      castIndexedSegment(a, b, { staticColliders: solids, radius }),
      castSegment(a, b, solids, radius),
    );
  const a = new T.Vector3(-10, -100, 40),
    b = new T.Vector3(40, -100, -10);
  assert.deepEqual(
    grid.query(a, b).filter((c) => c === shell),
    grid.query(a, b, { segment: true }).filter((c) => c === shell),
  );
});
