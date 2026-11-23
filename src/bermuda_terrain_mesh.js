import { WRECK_BED } from "./bermuda_sites.js";
import * as THREE from "three";
import {
  bermudaSeabedHeight,
  bermudaLegacySeabedHeight,
} from "./bermuda_terrain.js";
import { BERMUDA_WORLD } from "./bermuda_config.js";

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
        bermudaLegacySeabedHeight(x, z),
        bermudaLegacySeabedHeight(x + 5, z),
        bermudaLegacySeabedHeight(x, z + 5),
        bermudaLegacySeabedHeight(x + 5, z + 5),
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
  // 原有沉船网格保持；新增外海按曲率加密，平坦深盆地不铺满五米网格。
  const minX = BERMUDA_WORLD.minX - 40,
    maxX = BERMUDA_WORLD.maxX + 40,
    minZ = BERMUDA_WORLD.minZ - 80,
    maxZ = BERMUDA_WORLD.maxZ + 80,
    leaves = [],
    horizontal = new Map(),
    vertical = new Map();
  function edgePoint(x, z) {
    if (!horizontal.has(z)) horizontal.set(z, new Set());
    if (!vertical.has(x)) vertical.set(x, new Set());
    horizontal.get(z).add(x);
    vertical.get(x).add(z);
  }
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i],
      z = positions[i + 2];
    if (x === -340 || x === 340 || z === -1230 || z === 220) edgePoint(x, z);
  }
  const westJoin = [...vertical.get(-340)].sort((a, b) => a - b),
    eastJoin = [...vertical.get(340)].sort((a, b) => a - b);
  const probes = [
    [1 / 3, 1 / 3, 1 / 3],
    [0.6, 0.2, 0.2],
    [0.2, 0.6, 0.2],
    [0.2, 0.2, 0.6],
    [0.5, 0.5, 0],
    [0.5, 0, 0.5],
    [0, 0.5, 0.5],
  ];
  function error(triangles) {
    let result = 0;
    for (const triangle of triangles)
      for (const weights of probes) {
        const x = triangle.reduce((n, p, j) => n + p[0] * weights[j], 0),
          z = triangle.reduce((n, p, j) => n + p[1] * weights[j], 0),
          y = triangle.reduce((n, p, j) => n + p[2] * weights[j], 0);
        result = Math.max(result, Math.abs(y - bermudaSeabedHeight(x, z)));
      }
    return result;
  }
  function cell(x, z, w, h) {
    const a = [x, z, bermudaSeabedHeight(x, z)],
      b = [x + w, z, bermudaSeabedHeight(x + w, z)],
      c = [x, z + h, bermudaSeabedHeight(x, z + h)],
      d = [x + w, z + h, bermudaSeabedHeight(x + w, z + h)];
    const ad = error([
        [a, c, d],
        [a, d, b],
      ]),
      bc = error([
        [a, c, b],
        [b, c, d],
      ]);
    // 旧网格边缘包含一米夹角加密；贴边条带只细分横向，保留原边界全部分段。
    const fixedZ = (x === 340 || x + w === -340) && z >= -1230 && z + h <= 220;
    if (Math.min(ad, bc) > 0.22 && (w > 1.25 || (!fixedZ && h > 1.25))) {
      const splitX = w > 1.25,
        splitZ = !fixedZ && h > 1.25,
        ww = splitX ? w / 2 : w,
        hh = splitZ ? h / 2 : h;
      for (let j = 0; j < (splitZ ? 2 : 1); j++)
        for (let i = 0; i < (splitX ? 2 : 1); i++)
          cell(x + i * ww, z + j * hh, ww, hh);
      return;
    }
    leaves.push({ x, z, w, h, ad: ad < bc });
    [a, b, c, d].forEach(([xx, zz]) => edgePoint(xx, zz));
  }
  function rectangle(x0, x1, z0, z1) {
    for (let z = z0; z < z1; z += 20)
      for (let x = x0; x < x1; x += 20)
        cell(x, z, Math.min(20, x1 - x), Math.min(20, z1 - z));
  }
  rectangle(minX, -345, -1230, maxZ);
  rectangle(345, maxX, -1230, maxZ);
  for (let i = 0; i < westJoin.length - 1; i++)
    cell(-345, westJoin[i], 5, westJoin[i + 1] - westJoin[i]);
  for (let i = 0; i < eastJoin.length - 1; i++)
    cell(340, eastJoin[i], 5, eastJoin[i + 1] - eastJoin[i]);
  rectangle(minX, maxX, minZ, -1230);
  for (const [key, values] of horizontal)
    horizontal.set(
      key,
      [...values].sort((a, b) => a - b),
    );
  for (const [key, values] of vertical)
    vertical.set(
      key,
      [...values].sort((a, b) => a - b),
    );
  for (const { x, z, w, h, ad } of leaves) {
    // 相邻粗细网格共享边界顶点，消除新增区域接缝处的T形裂口。
    const bottom = horizontal
        .get(z)
        .filter((v) => v >= x && v < x + w)
        .map((v) => [v, z]),
      right = vertical
        .get(x + w)
        .filter((v) => v >= z && v < z + h)
        .map((v) => [x + w, v]),
      top = horizontal
        .get(z + h)
        .filter((v) => v > x && v <= x + w)
        .reverse()
        .map((v) => [v, z + h]),
      left = vertical
        .get(x)
        .filter((v) => v > z && v <= z + h)
        .reverse()
        .map((v) => [x, v]),
      ring = [...bottom, ...right, ...top, ...left].map(([xx, zz]) =>
        vertex(xx, zz),
      );
    if (ring.length === 4) {
      const [a, b, d, c] = ring;
      if (ad) indices.push(a, c, d, a, d, b);
      else indices.push(a, c, b, b, c, d);
    } else {
      const center = vertex(x + w / 2, z + h / 2);
      for (let i = 0; i < ring.length; i++)
        indices.push(center, ring[(i + 1) % ring.length], ring[i]);
    }
  }
  // 可游玩区外只延展低密度海床裙边，避免浅水镜头直接看见矩形网格边缘。
  const perimeter = [];
  for (const x of horizontal.get(minZ)) if (x < maxX) perimeter.push([x, minZ]);
  for (const z of vertical.get(maxX)) if (z < maxZ) perimeter.push([maxX, z]);
  // 北侧中央仍是原五米网格，其边界已登记进同一顶点表。
  for (const x of [...horizontal.get(maxZ)].reverse())
    if (x > minX) perimeter.push([x, maxZ]);
  for (const z of [...vertical.get(minX)].reverse())
    if (z > minZ) perimeter.push([minX, z]);
  const centerX = (minX + maxX) / 2,
    centerZ = (minZ + maxZ) / 2,
    halfX = (maxX - minX) / 2,
    halfZ = (maxZ - minZ) / 2;
  let inner = perimeter.map(([x, z]) => vertex(x, z));
  for (const margin of [25, 100, 300, 700]) {
    const outer = perimeter.map(([x, z]) =>
      vertex(
        centerX + ((x - centerX) * (halfX + margin)) / halfX,
        centerZ + ((z - centerZ) * (halfZ + margin)) / halfZ,
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
