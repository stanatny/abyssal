/** 普通捕食者的低频特殊能力：独立处理预警、释放、恢复与错开的冷却。 */

/*********************************************
 * Public API
 ********************************************/

/**
 * 为一条普通生物创建技能状态，不具备技能的物种返回enabled=false的空闲状态。
 * @param {{kind:string,speed:number}} species 生物配置。
 * @param {number|string} seed 个体种子，用于确定性错开首次释放与后续冷却。
 * @returns {object} 可原地更新的技能状态，timer表示当前阶段已过秒数。
 */
export function createHunterState(species, seed = 1) {
  const ability = HUNTER_ABILITIES[species.kind] || null;
  const state = {
    species,
    ability,
    enabled: !!ability,
    type: ability?.type || null,
    tell: ability?.tell || "",
    phase: "idle",
    timer: 0,
    phaseDuration: Infinity,
    cooldown: Infinity,
    justTriggered: false,
    triggerCount: 0,
    speedMultiplier: 1,
    damageMultiplier: 1,
    effectDuration: ability?.effectDuration || 0,
    effectRadius: ability?.effectRadius || 0,
    randomState: hashSeed(`${species.kind}:${seed}`),
  };
  if (ability) state.cooldown = 8 + nextRandom(state) * 10;
  return state;
}

/**
 * 推进技能状态；冷却只在追击时流逝，避免远处全部冷却完毕后同时开场释放。
 * @param {object} state createHunterState返回的状态，将原地更新。
 * @param {number} dt 经过的秒数，非正数与非有限值不推进状态。
 * @param {{hunting?:boolean,distance?:number,lineOfSight?:boolean,playerAlive?:boolean}} context 当前追击、距离、视线与存活条件。
 * @returns {object} 更新后的同一状态；justTriggered仅在本次调用进入active时为true。
 */
export function tickHunter(
  state,
  dt,
  {
    hunting = false,
    distance = Infinity,
    lineOfSight = true,
    playerAlive = true,
  } = {},
) {
  state.justTriggered = false;
  const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  if (!state.enabled || elapsed === 0) return state;
  const pursuing = hunting && playerAlive;
  const visible = pursuing && lineOfSight;
  const canStart = visible && distance <= state.ability.triggerDistance;

  // 玩家绕进遮挡后，未完成的突袭结束并进入恢复，已生成的墨云由场景独立计时。
  if (
    (state.phase === "windup" || state.phase === "active") &&
    (!visible || distance > state.ability.triggerDistance * 1.5)
  ) {
    setPhase(state, "recover");
  }

  let remaining = elapsed;
  for (
    let transitions = 0;
    transitions < 32 && remaining > 0;
    transitions += 1
  ) {
    if (state.phase === "idle") {
      if (!canStart) {
        if (pursuing) state.cooldown = Math.max(0, state.cooldown - remaining);
        break;
      }
      const waiting = Math.min(remaining, state.cooldown);
      state.cooldown = Math.max(0, state.cooldown - waiting);
      remaining -= waiting;
      if (state.cooldown > 1e-9) break;
      state.cooldown =
        state.ability.cooldownMin +
        nextRandom(state) *
          (state.ability.cooldownMax - state.ability.cooldownMin);
      setPhase(state, "windup");
      continue;
    }

    const step = Math.min(
      remaining,
      Math.max(0, state.phaseDuration - state.timer),
    );
    state.timer += step;
    remaining -= step;
    if (pursuing) state.cooldown = Math.max(0, state.cooldown - step);
    if (state.timer + 1e-9 < state.phaseDuration) break;
    const next = { windup: "active", active: "recover", recover: "idle" }[
      state.phase
    ];
    setPhase(state, next);
    if (next === "active") {
      state.justTriggered = true;
      state.triggerCount += 1;
    }
  }
  return state;
}

/*********************************************
 * Types and Data Structures
 ********************************************/

