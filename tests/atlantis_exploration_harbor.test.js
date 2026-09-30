import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createAtlantisCity } from "../src/atlantis_city.js";
import { createAtlantisHarborRuins } from "../src/atlantis_exploration_harbor.js";
import {
  ATLANTIS_EXCAVATION_SITES,
  atlantisSeabedHeight,
} from "../src/atlantis_terrain.js";
import { GEOMETRIES } from "../src/atlantis_art_geometry.js";
import { bodyRadius, castSegment } from "../src/collision.js";
import { resolveIndexedMotion } from "../src/static_collider_grid.js";
import { MAX_SWIM_PITCH } from "../src/steering_rules.js";
import { seabedHeight } from "../src/ocean.js";
import { WORLD } from "../src/world_config.js";

const SITE = ATLANTIS_EXCAVATION_SITES[0];
const LENGTHS = [3, 16, 30];
const POSITION_TOLERANCE = 1e-5;
const TURN_STEP = Math.PI / 120;

test("Harbor routes connect the original surface to the excavated lower hall", () => {
  assert.ok(SITE.routes.length >= 2, "Both entrances need complete routes");
  assert.equal(
    new Set(SITE.routes.map((route) => route.id)).size,
    SITE.routes.length,
  );
  const lower = SITE.levels.find((level) => level.id === "lower_hall");
  assert.ok(lower, "The excavation must expose a lower hall");
  for (const route of SITE.routes) {
    assert.ok(route.waypoints.length >= 4, `${route.id}: incomplete route`);
    for (const [index, point] of route.waypoints.entries()) {
      assert.ok(
        [point.x, point.y, point.z].every(Number.isFinite),
        `${route.id}: non-finite waypoint ${index}`,
      );
      if (index)
        assert.ok(
          distance(point, route.waypoints[index - 1]) > 0.01,
          `${route.id}: repeated waypoint ${index}`,
        );
    }
    const start = route.waypoints[0];
    const end = route.waypoints.at(-1);
    assert.ok(
      start.y > seabedHeight(start.x, start.z),
      `${route.id}: entry must begin above the original seabed`,
    );
    assert.ok(
      end.y < seabedHeight(end.x, end.z),
      `${route.id}: destination must descend below the original seabed`,
    );
    assert.ok(
      end.y > lower.floorY && end.y < lower.ceilingY,
      `${route.id}: destination must lie inside the lower hall`,
    );
  }
});

