// 奖励时长和展示文案共用配置，避免图鉴与实际效果不一致。
export const REWARDS = Object.freeze({
  stamina: {
    name: "体力泉",
    symbol: "＋",
    color: "#85ffd1",
    duration: 0,
    effect: "体力立即回满，解除疲惫",
  },
  flow: {
    name: "洋流之息",
    symbol: "»",
    color: "#70d8ff",
    duration: 30,
    effect: "30 秒冲刺不耗体力",
  },
  frenzy: {
    name: "深渊狂食",
    symbol: "⌁",
    color: "#ffba70",
    duration: 30,
    effect: "30 秒越级捕食",
  },
});
