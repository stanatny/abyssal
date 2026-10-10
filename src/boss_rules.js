import { ODYSSEY_LORDS } from "./odyssey_lords.js";
import { PENGLAI_LORDS } from "./penglai_lords.js";
import { AMAZON_LORDS } from "./amazon_lords.js";
/** 深海主宰的独立战斗规则：领地、蓄力预警、攻击、恢复与按配置分轮有效攻击。 */
import { applyNutrition, vitalLimit } from "./simulation.js";

/*********************************************
 * Public API
 ********************************************/

/**
 * 创建主宰状态，模型与空间位置由场景持有。
 * @param {object} species BOSS_SPECIES中的一种配置。
 * @returns {object} 可原地更新的主宰状态；timer为当前阶段已过秒数。
 */
export function createBossState(species) {
  return {
    species,
    health: species.health,
    maxHealth: species.health,
    phase: "dormant",
    timer: 0,
    phaseDuration: Infinity,
    biteCooldown: 0,
    contactArmed: true,
    contactReleaseTime: 0,
    openingSpent: false,
    ability: species.ability,
    attackCount: 0,
    validatedHits: 0,
    defeated: false,
    pursuitStarted: false,
  };
}

/** 持续追击守卫在入域或配置的解锁时记住玩家；锁定与新状态仍隔离追击。 */
export function bossEngagement(boss, atHome) {
  if (boss.defeated || boss.locked) return false;
  if (
    boss.species.persistentPursuit &&
    (atHome || boss.species.pursuitOnUnlock)
  )
    boss.pursuitStarted = true;
  return atHome || boss.pursuitStarted;
}

/**
 * 推进主宰状态机，保留未完成战斗的生命值，普通领主脱离领地后结束追击，持续追击守卫由场景保留交战状态。
 * @param {object} boss createBossState返回的状态，将原地更新。
 * @param {number} dt 经过的秒数，非正数与非有限值不推进时间。
 * @param {object} context 领地内与否、距离、视线以及玩家是否存活。
 * @returns {object} 更新后的boss；场景可按phase/ability/attackCount触发对应表现。
 */
export function tickBoss(
  boss,
  dt,
  {
    inTerritory = false,
    distance = Infinity,
    lineOfSight = true,
    playerAlive = true,
    disoriented = false,
  } = {},
) {
  const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  boss.biteCooldown = Math.max(0, boss.biteCooldown - elapsed);
  if (boss.defeated) return boss;
  if (disoriented) {
    if (boss.phase !== "disoriented") setPhase(boss, "disoriented");
    boss.timer += elapsed;
    return boss;
  }
  if (boss.phase === "disoriented")
    setPhase(boss, inTerritory ? "hunt" : "return");

  if (!inTerritory || !playerAlive) {
    if (boss.phase !== "dormant" && boss.phase !== "return")
      setPhase(boss, "return");
    if (boss.phase === "return") {
      boss.timer += elapsed;
      if (boss.timer >= boss.phaseDuration) setPhase(boss, "dormant");
    }
    return boss;
  }

  if (boss.phase === "dormant" || boss.phase === "return") {
    if ((lineOfSight && distance <= 220) || boss.pursuitStarted)
      setPhase(boss, "hunt");
    else if (boss.phase === "return") {
      boss.timer += elapsed;
      if (boss.timer >= boss.phaseDuration) setPhase(boss, "dormant");
    }
  }
  if (boss.phase === "dormant" || boss.phase === "return") return boss;

  let remaining = elapsed;
  // 即使帧间隔较大也按顺序结算，不把预警、攻击或恢复阶段凭空延长。
  for (let transitions = 0; transitions < 64; transitions += 1) {
    if (
      boss.phase === "hunt" &&
      (!lineOfSight || distance > boss.species.engageRange)
    ) {
      boss.timer = 0;
      break;
    }
    const step = Math.min(
      remaining,
      Math.max(0, boss.phaseDuration - boss.timer),
    );
    boss.timer += step;
    remaining -= step;
    if (boss.timer + 1e-9 < boss.phaseDuration) break;
    const next = {
      hunt: "windup",
      windup: "attack",
      attack: "recover",
      recover: "hunt",
    }[boss.phase];
    setPhase(boss, next);
    if (remaining <= 0) break;
  }
  return boss;
}

/**
 * 记录嘴部是否已离开实体；一次近身进攻之后须脱离至少0.35秒才能再次咬击。
 * @param {object} boss 主宰状态。
 * @param {boolean} touching 嘴部小球是否仍接触实际模型，不能使用宽相包围盒代替。
 * @param {number} dt 本帧有效游戏秒数。
 * @returns {boolean} 当前是否允许一次新的接触攻击。
 */
