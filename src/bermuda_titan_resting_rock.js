import * as THREE from "three";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 由实际姿态三角面生成局部向下表面索引，不使用整体最低点冒充身体支撑面。 */
export function createTitanUndersideSampler(mesh) {
  mesh.updateWorldMatrix(true, false);
  mesh.skeleton?.update();
  const geometry = mesh.geometry,
    grid = new Map(),
    size = 4,
    p = geometry.attributes.position,
    index = geometry.index,
    vertices = Array.from({ length: p.count }, (_, i) =>
      mesh
        .getVertexPosition(i, new THREE.Vector3())
        .applyMatrix4(mesh.matrixWorld),
    );
  for (let i = 0; i < (index?.count ?? p.count); i += 3) {
    const [a, b, c] = [0, 1, 2].map(
        (k) => vertices[index ? index.getX(i + k) : i + k],
      ),
      den = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
    if (Math.abs(den) < 1e-9) continue;
    const row = { a, b, c, den };
    for (
      let x = Math.floor(Math.min(a.x, b.x, c.x) / size);
      x <= Math.floor(Math.max(a.x, b.x, c.x) / size);
      x++
    )
      for (
        let z = Math.floor(Math.min(a.z, b.z, c.z) / size);
        z <= Math.floor(Math.max(a.z, b.z, c.z) / size);
        z++
      ) {
        const key = x + "/" + z;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(row);
      }
  }
  const at = (x, z) => {
    let y = Infinity;
    for (const { a, b, c, den } of grid.get(
      Math.floor(x / size) + "/" + Math.floor(z / size),
    ) ?? []) {
      const u = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / den,
        v = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / den;
      if (u >= -1e-7 && v >= -1e-7 && u + v <= 1 + 1e-7)
        y = Math.min(y, a.y * u + b.y * v + c.y * (1 - u - v));
    }
    return Number.isFinite(y) ? y : null;
  };
  at.dispose = () => grid.clear();
  return at;
}

