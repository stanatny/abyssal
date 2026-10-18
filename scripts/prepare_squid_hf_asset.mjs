/**
 * 保留 TRELLIS 外套膜/头眼/鳍，重拓扑八腕/双触腕和吸盘；不保留重建时粘连、开裂的腕冠。
 * 用法：node scripts/prepare_squid_hf_asset.mjs raw.glb tools-dir [output-dir]
 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
const [input, tools, output = "src/assets/models"] = process.argv.slice(2);
if (!input || !tools)
  throw new Error("Expected raw GLB and isolated tools directory");
const require = createRequire(join(resolve(tools), "package.json"));
const load = (name) => import(pathToFileURL(require.resolve(name)).href);
const { NodeIO } = await load("@gltf-transform/core");
const { ALL_EXTENSIONS } = await load("@gltf-transform/extensions");
const { weld, simplify } = await load("@gltf-transform/functions");
const { MeshoptSimplifier } = await load("meshoptimizer");
await MeshoptSimplifier.ready;
const doc = await new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .read(resolve(input));
await doc.transform(
  weld({}),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.45, error: 0.0007 }),
);
const primitive = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const pos = primitive.getAttribute("POSITION").getArray();
const uv = primitive.getAttribute("TEXCOORD_0").getArray();
const indices = primitive.getIndices().getArray();
const source = Array.from({ length: pos.length / 3 }, (_, i) => ({
  p: Array.from(pos.slice(i * 3, i * 3 + 3)),
  uv: Array.from(uv.slice(i * 2, i * 2 + 2)),
}));
const faces = Array.from({ length: indices.length / 3 }, (_, i) =>
  Array.from(indices.slice(i * 3, i * 3 + 3)),
);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
// 以导出实际轴向和眼部/腕冠位置对齐既有嘴点；不是对包围盒盲目统一居中。
const scale = 0.59 / 0.535;
const toGame = ([x, y, z]) => [
  -z * scale,
  (y - 0.05) * scale,
  x * scale + 0.09 - 0.035 * scale,
];
const result = [],
  triangleIndices = [],
  bones = [],
  chains = [];
function bone(name, parent, position) {
  bones.push({ name, parent, position });
  return bones.length - 1;
}
bone("squid_root", -1, [0, 0, 0]);
bone("squid_mantle", 0, [0, 0, 0.035]);
for (const side of [-1, 1])
  for (let j = 0; j < 3; j++)
    bone(`squid_fin_${side}_${j}`, 1, [
      side * 0.023,
      -0.019,
      -0.48 + j * 0.065,
    ]);
function emit(vertices, transform, binding) {
  const start = result.length;
  for (const v of vertices) {
    const point = transform(v.p);
    result.push({ p: point, uv: v.uv, ...binding(point, v.p) });
  }
  triangleIndices.push(start, start + 1, start + 2);
}
function clip(vertices, axis, cut, keepLess) {
  let out = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i],
      b = vertices[(i + 1) % vertices.length];
    const ain = keepLess ? a.p[axis] <= cut : a.p[axis] >= cut,
      bin = keepLess ? b.p[axis] <= cut : b.p[axis] >= cut;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (cut - a.p[axis]) / (b.p[axis] - a.p[axis]);
      out.push({
        p: a.p.map((n, k) => THREE.MathUtils.lerp(n, b.p[k], t)),
        uv: a.uv.map((n, k) => THREE.MathUtils.lerp(n, b.uv[k], t)),
      });
    }
  }
  return out;
}
const bodyBind = ([x, y, z]) => {
  const mantle = 1 - smooth(0.006, 0.077, z);
  const fin =
    smooth(0.025, 0.047, Math.abs(x)) * (1 - smooth(-0.345, -0.31, z));
  const k = THREE.MathUtils.clamp((z + 0.48) / 0.065, 0, 1.999),
    j = Math.floor(k),
    f = k - j;
  return {
    ids: [0, 1, (x < 0 ? 2 : 5) + j, (x < 0 ? 2 : 5) + j + 1],
    weights: [
      1 - mantle,
      mantle * (1 - fin),
      mantle * fin * (1 - f),
      mantle * fin * f,
    ],
  };
};
for (const f of faces) {
  const polygon = clip(
    f.map((i) => source[i]),
    0,
    0.02,
    true,
  );
  for (let i = 1; i < polygon.length - 1; i++)
    emit([polygon[0], polygon[i], polygon[i + 1]], toGame, bodyBind);
}
// 单图重建的腕冠粘连且有薄片；以参考的外形重拓扑连续圆截面和实体吸盘，保持同一套尺寸/骨链。
const bodyIndexCount = triangleIndices.length;
const fleshColor = new THREE.Color(0xa36d50),
  creamColor = new THREE.Color(0xd3ba96),
  darkColor = new THREE.Color(0x64412f);
function vertex(p, binding, color) {
  return { p, uv: [0.5, 0.5], ...binding, color: color.toArray(), material: 1 };
}
function addSurface(grid, columns, rows) {
  const start = result.length;
  result.push(...grid);
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < columns; j++) {
      const a = start + i * (columns + 1) + j,
        b = a + columns + 1;
      triangleIndices.push(a, a + 1, b, a + 1, b + 1, b);
    }
}
function appendage(index, isLong) {
  const angle = isLong
      ? index
        ? Math.PI * 1.3
        : Math.PI * 1.7
      : ((index + 0.5) * Math.PI) / 4,
    c = Math.cos(angle),
    sn = Math.sin(angle),
    length = isLong ? 0.53 : 0.345 + (index % 3) * 0.014;
  const root = [c * 0.028, sn * 0.025 - 0.004, 0.078],
    count = isLong ? 6 : 5,
    reach = isLong ? 0.075 : 0.08;
  const path = (t) => [
    root[0] + c * reach * Math.sin(t * Math.PI * 0.8),
    root[1] + sn * reach * 0.8 * Math.sin(t * Math.PI * 0.85),
    root[2] + t * length,
  ];
  const first = bones.length;
  for (let j = 0; j < count; j++)
    bone(
      isLong
        ? `squid_tentacle_${index ? 1 : -1}_${j}`
        : `squid_arm_${index}_${j}`,
      j ? bones.length - 1 : 0,
      path(j / (count - 1)),
    );
  chains.push({
    type: isLong ? "tentacle" : "arm",
    index,
    angle,
    first,
    count,
    root,
    length,
  });
  const bind = (t) => {
    const k = THREE.MathUtils.clamp(t, 0, 1) * (count - 1),
      j = Math.min(count - 2, Math.floor(k));
    return {
      ids: [first + j, first + j + 1, 0, 0],
      weights: [1 - (k - j), k - j, 0, 0],
    };
  };
  const radius = (t) =>
    (isLong
      ? 0.0038 + 0.0065 * Math.exp(-Math.pow((t - 0.86) / 0.085, 2))
      : 0.0105 * Math.pow(1 - t, 0.78) + 0.00035) *
    (1 - smooth(0.97, 1, t));
  const rings = isLong ? 52 : 32,
    sides = 12,
    grid = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings,
      p = path(t),
      r = radius(t);
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2,
        nx = Math.cos(a),
        ny = Math.sin(a);
      const inward = -(nx * c + ny * sn);
      const shade = 0.92 + 0.08 * Math.sin(t * 37 + index * 2 + a * 3);
      const color = fleshColor
        .clone()
        .lerp(creamColor, smooth(0.15, 0.7, inward) * 0.72)
        .multiplyScalar(shade);
      grid.push(vertex([p[0] + nx * r, p[1] + ny * r, p[2]], bind(t), color));
    }
  }
  addSurface(grid, sides, rings);
  // 两列吸盘有杯壁、圆润杯缘和凹底；与腕管共用权重，避免滑动或悬空。
  const cups = isLong ? 10 : 14;
  for (let k = 0; k < cups; k++) {
    const t = isLong ? 0.72 + k * 0.022 : 0.08 + k * 0.059,
      p = path(t),
      r = radius(t),
      cupRadius = r * 0.42;
    for (const row of [-1, 1]) {
      const center = [
          p[0] - c * r * 0.88 - sn * row * r * 0.36,
          p[1] - sn * r * 0.88 + c * row * r * 0.36,
          p[2],
        ],
        cup = [];
      for (let ring = 0; ring < 4; ring++)
        for (let j = 0; j <= 8; j++) {
          const a = (j / 8) * Math.PI * 2,
            rr = cupRadius * [1, 0.93, 0.48, 0][ring],
            h = cupRadius * [0, 0.38, 0.15, 0.04][ring];
          const tangent = Math.cos(a) * rr,
            z = Math.sin(a) * rr;
          const color = ring === 3 ? darkColor : creamColor;
          cup.push(
            vertex(
              [
                center[0] - sn * tangent - c * h,
                center[1] + c * tangent - sn * h,
                center[2] + z,
              ],
              bind(t + z / length),
              color,
            ),
          );
        }
      addSurface(cup, 8, 3);
    }
  }
}
for (let i = 0; i < 8; i++) appendage(i, false);
for (let i = 0; i < 2; i++) appendage(i, true);
// 腕冠前端在实体头内封口；细小喙由运行时模型承接既有嘴点。
const crownUv = source.reduce(
  (best, v) => {
    const d = Math.hypot(v.p[0] - 0.015, v.p[1] - 0.065, v.p[2] - 0.04);
    return d < best.d ? { d, uv: v.uv } : best;
  },
  { d: Infinity },
).uv;
for (let ring = 0; ring < 6; ring++)
  for (let j = 0; j < 40; j++) {
    const point = (r, a) => {
      const theta = ((r / 6) * Math.PI) / 2;
      return [
        Math.cos(a) * 0.055 * Math.cos(theta),
        Math.sin(a) * 0.027 * Math.cos(theta) - 0.002,
        0.073 + 0.024 * Math.sin(theta),
      ];
    };
    const a = (j / 40) * Math.PI * 2,
      b = ((j + 1) / 40) * Math.PI * 2;
    for (const tri of [
      [point(ring, a), point(ring, b), point(ring + 1, a)],
      [point(ring, b), point(ring + 1, b), point(ring + 1, a)],
    ]) {
      const start = result.length;
      for (const p of tri)
        result.push({
          p,
          uv: crownUv,
          ids: [0, 0, 0, 0],
          weights: [1, 0, 0, 0],
          color: fleshColor.toArray(),
          material: 1,
        });
      triangleIndices.push(start, start + 1, start + 2);
    }
  }
// 按位置+UV+绑定合并顶点；所有UV接缝共享由实际变形曲面计算的平滑法线。
const vertices = [],
  lookup = new Map(),
  index = [];
for (const sourceIndex of triangleIndices) {
  const v = result[sourceIndex],
    key = [
      ...v.p.map((x) => x.toFixed(6)),
      ...v.uv.map((x) => x.toFixed(6)),
      ...v.ids,
      ...v.weights.map((x) => x.toFixed(5)),
      v.material || 0,
      ...(v.color || []),
    ].join(",");
  let j = lookup.get(key);
  if (j === undefined) {
    j = vertices.length;
    vertices.push(v);
    lookup.set(key, j);
  }
  index.push(j);
}
if (vertices.length > 65535)
  throw new Error(`Vertex budget ${vertices.length}`);
const cleanIndices = [];
let bodyFinalIndexCount = 0;
const ab = new THREE.Vector3(),
  ac = new THREE.Vector3();
for (let i = 0; i < index.length; i += 3) {
  const a = vertices[index[i]].p,
    b = vertices[index[i + 1]].p,
    c = vertices[index[i + 2]].p;
  ab.fromArray(b).sub(new THREE.Vector3(...a));
  ac.fromArray(c).sub(new THREE.Vector3(...a));
  if (ab.cross(ac).lengthSq() < 1e-18) continue;
  cleanIndices.push(index[i], index[i + 1], index[i + 2]);
  if (i < bodyIndexCount) bodyFinalIndexCount += 3;
}
index.length = 0;
index.push(...cleanIndices);
const normalMap = new Map(),
  dominantNormal = new Map(),
  key = (p) => p.map((x) => x.toFixed(5)).join(",");
const va = new THREE.Vector3(),
  vb = new THREE.Vector3(),
  vc = new THREE.Vector3(),
  normal = new THREE.Vector3();
for (let i = 0; i < index.length; i += 3) {
  const a = vertices[index[i]].p,
    b = vertices[index[i + 1]].p,
    c1 = vertices[index[i + 2]].p;
  va.fromArray(a);
  vb.fromArray(b);
  vc.fromArray(c1);
  normal.crossVectors(vb.sub(va), vc.sub(va));
  for (const p of [a, b, c1]) {
    const k = key(p);
    if (!normalMap.has(k)) normalMap.set(k, new THREE.Vector3());
    normalMap.get(k).add(normal);
    // 极薄鳍缘的相反面可能抵消；保留面积最大的相邻面，避免零法线造成黑斑。
    if (
      !dominantNormal.has(k) ||
      normal.lengthSq() > dominantNormal.get(k).lengthSq()
    )
      dominantNormal.set(k, normal.clone());
  }
}
const min = [0, 1, 2].map((j) => Math.min(...vertices.map((v) => v.p[j]))),
  max = [0, 1, 2].map((j) => Math.max(...vertices.map((v) => v.p[j])));
const q = new Uint16Array(vertices.length * 3),
  n = new Int16Array(q.length),
  u = new Uint16Array(vertices.length * 2),
  si = new Uint16Array(vertices.length * 4),
  sw = new Uint16Array(si.length);
vertices.forEach((v, i) => {
  const k = key(v.p),
    sum = normalMap.get(k),
    nor = (sum.lengthSq() > 1e-24 ? sum : dominantNormal.get(k)).clone();
  if (nor.lengthSq() < 1e-24) nor.set(0, 1, 0);
  nor.normalize();
  for (let j = 0; j < 3; j++) {
    q[i * 3 + j] = Math.round(((v.p[j] - min[j]) / (max[j] - min[j])) * 65535);
    n[i * 3 + j] = Math.round(nor.getComponent(j) * 32767);
  }
  for (let j = 0; j < 2; j++) u[i * 2 + j] = Math.round(v.uv[j] * 65535);
  for (let j = 0; j < 4; j++) {
    si[i * 4 + j] = v.ids[j];
    sw[i * 4 + j] = Math.round(v.weights[j] * 65535);
  }
});
const colors = new Uint8Array(vertices.length * 3);
vertices.forEach((v, i) => {
  const color =
    v.color || new THREE.Color(v.p[1] < -0.02 ? 0xd0b49c : 0x9f533b).toArray();
  for (let j = 0; j < 3; j++) colors[i * 3 + j] = Math.round(color[j] * 255);
});
const base64 = (a) =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
const packed = {
  format: 1,
  source:
    "Microsoft TRELLIS.2-4B mantle/head/fins, retopologized eight-arm crown",
  vertices: vertices.length,
  triangles: index.length / 3,
  min,
  max,
  position: base64(q),
  normal: base64(n),
  uv: base64(u),
  index: base64(new Uint16Array(index)),
  skinIndex: base64(si),
  skinWeight: base64(sw),
  color: base64(colors),
  groups: [
    { start: 0, count: bodyFinalIndexCount, materialIndex: 0 },
    {
      start: bodyFinalIndexCount,
      count: index.length - bodyFinalIndexCount,
      materialIndex: 1,
    },
  ],
  bones,
  chains,
};
await mkdir(output, { recursive: true });
await writeFile(join(output, "squid_mesh.json"), JSON.stringify(packed) + "\n");
await writeFile(
  join(output, "squid_color.webp"),
  primitive.getMaterial().getBaseColorTexture().getImage(),
);
console.log(
  JSON.stringify({
    sourceSha256: createHash("sha256")
      .update(await readFile(input))
      .digest("hex"),
    vertices: packed.vertices,
    triangles: packed.triangles,
    bones: bones.length,
    arms: 8,
    tentacles: 2,
    min,
    max,
  }),
);
