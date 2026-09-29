import { WORLD } from "./world_config.js";

// 城区占真实水平海域约69.64%；统计的是有道路、街坊和广场的城区，而非建筑投影面积。
export const ATLANTIS_CITY_BOUNDS = Object.freeze({
  minX: -275,
  maxX: 275,
  minZ: -1080,
  maxZ: -100,
});
export const ATLANTIS_DISTRICTS = Object.freeze([
  {
    id: "harbor",
    name: "月湾古港",
    en: "MOON HARBOR",
    z0: -100,
    z1: -300,
    tone: "#b0b8ad",
  },
  {
    id: "market",
    name: "沉没市集",
    en: "DROWNED AGORA",
    z0: -300,
    z1: -500,
    tone: "#94aaaa",
  },
  {
    id: "civic",
    name: "列柱圣道",
    en: "SACRED AVENUE",
    z0: -500,
    z1: -680,
    tone: "#b7bcb2",
  },
  {
    id: "royal",
    name: "波塞冬王城",
    en: "POSEIDON ACROPOLIS",
    z0: -680,
    z1: -900,
    tone: "#bac3bf",
  },
  {
    id: "necropolis",
    name: "星渊陵园",
    en: "STARLESS NECROPOLIS",
    z0: -900,
    z1: -1080,
    tone: "#71878e",
  },
]);

/** 返回城区范围比例，用于地图尺度验收；水面/立体楼层不重复计数。 */
export function cityCoverage() {
  const b = ATLANTIS_CITY_BOUNDS;
  return (
    ((b.maxX - b.minX) * (b.maxZ - b.minZ)) /
    ((WORLD.maxX - WORLD.minX) * (WORLD.maxZ - WORLD.minZ))
  );
}

/** 按世界位置查询真实街区；浅滩仍在城区之外。 */
export function atlantisDistrict(x, z) {
  const b = ATLANTIS_CITY_BOUNDS;
  if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return null;
  return ATLANTIS_DISTRICTS.find((d) => z <= d.z0 && z >= d.z1) || null;
}

/** 统一街区用地：中央60米圣道、横向通道与竞技场不被随机建筑占用。 */
export function cityLots() {
  const lots = [];
  for (let row = 0; row < 14; row++) {
    const z = -137 - row * 69;
    for (const x of [-247, -183, -119, -55, 55, 119, 183, 247]) {
      // 王城中央保留一个真正开放的大广场，外围街区连续延伸。
      if (Math.abs(x) < 140 && z < -675 && z > -895) continue;
      lots.push({ x, z, row, district: atlantisDistrict(x, z).id });
    }
  }
  return lots;
}
