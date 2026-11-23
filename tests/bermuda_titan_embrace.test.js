import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createBermudaSleepingTitan } from "../src/bermuda_sleeping_titan.js";
import { createBermudaTitanRelic } from "../src/bermuda_titan_relic.js";
import { createBermudaTerrainMesh } from "../src/bermuda_terrain_mesh.js";
import { createTerrainSurface } from "../src/terrain_surface.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import { createCreature } from "../src/creatures.js";
import { bodyRadius, isPositionBlocked } from "../src/collision.js";
import {
  queryStaticColliders,
  resolveIndexedMotion,
} from "../src/static_collider_grid.js";
import { bodyTerrainFloor } from "../src/terrain_contact.js";

import { BERMUDA_TITAN_DOCKS } from "./fixtures/bermuda_titan_docks.js";
import { preyCaptureOffsets } from "../src/prey_capture.js";
import {
  actualWorldGeometry,
  crystalSkinIntersections,
} from "./helpers/titan_crystal_geometry.js";
import {
  actualSkinIndex,
  actualAvatarSkinContacts,
} from "./helpers/titan_surface_geometry.js";

export const EMBRACE_DOCKS = BERMUDA_TITAN_DOCKS;
let actor, surface, terrainMesh, openSkin;
function scene() {
  if (!actor) {
    const terrain = new T.Group();
    terrainMesh = new T.Mesh(createBermudaTerrainMesh());
    terrainMesh.userData.terrainContact = true;
    terrain.add(terrainMesh);
    surface = createTerrainSurface(terrain, { fallback: bermudaSeabedHeight });
    actor = createBermudaSleepingTitan(new T.Group(), { heightAt: surface });
  }
  return actor;
}
after(() => {
  actor?.dispose();
  surface?.dispose();
  terrainMesh?.geometry.dispose();
  terrainMesh?.material.dispose();
  openSkin = null;
});
function bodyContacts(a, p, L) {
  const dims = { radius: bodyRadius(L), padding: L * 0.52 };
  return [
    ...queryStaticColliders(a.colliders, p, p, dims),
    ...a.dynamicContacts(p, p, dims),
  ];
}
function transform(local, a) {
  return new T.Vector3(...local).applyMatrix4(a.pose.matrixWorld);
}
// 生长上限为30米；保留32米夹具供独立几何压力检查，不把它当作游戏内可用体长。
for (const fixture of EMBRACE_DOCKS.filter(({ length }) => length <= 30))
  test(`${fixture.kind} ${fixture.length}m uses the whole-source guarded pickup and reversible actor-only approach corridor`, () => {
    const a = scene(),
      L = fixture.length,
      p = transform(fixture.localPosition, a),
      wait = transform(fixture.localWait, a),
      F = new T.Vector3(...fixture.localForward).transformDirection(
        a.pose.matrixWorld,
      ),
      radius = bodyRadius(L),
      dims = { radius, length: L, forward: F };
    const floor = (x, z, direction = F) =>
      bodyTerrainFloor(x, z, {
        heightAt: a.floorSurface,
        radius,
        length: (L * 0.52) / 0.42,
        forward: direction,
        margin: 0.4 + (fixture.kind === "zombie_shark" ? L * 0.008 : 0),
      });
    assert.ok(
      p.y >= floor(p.x, p.z),
      "actual visible terrain supports the whole body",
    );
    a.setPose({ guardAmount: 1 });
    assert.equal(
      isPositionBlocked(wait, { ...dims, colliders: bodyContacts(a, wait, L) }),
      false,
      "closed forearms leave an outside wait",
    );
    assert.equal(
      isPositionBlocked(
        transform([-0.1817857142857146, -0.10773646896253979, -0.32], a),
        {
          ...dims,
          colliders: bodyContacts(
            a,
            transform([-0.1817857142857146, -0.10773646896253979, -0.32], a),
            L,
          ),
        },
      ),
      true,
      "Closed real paw physically blocks the pocket core; an early eight-metre intake witness need not place the root inside that core",
    );
    a.setPose({ guardAmount: 0 });
    const move = (from, to, direction = F) =>
      resolveIndexedMotion(from, to, {
        ...dims,
        forward: direction,
        staticColliders: a.colliders,
        dynamicColliders: (start, end, dimensions) =>
          a.dynamicContacts(start, end, dimensions),
        floorHeight: (x, z) => floor(x, z, direction),
      });
    const inbound = move(wait, p);
    assert.equal(inbound.blocked, false);
    assert.ok(new T.Vector3().copy(inbound.position).distanceTo(p) < 1e-5);
    const avatar = createCreature(fixture.kind, 6);
    avatar.scale.setScalar(L);
    avatar.position.copy(p);
    avatar.rotation.set(Math.asin(F.y), Math.atan2(-F.x, -F.z), 0, "YXZ");
    avatar.userData.animate?.(0, 0.9, { dt: 0 });
    avatar.updateMatrixWorld(true);
    avatar.traverse((n) => n.skeleton?.update());
    openSkin ??= actualSkinIndex(a.near);
    const visibleFloor = (x, z) =>
        Math.max(
          a.floorSurface(x, z),
          ...a.beds.map((bed) => bed.topAt(x, z) ?? -Infinity),
        ),
      checkVisible = (label) => {
        const result = actualAvatarSkinContacts(avatar, openSkin, visibleFloor);
        assert.equal(
          result.crossings,
          0,
          `${label}: ${JSON.stringify(result.hits)}`,
        );
        assert.ok(
          result.floorMargin >= -1e-5,
          `${label}: actual visible skin crosses the world floor by ${-result.floorMargin}m`,
        );
      };
    checkVisible("Actual character dock");
    let intake;
    if (fixture.kind === "squid") {
      const anchors = preyCaptureOffsets("squid").map((offset) =>
        new T.Vector3(0, 0, L * offset)
          .applyQuaternion(avatar.quaternion)
          .add(p),
      );
      intake = anchors.sort(
        (a, b) =>
          a.distanceToSquared(scene().relicPoint) -
          b.distanceToSquared(scene().relicPoint),
      )[0];
    } else intake = avatar.userData.getFeedingMouth(new T.Vector3());
    assert.ok(
      intake.distanceTo(a.relicPoint) <= 8,
      "unchanged fixed pickup distance uses the real source intake",
    );
    const crystal = createBermudaTitanRelic();
    crystal.root.position.copy(a.relicPoint);
    crystal.root.quaternion.copy(a.relicQuaternion);
    const surfacePoints = crystal.getPickupSurfacePoints(intake);
    assert.equal(
      a.canAccessRelic({
        position: p,
        intakePoint: intake,
        relicPoint: a.relicPoint,
        surfacePoints,
        playerLength: L,
        forward: F,
        guardOpen: true,
        guardAmount: 0,
      }),
      true,
      "actual posed HF skin LOS and body, no access mock",
    );
    // 当前整身夹具只记录真实入路；此处逆向回放同一可用水廊，不能冒称旧bust的转弯路径或原生逃生验收。
    let previous = p.clone();
    for (let i = 1; i <= 24; i++) {
      const desired = p.clone().lerp(wait, i / 24),
        step = move(previous, desired);
      assert.equal(step.stuck, false, `Actor-only withdrawal step ${i}`);
      const resolved = new T.Vector3().copy(step.position);
      assert.ok(
        resolved.distanceTo(desired) < 1e-5,
        "The same open corridor stays reversible for the complete collision body",
      );
      assert.equal(
        isPositionBlocked(resolved, {
          ...dims,
          colliders: bodyContacts(a, resolved, L),
        }),
        false,
      );
      avatar.position.copy(resolved);
      avatar.updateMatrixWorld(true);
      if (i % 6 === 0) checkVisible(`Actual withdrawal skin sample ${i}`);
      previous = resolved;
    }
    a.setPose({ guardAmount: 1 });
    assert.equal(
      isPositionBlocked(wait, { ...dims, colliders: bodyContacts(a, wait, L) }),
      false,
      "The whole body waits outside the settling real paw",
    );
    crystal.root.position.copy(a.relicPoint);
    crystal.root.quaternion.copy(a.relicQuaternion);
    assert.equal(
      a.canAccessRelic({
        position: p,
        intakePoint: intake,
        relicPoint: a.relicPoint,
        surfacePoints: crystal.getPickupSurfacePoints(intake),
        playerLength: L,
        forward: F,
        guardOpen: true,
        guardAmount: 1,
      }),
      false,
      "A contradictory guardOpen flag cannot bypass the actual closed hands",
    );
    crystal.dispose();
    avatar.userData.dispose?.();
  });

