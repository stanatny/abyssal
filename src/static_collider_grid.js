/**
 * 静态建筑碰撞体的 XZ 网格与高度粗筛；仅缩小候选集合，精确接触仍由 collision.js 处理。
 * 索引创建后不得移动碰撞体，城市场景销毁时随其数组弱引用一起释放。
 */

import { castSegment, resolveMotion } from "./collision.js";

/**
 * 创建静态碰撞网格，旋转盒、椭球、胶囊和球均按世界坐标保守包围盒入格。
 * @param {object[]} colliders 不再修改位置、形状的碰撞体数组。
 * @param {object} options cellSize 为网格边长，maxCellsPerCollider 为单体入格上限。
 * @returns {object} query(start,end,{padding,radius}) 返回保持原始顺序的候选碰撞体。
 */
export function createStaticColliderGrid(
  colliders,
  { cellSize = 80, maxCellsPerCollider = 64 } = {},
) {
  if (!Number.isFinite(cellSize) || cellSize <= 0)
    throw new Error("Static collider grid requires a positive cell size");
  if (!Number.isInteger(maxCellsPerCollider) || maxCellsPerCollider < 1)
    throw new Error("Static collider grid requires a positive cell limit");
  const cells = new Map();
  const oversized = [];
  const entries = colliders.map((collider) => ({
    collider,
    bounds: colliderBounds(collider),
  }));
  const ellipsoids = colliders.filter((entry) => entry.type === "ellipsoid");
  const hasBoxes = colliders.some((entry) => entry.type === "box");
  const expansionCache = new Map();
  entries.forEach((entry, index) => {
    const range = cellRange(entry.bounds, cellSize);
    if (cellCount(range) > maxCellsPerCollider) {
      // 长城、地基等超大结构只存一次，不沿几百个格重复占用内存。
      oversized.push(index);
      return;
    }
    for (let x = range.minX; x <= range.maxX; x++) {
      for (let z = range.minZ; z <= range.maxZ; z++) {
        const key = `${x},${z}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(index);
      }
    }
  });

  /**
   * 查询一段路径周围的碰撞候选，边界采用闭区间，不会漏掉恰好落在格线上的接触。
   * @param {object} start 起点，至少包含有限数值 x、z。
   * @param {object} end 终点，省略时按单点查询。
   * @param {object} options padding 为鱼身及滑动余量，radius 为精确碰撞球半径。
   * @returns {object[]} 去重且按原碰撞数组顺序排列的候选列表。
   */
  function query(
    start,
    end = start,
    { padding = 0, radius = 0, vertical = true } = {},
  ) {
    if (
      ![start.x, start.z, end.x, end.z, padding, radius].every(
        Number.isFinite,
      ) ||
      padding < 0 ||
      radius < 0
    )
      throw new Error(
        "Static collider query requires finite nonnegative bounds",
      );
    const margin = padding + radiusExpansion(radius) + 1e-7;
    const useHeight =
      vertical && Number.isFinite(start.y) && Number.isFinite(end.y);
    const bounds = {
      minY: useHeight ? Math.min(start.y, end.y) - margin : -Infinity,
      maxY: useHeight ? Math.max(start.y, end.y) + margin : Infinity,
      minX: Math.min(start.x, end.x) - margin,
      maxX: Math.max(start.x, end.x) + margin,
      minZ: Math.min(start.z, end.z) - margin,
      maxZ: Math.max(start.z, end.z) + margin,
    };
    const range = cellRange(bounds, cellSize);
    const found = new Set();
    const include = (index) => {
      if (intersects(bounds, entries[index].bounds)) found.add(index);
    };
    // 超长扫掠直接遍历索引包围盒，避免空格数量随查询面积无界增长。
    if (cellCount(range) > Math.max(64, cells.size * 2)) {
      entries.forEach((_, index) => include(index));
    } else {
      oversized.forEach(include);
      for (let x = range.minX; x <= range.maxX; x++) {
        for (let z = range.minZ; z <= range.maxZ; z++) {
          for (const index of cells.get(`${x},${z}`) || []) include(index);
        }
      }
    }
    return [...found].sort((a, b) => a - b).map((index) => colliders[index]);
  }

  function radiusExpansion(radius) {
    if (!radius) return 0;
    if (expansionCache.has(radius)) return expansionCache.get(radius);
    // collision.js 在盒的局部三个轴上各加半径，旋转后最坏增长 sqrt(3)*radius。
    let expansion = radius * (hasBoxes ? Math.sqrt(3) : 1);
    for (const collider of ellipsoids) {
      // 精确层使用保守 Minkowski 外包椭球；其长轴增长可能远大于球半径。
      const axes = collider.axes;
      const beta = radius / Math.cbrt(axes.x * axes.y * axes.z);
      const extra = (1 + 1 / beta) * radius * radius;
      const enlarged = Object.fromEntries(
        ["x", "y", "z"].map((axis) => [
          axis,
          Math.sqrt((1 + beta) * axes[axis] ** 2 + extra),
        ]),
      );
      const oldExtent = rotatedExtent(axes, collider.rotation, true);
      const newExtent = rotatedExtent(enlarged, collider.rotation, true);
      expansion = Math.max(
        expansion,
        newExtent.x - oldExtent.x,
        newExtent.y - oldExtent.y,
        newExtent.z - oldExtent.z,
      );
    }
    expansionCache.set(radius, expansion);
    return expansion;
  }

  return { query };
}

/**
 * 为生成点等调用方复用静态网格，形状仍交由原精确层判定。
 * @param {object[]} colliders 不可变静态碰撞体数组。
 * @param {object} start 查询起点。
 * @param {object} end 查询终点，点查询可传相同坐标。
 * @param {object} dimensions 碰撞半径radius与鱼身padding。
 * @returns {object[]} 保持原序的候选集合。
 */
export function queryStaticColliders(
  colliders,
  start,
  end = start,
  dimensions = {},
) {
  return staticGridFor(colliders).query(start, end, dimensions);
}

/**
 * 用静态网格和当帧动态碰撞体求解移动，返回值与完整 resolveMotion 保持一致。
 * @param {object} previous 移动前位置，至少包含有限数值 x、y、z。
 * @param {object} desired 希望到达的位置，不会原地修改。
 * @param {object} options staticColliders 为不可变建筑数组；dynamicColliders 每次读取当前实体。
 * 其余 radius、forward、length、floorHeight、bounds 参数原样交给精确求解器。
 * @returns {object} 精确求解器的 position、contacts、blocked、recovered、stuck。
 */
export function resolveIndexedMotion(
  previous,
  desired,
  { staticColliders = [], dynamicColliders = [], ...options } = {},
) {
  const grid = staticColliders.length ? staticGridFor(staticColliders) : null;
  return resolveMotion(previous, desired, {
    ...options,
    colliders: (start, end, dimensions) => [
      ...(grid?.query(start, end, dimensions) || []),
      ...dynamicColliders,
    ],
  });
}

/**
 * 对静态建筑作网格粗筛，再用完整精度射线求交，动态实体每次读取当前状态。
 * @param {object} start 射线起点，包含有限数值 x、y、z。
 * @param {object} end 射线终点，包含有限数值 x、y、z。
 * @param {object} options staticColliders 为不可变建筑数组；dynamicColliders 保持当帧顺序；radius 为扫掠球半径。
 * @returns {object|null} 与 castSegment 相同的最近命中；同距离优先静态数组原序，再按动态数组原序。
 */
export function castIndexedSegment(
  start,
  end,
  { staticColliders = [], dynamicColliders = [], radius = 0 } = {},
) {
  const candidates = staticColliders.length
    ? staticGridFor(staticColliders).query(start, end, { radius })
    : [];
  return castSegment(start, end, [...candidates, ...dynamicColliders], radius);
}

/** 初始位置或目标被水层/海床投影时，保留完整高度候选，防止漏掉投影后的建筑。 */
export function needsVerticalProjection(point, { bounds, floorHeight } = {}) {
  const minY = bounds?.minY ?? -Infinity;
  const maxY = bounds?.maxY ?? Infinity;
  return (
    point.y < minY ||
    point.y > maxY ||
    (floorHeight && point.y < Math.min(floorHeight(point.x, point.z), maxY))
  );
}

/*********************************************
 * Types and Data Structures
 ********************************************/

// 弱缓存只与建筑数组同寿命，切图、重开不会持有已销毁城市。
const STATIC_MOTION_GRIDS = new WeakMap();

/*********************************************
 * Private Helper Functions
 ********************************************/

function staticGridFor(colliders) {
  let cached = STATIC_MOTION_GRIDS.get(colliders);
  if (!cached || cached.count !== colliders.length) {
    cached = {
      count: colliders.length,
      grid: createStaticColliderGrid(colliders),
    };
    STATIC_MOTION_GRIDS.set(colliders, cached);
  }
  return cached.grid;
}

function colliderBounds(collider) {
  if (collider.type === "capsule") {
    return {
      minY: Math.min(collider.a.y, collider.b.y) - collider.radius,
      maxY: Math.max(collider.a.y, collider.b.y) + collider.radius,
      minX: Math.min(collider.a.x, collider.b.x) - collider.radius,
      maxX: Math.max(collider.a.x, collider.b.x) + collider.radius,
      minZ: Math.min(collider.a.z, collider.b.z) - collider.radius,
      maxZ: Math.max(collider.a.z, collider.b.z) + collider.radius,
    };
  }
  const extent =
    collider.type === "box"
      ? rotatedExtent(collider.halfSize, collider.rotation)
      : collider.type === "ellipsoid"
        ? rotatedExtent(collider.axes, collider.rotation, true)
        : { x: collider.radius, y: collider.radius, z: collider.radius };
  return {
    minY: collider.y - extent.y,
    maxY: collider.y + extent.y,
    minX: collider.x - extent.x,
    maxX: collider.x + extent.x,
    minZ: collider.z - extent.z,
    maxZ: collider.z + extent.z,
  };
}

function rotatedExtent(axes, rotation, ellipsoid = false) {
  const { x = 0, y = 0, z = 0, w = 1 } = rotation || {};
  const rows = {
    x: [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    y: [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    z: [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  };
  const extent = {};
  for (const axis of ["x", "y", "z"]) {
    const row = rows[axis].map(
      (value, index) => value * axes[["x", "y", "z"][index]],
    );
    extent[axis] = ellipsoid
      ? Math.hypot(...row)
      : row.reduce((sum, value) => sum + Math.abs(value), 0);
  }
  return extent;
}

function cellRange(bounds, cellSize) {
  return Object.fromEntries(
    Object.entries(bounds).map(([axis, value]) => [
      axis,
      Math.floor(value / cellSize),
    ]),
  );
}

function cellCount(range) {
  return (range.maxX - range.minX + 1) * (range.maxZ - range.minZ + 1);
}

function intersects(a, b) {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minZ <= b.maxZ &&
    a.maxZ >= b.minZ &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY
  );
}
