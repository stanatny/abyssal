import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createOdysseyOcean } from "../src/odyssey_ocean.js";
import { HOMEWARD_PATH, HOMEWARD_FINISH } from "../src/odyssey_wind_trial.js";
import {
  AEOLUS_MONUMENT_SITE as SITE,
  AEOLUS_ARCH as ARCH,
  buildOdysseyHomewardPath,
} from "../src/odyssey_homeward_site.js";
import {
  bodyRadius,
  castBodySegment,
  castSegment,
  isPositionBlocked,
  resolveMotion,
} from "../src/collision.js";
import { bodyTerrainFloor } from "../src/terrain_contact.js";
import { MAX_SWIM_PITCH } from "../src/steering_rules.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import {
  oceanCurrentRoutes,
  OCEAN_CURRENT_RULES,
} from "../src/ocean_current_rules.js";

const characters = ["orca", "squid", "zombie_shark", "mechanical_shark"];
const vector = (p) => new T.Vector3(...p);
const roster = getRegionSpecies("odyssey");
let ocean, environment;
before(async () => {
  ocean = createOdysseyOcean(new T.Group());
  environment = ocean.windEnvironment;
  await environment.prepareMonument();
});
after(() => ocean?.dispose());
const solved = (count) =>
  Object.fromEntries(
    Array.from({ length: count }, (_, i) => [i, { solved: true }]),
  );
function reset() {
  environment.update(0, 0, { gates: {}, homewardAvailable: false });
}
function finishRise() {
  environment.update(30, 30, { gates: solved(4), homewardAvailable: true });
  environment.update(3, 33, { gates: solved(4), homewardAvailable: true });
  assert.equal(environment.state.homewardReady, true);
}
const sceneColliders = () => [
  ...ocean.colliders,
  ...environment.dynamicColliders,
];
const monumentColliders = () =>
  sceneColliders().filter(
    (c) =>
      c.kind?.startsWith("odyssey_monument_") ||
      c.kind === "odyssey_homeward_gate",
  );

// These are the existing ordinary transport lanes, not the new conditional trial route.
const oldLanes = [
  ["outbound", [180, -24, -65], [180, -24, -2220]],
  ["inbound", [-260, -130, -2180], [-260, -130, -550]],
  ["deep_west", [-80, -430, -1100], [-80, -430, -1770]],
  ["deep_east", [440, -760, -2170], [440, -760, -1720]],
];

test("the actual homeward polyline ends inside the statue foundation arch with smooth grown-body slopes", () => {
  assert.deepEqual(buildOdysseyHomewardPath(), HOMEWARD_PATH);
  assert.deepEqual(HOMEWARD_PATH.at(-1), HOMEWARD_FINISH.center);
  assert.equal(HOMEWARD_FINISH.center[0], SITE.position[0]);
  assert.ok(
    Math.abs(HOMEWARD_FINISH.center[2] - SITE.position[2]) < ARCH.halfDepth,
  );
  assert.ok(HOMEWARD_FINISH.center[1] > ARCH.floorY + bodyRadius(30));
  assert.ok(HOMEWARD_FINISH.center[1] < ARCH.roofY - bodyRadius(30));
  assert.ok(HOMEWARD_FINISH.radius < ARCH.halfWidth - bodyRadius(30));
  const finalBranch = HOMEWARD_PATH.filter((p) => p[2] >= -900);
  assert.ok(finalBranch.length > 40);
  let previousDirection;
  for (let i = 1; i < HOMEWARD_PATH.length; i++) {
    const a = vector(HOMEWARD_PATH[i - 1]),
      b = vector(HOMEWARD_PATH[i]);
    assert.ok(a.toArray().every(Number.isFinite));
    const direction = b.clone().sub(a);
    assert.ok(direction.length() > 0 && direction.length() <= 24 + 1e-7);
    assert.ok(
      Math.atan2(Math.abs(direction.y), Math.hypot(direction.x, direction.z)) <
        MAX_SWIM_PITCH,
    );
    direction.normalize();
    if (previousDirection)
      assert.ok(
        direction.angleTo(previousDirection) < T.MathUtils.degToRad(14),
      );
    previousDirection = direction;
  }
  const crossing = finalBranch.findIndex((p) => p[2] >= ARCH.southGateZ);
  assert.ok(crossing > 0);
  const beforeGate = finalBranch[crossing - 1],
    afterGate = finalBranch[crossing];
  assert.ok(beforeGate[2] < ARCH.southGateZ && afterGate[2] >= ARCH.southGateZ);
  assert.ok(
    Math.abs(afterGate[0] - SITE.position[0]) <
      ARCH.halfWidth - bodyRadius(30) - 30 * 0.52,
  );
  assert.ok(afterGate[1] > ARCH.floorY + 12 && afterGate[1] < ARCH.roofY - 12);
});

