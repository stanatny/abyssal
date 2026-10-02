/** 水面运动的纯规则，不依赖渲染器；距离使用世界单位，时间使用秒。 */

/** 创建独立破水状态；无参数，返回可原地更新的状态。 */
export function createSurfaceState() {
  return {
    airborne: false,
    velocityX: 0,
    velocityY: 0,
    velocityZ: 0,
    chargeTime: 0,
    chargeDistance: 0,
    divingRequired: true,
    reentryRemaining: 0,
    reentryLockRemaining: 0,
    posePitch: null,
    poseYaw: null,
  };
}

/** 根据体长和海平面计算身体开始破水的中心高度；返回世界 Y 坐标。 */
export function getSurfaceWaterline(length, surfaceY = 4) {
  return surfaceY - Math.max(1, finite(length, 6)) * 0.15;
}

/**
 * 推进破水蓄势、空中惯性与入水过渡，原地更新 state。
 * previousPosition 是本帧游泳位移之前的位置，position 是游泳后的候选位置。
 * 空中忽略候选位移、boosting 和 forward，返回自主积分后的 position。
 * 返回 airborne、速度、姿态、蓄势比例，以及单帧 launched / landed 事件。
 */
export function stepSurface(
  state,
  dt,
  {
    previousPosition,
    position,
    forward,
    speed,
    boosting,
    length = 6,
    surfaceY = 4,
    previousSurfaceY = surfaceY,
  },
) {
  const elapsed = Math.max(0, finite(dt, 0));
  const previous = point(previousPosition || position);
  const proposed = point(position || previousPosition);
  const heading = point(forward || { x: 0, y: 0, z: -1 });
  const swimSpeed = Math.max(0, finite(speed, 0));
  const waterline = getSurfaceWaterline(length, surfaceY);
  const previousWaterline = getSurfaceWaterline(length, previousSurfaceY);
  const diveDepth = Math.max(SURFACE_RULES.rearmDepth, length * 0.35);
  let launched = false;
  let landed = false;
  let result = proposed;
  if (elapsed === 0) return snapshot(state, result, launched, landed);

  if (state.airborne) {
    const flight = integrateFlight(state, previous, elapsed, waterline);
    result = flight.position;
    landed = flight.landed;
    if (landed) {
      beginReentry(state);
      if (flight.remaining > 0) {
        result.y = integrateReentry(
          state,
          result.y,
          flight.remaining,
          heading.y * swimSpeed,
        );
      }
    }
    updatePose(state, heading, swimSpeed);
    return snapshot(state, result, launched, landed);
  }

  if (state.reentryRemaining > 0) {
    // 落水先保留向下惯性，不能用上仰输入或再按冲刺立即反弹。
    result.y = Math.min(
      waterline,
      integrateReentry(state, previous.y, elapsed, heading.y * swimSpeed),
    );
    state.chargeTime = 0;
    state.chargeDistance = 0;
    if (result.y <= waterline - diveDepth) state.divingRequired = false;
    if (result.y >= waterline - 0.01) state.divingRequired = true;
    updatePose(state, heading, swimSpeed);
    return snapshot(state, result, launched, landed);
  }

  state.posePitch = null;
  state.poseYaw = null;
  // 只输送贴近水面的身体，深潜输入保留；波谷下降也会带走浮力支撑。
  const floatBand = Math.max(0.3, length * 0.035);
  const floating =
    previous.y >= previousWaterline - floatBand && heading.y >= -0.001;
  // 贴水浮游维持吃水深度，避免小误差在连续上涨波峰中累积成失去支撑。
  if (floating && waterline !== previousWaterline)
    proposed.y += waterline - previous.y;
  if (previous.y <= previousWaterline - diveDepth) state.divingRequired = false;
  const crossed =
    previous.y < previousWaterline - 0.001 && proposed.y >= waterline;
  const underwaterFraction = crossed
    ? clamp((waterline - previous.y) / (proposed.y - previous.y), 0, 1)
    : proposed.y < waterline
      ? 1
      : 0;
  if (
    boosting &&
    !state.divingRequired &&
    previous.y < previousWaterline - 0.001
  ) {
    const underwaterDistance =
      Math.hypot(
        proposed.x - previous.x,
        proposed.y - previous.y,
        proposed.z - previous.z,
      ) * underwaterFraction;
    // 卡在边界不算持续游动，也不允许一帧位置跳变替代实际蓄势时间。
    if (underwaterDistance > 0.0001) {
      state.chargeTime += Math.min(
        elapsed * underwaterFraction,
        underwaterDistance / Math.max(1, swimSpeed),
      );
      state.chargeDistance += underwaterDistance;
    } else {
      state.chargeTime = 0;
      state.chargeDistance = 0;
    }
  } else {
    state.chargeTime = 0;
    state.chargeDistance = 0;
  }

  const charged =
    state.chargeTime + 1e-8 >= SURFACE_RULES.chargeSeconds &&
    state.chargeDistance + 1e-8 >= SURFACE_RULES.chargeDistance;
  if (
    crossed &&
    charged &&
    boosting &&
    swimSpeed >= SURFACE_RULES.minimumLaunchSpeed &&
    heading.y >= SURFACE_RULES.minimumUpwardDirection
  ) {
    launched = true;
    state.airborne = true;
    state.velocityX = heading.x * swimSpeed;
    state.velocityY = heading.y * swimSpeed;
    state.velocityZ = heading.z * swimSpeed;
    state.divingRequired = true;
    state.chargeTime = 0;
    state.chargeDistance = 0;
    result = {
      x: previous.x + (proposed.x - previous.x) * underwaterFraction,
      y: waterline,
      z: previous.z + (proposed.z - previous.z) * underwaterFraction,
    };
    const remaining = elapsed * (1 - underwaterFraction);
    if (remaining > 0) {
      const flight = integrateFlight(state, result, remaining, waterline);
      result = flight.position;
      landed = flight.landed;
      if (landed) {
        beginReentry(state);
        if (flight.remaining > 0)
          result.y = integrateReentry(
            state,
            result.y,
            flight.remaining,
            heading.y * swimSpeed,
          );
      }
    }
    updatePose(state, heading, swimSpeed);
  } else {
    result.y = Math.min(proposed.y, waterline);
    state.velocityY = heading.y * swimSpeed;
    if (proposed.y >= waterline) {
      // 抵达水面却未满足蓄势条件，就必须重新下潜，不能在水面等待充能。
      state.chargeTime = 0;
      state.chargeDistance = 0;
      state.divingRequired = true;
    }
  }
  return snapshot(state, result, launched, landed);
}

