import { WRECK_BED } from "./bermuda_sites.js";
import * as THREE from "three";
import { bermudaSeabedHeight } from "./bermuda_terrain.js";

/** 只加密沉船支撑床的过渡坡，沿高度折线选择对角线，防止拐角三角面跨过凹槽。 */
export function createBermudaTerrainMesh() {
  const positions = [],
    normals = [],
    uv = [],
    indices = [],
    vertices = new Map();
  function vertex(x, z) {
    const key = `${x}:${z}`;
    if (vertices.has(key)) return vertices.get(key);
    const id = positions.length / 3;
    positions.push(x, bermudaSeabedHeight(x, z), z);
    const nx =
        bermudaSeabedHeight(x - 0.05, z) - bermudaSeabedHeight(x + 0.05, z),
      nz = bermudaSeabedHeight(x, z - 0.05) - bermudaSeabedHeight(x, z + 0.05),
      l = Math.hypot(nx, 0.1, nz);
    normals.push(nx / l, 0.1 / l, nz / l);
    uv.push((x + 340) / 680, (z + 1230) / 1450);
    vertices.set(key, id);
    return id;
  }
  for (let z = -1230; z < 220; z += 5)
    for (let x = -340; x < 340; x += 5) {
      const nearBed =
        x >= WRECK_BED.minX - WRECK_BED.blend - 5 &&
        x < WRECK_BED.maxX + WRECK_BED.blend + 5 &&
        z >= WRECK_BED.minZ - WRECK_BED.blend - 5 &&
        z < WRECK_BED.maxZ + WRECK_BED.blend + 5;
      const flat =
        x >= WRECK_BED.minX &&
        x + 5 <= WRECK_BED.maxX &&
        z >= WRECK_BED.minZ &&
        z + 5 <= WRECK_BED.maxZ;
      const corners = [
        bermudaSeabedHeight(x, z),
        bermudaSeabedHeight(x + 5, z),
        bermudaSeabedHeight(x, z + 5),
        bermudaSeabedHeight(x + 5, z + 5),
      ];
      const floorEdge =
        Math.min(...corners) <= -716 && Math.max(...corners) > -715.99;
      const n = floorEdge ? 5 : nearBed && !flat ? 4 : 1,
        step = 5 / n;
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const x0 = x + i * step,
            z0 = z + j * step;
          const a = vertex(x0, z0),
            b = vertex(x0 + step, z0),
            c = vertex(x0, z0 + step),
            d = vertex(x0 + step, z0 + step);
          const center = bermudaSeabedHeight(x0 + step / 2, z0 + step / 2);
          const ad = Math.abs(
              (positions[a * 3 + 1] + positions[d * 3 + 1]) / 2 - center,
            ),
            bc = Math.abs(
              (positions[b * 3 + 1] + positions[c * 3 + 1]) / 2 - center,
            );
          if (ad < bc) indices.push(a, c, d, a, d, b);
          else indices.push(a, c, b, b, c, d);
        }
    }
  // 可游玩区外只延展低密度海床裙边，避免浅水镜头直接看见矩形网格边缘。
  const perimeter = [];
  for (let x = -340; x < 340; x += 5) perimeter.push([x, -1230]);
  for (let z = -1230; z < 220; z += 5) perimeter.push([340, z]);
  for (let x = 340; x > -340; x -= 5) perimeter.push([x, 220]);
  for (let z = 220; z > -1230; z -= 5) perimeter.push([-340, z]);
  let inner = perimeter.map(([x, z]) => vertex(x, z));
  for (const margin of [25, 100, 300, 700]) {
    const outer = perimeter.map(([x, z]) =>
      vertex(
        (x * (340 + margin)) / 340,
        -505 + ((z + 505) * (725 + margin)) / 725,
      ),
    );
    for (let i = 0; i < inner.length; i++) {
      const j = (i + 1) % inner.length;
      for (const [a, b, c] of [
        [inner[i], outer[i], inner[j]],
        [inner[j], outer[i], outer[j]],
      ]) {
        const crossY =
          (positions[b * 3 + 2] - positions[a * 3 + 2]) *
            (positions[c * 3] - positions[a * 3]) -
          (positions[b * 3] - positions[a * 3]) *
            (positions[c * 3 + 2] - positions[a * 3 + 2]);
        indices.push(...(crossY > 0 ? [a, b, c] : [a, c, b]));
      }
    }
    inner = outer;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  return g;
}
