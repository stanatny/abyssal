/**
 * 深海生存的独立规则：处理成长、饥饿、体力、伤害与限时奖励。
 * 模块不依赖渲染器，所有时间均以秒计，所有长度均为游戏内米数。
 */

import { isRegionalRare } from "./regional_rare.js";
import { ECOSYSTEM_SPECIES } from "./ecosystem_config.js";
import { REWARDS } from "./reward_config.js";
import { getCharacter } from "./character_rules.js";

/*********************************************
 * Public API
 ********************************************/

/** 根据角色和远征起始体长创建玩家；未指定体长时使用角色默认值，质量以6米个体为单位。 */
export function createPlayer(
  characterId = "orca",
  startLength = getCharacter(characterId).startLength,
) {
  if (!Number.isFinite(startLength) || startLength < 3 || startLength >= 30)
    throw new RangeError(
      "Starting length must be between 3 (inclusive) and 30 meters",
    );
  const character = getCharacter(characterId);
  return {
    characterId: character.id,
    vitalCap: 100,
    rareRewardClaimed: false,
    health: 100,
    stamina: 100,
    hunger: 100,
    startLength,
    mass: (startLength / 6) ** 3,
    length: startLength,
    eaten: 0,
    elapsed: 0,
    timedOut: false,
    bossesDefeated: 0,
    biteCooldown: 0,
    lastMeal: { healed: 0, growth: 0, nutrition: 0 },
    buffs: { frenzy: 0, flow: 0 },
    invulnerable: 0,
    exhausted: false,
    won: false,
    dead: false,
  };
}

/**
 * 返回每秒饥饿消耗；浅滩消耗翻倍，深水对未成长个体增加连续的生存压力。
 * @param {number} length 玩家实际体长；无效输入按3米幼年体型处理。
 * @param {number} depth 世界坐标海深，界面显示深度为其四倍；无效输入按浅滩处理。
 * @returns {number} 每秒消耗的饥饿值。
 */
export function hungerDrainRate(length, depth = 18) {
  const safeLength = Number.isFinite(length) ? Math.max(3, length) : 3;
  const safeDepth = Number.isFinite(depth) ? Math.max(0, depth) : 0;
  const baseRate =
    0.22 +
    0.02 * Math.min(3, safeLength - 3) +
    0.03 * Math.max(0, safeLength - 6);
  const depthPressure = Math.min(
    1,
    Math.max(
      0,
      (safeDepth - HUNGER_RULES.shallowDepth) /
        (HUNGER_RULES.fullDepth - HUNGER_RULES.shallowDepth),
    ),
  );
  const juvenile = Math.max(
    0,
    1 - (safeLength - 3) / (HUNGER_RULES.acclimatedLength - 3),
  );
  return (
    baseRate *
    HUNGER_RULES.baseMultiplier *
    (1 +
      depthPressure *
        (HUNGER_RULES.maxDepthBonus +
          juvenile * HUNGER_RULES.juvenileDepthBonus))
  );
}

/**
 * 推进生存状态及远征用时，返回本帧结尾是否仍可冲刺；暂停时不调用。
 * @param {object} player 玩家状态，将原地更新。
 * @param {number} dt 经过的秒数，非正数与非有限值不会推进时间。
 * @param {object} options 冲刺意图、当前深度与roundDt远征活跃秒数；roundDt默认等于dt。
 * @returns {{boosting: boolean}} 可用于选择普通速度或冲刺速度。
 */
