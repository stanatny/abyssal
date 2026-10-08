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
      text: "穿过最后一道关卡后，沿暖光进入明亮的底部街区。菠萝屋、石像屋、岩屋与餐馆围绕广场，海绵宝宝、派大星和蜗牛居民点缀其中。这是幻想彩蛋，不代表真实超深渊生态。",
      counter:
        "可沿街道绕屋探索；建筑与居民是陈设，不提供食物或奖励。获胜后可选择继续游览，生存计时会停止。",
      color: "#ead091",
    },
    {
      id: "mariana_realms",
      kind: "mariana_realms",
      name: "四层岩谷、壁画与奇景",
      latin: "REALMS OF THE GUARDIANS",
      role: "守卫的领域",
      symbol: "◈",
      effect: "沿支路探索，再回到下降主道",
      habitat: "海德拉岩谷至利维坦裂渊",
      text: "三首浮雕岩谷、回声穹窟、紫晶化石花园与巨柱裂渊分别属于四位守卫。壁画、矿脉与天然岩廊帮助辨认每层；支路有可绕行的转弯空间，压力帘仍是必须突破的主关卡。",
      counter:
        "沿微光寻找壁侧支路，保持食物储备后再探索。岩石、平台和顶棚不能穿过；遇到守卫可沿已开启的主道退回补给层。",
      color: "#b3cfbe",
    },
    {
      id: "mariana_survival",
      kind: "mariana_survival",
      name: "分层饥饿与大型猎食者",
      latin: "PRESSURE AND PREDATORS",
      role: "生存提示",
      symbol: "⇣",
      effect: "越深越需补给",
      habitat: "每道压力帘之后",
      text: "原有深水压力之外，穿过前三道压力帘后，饥饿消耗分别平滑增加至原深水值的1.08、1.16和1.24倍，最深处不再继续加速。每个守关水层安排两只28米巨型鱼龙；30米时它们仍能主动追逐并造成伤害。它们在体长超过28米后也可被吞食。",
      counter:
        "25至30米时，寻找18米龙王鲸与20米巨齿鲨恢复饥饿和生命。普通猎物吃掉后约28秒补充，不要只守着一只等待；先寻找下一处食物，必要时回到较浅的已开启水层。",
      color: "#d9ac83",
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
