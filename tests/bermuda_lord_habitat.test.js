import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import { createEncounters } from "../src/encounters.js";
import { getExpedition } from "../src/expedition_config.js";
import { createPlayer } from "../src/simulation.js";
import { bodyRadius, isPositionBlocked } from "../src/collision.js";
import {
  castIndexedSegment,
  queryStaticColliders,
} from "../src/static_collider_grid.js";
import { WORLD } from "../src/world_config.js";

// 仅替换文字贴图；海床三角面、实体、领主模型、状态机和移动都使用正式代码。
const noop = () => {};
const context = new Proxy(
  {
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
  },
  { get: (target, key) => target[key] ?? noop },
);
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => context }),
};

function fixture(t) {
  const scene = new THREE.Scene(),
    ocean = createBermudaOcean(scene),
    encounters = createEncounters(scene, {
      seabedHeight: ocean.heightAt,
      audio: { hit: noop, eat: noop, bossAttack: noop },
      notify: noop,
      onDamage: noop,
      onBite: noop,
    }),
    region = getExpedition("bermuda").region,
    player = createPlayer(),
    position = new THREE.Vector3(...region.spawn),
    forward = new THREE.Vector3(0, 0, -1);
  let time = 0;
  const reset = () => {
    encounters.reset(region.bossKinds, region.bossHomes, region.bossInstances);
    position.fromArray(region.spawn);
    time = 0;
  };
  reset();
  t.after(() => {
    encounters.dispose();
    ocean.dispose();
  });
  const floor = ocean.root.getObjectByName("bermuda_eroded_seabed");
  assert.ok(floor?.isMesh);
  floor.updateMatrixWorld(true);
  const cast = (a, b) =>
    castIndexedSegment(a, b, { staticColliders: ocean.colliders });
  return {
    ocean,
    floor,
    encounters,
    region,
    player,
    position,
    reset,
    leviathan: encounters.bosses.find(
      (entry) => entry.id === "bermuda_leviathan",
    ),
    step(dt = 1 / 30) {
      time += dt;
      encounters.update(dt, time, player, position, forward, {
        blockedBetween: (a, b) => cast(a, b) !== null,
      });
    },
  };
}

function centerClearance(entry) {
  const { x, y, z } = entry.mesh.position,
    species = entry.state.species;
  return (
    y -
    bermudaSeabedHeight(x, z) -
    (species.floorClearance ?? species.length * 0.2 + 3)
  );
}

function assertCenterClear(entry, label) {
  const gap = centerClearance(entry);
  assert.ok(gap >= -1e-6, `${label}: center floor clearance ${gap.toFixed(6)}`);
}

// 领主有锥形躯干和关节尾部，不能用主角的等半径多球代替实际表面。
// 椭球仿射变为单位球，盒保持局部坐标；逐三角面检测可捕获无顶点穿入的交叉。
function trianglesAgainstSolid(geometry, worldVertices, collider) {
  assert.ok(
    ["box", "ellipsoid"].includes(collider.type),
    `Unsupported Bermuda solid type: ${collider.type}`,
  );
  const center = new THREE.Vector3(collider.x, collider.y, collider.z),
    rotation = collider.rotation,
    inverse = new THREE.Quaternion(
      rotation?.x ?? 0,
      rotation?.y ?? 0,
      rotation?.z ?? 0,
      rotation?.w ?? 1,
    ).invert(),
    box =
      collider.type === "box"
        ? new THREE.Box3(
            collider.halfSize.clone().negate(),
            collider.halfSize.clone(),
          )
        : null,
    local = worldVertices.map((point) => {
      const result = point.clone().sub(center).applyQuaternion(inverse);
      if (!box) result.divide(collider.axes);
      return result;
    }),
    triangle = new THREE.Triangle(),
    origin = new THREE.Vector3(),
    closest = new THREE.Vector3(),
    indices = geometry.index,
    count = indices ? indices.count : local.length;
  for (let index = 0; index < count; index += 3) {
    triangle.set(
      local[indices ? indices.getX(index) : index],
      local[indices ? indices.getX(index + 1) : index + 1],
      local[indices ? indices.getX(index + 2) : index + 2],
    );
    if (box) {
      if (box.intersectsTriangle(triangle)) return true;
    } else {
      triangle.closestPointToPoint(origin, closest);
      if (closest.lengthSq() < 1 - 1e-8) return true;
    }
  }
  return false;
}