/** 薄岩床用同一可见三角面与接触体填至真实海床，不填掉前爪外取宝水域。 */
export function createTitanRestingRock(
  parent,
  { center, rx, rz, topAt, heightAt, id, fitted = false, ceilingAt = null },
) {
  const contacts = [];
  const bedPositions = [],
    bedIndices = [],
    segments = fitted ? (rx > 100 ? 96 : 64) : 48,
    rings = fitted ? Math.ceil(Math.max(rx, rz) / 4) : 1;
  bedPositions.push(
    center.x,
    Math.max(heightAt(center.x, center.z), topAt(center.x, center.z)),
    center.z,
  );
  for (let ring = 1; ring <= rings; ring++)
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2,
        ripple = 1 + 0.045 * Math.sin(a * 7) + 0.025 * Math.cos(a * 11),
        x = center.x + (Math.cos(a) * rx * ripple * ring) / rings,
        z = center.z + (Math.sin(a) * rz * ripple * ring) / rings;
      bedPositions.push(
        x,
        Math.max(heightAt(x, z) - 0.2, topAt(x, z) - (fitted ? 0 : 1.2)),
        z,
      );
      const j = 1 + (ring - 1) * segments + i,
        next = 1 + (ring - 1) * segments + ((i + 1) % segments);
      if (ring === 1) bedIndices.push(0, next, j);
      else {
        const previous = j - segments,
          previousNext = next - segments;
        bedIndices.push(previous, previousNext, j, previousNext, next, j);
      }
    }
  const topCount = bedIndices.length;
  // 只下压实际超出身体下包络的面片；岩床可埋入地形，不能插进胸腹来掩盖悬空。
  if (ceilingAt)
    for (let pass = 0; pass < 8; pass++) {
      let correction = 0;
      for (let i = 0; i < topCount; i += 3) {
        const ids = bedIndices.slice(i, i + 3),
          points = ids.map((id) =>
            new THREE.Vector3().fromArray(bedPositions, id * 3),
          );
        let lower = 0;
        for (const weights of [
          [1 / 3, 1 / 3, 1 / 3],
          [0.5, 0.5, 0],
          [0.5, 0, 0.5],
          [0, 0.5, 0.5],
        ]) {
          const p = new THREE.Vector3();
          for (let k = 0; k < 3; k++) p.addScaledVector(points[k], weights[k]);
          const cap = ceilingAt(p.x, p.z);
          if (cap !== null) lower = Math.max(lower, p.y - cap + 0.18);
        }
        if (lower > 0.005) {
          for (const id of ids) bedPositions[id * 3 + 1] -= lower;
          correction = Math.max(correction, lower);
        }
      }
      if (correction <= 0.005) break;
    }
  for (let i = 0; i < segments; i++) {
    const j = 1 + (rings - 1) * segments + i,
      next = 1 + (rings - 1) * segments + ((i + 1) % segments),
      bottom = bedPositions.length / 3;
    for (const v of [j, next])
      bedPositions.push(
        bedPositions[v * 3],
        heightAt(bedPositions[v * 3], bedPositions[v * 3 + 2]) - 2,
        bedPositions[v * 3 + 2],
      );
    bedIndices.push(j, next, bottom, bottom, next, bottom + 1);
  }
  const bedGeometry = new THREE.BufferGeometry();
  bedGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(bedPositions, 3),
  );
  bedGeometry.setIndex(bedIndices);
  bedGeometry.computeVertexNormals();
  const bedMaterial = new THREE.MeshStandardMaterial({
    color: 0x4b5b60,
    roughness: 0.96,
  });
  addSurfaceDetail(bedMaterial, "stone", 0.8);
  const bed = new THREE.Mesh(bedGeometry, bedMaterial);
  bed.name = "titan_sloped_resting_rock";
  parent.add(bed);
  // 完整覆盖可见岩床体积；轮廓边缘细分至1米，不能只给中心铺盒。
  const topTriangles = [];
  const triangleGrid = new Map(),
    cellSize = 4;
  for (let i = 0; i < topCount; i += 3) {
    const ids = bedIndices.slice(i, i + 3);
    const actual = ids.map((id) =>
      new THREE.Vector3().fromBufferAttribute(
        bedGeometry.attributes.position,
        id,
      ),
    );
    const row = {
      actual,
      flat: new THREE.Triangle(
        ...actual.map((p) => new THREE.Vector3(p.x, 0, p.z)),
      ),
    };
    topTriangles.push(row);
    for (
      let x = Math.floor(Math.min(...actual.map((p) => p.x)) / cellSize);
      x <= Math.floor(Math.max(...actual.map((p) => p.x)) / cellSize);
      x++
    )
      for (
        let z = Math.floor(Math.min(...actual.map((p) => p.z)) / cellSize);
        z <= Math.floor(Math.max(...actual.map((p) => p.z)) / cellSize);
        z++
      ) {
        const key = x + "/" + z;
        if (!triangleGrid.has(key)) triangleGrid.set(key, []);
        triangleGrid.get(key).push(row);
      }
  }
  const flatPoint = new THREE.Vector3(),
    bary = new THREE.Vector3();
  const bedTop = (x, z) => {
    flatPoint.set(x, 0, z);
    for (const row of triangleGrid.get(
      Math.floor(x / cellSize) + "/" + Math.floor(z / cellSize),
    ) ?? [])
      if (row.flat.containsPoint(flatPoint)) {
        row.flat.getBarycoord(flatPoint, bary);
        return (
          row.actual[0].y * bary.x +
          row.actual[1].y * bary.y +
          row.actual[2].y * bary.z
        );
      }
    return null;
  };
  let bedContact = 0;
  function fillBed(x, z, size) {
    const corners = [
        [x, z],
        [x + size, z],
        [x, z + size],
        [x + size, z + size],
        [x + size / 2, z + size / 2],
      ],
      samples = corners.map(([px, pz]) => bedTop(px, pz)),
      box = new THREE.Box3(
        new THREE.Vector3(x, -0.01, z),
        new THREE.Vector3(x + size, 0.01, z + size),
      );
    const candidates = new Set();
    for (
      let gx = Math.floor(x / cellSize);
      gx <= Math.floor((x + size) / cellSize);
      gx++
    )
      for (
        let gz = Math.floor(z / cellSize);
        gz <= Math.floor((z + size) / cellSize);
        gz++
      )
        for (const row of triangleGrid.get(gx + "/" + gz) ?? [])
          candidates.add(row);
    if (![...candidates].some((row) => box.intersectsTriangle(row.flat)))
      return;
    const exact = [];
    if (fitted)
      for (const row of candidates) {
        let polygon = row.actual.map((p) => p.clone());
        for (const [axis, edge, keepAbove] of [
          ["x", x, true],
          ["x", x + size, false],
          ["z", z, true],
          ["z", z + size, false],
        ]) {
          const next = [];
          for (let i = 0; i < polygon.length; i++) {
            const a = polygon[i],
              b = polygon[(i + 1) % polygon.length],
              ia = keepAbove ? a[axis] >= edge : a[axis] <= edge,
              ib = keepAbove ? b[axis] >= edge : b[axis] <= edge;
            if (ia) next.push(a);
            if (ia !== ib)
              next.push(
                a.clone().lerp(b, (edge - a[axis]) / (b[axis] - a[axis])),
              );
          }
          polygon = next;
          if (!polygon.length) break;
        }
        for (const p of polygon) exact.push(p.y);
      }
    const defined = fitted ? exact : samples.filter((n) => n !== null),
      variation = Math.max(...defined) - Math.min(...defined);
    if (
      (samples.slice(0, 4).some((n) => n === null) && size > 1) ||
      (fitted && variation > 1.65 && size > 0.5)
    ) {
      for (const dx of [0, size / 2])
        for (const dz of [0, size / 2]) fillBed(x + dx, z + dz, size / 2);
      return;
    }
    const floor = Math.min(...corners.map(([px, pz]) => heightAt(px, pz))) - 2,
      top =
        Math.max(
          ...defined,
          ...(fitted ? [] : corners.map(([px, pz]) => topAt(px, pz) - 1.2)),
        ) + 0.15;
    if (!Number.isFinite(top) || top <= floor) return;
    contacts.push({
      id: `${id}_${bedContact++}`,
      type: "box",
      x: x + size / 2,
      y: (floor + top) / 2,
      z: z + size / 2,
      halfSize: new THREE.Vector3(
        size / 2 + 0.02,
        (top - floor) / 2,
        size / 2 + 0.02,
      ),
      rotation: new THREE.Quaternion(),
      titanBreathIgnore: true,
      supportMinimum: Math.min(...defined),
    });
  }
  for (let x = center.x - rx * 1.1; x < center.x + rx * 1.1; x += 4)
    for (let z = center.z - rz * 1.1; z < center.z + rz * 1.1; z += 4)
      fillBed(x, z, 4);
  // 以格子精确裁剪的可见三角最低点约束合并；总水侧高度误差<=1.8m，边界仍保留细格。
  if (fitted) {
    let rows = contacts.map((c) => ({
      x0: c.x - c.halfSize.x + 0.02,
      x1: c.x + c.halfSize.x - 0.02,
      z0: c.z - c.halfSize.z + 0.02,
      z1: c.z + c.halfSize.z - 0.02,
      bottom: c.y - c.halfSize.y,
      top: c.y + c.halfSize.y,
      lowTop: c.supportMinimum,
    }));
    const key = (n) => Math.round(n * 1e6);
    for (let pass = 0; pass < 4; pass++)
      for (const axis of ["x", "z"]) {
        const other = axis === "x" ? "z" : "x",
          groups = new Map();
        for (const row of rows) {
          const k = key(row[other + "0"]) + "/" + key(row[other + "1"]);
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k).push(row);
        }
        rows = [];
        for (const group of groups.values()) {
          group.sort((a, b) => a[axis + "0"] - b[axis + "0"]);
          let current = null;
          for (const row of group) {
            if (
              current &&
              Math.abs(current[axis + "1"] - row[axis + "0"]) < 1e-5 &&
              Math.max(current.top, row.top) -
                Math.min(current.lowTop, row.lowTop) <=
                1.8
            ) {
              current[axis + "1"] = row[axis + "1"];
              current.top = Math.max(current.top, row.top);
              current.lowTop = Math.min(current.lowTop, row.lowTop);
              current.bottom = Math.min(current.bottom, row.bottom);
            } else {
              if (current) rows.push(current);
              current = { ...row };
            }
          }
          if (current) rows.push(current);
        }
      }
    contacts.length = 0;
    for (const row of rows)
      contacts.push({
        id: `${id}_${contacts.length}`,
        type: "box",
        x: (row.x0 + row.x1) / 2,
        y: (row.bottom + row.top) / 2,
        z: (row.z0 + row.z1) / 2,
        halfSize: new THREE.Vector3(
          (row.x1 - row.x0) / 2 + 0.02,
          (row.top - row.bottom) / 2,
          (row.z1 - row.z0) / 2 + 0.02,
        ),
        rotation: new THREE.Quaternion(),
        titanBreathIgnore: true,
      });
  }
  const render = createTitanRockRenderGeometry(bedGeometry, {
    heightAt,
    profileAt: topAt,
    ceilingAt,
    enabled: fitted && ceilingAt !== null,
    isTopTriangle: (offset) => offset < topCount,
    isSkirtTriangle: (offset) => offset >= topCount,
  });
  bed.geometry = render.geometry;
  return {
    mesh: bed,
    sourceGeometry: bedGeometry,
    renderCull: render.stats,
    contacts,
    topAt: bedTop,
    dispose() {
      bed.removeFromParent();
      if (render.geometry !== bedGeometry) render.geometry.dispose();
      bedGeometry.dispose();
      bedMaterial.dispose();
    },
  };
}

