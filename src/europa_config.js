import { WORLD } from "./world_config.js";

/** 木卫二为压缩的冰下栖地，尺寸不代表实际月球海洋。 */
export const EUROPA_WORLD = Object.freeze({
  ...WORLD,
  minZ: -1000,
  maxDepth: 900,
  surfaceMode: "ice",
});
export const EUROPA_HABITATS = Object.freeze(
  [
    { id: "cradle", name: "冰穹育幼湾", anchor: [0, -18, 75] },
    { id: "arches", name: "盐脉拱廊", anchor: [-110, -95, -165] },
    { id: "garden", name: "悬生花园", anchor: [110, -250, -365] },
    { id: "basin", name: "热泉盆地", anchor: [-100, -495, -590] },
    { id: "hollow", name: "织母深窟", anchor: [0, -730, -745] },
  ].map((h) => Object.freeze({ ...h, anchor: Object.freeze(h.anchor) })),
);

/** 最低海床单独采样；拱顶始终作为实体，不能把鱼投影到拱顶上。 */
export function europaSeabedHeight(x, z) {
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
  return (
    base +
    bank * bank * 42 +
    Math.sin(x * 0.052 + z * 0.025) * 2.5 +
    Math.sin(z * 0.063) * 1.5
  );
}
