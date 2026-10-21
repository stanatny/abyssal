import * as THREE from "three";

const EPS = 1e-5;
/** 将相交轴对齐砌体的外皮裁成不重叠矩形；只改渲染面，碰撞合同仍由调用方保留。 */
export function masonrySurfaces(boxes, materialGeometry) {
  const out = [];
  const bounds = boxes.map(({ size, center }) => ({
    min: center.map((v, i) => v - size[i] / 2),
    max: center.map((v, i) => v + size[i] / 2),
  }));
  for (let i = 0; i < boxes.length; i++) {
    const a = bounds[i],
      positions = [],
      normals = [],
      colors = [];
    const color = materialGeometry(boxes[i].material).attributes.color;
    for (let axis = 0; axis < 3; axis++) {
      const u = (axis + 1) % 3,
        v = (axis + 2) % 3;
      for (const sign of [1, -1]) {
        const plane = sign > 0 ? a.max[axis] : a.min[axis];
        let rectangles = [[a.min[u], a.max[u], a.min[v], a.max[v]]];
        for (let j = 0; j < boxes.length && rectangles.length; j++) {
          if (i === j) continue;
          const b = bounds[j];
          const crosses =
            sign > 0
              ? b.min[axis] <= plane + EPS && b.max[axis] > plane + EPS
              : b.max[axis] >= plane - EPS && b.min[axis] < plane - EPS;
          const sameSkin =
            j > i &&
            Math.abs((sign > 0 ? b.max[axis] : b.min[axis]) - plane) < EPS;
          if (!crosses && !sameSkin) continue;
          rectangles = rectangles.flatMap((r) =>
            subtract(r, [b.min[u], b.max[u], b.min[v], b.max[v]]),
          );
        }
        // BoxGeometry 每个正/负面有独立顶点；保留该面的平均色，避免裁片边界插值色缝。
        const start = (axis * 2 + (sign > 0 ? 0 : 1)) * 4;
        const tint = [0, 0, 0];
        for (let k = 0; k < 4; k++)
          for (let c = 0; c < 3; c++)
            tint[c] += color.array[(start + k) * 3 + c] / 4;
        for (const r of rectangles) {
          const corners = [
            [r[0], r[2]],
            [r[1], r[2]],
            [r[1], r[3]],
            [r[0], r[3]],
          ];
          const order = sign > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
          for (const k of order) {
            const p = [0, 0, 0],
              n = [0, 0, 0];
            p[axis] = plane;
            p[u] = corners[k][0];
            p[v] = corners[k][1];
            n[axis] = sign;
            positions.push(...p);
            normals.push(...n);
            colors.push(...tint);
          }
        }
      }
    }
    if (!positions.length) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    out.push({ geometry, material: boxes[i].material });
  }
  return out;
}
function subtract(r, cut) {
  const x0 = Math.max(r[0], cut[0]),
    x1 = Math.min(r[1], cut[1]),
    y0 = Math.max(r[2], cut[2]),
    y1 = Math.min(r[3], cut[3]);
  if (x1 - x0 < EPS || y1 - y0 < EPS) return [r];
  return [
    [r[0], x0, r[2], r[3]],
    [x1, r[1], r[2], r[3]],
    [x0, x1, r[2], y0],
    [x0, x1, y1, r[3]],
  ].filter((q) => q[1] - q[0] > EPS && q[3] - q[2] > EPS);
}