export function updateBossContact(boss, touching, dt) {
  if (touching) boss.contactReleaseTime = 0;
  else {
    boss.contactReleaseTime += Number.isFinite(dt) ? Math.max(0, dt) : 0;
    if (boss.contactReleaseTime >= 0.35) boss.contactArmed = true;
  }
  return boss.contactArmed;
}

/**
 * 判断朝内的侧面、背部或尾后进攻；仅正面护甲和朝外贴靠不算弱点。
 * @param {object} context 世界坐标与单位朝向；可提供实际模型bossRight，支持领主垂直转身。
 * @returns {boolean} 是否属于可以伤害领主的侧翼进攻方向。
 */
export function isBossFlankContact({
  bossPosition,
  bossForward,
  bossRight,
  playerPosition,
  playerForward,
}) {
  const offset = {
    x: playerPosition.x - bossPosition.x,
    y: playerPosition.y - bossPosition.y,
    z: playerPosition.z - bossPosition.z,
  };
  const distance = Math.hypot(offset.x, offset.y, offset.z);
  const horizontal = Math.hypot(bossForward.x, bossForward.z);
  if (distance < 0.001 || (!bossRight && horizontal < 0.001)) return false;
  const side = Math.abs(
    bossRight
      ? (bossRight.x * offset.x +
          bossRight.y * offset.y +
          bossRight.z * offset.z) /
          distance
      : (-bossForward.z * offset.x + bossForward.x * offset.z) /
          horizontal /
          distance,
  );
  const longitudinal =
    (bossForward.x * offset.x +
      bossForward.y * offset.y +
      bossForward.z * offset.z) /
    distance;
  const facing =
    -(
      playerForward.x * offset.x +
      playerForward.y * offset.y +
      playerForward.z * offset.z
    ) / distance;
  const dorsal = Math.sqrt(
    Math.max(0, 1 - side * side - longitudinal * longitudinal),
  );
  return (
    longitudinal <= 0.55 &&
    (side >= 0.35 || dorsal >= 0.35 || longitudinal < -0.35) &&
    facing >= 0.15
  );
}

/**
 * 结算接触后的自动咬击；每位领主恰需三次有效进攻，交战始终使用真实体长。
 * @param {object} player 玩家状态，将更新全局咬击冷却、有效命中的饱食补给和最终战利品。
 * @param {object} boss 主宰状态，将更新生命、冷却和击败状态。
 * @param {{inRange?:boolean,isFlank?:boolean}} options 场景确认嘴部接触实体、无遮挡且朝内接近弱点（恢复期允许正面）。
 * @returns {{hit:boolean,damage:number,hungerRestored:number,defeated:boolean,reason:string}} 本次攻击结果；hungerRestored仅含这一口的实际饱食补给，不含击败战利品。
 */
export function hitBoss(
  player,
  boss,
  { inRange = false, isFlank = false } = {},
) {
  const failure = (reason) => ({
    hit: false,
    damage: 0,
    hungerRestored: 0,
    defeated: false,
    reason,
  });
  if (player.dead || player.won || player.timedOut)
    return failure("player_unavailable");
  if (boss.defeated) return failure("boss_defeated");
  if (boss.locked) return failure("guardian_locked");
  const minimum = boss.species.minAttackLength;
  if (player.length < minimum) return failure("too_small");
  if (!inRange) return failure("out_of_range");
  if (boss.species.guardedPhases?.includes(boss.phase))
    return failure("shell_guarded");
  if (!bossCounterOpen(boss)) return failure("opening_closed");
  if (boss.phase !== "recover" && !isFlank) return failure("armored_angle");
  if (player.biteCooldown > 0 || boss.biteCooldown > 0)
    return failure("cooldown");
  if (!boss.contactArmed) return failure("must_disengage");
  if (boss.openingSpent) return failure("opening_spent");

  return settleBossHit(player, boss);
}

/** 有效鱼雷代替一口近身攻击，保留真实25米门槛、同轮破绽限制及同一击败结算。 */
export function hitBossWithTorpedo(player, boss) {
  return hitBossWithRangedImpact(player, boss, "mechanical_shark");
}

/** 尸爆等同一次鱼雷命中，不绕过角色、门槛、剑阵或同轮破绽。 */
export function hitBossWithCorpseBlast(player, boss) {
  return hitBossWithRangedImpact(player, boss, "zombie_shark");
}

