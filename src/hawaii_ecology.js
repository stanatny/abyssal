/**
 * 夏威夷外礁与过渡带的食物分布；保留原中央路线，补齐东西两侧。
 * @param {readonly object[]} species 基础物种目录，不会被修改。
 * @returns {readonly object[]} 独立区域配置；尺寸、营养、成长和育幼区规则保持不变。
 */
export function hawaiiEcology(species) {
  return Object.freeze(
    species.map((entry) => {
      const override = OVERRIDES[entry.kind];
      return override ? freezeRecord({ ...entry, ...override }) : entry;
    }),
  );
}

// 中型鱼群沿外礁两翼分布，新增个体属于普通生态库存，捕食后正常刷新。
const OVERRIDES = {
  sunfish: {
    population: 14,
    schoolAnchors: [
      [12, -27, -100],
      [-24, -35, -157],
      [-15, -42, -208],
      [16, -53, -290],
      [-12, -70, -340],
      [-155, -62, -300],
      [155, -65, -310],
    ],
  },
  tuna: {
    population: 54,
    schoolAnchors: [
      [-15, -32, -106],
      [16, -53, -216],
      [24, -70, -258],
      [-18, -83, -300],
      [14, -96, -398],
      [-155, -68, -295],
      [155, -68, -295],
      [-155, -94, -435],
      [155, -94, -435],
    ],
  },
  ray: {
    population: 20,
    schoolAnchors: [
      [-14, -41, -188],
      [17, -61, -264],
      [-18, -82, -348],
      [-28, -92, -372],
      [14, -102, -398],
      [-12, -116, -470],
      [-155, -84, -325],
      [155, -84, -325],
      [-155, -113, -455],
      [155, -113, -455],
    ],
  },
  archelon: {
    spawnAnchors: [
      [-30, -38, -160],
      [36, -65, -245],
      [-150, -78, -340],
      [150, -78, -340],
      [-150, -115, -460],
      [150, -115, -460],
    ],
  },
  dunkleosteus: {
    population: 7,
    spawnAnchors: [
      [-20, -186, -430],
      [32, -221, -540],
      [-44, -256, -640],
      [20, -291, -730],
      [-32, -326, -810],
      [-150, -193, -540],
      [150, -193, -540],
    ],
  },
};

function freezeRecord(value) {
  for (const child of Object.values(value))
    if (child && typeof child === "object") freezeRecord(child);
  return Object.freeze(value);
}
