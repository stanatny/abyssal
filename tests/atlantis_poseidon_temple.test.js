import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createAtlantisPoseidonTemple } from "../src/atlantis_poseidon_temple.js";
import {
  POSEIDON_TEMPLE_SITE as SITE,
  isPoseidonTempleReserved,
} from "../src/atlantis_poseidon_site.js";
import {
  ATLANTIS_EXCAVATION_SITES,
  atlantisSeabedHeight,
} from "../src/atlantis_terrain.js";
import { seabedHeight } from "../src/ocean.js";
import {
  bodyRadius,
  castSegment,
  isPositionBlocked,
  resolveMotion,
} from "../src/collision.js";
import { characterMovement } from "../src/character_rules.js";
import { MAX_SWIM_PITCH, stepSteering } from "../src/steering_rules.js";
import { WORLD } from "../src/world_config.js";

test("Poseidon frozen excavation and reservation preserve the real seabed and world contract", () => {
  assert.ok(ATLANTIS_EXCAVATION_SITES.includes(SITE));
  assert.ok(Object.isFrozen(SITE) && Object.isFrozen(SITE.shaft));
  assert.equal(atlantisSeabedHeight(0, -922), SITE.floorY);
  assert.equal(atlantisSeabedHeight(85, -922), seabedHeight(85, -922));
  assert.ok(SITE.floorY >= -WORLD.maxDepth + 30);
  assert.equal(isPoseidonTempleReserved(-55, -881, 22.56, 23.5), true);
  assert.equal(isPoseidonTempleReserved(26, -930, 3.42, 3.42), true);
  assert.equal(isPoseidonTempleReserved(187, -774, 96, 71), false);
  assert.equal(isPoseidonTempleReserved(0, -800, 30, 30), false);
});

test("Poseidon both routes permit complete bodies, fast motion, continuous pitch turns and return", async (t) => {
  const temple = makeTemple(t);
  for (const route of SITE.routes)
    for (const length of [3, 16, 30])
      for (const steps of [1, 60])
        await t.test(`${route.id}, ${length}m, ${steps} steps`, () => {
          let state = {
            position: { ...route.waypoints[0] },
            pose: poseBetween(route.waypoints[0], route.waypoints[1]),
          };
          for (const points of [
            route.waypoints,
            [...route.waypoints].reverse(),
          ]) {
            for (let i = 1; i < points.length; i++) {
              state = turn(
                state,
                poseBetween(points[i - 1], points[i]),
                length,
                temple,
              );
              const start = { ...state.position };
              for (let j = 1; j <= steps; j++) {
                const target = interpolate(start, points[i], j / steps);
                state.position = clearMove(
                  state.position,
                  target,
                  state.pose,
                  length,
                  temple,
                );
              }
            }
          }
          assertNear(state.position, route.waypoints[0]);
        });
  assert.ok(
    SITE.routes.every(
      (r) =>
        r.waypoints.at(-1).y <
        seabedHeight(r.waypoints.at(-1).x, r.waypoints.at(-1).z) - 15,
    ),
  );
});

test("Poseidon adult lower turns and upper galleries retain body and camera clearance", (t) => {
  const temple = makeTemple(t);
  const circle = SITE.turningCircle;
  for (const direction of [-1, 1]) {
    let state = null;
    for (let i = 0; i <= 240; i++) {
      const a = (direction * i * Math.PI * 2) / 240;
      const point = {
        x: circle.x + Math.cos(a) * 12,
        y: circle.y,
        z: circle.z + Math.sin(a) * 12,
      };
      const pose = {
        yaw: Math.atan2(direction * Math.sin(a), -direction * Math.cos(a)),
        pitch: 0,
      };
      if (state) state = turn(state, pose, 30, temple);
      else state = { position: point, pose };
      state.position = clearMove(state.position, point, pose, 30, temple);
      // 普通追尾相机33m距离/11.8m上升，遇侧墙缩短后仍保留观察下厅的距离。
      const forward = directionFor(pose);
      const desired = new THREE.Vector3(
        point.x - forward.x * 33,
        point.y + 11.8,
        point.z - forward.z * 33,
      );
      const cameraHit = castSegment(point, desired, temple.colliders, 0.6);
      assert.ok(
        !cameraHit ||
          cameraHit.time *
            new THREE.Vector3().subVectors(desired, point).length() >
            10,
      );
    }
  }
  for (const x of [-34, 34])
    for (const reverse of [false, true]) {
      const points = [
        { x, y: -649, z: -940 },
        { x, y: -649, z: -904 },
      ];
      if (reverse) points.reverse();
      let state = { position: points[0], pose: poseBetween(...points) };
      state.position = clearMove(
        state.position,
        points[0],
        state.pose,
        30,
        temple,
      );
      state.position = clearMove(
        state.position,
        points[1],
        state.pose,
        30,
        temple,
      );
    }
});

