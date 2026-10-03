import * as THREE from "three";
import { PENGLAI_PEAKS, penglaiHeightAt } from "./penglai_config.js";

/** 山径从山脚连续盘上真实峰顶，静态采样同时用于林木避让与可见铺石。 */
export const PENGLAI_SUMMIT_ROUTES = Object.freeze(
  PENGLAI_PEAKS.filter((p) => p.x !== 0 && p.x !== -320).map((peak, index) => {
    let top = { x: peak.x, z: peak.z, y: penglaiHeightAt(peak.x, peak.z) };
    for (let x = -24; x <= 24; x += 4)
      for (let z = -24; z <= 24; z += 4) {
        const y = penglaiHeightAt(peak.x + x, peak.z + z);
        if (y > top.y) top = { x: peak.x + x, z: peak.z + z, y };
      }
    const points = [];
    for (let i = 0; i <= 100; i++) {
      const t = i / 100,
        r = 104 * (1 - t),
        a = index * 0.8 + t * Math.PI * 2.2,
        x = top.x + Math.sin(a) * r,
        z = top.z + Math.cos(a) * r;
      points.push(Object.freeze({ x, z, y: penglaiHeightAt(x, z) }));
    }
    return Object.freeze({
      top: Object.freeze(top),
      points: Object.freeze(points),
    });
  }),
);
export function besideSummitPath(x, z, margin = 7) {
  return PENGLAI_SUMMIT_ROUTES.some((r) =>
    r.points.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < margin ** 2),
  );
}
/** 有厚度的连续石带贴地铺设，既无悬空断路，也不增加挡路的巨大代理。 */
export function createPenglaiSummitPaths(root, keep, material) {
  const group = new THREE.Group();
  group.name = "continuous_summit_stone_paths";
  root.add(group);
  for (const [index, route] of PENGLAI_SUMMIT_ROUTES.entries()) {
    const vertices = [],
      indices = [],
      width = 6;
    for (let i = 0; i < route.points.length; i++) {
      const p = route.points[i],
        before = route.points[Math.max(0, i - 1)],
        after = route.points[Math.min(route.points.length - 1, i + 1)],
        d = Math.hypot(after.x - before.x, after.z - before.z) || 1,
        nx = -(after.z - before.z) / d,
        nz = (after.x - before.x) / d;
      for (const side of [-1, 1]) {
        const x = p.x + nx * width * 0.5 * side,
          z = p.z + nz * width * 0.5 * side;
        vertices.push(x, penglaiHeightAt(x, z) + 0.65, z);
      }
      if (i < route.points.length - 1) {
        const k = i * 2;
        indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, material);
    m.name = `winding_summit_path_${index}`;
    m.userData.summit = route.top;
    group.add(m);
  }
  return group;
}
