/** 黑色海荨麻按伞径计体型；下垂口腕与触须不扩大吞噬门槛或攻击范围。 */
export const BLACK_SEA_NETTLE_SPECIES = freezeRecord({
  kind: "black_sea_nettle",
  label: "黑色海荨麻水母",
  latin: "CHRYSAORA ACHLYOS",
  category: "invertebrate",
  tier: 0,
  predator: false,
  length: 1,
  speed: 0.4,
  escapeSpeed: 0.55,
  depthMin: 6,
  depthMax: 50,
  population: 10,
  schoolSize: 1,
  residentRadius: 8,
  populationSpacing: 2.5,
  // 缓慢漂游保留伞体朝上；长口腕只需离底余量，不接管整身游向或战斗碰撞。
  upright: true,
  groundClearance: 4.5,
  nutrition: 14,
  growth: 0.025,
  color: "#76619b",
  realSize: "本作伞径1米；口腕与触须另计。现实中口腕可长约6米。",
  ability: "伞体脉游",
  description:
    "黑紫色伞体下垂着四条褶皱口腕，伞缘伸出细长触须。伞体缓慢收缩，口腕与触须随水流摆动；本作中不主动攻击主角。",
  habitatNote:
    "参考北美太平洋沿岸的黑色海荨麻水母；跨海域出现为本作生态适配，不代表真实原生分布。",
  counter:
    "在浅海开阔水层寻找较大的黑紫色伞体；靠近伞体捕食，长口腕不计入伞径。",
});

// 只在开放海洋水层分布；锚点与完整漂游空间按各图最终海床和实体独立核对。
const HABITATS = freezeRecord({
  hawaii: [
    [2, -10.8, 65],
    [12, -12.4, 45],
    [-15, -16, 20],
    [22, -14.8, 15],
    [-18, -20, -15],
    [23, -21, -32],
    [-21, -23, -52],
    [18, -24, -70],
    [-22, -26, -90],
    [18, -27, -108],
  ],
  bermuda: [
    [-10, -12, 60],
    [15, -14, 25],
    [-18, -16, -10],
    [20, -18, -43],
    [-18, -21, -77],
    [18, -24, -110],
  ],
  atlantis: [
    [-10, -12, 61],
    [14, -14, 28],
    [-19, -16, -5],
    [23, -18, -40],
    [-20, -20, -75],
    [22, -23, -108],
  ],
  mariana: [
    [-10, -12, 60],
    [16, -14, 25],
    [-18, -16, -10],
    [20, -18, -43],
    [-18, -20, -75],
    [18, -22, -108],
  ],
  odyssey: [
    [-10, -12, 60],
    [16, -14, 25],
    [-18, -16, -10],
    [22, -18, -43],
    [-22, -20, -76],
    [20, -22, -110],
  ],
});

/** 返回该海域独立的普通居民配置；河流、冰下与仙山不套用开放海洋物种。 */
export function blackSeaNettleEcology(regionId, worldBounds) {
  if (!Object.hasOwn(HABITATS, regionId)) return null;
  const spawnAnchors = HABITATS[regionId];
  if (
    !worldBounds ||
    !["minX", "maxX", "minZ", "maxZ", "maxDepth"].every((key) =>
      Number.isFinite(worldBounds[key]),
    )
  )
    throw new TypeError(
      "Black sea nettle habitats require finite world bounds",
    );
  return freezeRecord({
    ...BLACK_SEA_NETTLE_SPECIES,
    population: spawnAnchors.length,
    worldBounds: { ...worldBounds },
    spawnAnchors,
  });
}

function freezeRecord(value) {
  for (const child of Object.values(value))
    if (child && typeof child === "object" && !Object.isFrozen(child))
      freezeRecord(child);
  return Object.freeze(value);
}