test("Poseidon open well, slab, roof and rear portal agree in rendering and collision", (t) => {
  const temple = makeTemple(t);
  temple.root.updateMatrixWorld(true);
  const centerTop = { x: 0, y: -520, z: -922 },
    centerBottom = { x: 0, y: -707, z: -922 };
  assert.equal(castSegment(centerTop, centerBottom, temple.colliders), null);
  assert.equal(visibleHit(temple.root, centerTop, centerBottom), undefined);
  const pairs = [
    [
      { x: -34, y: -615, z: -922 },
      { x: -34, y: -605, z: -922 },
      "poseidon_temple_platform",
    ],
    [
      { x: -34, y: -670, z: -916 },
      { x: -34, y: -658, z: -916 },
      "poseidon_crypt_floor",
    ],
    [{ x: 43, y: -553, z: -933 }, { x: 43, y: -532, z: -933 }, "poseidon_roof"],
    [
      { x: 42, y: -691, z: -932 },
      { x: 49, y: -691, z: -932 },
      "poseidon_vault_lining",
    ],
  ];
  for (const [a, b, kind] of pairs)
    for (const [start, end] of [
      [a, b],
      [b, a],
    ]) {
      const hit = castSegment(
        start,
        end,
        temple.colliders.filter((c) => c.kind === kind),
      );
      const visible = visibleHit(temple.root, start, end);
      assert.ok(hit && visible, kind);
      assert.ok(
        distance(hit.point, visible.point) < 0.04,
        `${kind} differs from its rendered surface`,
      );
    }
  assert.equal(
    castSegment(
      { x: 0, y: -685, z: -965 },
      { x: 0, y: -685, z: -950 },
      temple.colliders,
      bodyRadius(30),
    ),
    null,
  );
});

test("Poseidon native lower schools have full roaming and body clearance", (t) => {
  const temple = makeTemple(t);
  for (const [habitat, length] of [
    [SITE.fishSanctuary, 0.6],
    [SITE.secondaryFishSanctuary, 9],
  ]) {
    const radius = bodyRadius(length);
    for (const y of [
      habitat.clearance.minY + radius,
      habitat.anchor.y,
      habitat.clearance.maxY - radius,
    ])
      for (let i = 0; i < 32; i++) {
        const a = (i * Math.PI * 2) / 32;
        const point = {
          x: habitat.anchor.x + Math.cos(a) * habitat.clearance.radius,
          y,
          z: habitat.anchor.z + Math.sin(a) * habitat.clearance.radius,
        };
        for (const forward of [
          { x: 1, y: 0, z: 0 },
          { x: 0, y: 0, z: 1 },
        ]) {
          assert.equal(
            isPositionBlocked(point, {
              colliders: temple.colliders,
              radius,
              length,
              forward,
            }),
            false,
            `${habitat.species} roaming body at ${JSON.stringify(point)}`,
          );
          assert.ok(point.y >= atlantisSeabedHeight(point.x, point.z) + radius);
        }
      }
  }
});

test("Poseidon accepted furnishings are placed on full supported footprints", (t) => {
  const temple = makeTemple(t);
  assert.equal(temple.stats.furniture.dropped.length, 0);
  assert.equal(temple.furniturePlacements.length, 14);
  assert.deepEqual(temple.stats.furniture.placed, {
    bench: 4,
    table: 0,
    chest: 6,
    amphora: 4,
  });
  const extents = {
    bench: [1.8, 0.68],
    chest: [1.36, 0.94],
    amphora: [1.7, 1.5],
  };
  const supports = temple.colliders.filter((c) =>
    ["poseidon_temple_platform", "poseidon_crypt_floor"].includes(c.kind),
  );
  for (const item of temple.furniturePlacements) {
    const [hx, hz] = extents[item.kind],
      scale = item.scale ?? 1,
      yaw = item.yaw ?? 0;
    for (const sx of [-1, 0, 1])
      for (const sz of [-1, 0, 1]) {
        const dx = sx * hx * scale,
          dz = sz * hz * scale;
        const x = item.x + dx * Math.cos(yaw) + dz * Math.sin(yaw),
          z = item.z - dx * Math.sin(yaw) + dz * Math.cos(yaw);
        if (item.floor === SITE.floorY)
          assert.equal(atlantisSeabedHeight(x, z), item.floor, item.id);
        else {
          const hit = castSegment(
            { x, y: item.floor + 0.2, z },
            { x, y: item.floor - 0.4, z },
            supports,
          );
          assert.ok(hit && Math.abs(hit.point.y - item.floor) < 1e-5, item.id);
        }
      }
  }
});

