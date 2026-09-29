/**
 * 无渲染依赖的海洋生物巡游导航。
 * 提前观察边界与海床，输出连续回转的单位方向，位置约束仍由游戏循环负责。
 */

import { WORLD } from "./world_config.js";
import { resolveMotion } from "./collision.js";
import {
  createStaticColliderGrid,
  needsVerticalProjection,
} from "./static_collider_grid.js";

/**
 * 为巡游方向加入边界与栖息地转向，避免逐帧翻转朝向造成原地抖动。
 * @param {{x:number,y:number,z:number}} position 生物的当前世界坐标。
 * @param {{x:number,y:number,z:number}} direction 当前航向，不要求已归一化；调用者应保存返回航向。
 * @param {{length:number,speed:number,depthMin:number,depthMax:number}} species 生物参数。
 * @param {(x:number,z:number)=>number} seabedHeight 返回指定水平坐标的海床高度。
 * @returns {{x:number,y:number,z:number}} 新的单位方向，不修改任何输入。
 */
export function steerWithinHabitat(position, direction, species, seabedHeight) {
  const desired = normalize(direction, { x: 0, y: 0, z: -1 });
  const lookAhead = clamp(species.speed * 2.5 + species.length * 0.5, 25, 70);
  const predictedX = position.x + desired.x * lookAhead;
  const predictedZ = position.z + desired.z * lookAhead;
  let avoidanceX = 0;
  let avoidanceZ = 0;
  let urgency = 0;

  // 根据与边界的距离连续增加转向量，不重写巡游朝向或累加固定角度。
  function avoid(x, z, strength) {
    const weight = clamp(strength, 0, 1);
    avoidanceX += x * weight;
    avoidanceZ += z * weight;
    urgency = Math.max(urgency, weight);
  }

  if (position.x > WORLD.maxX - lookAhead) {
    avoid(-1, 0, 1 - (WORLD.maxX - position.x) / lookAhead);
  }
  if (position.x < WORLD.minX + lookAhead) {
    avoid(1, 0, 1 - (position.x - WORLD.minX) / lookAhead);
  }
  if (position.z > WORLD.maxZ - lookAhead) {
    avoid(0, -1, 1 - (WORLD.maxZ - position.z) / lookAhead);
  }
  if (position.z < WORLD.minZ + lookAhead) {
    avoid(0, 1, 1 - (position.z - WORLD.minZ) / lookAhead);
  }

  const margin = species.length * 0.28 + 2;
  const requiredDepth = species.depthMin + margin;
  const predictedSeabed = seabedHeight(predictedX, predictedZ);
  const currentSeabed = seabedHeight(position.x, position.z);
  if (predictedSeabed > -requiredDepth || currentSeabed > -requiredDepth) {
    // 海床梯度的反方向通往更深水域，可同时适应斜坡与横向海沟壁。
    const sample = 8;
    let deeperX =
      seabedHeight(position.x - sample, position.z) -
      seabedHeight(position.x + sample, position.z);
    let deeperZ =
      seabedHeight(position.x, position.z - sample) -
      seabedHeight(position.x, position.z + sample);
    const gradientLength = Math.hypot(deeperX, deeperZ);
    if (gradientLength > 0.001) {
      deeperX /= gradientLength;
      deeperZ /= gradientLength;
    } else {
      // 平坦且过浅的区域没有局部坡向，优先退往地图深海一侧。
      deeperX = 0;
      deeperZ = -1;
    }
    avoid(
      deeperX,
      deeperZ,
      (predictedSeabed + requiredDepth) / Math.max(10, lookAhead * 0.5),
    );
    if (currentSeabed > -requiredDepth) avoid(deeperX, deeperZ, 1);
  }

  let x = desired.x;
  let z = desired.z;
  const horizontalLength = Math.hypot(desired.x, desired.z);
  if (urgency > 0 && Math.hypot(avoidanceX, avoidanceZ) > 0.001) {
    const heading = Math.atan2(desired.z, desired.x);
    const safeHeading = Math.atan2(avoidanceZ, avoidanceX);
    const difference = wrapAngle(safeHeading - heading);
    const mix = urgency * urgency * (3 - 2 * urgency);
    const turned = heading + difference * mix;
    // 使用角度插值保持前进速度，避免相反方向相加得到零向量。
    const magnitude = Math.max(horizontalLength, 0.65);
    x = Math.cos(turned) * magnitude;
    z = Math.sin(turned) * magnitude;
  }

  const minimumY = Math.max(-species.depthMax, currentSeabed + margin);
  const maximumY = -species.depthMin;
  // 在可容纳自身的水域内提前减少向上/向下速度，保持正常栖息深度。
  const y =
    minimumY <= maximumY
      ? clamp(
          desired.y,
          (minimumY - position.y) / lookAhead,
          (maximumY - position.y) / lookAhead,
        )
      : 0;
  return normalize({ x, y, z }, { x: 0, y: 0, z: -1 });
}

