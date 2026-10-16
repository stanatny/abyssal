import {
  DEEP_HAZARD_PROFILES,
  DEEP_HAZARD_RULES,
} from "./deep_hazard_rules.js";
import { tr } from "./i18n.js";

/** 机关档案按真实海域及共享规则生成，不伪造生物模型或额外奖励。 */
export function deepHazardGuideEntries() {
  const r = DEEP_HAZARD_RULES;
  return Object.entries(DEEP_HAZARD_PROFILES).map(([regionId, p]) => ({
    id: p.id,
    kind: p.id,
    category: "hazard",
    name: p.name,
    latin: p.latin,
    role: regionId === "atlantis" ? "遗迹机关" : "地形危险",
    symbol: regionId === "atlantis" ? "⚙" : "♨",
    color: p.color,
    length: 0,
    size: "局部危险区",
    regionIds: [regionId],
    ability: "接近触发 · 观察与绕行",
    habitat: p.habitat,
    text: tr`靠近同层地点会触发${r.warning}秒预警，随后释放${r.active}秒，再冷却${r.cooldown}秒。每次最多损失${r.damage}点生命，体型再大也不免疫；机械鲨鱼的钢铁身躯仍可减伤。`,
    counter:
      p.pattern === "lane"
        ? tr`发光刻纹标出固定水道：长${p.length}米、宽${p.width}米、高${p.height}米。提前横向绕行、游到上方，或等喷发结束；真实石柱与墙体能遮挡伤害。机关不会追踪，也不会掉落食物。`
        : tr`发光圆环标出半径${p.radius}米、高${p.height}米的固定水域。提前绕到圆环外、游到上方，或等待冷却；真实岩石能遮挡伤害。危险不会追踪，也不会掉落食物。`,
  }));
}
