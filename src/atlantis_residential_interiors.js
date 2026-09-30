import * as THREE from "three";
import { createAtlantisFurnitureBatch } from "./atlantis_exploration_furniture.js";
import {
  bodyRadius,
  castSegment,
  isPositionBlocked,
  resolveMotion,
} from "./collision.js";
import { createStaticColliderGrid } from "./static_collider_grid.js";
import {
  planAtlantisResidentialInteriors,
  RESIDENTIAL_FURNITURE_FOOTPRINTS,
  residentialFootprintSamples,
  residentialPlacementCandidates,
  residentialWorldPoint,
} from "./atlantis_residential_layout.js";

/**
 * 在普通住宅的真实楼板上布置共享雕刻家具，每街区按材质批处理。
 * @param {THREE.Object3D} parent 城市父节点。
 * @param {object} options records 建筑记录、heightAt 海床、hostColliders 完整宿主碰撞和 seed 布局种子。
 * @returns {object} root、colliders、landmarks、lightSources、stats、update 和幂等 dispose。
 */
export function createAtlantisResidentialInteriors(
  parent,
  { records = [], heightAt, hostColliders = [], seed = 5173 } = {},
) {
  if (!parent?.add || typeof heightAt !== "function" || !Array.isArray(records))
    throw new Error(
      "Residential interiors require a parent, records and height function",
    );
  const plans = planAtlantisResidentialInteriors(records, seed);
  const hostGrid = createStaticColliderGrid([...hostColliders]);
  const root = new THREE.Group();
  root.name = "atlantis_residential_interiors";
  parent.add(root);
  const colliders = [],
    landmarks = [],
    lightSources = [],
    districts = new Map(),
    dropped = [],
    excludedHomes = [];
  for (const home of plans) {
    const access = selectJuvenileAccess(home, hostGrid, heightAt);
    if (!access) {
      excludedHomes.push({
        id: home.id,
        record: home.record,
        reason: "blocked_existing_entrance",
      });
      continue;
    }
    home.access = access;
    if (!districts.has(home.district))
      districts.set(home.district, { homes: [], groups: [] });
    const district = districts.get(home.district);
    district.homes.push(home);
    const chosenHomeGroups = new Map();
    for (const original of home.groups) {
      const candidates = residentialPlacementCandidates(home, original);
      const item = candidates.find(
        (candidate) =>
          !overlapsOtherSlot(
            candidate,
            home.groups.map((other) => chosenHomeGroups.get(other.id) ?? other),
          ) && !supportFailure(candidate, heightAt, hostGrid),
      );
      if (!item)
        dropped.push({
          id: original.id,
          homeId: home.id,
          kind: original.kind,
          reason: supportFailure(original, heightAt, hostGrid),
        });
      else {
        chosenHomeGroups.set(item.id, item);
        district.groups.push(item);
      }
    }
  }
  const batches = [];
  const placedGroups = [];
  const placed = { bench: 0, table: 0, chest: 0, amphora: 0 };
  let triangles = 0,
    meshes = 0;
  for (const [id, district] of districts) {
    if (!district.groups.length) continue;
    const batch = createAtlantisFurnitureBatch(root, {
      heightAt,
      hostColliders,
      groups: district.groups,
      seed,
    });
    batch.root.name = `atlantis_residential_${id}`;
    const bounds = districtBounds(district.homes);
    batches.push({ id, batch, bounds });
    for (const collider of batch.colliders)
      collider.kind = "residential_furniture";
    colliders.push(...batch.colliders);
    dropped.push(...batch.stats.dropped);
    placedGroups.push(...batch.stats.placedGroups);
    for (const kind of Object.keys(placed))
      placed[kind] += batch.stats.placed[kind];
    triangles += batch.stats.triangles;
    meshes += batch.root.children.filter((child) => child.isMesh).length;
  }
  const placedIds = new Set(placedGroups.map((item) => item.id));
  const activePlans = [...districts.values()].flatMap(({ homes }) => homes);
  const chosenGroups = new Map(
    [...districts.values()]
      .flatMap(({ groups }) => groups)
      .map((item) => [item.id, item]),
  );
  const layouts = activePlans.map((home) => {
    const groups = home.groups
      .filter((item) => placedIds.has(item.id))
      .map((item) => chosenGroups.get(item.id));
    if (groups.length)
      landmarks.push({
        id: home.id,
        position: new THREE.Vector3(
          home.access.turningCenter.x,
          home.floorY + 1.8,
          home.access.turningCenter.z,
        ),
      });
    return { ...home, groups };
  });
  const stats = {
    plannedHomes: plans.length,
    eligibleHomes: activePlans.length,
    excludedHomes,
    furnishedHomes: layouts.filter((home) => home.groups.length > 0).length,
    fullyFurnishedHomes: layouts.filter((home) =>
      ["bench", "chest"].every((kind) =>
        home.groups.some((item) => item.kind === kind),
      ),
    ).length,
    plannedGroups: plans.reduce((sum, home) => sum + home.groups.length, 0),
    placed,
    placedGroups,
    dropped,
    triangles,
    meshes,
    colliders: colliders.length,
    districts: batches.map(({ id, batch, bounds }) => ({
      id,
      bounds,
      triangles: batch.stats.triangles,
      groups: batch.stats.placedGroups.length,
    })),
    layouts,
  };
  root.userData.residentialStats = stats;
  let disposed = false;
  return {
    root,
    colliders,
    landmarks,
    lightSources,
    stats,
    update(time, dt, position, highQuality = true) {
      if (disposed) return;
      for (const { batch, bounds } of batches) {
        batch.update(time, dt, position, highQuality);
        batch.root.visible =
          !position ||
          distanceToBounds(position, bounds) < (highQuality ? 235 : 190);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { batch } of batches) batch.dispose();
      parent.remove(root);
      root.clear();
      colliders.length = landmarks.length = lightSources.length = 0;
    },
  };
}