export function tickVitals(
  player,
  dt,
  { boosting = false, depth = 18, roundDt = dt } = {},
) {
  if (player.dead || player.won || player.timedOut) return { boosting: false };
  const remaining = Math.max(0, ROUND_DURATION - player.elapsed);
  const activeStep = Number.isFinite(roundDt) ? Math.max(0, roundDt) : 0;
  const roundElapsed = Math.min(activeStep, remaining);
  // 生存与冷却按真实活跃时间推进，物理步长截断不能让低帧率玩家少消耗。
  // 无效资源步长仍不改变资源，独立远征时钟沿用既有行为。
  const elapsed = Number.isFinite(dt) && dt > 0 ? roundElapsed : 0;

  const flowTime = Math.min(elapsed, player.buffs.flow);
  const paidTime = elapsed - flowTime;

  if (boosting && !player.exhausted && player.stamina > 0) {
    player.stamina = Math.max(
      0,
      player.stamina - paidTime * PLAYER_MOVEMENT.staminaDrain,
    );
    if (player.stamina === 0) player.exhausted = true;
  } else if (!boosting || flowTime < elapsed) {
    const recoveryTime = boosting ? paidTime : elapsed;
    player.stamina = Math.min(
      vitalLimit(player),
      player.stamina + recoveryTime * PLAYER_MOVEMENT.staminaRecovery,
    );
  }
  if (player.exhausted && player.stamina >= 25) player.exhausted = false;

  // 25米在深海约39秒耗尽饱食；有效领主咬击和途中大型猎物提供补给。
  // 深度不额外扣体力或生命；小鱼营养仍按既有体型差距衰减。
  const hungerRate = hungerDrainRate(player.length, depth);
  const fedTime = Math.min(elapsed, player.hunger / hungerRate);
  player.hunger = Math.max(0, player.hunger - hungerRate * elapsed);
  const starvingTime = elapsed - fedTime;
  if (starvingTime > 0) {
    // 饥饿持续伤害不触发碰撞无敌，因此不会被巨兽命中后的保护抵消。
    player.health = Math.max(0, player.health - starvingTime * 7);
    player.dead = player.health <= 0;
  }

  player.invulnerable = Math.max(0, player.invulnerable - elapsed);
  player.biteCooldown = Math.max(0, player.biteCooldown - elapsed);
  player.buffs.flow = Math.max(0, player.buffs.flow - elapsed);
  player.buffs.frenzy = Math.max(0, player.buffs.frenzy - elapsed);
  player.elapsed = Math.min(ROUND_DURATION, player.elapsed + roundElapsed);
  // 长时间小步累加会留下亚微秒浮点余量，不应因此多延后一帧结算。
  if (ROUND_DURATION - player.elapsed < 1e-8) player.elapsed = ROUND_DURATION;
  player.timedOut = !player.dead && player.elapsed >= ROUND_DURATION;

  return {
    boosting:
      boosting &&
      !player.dead &&
      !player.timedOut &&
      (player.buffs.flow > 0 || (!player.exhausted && player.stamina > 0)),
  };
}

/**
 * 判断吞食资格；始终只允许更小的普通猎物，狂食只改变近距吸食效果。
 * @param {object} player 玩家状态。
 * @param {number} preyLength 猎物长度，必须为正有限数。
 * @returns {boolean} 是否满足普通鱼的体长条件；主宰另走多阶段战斗规则。
 */
export function canEat(player, preyLength) {
  if (player.dead || player.won || player.timedOut || !isPositive(preyLength))
    return false;
  return preyLength < player.length;
}

/**
 * 吞食成功时更新质量、体长、营养与胜利状态。
 * @param {object} player 玩家状态，将原地更新。
 * @param {{length: number, nutrition?: number, growth?: number}} prey 猎物参数。
 * @returns {boolean} 是否吞食成功；失败不会改变任何玩家数值。
 */
export function consumePrey(player, prey) {
  if (!prey || prey.tier === 3 || !canEat(player, prey.length)) return false;
  if (isRegionalRare(prey)) return consumeRare(player, prey);
  applyNutrition(player, preyMealReward(player.length, prey));
  player.eaten += 1;
  return true;
}

/**
 * 确认被投射物击杀的普通生物直接计为吞噬；身体接触仍使用consumePrey。
 * @param {object} player 活跃角色状态。
 * @param {object} prey 已通过真实爆炸、耐久与遮挡验证的普通猎物。
 * @returns {boolean} 是否发放共享营养与一次捕食计数；不负责重复命中防护。
 */
export function consumeDefeatedPrey(player, prey) {
  if (
    player.dead ||
    player.won ||
    player.timedOut ||
    !prey ||
    prey.tier === 3 ||
    !isPositive(prey.length)
  )
    return false;
  if (isRegionalRare(prey)) return consumeRare(player, prey);
  applyNutrition(player, preyMealReward(player.length, prey));
  player.eaten += 1;
  return true;
}

/** 返回普通食物体型衰减比例，主角与仆从共享，不因饱食封顶丢失有效营养。 */
export function preyNutritionEfficiency(length, prey) {
  // 猎物小于自身一半后，收益按比例平方衰减，迫使大鱼前往更深海域觅食。
  const sizeEfficiency = Math.min(1, (prey.length / (length * 0.5)) ** 2);
  // 小鱼保持真实体长；幼年可穿过密群补给，大体型阶段收益快速递减。
  const schoolEfficiency =
    prey.length < 1 && prey.schoolSize > 1 ? 0.7 * (6 / length) ** 4 : 0;
  return Math.min(1, Math.max(sizeEfficiency, schoolEfficiency));
}

