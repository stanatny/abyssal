import assert from "node:assert/strict";
import test from "node:test";
import { resolveCreatureMotion } from "../src/navigation.js";

// 同一静态数组缓存后，移动护臂仍须按当帧位置参与精确层。
test("Creature navigation queries moving contacts without rebuilding or mutating the static world", () => {
  const fixed = [],
    habitat = { length: 3, depthMin: 5, depthMax: 200 },
    start = { x: 0, y: -50, z: -100 },
    end = { x: 5, y: -50, z: -100 },
    heading = { x: 1, y: 0, z: 0 };
  let wallX = 3,
    calls = 0;
  const dynamicContacts = () => {
    calls++;
    return [
      {
        type: "box",
        x: wallX,
        y: -50,
        z: -100,
        halfSize: { x: 0.5, y: 20, z: 20 },
      },
    ];
  };
  const run = () =>
    resolveCreatureMotion(start, end, heading, habitat, {
      colliders: fixed,
      heightAt: () => -200,
      dynamicContacts,
    });
  const blocked = run();
  assert.equal(blocked.blocked, true);
  assert.ok(blocked.position.x < 3);
  wallX = 30;
  const clear = run();
  assert.equal(clear.blocked, false);
  assert.equal(clear.position.x, 5);
  assert.equal(fixed.length, 0);
  assert.ok(calls >= 4);
});

// 投影前的宽相候选只负责触发求解；其线段不能代替投影后的真正身体轨迹。
test("Creature presence gate retains AABB candidates before vertical projection", async () => {
  const THREE = await import("three");
  const { createStaticColliderGrid } = await import(
    "../src/static_collider_grid.js"
  );
  const shapes = [
      {
        type: "box",
        id: "presence_corner",
        x: -16.2,
        y: -50,
        z: -16.2,
        halfSize: { x: 0.5, y: 0.5, z: 0.5 },
      },
      {
        type: "box",
        id: "projected_wall",
        x: 0,
        y: -7,
        z: 0,
        halfSize: { x: 2, y: 2, z: 2 },
      },
    ],
    grid = createStaticColliderGrid(shapes),
    start = { x: 0, y: -50, z: 0 },
    end = { x: 10, y: -50, z: 10 },
    heading = { x: 1, y: 0, z: 1 },
    habitat = { length: 3, depthMin: 5, depthMax: 200 },
    calls = [],
    query = (a, b, dimensions) => {
      calls.push({ a: { ...a }, b: { ...b }, dimensions });
      const candidates = grid.query(a, b, dimensions);
      if (dimensions.segment === false) return candidates;
      const line = new THREE.Line3(
        new THREE.Vector3().copy(a),
        new THREE.Vector3().copy(b),
      );
      return candidates.filter((c) => {
        const p = new THREE.Vector3(c.x, c.y, c.z),
          closest = line.start.equals(line.end)
            ? line.start
            : line.closestPointToPoint(p, true, new THREE.Vector3()),
          envelope =
            Math.hypot(c.halfSize.x, c.halfSize.y, c.halfSize.z) +
            Math.sqrt(3) * dimensions.radius +
            dimensions.padding;
        return p.distanceTo(closest) <= envelope + 1e-7;
      });
    },
    run = (dynamicContacts) =>
      resolveCreatureMotion(start, end, heading, habitat, {
        colliders: [],
        heightAt: () => -10,
        dynamicContacts,
      }),
    reference = run(() => shapes),
    actual = run(query);
  assert.ok(reference?.blocked);
  assert.ok(
    actual?.blocked,
    "Projected-body recovery must not be skipped by the initial line",
  );
  assert.deepEqual(actual, reference);
  assert.equal(calls[0].dimensions.segment, false);
  assert.ok(calls.some((call) => call.a.y > -20));
});
