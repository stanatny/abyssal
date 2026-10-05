import { ATLANTIS_EXCAVATION_SITES } from "./atlantis_terrain.js";

// 港口鱼群跟随已验收的下厅回转区，避免建筑下挖后食物仍悬在旧廊道。
const HARBOR_HALL = ATLANTIS_EXCAVATION_SITES.find(
  (site) => site.reservation === "harbor_sanctuary",
).turningCircle;
const AGORA_SCHOOL = ATLANTIS_EXCAVATION_SITES.find(
  (site) => site.reservation === "agora_bridges",
).fishSanctuary;
const TEMPLE_SITE = ATLANTIS_EXCAVATION_SITES.find(
  (site) => site.reservation === "poseidon_main_temple",
);
const TEMPLE_SCHOOL = TEMPLE_SITE.fishSanctuary;
const TEMPLE_TUNA = TEMPLE_SITE.secondaryFishSanctuary;

// 城市水层是幻想海域的游戏改编；只复用已有物种，不改体长、营养或成长。
const CITY_SCHOOLS = {
  spadefish: [
    [HARBOR_HALL.x, HARBOR_HALL.y, HARBOR_HALL.z, 8, 6, "harbor_sanctuary"],
    [
      AGORA_SCHOOL.anchor.x,
      AGORA_SCHOOL.anchor.y,
      AGORA_SCHOOL.anchor.z,
      AGORA_SCHOOL.count,
      AGORA_SCHOOL.band,
      "agora_bridges",
    ],
    [-88, -400, -650, 8],
    [-215, -628.57513325, -999.5, 8, 6, "memorial_terrace"],
  ],
  sardine: [
    [88, -165, -310, 8],
    [-88, -300, -500, 8],
    [88, -485, -770, 8],
    [-88, -580, -920, 8],
    [18, -402, -650, 8],
    [
      TEMPLE_SCHOOL.anchor.x,
      TEMPLE_SCHOOL.anchor.y,
      TEMPLE_SCHOOL.anchor.z,
      TEMPLE_SCHOOL.count,
      TEMPLE_SCHOOL.band,
      TEMPLE_SITE.reservation,
    ],
  ],
  sunfish: [
    [-22, -180, -345, 4],
    [25, -365, -600, 4],
  ],
  tuna: [
    [22, -270, -475, 9],
    [-24, -510, -830, 6],
    [
      TEMPLE_TUNA.anchor.x,
      TEMPLE_TUNA.anchor.y,
      TEMPLE_TUNA.anchor.z,
      TEMPLE_TUNA.count,
      TEMPLE_TUNA.band,
      TEMPLE_SITE.reservation,
    ],
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
      // 专属地下中鱼净空按原成年巡游验收，不能增加队形直到挤出通道。
      ...(citySite && species.length >= 1 ? { densityLimit: count } : {}),
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
    // 大型定居猎物沿外侧街区巡游，避免增密副本的中心落入神庙实体墙。
    const lateral =
      species.residentRadius > 0 ? 125 : index % 3 === 0 ? 85 : 18;
    return [(index % 2 ? 1 : -1) * lateral, -depth, z];
  });
}
