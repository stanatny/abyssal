/**
 * 轻量连续碰撞：球、定向盒、椭球、胶囊与鱼身多球的扫掠、滑动和脱困。
 * 数据仅含数值，不依赖渲染器；场景销毁时不需要额外释放 GPU 资源。
 */

const EPSILON = 1e-7;
const SKIN = 0.025;
const IDENTITY = { x: 0, y: 0, z: 0, w: 1 };

/**
 * 推荐鱼身碰撞半径，保留侧鳍和尾鳍的活动余量。
 * @param {number} length 鱼的世界长度。
 * @returns {number} 躯干半径。
 */
export function bodyRadius(length) {
  return Math.max(0.65, length * 0.13);
}

/**
 * 连续移动并沿障碍表面滑动；成长导致初始重叠时寻找邻近可容纳位置。
 * @param {object} previousPosition 移动前的中心坐标。
 * @param {object} desiredPosition 本帧希望到达的中心坐标。
 * @param {object} options colliders为数组或保持原序的候选查询函数；其余为radius、forward、length和中心floorHeight/bounds。
 * @returns {object} position、contacts、blocked、recovered、stuck；不修改输入。
 */
export function resolveMotion(previousPosition, desiredPosition, options = {}) {
  const { colliders = [], radius = 0, floorHeight, bounds } = options;
  const offsets = bodyOffsets(options);
  const contacts = [];
  const constrain = (point) => constrainPosition(point, floorHeight, bounds);
  const originalDelta = sub(desiredPosition, previousPosition);
  let position = constrain(previousPosition);
  let recovery = recover(position, colliders, radius, offsets, constrain);
  position = recovery.position;
  contacts.push(...recovery.contacts);
  let remaining = sub(constrain(add(position, originalDelta)), position);
  let blocked = recovery.contacts.length > 0;

  // 连续扫掠不依赖帧率；一次高速位移也不能跨过薄甲板或岩拱。
  for (
    let iteration = 0;
    iteration < 7 && magnitude(remaining) > EPSILON;
    iteration++
  ) {
    const target = add(position, remaining);
    const hit = sweepBody(position, target, colliders, radius, offsets);
    if (!hit) {
      position = target;
      break;
    }
    blocked = true;
    contacts.push(hit);
    const travel = Math.max(0, hit.time - SKIN / magnitude(remaining));
    position = constrain(add(position, scale(remaining, travel)));
    remaining = scale(remaining, 1 - hit.time);
    // 去除法向速度，保留切向速度；角落同时受多个接触面的约束。
    for (const contact of contacts) {
      const inward = dot(remaining, contact.normal);
      if (inward < 0) remaining = sub(remaining, scale(contact.normal, inward));
    }
    remaining = sub(constrain(add(position, remaining)), position);
  }

  const finalRecovery = recover(
    constrain(position),
    colliders,
    radius,
    offsets,
    constrain,
  );
  contacts.push(...finalRecovery.contacts);
  return {
    position: finalRecovery.position,
    contacts,
    blocked: blocked || finalRecovery.contacts.length > 0,
    recovered: recovery.moved || finalRecovery.moved,
    stuck: finalRecovery.stuck,
  };
}

/**
 * 对单球作线段扫掠，供相机缩臂或 NPC 视线遮挡复用。
 * @returns {object|null} 首次命中的 time（0..1）、distance、point、normal、collider。
 */
export function castSegment(start, end, colliders, radius = 0) {
  const hit = sweepBody(start, end, colliders, radius, [{ x: 0, y: 0, z: 0 }]);
  if (!hit) return null;
  return {
    ...hit,
    distance: distance(start, end) * hit.time,
    point: add(start, scale(sub(end, start), hit.time)),
  };
}

/** 判断线段是否遮挡，兼容旧 {x,y,z,radius} 球形 obstacles。 */
export function segmentBlocked(start, end, colliders, radius = 0) {
  return castSegment(start, end, colliders, radius) !== null;
}

/** 判断鱼身是否与实体重叠，用于生成点检查及回归测试。 */
export function isPositionBlocked(position, options = {}) {
  return (
    overlaps(
      position,
      options.colliders || [],
      options.radius || 0,
      bodyOffsets(options),
    ) !== null
  );
}

/*********************************************
 * 鱼身、约束与恢复
 ********************************************/

function bodyOffsets({ radius = 0, forward, length = 0 }) {
  const direction = normalize(forward || { x: 0, y: 0, z: -1 });
  const extent = Math.max(0, length * 0.42 - radius);
  if (extent < EPSILON) return [{ x: 0, y: 0, z: 0 }];
  // 根据半径补足球数，细长鱼身也不会在相邻碰撞球之间出现穿透缝隙。
  const count = Math.max(
    4,
    Math.min(12, Math.ceil((extent * 2) / Math.max(radius * 1.3, 0.5))),
  );
  return Array.from({ length: count + 1 }, (_, index) =>
    scale(direction, -extent + (extent * 2 * index) / count),
  );
}

