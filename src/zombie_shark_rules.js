import { getCharacter } from "./character_rules.js";
import { consumePrey, preyMealReward, vitalLimit } from "./simulation.js";

/** 尸鲨仆从只使用当前远征时钟；状态不持有场景、对象或墙钟。 */
export function createSummonState() {
  return { activatedAt: null, readyAt: 0, activeUntil: 0, meals: 0 };
}

/** 返回明确的拒绝原因，供按钮和键盘技能入口共用；失败不扣除任何属性。 */
export function summonStatus(state, player, now = player.elapsed) {
  const validTime = Number.isFinite(now) && now >= 0;
  const cooldownRemaining = validTime ? Math.max(0, state.readyAt - now) : 0;
  const active =
    validTime && state.activatedAt !== null && now < state.activeUntil;
  const skill = getCharacter("zombie_shark").active;
  let reason = null;
  if (
    !validTime ||
    player.characterId !== "zombie_shark" ||
    player.dead ||
    player.won ||
    player.timedOut
  )
    reason = "inactive";
  else if (cooldownRemaining > 0 || active) reason = "cooldown";
  else if (
    !Number.isFinite(player.length) ||
    player.length < skill.minimumLength
  )
    reason = "length";
  else if (
    [player.health, player.stamina, player.hunger].some(
      (value) => !Number.isFinite(value) || value < skill.cost,
    )
  )
    reason = "resources";
  return {
    active,
    remaining: active ? Math.max(0, state.activeUntil - now) : 0,
    cooldownRemaining,
    ready: cooldownRemaining === 0 && !active,
    usable: reason === null,
    reason,
    lethal: player.health === skill.cost,
    maxPreyLength: Math.max(0, player.length - MINION_RULES.preyGap),
  };
}

/** 原子结算献祭，50生命恰好支付仍合法但致死；召唤不是伤害，不能被无敌帧抵消。 */
export function activateSummon(state, player, now = player.elapsed) {
  if (!summonStatus(state, player, now).usable) return false;
  const skill = getCharacter("zombie_shark").active;
  for (const key of ["health", "stamina", "hunger"]) player[key] -= skill.cost;
  player.dead = player.health <= 0;
  if (player.stamina === 0) player.exhausted = true;
  state.activatedAt = now;
  state.readyAt = now + skill.cooldown;
  state.activeUntil = now + skill.duration;
  state.meals = 0;
  return true;
}

/** 仆从资格始终按主角实时体长计算，不借用狂食或仆从的可见尺寸，绝不攻击领主。 */
export function canMinionEat(player, prey) {
  return (
    !!prey &&
    !player.dead &&
    !player.won &&
    !player.timedOut &&
    Number.isFinite(player.length) &&
    Number.isFinite(prey.length) &&
    prey.length > 0 &&
    prey.length <= player.length - MINION_RULES.preyGap &&
    prey.tier !== 3 &&
    prey.category !== "lord" &&
    !prey.boss &&
    !prey.vehicle
  );
}

/** 经真实接触和遮挡验证后结算一次普通进食；正常营养、治疗与成长之外恢复有效营养等量体力。 */
export function consumeMinionPrey(state, player, prey) {
  if (!summonStatus(state, player).active || !canMinionEat(player, prey))
    return false;
  const reward = preyMealReward(player.length, prey);
  if (!consumePrey(player, prey)) return false;
  // 用捕食前体长计算的有效营养恢复体力，不受饱食封顶影响，也不重复成年加成。
  player.stamina = Math.min(
    vitalLimit(player),
    player.stamina + reward.nutrition,
  );
  if (player.exhausted && player.stamina >= 25) player.exhausted = false;
  state.meals++;
  return true;
}

/** 有界近距巡游范围；仆从随主角成长，但不改变主角的体长与碰撞配置。 */
export const MINION_RULES = Object.freeze({
  sizeRatio: 0.65,
  preyGap: 5,
  searchRadius: 32,
  leashRadius: 64,
  cruiseSpeed: 20,
  returnSpeed: 48,
  searchInterval: 0.25,
});
