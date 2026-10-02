import { sweptCaptureFraction } from "./prey_capture.js";

/** 判断普通猎手是否仍可威胁玩家；至少大出5米才属于绝对体型优势。 */
export function canPredatorRetaliate(playerLength, preyLength) {
  return (
    Number.isFinite(playerLength) &&
    Number.isFinite(preyLength) &&
    preyLength > 0 &&
    playerLength - preyLength < 5
  );
}

/**
 * 猎手嘴部扫掠玩家的躯干；可食猎手仅允许侧后方接触造成伤害。
 * 玩家嘴部成功捕获必须先于本查询结算，碰撞及安全区检查由调用方提供。
 */
export function predatorBiteContact({
  previousPredator,
  predator,
  predatorForward,
  predatorLength,
  previousPlayer,
  player,
  playerForward,
  playerLength,
  edible,
}) {
  const dx = player.x - predator.x,
    dy = player.y - predator.y,
    dz = player.z - predator.z;
  const distance = Math.hypot(dx, dy, dz);
  if (
    !distance ||
    (dx * predatorForward.x + dy * predatorForward.y + dz * predatorForward.z) /
      distance <
      0.35
  )
    return false;
  // 前方的猎物交给主角的嘴部判定；不能用肚皮接触替代吞食，也不能背向咬人。
  if (
    edible &&
    (-dx * playerForward.x - dy * playerForward.y - dz * playerForward.z) /
      distance >
      0.45
  )
    return false;
  const travel =
    Math.hypot(
      predator.x - previousPredator.x,
      predator.y - previousPredator.y,
      predator.z - previousPredator.z,
    ) +
    Math.hypot(
      player.x - previousPlayer.x,
      player.y - previousPlayer.y,
      player.z - previousPlayer.z,
    );
  if (distance > predatorLength * 0.43 + playerLength * 0.38 + travel + 1)
    return false;
  const mouthOffset = predatorLength * 0.36;
  const mouth = {
    x: predator.x + predatorForward.x * mouthOffset,
    y: predator.y + predatorForward.y * mouthOffset,
    z: predator.z + predatorForward.z * mouthOffset,
  };
  const oldMouth = {
    x: previousPredator.x + predatorForward.x * mouthOffset,
    y: previousPredator.y + predatorForward.y * mouthOffset,
    z: previousPredator.z + predatorForward.z * mouthOffset,
  };
  const radius =
    Math.max(0.5, playerLength * 0.13) + Math.max(0.35, predatorLength * 0.07);
  for (const fraction of [-0.25, 0, 0.25]) {
    const offset = playerLength * fraction;
    const target = {
      x: player.x + playerForward.x * offset,
      y: player.y + playerForward.y * offset,
      z: player.z + playerForward.z * offset,
    };
    const oldTarget = {
      x: previousPlayer.x + playerForward.x * offset,
      y: previousPlayer.y + playerForward.y * offset,
      z: previousPlayer.z + playerForward.z * offset,
    };
    if (
      sweptCaptureFraction(oldMouth, mouth, oldTarget, target, radius) !== null
    )
      return true;
  }
  return false;
}
