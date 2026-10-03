import { WORLD } from "./world_config.js";

/** 蓬莱保留浅水，并开放区域独有的云海飞行空间。 */
export const PENGLAI_WORLD = Object.freeze({
  ...WORLD,
  minX: -600,
  maxX: 600,
  minZ: -1400,
  maxZ: 160,
  maxDepth: 180,
  maxAltitude: 620,
  surfaceMode: "aether",
});
export const PENGLAI_PEAKS = Object.freeze([
  { x: 0, z: -650, height: 228, rx: 145, rz: 190 },
  { x: 315, z: -655, height: 260, rx: 100, rz: 165 },
  { x: -320, z: -610, height: 130, rx: 140, rz: 165 },
  { x: 5, z: -1250, height: 300, rx: 155, rz: 150 },
  { x: 440, z: -1050, height: 355, rx: 110, rz: 150 },
  { x: -440, z: -1140, height: 380, rx: 100, rz: 135 },
  { x: 250, z: -300, height: 160, rx: 90, rz: 120 },
  { x: -240, z: -290, height: 135, rx: 90, rz: 125 },
]);
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
  const pool = Math.hypot(x / 138, (z + 1030) / 125);
  const poolBlend = THREE_SMOOTH((1.25 - pool) / 0.4);
  y += (-45 + 4 * Math.sin(x * 0.042) * Math.cos(z * 0.038) - y) * poolBlend;
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
      radius: 112,
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
      maxCenterY: -8,
      home: [0, -16, -1030],
      radius: 118,
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