/**
 * 计算普通进食的有效收益；成年阶段加成与相对体型衰减共用，领主战利品不走此路径。
 * @param {number} length 捕食前的主角实际体长。
 * @param {{length:number,nutrition?:number,growth?:number}} prey 已验证捕食资格的普通猎物。
 * @returns {{length:number,nutrition:number,growth:number}} 供共享营养结算使用的收益；幼年和治疗分配仍由applyNutrition处理。
 */
export function preyMealReward(length, prey) {
  const rules = PREY_REWARD_RULES;
  const stage = Math.max(
    0,
    Math.min(
      1,
      (length - rules.startLength) / (rules.fullLength - rules.startLength),
    ),
  );
  // 2米以下的小鱼不靠成年加成变成高效食物，6米以上的猎物获得完整阶段加成。
  const preyScale = Math.max(
    0,
    Math.min(
      1,
      (prey.length - rules.smallPreyLength) /
        (rules.largePreyLength - rules.smallPreyLength),
    ),
  );
  const bonus = stage * preyScale;
  const efficiency = preyNutritionEfficiency(length, prey);
  return {
    length: prey.length,
    nutrition:
      nonNegative(prey.nutrition, 10 + prey.length * 1.5) *
      efficiency *
      (1 + (rules.maxNutritionMultiplier - 1) * bonus),
    growth:
      nonNegative(prey.growth, (prey.length / 6) ** 3 * 0.4) *
      efficiency *
      (1 + (rules.maxGrowthMultiplier - 1) * bonus),
  };
}

/**
 * 分配一次已确认获得的进食或战利品收益，供普通捕食与主宰战共用。
 * @param {object} player 玩家状态，将原地更新。
 * @param {{length?:number,nutrition?:number,growth?:number}} reward 基础奖励。
 * @param {number} efficiency 小型猎物收益系数；主宰战利品使用默认值1。
 * @returns {{healed:number,growth:number,nutrition:number}|null} 实际收益，无法获得时返回null。
 */
export function applyNutrition(player, reward, efficiency = 1) {
  if (player.dead || player.won || player.timedOut) return null;
  const safeEfficiency = Math.min(1, nonNegative(efficiency, 1));
  const preyLength = nonNegative(reward.length, 6);
  const nutrition =
    nonNegative(reward.nutrition, 10 + preyLength * 1.5) * safeEfficiency;
  // 生态奖励沿用6米质量单位；幼年仅压低成长，避免一群小鱼跳过多个体型层级。
  // 线性系数让第一群有明显成长反馈；成年普通猎物加成已在共享进食入口计算。
  const juvenileGrowth = Math.min(1, player.length / 6);
  const growth =
    nonNegative(reward.growth, (preyLength / 6) ** 3 * 0.4) *
    safeEfficiency *
    juvenileGrowth;
  const healingCapacity = nutrition * 0.8;
  const healed = Math.min(
    Math.max(0, vitalLimit(player) - player.health),
    healingCapacity,
  );
  // 受伤时最多将70%成长投入恢复；轻伤只扣除实际使用的治疗份额。
  const healingShare =
    healingCapacity > 0 ? (healed / healingCapacity) * 0.7 : 0;
  const previousMass = player.mass;
  const previousHunger = player.hunger;
  player.health = Math.min(vitalLimit(player), player.health + healed);
  player.hunger = Math.min(vitalLimit(player), player.hunger + nutrition);
  player.mass = Math.min(125, player.mass + growth * (1 - healingShare));
  player.length = Math.min(30, 6 * Math.cbrt(player.mass));
  player.lastMeal = {
    healed,
    growth: player.mass - previousMass,
    nutrition: player.hunger - previousHunger,
  };
  player.won =
    player.length >= 30 &&
    player.bossesDefeated >= 1 &&
    (player.expeditionComplete ?? true);
  return player.lastMeal;
}

/**
 * 应用单次攻击，命中后提供1.5秒无敌，避免接触瞬间连续扣血。
 * @param {object} player 玩家状态，将原地更新。
 * @param {number} amount 正有限伤害数值。
 * @returns {boolean} 是否实际造成伤害。
 */
export function takeDamage(player, amount) {
  if (
    player.dead ||
    player.won ||
    player.timedOut ||
    player.invulnerable > 0 ||
    !isPositive(amount)
  ) {
    return false;
  }
  player.health = Math.max(
    0,
    player.health -
      amount /
        (getCharacter(player.characterId || "orca").passive.resistance || 1),
  );
  player.invulnerable = 1.5;
  player.dead = player.health <= 0;
  return true;
}

/**
 * 收集奖励；同类限时奖励刷新剩余时间，不无限叠加。
 * @param {object} player 玩家状态，将原地更新。
 * @param {'stamina'|'flow'|'frenzy'} kind 生命补给、洋流冲刺或狂食。
 * @returns {boolean} 是否成功收集有效奖励。
 */