test("The complete actual amber crystal remains outside both real palms throughout their motion and head extremes", () => {
  const a = scene(),
    gem = createBermudaTitanRelic(),
    mesh = gem.root.children.find((m) => m.isMesh),
    poses = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1].map(
      (guardAmount) => ({ guardAmount, awareness: 0, yaw: 0, pitch: 0 }),
    );
  for (const guardAmount of [0, 0.5, 1])
    for (const yaw of [-0.035, 0.035])
      poses.push({ guardAmount, awareness: 1, yaw, pitch: -0.035 });
  try {
    for (const pose of poses) {
      a.setPose(pose);
      a.setBreathLean(pose.yaw, pose.pitch);
      gem.root.position.copy(a.relicPoint);
      gem.root.quaternion.copy(a.relicQuaternion);
      gem.root.updateMatrixWorld(true);
      const skin = actualWorldGeometry(a.front.near),
        crystal = actualWorldGeometry(mesh);
      try {
        // 与已验原始oracle保持同一120米模型单位；只变换共同坐标，不改实际几何或穿插标准。
        skin.scale(1 / 120, 1 / 120, 1 / 120);
        crystal.scale(1 / 120, 1 / 120, 1 / 120);
        const proof = crystalSkinIntersections(skin, crystal);
        assert.equal(
          proof.forwardEdgeCrossings,
          0,
          `Crystal edges through actual HF skin: ${JSON.stringify(pose)}`,
        );
        assert.equal(
          proof.reverseEdgeCrossings,
          0,
          `Actual HF edges through crystal faces: ${JSON.stringify(pose)}`,
        );
        assert.equal(
          proof.actorVerticesInside,
          0,
          `Real skin inside convex crystals: ${JSON.stringify(pose)}`,
        );
        assert.deepEqual(
          proof.parity,
          [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
          ],
          `Whole crystals cannot be buried in material: ${JSON.stringify(pose)}`,
        );
      } finally {
        skin.dispose();
        crystal.dispose();
      }
    }
  } finally {
    gem.dispose();
    a.reset();
  }
});

test("Supported whole-source waiting witnesses stay clear as the true paw closes; oversized bust rows are not production routes", () => {
  const a = scene();
  assert.equal(EMBRACE_DOCKS.length, 8);
  assert.deepEqual(
    [...new Set(EMBRACE_DOCKS.map((row) => row.length))].sort((a, b) => a - b),
    [25, 30],
  );
  for (const fixture of EMBRACE_DOCKS) {
    const p = transform(fixture.localWait, a),
      F = new T.Vector3(...fixture.localForward).transformDirection(
        a.pose.matrixWorld,
      ),
      L = fixture.length;
    for (const guardAmount of [0, 0.25, 0.5, 0.75, 1]) {
      a.setPose({ guardAmount, awareness: 1 });
      assert.equal(
        isPositionBlocked(p, {
          radius: bodyRadius(L),
          length: L,
          forward: F,
          colliders: bodyContacts(a, p, L),
        }),
        false,
        `${fixture.kind}/${L}: waiting body stays clear at guard ${guardAmount}`,
      );
    }
  }
});