function constrainPosition(point, floorHeight, bounds) {
  const result = { ...point };
  if (bounds) {
    result.x = clamp(
      result.x,
      bounds.minX ?? -Infinity,
      bounds.maxX ?? Infinity,
    );
    result.z = clamp(
      result.z,
      bounds.minZ ?? -Infinity,
      bounds.maxZ ?? Infinity,
    );
    result.y = clamp(
      result.y,
      bounds.minY ?? -Infinity,
      bounds.maxY ?? Infinity,
    );
  }
  if (floorHeight) {
    // 地形回调已经包含角色中心余量；不要在这里重复加半径或体长。
    const floor = floorHeight(result.x, result.z);
    result.y = Math.max(result.y, Math.min(floor, bounds?.maxY ?? Infinity));
  }
  return result;
}

function recover(start, colliders, radius, offsets, constrain) {
  let point = start;
  let moved = false;
  const contacts = [];
  for (let iteration = 0; iteration < 16; iteration++) {
    const overlap = overlaps(point, colliders, radius, offsets);
    if (!overlap) return { position: point, moved, contacts, stuck: false };
    contacts.push({
      collider: overlap.collider,
      normal: overlap.normal,
      time: 0,
    });
    const next = constrain(
      add(point, scale(overlap.normal, overlap.depth + SKIN)),
    );
    moved ||= distance(next, point) > EPSILON;
    if (distance(next, point) < EPSILON) break;
    point = next;
  }
  if (!overlaps(point, colliders, radius, offsets))
    return { position: point, moved, contacts, stuck: false };

  // 长大后夹在礁石之间时，局部投影可能来回振荡；仅此时搜索最近安全空隙。
  // 以原位置为中心逐圈扩展，保留海床与边界约束，避免被推出世界或地下。
  const step = Math.max(1, radius * 0.7);
  const limit = Math.max(24, radius * 10 + magnitude(offsets[0]) * 2);
  const directions = [];
  for (let ring = 0; ring < 3; ring++) {
    const elevation = [0, 0.65, -0.65][ring];
    for (let index = 0; index < 16; index++) {
      const angle = (index * Math.PI * 2) / 16;
      directions.push(
        normalize({ x: Math.cos(angle), y: elevation, z: Math.sin(angle) }),
      );
    }
  }
  directions.push({ x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 });
  for (let reach = step; reach <= limit; reach += step) {
    let best = null;
    let bestDistance = Infinity;
    for (const direction of directions) {
      const candidate = constrain(add(start, scale(direction, reach)));
      const candidateDistance = distance(candidate, start);
      if (
        candidateDistance >= bestDistance ||
        overlaps(candidate, colliders, radius, offsets)
      )
        continue;
      best = candidate;
      bestDistance = candidateDistance;
    }
    if (best) return { position: best, moved: true, contacts, stuck: false };
  }
  // 完全封闭且比鱼身更小的容器没有物理解；向调用者明确报告，不制造 NaN。
  return { position: point, moved, contacts, stuck: true };
}

function overlaps(position, colliders, radius, offsets) {
  let deepest = null;
  for (const collider of queryCollisionCandidates(
    colliders,
    position,
    position,
    radius,
    offsets,
  )) {
    const reach = colliderReach(collider, radius) + magnitude(offsets[0]);
    if (distance(position, center(collider)) > reach) continue;
    for (const offset of offsets) {
      const overlap = penetration(add(position, offset), collider, radius);
      if (overlap && (!deepest || overlap.depth > deepest.depth))
        deepest = { ...overlap, collider };
    }
  }
  return deepest;
}

function sweepBody(start, end, colliders, radius, offsets) {
  let earliest = null;
  for (const collider of queryCollisionCandidates(
    colliders,
    start,
    end,
    radius,
    offsets,
  )) {
    const reach = colliderReach(collider, radius) + magnitude(offsets[0]);
    if (distanceToSegment(center(collider), start, end) > reach) continue;
    for (const offset of offsets) {
      const hit = sweep(add(start, offset), add(end, offset), collider, radius);
      if (hit && (!earliest || hit.time < earliest.time))
        earliest = { ...hit, collider };
    }
  }
  return earliest;
}

// 每次滑动、地形投影和脱困均按实际位置查询；不能复用最初线段的候选集合。
function queryCollisionCandidates(colliders, start, end, radius, offsets) {
  return typeof colliders === "function"
    ? colliders(start, end, { radius, padding: magnitude(offsets[0]) })
    : colliders;
}

