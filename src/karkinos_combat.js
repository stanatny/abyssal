/** 仅巨蟹读取此策略；预警、可见水压和真实判定共享同一组范围。 */
const claw = Object.freeze({
  range: 96,
  halfAngle: 0.66,
  spread: 0.62,
  height: 20,
  innerRange: 32,
  innerHeight: 26,
  innerHalfAngle: 1.82,
  releaseTime: 0.72,
  pressureStart: 26,
  speed: 150,
  thickness: 8,
  closeDuration: 0.4,
});
const fault = Object.freeze({
  range: 240,
  speed: 110,
  spread: 0.48,
  interval: 0.28,
  radius: 12,
  thickness: 6,
  height: 22,
  floorOffset: 22,
  lanes: 3,
  sampleStep: 8,
});
export const KARKINOS_COMBAT = Object.freeze({
  engageRange: 200,
  wakeRange: 260,
  territoryRadius: 280,
  abilityEngageRanges: Object.freeze({ fault: 200, claw: 90 }),
  abilityCycle: Object.freeze(["fault", "claw"]),
  abilityTimings: Object.freeze({
    claw: Object.freeze({ windup: 2.4, attack: 1.6, recover: 4.5 }),
    fault: Object.freeze({ windup: 2.6, attack: 3, recover: 4.5 }),
  }),
  claw,
  fault,
});
const finitePoint = (p) => p && [p.x, p.y, p.z].every(Number.isFinite);
const copy = (p) => ({ x: p.x, y: p.y, z: p.z });

/** 实体合钳后发出有限水压前沿，不把钳肢直接拉长到远处。 */
export function karkinosClawSweep(timer, dt = 0) {
  const age = timer - claw.releaseTime;
  const previousAge = age - Math.max(0, dt);
  const front = claw.pressureStart + age * claw.speed;
  const previous = claw.pressureStart + Math.max(0, previousAge) * claw.speed;
  return {
    front,
    near: Math.max(claw.pressureStart, previous - claw.thickness),
    far: Math.min(claw.range, front + claw.thickness),
    visibleNear: Math.max(claw.pressureStart, front - claw.thickness),
    visibleFar: Math.min(claw.range, front + claw.thickness),
    active:
      Number.isFinite(timer) &&
      age >= 0 &&
      previous <= claw.range + claw.thickness,
    visible:
      Number.isFinite(timer) &&
      age >= 0 &&
      front <= claw.range + claw.thickness,
    innerActive:
      Number.isFinite(timer) && age >= 0 && previousAge <= claw.closeDuration,
  };
}

/** 不传时间时查询完整预警区；传入时间后只扫掠真实水压前沿。 */
export function inKarkinosClaws(
  point,
  origin,
  forward,
  padding = 0,
  timer = null,
  dt = 0,
) {
  if (![point, origin, forward].every(finitePoint)) return false;
  const x = point.x - origin.x,
    z = point.z - origin.z,
    distance = Math.hypot(x, z),
    height = Math.abs(point.y - origin.y);
  if (distance > claw.range + padding || height > claw.innerHeight + padding)
    return false;
  const angle = Math.atan2(
    x * -forward.z + z * forward.x,
    x * forward.x + z * forward.z,
  );
  const timed = timer !== null && timer !== undefined;
  const wave = timed ? karkinosClawSweep(timer, dt) : null;
  if (
    distance <= claw.innerRange + padding &&
    Math.abs(angle) <= claw.innerHalfAngle &&
    (!timed || wave.innerActive)
  )
    return true;
  if (height > claw.height + padding || (timed && !wave.active)) return false;
  if (
    timed &&
    (distance < wave.near - padding || distance > wave.far + padding)
  )
    return false;
  return [-1, 1].some(
    (side) =>
      Math.abs(angle - side * claw.spread) <
      claw.halfAngle +
        Math.asin(Math.min(0.4, padding / Math.max(1, distance))),
  );
}

export function karkinosFaultDirection(forward, lane, out = {}) {
  const angle = Math.atan2(forward.x, -forward.z) + (lane - 1) * fault.spread;
  out.x = Math.sin(angle);
  out.z = -Math.cos(angle);
  return out;
}
export function karkinosFaultPoint(
  origin,
  direction,
  distance,
  heightAt,
  out = {},
) {
  out.x = origin.x + direction.x * distance;
  out.z = origin.z + direction.z * distance;
  out.y = heightAt(out.x, out.z) + fault.floorOffset;
  return out;
}

