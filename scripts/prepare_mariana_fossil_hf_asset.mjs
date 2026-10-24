/** 海沟化石浮雕离线减面、刚性校正朝向，并投射原始 HF 色图到新 UV 图集。 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
const [kind, input, tools, yawArg, outArg, bakeTools] = process.argv.slice(2);
if (
  !["mariana_fossil"].includes(kind) ||
  !input ||
  !tools ||
  !Number.isFinite(Number(yawArg))
)
  throw new Error(
    "Usage: mariana_fossil raw.glb tools-directory yaw-radians output-directory bake-tools-directory",
  );
const require = createRequire(join(resolve(tools), "package.json")),
  load = (n) => import(pathToFileURL(require.resolve(n)).href);
const { NodeIO } = await load("@gltf-transform/core"),
  { ALL_EXTENSIONS } = await load("@gltf-transform/extensions"),
  { MeshoptSimplifier } = await load("meshoptimizer");
const { mergeVertices } = await import(
  "three/addons/utils/BufferGeometryUtils.js"
);
const doc = await new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .read(resolve(input));
const raw = doc.getRoot().listMeshes()[0].listPrimitives()[0],
  rawTriangles = raw.getIndices().getCount() / 3;
await MeshoptSimplifier.ready;
// 新图集会重新投色，先焊接仅因旧 UV 产生的重复顶点，避免逐岛减面撕开壳体。
const sourceGeometry = new THREE.BufferGeometry();
sourceGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(raw.getAttribute("POSITION").getArray(), 3),
);
sourceGeometry.setIndex(
  new THREE.BufferAttribute(raw.getIndices().getArray(), 1),
);
// 浮雕是薄石板：从原始实体的上下表面取样，生成闭合、无内层折片的专用网格。
// 该离线步骤只适用于近似高度场的化石石板，不用于动物或可进入建筑。
const bakeRequire = createRequire(join(resolve(bakeTools), "package.json"));
const { MeshBVH } = await import(
  pathToFileURL(bakeRequire.resolve("three-mesh-bvh")).href
);
const bvh = new MeshBVH(sourceGeometry, { indirect: true });
sourceGeometry.computeBoundingBox();
const rawBox = sourceGeometry.boundingBox,
  grid = 160,
  sample = [],
  topPositions = [],
  bottomPositions = [],
  topFaces = [],
  ray = new THREE.Ray(),
  span = rawBox.getSize(new THREE.Vector3());
for (let z = 0; z <= grid; z++) {
  sample[z] = [];
  for (let x = 0; x <= grid; x++) {
    const px = rawBox.min.x + (span.x * x) / grid,
      pz = rawBox.min.z + (span.z * z) / grid;
    ray.origin.set(px, rawBox.max.y + 1, pz);
    ray.direction.set(0, -1, 0);
    const top = bvh.raycastFirst(ray, THREE.DoubleSide);
    ray.origin.set(px, rawBox.min.y - 1, pz);
    ray.direction.set(0, 1, 0);
    const bottom = bvh.raycastFirst(ray, THREE.DoubleSide);
    if (!top || !bottom || top.point.y - bottom.point.y < 0.001) {
      sample[z][x] = -1;
      continue;
    }
    sample[z][x] = topPositions.length / 3;
    topPositions.push(px, top.point.y, pz);
    bottomPositions.push(px, bottom.point.y, pz);
  }
}
for (let z = 0; z < grid; z++)
  for (let x = 0; x < grid; x++) {
    const a = sample[z][x],
      b = sample[z][x + 1],
      c = sample[z + 1][x],
      d = sample[z + 1][x + 1];
    if (Math.min(a, b, c) >= 0) topFaces.push(a, c, b);
    if (Math.min(b, c, d) >= 0) topFaces.push(b, c, d);
  }
const count = topPositions.length / 3,
  solidIndices = [...topFaces],
  edgeMap = new Map();
for (let t = 0; t < topFaces.length; t += 3) {
  const [a, b, c] = topFaces.slice(t, t + 3);
  solidIndices.push(a + count, c + count, b + count);
  for (const [u, v] of [
    [a, b],
    [b, c],
    [c, a],
  ]) {
    const key = u < v ? `${u},${v}` : `${v},${u}`;
    if (edgeMap.has(key)) edgeMap.delete(key);
    else edgeMap.set(key, [u, v]);
  }
}
for (const [a, b] of edgeMap.values())
  solidIndices.push(b, a, a + count, b, a + count, b + count);
const solid = new THREE.BufferGeometry();
solid.setAttribute(
  "position",
  new THREE.Float32BufferAttribute([...topPositions, ...bottomPositions], 3),
);
solid.setIndex(solidIndices);
const welded = mergeVertices(solid, 1e-6);
welded.computeVertexNormals();
const [reduced] = MeshoptSimplifier.simplifyWithAttributes(
  new Uint32Array(welded.index.array),
  welded.getAttribute("position").array,
  3,
  welded.getAttribute("normal").array,
  3,
  [0.1, 0.1, 0.1],
  null,
  { mariana_fossil: 3500 }[kind] * 3,
  0.008,
  ["LockBorder"],
);
const remap = new Map(),
  compactPositions = [],
  compactIndices = [];
// 删去减面后退化的极细边缘面，再紧凑索引；无面积面不能进入 UV 展开。
const clean = [],
  pa = new THREE.Vector3(),
  pb = new THREE.Vector3(),
  pc = new THREE.Vector3();
for (let t = 0; t < reduced.length; t += 3) {
  const a = reduced[t],
    b = reduced[t + 1],
    c = reduced[t + 2];
  pa.fromBufferAttribute(welded.attributes.position, a);
  pb.fromBufferAttribute(welded.attributes.position, b).sub(pa);
  pc.fromBufferAttribute(welded.attributes.position, c).sub(pa);
  if (a === b || a === c || b === c || pb.cross(pc).lengthSq() < 1e-14)
    continue;
  clean.push(a, b, c);
}
for (const id of clean) {
  if (!remap.has(id)) {
    remap.set(id, remap.size);
    compactPositions.push(
      ...welded.getAttribute("position").array.subarray(id * 3, id * 3 + 3),
    );
  }
  compactIndices.push(remap.get(id));
}
const simplified = new THREE.BufferGeometry();
simplified.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(compactPositions, 3),
);
simplified.setIndex(compactIndices);
// 用闭合网格的实际拓扑生成法线，再由新 UV 图集复制到缝边。
simplified.computeVertexNormals();
const p = simplified.getAttribute("position").array,
  norm = simplified.getAttribute("normal").array;
const uv = new Float32Array((p.length / 3) * 2),
  idx = new Uint16Array(compactIndices);
if (p.length / 3 > 65535) throw Error("Vertex budget exceeded");
let positions = new Float32Array(p.length),
  normals = new Float32Array(norm.length);
const v = new THREE.Vector3(),
  n = new THREE.Vector3();
// 根据原始灰模确定朝向，保留刚性变换与统一缩放。
const yaw = Number(yawArg),
  pitch = 0,
  rotation = new THREE.Matrix4()
    .makeRotationY(yaw)
    .multiply(new THREE.Matrix4().makeRotationX(pitch));
for (let i = 0; i < p.length; i += 3) {
  v.fromArray(p, i).applyMatrix4(rotation).toArray(positions, i);
  n.fromArray(norm, i).transformDirection(rotation).toArray(normals, i);
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(idx), 1));
geometry.computeBoundingBox();
const center = geometry.boundingBox.getCenter(new THREE.Vector3()),
  scale =
    1 /
    Math.max(
      geometry.boundingBox.max.z - geometry.boundingBox.min.z,
      geometry.boundingBox.max.x - geometry.boundingBox.min.x,
    );
for (let i = 0; i < positions.length; i += 3) {
  positions[i] = (positions[i] - center.x) * scale;
  positions[i + 1] = (positions[i + 1] - center.y) * scale;
  positions[i + 2] = (positions[i + 2] - center.z) * scale;
}
// 保留新拓扑上的有效法线，仅修复无效向量。
let repairedNormals = 0;
for (let i = 0; i < normals.length; i += 3) {
  n.fromArray(normals, i);
  if (n.lengthSq() < 0.01) {
    let nearest = -1,
      distance = Infinity;
    for (let j = 0; j < normals.length; j += 3) {
      if (new THREE.Vector3().fromArray(normals, j).lengthSq() < 0.5) continue;
      const d =
        (positions[i] - positions[j]) ** 2 +
        (positions[i + 1] - positions[j + 1]) ** 2 +
        (positions[i + 2] - positions[j + 2]) ** 2;
      if (d < distance) {
        distance = d;
        nearest = j;
      }
    }
    if (nearest < 0) throw new Error("No valid surface normal");
    n.fromArray(normals, nearest);
    repairedNormals++;
  }
  n.normalize().toArray(normals, i);
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
  yaw,
  pitch,
  sourceNormalization: { center: center.toArray(), scale },
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
const sharp = require("sharp");
console.log(
  JSON.stringify({
    kind,
    sourceSha256: hash,
    rawTriangles,
    normalStrategy: "area-weighted reduced surface before UV splits",
    triangles: asset.triangles,
    vertices: asset.vertices,
    min,
    max,
    repairedNormals,
    out,
  }),
);

if (!bakeTools) throw Error("Atlas baking requires bake tools");
const { execFileSync } = await import("node:child_process");
execFileSync(
  process.execPath,
  [
    "scripts/rebake_hawaii_ship_hf_asset.mjs",
    input,
    join(out, `${kind}_hf_mesh.json`),
    tools,
    bakeTools,
    out,
    "0.12",
  ],
  { stdio: "inherit" },
);

// 后备顶点色采样同一图集，网络断载时仍保留矿物配色。
const finalPath = join(out, `${kind}_hf_mesh.json`);
const final = JSON.parse(await readFile(finalPath, "utf8"));
const atlasPath = join(out, `${kind}_hf_color.webp`);
const resizedAtlas = await sharp(atlasPath)
  .resize(1024, 1024)
  .webp({ quality: 94 })
  .toBuffer();
await writeFile(atlasPath, resizedAtlas);
const colorPixels = await sharp(atlasPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const decode = (value, Type) =>
  new Type(Uint8Array.from(Buffer.from(value, "base64")).buffer);
const coords = decode(final.uv, Uint16Array),
  colors = new Uint8Array(final.vertices * 3);
for (let i = 0; i < final.vertices; i++) {
  const x = Math.min(
    colorPixels.info.width - 1,
    Math.round((coords[i * 2] / 65535) * (colorPixels.info.width - 1)),
  );
  const y = Math.min(
    colorPixels.info.height - 1,
    Math.round((coords[i * 2 + 1] / 65535) * (colorPixels.info.height - 1)),
  );
  const p = (y * colorPixels.info.width + x) * 4;
  for (let c = 0; c < 3; c++) {
    const value = colorPixels.data[p + c] / 255;
    colors[i * 3 + c] = Math.round(
      255 *
        (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4),
    );
  }
}
final.color = b64(colors);
final.normalization =
  "Uniform length 1 along local Z; placement is owned by the Mariana landmark factory";
await writeFile(finalPath, JSON.stringify(final) + "\n");

// 小型浮雕共用512色图；保留完整原始图集在离线证据目录。
const colorPath = join(out, `${kind}_hf_color.webp`);
const color512 = await sharp(await readFile(colorPath))
  .resize(512, 512)
  .webp({ quality: 90 })
  .toBuffer();
await writeFile(colorPath, color512);