/*********************************************
 * 形状求交
 ********************************************/

function sweep(start, end, collider, radius) {
  const delta = sub(end, start);
  const inside = penetration(start, collider, radius);
  if (inside) return { time: 0, normal: inside.normal };
  if (collider.type === "box") {
    const local = toLocal(sub(start, collider), collider.rotation);
    const direction = toLocal(delta, collider.rotation);
    const half = addScalar(collider.halfSize, radius);
    let enter = -Infinity;
    let leave = Infinity;
    let normal = null;
    for (const axis of ["x", "y", "z"]) {
      if (Math.abs(direction[axis]) < EPSILON) {
        if (Math.abs(local[axis]) > half[axis]) return null;
        continue;
      }
      const first = (-half[axis] - local[axis]) / direction[axis];
      const second = (half[axis] - local[axis]) / direction[axis];
      const near = Math.min(first, second);
      leave = Math.min(leave, Math.max(first, second));
      if (near > enter) {
        enter = near;
        normal = { x: 0, y: 0, z: 0 };
        normal[axis] = -Math.sign(direction[axis]);
      }
      if (enter > leave) return null;
    }
    if (enter < -EPSILON || enter > 1 || !normal) return null;
    return {
      time: Math.max(0, enter),
      normal: rotate(normal, collider.rotation),
    };
  }
  if (collider.type === "ellipsoid") {
    const axes = expandedAxes(collider.axes, radius);
    const local = toLocal(sub(start, collider), collider.rotation);
    const direction = toLocal(delta, collider.rotation);
    const time = sphereTime(divide(local, axes), divide(direction, axes), 1);
    if (time === null) return null;
    const hit = add(local, scale(direction, time));
    const normal = normalize({
      x: hit.x / axes.x ** 2,
      y: hit.y / axes.y ** 2,
      z: hit.z / axes.z ** 2,
    });
    return { time, normal: rotate(normal, collider.rotation) };
  }
  if (collider.type === "capsule")
    return capsuleSweep(
      start,
      delta,
      collider.a,
      collider.b,
      collider.radius + radius,
    );
  const time = sphereTime(
    sub(start, collider),
    delta,
    collider.radius + radius,
  );
  return time === null
    ? null
    : {
        time,
        normal: normalize(sub(add(start, scale(delta, time)), collider)),
      };
}

function penetration(point, collider, radius) {
  if (collider.type === "box") {
    const local = toLocal(sub(point, collider), collider.rotation);
    const half = addScalar(collider.halfSize, radius);
    let depth = Infinity;
    let normal = null;
    for (const axis of ["x", "y", "z"]) {
      const amount = half[axis] - Math.abs(local[axis]);
      if (amount <= EPSILON) return null;
      if (amount < depth) {
        depth = amount;
        normal = { x: 0, y: 0, z: 0 };
        normal[axis] = local[axis] < 0 ? -1 : 1;
      }
    }
    return { depth, normal: rotate(normal, collider.rotation) };
  }
  if (collider.type === "ellipsoid") {
    const axes = expandedAxes(collider.axes, radius);
    const local = toLocal(sub(point, collider), collider.rotation);
    const scaled = divide(local, axes);
    if (dot(scaled, scaled) >= 1 - EPSILON) return null;
    let normal = normalize({
      x: local.x / axes.x ** 2,
      y: local.y / axes.y ** 2,
      z: local.z / axes.z ** 2,
    });
    if (magnitude(local) < EPSILON) {
      const smallest =
        axes.x < axes.y && axes.x < axes.z ? "x" : axes.y < axes.z ? "y" : "z";
      normal = { x: 0, y: 0, z: 0 };
      normal[smallest] = 1;
    }
    const direction = divide(normal, axes);
    const a = dot(direction, direction);
    const b = dot(scaled, direction);
    const depth = (-b + Math.sqrt(b * b + a * (1 - dot(scaled, scaled)))) / a;
    return { depth, normal: rotate(normal, collider.rotation) };
  }
  const origin =
    collider.type === "capsule"
      ? closestPoint(point, collider.a, collider.b)
      : collider;
  const displacement = sub(point, origin);
  const depth = collider.radius + radius - magnitude(displacement);
  if (depth <= EPSILON) return null;
  return { depth, normal: normalize(displacement) };
}

function sphereTime(origin, delta, radius) {
  const a = dot(delta, delta);
  if (a < EPSILON) return null;
  const b = dot(origin, delta);
  const c = dot(origin, origin) - radius * radius;
  const discriminant = b * b - a * c;
  if (discriminant < 0 || b >= 0) return null;
  const time = (-b - Math.sqrt(discriminant)) / a;
  return time >= -EPSILON && time <= 1 ? Math.max(0, time) : null;
}

