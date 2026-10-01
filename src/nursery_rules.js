import { WORLD } from "./world_config.js";

/** 出生浅滩与外礁的生态边界；仅约束普通猎手，不限制玩家自由探索。 */
export const NURSERY = Object.freeze({
  minZ: -120,
  maxDepth: 72,
  predatorShoreLimit: -145,
  outerSeaLimit: -370,
});

const EDGE_TERRITORIES = Object.freeze({
  hammerhead: Object.freeze({
    minX: -105,
    maxX: 28,
    minZ: -275,
    maxZ: -145,
    center: Object.freeze({ x: -36, y: -42, z: -202 }),
  }),
  shark: Object.freeze({
    minX: -24,
    maxX: 110,
    minZ: -350,
    maxZ: -185,
    center: Object.freeze({ x: 44, y: -66, z: -286 }),
  }),
});
const TERRITORY_CACHE = new WeakMap();

/** 判断位置是否在核心安全浅滩；水深为世界坐标深度，而非界面显示米数。 */
export function isNursery(position) {
  return position.z >= NURSERY.minZ && -position.y <= NURSERY.maxDepth;
}

/**
 * 返回普通猎手的固定领地与巡游中心，非猎手返回null。
 * populationIndex是同一物种内的稳定序号；第0只可使用物种配置的外礁领地。
 * 未提供配置时保留夏威夷锤头鲨与白鲨的既有领地，显式null可关闭外礁挑战。
 * 范围已内缩半条鱼体长加1米，可直接约束模型中心，避免头尾跨回安全区。
 */
export function predatorTerritory(species, populationIndex = 0) {
  if (!species.predator) return null;
  const world = species.worldBounds || WORLD;
  const regionTerritory = species.hunterTerritory;
  const edge =
    populationIndex === 0
      ? species.edgeTerritory === undefined
        ? EDGE_TERRITORIES[species.kind]
        : species.edgeTerritory
      : null;
  let cached = TERRITORY_CACHE.get(species);
  if (!cached) {
    cached = new Map();
    TERRITORY_CACHE.set(species, cached);
  }
  const key = edge ? "edge" : "outer";
  if (cached.has(key)) return cached.get(key);
  const padding = species.length * 0.5 + 1;
  const depth = species.depthMin + (species.depthMax - species.depthMin) * 0.4;
  const floorDepth = depth + Math.max(30, species.length * 2.5);
  const depthZ =
    floorDepth <= 140
      ? (40 - floorDepth) * 2
      : -200 - (floorDepth - 140) / 0.72;
  const center = edge?.center ||
    regionTerritory?.center || {
      x: 0,
      y: -depth,
      z: Math.max(world.minZ + 90, Math.min(-425, depthZ)),
    };
  const territory = Object.freeze({
    minX: (edge?.minX ?? regionTerritory?.minX ?? world.minX + 8) + padding,
    maxX: (edge?.maxX ?? regionTerritory?.maxX ?? world.maxX - 8) - padding,
    minZ: (edge?.minZ ?? regionTerritory?.minZ ?? world.minZ + 8) + padding,
    maxZ:
      (edge?.maxZ ?? regionTerritory?.maxZ ?? NURSERY.outerSeaLimit) - padding,
    center: Object.freeze({ ...center }),
    edge: !!edge,
  });
  cached.set(key, territory);
  return territory;
}

/** 判断水平位置是否仍在该个体领地，用于生成、追击、技能与伤害的统一许可。 */
export function inPredatorTerritory(species, populationIndex, position) {
  const territory = predatorTerritory(species, populationIndex);
  return (
    !territory ||
    (position.x >= territory.minX &&
      position.x <= territory.maxX &&
      position.z >= territory.minZ &&
      position.z <= territory.maxZ)
  );
}

/**
 * 普通猎手只能在自己的海区追击和伤害；玩家回到浅滩立即结束许可。
 * 主循环应将此结果同时用于追击记忆、技能hunting和接触伤害，而非只限制新追击。
 */
export function canPredatorHunt(
  species,
  populationIndex,
  predatorPosition,
  playerPosition,
) {
  return (
    !!species.predator &&
    !isNursery(playerPosition) &&
    inPredatorTerritory(species, populationIndex, predatorPosition) &&
    inPredatorTerritory(species, populationIndex, playerPosition)
  );
}

/**
 * 原地校正猎手水平越界并移除朝外速度，返回是否发生校正；不改变水层或玩家位置。
 * 主循环应提前朝领地中心平滑转向，移动和避障完成后调用本函数作为最终保障。
 */
export function constrainPredatorTerritory(
  species,
  populationIndex,
  position,
  velocity = null,
) {
  const territory = predatorTerritory(species, populationIndex);
  if (!territory) return false;
  const x = Math.max(territory.minX, Math.min(territory.maxX, position.x));
  const z = Math.max(territory.minZ, Math.min(territory.maxZ, position.z));
  const corrected = x !== position.x || z !== position.z;
  if (velocity) {
    if ((position.x - x) * velocity.x > 0) velocity.x = 0;
    if ((position.z - z) * velocity.z > 0) velocity.z = 0;
  }
  position.x = x;
  position.z = z;
  return corrected;
}
