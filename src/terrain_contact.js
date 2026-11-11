import { bodyOffsets } from "./collision.js";

/** 与实体碰撞共用身体采样球；地表回调包含最终三角面，而不是仅托住身体中心。 */
export function bodyTerrainFloor(
  x,
  z,
  { heightAt, radius = 0, forward, length = 0, margin = 0.4 },
) {
  let floor = -Infinity;
  for (const offset of bodyOffsets({ radius, forward, length })) {
    const sx = x + offset.x,
      sz = z + offset.z,
      support = heightAt.supportHeight
        ? heightAt.supportHeight(sx, sz, radius)
        : heightAt(sx, sz) + radius;
    if (Number.isFinite(support))
      floor = Math.max(floor, support - offset.y + margin);
  }
  return floor;
}

/** 相机缩臂复用实际地表支撑；插值后的射线也不能从坡面下方看进地形。 */
export function clipTerrainCamera(
  start,
  end,
  heightAt,
  { radius = 0.6, margin = 0.04, step = 0.4 } = {},
) {
  const dx = end.x - start.x,
    dy = end.y - start.y,
    dz = end.z - start.z,
    distance = Math.hypot(dx, dy, dz);
  if (!(distance > 1e-8)) return { ...end };
  const blocked = (t) => {
    const x = start.x + dx * t,
      z = start.z + dz * t,
      floor = heightAt.supportHeight
        ? heightAt.supportHeight(x, z, radius)
        : heightAt(x, z) + radius;
    return start.y + dy * t < floor + margin;
  };
  // 只检查有限的跟随镜头长度；首次相交后以二分保留贴面余量。
  const count = Math.min(256, Math.max(1, Math.ceil(distance / step)));
  for (let i = 1; i <= count; i++) {
    if (!blocked(i / count)) continue;
    let lo = (i - 1) / count,
      hi = i / count;
    for (let j = 0; j < 10; j++) {
      const middle = (lo + hi) * 0.5;
      if (blocked(middle)) hi = middle;
      else lo = middle;
    }
    return {
      x: start.x + dx * lo,
      y: start.y + dy * lo,
      z: start.z + dz * lo,
    };
  }
  return { ...end };
}
