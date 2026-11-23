import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createBermudaFleet } from "../src/bermuda_fleet.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import { getExpedition } from "../src/expedition_config.js";
import {
  oceanCurrentRoutes,
  nearestCurrentPoint,
  createOceanCurrentState,
} from "../src/ocean_current_rules.js";
import { getRegionalRare } from "../src/regional_rare.js";
import { BERMUDA_WORLD as W } from "../src/bermuda_config.js";
import { isPositionBlocked } from "../src/collision.js";

test("Bermuda round resets retain real ghost-hull and platform contacts without duplicates", () => {
  const fleet = createBermudaFleet(new T.Group());
  try {
    const fixed = [...fleet.ghost.colliders, ...fleet.rig.colliders];
    for (let round = 0; round < 3; round++) {
      for (const c of fixed) {
        assert.ok(fleet.colliders.includes(c), `registered contact ${c.id}`);
        assert.ok(
          isPositionBlocked(new T.Vector3(c.x, c.y, c.z), {
            colliders: fleet.colliders,
            radius: 0.25,
          }),
          `solid contact ${c.id}`,
        );
      }
      assert.equal(new Set(fleet.colliders).size, fleet.colliders.length);
      fleet.reset();
    }
  } finally {
    fleet.dispose();
  }
});

test("Bermuda traffic, guards and unique search sites span all offshore thirds", () => {
  const fleet = createBermudaFleet(new T.Group(), {
    heightAt: bermudaSeabedHeight,
  });
  try {
    assert.deepEqual(
      fleet.ships.map((s) => s.anchor.toArray()),
      [
        [-245, 4, -550],
        [265, 4, -1110],
      ],
    );
    assert.deepEqual(fleet.ghost.anchor.toArray(), [210, 4, -460]);
    assert.deepEqual(fleet.rig.root.position.toArray(), [-45, 4, -1100]);
    for (let t = 0; t <= 1200; t += 20) {
      fleet.update(t, new T.Vector3(0, -100, 75));
      for (const s of [...fleet.ships, fleet.ghost]) {
        assert.ok(Math.abs(s.root.position.x) + 90 < W.maxX);
        assert.ok(s.root.position.z > -1670 && s.root.position.z < -350);
        assert.ok(
          s.colliders.every(
            (c) =>
              Number.isFinite(c.x) &&
              Number.isFinite(c.y) &&
              Number.isFinite(c.z),
          ),
        );
      }
    }
    const bosses = getExpedition("bermuda").region.bossInstances;
    assert.deepEqual(
      bosses.map((s) => s.home),
      [
        [-290, -18, -450],
        [-245, -390, -730],
        [300, -505, -1080],
        [230, -610, -1570],
      ],
    );
    assert.equal(getRegionalRare("bermuda").worldBounds, W);
    assert.ok(getRegionalRare("bermuda").spawnAnchors.at(-1)[2] < -1450);
  } finally {
    fleet.dispose();
  }
});

test("Four independent current lanes cover full length, both flanks and navigable deep levels", () => {
  const routes = oceanCurrentRoutes("bermuda");
  assert.equal(routes.length, 4);
  assert.deepEqual(
    routes.map((r) => r.points[0].y),
    [-24, -24, -240, -520],
  );
  for (const route of routes) {
    assert.ok(route.points.some((p) => p.z < -1200));
    const sample = { point: new T.Vector3(), direction: new T.Vector3() };
    for (const p of route.points) {
      assert.ok(Math.abs(p.x) < 400 && p.z > -1740 && p.z < 0);
      assert.ok(p.y - bermudaSeabedHeight(p.x, p.z) > 30);
      nearestCurrentPoint(route, p, sample);
      assert.ok(sample.distance < 1e-6);
    }
    const c = createOceanCurrentState([route]);
    c.state.time = 18;
    const point = route.points[20].clone(),
      dir = route.points[21].clone().sub(point).normalize();
    for (let i = 0; i < 120; i++)
      c.step(1 / 60, { position: point, forward: dir });
    assert.ok(c.state.speed > 70);
  }
  assert.ok(routes[0].points.at(-1).x < -300);
  assert.ok(routes[1].points[0].x > 300);
});
