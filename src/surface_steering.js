import { MAX_SWIM_PITCH, stepSteering } from "./steering_rules.js";
import { getSurfaceWaterline } from "./surface_rules.js";

/** 普通浮游的舒适角度与水线容差；不参与蓄势、起跳或弹道计算。 */
export const SURFACE_STEERING = Object.freeze({
  maxUpwardPitch: (Math.PI * 20) / 180,
  contactTolerance: 0.04,
  settleRate: 4.8,
});

/**
 * 推进操纵姿态，仅在普通浮游贴住身体水线时柔和限制上仰。
 * @param {{yaw:number,pitch:number}} orientation 原操纵姿态，角度使用弧度。
 * @param {{x:number,y:number}} input 输入，正值分别为右转与上仰。
 * @param {{yawRate:number,pitchRate:number}} movement 当前角色的转向参数。
 * @param {number} dt 本帧经过秒数；零值或非法时间不推进。
 * @param {{positionY:number,length:number,surfaceY?:number,airborne?:boolean,reentering?:boolean,boosting?:boolean,divingRequired?:boolean}} surface 本帧移动前的中心高度与既有水面状态。
 * @returns {{yaw:number,pitch:number}} 新操纵姿态；不修改参数或水面状态。
 */
export function stepSurfaceSteering(
  orientation,
  input,
  movement,
  dt,
  {
    positionY,
    length,
    surfaceY = 4,
    airborne = false,
    reentering = false,
    boosting = false,
    divingRequired = true,
  } = {},
) {
  const result = stepSteering(orientation, input, movement, dt);
  const elapsed = Math.max(0, finite(dt));
  const waterline = getSurfaceWaterline(length, surfaceY);
  // 与破水规则相同：仍在水线以下且已经下潜解锁，才能继续积攒真实冲刺动量。
  // 不要求本帧之前已蓄满，避免最后一帧恰好完成蓄势时提前压低起跳方向。
  const preparingBreach =
    boosting && divingRequired === false && positionY < waterline - 0.001;
  if (
    elapsed === 0 ||
    !Number.isFinite(positionY) ||
    !Number.isFinite(waterline) ||
    Math.abs(positionY - waterline) > SURFACE_STEERING.contactTolerance ||
    airborne ||
    reentering ||
    preparingBreach
  )
    return result;

  const maximum = SURFACE_STEERING.maxUpwardPitch;
  const previous = clamp(
    finite(orientation?.pitch),
    -MAX_SWIM_PITCH,
    MAX_SWIM_PITCH,
  );
  if (previous <= maximum) {
    result.pitch = Math.min(maximum, result.pitch);
    return result;
  }

  // 超过舒适角度后不再累加上仰输入，防止持续 W 与自动下压互相抵消。
  // 下俯仍立即响应；解析求解角速度与衰减，跨过20度后仅剩玩家操纵。
  const pitchRate = Math.max(
    0,
    finite(movement?.pitchRate, finite(movement?.yawRate, 1.15)),
  );
  const velocity = Math.min(0, clamp(finite(input?.y), -1, 1)) * pitchRate;
  const rate = SURFACE_STEERING.settleRate;
  const offset = velocity / rate;
  const crossingTime =
    velocity < 0
      ? Math.log((previous - maximum - offset) / -offset) / rate
      : Infinity;
  result.pitch =
    elapsed >= crossingTime
      ? maximum + velocity * (elapsed - crossingTime)
      : maximum +
        offset +
        (previous - maximum - offset) * Math.exp(-rate * elapsed);
  result.pitch = clamp(result.pitch, -MAX_SWIM_PITCH, MAX_SWIM_PITCH);
  return result;
}

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