/** 只裁可见重复海床皮；完整源网格继续负责拟合、地面采样与已有物理数据。 */
export function createTitanRockRenderGeometry(
  source,
  {
    heightAt,
    profileAt,
    ceilingAt = null,
    groundOffset = 0,
    enabled = true,
    isTopTriangle,
    isSkirtTriangle,
  },
) {
  const index = source.index,
    positions = source.attributes.position,
    retained = [],
    vertices = new Map(),
    stats = {
      sourceIndexCount: index.count,
      renderIndexCount: index.count,
      removedTopTriangles: 0,
      removedSkirtTriangles: 0,
      groundOffset,
    },
    unsupported = (x, z) =>
      profileAt(x, z) - heightAt(x, z) - groundOffset <= 1e-6 &&
      (ceilingAt === null || ceilingAt(x, z) === null),
    vertex = (id) => {
      if (!vertices.has(id)) {
        const x = positions.getX(id),
          z = positions.getZ(id);
        vertices.set(id, { x, z, unsupported: unsupported(x, z) });
      }
      return vertices.get(id);
    };
  if (!enabled) return { geometry: source, stats };
  for (let i = 0; i < index.count; i += 3) {
    const top = isTopTriangle(i),
      skirt = isSkirtTriangle(i),
      ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    let omit = false;
    if (enabled && (top || skirt)) {
      const points = ids.map(vertex);
      if (points.every((p) => p.unsupported)) {
        // 顶点为零增高仍不足：保留中途有承托或自然岩坡的混合边界片。
        omit = [
          [1 / 3, 1 / 3, 1 / 3],
          [0.5, 0.5, 0],
          [0.5, 0, 0.5],
          [0, 0.5, 0.5],
        ].every((w) =>
          unsupported(
            points.reduce((x, p, k) => x + p.x * w[k], 0),
            points.reduce((z, p, k) => z + p.z * w[k], 0),
          ),
        );
      }
    }
    if (omit) {
      if (top) stats.removedTopTriangles++;
      else stats.removedSkirtTriangles++;
    } else retained.push(...ids);
  }
  stats.renderIndexCount = retained.length;
  if (retained.length === index.count) return { geometry: source, stats };
  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes))
    geometry.setAttribute(name, attribute);
  geometry.setIndex(retained);
  geometry.boundingBox = source.boundingBox?.clone() ?? null;
  geometry.boundingSphere = source.boundingSphere?.clone() ?? null;
  return { geometry, stats };
}
