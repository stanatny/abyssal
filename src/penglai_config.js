import { WORLD } from "./world_config.js";

/** 蓬莱保留浅水，并开放区域独有的云海飞行空间。 */
export const PENGLAI_WORLD = Object.freeze({
  ...WORLD,
  minX: -600,
  maxX: 600,
  minZ: -1400,
  maxZ: 160,
  maxDepth: 420,
  maxAltitude: 620,
  surfaceMode: "aether",
});
export const PENGLAI_BIXI = Object.freeze({
  x: 0,
  z: -1285,
  terrainY: 50,
  platformY: 53,
  yaw: Math.PI,
});
export const PENGLAI_DEEP_BASIN = Object.freeze({
  x: 0,
  z: -1030,
  radiusX: 330,
  radiusZ: 245,
  floorY: -330,
  guardianY: -195,
  guardianCeiling: -130,
  guardianRadius: 220,
});
/** 原地图北方水域的同源不规则边界，玄武仍与四象一起围绕道观。 */
export function penglaiDeepBasinRadius(x, z) {
  const b = PENGLAI_DEEP_BASIN,
    dx = (x - b.x) / b.radiusX,
    dz = (z - b.z) / b.radiusZ;
  const a = Math.atan2(dz, dx);
  return (
    Math.hypot(dx, dz) / (1 + 0.06 * Math.sin(a * 3) + 0.025 * Math.cos(a * 5))
  );
}
export const PENGLAI_PEAKS = Object.freeze([
  { x: 0, z: -650, height: 228, rx: 145, rz: 190 },
  { x: 315, z: -655, height: 260, rx: 100, rz: 165 },
  { x: -320, z: -610, height: 130, rx: 140, rz: 165 },
  { x: 5, z: -1360, height: 300, rx: 180, rz: 75 },
  { x: 440, z: -1050, height: 355, rx: 110, rz: 150 },
  { x: -440, z: -1140, height: 380, rx: 100, rz: 135 },
  { x: 250, z: -300, height: 160, rx: 90, rz: 120 },
  { x: -240, z: -290, height: 135, rx: 90, rz: 125 },
]);
/** 北潭地形、散石避让与生态共用同一个不规则边界。 */
export function penglaiBasinRadius(x, z) {
  return penglaiDeepBasinRadius(x, z);
}
/** 最低地面与可见山体使用同一采样器；浅水航线不依赖不可见代理。 */
export function penglaiHeightAt(x, z) {
  // 环山围绕主观展开：宽阔青绿山肩承接桃林，石峰具有不规则脊线。
  const ring = (x / 435) ** 2 + ((z + 650) / 480) ** 2;
  let y = -63 + 104 * Math.exp(-ring * 1.35);
  y += 3 * Math.sin(x * 0.047 + z * 0.031) + 2 * Math.sin(z * 0.074);
  for (const p of PENGLAI_PEAKS) {
    const dx = (x - p.x) / p.rx,
      dz = (z - p.z) / p.rz,
      a = Math.atan2(dz, dx);
    const d =
      (dx * dx + dz * dz) *
      (1 + 0.16 * Math.sin(a * 3 + p.x * 0.02) + 0.07 * Math.sin(a * 7));
    const ridge =
      0.82 +
      0.13 * Math.sin(x * 0.026 + z * 0.031) +
      0.05 * Math.sin(z * 0.069);
    y += p.height * Math.exp(-d * 1.9) * ridge;
  }
  const land = Math.max(0, Math.min(1, (y + 5) / 65));
  y +=
    land *
    (5 * Math.sin(x * 0.061 + z * 0.071) + 3 * Math.sin(x * 0.099 - z * 0.046));
  // 西方虎庭是可奔跑的真实地面；北方玄武池独立于山峰，池岸保留自然过渡。
  const court = Math.hypot((x + 320) / 95, (z + 650) / 95);
  const courtBlend = THREE_SMOOTH((1.3 - court) / 0.5);
  y += (86 - y) * courtBlend;
  const deep = penglaiDeepBasinRadius(x, z);
  const deepBlend = THREE_SMOOTH((1.18 - deep) / 0.25);
  const deepBed =
    PENGLAI_DEEP_BASIN.floorY +
    30 * Math.min(1, deep * deep) +
    5 * Math.sin(x * 0.018) * Math.sin(z * 0.024);
  y += (deepBed - y) * deepBlend;
  // 临潭山肩只平整雕像的石台脚下；过渡到原山体，深潭核心保持开放。
  const monument =
    ((Math.abs(x - PENGLAI_BIXI.x) / 32) ** 6 +
      (Math.abs(z - PENGLAI_BIXI.z) / 48) ** 6) **
    (1 / 6);
  const monumentBlend = THREE_SMOOTH((1.3 - monument) / 0.3);
  y += (PENGLAI_BIXI.terrainY - y) * monumentBlend;
  // 主殿坐落在天然高台，平台与山体连续而非悬空底板。
  const t =
    ((Math.abs(x) / 68) ** 8 + (Math.abs(z + 650) / 80) ** 8) ** (1 / 8);
  const shoulder = Math.max(0, Math.min(1, (1.65 - t) / 0.65));
  // 圆角山肩渐变至天然岩坡；只有殿台范围平整，不形成方盒山体。
  y += (205 - y) * shoulder * shoulder * (3 - 2 * shoulder);
  return y;
}
function THREE_SMOOTH(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}
export const PENGLAI_GUARDIANS = Object.freeze(
  [
    {
      id: "penglai_azure",
      kind: "azure_dragon",
      home: [315, penglaiHeightAt(315, -650) + 48, -650],
      radius: 132,
    },
    {
      id: "penglai_tiger",
      kind: "white_tiger",
      home: [-320, penglaiHeightAt(-320, -650) + 48 * 0.28 + 3, -650],
      radius: 190,
    },
    {
      id: "penglai_bird",
      kind: "vermilion_bird",
      home: [0, 150, -355],
      radius: 125,
    },
    {
      id: "penglai_tortoise",
      kind: "black_tortoise",
      maxCenterY: PENGLAI_DEEP_BASIN.guardianCeiling,
      home: [
        PENGLAI_DEEP_BASIN.x,
        PENGLAI_DEEP_BASIN.guardianY,
        PENGLAI_DEEP_BASIN.z,
      ],
      radius: PENGLAI_DEEP_BASIN.guardianRadius,
    },
  ].map((s) =>
    Object.freeze({
      ...s,
      home: Object.freeze(s.home),
      persistentDefeat: true,
    }),
  ),
);
export const PENGLAI_SAGE = Object.freeze({
  id: "penglai_sage",
  kind: "sword_sage",
  home: Object.freeze([0, 308, -650]),
  radius: 115,
  requiresGuardians: Object.freeze(PENGLAI_GUARDIANS.map((s) => s.id)),
  persistentDefeat: true,
});
export const PENGLAI_BOSS_INSTANCES = Object.freeze([
  ...PENGLAI_GUARDIANS,
  PENGLAI_SAGE,
]);
