import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { bodyRadius, castBodySegment } from "../src/collision.js";
import { bodyTerrainFloor } from "../src/terrain_contact.js";
import { queryStaticColliders } from "../src/static_collider_grid.js";

// 消费实际生产函数，注入时钟和有限场景；不构造整洞，也不复制寻路算法。
const source = readFileSync(
    new URL("../src/bermuda_caves.js", import.meta.url),
    "utf8",
  ),
  waypointStart = source.indexOf(
    "    const escapeWaypoint = (position, body = {}) => {",
  ),
  waypointEnd = source.indexOf("    const entranceWaypoint =", waypointStart),
  waypointCode = source.slice(waypointStart, waypointEnd),
  travelStart = source.indexOf(
    "    const clearTravel = (from, to, body = {}) => {",
  ),
  travelCode = source.slice(travelStart, waypointStart);
assert.ok(
  travelStart >= 0 &&
    waypointStart > travelStart &&
    waypointEnd > waypointStart,
);

function harness({
  cost = 0,
  blocked = false,
  physical = false,
  legacyClock = false,
} = {}) {
  const clock = { value: 0 },
    context = {
      world: [],
      calls: 0,
      blocked,
      dynamic: [],
      query: () => context.dynamic,
    },
    routes = [
      {
        id: "north",
        points: [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 10),
          new THREE.Vector3(0, 0, 20),
        ],
        outsideSafe: new THREE.Vector3(0, 0, 30),
        turnAllowance: 5,
      },
      {
        id: "east",
        points: [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(10, 0, 0),
          new THREE.Vector3(20, 0, 0),
        ],
        outsideSafe: new THREE.Vector3(30, 0, 0),
        turnAllowance: 5,
      },
    ],
    code = legacyClock
      ? waypointCode.replace(
          "time: globalThis.performance?.now() ?? Date.now(),",
          "time: now,",
        )
      : waypointCode,
    bind = new Function(
      "THREE",
      "bodyRadius",
      "castBodySegment",
      "queryStaticColliders",
      "bodyTerrainFloor",
      "portalSystem",
      "heightAt",
      "getEscapeRoutes",
      "globalThis",
      "wrap",
      "initialQuery",
      `let waypointCache = null, dynamicContactQuery = initialQuery;
       ${travelCode.replace("const clearTravel =", "const rawClearTravel =")}
       const clearTravel = wrap(rawClearTravel);
       ${code}
       return { query: escapeWaypoint, clearCache() { waypointCache = null; },
         setDynamicQuery(value) { dynamicContactQuery = value; } };`,
    ),
    api = bind(
      THREE,
      bodyRadius,
      castBodySegment,
      queryStaticColliders,
      bodyTerrainFloor,
      { worldContacts: () => context.world },
      () => -100,
      () => routes,
      { performance: { now: () => clock.value } },
      (raw) =>
        (...args) => {
          context.calls++;
          clock.value += cost;
          return physical ? raw(...args) : !context.blocked;
        },
      context.query,
    );
  return { ...api, clock, context };
}

const position = () => new THREE.Vector3(0, 0, -5);

test("A slow route calculation gets its existing 200 ms reuse window after completion", () => {
  const h = harness({ cost: 250 }),
    first = h.query(position());
  assert.ok(first);
  const calls = h.context.calls,
    completed = h.clock.value;
  h.clock.value = completed + 16;
  assert.equal(h.query(position()), first);
  assert.equal(
    h.context.calls,
    calls,
    "Computation time must not consume the reuse window",
  );
  h.clock.value = completed + 199.999;
  assert.equal(h.query(position()), first);
  assert.equal(h.context.calls, calls);
  h.clock.value = completed + 200;
  assert.deepEqual(h.query(position()), first);
  assert.ok(
    h.context.calls > calls,
    "At exactly 200 ms the route is checked again",
  );
});

test("A static-only world retains its prior stable cache until geometry, body or movement changes", () => {
  const h = harness({ cost: 250 });
  h.setDynamicQuery(null);
  const first = h.query(position()),
    calls = h.context.calls;
  h.clock.value += 10000;
  assert.equal(h.query(position()), first);
  assert.equal(h.context.calls, calls);
  h.context.world = h.context.world.slice();
  h.query(position());
  assert.ok(h.context.calls > calls);
});

