import { SURFACE_BIRDS } from "./surface_birds.js";
import { marianaGuideEntries } from "./mariana_guide.js";
import { MARIANA_GATES } from "./mariana_config.js";
import {
  t,
  tr,
  setMarkup,
  translateDOM,
  onLanguageChange,
  localizeRecord,
} from "./i18n.js";
import * as THREE from "three";
import { createCreature } from "./creatures.js";
import { HUNGER_RULES } from "./simulation.js";
import { ALL_SPECIES, getRegionSpecies } from "./region_ecology.js";
import { characterMovement } from "./character_rules.js";
import { HUMAN_CATALOG, createHumanModel } from "./vehicle_models.js";
import { BOSS_SPECIES, BOSS_BITE_HUNGER } from "./boss_rules.js";
import { BERMUDA_HAZARDS } from "./bermuda_hazard_rules.js";
import { WORLD } from "./world_config.js";
import { CHARACTERS, REGIONS, getExpedition } from "./expedition_config.js";
import { getHunterAbility } from "./hunter_rules.js";
import { REWARDS, RANDOM_REWARD_COUNT } from "./reward_config.js";
import { createMarineEnvironment } from "./visual_pipeline.js";
import "./ocean_guide.css";

// 生物按由小到大的探索顺序展示，角色与人类活动单独归档。
const GUIDE_CATEGORIES = [
  { id: "shoal", name: "小型鱼与鱼群" },
  { id: "invertebrate", name: "海洋无脊椎" },
  { id: "surface", name: "海面" },
  { id: "hunter", name: "海洋霸主" },
  { id: "ancient", name: "远古巨兽" },
  { id: "lord", name: "深渊领主" },
  { id: "player", name: "可选角色" },
  { id: "human", name: "人类活动" },
  { id: "hazard", name: "海域奇观与危险" },
  { id: "reward", name: "海洋奖励" },
];
const CATEGORY_ORDER = new Map(
  GUIDE_CATEGORIES.map((entry, index) => [entry.id, index]),
);

/** 按类别与实际体长排序；同长度使用稳定的档案ID，不随语言切换而跳位。 */
function compareCatalogEntries(a, b) {
  return (
    (CATEGORY_ORDER.get(a.category) ?? 99) -
      (CATEGORY_ORDER.get(b.category) ?? 99) ||
    (a.length || 0) - (b.length || 0) ||
    a.id.localeCompare(b.id)
  );
}

/** 将已筛选的档案分组；列表标题与键盘浏览共用同一顺序。 */
export function groupOceanCatalog(catalog) {
  return GUIDE_CATEGORIES.map((group) => ({
    ...group,
    entries: catalog
      .filter((entry) => entry.category === group.id)
      .sort(compareCatalogEntries),
  })).filter((group) => group.entries.length);
}

const DESCRIPTIONS = {
  kraken: {
    name: "克拉肯",
    latin: "KRAKEN",
    category: "lord",
    role: "漩涡主宰",
    color: "#c5a0ff",
    ability: "深渊漩涡",
    appearance:
      "北欧海怪传说启发的原创形象：八条长触腕舒展盘卷，双列吸盘沿腕内侧排列；臂根与末梢错相摆动。",
    text: "预判你的前进位置布置深渊漩涡，牵引附近目标并抽走体力，漩涡中心还会造成伤害。追击时会拦截路线，而不是只停留在领地中心。",
    counter:
      "看到漩涡预警后改变路线，利用岩柱遮挡；技能后的3秒恢复期，从侧翼朝向躯干接近咬击，再退出接触范围。",
  },
  mayan: {
    name: "格兰玛雅",
    latin: "GRAN MAJA",
    category: "lord",
    role: "遗迹主宰",
    color: "#a7b2b9",
    ability: "遗迹脉冲",
    text: "灰银色扁宽三角头、额前六枚蓝眼与红色牙龈中的密集齿列，连接粗大环褶的蛇形长躯。蓄力时锁定你所在水层，向外发出高速脉冲；追击会压缩你和障碍物之间的空间。",
    counter:
      "观察锁定水层，在预警末段上浮或下潜；冲击环结束后的3秒恢复期，转向躯干侧翼发动接触攻击。",
  },
  hydra: {
    name: "三头海德拉",
    latin: "HYDRA",
    category: "lord",
    role: "三首主宰",
    color: "#8be5d2",
    ability: "三重吐息",
    appearance:
      "借鉴希腊多首水蛇的蜿蜒长颈，保留本作三头设定。修长吻部、后掠角冠与腹甲相连，三个头会独立巡视。",
    text: "三个头以0.45秒间隔依次发射吐息，并根据你的移动预判落点。连续射击会逼迫你多次改变路线，已射出的弹丸不会转弯追踪。",
    counter:
      "连续侧向变向或利用岩石挡住三轮吐息，不要躲过第一发就直线前进。齐射后的3秒恢复期可从身体侧翼反击。",
  },
  leviathan: {
    name: "利维坦",
    latin: "LEVIATHAN",
    category: "lord",
    role: "深渊主宰",
    color: "#efb88c",
    ability: "毁灭冲锋",
    appearance:
      "《约伯记》的紧密甲鳞与巨颚、《以赛亚书》的曲折海蛇意象启发了这条原创海兽：重甲前躯连接侧向游摆的长尾，并非真实动物复原。",
    text: "深渊中体型最大的领主，会拦截你的逃跑路线，蓄力末段锁定方向后以100米/秒高速冲撞。普通冲刺无法直线甩开。",
    counter:
      "等待最后的路线锁定提示，立即侧向避开冲撞；冲锋后3秒恢复期从躯干侧面向内切入，咬中后拉开再进攻。",
  },
};

