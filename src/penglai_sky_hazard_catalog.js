import { PENGLAI_SKY_PROFILES } from "./penglai_sky_hazard_rules.js";

export function penglaiSkyHazardGuideEntries() {
  return Object.entries(PENGLAI_SKY_PROFILES).map(([kind, p]) => ({
    id: p.id,
    kind: p.id,
    category: "hazard",
    name: p.name,
    latin: p.latin,
    role: "天空天气",
    symbol: kind === "thunder" ? "☁" : "〰",
    color: p.color,
    length: 0,
    size: "移动的大范围空域",
    regionIds: ["penglai"],
    ability: "随机形成 · 移动与消散",
    habitat: "蓬莱全境云海，远离低空莲池",
    text:
      kind === "thunder"
        ? "雷云在天空随机聚集，6秒后成为雷暴，沿生成时的风向移动18秒，再用5秒消散。雨幕覆盖约170×130米、上下约130米；不是几根孤立雷柱。雷暴期间每5秒蓄电一次，约3秒后短暂放电，每次最多造成18点伤害。"
        : "阵风在天空随机形成，5秒后进入持续12秒的强风，再用4秒消散。风幕覆盖约180×64米、上下约90米，沿生成时的风向掠过；每场阵风最多造成一次18点伤害。",
    counter:
      "观察云层与风丝，提前升降或从边缘绕行，也可借仙山实体遮挡。天气不会追踪角色；体型再大也不免疫，钢铁身躯仍能减伤。低于60米的低空与水下不受影响。",
  }));
}
