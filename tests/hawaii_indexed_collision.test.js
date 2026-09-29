import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createOcean, seabedHeight } from "../src/ocean.js";
import { createShips } from "../src/ships.js";
import { WORLD } from "../src/world_config.js";
import { bodyRadius, castSegment, resolveMotion } from "../src/collision.js";
import {
  castIndexedSegment,
  resolveIndexedMotion,
} from "../src/static_collider_grid.js";

const SCENE = new THREE.Scene();
const ORIGINAL_DOCUMENT = globalThis.document;
let ocean;
let fleet;
let features;

before(() => {
  ocean = createOcean(SCENE);
  // 船帆纹理仅需画布接口；此处验证真实船体碰撞，不模拟像素或 WebGL 渲染。
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, "canvas");
      return {
        getContext: () => ({
          fillRect() {},
          beginPath() {},
          moveTo() {},
          lineTo() {},
          stroke() {},
          createRadialGradient: () => ({ addColorStop() {} }),
        }),
      };
    },
  };
  fleet = createShips(SCENE);
  const find = (name, predicate) => {
    const collider = ocean.colliders.find(predicate);
    assert.ok(collider, `Missing Hawaii fixture: ${name}`);
    return { name, collider, center: colliderCenter(collider) };
  };
  features = [
    find("coastal reef", (c) => c.kind === "reef" && c.z > 20 && c.y < -8),
    find("outer reef", (c) => c.kind === "reef" && c.z < -100 && c.z > -200),
    find("deep reef", (c) => c.kind === "reef" && c.z < -900),
    ...[9, -104, -226, -445, -701, -1030].map((z) =>
      find(
        `arch at ${z}`,
        (c) =>
          c.kind === "arch" &&
          Math.abs(colliderCenter(c).z - z) < 1 &&
          Math.abs(c.a.y - c.b.y) < 0.35,
      ),
    ),
    find(
      "temple doorway",
      (c) => c.kind === "landmark" && c.z === -791 && c.halfSize.y === 6,
    ),
    find(
      "temple step",
      (c) => c.kind === "landmark" && c.z === -795 && c.halfSize.x === 13.25,
    ),
    ...[-555, -728, -942, -1091].map((z) =>
      find(
        `volcano at ${z}`,
        (c) =>
          c.kind === "volcano" &&
          c.z === z &&
          c.y > seabedHeight(c.x, c.z) + 10,
      ),
    ),
  ];
});

after(() => {
  fleet?.dispose();
  ocean?.dispose();
  if (ORIGINAL_DOCUMENT === undefined) delete globalThis.document;
  else globalThis.document = ORIGINAL_DOCUMENT;
  assert.equal(SCENE.children.length, 0);
});

test("Hawaii coastal, reef, arch, temple and volcano rays retain exact hits and input order", () => {
  for (const { name, center } of features) {
    for (const radius of [0, 0.65, bodyRadius(30)]) {
      const start = offset(center, -55, -4, 31);
      const end = offset(center, 55, 4, -31);
      const hit = assertRayMatches(start, end, { radius }, name);
      assert.ok(hit, `${name}: crossing ray must hit real geometry`);
      assertRayMatches(end, start, { radius }, `${name}: reverse`);
      assertRayMatches(center, center, { radius }, `${name}: penetration`);
    }
  }
  for (const z of [75, -180, -500, -795, -1075]) {
    assert.equal(
      assertRayMatches(
        { x: -240, y: 80, z },
        { x: 240, y: 80, z },
        { radius: 0.65 },
        `clear sky at ${z}`,
      ),
      null,
    );
  }
});

