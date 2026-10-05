/** 神话领主各自的空间判定；特效与伤害共用这些有限、可回避的范围。 */
export const ODYSSEY_ATTACKS = Object.freeze({
  undertow: Object.freeze({
    range: 84,
    halfAngle: 0.68,
    core: 18,
    maxPull: 20,
  }),
  surge: Object.freeze({
    range: 105,
    speed: 44,
    width: 82,
    height: 26,
    thickness: 6,
  }),
  claw: Object.freeze({
    range: 65,
    halfAngle: 0.34,
    spread: 0.58,
    height: 17,
    innerRange: 22,
    innerHeight: 22,
    innerHalfAngle: 1.82,
  }),
  fault: Object.freeze({
    range: 105,
    speed: 48,
    spread: 0.48,
    interval: 0.35,
    radius: 7,
    height: 14,
  }),
});

/** 带真实朝向的三维吞潮锥；侧翼不受拉扯，离开锥体即可挣脱。 */
export function undertowPressure(point, origin, forward) {
  const x = point.x - origin.x,
    y = point.y - origin.y,
    z = point.z - origin.z;
  const distance = Math.hypot(x, y, z),
    r = ODYSSEY_ATTACKS.undertow;
  if (distance >= r.range || !Number.isFinite(distance)) return 0;
  if (
    distance > 1e-6 &&
    (x * forward.x + y * forward.y + z * forward.z) / distance <
      Math.cos(r.halfAngle)
  )
    return 0;
  return 6 + (r.maxPull - 6) * (1 - distance / r.range) ** 2;
}

/** 双钳仅扫过头前左右两片扇区，内圈近身前侧亦可扫钳；背后和高处保留明确安全空间。 */
export function inCrabClaws(point, origin, forward, padding = 0) {
  const r = ODYSSEY_ATTACKS.claw,
    x = point.x - origin.x,
    z = point.z - origin.z,
    d = Math.hypot(x, z);
  if (
    d > r.range + padding ||
    Math.abs(point.y - origin.y) > Math.max(r.height, r.innerHeight) + padding
  )
    return false;
  const angle = Math.atan2(
    x * -forward.z + z * forward.x,
    x * forward.x + z * forward.z,
  );
  if (
    d <= r.innerRange + padding &&
    Math.abs(angle) <= r.innerHalfAngle &&
    Math.abs(point.y - origin.y) <= r.innerHeight + padding
  )
    return true;
  if (Math.abs(point.y - origin.y) > r.height + padding) return false;
  return [-1, 1].some(
    (s) =>
      Math.abs(angle - s * r.spread) <
      r.halfAngle + Math.asin(Math.min(0.4, padding / Math.max(1, d))),
  );
}

/** 潮墙沿锁定方向推进，按帧扫掠保留低帧率下的真实命中。 */
export function inTidalWall(point, origin, forward, timer, dt, padding = 0) {
  const r = ODYSSEY_ATTACKS.surge,
    x = point.x - origin.x,
    y = point.y - origin.y,
    z = point.z - origin.z;
  const axial = x * forward.x + y * forward.y + z * forward.z;
  const side = x * -forward.z + z * forward.x;
  const vertical = y - forward.y * axial;
  const front = Math.min(r.range, timer * r.speed),
    previous = Math.max(0, (timer - dt) * r.speed);
  return (
    axial >= previous - r.thickness - padding &&
    axial <= front + r.thickness + padding &&
    Math.abs(side) < r.width / 2 + padding &&
    Math.abs(vertical) < r.height / 2 + padding
  );
}

/** 三路地层波留出扇形间隙，离开近底水层可以躲开。 */
export function inReefFault(
  point,
  origin,
  forward,
  timer,
  dt,
  heightAt,
  padding = 0,
) {
  const r = ODYSSEY_ATTACKS.fault;
  if (Math.abs(point.y - heightAt(point.x, point.z) - 8) > r.height + padding)
    return false;
  const base = Math.atan2(forward.x, -forward.z),
    x = point.x - origin.x,
    z = point.z - origin.z;
  for (let i = 0; i < 3; i++) {
    const age = timer - i * r.interval;
    if (age < 0) continue;
    const a = base + (i - 1) * r.spread,
      fx = Math.sin(a),
      fz = -Math.cos(a);
    const axial = x * fx + z * fz,
      side = x * -fz + z * fx;
    const front = Math.min(r.range, age * r.speed),
      previous = Math.max(0, (age - dt) * r.speed);
    if (
      axial >= previous - r.radius - padding &&
      axial <= front + r.radius + padding &&
      Math.abs(side) < r.radius + padding
    )
      return true;
  }
  return false;
}
