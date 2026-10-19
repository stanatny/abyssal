/** 将授权导出的领主网格离线减面、校正中性朝向并量化；保留原始 GLB 作为可审计输入。 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { padTextureIslands } from "./lib/pad_texture_islands.mjs";
const [kind, input, tools, outArg] = process.argv.slice(2);
if (
  !["mayan", "hydra", "kraken", "leviathan"].includes(kind) ||
  !input ||
  !tools
)
  throw new Error("Usage: kind raw.glb tools-directory [output-directory]");
const require = createRequire(join(resolve(tools), "package.json")),
  load = (n) => import(pathToFileURL(require.resolve(n)).href);
const { NodeIO } = await load("@gltf-transform/core"),
  { ALL_EXTENSIONS } = await load("@gltf-transform/extensions"),
  { weld, simplify } = await load("@gltf-transform/functions"),
  { MeshoptSimplifier } = await load("meshoptimizer");
const doc = await new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .read(resolve(input));
const raw = doc.getRoot().listMeshes()[0].listPrimitives()[0],
  rawTriangles = raw.getIndices().getCount() / 3;
await MeshoptSimplifier.ready;
await doc.transform(
  weld({}),
  simplify({
    simplifier: MeshoptSimplifier,
    ratio: Math.min(1, 28000 / rawTriangles),
    error: kind === "kraken" ? 0.002 : 0.0012,
  }),
);
const mesh = doc.getRoot().listMeshes()[0].listPrimitives()[0],
  p = mesh.getAttribute("POSITION").getArray(),
  norm = mesh.getAttribute("NORMAL").getArray(),
  uv = mesh.getAttribute("TEXCOORD_0").getArray(),
  idx = mesh.getIndices().getArray();
if (p.length / 3 > 65535) throw new Error("Vertex budget exceeded");
const positions = new Float32Array(p.length),
  normals = new Float32Array(norm.length);
// 玛雅兽原始重建有固定横弯；以实测中心线的弧长展开，不通过反向动画掩盖。
const majaPoints = [
  [-0.225, 0, 0.54],
  [-0.225, 0, 0.32],
  [-0.151, 0, 0.1],
  [-0.117, 0, -0.05],
  [-0.081, 0, -0.18],
  [-0.008, 0, -0.3],
  [0.085, 0, -0.4],
  [0.205, 0, -0.47],
  [0.32, 0, -0.47],
  [0.425, 0, -0.45],
];
const curve = new THREE.CatmullRomCurve3(
    majaPoints.map((p) => new THREE.Vector3(...p)),
    false,
    "centripetal",
  ),
  curveLength = curve.getLength();
const stations = Array.from({ length: 801 }, (_, i) => ({
  p: curve.getPointAt(i / 800),
  t: curve.getTangentAt(i / 800),
  s: (i / 800) * curveLength,
}));
const v = new THREE.Vector3(),
  n = new THREE.Vector3(),
  right = new THREE.Vector3(),
  delta = new THREE.Vector3();
for (let i = 0; i < p.length; i += 3) {
  v.fromArray(p, i);
  n.fromArray(norm, i);
  if (kind === "mayan") {
    let nearest = stations[0],
      dist = Infinity;
    for (const s of stations) {
      const d = v.distanceToSquared(s.p);
      if (d < dist) {
        dist = d;
        nearest = s;
      }
    }
    right.set(nearest.t.z, 0, -nearest.t.x).normalize();
    delta.copy(v).sub(nearest.p);
    positions[i] = delta.dot(right);
    positions[i + 1] = v.y;
    positions[i + 2] = nearest.s + delta.dot(nearest.t);
    normals[i] = n.dot(right);
    normals[i + 1] = n.y;
    normals[i + 2] = n.dot(nearest.t);
  } else {
    // 海德拉源模型身体斜向，按躯干—尾柄轴整体旋转；其他源网格头朝 +Z。
    const angle = kind === "hydra" ? -Math.PI / 6 : 0,
      c = Math.cos(angle),
      s = Math.sin(angle);
    const x = v.x * c - v.z * s,
      z = v.x * s + v.z * c;
    positions[i] = -x;
    positions[i + 1] =
      v.y + (kind === "hydra" ? 0.17 : kind === "leviathan" ? -0.025 : 0);
    positions[i + 2] = -z;
    normals[i] = -(n.x * c - n.z * s);
    normals[i + 1] = n.y;
    normals[i + 2] = -(n.x * s + n.z * c);
  }
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(idx), 1));
geometry.computeBoundingBox();
const zCenter = (geometry.boundingBox.min.z + geometry.boundingBox.max.z) / 2,
  scale = 1 / (geometry.boundingBox.max.z - geometry.boundingBox.min.z);
// 刚体轴向转换只用等比尺度；模型中心在横向包络中央，保留真实竖向解剖原点。
const xCenter = (geometry.boundingBox.min.x + geometry.boundingBox.max.x) / 2;
for (let i = 0; i < positions.length; i += 3) {
  positions[i] = (positions[i] - xCenter) * scale;
  positions[i + 1] *= scale;
  positions[i + 2] = (positions[i + 2] - zCenter) * scale;
}
// 非刚性的中心线展开重新计算法线，并对重复 UV 顶点按相同位置平均，避免接缝。
if (kind === "hydra") {
  const centers = [
    [-0.5, 0.12],
    [-0.15, 0.12],
    [-0.05, 0.131],
    [0.05, 0.133],
    [0.15, 0.117],
    [0.25, 0.096],
    [0.35, 0.078],
    [0.5, 0.06],
  ];
  for (let i = 0; i < positions.length; i += 3) {
    const z = positions[i + 2];
    let j = 0;
    while (j < centers.length - 2 && z > centers[j + 1][0]) j++;
    const a = centers[j],
      b = centers[j + 1],
      t = THREE.MathUtils.clamp((z - a[0]) / (b[0] - a[0]), 0, 1);
    positions[i] -= THREE.MathUtils.lerp(a[1], b[1], t);
  }
}
// 前鳍顺水后掠，保持既有领地的通行包络，不通过放宽碰撞来掩盖穿石。
if (kind === "leviathan") {
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i],
      y = positions[i + 1],
      z = positions[i + 2],
      side = Math.sign(x);
    const blend =
      THREE.MathUtils.smoothstep(Math.abs(x), 0.085, 0.14) *
      (1 - THREE.MathUtils.smoothstep(Math.abs(z + 0.24), 0.11, 0.18)) *
      (1 - THREE.MathUtils.smoothstep(y, 0.005, 0.04));
    const angle = -side * 0.72 * blend,
      c = Math.cos(angle),
      s = Math.sin(angle),
      dx = x - side * 0.084,
      dz = z + 0.24;
    positions[i] = side * 0.084 + dx * c + dz * s;
    positions[i + 2] = -0.24 - dx * s + dz * c;
    positions[i + 1] += blend * 0.025;
    const tuck =
      THREE.MathUtils.smoothstep(Math.abs(x), 0.085, 0.13) *
      (1 - THREE.MathUtils.smoothstep(y, 0.005, 0.04));
    positions[i] =
      side * 0.08 + (positions[i] - side * 0.08) * (1 - 0.25 * tuck);
    positions[i + 1] += 0.03 * tuck;
  }
}
if (["mayan", "hydra", "leviathan"].includes(kind)) {
  geometry.computeVertexNormals();
  const a = geometry.attributes.normal,
    groups = new Map();
  for (let i = 0; i < positions.length / 3; i++) {
    const key = [0, 1, 2]
      .map((j) => Math.round(positions[i * 3 + j] * 1e6))
      .join(",");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  for (const ids of groups.values()) {
    v.set(0, 0, 0);
    for (const id of ids) v.add(n.fromBufferAttribute(a, id));
    v.normalize();
    for (const id of ids) a.setXYZ(id, v.x, v.y, v.z);
  }
  // 减面后的退化面可能生成零法线；为同点副本寻找最近的有效表面法线，避免 HDR 中出现 NaN。
  for (const ids of groups.values()) {
    const id = ids[0];
    if (v.fromBufferAttribute(a, id).lengthSq() > 0.5) continue;
    let nearest = -1,
      distance = Infinity;
    for (let j = 0; j < a.count; j++) {
      if (n.fromBufferAttribute(a, j).lengthSq() < 0.5) continue;
      const d =
        (positions[j * 3] - positions[id * 3]) ** 2 +
        (positions[j * 3 + 1] - positions[id * 3 + 1]) ** 2 +
        (positions[j * 3 + 2] - positions[id * 3 + 2]) ** 2;
      if (d < distance) {
        distance = d;
        nearest = j;
      }
    }
    if (nearest < 0) throw new Error("No usable surface normal");
    v.fromBufferAttribute(a, nearest).normalize();
    for (const i of ids) a.setXYZ(i, v.x, v.y, v.z);
  }
  normals.set(a.array);
}
geometry.computeBoundingBox();
const min = geometry.boundingBox.min.toArray(),
  max = geometry.boundingBox.max.toArray(),
  q = new Uint16Array(positions.length),
  normal = new Int16Array(normals.length),
  uv16 = new Uint16Array(uv.length);
for (let i = 0; i < q.length; i++) {
  q[i] = Math.round(
    ((positions[i] - min[i % 3]) / (max[i % 3] - min[i % 3])) * 65535,
  );
  normal[i] = Math.round(Math.max(-1, Math.min(1, normals[i])) * 32767);
}
for (let i = 0; i < uv.length; i++) uv16[i] = Math.round(uv[i] * 65535);
const b64 = (a) =>
    Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64"),
  hash = createHash("sha256")
    .update(await readFile(input))
    .digest("hex");
const asset = {
  format: 1,
  source: "Microsoft TRELLIS.2-4B",
  sourceSha256: hash,
  kind,
  vertices: p.length / 3,
  triangles: idx.length / 3,
  min,
  max,
  position: b64(q),
  normal: b64(normal),
  uv: b64(uv16),
  index: b64(new Uint16Array(idx)),
};
const out = resolve(outArg || "src/assets/models");
await mkdir(out, { recursive: true });
await writeFile(
  join(out, `${kind}_hf_mesh.json`),
  JSON.stringify(asset) + "\n",
);
const sharp = require("sharp"),
  image = mesh.getMaterial().getBaseColorTexture().getImage(),
  decoded = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true }),
  padded = padTextureIslands(
    decoded.data,
    decoded.info.width,
    decoded.info.height,
    uv,
    idx,
  );
await sharp(padded.data, {
  raw: { width: decoded.info.width, height: decoded.info.height, channels: 4 },
})
  .webp({ quality: 92 })
  .toFile(join(out, `${kind}_hf_color.webp`));
console.log(
  JSON.stringify({
    kind,
    sourceSha256: hash,
    rawTriangles,
    vertices: asset.vertices,
    triangles: asset.triangles,
    min,
    max,
    texturePadding: padded.stats,
    out,
  }),
);
