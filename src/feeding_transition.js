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
  const carryCandidate = new THREE.Vector3();
  const carryTrial = new THREE.Vector3();
  let startedCount = 0;
  let completedCount = 0;
  let evictedCount = 0;

  function finish(entry, completed = false) {
    entry.carry?.frame.userData.setCaptureTarget?.(null);
    // 原模型保留在原父节点中；还原姿态后由原刷新流程决定何时重新显示。
    entry.mesh.position.copy(entry.position);
    entry.mesh.quaternion.copy(entry.quaternion);
    entry.mesh.scale.copy(entry.scale);
    entry.mesh.visible = false;
    entry.mesh.updateMatrix();
    active.delete(entry.mesh);
    if (completed) completedCount++;
  }

  function start(mesh, preyLength, { carryFrame, blockedBetween } = {}) {
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
    if (carryFrame?.isObject3D) {
      carryFrame.updateWorldMatrix(true, false);
      const localOrigin = carryFrame.worldToLocal(origin.clone());
      const bodyLength = carryFrame.getWorldScale(new THREE.Vector3()).x;
      const clearance = 0.13 + (preyLength / bodyLength) * 0.28;
      let side = localOrigin.x < 0 ? -1 : 1;
      const flank = new THREE.Vector3();
      // 优先沿猎物所在侧收拢；该侧被墙阻挡时选另一侧，不把猎物送穿外套膜。
      if (blockedBetween) {
        flank.set(side * clearance, -0.04, -0.08);
        carryFrame.localToWorld(flank);
        if (blockedBetween(origin, flank)) side *= -1;
      }
      entry.carry = {
        frame: carryFrame,
        origin: localOrigin,
        clearance,
        side,
        blockedBetween,
        previous: origin.clone(),
        framePosition: carryFrame.getWorldPosition(new THREE.Vector3()),
        bodyLength,
      };
      entry.duration = THREE.MathUtils.clamp(
        0.5 + Math.sqrt(bodyLength) * 0.045 + Math.sqrt(preyLength) * 0.025,
        0.55,
        0.95,
      );
    }
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
      if (entry.carry) {
        const { frame, origin, clearance, side } = entry.carry;
        frame.updateWorldMatrix(true, false);
        frame.worldToLocal(localPoint.copy(target));
        const travel = THREE.MathUtils.smoothstep(progress, 0, 0.9);
        const remaining = 1 - travel;
        worldPoint.copy(origin).multiplyScalar(remaining ** 3);
        control.set(side * clearance, origin.y, origin.z + 0.12);
        worldPoint.addScaledVector(control, 3 * remaining ** 2 * travel);
        control.set(side * clearance, -0.04, localPoint.z + 0.1);
        worldPoint
          .addScaledVector(control, 3 * remaining * travel ** 2)
          .addScaledVector(localPoint, travel ** 3);
        frame.localToWorld(worldPoint);
        const carry = entry.carry;
        frame.getWorldPosition(carryTrial);
        const maxTravel =
          (8 + carry.bodyLength * 1.4) * Math.min(dt, 0.1) +
          carryTrial.distanceTo(carry.framePosition);
        carry.framePosition.copy(carryTrial);
        const separation = worldPoint.distanceTo(carry.previous);
        if (separation > maxTravel)
          worldPoint.lerp(carry.previous, 1 - maxTravel / separation);
        if (carry.blockedBetween?.(carry.previous, worldPoint)) {
          // 主体仍会向前游动，体外收拢也不能把贴墙猎物的可见模型带进墙里。
          carryCandidate.copy(worldPoint);
          let low = 0,
            high = 1;
          for (let i = 0; i < 6; i++) {
            const fraction = (low + high) / 2;
            carryTrial.copy(carry.previous).lerp(carryCandidate, fraction);
            if (carry.blockedBetween(carry.previous, carryTrial))
              high = fraction;
            else low = fraction;
          }
          worldPoint.copy(carry.previous).lerp(carryCandidate, low);
        }
        carry.previous.copy(worldPoint);
        frame.userData.setCaptureTarget?.(
          worldPoint,
          1 - THREE.MathUtils.smoothstep(progress, 0.82, 1),
        );
      } else {
        control.copy(entry.origin).lerp(target, 0.6);
        control.y += Math.min(0.24, entry.preyLength * 0.07);
        worldPoint
          .copy(entry.origin)
          .multiplyScalar((1 - pull) ** 2)
          .addScaledVector(control, 2 * (1 - pull) * pull)
          .addScaledVector(target, pull * pull);
      }
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
        1 -
        THREE.MathUtils.smoothstep(
          progress,
          entry.carry ? 0.68 : 0.22,
          entry.carry ? 0.9 : 0.8,
        ) *
          0.88;
      const longitudinal =
        1 -
        THREE.MathUtils.smoothstep(
          progress,
          entry.carry ? 0.78 : 0.45,
          entry.carry ? 0.96 : 0.9,
        ) *
          0.7;
      const vanish =
        1 -
        THREE.MathUtils.smoothstep(progress, entry.carry ? 0.92 : 0.82, 1) *
          0.95;
      entry.mesh.scale.set(
        entry.scale.x * crossSection * vanish,
        entry.scale.y * crossSection * vanish,
        entry.scale.z * longitudinal * vanish,
      );
      entry.mesh.visible = true;
      entry.mesh.updateMatrix();
      if (!entry.mistEmitted && progress >= (entry.carry ? 0.91 : 0.65)) {
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
        carrying: !!entry.carry,
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