/** 沿真实海床追踪波路，以波峰的有限宽度裁切实体遮挡。 */
export function buildKarkinosFaultField(
  origin,
  forward,
  heightAt,
  blocked = () => false,
) {
  const lanes = [];
  for (let lane = 0; lane < fault.lanes; lane++) {
    const direction = karkinosFaultDirection(forward, lane);
    const points = [
      { ...karkinosFaultPoint(origin, direction, 0, heightAt), distance: 0 },
    ];
    let reach = fault.range;
    for (
      let distance = fault.sampleStep;
      distance <= fault.range;
      distance += fault.sampleStep
    ) {
      const previous = points.at(-1);
      const next = karkinosFaultPoint(origin, direction, distance, heightAt);
      if (blocked(previous, next, fault.radius)) {
        let lo = 0,
          hi = 1;
        for (let step = 0; step < 12; step++) {
          const t = (lo + hi) / 2;
          const p = {
            x: previous.x + (next.x - previous.x) * t,
            y: previous.y + (next.y - previous.y) * t,
            z: previous.z + (next.z - previous.z) * t,
          };
          if (blocked(previous, p, fault.radius)) hi = t;
          else lo = t;
        }
        reach = previous.distance + (distance - previous.distance) * lo;
        points.push({
          ...karkinosFaultPoint(origin, direction, reach, heightAt),
          distance: reach,
        });
        break;
      }
      points.push({ ...next, distance });
    }
    lanes.push({ ...direction, reach, points });
  }
  return {
    origin: copy(origin),
    forward: copy(forward),
    heightAt,
    blocked,
    lanes,
  };
}

/** 海床不变且起点朝向锁定时复用路径，避免攻击阶段反复查询场景。 */
export function updateKarkinosFaultField(
  previous,
  origin,
  forward,
  heightAt,
  blocked,
) {
  if (
    previous &&
    previous.heightAt === heightAt &&
    previous.blocked === blocked &&
    ["x", "y", "z"].every(
      (key) =>
        previous.origin[key] === origin[key] &&
        previous.forward[key] === forward[key],
    )
  )
    return previous;
  return buildKarkinosFaultField(origin, forward, heightAt, blocked);
}

export function karkinosFaultSweep(timer, dt, lane, reach = fault.range) {
  const age = timer - lane * fault.interval;
  const previous = Math.max(0, (age - Math.max(0, dt)) * fault.speed);
  const front = Math.min(reach, Math.max(0, age) * fault.speed);
  return {
    age,
    front,
    previous,
    near: Math.max(0, previous - fault.thickness),
    far: Math.min(reach + fault.thickness, front + fault.thickness),
    visible: age >= 0 && age * fault.speed <= reach + fault.thickness,
    active: age >= 0 && previous <= reach + fault.thickness,
  };
}

/** 三条分开的近底宽浪；高水层、背后与真实遮挡保留回避空间。 */
export function inKarkinosFault(
  point,
  origin,
  forward,
  timer,
  dt,
  heightAt,
  padding = 0,
  field = null,
) {
  if (![point, origin, forward].every(finitePoint) || !Number.isFinite(timer))
    return false;
  const floor = heightAt(point.x, point.z);
  if (
    !Number.isFinite(floor) ||
    !Number.isFinite(padding) ||
    padding < 0 ||
    Math.abs(point.y - floor - fault.floorOffset) > fault.height + padding
  )
    return false;
  const x = point.x - origin.x,
    z = point.z - origin.z;
  for (let lane = 0; lane < fault.lanes; lane++) {
    const direction =
      field?.lanes[lane] ?? karkinosFaultDirection(forward, lane);
    const sweep = karkinosFaultSweep(
      timer,
      dt,
      lane,
      direction.reach ?? fault.range,
    );
    if (!sweep.active) continue;
    const axial = x * direction.x + z * direction.z;
    const side = x * -direction.z + z * direction.x;
    const along =
      axial -
      Math.max(
        Math.min(direction.reach ?? fault.range, sweep.previous),
        Math.min(sweep.front, axial),
      );
    if (
      axial >= 0 &&
      (side / (fault.radius + padding)) ** 2 +
        (along / (fault.thickness + padding)) ** 2 <=
        1
    )
      return true;
  }
  return false;
}