test("A blocked result is cached for at most the same 200 ms and rechecks actual travel", () => {
  const h = harness({ cost: 120, blocked: true });
  assert.equal(h.query(position()), null);
  const calls = h.context.calls,
    completed = h.clock.value;
  h.clock.value = completed + 100;
  assert.equal(h.query(position()), null);
  assert.equal(h.context.calls, calls);
  h.context.blocked = false;
  h.clock.value = completed + 200;
  assert.ok(h.query(position()));
  assert.ok(h.context.calls > calls);
});

test("World identity/count and exact body dimensions invalidate the UI cache", () => {
  for (const change of [
    (h, p, body) => {
      h.context.world = h.context.world.slice();
    },
    (h, p, body) => {
      h.context.world.push({ id: "new_door" });
    },
    (h, p, body) => {
      body.length += 0.01;
    },
    (h, p, body) => {
      body.radius += 0.01;
    },
    (h, p, body) => {
      p.x += 3;
    },
  ]) {
    const h = harness(),
      p = position(),
      body = { length: 30, radius: bodyRadius(30) };
    h.query(p, body);
    const calls = h.context.calls;
    change(h, p, body);
    h.query(p, body);
    assert.ok(h.context.calls > calls);
  }
  const h = harness(),
    body = { length: 30, radius: bodyRadius(30) };
  h.query(position(), body);
  const calls = h.context.calls;
  h.query(position().add(new THREE.Vector3(2.999, 0, 0)), body);
  assert.equal(
    h.context.calls,
    calls,
    "The original three-metre UI movement policy stays intact",
  );
});

test("Explicit dynamic snapshots and the actual dynamic query identity cannot reuse another input", () => {
  const h = harness(),
    body = { length: 30, dynamicContacts: [] };
  h.query(position(), body);
  let calls = h.context.calls;
  body.dynamicContacts = [];
  h.query(position(), body);
  assert.ok(h.context.calls > calls);
  calls = h.context.calls;
  body.dynamicContacts.push({ id: "new_pose" });
  h.query(position(), body);
  assert.ok(h.context.calls > calls);
  calls = h.context.calls;
  delete body.dynamicContacts;
  h.query(position(), body);
  assert.ok(h.context.calls > calls);
  calls = h.context.calls;
  h.setDynamicQuery(() => []);
  h.query(position(), body);
  assert.ok(h.context.calls > calls);
});

test("The unchanged actual body/floor solver chooses the same waypoint as a fresh calculation", () => {
  const h = harness({ physical: true }),
    body = { length: 8, radius: 1 };
  h.context.world = [
    {
      type: "box",
      id: "north_wall",
      x: 0,
      y: 0,
      z: 8,
      halfSize: { x: 2, y: 3, z: 1 },
    },
  ];
  for (const p of [
    position(),
    new THREE.Vector3(1, 0, -4),
    new THREE.Vector3(10, 0, -5),
  ]) {
    h.clearCache();
    const current = h.query(p, body),
      calls = h.context.calls;
    assert.ok(current);
    assert.equal(h.query(p, body), current);
    assert.equal(h.context.calls, calls);
    h.clearCache();
    assert.deepEqual(h.query(p, body), current);
  }
});

test("Deterministic 16 ms calls avoid the start-timestamp expiry feedback without changing results", (t) => {
  const baseline = harness({ cost: 250, legacyClock: true }),
    candidate = harness({ cost: 250 }),
    oldResults = [],
    newResults = [];
  for (let i = 0; i < 12; i++) {
    baseline.clock.value += 16;
    candidate.clock.value += 16;
    oldResults.push(baseline.query(position()));
    newResults.push(candidate.query(position()));
  }
  assert.deepEqual(newResults, oldResults);
  assert.ok(candidate.context.calls < baseline.context.calls / 2);
  t.diagnostic(
    `Identical waypoint outputs; heavy travel calls ${baseline.context.calls} -> ${candidate.context.calls}, injected compute ms ${baseline.context.calls * 250} -> ${candidate.context.calls * 250}`,
  );
});
