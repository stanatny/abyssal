/**
 * 普通猎物的嘴部接触半径；只补足近身容错，不改变捕食资格或障碍物遮挡。
 * @param {number} playerLength 玩家体长。
 * @param {number} preyLength 猎物体长。
 * @param {boolean} nurseryLearning 是否沿用育幼区小鱼辅助。
 * @returns {number} 世界单位半径；领主侧击和敌方伤害不使用此规则。
 */
export function preyCaptureRadius(
  playerLength,
  preyLength,
  nurseryLearning = false,
) {
  if (
    !Number.isFinite(playerLength) ||
    playerLength <= 0 ||
    !Number.isFinite(preyLength) ||
    preyLength <= 0
  )
    return 0;
  const base =
    playerLength * 0.22 + preyLength * 0.28 + (nurseryLearning ? 0.25 : 0);
  // 前期约24%的接触容错，长成巨兽后增量封顶0.65米，避免远距离吸入。
  return base + Math.min(0.65, base * 0.24);
}

/**
 * 计算同一物理帧内玩家捕获点与猎物的相对运动接触，避免冲刺越过小鱼而漏判。
 * @param {object} start 上一帧捕获点，含x/y/z。
 * @param {object} end 本帧捕获点。
 * @param {object} preyStart 猎物本帧运动前位置。
 * @param {object} preyEnd 猎物本帧运动后位置。
 * @param {number} radius 与静态接触相同的有效半径，不额外扩大范围。
 * @returns {number|null} 最近接触位于本帧的比例；没有进入半径或输入非法时为null。
 */
export function sweptCaptureFraction(start, end, preyStart, preyEnd, radius) {
  if (!Number.isFinite(radius) || radius <= 0) return null;
  for (const point of [start, end, preyStart, preyEnd])
    if (!point || ![point.x, point.y, point.z].every(Number.isFinite))
      return null;
  const x = start.x - preyStart.x,
    y = start.y - preyStart.y,
    z = start.z - preyStart.z;
  const dx = end.x - preyEnd.x - x,
    dy = end.y - preyEnd.y - y,
    dz = end.z - preyEnd.z - z;
  const movement = dx * dx + dy * dy + dz * dz;
  const t =
    movement > 1e-12
      ? Math.max(0, Math.min(1, -(x * dx + y * dy + z * dz) / movement))
      : 1;
  const distanceSquared =
    (x + dx * t) ** 2 + (y + dy * t) ** 2 + (z + dz * t) ** 2;
  return distanceSquared < radius * radius ? t : null;
}
