/** 波塞冬主神殿及地下圣库的纯坐标合同，不依赖地形注册或渲染。 */

/*********************************************
 * Public API
 ********************************************/

/**
 * 判断完整建筑投影是否侵占主神殿，供街坊、柱列及散落物在组装前避让。
 * @param {number} x 世界横坐标。
 * @param {number} z 世界纵坐标。
 * @param {number} width 投影宽度。
 * @param {number} depth 投影长度。
 * @returns {boolean} 是否与主神殿保留区相交。
 */
export function isPoseidonTempleReserved(x, z, width = 0, depth = 0) {
  const trench = POSEIDON_TEMPLE_SITE.trench;
  const bounds = [
    POSEIDON_TEMPLE_SITE.reservationBounds,
    {
      minX: trench.minX - trench.edgeBlend,
      maxX: trench.maxX + trench.edgeBlend,
      minZ: trench.minZ,
      maxZ: trench.maxZ + 2,
    },
  ];
  return bounds.some(
    (b) =>
      x + width / 2 > b.minX &&
      x - width / 2 < b.maxX &&
      z + depth / 2 > b.minZ &&
      z - depth / 2 < b.maxZ,
  );
}

/*********************************************
 * Types and Data Structures
 ********************************************/

// 沿用原主殿实际平台标高；保持外部巨像、战斗领地与深度规则不变。
export const POSEIDON_TEMPLE_FLOOR_Y = -608.8610076586419;

/**
 * 主神殿真实挖掘合同。上下层楼板独立于海床；中井同时贯通主殿平台和
 * 地下回廊，后门接向城门的下切水道。场地北端厚墙止于 z=-887，避开
 * 既有巨像台基 z[-883,-847]。所有路线航点是身体中心而非地板。
 */
export const POSEIDON_TEMPLE_SITE = freezeDeep({
  id: "poseidon_temple_vault",
  reservation: "poseidon_main_temple",
  x: 0,
  z: -911,
  reservationBounds: { minX: -65, maxX: 65, minZ: -961, maxZ: -861 },
  bounds: { minX: -48, maxX: 48, minZ: -961, maxZ: -875 },
  floorY: -710,
  blendMeters: 4,
  templeFloorY: POSEIDON_TEMPLE_FLOOR_Y,
  originalSeabed: { min: -691, max: -622 },
  trench: {
    minX: -14,
    maxX: 14,
    minZ: -976,
    maxZ: -957,
    topZ: -976,
    topY: -699,
    bottomZ: -957,
    bottomY: -706,
    edgeBlend: 2,
    startBlendMeters: 2,
  },
  entrance: {
    kind: "ritual_well",
    top: { x: 0, y: POSEIDON_TEMPLE_FLOOR_Y, z: -911 },
    bottom: { x: 0, y: -710, z: -922 },
    clearWidth: 48,
    gateClearHeight: 62,
    slopeDegrees: 0,
    roofOpening: { minX: -24, maxX: 24, minZ: -953, maxZ: -891 },
  },
  shaft: {
    minX: -24,
    maxX: 24,
    minZ: -953,
    maxZ: -891,
    topY: POSEIDON_TEMPLE_FLOOR_Y + 74,
    bottomY: -710,
  },
  secondExit: {
    kind: "rear_processional_portal",
    minX: -12,
    maxX: 12,
    sillY: -706,
    topY: -668,
    z: -959,
  },
  levels: [
    {
      id: "crypt_galleries",
      floorY: -662,
      ceilingY: -627,
      clearHeight: 35,
    },
    {
      id: "lower_sacred_vault",
      floorY: -710,
      ceilingY: -664.5,
      clearHeight: 45.5,
    },
  ],
  turningCircle: {
    x: 0,
    y: -691,
    z: -922,
    clearRadius: 24,
    swimLoopRadius: 12,
    level: "lower_sacred_vault",
  },
  routes: [
    {
      id: "temple_well_descent",
      waypoints: [
        { x: 0, y: -577, z: -906 },
        { x: 0, y: -595, z: -908 },
        { x: 0, y: -623, z: -914 },
        { x: 0, y: -651, z: -920 },
        { x: 0, y: -674, z: -925 },
        { x: 0, y: -691, z: -922 },
      ],
    },
    {
      id: "rear_gate_return",
      waypoints: [
        { x: 0, y: -678, z: -979 },
        { x: 0, y: -682, z: -968 },
        { x: 0, y: -685, z: -958 },
        { x: 0, y: -686, z: -947 },
        { x: 0, y: -691, z: -935 },
        { x: 0, y: -691, z: -922 },
      ],
    },
  ],
  clearances: {
    shaftWidth: 48,
    shaftLength: 62,
    portalWidth: 24,
    portalHeight: 38,
    cryptGalleryWidth: 20,
    cryptGalleryHeight: 35,
    lowerVaultHeight: 45.5,
    lowerVaultWidth: 88,
    lowerVaultLength: 70,
    turningDiameter: 48,
  },
  fishSanctuary: {
    species: "sardine",
    count: 8,
    anchor: { x: 18, y: -691, z: -924 },
    clearance: { radius: 12, minY: -704, maxY: -676 },
    band: 7,
  },
  secondaryFishSanctuary: {
    species: "tuna",
    count: 3,
    anchor: { x: -18, y: -691, z: -936 },
    clearance: { radius: 15, minY: -704, maxY: -676 },
    band: 7,
  },
});

/*********************************************
 * Private Helper Functions
 ********************************************/

function freezeDeep(value) {
  if (value && typeof value === "object")
    for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
