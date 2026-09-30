import { WRECK_BED } from "./bermuda_sites.js";
import { WORLD } from "./world_config.js";

/** 百慕大礁湾到深沟的海床；沉船全足迹预留平整支撑，其余保留侵蚀起伏。 */
export function bermudaSeabedHeight(x, z) {
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
