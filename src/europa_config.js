import { WORLD } from "./world_config.js";

/** 木卫二为压缩的冰下栖地，尺寸不代表实际月球海洋。 */
export const EUROPA_LAYOUT_WORLD = Object.freeze({
  ...WORLD,
  minZ: -1000,
  maxDepth: 900,
  surfaceMode: "ice",
});
export const EUROPA_LAYOUT_HABITATS = Object.freeze(
  [
    { id: "cradle", name: "冰穹育幼湾", anchor: [0, -18, 75] },
    { id: "arches", name: "盐脉拱廊", anchor: [-110, -95, -165] },
    { id: "garden", name: "悬生花园", anchor: [110, -250, -365] },
    { id: "basin", name: "热泉盆地", anchor: [-100, -495, -590] },
    { id: "hollow", name: "织母深窟", anchor: [0, -730, -745] },
  ].map((h) => Object.freeze({ ...h, anchor: Object.freeze(h.anchor) })),
);

/** 最低海床单独采样；拱顶始终作为实体，不能把鱼投影到拱顶上。 */
export function europaLayoutSeabedHeight(x, z) {
  const stations = [
    [140, -48],
    [0, -56],
    [-165, -140],
    [-365, -320],
    [-590, -600],
    [-745, -825],
    [-1000, -840],
  ];
  let i = 0;
  while (i < stations.length - 2 && z < stations[i + 1][0]) i++;
  const a = stations[i],
    b = stations[i + 1];
  const t = Math.max(0, Math.min(1, (z - a[0]) / (b[0] - a[0])));
  const base = a[1] + (b[1] - a[1]) * t;
  const bank = Math.max(0, (Math.abs(x) - 180) / 120);
  const natural =
    base +
    europaRelief(x, z) +
    bank * bank * 42 +
    Math.sin(x * 0.052 + z * 0.025) * 2.5 +
    Math.sin(z * 0.063) * 1.5;
  // 科考船落在层状岩台上；完整船身范围内保持缓坡，外缘平滑接回裂谷。
  const fade = (v, inner, outer) => {
    const t = Math.max(0, Math.min(1, (v - inner) / (outer - inner)));
    return 1 - t * t * (3 - 2 * t);
  };
  const bench =
    fade(Math.abs(x - 60), 156, 164) * fade(Math.abs(z + 470), 64, 78);
  return natural * (1 - bench) + (-450 + (z + 470) * 0.2) * bench;
}

/** 沿同一地质布局扩展空间，不放大动物或船内通道；冰壳和出发点经同一映射。 */
export const EUROPA_EXPANSE_SCALE = 1.6;
export const europaWorldY = (y) =>
  WORLD.surfaceY + (y - WORLD.surfaceY) * EUROPA_EXPANSE_SCALE;
export const europaWorldZ = (z) => 75 + (z - 75) * EUROPA_EXPANSE_SCALE;
export const europaWorldPoint = ([x, y, z]) => [
  x * EUROPA_EXPANSE_SCALE,
  europaWorldY(y),
  europaWorldZ(z),
];
export const europaLayoutPoint = ([x, y, z]) => [
  x / EUROPA_EXPANSE_SCALE,
  WORLD.surfaceY + (y - WORLD.surfaceY) / EUROPA_EXPANSE_SCALE,
  75 + (z - 75) / EUROPA_EXPANSE_SCALE,
];
export const EUROPA_WORLD = Object.freeze({
  ...EUROPA_LAYOUT_WORLD,
  minX: -480,
  maxX: 480,
  minZ: europaWorldZ(-1000),
  maxZ: europaWorldZ(140),
  maxDepth: 1450,
});
export const EUROPA_HABITATS = Object.freeze(
  EUROPA_LAYOUT_HABITATS.map((h) =>
    Object.freeze({ ...h, anchor: Object.freeze(europaWorldPoint(h.anchor)) }),
  ),
);
export function europaSeabedHeight(x, z) {
  const q = europaLayoutPoint([x, 0, z]);
  return europaWorldY(europaLayoutSeabedHeight(q[0], q[2]));
}
function europaRelief(x, z) {
  const deep = Math.min(1, Math.max(0, (-z - 100) / 200));
  const axis = 25 * Math.sin(z * 0.008),
    channel = -12 * Math.exp(-(((x - axis) / 70) ** 2));
  const terraces =
    (Math.sin(z * 0.028 + Math.sin(x * 0.018)) * 5 +
      Math.sin(x * 0.033 - z * 0.009) * 3) *
    Math.min(1, Math.abs(x) / 130);
  return deep * (channel + terraces);
}
