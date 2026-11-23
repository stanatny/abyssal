import * as THREE from "three";
import rearContacts from "./assets/models/bermuda_titan_rear_contacts.json" with { type: "json" };
import contactCache from "./assets/models/bermuda_titan_whole_contacts.json" with { type: "json" };
import {
  acquireBermudaTitanWholeAsset,
  TITAN_WHOLE_WRIST_PIVOT,
  TITAN_WHOLE_WRIST_PITCH,
} from "./bermuda_titan_whole_asset.js";
import { createBermudaTitanWhole } from "./bermuda_titan_whole.js";
import { createBermudaTitanPawRock } from "./bermuda_titan_paw_rock.js";
import { bodyRadius, bodyOffsets, isPositionBlocked } from "./collision.js";
import { queryStaticColliders } from "./static_collider_grid.js";

/** 原整身与一只真实前足共同守住固定石窝；没有拼接前体、额外脚或整体抬身。 */
export function createBermudaSleepingWholeTitan(parent, { heightAt }) {
  const root = new THREE.Group();
  root.name = "bermuda_colossal_sleeping_titan";
  parent.add(root);
  const width = 280,
    rotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      -Math.PI / 2,
    ),
    center = new THREE.Vector3(-290, 0, -1590),
    asset = acquireBermudaTitanWholeAsset(),
    point = new THREE.Vector3(),
    source = new THREE.Vector3(),
    pivot = new THREE.Vector3(...TITAN_WHOLE_WRIST_PIVOT),
    weights = asset.geometry.attributes.skinWeight,
    p = asset.geometry.attributes.position;
  let support = -Infinity;
  for (const guard of [1, 0.5, 0]) {
    const q = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      TITAN_WHOLE_WRIST_PITCH * (1 - guard),
    );
    for (const i of asset.usedVertexIds) {
      source.fromBufferAttribute(p, i);
      point.copy(source).multiplyScalar(weights.getX(i));
      point.addScaledVector(
        source.clone().sub(pivot).applyQuaternion(q).add(pivot),
        weights.getY(i),
      );
      point.multiplyScalar(width).applyQuaternion(rotation);
      support = Math.max(
        support,
        heightAt(center.x + point.x, center.z + point.z) - point.y,
      );
    }
  }
  center.y = support + 0.12;
  asset.release();
  const front = createBermudaTitanWhole(root, {
      width,
      position: center,
      rotation,
      contactCache,
    }),
    colliders = [],
    worldCache = new Map(),
    mouth = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    relicQuaternion = new THREE.Quaternion();
  function worldContact(c, id = c.id) {
    const point = new THREE.Vector3(c.x, c.y, c.z)
      .multiplyScalar(width)
      .applyQuaternion(rotation)
      .add(center);
    if (c.type === "sphere")
      return {
        ...c,
        id,
        x: point.x,
        y: point.y,
        z: point.z,
        radius: c.radius * width,
        titanBreathIgnore: true,
      };
    return {
      ...c,
      id,
      type: "box",
      x: point.x,
      y: point.y,
      z: point.z,
      halfSize: c.halfSize.clone().multiplyScalar(width),
      rotation: rotation.clone().multiply(c.rotation ?? new THREE.Quaternion()),
      titanBreathIgnore: true,
    };
  }
  for (const c of front.staticContacts) colliders.push(worldContact(c));
  // 原后段细实体缓存保持原字节；只是放在同一完整HF的真实刚性坐标中。
  for (const [i, c] of rearContacts.contacts.entries()) {
    const lo = Math.max(-0.15, c.center[2] - c.half[2]),
      hi = c.center[2] + c.half[2];
    if (hi <= lo) continue;
    colliders.push(
      worldContact(
        {
          x: c.center[0],
          y: c.center[1],
          z: (lo + hi) / 2,
          halfSize: new THREE.Vector3(c.half[0], c.half[1], (hi - lo) / 2),
        },
        `sleeping_titan_rear_${i}`,
      ),
    );
  }
  const setGuardPose = (state) => front.setGuard(state.guardAmount ?? 1),
    treasureRock = createBermudaTitanPawRock(root, {
      near: front.near,
      pose: front.root,
      setPose: setGuardPose,
      heightAt,
    });
  for (const c of treasureRock.contacts) colliders.push(c);
  const relicPoint = treasureRock.relicPoint,
    ray = new THREE.Raycaster(),
    inverse = new THREE.Matrix4(),
    localStart = new THREE.Vector3(),
    localEnd = new THREE.Vector3();
  const movingWorldBounds = front.dynamicBounds
    .clone()
    .applyMatrix4(front.root.matrixWorld);
  const localDock = new THREE.Vector3(
      -0.1956209412229782,
      -0.10773646896253979,
      -0.32,
    ),
    localWait = new THREE.Vector3(
      -0.22464285714285745,
      -0.10773646896253979,
      -0.32,
    ),
    localForward = new THREE.Vector3(1, 0, 0),
    collectionDock = localDock.clone().applyMatrix4(front.root.matrixWorld),
    waitPoint = localWait.clone().applyMatrix4(front.root.matrixWorld),
    approachPoint = waitPoint.clone(),
    approachForward = localForward
      .clone()
      .transformDirection(front.root.matrixWorld),
    turnPoint = null,
    retreatPoint = null,
    retreatForward = approachForward.clone();
  let disposed = false,
    guard = 1;
  function syncAnchors() {
    const pose = front.getMouthPose();
    mouth.copy(pose.position);
    direction.copy(pose.direction);
    front.root.getWorldQuaternion(relicQuaternion);
  }
  syncAnchors();
  function dynamicContacts(
    start,
    end = start,
    { radius = 0, padding = 0, segment = true } = {},
  ) {
    if (disposed) return [];
    const margin = padding + Math.sqrt(3) * radius + 1e-5;
    if (
      Math.max(start.x, end.x) + margin < movingWorldBounds.min.x ||
      Math.min(start.x, end.x) - margin > movingWorldBounds.max.x ||
      Math.max(start.z, end.z) + margin < movingWorldBounds.min.z ||
      Math.min(start.z, end.z) - margin > movingWorldBounds.max.z ||
      (Number.isFinite(start.y) &&
        Number.isFinite(end.y) &&
        (Math.max(start.y, end.y) + margin < movingWorldBounds.min.y ||
          Math.min(start.y, end.y) - margin > movingWorldBounds.max.y))
    )
      return [];
    inverse.copy(front.root.matrixWorld).invert();
    const useY = Number.isFinite(start.y) && Number.isFinite(end.y);
    if (!segment) {
      const box = new THREE.Box3();
      for (const x of [start.x, end.x])
        for (const y of useY ? [start.y, end.y] : [center.y])
          for (const z of [start.z, end.z])
            box.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(inverse));
      localStart.copy(box.min);
      localEnd.copy(box.max);
    } else {
      localStart
        .set(start.x, useY ? start.y : center.y, start.z)
        .applyMatrix4(inverse);
      localEnd.set(end.x, useY ? end.y : center.y, end.z).applyMatrix4(inverse);
    }
    if (!useY) {
      localStart.y = NaN;
      localEnd.y = NaN;
    }
    return front
      .queryDynamicContacts(localStart, localEnd, {
        radius: radius / width,
        padding: padding / width,
        segment,
      })
      .map((c) => {
        const old = worldCache.get(c.index);
        if (old?.source === c) return old.world;
        const world = worldContact(c);
        worldCache.set(c.index, { source: c, world });
        return world;
      });
  }
  function setPose(state = {}) {
    guard = state.guardAmount ?? 1;
    front.setGuard(guard);
    front.setAwareness(state.awareness ?? 0);
    front.setCharge(
      state.phase === "charging"
        ? 1 - state.remaining / (state.phaseDuration ?? 2.5)
        : 0,
    );
    syncAnchors();
    root.userData.sleeping = state.sleeping !== false;
  }
  const prepare = (options) => front.prepare(options);
  root.userData.prepareMaterials = prepare;
  root.userData.sleeping = true;
  root.userData.routeStatus =
    "Raised south approach and pickup guard verified on the exact model; shared solver and departure pending";
  return {
    root,
    front,
    near: front.near,
    far: front.far,
    pose: front.root,
    rearPose: null,
    rearNear: null,
    rearFar: null,
    bed: treasureRock.mesh,
    beds: [treasureRock],
    treasureRock,
    floorSurface: treasureRock.floorSurface,
    colliders,
    mouth,
    direction,
    relicPoint,
    relicQuaternion,
    approachPoint,
    waitPoint,
    approachForward,
    collectionDock,
    turnPoint,
    retreatPoint,
    retreatForward,
    dynamicContacts,
    setPose,
    model: {
      source: "original whole HF768a1452",
      width,
      oneContinuousBody: true,
      footBone: 1,
      maximumMotion: width * 0.06,
      contactCache: contactCache.header.counts,
      routeStatus: root.userData.routeStatus,
      routePending: true,
    },
    setBreathLean() {
      syncAnchors();
    },
    canAccessRelic({
      position,
      intakePoint,
      relicPoint: target,
      surfacePoints,
      playerLength,
      forward,
      guardOpen,
      guardAmount,
    }) {
      const actualGuard = Number.isFinite(guardAmount) ? guardAmount : guard;
      if (!guardOpen || actualGuard > 1e-6) return false;
      front.setGuard(actualGuard);
      syncAnchors();
      const radius = bodyRadius(playerLength),
        extent = Math.max(
          ...bodyOffsets({ radius, length: playerLength, forward }).map((p) =>
            Math.hypot(p.x, p.y, p.z),
          ),
        ),
        fixed = queryStaticColliders(colliders, position, position, {
          radius,
          padding: extent,
        }),
        moving = dynamicContacts(position, position, {
          radius,
          padding: extent,
        });
      if (
        isPositionBlocked(position, {
          radius,
          length: playerLength,
          forward,
          colliders: [...fixed, ...moving],
        })
      )
        return false;
      if (new THREE.Vector3().copy(target).distanceTo(intakePoint) > 8.00001)
        return false;
      for (const point of surfacePoints?.length ? surfacePoints : [target]) {
        const delta = new THREE.Vector3().copy(point).sub(intakePoint),
          distance = delta.length();
        if (distance > 8.00001) continue;
        ray.set(new THREE.Vector3().copy(intakePoint), delta.normalize());
        ray.near = 0.01;
        ray.far = Math.max(0.01, distance - 0.0001);
        if (!ray.intersectObject(front.near, false).length) return true;
      }
      return false;
    },
    lightSources: [
      {
        position: mouth.clone().add(new THREE.Vector3(4, 10, 12)),
        color: 0x9ccbd3,
        intensity: 150,
        distance: 110,
      },
      {
        position: center.clone().add(new THREE.Vector3(-30, 18, 0)),
        color: 0x668da5,
        intensity: 60,
        distance: 90,
      },
    ],
    prepare,
    update(elapsed, position, state, { highQuality = true } = {}) {
      if (disposed) return;
      setPose(state);
      const distance = position.distanceTo(center);
      root.visible = distance < 650;
      front.update(elapsed, { distant: distance > (highQuality ? 340 : 250) });
    },
    reset() {
      front.setBreathLean(0, 0);
      setPose();
      worldCache.clear();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      front.dispose();
      treasureRock.dispose();
      worldCache.clear();
      colliders.length = 0;
      root.clear();
      root.removeFromParent();
    },
  };
}