function hitBossWithRangedImpact(player, boss, characterId) {
  if (
    player.characterId !== characterId ||
    player.dead ||
    player.won ||
    player.timedOut ||
    boss.defeated ||
    boss.locked ||
    boss.species.guardedPhases?.includes(boss.phase) ||
    player.length < boss.species.minAttackLength ||
    player.biteCooldown > 0 ||
    boss.biteCooldown > 0
  )
    return {
      hit: false,
      damage: 0,
      hungerRestored: 0,
      defeated: false,
      reason: "ineligible",
    };
  if (!bossCounterOpen(boss))
    return {
      hit: false,
      damage: 0,
      hungerRestored: 0,
      defeated: false,
      reason: "opening_closed",
    };
  if (boss.openingSpent)
    return {
      hit: false,
      damage: 0,
      hungerRestored: 0,
      defeated: false,
      reason: "opening_spent",
    };
  return settleBossHit(player, boss);
}

// 有效近身、鱼雷和尸爆共用命中数、食物、战利品和持久击败，不复制目标判定。
function settleBossHit(player, boss) {
  // 整数命中数决定击败，最后一口直接清零，不让浮点余量要求额外进攻。
  const requiredHits = bossRequiredHits(boss.species);
  const remainingHits = requiredHits - boss.validatedHits;
  const damage = boss.health / remainingHits;
  boss.validatedHits += 1;
  boss.health =
    boss.validatedHits === requiredHits ? 0 : Math.max(0, boss.health - damage);
  // 只对真正造成伤害的一口补饱食，不提前发放击败后的治疗或成长奖励。
  const hungerRestored =
    damage > 0
      ? Math.min(
          BOSS_BITE_HUNGER,
          Math.max(0, vitalLimit(player) - player.hunger),
        )
      : 0;
  player.hunger += hungerRestored;
  player.biteCooldown = 1.2;
  boss.biteCooldown = 1.2;
  boss.contactArmed = false;
  boss.contactReleaseTime = 0;
  boss.openingSpent = true;
  if (boss.validatedHits < requiredHits) {
    if (boss.phase === "dormant" || boss.phase === "return")
      setPhase(boss, "hunt");
    return {
      hit: true,
      damage,
      hungerRestored,
      defeated: false,
      reason: "hit",
    };
  }

  boss.defeated = true;
  setPhase(boss, "defeated");
  player.bossesDefeated += 1;
  applyNutrition(player, boss.species);
  return {
    hit: true,
    damage,
    hungerRestored,
    defeated: true,
    reason: "defeated",
  };
}

/*********************************************
 * Types and Data Structures
 ********************************************/

/** 有效咬伤领主时恢复的饱食上限，实际恢复不得超过100点总上限。 */
export const BOSS_BITE_HUNGER = 8;

/** 普通领主默认的有效攻击数；体长、狂食和恢复阶段均不会改变次数。 */
export const BOSS_REQUIRED_HITS = 3;

/** 普通领主三次，明确配置的终局守卫使用自己的次数；HUD和结算共用。 */
export function bossRequiredHits(species) {
  return species.requiredHits ?? BOSS_REQUIRED_HITS;
}

/** 指定反击阶段的守卫不保留收势以外的可用破绽；其他领主沿用原规则。 */
export function bossCounterOpen(boss) {
  return (
    !boss.species.counterPhases ||
    boss.species.counterPhases.includes(boss.phase)
  );
}

/** 有界转向处理正后方目标；直立守卫的升降运动不依赖模型的水平朝向。 */
export function steerBossPursuit(current, desired, dt, turnRate, out) {
  const from = Math.atan2(current.x, current.z);
  const to = Math.atan2(desired.x, desired.z);
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  const limit = Math.max(0, dt) * turnRate;
  const yaw = from + Math.max(-limit, Math.min(limit, delta));
  const horizontal = Math.hypot(desired.x, desired.z);
  out.x = Math.sin(yaw) * horizontal;
  out.y = desired.y;
  out.z = Math.cos(yaw) * horizontal;
  return out;
}

/** 未指定地图领地时采用的领域半径；固定守卫仍使用各地图的实际配置。 */
export const BOSS_DEFAULT_TERRITORY_RADIUS = 125;

