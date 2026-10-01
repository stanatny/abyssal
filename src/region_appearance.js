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
  if (regionId === "mariana") {
    const row =
      depth < 80
        ? [
            "珍珠浅棚",
            "PACIFIC SHELF",
            "从15米起步，沿岩壁寻找大鱼；外海水面有三头巨龙。",
          ]
        : depth < 650
          ? [
              "回声裂谷",
              "ECHO CANYON",
              "沿发光生物辨认下降路线，先寻找更大的食物。",
            ]
          : depth < 1375
            ? ["幽蓝阶渊", "BLUE DESCENT", "穿过开阔岩廊，寻找下一位守关领主。"]
            : depth < 2150
              ? [
                  "超深渊回廊",
                  "HADAL GALLERIES",
                  "观察微小狮子鱼，寻找巨兽补给与最后的守卫。",
                ]
              : [
                  "挑战者秘境",
                  "CHALLENGER REFUGE",
                  "最深处藏着一抹暖光，沿光亮寻找秘密。",
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
