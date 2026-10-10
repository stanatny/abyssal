/** 机械鲨鱼的支付、冷却与普通生物耐久；与渲染器无关。 */
export const MECHANICAL_RULES = Object.freeze({
  cooldown: 2,
  healthCost: 20,
  staminaCost: 20,
  resistance: 1.5,
  range: 140,
  speed: 70,
  blastRadius: 14,
  projectileRadius: 0.28,
  giantHits: 2,
  poolSize: 2,
  aimConeDegrees: 7,
  aimTurnDegrees: 240,
});

/** 创建独立发射时钟；活跃时间由共享主循环提供。 */
export function createTorpedoState() {
  return { readyAt: 0, activatedAt: null, shots: 0 };
}

/** 查询当前释放资格；生命必须严格大于支付值，拒绝致死发射。 */
export function torpedoStatus(state, player, underwater = true) {
  const now = player.elapsed;
  const valid = Number.isFinite(now) && now >= 0;
  const cooldownRemaining = valid ? Math.max(0, state.readyAt - now) : Infinity;
  const ready = cooldownRemaining === 0;
  const alive = !player.dead && !player.won && !player.timedOut;
  const resources =
    Number.isFinite(player.health) &&
    Number.isFinite(player.stamina) &&
    player.health > MECHANICAL_RULES.healthCost &&
    player.stamina >= MECHANICAL_RULES.staminaCost;
  const reason =
    !valid || !alive || player.characterId !== "mechanical_shark"
      ? "unavailable"
      : !ready
        ? "cooldown"
        : !underwater
          ? "underwater"
          : !resources
            ? "resources"
            : "ready";
  return {
    ready,
    usable: reason === "ready",
    reason,
    active: false,
    remaining: 0,
    cooldownRemaining,
  };
}

/** 原子支付并开启冷却；无敌、钢铁之躯与洋流奖励不能豁免献祭。 */
export function activateTorpedo(state, player, underwater = true) {
  if (!torpedoStatus(state, player, underwater).usable) return false;
  player.health -= MECHANICAL_RULES.healthCost;
  player.stamina -= MECHANICAL_RULES.staminaCost;
  player.exhausted = player.stamina <= 0;
  state.activatedAt = player.elapsed;
  state.readyAt = player.elapsed + MECHANICAL_RULES.cooldown;
  state.shots += 1;
  return true;
}

/** 返回普通生物是否被本次爆炸击杀；调用方须立即退休并结算一次吞噬。 */
export function hitOrdinaryWithTorpedo(entity, player) {
  if (
    !Number.isFinite(player.length) ||
    !(player.length > 0) ||
    entity.hiddenFor > 0 ||
    entity.species.tier === 3 ||
    entity.species.category === "lord" ||
    entity.species.boss ||
    entity.species.vehicle ||
    !Number.isFinite(entity.species.length) ||
    !(entity.species.length > 0)
  )
    return false;
  entity.torpedoHits = (entity.torpedoHits || 0) + 1;
  const required =
    entity.species.length >= player.length ? MECHANICAL_RULES.giantHits : 1;
  if (entity.torpedoHits < required) return false;
  entity.chase = 0;
  entity.flight = null;
  entity.velocity?.set(0, 0, 0);
  entity.mesh.userData.setGliding?.(false);
  return true;
}

/** 清除已退休或新刷出生物的独立耐久，切图和重开共用。 */
export function resetTorpedoTarget(entity) {
  entity.torpedoHits = 0;
}
