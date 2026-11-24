import { troyLandHeight } from "./odyssey_coast_layout.js";
import { WORLD } from "./world_config.js";

/** 神话航路保留共享水深比例与开阔战斗尺度。 */
export const ODYSSEY_WORLD = Object.freeze({
  ...WORLD,
  minX: -680,
  maxX: 680,
  minZ: -2320,
  maxZ: 180,
  maxDepth: 1230,
});

/** 渲染地形、生态和运动使用同一最低海床；浅湾向三守卫的深水航路缓缓下降。 */
function legacyShelfHeight(x, z) {
  const progress = Math.max(0, Math.min(1, (-z - 90) / 1040));
  const center = 22 * Math.sin(z * 0.007);
  const edge = Math.max(0, (Math.abs(x - center) - 210) / 90);
  const shelf = -44 - progress * 670;
  const relief =
    (Math.sin(x * 0.035 + z * 0.019) * 3 +
      Math.sin(x * 0.08 - z * 0.045) * 1.3) *
    (0.4 + progress);
  return shelf + edge ** 2 * (85 + progress * 180) + relief;
}
export function odysseyLegacySeabedHeight(x, z) {
  return troyLandHeight(x, z, Math.min(38, legacyShelfHeight(x, z)));
}

const smooth = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** 只展开离岸航路，特洛伊海岸与育幼湾保持原位置和地形。 */
function previousRouteXZ(x, z) {
  return [
    x * (1 + 0.5 * smooth(200, 600, -z)),
    z >= -200 ? z : -200 + (z + 200) * 1.55,
  ];
}
export const ODYSSEY_PREVIOUS_SITES = Object.freeze({
  garden: Object.freeze([-80, -345]),
  passage: Object.freeze([30, -755]),
  wreck: Object.freeze([-175, -615]),
  karkinos: Object.freeze([190, -625]),
  scylla: Object.freeze([-200, -1170]),
  charybdis: Object.freeze([190, -1430]),
});
/** 权威地貌包含开阔蟹礁、双侧高崖和吞潮沉降盆地，网格与实体使用同一采样器。 */
export function odysseyPreviousSeabedHeight(x, z) {
  if (z >= -200) return odysseyLegacySeabedHeight(x, z);
  const legacyZ = -200 + (z + 200) / 1.55;
  const legacyX = x / (1 + 0.5 * smooth(200, 600, -legacyZ));
  const raw = legacyShelfHeight(legacyX, legacyZ);
  // 扩展侧壁的崖顶连续过渡，避免旧硬截断在四米网格上产生高程折缝。
  const capBlend = Math.max(0, 96 - Math.abs(raw - 38));
  let y =
    odysseyLegacySeabedHeight(legacyX, legacyZ) -
    ((capBlend * capBlend) / 384) * smooth(200, 280, -z) -
    210 * smooth(220, 1660, -z);
  const shelf = Math.hypot((x - 190) / 165, (z + 625) / 160);
  y += (-345 - y) * (1 - smooth(0.65, 1.5, shelf));
  const strait = Math.exp(-(((z + 1180) / 210) ** 2));
  y += 96 * strait * Math.exp(-(((Math.abs(x) - 355) / 90) ** 2));
  const basin = Math.exp(-(((x - 190) / 180) ** 2 + ((z + 1430) / 185) ** 2));
  y -= 60 * basin;
  return Math.max(-942, y);
}
/** 原有生物的离底距离保持，世界布局改变时无需重写其文字和收益。 */
export function odysseyWorldPoint([x, y, z]) {
  const [xx, zz] = previousRouteXZ(x, z);
  const clearance = Math.max(8, y - odysseyLegacySeabedHeight(x, z));
  return [
    xx,
    Math.min(-8, odysseyPreviousSeabedHeight(xx, zz) + clearance),
    zz,
  ];
}
/** 二次扩海只迁移离岸地点，旧育幼湾及原海岸保留；实体尺寸不随地图放大。 */
export function expandOdysseyXZ(x, z) {
  return [
    x * (1 + 0.4 * smooth(200, 700, -z)),
    z >= -200 ? z : -200 + (z + 200) * 1.4,
  ];
}
export function odysseyRouteXZ(x, z) {
  return expandOdysseyXZ(...previousRouteXZ(x, z));
}
export const ODYSSEY_SITES = Object.freeze(
  Object.fromEntries(
    Object.entries(ODYSSEY_PREVIOUS_SITES).map(([kind, point]) => [
      kind,
      Object.freeze(expandOdysseyXZ(...point)),
    ]),
  ),
);
/** 逆映射保证海岸接缝连续；向南渐深的海床由渲染、实体和栖地共同使用。 */
export function odysseySeabedHeight(x, z) {
  if (z >= -200) return odysseyPreviousSeabedHeight(x, z);
  const oldZ = -200 + (z + 200) / 1.4;
  const oldX = x / (1 + 0.4 * smooth(200, 700, -oldZ));
  const y =
    odysseyPreviousSeabedHeight(oldX, oldZ) - 230 * smooth(300, 1700, -oldZ);
  return Math.max(-1190, y);
}
/** 旧最终栖地在此迁移一次，保持离底水层；育幼居民完全不动。 */
export function expandOdysseyPoint([x, y, z]) {
  if (z >= -200) return [x, y, z];
  const [xx, zz] = expandOdysseyXZ(x, z);
  return [
    xx,
    Math.min(
      -8,
      odysseySeabedHeight(xx, zz) +
        Math.max(8, y - odysseyPreviousSeabedHeight(x, z)),
    ),
    zz,
  ];
}
export const ODYSSEY_LANDMARKS = Object.freeze([
  {
    id: "nereid_garden",
    position: [
      ODYSSEY_SITES.garden[0],
      odysseySeabedHeight(...ODYSSEY_SITES.garden) + 25,
      ODYSSEY_SITES.garden[1],
    ],
  },
  {
    id: "amphora_passage",
    position: [
      ODYSSEY_SITES.passage[0],
      odysseySeabedHeight(...ODYSSEY_SITES.passage) + 25,
      ODYSSEY_SITES.passage[1],
    ],
  },
  ...["karkinos", "scylla", "charybdis"].map((kind, i) => ({
    id: ["karkinos_shelf", "scylla_strait", "charybdis_basin"][i],
    position: [
      ODYSSEY_SITES[kind][0],
      odysseySeabedHeight(...ODYSSEY_SITES[kind]) + [16, 24, 70][i],
      ODYSSEY_SITES[kind][1],
    ],
  })),
]);
