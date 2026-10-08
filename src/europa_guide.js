import { tr } from "./i18n.js";
import { EUROPA_WRECK_SITE } from "./europa_research_wreck.js";

/** 木卫二地标资料卡；不是可食生物，也不参与普通生态刷新。 */
export function europaGuideEntries() {
  return [
    {
      id: "europa_research_wreck",
      kind: "europa_research_wreck",
      name: "坠毁科考船",
      latin: "CRASHED RESEARCH LANDER",
      symbol: "⌖",
      color: "#9faeae",
      habitat: "悬生花园与热泉盆地之间",
      effect: "四个独立舱室与检修回路",
      text: tr`${EUROPA_WRECK_SITE.gallery.length}米长的科考船主舱坠落在冰下斜坡。指挥舱、采样实验舱、生活舱与工程舱由隔舱墙和宽门洞分开。中央通道贯通四舱，小体型可沿高位检修支路绕行。两端与侧面破口提供出入口。破损的承压外壳、散热翼与天线留在海床。`,
      counter:
        "从两端或侧面破口进入，可逐舱查看失效控制台、采样设备、床铺与压力罐。大体型走中央宽门，小体型可转入检修支路；废弃科考船没有船员、食物或通关宝物。微光来自舱底的幻想附生群落。",
    },
    {
      id: "europa_chemical_habitat",
      kind: "europa_chemical_habitat",
      name: "化学能源栖地",
      latin: "CHEMICAL-ENERGY HABITAT",
      symbol: "≋",
      color: "#9f927b",
      habitat: "热泉盆地及冰下侧坡",
      effect: "矿物沉积 · 温和羽流",
      text: "层叠矿物烟囱与缓慢升起的羽流描绘一种可能的水岩反应环境。科学家认为木卫二海底可能提供化学能源，但热泉和生命尚未被证实。",
      counter:
        "烟囱是实体，羽流是没有额外伤害的景观。群落微光属于游戏幻想，营养仍来自原有分层生物。",
    },
    {
      id: "europa_mineral_crystals",
      kind: "europa_mineral_crystals",
      name: "盐矿晶簇",
      latin: "SALT-MINERAL CLUSTERS",
      symbol: "◇",
      color: "#84a3ab",
      habitat: "各层侧坡与岩根",
      effect: "多棱晶柱 · 附生微光",
      text: "多棱矿物晶柱扎根在岩缝中，浅色盐壳与柔和的附生薄膜构成低亮度地标。晶体反射周围光线，不自行放射强光。",
      counter:
        "较大的晶柱有实体碰撞，主下降通道保持开放。晶簇不能吞食；其形态与发光群落是艺术想象，不是木卫二矿物的实测记录。",
    },
  ].map((entry) => ({
    ...entry,
    category: "hazard",
    role: "冰下地标",
    regionIds: ["europa"],
    length: 0,
    size: "探索景观",
  }));
}
