import * as THREE from "three";
const WORLD_UP = new THREE.Vector3(0, 1, 0);

/** 地面动物保持世界上方向；近乎垂直的攻击向量仍沿上一平面朝向，不能翻滚。 */
export function uprightHeadingQuaternion(out, direction, fallbackYaw = 0) {
  const planar = Math.hypot(direction.x, direction.z);
  const yaw =
    planar > 1e-5 ? Math.atan2(-direction.x, -direction.z) : fallbackYaw;
  return out.setFromAxisAngle(WORLD_UP, yaw);
}

/** 陆行神话生物的有界跃击；只依赖通用地面特征，不按地图或物种名字分流。 */
export function groundCreatureClearance(mesh, length, fallbackPadding = 2) {
  const support = mesh.userData.groundSupport;
  // 静态脚底留少量步态余量，模型没有支撑元数据时保留旧导航约定。
  return Number.isFinite(support)
    ? length * (support + 0.015) + 0.12
    : length * 0.28 + fallbackPadding;
}

export function stepGroundCreature(
  state,
  dt,
  {
    hunting = false,
    distance = Infinity,
    targetHeight = Infinity,
    groundHeight = 0,
    length = 10,
  } = {},
) {
  state.cooldown = Math.max(0, (state.cooldown ?? 4) - dt);
  state.timer = (state.timer ?? 0) + dt;
  state.phase ??= "walk";
  if (
    state.phase === "walk" &&
    hunting &&
    distance < length * 2.3 &&
    targetHeight - groundHeight < length * 1.6 &&
    state.cooldown <= 0
  ) {
    state.phase = "windup";
    state.timer = 0;
  } else if (state.phase === "windup" && state.timer >= 0.7) {
    state.phase = "leap";
    state.timer = 0;
  } else if (state.phase === "leap" && state.timer >= 1.3) {
    state.phase = "walk";
    state.timer = 0;
    state.cooldown = 8;
  }
  return {
    height:
      state.phase === "leap"
        ? Math.sin(Math.min(1, state.timer / 1.3) * Math.PI) *
          Math.min(32, length * 0.8)
        : 0,
    speed: state.phase === "windup" ? 0.15 : state.phase === "leap" ? 1.8 : 1,
    warning: state.phase === "windup",
  };
}

/** 平面转身限制角速度；前摇时锁住起跳朝向，空中不追着目标突然掉头。 */
export function stepGroundHeading(out, desired, dt, state) {
  const current =
    Math.hypot(out.x, out.z) > 1e-5
      ? Math.atan2(-out.x, -out.z)
      : Math.atan2(-desired.x, -desired.z);
  let yaw = current;
  if (state.phase === "windup" || state.phase === "leap") {
    state.launchYaw ??= current;
    yaw = state.launchYaw;
  } else {
    state.launchYaw = null;
    const next =
      Math.hypot(desired.x, desired.z) > 1e-5
        ? Math.atan2(-desired.x, -desired.z)
        : current;
    const turn = Math.atan2(Math.sin(next - current), Math.cos(next - current));
    yaw += Math.max(-1.8 * dt, Math.min(1.8 * dt, turn));
  }
  return out.set(-Math.sin(yaw), 0, -Math.cos(yaw));
}

/** 以实际水平路程推进四足步态；暂停、挡墙或前摇不会原地高速踏步。 */
export function groundGaitState(state, distance, length, dt) {
  state.gaitPhase =
    (state.gaitPhase ?? 0) +
    (Math.max(0, distance) / Math.max(1, length * 0.38)) * Math.PI * 2;
  return {
    gaitPhase: state.gaitPhase,
    phase: state.phase,
    progress: Math.min(1, (state.timer ?? 0) / 1.3),
    speed: dt > 0 ? distance / dt : 0,
  };
}