test("Complete city collisions allow Harbor routes and adult turns with real floor and world limits", async (t) => {
  const scene = new THREE.Scene();
  const city = createAtlantisCity(scene, { heightAt: atlantisSeabedHeight });
  t.after(() => city.dispose());
  assert.ok(city.colliders.length > city.exploration.colliders.length);
  assert.ok(
    city.exploration.colliders.every((collider) =>
      city.colliders.includes(collider),
    ),
    "The final city collider collection must include every Harbor structure",
  );

  for (const route of SITE.routes)
    for (const length of LENGTHS)
      for (const reverse of [false, true])
        for (const steps of [1, 60]) {
          const label = `${route.id}, ${length}m, ${reverse ? "lower first" : "surface first"}, ${steps} steps`;
          await t.test(label, () => {
            const waypoints = reverse
              ? [...route.waypoints].reverse()
              : route.waypoints;
            const initialPose = routePose(waypoints, 0);
            let state = { position: { ...waypoints[0] }, pose: initialPose };
            assertClearMove(
              state.position,
              state.position,
              state.pose,
              length,
              city,
              `${label}: start`,
            );

            // 往返共用真实上一帧位置，终点先完整掉头，不能重新定位后假装返程成功。
            state = traverseRoute(
              waypoints,
              state,
              steps,
              length,
              city,
              `${label}: outward`,
            );
            state = traverseRoute(
              [...waypoints].reverse(),
              state,
              steps,
              length,
              city,
              `${label}: return`,
            );
            state = turnInPlace(
              state,
              initialPose,
              length,
              city,
              `${label}: final turn`,
            );
            assertNear(
              state.position,
              waypoints[0],
              `${label}: round-trip endpoint`,
            );
          });
        }

  for (const length of LENGTHS)
    for (const direction of [-1, 1])
      await t.test(
        `${length}m lower-hall circle, direction ${direction}`,
        () => {
          const circle = SITE.turningCircle;
          assert.ok(
            Number.isFinite(circle.y),
            "Turning circle must declare its swimming height",
          );
          const radius = bodyRadius(length);
          const extent = Math.max(0, length * 0.42 - radius);
          assert.ok(
            Math.hypot(circle.swimLoopRadius, extent) + radius <=
              circle.clearRadius,
            "Declared turning clearance must contain the complete tangent body",
          );
          const pointAt = (angle) => ({
            x: circle.x + circle.swimLoopRadius * Math.cos(angle),
            y: circle.y,
            z: circle.z + circle.swimLoopRadius * Math.sin(angle),
          });
          const tangentPose = (angle) => ({
            yaw: Math.atan2(
              direction * Math.sin(angle),
              -direction * Math.cos(angle),
            ),
            pitch: 0,
          });
          let state = { position: pointAt(0), pose: tangentPose(0) };
          assertClearMove(
            state.position,
            state.position,
            state.pose,
            length,
            city,
            "Circle start",
          );
          // 相邻切线连续转动，逐弦扫掠一周；每帧仍用实际鱼身长度和地形余量。
          for (let step = 1; step <= 240; step++) {
            const angle = (direction * step * Math.PI * 2) / 240;
            const label = `${length}m circle ${direction}, step ${step}/240`;
            state = turnInPlace(state, tangentPose(angle), length, city, label);
            state.position = assertClearMove(
              state.position,
              pointAt(angle),
              state.pose,
              length,
              city,
              label,
            );
          }
          assertNear(
            state.position,
            pointAt(0),
            "The turning circuit must close without recovery",
          );
        },
      );
});

