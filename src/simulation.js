/**
 * 深海生存的独立规则：处理成长、饥饿、体力、伤害与限时奖励。
 * 模块不依赖渲染器，所有时间均以秒计，所有长度均为游戏内米数。
 */

import { ECOSYSTEM_SPECIES } from "./ecosystem_config.js";
import { REWARDS } from "./reward_config.js";
import { getCharacter } from "./character_rules.js";

/*********************************************
 * Public API
 ********************************************/

/** 根据可选角色创建幼年个体；质量仍以6米个体为单位，返回可更新的玩家状态。 */
export function createPlayer(characterId = "orca") {
  const character = getCharacter(characterId);
  return {
    characterId: character.id,
    health: 100,
    stamina: 100,
    hunger: 100,
    mass: (character.startLength / 6) ** 3,
    length: character.startLength,
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
  // 远征时钟不受物理步长上限影响；最后一帧只扣截止前对应份额的资源。
  // 无效时钟不推进本帧，无效资源步长不影响另行传入的有效远征时钟。
  const elapsed =
    activeStep > 0
      ? Math.min(
          (Number.isFinite(dt) ? Math.max(0, dt) : 0) *
            (roundElapsed / activeStep),
          remaining,
        )
      : 0;

  // 深度改变遇敌难度，生存数值只受体型影响，避免额外的隐性深水惩罚。
  void depth;
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
      100,
      player.stamina + recoveryTime * PLAYER_MOVEMENT.staminaRecovery,
    );
  }
  if (player.exhausted && player.stamina >= 25) player.exhausted = false;

  // 24米满饱约可支撑90秒，给转场和一次领主交战留出空间。
  // 大体型仍需换吃大猎物：小鱼的营养衰减规则不因成长放缓而取消。
  const hungerRate = 0.3 + Math.max(0, player.length - 6) * 0.045;
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
 * 判断吞食资格；普通状态仅能吃更小的鱼，狂食状态可吃自身1.6倍长度以内的鱼。
 * @param {object} player 玩家状态。
 * @param {number} preyLength 猎物长度，必须为正有限数。
 * @returns {boolean} 是否满足普通鱼的体长条件；主宰另走多阶段战斗规则。
 */
export function canEat(player, preyLength) {
  if (player.dead || player.won || player.timedOut || !isPositive(preyLength))
    return false;
  return player.buffs.frenzy > 0
    ? preyLength <= player.length * 1.6
    : preyLength < player.length;
}

/**
 * 吞食成功时更新质量、体长、营养与胜利状态。
 * @param {object} player 玩家状态，将原地更新。
 * @param {{length: number, nutrition?: number, growth?: number}} prey 猎物参数。
 * @returns {boolean} 是否吞食成功；失败不会改变任何玩家数值。
 */
export function consumePrey(player, prey) {
  if (!prey || prey.tier === 3 || !canEat(player, prey.length)) return false;

  // 猎物小于自身一半后，收益按比例平方衰减，迫使大鱼前往更深海域觅食。
  const sizeEfficiency = Math.min(
    1,
    (prey.length / (player.length * 0.5)) ** 2,
  );
  // 小鱼保持真实体长；幼年可穿过密群补给，大体型阶段收益快速递减。
  const schoolEfficiency =
    prey.length < 1 && prey.schoolSize > 1 ? 0.7 * (6 / player.length) ** 4 : 0;
  const efficiency = Math.max(sizeEfficiency, schoolEfficiency);
  applyNutrition(player, prey, efficiency);
  player.eaten += 1;
  return true;
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
  // 线性系数让第一群有明显成长反馈，6米后与原曲线完全相同。
  const juvenileGrowth = Math.min(1, player.length / 6);
  const growth =
    nonNegative(reward.growth, (preyLength / 6) ** 3 * 0.4) *
    safeEfficiency *
    juvenileGrowth;
  const healingCapacity = nutrition * 0.8;
  const healed = Math.min(Math.max(0, 100 - player.health), healingCapacity);
  // 受伤时最多将70%成长投入恢复；轻伤只扣除实际使用的治疗份额。
  const healingShare =
    healingCapacity > 0 ? (healed / healingCapacity) * 0.7 : 0;
  const previousMass = player.mass;
  const previousHunger = player.hunger;
  player.health = Math.min(100, player.health + healed);
  player.hunger = Math.min(100, player.hunger + nutrition);
  player.mass = Math.min(125, player.mass + growth * (1 - healingShare));
  player.length = Math.min(30, 6 * Math.cbrt(player.mass));
  player.lastMeal = {
    healed,
    growth: player.mass - previousMass,
    nutrition: player.hunger - previousHunger,
  };
  player.won = player.length >= 30 && player.bossesDefeated >= 1;
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
  player.health = Math.max(0, player.health - amount);
  player.invulnerable = 1.5;
  player.dead = player.health <= 0;
  return true;
}

/**
 * 收集奖励；同类限时奖励刷新剩余时间，不无限叠加。
 * @param {object} player 玩家状态，将原地更新。
 * @param {'stamina'|'flow'|'frenzy'} kind 体力补给、洋流冲刺或狂食。
 * @returns {boolean} 是否成功收集有效奖励。
 */
export function collectPickup(player, kind) {
  if (player.dead || player.won || player.timedOut) return false;
  if (kind === "stamina") {
    player.stamina = 100;
    player.exhausted = false;
  } else if (kind === "flow") {
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
  const startLength = getCharacter(player.characterId).startLength;
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
