import * as THREE from "three";

/**
 * 从当前首页构图环绕到追尾镜头；只改展示变换，不推进玩法或新增渲染循环。
 * @param {object} options 相机、角色、目标构图与过渡秒数。
 * @returns {object} advance(dt) 返回进度；调用方负责暂停、输入和状态交接。
 */
export function createLaunchTransition({
  camera,
  avatar,
  destination,
  length,
  cameraPosition,
  cameraTarget,
  duration = 1.65,
}) {
  const fromPosition = avatar.position.clone();
  const fromRotation = avatar.quaternion.clone();
  const fromScale = avatar.scale.x;
  const destinationRotation = new THREE.Quaternion();
  const fromOffset = new THREE.Spherical().setFromVector3(
    camera.position.clone().sub(fromPosition),
  );
  const toOffset = new THREE.Spherical().setFromVector3(
    cameraPosition.clone().sub(destination),
  );
  // 环绕始终走较短的圆弧，避免角度边界导致整圈旋转。
  const yawDelta =
    THREE.MathUtils.euclideanModulo(
      toOffset.theta - fromOffset.theta + Math.PI,
      Math.PI * 2,
    ) - Math.PI;
  const fromTarget = camera
    .getWorldDirection(new THREE.Vector3())
    .multiplyScalar(fromOffset.radius)
    .add(camera.position);
  const offset = new THREE.Spherical();
  const orbit = new THREE.Vector3();
  const target = new THREE.Vector3();
  let time = 0;
  return {
    target,
    advance(dt) {
      time = Math.min(duration, time + Math.max(0, dt));
      const progress = time / duration;
      const blend = progress * progress * (3 - 2 * progress);
      avatar.position.lerpVectors(fromPosition, destination, blend);
      avatar.quaternion.slerpQuaternions(
        fromRotation,
        destinationRotation,
        blend,
      );
      avatar.scale.setScalar(THREE.MathUtils.lerp(fromScale, length, blend));
      offset.set(
        THREE.MathUtils.lerp(fromOffset.radius, toOffset.radius, blend),
        THREE.MathUtils.lerp(fromOffset.phi, toOffset.phi, blend),
        fromOffset.theta + yawDelta * blend,
      );
      camera.position.copy(avatar.position).add(orbit.setFromSpherical(offset));
      target.lerpVectors(fromTarget, cameraTarget, blend);
      camera.lookAt(target);
      return progress;
    },
  };
}