test("Harbor stair and structural faces agree with rendered surfaces", async (t) => {
  const scene = new THREE.Scene();
  const city = createAtlantisCity(scene, { heightAt: atlantisSeabedHeight });
  t.after(() => city.dispose());
  scene.updateMatrixWorld(true);

  await t.test(
    "Entrance stair rays descend with the visible steps and matching slab underside",
    () => {
      const stairColliders = city.exploration.colliders.filter(
        (collider) => collider.kind === "harbor_ruin_stair",
      );
      assert.ok(
        stairColliders.length > 0,
        "The stair must have solid geometry",
      );
      const hits = [];
      for (const fraction of [0.4, 0.6, 0.8]) {
        const { top, bottom } = SITE.entrance;
        const point = {
          x: top.x + (bottom.x - top.x) * fraction,
          y: top.y + (bottom.y - top.y) * fraction,
          z: top.z + (bottom.z - top.z) * fraction,
        };
        const above = new THREE.Vector3(point.x, point.y + 3, point.z);
        const below = new THREE.Vector3(point.x, point.y - 3, point.z);
        const collision = castSegment(above, below, stairColliders);
        assert.ok(collision, `Stair ${fraction}: missing upper contact`);
        const visual = visibleHit(city.root, above, below);
        assert.ok(visual, `Stair ${fraction}: missing visible upper surface`);
        assert.ok(
          Math.abs(visual.point.y - collision.point.y) < 0.8,
          `Stair ${fraction}: steps and solid ramp diverge`,
        );
        assert.ok(
          Math.abs(collision.point.y - point.y) < 0.8,
          `Stair ${fraction}: collider must follow the declared stair elevation`,
        );
        const underside = castSegment(below, above, stairColliders);
        const visibleUnderside = visibleHit(city.root, below, above);
        assert.ok(underside, `Stair ${fraction}: missing lower contact`);
        assert.ok(
          visibleUnderside,
          `Stair ${fraction}: missing visible underside`,
        );
        assert.ok(
          Math.abs(visibleUnderside.point.y - underside.point.y) < 0.1,
          `Stair ${fraction}: visible and solid undersides disagree`,
        );
        hits.push({ solid: collision.point, visible: visual.point });
      }
      for (let index = 1; index < hits.length; index++) {
        assert.ok(hits[index].solid.y < hits[index - 1].solid.y);
        assert.ok(hits[index].visible.y < hits[index - 1].visible.y);
      }
    },
  );

  await t.test(
    "Roof and upper deck resist rays and high-speed bodies from both sides",
    () => {
      const x = -218;
      const z = -240;
      const upper = SITE.levels.find((level) => level.id === "upper_gallery");
      const lower = SITE.levels.find((level) => level.id === "lower_hall");
      const upperCenter = (upper.floorY + upper.ceilingY) / 2;
      const surfaces = [
        {
          kind: "harbor_ruin_roof",
          top: SITE.shaft.topY,
          bottom: upper.ceilingY,
          above: SITE.shaft.topY + 10,
          below: upperCenter,
        },
        {
          kind: "harbor_ruin_deck",
          top: upper.floorY,
          bottom: lower.ceilingY,
          above: upperCenter,
          below: SITE.turningCircle.y,
        },
      ];
      for (const surface of surfaces)
        for (const downward of [false, true]) {
          const start = new THREE.Vector3(
            x,
            downward ? surface.above : surface.below,
            z,
          );
          const end = new THREE.Vector3(
            x,
            downward ? surface.below : surface.above,
            z,
          );
          const label = `${surface.kind}, ${downward ? "downward" : "upward"}`;
          const collision = castSegment(start, end, city.colliders);
          const visual = visibleHit(city.root, start, end);
          assert.ok(collision, `${label}: missing solid face`);
          assert.equal(
            collision.collider.kind,
            surface.kind,
            `${label}: unexpected occluder`,
          );
          assert.ok(visual, `${label}: missing visible face`);
          const expectedY = downward ? surface.top : surface.bottom;
          assert.ok(
            Math.abs(collision.point.y - expectedY) < 1e-5,
            `${label}: wrong contact elevation`,
          );
          assert.ok(
            Math.abs(visual.point.y - expectedY) < 0.8,
            `${label}: visible and solid faces disagree`,
          );
          for (const length of LENGTHS) {
            // 上层净高不足以先竖直摆放30m身体；水平姿态做垂直高速位移，起点无重叠。
            const result = resolveIndexedMotion(
              start,
              end,
              playerOptions({ yaw: 0, pitch: 0 }, length, city),
            );
            assert.equal(
              result.blocked,
              true,
              `${label}, ${length}m: solid face must block a sweep`,
            );
            assert.equal(
              result.recovered,
              false,
              `${label}, ${length}m: start must not overlap another floor`,
            );
            assert.equal(
              result.stuck,
              false,
              `${label}, ${length}m: contact must not trap the body`,
            );
            assert.ok(
              result.contacts.some(
                ({ collider }) => collider.kind === surface.kind,
              ),
              `${label}, ${length}m: wrong collision surface`,
            );
            assert.ok(
              downward
                ? result.position.y >= surface.top + bodyRadius(length)
                : result.position.y <= surface.bottom - bodyRadius(length),
              `${label}, ${length}m: body crossed the solid floor`,
            );
          }
        }
    },
  );
});

