/**
 * 新增稀有远古巨兽的共享配置；不扩大原有物种，也不改育幼或普通食物库存。
 * 巨型鱼龙约25米的现实估计来自不完整颌骨；28米体长、复苏深度与捕猎是游戏改编。
 */

/** 两张海域的独立开放深海锚点，使用世界坐标深度而非界面显示深度。 */
export const DEEP_GIANT_ANCHORS = Object.freeze({
  hawaii: Object.freeze([
    Object.freeze([-32, -360, -610]),
    Object.freeze([45, -600, -985]),
  ]),
  atlantis: Object.freeze([
    Object.freeze([-22, -370, -665]),
    Object.freeze([15, -580, -974]),
  ]),
});

/**
 * 稀有巨型鱼龙采用普通猎手状态机；每图仅两只，不能跨入幼年水层。
 * 体长大于25米，威胁成长后期角色；真实体长严格超过28米后才可吞食。
 */
export const DEEP_GIANT_SPECIES = Object.freeze([
  Object.freeze({
    kind: "ichthyotitan",
    label: "巨型鱼龙",
    latin: "ICHTHYOTITAN SEVERNENSIS",
    length: 28,
    speed: 24,
    chaseSpeed: 24,
    depthMin: 300,
    depthMax: 680,
    population: 2,
    schoolSize: 1,
    tier: 2,
    category: "ancient",
    predator: true,
    extinct: true,
    color: "#659f9e",
    nutrition: 30 + 28 * 2,
    growth: 0.2 + (28 / 6) ** 2 * 0.25,
    spawnAnchors: DEEP_GIANT_ANCHORS.hawaii,
    hunterAbility: "mosasaur",
    hunterTell: "巨型鱼龙压低长吻 · 侧向转弯避开冲撞",
    realSize: "不完整颌骨推算约20—26 m；本作28 m为游戏改编",
    ability: "古海冲撞",
    description:
      "晚三叠世的巨大海生爬行动物，并非恐龙。化石以不完整下颌骨为主，完整身体形态仍有重建不确定性。本作以修长躯干、长吻、四枚鳍肢和竖向尾鳍塑造稀有深海猎手。",
    habitatNote:
      "已灭绝；28 m体长、1200—2720 m显示深度、24 m/s巡游与攻击大型角色均为游戏改编，不代表现实生态或已证实的身体重建。",
    counter:
      "20—25米时仍应绕开，观察蓄力后侧向闪避，用冲刺或地形脱离；真实体长超过28米才能捕食。",
  }),
]);
