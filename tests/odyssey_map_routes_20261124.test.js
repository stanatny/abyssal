import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  ODYSSEY_WORLD as W,
  ODYSSEY_SITES,
  odysseySeabedHeight,
} from "../src/odyssey_config.js";
import { ODYSSEY_BOSS_INSTANCES, ODYSSEY_LORDS } from "../src/odyssey_lords.js";
import { createOdysseyOcean } from "../src/odyssey_ocean.js";
import {
  OCEAN_CURRENT_RULES as R,
  oceanCurrentRoutes,
  createOceanCurrentState,
  nearestCurrentPoint,
} from "../src/ocean_current_rules.js";
import { bodyRadius, castSegment } from "../src/collision.js";

const routes = oceanCurrentRoutes("odyssey");

test("Odyssey has four straight, separated water layers including a short deep return", () => {
  assert.equal(routes.length, 4);
  assert.equal(new Set(routes.map((r) => r.points[0].y)).size, 4);
  for (const route of routes) {
    const first = route.points[0],
      last = route.points.at(-1);
    assert.equal(route.points.length, 129);
    assert.ok(route.points.every((p) => p.x === first.x && p.y === first.y));
    assert.equal(route.length, Math.abs(first.z - last.z));
    assert.equal(Math.sign(last.z - first.z), route.inbound ? 1 : -1);
    assert.ok(
      route.points.every(
        (p) =>
          p.x > W.minX + 20 &&
          p.x < W.maxX - 20 &&
          p.z > W.minZ + 20 &&
          p.z < W.maxZ - 20,
      ),
    );
  }
  assert.ok(routes[0].length > 2000);
  assert.ok(routes[1].length > 1500);
  const back = routes.find((r) => r.id === "deep_east");
  assert.equal(back.inbound, true);
  assert.ok(back.length < routes[1].length / 2);
});

test("Odyssey current force follows the displayed route and releases sideways without changing depth", () => {
  for (const route of routes) {
    const current = createOceanCurrentState([route]);
    current.state.time = 18;
    const position = route.points[64].clone();
    const sample = { point: new T.Vector3(), direction: new T.Vector3() };
    nearestCurrentPoint(route, position, sample);
    for (let i = 0; i < 120; i++)
      current.step(1 / 60, { position, forward: sample.direction });
    assert.equal(current.state.velocity.x, 0);
    assert.equal(current.state.velocity.y, 0);
    assert.ok(current.state.velocity.z * (route.inbound ? 1 : -1) > 71);
    const y = position.y;
    const across = new T.Vector3(1, 0, 0);
    for (let i = 0; i < 120; i++) {
      current.step(1 / 60, { position, forward: across });
      position
        .addScaledVector(across, 12 / 60)
        .addScaledVector(current.state.velocity, 1 / 60);
    }
    assert.equal(current.state.route, null);
    assert.equal(position.y, y);
  }
});

test("the full current tube plus a 30m body clears final terrain and actual scenery", () => {
  const ocean = createOdysseyOcean(new T.Group());
  try {
    const radius = R.radius + bodyRadius(30);
    for (const route of routes) {
      const first = route.points[0].clone(),
        last = route.points.at(-1).clone();
      const direction = last.clone().sub(first).normalize();
      first.addScaledVector(direction, -30 * 0.42);
      last.addScaledVector(direction, 30 * 0.42);
      const hit = castSegment(first, last, ocean.colliders, radius);
      assert.equal(hit, null, `${route.id}: ${hit?.collider?.id}`);
      const steps = Math.ceil(first.distanceTo(last) / 6);
      for (let i = 0; i <= steps; i++) {
        const p = first.clone().lerp(last, i / steps);
        for (const x of [p.x - radius, p.x, p.x + radius]) {
          const floor = Math.max(
            odysseySeabedHeight(x, p.z),
            ocean.contactSurface(x, p.z),
          );
          assert.ok(
            p.y - radius > floor + 0.25,
            `${route.id}: terrain (${x}, ${p.z})`,
          );
        }
      }
    }
  } finally {
    ocean.dispose();
  }
});

test("guardian homes, habitat depths and separated territories follow the final landmarks", () => {
  for (const boss of ODYSSEY_BOSS_INSTANCES) {
    const species = ODYSSEY_LORDS.find((s) => s.kind === boss.kind);
    const [x, z] = ODYSSEY_SITES[boss.kind];
    assert.equal(boss.home[0], x);
    assert.equal(boss.home[2], z);
    assert.equal(
      boss.home[1],
      odysseySeabedHeight(x, z) +
        (boss.kind === "charybdis" ? 70 : species.floorClearance),
    );
    assert.ok(
      -boss.home[1] >= species.depthMin && -boss.home[1] <= species.depthMax,
    );
    assert.ok(boss.home[1] <= boss.maxCenterY);
    assert.ok(
      x - boss.radius > W.minX &&
        x + boss.radius < W.maxX &&
        z - boss.radius > W.minZ,
    );
    assert.ok(boss.radius >= 150);
  }
  for (let i = 0; i < ODYSSEY_BOSS_INSTANCES.length; i++)
    for (let j = i + 1; j < ODYSSEY_BOSS_INSTANCES.length; j++) {
      const a = ODYSSEY_BOSS_INSTANCES[i],
        b = ODYSSEY_BOSS_INSTANCES[j];
      assert.ok(
        Math.hypot(a.home[0] - b.home[0], a.home[2] - b.home[2]) >
          a.radius + b.radius + 65,
      );
    }
});
