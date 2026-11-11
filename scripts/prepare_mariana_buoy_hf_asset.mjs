/** 浮标离线减面、转移原始法线与色图；仅作全高统一归一化，水线适配由后续步骤负责。 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
const [input, tools, bakeTools, outArg, yawArg = "0"] = process.argv.slice(2);
const kind = "mariana_buoy";
if (
  !input ||
  !tools ||
  !bakeTools ||
  !outArg ||
  !Number.isFinite(Number(yawArg))
)
  throw new Error("Usage: raw.glb base-tools bake-tools out-dir [yaw-radians]");
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
const meshes = doc.getRoot().listMeshes();
if (meshes.length !== 1 || meshes[0].listPrimitives().length !== 1)
  throw new Error(
    "Expected exactly one mesh and one primitive; inspect multi-part source before conversion",
  );
const raw = meshes[0].listPrimitives()[0];
if (
  !raw.getIndices() ||
  !raw.getAttribute("POSITION") ||
  !raw.getAttribute("NORMAL") ||
  !raw.getAttribute("TEXCOORD_0") ||
  !raw.getMaterial()?.getBaseColorTexture()
)
  throw new Error(
    "Source must contain indexed positions, normals, UVs and a base-color texture",
  );
if (raw.getMode() !== 4 || raw.getIndices().getCount() % 3 !== 0)
  throw new Error("Expected indexed triangle geometry");
const rawTriangles = raw.getIndices().getCount() / 3;
// 保存完整原始包围盒输入；焊接和紧凑顶点之后仍以同一原始尺度重烘焙。
const originalPositions = raw.getAttribute("POSITION").getArray().slice();
await MeshoptSimplifier.ready;
// 旧 UV 会重新展开；仅焊接位置和法线相同的顶点，保留真实硬边与薄板两侧。
const sourceGeometry = new THREE.BufferGeometry();
sourceGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(raw.getAttribute("POSITION").getArray(), 3),
);
sourceGeometry.setAttribute(
  "normal",
  new THREE.BufferAttribute(raw.getAttribute("NORMAL").getArray(), 3),
);
sourceGeometry.setIndex(
  new THREE.BufferAttribute(raw.getIndices().getArray(), 1),
);
const welded = mergeVertices(sourceGeometry, 1e-5),
  rawP = welded.getAttribute("position").array,
  rawN = welded.getAttribute("normal").array;
// 法线误差直接参与选择；不跨属性硬边，不重算法线，也不作近点改向。
const [reduced, simplificationError] = MeshoptSimplifier.simplifyWithAttributes(
  new Uint32Array(welded.index.array),
  rawP,
  3,
  rawN,
  3,
  [1, 1, 1],
  null,
  Math.min(16000 * 3, welded.index.count),
  0.012,
  [],
);
const clean = [],
  pa = new THREE.Vector3(),
  pb = new THREE.Vector3(),
  pc = new THREE.Vector3();
for (let t = 0; t < reduced.length; t += 3) {
  const a = reduced[t],
    b = reduced[t + 1],
    c = reduced[t + 2];
  pa.fromArray(rawP, a * 3);
  pb.fromArray(rawP, b * 3).sub(pa);
  pc.fromArray(rawP, c * 3).sub(pa);
  if (a === b || a === c || b === c || pb.cross(pc).lengthSq() < 1e-14)
    continue;
  clean.push(a, b, c);
}
// 紧凑索引仍逐个复制所选源顶点与源法线；旧 UV 不再进入最终几何。
const remap = new Map(),
  compactP = [],
  compactN = [],
  compactI = [];
for (const id of clean) {
  if (!remap.has(id)) {
    remap.set(id, remap.size);
    compactP.push(...rawP.subarray(id * 3, id * 3 + 3));
    compactN.push(...rawN.subarray(id * 3, id * 3 + 3));
  }
  compactI.push(remap.get(id));
}
const p = new Float32Array(compactP),
  norm = new Float32Array(compactN),
  uv = new Float32Array((p.length / 3) * 2),
  idx = new Uint32Array(compactI);
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
// 归一化参考完整原始曲面，不能让减面丢失的天线尖端改变比例或重烘焙反投射。
const rawBounds = new THREE.Box3();
for (let i = 0; i < originalPositions.length; i += 3) {
  v.fromArray(originalPositions, i).applyMatrix4(rotation);
  if (![v.x, v.y, v.z].every(Number.isFinite))
    throw new Error("Source contains non-finite positions");
  rawBounds.expandByPoint(v);
}
const center = rawBounds.getCenter(new THREE.Vector3()),
  rawHeight = rawBounds.max.y - rawBounds.min.y;
if (!(rawHeight > 0))
  throw new Error("Source must have a positive full height");
const scale = 1 / rawHeight;
for (let i = 0; i < positions.length; i += 3) {
  positions[i] = (positions[i] - center.x) * scale;
  positions[i + 1] = (positions[i + 1] - center.y) * scale;
  positions[i + 2] = (positions[i + 2] - center.z) * scale;
}
// 保留原始曲面的有效法线，仅修复无效向量。
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
  simplification: {
    method:
      "meshopt normal-bound selection after position-and-normal seam-preserving weld",
    sourceAttributes: ["POSITION", "NORMAL"],
    attributeWeights: [1, 1, 1],
    error: simplificationError,
    actualTriangles: idx.length / 3,
  },
  vertices: positions.length / 3,
  triangles: idx.length / 3,
  min,
  max,
  position: b64(q),
  normal: b64(normal),
  uv: b64(uv16),
  index: b64(new Uint16Array(idx)),
};
const out = resolve(outArg);
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
    retainedSourceNormals: true,
    simplificationError,
    triangles: asset.triangles,
    vertices: asset.vertices,
    min,
    max,
    repairedNormals,
    out,
  }),
);

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
  ],
  { stdio: "inherit" },
);

// 后备顶点色采样同一图集，网络断载时仍保留原始浮标配色。
const finalPath = join(out, `${kind}_hf_mesh.json`);
const final = JSON.parse(await readFile(finalPath, "utf8"));
if (final.vertices > 65535)
  throw new Error(
    "Atlas vertex budget exceeded; inspect simplification before use",
  );
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
  "Uniform original full height 1 along local Y; centered at the complete original bounds; waterline and world fitting are deferred";
await writeFile(finalPath, JSON.stringify(final) + "\n");
console.log(
  JSON.stringify({
    kind,
    stage: "uniform_normalized_intermediate",
    triangles: final.triangles,
    vertices: final.vertices,
    min: final.min,
    max: final.max,
    sourceNormalization: final.sourceNormalization,
    out,
  }),
);
