export const TROY_COAST_ORIGIN = Object.freeze([-153, 0, -50]);
export const TROY_COAST_SCALE = 0.7;
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 城市挡土墙顺应地层轻微转折；城内基础平台仍保持平整。 */
export function troyTerraceBend(x) {
  return 1.2 * Math.sin(x * 0.037) + 0.6 * Math.sin(x * 0.081 + 0.7);
}

/** 台地位于浅湾西侧地图内；阶地平面与建筑基础使用同一高度函数。 */
export function troyTerraceHeight(x, z) {
  const bend = troyTerraceBend(x);
  let h =
    14 +
    16 * (1 - smooth(29 + bend, 35 + bend, z)) +
    28 * (1 - smooth(-41 + bend, -35 + bend, z)) +
    28 * (1 - smooth(-111 + bend, -105 + bend, z));
  const bay = smooth(40, 80, Math.abs(x)) * (3.8 + 3.8 * Math.sin(x * 0.054));
  const shore = 1 - smooth(90 + bay, 114, z);
  const coves =
    13 * Math.exp(-(((z + 40) / 13) ** 2)) +
    16 * Math.exp(-(((z + 110) / 14) ** 2));
  const side = 167 + 8 * Math.sin(z * 0.039) + 4 * Math.cos(z * 0.083) - coves;
  const edge = 1 - smooth(side, 205, Math.abs(x));
  const back = smooth(-205, -195, z);
  const erosion =
    edge *
    (1 - edge) *
    4 *
    (2.4 * Math.sin(z * 0.12 + x * 0.047) + 1.2 * Math.sin(z * 0.24));
  return -24 + (h + 24) * shore * edge * back + erosion * shore * back;
}

/** 世界地表和建筑共用尺度；只抬高西侧岸地，远离岸地时逐点保留原海床。 */
export function troyLandHeight(x, z, base) {
  const localX = -(z - TROY_COAST_ORIGIN[2]) / TROY_COAST_SCALE;
  const localZ = (x - TROY_COAST_ORIGIN[0]) / TROY_COAST_SCALE;
  if (Math.abs(localX) >= 205 || localZ <= -205 || localZ >= 115) return base;
  const blend =
    (1 - smooth(185, 205, Math.abs(localX))) *
    smooth(-205, -195, localZ) *
    (1 - smooth(108, 115, localZ));
  return (
    base +
    Math.max(0, troyTerraceHeight(localX, localZ) * TROY_COAST_SCALE - base) *
      blend
  );
}
