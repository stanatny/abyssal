/** 克拉肯的受困窗口与一次性绞咬；不占用玩家输入或共享无敌计时。 */
export const KRAKEN_GRAPPLE = Object.freeze({
  coreRadius: 14,
  exposure: 0.55,
  grabReach: 22,
  biteDelay: 1.5,
  escapeDistance: 27,
  pullSpeed: Object.freeze({ near: 24, far: 10 }),
  gripPullSpeed: Object.freeze({ near: 18, far: 6 }),
  staminaDrain: Object.freeze({ near: 9, far: 3 }),
  escapeCost: Object.freeze({
    near: 120,
    far: 24,
    nearDistance: 6,
    farDistance: 42,
  }),
  damageMultiplier: 1.5,
});
const KRAKEN_FORCE_KEYS = Object.freeze([
  "pullSpeed",
  "gripPullSpeed",
  "staminaDrain",
]);

/**
 * 按真实口器距离平滑衰减牵引与体力消耗；复用输出可避免逐帧分配。
 * @param {number} mouthDistance 玩家到实际口器的距离，使用世界坐标单位。
 * @param {object} out 可复用的输出对象，省略时创建新对象。
 * @returns {object} 同一输出对象，包含接近程度、涡流拉力、缠腕拉力与体力流失。
 */
export function krakenGrappleForces(mouthDistance, out = {}) {
  const ratio = Number.isFinite(mouthDistance)
    ? Math.max(0, Math.min(1, mouthDistance / KRAKEN_GRAPPLE.escapeDistance))
    : 1;
  const proximity = 1 - ratio * ratio * (3 - 2 * ratio);
  out.proximity = proximity;
  for (const key of KRAKEN_FORCE_KEYS) {
    const range = KRAKEN_GRAPPLE[key];
    out[key] = range.far + (range.near - range.far) * proximity;
  }
  return out;
}

/** 新一轮漩涡的状态；脱战、喷墨、击败与重开均丢弃旧束缚。 */
export function createKrakenGrapple() {
  return { exposure: 0, held: false, timer: 0, spent: false, escapeCost: 0 };
}

/** One paid break per vortex, from the actual maw. Ordinary sprint drain remains separate. */
export function krakenEscapeCost(distance) {
  const c = KRAKEN_GRAPPLE.escapeCost;
  if (!Number.isFinite(distance)) return c.far;
  const t = Math.max(
    0,
    Math.min(1, (distance - c.nearDistance) / (c.farDistance - c.nearDistance)),
  );
  return Math.ceil(c.near + (c.far - c.near) * t * t * (3 - 2 * t));
}

/** A deliberate outward sprint buys one release; insufficient reserves are not charged again. */
export function tryKrakenEscape(
  state,
  player,
  { dt, distance, active, boosting, outward },
) {
  state.escapeCost = active && !state.spent ? krakenEscapeCost(distance) : 0;
  if (
    !(dt > 0) ||
    !state.escapeCost ||
    !boosting ||
    outward < 0.25 ||
    player.exhausted ||
    player.dead
  )
    return false;
  if (player.stamina + 1e-8 < state.escapeCost) return false;
  player.stamina = Math.max(0, player.stamina - state.escapeCost);
  if (player.stamina === 0) player.exhausted = true;
  state.held = false;
  state.spent = true;
  state.escapeCost = 0;
  return true;
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
