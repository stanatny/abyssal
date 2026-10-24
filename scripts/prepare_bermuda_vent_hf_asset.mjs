/** 热液矿物烟囱离线减面、刚性校正朝向，并投射原始 HF 色图到新 UV 图集。 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
const [kind, input, tools, yawArg, outArg, bakeTools] = process.argv.slice(2);
if (
  kind !== "bermuda_vent" ||
  !input ||
  !tools ||
  !Number.isFinite(Number(yawArg))
)
  throw new Error(
    "Usage: bermuda_vent raw.glb tools-directory yaw-radians output-directory bake-tools-directory",
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
const welded = mergeVertices(sourceGeometry, 1e-5);
const [reduced] = MeshoptSimplifier.simplify(
  new Uint32Array(welded.index.array),
  welded.getAttribute("position").array,
  3,
  4500 * 3,
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
// 减面只改变拓扑；着色法线从原始曲面重心插值，避免把平滑壳体变成低面塑料。
const bakeReq = createRequire(join(resolve(bakeTools), "package.json"));
const { MeshBVH, getTriangleHitPointInfo } = await import(
  pathToFileURL(bakeReq.resolve("three-mesh-bvh")).href
);
const bvh = new MeshBVH(sourceGeometry, { indirect: true });
// 薄片两面的最近点可能互换；用保留三角形的定向约束投射法线，避免黑色三角斑。
simplified.computeVertexNormals();
const orientedNormals = simplified.attributes.normal;
const orientation = new THREE.Vector3();
let normalOrientationCorrections = 0;
const sourceNormals = raw.getAttribute("NORMAL").getArray();
const restoredNormals = new Float32Array(compactPositions.length);
const normalPoint = new THREE.Vector3(),
  normalValue = new THREE.Vector3(),
  normalPart = new THREE.Vector3();
for (let i = 0; i < compactPositions.length; i += 3) {
  normalPoint.fromArray(compactPositions, i);
  const hit = bvh.closestPointToPoint(normalPoint),
    info = getTriangleHitPointInfo(hit.point, sourceGeometry, hit.faceIndex);
  normalValue.set(0, 0, 0);
  for (const [id, weight] of [
    [info.face.a, info.barycoord.x],
    [info.face.b, info.barycoord.y],
    [info.face.c, info.barycoord.z],
  ])
    normalValue.addScaledVector(
      normalPart.fromArray(sourceNormals, id * 3),
      weight,
    );
  orientation.fromBufferAttribute(orientedNormals, i / 3);
  if (normalValue.dot(orientation) < 0) {
    normalValue.negate();
    normalOrientationCorrections++;
  }
  normalValue.normalize().toArray(restoredNormals, i);
}
simplified.setAttribute(
  "normal",
  new THREE.BufferAttribute(restoredNormals, 3),
);
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
  scale = 1 / (geometry.boundingBox.max.z - geometry.boundingBox.min.z);
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
    normalOrientationCorrections,
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
  "Uniform length 1 along local Z; mineral chimney placement is owned by the Bermuda vent factory";
await writeFile(finalPath, JSON.stringify(final) + "\n");
