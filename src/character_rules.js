import { MECHANICAL_RULES } from "./mechanical_shark_rules.js";
import { MAX_SWIM_PITCH } from "./steering_rules.js";

/** 可选角色统一拥有一个主动技能与一个被动技能；数据与移动/冷却规则不依赖渲染器。 */
export const PLAYER_CHARACTERS = Object.freeze([
  {
    id: "orca",
    kind: "orca",
    name: "虎鲸",
    available: true,
    startLength: 3,
    description: "高速追猎 · 远距侦察",
    ability: "回声定位 · 探测20秒，冷却60秒",
    active: {
      id: "sonar",
      name: "回声定位",
      duration: 20,
      cooldown: 60,
      range: 260,
      description:
        "探测周围生物20秒，前方显示体长与捕食资格，雷达保留周围回声。",
    },
    passive: {
      id: "pursuit",
      name: "海洋疾驰",
      description: "冲刺速度比基础速度提高30%，达到41.6米/秒。",
    },
  },
  {
    id: "squid",
    kind: "squid",
    name: "大王乌贼",
    available: true,
    startLength: 3,
    description: "墨幕逃生 · 灵活转向",
    ability: "墨幕喷射 · 迷失10秒，冷却60秒",
    active: {
      id: "ink",
      name: "墨幕喷射",
      duration: 10,
      cooldown: 60,
      range: 90,
      jetDuration: 1.5,
      jetSpeed: 72,
      description:
        "水下喷墨，让90米内正在追击的猎手迷失并停留10秒，同时沿当前方向喷射逃离。冲刺受地形阻挡，冷却60秒。",
    },
    passive: {
      id: "agility",
      name: "柔躯回旋",
      description:
        "未冲刺时左右转向和上浮/下潜转向更快；冲刺时恢复常规转向速度。松开方向仍保持当前游向。",
    },
  },
  {
    id: "zombie_shark",
    kind: "zombie_shark",
    name: "丧尸鲨鱼",
    latin: "UNDEAD SELACHIAN",
    color: "#b5c29a",
    available: true,
    startLength: 3,
    description: "献祭召唤 · 环游猎仆",
    ability: "尸鲨分裂 · 最长存活60秒，无冷却",
    active: {
      id: "summon",
      name: "尸鲨分裂",
      duration: 60,
      cooldown: 0,
      cost: 50,
      minimumLength: 5,
      description:
        "达到5米且生命、体力、饱食各至少50点时，可消耗三项各50点召唤一只较小尸鲨，最多同时一只，最长存活60秒，无额外冷却。仆从从本尊体内逐步长出，挣脱侧腹后开始捕食。存活时再次使用，会追击32米内一个目标并尸爆，无额外消耗；附近没有目标时保留仆从继续捕食。追击也不会延长寿命，60秒一到就在当前位置尸爆；爆炸后可重新召唤。恰好50生命时献祭会致死。",
    },
    passive: {
      id: "scavenger",
      name: "亡者共食",
      description:
        "仆从环游身旁，追捕不超过主角体长减5米的普通猎物；珍兽只需比主角小。捕食收益归主角，另按有效营养恢复体力。60秒后尸体炸裂为血雾、碎肉和骨片，造成14米范围伤害，不追踪、不穿墙。小于本尊的鱼等同本尊捕食；同体型或更大的普通生物需两次爆炸命中，击杀不发吞食收益。尸爆可在25米后命中领主破绽，每轮仅一次；不攻击载具。",
    },
  },
  {
    id: "mechanical_shark",
    kind: "mechanical_shark",
    name: "机械鲨鱼",
    latin: "TITANIUM SELACHIAN",
    color: "#7bdbe8",
    available: true,
    startLength: 3,
    description: "钢铁装甲 · 鱼雷压制",
    ability: `深水鱼雷 · 冷却${MECHANICAL_RULES.cooldown}秒`,
    active: {
      id: "torpedo",
      name: "深水鱼雷",
      cooldown: MECHANICAL_RULES.cooldown,
      range: MECHANICAL_RULES.range,
      description: `水下发射鱼雷；桌面准星沿真实发射线显示，转向时锁定提示即时更新。锁定准星前方7度内的无遮挡目标，发射后持续追踪该目标，不自动换目标；遮挡或目标消失时解除锁定。射程140米，爆炸半径14米。每发消耗${MECHANICAL_RULES.healthCost}点生命、${MECHANICAL_RULES.staminaCost}点体力，生命须超过${MECHANICAL_RULES.healthCost}点。比自己小的普通猎物一发击杀，其余普通生物需两发；击杀后直接计为吞噬，获得恢复加速、饱食与成长。仅机械鲨鱼用鱼雷击杀远超自身体长的普通猎物时，成长收益降低但仍会增长，营养和恢复加速不变；正常吞食不受此限制。25米起可对领主造成一次咬击伤害。`,
    },
    passive: {
      id: "steel_body",
      name: "钢铁之躯",
      resistance: MECHANICAL_RULES.resistance,
      description:
        "承伤能力提高50%，攻击与环境伤害降至原来的三分之二；饥饿和技能消耗不减免。冲刺速度保持32米/秒，双推进器呈现尾焰。",
    },
  },
]);

/** 读取已开放角色；未知标识直接报错，防止悄悄套用其他角色的技能。 */
export function getCharacter(id = "orca") {
  const entry = PLAYER_CHARACTERS.find((c) => c.id === id && c.available);
  if (!entry) throw new Error("Character is not available");
  return entry;
}

/** 返回角色移动参数；boosting代表实际冲刺，虚弱但按住冲刺不应失去灵活被动。 */
export function characterMovement(id = "orca", boosting = false) {
  const agile = id === "squid" && !boosting;
  return {
    cruiseSpeed: 12,
    slowSpeed: 5,
    sprintSpeed: id === "orca" ? 32 * 1.3 : 32,
    yawRate: agile ? 2.1 : 1.15,
    pitchLimit: MAX_SWIM_PITCH,
    pitchRate: agile ? 2.1 : 1.15,
  };
}

/** 创建乌贼技能状态，时钟采用远征有效游玩时间，暂停时不推进。 */
export function createInkState() {
  return { activatedAt: null, readyAt: 0, activeUntil: 0, jetUntil: 0 };
}

/** 尝试喷墨；水面/空中、结束状态与冷却期不能使用。成功时锁定十秒效果与一轮冷却。 */
export function activateInk(
  state,
  now,
  { underwater = true, alive = true } = {},
) {
  if (
    !underwater ||
    !alive ||
    !Number.isFinite(now) ||
    now < 0 ||
    now < state.readyAt
  )
    return false;
  const ability = getCharacter("squid").active;
  state.activatedAt = now;
  state.readyAt = now + ability.cooldown;
  state.activeUntil = now + ability.duration;
  state.jetUntil = now + ability.jetDuration;
  return true;
}

/** 返回喷墨剩余时间、喷射速度和冷却状态，不修改状态。 */
export function inkStatus(state, now) {
  const time = Number.isFinite(now) ? Math.max(0, now) : 0;
  const active =
    state.activatedAt !== null &&
    time >= state.activatedAt &&
    time < state.activeUntil;
  const jet = active && time < state.jetUntil;
  const cooldownRemaining = Math.max(0, state.readyAt - time);
  return {
    active,
    jet,
    jetSpeed: jet ? 72 : 0,
    remaining: active ? state.activeUntil - time : 0,
    cooldownRemaining,
    ready: cooldownRemaining === 0,
  };
}
