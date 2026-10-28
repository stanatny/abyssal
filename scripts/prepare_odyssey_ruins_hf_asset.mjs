/** 离线处理奥德赛柱门和古桨船 HF 实体；重新展开并烘焙颜色，保留原始文件与相对尺度。 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { padTextureIslands } from "./lib/pad_texture_islands.mjs";
const [kind, input, tools, yawArg, outArg, bakeTools] = process.argv.slice(2);
if (
  !["odyssey_column", "odyssey_galley"].includes(kind) ||
  !input ||
  !tools ||
  !Number.isFinite(Number(yawArg))
)
  throw new Error(
    "Usage: kind raw.glb tools-directory yaw-radians output-directory bake-tools-directory",
  );
const require = createRequire(join(resolve(tools), "package.json")),
  load = (n) => import(pathToFileURL(require.resolve(n)).href);
const { NodeIO } = await load("@gltf-transform/core"),
  { ALL_EXTENSIONS } = await load("@gltf-transform/extensions"),
  { weld, compactPrimitive } = await load("@gltf-transform/functions"),
  { MeshoptSimplifier } = await load("meshoptimizer");
const doc = await new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .read(resolve(input));
const raw = doc.getRoot().listMeshes()[0].listPrimitives()[0],
  rawTriangles = raw.getIndices().getCount() / 3;
await MeshoptSimplifier.ready;
await doc.transform(weld({}));
const primitive = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const rawP = primitive.getAttribute("POSITION").getArray(),
  rawN = primitive.getAttribute("NORMAL").getArray();
// 颜色将重新烘焙；减面按法线与实体轮廓约束，不让原始密集 UV 切片锁死预算。
const [reduced, simplificationError] = MeshoptSimplifier.simplifyWithAttributes(
  new Uint32Array(primitive.getIndices().getArray()),
  rawP,
  3,
  rawN,
  3,
  [0.02, 0.02, 0.02],
  null,
  (kind === "odyssey_column" ? 6000 : 18000) * 3,
  0.003,
  ["Permissive", "LockBorder"],
);
primitive.getIndices().setArray(reduced);
compactPrimitive(primitive);
const mesh = primitive,
  p = mesh.getAttribute("POSITION").getArray(),
  norm = mesh.getAttribute("NORMAL").getArray();
let uv = mesh.getAttribute("TEXCOORD_0").getArray(),
  idx = mesh.getIndices().getArray();
if (p.length / 3 > 65535) throw new Error("Vertex budget exceeded");
let positions = new Float32Array(p.length),
  normals = new Float32Array(norm.length);
const v = new THREE.Vector3(),
  n = new THREE.Vector3();
// 以原始白模确认朝向，只旋转和等比归一化。
const yaw = Number(yawArg),
  rotation = new THREE.Matrix4().makeRotationY(yaw);
for (let i = 0; i < p.length; i += 3) {
  v.fromArray(p, i).applyMatrix4(rotation).toArray(positions, i);
  n.fromArray(norm, i).transformDirection(rotation).toArray(normals, i);
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(idx), 1));
geometry.computeBoundingBox();
const center = geometry.boundingBox.getCenter(new THREE.Vector3());
const axis = kind === "odyssey_column" ? "y" : "x";
const scale =
  1 / (geometry.boundingBox.max[axis] - geometry.boundingBox.min[axis]);
for (let i = 0; i < positions.length; i += 3) {
  positions[i] = (positions[i] - center.x) * scale;
  positions[i + 1] = (positions[i + 1] - center.y) * scale;
  positions[i + 2] = (positions[i + 2] - center.z) * scale;
}
// 保留雕刻凹槽与瓦檐内外面的法线；仅为无效向量寻找相邻有效法线。
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
  simplificationError,
  kind,
  yaw,
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
    yaw,
    repairedNormals,
    vertices: asset.vertices,
    triangles: asset.triangles,
    min,
    max,
    texturePadding: padded.stats,
    out,
  }),
);

{
  if (!bakeTools) throw Error("Odyssey ruin atlas baking requires bake tools");
  const { execFileSync } = await import("node:child_process");
  execFileSync(
    process.execPath,
    [
      "scripts/rebake_atlantis_hf_asset.mjs",
      input,
      join(out, `${kind}_hf_mesh.json`),
      tools,
      bakeTools,
      out,
    ],
    { stdio: "inherit" },
  );
}

// 同源低清顶点色用于慢网加载，不使用白色占位表面。
{
  const path = join(out, `${kind}_hf_mesh.json`);
  const d = JSON.parse(await readFile(path, "utf8"));
  const decode = (s, Type) =>
    new Type(Uint8Array.from(Buffer.from(s, "base64")).buffer);
  const tex = await sharp(join(out, `${kind}_hf_color.webp`))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const texUV = decode(d.uv, Uint16Array),
    colors = new Uint8Array(d.vertices * 3),
    c = new THREE.Color();
  for (let i = 0; i < d.vertices; i++) {
    const x = Math.min(
      tex.info.width - 1,
      Math.floor((texUV[2 * i] / 65535) * tex.info.width),
    );
    const y = Math.min(
      tex.info.height - 1,
      Math.floor((texUV[2 * i + 1] / 65535) * tex.info.height),
    );
    const j = (y * tex.info.width + x) * tex.info.channels;
    c.setRGB(
      tex.data[j] / 255,
      tex.data[j + 1] / 255,
      tex.data[j + 2] / 255,
      THREE.SRGBColorSpace,
    );
    colors.set(
      c.toArray().map((v) => Math.round(v * 255)),
      i * 3,
    );
  }
  d.color = b64(colors);
  await writeFile(path, JSON.stringify(d) + "\n");
}
