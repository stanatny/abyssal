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
      effect: "六个独立舱室与检修回路",
      text: tr`${EUROPA_WRECK_SITE.gallery.length}米长的科考船主舱横卧在冰下岩阶。扩宽的双层大厅覆盖耐压壁板、隔热内衬与沿顶管束。样品档案舱、指挥舱、湿实验舱、生活舱、工程舱与探测器机库由五道隔舱墙分开。五道宽门左右错开，需穿过舱室转弯探索；高位检修支路连接首尾。分析机、岩芯罐、卧铺、压力泵与维修吊架展示它曾经的科研用途，剥落装甲和失效仪器留下坠毁痕迹。`,
      counter:
        "从两端或侧面破口进入，可逐舱探索样品档案、失效控制台、分析设备、生活区及无人探测器。大体型沿错位宽门逐舱穿行，小体型可绕行高位检修支路。辉渊巡狩者在船首外的开阔水域守卫，接近时留意它的触腕攻击；废弃船没有船员、食物或通关宝物，微光来自舱底附生群落。",
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
      text: "层叠的浅色矿塔与温和羽流描绘可能的低温渗流环境。水与岩石反应可能产生氢，为化学能食物链提供原料；这里的沉积地貌与生物仍是幻想，尚非木卫二的实测发现。",
      counter:
        "烟囱是实体，羽流是没有额外伤害的景观。三个领主外围各有少量分散的中大型滤食者，可在战斗间隙觅食；它们按正常节奏补充，不会贴身供应。裂谷掠夺者守在前两处外围，虚渊吞吸者巡游织母深窟，30米时仍需提防。科考船舱内没有补给。",
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
