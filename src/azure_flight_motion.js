import * as T from "three";

/** 青龙移动请求的小幅游曳航线；仍交给既有转向、领地及全身碰撞检查。 */
export function azureFlightRequest(
  out,
  direction,
  phase,
  speed,
  previousSpeed,
  dt,
  mobile,
) {
  out.copy(direction);
  if (!mobile || !(dt > 0)) return speed;
  const horizontal = Math.hypot(out.x, out.z);
  const yaw = Math.atan2(-out.x, -out.z) + Math.sin(phase + 0.55) * 0.22;
  const pitch = Math.atan2(out.y, horizontal) + Math.sin(phase * 0.65) * 0.085;
  out.set(
    -Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  );
  // 起游从实际速度起步；被障碍挡住后不能积攒一次高速跳跃。减速不超过当前阶段请求。
  return Math.min(speed, T.MathUtils.damp(previousSpeed, speed, 5, dt));
}
