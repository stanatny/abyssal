import { queryStaticColliders } from "./static_collider_grid.js";

/**
 * 静态球形岩石的局部避让；保持原始岩石顺序和逐项转向量。
 * @param {object} direction 原地更新的方向，调用后仍由调用方归一化。
 * @param {object} point 当前坐标，不会修改。
 * @param {number} clearance 在岩石半径外预留的距离。
 * @param {object[]} spheres 位置与半径不变的静态岩石数组。
 * @returns {object} 输入方向。
 */
export function steerFromStaticSpheres(direction, point, clearance, spheres) {
  if (!spheres.length) return direction;
  const nearby = queryStaticColliders(spheres, point, point, {
    padding: clearance,
  });
  for (const rock of nearby) {
    const dx = point.x - rock.x,
      dy = point.y - rock.y,
      dz = point.z - rock.z;
    const squared = dx * dx + dy * dy + dz * dz;
    const safe = rock.radius + clearance;
    if (squared >= safe * safe) continue;
    const distance = Math.sqrt(squared);
    if (distance <= 0.01) continue;
    const inverse = 1 / distance;
    const strength = ((safe - distance) / safe) * 3;
    direction.x += dx * inverse * strength;
    direction.y += dy * inverse * strength;
    direction.z += dz * inverse * strength;
  }
  return direction;
}

/**
 * 使用已有静态网格判断球体重叠，不改变精确距离或贴边容差。
 * @param {object} point 待查坐标。
 * @param {number} radius 生物半径。
 * @param {object[]} spheres 不会移动的静态岩石。
 * @param {number} insetSquared 从半径平方中扣除的原有容差。
 * @returns {boolean} 是否与至少一个岩石重叠。
 */
export function overlapsStaticSpheres(
  point,
  radius,
  spheres,
  insetSquared = 0,
) {
  if (!spheres.length) return false;
  for (const rock of queryStaticColliders(spheres, point, point, {
    padding: radius,
  })) {
    const dx = point.x - rock.x,
      dy = point.y - rock.y,
      dz = point.z - rock.z;
    if (
      dx * dx + dy * dy + dz * dz <
      (rock.radius + radius) ** 2 - insetSquared
    )
      return true;
  }
  return false;
}

/**
 * 将坐标从静态岩石推出；无重叠时快速返回，有重叠时保留完整有序投影。
 * @param {object} point 原地更新的坐标。
 * @param {number} radius 生物半径。
 * @param {object[]} spheres 位置与半径不变的静态岩石数组。
 * @returns {object} 输入坐标。
 */
export function pushFromStaticSpheres(point, radius, spheres) {
  if (!overlapsStaticSpheres(point, radius, spheres)) return point;
  // 一次推出可能碰到初始查询之外的后续岩石，不能只对初始候选投影。
  for (const rock of spheres) {
    const dx = point.x - rock.x,
      dy = point.y - rock.y,
      dz = point.z - rock.z;
    const squared = dx * dx + dy * dy + dz * dz;
    const limit = rock.radius + radius;
    if (squared >= limit * limit) continue;
    const distance = Math.sqrt(squared);
    if (distance <= 0.01) continue;
    const strength = (limit - distance) / distance;
    point.x += dx * strength;
    point.y += dy * strength;
    point.z += dz * strength;
  }
  return point;
}
