/** 地域独有远古生物；复苏位置与温和/追猎行为是明确的游戏改编。 */
export const HAWAII_ANCIENTS = Object.freeze([
  Object.freeze({
    kind: "archelon",
    label: "古巨龟",
    latin: "ARCHELON ISCHYROS",
    category: "ancient",
    tier: 0,
    extinct: true,
    predator: false,
    length: 4.5,
    speed: 3.8,
    depthMin: 20,
    depthMax: 125,
    population: 6,
    schoolSize: 1,
    residentRadius: 25,
    spawnAnchors: Object.freeze([
      Object.freeze([-30, -38, -160]),
      Object.freeze([36, -65, -245]),
      Object.freeze([-38, -90, -310]),
    ]),
    nutrition: 39,
    growth: 0.34,
    color: "#999d70",
    realSize: "最大已知标本约4.6米；本作4.5米全长，鳍展另计。",
    ability: "巨鳍缓游",
    description:
      "白垩纪的巨大海龟，钩状喙、宽浅的革质背甲和巨大前鳍构成轮廓。它不是放大的绿海龟；背甲不像现代硬壳龟那样完全融合。",
    habitatNote:
      "已灭绝，现实化石来自北美古海；夏威夷复苏、慢速与非追猎行为为玩法设定，皮肤与体色为艺术复原。",
    counter: "长到4.5米以上后，可沿外礁缓游接近，作为进入中层的稳定补给。",
  }),
]);

export const MARIANA_ANCIENTS = Object.freeze([
  Object.freeze({
    kind: "shonisaurus",
    label: "秀尼鱼龙",
    latin: "SHONISAURUS POPULARIS",
    category: "ancient",
    tier: 2,
    extinct: true,
    predator: true,
    length: 15,
    speed: 16.5,
    depthMin: 160,
    depthMax: 2620,
    population: 8,
    schoolSize: 1,
    residentRadius: 55,
    spawnAnchors: Object.freeze([
      Object.freeze([45, -195, -260]),
      Object.freeze([-50, -335, -360]),
      Object.freeze([45, -505, -455]),
      Object.freeze([-45, -825, -360]),
      Object.freeze([40, -1130, -470]),
      Object.freeze([-40, -1620, -355]),
      Object.freeze([40, -1920, -460]),
      Object.freeze([-35, -2510, -400]),
    ]),
    nutrition: 60,
    growth: 1.7625,
    color: "#858fab",
    realSize:
      "秀尼鱼龙属大型个体约15米；完整软组织、鳍尾形状仍有复原不确定性。",
    ability: "深层巡猎",
    description:
      "三叠纪的巨大鱼龙，长而窄的吻部连接桶状厚躯，四枚长鳍肢伸向两侧，尾部左右摆动推进。与细长的巨型鱼龙具有不同体态。",
    habitatNote:
      "已灭绝，真实标本来自内华达古海；本作超深水巡猎是幻想生态，无法视作真实海沟动物。",
    counter:
      "15米起步时尚不能捕食同等体长的它；先吃上龙、沧龙，再将它作为各层的大型补给。",
  }),
]);
