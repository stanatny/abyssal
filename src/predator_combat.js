import { sweptCaptureFraction } from "./prey_capture.js";

/** 判断普通猎手是否仍可威胁玩家；至少大出5米才属于绝对体型优势。 */
export function canPredatorRetaliate(
  playerLength,
  preyLength,
  threatCeilingLength = Infinity,
) {
  return (
    Number.isFinite(playerLength) &&
    Number.isFinite(preyLength) &&
    preyLength > 0 &&
    playerLength < threatCeilingLength &&
    playerLength - preyLength < 5
  );
}

/** 侧后方瞄准点必须仍在既有嘴部接触宽度内，成年角色不能把目标挤到身外。 */
export function aimPredatorFlank(
  target,
  forward,
  predatorLength,
  playerLength,
  side,
) {
  const lateral = Math.min(
    playerLength * 0.24,
    predatorBiteRadius(playerLength, predatorLength) * 0.35,
  );
  target.addScaledVector(forward, -playerLength * 0.25);
  target.x += forward.z * lateral * side;
  target.z -= forward.x * lateral * side;
  return target;
}

/** 与原有判定完全相同的接触宽度，瞄准只使用它而不扩大攻击范围。 */
function predatorBiteRadius(playerLength, predatorLength) {
  return (
    Math.max(0.5, playerLength * 0.13) + Math.max(0.35, predatorLength * 0.07)
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
  previousPredatorForward = predatorForward,
  predatorLength,
  previousPlayer,
  player,
  playerForward,
  previousPlayerForward = playerForward,
  playerLength,
  edible,
}) {
  const dx = player.x - predator.x,
    dy = player.y - predator.y,
    dz = player.z - predator.z;
  const distance = Math.hypot(dx, dy, dz);
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
    x: previousPredator.x + previousPredatorForward.x * mouthOffset,
    y: previousPredator.y + previousPredatorForward.y * mouthOffset,
    z: previousPredator.z + previousPredatorForward.z * mouthOffset,
  };
  const radius = predatorBiteRadius(playerLength, predatorLength);
  for (const fraction of [-0.25, 0, 0.25]) {
    const offset = playerLength * fraction;
    const target = {
      x: player.x + playerForward.x * offset,
      y: player.y + playerForward.y * offset,
      z: player.z + playerForward.z * offset,
    };
    const oldTarget = {
      x: previousPlayer.x + previousPlayerForward.x * offset,
      y: previousPlayer.y + previousPlayerForward.y * offset,
      z: previousPlayer.z + previousPlayerForward.z * offset,
    };
    const t = sweptCaptureFraction(oldMouth, mouth, oldTarget, target, radius);
    if (t === null) continue;
    // 高速穿越后帧末已在玩家前方，不能因此否定帧内真实朝前的咬击。
    const relative = {
      x: previousPlayer.x - previousPredator.x,
      y: previousPlayer.y - previousPredator.y,
      z: previousPlayer.z - previousPredator.z,
    };
    relative.x += (dx - relative.x) * t;
    relative.y += (dy - relative.y) * t;
    relative.z += (dz - relative.z) * t;
    if (
      facingAtContact(relative, previousPredatorForward, predatorForward, t) <
      0.35
    )
      continue;
    // 玩家仍先捕食；可食猎手只在侧后方伤人，不能把背向的肚皮变成嘴。
    if (
      edible &&
      facingAtContact(relative, previousPlayerForward, playerForward, t) < -0.45
    )
      continue;
    return true;
  }
  return false;
}

function facingAtContact(relative, before, after, t) {
  const x = before.x + (after.x - before.x) * t,
    y = before.y + (after.y - before.y) * t,
    z = before.z + (after.z - before.z) * t;
  const denominator =
    Math.hypot(x, y, z) * Math.hypot(relative.x, relative.y, relative.z);
  return denominator > 1e-9
    ? (x * relative.x + y * relative.y + z * relative.z) / denominator
    : 0;
}
