import { seabedHeight } from "./ocean.js";
import { AGORA_EXCAVATION_SITE } from "./atlantis_exploration_agora_site.js";
import { POSEIDON_TEMPLE_SITE } from "./atlantis_poseidon_site.js";

/**
 * 亚特兰蒂斯探索层地形接口:在预留区内把共享海床下挖成平底厅堂基坑。
 * 当前港湾、市集与波塞冬神殿挖掘区之外，返回值与原
 * seabedHeight 完全相等(不经过任何算术);坑内只下挖、不抬升,边缘用坑内
 * 单侧平滑带过渡,最低点远高于世界下限并留足成体余量。
 */

// 平滑阶跃(0→1),与 THREE.MathUtils.smoothstep 同形,保持本模块零渲染依赖。
function smooth01(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function freezeDeep(value) {
  if (value && typeof value === "object")
    for (const key of Object.keys(value)) freezeDeep(value[key]);
  return Object.freeze(value);
}

/** 单块挖掘场地:矩形基坑 + 可选入口沟槽(坡道切口,线性下切)。 */
const HARBOR_DIG = {
  // 港湾圣所预留区为 x∈[-271,-159]、z∈[-302.5,-178.5];基坑避让所有
  // 圣所支墩投影(支墩在 x[-264.5,-253.5] 与 x[-176.5,-165.5]),四周留 6m+ 净距。
  bounds: { minX: -252, maxX: -178, minZ: -276, maxZ: -220 },
  floorY: -194, // 下厅留出竖直成体转平的高度，游泳中心明确低于原海床。
  blend: 4, // 坑缘向内的平滑过渡带宽(米),全部落在坑界内侧
  trench: {
    // 北侧入口沟槽:从街面切开坡顶,让大台阶从原海床一路下行入厅。
    minX: -244,
    maxX: -224,
    minZ: -256,
    maxZ: -211,
    topZ: -211,
    topY: -128,
    bottomZ: -251,
    bottomY: -156,
    edgeBlend: 2, // 两侧各 2m 平滑带,由台阶护墙遮护
  },
};

/**
 * 不可变的挖掘场地元数据:场地边界、入口、竖井、各层楼板标高、
 * 路线航点与净高/回转净空。集成方据此做 3/16/30m 连续体往返测试。
 * 所有 Y 均为世界坐标(水面为 4,向下为负)。
 */
export const ATLANTIS_EXCAVATION_SITES = freezeDeep([
  {
    id: "harbor_sunken_halls",
    reservation: "harbor_sanctuary",
    bounds: HARBOR_DIG.bounds,
    floorY: HARBOR_DIG.floorY,
    blendMeters: HARBOR_DIG.blend,
    trench: HARBOR_DIG.trench,
    originalSeabed: { min: -178.5, max: -128.0 }, // 坑区原海床实测范围
    entrance: {
      kind: "collapsed_grand_stair",
      top: { x: -234, y: -128, z: -211 },
      bottom: { x: -234, y: -156, z: -251 },
      clearWidth: 18.7,
      slopeDegrees: (Math.atan2(28, 40) * 180) / Math.PI,
      gateClearHeight: 30,
      roofOpening: { minX: -245, maxX: -223, minZ: -262, maxZ: -218.5 },
    },
    shaft: {
      // 开阔竖井:贯通屋面与上层楼板,直达下层正厅,兼作上行通道。
      minX: -212,
      maxX: -184,
      minZ: -261,
      maxZ: -233,
      topY: -133,
      bottomY: -194,
    },
    secondExit: {
      kind: "south_portal",
      minX: -222,
      maxX: -208,
      sillY: -156,
      topY: -142,
      z: -274.75, // 南墙中心面
    },
    levels: [
      {
        id: "upper_gallery",
        floorY: -156, // 独立楼板顶面(静态 box collider)
        ceilingY: -135.5, // 屋面板底面
        clearHeight: 20.5,
      },
      {
        id: "lower_hall",
        floorY: -194, // 挖掘坑底(高度场)
        ceilingY: -158, // 上层楼板底面
        clearHeight: 36,
      },
    ],
    turningCircle: {
      // 半径12m的游泳圆周连同成体头尾需要约19m净半径，柱列置于外围。
      x: -227,
      y: -177,
      z: -249,
      clearRadius: 20,
      swimLoopRadius: 12,
      level: "lower_hall",
    },
    routes: [
      {
        id: "stair_to_lower_hall",
        // 航点是身体中心而不是踏步标高；终点保留完整的竖直转平空间。
        waypoints: [
          { x: -234, y: -96, z: -196 },
          { x: -234, y: -113, z: -211 },
          { x: -234, y: -146, z: -251 },
          { x: -198, y: -146, z: -247 },
          { x: -198, y: -177, z: -247 },
          { x: -227, y: -177, z: -249 },
        ],
      },
      {
        id: "south_exit_to_lower_hall",
        // 南门外先留足身体纵向距离；门内平游至落脚处，再抬升转井以避开护墙。
        waypoints: [
          { x: -216, y: -119, z: -295 },
          { x: -216, y: -148, z: -295 },
          { x: -216, y: -148, z: -259 },
          { x: -216, y: -144, z: -247 },
          { x: -198, y: -144, z: -247 },
          { x: -198, y: -177, z: -247 },
          { x: -227, y: -177, z: -249 },
        ],
      },
    ],
    clearances: {
      // 供 3/16/30m 连续体测试的最小净尺寸(米)
      stairWidth: 18.7,
      shaftWidth: 28,
      portalWidth: 14,
      portalHeight: 14,
      upperGalleryHeight: 20.5,
      lowerHallHeight: 36,
      turningDiameter: 40,
    },
  },
  AGORA_EXCAVATION_SITE,
  POSEIDON_TEMPLE_SITE,
]);

/**
 * 亚特兰蒂斯共享海床高度:默认与原 seabedHeight 逐点相等;
 * 仅在挖掘场地边界内部下挖(含入口沟槽),从不抬升地形。
 * @param {number} x 世界横坐标。
 * @param {number} z 世界纵坐标。
 * @returns {number} 该点海床表面 Y。
 */
export function atlantisSeabedHeight(x, z) {
  const base = seabedHeight(x, z);
  let y = base;
  for (const site of ATLANTIS_EXCAVATION_SITES) {
    const b = site.bounds;
    // 基坑:坑界外侧 0;界内 blend 带宽内平滑过渡到底,更深处为平底。
    const inset = Math.min(x - b.minX, b.maxX - x, z - b.minZ, b.maxZ - z);
    if (inset > 0) {
      const t = smooth01(inset / site.blendMeters);
      y = Math.min(y, base + (site.floorY - base) * t);
    }
    const tr = site.trench;
    if (tr) {
      // 入口沟槽:线性坡面切口,只在上口与外缘做短平滑,切口只下切。
      const sideInset = Math.min(x - tr.minX, tr.maxX - x);
      if (sideInset > -tr.edgeBlend && z >= tr.minZ && z <= tr.maxZ + 2) {
        const clampedZ = Math.min(tr.maxZ, Math.max(tr.minZ, z));
        const slopeT = (tr.topZ - clampedZ) / (tr.topZ - tr.bottomZ);
        const cut = tr.topY + (tr.bottomY - tr.topY) * slopeT;
        const fx = smooth01((sideInset + tr.edgeBlend) / tr.edgeBlend / 2);
        const fz = z <= tr.maxZ ? 1 : smooth01(1 - (z - tr.maxZ) / 2);
        const startFade = tr.startBlendMeters
          ? smooth01((z - tr.minZ) / tr.startBlendMeters)
          : 1;
        y = Math.min(y, base + (cut - base) * Math.min(fx, fz, startFade));
      }
    }
  }
  return y;
}

/** 查询点是否落在任一挖掘场地基坑内(含边界),供铺装/植被等避让查询。 */
export function isAtlantisExcavated(x, z) {
  return ATLANTIS_EXCAVATION_SITES.some((site) => {
    const b = site.bounds;
    return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
  });
}
