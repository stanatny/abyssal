/** 探索规则与生态资料共用图鉴，非生物卡不创建鱼类模型。 */
export function marianaGuideEntries() {
  return [
    {
      id: "mariana_survey",
      kind: "mariana_survey",
      name: "远洋科考与岩壁生态",
      latin: "PACIFIC SURVEY",
      role: "海域景观",
      symbol: "◈",
      effect: "沿岩壁探索",
      habitat: "远洋海面与海沟岩壁",
      text: "冷色层云下，科考船、观测艇和仪器浮标沿海沟巡航，远处可见火山岛。下潜斜面与岩壁附着着杯状海绵、海葵、蛇尾及层叠生物结壳，微光帮助辨认地形。装饰的密度、尺寸与发光表现为探索体验做了艺术化调整，并非真实超深渊生态还原。",
      counter:
        "开阔海域边缘的洋流带和雷达上的转向提示代表无法越过的边界；岩壁也不可穿越。远处海岛仅为背景。科考船沿用18米冲撞门槛，大船三次、小艇一次有效冲撞；浮标是障碍，生态装饰不提供食物或奖励。",
      color: "#a9c9ce",
    },
    {
      id: "mariana_thresholds",
      kind: "mariana_thresholds",
      name: "海沟守关与压力帘",
      latin: "THE FOUR THRESHOLDS",
      role: "分层探索",
      symbol: "⇣",
      effect: "逐层突破",
      habitat: "2600、4000、5500与8600米关卡",
      text: "本海域从15米起步。四位深渊领主依次解锁下降通道。达到25米后，从侧面完成三次独立咬击；击败守卫会永久开启本局的压力帘，可沿原路返航。达到30米、突破全部四关并抵达最深处秘境才能在本海域获胜。",
      counter:
        "首关前沿岩壁寻找11～20米的猎物，长到25米后在首层深水挑战海德拉，再依次挑战克拉肯、格兰玛雅和利维坦。雷达首先指向海德拉并提示上浮或下潜距离，之后标记下降通道。预留战斗补给。",
      color: "#94bbe3",
    },
    {
      id: "mariana_refuge",
      kind: "mariana_refuge",
      name: "万米秘境",
      latin: "THE LAST WARM LIGHT",
      role: "探索彩蛋",
      symbol: "✧",
      effect: "深处的一抹暖光",
      habitat: "海沟最底部",
      text: "穿过最后一道关卡后，沿暖色微光进入底部石拱。这里隐藏着海绵宝宝与菠萝屋彩蛋，是明确的幻想场景，不代表真实超深渊生态。",
      counter: "探索时可绕着菠萝屋游动；彩蛋是陈设，不提供食物或额外奖励。",
      color: "#ead091",
    },
  ].map((e) => ({
    ...e,
    category: "hazard",
    regionIds: ["mariana"],
    length: 0,
    ability: e.effect,
    size: "—",
  }));
}
