import * as THREE from "three";
import { MAX_SWIM_PITCH } from "./steering_rules.js";

/** 空中武器方向跟随已有方向输入；不把瞄准输入写回滑翔或破水弹道。 */
export function isMechanicalAirAim({
  characterId,
  surfaceMode,
  airborne = false,
  positionY,
  surfaceY = 4,
}) {
  return (
    characterId === "mechanical_shark" &&
    (airborne ||
      (surfaceMode === "aether" &&
        Number.isFinite(positionY) &&
        positionY > surfaceY))
  );
}

/** 水下仍取实际游向；空中只读取操纵姿态，预览和真实发射应共用返回值。 */
export function mechanicalAimDirection(out, context) {
  const { forward, yaw, pitch } = context;
  if (
    !isMechanicalAirAim(context) ||
    !Number.isFinite(yaw) ||
    !Number.isFinite(pitch)
  )
    return out.copy(forward);
  const angle = THREE.MathUtils.clamp(pitch, -MAX_SWIM_PITCH, MAX_SWIM_PITCH);
  const flat = Math.cos(angle);
  return out.set(-Math.sin(yaw) * flat, Math.sin(angle), -Math.cos(yaw) * flat);
}

/** 空中瞄准时适度绕本尊跟随俯仰；下俯不会让镜头越过本尊的前方。 */
export function mechanicalAimCameraPitch(pitch, offsetHeight, offsetDistance) {
  const angle = Number.isFinite(pitch)
    ? THREE.MathUtils.clamp(pitch, -MAX_SWIM_PITCH, MAX_SWIM_PITCH)
    : 0;
  const height = Math.max(0, Number.isFinite(offsetHeight) ? offsetHeight : 0);
  const distance = Math.max(
    0.01,
    Number.isFinite(offsetDistance) ? offsetDistance : 0.01,
  );
  const downLimit = Math.max(0, Math.atan2(distance, height) - Math.PI / 18);
  return Math.max(-downLimit, angle * 0.8);
}

const viewMatrix = new THREE.Matrix4(),
  viewRotation = new THREE.Quaternion(),
  worldUp = new THREE.Vector3(0, 1, 0),
  zero = new THREE.Vector3(),
  preferredDirection = new THREE.Vector3(),
  targetDirection = new THREE.Vector3(),
  candidateDirection = new THREE.Vector3(),
  localTarget = new THREE.Vector3();

function aimWithinFrame(direction, halfHeight, ratio, safe) {
  viewMatrix.lookAt(zero, direction, worldUp);
  viewRotation.setFromRotationMatrix(viewMatrix).invert();
  localTarget.copy(targetDirection).applyQuaternion(viewRotation);
  return (
    localTarget.z < -1e-8 &&
    Math.abs(localTarget.y) <= -localTarget.z * halfHeight * safe &&
    Math.abs(localTarget.x) <= -localTarget.z * halfHeight * ratio * safe
  );
}

/**
 * 实体约束和镜头插值之后，再把真实瞄准点纳入当前视野。
 * 只调整观察目标，不裁剪准星位置，也不改变瞄准射线、角色姿态或位置。
 */
export function frameMechanicalAimTarget(
  out,
  {
    cameraPosition,
    preferredTarget,
    aimPoint,
    fov = 60,
    aspect = 1,
    margin = 0.86,
  },
) {
  preferredDirection.copy(preferredTarget).sub(cameraPosition);
  targetDirection.copy(aimPoint).sub(cameraPosition);
  const distance = preferredDirection.length();
  if (!(distance > 1e-6) || targetDirection.lengthSq() < 1e-12)
    return out.copy(preferredTarget);
  preferredDirection.multiplyScalar(1 / distance);
  targetDirection.normalize();
  const halfHeight = Math.tan(
    (THREE.MathUtils.clamp(Number.isFinite(fov) ? fov : 60, 1, 179) * Math.PI) /
      360,
  );
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const safe = THREE.MathUtils.clamp(
    Number.isFinite(margin) ? margin : 0.86,
    0.5,
    0.98,
  );
  if (aimWithinFrame(preferredDirection, halfHeight, ratio, safe))
    return out.copy(preferredTarget);
  if (preferredDirection.dot(targetDirection) < -0.999999)
    return out.copy(cameraPosition).addScaledVector(targetDirection, distance);
  let low = 0,
    high = 1;
  // 固定次数，无逐帧分配；使用最终镜头位置，兼容被墙或地形缩短的距离。
  for (let i = 0; i < 14; i++) {
    const middle = (low + high) / 2;
    candidateDirection
      .copy(preferredDirection)
      .lerp(targetDirection, middle)
      .normalize();
    if (aimWithinFrame(candidateDirection, halfHeight, ratio, safe))
      high = middle;
    else low = middle;
  }
  candidateDirection
    .copy(preferredDirection)
    .lerp(targetDirection, high)
    .normalize();
  return out.copy(cameraPosition).addScaledVector(candidateDirection, distance);
}
