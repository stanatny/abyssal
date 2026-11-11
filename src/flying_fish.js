import { WORLD } from "./world_config.js";

export const FLYING_FISH_RULES = Object.freeze({
  threatRadius: 22,
  emergencyRadius: 8,
  launchDepth: 18,
  horizontalSpeed: 16,
  launchSpeed: 7.2,
  gravity: 5.5,
  cooldown: 18,
  blockedRetry: 2,
  runupLimit: 3.2,
});

/**
 * 飞鱼沿真实水层蓄速、破水、惯性滑翔并落水；返回本帧是否接管普通游泳。
 * threat 兼容旧的位置向量，也可含 position/length/velocity。context 仅提供世界查询，
 * 不创建图形资源；开放海面使用 waterHeightAt/heightAt/bounds/castWorld。
 */
export function stepFlyingFish(entity, dt, now, threat, context = {}) {
  if (entity?.species?.kind !== "flying_fish" || !entity.mesh?.position)
    return false;
  if (entity.hiddenFor > 0) {
    resetFlyingFishFlight(entity);
    return false;
  }
  const point = entity.mesh.position;
  if (!finitePoint(point)) return false;
  if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(now))
    return Boolean(entity.flight);
  if (context.active === false) return Boolean(entity.flight);
  const mode = context.surfaceMode ?? "open";
  if (mode !== "open") {
    if (entity.flight) resetFlyingFishFlight(entity);
    return false;
  }
  if (!entity.flight) {
    if (!canLaunch(entity, now, threat, context)) return false;
    const source = threat.position ?? threat;
    let x = point.x - source.x,
      z = point.z - source.z;
    const size = Math.hypot(x, z);
    if (size > 0.1) {
      x /= size;
      z /= size;
    } else {
      const heading = entity.velocity;
      const length = Math.hypot(heading?.x ?? 0, heading?.z ?? 0);
      x = length > 0.1 ? heading.x / length : 0;
      z = length > 0.1 ? heading.z / length : -1;
    }
    entity.flight = {
      phase: "runup",
      age: 0,
      x,
      z,
      speed: Math.min(
        FLYING_FISH_RULES.horizontalSpeed,
        Math.max(0, entity.species.speed ?? 7),
      ),
      verticalSpeed: 0,
    };
    entity.flightReadyAt = now + FLYING_FISH_RULES.cooldown;
    entity.mesh.userData.setGliding?.(false);
  }
  const start = copyPoint(point);
  // 同一物理时间用有限子步推进，碰撞与海面穿越不会因掉帧而跨过整个阶段。
  const step = Math.min(dt, 0.12),
    count = Math.ceil(step / 0.02),
    h = step / count;
  for (let i = 0; i < count && entity.flight; i++) {
    const flight = entity.flight;
    flight.age += h;
    const previous = copyPoint(point),
      waterBefore = waterAt(context, point, now - step + i * h);
    if (flight.phase === "runup") {
      flight.speed = damp(
        flight.speed,
        FLYING_FISH_RULES.horizontalSpeed,
        5,
        h,
      );
      flight.verticalSpeed = damp(
        flight.verticalSpeed,
        FLYING_FISH_RULES.launchSpeed,
        7,
        h,
      );
    } else if (flight.phase === "glide") {
      flight.verticalSpeed -= FLYING_FISH_RULES.gravity * h;
      flight.speed *= Math.exp(-0.08 * h);
    } else {
      flight.verticalSpeed = damp(flight.verticalSpeed, -4, 5, h);
      flight.speed = damp(flight.speed, entity.species.speed ?? 7, 3, h);
    }
    const desired = {
      x: point.x + flight.x * flight.speed * h,
      y: point.y + flight.verticalSpeed * h,
      z: point.z + flight.z * flight.speed * h,
    };
    const blocked = moveSafely(entity, previous, desired, context, now, h);
    const waterAfter = waterAt(context, point, now);
    if (flight.phase === "runup") {
      if (previous.y < waterBefore && point.y >= waterAfter) {
        flight.phase = "glide";
        entity.mesh.userData.setGliding?.(true);
        surfaceEvent(entity, "exit", previous, point, waterBefore, waterAfter);
      } else if (blocked || flight.age >= FLYING_FISH_RULES.runupLimit) {
        // 未能起跳也要连续游回正常水层，不能把近水面的身体交回深度钳制后瞬移。
        flight.phase = "reentry";
        flight.verticalSpeed = Math.min(-2, flight.verticalSpeed);
        entity.flightReadyAt = now + FLYING_FISH_RULES.blockedRetry;
      }
    } else if (
      flight.phase === "glide" &&
      previous.y >= waterBefore &&
      point.y < waterAfter
    ) {
      flight.phase = "reentry";
      entity.mesh.userData.setGliding?.(false);
      surfaceEvent(entity, "reentry", previous, point, waterBefore, waterAfter);
    }
    if (flight.phase === "reentry") {
      const target = returnHeight(entity, point, context, now);
      if (target !== null && point.y <= target) {
        // 只截短本次向下位移；不从空中或远处传送回固定深度。
        if (previous.y >= target) point.y = target;
        finishFlight(entity);
      }
    }
  }
  const dx = point.x - start.x,
    dy = point.y - start.y,
    dz = point.z - start.z,
    moved = Math.hypot(dx, dy, dz);
  if (moved > 1e-9) entity.velocity.set(dx / moved, dy / moved, dz / moved);
  return true;
}

