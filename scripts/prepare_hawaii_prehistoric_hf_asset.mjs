/** 将授权导出的蛇颈龙与邓氏鱼网格离线减面、校正中性朝向并量化；保留原始 GLB 作为可审计输入。 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { padTextureIslands } from "./lib/pad_texture_islands.mjs";
const [kind, input, tools, outArg] = process.argv.slice(2);
if (!["plesiosaur", "dunkleosteus"].includes(kind) || !input || !tools)
  throw new Error("Usage: kind raw.glb tools-directory [output-directory]");
const require = createRequire(join(resolve(tools), "package.json")),
  load = (n) => import(pathToFileURL(require.resolve(n)).href);
const { NodeIO } = await load("@gltf-transform/core"),
  { ALL_EXTENSIONS } = await load("@gltf-transform/extensions"),
  { weld, simplify, compactPrimitive } = await load(
    "@gltf-transform/functions",
  ),
  { MeshoptSimplifier } = await load("meshoptimizer");
const doc = await new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .read(resolve(input));
const raw = doc.getRoot().listMeshes()[0].listPrimitives()[0],
  rawTriangles = raw.getIndices().getCount() / 3;
await MeshoptSimplifier.ready;
await doc.transform(weld({}));
if (kind === "dunkleosteus") {
  // Include normal and UV error: position-only reduction folded thin fins and damaged head-plate shading.
  const primitive = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const p = primitive.getAttribute("POSITION").getArray(),
    n = primitive.getAttribute("NORMAL").getArray(),
    uv = primitive.getAttribute("TEXCOORD_0").getArray();
  const attrs = new Float32Array((p.length / 3) * 5);
  for (let i = 0; i < p.length / 3; i++)
    attrs.set(
      [n[3 * i], n[3 * i + 1], n[3 * i + 2], uv[2 * i], uv[2 * i + 1]],
      5 * i,
    );
  // Preserve the thin distal pectoral surfaces: independent front/back collapses intersected after position-only reduction.
  const rotate = new THREE.Matrix4().makeRotationY(Math.PI + 0.575),
    sample = new THREE.Vector3(),
    bounds = new THREE.Box3();
  for (let i = 0; i < p.length; i += 3)
    bounds.expandByPoint(sample.fromArray(p, i).applyMatrix4(rotate));
  const center = bounds.getCenter(new THREE.Vector3()),
    length = bounds.max.z - bounds.min.z,
    locked = new Uint8Array(p.length / 3);
  for (let i = 0; i < locked.length; i++) {
    sample.fromArray(p, i * 3).applyMatrix4(rotate);
    sample.x = (sample.x - center.x) / length;
    sample.y /= length;
    sample.z = (sample.z - center.z) / length;
    if (
      Math.abs(sample.x) > 0.135 &&
      sample.y < -0.08 &&
      sample.z > -0.24 &&
      sample.z < 0.045
    )
      locked[i] = 1;
  }
  const [indices] = MeshoptSimplifier.simplifyWithAttributes(
    new Uint32Array(primitive.getIndices().getArray()),
    p,
    3,
    attrs,
    5,
    [0.5, 0.5, 0.5, 1, 1],
    locked,
    9000 * 3,
    0.014,
  );
  primitive.getIndices().setArray(indices);
  compactPrimitive(primitive);
} else {
  await doc.transform(
    simplify({
      simplifier: MeshoptSimplifier,
      ratio: Math.min(1, 6800 / rawTriangles),
      error: 0.006,
    }),
  );
}

const mesh = doc.getRoot().listMeshes()[0].listPrimitives()[0],
  p = mesh.getAttribute("POSITION").getArray(),
  norm = mesh.getAttribute("NORMAL").getArray(),
  originalUV = mesh.getAttribute("TEXCOORD_0").getArray();
let uv = originalUV,
  idx = mesh.getIndices().getArray();
if (p.length / 3 > 65535) throw new Error("Vertex budget exceeded");
let positions = new Float32Array(p.length),
  normals = new Float32Array(norm.length);
// 原始蛇颈龙头朝 +X；邓氏鱼头尾轴在 XZ 平面偏转约0.575弧度。
const v = new THREE.Vector3(),
  n = new THREE.Vector3();
const yaw = kind === "plesiosaur" ? Math.PI / 2 : Math.PI + 0.575;
const rotation = new THREE.Matrix4().makeRotationY(yaw);
for (let i = 0; i < p.length; i += 3) {
  v.fromArray(p, i).applyMatrix4(rotation);
  v.toArray(positions, i);
  n.fromArray(norm, i).transformDirection(rotation);
  n.toArray(normals, i);
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

// 实际邓氏鱼中性背线偏弯；按无鳍躯干截面平滑对齐，不借动画反向抵消。
if (kind === "dunkleosteus") {
  const stations = [
    [-0.5, -0.055],
    [-0.35, -0.03],
    [-0.2, 0],
    [0, 0.02],
    [0.18, 0.025],
    [0.31, -0.006],
    [0.4, -0.04],
    [0.5, -0.075],
  ];
  for (let i = 0; i < positions.length; i += 3) {
    const z = positions[i + 2];
    let j = 0;
    while (j < stations.length - 2 && z > stations[j + 1][0]) j++;
    const [a, x0] = stations[j],
      [b, x1] = stations[j + 1],
      t = THREE.MathUtils.smoothstep(z, a, b);
    positions[i] -= THREE.MathUtils.lerp(x0, x1, t);
    const u = THREE.MathUtils.clamp((z - a) / (b - a), 0, 1),
      derivative = ((x1 - x0) * 6 * u * (1 - u)) / (b - a);
    n.fromArray(normals, i);
    n.z += derivative * n.x;
    n.normalize().toArray(normals, i);
  }
}

// 原始蛇颈龙右后肢重建出多余分叉；保留完整的左半侧并在中线裁切镜像。
// 每条穿越中线的三角形插值位置/UV，反侧反转绕序，避免简单删除造成开口。
if (kind === "plesiosaur") {
  const points = [],
    texcoords = [],
    indices = [],
    unique = new Map();
  const add = (v, mirror) => {
    const a = [mirror ? -v[0] : v[0], v[1], v[2], v[3], v[4]];
    const key = a.map((n) => Math.round(n * 1e7)).join(",");
    if (!unique.has(key)) {
      unique.set(key, points.length / 3);
      points.push(...a.slice(0, 3));
      texcoords.push(...a.slice(3));
    }
    return unique.get(key);
  };
  for (let i = 0; i < idx.length; i += 3) {
    let poly = [0, 1, 2].map((j) => {
      const id = idx[i + j];
      return [
        ...positions.slice(id * 3, id * 3 + 3),
        uv[id * 2],
        uv[id * 2 + 1],
      ];
    });
    const clipped = [];
    for (let j = 0; j < poly.length; j++) {
      const a = poly[j],
        b = poly[(j + 1) % poly.length],
        ai = a[0] <= 0,
        bi = b[0] <= 0;
      if (ai) clipped.push(a);
      if (ai !== bi) {
        const t = -a[0] / (b[0] - a[0]);
        const c = a.map((v, k) => v + (b[k] - v) * t);
        c[0] = 0;
        clipped.push(c);
      }
    }
    for (let j = 1; j < clipped.length - 1; j++) {
      const tri = [clipped[0], clipped[j], clipped[j + 1]];
      indices.push(...tri.map((v) => add(v, false)));
      indices.push(...tri.toReversed().map((v) => add(v, true)));
    }
  }
  positions = new Float32Array(points);
  normals = new Float32Array(points.length);
  uv = new Float32Array(texcoords);
  idx = new Uint16Array(indices);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(idx, 1));
}

{
  // 装甲鱼保留原始平滑法线并按中线剪切变换；重算法线会放大薄鳍的细碎折面。
  if (kind === "plesiosaur") geometry.computeVertexNormals();
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
    if (kind === "dunkleosteus") {
      // 原始贴图缝两侧已具有连续法线；保留它们，避免薄鳍正反面相互抵消。
      for (const id of ids) {
        v.fromBufferAttribute(a, id).normalize();
        a.setXYZ(id, v.x, v.y, v.z);
      }
    } else {
      v.set(0, 0, 0);
      for (const id of ids) v.add(n.fromBufferAttribute(a, id));
      v.normalize();
      for (const id of ids) a.setXYZ(id, v.x, v.y, v.z);
    }
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
  vertices: positions.length / 3,
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
