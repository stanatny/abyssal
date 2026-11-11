/** 离线保留黑海荨麻的真实 HF 伞体与口腕；统一以伞径归一化并重烘焙原色图。 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import * as THREE from "three";
const [input, toolPath, bakePath, outArg, yawArg = "0", bandArg = "0.7"] =
  process.argv.slice(2);
if (!input || !toolPath || !bakePath)
  throw new Error(
    "Usage: raw.glb tools-directory bake-tools output-directory [yaw] [bell-band-fraction]",
  );
const kind = "black_sea_nettle",
  out = resolve(outArg || "src/assets/models"),
  yaw = Number(yawArg),
  band = Number(bandArg),
  req = createRequire(join(resolve(toolPath), "package.json")),
  load = (name) => import(pathToFileURL(req.resolve(name)).href);
// 下方修复区域只适用于已逐面检查的这一份原始导出，不能默默套在另一模型上。
const sourceSha256 = createHash("sha256")
  .update(await readFile(input))
  .digest("hex");
if (
  sourceSha256 !==
  "7bcf1f20c666cff4090f3969ea3ada28dd41a95dd4b33113b734af8853ce1d36"
)
  throw new Error("Inspect the new source before applying recorded arm repair");
if (!Number.isFinite(yaw) || !(band > 0.4 && band < 0.95))
  throw new Error("Invalid yaw or bell band");
const { NodeIO } = await load("@gltf-transform/core"),
  { ALL_EXTENSIONS } = await load("@gltf-transform/extensions"),
  { weld, compactPrimitive } = await load("@gltf-transform/functions"),
  { MeshoptSimplifier } = await load("meshoptimizer"),
  io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
  doc = await io.read(resolve(input)),
  sourceMeshes = doc.getRoot().listMeshes();
if (sourceMeshes.length !== 1 || sourceMeshes[0].listPrimitives().length !== 1)
  throw new Error("Inspect multi-part source before conversion");
const rawTriangles =
  sourceMeshes[0].listPrimitives()[0].getIndices().getCount() / 3;
await MeshoptSimplifier.ready;
await doc.transform(weld({}));
const mesh = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const repair = retainFourOralColumns(mesh);
const rawP = mesh.getAttribute("POSITION").getArray(),
  rawN = mesh.getAttribute("NORMAL").getArray(),
  rawUV = mesh.getAttribute("TEXCOORD_0").getArray(),
  attrs = new Float32Array((rawP.length / 3) * 5);
for (let i = 0; i < rawP.length / 3; i++)
  attrs.set(
    [
      rawN[3 * i],
      rawN[3 * i + 1],
      rawN[3 * i + 2],
      rawUV[2 * i],
      rawUV[2 * i + 1],
    ],
    i * 5,
  );
const [reduced] = MeshoptSimplifier.simplifyWithAttributes(
  new Uint32Array(mesh.getIndices().getArray()),
  rawP,
  3,
  attrs,
  5,
  [0.5, 0.5, 0.5, 1, 1],
  null,
  10000 * 3,
  0.02,
  ["Permissive"],
);
mesh.getIndices().setArray(reduced);
compactPrimitive(mesh);
const p = mesh.getAttribute("POSITION").getArray(),
  normalSource = mesh.getAttribute("NORMAL").getArray(),
  uv = mesh.getAttribute("TEXCOORD_0").getArray(),
  index = mesh.getIndices().getArray(),
  rotation = new THREE.Matrix4().makeRotationY(yaw),
  v = new THREE.Vector3(),
  n = new THREE.Vector3(),
  positions = new Float32Array(p.length),
  normals = new Float32Array(normalSource.length);
if (p.length / 3 > 65535) throw new Error("Vertex budget exceeded");
for (let i = 0; i < p.length; i += 3) {
  v.fromArray(p, i).applyMatrix4(rotation).toArray(positions, i);
  n.fromArray(normalSource, i)
    .transformDirection(rotation)
    .normalize()
    .toArray(normals, i);
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.computeBoundingBox();
const sourceBounds = geometry.boundingBox.clone(),
  bellMinY =
    sourceBounds.min.y + (sourceBounds.max.y - sourceBounds.min.y) * band,
  bell = new THREE.Box3();
for (let i = 0; i < positions.length; i += 3) {
  v.fromArray(positions, i);
  if (v.y >= bellMinY) bell.expandByPoint(v);
}
const bellWidth = Math.max(bell.max.x - bell.min.x, bell.max.z - bell.min.z);
if (!(bellWidth > 0)) throw new Error("Bell band is empty");
const scale = 1 / bellWidth,
  center = new THREE.Vector3(
    (bell.min.x + bell.max.x) * 0.5,
    sourceBounds.max.y - 0.2 / scale,
    (bell.min.z + bell.max.z) * 0.5,
  );
for (let i = 0; i < positions.length; i += 3)
  v.fromArray(positions, i)
    .sub(center)
    .multiplyScalar(scale)
    .toArray(positions, i);
geometry.computeBoundingBox();
const min = geometry.boundingBox.min.toArray(),
  max = geometry.boundingBox.max.toArray(),
  q = new Uint16Array(positions.length),
  nq = new Int16Array(normals.length),
  uq = new Uint16Array(uv.length),
  b64 = (a) =>
    Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
for (let i = 0; i < q.length; i++) {
  const a = i % 3;
  q[i] = Math.round(
    THREE.MathUtils.clamp((positions[i] - min[a]) / (max[a] - min[a]), 0, 1) *
      65535,
  );
  nq[i] = Math.round(THREE.MathUtils.clamp(normals[i], -1, 1) * 32767);
}
for (let i = 0; i < uq.length; i++)
  uq[i] = Math.round(THREE.MathUtils.clamp(uv[i], 0, 1) * 65535);
const asset = {
  kind,
  source: "Microsoft TRELLIS.2 / project-generated original reference",
  sourceSha256,
  sourceRepair: repair,
  oralArmChains: repair.retainedColumns.map((c) =>
    c.points.map((p) =>
      new THREE.Vector3(...p).sub(center).multiplyScalar(scale).toArray(),
    ),
  ),
  yaw,
  sourceNormalization: {
    center: center.toArray(),
    scale,
    bellBandFraction: band,
    bellMinY,
    bellDiameter: bellWidth,
  },
  vertices: positions.length / 3,
  triangles: index.length / 3,
  min,
  max,
  position: b64(q),
  normal: b64(nq),
  uv: b64(uq),
  index: b64(new Uint16Array(index)),
};
await mkdir(out, { recursive: true });
const lowPath = join(out, `${kind}_hf_mesh.json`);
await writeFile(lowPath, JSON.stringify(asset) + "\n");
console.log(
  JSON.stringify({
    kind,
    rawTriangles,
    repair,
    triangles: asset.triangles,
    vertices: asset.vertices,
    sourceBounds: {
      min: sourceBounds.min.toArray(),
      max: sourceBounds.max.toArray(),
    },
    bellBandFraction: band,
    bellMinY,
    scale,
    min,
    max,
    uniformNormalization: true,
  }),
);
execFileSync(
  process.execPath,
  [
    "scripts/rebake_hawaii_batch10_hf_asset.mjs",
    input,
    lowPath,
    toolPath,
    bakePath,
    out,
  ],
  { stdio: "inherit" },
);

/** 仅修正本次重建推测出的两根多余长口腕；保留四根真实 HF 褶皱组织与全部原始文件。 */
function retainFourOralColumns(primitive) {
  const p = primitive.getAttribute("POSITION").getArray(),
    index = primitive.getIndices().getArray(),
    count = p.length / 3,
    cutoff = 0.25,
    parent = Array.from({ length: count }, (_, i) => i),
    find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i]))),
    join = (a, b) => {
      parent[find(a)] = find(b);
    },
    seen = new Map(),
    used = new Set();
  for (let i = 0; i < count; i++)
    if (p[i * 3 + 1] < cutoff) {
      const key = [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]]
        .map((x) => Math.round(x * 1e5))
        .join(",");
      if (seen.has(key)) join(i, seen.get(key));
      else seen.set(key, i);
    }
  for (let i = 0; i < index.length; i += 3) {
    const ids = [index[i], index[i + 1], index[i + 2]];
    if (ids.every((j) => p[j * 3 + 1] < cutoff)) {
      join(ids[0], ids[1]);
      join(ids[0], ids[2]);
      ids.forEach((j) => used.add(j));
    }
  }
  const groups = new Map();
  for (const i of used) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  }
  const removed = new Set(),
    selected = [];
  for (const ids of groups.values()) {
    if (ids.length < 1000) continue;
    const min = [0, 1, 2].map((a) => Math.min(...ids.map((i) => p[i * 3 + a]))),
      max = [0, 1, 2].map((a) => Math.max(...ids.map((i) => p[i * 3 + a]))),
      central =
        min[0] > -0.07 && max[0] < 0.07 && min[2] > -0.1 && max[2] < 0.045,
      duplicateRight = min[0] > 0.025 && min[2] < 0 && max[2] < 0.09;
    if (central || duplicateRight) {
      ids.forEach((i) => removed.add(i));
      selected.push({
        vertices: ids.length,
        min,
        max,
        region: central
          ? "inferred central duplicate"
          : "inferred right-front duplicate",
      });
    }
  }
  if (selected.length !== 4)
    throw new Error(
      "Source arm partition changed; inspect before applying the recorded correction",
    );
  const retainedColumns = [];
  for (const ids of groups.values()) {
    if (ids.length < 5000 || ids.some((i) => removed.has(i))) continue;
    const bottom = Math.min(...ids.map((i) => p[i * 3 + 1]));
    const points = Array.from({ length: 6 }, (_, j) => {
      const y = cutoff + ((bottom + 0.015 - cutoff) * j) / 5;
      let near = ids.filter((i) => Math.abs(p[i * 3 + 1] - y) < 0.025);
      if (!near.length)
        near = ids.filter((i) => Math.abs(p[i * 3 + 1] - y) < 0.075);
      if (!near.length) throw new Error("Oral centerline slice is empty");
      return [
        near.reduce((sum, i) => sum + p[i * 3], 0) / near.length,
        y,
        near.reduce((sum, i) => sum + p[i * 3 + 2], 0) / near.length,
      ];
    });
    points[0][1] += 0.015;
    retainedColumns.push({ vertices: ids.length, points });
  }
  if (retainedColumns.length !== 4)
    throw new Error("Expected four retained source oral columns");
  retainedColumns.sort(
    (a, b) =>
      Math.atan2(a.points[0][2], a.points[0][0]) -
      Math.atan2(b.points[0][2], b.points[0][0]),
  );
  const kept = [];
  for (let i = 0; i < index.length; i += 3) {
    const ids = [index[i], index[i + 1], index[i + 2]];
    if (!ids.some((j) => removed.has(j))) kept.push(...ids);
  }
  primitive.getIndices().setArray(new Uint32Array(kept));
  compactPrimitive(primitive);
  return {
    method:
      "retain four source oral columns; remove central and right-front inferred duplicate columns below the bell",
    cutoff,
    removedRegions: selected,
    retainedColumns,
    originalTriangles: index.length / 3,
    retainedTriangles: kept.length / 3,
    removedTriangles: (index.length - kept.length) / 3,
  };
}
