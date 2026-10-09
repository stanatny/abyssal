/**
 * 珍兽提前识别近身玩家，并以有限侧向摆动逃逸；没有瞬移或无敌期。
 * direction由调用者复用，地图现有的地形/碰撞/栖地约束仍在本函数后执行。
 */
export function steerElusiveRare(
  state,
  dt,
  point,
  player,
  direction,
  seed,
  species,
) {
  state.time = (state.time || 0) + dt;
  const dx = point.x - player.x,
    dy = point.y - player.y,
    dz = point.z - player.z;
  const distance = Math.hypot(dx, dy, dz);
  state.escapeRemaining =
    distance < RARE_PURSUIT_RULES.alertRadius
      ? RARE_PURSUIT_RULES.escapeDuration
      : Math.max(0, (state.escapeRemaining || 0) - dt);
  if (state.escapeRemaining <= 0) return species.speed;
  const horizontal = Math.hypot(dx, dz) || 1;
  // 连续变向且保留主要逃逸方向，冲刺追逐与切入路线仍有机会接近。
  const dodge =
    Math.sin(state.time * 2.3 + seed) * RARE_PURSUIT_RULES.lateralDodge +
    Math.sin(state.time * 0.8 + seed * 0.37) *
      RARE_PURSUIT_RULES.secondaryDodge;
  direction
    .set(
      dx / Math.max(0.01, distance) + (dz / horizontal) * dodge,
      Math.max(-0.2, Math.min(0.2, dy / Math.max(0.01, distance))) +
        Math.sin(state.time * 1.7 + seed) * RARE_PURSUIT_RULES.verticalDodge,
      dz / Math.max(0.01, distance) - (dx / horizontal) * dodge,
    )
    .normalize();
  return species.escapeSpeed;
}
/** 珍兽仍快于巡游，但为短冲刺和近身辅助留下稳定的追捕余量。 */
export const RARE_PURSUIT_RULES = Object.freeze({
  cruiseSpeed: 14,
  escapeSpeed: 18,
  alertRadius: 32,
  escapeDuration: 1.6,
  lateralDodge: 0.18,
  secondaryDodge: 0.06,
  verticalDodge: 0.04,
});
