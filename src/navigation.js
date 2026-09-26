/**
 * 无渲染依赖的海洋生物巡游导航。
 * 提前观察边界与海床，输出连续回转的单位方向，位置约束仍由游戏循环负责。
 */

import { WORLD } from "./world_config.js";

/**
 * 为巡游方向加入边界与栖息地转向，避免逐帧翻转朝向造成原地抖动。
 * @param {{x:number,y:number,z:number}} position 生物的当前世界坐标。
 * @param {{x:number,y:number,z:number}} direction 当前航向，不要求已归一化；调用者应保存返回航向。
 * @param {{length:number,speed:number,depthMin:number,depthMax:number}} species 生物参数。
 * @param {(x:number,z:number)=>number} seabedHeight 返回指定水平坐标的海床高度。
 * @returns {{x:number,y:number,z:number}} 新的单位方向，不修改任何输入。
 */
export function steerWithinHabitat(position, direction, species, seabedHeight) {
  const desired = normalize(direction, { x: 0, y: 0, z: -1 });
  const lookAhead = clamp(species.speed * 2.5 + species.length * 0.5, 25, 70);
  const predictedX = position.x + desired.x * lookAhead;
  const predictedZ = position.z + desired.z * lookAhead;
  let avoidanceX = 0;
  let avoidanceZ = 0;
  let urgency = 0;

  // 根据与边界的距离连续增加转向量，不重写巡游朝向或累加固定角度。
  function avoid(x, z, strength) {
    const weight = clamp(strength, 0, 1);
    avoidanceX += x * weight;
    avoidanceZ += z * weight;
    urgency = Math.max(urgency, weight);
  }

  if (position.x > WORLD.maxX - lookAhead) {
    avoid(-1, 0, 1 - (WORLD.maxX - position.x) / lookAhead);
  }
  if (position.x < WORLD.minX + lookAhead) {
    avoid(1, 0, 1 - (position.x - WORLD.minX) / lookAhead);
  }
  if (position.z > WORLD.maxZ - lookAhead) {
    avoid(0, -1, 1 - (WORLD.maxZ - position.z) / lookAhead);
  }
  if (position.z < WORLD.minZ + lookAhead) {
    avoid(0, 1, 1 - (position.z - WORLD.minZ) / lookAhead);
  }

  const margin = species.length * 0.28 + 2;
  const requiredDepth = species.depthMin + margin;
  const predictedSeabed = seabedHeight(predictedX, predictedZ);
  const currentSeabed = seabedHeight(position.x, position.z);
  if (predictedSeabed > -requiredDepth || currentSeabed > -requiredDepth) {
    // 海床梯度的反方向通往更深水域，可同时适应斜坡与横向海沟壁。
    const sample = 8;
    let deeperX =
      seabedHeight(position.x - sample, position.z) -
      seabedHeight(position.x + sample, position.z);
    let deeperZ =
      seabedHeight(position.x, position.z - sample) -
      seabedHeight(position.x, position.z + sample);
    const gradientLength = Math.hypot(deeperX, deeperZ);
    if (gradientLength > 0.001) {
      deeperX /= gradientLength;
      deeperZ /= gradientLength;
    } else {
      // 平坦且过浅的区域没有局部坡向，优先退往地图深海一侧。
      deeperX = 0;
      deeperZ = -1;
    }
    avoid(
      deeperX,
      deeperZ,
      (predictedSeabed + requiredDepth) / Math.max(10, lookAhead * 0.5),
    );
    if (currentSeabed > -requiredDepth) avoid(deeperX, deeperZ, 1);
  }

  let x = desired.x;
  let z = desired.z;
  const horizontalLength = Math.hypot(desired.x, desired.z);
  if (urgency > 0 && Math.hypot(avoidanceX, avoidanceZ) > 0.001) {
    const heading = Math.atan2(desired.z, desired.x);
    const safeHeading = Math.atan2(avoidanceZ, avoidanceX);
    const difference = wrapAngle(safeHeading - heading);
    const mix = urgency * urgency * (3 - 2 * urgency);
    const turned = heading + difference * mix;
    // 使用角度插值保持前进速度，避免相反方向相加得到零向量。
    const magnitude = Math.max(horizontalLength, 0.65);
    x = Math.cos(turned) * magnitude;
    z = Math.sin(turned) * magnitude;
  }

  const minimumY = Math.max(-species.depthMax, currentSeabed + margin);
  const maximumY = -species.depthMin;
  // 在可容纳自身的水域内提前减少向上/向下速度，保持正常栖息深度。
  const y =
    minimumY <= maximumY
      ? clamp(
          desired.y,
          (minimumY - position.y) / lookAhead,
          (maximumY - position.y) / lookAhead,
        )
      : 0;
  return normalize({ x, y, z }, { x: 0, y: 0, z: -1 });
}

/*********************************************
 * Private Helper Functions
 ********************************************/

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function normalize(vector, fallback) {
  const magnitude = Math.hypot(vector.x, vector.y, vector.z);
  if (!Number.isFinite(magnitude) || magnitude < 0.00001)
    return { ...fallback };
  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
    z: vector.z / magnitude,
  };
}
