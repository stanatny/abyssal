import * as T from "three";
import { tentacleChunkBounds } from "./tentacle_motion.js";

/** 接受的 HF 独眼外皮实测：不把整个头部、眼窝内层或爆炸范围当作弱点。 */
export const POLYPHEMUS_EYE_FIT = Object.freeze({
  center: Object.freeze([0, 0.335, -0.21451299098181165]),
  radiusX: 0.025,
  radiusY: 0.024,
  halfDepth: 0.016,
  impactTolerance: 0.28,
});
const geometryCache = new WeakMap();
const actorCache = new WeakMap();
const finite = (p) => p && [p.x, p.y, p.z].every(Number.isFinite);

function patchFor(geometry) {
  if (geometryCache.has(geometry)) return geometryCache.get(geometry);
  const p = geometry.attributes.position,
    ix = geometry.index,
    triangles = [];
  const a = new T.Vector3(),
    b = new T.Vector3(),
    c = new T.Vector3(),
    n = new T.Vector3(),
    center = new T.Vector3();
  for (let i = 0; i < ix.count; i += 3) {
    a.fromBufferAttribute(p, ix.getX(i));
    b.fromBufferAttribute(p, ix.getX(i + 1));
    c.fromBufferAttribute(p, ix.getX(i + 2));
    new T.Triangle(a, b, c).getNormal(n);
    center
      .copy(a)
      .add(b)
      .add(c)
      .multiplyScalar(1 / 3);
    if (
      Math.abs(center.x) < 0.045 &&
      Math.abs(center.y - 0.335) < 0.045 &&
      center.z < -0.18 &&
      center.z > -0.255 &&
      n.z < -0.35
    )
      triangles.push(i);
  }
  geometryCache.set(geometry, triangles);
  return triangles;
}
function actor(root) {
  const rig = root?.userData?.hfRig,
    eye = root?.userData?.eyeAnchor;
  if (
    !rig?.mesh ||
    !eye ||
    root.userData.odysseyAnatomy !== "polyphemus" ||
    root.visible === false ||
    rig.mesh.visible === false
  )
    return null;
  let cached = actorCache.get(root);
  if (!cached) {
    cached = {
      root,
      mesh: rig.mesh,
      head: rig.bones[5],
      headRest: new T.Vector3(...rig.definitions[5].point),
      frame: {
        center: new T.Vector3(),
        normal: new T.Vector3(),
        right: new T.Vector3(),
        up: new T.Vector3(),
        radiusX: 0,
        radiusY: 0,
        radius: 0,
        boundsRadius: 0,
      },
      quaternion: new T.Quaternion(),
      scale: new T.Vector3(),
      triangle: new T.Triangle(),
      closest: new T.Vector3(),
      normal: new T.Vector3(),
      delta: new T.Vector3(),
      local: new T.Vector3(),
      ray: new T.Ray(),
      direction: new T.Vector3(),
      intersection: new T.Vector3(),
      bounds: new T.Box3(),
    };
    actorCache.set(root, cached);
  }
  root.updateWorldMatrix(true, false);
  root.updateMatrixWorld(true);
  cached.mesh = rig.mesh;
  cached.head.getWorldQuaternion(cached.quaternion);
  cached.head.getWorldScale(cached.scale);
  const f = cached.frame;
  f.center.fromArray(POLYPHEMUS_EYE_FIT.center).sub(cached.headRest);
  cached.head.localToWorld(f.center);
  f.normal
    .set(0.0223250389553467, -0.3329787336196458, -0.9426700141580293)
    .applyQuaternion(cached.quaternion)
    .normalize();
  f.right.set(1, 0, 0).applyQuaternion(cached.quaternion).normalize();
  f.up.crossVectors(f.normal, f.right).normalize().negate();
  f.radiusX = POLYPHEMUS_EYE_FIT.radiusX * Math.abs(cached.scale.x);
  f.radiusY = POLYPHEMUS_EYE_FIT.radiusY * Math.abs(cached.scale.y);
  f.radius = Math.max(f.radiusX, f.radiusY);
  f.boundsRadius = Math.hypot(
    f.radius,
    POLYPHEMUS_EYE_FIT.halfDepth * Math.abs(cached.scale.z),
  );
  return cached;
}

/** 供真实眼部提示和瞄准共用；返回的是实际头骨带动的外眼皮表面，不是身体中心。 */
export function polyphemusEyeFrame(root) {
  return actor(root)?.frame || null;
}
export function polyphemusEyeTarget(root, out = new T.Vector3()) {
  const frame = polyphemusEyeFrame(root);
  return frame ? out.copy(frame.center) : null;
}

