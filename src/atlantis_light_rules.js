import { Vector3 } from "three";
import { atlantisSeabedHeight } from "./atlantis_terrain.js";

export const LIGHT_MIRROR_RADIUS = 4.8;
const sites = [
  [
    [-235, -335],
    [-240, -450],
    [-225, -565],
    [225, -635],
    [225, -755],
    [90, -790],
  ],
  [
    [235, -335],
    [240, -450],
    [225, -565],
    [-225, -635],
    [-225, -755],
    [-60, -825],
  ],
  [
    [-235, -355],
    [-235, -470],
    [-225, -590],
    [-225, -690],
    [225, -775],
    [125, -790],
  ],
];
const vec = (a) => new Vector3(...a);

/** 预审的外围塔址；随机只选模板与初始档位，不随机创造不可达光路。 */
export function createLightLayout(route = 0, target = [0, -536, -852]) {
  const coordinates = sites[route % sites.length];
  const points = coordinates.map(
    ([x, z]) =>
      new Vector3(
        x,
        atlantisSeabedHeight(x, z) + 84 + (route === 2 ? 30 : 0),
        z,
      ),
  );
  const receiver = vec(target);
  const mirrors = points.slice(1).map((point, i) => {
    const incoming = point.clone().sub(points[i]).normalize();
    const next = points[i + 2] || receiver;
    // 每档是实际镜面法线；光路按反射定律追踪，不比较隐藏的答案数组。
    const destinations = [
      next,
      points[Math.max(0, i - 1)],
      point.clone().add(new Vector3(i % 2 ? 85 : -85, -45, 55)),
      point.clone().add(new Vector3(45, 80, -80)),
    ];
    const normals = destinations.map((p) =>
      incoming.clone().sub(p.clone().sub(point).normalize()).normalize(),
    );
    return {
      id: `light_tower_${route}_${i + 1}`,
      point,
      normals,
      radius: LIGHT_MIRROR_RADIUS,
    };
  });
  return {
    route,
    source: points[0],
    direction: points[1].clone().sub(points[0]).normalize(),
    mirrors,
    target: receiver,
    targetRadius: 5,
  };
}

/** 射线与有限镜盘相交；镜背也能反射，不存在不可见球形接光范围。 */
function discHit(origin, direction, center, normal, radius) {
  const denominator = direction.dot(normal);
  if (Math.abs(denominator) < 1e-6) return null;
  const distance = center.clone().sub(origin).dot(normal) / denominator;
  if (distance < 0.05) return null;
  const point = origin.clone().addScaledVector(direction, distance);
  return point.distanceToSquared(center) <= radius * radius
    ? { distance, point }
    : null;
}

/** 最多16跳；光只能从源头产生，墙体/海床截断，错误循环也有确定终点。 */
export function traceLight(layout, normals, obstruct = () => null) {
  let origin = layout.source.clone(),
    direction = layout.direction.clone();
  const segments = [],
    reached = [],
    visited = new Set();
  for (let hop = 0; hop < 16; hop++) {
    let nearest = {
      distance: 650,
      point: origin.clone().addScaledVector(direction, 650),
      index: -1,
    };
    layout.mirrors.forEach((m, i) => {
      const hit = discHit(origin, direction, m.point, normals[i], m.radius);
      if (hit && hit.distance < nearest.distance)
        nearest = { ...hit, index: i };
    });
    // 神像胸前的受光盘与最终视觉落点一致。
    const target = discHit(
      origin,
      direction,
      layout.target,
      new Vector3(0, 0, 1),
      layout.targetRadius,
    );
    if (target && target.distance < nearest.distance)
      nearest = { ...target, index: -2 };
    const blocked = obstruct(origin, nearest.point);
    if (blocked) {
      segments.push({ from: origin.clone(), to: blocked.clone(), hit: "wall" });
      return { segments, reached, hit: false };
    }
    segments.push({
      from: origin.clone(),
      to: nearest.point.clone(),
      hit: nearest.index,
    });
    if (nearest.index === -2) return { segments, reached, hit: true };
    if (nearest.index < 0) return { segments, reached, hit: false };
    const key = `${nearest.index}:${direction
      .toArray()
      .map((v) => v.toFixed(4))
      .join(",")}`;
    if (visited.has(key)) return { segments, reached, hit: false, loop: true };
    visited.add(key);
    reached.push(nearest.index);
    direction.reflect(normals[nearest.index]).normalize();
    origin = nearest.point.clone().addScaledVector(direction, 0.08);
  }
  return { segments, reached, hit: false, loop: true };
}

export function createLightState(random = Math.random) {
  return {
    detents: Array.from(
      { length: 5 },
      () => 1 + Math.min(2, Math.floor(random() * 3)),
    ),
    solved: false,
    hold: 0,
    discovered: false,
  };
}

/** 转动过程不计入稳态曝光；暂停、死亡不推进，成功只发出一个事件。 */
export function stepLight(
  state,
  dt,
  { active = true, hit = false, settled = true, action = null } = {},
) {
  if (!active || state.solved) return null;
  if (Number.isInteger(action) && action >= 0 && action < 5) {
    state.detents[action] = (state.detents[action] + 1) % 4;
    state.hold = 0;
    return { kind: "turned", index: action };
  }
  state.hold = hit && settled ? state.hold + Math.min(Math.max(dt, 0), 0.1) : 0;
  if (state.hold >= 1) {
    state.solved = true;
    return { kind: "solved" };
  }
  return null;
}
