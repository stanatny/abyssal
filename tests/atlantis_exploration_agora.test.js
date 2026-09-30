import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createAtlantisCity } from "../src/atlantis_city.js";
import { createAtlantisUnderways } from "../src/atlantis_underways.js";
import { AGORA_EXCAVATION_SITE } from "../src/atlantis_exploration_agora_site.js";
import { atlantisSeabedHeight } from "../src/atlantis_terrain.js";
import { bodyRadius, castSegment } from "../src/collision.js";
import { seabedHeight } from "../src/ocean.js";
import { resolveIndexedMotion } from "../src/static_collider_grid.js";
import { MAX_SWIM_PITCH } from "../src/steering_rules.js";
import { WORLD } from "../src/world_config.js";

const SITE = AGORA_EXCAVATION_SITE;
const LENGTHS = [3, 16, 30];
const POSITION_TOLERANCE = 1e-5;

test("Agora complete routes and endpoint turns obey body, terrain and world limits", async (t) => {
  const city = makeCity(t);
  assert.ok(city.agora.colliders.length > 0);
  assert.ok(
    city.agora.colliders.every((collider) => city.colliders.includes(collider)),
    "Every Agora solid must participate in actual city collision",
  );
  const lower = SITE.levels.find((level) => level.id === "lower_cistern");
  for (const route of SITE.routes) {
    const start = route.waypoints[0];
    const end = route.waypoints.at(-1);
    assert.ok(start.y > seabedHeight(start.x, start.z));
    assert.ok(end.y < seabedHeight(end.x, end.z));
    assert.ok(end.y > lower.floorY && end.y < lower.ceilingY);
    for (const length of LENGTHS)
      for (const reverse of [false, true])
        for (const steps of [1, 60]) {
          const label = `${route.id}, ${length}m, reverse=${reverse}, steps=${steps}`;
          await t.test(label, () => {
            const points = reverse
              ? [...route.waypoints].reverse()
              : route.waypoints;
            const initialPose = routePose(points, 0);
            let state = { position: { ...points[0] }, pose: initialPose };
            state.position = clearMove(
              state.position,
              state.position,
              state.pose,
              length,
              city,
              `${label}: start`,
            );
            // 返程保留实际终点与朝向，不能在低点重新定位或忽略转身时的身体余量。
            state = traverse(points, state, steps, length, city, label);
            state = traverse(
              [...points].reverse(),
              state,
              steps,
              length,
              city,
              `${label}: return`,
            );
            state = turn(state, initialPose, length, city, `${label}: final`);
            assertNear(state.position, points[0], `${label}: final position`);
          });
        }
  }
});

test("Agora turning area admits complete 3/16/30m tangent bodies in both directions", async (t) => {
  const city = makeCity(t);
  const circle = SITE.turningCircle;
  for (const length of LENGTHS)
    for (const direction of [-1, 1])
      await t.test(`${length}m circle, direction=${direction}`, () => {
        const radius = bodyRadius(length);
        const extent = Math.max(0, length * 0.42 - radius);
        assert.ok(
          Math.hypot(circle.swimLoopRadius, extent) + radius <=
            circle.clearRadius,
        );
        const pointAt = (angle) => ({
          x: circle.x + circle.swimLoopRadius * Math.cos(angle),
          y: circle.y,
          z: circle.z + circle.swimLoopRadius * Math.sin(angle),
        });
        const tangent = (angle) => ({
          yaw: Math.atan2(
            direction * Math.sin(angle),
            -direction * Math.cos(angle),
          ),
          pitch: 0,
        });
        let state = { position: pointAt(0), pose: tangent(0) };
        state.position = clearMove(
          state.position,
          state.position,
          state.pose,
          length,
          city,
          "Circle start",
        );
        for (let step = 1; step <= 240; step++) {
          const angle = (direction * step * Math.PI * 2) / 240;
          const label = `${length}m circle ${direction}, step=${step}`;
          state = turn(state, tangent(angle), length, city, label);
          state.position = clearMove(
            state.position,
            pointAt(angle),
            state.pose,
            length,
            city,
            label,
          );
        }
        assertNear(state.position, pointAt(0), "Circle must close");
      });
});