test("Poseidon cached geometry remains finite, detailed, bounded and independently disposable", (t) => {
  const a = makeTemple(t),
    b = makeTemple(t);
  assert.ok(a.stats.triangles > 100000 && a.stats.triangles < 180000);
  assert.ok(a.stats.colliders < 1000);
  assert.ok(a.stats.meshes <= 13);
  assert.equal(a.root.getObjectsByProperty("isPointLight", true).length, 0);
  const materials = new Set();
  for (const mesh of a.root.getObjectsByProperty("isMesh", true)) {
    materials.add(mesh.material);
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++)
      assert.ok(
        Number.isFinite(p.getX(i)) &&
          Number.isFinite(p.getY(i)) &&
          Number.isFinite(p.getZ(i)),
      );
    for (let i = 0; i < p.count; i += 3) {
      const x = new THREE.Vector3().fromBufferAttribute(p, i),
        y = new THREE.Vector3().fromBufferAttribute(p, i + 1),
        z = new THREE.Vector3().fromBufferAttribute(p, i + 2);
      assert.ok(
        new THREE.Vector3().crossVectors(y.sub(x), z.sub(x)).lengthSq() > 1e-16,
      );
    }
  }
  let materialDisposals = 0;
  for (const material of materials)
    material.addEventListener("dispose", () => materialDisposals++);
  a.dispose();
  a.dispose();
  assert.equal(a.root.parent, null);
  assert.equal(a.root.children.length, 0);
  assert.equal(materialDisposals, 0);
  assert.ok(b.root.children.length > 0);
  assert.throws(
    () =>
      createAtlantisPoseidonTemple(new THREE.Scene(), {
        heightAt: atlantisSeabedHeight,
        site: { ...SITE },
      }),
    /registered site contract/,
  );
});

function makeTemple(t) {
  const temple = createAtlantisPoseidonTemple(new THREE.Scene(), {
    heightAt: atlantisSeabedHeight,
  });
  t.after(() => temple.dispose());
  return temple;
}
function poseBetween(a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    dz = b.z - a.z;
  const pitch = Math.atan2(dy, Math.hypot(dx, dz));
  assert.ok(Math.abs(pitch) <= MAX_SWIM_PITCH);
  return { yaw: Math.atan2(-dx, -dz), pitch };
}
function directionFor(pose) {
  return new THREE.Vector3(0, 0, -1).applyEuler(
    new THREE.Euler(pose.pitch, pose.yaw, 0, "YXZ"),
  );
}
function turn(state, target, length, temple) {
  let yawDelta =
    THREE.MathUtils.euclideanModulo(
      target.yaw - state.pose.yaw + Math.PI,
      Math.PI * 2,
    ) - Math.PI;
  const pitchDelta = target.pitch - state.pose.pitch;
  const movement = characterMovement("orca", false);
  const duration =
    Math.max(Math.abs(yawDelta), Math.abs(pitchDelta)) / movement.yawRate;
  const steps = Math.max(1, Math.ceil(duration * 60));
  const input = {
    x: duration ? -yawDelta / duration / movement.yawRate : 0,
    y: duration ? pitchDelta / duration / movement.pitchRate : 0,
  };
  let pose = state.pose,
    position = state.position;
  for (let i = 0; i < steps; i++) {
    pose = stepSteering(pose, input, movement, duration / steps);
    position = clearMove(position, position, pose, length, temple);
  }
  return { position, pose };
}
function clearMove(previous, desired, pose, length, temple) {
  const forward = directionFor(pose),
    radius = bodyRadius(length);
  const result = resolveMotion(previous, desired, {
    colliders: temple.colliders,
    radius,
    forward,
    length,
    floorHeight: (x, z) =>
      atlantisSeabedHeight(x, z) +
      radius +
      Math.abs(forward.y) * Math.max(0, length * 0.42 - radius) +
      0.4,
    bounds: {
      minY: -WORLD.maxDepth + radius,
      maxY: WORLD.surfaceY - length * 0.15,
    },
  });
  assert.equal(
    result.blocked,
    false,
    JSON.stringify({
      desired,
      pose,
      actual: result.position,
      contacts: result.contacts.map((c) => c.collider.kind),
    }),
  );
  assertNear(result.position, desired);
  return result.position;
}
function visibleHit(root, a, b) {
  const start = new THREE.Vector3(a.x, a.y, a.z),
    delta = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  return new THREE.Raycaster(
    start,
    delta.clone().normalize(),
    0,
    delta.length(),
  ).intersectObject(root, true)[0];
}
function interpolate(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function assertNear(a, b) {
  assert.ok(
    distance(a, b) < 1e-5,
    `${JSON.stringify(a)} differs from ${JSON.stringify(b)}`,
  );
}