test("Harbor disposal releases each owned buffer once and preserves the other instance and shared assets", (t) => {
  const scene = new THREE.Scene();
  const first = createAtlantisHarborRuins(scene, {
    heightAt: atlantisSeabedHeight,
  });
  const second = createAtlantisHarborRuins(scene, {
    heightAt: atlantisSeabedHeight,
  });
  t.after(() => {
    first.dispose();
    second.dispose();
  });
  const firstGeometry = collectGeometry(first.root);
  const secondGeometry = collectGeometry(second.root);
  assert.ok(firstGeometry.size > 0);
  assert.ok(secondGeometry.size > 0);
  for (const instance of [first, second]) {
    assert.equal(instance.lightSources.length, 2);
    for (const light of instance.lightSources) {
      assert.ok(
        [light.x, light.y, light.z, light.intensity, light.distance].every(
          Number.isFinite,
        ),
      );
      assert.ok(light.intensity > 0 && light.distance > 0);
      assert.equal(typeof light.color, "string");
    }
  }
  for (const geometry of firstGeometry)
    assert.equal(
      secondGeometry.has(geometry),
      false,
      "Merged instance geometry must have independent ownership",
    );
  const shared = new Set(GEOMETRIES.values());
  for (const instance of [first, second])
    instance.root.traverse((node) => {
      if (node.material)
        for (const material of [node.material].flat()) shared.add(material);
    });
  const firstReleases = watchDisposals(firstGeometry, t);
  const secondReleases = watchDisposals(secondGeometry, t);
  const sharedReleases = watchDisposals(shared, t);
  const routeRecords = SITE.routes.map((route) => ({
    id: route.id,
    waypoints: route.waypoints.map((point) => ({ ...point })),
  }));

  first.dispose();
  first.dispose();
  first.update(10, 1 / 60, new THREE.Vector3(0, 0, 0), false);
  assert.equal(first.root.parent, null);
  assert.equal(first.root.children.length, 0);
  assert.equal(first.colliders.length, 0);
  assert.equal(first.obstacles.length, 0);
  assert.equal(first.landmarks.length, 0);
  assert.equal(first.lightSources.length, 0);
  assert.equal(second.lightSources.length, 2);
  assert.equal(second.root.parent, scene);
  assert.equal(scene.children.length, 1);
  assert.ok(second.colliders.length > 0);
  for (const count of firstReleases.values()) assert.equal(count, 1);
  for (const count of secondReleases.values()) assert.equal(count, 0);
  for (const count of sharedReleases.values()) assert.equal(count, 0);

  for (const highQuality of [false, true]) {
    second.update(
      11,
      1 / 60,
      new THREE.Vector3(
        SITE.turningCircle.x,
        SITE.turningCircle.y,
        SITE.turningCircle.z,
      ),
      highQuality,
    );
    assert.equal(second.root.visible, true);
    assert.deepEqual(collectGeometry(second.root), secondGeometry);
  }
  assert.deepEqual(
    SITE.routes,
    routeRecords,
    "Disposal must preserve immutable route metadata",
  );
  second.dispose();
  second.dispose();
  assert.equal(scene.children.length, 0);
  for (const count of secondReleases.values()) assert.equal(count, 1);
  for (const count of sharedReleases.values()) assert.equal(count, 0);
});

function traverseRoute(waypoints, initialState, steps, length, city, label) {
  let state = initialState;
  for (let segment = 0; segment < waypoints.length - 1; segment++) {
    const pose = routePose(waypoints, segment, state.pose.yaw);
    state = turnInPlace(
      state,
      pose,
      length,
      city,
      `${label}, corner ${segment}`,
    );
    const start = waypoints[segment];
    const end = waypoints[segment + 1];
    for (let step = 1; step <= steps; step++) {
      const desired = {
        x: start.x + ((end.x - start.x) * step) / steps,
        y: start.y + ((end.y - start.y) * step) / steps,
        z: start.z + ((end.z - start.z) * step) / steps,
      };
      state.position = assertClearMove(
        state.position,
        desired,
        state.pose,
        length,
        city,
        `${label}, segment ${segment}, step ${step}/${steps}`,
      );
    }
  }
  return state;
}

function turnInPlace(state, target, length, city, label) {
  const yawDelta = shortestAngle(target.yaw - state.pose.yaw);
  const pitchDelta = target.pitch - state.pose.pitch;
  const steps = Math.max(
    1,
    Math.ceil(Math.max(Math.abs(yawDelta), Math.abs(pitchDelta)) / TURN_STEP),
  );
  let position = state.position;
  let pose = state.pose;
  for (let step = 1; step <= steps; step++) {
    pose = {
      yaw: state.pose.yaw + (yawDelta * step) / steps,
      pitch: state.pose.pitch + (pitchDelta * step) / steps,
    };
    position = assertClearMove(
      position,
      state.position,
      pose,
      length,
      city,
      `${label}, turn ${step}/${steps}`,
    );
  }
  return { position, pose };
}

