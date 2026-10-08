import { AMAZON_BIOMES, amazonIslandBounds } from "./amazon_config.js";
import { EUROPA_HABITATS } from "./europa_config.js";
import * as THREE from "three";
import { getZone } from "./simulation.js";
import { atlantisDistrict } from "./atlantis_city_plan.js";

const ATLANTIS_ZONES = {
  reef: {
    name: "月辉浅滩",
    code: "MOONLIT LAGOON",
    description: "在月光下的安全鱼群中成长，再前往沉没城区。",
  },
  twilight: {
    name: "沉没外城",
    code: "SUNKEN OUTSKIRTS",
    description: "穿过残墙与列柱，寻找更大的猎物。",
  },
  abyss: {
    name: "波塞冬古城",
    code: "CITY OF POSEIDON",
    description:
      "沿珠光探索古城住宅与波塞冬神殿，穿过祭殿中央的开口进入地宫；留意克拉肯。",
  },
  hadal: {
    name: "星渊裂谷",
    code: "STARLESS RIFT",
    description: "离开城中光源便是暗渊，记得预留返程补给。",
  },
};

/** 海域仅改变区域展示，深度阈值与饥饿计算仍由共享规则决定。 */
export function regionZone(regionId, depth, position = null) {
  const zone = getZone(depth);
  if (regionId === "odyssey") {
    const row =
      depth < 60
        ? ["伊萨卡浅湾", "ITHACAN SHALLOWS"]
        : depth < 200
          ? ["海妖花园", "NEREID GARDENS"]
          : depth < 330
            ? ["断桅遗迹", "BROKEN-MAST RUINS"]
            : depth < 490
              ? ["六首峡口", "SIX-HEADED STRAIT"]
              : ["吞潮深潭", "TIDE-SWALLOWING BASIN"];
    return {
      ...zone,
      name: row[0],
      code: row[1],
      description:
        "沿贝园与古代航路成长，寻找三位守卫领域外的丰厚食物，再探索深水峡口。",
    };
  }
  if (regionId === "penglai")
    return {
      ...zone,
      name:
        !position || position.z > -150
          ? "莲池育幼湾"
          : position.y < 4
            ? "蓬莱莲池"
            : position.y > 230
              ? "九霄云海"
              : "桃林仙山",
      code:
        !position || position.z > -150
          ? "LOTUS NURSERY"
          : position.y < 4
            ? "LOTUS WATERS"
            : position.y > 230
              ? "CELESTIAL CLOUDS"
              : "PEACH MOUNTAINS",
      description:
        "在浅水与云海间自由游动，寻找神话生灵；25米后挑战四神兽与御剑真君。",
    };
  if (regionId === "amazon") {
    const bounds = position && amazonIslandBounds(position.z);
    const underIsland =
      bounds &&
      position.x > bounds.left &&
      position.x < bounds.right &&
      depth > 38;
    const id =
      !position || position.z > -150
        ? "nursery"
        : underIsland
          ? "root_vault"
          : depth > 170
            ? position.x < 0
              ? "serpent_pool"
              : "rootjaw_pool"
            : position.x < 0
              ? "roots"
              : "floodforest";
    const biome = AMAZON_BIOMES.find((b) => b.id === id);
    return {
      ...zone,
      name: biome.name,
      code: {
        nursery: "WATER-LILY NURSERY",
        roots: "ROOTBOUND MEANDERS",
        floodforest: "FLOODED FOREST",
        root_vault: "UNDER-ISLAND ROOT VAULT",
        serpent_pool: "SERPENT POOL",
        rootjaw_pool: "ROOTJAW BASIN",
      }[id],
      description:
        "沿浮叶和根系捕食，再探索两侧支流；潜到林岛底部，可穿行根窟往返两条河道。",
    };
  }
  if (regionId === "europa") {
    const index =
      depth < 60 ? 0 : depth < 180 ? 1 : depth < 400 ? 2 : depth < 650 ? 3 : 4;
    return {
      ...zone,
      name: EUROPA_HABITATS[index].name,
      code: [
        "ICE CRADLE",
        "BRINE ARCHES",
        "SUSPENDED GARDEN",
        "THERMAL BASIN",
        "WEAVER’S HOLLOW",
      ][index],
      description: "冰下幻想生态；沿盐脉、悬生群落与热泉寻找食物。",
    };
  }
  if (regionId === "mariana") {
    const row =
      depth < 80
        ? [
            "珍珠浅棚",
            "PACIFIC SHELF",
            "从15米起步，沿岩壁寻找大鱼；首层深水有三头巨龙。",
          ]
        : depth < 650
          ? [
              "三首浮雕岩谷",
              "THREE-HEAD CANYON",
              "沿三首浮雕与岩廊寻找大鱼，25米后挑战海德拉。",
            ]
          : depth < 1000
            ? [
                "回声穹窟",
                "ECHO VAULT",
                "穿过回声穹窟，留意巨型鱼龙；下潜前补足饥饿。",
              ]
            : depth < 1375
              ? [
                  "紫晶化石花园",
                  "VIOLET FOSSIL GARDEN",
                  "紫晶与化石标记第三层，沿已开启的通道退回补给。",
                ]
              : depth < 2150
                ? [
                    "巨柱裂渊",
                    "GIANT-COLUMN CHASM",
                    "巨柱之间有绕行岩廊，先补给再挑战最后的守卫。",
                  ]
                : [
                    "挑战者秘境",
                    "CHALLENGER REFUGE",
                    "沿暖光抵达底部街区，突破四关并成长至30米即可获胜。",
                  ];
    return { ...zone, name: row[0], code: row[1], description: row[2] };
  }
  if (regionId === "bermuda")
    return {
      ...zone,
      ...{
        reef: {
          name: "风暴礁湾",
          code: "SHELTERED REEF",
          description: "在安全礁湾成长，外海各水层都藏着危险。",
        },
        twilight: {
          name: "迷雾外海",
          code: "STORMBOUND SEA",
          description: "表层海德拉、幽灵炮击与旋风阻断航路。",
        },
        abyss: {
          name: "失落邮轮",
          code: "THE LOST LINER",
          description: "从破口和中庭进入沉船，警惕外围的巨兽。",
        },
        hadal: {
          name: "百慕大深沟",
          code: "BERMUDA TRENCH",
          description: "远古猎手与深渊领主分守幽暗海沟。",
        },
      }[zone.id],
    };
  if (regionId !== "atlantis") return zone;
  // 地理城区独立于饥饿深度分带；浅水上方仍使用海洋分带名称。
  const district =
    position && depth > 75 ? atlantisDistrict(position.x, position.z) : null;
  if (district)
    return {
      ...zone,
      ...ATLANTIS_ZONES[zone.id],
      name: district.name,
      code: district.en,
    };
  return { ...zone, ...ATLANTIS_ZONES[zone.id] };
}

/** 城市主体拥有常驻照明，外城暗巷保留深海明暗对比。 */
export function cityLightBlend(position) {
  const lateral =
    1 - THREE.MathUtils.smoothstep(Math.abs(position.x), 215, 292);
  const longitudinal =
    THREE.MathUtils.smoothstep(-position.z, 85, 155) *
    (1 - THREE.MathUtils.smoothstep(-position.z, 1030, 1135));
  const avenue = 1 - THREE.MathUtils.smoothstep(Math.abs(position.x), 95, 215);
  const depth = THREE.MathUtils.smoothstep(-position.y, 100, 240);
  return lateral * longitudinal * depth * (0.65 + 0.35 * avenue);
}
