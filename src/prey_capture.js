/**
 * 普通猎物的嘴部接触半径；只补足近身容错，不改变捕食资格或障碍物遮挡。
 * @param {number} playerLength 玩家体长。
 * @param {number} preyLength 猎物体长。
 * @param {boolean} nurseryLearning 是否沿用育幼区小鱼辅助。
 * @param {boolean} frenzy 是否启用狂食近身范围奖励，仍使用真实体长。
 * @returns {number} 世界单位半径；领主侧击和敌方伤害不使用此规则。
 */
export function preyCaptureRadius(
  playerLength,
  preyLength,
  nurseryLearning = false,
  frenzy = false,
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
  const normal = base + Math.min(0.65, base * 0.24);
  return normal + (frenzy ? Math.min(1.6, normal * 0.3) : 0);
}

/** 根据真实体长返回狂食接触区外的吸引宽度；不影响领主、伤害与刚体碰撞。 */
export function frenzyReachBonus(playerLength) {
  return Number.isFinite(playerLength) && playerLength > 0
    ? Math.min(10, 5 + playerLength * 0.16)
    : 0;
}

/**
 * 计算一帧吸引距离，外缘柔和增强，靠近嘴部收束；调用方必须先检查资格与遮挡。
 * @param {number} distance 当前猎物中心至捕获点的距离。
 * @param {number} captureRadius 当前普通猎物接触半径。
 * @param {number} playerLength 真实玩家体长。
 * @param {number} dt 本帧活动秒数。
 * @param {number} swimSpeed 玩家当前游速，用于补偿捕获点随玩家远离猎物的运动。
 * @returns {number} 沿嘴部方向的移动距离，不会越过中心。
 */
export function frenzyPullDistance(
  distance,
  captureRadius,
  playerLength,
  dt,
  swimSpeed = 0,
) {
  if (
    ![distance, captureRadius, playerLength, dt, swimSpeed].every(
      Number.isFinite,
    ) ||
    distance <= captureRadius ||
    captureRadius <= 0 ||
    playerLength <= 0 ||
    dt <= 0
  )
    return 0;
  const reach = frenzyReachBonus(playerLength);
  const weight = (captureRadius + reach - distance) / reach;
  if (weight <= 0) return 0;
  // 玩家冲刺时捕获点也在快速移动，吸力需补偿位移，尤其是乌贼尾随的腕部。
  const speed =
    Math.max(0, swimSpeed) +
    12 +
    Math.min(12, playerLength * 0.6) +
    10 * Math.min(1, weight);
  return Math.min(distance, speed * Math.min(dt, 0.1));
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
