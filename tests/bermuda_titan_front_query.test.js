import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createBermudaTitanFront } from "../src/bermuda_titan_front.js";
import { createStaticColliderGrid } from "../src/static_collider_grid.js";
import {
  castSegment,
  isPositionBlocked,
  resolveMotion,
} from "../src/collision.js";
import { isTitanLavaCellBlocked } from "../src/bermuda_titan_hazards.js";
import {
  TITAN_ARM_RIG,
  titanEmbraceWeights,
} from "../src/bermuda_titan_head_asset.js";

test("Exact bone dependencies reuse unchanged arms while new head and arm snapshots never mutate previous contacts", () => {
  const front = createBermudaTitanFront(new T.Group()),
    spheres = front.restContacts.filter((c) => c.type === "sphere"),
    tiles = front.asset.cradleSurfaceTiles,
    armIndex = tiles.findIndex((tile) =>
      tile.faceVertices.every((p) => titanEmbraceWeights(...p)[2] === 0),
    ),
    headIndex = tiles.findIndex((tile) =>
      tile.faceVertices.some((p) => titanEmbraceWeights(...p)[2] > 0.1),
    );
  try {
    assert.ok(armIndex >= 0 && headIndex >= 0);
    front.setGuard(0);
    const arm = front.getPosedContact(spheres[armIndex].index),
      head = front.getPosedContact(spheres[headIndex].index),
      previous = JSON.stringify([arm, head]);
    front.setAwareness(0.37123);
    front.setBreathLean(0.01123, -0.01234);
    assert.equal(front.getPosedContact(arm.index), arm);
    const movedHead = front.getPosedContact(head.index);
    assert.notEqual(movedHead, head);
    assert.ok(front.queryDynamicContacts(movedHead).includes(movedHead));
    assert.equal(JSON.stringify([arm, head]), previous);
    front.setGuard(0.63123);
    assert.notEqual(front.getPosedContact(arm.index), arm);
    assert.equal(JSON.stringify([arm, head]), previous);
  } finally {
    front.dispose();
  }
});

test("Actual-pose query pruning preserves shared ray, body recovery/slide and lava volume results across all arm/head states", (t) => {
  const front = createBermudaTitanFront(new T.Group()),
    oldGrid = createStaticColliderGrid(
      front.dynamicRestContacts.map((c) =>
        c.type === "sphere"
          ? { ...c, radius: Math.max(c.radius, 2 / front.width) }
          : c,
      ),
      { cellSize: 0.09, maxCellsPerCollider: 128 },
    ),
    oldQuery = (a, b = a, dimensions = {}) =>
      oldGrid
        .query(a, b, {
          ...dimensions,
          padding: (dimensions.padding || 0) + TITAN_ARM_RIG.maximumMotion,
        })
        .map((c) => front.getPosedContact(c.index)),
    query = (a, b = a, dimensions = {}) =>
      front.queryDynamicContacts(a, b, { ...dimensions, segment: true }),
    oldRest = JSON.stringify(front.restContacts),
    rays = [
      [[-0.5, -0.1, -0.35], [0.4, -0.1, -0.35], 0.01],
      [[0, 0.3, -0.4], [0, -0.3, -0.4], 0.02],
      [[-0.45, -0.09, -0.5], [-0.28, -0.107, -0.345], 0.005],
      [[0.25, 0.1, -0.2], [-0.3, -0.2, -0.4], 0.035],
      [[-0.4, -0.4, -0.7], [-0.2, -0.35, -0.55], 0],
    ];
  let oldCount = 0,
    newCount = 0;
  const outcome = (hit) =>
    hit && {
      id: hit.collider.id,
      distance: hit.distance,
      time: hit.time,
      point: hit.point,
      normal: hit.normal,
    };
  try {
    for (const [guard, aware, yaw, pitch] of [
      [1, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0.02, 0.001, -0.001],
      [0, 0.04, 0.002, -0.002],
      [0.01, 0.04, 0.002, -0.002],
      [0.5, 1, -0.035, -0.035],
      [0, 1, 0.035, 0],
    ]) {
      front.setGuard(guard);
      front.setAwareness(aware);
      front.setBreathLean(yaw, pitch);
      for (const [a, b, radius] of rays) {
        const start = new T.Vector3(...a),
          end = new T.Vector3(...b),
          old = oldQuery(start, end, { radius }),
          reduced = query(start, end, { radius });
        oldCount += old.length;
        newCount += reduced.length;
        assert.deepEqual(
          outcome(castSegment(start, end, reduced, radius)),
          outcome(castSegment(start, end, old, radius)),
        );
        assert.deepEqual(
          reduced.map((c) => c.index),
          old.filter((c) => reduced.includes(c)).map((c) => c.index),
          "Retained exact contacts keep their original order and object identity",
        );
      }
      for (const start of [
        new T.Vector3(-0.3314, -0.064, -0.502),
        new T.Vector3(0, -0.1, -0.3),
      ]) {
        const end = start.clone().add(new T.Vector3(0.03, 0.01, 0.04)),
          dims = {
            length: 0.25,
            radius: 0.0325,
            forward: new T.Vector3(0.287, -0.19, 0.939).normalize(),
          };
        assert.equal(
          isPositionBlocked(start, {
            ...dims,
            colliders: query(start, start, {
              radius: dims.radius,
              padding: 0.13,
            }),
          }),
          isPositionBlocked(start, {
            ...dims,
            colliders: oldQuery(start, start, {
              radius: dims.radius,
              padding: 0.13,
            }),
          }),
        );
        assert.deepEqual(
          resolveMotion(start, end, { ...dims, colliders: query }),
          resolveMotion(start, end, { ...dims, colliders: oldQuery }),
          "Each recovery and slide subquery sees every solver-relevant current contact",
        );
      }
      for (const center of [
        new T.Vector3(0, -0.1, -0.3),
        new T.Vector3(-0.35, -0.1, -0.45),
      ]) {
        const h = 0.025,
          vertices = Array.from({ length: 8 }, (_, i) => ({
            x: center.x + (i & 1 ? h : -h),
            y: center.y + (i & 2 ? h : -h),
            z: center.z + (i & 4 ? h : -h),
          })),
          cell = {
            vertices,
            tetrahedra: [
              [0, 1, 3, 7],
              [0, 3, 2, 7],
              [0, 2, 6, 7],
              [0, 6, 4, 7],
              [0, 4, 5, 7],
              [0, 5, 1, 7],
            ],
          },
          dimensions = { radius: Math.sqrt(3) * h };
        assert.equal(
          isTitanLavaCellBlocked(cell, query(center, center, dimensions)),
          isTitanLavaCellBlocked(cell, oldQuery(center, center, dimensions)),
        );
      }
      const column = { x: -0.1, z: -0.3 },
        fullHeight = query(column);
      for (const y of [-0.3, -0.1, 0.1])
        for (const c of query({ ...column, y }))
          assert.ok(
            fullHeight.includes(c),
            "An absent endpoint height must preserve the full vertical column",
          );
    }
    assert.ok(
      newCount < oldCount * 0.6,
      `Queries should prune irrelevant current entities: ${newCount}/${oldCount}`,
    );
    assert.equal(JSON.stringify(front.restContacts), oldRest);
    t.diagnostic(
      JSON.stringify({ oldCandidates: oldCount, currentCandidates: newCount }),
    );
  } finally {
    front.dispose();
  }
});
