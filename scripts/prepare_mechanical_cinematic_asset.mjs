/**
 * 将已获授权导出的 TRELLIS GLB 减面并量化；工具依赖仅装在单独临时目录。
 * 用法：node scripts/prepare_mechanical_cinematic_asset.mjs raw.glb tools-dir [output-dir]
 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const [input, toolDirectory, outputDirectory] = process.argv.slice(2);
if (!input || !toolDirectory) {
  throw new Error(
    "Usage: node scripts/prepare_mechanical_cinematic_asset.mjs raw.glb tools-dir [output-dir]",
  );
}
const require = createRequire(join(resolve(toolDirectory), "package.json"));
const load = (name) => import(pathToFileURL(require.resolve(name)).href);
const { NodeIO } = await load("@gltf-transform/core");
const { ALL_EXTENSIONS } = await load("@gltf-transform/extensions");
const { weld, simplify } = await load("@gltf-transform/functions");
const { MeshoptSimplifier } = await load("meshoptimizer");
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(resolve(input));
await MeshoptSimplifier.ready;
await doc.transform(
  weld({}),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.28, error: 0.0015 }),
);
const meshes = doc.getRoot().listMeshes();
if (meshes.length !== 1 || meshes[0].listPrimitives().length !== 1)
  throw new Error("Expected one opaque primitive");
const mesh = meshes[0].listPrimitives()[0];
const p = mesh.getAttribute("POSITION").getArray(),
  n = mesh.getAttribute("NORMAL").getArray(),
  uv = mesh.getAttribute("TEXCOORD_0").getArray(),
  idx = mesh.getIndices().getArray();
if (p.length / 3 > 65535 || mesh.getMaterial().getAlphaMode() !== "OPAQUE")
  throw new Error(
    `Unexpected mesh budget/material: ${p.length / 3} vertices, ${mesh.getMaterial().getAlphaMode()}`,
  );
let pos = new Float32Array(p.length),
  normal = new Int16Array(n.length),
  uv16 = new Uint16Array(uv.length),
  index = new Uint16Array(idx);
const lo = [Infinity, Infinity, Infinity],
  hi = [-Infinity, -Infinity, -Infinity];
// 本次实际导出头朝+Z、Y向上，中线偏差不到0.002；无需借用旧模型的尾部校正。
let zMin = Infinity,
  zMax = -Infinity;
for (let i = 2; i < p.length; i += 3) {
  zMin = Math.min(zMin, -p[i]);
  zMax = Math.max(zMax, -p[i]);
}
const scale = 0.99 / (zMax - zMin),
  centerZ = (zMin + zMax) / 2;
// 将原上下喷口收整为连续的尾柄联轴段。保留拓扑/UV，不切出开口；
// 区域外严格保持原网格，法线使用形变 Jacobian 的逆转置。
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const tailScale = (z) =>
  1 - 0.7 * smooth(0.205, 0.245, z) * (1 - smooth(0.327, 0.355, z));
for (let i = 0; i < p.length; i += 3) {
  const transverse = -p[i] * scale,
    abs = Math.abs(transverse);
  // 实测原翼展0.758，收窄外翼到既有可通行包络，保留原根部和完整翼板。
  const lateralScale = abs > 0.11 ? 0.65 : 1;
  pos[i] =
    Math.sign(transverse) * (abs > 0.11 ? 0.11 + (abs - 0.11) * 0.65 : abs);
  const sourceY = (p[i + 1] + 0.04) * scale,
    targetZ = (-p[i + 2] - centerZ) * scale,
    compression = tailScale(targetZ),
    slope = (tailScale(targetZ + 1e-5) - tailScale(targetZ - 1e-5)) / 2e-5;
  pos[i + 1] = 0.039 + (sourceY - 0.039) * compression;
  pos[i + 2] = targetZ;
  const x = -n[i] / lateralScale,
    y = n[i + 1] / compression,
    z = -n[i + 2] - ((sourceY - 0.039) * slope * n[i + 1]) / compression;
  const size = Math.hypot(x, y, z) || 1;
  normal[i] = Math.round((x / size) * 32767);
  normal[i + 1] = Math.round((y / size) * 32767);
  normal[i + 2] = Math.round((z / size) * 32767);
}
// 将较完整的一侧沿矫正后的中线镜像。切面插值保留UV/法线，保持成对机械部件和中线对称。
const newP = [],
  newN = [],
  newUv = [],
  newIndices = [],
  unique = new Map();
const vertex = (i) => ({
  p: Array.from(pos.slice(i * 3, i * 3 + 3)),
  n: Array.from(normal.slice(i * 3, i * 3 + 3), (v) => v / 32767),
  uv: Array.from(uv.slice(i * 2, i * 2 + 2)),
});
function crossing(a, b) {
  const t = -a.p[0] / (b.p[0] - a.p[0]);
  const lerp = (x, y) => x.map((v, i) => v + (y[i] - v) * t);
  return {
    p: [0, ...lerp(a.p, b.p).slice(1)],
    n: lerp(a.n, b.n),
    uv: lerp(a.uv, b.uv),
  };
}
function append(v, mirror) {
  const point = [v.p[0] * (mirror ? -1 : 1), v.p[1], v.p[2]];
  const n = [
    Math.abs(v.p[0]) < 1e-7 ? 0 : v.n[0] * (mirror ? -1 : 1),
    v.n[1],
    v.n[2],
  ];
  const length = Math.hypot(...n) || 1;
  n.forEach((v, i) => (n[i] = v / length));
  const key = [...point, ...n, ...v.uv].map((v) => v.toFixed(7)).join(",");
  if (unique.has(key)) return unique.get(key);
  const id = newP.length / 3;
  unique.set(key, id);
  newP.push(...point);
  newN.push(...n);
  newUv.push(...v.uv);
  return id;
}
for (let i = 0; i < idx.length; i += 3) {
  const tri = [vertex(idx[i]), vertex(idx[i + 1]), vertex(idx[i + 2])],
    clipped = [];
  for (let k = 0; k < 3; k++) {
    const a = tri[k],
      b = tri[(k + 1) % 3],
      inside = a.p[0] <= 0,
      next = b.p[0] <= 0;
    if (inside) clipped.push(a);
    if (inside !== next) clipped.push(crossing(a, b));
  }
  for (let j = 1; j < clipped.length - 1; j++) {
    const face = [clipped[0], clipped[j], clipped[j + 1]];
    newIndices.push(...face.map((v) => append(v, false)));
    newIndices.push(
      ...face
        .slice()
        .reverse()
        .map((v) => append(v, true)),
    );
  }
}
if (newP.length / 3 > 65535)
  throw new Error("Symmetric model exceeds U16 vertex budget");
pos = new Float32Array(newP);
normal = new Int16Array(newN.map((v) => Math.round(v * 32767)));
uv16 = new Uint16Array(
  newUv.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 65535)),
);
index = new Uint16Array(newIndices);
lo.fill(Infinity);
hi.fill(-Infinity);
for (let i = 0; i < pos.length; i++) {
  lo[i % 3] = Math.min(lo[i % 3], pos[i]);
  hi[i % 3] = Math.max(hi[i % 3], pos[i]);
}
const q = new Uint16Array(pos.length);
for (let i = 0; i < q.length; i++)
  q[i] = Math.round(((pos[i] - lo[i % 3]) / (hi[i % 3] - lo[i % 3])) * 65535);
const base64 = (a) =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
const asset = {
  format: 1,
  source: "Microsoft TRELLIS.2-4B",
  vertices: pos.length / 3,
  triangles: index.length / 3,
  min: lo,
  max: hi,
  position: base64(q),
  normal: base64(normal),
  uv: base64(uv16),
  index: base64(index),
};
const out = outputDirectory
  ? resolve(outputDirectory)
  : fileURLToPath(new URL("../src/assets/models/", import.meta.url));
await mkdir(out, { recursive: true });
await writeFile(
  join(out, "mechanical_shark_cinematic_mesh.json"),
  JSON.stringify(asset) + "\n",
);
for (const [key, name] of [
  ["getBaseColorTexture", "color"],
  ["getMetallicRoughnessTexture", "surface"],
]) {
  const tex = mesh.getMaterial()[key]();
  if (tex.getMimeType() !== "image/webp")
    throw new Error("Expected WebP image");
  await writeFile(
    join(out, `mechanical_shark_cinematic_${name}.webp`),
    tex.getImage(),
  );
}
console.log(
  JSON.stringify({
    sourceSha256: createHash("sha256")
      .update(await readFile(input))
      .digest("hex"),
    vertices: asset.vertices,
    triangles: asset.triangles,
    min: lo,
    max: hi,
    out,
  }),
);