/**
 * 构建完整图鉴，当前海域物种的数值使用实际生成配置。
 * @param {string} [regionId] 当前海域；省略时使用完整目录的基础配置。
 * @returns {object[]} 带实际海域归属、营养和双语检索词的档案。
 */
export function buildOceanCatalog(regionId) {
  const startingLength = (entry) =>
    regionId
      ? getExpedition(regionId, entry.id).startLength
      : entry.startLength;
  const regionalSpecies = new Map(
    (regionId ? getRegionSpecies(regionId) : []).map((entry) => [
      entry.kind,
      entry,
    ]),
  );
  return [
    ...CHARACTERS.map((entry) => ({
      id: tr`player_${entry.id}`,
      kind: entry.kind,
      name: entry.name,
      latin: entry.kind === "orca" ? "ORCINUS ORCA" : "ARCHITEUTHIS DUX",
      category: "player",
      role: "可选角色",
      color: entry.kind === "orca" ? "#a1e8d5" : "#c2a5e8",
      length: startingLength(entry),
      size: tr`${startingLength(entry)}—30 m（成长玩法）`,
      habitat: "本作海洋全域",
      ability: tr`主动 · ${entry.active.name} / 被动 · ${entry.passive.name}`,
      text: tr`${entry.active.description} 激活起冷却${entry.active.cooldown}秒。被动：${entry.passive.description}`,
      counter:
        entry.kind === "orca"
          ? "用声呐判断前方猎物体长和捕食资格，雷达保留周围回声。高速冲刺可追捕猎物或拉开距离，水下连续蓄势后才能破水。"
          : "遇到猎手追击时在水下喷墨脱身，提前把头朝向安全出口；喷射会受到礁石和船体阻挡。松开冲刺可发挥灵活转向的被动。",
      characterId: entry.id,
      realSize:
        "其他海域3米幼年起步，马里亚纳15米起步；起始尺寸、30米体长上限与技能强度属于游戏设定。",
      habitatNote:
        "可选角色共享自动接触捕食；特殊技能使用J或手机技能按钮。陡角度低头撞到海床或地板时，会短暂平滑抬头到平游；仍可向上和左右转向，开阔水域不自动回正。",
    })),
    ...ALL_SPECIES.map((entry) => regionalSpecies.get(entry.kind) || entry).map(
      (config) => ({
        id: config.kind,
        kind: config.kind,
        name: config.label,
        latin: config.latin,
        category: config.category,
        color: config.color,
        role:
          config.category === "ancient"
            ? "远古巨兽"
            : config.category === "hunter"
              ? "海洋霸主"
              : "海洋猎物",
        length: config.length,
        nutrition: config.nutrition,
        growth: config.growth,
        speed: config.speed,
        schoolSize: config.schoolSize,
        size: tr`${config.length} m`,
        habitat: tr`${config.depthMin * WORLD.displayDepthScale}—${Math.round(config.depthMax * WORLD.displayDepthScale)} m（本作水层）`,
        hunterAbility: config.hunterAbility,
        ability: config.hunterAbility
          ? config.ability
          : getHunterAbility(config)?.label || config.ability,
        text: config.description,
        counter: config.counter,
        tier: config.tier,
        realSize: config.realSize,
        habitatNote: config.schoolProfiles?.some((group) => group.cityResident)
          ? tr`${config.habitatNote} ${tr`亚特兰蒂斯另有鱼群栖息在古城街巷、上下柱廊、月湾古港地下厅、沉没市集内庭和波塞冬地宫。该深水分布为幻想生态；小鱼主要供较小角色补给，成年角色应寻找城区内的中大型猎物。普通住宅宝箱与陶器是探索陈设；公共建筑隐藏着海螺钥匙；需钥匙与真正守宝者的印记才能打开神庙地宫宝箱，箱中圣珠是本海域的胜利宝物。`}`
          : config.habitatNote,
      }),
    ),
    ...SURFACE_BIRDS.map((b) => ({
      ...b,
      id: b.kind,
      category: "surface",
      role: "水面猎物",
      habitat: "海面上空",
      counter:
        "从水下提前蓄速上冲，出水后靠惯性接近；浮在水面才按加速无法起飞。",
    })),
    ...BOSS_SPECIES.map((config) => ({
      id: config.kind,
      kind: config.kind,
      ...DESCRIPTIONS[config.kind],
      text:
        tr`未交战时也会在自己的领地内缓慢巡游，靠近时才发动追猎。` +
        " " +
        (DESCRIPTIONS[config.kind].appearance
          ? t(DESCRIPTIONS[config.kind].appearance) + " "
          : "") +
        (regionId === "mariana"
          ? config.kind === "hydra"
            ? tr`${DESCRIPTIONS.hydra.text} ${tr`三头巨龙海德拉守卫远离出生点的外海水面，是第一道压力帘的必经守卫。达到25米后，从侧面完成三次独立咬击，击败它即可开启2600米处的第一道压力帘；本局不再复活。`}`
            : tr`${DESCRIPTIONS[config.kind].text} ${tr`本海域的守关领主被击败后不再复活，压力帘随之开启。需成长至30米、突破四关并抵达海沟底部。`}`
          : regionId === "bermuda"
            ? tr`${DESCRIPTIONS[config.kind].text} ${tr`本海域必须击败全部四位深渊领主；各领主只出现一次。`}`
            : regionId === "atlantis" && config.kind === "kraken"
              ? tr`${DESCRIPTIONS.kraken.text} ${tr`亚特兰蒂斯有三只克拉肯，分别守卫西侧城区、中庭和后城；每只拥有独立领地与生命值。每局随机由其中一只守护波塞冬地宫的圣珠，身份不会预先公开。先在城区公共建筑寻找海螺钥匙。海螺铭文可提供建筑线索；钥匙与真正守宝者的印记齐全，波塞冬地宫宝箱才会开启。达到30米并吞食箱中圣珠才能胜利。所有领主本局不再复活。`}`
              : tr`${DESCRIPTIONS[config.kind].text} ${tr`每局击败后不再复活。夏威夷成长至30米并击败任意一位即可胜利。`}`),
      length: config.length,
      size: tr`${config.length} m`,
      tier: 3,
      habitat:
        regionId === "mariana" && config.kind === "hydra"
          ? "远离安全浅滩的外海表层"
          : regionId === "mariana" &&
              MARIANA_GATES.some((g) => g.kind === config.kind)
            ? tr`${MARIANA_GATES.find((g) => g.kind === config.kind).depth * 4} m（幻想领地）`
            : regionId === "bermuda"
              ? {
                  hydra: "风暴外海表层",
                  kraken: "沉船西侧深水",
                  mayan: "东南深沟",
                  leviathan: "最深海沟",
                }[config.kind]
              : tr`${config.depthMin * WORLD.displayDepthScale}—${Math.round(config.depthMax * WORLD.displayDepthScale)} m（幻想领地）`,
    })),
    {
      id: "atlantis_key_chest",
      kind: "atlantis_key_chest",
      name: "海螺钥匙与神庙宝箱",
      latin: "CONCH KEY & TEMPLE CHEST",
      category: "hazard",
      role: "遗迹解谜",
      regionIds: ["atlantis"],
      color: "#e5c589",
      symbol: "⚿",
      size: "任务宝物",
      length: 0,
      habitat: "古城公共建筑与波塞冬地宫",
      effect: "寻钥匙 · 解封 · 寻宝",
      text: "每局有一把海螺钥匙藏在月湾圣所、市集柱廊或纪念圣厅的下层。接近海螺铭文可获得建筑线索，雷达随后提供方向。钥匙与真正守宝克拉肯的印记可以按任意顺序获得；两者齐全才开启神庙地宫的宝箱。成长至30米后吞食圣珠即可胜利。",
      counter:
        "钥匙不提供营养，也不会替代守宝者的印记。普通房屋的宝箱是陈设。三处公共建筑均有成年角色可游过的廊道；回到主界面开启新局后，钥匙和守宝者重新抽取。",
    },
    ...HUMAN_CATALOG,
    ...bermudaGuideEntries(),
    ...marianaGuideEntries(),
  ]
    .map((entry) => ({
      ...localizeRecord(entry),
      regionIds: catalogRegionIds(entry),
      searchText: `${entry.name} ${entry.ability} ${t(entry.name, [], "en")} ${t(entry.ability, [], "en")}`,
    }))
    .sort(compareCatalogEntries);
}
export let OCEAN_CATALOG = buildOceanCatalog();

