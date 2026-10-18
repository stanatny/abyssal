/**
 * 将已获授权导出的 TRELLIS GLB 减面并量化；工具依赖仅装在单独临时目录。
 * 用法：node scripts/prepare_zombie_hf_asset.mjs raw.glb tools-dir [output-dir]
 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const [input, toolDirectory, outputDirectory] = process.argv.slice(2);
if (!input || !toolDirectory) {
  throw new Error(
    "Usage: node scripts/prepare_zombie_hf_asset.mjs raw.glb tools-dir [output-dir]",
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
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.3, error: 0.002 }),
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
const scale = 0.99 / 1.0008072257041931;
// 生成参考带有侧弯尾姿；在绑定前校直后躯中心线，不能让动画围绕歪尾摆动。
// 采自实体截面的中心，不采用受鳍/UV密度偏置的顶点均值。头颌和前躯不动。
const tailCenterline = [
  [0.05, 0],
  [0.1, 0.007],
  [0.15, 0.018],
  [0.2, 0.03],
  [0.25, 0.043],
  [0.3, 0.061],
  [0.34, 0.078],
  [0.4, 0.102],
  [0.45, 0.124],
  [0.5, 0.147],
];
const slopes = tailCenterline.map(([z, x], i) => {
  if (i === 0) return 0;
  const [pz, px] = tailCenterline[i - 1];
  const before = (x - px) / (z - pz);
  if (i === tailCenterline.length - 1) return before;
  const [nz, nx] = tailCenterline[i + 1];
  const after = (nx - x) / (nz - z);
  return (2 * before * after) / (before + after);
});
function tailOffset(z) {
  if (z <= tailCenterline[0][0]) return [0, 0];
  let i = 0;
  while (i < tailCenterline.length - 2 && z > tailCenterline[i + 1][0]) i++;
  const [a, x] = tailCenterline[i],
    [b, y] = tailCenterline[i + 1];
  const h = b - a,
    t = (z - a) / h,
    t2 = t * t,
    t3 = t2 * t,
    m = slopes[i],
    n = slopes[i + 1];
  return [
    (2 * t3 - 3 * t2 + 1) * x +
      (t3 - 2 * t2 + t) * h * m +
      (-2 * t3 + 3 * t2) * y +
      (t3 - t2) * h * n,
    ((6 * t2 - 6 * t) * x +
      (3 * t2 - 4 * t + 1) * h * m +
      (-6 * t2 + 6 * t) * y +
      (3 * t2 - 2 * t) * h * n) /
      h,
  ];
}

for (let i = 0; i < p.length; i += 3) {
  const [offset, derivative] = tailOffset(-p[i + 2] * scale);
  pos[i] = -p[i] * scale * 0.84 - offset;
  pos[i + 1] = p[i + 1] * scale;
  pos[i + 2] = -p[i + 2] * scale;
  for (let j = 0; j < 3; j++) {
    lo[j] = Math.min(lo[j], pos[i + j]);
    hi[j] = Math.max(hi[j], pos[i + j]);
  }
  const x = -n[i] / 0.84,
    y = n[i + 1],
    // 对应剪切变形的逆转置法线，保留原贴图与平滑接缝。
    z = -n[i + 2] + derivative * x,
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
  join(out, "zombie_shark_mesh.json"),
  JSON.stringify(asset) + "\n",
);
for (const [key, name] of [
  ["getBaseColorTexture", "color"],
  ["getMetallicRoughnessTexture", "surface"],
]) {
  const tex = mesh.getMaterial()[key]();
  if (tex.getMimeType() !== "image/webp")
    throw new Error("Expected WebP image");
  await writeFile(join(out, `zombie_shark_${name}.webp`), tex.getImage());
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
