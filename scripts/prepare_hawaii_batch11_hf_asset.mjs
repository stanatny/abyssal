/** 第十一批珍兽、海鸟与成年人离线减面、校正朝向并重新烘焙图集。 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { padTextureIslands } from "./lib/pad_texture_islands.mjs";
const [kind, input, tools, yawArg, outArg, bakeTools] = process.argv.slice(2);
if (
  ![
    "golden_manta",
    "seagull",
    "tropicbird",
    "swimmer_male",
    "swimmer_female",
    "diver_male",
    "diver_female",
  ].includes(kind) ||
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
  {
    golden_manta: 9000,
    seagull: 8000,
    tropicbird: 8000,
    swimmer_male: 9000,
    swimmer_female: 9000,
    diver_male: 9000,
    diver_female: 9000,
  }[kind] * 3,
  0.025,
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
// Yaw is measured against raw clay views; only a rigid rotation and uniform normalization are permitted.
const yaw = Number(yawArg),
  pitch =
    kind.startsWith("swimmer_") || kind.startsWith("diver_") ? Math.PI / 2 : 0,
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
const dorsalRepair = null;
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
    dorsalRepair,
    vertices: asset.vertices,
    triangles: asset.triangles,
    min,
    max,
    texturePadding: padded.stats,
    out,
  }),
);

if (!bakeTools) throw Error("Atlas baking requires bake tools");
const { execFileSync } = await import("node:child_process");
execFileSync(
  process.execPath,
  [
    "scripts/rebake_hawaii_batch11_hf_asset.mjs",
    input,
    join(out, `${kind}_hf_mesh.json`),
    tools,
    bakeTools,
    out,
  ],
  { stdio: "inherit" },
);