// 完整占地同时检查海床与实际楼板；中心点正确不能证明边缘没有浮空或埋入坡面。
function supportFailure(item, heightAt, grid) {
  for (const point of residentialFootprintSamples(item)) {
    const terrain = heightAt(point.x, point.z);
    if (!Number.isFinite(terrain) || terrain > item.floor + 0.025)
      return "terrain_intersection";
    const start = { ...point, y: item.floor + 0.04 };
    const end = { ...point, y: item.floor - 0.08 };
    const hosts = grid.query(start, end);
    const support = castSegment(start, end, hosts);
    if (!support || Math.abs(support.point.y - item.floor) > 0.025)
      return "missing_floor_support";
  }
  return null;
}

// 既有大型地基可能把普通住宅包住；只给真实可进出的住宅设置内部地标。
function hasJuvenileAccess(home, grid, heightAt) {
  const query = (start, end, options) => grid.query(start, end, options);
  const options = {
    colliders: query,
    radius: bodyRadius(3),
    length: 3,
    floorHeight: (x, z) => heightAt(x, z) + bodyRadius(3) + 0.1,
  };
  for (const reverse of [false, true]) {
    const points = reverse
      ? [...home.access.route].reverse()
      : home.access.route;
    for (let i = 1; i < points.length; i += 1) {
      const forward = new THREE.Vector3()
        .subVectors(points[i], points[i - 1])
        .normalize();
      const result = resolveMotion(points[i - 1], points[i], {
        ...options,
        forward,
      });
      if (
        result.blocked ||
        result.stuck ||
        new THREE.Vector3().copy(result.position).distanceTo(points[i]) > 0.025
      )
        return false;
    }
  }
  for (let i = 0; i < 16; i += 1) {
    const angle = (i * Math.PI) / 8;
    if (
      isPositionBlocked(home.access.turningCenter, {
        ...options,
        forward: { x: Math.sin(angle), y: 0, z: Math.cos(angle) },
      })
    )
      return false;
  }
  return true;
}

function selectJuvenileAccess(home, grid, heightAt) {
  const candidates = [home.access];
  const swimLocal = home.floorLocal + 3.2 / home.record.scale;
  for (const side of [-1, 1]) {
    const local = [
      [0, 14.7],
      [0, 4.5],
      [side * 3, 0],
      [side * 3, -5.6],
    ];
    candidates.push({
      maxTestedLength: 3,
      route: local.map(([x, z]) =>
        residentialWorldPoint(home.record, x, swimLocal, z),
      ),
      turningCenter: residentialWorldPoint(home.record, side * 3, swimLocal, 0),
    });
  }
  return (
    candidates.find((access) =>
      hasJuvenileAccess({ ...home, access }, grid, heightAt),
    ) ?? null
  );
}

function districtBounds(homes) {
  return {
    minX: Math.min(...homes.map(({ record }) => record.x - record.width / 2)),
    maxX: Math.max(...homes.map(({ record }) => record.x + record.width / 2)),
    minZ: Math.min(...homes.map(({ record }) => record.z - record.depth / 2)),
    maxZ: Math.max(...homes.map(({ record }) => record.z + record.depth / 2)),
  };
}

function distanceToBounds(position, bounds) {
  return Math.hypot(
    Math.max(bounds.minX - position.x, 0, position.x - bounds.maxX),
    Math.max(bounds.minZ - position.z, 0, position.z - bounds.maxZ),
  );
}

function overlapsOtherSlot(item, groups) {
  const a = RESIDENTIAL_FURNITURE_FOOTPRINTS[item.kind];
  return groups.some((other) => {
    if (other.id === item.id) return false;
    const b = RESIDENTIAL_FURNITURE_FOOTPRINTS[other.kind];
    return (
      item.localX + a.maxX > other.localX + b.minX &&
      item.localX + a.minX < other.localX + b.maxX &&
      item.localZ + a.maxZ > other.localZ + b.minZ &&
      item.localZ + a.minZ < other.localZ + b.maxZ
    );
  });
}