/** 当前破水参数；连续水下冲刺和实际移动距离必须同时达标。 */
export const SURFACE_RULES = Object.freeze({
  chargeSeconds: 1.2,
  chargeDistance: 26,
  rearmDepth: 8,
  minimumLaunchSpeed: 24,
  minimumUpwardDirection: 0.32,
  gravity: 16,
  airDrag: 0.12,
  reentrySeconds: 0.95,
  reentryLockSeconds: 0.3,
});

/*********************************************
 * 内部积分工具
 ********************************************/

function integrateFlight(state, origin, elapsed, waterline) {
  const height = Math.max(0, origin.y - waterline);
  const gravity = SURFACE_RULES.gravity;
  const flightLeft =
    (state.velocityY + Math.sqrt(state.velocityY ** 2 + 2 * gravity * height)) /
    gravity;
  const flightTime = Math.min(elapsed, Math.max(0, flightLeft));
  const attenuation = Math.exp(-SURFACE_RULES.airDrag * flightTime);
  const horizontalTime = (1 - attenuation) / SURFACE_RULES.airDrag;
  const position = {
    x: origin.x + state.velocityX * horizontalTime,
    y:
      origin.y + state.velocityY * flightTime - gravity * flightTime ** 2 * 0.5,
    z: origin.z + state.velocityZ * horizontalTime,
  };
  state.velocityX *= attenuation;
  state.velocityZ *= attenuation;
  state.velocityY -= gravity * flightTime;
  const landed = flightLeft <= elapsed + 1e-8;
  if (landed) {
    position.y = waterline;
    state.airborne = false;
  }
  return { position, landed, remaining: elapsed - flightTime };
}

function beginReentry(state) {
  state.reentryRemaining = SURFACE_RULES.reentrySeconds;
  state.reentryLockRemaining = SURFACE_RULES.reentryLockSeconds;
  state.divingRequired = true;
  state.chargeTime = 0;
  state.chargeDistance = 0;
}

function integrateReentry(state, y, elapsed, swimVerticalSpeed) {
  let remaining = elapsed;
  const locked = Math.min(remaining, state.reentryLockRemaining);
  if (locked > 0) {
    y += approachVelocity(state, Math.min(-6, swimVerticalSpeed), 1.2, locked);
    remaining -= locked;
    state.reentryLockRemaining -= locked;
    state.reentryRemaining -= locked;
  }
  const recovery = Math.min(remaining, Math.max(0, state.reentryRemaining));
  if (recovery > 0) {
    y += approachVelocity(state, swimVerticalSpeed, 4, recovery);
    remaining -= recovery;
    state.reentryRemaining -= recovery;
  }
  if (remaining > 0) {
    y += swimVerticalSpeed * remaining;
    state.velocityY = swimVerticalSpeed;
  }
  state.reentryRemaining = Math.max(0, state.reentryRemaining);
  return y;
}

function approachVelocity(state, target, rate, elapsed) {
  const decay = Math.exp(-rate * elapsed);
  const distance =
    target * elapsed + ((state.velocityY - target) * (1 - decay)) / rate;
  state.velocityY = target + (state.velocityY - target) * decay;
  return distance;
}

function updatePose(state, heading, speed) {
  if (!state.airborne && state.reentryRemaining <= 0) {
    state.posePitch = null;
    state.poseYaw = null;
    return;
  }
  const vx = state.airborne ? state.velocityX : heading.x * speed;
  const vz = state.airborne ? state.velocityZ : heading.z * speed;
  state.posePitch = Math.atan2(
    state.velocityY,
    Math.max(1, Math.hypot(vx, vz)),
  );
  state.poseYaw = Math.atan2(-vx, -vz);
}

function snapshot(state, position, launched, landed) {
  return {
    position,
    airborne: state.airborne,
    velocityY: state.velocityY,
    verticalSpeed: state.velocityY,
    horizontalSpeed: Math.hypot(state.velocityX, state.velocityZ),
    posePitch: state.posePitch,
    poseYaw: state.poseYaw,
    charge: clamp(
      Math.min(
        state.chargeTime / SURFACE_RULES.chargeSeconds,
        state.chargeDistance / SURFACE_RULES.chargeDistance,
      ),
      0,
      1,
    ),
    divingRequired: state.divingRequired,
    reentering: state.reentryRemaining > 0,
    launched,
    landed,
  };
}

function finite(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function point(value) {
  return {
    x: finite(value?.x, 0),
    y: finite(value?.y, 0),
    z: finite(value?.z, 0),
  };
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