for (const length of [3, 10, 25, 30]) {
  test(`Hawaii ${length} m fast diagonal motion preserves floor, contact order and recovery`, () => {
    let blocked = 0;
    let recovered = 0;
    for (const { name, center } of features) {
      const start = offset(center, -48, -3, 27);
      const end = offset(center, 48, 3, -27);
      const forward = new THREE.Vector3().subVectors(end, start).normalize();
      const options = playerOptions(length, forward);
      blocked += assertMotionMatches(start, end, options, name).blocked;
      // 从实体内部开始模拟长大后重叠，脱困每一步必须重新查询邻近实体。
      recovered += assertMotionMatches(
        center,
        offset(center, 0.1, 0, -0.1),
        options,
        `${name}: growth recovery`,
      ).recovered;
    }
    assert.ok(blocked >= 8, "Sweeps must exercise multiple solid features");
    assert.ok(recovered >= 8, "Growth probes must exercise real recovery");

    // 海岸斜坡和深海边界先投影中心，再执行扫掠；粗筛不能沿旧高度漏查。
    for (const [start, end] of [
      [new THREE.Vector3(0, -100, 75), new THREE.Vector3(35, -90, 105)],
      [
        new THREE.Vector3(-310, -745, -1120),
        new THREE.Vector3(-260, -725, -1080),
      ],
    ]) {
      const forward = new THREE.Vector3().subVectors(end, start).normalize();
      assertMotionMatches(
        start,
        end,
        playerOptions(length, forward),
        "projection",
      );
    }
  });
}

test("Hawaii moving hulls retain live transforms beside the indexed real terrain", () => {
  let previousTransforms;
  for (const time of [0, 90, 230]) {
    fleet.update(time);
    const transforms = fleet.colliders.map((c) => [c.x, c.y, c.z]);
    if (previousTransforms) assert.notDeepEqual(transforms, previousTransforms);
    previousTransforms = transforms;
    for (const ship of fleet.ships) {
      const start = ship.root.localToWorld(new THREE.Vector3(-35, -1, 0));
      const end = ship.root.localToWorld(new THREE.Vector3(35, -1, 0));
      const dynamicColliders = fleet.colliders;
      const hit = assertRayMatches(
        start,
        end,
        { dynamicColliders, radius: 0.65 },
        `${ship.kind} at ${time}`,
      );
      assert.ok(ship.colliders.includes(hit?.collider));
      for (const length of [3, 25]) {
        const forward = new THREE.Vector3().subVectors(end, start).normalize();
        const options = playerOptions(length, forward);
        // 空中及刚破水的移动没有水下中心高度上限。
        options.bounds.maxY = undefined;
        const result = assertMotionMatches(
          start,
          end,
          { ...options, dynamicColliders },
          `${ship.kind}: ${length} m at ${time}`,
        );
        assert.ok(
          result.contacts.some((c) => ship.colliders.includes(c.collider)),
        );
      }
    }
  }
});

function assertRayMatches(start, end, options, label) {
  const { dynamicColliders = [], radius = 0 } = options;
  const expected = castSegment(
    start,
    end,
    [...ocean.colliders, ...dynamicColliders],
    radius,
  );
  const actual = castIndexedSegment(start, end, {
    staticColliders: ocean.colliders,
    ...options,
  });
  assert.deepEqual(actual, expected, label);
  if (expected) assert.equal(actual.collider, expected.collider, label);
  return actual;
}

function assertMotionMatches(start, end, options, label) {
  const { dynamicColliders = [], ...motion } = options;
  const expected = resolveMotion(start, end, {
    ...motion,
    colliders: [...ocean.colliders, ...dynamicColliders],
  });
  const actual = resolveIndexedMotion(start, end, {
    ...motion,
    staticColliders: ocean.colliders,
    dynamicColliders,
  });
  assert.deepEqual(actual, expected, label);
  actual.contacts.forEach((contact, index) =>
    assert.equal(contact.collider, expected.contacts[index].collider, label),
  );
  return actual;
}

function playerOptions(length, forward) {
  const radius = bodyRadius(length);
  return {
    length,
    radius,
    forward,
    floorHeight: (x, z) =>
      seabedHeight(x, z) +
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

function colliderCenter(collider) {
  return collider.type === "capsule"
    ? new THREE.Vector3().addVectors(collider.a, collider.b).multiplyScalar(0.5)
    : new THREE.Vector3(collider.x, collider.y, collider.z);
}

function offset(point, x, y, z) {
  return new THREE.Vector3(point.x + x, point.y + y, point.z + z);
}
