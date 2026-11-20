import * as THREE from "three";

/** 裁剪真实三角壳而非顶点分桶，跨层、跨扇区的面也必须完整覆盖。 */
function clip(polygon, distance) {
  const output = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i],
      b = polygon[(i + 1) % polygon.length],
      da = distance(a),
      db = distance(b);
    if (da >= 0) output.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      output.push(a.map((value, axis) => value + (b[axis] - value) * t));
    }
  }
  return output;
}

/** 静态薄壳按方向和高度分层；最底层单独容纳封板，保留上方空腔。 */
export function funnelShellContacts(geometry) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox,
    height = max.y - min.y,
    levels = [0, 0.04, 0.36, 0.68, 1].map((t) => min.y + height * t),
    sectors = 12,
    step = (Math.PI * 2) / sectors,
    tangent = Math.tan(step / 2),
    buckets = Array.from(
      { length: (levels.length - 1) * sectors },
      () => new THREE.Box3(),
    ),
    position = geometry.attributes.position,
    index = geometry.index;
  for (let i = 0; i < index.count; i += 3) {
    const triangle = Array.from({ length: 3 }, (_, j) => {
      const n = index.getX(i + j);
      return [position.getX(n), position.getY(n), position.getZ(n)];
    });
    for (let layer = 0; layer < levels.length - 1; layer++) {
      let slice = clip(triangle, (p) => p[1] - levels[layer]);
      slice = clip(slice, (p) => levels[layer + 1] - p[1]);
      if (slice.length < 3) continue;
      for (let sector = 0; sector < sectors; sector++) {
        const angle = sector * step,
          cosine = Math.cos(angle),
          sine = Math.sin(angle);
        let polygon = slice.map(([x, y, z]) => [
          cosine * x - sine * z,
          y,
          sine * x + cosine * z,
        ]);
        polygon = clip(polygon, (p) => p[2] * tangent - p[0]);
        polygon = clip(polygon, (p) => p[2] * tangent + p[0]);
        const bounds = buckets[layer * sectors + sector];
        for (const p of polygon) bounds.expandByPoint(new THREE.Vector3(...p));
      }
    }
  }
  return buckets.flatMap((bounds, i) => {
    if (bounds.isEmpty()) return [];
    const angle = (i % sectors) * step,
      rotation = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        angle,
      );
    return [
      {
        id: i,
        center: bounds.getCenter(new THREE.Vector3()).applyQuaternion(rotation),
        halfSize: bounds
          .getSize(new THREE.Vector3())
          .multiplyScalar(0.5)
          .addScalar(0.025),
        rotation,
      },
    ];
  });
}
