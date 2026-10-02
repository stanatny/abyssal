/** 技能的三段压力扇区由同一角度、范围和相位参数驱动判定与显示。 */
export const TIDAL_LOOM = Object.freeze({
  innerRadius: 18,
  outerRadius: 85,
  halfAngle: 0.23,
  halfHeight: 10,
  sweep: 1.05,
});
export function loomAngle(heading, timer, duration, attacking, index) {
  const base = Math.atan2(heading.z, heading.x);
  const progress = attacking ? Math.max(0, Math.min(1, timer / duration)) : 0;
  return base + (progress - 0.5) * TIDAL_LOOM.sweep + (index * Math.PI * 2) / 3;
}
export function inTidalLoom(
  position,
  origin,
  heading,
  timer,
  duration,
  padding = 0,
) {
  const dx = position.x - origin.x,
    dz = position.z - origin.z,
    r = Math.hypot(dx, dz);
  if (
    r < TIDAL_LOOM.innerRadius - padding ||
    r > TIDAL_LOOM.outerRadius + padding ||
    Math.abs(position.y - origin.y) > TIDAL_LOOM.halfHeight + padding
  )
    return false;
  const angle = Math.atan2(dz, dx),
    margin = Math.asin(Math.min(1, padding / Math.max(1, r)));
  for (let i = 0; i < 3; i++) {
    const delta = angle - loomAngle(heading, timer, duration, true, i);
    if (
      Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta))) <=
      TIDAL_LOOM.halfAngle + margin
    )
      return true;
  }
  return false;
}