/** 主宰均属于tier3，必须通过hitBoss交战；不能作为普通猎物直接吞食。 */
export const BOSS_SPECIES = Object.freeze(
  [
    {
      kind: "kraken",
      label: "漩涡主宰 · 克拉肯",
      length: 48,
      health: 180,
      minAttackLength: 25,
      speed: 37,
      engageRange: 135,
      lockWindow: 0.8,
      abilityRadius: 42,
      damage: 40,
      ability: "vortex",
      depthMin: 360,
      depthMax: 560,
      nutrition: 100,
      growth: 30,
      tier: 3,
      windupDuration: 2.3,
      attackDuration: 6,
      abilityTimings: Object.freeze({
        vortex: Object.freeze({ windup: 2.3, attack: 6, recover: 4 }),
      }),
    },
    {
      kind: "mayan",
      label: "遗迹主宰 · 格兰玛雅",
      length: 55,
      health: 210,
      minAttackLength: 25,
      speed: 38,
      engageRange: 145,
      lockWindow: 0.75,
      abilityRadius: 160,
      damage: 52,
      ability: "pulse",
      depthMin: 440,
      depthMax: 640,
      nutrition: 100,
      growth: 34,
      tier: 3,
      windupDuration: 2.2,
      attackDuration: 1.6,
    },
    {
      kind: "hydra",
      label: "三首主宰 · 海德拉",
      length: 53,
      health: 220,
      minAttackLength: 25,
      speed: 39,
      engageRange: 155,
      lockWindow: 0.6,
      projectileSpeed: 74,
      damage: 46,
      ability: "volley",
      depthMin: 480,
      depthMax: 690,
      nutrition: 100,
      growth: 36,
      tier: 3,
      windupDuration: 2.5,
      attackDuration: 1.8,
    },
    {
      kind: "leviathan",
      label: "深渊主宰 · 利维坦",
      length: 63,
      health: 240,
      minAttackLength: 25,
      speed: 40,
      engageRange: 130,
      lockWindow: 0.7,
      chargeSpeed: 100,
      damage: 65,
      ability: "charge",
      depthMin: 560,
      depthMax: 720,
      nutrition: 100,
      growth: 40,
      tier: 3,
      windupDuration: 1.8,
      attackDuration: 1.65,
    },
    {
      kind: "abyss_weaver",
      label: "冰下主宰 · 星渊织母",
      alien: true,
      length: 58,
      health: 210,
      minAttackLength: 25,
      speed: 35,
      engageRange: 130,
      lockWindow: 0.8,
      abilityRadius: 85,
      damage: 32,
      ability: "loom",
      depthMin: 650,
      depthMax: 820,
      nutrition: 100,
      growth: 30,
      tier: 3,
      windupDuration: 2.4,
      attackDuration: 2.6,
      abilityTimings: { loom: { windup: 2.4, attack: 2.6, recover: 4 } },
    },
    {
      kind: "lumen_stalker",
      label: "辉渊主宰 · 辉渊巡狩者",
      alien: true,
      length: 62,
      health: 210,
      minAttackLength: 25,
      speed: 35,
      engageRange: 88,
      lockWindow: 0.8,
      damage: 38,
      ability: "lash",
      depthMin: 390,
      depthMax: 620,
      nutrition: 100,
      growth: 30,
      tier: 3,
      windupDuration: 2.4,
      attackDuration: 1.8,
      abilityTimings: { lash: { windup: 2.4, attack: 1.8, recover: 4 } },
    },
    ...AMAZON_LORDS,
    ...PENGLAI_LORDS,
    ...ODYSSEY_LORDS,
  ].map((species) => Object.freeze(species)),
);

/*********************************************
 * Private Helper Functions
 ********************************************/

function setPhase(boss, phase) {
  // 一次破绽只结算一次伤害；完整释放下一轮技能后才重新开放，撤出或喷墨不重置。
  if (boss.phase === "attack" && phase === "recover") boss.openingSpent = false;
  boss.phase = phase;
  boss.timer = 0;
  if (phase === "windup" && boss.species.abilityCycle?.length)
    boss.ability =
      boss.species.abilityCycle[
        boss.attackCount % boss.species.abilityCycle.length
      ];
  const timings = boss.species.abilityTimings?.[boss.ability];
  boss.phaseDuration = {
    dormant: Infinity,
    hunt: boss.species.huntDuration ?? 1,
    windup: timings?.windup ?? boss.species.windupDuration,
    attack: timings?.attack ?? boss.species.attackDuration,
    recover: timings?.recover ?? 3,
    return: 4,
    defeated: Infinity,
    disoriented: Infinity,
  }[phase];
  if (phase === "attack") boss.attackCount += 1;
}