/**
 * 技能元数据供场景与图鉴共享；activeSpeed为释放时速度，其他阶段倍率乘以常规追击速度。
 * 冷却为两次开始蓄力之间的追击时间。effectDuration/effectRadius仅描述效果，由场景生成表现。
 */
export const HUNTER_ABILITIES = Object.freeze(
  Object.fromEntries(
    Object.entries({
      shark: {
        type: "burst",
        label: "破浪突袭",
        tell: "白鲨压低身体蓄力 · 侧向转弯躲开突袭",
        triggerDistance: 45,
        windupDuration: 0.8,
        activeDuration: 1.1,
        recoverDuration: 2.8,
        cooldownMin: 16,
        cooldownMax: 24,
        windupSpeedMultiplier: 0.55,
        activeSpeed: 34,
        recoverySpeedMultiplier: 0.6,
        damageMultiplier: 1,
        effectDuration: 1.1,
        effectRadius: 0,
      },
      hammerhead: {
        type: "burst",
        label: "横扫突袭",
        tell: "锤头鲨横摆头部 · 避开它的转向内侧",
        triggerDistance: 32,
        windupDuration: 1,
        activeDuration: 1.1,
        recoverDuration: 2.5,
        cooldownMin: 18,
        cooldownMax: 28,
        windupSpeedMultiplier: 0.5,
        activeSpeed: 36,
        recoverySpeedMultiplier: 0.5,
        damageMultiplier: 1.1,
        effectDuration: 1.1,
        effectRadius: 0,
      },
      sperm_whale: {
        type: "burst",
        label: "鲸首冲撞",
        tell: "抹香鲸压低方形头部 · 立刻向侧面让开",
        triggerDistance: 75,
        windupDuration: 1.5,
        activeDuration: 1.7,
        recoverDuration: 3.5,
        cooldownMin: 18,
        cooldownMax: 28,
        windupSpeedMultiplier: 0.5,
        activeSpeed: 43,
        recoverySpeedMultiplier: 0.5,
        damageMultiplier: 1.6,
        effectDuration: 1.7,
        effectRadius: 0,
      },
      mosasaur: {
        type: "burst",
        label: "摆尾截猎",
        tell: "沧龙收拢鳍肢 · 离开它锁定的直线",
        triggerDistance: 62,
        windupDuration: 1.1,
        activeDuration: 1.3,
        recoverDuration: 2.8,
        cooldownMin: 18,
        cooldownMax: 28,
        windupSpeedMultiplier: 0.5,
        activeSpeed: 42,
        recoverySpeedMultiplier: 0.5,
        damageMultiplier: 1.4,
        effectDuration: 1.3,
        effectRadius: 0,
      },
      pliosaur: {
        type: "heavy_bite",
        label: "巨颌突进",
        tell: "上龙张开巨颌 · 不要迎面游入",
        triggerDistance: 34,
        windupDuration: 1,
        activeDuration: 0.8,
        recoverDuration: 3,
        cooldownMin: 18,
        cooldownMax: 28,
        windupSpeedMultiplier: 0.5,
        activeSpeed: 34,
        recoverySpeedMultiplier: 0.5,
        damageMultiplier: 1.7,
        effectDuration: 0.8,
        effectRadius: 0,
      },
      plesiosaur: {
        type: "heavy_bite",
        label: "长颈截击",
        tell: "蛇颈龙探头蓄力 · 绕开长颈前方",
        triggerDistance: 38,
        windupDuration: 1.3,
        activeDuration: 0.9,
        recoverDuration: 2.8,
        cooldownMin: 18,
        cooldownMax: 28,
        windupSpeedMultiplier: 0.5,
        activeSpeed: 30,
        recoverySpeedMultiplier: 0.5,
        damageMultiplier: 1.3,
        effectDuration: 0.9,
        effectRadius: 0,
      },
      basilosaurus: {
        type: "burst",
        label: "长躯围猎",
        tell: "龙王鲸开始摆尾 · 别被逼向岩壁",
        triggerDistance: 65,
        windupDuration: 1.2,
        activeDuration: 1.6,
        recoverDuration: 3,
        cooldownMin: 18,
        cooldownMax: 28,
        windupSpeedMultiplier: 0.5,
        activeSpeed: 40,
        recoverySpeedMultiplier: 0.5,
        damageMultiplier: 1.4,
        effectDuration: 1.6,
        effectRadius: 0,
      },
      megalodon: {
        type: "burst",
        label: "深海猛袭",
        tell: "巨齿鲨锁定冲撞路线 · 横向闪避",
        triggerDistance: 85,
        windupDuration: 1.4,
        activeDuration: 1.7,
        recoverDuration: 3.4,
        cooldownMin: 18,
        cooldownMax: 28,
        windupSpeedMultiplier: 0.5,
        activeSpeed: 46,
        recoverySpeedMultiplier: 0.5,
        damageMultiplier: 1.7,
        effectDuration: 1.7,
        effectRadius: 0,
      },
      octopus: {
        type: "ink",
        label: "防御墨幕",
        tell: "章鱼收拢八腕 · 绕开即将喷出的防御墨云",
        triggerDistance: 28,
        windupDuration: 1,
        activeDuration: 0.3,
        recoverDuration: 2,
        cooldownMin: 22,
        cooldownMax: 30,
        windupSpeedMultiplier: 0.7,
        activeSpeed: 24,
        recoverySpeedMultiplier: 0.8,
        damageMultiplier: 1,
        effectDuration: 6,
        effectRadius: 22,
      },
      angler: {
        type: "lure",
        label: "诱光闪烁",
        tell: "鮟鱇诱光开始闪烁 · 拉开距离避开强光",
        triggerDistance: 30,
        windupDuration: 1.1,
        activeDuration: 1.4,
        recoverDuration: 2.2,
        cooldownMin: 20,
        cooldownMax: 28,
        windupSpeedMultiplier: 0.65,
        activeSpeed: 15,
        recoverySpeedMultiplier: 0.7,
        damageMultiplier: 1.2,
        effectDuration: 2.5,
        effectRadius: 24,
      },
      dunkleosteus: {
        type: "heavy_bite",
        label: "重颚撕咬",
        tell: "邓氏鱼张开重颚 · 冲刺拉开距离",
        triggerDistance: 20,
        windupDuration: 0.85,
        activeDuration: 0.55,
        recoverDuration: 2.4,
        cooldownMin: 18,
        cooldownMax: 26,
        windupSpeedMultiplier: 0.5,
        activeSpeed: 22,
        recoverySpeedMultiplier: 0.55,
        damageMultiplier: 1.65,
        effectDuration: 0.55,
        effectRadius: 0,
      },
    }).map(([kind, ability]) => [kind, Object.freeze(ability)]),
  ),
);

/*********************************************
 * Private Helper Functions
 ********************************************/

function setPhase(state, phase) {
  const ability = state.ability;
  state.phase = phase;
  state.timer = 0;
  state.phaseDuration = {
    idle: Infinity,
    windup: ability.windupDuration,
    active: ability.activeDuration,
    recover: ability.recoverDuration,
  }[phase];
  state.speedMultiplier =
    phase === "active"
      ? ability.activeSpeed /
        (state.species.chaseSpeed ||
          Math.min(25, Math.max(15, state.species.speed || 15)))
      : phase === "windup"
        ? ability.windupSpeedMultiplier
        : phase === "recover"
          ? ability.recoverySpeedMultiplier
          : 1;
  state.damageMultiplier = phase === "active" ? ability.damageMultiplier : 1;
}

function hashSeed(value) {
  let result = 2166136261;
  for (const char of value)
    result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return result >>> 0 || 1;
}

function nextRandom(state) {
  state.randomState =
    (Math.imul(state.randomState, 1664525) + 1013904223) >>> 0;
  return state.randomState / 4294967296;
}
