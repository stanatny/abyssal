// 纯坐标配置供地貌、生态和图鉴同步读取，不导入模型、材质或场景资源。
// width/depth是含岩壳的局部XZ足迹；yaw为世界Y轴弧度，height相对足迹最高原海床。
// floorMin/floorMax为真实三角海床的向外取整包络，只供提示范围，物理仍实时采样。
export const BERMUDA_CAVE_SITES = Object.freeze([
  Object.freeze({
    id: "kaiju_lair",
    theme: "kaiju_lair",
    name: "巨兽沉眠巢穴",
    code: "ABYSSAL TITAN LAIR",
    description:
      "北侧层叠岩口通向曲折下潜的巢道，支路止于深岩，取宝后须原路撤离。",
    x: -85,
    z: -1555,
    yaw: 0,
    width: 300,
    depth: 280,
    height: 180,
    floorMin: -703,
    floorMax: -540,
  }),
  Object.freeze({
    id: "luminous_grotto",
    theme: "luminous_grotto",
    name: "荧光海绵洞",
    code: "LUMINOUS SPONGE GROTTO",
    description: "冷色生物微光依附西侧岩壁，穿过洞室可回到外礁坡面。",
    x: -430,
    z: -1070,
    yaw: 0,
    width: 90,
    depth: 100,
    height: 120,
    floorMin: -668,
    floorMax: -559,
  }),
  Object.freeze({
    id: "fossil_passage",
    theme: "fossil_passage",
    name: "深海骨廊",
    code: "DEEP FOSSIL PASSAGE",
    description: "古老骨骸嵌在东南深水岩壳中，两端透出的水光指向来路与出口。",
    x: 435,
    z: -1635,
    yaw: 0,
    width: 90,
    depth: 110,
    height: 120,
    floorMin: -675,
    floorMax: -600,
  }),
]);

// 北口抬起的自然岩台只影响新洞前庭；南侧怪兽岩床、嘴前水域和旧地标地面保持原样。
export const BERMUDA_TITAN_ENTRY_TERRAIN = Object.freeze({
  x: -85,
  innerHalfWidth: 42,
  outerHalfWidth: 72,
  northStart: 1340,
  northFull: 1380,
  southFull: 1435,
  southEnd: 1500,
});

// 北侧断层拱只改变外入口与主壳最后一段，深巢和后腔共用的屋顶基准保持不动。
export const BERMUDA_TITAN_ENTRANCE = Object.freeze({
  roofTransitionStart: 0.82,
  innerRoofLift: 49,
  outerRoofLift: 62,
  layers: Object.freeze([
    Object.freeze({
      z: -1402,
      innerWidth: 100,
      outerWidth: 174,
      innerHeight: 186,
      outerHeight: 220,
      depth: 10,
      lean: 7,
    }),
    Object.freeze({
      z: -1383,
      innerWidth: 116,
      outerWidth: 194,
      innerHeight: 198,
      outerHeight: 238,
      depth: 13,
      lean: -4,
    }),
  ]),
});

// 从深巢返回唯一北口；完整XYZ控制实际下潜水层，不能只靠雷达上的折线假装蜿蜒。
const ingress = Object.freeze(
  [
    [-110, -600, -1590],
    [-125, -600, -1560],
    [-125, -600, -1518],
    [-10, -590, -1512],
    [-10, -580, -1480],
    [-35, -550, -1455],
    [-85, -500, -1415],
  ].map(Object.freeze),
);

// 西侧巨兽占据独立岩床，成年玩家沿东侧水道通过；坐标只描述航路，不代替实体查询。
export const BERMUDA_TITAN_NAVIGATION = Object.freeze({
  route: ingress,
  routeXZ: Object.freeze(ingress.map(([x, , z]) => Object.freeze([x, z]))),
  turnCenterXZ: Object.freeze([-85, -1545]),
  turnY: -600,
  turnRadius: 30,
  monsterReservation: Object.freeze({
    minX: -212,
    maxX: -88,
    minZ: -1640,
    maxZ: -1470,
    maxHeight: 70,
  }),
});