// 密集顶点只在选定帧检查；最低净空及横向/纵向极点再查询实际渲染三角面。
function assertPosedClear(f, entry, label) {
  const point = new THREE.Vector3(),
    surfaces = [],
    bounds = new THREE.Box3(),
    extreme = Array.from({ length: 5 }, () => null),
    axes = [
      [0, "x", -1],
      [1, "x", 1],
      [2, "z", -1],
      [3, "z", 1],
      [4, "y", -1],
    ];
  let minimum = Infinity,
    worst = null;
  entry.mesh.updateMatrixWorld(true);
  entry.mesh.traverse((mesh) => {
    if (!mesh.isMesh) return;
    // 场景距离裁剪隐藏根节点时，仍需检查领主的实际身体。
    for (let node = mesh; node && node !== entry.mesh; node = node.parent)
      if (!node.visible) return;
    if (mesh.isSkinnedMesh) mesh.skeleton.update();
    const count = mesh.geometry.attributes.position.count,
      worldVertices = [];
    for (let index = 0; index < count; index++) {
      mesh.getVertexPosition(index, point).applyMatrix4(mesh.matrixWorld);
      worldVertices.push(point.clone());
      bounds.expandByPoint(point);
      const gap = point.y - bermudaSeabedHeight(point.x, point.z);
      if (gap < minimum) {
        minimum = gap;
        worst = point.clone();
      }
      for (const [slot, axis, sign] of axes)
        if (!extreme[slot] || point[axis] * sign > extreme[slot][axis] * sign)
          extreme[slot] = point.clone();
    }
    surfaces.push({ mesh, worldVertices });
  });
  assert.ok(worst, `${label}: posed surface vertices required`);
  assert.ok(
    minimum >= 0,
    `${label}: posed surface clearance ${minimum.toFixed(6)}`,
  );
  const ray = new THREE.Raycaster(),
    origin = new THREE.Vector3(),
    down = new THREE.Vector3(0, -1, 0);
  for (const sample of [worst, ...extreme]) {
    ray.set(origin.set(sample.x, 100, sample.z), down);
    const hit = ray.intersectObject(f.floor)[0];
    assert.ok(hit, `${label}: rendered floor underneath body`);
    assert.ok(
      sample.y >= hit.point.y,
      `${label}: rendered triangle clearance ${(sample.y - hit.point.y).toFixed(6)}`,
    );
  }
  // 实际姿态的包围盒只粗筛，不当作碰撞结论；保留邻近盒/椭球的完整面检测。
  const nearby = queryStaticColliders(
    f.ocean.colliders,
    bounds.min,
    bounds.max,
  );
  for (const collider of nearby)
    for (const { mesh, worldVertices } of surfaces)
      assert.equal(
        trianglesAgainstSolid(mesh.geometry, worldVertices, collider),
        false,
        `${label}: posed surface intersects ${collider.id ?? collider.type}`,
      );
}

test("Posed surface oracle catches triangle-only crossings of rotated boxes and ellipsoids", () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex([0, 1, 2]);
  for (const [type, size] of [
    ["ellipsoid", new THREE.Vector3(2, 3, 4)],
    ["box", new THREE.Vector3(2, 3, 4)],
  ]) {
    const rotation = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        Math.PI / 3,
      ),
      center = new THREE.Vector3(10, -20, 30),
      collider = {
        type,
        x: center.x,
        y: center.y,
        z: center.z,
        rotation: {
          x: rotation.x,
          y: rotation.y,
          z: rotation.z,
          w: rotation.w,
        },
        ...(type === "box" ? { halfSize: size } : { axes: size }),
      },
      vertices = (z) =>
        [
          new THREE.Vector3(-2, 0, z),
          new THREE.Vector3(2, 0, z),
          new THREE.Vector3(0, 2, z),
        ].map((point) =>
          point.multiply(size).applyQuaternion(rotation).add(center),
        );
    // 三个顶点全在实体外，但中间三角面穿过实体，不能仅检查顶点。
    assert.equal(
      trianglesAgainstSolid(geometry, vertices(0), collider),
      true,
      type,
    );
    assert.equal(
      trianglesAgainstSolid(geometry, vertices(1.5), collider),
      false,
      type,
    );
  }
  geometry.dispose();
});

test("All four Bermuda lords start above the real seabed before any floor projection", (t) => {
  const f = fixture(t),
    entries = f.encounters.bosses.filter((entry) => entry.enabled);
  assert.equal(entries.length, 4);
  for (const entry of entries) {
    assert.ok(entry.mesh.position.equals(entry.home), entry.id);
    assertCenterClear(entry, `${entry.id} initial home`);
    const envelope = entry.radius + 22;
    assert.ok(
      entry.home.x - envelope >= WORLD.minX &&
        entry.home.x + envelope <= WORLD.maxX &&
        entry.home.z - envelope >= WORLD.minZ &&
        entry.home.z + envelope <= WORLD.maxZ,
      `${entry.id}: horizontal territory envelope inside playable world`,
    );
  }
  assertPosedClear(f, f.leviathan, "Leviathan initial home");
  const { depthMin, depthMax } = f.leviathan.state.species;
  assert.ok(-f.leviathan.home.y >= depthMin && -f.leviathan.home.y <= depthMax);
});

