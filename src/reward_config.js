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
