/** 地貌和生态共同使用沉船尺度，禁止放大模型却保留旧食物/碰撞坐标。 */
export const BERMUDA_WRECK = Object.freeze({
  center: Object.freeze([-65, -486, -650]),
  scale: 1.65,
  length: 396,
  width: 89.1,
});
export const WRECK_BED = Object.freeze({
  minX: -130,
  maxX: 10,
  minZ: -890,
  maxZ: -410,
  blend: 45,
});
export function wreckWorldPoint(point) {
  return [
    BERMUDA_WRECK.center[0] + (point[0] + 65) * BERMUDA_WRECK.scale,
    BERMUDA_WRECK.center[1] + (point[1] + 484) * BERMUDA_WRECK.scale,
    BERMUDA_WRECK.center[2] + (point[2] + 650) * BERMUDA_WRECK.scale,
  ];
}