function routePose(waypoints, segment, previousYaw) {
  const start = waypoints[segment];
  const end = waypoints[segment + 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const horizontal = Math.hypot(dx, dz);
  // 竖直段保留连续偏航；首段竖直时由之后首个水平位移确定初始偏航。
  if (previousYaw === undefined && horizontal < 1e-8) {
    for (let index = segment + 1; index < waypoints.length - 1; index++) {
      const next = waypoints[index + 1];
      const point = waypoints[index];
      if (Math.hypot(next.x - point.x, next.z - point.z) > 1e-8) {
        previousYaw = Math.atan2(point.x - next.x, point.z - next.z);
        break;
      }
    }
  }
  return {
    yaw: horizontal > 1e-8 ? Math.atan2(-dx, -dz) : (previousYaw ?? 0),
    pitch: THREE.MathUtils.clamp(
      Math.atan2(dy, horizontal),
      -MAX_SWIM_PITCH,
      MAX_SWIM_PITCH,
    ),
  };
}

function assertClearMove(previous, desired, pose, length, city, label) {
  assert.ok(
    Math.abs(pose.pitch) <= MAX_SWIM_PITCH + 1e-10,
    `${label}: pitch exceeds player controls`,
  );
  const result = resolveIndexedMotion(
    previous,
    desired,
    playerOptions(pose, length, city),
  );
  const details = `${label}: contacts=${result.contacts.map(({ collider }) => collider.kind ?? collider.type).join(",")}, actual=${JSON.stringify(result.position)}, desired=${JSON.stringify(desired)}, pose=${JSON.stringify(pose)}`;
  assert.equal(result.stuck, false, details);
  assert.equal(result.blocked, false, details);
  assert.equal(result.recovered, false, details);
  assertNear(result.position, desired, details);
  return result.position;
}

function playerOptions(pose, length, city) {
  const forward = new THREE.Vector3(0, 0, -1).applyEuler(
    new THREE.Euler(pose.pitch, pose.yaw, 0, "YXZ"),
  );
  const radius = bodyRadius(length);
  // 与 main.js 的玩家解析共用同一索引求解器、中心余量和世界边界。
  return {
    staticColliders: city.colliders,
    radius,
    forward,
    length,
    floorHeight: (x, z) =>
      atlantisSeabedHeight(x, z) +
      radius +
      Math.abs(forward.y) * Math.max(0, length * 0.42 - radius) +
      0.4,
    bounds: {
      minX: WORLD.minX + 5,
      maxX: WORLD.maxX - 5,
      minZ: WORLD.minZ + 5,
      maxZ: WORLD.maxZ - 5,
      minY: -WORLD.maxDepth + radius,
      maxY: WORLD.surfaceY - length * 0.15,
    },
  };
}

function visibleHit(root, start, end) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const ray = new THREE.Raycaster(
    start,
    direction.clone().normalize(),
    0,
    direction.length(),
  );
  return ray.intersectObject(root, true)[0];
}

function shortestAngle(angle) {
  const wrapped = Math.atan2(Math.sin(angle), Math.cos(angle));
  return Math.abs(Math.abs(wrapped) - Math.PI) < 1e-10 ? Math.PI : wrapped;
}

function assertNear(actual, expected, label) {
  assert.ok(
    distance(actual, expected) < POSITION_TOLERANCE,
    `${label}: unexpected projection or displacement`,
  );
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function collectGeometry(root) {
  const geometries = new Set();
  root.updateMatrixWorld(true);
  root.traverse((node) => {
    assert.ok(
      node.matrixWorld.elements.every(Number.isFinite),
      `${node.name}: invalid transform`,
    );
    if (!node.geometry || geometries.has(node.geometry)) return;
    geometries.add(node.geometry);
    for (const [name, attribute] of Object.entries(node.geometry.attributes))
      assert.ok(
        attribute.array.every(Number.isFinite),
        `${node.name}: invalid ${name} buffer`,
      );
  });
  return geometries;
}

function watchDisposals(resources, t) {
  const counts = new Map();
  for (const resource of resources) {
    counts.set(resource, 0);
    const onDispose = () => counts.set(resource, counts.get(resource) + 1);
    resource.addEventListener("dispose", onDispose);
    t.after(() => resource.removeEventListener("dispose", onDispose));
  }
  return counts;
}
