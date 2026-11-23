import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createStaticColliderGrid } from "../src/static_collider_grid.js";
import {
  createTitanLavaSheet,
  isTitanLavaCellBlocked,
} from "../src/bermuda_titan_hazards.js";

test("Exact lava-cell AABBs retain padded rotated-box and sphere SAT outcomes through the actor's actual quarter-turn transform", (t) => {
  const sheet = createTitanLavaSheet(
      { x: 0, y: 30, z: 0 },
      { x: 1, y: 0, z: 0 },
      {
        id: "floor",
        impact: { x: 60, y: 0.12, z: 0 },
        normal: { x: 0, y: 1, z: 0 },
        roof: { x: 60, y: 100, z: 0 },
        floorAt: () => 0,
      },
      { width: 48, seed: 81 },
    ),
    rotation = new T.Quaternion().setFromAxisAngle(
      new T.Vector3(0, 1, 0),
      -Math.PI / 2,
    ),
    matrix = new T.Matrix4().compose(
      new T.Vector3(-205, -600, -1590),
      rotation,
      new T.Vector3(1, 1, 1),
    ),
    inverse = matrix.clone().invert(),
    colliders = [];
  for (let i = 0; i < 140; i++) {
    const c = {
      id: `moving_${i}`,
      x: -10 + (i % 10) * 10,
      y: -5 + (Math.floor(i / 10) % 7) * 10,
      z: -35 + Math.floor(i / 70) * 70,
    };
    colliders.push(
      i % 2
        ? { ...c, type: "sphere", radius: 1.1 }
        : {
            ...c,
            type: "box",
            halfSize: new T.Vector3(1, 2, 3),
            rotation: new T.Quaternion().setFromEuler(
              new T.Euler(0.3, 0.7, 0.2),
            ),
          },
    );
  }
  for (let i = 15; i < sheet.cells.length; i += 17) {
    const center = sheet.cells[i].vertices
      .reduce((p, v) => p.add(new T.Vector3(v.x, v.y, v.z)), new T.Vector3())
      .multiplyScalar(1 / 8);
    colliders.push({
      id: `interior_${i}`,
      type: "sphere",
      x: center.x,
      y: center.y,
      z: center.z,
      radius: 0.7,
    });
  }
  const world = colliders.map((c) => {
      const p = new T.Vector3(c.x, c.y, c.z).applyMatrix4(matrix);
      return {
        ...c,
        x: p.x,
        y: p.y,
        z: p.z,
        ...(c.rotation
          ? { rotation: rotation.clone().multiply(c.rotation) }
          : {}),
      };
    }),
    grid = createStaticColliderGrid(colliders, { cellSize: 8 }),
    query = (a, b, dimensions) =>
      grid
        .query(
          a.clone().applyMatrix4(inverse),
          b.clone().applyMatrix4(inverse),
          dimensions,
        )
        .map((c) => world[colliders.indexOf(c)]);
  let oldCount = 0,
    actualCount = 0,
    blocked = 0,
    clear = 0;
  for (const cell of sheet.cells) {
    const vertices = cell.vertices.map((p) =>
        new T.Vector3(p.x, p.y, p.z).applyMatrix4(matrix),
      ),
      actual = { ...cell, vertices, bounds: undefined },
      box = new T.Box3().setFromPoints(vertices),
      center = box.getCenter(new T.Vector3()),
      radius = box.getSize(new T.Vector3()).length() / 2,
      old = query(center, center, { radius, padding: 0.25 }),
      exact = query(box.min, box.max, { radius: 0, padding: 0.25 }),
      expected = isTitanLavaCellBlocked(actual, world, { padding: 0.25 });
    assert.equal(
      isTitanLavaCellBlocked(actual, old, { padding: 0.25 }),
      expected,
    );
    assert.equal(
      isTitanLavaCellBlocked(actual, exact, { padding: 0.25 }),
      expected,
    );
    oldCount += old.length;
    actualCount += exact.length;
    expected ? blocked++ : clear++;
  }
  assert.ok(blocked > 0 && clear > 0);
  assert.ok(actualCount < oldCount);
  t.diagnostic(
    JSON.stringify({
      cells: sheet.cells.length,
      blocked,
      clear,
      oldCount,
      actualCount,
    }),
  );
});