// 西侧真拱口以主壳网格行/列为边界；后腔贴原海床向西延伸，不下挖海床。
export const BERMUDA_TITAN_REAR_ANNEX = Object.freeze({
  id: "titan_rear_annex",
  // 南侧接枝须在等候水体之后才收拢；否则真实岩壳会压入成年角色的护宝进路。
  portalStartRow: 3,
  portalEndRow: 24,
  portalColumn: 32,
  portalAngleDepth: 0.74,
  westX: -465,
  eastAxisZ: -1590,
  middleAxisZ: -1610,
  westAxisZ: -1620,
  outerWidth: 184,
  innerWidth: 164,
  farOuterWidth: 164,
  farInnerWidth: 144,
  height: 170,
  rows: 48,
  neckXZ: Object.freeze([-215, -1590]),
  tailXZ: Object.freeze([-405, -1620]),
  rearGate: Object.freeze({ x: -420, z: -1525, yaw: Math.PI / 2 }),
});

const routePoints = (points) => Object.freeze(points.map(Object.freeze));

// 路径从嘴前安全落点起；真实怀中首段由最终模型接入，不能拿出口欧氏距离穿墙选门。
export const BERMUDA_TITAN_ESCAPE_ROUTES = Object.freeze([
  Object.freeze({
    id: "north",
    points: ingress,
    outsideSafe: Object.freeze([-85, -500, -1390]),
    floorOffset: 40,
    turnAllowance: 10,
  }),
]);

// 北岩屏接顶遮住直视；连续低岩脊把下层主道与上层补给岔道分开，保留大鱼水体。
export const BERMUDA_TITAN_PARTITIONS = Object.freeze([
  Object.freeze({
    id: "northern_screen",
    from: Object.freeze([-226, -1485]),
    to: Object.freeze([-45, -1485]),
    width: 16,
    roof: true,
  }),
  Object.freeze({
    id: "descending_gate",
    from: Object.freeze([-35, -1498]),
    to: Object.freeze([64, -1498]),
    width: 20,
    roof: true,
    bottomY: -565,
  }),
  Object.freeze({
    id: "rear_shadow_overhang",
    from: Object.freeze([-370, -1565]),
    to: Object.freeze([-370, -1675]),
    width: 30,
    bottomY: -610,
    topY: -405,
  }),
  Object.freeze({
    id: "western_ridge",
    from: Object.freeze([-50, -1630]),
    to: Object.freeze([-50, -1575]),
    width: 18,
    height: 35,
  }),
  Object.freeze({
    id: "food_branch_ridge",
    from: Object.freeze([-12, -1585]),
    to: Object.freeze([-12, -1535]),
    width: 12,
    roof: true,
  }),
  Object.freeze({
    id: "food_branch_end",
    from: Object.freeze([-12, -1585]),
    to: Object.freeze([64, -1585]),
    width: 12,
    roof: true,
  }),
]);

export const BERMUDA_TITAN_BRANCHES = Object.freeze([
  Object.freeze({
    id: "treasure",
    floorOffset: 40,
    points: Object.freeze(ingress.slice(0, -1).reverse()),
  }),
  Object.freeze({
    id: "food",
    floorOffset: 90,
    points: routePoints([
      [-20, -1518],
      [25, -1518],
      [25, -1550],
      [25, -1555],
    ]),
  }),
]);

// 机关与吐息共享同一布局；嘴高由真实模型岩床基准加 mouthHeight 决定。
export const BERMUDA_TITAN_LAYOUT = Object.freeze({
  monsterCenterXZ: Object.freeze([-150, -1555]),
  monsterLength: 170,
  mouthXZ: Object.freeze([-150, -1637]),
  mouthHeight: 23,
  mouthDirection: Object.freeze([0, 0, -1]),
  treasure: Object.freeze({ x: -150, z: -1678, floorOffset: 26 }),
  breathEnd: Object.freeze({ x: -150, z: -1688, floorOffset: 23 }),
  seals: Object.freeze(
    [
      { id: "wave", x: -65, z: -1640, floorOffset: 34 },
      { id: "bone", x: 20, z: -1550, floorOffset: 90 },
      { id: "flame", x: -35, z: -1455, floorOffset: 34 },
    ].map(Object.freeze),
  ),
  treasureApproachXZ: Object.freeze(
    ingress
      .slice(0, -1)
      .reverse()
      .map(([x, , z]) => Object.freeze([x, z])),
  ),
});