test("the connected return bends within an ordinary grown meal without relocating the 677 residents", () => {
  assert.equal(
    roster.reduce((n, s) => n + s.spawnAnchors.length, 0),
    677,
  );
  const whale = roster.find((s) => s.kind === "oracle_whale");
  assert.ok(whale && !whale.predator && whale.length < 25);
  let nearest = Infinity;
  for (const point of HOMEWARD_PATH.filter((p) => p[2] >= -900))
    for (const anchor of whale.spawnAnchors)
      nearest = Math.min(nearest, vector(point).distanceTo(vector(anchor)));
  assert.ok(nearest < 65, `return route ordinary meal distance ${nearest}`);
});

test("every 25/30 m supported character can swim the complete final route and reverse through the real open arch", () => {
  reset();
  finishRise();
  const colliders = sceneColliders();
  for (const character of characters)
    for (const length of [25, 30]) {
      const radius = bodyRadius(length);
      for (let i = 1; i < HOMEWARD_PATH.length; i++) {
        const start = vector(HOMEWARD_PATH[i - 1]),
          end = vector(HOMEWARD_PATH[i]);
        const forward = end.clone().sub(start).normalize();
        const floorHeight = (x, z) =>
          bodyTerrainFloor(x, z, {
            heightAt: ocean.contactSurface,
            radius,
            forward,
            length: (length * 0.52) / 0.42,
            margin: 0.4 + (character === "zombie_shark" ? length * 0.008 : 0),
          });
        const hit = castBodySegment(start, end, {
          colliders,
          radius,
          forward,
          length,
        });
        assert.equal(
          hit,
          null,
          `${character} ${length} span ${i}: ${hit?.collider?.id}`,
        );
        const result = resolveMotion(start, end, {
          colliders,
          radius,
          forward,
          length,
          floorHeight,
        });
        assert.equal(
          result.blocked,
          false,
          `${character} ${length} span ${i}: ${result.contacts[0]?.collider?.id}`,
        );
        assert.ok(
          vector([
            result.position.x,
            result.position.y,
            result.position.z,
          ]).distanceTo(end) < 1e-6,
        );
        for (let n = 0; n <= 4; n++) {
          const p = start.clone().lerp(end, n / 4);
          assert.ok(
            p.y >= floorHeight(p.x, p.z),
            `${character} ${length} span ${i}: actual floor`,
          );
        }
      }
      const center = vector(HOMEWARD_FINISH.center);
      // Both directions and a full horizontal turn fit; victory does not invent a one-way orientation lock.
      for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 8) {
        assert.equal(
          isPositionBlocked(center, {
            colliders,
            length,
            radius,
            forward: new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw)),
          }),
          false,
          `${character} ${length} arch turn ${yaw}`,
        );
      }
      for (const direction of [-1, 1]) {
        const start = new T.Vector3(
          SITE.position[0],
          -45,
          SITE.position[2] - 72 * direction,
        );
        const end = new T.Vector3(
          SITE.position[0],
          -45,
          SITE.position[2] + 72 * direction,
        );
        const result = resolveMotion(start, end, {
          colliders,
          length,
          radius,
          forward: new T.Vector3(0, 0, direction),
        });
        assert.equal(
          result.blocked,
          false,
          `${character} ${length} arch crossing ${direction}`,
        );
        assert.ok(new T.Vector3().copy(result.position).distanceTo(end) < 1e-6);
      }
    }
});

