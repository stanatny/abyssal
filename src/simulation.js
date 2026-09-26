/**
 * 深海生存的独立规则：处理成长、饥饿、体力、伤害与限时奖励。
 * 模块不依赖渲染器，所有时间均以秒计，所有长度均为游戏内米数。
 */

/*********************************************
 * Public API
 ********************************************/

/** 创建一条幼年虎鲸；无参数，返回可由游戏循环更新的玩家状态。 */
export function createPlayer() {
  return {
    health: 100,
    stamina: 100,
    hunger: 100,
    mass: 1,
    length: 6,
    eaten: 0,
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
 * 推进生存状态，返回本帧结尾是否仍可冲刺。
 * @param {object} player 玩家状态，将原地更新。
 * @param {number} dt 经过的秒数，非正数与非有限值不会推进时间。
 * @param {object} options 冲刺意图与当前深度；深度保留给场景接口。
 * @returns {{boosting: boolean}} 可用于选择普通速度或冲刺速度。
 */
export function tickVitals(player, dt, { boosting = false, depth = 18 } = {}) {
  const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  if (player.dead || player.won) return { boosting: false };

  // 深度改变遇敌难度，生存数值只受体型影响，避免额外的隐性深水惩罚。
  void depth;
  const flowTime = Math.min(elapsed, player.buffs.flow);
  const paidTime = elapsed - flowTime;

  if (boosting && !player.exhausted && player.stamina > 0) {
    player.stamina = Math.max(0, player.stamina - paidTime * 22);
    if (player.stamina === 0) player.exhausted = true;
  } else if (!boosting || flowTime < elapsed) {
    const recoveryTime = boosting ? paidTime : elapsed;
    player.stamina = Math.min(100, player.stamina + recoveryTime * 16);
  }
  if (player.exhausted && player.stamina >= 25) player.exhausted = false;

  const hungerRate = 0.65 + Math.max(0, player.length - 6) * 0.1175;
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

  return {
    boosting:
      boosting &&
      !player.dead &&
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
  if (player.dead || player.won || !isPositive(preyLength)) return false;
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
  const efficiency = Math.min(1, (prey.length / (player.length * 0.5)) ** 2);
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
  if (player.dead || player.won) return null;
  const safeEfficiency = Math.min(1, nonNegative(efficiency, 1));
  const preyLength = nonNegative(reward.length, 6);
  const nutrition =
    nonNegative(reward.nutrition, 10 + preyLength * 1.5) * safeEfficiency;
  const growth =
    nonNegative(reward.growth, (preyLength / 6) ** 3 * 0.4) * safeEfficiency;
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
  if (player.dead || player.won) return false;
  if (kind === "stamina") {
    player.stamina = 100;
    player.exhausted = false;
  } else if (kind === "flow") {
    player.buffs.flow = Math.max(12, player.buffs.flow);
  } else if (kind === "frenzy") {
    player.buffs.frenzy = Math.max(10, player.buffs.frenzy);
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
  return Math.max(0, Math.min(100, ((player.length - 6) / 24) * 100));
}

/*********************************************
 * Types and Data Structures
 ********************************************/

/**
 * 可生成的海洋生物；growth为质量增量，nutrition为基础饥饿恢复量。
 * depthMin/depthMax为活动海深，speed为巡游速度；tier2追击速度低于玩家冲刺速度。
 * schoolSize为默认鱼群规模，schoolSizeMin/Max可供场景随机选择；主宰配置另行管理。
 */
export const SPECIES = Object.freeze(
  [
    {
      kind: "fish",
      label: "珊瑚鱼",
      length: 2,
      nutrition: 12,
      growth: 0.12,
      speed: 5,
      tier: 1,
      schoolSize: 12,
      schoolSizeMin: 10,
      schoolSizeMax: 14,
      predator: false,
      depthMin: 5,
      depthMax: 90,
    },
    {
      kind: "tuna",
      label: "蓝鳍金枪鱼",
      length: 4,
      nutrition: 18,
      growth: 0.3,
      speed: 10,
      tier: 1,
      schoolSize: 6,
      predator: false,
      depthMin: 15,
      depthMax: 170,
    },
    {
      kind: "ray",
      label: "巨型蝠鲼",
      length: 7,
      nutrition: 24,
      growth: 0.8,
      speed: 8,
      tier: 1,
      schoolSize: 3,
      predator: false,
      depthMin: 40,
      depthMax: 240,
    },
    {
      kind: "shark",
      label: "大白鲨",
      length: 10,
      nutrition: 32,
      growth: 2.2,
      speed: 17,
      tier: 2,
      predator: true,
      depthMin: 65,
      depthMax: 280,
    },
    {
      kind: "angler",
      label: "深渊鮟鱇",
      length: 14,
      nutrition: 40,
      growth: 5.8,
      speed: 13,
      tier: 2,
      predator: true,
      depthMin: 140,
      depthMax: 400,
    },
    {
      kind: "squid",
      label: "大王乌贼",
      length: 18,
      nutrition: 52,
      growth: 10,
      speed: 16,
      tier: 2,
      predator: true,
      depthMin: 180,
      depthMax: 470,
    },
    {
      kind: "dunkleosteus",
      label: "邓氏鱼",
      length: 21,
      nutrition: 68,
      growth: 19,
      speed: 15,
      tier: 2,
      predator: true,
      depthMin: 250,
      depthMax: 590,
    },
  ].map((species) => Object.freeze(species)),
);

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
