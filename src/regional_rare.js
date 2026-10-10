import { WORLD } from "./world_config.js";
import { AMAZON_WORLD } from "./amazon_config.js";
import { EUROPA_WORLD } from "./europa_config.js";
import { MARIANA_WORLD } from "./mariana_config.js";
import { PENGLAI_WORLD } from "./penglai_config.js";
import { RARE_PURSUIT_RULES } from "./regional_rare_pursuit.js";

export const ECOSYSTEM_EN = { 通用生存规则: "Shared survival rules" };
function copy(zh, en) {
  ECOSYSTEM_EN[zh] = en;
  return zh;
}
const definitions = [
  [
    "odyssey",
    "golden_argonaut",
    copy("金帆船蛸", "Golden Argonaut"),
    "#ddb56d",
    [-150, -190, -400],
    copy(
      "古航路外侧的贝园、断桅与沉锚",
      "Secluded shell gardens, broken masts and anchors beside the old sea road",
    ),
  ],
  [
    "hawaii",
    "golden_manta",
    copy("金翎蝠鲼", "Gilded Manta"),
    "#e3b75a",
    [145, -74, -285],
    copy(
      "远离出生浅滩的外礁岩肩",
      "Secluded outer-reef shelves away from the starting shallows",
    ),
  ],
  [
    "atlantis",
    "pearl_nautilus",
    copy("珠纹鹦鹉螺", "Pearl Nautilus"),
    "#b1e3df",
    [-120, -318, -550],
    copy(
      "古城外围柱廊与遗迹石台",
      "Stone ledges and colonnades around the outer city",
    ),
  ],
  [
    "bermuda",
    "crimson_sail",
    copy("绯帆长吻鱼", "Crimson Sailfin"),
    "#e97b79",
    [165, -145, -360],
    copy("风暴海域的偏远沉船碎片带", "Remote wreckage fields in the storm sea"),
  ],
  [
    "mariana",
    "glass_prawn",
    copy("蓝灯玻璃虾", "Blue-lantern Prawn"),
    "#81c9e8",
    [-80, -380, -250],
    copy(
      "第一重封印上方的隐蔽岩壁",
      "Secluded rock walls above the first seal",
    ),
  ],
  [
    "amazon",
    "jade_arowana",
    copy("翡翠银龙鱼", "Jade Arowana"),
    "#77cdb0",
    [-230, -76, -410],
    copy(
      "西支流沉根后的静水湾",
      "The quiet backwater behind western-branch roots",
    ),
  ],
  [
    "europa",
    "crystal_seraph",
    copy("六翼晶冠体", "Six-wing Crystal Seraph"),
    "#c3a9e0",
    [135, -122, -195],
    copy(
      "盐脉拱廊与深处的晶体凹地",
      "Crystal hollows near brine arches and deeper shelves",
    ),
  ],
  [
    "penglai",
    "gilded_cloud_carp",
    copy("流金云鲤", "Gilded Cloud Carp"),
    "#e4c485",
    [-370, 155, -345],
    copy(
      "桃林上方的隐云山肩",
      "Cloud-veiled mountain shoulders above peach groves",
    ),
  ],
];
const searchAreas = {
  odyssey: [
    [-150, -190, -400],
    [160, -250, -495],
    [-130, -300, -560],
  ],
  hawaii: [
    [145, -74, -285],
    [-190, -125, -430],
    [215, -180, -510],
  ],
  atlantis: [
    [-120, -318, -550],
    [210, -450, -680],
    [-230, -550, -810],
  ],
  bermuda: [
    [165, -145, -360],
    [-205, -230, -540],
    [235, -340, -720],
  ],
  mariana: [
    [-80, -380, -250],
    [80, -400, -285],
    [-65, -410, -325],
  ],
  amazon: [
    [-230, -76, -410],
    [-210, -85, -475],
    [-225, -66, -330],
  ],
  europa: [
    [135, -122, -195],
    [-110, -190, -290],
    [165, -245, -360],
  ],
  penglai: [
    [-370, 155, -345],
    [320, 195, -390],
    [-175, 235, -440],
  ],
};
const worlds = {
  amazon: AMAZON_WORLD,
  europa: EUROPA_WORLD,
  mariana: MARIANA_WORLD,
  penglai: PENGLAI_WORLD,
};
/** 珍兽是独立的每局唯一居民，不参与普通食物加密或随机奖励生成。 */
export const REGIONAL_RARES = Object.freeze(
  definitions.map(([regionId, kind, label, color, anchor, habitatLabel]) =>
    Object.freeze({
      regionId,
      kind,
      label,
      color,
      habitatLabel,
      category: "rare",
      tier: 0,
      latin: "REGIONAL RARE",
      length: 1.8,
      population: 1,
      schoolSize: 1,
      independentMovement: true,
      predator: false,
      nutrition: 0,
      growth: 0,
      speed: RARE_PURSUIT_RULES.cruiseSpeed,
      escapeSpeed: RARE_PURSUIT_RULES.escapeSpeed,
      elusive: true,
      cityHabitat: true,
      residentRadius: 90,
      depthMin: -anchor[1] - 24,
      depthMax: -anchor[1] + 24,
      spawnAnchors: Object.freeze(
        searchAreas[regionId].map((a) => Object.freeze(a)),
      ),
      worldBounds: worlds[regionId] || WORLD,
      flying: regionId === "penglai",
      ability: copy(
        "珍兽恩赐 · 本局上限150",
        "Rare blessing · 150 vital caps this round",
      ),
      description: copy(
        "每次远征仅有一只，随机栖息于隐蔽区域，捕获后不再刷新。吞食立即补满生命、体力与饥饿，并将三项上限提升至150；新远征恢复100。捕获时彩光收束并环绕主角。它会巡游、逃跑和变向躲闪；普通游速难以追上，预判路线并短冲刺可以拉近距离。狂食的近距吸食对它生效；尸鲨仆从也能加速追捕珍兽，恩赐归主角。",
        "One per expedition, in a randomly chosen secluded area, with no respawn after capture. Eating it fills health, stamina and hunger and raises all three caps to 150 for this round; a new expedition resets them to 100. Rainbow light gathers around the owner on capture. It patrols, flees and dodges; cruise swimming cannot close the gap, but anticipation and a short sprint can. Frenzy suction also works on it. A Zombie Shark companion can speed up to hunt it and awards its blessing to you.",
      ),
      counter: copy(
        "线索只指向可能的栖息区域，不代表固定位置。开局即可寻找和捕获，无需长到30米。首次游经活动圈以内的海域时，无论深度，都会提示“发现珍兽海域”，并在小地图揭示柔光虹彩活动圈；开局不会提前标记。发现后，箭头按当前朝向指向这片栖地，“更深／更高”提示水层；靠近个体时提示附近有珍兽。已发现的范围保留到捕获或新局。范围不追踪它的实时位置。发现其发亮的虹彩菱形后，预判转向并冲刺追捕。",
        "Clues indicate possible habitats, not a fixed location. You can find and catch it from the start; no 30 m requirement. First swimming through the habitat circle, at any depth, reveals its glowing rainbow minimap ring and a Rare area found notice. It is not marked at the start. After discovery, the arrow points toward that area relative to your heading; deeper/higher indicates its layer. A nearby notice appears closer to the creature. Known areas remain until capture or a new round. The ring does not track its live position. Once you spot its glowing rainbow diamond, anticipate its turns and sprint after it.",
      ),
      realSize: copy(
        "各地独有的神秘珍兽，藏于偏僻水域或山间，鳞光与翼纹承载着当地的传说。",
        "A mysterious creature unique to its region, hidden in secluded waters or mountains, with scales and wing markings that carry local legends.",
      ),
    }),
  ),
);
const byKind = new Map(REGIONAL_RARES.map((s) => [s.kind, s]));
export function getRegionalRare(regionId) {
  return REGIONAL_RARES.find((s) => s.regionId === regionId);
}
export function isRegionalRare(prey) {
  return byKind.has(prey?.kind);
}
/** 唯一珍兽永不在本局重生；普通生态沿用已接受的18/28秒间隔。 */
export function preyRespawnDelay(prey) {
  return isRegionalRare(prey) ? Infinity : prey.schoolSize > 1 ? 18 : 28;
}
copy("专属珍兽", "Regional rares");
copy("附近有珍兽", "Rare nearby");
copy("珍兽线索", "Rare clue");
copy("发现珍兽海域", "Rare area found");
copy("更深", "deeper");
copy("更高", "higher");
copy("同一层", "level");
copy(
  "珍兽恩赐 · 三项补满，上限150（本局）",
  "Rare blessing · All vitals filled, caps 150 this round",
);
copy("生命、体力与饥饿上限", "Health, stamina and hunger caps");

/** 每次远征重新选一处隐秘栖地；不修改图鉴/生态注册表的共享对象。 */
export function chooseRareHabitat(species, random = Math.random) {
  const anchors = species.spawnAnchors;
  const selected =
    anchors[
      Math.min(anchors.length - 1, Math.floor(random() * anchors.length))
    ];
  const anchor = [
    selected[0] + (random() - 0.5) * 12,
    selected[1],
    selected[2] + (random() - 0.5) * 12,
  ];
  return {
    ...species,
    spawnAnchors: [anchor],
    depthMin: -anchor[1] - 30,
    depthMax: -anchor[1] + 30,
  };
}