/**
 * 对城市中的普通生物执行连续实体碰撞，并保留沿墙离开的下一帧方向。
 * @param {object} previous 移动前位置；desired 为旧导航与水层约束后的目标位置。
 * @param {object} desired 希望到达的位置，不会原地修改。
 * @param {object} direction 本帧游动方向，亦用于鱼身多球朝向。
 * @param {object} habitat 当前个体或固定鱼群的length/depthMin/depthMax配置。
 * @param {object} options 静态colliders、heightAt海床函数和可选territory水平领地。
 * @returns {object|null} 碰撞结果及direction；远离全部城市实体时返回null，不改变原导航。
 */
export function resolveCreatureMotion(
  previous,
  desired,
  direction,
  habitat,
  { colliders, heightAt, territory = null },
) {
  const radius = Math.max(0.45, habitat.length * 0.18);
  if (!colliders?.length) return null;
  const extent = Math.max(0, habitat.length * 0.42 - radius);
  const bounds = {
    minX: territory?.minX ?? WORLD.minX + 8,
    maxX: territory?.maxX ?? WORLD.maxX - 8,
    minZ: territory?.minZ ?? WORLD.minZ + 8,
    maxZ: territory?.maxZ ?? WORLD.maxZ - 8,
    minY: -(habitat.depthMax || WORLD.maxDepth),
    maxY: -(habitat.depthMin || 5),
  };
  let cached = STRUCTURE_GRIDS.get(colliders);
  if (!cached || cached.count !== colliders.length) {
    cached = {
      count: colliders.length,
      grid: createStaticColliderGrid(colliders),
    };
    STRUCTURE_GRIDS.set(colliders, cached);
  }
  // 滑动可离开原线段的包围盒，但水平路程不会超过本次总位移；按该距离预留转折空间。
  const travel = Math.hypot(
    desired.x - previous.x,
    desired.y - previous.y,
    desired.z - previous.z,
  );
  // 越界初始位置会先被精确层投影回领地，不能沿未投影的位置缩小候选。
  const outside =
    previous.x < bounds.minX ||
    previous.x > bounds.maxX ||
    previous.z < bounds.minZ ||
    previous.z > bounds.maxZ ||
    desired.x < bounds.minX ||
    desired.x > bounds.maxX ||
    desired.z < bounds.minZ ||
    desired.z > bounds.maxZ;
  const floorHeight = (x, z) => heightAt(x, z) + habitat.length * 0.28 + 2;
  const candidates = outside
    ? colliders
    : cached.grid.query(previous, desired, {
        radius,
        padding: extent + travel + 0.1,
        vertical:
          !needsVerticalProjection(previous, { bounds, floorHeight }) &&
          !needsVerticalProjection(desired, { bounds, floorHeight }),
      });
  if (!candidates.length) return null;
  const heading = normalize(direction, { x: 0, y: 0, z: -1 });
  const maxY = bounds.maxY;
  const options = {
    colliders: (start, end, dimensions) =>
      cached.grid.query(start, end, dimensions),
    radius,
    forward: heading,
    length: habitat.length,
    floorHeight,
    bounds,
  };
  const result = resolveMotion(previous, desired, options);
  // 陡坡上无法同时满足海床与栖息水层，保留前一合法位置并向深水回转。
  if (floorHeight(result.position.x, result.position.z) > maxY) {
    result.position = { x: previous.x, y: previous.y, z: previous.z };
    result.blocked = true;
    return {
      ...result,
      direction: steerWithinHabitat(previous, heading, habitat, heightAt),
    };
  }
  let escape = { ...heading };
  for (const contact of result.contacts) {
    const normal = contact.normal;
    const inward = dot(escape, normal);
    if (inward >= 0) continue;
    escape = {
      x: escape.x - normal.x * inward,
      y: escape.y - normal.y * inward,
      z: escape.z - normal.z * inward,
    };
    if (Math.hypot(escape.x, escape.y, escape.z) < 0.15) {
      // 正面碰墙时确定性地选一侧，不用随机瞬移或每帧翻转朝向。
      escape =
        Math.abs(normal.y) < 0.8
          ? { x: -normal.z, y: 0, z: normal.x }
          : { x: heading.z, y: 0, z: -heading.x };
    }
    escape.x += normal.x * 0.25;
    escape.y += normal.y * 0.25;
    escape.z += normal.z * 0.25;
  }
  return {
    ...result,
    direction: normalize(escape, heading),
  };
}

/*********************************************
 * Private Helper Functions
 ********************************************/

// 城市实体不随帧移动；缓存仅持有弱引用，切换海域后不会留住旧世界。
const STRUCTURE_GRIDS = new WeakMap();

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function normalize(vector, fallback) {
  const magnitude = Math.hypot(vector.x, vector.y, vector.z);
  if (!Number.isFinite(magnitude) || magnitude < 0.00001)
    return { ...fallback };
  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
    z: vector.z / magnitude,
  };
}
