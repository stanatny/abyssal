import * as THREE from "three";
import { WORLD } from "./world_config.js";
import { isPositionBlocked } from "./collision.js";
import { queryStaticColliders } from "./static_collider_grid.js";
import {
  inPredatorTerritory,
  isNursery,
  predatorTerritory,
} from "./nursery_rules.js";

// 每种鱼的栖息点独立定义，增删图鉴或改变排序不会把既有鱼群移到地图两端。
const SCHOOL_HABITATS = {
  fish: [
    [0, -18, 57],
    [-18, -18, 23],
    [18, -18, -20],
    [-14, -17, 91],
    [32, -18, -83],
  ],
  anchovy: [[-11, -15, 5]],
  herring: [[24, -20, -48]],
  sardine: [
    [14, -17, 32],
    [-16, -21, -63],
  ],
  flying_fish: [
    [10, -5, -12],
    [-12, -5, -80],
  ],
  mackerel: [
    [-12, -22, -72],
    [14, -26, -128],
  ],
  turtle: [
    [14, -8, 18],
    [-16, -18, -94],
    [8, -14, -168],
  ],
  boxfish: [
    [-14, -12, 68],
    [19, -13, 35],
    [-9, -17, -12],
    [21, -20, -57],
  ],
  parrotfish: [
    [13, -17, 50],
    [-17, -20, -38],
    [-30, -22, 5],
  ],
  wrasse: [
    [17, -19, 5],
    [-13, -25, -66],
  ],
  sunfish: [
    [12, -27, -100],
    [-24, -35, -157],
    [-15, -42, -208],
    [16, -53, -290],
    [-12, -70, -340],
  ],
  tuna: [
    [-15, -32, -106],
    [16, -53, -216],
    [24, -70, -258],
    [-18, -83, -300],
    [14, -96, -398],
  ],
  ray: [
    [-14, -41, -188],
    [17, -61, -264],
    [-18, -82, -348],
    [-28, -92, -372],
    [14, -102, -398],
    [-12, -116, -470],
  ],
};

/** 返回指定鱼群的初始栖息中心；新增物种不依赖目录顺序。 */
export function initialSchoolAnchor(species, groupIndex = 0) {
  const profile = species.schoolProfiles?.[groupIndex];
  if (profile) return new THREE.Vector3(...profile.anchor);
  const points = species.schoolAnchors || SCHOOL_HABITATS[species.kind];
  if (points?.length)
    return new THREE.Vector3(...points[groupIndex % points.length]);
  return initialSpeciesAnchor(species, groupIndex);
}

/**
 * 按原始栖息中心固定中型鱼群的水层，迁移或逃逸不会将深层补给带回浅滩。
 * @param {object} species 原始生物配置，不会被修改。
 * @param {number} groupIndex 同种鱼群的稳定序号；不能根据迁移后位置重新计算。
 * @returns {object} 配置layeredSchools的鱼群及既有中型鱼群返回只读水层，其余返回原配置。
 */
export function schoolHabitat(species, groupIndex = 0) {
  const profile = species.schoolProfiles?.[groupIndex];
  if (profile) return Object.freeze({ ...species, ...profile });
  const layered =
    species.layeredSchools ?? ["sunfish", "tuna", "ray"].includes(species.kind);
  if (!layered) return species;
  const depth = -initialSchoolAnchor(species, groupIndex).y;
  return Object.freeze({
    ...species,
    depthMin: Math.max(species.depthMin, depth - 18),
    depthMax: Math.min(species.depthMax, depth + 18),
  });
}

/**
 * 返回稳定鱼群分段，允许同种鱼在浅滩和城市采用不同群体规模。
 * @param {object} species 物种配置；显式profile数量之和必须等于population。
 * @returns {{index:number,start:number,count:number}[]} 不重叠且覆盖全部个体的分段。
 */
export function schoolPopulationGroups(species) {
  const groups = [];
  let start = 0;
  while (start < species.population) {
    const count =
      species.schoolProfiles?.[groups.length]?.count ??
      Math.min(species.schoolSize || 1, species.population - start);
    if (
      !Number.isInteger(count) ||
      count < 1 ||
      start + count > species.population
    )
      throw new Error(`Invalid school population for ${species.kind}`);
    groups.push({ index: groups.length, start, count });
    start += count;
  }
  if (species.schoolProfiles && groups.length !== species.schoolProfiles.length)
    throw new Error(`Mismatched school profiles for ${species.kind}`);
  return groups;
}

