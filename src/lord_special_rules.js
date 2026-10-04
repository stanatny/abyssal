/** 克拉肯的受困窗口与一次性绞咬；不占用玩家输入或共享无敌计时。 */
export const KRAKEN_GRAPPLE = Object.freeze({
  coreRadius: 14,
  exposure: 0.55,
  grabReach: 22,
  biteDelay: 1.5,
  escapeDistance: 27,
  pullSpeed: 17,
  gripPullSpeed: 12,
  staminaDrain: 5,
  damageMultiplier: 1.5,
});

/** 新一轮漩涡的状态；脱战、喷墨、击败与重开均丢弃旧束缚。 */
export function createKrakenGrapple() {
  return { exposure: 0, held: false, timer: 0, spent: false };
}

/**
 * 只有持续停留在涡心且触腕真正够到，才进入延迟咬击；逃出范围可打断。
 * @param {object} state 本次技能独立的束缚状态。
 * @param {number} dt 当前有效游戏步长。
 * @param {object} context 涡心距离、真实口器距离及无遮挡条件。
 * @returns {string|null} grabbed/escaped/bite，攻击一次后不能在同轮再次捕获。
 */
export function tickKrakenGrapple(
  state,
  dt,
  { coreDistance, mouthDistance, clear },
) {
  if (state.spent) return null;
  const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  if (state.held) {
    if (!clear || mouthDistance > KRAKEN_GRAPPLE.escapeDistance) {
      state.held = false;
      state.spent = true;
      return "escaped";
    }
    state.timer += elapsed;
    if (state.timer >= KRAKEN_GRAPPLE.biteDelay) {
      state.held = false;
      state.spent = true;
      return "bite";
    }
  } else {
    state.exposure =
      clear && coreDistance < KRAKEN_GRAPPLE.coreRadius
        ? state.exposure + elapsed
        : 0;
    if (
      state.exposure >= KRAKEN_GRAPPLE.exposure &&
      clear &&
      mouthDistance < KRAKEN_GRAPPLE.grabReach
    ) {
      state.held = true;
      state.timer = 0;
      return "grabbed";
    }
  }
  return null;
}

/** 锁定方向的水息圆柱，有限射程且不在释放后转向追踪。 */
export function inWaterBreath(
  position,
  origin,
  direction,
  range,
  radius,
  padding = 0,
) {
  const x = position.x - origin.x,
    y = position.y - origin.y,
    z = position.z - origin.z;
  const along = x * direction.x + y * direction.y + z * direction.z;
  const width = radius + padding;
  return (
    along >= 0 &&
    along <= range &&
    x * x + y * y + z * z - along * along <= width * width
  );
}
