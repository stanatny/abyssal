/**
 * 将已获授权导出的 TRELLIS GLB 减面并量化；工具依赖仅装在单独临时目录。
 * 用法：node scripts/prepare_mechanical_hf_asset.mjs raw.glb tools-dir [output-dir]
 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const [input, toolDirectory, outputDirectory] = process.argv.slice(2);
if (!input || !toolDirectory) {
  throw new Error(
    "Usage: node scripts/prepare_mechanical_hf_asset.mjs raw.glb tools-dir [output-dir]",
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
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.3, error: 0.004 }),
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
  throw new Error("Unexpected mesh budget/material");
const pos = new Float32Array(p.length),
  normal = new Int16Array(n.length),
  uv16 = new Uint16Array(uv.length),
  index = new Uint16Array(idx);
const lo = [Infinity, Infinity, Infinity],
  hi = [-Infinity, -Infinity, -Infinity];
// 该导出头朝+Z、Y向上；统一旋转为游戏头朝-Z，等比保留装甲/胸鳍。
// 顶视与躯干截面已核实为直尾，不能套用另一模型的校直曲线。
let zMin = Infinity,
  zMax = -Infinity;
for (let i = 2; i < p.length; i += 3) {
  zMin = Math.min(zMin, p[i]);
  zMax = Math.max(zMax, p[i]);
}
const scale = 0.99 / (zMax - zMin),
  centerZ = (zMin + zMax) / 2;

for (let i = 0; i < p.length; i += 3) {
  pos[i] = -p[i] * scale;
  pos[i + 1] = p[i + 1] * scale;
  pos[i + 2] = -(p[i + 2] - centerZ) * scale;
  for (let j = 0; j < 3; j++) {
    lo[j] = Math.min(lo[j], pos[i + j]);
    hi[j] = Math.max(hi[j], pos[i + j]);
  }
  const x = -n[i],
    y = n[i + 1],
    z = -n[i + 2],
    s = Math.hypot(x, y, z);
  normal[i] = Math.round((x / s) * 32767);
  normal[i + 1] = Math.round((y / s) * 32767);
  normal[i + 2] = Math.round((z / s) * 32767);
}
const q = new Uint16Array(pos.length);
for (let i = 0; i < q.length; i++)
  q[i] = Math.round(((pos[i] - lo[i % 3]) / (hi[i % 3] - lo[i % 3])) * 65535);
for (let i = 0; i < uv.length; i++) uv16[i] = Math.round(uv[i] * 65535);
const base64 = (a) =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
const asset = {
  format: 1,
  source: "Microsoft TRELLIS.2-4B",
  vertices: p.length / 3,
  triangles: idx.length / 3,
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
  join(out, "mechanical_shark_mesh.json"),
  JSON.stringify(asset) + "\n",
);
for (const [key, name] of [
  ["getBaseColorTexture", "color"],
  ["getMetallicRoughnessTexture", "surface"],
]) {
  const tex = mesh.getMaterial()[key]();
  if (tex.getMimeType() !== "image/webp")
    throw new Error("Expected WebP image");
  await writeFile(join(out, `mechanical_shark_${name}.webp`), tex.getImage());
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
