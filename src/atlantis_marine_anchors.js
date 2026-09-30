import * as THREE from "three";

/**
 * 从真实砌体碰撞面选取朝向入口的立面，避免用整栋包围盒猜测附着位置。
 * @param {Array<object>} colliders 城市最终静态碰撞体。
 * @param {object} options 入口 near、范围 maxDistance 和所需立面数量 count。
 * @returns {Array<object>} 含中心、法线、有效面宽、标高及宿主的立面锚点。
 */
export function selectMarineFacades(
  colliders,
  { near, maxDistance = 70, count = 1 },
) {
  const candidates = [];
  for (const host of colliders) {
    if (host.type !== "box" || host.kind !== "city_masonry") continue;
    const half = host.halfSize;
    if (
      half.y < 3 ||
      Math.min(half.x, half.z) > 2.5 ||
      Math.max(half.x, half.z) < 4
    )
      continue;
    const rotation = new THREE.Quaternion(
      host.rotation?.x ?? 0,
      host.rotation?.y ?? 0,
      host.rotation?.z ?? 0,
      host.rotation?.w ?? 1,
    );
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation);
    if (up.y < 0.999) continue;
    const thinX = half.x < half.z;
    const normal = new THREE.Vector3(thinX ? 1 : 0, 0, thinX ? 0 : 1)
      .applyQuaternion(rotation)
      .normalize();
    if (normal.x * (near.x - host.x) + normal.z * (near.z - host.z) < 0)
      normal.negate();
    const thickness = thinX ? half.x : half.z;
    const center = {
      x: host.x + normal.x * thickness,
      z: host.z + normal.z * thickness,
    };
    const distance = Math.hypot(center.x - near.x, center.z - near.z);
    if (distance > maxDistance) continue;
    candidates.push({
      center,
      normal: { x: normal.x, z: normal.z },
      width: 2 * (thinX ? half.z : half.x) - 1,
      baseY: host.y - half.y + 0.2,
      topY: host.y + half.y - 0.2,
      host,
      distance,
    });
  }
  return candidates.sort((a, b) => a.distance - b.distance).slice(0, count);
}
