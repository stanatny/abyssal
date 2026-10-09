import * as THREE from "three";
import { createBermudaBuilder } from "./bermuda_geometry.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { marianaLayerPalette } from "./mariana_cliffs.js";

/** 交错巨岩遮住直通视线；战场保持开阔，探索段沿左右缺口转弯。 */
export const MARIANA_OUTCROPS = Object.freeze(
  [
    [-65, -180, -390, 145, 35, 165],
    [65, -275, -350, 145, 25, 130],
    [130, -712, -340, 80, 19, 135],
    [-65, -1090, -295, 145, 20, 115],
    [-65, -1670, -390, 145, 45, 160],
    [65, -1820, -390, 145, 40, 145],
    [65, -2295, -425, 145, 50, 180],
    [-65, -2460, -335, 145, 55, 115],
  ].map((values, index) =>
    Object.freeze({
      id: `mariana_suspended_${index}`,
      center: Object.freeze(values.slice(0, 3)),
      axes: Object.freeze(values.slice(3)),
      seed: index * 1.71 + 0.6,
    }),
  ),
);

/** 成人路线的转弯点与巨岩共用数据，关卡附近仍走原来的开口。 */
export const MARIANA_MAZE_ROUTE = Object.freeze(
  [
    [0, -18, 75],
    [0, -75, -140],
    [0, -130, -280],
    [125, -130, -390],
    [125, -235, -390],
    [-125, -245, -360],
    [-125, -365, -360],
    [-65, -440, -350],
    [-65, -585, -350],
    [-65, -715, -350],
    [20, -780, -390],
    [65, -935, -420],
    [65, -1065, -420],
    [110, -1115, -420],
    [0, -1170, -420],
    [-65, -1310, -420],
    [-65, -1440, -420],
    [120, -1570, -315],
    [120, -1730, -315],
    [-125, -1750, -315],
    [-125, -1880, -360],
    [65, -2085, -350],
    [65, -2215, -350],
    [-125, -2225, -410],
    [-125, -2370, -350],
    [115, -2380, -300],
    [115, -2540, -300],
    [0, -2590, -410],
    [0, -2700, -400],
  ].map(Object.freeze),
);

/** 宽岩冠、断层边缘和收尖的底部共用闭合网格与保守分层接触单元。 */
function outcropGeometry(site) {
  const positions = [],
    colors = [],
    indices = [],
    colliders = [];
  const segments = 32;
  const levels = [
    [0.22, 0.97],
    [0.7, 0.82],
    [1, 0.2],
    [0.83, -0.32],
    [0.48, -0.73],
    [0.08, -0.98],
  ];
  const palette = marianaLayerPalette(site.center[1]),
    dark = new THREE.Color(palette[0]),
    pale = new THREE.Color(palette[1]),
    color = new THREE.Color();
  function vertex(x, y, z, shade) {
    positions.push(
      site.center[0] + x * site.axes[0],
      site.center[1] + y * site.axes[1],
      site.center[2] + z * site.axes[2],
    );
    color.copy(dark).lerp(pale, shade).toArray(colors, colors.length);
  }
  vertex(0, 1, 0, 0.68);
  for (const [ring, height] of levels)
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2,
        edge =
          0.78 +
          Math.sin(angle * 3 + site.seed) * 0.11 +
          Math.cos(angle * 5 - site.seed) * 0.065 +
          Math.sin(angle * 9 + site.seed) * 0.035,
        x = Math.cos(angle) * ring * edge,
        z = Math.sin(angle) * ring * edge,
        y = height + Math.sin(angle * 4 + site.seed) * 0.018;
      vertex(
        x,
        y,
        z,
        THREE.MathUtils.clamp(
          0.3 +
            height * 0.22 +
            Math.sin(height * 19 + angle + site.seed) * 0.14,
          0.08,
          0.75,
        ),
      );
    }
  const bottom = positions.length / 3;
  vertex(0, -1, 0, 0.16);
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments;
    indices.push(0, 1 + next, 1 + i);
    const last = 1 + (levels.length - 1) * segments;
    indices.push(bottom, last + i, last + next);
    for (let level = 0; level < levels.length - 1; level++) {
      const a = 1 + level * segments + i,
        aNext = 1 + level * segments + next,
        b = a + segments,
        bNext = aNext + segments;
      indices.push(a, aNext, b, aNext, bNext, b);
      const lo = [...site.center],
        hi = [...site.center];
      // 接触单元填满岩块内部；每段只跨相邻断层，避免整个包围盒挡住绕行水域。
      lo[1] = Infinity;
      hi[1] = -Infinity;
      for (const id of [a, aNext, b, bNext])
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k], positions[id * 3 + k]);
          hi[k] = Math.max(hi[k], positions[id * 3 + k]);
        }
      colliders.push({
        type: "box",
        id: `${site.id}_${level}_${i}`,
        x: (lo[0] + hi[0]) / 2,
        y: (lo[1] + hi[1]) / 2,
        z: (lo[2] + hi[2]) / 2,
        halfSize: new THREE.Vector3(...hi.map((v, k) => (v - lo[k]) / 2)),
      });
    }
  }
  // 两端的小岩冠同样为实体，不能从中心穿入。
  for (const [id, y, radius, height] of [
    ["crown", 0.985, 0.22, 0.035],
    ["root", -0.99, 0.08, 0.03],
  ])
    colliders.push({
      type: "box",
      id: `${site.id}_${id}`,
      x: site.center[0],
      y: site.center[1] + y * site.axes[1],
      z: site.center[2],
      halfSize: new THREE.Vector3(
        radius * site.axes[0],
        height * site.axes[1],
        radius * site.axes[2],
      ),
    });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return { geometry, colliders };
}

export function addMarianaOutcrops({ root, keep, group }) {
  const material = keep(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.96,
      flatShading: true,
    }),
  );
  material.name = "mariana_fractured_suspended_strata";
  addSurfaceDetail(material, "stone", 0.42);
  const batches = new Map(),
    colliders = [];
  for (const site of MARIANA_OUTCROPS) {
    const section = Math.floor(-site.center[1] / 180);
    if (!batches.has(section))
      batches.set(
        section,
        createBermudaBuilder(
          group(`trench_suspended_${section}`, -section * 180 - 90),
          keep,
        ),
      );
    const result = outcropGeometry(site);
    batches.get(section).add(result.geometry, material);
    colliders.push(...result.colliders);
  }
  for (const builder of batches.values()) builder.finish();
  root.userData.marianaOutcrops = {
    count: MARIANA_OUTCROPS.length,
    chunks: batches.size,
    colliders: colliders.length,
    triangles: MARIANA_OUTCROPS.length * 384,
  };
  return colliders;
}
