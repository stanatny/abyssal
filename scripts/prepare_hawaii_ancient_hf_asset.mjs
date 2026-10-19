/** 将授权导出的巨齿鲨与龙王鲸网格离线减面、校正中性朝向并量化；保留原始 GLB 作为可审计输入。 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { padTextureIslands } from "./lib/pad_texture_islands.mjs";
const [kind, input, tools, outArg] = process.argv.slice(2);
if (!["megalodon", "basilosaurus"].includes(kind) || !input || !tools)
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
    ratio: Math.min(1, 7000 / rawTriangles),
    error: 0.006,
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
// 两个实际原始网格均朝 +Z；经多视角验证后刚体旋转到游戏的 -Z。
const v = new THREE.Vector3(),
  n = new THREE.Vector3();
for (let i = 0; i < p.length; i += 3) {
  positions[i] = -p[i];
  positions[i + 1] = p[i + 1];
  positions[i + 2] = -p[i + 2];
  normals[i] = -norm[i];
  normals[i + 1] = norm[i + 1];
  normals[i + 2] = -norm[i + 2];
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
// 龙王鲸导出的左右尾叶带有不同的静态卷曲；只压平尾叶，保留尾柄和厚度。
if (kind === "basilosaurus") {
  for (let i = 0; i < positions.length; i += 3) {
    const leaf = THREE.MathUtils.smoothstep(positions[i + 2], 0.42, 0.45);
    positions[i + 1] = THREE.MathUtils.lerp(
      positions[i + 1],
      0.02 + (positions[i + 1] - 0.02) * 0.28,
      leaf,
    );
    // 原始左尾叶近乎侧立，压平后弦宽不足；恢复与右尾叶相当的平面宽度。
    if (positions[i] < 0) {
      const outer =
        leaf * THREE.MathUtils.smoothstep(-positions[i], 0.025, 0.06);
      positions[i + 2] = THREE.MathUtils.lerp(
        positions[i + 2],
        0.474 + (positions[i + 2] - 0.474) * 2.3,
        outer,
      );
    }
  }
}
{
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
