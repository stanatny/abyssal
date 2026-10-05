import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0),
  ROLL_AXIS = new THREE.Vector3(0, 0, 1);

/**
 * 为甲壳、八条刚性分节足创建独立的地形姿态解算器。
 * @param {THREE.Group} body 已归一化或等待归一化的解剖根。
 * @param {THREE.Group} shell 承载甲壳与步足的稳定胸部。
 * @param {Object[]} legs 带真实足端、原始节长和交错步态目标的步足。
 * @returns {{solveLeg: Function}} 默认步态使用局部解算；世界地形接口挂在 userData。
 */
export function bindKarkinosGrounding(body, shell, legs) {
  const direction = new THREE.Vector3(),
    pole = new THREE.Vector3(),
    kneeTarget = new THREE.Vector3(),
    lowerDirection = new THREE.Vector3(),
    inverseHip = new THREE.Quaternion(),
    world = new THREE.Vector3(),
    hipWorld = new THREE.Vector3(),
    worldScale = new THREE.Vector3(),
    terrainNormal = new THREE.Vector3(),
    terrainAttitude = new THREE.Quaternion(),
    gaitRoll = new THREE.Quaternion(),
    currentBodyAttitude = new THREE.Quaternion(),
    lastBodyAttitude = new THREE.Quaternion(),
    inverseShell = new THREE.Matrix4(),
    lastBodyPosition = new THREE.Vector3(),
    currentBodyPosition = new THREE.Vector3(),
    supportPoints = [
      new THREE.Vector3(0, -0.145, 0.035),
      new THREE.Vector3(-0.225, -0.127, -0.115),
      new THREE.Vector3(0.225, -0.127, -0.115),
      new THREE.Vector3(-0.22, -0.125, 0.16),
      new THREE.Vector3(0.22, -0.125, 0.16),
    ],
    slopeSamples = [
      new THREE.Vector3(-0.24, 0, 0),
      new THREE.Vector3(0.24, 0, 0),
      new THREE.Vector3(0, 0, -0.19),
      new THREE.Vector3(0, 0, 0.19),
    ],
    slopeHeights = new Float64Array(4),
    metrics = {
      requiredLift: 0,
      maxFitError: 0,
      minSoleClearance: 0,
      maxSoleClearance: 0,
      fittedFeet: 0,
      terrainTilt: 0,
      fitCount: 0,
      resetCount: 0,
    };
  let fittedOnce = false,
    lastGaitRoll = 0;

  for (const leg of legs) {
    leg.upperRest = leg.knee.position.clone();
    leg.lowerRest = leg.ankle.position.clone().add(leg.sole.position);
    leg.upperLength = leg.upperRest.length();
    leg.lowerLength = leg.lowerRest.length();
    leg.upperDirection = leg.upperRest.clone().normalize();
    leg.lowerDirection = leg.lowerRest.clone().normalize();
    leg.terrainTarget = new THREE.Vector3();
    leg.worldTarget = new THREE.Vector3();
    leg.stanceWorld = new THREE.Vector3();
    leg.wasSwinging = true;
    leg.terrainFitError = 0;
  }

  // 球面两杆逆运动学只旋转真实关节；不伸缩硬甲、不重建顶点、不改变游戏根。
  function solveLeg(leg, target) {
    direction.copy(target).sub(leg.hip.position);
    const requestedDistance = direction.length(),
      longest = leg.upperLength + leg.lowerLength - 0.0005,
      shortest = Math.abs(leg.upperLength - leg.lowerLength) + 0.0005,
      distance = THREE.MathUtils.clamp(requestedDistance, shortest, longest);
    if (requestedDistance < 0.000001) direction.set(leg.side, -1, 0);
    direction.normalize();
    pole.copy(UP).addScaledVector(direction, -direction.y);
    if (pole.lengthSq() < 0.000001) pole.set(leg.side, 0, 0);
    pole.normalize();
    const along =
        (leg.upperLength ** 2 - leg.lowerLength ** 2 + distance ** 2) /
        (2 * distance),
      rise = Math.sqrt(Math.max(0, leg.upperLength ** 2 - along ** 2));
    kneeTarget
      .copy(leg.hip.position)
      .addScaledVector(direction, along)
      .addScaledVector(pole, rise);
    lowerDirection.copy(kneeTarget).sub(leg.hip.position).normalize();
    leg.hip.quaternion.setFromUnitVectors(leg.upperDirection, lowerDirection);
    inverseHip.copy(leg.hip.quaternion).invert();
    lowerDirection
      .copy(leg.hip.position)
      .addScaledVector(direction, distance)
      .sub(kneeTarget)
      .applyQuaternion(inverseHip)
      .normalize();
    leg.knee.quaternion.setFromUnitVectors(leg.lowerDirection, lowerDirection);
    leg.ankle.quaternion.identity();
    leg.terrainFitError = Math.abs(requestedDistance - distance);
  }

  /**
   * 动画与游戏根变换之后，将足底拟合到当前世界海床。
   * @param {(x:number,z:number)=>number} heightAt 世界 XZ 对应的实际海床高度。
   * @returns {number} 所需的非负世界 Y 抬升量；调用方应用到游戏根并最多再拟合一次。
   */
  function fitTerrain(heightAt) {
    if (typeof heightAt !== "function") return 0;
    body.updateWorldMatrix(true, false);
    body.getWorldScale(worldScale);
    const scale = Math.max(0.000001, worldScale.y),
      solePadding = scale * 0.008;
    body.getWorldPosition(currentBodyPosition);
    body.getWorldQuaternion(currentBodyAttitude);
    const reset =
      !fittedOnce ||
      currentBodyAttitude.angleTo(lastBodyAttitude) > 0.55 ||
      currentBodyPosition.distanceToSquared(lastBodyPosition) >
        (scale * 0.4) ** 2;
    if (reset) metrics.resetCount++;
    lastBodyPosition.copy(currentBodyPosition);
    lastBodyAttitude.copy(currentBodyAttitude);
    fittedOnce = true;

    for (let i = 0; i < slopeSamples.length; i++) {
      world.copy(slopeSamples[i]).applyMatrix4(body.matrixWorld);
      slopeHeights[i] = heightAt(world.x, world.z);
    }
    const slopeX = (slopeHeights[1] - slopeHeights[0]) / (0.48 * scale),
      slopeZ = (slopeHeights[3] - slopeHeights[2]) / (0.38 * scale),
      steepness = Math.hypot(slopeX, slopeZ),
      limit = Math.tan(0.52),
      bounded = steepness > limit ? limit / steepness : 1;
    terrainNormal.set(-slopeX * bounded, 1, -slopeZ * bounded).normalize();
    terrainAttitude.setFromUnitVectors(UP, terrainNormal);
    // 只保留原步态极小的甲壳呼吸横滚，避免把上一次地形姿态累积回输入。
    if (Math.abs(shell.rotation.x) < 0.00001) lastGaitRoll = shell.rotation.z;
    gaitRoll.setFromAxisAngle(ROLL_AXIS, lastGaitRoll);
    shell.quaternion.copy(terrainAttitude).multiply(gaitRoll);
    shell.updateWorldMatrix(true, true);
    inverseShell.copy(shell.matrixWorld).invert();
    metrics.requiredLift = 0;
    metrics.maxFitError = 0;
    metrics.minSoleClearance = Infinity;
    metrics.maxSoleClearance = -Infinity;
    metrics.fittedFeet = 0;
    metrics.terrainTilt = Math.acos(terrainNormal.y);
    metrics.fitCount++;

    for (const point of supportPoints) {
      world.copy(point).applyMatrix4(shell.matrixWorld);
      metrics.requiredLift = Math.max(
        metrics.requiredLift,
        heightAt(world.x, world.z) + solePadding * 2 - world.y,
      );
    }

    for (const leg of legs) {
      leg.worldTarget.copy(leg.gaitTarget).applyMatrix4(shell.matrixWorld);
      if (reset || leg.gaitSwing || leg.wasSwinging)
        leg.stanceWorld.copy(leg.worldTarget);
      if (!leg.gaitSwing) {
        leg.worldTarget.x = leg.stanceWorld.x;
        leg.worldTarget.z = leg.stanceWorld.z;
      }
      let floor = heightAt(leg.worldTarget.x, leg.worldTarget.z);
      leg.worldTarget.y = floor + solePadding + leg.gaitLift * scale;
      leg.terrainTarget.copy(leg.worldTarget).applyMatrix4(inverseShell);
      const reach = leg.upperLength + leg.lowerLength - 0.0005;
      direction.copy(leg.terrainTarget).sub(leg.hip.position);
      // 过长的驻足随移动重新落在当前支撑圈，避免旧足点把腿拉直或拖进躯干。
      if (!leg.gaitSwing && direction.length() > reach * 0.96) {
        leg.worldTarget.copy(leg.gaitTarget).applyMatrix4(shell.matrixWorld);
        floor = heightAt(leg.worldTarget.x, leg.worldTarget.z);
        leg.worldTarget.y = floor + solePadding;
        leg.stanceWorld.copy(leg.worldTarget);
        leg.terrainTarget.copy(leg.worldTarget).applyMatrix4(inverseShell);
      }
      // 长杆到低处海床时收拢落足跨度，保留甲壳高度；不能只把足端卡在空中。
      leg.hip.getWorldPosition(hipWorld);
      for (let attempt = 0; attempt < 6; attempt++) {
        const dx = leg.worldTarget.x - hipWorld.x,
          dz = leg.worldTarget.z - hipWorld.z,
          dy = leg.worldTarget.y - hipWorld.y,
          span = Math.hypot(dx, dz),
          allowedSpan =
            Math.sqrt(Math.max(0, (reach * scale) ** 2 - dy ** 2)) * 0.995;
        if (span <= allowedSpan || span < 0.000001) break;
        const fraction = Math.max(0.18, allowedSpan / span);
        leg.worldTarget.x = hipWorld.x + dx * fraction;
        leg.worldTarget.z = hipWorld.z + dz * fraction;
        floor = heightAt(leg.worldTarget.x, leg.worldTarget.z);
        leg.worldTarget.y = floor + solePadding + leg.gaitLift * scale;
      }
      leg.terrainTarget.copy(leg.worldTarget).applyMatrix4(inverseShell);
      if (!leg.gaitSwing) leg.stanceWorld.copy(leg.worldTarget);
      direction.copy(leg.terrainTarget).sub(leg.hip.position);
      // 只对高于可达范围的海床建议抬升；低处悬差独立记录，不掩盖为成功拟合。
      const horizontal = Math.hypot(direction.x, direction.z),
        possibleRise = Math.sqrt(Math.max(0, reach ** 2 - horizontal ** 2));
      if (direction.y > possibleRise)
        metrics.requiredLift = Math.max(
          metrics.requiredLift,
          (direction.y - possibleRise) * scale,
        );
      solveLeg(leg, leg.terrainTarget);
      leg.wasSwinging = leg.gaitSwing;
      leg.sole.updateWorldMatrix(true, false);
      leg.sole.getWorldPosition(world);
      const clearance = world.y - heightAt(world.x, world.z) - solePadding;
      metrics.minSoleClearance = Math.min(metrics.minSoleClearance, clearance);
      metrics.maxSoleClearance = Math.max(metrics.maxSoleClearance, clearance);
      metrics.maxFitError = Math.max(
        metrics.maxFitError,
        leg.terrainFitError * scale,
      );
      if (leg.terrainFitError < 0.0001) metrics.fittedFeet++;
    }
    return metrics.requiredLift;
  }

  body.userData.fitKarkinosTerrain = fitTerrain;
  body.userData.karkinosFootAnchors = legs.map((leg) => leg.sole);
  body.userData.karkinosFootRestPositions = legs.map((leg) =>
    Object.freeze(leg.restSole.toArray()),
  );
  body.userData.karkinosGrounding = metrics;
  body.userData.karkinosGroundingContract = Object.freeze({
    samplerSpace: "world",
    callOrder: "animate-root-transform-fit-optional-root-lift-refit",
    maxTerrainTilt: 0.52,
    solePaddingAnatomyUnits: 0.008,
    rigidSegments: true,
    movesGameplayRoot: false,
  });
  return { solveLeg };
}
