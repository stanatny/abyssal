import { WORLD } from "./world_config.js";

/** 神话航路保留共享水深比例与开阔战斗尺度。 */
export const ODYSSEY_WORLD = Object.freeze({ ...WORLD });

/** 渲染地形、生态和运动使用同一最低海床；浅湾向三守卫的深水航路缓缓下降。 */
export function odysseySeabedHeight(x, z) {
  const progress = Math.max(0, Math.min(1, (-z - 90) / 1040));
  const center = 22 * Math.sin(z * 0.007);
  const edge = Math.max(0, (Math.abs(x - center) - 210) / 90);
  const shelf = -44 - progress * 670;
  const relief =
    (Math.sin(x * 0.035 + z * 0.019) * 3 +
      Math.sin(x * 0.08 - z * 0.045) * 1.3) *
    (0.4 + progress);
  return Math.min(38, shelf + edge ** 2 * (85 + progress * 180) + relief);
}

export const ODYSSEY_LANDMARKS = Object.freeze([
  { id: "nereid_garden", position: [-55, -115, -280] },
  { id: "amphora_passage", position: [40, -255, -490] },
  {
    id: "karkinos_shelf",
    position: [120, odysseySeabedHeight(120, -405) + 16, -405],
  },
  { id: "scylla_strait", position: [-110, -380, -690] },
  { id: "charybdis_basin", position: [115, -575, -1010] },
]);
