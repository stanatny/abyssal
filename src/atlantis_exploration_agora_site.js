/**
 * 亚特兰蒂斯 Agora 桥廊预留区下沉档案库:纯不可变挖掘场地元数据。共享
 * atlantis_terrain 统一执行挖掘剖面与渲染采样。字段沿用修正后港湾元数据约定(bounds/floorY/
 * blendMeters/trench/entrance/shaft/secondExit/levels/turningCircle/routes/
 * clearances),供集成方注册进共享地形实现;界外精确返回传入 base(不经算术)。
 *
 * 选址依据(实测,见 .local/agora_site_survey.json):
 * - agora_bridges 预留区 x∈[159,271]、z∈[-509.5,-385.5],原海床 -244.5..-350.4。
 * - 既有桥廊:翼殿甲板 x[165,195]/[235,265] @ y[-201.4,-197.4],支墩
 *   x[165.5,176.5]/[253.5,264.5](z=-493.5/-447.5/-401.5),巨拱带 z[-496,-491]
 *   与 z[-404,-399] @ y[-241,-197],端桥 z[-503.5,-483.5]/[-411.5,-391.5]。
 * - 基坑 x[185,245]×z[-486,-408] 避让所有支墩(净距 8.5m)与拱带,位于两翼
 *   之间的露天竖井正下方;四颗既有贝珠(189/241, -490.5/-404.5)均在坑外。
 */

function freezeDeep(value) {
  if (value && typeof value === "object")
    for (const key of Object.keys(value)) freezeDeep(value[key]);
  return Object.freeze(value);
}

// 基坑与南门水道沟槽(数值即最终挖掘剖面,勿与结构模块常量脱节)。
const AGORA_DIG = {
  bounds: { minX: 185, maxX: 245, minZ: -486, maxZ: -408 },
  floorY: -362, // 下沉内庭坑底;坑区原海床 -332.5..-262.8,下挖 29..99m
  blend: 2, // 过渡坡完全藏进至少2.5m厚的衬墙，内部陈设保持平底支撑。
  trench: {
    // 南侧出水道沟槽:从上层回廊南门(槛 -336)向南海床缓升,口门与原海床衔接。
    minX: 208,
    maxX: 224,
    minZ: -498,
    maxZ: -486,
    topZ: -498,
    topY: -341, // 口门端:略低于原海床(-339.7),切口自然淡出
    bottomZ: -486,
    bottomY: -336, // 门端:接上南门道槛
    edgeBlend: 2,
    startBlendMeters: 2, // 南端渐入沟槽，避免口门与原海床出现高度跳变。
  },
};

/**
 * 不可变挖掘场地元数据。所有 Y 均为世界坐标(水面为 4,向下为负)。
 * fishSanctuary 为扩展字段:既有 8 尾 agora_bridges 白鲳的下层游动空间,
 * 供集成方迁移锚点;不改变物种、数量、水层带宽或营养规则。
 */
export const AGORA_EXCAVATION_SITE = freezeDeep({
  id: "agora_sunken_archive",
  reservation: "agora_bridges",
  bounds: AGORA_DIG.bounds,
  floorY: AGORA_DIG.floorY,
  blendMeters: AGORA_DIG.blend,
  trench: AGORA_DIG.trench,
  originalSeabed: { min: -332.52, max: -262.78 }, // 坑区原海床实测范围
  entrance: {
    // 主下降井本身无坡道;南门水道是地面侧的进出结构(双向)。
    kind: "south_gate_channel",
    top: { x: 216, y: -341, z: -498 },
    bottom: { x: 216, y: -336, z: -486 },
    clearWidth: 14,
    slopeDegrees: (Math.atan2(5, 12) * 180) / Math.PI,
    gateClearHeight: 16,
    roofOpening: { minX: 208, maxX: 224, minZ: -498, maxZ: -486 },
  },
  shaft: {
    // 开阔下行井:回廊环围出的中央庭院开口,从桥廊竖井垂直下行直入内庭。
    minX: 195.5,
    maxX: 236.5,
    minZ: -477,
    maxZ: -419.5,
    topY: -334, // 回廊楼板顶(井缘)
    bottomY: -362,
  },
  secondExit: {
    // 南墙拱门,接南门水道沟槽出水面(第二出口/ upward connection)。
    kind: "south_portal",
    minX: 208,
    maxX: 224,
    sillY: -334,
    topY: -318,
    z: -484.75, // 南墙中心面
  },
  levels: [
    {
      id: "upper_cloister",
      floorY: -334, // 周边回廊楼板顶(静态 box collider)
      ceilingY: -322, // 拱顶跨下缘(部分跨已坍塌,露天)
      clearHeight: 12,
    },
    {
      id: "lower_cistern",
      floorY: -362, // 挖掘坑底(高度场)
      ceilingY: -336.5, // 回廊楼板底(侧廊净高 25.5m;庭院开井无顶)
      clearHeight: 25.5,
    },
  ],
  turningCircle: {
    // 半径12m游泳圆周连同成体头尾约需19m净半径;庭院净宽41m,柱件全部在外。
    x: 216,
    y: -346,
    z: -447.5,
    clearRadius: 20,
    swimLoopRadius: 12,
    level: "lower_cistern",
  },
  routes: [
    {
      id: "well_descent",
      // 航点是身体中心;从桥廊竖井上方垂直下行,穿井入庭,落向内庭地面后
      // 回到回转区,保留完整竖直转平空间。
      waypoints: [
        { x: 216, y: -150, z: -447.5 },
        { x: 216, y: -208, z: -447.5 },
        { x: 216, y: -300, z: -447.5 },
        { x: 216, y: -330, z: -447.5 },
        { x: 211, y: -349, z: -460 },
        { x: 216, y: -346, z: -447.5 },
      ],
    },
    {
      id: "south_gate_channel",
      // 南侧面水 → 沟槽 → 拱门 → 南回廊上方 → 下行入庭 → 回转区。
      // 门段 y=-326 取门洞(-334..-318)中轴,为 30m 成体俯仰摆幅留足上下净距。
      waypoints: [
        { x: 216, y: -312, z: -508 },
        { x: 216, y: -325, z: -500 },
        { x: 216, y: -326, z: -491 },
        { x: 216, y: -326, z: -487 },
        { x: 216, y: -326, z: -480 },
        { x: 216, y: -326, z: -472 },
        { x: 216, y: -346, z: -460 },
        { x: 216, y: -346, z: -447.5 },
      ],
    },
  ],
  clearances: {
    // 供 3/16/30m 连续体测试的最小净尺寸(米)
    channelWidth: 14,
    shaftWidth: 41,
    shaftLength: 57.5,
    portalWidth: 16,
    portalHeight: 16,
    upperCloisterHeight: 12,
    lowerCisternHeight: 25.5,
    turningDiameter: 40,
  },
  fishSanctuary: {
    // 既有 agora_bridges 白鲳群(8 尾,现锚点桥廊下廊 y≈-226.4,带宽 ±6):
    // 预留内庭东南开阔水体,净空柱内无任何碰撞;锚点迁移与生态接线归集成方。
    species: "spadefish",
    count: 8,
    currentAnchor: { x: 215, y: -226.35522794222976, z: -447.5 },
    anchor: { x: 224, y: -349, z: -464 },
    clearance: { radius: 12, minY: -358, maxY: -340 },
    band: 6,
  },
});
