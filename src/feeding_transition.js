import * as THREE from "three";

/**
 * 借用已完成数值结算的猎物模型，表现收拢至嘴部、压缩和吞没。
 * @param {object} options 回调配置；onMist 接收世界坐标与猎物体长。
 * @returns {object} start(mesh, length)、has(mesh)、update(dt, {mouth, direction})、reset()、snapshot()。
 */
export function createFeedingTransition({ onMist } = {}) {
  const active = new Map();
  const directionUnit = new THREE.Vector3();
  const target = new THREE.Vector3();
  const control = new THREE.Vector3();
  const worldPoint = new THREE.Vector3();
  const localPoint = new THREE.Vector3();
  const facing = new THREE.Quaternion();
  const worldRotation = new THREE.Quaternion();
  const parentRotation = new THREE.Quaternion();
  let startedCount = 0;
  let completedCount = 0;
  let evictedCount = 0;

  function finish(entry, completed = false) {
    // 原模型保留在原父节点中；还原姿态后由原刷新流程决定何时重新显示。
    entry.mesh.position.copy(entry.position);
    entry.mesh.quaternion.copy(entry.quaternion);
    entry.mesh.scale.copy(entry.scale);
    entry.mesh.visible = false;
    entry.mesh.updateMatrix();
    active.delete(entry.mesh);
    if (completed) completedCount++;
  }

  function start(mesh, preyLength) {
    if (
      !mesh?.isObject3D ||
      active.has(mesh) ||
      !Number.isFinite(preyLength) ||
      preyLength <= 0
    )
      return false;
    mesh.updateWorldMatrix(true, false);
    const origin = mesh.getWorldPosition(new THREE.Vector3());
    if (!finiteVector(origin)) return false;
    if (active.size >= FEEDING_CAPACITY) {
      finish(active.values().next().value);
      evictedCount++;
    }
    const entry = {
      mesh,
      parent: mesh.parent,
      preyLength,
      duration: THREE.MathUtils.clamp(
        0.28 + Math.sqrt(preyLength) * 0.04,
        0.28,
        0.42,
      ),
      age: 0,
      origin,
      worldQuaternion: mesh.getWorldQuaternion(new THREE.Quaternion()),
      position: mesh.position.clone(),
      quaternion: mesh.quaternion.clone(),
      scale: mesh.scale.clone(),
      mistEmitted: false,
    };
    active.set(mesh, entry);
    startedCount++;
    mesh.visible = true;
    return true;
  }

  function update(dt, { mouth, direction } = {}) {
    // 无有效游戏时间或嘴部锚点时冻结；不使用墙钟或独立动画循环。
    if (
      !Number.isFinite(dt) ||
      dt <= 0 ||
      !finiteVector(mouth) ||
      !finiteVector(direction) ||
      direction.x ** 2 + direction.y ** 2 + direction.z ** 2 < 1e-12
    )
      return;
    directionUnit.copy(direction).normalize();
    facing.setFromUnitVectors(FORWARD, directionUnit);
    for (const entry of active.values()) {
      if (entry.mesh.parent !== entry.parent) {
        finish(entry);
        continue;
      }
      entry.age = Math.min(entry.duration, entry.age + dt);
      const progress = entry.age / entry.duration;
      const pull = THREE.MathUtils.smoothstep(progress, 0, 0.78);
      target
        .copy(mouth)
        .addScaledVector(
          directionUnit,
          -Math.min(0.8, entry.preyLength * 0.12),
        );
      control.copy(entry.origin).lerp(target, 0.6);
      control.y += Math.min(0.24, entry.preyLength * 0.07);
      worldPoint
        .copy(entry.origin)
        .multiplyScalar((1 - pull) ** 2)
        .addScaledVector(control, 2 * (1 - pull) * pull)
        .addScaledVector(target, pull * pull);
      localPoint.copy(worldPoint);
      worldRotation
        .copy(entry.worldQuaternion)
        .slerp(facing, THREE.MathUtils.smoothstep(progress, 0.02, 0.66) * 0.65);
      if (entry.parent) {
        entry.parent.updateWorldMatrix(true, false);
        entry.parent.worldToLocal(localPoint);
        entry.parent.getWorldQuaternion(parentRotation).invert();
        worldRotation.premultiply(parentRotation);
      }
      entry.mesh.position.copy(localPoint);
      entry.mesh.quaternion.copy(worldRotation);
      const crossSection =
        1 - THREE.MathUtils.smoothstep(progress, 0.22, 0.8) * 0.88;
      const longitudinal =
        1 - THREE.MathUtils.smoothstep(progress, 0.45, 0.9) * 0.7;
      const vanish = 1 - THREE.MathUtils.smoothstep(progress, 0.82, 1) * 0.95;
      entry.mesh.scale.set(
        entry.scale.x * crossSection * vanish,
        entry.scale.y * crossSection * vanish,
        entry.scale.z * longitudinal * vanish,
      );
      entry.mesh.visible = true;
      entry.mesh.updateMatrix();
      if (!entry.mistEmitted && progress >= 0.65) {
        entry.mistEmitted = true;
        // 回调使用独立向量，避免调用方保存或修改复用的临时坐标。
        onMist?.(target.clone(), entry.preyLength);
      }
      if (progress >= 1) finish(entry, true);
    }
  }

  function reset() {
    for (const entry of active.values()) finish(entry);
    startedCount = completedCount = evictedCount = 0;
  }

  return {
    start,
    has: (mesh) => active.has(mesh),
    update,
    reset,
    snapshot: () => ({
      activeCount: active.size,
      capacity: FEEDING_CAPACITY,
      startedCount,
      completedCount,
      evictedCount,
      entries: Array.from(active.values(), (entry) => ({
        uuid: entry.mesh.uuid,
        age: entry.age,
        duration: entry.duration,
        progress: entry.age / entry.duration,
        mistEmitted: entry.mistEmitted,
      })),
    }),
  };
}

const FEEDING_CAPACITY = 16;
const FORWARD = new THREE.Vector3(0, 0, -1);

function finiteVector(value) {
  return (
    value &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.z)
  );
}
