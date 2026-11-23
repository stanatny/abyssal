import { BERMUDA_CAVE_SITES } from "./bermuda_cave_config.js";

const DETAILS = {
  kaiju_lair: {
    latin: "TITAN LAIR",
    effect: "沉眠巨兽 · 熔岩守宝",
    habitat: "百慕大南部深海",
    text: "从泰坦尼克号继续向南部深海前进，沿海床微光寻找层叠岩壁中的北洞口。巢穴只有这一个出口；穿过曲折下潜的岩廊，岔道尽头有鱼群补给。巨兽伏在深处，一只前爪压护石台上的琥珀晶核，身躯隐入更暗的巢室。按波纹、骨纹、火纹顺序解除封印，再等前爪在睡梦中卸重、轻翻掌露出空间时进入取宝；前爪压回会封住通路并造成挤压。嘴部蓄热和扇面预警后，熔流从嘴向落点推进；停喷后余流继续落下，地面熔池仍会烫伤，待它冷却消退再穿过。利用岩屏、侧路避开，并留意坠石和巢穴猎手。取宝后巨兽苏醒，岩浆与落石更加频繁，必须在60秒内沿原路完整游出北洞口。超时会被喷涌和崩塌吞没；安全带出晶核并击败四位领主才能获胜。",
  },
  luminous_grotto: {
    latin: "LUMINOUS GROTTO",
    effect: "微光群落 · 双向穿行",
    habitat: "百慕大西部深水坡",
    text: "岩壁上的微光和海绵群落标记通道，真实洞顶覆盖内部水域，两端保留开口。观察水层中的鱼群，在继续深潜前补给。",
  },
  fossil_passage: {
    latin: "FOSSIL PASSAGE",
    effect: "巨骨遗迹 · 深海穿行",
    habitat: "百慕大东南深海",
    text: "古老巨兽的残骸与岩层交错，形成深海中的骨廊。沿洞内水道从另一端游出，留意开阔水域中的大型捕猎者。",
  },
};

/** 洞穴沿用非生物资料卡，不把环境遗迹注册成新增领主。 */
export function bermudaCaveGuideEntries() {
  return BERMUDA_CAVE_SITES.map((site) => ({
    id: site.id,
    kind: site.id,
    name: site.name,
    ...DETAILS[site.theme],
    category: "hazard",
    role: "深海洞穴",
    symbol: "⌒",
    color: site.theme === "kaiju_lair" ? "#76c9dd" : "#a6c9a8",
    length: 0,
    size: "可进入的岩厅与通道",
    ability: DETAILS[site.theme].effect,
    regionIds: ["bermuda"],
    counter:
      site.id === "kaiju_lair"
        ? "不要贴地穿过喷流：先看扇面预警，再绕到实心岩屏后或喷流侧外；停喷后仍要避开炽热熔池。晶核藏在伏地前爪下的石台上，等前爪卸重、轻翻掌时进入，取宝后立即退到爪外；不要停留在即将压回的前爪下。岔道不通向外海，取宝前吃饱并记住北口原路。"
        : "两个洞口相通，可从另一侧离开。食物遵循各自水层，较深的洞底上方也有补给；抬升观察，预留返程饥饿值。",
  }));
}