/** 普通猎手按栖息水层沿海床坡度分散，避免所有种类初始随机落在遥远海域。 */
export function initialSpeciesAnchor(species, index = 0) {
  const territory = predatorTerritory(species, index);
  if (territory?.edge) return new THREE.Vector3().copy(territory.center);
  if (species.spawnAnchors?.length)
    return new THREE.Vector3(
      ...species.spawnAnchors[index % species.spawnAnchors.length],
    );
  const count = Math.max(1, species.population || 1);
  // 远古巨兽延伸至本物种水层下部，现代种类沿用原分布比例。
  const spread = species.category === "ancient" ? 0.8 : 0.68;
  const t = count === 1 ? 0.35 : 0.12 + (index / (count - 1)) * spread;
  const depth = species.depthMin + (species.depthMax - species.depthMin) * t;
  const floorDepth = depth + Math.max(30, species.length * 2.5);
  const z =
    floorDepth <= 140
      ? (40 - floorDepth) * 2
      : -200 - (floorDepth - 140) / 0.72;
  const point = new THREE.Vector3(
    (index % 2 ? 1 : -1) * (20 + (index % 3) * 12),
    -depth,
    z,
  );
  // 保留各自深度，仅把过于靠岸的猎手移到外海。
  if (territory) point.z = Math.min(point.z, territory.maxZ - 30 - index * 8);
  return point;
}

/**
 * 散居居民保留各自的活动范围；不改成同步鱼群，在活动区内保留近身逃逸。
 * @param {object} species 含residentRadius与独立spawnAnchors的区域物种。
 * @param {number} populationIndex 个体在同种居民中的稳定序号。
 * @param {object} position 当前世界位置。
 * @param {object} direction 当前巡游或逃逸方向。
 * @returns {object} 靠近活动区边缘时柔和回转；其他物种直接返回原方向。
 */
export function steerResidentHabitat(
  species,
  populationIndex,
  position,
  direction,
) {
  const radius = species.residentRadius;
  const anchors = species.spawnAnchors;
  if (!(radius > 0) || !anchors?.length) return direction;
  const anchor = anchors[populationIndex % anchors.length];
  const dx = anchor[0] - position.x;
  const dy = anchor[1] - position.y;
  const dz = anchor[2] - position.z;
  const distance = Math.hypot(dx, dy, dz);
  if (distance < radius * 0.6) return direction;
  const urgency = Math.min(1, (distance / radius - 0.6) / 0.4);
  const weight = (urgency * urgency * (3 - 2 * urgency) * 2.5) / distance;
  const x = direction.x + dx * weight;
  const y = direction.y + dy * weight;
  const z = direction.z + dz * weight;
  const magnitude = Math.hypot(x, y, z) || 1;
  return { x: x / magnitude, y: y / magnitude, z: z / magnitude };
}

/** 可见半径考虑中型动物与群体辨识，不再把海龟、蝠鲼与微小单鱼一律裁到85米。 */
export function speciesVisibilityDistance(species, highQuality = true) {
  return species.length < 1
    ? highQuality
      ? 115
      : 95
    : species.length < 7
      ? highQuality
        ? 150
        : 120
      : highQuality
        ? 190
        : 150;
}

/** 玩家进入对应水层才补充附近生态；不会把深海动物迁移到浅滩。 */
export function sharesHabitat(species, position, margin = 12) {
  const depth = -position.y;
  return (
    depth >= species.depthMin - margin && depth <= species.depthMax + margin
  );
}

/** 返回密集但不重叠的队形偏移，微小鱼也能组成容易发现的整体轮廓。 */
export function schoolSlot(species, index) {
  const spacing =
    species.length < 1
      ? Math.max(1, species.length * 1.3)
      : 2.5 + species.length * 0.4;
  return new THREE.Vector3(
    ((index % 4) - 1.5) * spacing,
    Math.sin(index * 2) *
      (species.length < 1 ? 0.35 : Math.min(1.5, spacing * 0.55)),
    (Math.floor(index / 4) - 1) * spacing,
  );
}

