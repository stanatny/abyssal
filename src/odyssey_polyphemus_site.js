import { POLYPHEMUS_COMBAT } from "./polyphemus_combat.js";
import { odysseySeabedHeight } from "./odyssey_config.js";

/** 巨人的双脚与石台共用支撑平面；不把拉冬的水中轴心沿用到直立躯干。 */
const x = -430,
  z = -950,
  width = 86,
  depth = 82,
  height = 90;
const samples = [];
for (let dx = -width / 2; dx <= width / 2; dx += 2)
  for (let dz = -depth / 2; dz <= depth / 2; dz += 2)
    samples.push(odysseySeabedHeight(x + dx, z + dz));
const top = Math.max(...samples) + 4,
  bottom = Math.min(...samples) - 4;
export const POLYPHEMUS_SITE = Object.freeze({
  x,
  z,
  width,
  depth,
  height,
  top,
  bottom,
  home: Object.freeze([x, top + height / 2, z]),
  radius: POLYPHEMUS_COMBAT.territoryRadius,
});
