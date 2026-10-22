import * as THREE from "three";

/** 咬中后的追尾状态随现有猎手状态一起重建；不保存玩家或网格引用。 */
export function beginTailFollow(hunter, currentSpeed) {
  hunter.tailFollow = {
    speed: Math.max(0, currentSpeed),
    hitTrigger: hunter.triggerCount,
  };
}

/** 已咬中的这次突袭开始刹车；下一次特殊攻击仍可独立蓄力并锁向冲刺。 */
export function tailFollowReady(hunter) {
  return (
    !!hunter.tailFollow &&
    (hunter.phase === "idle" ||
      hunter.phase === "recover" ||
      (hunter.phase === "active" &&
        hunter.tailFollow.hitTrigger === hunter.triggerCount))
  );
}

/**
 * 接近尾后等待点时减速，冷却末段再靠近嘴部攻击距离。
 * 只返回游动意图；不挪动角色、不扣血、不改冷却，也不越过地形碰撞。
 */
export function steerTailFollow(
  state,
  dt,
  {
    predator,
    predatorLength,
    player,
    playerLength,
    forward,
    velocity,
    cooldown,
    maxSpeed,
  },
  direction,
) {
  const biteRadius =
    Math.max(0.5, playerLength * 0.13) + Math.max(0.35, predatorLength * 0.07);
  const waitingGap =
    THREE.MathUtils.clamp(cooldown / 0.65, 0, 1) *
    THREE.MathUtils.clamp(predatorLength * 0.08, 0.8, 2.5);
  const distance =
    predatorLength * 0.36 +
    playerLength * 0.25 +
    biteRadius * 0.65 +
    waitingGap;
  direction.copy(player).addScaledVector(forward, -distance).sub(predator);
  // 速度前馈保留玩家冲刺优势；位置误差只决定追赶/刹车，不把猎手钉在尾部。
  direction.multiplyScalar(2.4).add(velocity);
  const speed = Math.min(maxSpeed, direction.length());
  if (direction.lengthSq() > 1e-8) direction.normalize();
  else direction.copy(forward);
  state.speed = THREE.MathUtils.damp(state.speed, speed, 10, dt);
  return Math.min(maxSpeed, state.speed);
}