/**
 * 选择真实水层、海床和实体均允许的生成点；near候选必须远离玩家且不可在视野内突现。
 * @param {object} species 生物配置。
 * @param {object} options heightAt、colliders、anchor、playerPosition、populationIndex、near、random、isVisible。
 * @returns {THREE.Vector3|null} 合法位置；局部水域不可容纳时返回null，由调用方保留旧位置。
 */
export function habitatPosition(
  species,
  {
    heightAt,
    colliders = [],
    populationIndex = 0,
    anchor = initialSpeciesAnchor(species, populationIndex),
    playerPosition,
    forward = { x: 0, y: 0, z: -1 },
    near = false,
    random = Math.random,
    isVisible = () => false,
    highQuality = true,
    padding = 0,
  } = {},
) {
  const residentHome =
    species.residentRadius > 0
      ? initialSpeciesAnchor(species, populationIndex)
      : null;
  // 散居居民与固定鱼群一样在原栖息区复活，不能被普通猎手的远距补位逻辑搬走。
  if (near && residentHome) {
    near = false;
    anchor = residentHome;
  }
  if (near && (!playerPosition || !sharesHabitat(species, playerPosition)))
    return null;
  if (
    near &&
    species.predator &&
    (isNursery(playerPosition) ||
      !inPredatorTerritory(species, populationIndex, playerPosition))
  )
    return null;
  const world = species.worldBounds || WORLD;
  const point = new THREE.Vector3();
  const minimum = species.depthMin ?? 5,
    maximum = Math.min(
      species.depthMax ?? world.maxDepth - 30,
      world.maxDepth - 25,
    );
  // 城区出生保留整条鱼的转向空间，避免中心合法而头尾嵌进墙面。
  const radius =
    Math.max(0.45, species.length * (species.cityHabitat ? 0.55 : 0.18)) +
    padding;
  const floorMargin = Math.max(3 + species.length * 0.35, radius + 1.5);
  const visibleRadius = speciesVisibilityDistance(species, highQuality);
  const ahead = Math.atan2(forward.x, forward.z);
  for (let attempt = 0; attempt < 48; attempt++) {
    if (near) {
      // 优先在行进方向远处补生态，失败后允许侧后方；永不贴身生成。
      const angle =
        attempt < 32 ? ahead + (random() - 0.5) * 1.45 : random() * Math.PI * 2;
      const distance = visibleRadius + 22 + random() * 52;
      point.set(
        playerPosition.x + Math.sin(angle) * distance,
        playerPosition.y + (random() - 0.5) * 30,
        playerPosition.z + Math.cos(angle) * distance,
      );
    } else {
      point.copy(anchor);
      if (attempt) {
        const angle = attempt * 2.399;
        const spread =
          species.residentRadius > 0
            ? Math.min(species.residentRadius, 1 + attempt * 0.6)
            : 3 + attempt * 1.7;
        point.x += Math.cos(angle) * spread;
        point.z += Math.sin(angle) * spread;
      }
    }
    point.x = THREE.MathUtils.clamp(point.x, world.minX + 18, world.maxX - 18);
    point.z = THREE.MathUtils.clamp(point.z, world.minZ + 18, world.maxZ - 18);
    // 不把领地外候选强行钳到边缘，否则远距补位会沿一道线密集堆积。
    if (!inPredatorTerritory(species, populationIndex, point)) continue;
    const bottom = Math.max(-maximum, heightAt(point.x, point.z) + floorMargin);
    const top = -minimum;
    if (bottom > top) continue;
    point.y = THREE.MathUtils.clamp(point.y, bottom, top);
    // 新地图的海床或边界校正也不能把居民挤出独立活动区；无合法空间应明确失败。
    if (
      residentHome &&
      point.distanceTo(residentHome) > species.residentRadius + 1e-8
    )
      continue;
    if (
      near &&
      (point.distanceTo(playerPosition) < visibleRadius + 15 ||
        isVisible(point))
    )
      continue;
    const candidates =
      colliders.length >= 256
        ? queryStaticColliders(colliders, point, point, { radius })
        : colliders;
    if (isPositionBlocked(point, { radius, colliders: candidates })) continue;
    return point.clone();
  }
  return null;
}