export function collectPickup(player, kind) {
  if (player.dead || player.won || player.timedOut) return false;
  if (kind === "stamina") {
    player.health = Math.min(vitalLimit(player), player.health + 50);
    player.stamina = Math.min(vitalLimit(player), player.stamina + 50);
    player.hunger = Math.min(vitalLimit(player), player.hunger + 50);
    player.exhausted = false;
  } else if (kind === "flow") {
    player.stamina = vitalLimit(player);
    player.exhausted = false;
    player.buffs.flow = Math.max(REWARDS.flow.duration, player.buffs.flow);
  } else if (kind === "frenzy") {
    player.buffs.frenzy = Math.max(
      REWARDS.frenzy.duration,
      player.buffs.frenzy,
    );
  } else {
    return false;
  }
  return true;
}

/** 根据正向海深返回海域信息；负深度与无效输入视为浅海。 */
export function getZone(depth) {
  const safeDepth = Number.isFinite(depth) ? Math.max(0, depth) : 0;
  return ZONES.find((zone) => safeDepth < zone.maxDepth) || ZONES[3];
}

/** 根据玩家体长返回0–100的成长百分比；胜利还需击败至少一位主宰。 */
export function getProgress(player) {
  const startLength =
    player.startLength ?? getCharacter(player.characterId).startLength;
  return Math.max(
    0,
    Math.min(100, ((player.length - startLength) / (30 - startLength)) * 100),
  );
}

/*********************************************
 * Types and Data Structures
 ********************************************/

/** 单次远征最多30分钟有效游玩时间；到时独立结算，不等同于死亡或胜利。 */
export const ROUND_DURATION = 30 * 60;

/** 深水饥饿加成阈值，使用世界深度；界面应按显示比例换算。 */
export const HUNGER_RULES = Object.freeze({
  shallowDepth: 45,
  fullDepth: 500,
  baseMultiplier: 2,
  maxDepthBonus: 0.5,
  juvenileDepthBonus: 4.5,
  acclimatedLength: 18,
});

/** 成年普通猎物收益加成，平滑提高中后期节奏，不放宽捕食或领主资格。 */
export const PREY_REWARD_RULES = Object.freeze({
  startLength: 10,
  fullLength: 25,
  smallPreyLength: 2,
  largePreyLength: 6,
  maxGrowthMultiplier: 4,
  maxNutritionMultiplier: 1.5,
});

/** 玩家移动共享配置；速度以世界单位/秒计，体力以每秒变化量计。 */
export const PLAYER_MOVEMENT = Object.freeze({
  cruiseSpeed: 12,
  sprintSpeed: 32,
  slowSpeed: 5,
  staminaDrain: 14,
  staminaRecovery: 19,
});

/** 现代与远古生物共享同一生态目录；主宰继续使用独立多阶段战斗配置。 */
export const SPECIES = ECOSYSTEM_SPECIES;

const ZONES = Object.freeze([
  Object.freeze({
    id: "reef",
    name: "珊瑚浅海",
    color: "#62e8dc",
    description: "追逐鱼群，积蓄力量",
    maxDepth: 90,
  }),
  Object.freeze({
    id: "twilight",
    name: "暮光海沟",
    color: "#7dbaef",
    description: "大白鲨正在巡视，留好体力",
    maxDepth: 250,
  }),
  Object.freeze({
    id: "abyss",
    name: "幽暗深渊",
    color: "#9a8fe8",
    description: "黑暗中有更大的饥饿",
    maxDepth: 500,
  }),
  Object.freeze({
    id: "hadal",
    name: "熔火禁区",
    color: "#f7a06d",
    description: "巨兽盘踞之地，王者的终点",
    maxDepth: Infinity,
  }),
]);

/*********************************************
 * Private Helper Functions
 ********************************************/

function isPositive(value) {
  return Number.isFinite(value) && value > 0;
}

function nonNegative(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** 返回本局共享属性上限；旧状态默认100，不接受外部任意上限。 */
export function vitalLimit(player) {
  return player.vitalCap === 150 ? 150 : 100;
}

// 所有确认捕获入口共用一次性恩赐，既不增加体长也不重复普通营养结算。
function consumeRare(player, prey) {
  if (player.rareRewardClaimed) return false;
  const healed = 150 - player.health,
    nutrition = 150 - player.hunger;
  player.vitalCap = 150;
  player.rareRewardClaimed = prey.kind;
  player.health = player.stamina = player.hunger = 150;
  player.exhausted = false;
  player.eaten += 1;
  player.lastMeal = { healed, nutrition, growth: 0, rare: prey.kind };
  return true;
}