/** 归属直接沿用可玩海域的实际物种与领主名册，不把全量注册等同于生成。 */
function catalogRegionIds(entry) {
  return REGIONS.filter((region) => {
    if (!region.available) return false;
    if (entry.category === "hazard")
      return entry.regionIds
        ? entry.regionIds.includes(region.id)
        : region.id === "bermuda";
    if (entry.category === "human") {
      const key = {
        swimmer: "swimmers",
        diver: "divers",
        submarine: "submarines",
        attack_torpedo: "submarines",
        torpedo: "mines",
      }[entry.kind];
      return region.humanActivity?.[key] !== false;
    }
    if (entry.category === "lord") return region.bossKinds.includes(entry.kind);
    if (["shoal", "hunter", "ancient", "invertebrate"].includes(entry.category))
      return region.speciesKinds.includes(entry.kind);
    if (entry.category === "surface")
      return (
        SURFACE_BIRDS.find((b) => b.kind === entry.kind)?.regions.includes(
          region.id,
        ) ?? false
      );
    return true;
  }).map((region) => region.id);
}

/**
 * 组合海域、类别与双语关键词筛选，供列表与键盘浏览共用。
 * @param {object[]} catalog 档案目录。
 * @param {{regionId?:string,category?:string,search?:string}} filters 筛选条件。
 * @returns {object[]} 满足全部条件的档案。
 */
export function filterOceanCatalog(
  catalog,
  { regionId, category = "all", search = "" } = {},
) {
  const query = search.trim().toLowerCase();
  return catalog
    .filter(
      (entry) =>
        (!regionId || entry.regionIds.includes(regionId)) &&
        (category === "all" || entry.category === category) &&
        `${entry.name}${entry.ability}${entry.latin}${entry.keywords || ""}${entry.searchText || ""}`
          .toLowerCase()
          .includes(query),
    )
    .sort(compareCatalogEntries);
}

