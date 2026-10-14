import * as THREE from "three";
import { sampleSection } from "./creature_surface.js";
import { cachedAlienGeometry } from "./creature_europa_geometry.js";

/** 沿真实躯干截面雕刻封闭叠甲，甲缘、内面与端面使用同一组顶点参数。 */
export function fittedLordArmor(
  key,
  profile,
  {
    count = 8,
    start = -0.28,
    end = 0.28,
    color = "#8b9a9b",
    edge = "#c4b797",
    angleStart = 0,
    angleEnd = Math.PI,
    relief = 0.012,
  } = {},
) {
  return cachedAlienGeometry(key, () => {
    const positions = [],
      colors = [],
      indices = [],
      rows = 6,
      sides = 24;
    const base = new THREE.Color(color),
      rim = new THREE.Color(edge),
      c = new THREE.Color();
    for (let band = 0; band < count; band++) {
      const z0 = start + ((end - start) * band) / count,
        z1 = z0 + ((end - start) / count) * 0.9,
        offset = positions.length / 3,
        layer = (rows + 1) * (sides + 1);
      for (let inner = 0; inner < 2; inner++)
        for (let r = 0; r <= rows; r++)
          for (let j = 0; j <= sides; j++) {
            const u = r / rows,
              a = angleStart + ((angleEnd - angleStart) * j) / sides,
              z = z0 + (z1 - z0) * u - 0.008 * Math.sin(a) ** 2;
            const [w, h, cy] = sampleSection(profile, z),
              lift = inner
                ? 0.002
                : relief * (0.55 + 0.45 * Math.sin(Math.PI * u));
            positions.push(
              Math.cos(a) * (w + lift),
              Math.sin(a) * (h + lift) + cy,
              z,
            );
            c.copy(base)
              .lerp(rim, Math.pow(u, 5) * 0.72)
              .multiplyScalar(0.92 + 0.08 * Math.sin(a));
            c.toArray(colors, colors.length);
            if (r < rows && j < sides) {
              const n = offset + inner * layer + r * (sides + 1) + j,
                b = n + sides + 1;
              indices.push(
                ...(inner
                  ? [n, b, n + 1, b, b + 1, n + 1]
                  : [n, n + 1, b, b, n + 1, b + 1]),
              );
            }
          }
      const stitch = (a, b) =>
        indices.push(
          offset + a,
          offset + b,
          offset + layer + a,
          offset + b,
          offset + layer + b,
          offset + layer + a,
        );
      for (let j = 0; j < sides; j++) {
        stitch(j + 1, j);
        stitch(rows * (sides + 1) + j, rows * (sides + 1) + j + 1);
      }
      for (let r = 0; r < rows; r++) {
        stitch(r * (sides + 1), (r + 1) * (sides + 1));
        stitch((r + 1) * (sides + 1) + sides, r * (sides + 1) + sides);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  });
}
