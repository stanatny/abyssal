import { MAX_SWIM_PITCH, stepSteering } from "./steering_rules.js";

/** 只在真实触底后辅助脱离，不限制开阔水域的自由下潜。 */
export const GROUND_STEERING = Object.freeze({
  triggerPitch: (-25 * Math.PI) / 180,
  minimumSupportY: 0.5,
  contactTolerance: 0.06,
  settleRate: 4.8,
  recoveryTarget: (8 * Math.PI) / 180,
});

/**
 * 判断向下的鱼身是否已被海床或实体地板挡住。
 * @param {number} pitch 当前俯仰弧度。
 * @param {object} contact 移动期望高度、碰撞结果、身体海床下限和离水/喷射状态。
 * @returns {boolean} 是否开始一次抬头脱困；墙面、天花板和未接触的深水不触发。
 */
export function needsGroundRecovery(
  pitch,
  { desiredY, position, floorY, contacts = [], airborne = false, jet = false },
) {
  if (!Number.isFinite(pitch) || pitch >= GROUND_STEERING.triggerPitch)
    return false;
  if (airborne || jet) return false;
  const terrainContact =
    Number.isFinite(floorY) &&
    desiredY < position.y - 0.001 &&
    Math.abs(position.y - floorY) <= GROUND_STEERING.contactTolerance;
  return (
    terrainContact ||
    contacts.some((hit) => hit.normal.y >= GROUND_STEERING.minimumSupportY)
  );
}

/**
 * 实际触底后完成一次短促平滑的抬头，即使身体已稍微离地也不反复开关。
 * @param {object} orientation 当前 yaw/pitch 弧度。
 * @param {object} input 与正常操控相同的左右/上下输入（已应用反转设置）。
 * @param {object} movement 当前角色转向角速度。
 * @param {number} dt 物理秒数；暂停不推进。
 * @returns {object} 新 yaw/pitch 和 recovering；到水平即交还全部操控，下潜输入仅在脱困期间抑制。
 */
export function stepGroundSteering(orientation, input, movement, dt) {
  const result = stepSteering(orientation, input, movement, dt);
  const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const previous = Math.max(-MAX_SWIM_PITCH, Math.min(0, orientation.pitch));
  if (elapsed === 0) return { ...orientation, recovering: previous < 0 };
  if (orientation.pitch >= 0) return { ...result, recovering: false };
  const rate = GROUND_STEERING.settleRate;
  const velocity =
    Math.max(0, Math.min(1, input.y || 0)) *
    Math.max(0, movement.pitchRate ?? movement.yawRate ?? 1.15);
  // 目标略高于水平，使零输入也能在有限时间脱离；真正到水平后停止辅助。
  const target = GROUND_STEERING.recoveryTarget + velocity / rate;
  const crossingTime = Math.log((target - previous) / target) / rate;
  result.pitch = Math.min(
    MAX_SWIM_PITCH,
    elapsed >= crossingTime
      ? velocity * (elapsed - crossingTime)
      : target + (previous - target) * Math.exp(-rate * elapsed),
  );
  return { ...result, recovering: result.pitch < 0 };
}