/** 地图危险采用资料卡，不为非生物生成错误的鱼形标本。 */
function bermudaGuideEntries() {
  return [
    {
      id: "bermuda_wreck",
      kind: "bermuda_wreck",
      name: "失落远洋邮轮",
      latin: "THE LOST OCEAN LINER",
      role: "可探索沉船",
      symbol: "⚓",
      effect: "破口、贯通货舱与多层中庭",
      habitat: "沉船海床",
      text: "396米长的原创四烟囱邮轮沉在深水中。可由右舷大破口、艉部中央开口或敞开的中庭进入，货舱、楼梯与家具沿两翼布置。它是可进入的地貌，不是整船实心碰撞。",
      counter:
        "先声呐观察外围巨兽，在中央宽阔通道穿行；侧舱更适合小角色。船内贝珠微光帮助辨认入口。",
      color: "#86bcb9",
    },
    {
      id: "bermuda_ghost",
      kind: "bermuda_ghost",
      name: "飞翔的荷兰人号",
      latin: "THE FLYING DUTCHMAN",
      role: "表层危险",
      symbol: "☠",
      effect: "锁定炮击",
      habitat: "浅滩外的西侧海面",
      text: tr`戴维琼斯的飞翔的荷兰人号在${BERMUDA_HAZARDS.ghostRange}米内锁定目标。${BERMUDA_HAZARDS.ghostWindup}秒预警后五炮齐射，炮弹不追踪；直接命中或近距离爆炸造成${BERMUDA_HAZARDS.ghostDamage}点伤害，每${BERMUDA_HAZARDS.ghostCooldown}秒最多发起一轮。`,
      counter:
        "绿色预警圈先跟随你，在开火前0.6秒固定落点；横向冲刺避开，或下潜到显示深度280米以下。岩石和实体船壳能遮挡炮击与爆炸，鬼船不能被撞沉。",
      color: "#7ce0bc",
    },
    {
      id: "bermuda_spout",
      kind: "bermuda_spout",
      name: "龙卷水柱",
      latin: "WATERSPOUT",
      role: "风暴危险",
      symbol: "↟",
      effect: "卷起与落水",
      habitat: "浅滩外的风暴海面",
      text: tr`近海面进入水柱会被旋风卷起，造成${BERMUDA_HAZARDS.spoutDamage}点伤害并抛向空中，随后落回水中。同次接触有${BERMUDA_HAZARDS.spoutCooldown}秒冷却，安全浅滩不受影响。`,
      counter:
        "绕开灰白漏斗及水面泡沫圈，也可以从显示深度100米以下经过。不要在风暴中直线贴水面冲刺。",
      color: "#a2b9c4",
    },
    {
      id: "bermuda_rig",
      kind: "bermuda_rig",
      name: "外海钻井平台",
      latin: "OFFSHORE PLATFORM",
      role: "外海地标",
      symbol: "▥",
      effect: "海床支撑钢架",
      habitat: "东侧外海",
      text: "钻井架的支柱贯穿海面与海床，钢结构具有碰撞。远洋货轮与油轮缓慢行驶，沿用18米角色三次独立高速撞击规则；这一海域没有游泳者和潜水员。",
      counter:
        "从支柱之间穿过，利用船体遮挡追击与炮击；深潜前先确认自己的位置。",
      color: "#d0b28f",
    },
  ].map((entry) => ({
    ...entry,
    category: "hazard",
    length: 0,
    ability: entry.effect,
    size: "—",
  }));
}

// 奖励使用静态档案卡，沿用图鉴的检索与键盘切换，不创建额外三维上下文。
function buildRewardDetails() {
  return {
    stamina: {
      latin: "VITALITY SUPPLY",
      role: "即时恢复",
      keywords: "医疗 恢复 补充 生命 体力 饥饿",
      text: "触碰后立即恢复50点生命、50点体力和50点饥饿值，各项最多恢复至100，并解除体力耗尽后的疲惫状态。",
      counter:
        "受伤、疲惫或饥饿时拾取，能同时补充三项生存状态。生命、体力和饥饿都充足时，可记住位置留待需要时再来。",
    },
    flow: {
      latin: "OCEAN CURRENT",
      role: "超级加速",
      keywords: "超级加速 冲刺 洋流",
      text: tr`拾取后立即回满体力并解除疲惫，之后${REWARDS.flow.duration}秒内冲刺不消耗体力。仍需按住冲刺键或触屏冲刺按钮，适合持续追捕或快速穿越危险海域。重复拾取会再次回满体力，并将效果刷新为${REWARDS.flow.duration}秒，不累加时长。`,
      counter:
        "被猎手追击时利用这段时间转向、绕开礁石并拉开距离。领主有特殊技能，不宜只靠直线冲刺逃脱。",
    },
    frenzy: {
      latin: "ABYSSAL FRENZY",
      role: "近距吸食",
      keywords: "吞噬 狂食 捕食 吸食 范围",
      text: tr`持续${REWARDS.frenzy.duration}秒：扩大近身吞噬范围，将附近无遮挡、原本就可捕食的水下生物吸向嘴部。不会临时变大，也不能越级捕食；吃鱼仍按正常规则回血和成长。`,
      counter: tr`沿着鱼群边缘游过，吸食可以减少反复对准。浅滩保留三种奖励各一枚，其余${RANDOM_REWARD_COUNT}枚奖励每局随机分布；拾取后45秒在本局原位刷新，再次拾取狂食只刷新${REWARDS.frenzy.duration}秒效果。大于或等于自己体长的生物、水雷、潜艇和领主不会被吸入；礁石与船体会阻挡吸食。领主仍需真实体长25米，并通过多次侧翼攻击击败。`,
    },
  };
}
function buildRewardCatalog() {
  const REWARD_DETAILS = buildRewardDetails();
  return Object.entries(REWARDS)
    .map(([id, reward]) => ({
      id: tr`reward_${id}`,
      kind: tr`reward_${id}`,
      category: "reward",
      ...reward,
      ...REWARD_DETAILS[id],
      ability: reward.effect,
      size: reward.duration ? tr`${reward.duration} 秒` : "即时",
    }))
    .map((entry) => ({
      ...localizeRecord(entry),
      regionIds: catalogRegionIds(entry),
      searchText: `${entry.name} ${entry.keywords} ${t(entry.name, [], "en")} ${t(entry.keywords, [], "en")}`,
    }));
}
let REWARD_CATALOG = buildRewardCatalog();
onLanguageChange(() => {
  OCEAN_CATALOG = buildOceanCatalog();
  REWARD_CATALOG = buildRewardCatalog();
});

