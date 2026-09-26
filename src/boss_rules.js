/** 深海主宰的独立战斗规则：领地、蓄力预警、攻击、虚弱与多次咬击。 */
import { applyNutrition } from "./simulation.js";

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
    ability: species.ability,
    attackCount: 0,
    defeated: false,
  };
}

/**
 * 推进主宰状态机，保留未完成战斗的生命值，脱离领地后结束追击。
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
  } = {},
) {
  const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  boss.biteCooldown = Math.max(0, boss.biteCooldown - elapsed);
  if (boss.defeated) return boss;

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
    if (lineOfSight && distance <= 220) setPhase(boss, "hunt");
    else if (boss.phase === "return") {
      boss.timer += elapsed;
      if (boss.timer >= boss.phaseDuration) setPhase(boss, "dormant");
    }
  }
  if (boss.phase === "dormant" || boss.phase === "return") return boss;

  let remaining = elapsed;
  // 即使帧间隔较大也按顺序结算，不把预警、攻击或虚弱阶段凭空延长。
  for (let transitions = 0; transitions < 64; transitions += 1) {
    if (
      boss.phase === "hunt" &&
      (!lineOfSight || distance > boss.species.length * 1.5 + 25)
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
 * 尝试对主宰咬击；只有虚弱窗口可造成高伤害，狂食只降低体长门槛。
 * @param {object} player 玩家状态，将更新全局咬击冷却和最终战利品。
 * @param {object} boss 主宰状态，将更新生命、冷却和击败状态。
 * @param {{inRange?:boolean}} options 场景确认嘴部是否进入有效范围。
 * @returns {{hit:boolean,damage:number,defeated:boolean,reason:string}} 本次实际攻击结果。
 */
export function hitBoss(player, boss, { inRange = true } = {}) {
  const failure = (reason) => ({
    hit: false,
    damage: 0,
    defeated: false,
    reason,
  });
  if (player.dead || player.won) return failure("player_unavailable");
  if (boss.defeated) return failure("boss_defeated");
  if (!inRange) return failure("out_of_range");
  const minimum = player.buffs.frenzy > 0 ? 21 : boss.species.minAttackLength;
  if (player.length < minimum) return failure("too_small");
  if (player.biteCooldown > 0 || boss.biteCooldown > 0)
    return failure("cooldown");

  const weak = boss.phase === "recover";
  const strength =
    14 + Math.max(-3, player.length - 24) * 1.3 + (weak ? 23 : 0);
  // 单次伤害不超过总生命的24%，即使最大体长加狂食也无法跳过多次交战。
  const damage = Math.min(boss.health, boss.maxHealth * 0.24, strength);
  boss.health = Math.max(0, boss.health - damage);
  player.biteCooldown = 1.2;
  boss.biteCooldown = 1.2;
  if (boss.health > 0) {
    if (boss.phase === "dormant" || boss.phase === "return")
      setPhase(boss, "hunt");
    return {
      hit: true,
      damage,
      defeated: false,
      reason: weak ? "weak_point" : "hit",
    };
  }

  boss.defeated = true;
  setPhase(boss, "defeated");
  player.bossesDefeated += 1;
  applyNutrition(player, boss.species);
  return { hit: true, damage, defeated: true, reason: "defeated" };
}

/*********************************************
 * Types and Data Structures
 ********************************************/

/** 主宰均属于tier3，必须通过hitBoss交战；不能作为普通猎物直接吞食。 */
export const BOSS_SPECIES = Object.freeze(
  [
    {
      kind: "kraken",
      label: "漩涡主宰 · 克拉肯",
      length: 42,
      health: 180,
      minAttackLength: 24,
      speed: 26,
      damage: 40,
      ability: "vortex",
      depthMin: 360,
      depthMax: 560,
      nutrition: 100,
      growth: 30,
      tier: 3,
      windupDuration: 2.1,
      attackDuration: 1.4,
    },
    {
      kind: "mayan",
      label: "遗迹主宰 · 玛雅巨兽",
      length: 48,
      health: 210,
      minAttackLength: 24,
      speed: 27,
      damage: 52,
      ability: "pulse",
      depthMin: 440,
      depthMax: 640,
      nutrition: 100,
      growth: 34,
      tier: 3,
      windupDuration: 2.2,
      attackDuration: 1,
    },
    {
      kind: "hydra",
      label: "三首主宰 · 海德拉",
      length: 46,
      health: 220,
      minAttackLength: 24,
      speed: 28,
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
      length: 55,
      health: 240,
      minAttackLength: 24,
      speed: 30,
      damage: 65,
      ability: "charge",
      depthMin: 560,
      depthMax: 720,
      nutrition: 100,
      growth: 40,
      tier: 3,
      windupDuration: 1.8,
      attackDuration: 0.9,
    },
  ].map((species) => Object.freeze(species)),
);

/*********************************************
 * Private Helper Functions
 ********************************************/

function setPhase(boss, phase) {
  boss.phase = phase;
  boss.timer = 0;
  boss.phaseDuration = {
    dormant: Infinity,
    hunt: 1,
    windup: boss.species.windupDuration,
    attack: boss.species.attackDuration,
    recover: 3,
    return: 4,
    defeated: Infinity,
  }[phase];
  if (phase === "attack") boss.attackCount += 1;
}