test("Agora vaults preserve the declared upper-level minimum and real adult passage", async (t) => {
  const city = makeCity(t);
  const upper = SITE.levels.find((level) => level.id === "upper_cloister");
  const vaults = city.agora.colliders.filter(
    (collider) => collider.kind === "agora_ruin_vault",
  );
  assert.ok(vaults.length > 0);
  const minimum = Math.min(...vaults.map(colliderMinimumY));
  assert.ok(
    minimum >= upper.ceilingY - 0.15,
    `Actual vault minimum ${minimum} must support declared ceiling ${upper.ceilingY}; clear height is ${minimum - upper.floorY}`,
  );
  const y = upper.floorY + bodyRadius(30) + 1;
  // 两侧通行均使用完整长身体，开放井口允许侧向轮廓伸出回廊边缘。
  for (const x of [193.5, 238.5])
    for (const reverse of [false, true])
      await t.test(`Upper cloister x=${x}, reverse=${reverse}`, () => {
        const points = [
          { x, y, z: -469 },
          { x, y, z: -427 },
        ];
        if (reverse) points.reverse();
        const pose = routePose(points, 0);
        let state = { position: { ...points[0] }, pose };
        state.position = clearMove(
          state.position,
          state.position,
          pose,
          30,
          city,
          "Upper cloister start",
        );
        state = traverse(points, state, 60, 30, city, "Upper cloister");
        assertNear(state.position, points[1], "Upper cloister endpoint");
      });
});

test("Agora visible deck, arch and vault surfaces agree with collision from both sides", () => {
  const scene = new THREE.Scene();
  const city = createAtlantisCity(scene, { heightAt: atlantisSeabedHeight });
  try {
    scene.updateMatrixWorld(true);
    const upper = SITE.levels.find((level) => level.id === "upper_cloister");
    const pairs = [
      {
        label: "West gallery deck",
        kind: "agora_ruin_deck",
        a: { x: 193, y: upper.floorY - 6, z: -448 },
        b: { x: 193, y: upper.floorY + 2, z: -448 },
      },
      {
        label: "West vault crown",
        kind: "agora_ruin_vault",
        a: { x: 192.5, y: upper.floorY + 0.8, z: -456 },
        b: { x: 192.5, y: upper.ceilingY + 12, z: -456 },
      },
      {
        label: "South portal arch flank",
        kind: "agora_ruin_arch",
        a: { x: 210, y: -326, z: SITE.secondExit.z },
        b: { x: 210, y: -310, z: SITE.secondExit.z },
      },
    ];
    for (const pair of pairs)
      for (const reverse of [false, true]) {
        const a = reverse ? pair.b : pair.a;
        const b = reverse ? pair.a : pair.b;
        // 拱石与门楣可以互相遮盖，首个可见面必须对比完整的结构碰撞集合。
        const collision = castSegment(a, b, city.agora.colliders);
        const visual = visibleHit(city.agora.root, a, b);
        assert.ok(collision, `${pair.label}: missing solid face`);
        assert.ok(visual, `${pair.label}: missing visible face`);
        assert.ok(
          distance(collision.point, visual.point) < 0.001,
          `${pair.label}: visible and solid face differ`,
        );
      }
  } finally {
    city.dispose();
  }
});

test("Agora deck and vault block high-speed complete adult bodies from both sides", () => {
  const scene = new THREE.Scene();
  const city = createAtlantisCity(scene, { heightAt: atlantisSeabedHeight });
  try {
    for (const reverse of [false, true]) {
      const a = { x: 193.5, y: -300, z: -456 };
      const b = { x: 193.5, y: -349.4, z: -456 };
      const start = reverse ? b : a;
      const end = reverse ? a : b;
      const forward = {
        x: 0,
        y: (reverse ? 1 : -1) * Math.sin(MAX_SWIM_PITCH),
        z: -Math.cos(MAX_SWIM_PITCH),
      };
      const radius = bodyRadius(30);
      const result = resolveIndexedMotion(start, end, {
        staticColliders: city.colliders,
        radius,
        length: 30,
        forward,
        floorHeight: (x, z) =>
          atlantisSeabedHeight(x, z) +
          radius +
          Math.abs(forward.y) * Math.max(0, 30 * 0.42 - radius) +
          0.4,
      });
      assert.equal(result.stuck, false);
      assert.equal(result.blocked, true);
      assert.ok(distance(result.position, end) > 1);
      assert.ok(
        result.contacts.some(({ collider }) =>
          ["agora_ruin_deck", "agora_ruin_vault"].includes(collider.kind),
        ),
        "A complete adult must contact the roof or deck instead of tunneling",
      );
    }
  } finally {
    city.dispose();
  }
});

