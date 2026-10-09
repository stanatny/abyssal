export const MARIANA_PIT_SEGMENTS = 144;

/** 纵深中轴和非对称半径随深度偏移；轮廓不是矩形裁切，也不是固定圆柱。 */
export function marianaPitFrame(y) {
  return {
    x: Math.sin(y * 0.0031) * 9 + Math.sin(y * 0.008) * 4,
    z: -412 + Math.sin(y * 0.0025) * 10,
    rx: 235 + Math.sin(y * 0.003) * 10 + Math.cos(y * 0.011) * 8,
    front:
      200 +
      145 * Math.exp(-Math.pow(y / 360, 2)) +
      Math.sin(y * 0.004) * 10 +
      Math.cos(y * 0.009) * 8,
    back: 275 + Math.sin(y * 0.0035) * 12 + Math.cos(y * 0.007) * 8,
  };
}

export function marianaPitPoint(angle, y) {
  const f = marianaPitFrame(y),
    c = Math.cos(angle),
    s = Math.sin(angle),
    lobe =
      1 +
      Math.sin(angle * 3 + y * 0.002) * 0.055 +
      Math.cos(angle * 5 - y * 0.003 + 1.2) * 0.035 +
      Math.sin(angle * 9 + y * 0.012) * 0.018;
  return [f.x + c * f.rx * lobe, f.z + s * (s >= 0 ? f.front : f.back) * lobe];
}

/** 雷达只描绘当前水层的坑壁截面，不把保护性矩形边界误画成海沟形状。 */
export function marianaPitContour(y) {
  return Array.from({ length: 72 }, (_, i) =>
    marianaPitPoint((i * Math.PI * 2) / 72, y),
  );
}

/** 浅滩入口的唇缘向下敞开，允许出生水层沿斜坡进入坑内。 */
export function marianaPitRim(angle) {
  return (
    -42 -
    Math.pow(Math.max(0, Math.sin(angle)), 4) * 122 +
    Math.sin(angle * 5) * 7
  );
}

/** 从关卡中心射向最终坑壁的轮廓，台地边缘埋入岩壁，消除绕关漏洞。 */
export function marianaPitReach(x, z, angle, y) {
  const dx = Math.cos(angle),
    dz = Math.sin(angle);
  let reach = Infinity;
  for (let i = 0; i < MARIANA_PIT_SEGMENTS; i++) {
    const a = marianaPitPoint((i * Math.PI * 2) / MARIANA_PIT_SEGMENTS, y),
      b = marianaPitPoint(((i + 1) * Math.PI * 2) / MARIANA_PIT_SEGMENTS, y),
      ex = b[0] - a[0],
      ez = b[1] - a[1],
      denominator = dx * ez - dz * ex;
    if (Math.abs(denominator) < 1e-9) continue;
    const ax = a[0] - x,
      az = a[1] - z,
      t = (ax * ez - az * ex) / denominator,
      u = (ax * dz - az * dx) / denominator;
    if (t > 0 && u >= -1e-8 && u <= 1 + 1e-8) reach = Math.min(reach, t);
  }
  if (!Number.isFinite(reach))
    throw new Error("Mariana gate has no pit boundary");
  return reach;
}

/** 历史侧湾和岩台仍通过同一轮廓查询岩壁，避免附着物沿旧长方形位置悬空。 */
export function marianaPitFace(u, y, back = false, side = 1) {
  const f = marianaPitFrame(y);
  let face = back ? Infinity : side * -Infinity;
  for (let i = 0; i < MARIANA_PIT_SEGMENTS; i++) {
    const a = marianaPitPoint((i * Math.PI * 2) / MARIANA_PIT_SEGMENTS, y),
      b = marianaPitPoint(((i + 1) * Math.PI * 2) / MARIANA_PIT_SEGMENTS, y),
      along = back ? 0 : 1,
      axis = back ? 1 : 0,
      delta = b[along] - a[along];
    if (Math.abs(delta) < 1e-9) continue;
    const t = (u - a[along]) / delta;
    if (t < 0 || t > 1) continue;
    const v = a[axis] + (b[axis] - a[axis]) * t;
    face = back
      ? Math.min(face, v)
      : side > 0
        ? Math.max(face, v)
        : Math.min(face, v);
  }
  return Number.isFinite(face) ? face : back ? f.z - f.back : f.x + side * f.rx;
}
