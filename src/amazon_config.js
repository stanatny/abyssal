import { WORLD } from "./world_config.js";

/** 压缩的幻想河谷；两岸实心、中央雨林保留陆地顶盖并开放岛下水域，显示深度沿用共享比例。 */
export const AMAZON_WORLD = Object.freeze({
  ...WORLD,
  minX: -450,
  maxX: 450,
  minZ: -1350,
  maxDepth: 550,
});
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (v) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};

/** 返回曲折双支流的真实中心及半宽，供地貌、生态和路径验证共同使用。 */
export function amazonChannels(z) {
  return [
    {
      side: -1,
      center: -230 + 55 * Math.sin((z + 100) * 0.011),
      halfWidth:
        88 + 7 * Math.cos(z * 0.018) + 53 * Math.exp(-(((z + 760) / 130) ** 2)),
    },
    {
      side: 1,
      center: 230 + 55 * Math.sin((z - 90) * 0.009 + 1.2),
      halfWidth:
        88 +
        8 * Math.sin(z * 0.016) +
        56 * Math.exp(-(((z + 1040) / 145) ** 2)),
    },
  ];
}

/** 原始地表用于雨林与陆地顶盖；不能作为岛下最低河床。 */
export function amazonSurfaceHeight(x, z) {
  const channels = amazonChannels(z);
  let distance = Math.min(
    ...channels.map((c) => Math.abs(x - c.center) / c.halfWidth),
  );
  if (z > -155)
    distance = Math.min(distance, Math.hypot(x / 350, (z - 70) / 195));
  if (z < -1160)
    distance = Math.min(distance, Math.hypot(x / 355, (z + 1270) / 190));
  const progress = clamp((-z - 70) / 1130);
  let depth = 48 + 110 * progress;
  depth +=
    220 *
    Math.exp(-(((z + 760) / 125) ** 2)) *
    Math.exp(-(((x - channels[0].center) / 105) ** 2));
  depth +=
    300 *
    Math.exp(-(((z + 1040) / 130) ** 2)) *
    Math.exp(-(((x - channels[1].center) / 105) ** 2));
  depth += Math.sin(z * 0.043 + x * 0.02) * 2.5 + Math.sin(x * 0.07) * 1.2;
  const shore = smooth((distance - 0.73) / 0.34);
  const land =
    16 + Math.sin(x * 0.017 + z * 0.023) * 4 + Math.sin(z * 0.012) * 3;
  const banks = -depth * (1 - shore) + land * shore;
  // 坡面泥沙层和细小冲刷沟只改变视觉及同源高度，不缩窄成年通道。
  const relief =
    Math.sin(z * 0.19 + x * 0.15) * 1.8 + Math.sin(x * 0.31 - z * 0.09) * 0.9;
  return banks + relief * Math.sin(Math.PI * shore);
}

/** 林岛上下表面与水下空腔共享边界；两端保留原来的连通泻湖。 */
export function amazonIslandBounds(z) {
  if (z < -1230 || z > -110) return null;
  const [west, east] = amazonChannels(z);
  const taper = smooth((z + 1230) / 35) * smooth((-110 - z) / 35);
  const center = (west.center + east.center) * 0.5;
  const left = west.center + west.halfWidth * 0.88;
  const right = east.center - east.halfWidth * 0.88;
  return {
    left: center + (left - center) * taper,
    right: center + (right - center) * taper,
  };
}
export function amazonIslandCeiling(x, z) {
  return (
    -29 - 3.5 * Math.sin(x * 0.031 + z * 0.027) - 2.2 * Math.sin(z * 0.071)
  );
}
/** 最低河床在林岛下连续拓宽；表面树木仍使用独立的地表高度。 */
export function amazonSeabedHeight(x, z) {
  const surface = amazonSurfaceHeight(x, z);
  const [west, east] = amazonChannels(z);
  const along = smooth((-z - 150) / 65) * smooth((z + 1215) / 65);
  const across =
    smooth((x - west.center) / 50) * smooth((east.center - x) / 50);
  const opening = along * across;
  const progress = clamp((-z - 180) / 1000);
  const bed =
    -103 -
    90 * progress +
    Math.sin(x * 0.017 + z * 0.021) * 8 +
    Math.sin(x * 0.055 - z * 0.043) * 3;
  return surface * (1 - opening) + Math.min(surface, bed) * opening;
}

/** 河道锚点带明确水层，配置必须可被成年角色及实际碰撞共同访问。 */
export function amazonAnchor(side, z, depth = 28, lateral = 0) {
  const c = amazonChannels(z).find((a) => a.side === side);
  return [c.center + lateral, -depth, z];
}
export const AMAZON_BIOMES = Object.freeze(
  [
    { id: "nursery", name: "浮叶育幼湾", anchor: [0, -18, 75] },
    { id: "roots", name: "沉根曲流", anchor: amazonAnchor(-1, -290, 48) },
    { id: "floodforest", name: "淹没雨林", anchor: amazonAnchor(1, -480, 70) },
    { id: "root_vault", name: "林岛根窟", anchor: [0, -75, -620] },
    {
      id: "serpent_pool",
      name: "蛇母深潭",
      anchor: amazonAnchor(-1, -760, 185),
    },
    {
      id: "rootjaw_pool",
      name: "巨颚沉渊",
      anchor: amazonAnchor(1, -1040, 290),
    },
  ].map((b) => Object.freeze({ ...b, anchor: Object.freeze(b.anchor) })),
);
