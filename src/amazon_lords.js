import { amazonAnchor } from "./amazon_config.js";
/** 只属于亚马逊的两位原创守卫，沿用真实25米门槛和三次独立命中。 */
export const AMAZON_LORDS = Object.freeze([
  Object.freeze({
    kind: "yacumama",
    label: "河母主宰 · 雅库玛玛",
    freshwater: true,
    length: 57,
    health: 210,
    minAttackLength: 25,
    speed: 34,
    engageRange: 112,
    lockWindow: 0.8,
    abilityRadius: 42,
    damage: 38,
    ability: "vortex",
    depthMin: 180,
    depthMax: 310,
    nutrition: 100,
    growth: 30,
    tier: 3,
    windupDuration: 2.1,
    attackDuration: 2.3,
  }),
  Object.freeze({
    kind: "rootjaw",
    label: "沉根主宰 · 根颚君王",
    freshwater: true,
    length: 49,
    health: 210,
    minAttackLength: 25,
    speed: 35,
    engageRange: 116,
    lockWindow: 0.7,
    chargeSpeed: 85,
    damage: 42,
    ability: "charge",
    depthMin: 250,
    depthMax: 415,
    nutrition: 100,
    growth: 30,
    tier: 3,
    windupDuration: 2.0,
    attackDuration: 1.4,
  }),
]);
export const AMAZON_BOSS_INSTANCES = Object.freeze([
  Object.freeze({
    id: "amazon_serpent",
    kind: "yacumama",
    home: Object.freeze(amazonAnchor(-1, -760, 245)),
    radius: 88,
    maxCenterY: -150,
    persistentDefeat: true,
  }),
  Object.freeze({
    id: "amazon_rootjaw",
    kind: "rootjaw",
    home: Object.freeze(amazonAnchor(1, -1040, 340)),
    radius: 93,
    maxCenterY: -225,
    persistentDefeat: true,
  }),
]);
export const AMAZON_LORD_DESCRIPTIONS = Object.freeze({
  yacumama: {
    name: "雅库玛玛 · 河母巨蛇",
    latin: "YACUMAMA / RIVER LEGEND",
    category: "lord",
    role: "河母主宰",
    color: "#a5a858",
    ability: "盘涡追猎",
    appearance:
      "亚马逊河母蛇传说中的长躯巨兽：橄榄金鳞、黑色斑纹、宽扁蛇头和连续盘游长尾。",
    text: "巡守西支流蛇母深潭。蓄力后制造近身漩涡，吸引靠近的目标；恢复期从侧翼反击。",
    counter:
      "绕沉根与深潭边缘躲避旋涡，25米后从侧面完成三次独立进攻；每次咬中后离开再切入。",
  },
  rootjaw: {
    name: "根颚君王",
    latin: "ROOTJAW SOVEREIGN / MYTHIC RIVER GUARDIAN",
    category: "lord",
    role: "沉根主宰",
    color: "#b0a272",
    ability: "巨颚冲锋",
    appearance:
      "淡水深渊领主：宽大双颌、交错齿列、层叠骨甲、桨足与根状骨冠，区别于普通凯门鳄。",
    text: "巡守东支流巨颚沉渊。预警后锁定冲锋方向，直线高速撞击；锁定末段侧移躲开。",
    counter:
      "利用深潭宽处横向闪避，不在狭窄河弯与它正面对冲；25米后从侧面完成三次独立进攻。",
  },
});