test("Agora excavation preserves all six complete bridge foundations and raised geometry", () => {
  const before = createAtlantisUnderways(new THREE.Group(), {
    heightAt: seabedHeight,
  });
  const after = createAtlantisUnderways(new THREE.Group(), {
    heightAt: atlantisSeabedHeight,
  });
  try {
    const records = (underways) =>
      underways.records
        .filter((record) => record.id === "agora_bridges")
        .map(({ group, ...record }) => record);
    assert.deepEqual(records(after), records(before));
    assert.deepEqual(after.colliders, before.colliders);
    // 验证完整 11×11m 支撑投影，中心采样不能发现边缘下挖。
    for (const x of [171, 259])
      for (const z of [-493.5, -447.5, -401.5])
        for (let ix = 0; ix <= 22; ix++)
          for (let iz = 0; iz <= 22; iz++) {
            const px = x - 5.5 + ix * 0.5;
            const pz = z - 5.5 + iz * 0.5;
            assert.equal(
              atlantisSeabedHeight(px, pz),
              seabedHeight(px, pz),
              `Bridge footing ground changed at ${px}, ${pz}`,
            );
          }
  } finally {
    before.dispose();
    after.dispose();
  }
});

function makeCity(t) {
  const city = createAtlantisCity(new THREE.Scene(), {
    heightAt: atlantisSeabedHeight,
  });
  t.after(() => city.dispose());
  return city;
}

function traverse(points, initial, steps, length, city, label) {
  let state = initial;
  for (let segment = 0; segment < points.length - 1; segment++) {
    state = turn(
      state,
      routePose(points, segment, state.pose.yaw),
      length,
      city,
      `${label}: corner ${segment}`,
    );
    const a = points[segment];
    const b = points[segment + 1];
    for (let step = 1; step <= steps; step++) {
      const fraction = step / steps;
      state.position = clearMove(
        state.position,
        {
          x: a.x + (b.x - a.x) * fraction,
          y: a.y + (b.y - a.y) * fraction,
          z: a.z + (b.z - a.z) * fraction,
        },
        state.pose,
        length,
        city,
        `${label}: segment ${segment}, step ${step}`,
      );
    }
  }
  return state;
}

function turn(state, target, length, city, label) {
  const yawDelta = Math.atan2(
    Math.sin(target.yaw - state.pose.yaw),
    Math.cos(target.yaw - state.pose.yaw),
  );
  const pitchDelta = target.pitch - state.pose.pitch;
  const steps = Math.max(
    1,
    Math.ceil(
      Math.max(Math.abs(yawDelta), Math.abs(pitchDelta)) / (Math.PI / 120),
    ),
  );
  let position = state.position;
  let pose = state.pose;
  for (let step = 1; step <= steps; step++) {
    pose = {
      yaw: state.pose.yaw + (yawDelta * step) / steps,
      pitch: state.pose.pitch + (pitchDelta * step) / steps,
    };
    position = clearMove(
      position,
      state.position,
      pose,
      length,
      city,
      `${label}: turn ${step}`,
    );
  }
  return { position, pose };
}

function routePose(points, index, previousYaw) {
  const a = points[index];
  const b = points[index + 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const horizontal = Math.hypot(dx, dz);
  if (previousYaw === undefined && horizontal < 1e-8)
    for (let next = index + 1; next < points.length - 1; next++) {
      const p = points[next];
      const n = points[next + 1];
      if (Math.hypot(n.x - p.x, n.z - p.z) > 1e-8) {
        previousYaw = Math.atan2(p.x - n.x, p.z - n.z);
        break;
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

function clearMove(previous, desired, pose, length, city, label) {
  const forward = new THREE.Vector3(0, 0, -1).applyEuler(
    new THREE.Euler(pose.pitch, pose.yaw, 0, "YXZ"),
  );
  const radius = bodyRadius(length);
  const result = resolveIndexedMotion(previous, desired, {
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
  });
  const details = `${label}: actual=${JSON.stringify(result.position)}, desired=${JSON.stringify(desired)}, contacts=${result.contacts.map(({ collider }) => collider.kind ?? collider.type).join(",")}`;
  assert.equal(result.stuck, false, details);
  assert.equal(result.blocked, false, details);
  assert.equal(result.recovered, false, details);
  assertNear(result.position, desired, details);
  return result.position;
}

function colliderMinimumY(collider) {
  const q = collider.rotation
    ? new THREE.Quaternion(
        collider.rotation.x,
        collider.rotation.y,
        collider.rotation.z,
        collider.rotation.w,
      )
    : new THREE.Quaternion();
  let minimum = Infinity;
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        const point = new THREE.Vector3(
          sx * collider.halfSize.x,
          sy * collider.halfSize.y,
          sz * collider.halfSize.z,
        ).applyQuaternion(q);
        minimum = Math.min(minimum, point.y + collider.y);
      }
  return minimum;
}

function visibleHit(root, a, b) {
  const start = new THREE.Vector3(a.x, a.y, a.z);
  const delta = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  return new THREE.Raycaster(
    start,
    delta.clone().normalize(),
    0,
    delta.length(),
  ).intersectObject(root, true)[0];
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function assertNear(actual, expected, label) {
  assert.ok(distance(actual, expected) < POSITION_TOLERANCE, label);
}
