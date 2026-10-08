// 通用浅滩保留恢复与洋流；额外入门奖励由区域数据配置。
export const STARTER_REWARDS = Object.freeze([
  Object.freeze({ kind: "stamina", position: Object.freeze([-13, -19, 40]) }),
  Object.freeze({ kind: "flow", position: Object.freeze([0, -24, 12]) }),
]);
export const RANDOM_REWARD_COUNT = 18;
export const REWARD_BOB_AMPLITUDE = 0.6;
export const REWARD_PLACEMENT = Object.freeze({
  attempts: 24,
});

// 奖励时长和展示文案共用配置，避免图鉴与实际效果不一致。
export const REWARDS = Object.freeze({
  stamina: {
    name: "生命补给",
    symbol: "＋",
    color: "#85ffd1",
    duration: 0,
    effect: "生命、体力、饥饿各恢复 50，最多回满",
  },
  flow: {
    name: "洋流之息",
    symbol: "»",
    color: "#70d8ff",
    duration: 30,
    effect: "立即回满体力，30 秒冲刺不耗体力",
  },
  frenzy: {
    name: "深渊狂食",
    symbol: "⌁",
    color: "#ffba70",
    duration: 20,
    effect: "20 秒近距吸食，捕食范围扩大",
  },
});

export const REWARD_KINDS = Object.freeze(Object.keys(REWARDS));

/** 默认槽位保持稳定；区域额外奖励追加在随机槽后，不改变复用模型的种类。 */
export function rewardSlots(region = {}) {
  return [
    ...STARTER_REWARDS.map((reward) => ({
      ...reward,
      id: `starter_${reward.kind}`,
    })),
    ...Array.from({ length: RANDOM_REWARD_COUNT }, (_, randomIndex) => ({
      id: `random_${randomIndex}`,
      kind: REWARD_KINDS[randomIndex % REWARD_KINDS.length],
      randomIndex,
    })),
    ...(region.extraStarterRewards ?? []).map((reward) => ({
      id: reward.id,
      kind: reward.kind,
      position: reward.atSpawn ? region.spawn : reward.position,
    })),
  ];
}