/**
 * 创建首页海洋图鉴：分类检索、三维标本、奖励效果与生存建议。
 * @param {HTMLButtonElement} trigger 打开图鉴的首页按钮。
 * @returns {{open:Function,close:Function,setRegion:Function,isOpen:boolean}} 对话框控制器；setRegion接收可用海域ID。
 */
export function createOceanGuide(trigger) {
  const dialog = document.createElement("dialog");
  dialog.className = "ocean-guide";
  dialog.id = "ocean-guide";
  dialog.setAttribute("aria-labelledby", "guide-title");
  setMarkup(
    dialog,
    tr`<div class="guide-heading"><div><div class="guide-eyebrow">THE OCEAN ARCHIVE / 海洋档案</div><h2 id="guide-title">海洋图鉴</h2></div><button class="guide-close" aria-label="关闭海洋图鉴">关闭 <kbd>ESC</kbd></button></div><div class="guide-filters" role="group" aria-label="按档案分类筛选"></div><div class="guide-content"><aside class="guide-sidebar"><label for="guide-search">检索生物与奖励</label><input id="guide-search" type="search" placeholder="生物、奖励或能力" autocomplete="off"><div class="guide-list" aria-label="档案列表"></div></aside><section class="guide-detail" aria-label="当前档案资料"><div class="guide-preview" aria-label="生物三维展示"><span class="guide-specimen-tag">LIVE SPECIMEN / 可拖动旋转</span><div class="guide-variant-controls" role="group" aria-label="预览成年人物" hidden><span>人物外观</span><button type="button" data-human-sex="male" aria-pressed="true">男性</button><button type="button" data-human-sex="female" aria-pressed="false">女性</button></div><div class="guide-reward-display" hidden><div class="guide-eyebrow">OCEAN REWARDS / 海洋奖励</div><div class="guide-reward-orb" aria-hidden="true"><span></span></div><b class="guide-reward-effect"></b><small>在海洋中触碰拾取</small></div></div><div class="guide-info" aria-live="polite"></div></section></div><div class="guide-footer">本作生态、幻想生物与海洋奖励<span>← → 切换档案 · 生物可拖动旋转</span></div>`,
  );
  document.body.append(dialog);
  const regionRow = document.createElement("div");
  regionRow.className = "guide-region-row";
  setMarkup(
    regionRow,
    `<label for="guide-region">海域范围</label><select id="guide-region" aria-label="筛选图鉴海域"></select>`,
  );
  dialog.querySelector(".guide-filters").after(regionRow);
  const regionIntro = document.createElement("details");
  regionIntro.className = "guide-region-intro";
  regionRow.after(regionIntro);
  const regionSelect = regionRow.querySelector("select");
  const filters = [
    { id: "all", name: "全部" },
    { id: "player", name: "可选角色" },
    { id: "reward", name: "海洋奖励" },
    { id: "shoal", name: "小型鱼与鱼群" },
    { id: "hunter", name: "海洋霸主" },
    { id: "ancient", name: "远古巨兽" },
    { id: "lord", name: "深渊领主" },
    { id: "invertebrate", name: "海洋无脊椎" },
    { id: "surface", name: "海面" },
    { id: "human", name: "人类活动" },
    { id: "hazard", name: "海域奇观与危险" },
  ];
  const list = dialog.querySelector(".guide-list"),
    info = dialog.querySelector(".guide-info"),
    preview = dialog.querySelector(".guide-preview"),
    variants = dialog.querySelector(".guide-variant-controls"),
    rewardDisplay = dialog.querySelector(".guide-reward-display"),
    input = dialog.querySelector("input");
  let selectedRegion = "hawaii",
    regionScope = "current",
    regionalCatalog = buildOceanCatalog(selectedRegion),
    category = "all",
    selected = OCEAN_CATALOG[0],
    humanSex = "male",
    visible = OCEAN_CATALOG,
    renderer,
    environment,
    previewLights,
    scene,
    camera,
    model,
    loop = 0,
    lastTime = 0,
    rotation = 0,
    dragging = false,
    pointerX = 0,
    lastInteraction = 0;
  const modelCache = new Map();
  function syncRegionControl() {
    const region = REGIONS.find((entry) => entry.id === selectedRegion);
    setMarkup(
      regionSelect,
      tr`<option value="current">${tr`当前海域 · ${region.name}`}</option>${REGIONS.filter(
        (entry) => entry.available,
      )
        .map((entry) => tr`<option value="${entry.id}">${entry.name}</option>`)
        .join("")}<option value="all">全部海域</option>`,
    );
    regionSelect.value = regionScope;
  }
  function setRegion(regionId) {
    if (!REGIONS.some((region) => region.id === regionId && region.available))
      throw new Error(`Unknown guide region: ${regionId}`);
    if (selectedRegion === regionId) return false;
    selectedRegion = regionId;
    regionScope = "current";
    regionalCatalog = buildOceanCatalog(regionId);
    syncRegionControl();
    if (dialog.open) renderList();
    return true;
  }
  syncRegionControl();
  regionSelect.addEventListener("change", () => {
    regionScope = regionSelect.value;
    // 图鉴只切换资料配置；不调用远征选择或重建海域。
    regionalCatalog = buildOceanCatalog(
      regionScope === "current"
        ? selectedRegion
        : regionScope === "all"
          ? undefined
          : regionScope,
    );
    renderList();
  });
  for (const button of variants.querySelectorAll("button")) {
    button.addEventListener("click", () => {
      humanSex = button.dataset.humanSex;
      select(selected);
    });
  }
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const themeQuery = matchMedia("(prefers-color-scheme: dark)");
  // 系统主题变化只更新现有灯光；不重建模型、环境贴图或动画循环。
  function syncTheme() {
    const dark = themeQuery.matches;
    dialog.dataset.theme = dark ? "dark" : "light";
    if (!renderer || !previewLights) return;
    renderer.toneMappingExposure = dark ? 0.94 : 1;
    scene.environmentIntensity = dark ? 0.42 : 0.35;
    previewLights.fill.color.setHex(dark ? 0xc1dcdf : 0xc9e3e1);
    previewLights.fill.groundColor.setHex(dark ? 0x38505b : 0x677b71);
    previewLights.fill.intensity = dark ? 1.45 : 1.3;
    previewLights.key.color.setHex(dark ? 0xe6eee1 : 0xfff3dc);
    previewLights.key.intensity = dark ? 2.25 : 2.4;
    previewLights.rim.color.setHex(dark ? 0x9ed5e4 : 0x87cbd0);
    previewLights.rim.intensity = dark ? 1.65 : 1.2;
  }
  themeQuery.addEventListener("change", syncTheme);
  syncTheme();
  for (const filter of filters) {
    const button = document.createElement("button");
    button.textContent = t(filter.name);
    button.dataset.category = filter.id;
    button.setAttribute("aria-pressed", String(filter.id === category));
    button.addEventListener("click", () => {
      category = filter.id;
      renderList();
    });
    dialog.querySelector(".guide-filters").append(button);
  }
  function renderList() {
    const regionId = regionScope === "current" ? selectedRegion : regionScope;
    const region = REGIONS.find((r) => r.id === regionId);
    setMarkup(
      regionIntro,
      region
        ? tr`<summary>${region.name}<span>${region.objective.difficulty} · ${tr`${region.speciesKinds.length} 种生物`}</span></summary><p>${region.description}</p><p><b>远征目标</b> · ${region.objective.summary}</p><p>${region.objective.food}</p>`
        : tr`<summary>四大海域<span>探索 · 生存 · 独立结局</span></summary><p>选择一个海域，查看它的独有生物、食物层级与胜利条件。所有深渊领主击败后本局不再刷新。</p>`,
    );
    const search = input.value.trim().toLowerCase();
    // 默认“全部”保留生物总览；输入关键词时，也可直接找到奖励档案。
    const catalog =
      category === "reward"
        ? REWARD_CATALOG
        : category === "all" && search
          ? [...regionalCatalog, ...REWARD_CATALOG]
          : regionalCatalog;
    visible = filterOceanCatalog(catalog, {
      category,
      search,
      regionId:
        regionScope === "current"
          ? selectedRegion
          : regionScope === "all"
            ? undefined
            : regionScope,
    });
    list.replaceChildren();
    for (const button of dialog.querySelectorAll(".guide-filters button"))
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.category === category),
      );
    for (const group of groupOceanCatalog(visible)) {
      const section = document.createElement("section");
      section.className = "guide-group";
      section.dataset.guideCategory = group.id;
      section.setAttribute("aria-labelledby", `guide-group-${group.id}`);
      const heading = document.createElement("h3");
      heading.className = "guide-group-heading";
      heading.id = `guide-group-${group.id}`;
      setMarkup(
        heading,
        tr`<span>${group.name}</span><small>${group.entries.length}</small>`,
      );
      const entries = document.createElement("div");
      entries.className = "guide-group-entries";
      section.append(heading, entries);
      list.append(section);
      for (const entry of group.entries) {
        const button = document.createElement("button");
        button.className = "guide-entry";
        button.dataset.kind = entry.kind;
        button.dataset.catalogId = entry.id;
        button.style.setProperty("--specimen", entry.color);
        setMarkup(
          button,
          tr`<i></i><span><b>${entry.name}</b><small>${entry.role}</small></span><em>${entry.size}</em>`,
        );
        button.addEventListener("click", () => select(entry));
        entries.append(button);
      }
    }
    if (!visible.length) {
      list.textContent = t("没有找到档案，试试生物、奖励或能力关键词。");
      setMarkup(info, t("当前筛选无结果。"));
      preview.hidden = true;
      if (model) model.visible = false;
      return;
    }
    select(visible.find((entry) => entry.id === selected.id) || visible[0]);
  }
  function setupRenderer() {
    if (renderer) return;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      // 透明画布让CSS展台背景随系统主题切换，避免深色页内残留白色矩形。
      renderer.setClearColor(0x000000, 0);
      scene = new THREE.Scene();
      environment = createMarineEnvironment(renderer);
      scene.environment = environment.texture;
      previewLights = {
        fill: new THREE.HemisphereLight(),
        key: new THREE.DirectionalLight(),
        rim: new THREE.DirectionalLight(),
      };
      previewLights.key.position.set(4, 6, -5);
      previewLights.rim.position.set(-4, 2, 5);
      scene.add(previewLights.fill, previewLights.key, previewLights.rim);
      syncTheme();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
      preview.append(renderer.domElement);
    } catch {
      preview.querySelector(".guide-specimen-tag").textContent = t(
        "当前设备无法展示三维标本，仍可阅读资料",
      );
    }
  }
  function showRegionalFacts(entry) {
    // 重选同一档案时setMarkup会复用内容，先清理本轮补充行以免重复。
    for (const detail of info.querySelectorAll(
      ".guide-availability, .guide-extra-fact, .guide-feeding-note",
    ))
      detail.remove();
    const availability = document.createElement("div");
    availability.className = "guide-availability";
    const regionNames = REGIONS.filter((region) =>
      entry.regionIds.includes(region.id),
    )
      .map((region) => t(region.name))
      .join(" / ");
    setMarkup(
      availability,
      tr`<small>出现海域</small><span>${regionNames}</span>`,
    );
    info.querySelector(".guide-name-row").after(availability);
    if (!Number.isFinite(entry.nutrition)) return;
    const nutrition = document.createElement("div");
    nutrition.className = "guide-extra-fact";
    setMarkup(
      nutrition,
      tr`<small>基础营养</small><b>${Number(entry.nutrition.toFixed(2))}</b>`,
    );
    const speed = document.createElement("div");
    speed.className = "guide-extra-fact";
    setMarkup(speed, tr`<small>基础游速</small><b>${entry.speed} m/s</b>`);
    const facts = info.querySelector(".guide-facts");
    facts.append(nutrition, speed);
    const note = document.createElement("p");
    note.className = "guide-feeding-note";
    note.textContent = t(
      "基础营养为游戏数值，实际收益随相对体型和鱼群规则调整；进食同时恢复生命并用于成长。",
    );
    facts.after(note);
  }
  function select(entry) {
    selected = entry;
    for (const button of list.querySelectorAll("button")) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.catalogId === entry.id),
      );
      if (button.dataset.catalogId === entry.id) {
        // 只修正档案列表的滚动，不把手机资料页或标本展台拉走。
        const row = button.getBoundingClientRect();
        const bounds = list.getBoundingClientRect();
        if (list.scrollWidth > list.clientWidth) {
          if (row.right > bounds.right)
            list.scrollLeft += row.right - bounds.right;
          else if (row.left < bounds.left)
            list.scrollLeft += row.left - bounds.left;
        }
        if (list.scrollHeight > list.clientHeight) {
          if (row.bottom > bounds.bottom)
            list.scrollTop += row.bottom - bounds.bottom;
          else if (row.top < bounds.top) list.scrollTop += row.top - bounds.top;
        }
      }
    }
    dialog.style.setProperty("--specimen", entry.color);
    preview.hidden = false;
    const isHazard = entry.category === "hazard";
    const isReward = entry.category === "reward" || isHazard;
    const isPerson = ["swimmer", "diver"].includes(entry.kind);
    variants.hidden = !isPerson;
    preview.classList.toggle("has-variants", isPerson);
    for (const button of variants.querySelectorAll("button"))
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.humanSex === humanSex),
      );
    preview.classList.toggle("is-reward", isReward);
    preview.setAttribute(
      "aria-label",
      t(
        isReward
          ? tr`${entry.name}奖励标识`
          : isPerson
            ? tr`${entry.name} · ${humanSex === "female" ? "女性" : "男性"}模型`
            : "生物三维展示",
      ),
    );
    rewardDisplay.hidden = !isReward;
    dragging = false;
    if (isReward) {
      if (model) model.visible = false;
      rewardDisplay.querySelector(".guide-eyebrow").textContent = t(
        isHazard ? "海域奇观与危险" : "OCEAN REWARDS / 海洋奖励",
      );
      rewardDisplay.querySelector("small").textContent = t(
        isHazard ? entry.habitat : "在海洋中触碰拾取",
      );
      rewardDisplay.querySelector(".guide-reward-orb span").textContent = t(
        entry.symbol,
      );
      rewardDisplay.querySelector(".guide-reward-effect").textContent = t(
        entry.effect,
      );
      setMarkup(
        info,
        tr`<div class="guide-eyebrow">${entry.latin}</div><div class="guide-name-row"><h3>${entry.name}</h3><span>${entry.role}</span></div><div class="guide-facts"><div><small>持续时间</small><b>${entry.size}</b></div><div><small>获取方式</small><b>触碰拾取</b></div></div><h4>${entry.effect}</h4><p>${entry.text}</p><div class="guide-advice"><b>使用建议</b><p>${entry.counter}</p></div>`,
      );
      if (isHazard)
        setMarkup(
          info,
          tr`<div class="guide-eyebrow">${entry.latin}</div><div class="guide-name-row"><h3>${entry.name}</h3><span>${entry.role}</span></div><h4>${entry.effect}</h4><p>${entry.text}</p><div class="guide-advice"><b>生存建议</b><p>${entry.counter}</p></div>`,
        );
      showRegionalFacts(entry);
      return;
    }
    const hunter = getHunterAbility(entry);
    const combat =
      entry.category === "lord"
        ? tr`${"25米可交战 · 技能后3秒恢复窗 · 三次侧翼攻击，命中后需脱离再接近"} · ${tr`每次有效咬击恢复${BOSS_BITE_HUNGER}点饱食（最多100），不额外回血或成长；击败奖励另计。`}`
        : entry.category === "player"
          ? tr`巡游 ${characterMovement(entry.characterId).cruiseSpeed} m/s · 冲刺 ${characterMovement(entry.characterId).sprintSpeed} m/s`
          : hunter
            ? tr`蓄力 ${hunter.windupDuration} 秒 · 技能冷却 ${hunter.cooldownMin}—${hunter.cooldownMax} 秒追击时间`
            : entry.role;
    const survival =
      entry.category === "player"
        ? tr`<div class="guide-advice guide-survival"><b>成长与深潜</b><p>幼年先在安全浅滩补给；体型越大，小鱼的营养与成长收益越低，逐步转向外礁中型猎物和深海巨兽。</p><p>${tr`显示深度${HUNGER_RULES.shallowDepth * WORLD.displayDepthScale}米内没有深水加成；到${HUNGER_RULES.fullDepth * WORLD.displayDepthScale}米，3米幼年消耗为浅海的${1 + HUNGER_RULES.maxDepthBonus + HUNGER_RULES.juvenileDepthBonus}倍，${HUNGER_RULES.acclimatedLength}米及以上为${1 + HUNGER_RULES.maxDepthBonus}倍，中间平滑变化。深潜前吃饱，空体力不扣生命；饱食耗尽才会失血，回浅海会降低消耗。`}</p></div>`
        : "";
    setMarkup(
      info,
      tr`<div class="guide-eyebrow">${entry.latin}</div><div class="guide-name-row"><h3>${entry.name}</h3><span>${entry.role}</span></div><div class="guide-facts"><div><small>本作尺度</small><b>${entry.size}</b></div><div><small>活动水层</small><b>${entry.habitat}</b></div></div><h4>${entry.ability}</h4><p>${entry.text}</p><div class="guide-advice"><b>生存建议</b><p>${entry.counter}</p></div><small class="guide-combat">${combat}</small>${survival}${entry.realSize ? tr`<div class="guide-advice"><b>生态注记</b><p>${entry.realSize} ${entry.habitatNote || ""}</p></div>` : ""}`,
    );
    showRegionalFacts(entry);
    if (!renderer) return;
    if (model) scene.remove(model);
    const modelKey = isPerson ? tr`${entry.kind}_${humanSex}` : entry.kind;
    model = modelCache.get(modelKey);
    rotation = 0.2;
    if (!model) {
      // 每种标本只创建一次，避免重复选择时累积非共享的GPU几何缓冲。
      model =
        entry.category === "human"
          ? createHumanModel(entry.kind, 1, humanSex)
          : createCreature(entry.kind, 1, 24);
      model.rotation.y = rotation;
      const box = new THREE.Box3().setFromObject(model);
      model.position.sub(box.getCenter(new THREE.Vector3()));
      modelCache.set(modelKey, model);
    }
    model.rotation.y = rotation;
    model.visible = true;
    scene.add(model);
    resize();
  }
  function resize() {
    if (
      !renderer ||
      !model ||
      !dialog.open ||
      preview.hidden ||
      ["reward", "hazard"].includes(selected.category)
    )
      return;
    const width = preview.clientWidth,
      // 人物切换有独立底部槽位，不覆盖模型，也不新增画布或动画循环。
      height = preview.clientHeight - (variants.hidden ? 0 : 58);
    if (!width || !height) return;
    renderer.setSize(width, height);
    const aspect = width / height;
    const size = new THREE.Box3()
      .setFromObject(model)
      .getSize(new THREE.Vector3());
    const half = Math.max(
      0.33,
      size.y * 0.75,
      size.length() * 0.23,
      0.6 / aspect,
    );
    camera.left = -half * aspect;
    camera.right = half * aspect;
    camera.top = half;
    camera.bottom = -half;
    camera.position.set(3, 1, -2.5);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  function frame(now) {
    if (!dialog.open) return;
    const dt = Math.min((now - lastTime) / 1000, 0.04);
    lastTime = now;
    if (
      model?.visible &&
      renderer &&
      !["reward", "hazard"].includes(selected.category)
    ) {
      if (!dragging && !reduceMotion && now - lastInteraction > 1200)
        rotation += dt * 0.14;
      model.rotation.y = rotation;
      model.userData.animate?.(now / 1000, 0.5);
      renderer.render(scene, camera);
    }
    loop = requestAnimationFrame(frame);
  }
  function open() {
    if (dialog.open) return;
    dialog.showModal();
    setupRenderer();
    renderList();
    lastTime = performance.now();
    loop = requestAnimationFrame(frame);
    input.focus();
  }
  function close() {
    dialog.close();
  }
  onLanguageChange(() => {
    const selectedId = selected.id;
    regionalCatalog = buildOceanCatalog(
      regionScope === "current"
        ? selectedRegion
        : regionScope === "all"
          ? undefined
          : regionScope,
    );
    selected =
      [...regionalCatalog, ...REWARD_CATALOG].find(
        (entry) => entry.id === selectedId,
      ) || OCEAN_CATALOG[0];
    for (const filter of filters) {
      dialog.querySelector(`[data-category="${filter.id}"]`).textContent = t(
        filter.name,
      );
    }
    translateDOM(dialog);
    syncRegionControl();
    if (dialog.open) renderList();
  });
  trigger.addEventListener("click", open);
  dialog.querySelector(".guide-close").addEventListener("click", close);
  dialog.addEventListener("close", () => {
    cancelAnimationFrame(loop);
    dragging = false;
    trigger.focus();
  });
  input.addEventListener("input", renderList);
  dialog.addEventListener("keydown", (event) => {
    if (
      event.target === input ||
      event.target === regionSelect ||
      event.target.closest(".guide-variant-controls") ||
      !["ArrowLeft", "ArrowRight"].includes(event.key) ||
      !visible.length
    )
      return;
    event.preventDefault();
    select(
      visible[
        (visible.indexOf(selected) +
          (event.key === "ArrowRight" ? 1 : visible.length - 1)) %
          visible.length
      ],
    );
  });
  preview.addEventListener("pointerdown", (event) => {
    if (
      ["reward", "hazard"].includes(selected.category) ||
      event.target.closest(".guide-variant-controls")
    )
      return;
    dragging = true;
    pointerX = event.clientX;
    preview.setPointerCapture(event.pointerId);
  });
  preview.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    rotation += (event.clientX - pointerX) * 0.008;
    pointerX = event.clientX;
    lastInteraction = performance.now();
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    preview.addEventListener(event, () => {
      dragging = false;
    });
  new ResizeObserver(resize).observe(preview);
  window.addEventListener("pagehide", (event) => {
    // 图鉴关闭保留模型和环境缓存；页面真正离开时释放独立的反射渲染目标。
    if (!event.persisted) {
      themeQuery.removeEventListener("change", syncTheme);
      environment?.dispose();
    }
  });
  return {
    // 仅开发环境提供只读预览引用，用实际图鉴渲染完整动作周期。
    ...(import.meta.env.DEV
      ? { inspectPreview: () => ({ model, renderer, scene, camera }) }
      : {}),
    open,
    close,
    setRegion,
    get isOpen() {
      return dialog.open;
    },
  };
}
