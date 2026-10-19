/** 将授权导出的古巨龟与绿海龟网格离线减面、校正中性朝向并量化；保留原始 GLB 作为可审计输入。 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { padTextureIslands } from "./lib/pad_texture_islands.mjs";
const [kind, input, tools, yawArg, outArg] = process.argv.slice(2);
if (
  !["archelon", "turtle"].includes(kind) ||
  !input ||
  !tools ||
  !Number.isFinite(Number(yawArg))
)
  throw new Error(
    "Usage: kind raw.glb tools-directory yaw-radians [output-directory]",
  );
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
const primitive = doc.getRoot().listMeshes()[0].listPrimitives()[0];
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
// Preserve normal and UV error on thin flippers instead of flattening them by position alone.
const [reduced] = MeshoptSimplifier.simplifyWithAttributes(
  new Uint32Array(primitive.getIndices().getArray()),
  rawP,
  3,
  attrs,
  5,
  [0.5, 0.5, 0.5, 1, 1],
  null,
  (kind === "archelon" ? 6500 : 4800) * 3,
  0.012,
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
// Yaw is measured against raw clay views; only a rigid rotation and uniform normalization are permitted.
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
const center = geometry.boundingBox.getCenter(new THREE.Vector3()),
  scale = 1 / (geometry.boundingBox.max.z - geometry.boundingBox.min.z);
for (let i = 0; i < positions.length; i += 3) {
  positions[i] = (positions[i] - center.x) * scale;
  positions[i + 1] = (positions[i + 1] - center.y) * scale;
  positions[i + 2] = (positions[i + 2] - center.z) * scale;
}
// Center the measured short turtle tail before reflecting the neutral half; otherwise a 0.009L source offset makes two tips.
if (kind === "turtle")
  for (let i = 0; i < positions.length; i += 3) {
    const u = THREE.MathUtils.clamp((positions[i + 2] - 0.3) / 0.05, 0, 1);
    positions[i] -= 0.009 * u * u * (3 - 2 * u);
    n.fromArray(normals, i);
    n.z += ((0.009 * 6 * u * (1 - u)) / 0.05) * n.x;
    n.normalize().toArray(normals, i);
  }
// The generated green turtle has one foreflipper baked into a deep downstroke.
// Retain its neutral right side and mirror the clipped surface; interpolate UV/normals at the seam.
if (kind === "turtle") {
  const points = [],
    normalValues = [],
    texcoords = [],
    indices = [],
    unique = new Map();
  const add = (v, mirror) => {
    const a = [
      mirror ? -v[0] : v[0],
      v[1],
      v[2],
      mirror ? -v[3] : v[3],
      v[4],
      v[5],
      v[6],
      v[7],
    ];
    const key = a.map((n) => Math.round(n * 1e7)).join(",");
    if (!unique.has(key)) {
      unique.set(key, points.length / 3);
      points.push(...a.slice(0, 3));
      normalValues.push(...a.slice(3, 6));
      texcoords.push(...a.slice(6));
    }
    return unique.get(key);
  };
  for (let i = 0; i < idx.length; i += 3) {
    const poly = [0, 1, 2].map((j) => {
      const id = idx[i + j];
      return [
        ...positions.slice(id * 3, id * 3 + 3),
        ...normals.slice(id * 3, id * 3 + 3),
        uv[id * 2],
        uv[id * 2 + 1],
      ];
    });
    const clipped = [];
    for (let j = 0; j < 3; j++) {
      const a = poly[j],
        b = poly[(j + 1) % 3],
        ai = a[0] >= 0,
        bi = b[0] >= 0;
      if (ai) clipped.push(a);
      if (ai !== bi) {
        const t = -a[0] / (b[0] - a[0]),
          c = a.map((v, k) => v + (b[k] - v) * t);
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
  normals = new Float32Array(normalValues);
  uv = new Float32Array(texcoords);
  idx = new Uint16Array(indices);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(idx, 1));
}
// Clipping can remove a fraction of a millimeter at the nose: restore the exact shared length/center contract uniformly.
geometry.computeBoundingBox();
const finalCenter = geometry.boundingBox.getCenter(new THREE.Vector3()),
  finalScale = 1 / (geometry.boundingBox.max.z - geometry.boundingBox.min.z);
for (let i = 0; i < positions.length; i += 3) {
  positions[i] = (positions[i] - finalCenter.x) * finalScale;
  positions[i + 1] = (positions[i + 1] - finalCenter.y) * finalScale;
  positions[i + 2] = (positions[i + 2] - finalCenter.z) * finalScale;
}
// Retain opposing surface normals on thin fins; only repair invalid vectors using a nearby valid normal.
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
