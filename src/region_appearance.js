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