test("Leviathan completes a continuous patrol lap clear of Bermuda terrain and solids", (t) => {
  const f = fixture(t),
    entry = f.leviathan,
    previous = entry.mesh.position.clone(),
    startAngle = entry.patrolAngle,
    dt = 1 / 30;
  let distance = 0;
  assertCenterClear(entry, "Patrol spawn");
  assertPosedClear(f, entry, "Patrol spawn");
  for (let frame = 1; frame <= 60 / dt; frame++) {
    f.step(dt);
    const travel = entry.mesh.position.distanceTo(previous);
    assert.ok(
      travel <= 3.4 * dt + 1e-6,
      `Patrol frame ${frame}: jump ${travel}`,
    );
    distance += travel;
    previous.copy(entry.mesh.position);
    assert.equal(entry.state.phase, "dormant");
    assert.equal(entry.state.attackCount, 0);
    assertCenterClear(entry, `Patrol frame ${frame}`);
    assert.ok(entry.mesh.position.distanceTo(entry.home) < entry.radius * 0.5);
    if (frame % 300 === 0) assertPosedClear(f, entry, `Patrol frame ${frame}`);
  }
  assert.ok(
    entry.patrolAngle - startAngle > Math.PI * 2,
    "A full patrol lap ran",
  );
  assert.ok(
    distance > 120,
    `Continuous patrol distance ${distance.toFixed(3)}`,
  );
});

test("Legal-water hunts return to continued patrol without burial or teleport and reset cleanly", (t) => {
  const f = fixture(t),
    entry = f.leviathan,
    mesh = entry.mesh,
    dt = 1 / 30;
  // 四个斜向近场目标覆盖前后及左右返巢，避开既有转向算法的精确反向退化。
  // 这是空间/状态机夹具，不是自然战斗；只设玩家目标，不改领主位置或阶段。
  for (const direction of [
    [0.4, 0, 1],
    [1, 0, -0.5],
    [-1, 0, -0.5],
    [0.4, 0, -1],
  ]) {
    f.reset();
    const target = entry.home
      .clone()
      .addScaledVector(new THREE.Vector3(...direction).normalize(), 50);
    target.y = Math.max(
      target.y,
      bermudaSeabedHeight(target.x, target.z) + bodyRadius(f.player.length) + 2,
    );
    assert.ok(
      target.distanceTo(entry.home) < entry.radius,
      "Legal target in territory",
    );
    assert.equal(
      isPositionBlocked(target, {
        radius: bodyRadius(f.player.length),
        length: f.player.length,
        forward: new THREE.Vector3(0, 0, -1),
        colliders: f.ocean.colliders,
      }),
      false,
      "Legal target outside solids",
    );
    f.position.copy(target);
    const beforeHunt = entry.mesh.position.clone(),
      previous = beforeHunt.clone();
    for (let frame = 1; frame <= 18; frame++) {
      f.step(dt);
      assert.equal(entry.state.phase, "hunt");
      assert.ok(
        entry.mesh.position.distanceTo(previous) <=
          entry.state.species.speed * dt + 1e-6,
      );
      previous.copy(entry.mesh.position);
      assertCenterClear(entry, `Hunt ${direction} frame ${frame}`);
    }
    assert.ok(
      entry.mesh.position.distanceTo(beforeHunt) > 12,
      "Actual hunt displacement",
    );
    assertPosedClear(f, entry, `Hunt ${direction}`);
    f.position.fromArray(f.region.spawn);
    let returned = false,
      resumedDistance = 0;
    for (let frame = 1; frame <= 240; frame++) {
      f.step(dt);
      const travel = entry.mesh.position.distanceTo(previous);
      assert.ok(
        travel <= 22 * dt + 1e-6,
        `Return ${direction} frame ${frame}: jump ${travel}`,
      );
      previous.copy(entry.mesh.position);
      returned ||= entry.state.phase === "return";
      if (entry.state.phase === "dormant") resumedDistance += travel;
      assertCenterClear(entry, `Return ${direction} frame ${frame}`);
      if ([1, 30, 60, 120, 240].includes(frame))
        assertPosedClear(f, entry, `Return ${direction} frame ${frame}`);
    }
    assert.ok(returned, "Real state machine entered return");
    assert.equal(entry.state.phase, "dormant");
    assert.equal(entry.state.attackCount, 0);
    assert.ok(resumedDistance > 8, "Patrol resumes after return");
    assert.ok(entry.mesh.position.distanceTo(entry.home) < entry.radius * 0.5);
    f.reset();
    assert.strictEqual(entry.mesh, mesh);
    assert.ok(entry.mesh.position.equals(entry.home));
    assert.equal(entry.state.phase, "dormant");
    assert.equal(entry.state.attackCount, 0);
    assert.equal(entry.patrolAngle, entry.patrolStart);
    assertCenterClear(entry, "Reset home");
  }
});
