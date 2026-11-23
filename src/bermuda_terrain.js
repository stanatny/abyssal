import { WRECK_BED } from "./bermuda_sites.js";
import { BERMUDA_WORLD as WORLD } from "./bermuda_config.js";
import { BERMUDA_TITAN_ENTRY_TERRAIN as ENTRY } from "./bermuda_cave_config.js";

/** 原浅滩与沉船地形也是接缝细分的参照，不能因外海扩建改变旧支撑床。 */
export function bermudaLegacySeabedHeight(x, z) {
  const t = Math.max(0, Math.min(1, (-z + 80) / 1130));
  const slope =
    z > -180 ? -38 - Math.max(0, 45 - z) * 0.4 : -128 - (-z - 180) * 0.62;
  const rough =
    (Math.sin(x * 0.035 + z * 0.013) * 8 +
      Math.cos(z * 0.043 - x * 0.018) * 5) *
    t;
  const deep = Math.max(0, Math.min(1, (-z - 200) / 300));
  const crags =
    deep *
    (24 * Math.sin(x * 0.018 + Math.sin(z * 0.009)) * Math.cos(z * 0.017) +
      18 * Math.cos(x * 0.012 - z * 0.01));
  const channel =
    -28 * deep * Math.exp(-(((x - 175 - 15 * Math.sin(z * 0.012)) / 40) ** 2));
  const shelf = Math.max(-WORLD.maxDepth + 24, slope + rough + crags + channel);
  const dx = Math.max(WRECK_BED.minX - x, x - WRECK_BED.maxX, 0);
  const dz = Math.max(WRECK_BED.minZ - z, z - WRECK_BED.maxZ, 0);
  const edge = Math.max(dx, dz);
  const blend = Math.max(0, Math.min(1, edge / WRECK_BED.blend));
  const smooth = blend * blend * (3 - 2 * blend);
  return -486 * (1 - smooth) + shelf * smooth;
}

const smooth = (a, b, value) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mound = (x, z, cx, cz, rx, rz) =>
  Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));

/** 外海礁脊、坡鞍与深盆地使用同一采样器，渲染、站位和实体导航均可读到真实起伏。 */
export function bermudaSeabedHeight(x, z) {
  const legacy = bermudaLegacySeabedHeight(x, z),
    lateral = smooth(300, 460, Math.abs(x)) * smooth(140, 360, -z),
    southern = smooth(1150, 1300, -z);
  if (lateral === 0 && southern === 0) return legacy;
  const reef =
    132 * mound(x, z, -415, -530, 105, 285) +
    116 * mound(x, z, 420, -800, 100, 330) +
    84 * mound(x, z, -425, -1010, 105, 245);
  let floor = legacy + reef * lateral;
  if (southern > 0) {
    let basin =
      -702 +
      6 * Math.sin(x * 0.009 + z * 0.005) +
      5 * Math.cos(x * 0.013 - z * 0.006) +
      110 * mound(x, z, -395, -1400, 90, 255) +
      116 * mound(x, z, 60, -1360, 105, 170) +
      94 * mound(x, z, -135, -1640, 110, 185) +
      120 * mound(x, z, 425, -1490, 85, 310);
    // 领主周围保留宽阔低盆地；脊线在战斗区外形成轮廓，不把整块南海底削成平板。
    for (const [cx, cz, rx, rz, level] of [
      [-290, -1260, 135, 140, -680],
      [230, -1570, 155, 165, -704],
    ]) {
      const distance = Math.hypot((x - cx) / rx, (z - cz) / rz),
        weight = 1 - smooth(0.8, 1.45, distance),
        arena = level + 2 * Math.sin(x * 0.01) * Math.cos(z * 0.009);
      basin += (arena - basin) * weight;
    }
    floor += (basin - floor) * southern;
  }
  const entryWeight =
    (1 -
      smooth(
        ENTRY.innerHalfWidth,
        ENTRY.outerHalfWidth,
        Math.abs(x - ENTRY.x),
      )) *
    smooth(ENTRY.northStart, ENTRY.northFull, -z) *
    (1 - smooth(ENTRY.southFull, ENTRY.southEnd, -z));
  if (entryWeight > 0) {
    const terrace = -530 - Math.max(0, -z - 1390) * 0.4;
    floor += Math.max(0, terrace - floor) * entryWeight;
  }
  return floor;
}
