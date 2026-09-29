// 城市水层是幻想海域的游戏改编；只复用已有物种，不改体长、营养或成长。
const CITY_SCHOOLS = {
  spadefish: [
    [-215, -81.696494285, -240.5, 8, 6, "harbor_sanctuary"],
    [215, -226.355227942, -447.5, 8, 6, "agora_bridges"],
    [-88, -400, -650, 8],
    [-215, -628.57513325, -999.5, 8, 6, "memorial_terrace"],
  ],
  sardine: [
    [88, -165, -310, 8],
    [-88, -300, -500, 8],
    [88, -485, -770, 8],
    [-88, -580, -920, 8],
    [18, -402, -650, 8],
    [32, -608, -968, 8],
  ],
  sunfish: [
    [-22, -180, -345, 4],
    [25, -365, -600, 4],
  ],
  tuna: [
    [22, -270, -475, 9],
    [-24, -510, -830, 9],
  ],
  ray: [
    [-20, -205, -375, 2],
    [24, -350, -575, 2],
    [-25, -470, -745, 2],
    [28, -610, -975, 2],
  ],
};

/**
 * 将原有浅海鱼群与城区常驻鱼群合并，保持原育幼数量与队形不变。
 * @param {object} species 海域配置；schoolAnchors 必须显式给出原有栖息点。
 * @returns {object} 独立区域配置，含逐群数量、固定水层与城区居民标记。
 */
export function addAtlantisCitySchools(species) {
  const city = CITY_SCHOOLS[species.kind];
  if (!city) return species;
  const profiles = [];
  for (let start = 0; start < species.population; start += species.schoolSize) {
    const anchor =
      species.schoolAnchors[profiles.length % species.schoolAnchors.length];
    const layered = species.layeredSchools;
    profiles.push({
      anchor: [...anchor],
      count: Math.min(species.schoolSize, species.population - start),
      depthMin: layered
        ? Math.max(species.depthMin, -anchor[1] - 18)
        : species.depthMin,
      depthMax: layered
        ? Math.min(species.depthMax, -anchor[1] + 18)
        : species.depthMax,
      nurseryResident: !!species.nurseryResident,
      cityResident: false,
    });
  }
  for (const [x, y, z, count, band = 12, citySite = null] of city)
    profiles.push({
      anchor: [x, y, z],
      count,
      depthMin: -y - band,
      depthMax: -y + band,
      nurseryResident: false,
      cityResident: true,
      citySite,
    });
  return {
    ...species,
    population: profiles.reduce((sum, profile) => sum + profile.count, 0),
    depthMax: Math.max(...profiles.map((profile) => profile.depthMax)),
    schoolProfiles: profiles,
  };
}

/**
 * 沿城区大道和侧廊安排大型食物，保留各物种原有深度范围。
 * @param {object} species 已确定数量与水层的古生物配置。
 * @returns {number[][]} 每只动物独立锚点；最终生成仍须经过真实海床及碰撞检查。
 */
export function atlantisLargePreyAnchors(species) {
  return Array.from({ length: species.population }, (_, index) => {
    const t = 0.12 + (index / Math.max(1, species.population - 1)) * 0.84;
    const depth = species.depthMin + (species.depthMax - species.depthMin) * t;
    const z = -200 - (depth + 60 - 140) / 0.72;
    return [(index % 2 ? 1 : -1) * (index % 3 === 0 ? 85 : 18), -depth, z];
  });
}