function triangleWorld(a, index) {
  const g = a.mesh.geometry,
    ix = g.index;
  for (let q = 0; q < 3; q++)
    a.mesh
      .getVertexPosition(
        ix.getX(index + q),
        q === 0 ? a.triangle.a : q === 1 ? a.triangle.b : a.triangle.c,
      )
      .applyMatrix4(a.mesh.matrixWorld);
  return a.triangle;
}
function withinEye(a, point) {
  a.local.copy(point);
  a.head.worldToLocal(a.local);
  a.local.add(a.headRest);
  const f = POLYPHEMUS_EYE_FIT;
  return (
    (a.local.x / f.radiusX) ** 2 +
      ((a.local.y - f.center[1]) / f.radiusY) ** 2 <=
      1 + 1e-7 && Math.abs(a.local.z - f.center[2]) <= f.halfDepth
  );
}
/** 检查到眼皮的短线是否先穿过了真正的额头、眼窝或后脑外皮；不改共享材质双面状态。 */
function clearSkin(a, origin, target) {
  const length = a.direction.copy(target).sub(origin).length();
  if (length < 0.015) return true;
  a.direction.divideScalar(length);
  a.ray.set(origin, a.direction);
  const chunks = a.mesh.userData.tentacleChunks || [
    { start: 0, end: a.mesh.geometry.index.count },
  ];
  for (const chunk of chunks) {
    if (a.mesh.userData.tentacleChunks) {
      tentacleChunkBounds(a.mesh, chunk, a.bounds);
      if (
        !a.ray.intersectBox(a.bounds, a.intersection) ||
        a.intersection.distanceTo(origin) > length + 0.015
      )
        continue;
    }
    for (let i = chunk.start; i < chunk.end; i += 3) {
      const triangle = triangleWorld(a, i);
      if (
        a.ray.intersectTriangle(
          triangle.a,
          triangle.b,
          triangle.c,
          false,
          a.intersection,
        ) &&
        a.intersection.distanceTo(origin) < length - 0.015
      )
        return false;
    }
  }
  return true;
}

/** 只接受嘴部小球真正碰到小片外眼皮；闭合头颅内部、后脑和更早的面部遮挡均无效。
 * 同一查询也可由范围爆炸传入真实爆心及其原有半径，直接身体命中不能借此投影到眼睛。 */
export function findPolyphemusEyeContact(
  root,
  mouth,
  radius,
  { blocked = () => false, origin = mouth } = {},
) {
  if (
    !finite(mouth) ||
    !finite(origin) ||
    !Number.isFinite(radius) ||
    radius < 0
  )
    return null;
  const a = actor(root);
  if (!a || a.frame.center.distanceTo(mouth) > radius + a.frame.boundsRadius)
    return null;
  // 同一外眼皮的内侧也不能命中：沿实际头骨的前向先确认接触中心未埋在皮肤里。
  const outside = mouth
    .clone()
    .addScaledVector(
      new T.Vector3(0, 0, -1).applyQuaternion(a.quaternion),
      Math.max(10, Math.abs(a.scale.z) * 0.15),
    );
  if (!clearSkin(a, outside, mouth)) return null;
  let best = null,
    bestDistance = Infinity;
  const patch = patchFor(a.mesh.geometry);
  for (const index of patch) {
    const triangle = triangleWorld(a, index);
    triangle.closestPointToPoint(mouth, a.closest);
    const distance = a.closest.distanceToSquared(mouth);
    if (
      distance > radius * radius + 1e-9 ||
      distance >= bestDistance ||
      !withinEye(a, a.closest)
    )
      continue;
    triangle.getNormal(a.normal);
    // 面向外侧的真实接触法线拒绝从眼后穿头而来的攻击，也区分相距约0.19米的内层。
    if (
      a.delta.copy(mouth).sub(a.closest).dot(a.normal) < -0.015 ||
      a.delta.copy(origin).sub(a.closest).dot(a.normal) < -0.015
    )
      continue;
    const point = a.closest.clone();
    if (blocked(origin, point) || !clearSkin(a, origin, point)) continue;
    best = point;
    bestDistance = distance;
  }
  return best;
}

/** 鱼雷/尸爆的直接接触必须已经落在真实外眼皮附近；最多容许原弹体0.28米半径。 */
export function polyphemusEyeImpact(
  root,
  impact,
  {
    origin = impact,
    blocked = () => false,
    tolerance = POLYPHEMUS_EYE_FIT.impactTolerance,
  } = {},
) {
  if (
    !Number.isFinite(tolerance) ||
    tolerance < 0 ||
    tolerance > POLYPHEMUS_EYE_FIT.impactTolerance
  )
    return false;
  return Boolean(
    findPolyphemusEyeContact(root, impact, tolerance, { origin, blocked }),
  );
}