/** 主循环消费后清空，水花只在真实出水和落水交点各结算一次。 */
export function takeFlyingFishEvent(entity) {
  const event = entity.flightEvent ?? null;
  entity.flightEvent = null;
  return event;
}

/** 开局、退休、刷新及地图缓存复用时清除上次飞行与展鳍状态。 */
export function resetFlyingFishFlight(entity) {
  entity.flight = null;
  entity.flightReadyAt = 0;
  entity.flightEvent = null;
  entity.mesh?.userData?.setGliding?.(false);
}

function canLaunch(entity, now, threat, context) {
  const point = entity.mesh.position,
    source = threat?.position ?? threat,
    bounds = context.bounds ?? WORLD;
  if (
    // 普通游泳允许更靠近边界；此处不能启动一段连原地落水也会被飞行边界拒绝的轨迹。
    point.x < bounds.minX + 12 ||
    point.x > bounds.maxX - 12 ||
    point.z < bounds.minZ + 12 ||
    point.z > bounds.maxZ - 12 ||
    !finitePoint(source) ||
    now < (entity.flightReadyAt || 0) ||
    entity.disorientedUntil > now ||
    entity.mesh.userData.disoriented ||
    (Number.isFinite(threat?.length) &&
      threat.length <= (entity.species.length ?? 0.4))
  )
    return false;
  const water = waterAt(context, point, now),
    distance = Math.hypot(
      point.x - source.x,
      point.y - source.y,
      point.z - source.z,
    );
  if (
    !Number.isFinite(water) ||
    point.y >= water - 0.12 ||
    point.y < water - FLYING_FISH_RULES.launchDepth ||
    distance >= FLYING_FISH_RULES.threatRadius ||
    returnHeight(entity, point, context, now) === null ||
    cast(context, source, point, 0)
  )
    return false;
  // 近处保留紧急逃生；远处已背离的猎手不让鱼群反复无故起跳。
  if (
    distance > FLYING_FISH_RULES.emergencyRadius &&
    finitePoint(threat?.velocity)
  ) {
    const velocity = entity.velocity,
      fishSpeed = entity.species.speed ?? 7,
      closing =
        ((point.x - source.x) *
          (threat.velocity.x - (velocity?.x ?? 0) * fishSpeed) +
          (point.y - source.y) *
            (threat.velocity.y - (velocity?.y ?? 0) * fishSpeed) +
          (point.z - source.z) *
            (threat.velocity.z - (velocity?.z ?? 0) * fishSpeed)) /
        Math.max(distance, 0.001);
    if (closing <= 0.2) return false;
  }
  return true;
}

