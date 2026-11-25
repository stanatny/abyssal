/** HF 独眼巨人保持完整表面、原 UV 和等比身高；测量关节独立记录，不能套海蛇轴链。 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as T from "three";
import { padTextureIslands } from "./lib/pad_texture_islands.mjs";

const [input, tools, rigInput, yawArg = "0", output = "src/assets/models"] =
  process.argv.slice(2);
if (!input || !tools || !rigInput || !Number.isFinite(Number(yawArg)))
  throw Error(
    "Usage: raw.glb tools-directory measured-rig.json yaw-radians [output-directory]",
  );
const require = createRequire(join(resolve(tools), "package.json"));
const { NodeIO } = await import(require.resolve("@gltf-transform/core"));
const { ALL_EXTENSIONS } = await import(
  require.resolve("@gltf-transform/extensions")
);
const { weld, compactPrimitive } = await import(
  require.resolve("@gltf-transform/functions")
);
const { MeshoptSimplifier } = await import(require.resolve("meshoptimizer"));
const sharp = require("sharp");
const document = await new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .read(resolve(input));
const raw = document.getRoot().listMeshes()[0].listPrimitives()[0];
const rawTriangles = raw.getIndices().getCount() / 3;
await document.transform(weld({}));
const primitive = document.getRoot().listMeshes()[0].listPrimitives()[0];
const rawPositions = primitive.getAttribute("POSITION").getArray();
const rawNormals = primitive.getAttribute("NORMAL").getArray();
const rawUV = primitive.getAttribute("TEXCOORD_0").getArray();
const attributes = new Float32Array((rawPositions.length / 3) * 5);
for (let i = 0; i < rawPositions.length / 3; i++)
  attributes.set(
    [...rawNormals.slice(i * 3, i * 3 + 3), ...rawUV.slice(i * 2, i * 2 + 2)],
    i * 5,
  );
await MeshoptSimplifier.ready;
// 身份特征保留源顶点：额眼、鼻梁、嘴和胡须不参与粗减面，防止闭合表面折叠成黑缝。
const facialLocks = new Uint8Array(rawPositions.length / 3);
for (let i = 0; i < facialLocks.length; i++)
  facialLocks[i] =
    rawPositions[i * 3 + 1] > 0.1 &&
    Math.abs(rawPositions[i * 3]) < 0.2 &&
    rawPositions[i * 3 + 2] > -0.02
      ? 1
      : 0;
const [reduced, simplificationError] = MeshoptSimplifier.simplifyWithAttributes(
  new Uint32Array(primitive.getIndices().getArray()),
  rawPositions,
  3,
  attributes,
  5,
  [0.5, 0.5, 0.5, 1, 1],
  facialLocks,
  28000 * 3,
  0.009,
  ["Permissive", "LockBorder"],
);
primitive.getIndices().setArray(reduced);
compactPrimitive(primitive);
const p = primitive.getAttribute("POSITION").getArray();
const n = primitive.getAttribute("NORMAL").getArray();
const uv = primitive.getAttribute("TEXCOORD_0").getArray();
const ix = primitive.getIndices().getArray();
if (p.length / 3 > 65535) throw Error("Vertex budget exceeded");
const positions = new Float32Array(p.length),
  normals = new Float32Array(n.length);
const v = new T.Vector3();
const yaw = Number(yawArg),
  rotation = new T.Matrix4().makeRotationY(yaw);
for (let i = 0; i < p.length; i += 3) {
  v.fromArray(p, i).applyMatrix4(rotation).toArray(positions, i);
  v.fromArray(n, i).transformDirection(rotation).toArray(normals, i);
}
const geometry = new T.BufferGeometry();
geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
geometry.computeBoundingBox();
const center = geometry.boundingBox.getCenter(new T.Vector3());
const scale = 1 / (geometry.boundingBox.max.y - geometry.boundingBox.min.y);
for (let i = 0; i < positions.length; i += 3)
  v.fromArray(positions, i)
    .sub(center)
    .multiplyScalar(scale)
    .toArray(positions, i);
geometry.computeBoundingBox();
const min = geometry.boundingBox.min.toArray(),
  max = geometry.boundingBox.max.toArray();
const q = new Uint16Array(positions.length),
  qn = new Int16Array(normals.length),
  quv = new Uint16Array(uv.length);
for (let i = 0; i < q.length; i++) {
  q[i] = Math.round(
    ((positions[i] - min[i % 3]) / (max[i % 3] - min[i % 3])) * 65535,
  );
  qn[i] = Math.round(T.MathUtils.clamp(normals[i], -1, 1) * 32767);
}
for (let i = 0; i < uv.length; i++)
  quv[i] = Math.round(T.MathUtils.clamp(uv[i], 0, 1) * 65535);
const rig = JSON.parse(await readFile(rigInput, "utf8"));
if (!Array.isArray(rig.bones) || !rig.anchors?.rightPalm || !rig.anchors?.mouth)
  throw Error("Measured complete humanoid rig and anatomical anchors required");
const b64 = (a) =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
// 沿真实三角形连接传播肢体归属，避免前伸拇指与腹部在空间上接近时互相串骨。
const canonical = new Map(),
  nodeOf = [],
  nodes = [];
for (let i = 0; i < positions.length / 3; i++) {
  const key = `${q[i * 3]},${q[i * 3 + 1]},${q[i * 3 + 2]}`;
  if (!canonical.has(key)) {
    canonical.set(key, nodes.length);
    nodes.push({
      p: new T.Vector3().fromArray(positions, i * 3),
      edges: new Map(),
    });
  }
  nodeOf[i] = canonical.get(key);
}
for (let i = 0; i < ix.length; i += 3)
  for (let j = 0; j < 3; j++) {
    const a = nodeOf[ix[i + j]],
      b = nodeOf[ix[i + ((j + 1) % 3)]];
    if (a === b) continue;
    const distance = nodes[a].p.distanceTo(nodes[b].p);
    nodes[a].edges.set(b, distance);
    nodes[b].edges.set(a, distance);
  }
function geodesic(seed) {
  const distances = new Float64Array(nodes.length).fill(Infinity),
    heap = [];
  const push = (entry) => {
    heap.push(entry);
    let i = heap.length - 1;
    while (i) {
      const parent = (i - 1) >> 1;
      if (heap[parent][0] <= entry[0]) break;
      heap[i] = heap[parent];
      i = parent;
    }
    heap[i] = entry;
  };
  const pop = () => {
    const value = heap[0],
      last = heap.pop();
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let j = i * 2 + 1;
        if (j + 1 < heap.length && heap[j + 1][0] < heap[j][0]) j++;
        if (heap[j][0] >= last[0]) break;
        heap[i] = heap[j];
        i = j;
      }
      heap[i] = last;
    }
    return value;
  };
  nodes.forEach((node, i) => {
    if (seed(node.p)) {
      distances[i] = 0;
      push([0, i]);
    }
  });
  while (heap.length) {
    const [distance, i] = pop();
    if (distance !== distances[i]) continue;
    for (const [j, length] of nodes[i].edges)
      if (distance + length < distances[j]) {
        distances[j] = distance + length;
        push([distances[j], j]);
      }
  }
  return distances;
}
const armDistance = geodesic(
  (p) => Math.abs(p.x) > 0.32 && p.y > -0.2 && p.y < 0.28,
);
const torsoDistance = geodesic((p) => Math.abs(p.x) < 0.13 || p.y < -0.27);
const armOwnership = new Uint16Array(positions.length / 3);
let disconnected = 0;
for (let i = 0; i < armOwnership.length; i++) {
  const node = nodeOf[i],
    a = armDistance[node],
    b = torsoDistance[node];
  let blend;
  if (!Number.isFinite(a) && !Number.isFinite(b)) {
    disconnected++;
    blend =
      Math.abs(positions[i * 3]) > 0.28 && positions[i * 3 + 1] > -0.23 ? 1 : 0;
  } else
    blend = !Number.isFinite(a)
      ? 0
      : !Number.isFinite(b)
        ? 1
        : T.MathUtils.smoothstep(b - a, -0.32, 0.32);
  if (positions[i * 3 + 1] < -0.27) blend = 0;
  armOwnership[i] = Math.round(blend * 65535);
}
const sourceSha256 = createHash("sha256")
  .update(await readFile(input))
  .digest("hex");
const asset = {
  format: 1,
  kind: "polyphemus",
  source: "Microsoft TRELLIS.2-4B",
  sourceSha256,
  sourceSpaceRevision: "ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d",
  sourceNormalization: {
    yaw,
    center: center.toArray(),
    scale,
    method:
      "Rigid orientation and uniform height normalization; complete source anatomy, original UV and albedo retained",
  },
  dimensions:
    "Unit kneeling height; 90 m runtime height places actual feet at rootY minus 45 m",
  vertices: positions.length / 3,
  triangles: ix.length / 3,
  simplificationError,
  protectedFacialSourceVertices: facialLocks.reduce(
    (sum, value) => sum + value,
    0,
  ),
  min,
  max,
  position: b64(q),
  normal: b64(qn),
  uv: b64(quv),
  index: b64(new Uint16Array(ix)),
  rig,
  armOwnership: b64(armOwnership),
  ownershipMethod:
    "Geodesic anatomical ownership on welded actual triangle surface; torso/hand gaps retained",
  disconnectedOwnershipVertices: disconnected,
};
await mkdir(resolve(output), { recursive: true });
const file = join(resolve(output), "polyphemus_hf_mesh.json");
const decoded = await sharp(
  primitive.getMaterial().getBaseColorTexture().getImage(),
)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const padded = padTextureIslands(
  decoded.data,
  decoded.info.width,
  decoded.info.height,
  uv,
  ix,
);
const colorFile = join(resolve(output), "polyphemus_hf_color.webp");
await sharp(padded.data, {
  raw: { width: decoded.info.width, height: decoded.info.height, channels: 4 },
})
  .webp({ quality: 94 })
  .toFile(colorFile);
// 同源顶点色只服务于贴图加载前和失败回退，不使用替代几何。
const tex = await sharp(colorFile)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const colors = new Uint8Array(asset.vertices * 3),
  color = new T.Color();
for (let i = 0; i < asset.vertices; i++) {
  const x = Math.min(
    tex.info.width - 1,
    Math.floor((quv[i * 2] / 65535) * tex.info.width),
  );
  const y = Math.min(
    tex.info.height - 1,
    Math.floor((quv[i * 2 + 1] / 65535) * tex.info.height),
  );
  const j = (y * tex.info.width + x) * tex.info.channels;
  color.setRGB(
    tex.data[j] / 255,
    tex.data[j + 1] / 255,
    tex.data[j + 2] / 255,
    T.SRGBColorSpace,
  );
  colors.set(
    color.toArray().map((a) => Math.round(a * 255)),
    i * 3,
  );
}
asset.color = b64(colors);
await writeFile(file, JSON.stringify(asset) + "\n");
console.log(
  JSON.stringify({
    sourceSha256,
    rawTriangles,
    vertices: asset.vertices,
    triangles: asset.triangles,
    simplificationError,
    min,
    max,
    texturePadding: padded.stats,
  }),
);
