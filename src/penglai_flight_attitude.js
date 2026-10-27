import * as THREE from "three";

const euler = new THREE.Euler(0, 0, 0, "YXZ");
const MAX_PITCH = Math.PI / 4;
const MAX_BANK = Math.PI / 10;
const TURN_RATE = 1.15;
const PITCH_RATE = 0.7;
const shortest = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const approach = (a, b, step) => a + THREE.MathUtils.clamp(b - a, -step, step);

/** 朱雀与青龙沿水平偏航转弯，俯仰受限；正后方目标不能触发最短弧翻身。 */
export function isPenglaiFlyingGuardian(kind) {
  return kind === "vermilion_bird" || kind === "azure_dragon";
}

function angles(orientation, direction, dt, turnRate) {
  euler.setFromQuaternion(orientation, "YXZ");
  const horizontal = Math.hypot(direction.x, direction.z);
  const yaw =
    horizontal > 1e-6 ? Math.atan2(-direction.x, -direction.z) : euler.y;
  const pitch = THREE.MathUtils.clamp(
    Math.atan2(direction.y, horizontal),
    -MAX_PITCH,
    MAX_PITCH,
  );
  const step = Math.max(0, dt);
  const turn = THREE.MathUtils.clamp(
    shortest(yaw - euler.y),
    -turnRate * step,
    turnRate * step,
  );
  euler.y += turn;
  euler.x = approach(euler.x, pitch, PITCH_RATE * step);
  return step > 0 ? turn / step : 0;
}

/** 位移和可见身体使用同一个有界转向，避免侧滑、原地倒转与垂直掉头。 */
export function steerPenglaiFlight(
  out,
  orientation,
  direction,
  dt,
  turnRate = TURN_RATE,
) {
  angles(orientation, direction, dt, turnRate);
  const horizontal = Math.cos(euler.x);
  return out.set(
    -Math.sin(euler.y) * horizontal,
    Math.sin(euler.x),
    -Math.cos(euler.y) * horizontal,
  );
}

/** 转弯时小幅压翼，直飞自动回平；分别插值欧拉分量，不跨过倒置姿态。 */
export function updatePenglaiFlightAttitude(out, direction, dt) {
  if (!(dt > 0)) return out;
  const rate = angles(out, direction, dt, TURN_RATE);
  const bank = THREE.MathUtils.clamp(-rate * 0.22, -MAX_BANK, MAX_BANK);
  euler.z = approach(
    euler.z,
    euler.z + (bank - euler.z) * (1 - Math.exp(-5 * dt)),
    0.65 * dt,
  );
  return out.setFromEuler(euler);
}
