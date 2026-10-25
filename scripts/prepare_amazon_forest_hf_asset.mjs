/** 离线处理雨林树木和蜘蛛猴 HF 实体；保留原件、重新展开色图并记录减面成本。 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { padTextureIslands } from "./lib/pad_texture_islands.mjs";
const [kind, input, tools, yawArg, outArg, bakeTools, lod = "near"] =
  process.argv.slice(2);
if (
  !["kapok_tree", "acai_palm", "spider_monkey"].includes(kind) ||
  !input ||
  !tools ||
  !Number.isFinite(Number(yawArg))
)
  throw new Error(
    "Usage: kind raw.glb tools-directory yaw-radians output-directory bake-tools-directory",
  );
if (!["near", "far"].includes(lod) || (lod === "far" && kind !== "kapok_tree"))
  throw new Error("Only kapok has a far canopy tier");
const stem = kind + (lod === "far" ? "_far" : "");
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
let removedIsolatedTriangles = 0;
if (kind === "spider_monkey") {
  // 实际导出含少量悬空毛屑及一个离体卷曲残片；只保留连续身体，原始 GLB 留档。
  const p = primitive.getAttribute("POSITION").getArray(),
    indices = primitive.getIndices().getArray(),
    parents = Int32Array.from({ length: p.length / 3 }, (_, i) => i),
    positions = new Map();
  const find = (i) => {
    while (parents[i] !== i) {
      parents[i] = parents[parents[i]];
      i = parents[i];
    }
    return i;
  };
  const join = (a, b) => (parents[find(b)] = find(a));
  for (let i = 0; i < parents.length; i++) {
    const key = [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]]
      .map((x) => Math.round(x * 1e5))
      .join(",");
    if (positions.has(key)) join(i, positions.get(key));
    else positions.set(key, i);
  }
  for (let i = 0; i < indices.length; i += 3) {
    join(indices[i], indices[i + 1]);
    join(indices[i], indices[i + 2]);
  }
  const counts = new Map();
  for (let i = 0; i < indices.length; i += 3) {
    const id = find(indices[i]);
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  const largest = [...counts].sort((a, b) => b[1] - a[1])[0][0],
    kept = [];
  for (let i = 0; i < indices.length; i += 3)
    if (find(indices[i]) === largest)
      kept.push(indices[i], indices[i + 1], indices[i + 2]);
  removedIsolatedTriangles = (indices.length - kept.length) / 3;
  if (kept.length < indices.length * 0.9)
    throw new Error("Disconnected source anatomy requires manual review");
  primitive.getIndices().setArray(new Uint32Array(kept));
  compactPrimitive(primitive);
}
const rawP = primitive.getAttribute("POSITION").getArray(),
  rawN = primitive.getAttribute("NORMAL").getArray(),
  rawUV = primitive.getAttribute("TEXCOORD_0").getArray();
const attrs = new Float32Array((rawP.length / 3) * 5);
for (let i = 0; i < rawP.length / 3; i++)
  attrs.set(
    [
      rawN[3 * i],
      rawN[3 * i + 1],
      rawN[3 * i + 2],
      rawUV[2 * i],
      rawUV[2 * i + 1],
    ],
    5 * i,
  );
// 保留树枝和肢体轮廓的法线差异；减面后重新展开并从原始 GLB 投射色图。
const [reduced] = MeshoptSimplifier.simplifyWithAttributes(
  new Uint32Array(primitive.getIndices().getArray()),
  rawP,
  3,
  attrs,
  5,
  lod === "far" ? [0.2, 0.2, 0.2, 0, 0] : [0.35, 0.35, 0.35, 0, 0],
  null,
  {
    kapok_tree: 3500,
    acai_palm: 2200,
    spider_monkey: 6500,
  }[kind] * 3,
  lod === "far" ? 0.05 : 0.025,
  ["Permissive"],
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
const normalizationBox =
  kind === "kapok_tree"
    ? new THREE.Box3().setFromArray(rawP).applyMatrix4(rotation)
    : geometry.boundingBox;
const center = normalizationBox.getCenter(new THREE.Vector3());
const axis = "y";
const scale = 1 / (normalizationBox.max[axis] - normalizationBox.min[axis]);
for (let i = 0; i < positions.length; i += 3) {
  positions[i] = (positions[i] - center.x) * scale;
  positions[i + 1] = (positions[i + 1] - center.y) * scale;
  positions[i + 2] = (positions[i + 2] - center.z) * scale;
}
// 保留树枝和肢体轮廓的原始法线；仅为无效向量寻找相邻有效法线。
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
  kind: stem,
  modelKind: kind,
  lod,
  yaw,
  localRepair: { removedIsolatedTriangles },
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
  join(out, `${stem}_hf_mesh.json`),
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
  .toFile(join(out, `${stem}_hf_color.webp`));
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
  if (!bakeTools) throw Error("Atlas baking requires bake tools");
  const { execFileSync } = await import("node:child_process");
  execFileSync(
    process.execPath,
    [
      "scripts/rebake_atlantis_hf_asset.mjs",
      input,
      join(out, `${stem}_hf_mesh.json`),
      tools,
      bakeTools,
      out,
    ],
    { stdio: "inherit" },
  );
}
