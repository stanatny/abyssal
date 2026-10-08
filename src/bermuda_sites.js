/** 地貌和生态共同使用沉船尺度，禁止放大模型却保留旧食物/碰撞坐标。 */
const scale = 2.5,
  rawLength = 240,
  rawWidth = 54;
export const BERMUDA_WRECK = Object.freeze({
  center: Object.freeze([-65, -486, -650]),
  scale,
  rawLength,
  rawWidth,
  length: rawLength * scale,
  width: rawWidth * scale,
});
// 支撑床包含艉轴、舷缘及右舷破口外的成人入场区，并对齐海床网格。
const halfWidth = BERMUDA_WRECK.width / 2 + 8 * scale,
  halfLength = BERMUDA_WRECK.length / 2 + 16 * scale,
  snapDown = (value) => Math.floor(value / 5) * 5,
  snapUp = (value) => Math.ceil(value / 5) * 5;
export const WRECK_BED = Object.freeze({
  minX: snapDown(BERMUDA_WRECK.center[0] - halfWidth),
  maxX: snapUp(BERMUDA_WRECK.center[0] + Math.max(halfWidth, 58 * scale)),
  minZ: snapDown(BERMUDA_WRECK.center[2] - halfLength),
  maxZ: snapUp(BERMUDA_WRECK.center[2] + halfLength),
  blend: 45,
});
export function wreckWorldPoint(point) {
  return [
    BERMUDA_WRECK.center[0] + (point[0] + 65) * BERMUDA_WRECK.scale,
    BERMUDA_WRECK.center[1] + (point[1] + 484) * BERMUDA_WRECK.scale,
    BERMUDA_WRECK.center[2] + (point[2] + 650) * BERMUDA_WRECK.scale,
  ];
}
