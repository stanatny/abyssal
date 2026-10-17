import { PLAYER_MOVEMENT } from "./simulation.js";
import { stepSteering } from "./steering_rules.js";

const glideAngle = (5 * Math.PI) / 180,
  slowFallAngle = (40 * Math.PI) / 180;

/** 仅约束玩家的蓬莱空域；下降速率不随刚松开冲刺的余速突然放大。 */
export const PENGLAI_FLIGHT_RULES = Object.freeze({
  glideAngle,
  slowFallAngle,
  glideSink: PLAYER_MOVEMENT.cruiseSpeed * Math.sin(glideAngle),
  slowSink: PLAYER_MOVEMENT.slowSpeed * Math.sin(slowFallAngle),
});

export const PENGLAI_FLIGHT_HELP =
  "蓬莱水下可自由游动；空中只有冲刺能向上爬升，但需要向上拉方向，冲刺本身不会自动抬头。正常速度缓慢滑翔下降，慢速会更快下坠。松开冲刺可恢复体力，交替冲刺与滑翔可逐步升高；山石与屋顶仍会阻挡移动和攻击。";

/** 重新冲刺从当前真实滑翔航向起步，禁止恢复不可见的旧上仰；再应用本帧方向输入。 */
export function stepPenglaiFlightSteering(
  orientation,
  input,
  movement,
  dt,
  { inAir = false, boosting = false, previousMotion } = {},
) {
  const startingSprint =
    Number.isFinite(dt) &&
    dt > 0 &&
    inAir &&
    boosting &&
    previousMotion?.flightMode !== "sprint" &&
    Number.isFinite(previousMotion?.posePitch);
  return stepSteering(
    startingSprint
      ? { ...orientation, pitch: previousMotion.posePitch }
      : orientation,
    input,
    movement,
    dt,
  );
}

/** 在既有游泳位移之后、实体碰撞之前约束真实航向，保留冲刺体力和全部地形检查。 */
export function stepPenglaiFlight(
  dt,
  {
    position,
    previousPosition,
    forward,
    speed,
    boosting = false,
    slowing = false,
    yaw = 0,
    surfaceY,
  },
) {
  const result = { airborne: false, reentering: false, flightMode: "water" };
  if (!Number.isFinite(dt) || dt <= 0) return result;
  if (previousPosition.y <= surfaceY) {
    // 非冲刺不能借反复穿过水面累计抬升；水下方向、速度和潜游保持原样。
    if (!boosting) position.y = Math.min(position.y, surfaceY);
    if (position.y > surfaceY) result.flightMode = "sprint";
    return result;
  }
  const horizontal = Math.hypot(forward.x, forward.z),
    desiredPitch = Math.atan2(forward.y, horizontal),
    heading = horizontal > 1e-8 ? Math.atan2(-forward.x, -forward.z) : yaw,
    travelSpeed = Number.isFinite(speed) ? Math.max(0, speed) : 0,
    sink = slowing
      ? PENGLAI_FLIGHT_RULES.slowSink
      : PENGLAI_FLIGHT_RULES.glideSink,
    minimumDescent = Math.asin(Math.min(1, sink / (travelSpeed || sink))),
    actualPitch = boosting
      ? desiredPitch
      : Math.min(desiredPitch, -minimumDescent),
    flat = Math.cos(actualPitch);
  forward.set(
    -Math.sin(heading) * flat,
    Math.sin(actualPitch),
    -Math.cos(heading) * flat,
  );
  position.copy(previousPosition).addScaledVector(forward, travelSpeed * dt);
  result.flightMode = boosting ? "sprint" : slowing ? "sink" : "glide";
  result.posePitch = actualPitch;
  result.poseYaw = heading;
  return result;
}
