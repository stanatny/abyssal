import { consumePrey, takeDamage } from "./simulation.js";

/** 人类活动的有限数量与交互门槛，所有时间使用游戏主循环时钟。 */
export const HUMAN_RULES = Object.freeze({
  swimmerCount: 12,
  diverCount: 10,
  submarineCount: 3,
  torpedoCount: 12,
  submarineHits: 3,
  impactSpeed: 20,
  impactLength: 8,
  impactCooldown: 0.8,
  releaseCount: 3,
  releaseProtection: 2,
  torpedoDamage: 28,
});

/** 创建单艇耐久状态；每次重开创建新状态，释放标志与碰撞锁一并清空。 */
export function createSubmarineState() {
  return {
    health: HUMAN_RULES.submarineHits,
    maxHealth: HUMAN_RULES.submarineHits,
    armed: true,
    destroyed: false,
    released: false,
    lastImpact: -Infinity,
  };
}

/**
 * 结算一次独立冲撞。离开艇壳后才重新武装，停留在壳边无法持续扣耐久。
 * @param {object} state 潜艇耐久状态，将原地修改。
 * @param {object} input touching、clear、speed、length、now，由世界扫掠提供。
 * @returns {{hit:boolean,destroyed:boolean,release:boolean}} 本次冲撞与一次性释放结果。
 */
export function stepSubmarineImpact(
  state,
  { touching = false, clear = false, speed = 0, length = 0, now = 0 } = {},
) {
  const result = { hit: false, destroyed: false, release: false };
  if (state.destroyed) return result;
  if (clear) state.armed = true;
  if (!touching || !state.armed) return result;
  state.armed = false;
  if (
    !Number.isFinite(speed) ||
    !Number.isFinite(length) ||
    !Number.isFinite(now) ||
    speed < HUMAN_RULES.impactSpeed ||
    length < HUMAN_RULES.impactLength ||
    now - state.lastImpact < HUMAN_RULES.impactCooldown
  )
    return result;
  state.lastImpact = now;
  state.health = Math.max(0, state.health - 1);
  result.hit = true;
  if (state.health === 0) {
    state.destroyed = true;
    result.destroyed = true;
    result.release = !state.released;
    state.released = true;
  }
  return result;
}

/** 捕食成年人，沿用普通进食的回血、营养和成长规则；刚脱艇者短暂保护。 */
export function consumeHuman(player, entity, now) {
  if (!entity.alive || now < entity.protectedUntil) return false;
  if (!consumePrey(player, entity.species)) return false;
  entity.alive = false;
  return true;
}

/** 鱼雷接触后只爆炸一次；无敌仍能免伤，雷体不会保留并再次伤害。 */
export function detonateTorpedo(player, hazard, touching) {
  if (
    !touching ||
    !hazard.active ||
    player.dead ||
    player.won ||
    player.timedOut
  )
    return { exploded: false, damaged: false };
  hazard.active = false;
  return {
    exploded: true,
    damaged: takeDamage(player, HUMAN_RULES.torpedoDamage),
  };
}
