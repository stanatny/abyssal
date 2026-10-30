import * as THREE from "three";

const attitude = new THREE.Euler(0, 0, 0, "YXZ");
const levelSwimmers = new Set([
  "turtle",
  "archelon",
  "amazon_river_turtle",
  "stupendemys",
  "xuangui",
  "hujiao",
  "pool_hujiao",
  "hydra",
  "mayan",
]);

/** 稳定躯干的游姿约束；旧有四足步态、长躯导航和飞行守卫仍由各自控制器处理。 */
export function creaturePitchLimit(species, model = {}) {
  if (species.groundbound || species.benthic || species.upright) return 0;
  if (Number.isFinite(model.aquaticPitchLimit)) return model.aquaticPitchLimit;
  if (species.flying) return 1;
  if (model.aquaticUpright || levelSwimmers.has(species.kind)) return 0.65;
  return 1.4;
}

/**
 * 分别平滑偏航、俯仰和回正，不能把指向身后上方的向量解释成腹背翻转。
 * 仅改变可见姿态，方向/速度、锁定目标和命中规则仍由原运动与战斗逻辑负责。
 */
export function updateCreatureAttitude(
  out,
  direction,
  dt,
  pitchLimit = 1.4,
  response = 3,
) {
  if (!(dt > 0) || direction.lengthSq() < 1e-12) return out;
  attitude.setFromQuaternion(out, "YXZ");
  const planar = Math.hypot(direction.x, direction.z),
    yaw = planar > 1e-5 ? Math.atan2(-direction.x, -direction.z) : attitude.y,
    pitch = THREE.MathUtils.clamp(
      Math.atan2(direction.y, planar),
      -pitchLimit,
      pitchLimit,
    ),
    blend = Math.min(1, dt * response),
    delta = Math.atan2(Math.sin(yaw - attitude.y), Math.cos(yaw - attitude.y));
  attitude.y += delta * blend;
  attitude.x += (pitch - attitude.x) * blend;
  attitude.z += -attitude.z * blend;
  return out.setFromEuler(attitude);
}