function capsuleSweep(start, delta, a, b, radius) {
  const segment = sub(b, a);
  const relative = sub(start, a);
  const segmentLength2 = dot(segment, segment);
  if (segmentLength2 < EPSILON) {
    const time = sphereTime(relative, delta, radius);
    return time === null
      ? null
      : { time, normal: normalize(sub(add(start, scale(delta, time)), a)) };
  }
  const axialDelta = dot(segment, delta);
  const axialStart = dot(segment, relative);
  const qa = segmentLength2 * dot(delta, delta) - axialDelta * axialDelta;
  const qb = segmentLength2 * dot(relative, delta) - axialStart * axialDelta;
  const qc =
    segmentLength2 * (dot(relative, relative) - radius * radius) -
    axialStart * axialStart;
  const discriminant = qb * qb - qa * qc;
  let time = Infinity;
  if (qa > EPSILON && discriminant >= 0) {
    const candidate = (-qb - Math.sqrt(discriminant)) / qa;
    const axial = axialStart + candidate * axialDelta;
    if (
      candidate >= -EPSILON &&
      candidate <= 1 &&
      axial > 0 &&
      axial < segmentLength2
    )
      time = Math.max(0, candidate);
  }
  for (const tip of [a, b]) {
    const candidate = sphereTime(sub(start, tip), delta, radius);
    if (candidate !== null) time = Math.min(time, candidate);
  }
  if (!Number.isFinite(time)) return null;
  const point = add(start, scale(delta, time));
  return { time, normal: normalize(sub(point, closestPoint(point, a, b))) };
}

// 椭球与球的 Minkowski 和使用保守外包椭球，斜向冲刺也不会切入凸起。
function expandedAxes(axes, radius) {
  if (radius <= 0) return axes;
  const beta = radius / Math.cbrt(axes.x * axes.y * axes.z);
  const extra = (1 + 1 / beta) * radius * radius;
  return {
    x: Math.sqrt((1 + beta) * axes.x ** 2 + extra),
    y: Math.sqrt((1 + beta) * axes.y ** 2 + extra),
    z: Math.sqrt((1 + beta) * axes.z ** 2 + extra),
  };
}

function colliderReach(collider, radius = 0) {
  if (collider.boundsRadius !== undefined)
    return collider.boundsRadius + radius;
  if (collider.type === "box")
    return magnitude(addScalar(collider.halfSize, radius));
  if (collider.type === "ellipsoid") {
    const axes = expandedAxes(collider.axes, radius);
    return Math.max(axes.x, axes.y, axes.z);
  }
  if (collider.type === "capsule")
    return distance(collider.a, collider.b) * 0.5 + collider.radius + radius;
  return collider.radius + radius;
}

function center(collider) {
  return collider.type === "capsule"
    ? scale(add(collider.a, collider.b), 0.5)
    : collider;
}

/*********************************************
 * 数值辅助
 ********************************************/

function toLocal(vector, quaternion = IDENTITY) {
  return rotate(vector, {
    x: -quaternion.x,
    y: -quaternion.y,
    z: -quaternion.z,
    w: quaternion.w,
  });
}
function rotate(vector, quaternion = IDENTITY) {
  const q = quaternion;
  const tx = 2 * (q.y * vector.z - q.z * vector.y);
  const ty = 2 * (q.z * vector.x - q.x * vector.z);
  const tz = 2 * (q.x * vector.y - q.y * vector.x);
  return {
    x: vector.x + q.w * tx + q.y * tz - q.z * ty,
    y: vector.y + q.w * ty + q.z * tx - q.x * tz,
    z: vector.z + q.w * tz + q.x * ty - q.y * tx,
  };
}
function closestPoint(point, start, end) {
  const delta = sub(end, start);
  const t = clamp(
    dot(sub(point, start), delta) / Math.max(EPSILON, dot(delta, delta)),
    0,
    1,
  );
  return add(start, scale(delta, t));
}
function distanceToSegment(point, start, end) {
  return distance(point, closestPoint(point, start, end));
}
function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}
function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function scale(a, value) {
  return { x: a.x * value, y: a.y * value, z: a.z * value };
}
function divide(a, b) {
  return { x: a.x / b.x, y: a.y / b.y, z: a.z / b.z };
}
function addScalar(a, value) {
  return { x: a.x + value, y: a.y + value, z: a.z + value };
}
function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function magnitude(a) {
  return Math.hypot(a.x, a.y, a.z);
}
function distance(a, b) {
  return magnitude(sub(a, b));
}
function normalize(a) {
  const length = magnitude(a);
  return length > EPSILON ? scale(a, 1 / length) : { x: 0, y: 1, z: 0 };
}
function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