test("the real animated 25/30 m character skins fit the supported arch in both swim directions", async () => {
  const { createCreature } = await import("../src/creatures.js");
  const { visibleWindBody } = await import("../src/odyssey_wind_trial.js");
  reset();
  finishRise();
  const colliders = sceneColliders();
  for (const kind of characters)
    for (const length of [25, 30]) {
      const avatar = createCreature(kind, length, 17);
      avatar.position.set(SITE.position[0], -45, SITE.position[2]);
      for (const direction of [-1, 1]) {
        const forward = new T.Vector3(0, 0, direction);
        avatar.quaternion.setFromUnitVectors(new T.Vector3(0, 0, -1), forward);
        for (const [frame, effort] of [
          [0.2, 0.8],
          [0.5, 2.2],
          [0.8, 1.1],
        ]) {
          avatar.userData.animate(frame, effort, {
            dt: 0.1,
            speed: effort * 12,
            boosting: effort > 2,
            turn: 0.8,
            pitchInput: 0.3,
          });
          // Match the render frame: SkinnedMesh.updateMatrixWorld refreshes bindMatrixInverse.
          avatar.updateMatrixWorld(true);
          const hull = visibleWindBody(
            avatar,
            avatar.position,
            forward,
            length,
          );
          assert.ok(hull.points.length >= 8);
          for (const p of hull.points) {
            assert.ok(
              Math.abs(p[0] - SITE.position[0]) < ARCH.halfWidth,
              `${kind} ${length}: true skin arch width`,
            );
            assert.ok(
              p[1] > ARCH.floorY && p[1] < ARCH.roofY,
              `${kind} ${length}: true skin arch height`,
            );
            assert.equal(
              isPositionBlocked(vector(p), { colliders }),
              false,
              `${kind} ${length}: true skin corner scenery`,
            );
          }
        }
      }
    }
});

test("the actual south bronze gate blocks the final approach until the complete supported rise opens it", () => {
  reset();
  const start = new T.Vector3(SITE.position[0], -45, ARCH.southGateZ - 35);
  const end = vector(HOMEWARD_FINISH.center);
  // At the fourth platform level its still-closed leaves are in the actual arch; they are not a UI-only lock.
  environment.update(24, 24, { gates: solved(4), homewardAvailable: false });
  assert.equal(environment.state.homewardReady, false);
  const gate = environment.state.monumentGate;
  assert.ok(gate && gate.colliders.length >= 2);
  assert.ok(
    castBodySegment(start, end, {
      colliders: gate.colliders,
      radius: bodyRadius(30),
      length: 30,
      forward: new T.Vector3(0, 0, 1),
    }),
  );
  environment.update(3, 27, { gates: solved(4), homewardAvailable: true });
  assert.equal(environment.state.homewardReady, true);
  assert.equal(
    castBodySegment(start, end, {
      colliders: sceneColliders(),
      radius: bodyRadius(30),
      length: 30,
      forward: new T.Vector3(0, 0, 1),
    }),
    null,
  );
});

test("all four unchanged straight current tubes clear the new actual support, moving statue and gate at every rise level and midpoint", () => {
  const routes = oceanCurrentRoutes("odyssey");
  assert.deepEqual(
    routes.map((r) => [r.id, r.points[0].toArray(), r.points.at(-1).toArray()]),
    oldLanes,
  );
  for (const [index, route] of routes.entries()) {
    const [, first, last] = oldLanes[index];
    assert.deepEqual(
      route.points.map((p) => p.toArray()),
      Array.from({ length: 129 }, (_, n) => [
        first[0],
        first[1],
        first[2] + ((last[2] - first[2]) * n) / 128,
      ]),
    );
  }
  reset();
  for (let half = 0; half <= 8; half++) {
    const level = half / 2;
    if (half)
      environment.update(3, half * 3, {
        gates: solved(Math.ceil(level)),
        homewardAvailable: false,
      });
    const colliders = sceneColliders();
    for (const route of routes) {
      const a = route.points[0].clone(),
        b = route.points.at(-1).clone();
      const forward = b.clone().sub(a).normalize();
      a.addScaledVector(forward, -30 * 0.42);
      b.addScaledVector(forward, 30 * 0.42);
      const hit = castSegment(
        a,
        b,
        colliders,
        OCEAN_CURRENT_RULES.radius + bodyRadius(30),
      );
      assert.equal(
        hit,
        null,
        `${route.id} rise ${level}: ${hit?.collider?.id}`,
      );
    }
  }
});

test("new support and the actual rising body do not bury any of the 677 original food bodies at five levels or their midpoints", () => {
  reset();
  let count = 0;
  for (let half = 0; half <= 8; half++) {
    const level = half / 2;
    if (half)
      environment.update(3, half * 3, {
        gates: solved(Math.ceil(level)),
        homewardAvailable: false,
      });
    const colliders = monumentColliders();
    assert.ok(colliders.length > 10);
    for (const species of roster)
      for (const [index, anchor] of species.spawnAnchors.entries()) {
        count++;
        for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 4) {
          const hit = isPositionBlocked(vector(anchor), {
            colliders,
            length: species.length,
            radius: bodyRadius(species.length),
            forward: new T.Vector3(Math.sin(yaw), 0, Math.cos(yaw)),
          });
          assert.equal(
            hit,
            false,
            `${species.kind} anchor ${index}, rise ${level}, yaw ${yaw}`,
          );
        }
      }
  }
  assert.equal(count, 677 * 9);
});