function moveSafely(entity, previous, desired, context, now, dt) {
  if (clearSegment(entity, previous, desired, context, now)) {
    entity.mesh.position.copy(desired);
    return false;
  }
  const point = entity.mesh.position,
    flight = entity.flight;
  let low = 0,
    high = 1;
  for (let i = 0; i < 8; i++) {
    const fraction = (low + high) / 2,
      trial = lerpPoint(previous, desired, fraction);
    if (clearSegment(entity, previous, trial, context, now)) low = fraction;
    else high = fraction;
  }
  point.copy(lerpPoint(previous, desired, Math.max(0, low - 0.001)));
  if (flight.phase !== "runup") {
    // 撞岸或船侧后先落回可用水柱；若在甲板上方，则沿边侧移，绝不直接穿过船体。
    flight.verticalSpeed = Math.min(-1.5, flight.verticalSpeed);
    flight.speed = Math.min(flight.speed, 6);
    const remaining = dt * (1 - low);
    const fall = {
      x: point.x,
      y: point.y + flight.verticalSpeed * remaining,
      z: point.z,
    };
    if (clearSegment(entity, point, fall, context, now)) point.copy(fall);
    else {
      for (const side of [-1, 1]) {
        const tangent = {
          x: point.x + flight.z * side * 4 * remaining,
          y: point.y,
          z: point.z - flight.x * side * 4 * remaining,
        };
        if (!clearSegment(entity, point, tangent, context, now)) continue;
        point.copy(tangent);
        break;
      }
    }
  }
  return true;
}

function clearSegment(entity, from, to, context, now) {
  const bounds = context.bounds ?? WORLD,
    radius = Math.max(0.08, (entity.species.length ?? 0.4) * 0.18);
  if (
    to.x < bounds.minX + 12 ||
    to.x > bounds.maxX - 12 ||
    to.z < bounds.minZ + 12 ||
    to.z > bounds.maxZ - 12 ||
    cast(context, from, to, radius)
  )
    return false;
  const distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z),
    samples = Math.max(1, Math.min(8, Math.ceil(distance / 0.25)));
  for (let i = 0; i <= samples; i++) {
    const point = lerpPoint(from, to, i / samples),
      floor = floorAt(context, point),
      water = waterAt(context, point, now);
    if (
      !Number.isFinite(water) ||
      point.y < floor + radius ||
      returnHeight(entity, point, context, now) === null
    )
      return false;
  }
  return true;
}

function returnHeight(entity, point, context, now) {
  const species = entity.species,
    floor =
      floorAt(context, point) +
      (species.groundClearance ?? (species.length ?? 0.4) * 0.28 + 2),
    water = waterAt(context, point, now),
    ceiling = Math.min(water - 1.2, -(species.depthMin ?? 2)),
    minimum = -(
      species.depthMax ??
      (context.bounds ?? WORLD).maxDepth ??
      WORLD.maxDepth
    );
  return floor <= ceiling && minimum <= ceiling ? ceiling : null;
}

function surfaceEvent(entity, kind, from, to, before, after) {
  const a = from.y - before,
    b = to.y - after,
    fraction = Math.max(0, Math.min(1, a / (a - b))),
    position = lerpPoint(from, to, fraction);
  position.y = before + (after - before) * fraction;
  entity.flightEvent = { kind, position };
}

function finishFlight(entity) {
  entity.flight = null;
  entity.mesh.userData.setGliding?.(false);
}
function waterAt(context, point, now) {
  return context.waterHeightAt?.(point.x, point.z, now) ?? WORLD.surfaceY;
}
function floorAt(context, point) {
  return context.heightAt?.(point.x, point.z) ?? -Infinity;
}
function cast(context, from, to, radius) {
  return (
    (context.castWorld ?? context.blockedBetween)?.(from, to, radius) ?? null
  );
}
function finitePoint(point) {
  return point && [point.x, point.y, point.z].every(Number.isFinite);
}
function copyPoint(point) {
  return { x: point.x, y: point.y, z: point.z };
}
function lerpPoint(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}
function damp(value, target, rate, dt) {
  return target + (value - target) * Math.exp(-rate * dt);
}
