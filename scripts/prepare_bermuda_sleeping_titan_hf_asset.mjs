/** 保留 HF 沉睡巨兽的实体结构、原始 UV 与 PBR；只做刚性朝向、统一缩放和离线减面。 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";

const [
  input,
  tools,
  yawArg,
  outputArg,
  pitchArg = "0",
  rollArg = "0",
  contactCellArg = "0.008",
  collisionMode = "plain",
] = process.argv.slice(2);
if (!input || !tools || !Number.isFinite(Number(yawArg)))
  throw Error(
    "Usage: raw.glb tools-directory yaw-radians output-directory [pitch-radians] [roll-radians] [contact-cell] [plain|close6|close26]",
  );
const kind = "bermuda_sleeping_titan",
  out = resolve(outputArg || "src/assets/models"),
  require = createRequire(join(resolve(tools), "package.json")),
  load = (name) => import(pathToFileURL(require.resolve(name)).href),
  { NodeIO } = await load("@gltf-transform/core"),
  { ALL_EXTENSIONS } = await load("@gltf-transform/extensions"),
  { MeshoptSimplifier } = await load("meshoptimizer"),
  sharp = require("sharp"),
  source = await readFile(resolve(input)),
  sourceSha256 = createHash("sha256").update(source).digest("hex"),
  doc = await new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .read(resolve(input)),
  nodes = doc
    .getRoot()
    .listNodes()
    .filter((node) => node.getMesh());
if (nodes.length !== 1 || nodes[0].getMesh().listPrimitives().length !== 1)
  throw Error(
    "Inspect and explicitly combine the source materials before conversion",
  );
const raw = nodes[0].getMesh().listPrimitives()[0],
  material = raw.getMaterial(),
  sourcePosition = raw.getAttribute("POSITION").getArray(),
  sourceNormal = raw.getAttribute("NORMAL")?.getArray(),
  sourceUv = raw.getAttribute("TEXCOORD_0")?.getArray(),
  sourceIndex = raw.getIndices()?.getArray();
if (!sourceNormal || !sourceUv || !sourceIndex || !material)
  throw Error(
    "HF export lacks indexed positions, normals, UVs or original PBR",
  );
if (!(Number(contactCellArg) > 0 && Number(contactCellArg) <= 0.008))
  throw Error("Contact cells must be positive and at most the source 0.008");
await MeshoptSimplifier.ready;
const rotation = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(Number(pitchArg), Number(yawArg), Number(rollArg), "YXZ"),
  ),
  transform = rotation.multiply(
    new THREE.Matrix4().fromArray(nodes[0].getWorldMatrix()),
  ),
  normalMatrix = new THREE.Matrix3().getNormalMatrix(transform),
  positions = new Float32Array(sourcePosition.length),
  normals = new Float32Array(sourceNormal.length),
  v = new THREE.Vector3();
for (let i = 0; i < positions.length; i += 3) {
  v.fromArray(sourcePosition, i).applyMatrix4(transform).toArray(positions, i);
  v.fromArray(sourceNormal, i)
    .applyMatrix3(normalMatrix)
    .normalize()
    .toArray(normals, i);
}
const bounds = new THREE.Box3().setFromArray(positions),
  center = bounds.getCenter(new THREE.Vector3()),
  span = bounds.getSize(new THREE.Vector3()),
  scale = 1 / span.z;
if (span.z < Math.max(span.x, span.y) * 0.98)
  throw Error(
    "Choose a rigid rotation placing the anatomical longest axis on Z",
  );
for (let i = 0; i < positions.length; i += 3) {
  positions[i] = (positions[i] - center.x) * scale;
  positions[i + 1] = (positions[i + 1] - center.y) * scale;
  positions[i + 2] = (positions[i + 2] - center.z) * scale;
}
const attributes = new Float32Array((positions.length / 3) * 5);
for (let i = 0; i < positions.length / 3; i++) {
  attributes.set(normals.subarray(i * 3, i * 3 + 3), i * 5);
  attributes.set(sourceUv.subarray(i * 2, i * 2 + 2), i * 5 + 3);
}
const [nearIndices, nearError] = MeshoptSimplifier.simplifyWithAttributes(
  new Uint32Array(sourceIndex),
  positions,
  3,
  attributes,
  5,
  [0.12, 0.12, 0.12, 0.25, 0.25],
  null,
  30000 * 3,
  0.003,
  ["Sparse"],
);
// 远景不重新采样图集：焊接纯 UV 断点后减面，使用同一原色的顶点色后备材质。
// 否则高度分裂的生成图 UV 会锁住近万三角，无法得到有意义的远景预算。
const positionIds = new Map(),
  firstPosition = new Map();
for (const id of new Set(nearIndices)) {
  const key = Array.from(positions.subarray(id * 3, id * 3 + 3), (v) =>
    Math.round(v * 1e6),
  ).join(",");
  if (!positionIds.has(key)) positionIds.set(key, id);
  firstPosition.set(id, positionIds.get(key));
}
const [farIndices, farError] = MeshoptSimplifier.simplify(
    new Uint32Array([...nearIndices].map((id) => firstPosition.get(id))),
    positions,
    3,
    5000 * 3,
    0.018,
    ["Sparse"],
  ),
  used = new Set([...nearIndices, ...farIndices]),
  remap = new Map([...used].map((id, i) => [id, i]));
if (used.size > 65535)
  throw Error("UV-preserving conversion exceeds UInt16 vertex budget");
const compactP = new Float32Array(used.size * 3),
  compactN = new Float32Array(used.size * 3),
  compactUv = new Float32Array(used.size * 2);
for (const [id, target] of remap) {
  compactP.set(positions.subarray(id * 3, id * 3 + 3), target * 3);
  compactN.set(normals.subarray(id * 3, id * 3 + 3), target * 3);
  compactUv.set(sourceUv.subarray(id * 2, id * 2 + 2), target * 2);
}
const box = new THREE.Box3().setFromArray(compactP),
  min = box.min.toArray(),
  max = box.max.toArray(),
  quantized = new Uint16Array(compactP.length),
  normal = new Int16Array(compactN.length),
  uv = new Uint16Array(compactUv.length),
  b64 = (array) =>
    Buffer.from(array.buffer, array.byteOffset, array.byteLength).toString(
      "base64",
    );
for (let i = 0; i < compactP.length; i++) {
  const axis = i % 3;
  quantized[i] = Math.round(
    ((compactP[i] - min[axis]) / (max[axis] - min[axis])) * 65535,
  );
  normal[i] = Math.round(THREE.MathUtils.clamp(compactN[i], -1, 1) * 32767);
}
for (let i = 0; i < compactUv.length; i++) {
  if (compactUv[i] < -1e-5 || compactUv[i] > 1.00001)
    throw Error(
      "Source UV outside [0,1] needs an explicit wrap-preserving conversion",
    );
  uv[i] = Math.round(THREE.MathUtils.clamp(compactUv[i], 0, 1) * 65535);
}
await mkdir(out, { recursive: true });
const textureDefinitions = [
    ["color", material.getBaseColorTexture(), 1024, "srgb"],
    [
      "metallic_roughness",
      material.getMetallicRoughnessTexture(),
      1024,
      "linear",
    ],
    ["normal", material.getNormalTexture(), 1024, "linear"],
    ["occlusion", material.getOcclusionTexture(), 1024, "linear"],
  ],
  textures = {};
let colorPixels;
for (const [role, texture, resolution, colorSpace] of textureDefinitions) {
  if (!texture) continue;
  const image = texture.getImage();
  if (!image?.length) throw Error(`Missing original ${role} image`);
  // 已满足预算的 WebP 逐字节保留；避免再次编码既有的原色和粗糙度数据。
  const size = texture.getSize(),
    data =
      texture.getMimeType() === "image/webp" && Math.max(...size) <= resolution
        ? Buffer.from(image)
        : await sharp(image)
            .resize(resolution, resolution, { fit: "inside" })
            .webp(role === "color" ? { quality: 95 } : { lossless: true })
            .toBuffer(),
    file = `${kind}_hf_${role}.webp`;
  await writeFile(join(out, file), data);
  textures[role] = {
    file,
    colorSpace,
    bytes: data.length,
    sourceSha256: createHash("sha256").update(image).digest("hex"),
    sha256: createHash("sha256").update(data).digest("hex"),
  };
  if (role === "color")
    colorPixels = await sharp(data)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
}
if (!colorPixels) throw Error("The original generated albedo must be retained");
const colors = new Uint8Array(used.size * 3),
  baseColor = material.getBaseColorFactor();
for (let i = 0; i < used.size; i++) {
  const x = Math.round(compactUv[i * 2] * (colorPixels.info.width - 1)),
    y = Math.round(compactUv[i * 2 + 1] * (colorPixels.info.height - 1)),
    pixel = (y * colorPixels.info.width + x) * 4;
  for (let c = 0; c < 3; c++) {
    const value = colorPixels.data[pixel + c] / 255,
      linear =
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    colors[i * 3 + c] = Math.round(
      THREE.MathUtils.clamp(linear * baseColor[c], 0, 1) * 255,
    );
  }
}
// 对真实三角面逐体素拟合；不跨空腔连成整具包围盒，肋间仍是可通水域。
const cell = Number(contactCellArg),
  occupied = new Set(),
  triangle = new THREE.Triangle(),
  triBox = new THREE.Box3(),
  voxel = new THREE.Box3(),
  offset = new THREE.Vector3(),
  key = (x, y, z) => `${x},${y},${z}`;
for (let t = 0; t < sourceIndex.length; t += 3) {
  triangle.a.fromArray(positions, sourceIndex[t] * 3);
  triangle.b.fromArray(positions, sourceIndex[t + 1] * 3);
  triangle.c.fromArray(positions, sourceIndex[t + 2] * 3);
  triBox.setFromPoints([triangle.a, triangle.b, triangle.c]);
  const low = triBox.min.toArray().map((n) => Math.floor(n / cell)),
    high = triBox.max.toArray().map((n) => Math.floor(n / cell));
  for (let x = low[0]; x <= high[0]; x++)
    for (let y = low[1]; y <= high[1]; y++)
      for (let z = low[2]; z <= high[2]; z++) {
        const id = key(x, y, z);
        if (occupied.has(id)) continue;
        voxel.min.set(x * cell, y * cell, z * cell);
        voxel.max.copy(voxel.min).addScalar(cell);
        if (voxel.intersectsTriangle(triangle)) occupied.add(id);
      }
}
// 只在碰撞副本封闭单格生成裂缝；可见网格与大宝心空腔始终原样保留。
const rawSurfaceVoxels = occupied.size;
if (!["plain", "close6", "close26"].includes(collisionMode))
  throw Error(`Unknown collision mode: ${collisionMode}`);
if (collisionMode !== "plain") {
  const stencil = [[0, 0, 0]];
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++)
      for (let dz = -1; dz <= 1; dz++)
        if (
          Math.abs(dx) + Math.abs(dy) + Math.abs(dz) &&
          (collisionMode === "close26" ||
            Math.abs(dx) + Math.abs(dy) + Math.abs(dz) === 1)
        )
          stencil.push([dx, dy, dz]);
  const dilated = new Set();
  for (const id of occupied) {
    const p = id.split(",").map(Number);
    for (const d of stencil)
      dilated.add(key(p[0] + d[0], p[1] + d[1], p[2] + d[2]));
  }
  for (const id of dilated) {
    if (occupied.has(id)) continue;
    const p = id.split(",").map(Number);
    if (
      stencil.every((d) =>
        dilated.has(key(p[0] + d[0], p[1] + d[1], p[2] + d[2])),
      )
    )
      occupied.add(id);
  }
}
// 从外界洪泛可达的水体，填回被骨材表面完整包住的体素；不是只保留一层薄壳。
// 肋骨之间的大孔隙仍与外界连通，不会被当成整具胸腔实体。
const latticeMin = min.map((n) => Math.floor(n / cell) - 2),
  latticeMax = max.map((n) => Math.ceil(n / cell) + 2),
  outside = new Set(),
  queue = [latticeMin],
  neighbors = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
outside.add(key(...latticeMin));
for (let i = 0; i < queue.length; i++) {
  const p = queue[i];
  for (const d of neighbors) {
    const q = p.map((v, axis) => v + d[axis]),
      id = key(...q);
    if (
      q.some((v, axis) => v < latticeMin[axis] || v > latticeMax[axis]) ||
      occupied.has(id) ||
      outside.has(id)
    )
      continue;
    outside.add(id);
    queue.push(q);
  }
}
const surfaceVoxels = occupied.size;
for (let x = latticeMin[0]; x <= latticeMax[0]; x++)
  for (let y = latticeMin[1]; y <= latticeMax[1]; y++)
    for (let z = latticeMin[2]; z <= latticeMax[2]; z++)
      if (!outside.has(key(x, y, z))) occupied.add(key(x, y, z));
const pending = new Set(occupied),
  contacts = [];
const ordered = [...occupied]
  .map((id) => id.split(",").map(Number))
  .sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]);
for (const [x, y, z] of ordered) {
  const id = key(x, y, z);
  if (!pending.has(id)) continue;
  let nx = 1,
    ny = 1,
    nz = 1;
  while (pending.has(key(x + nx, y, z))) nx++;
  const full = (a, b, c) => {
    for (let dx = 0; dx < a; dx++)
      for (let dy = 0; dy < b; dy++)
        for (let dz = 0; dz < c; dz++)
          if (!pending.has(key(x + dx, y + dy, z + dz))) return false;
    return true;
  };
  while (full(nx, ny + 1, 1)) ny++;
  while (full(nx, ny, nz + 1)) nz++;
  for (let dx = 0; dx < nx; dx++)
    for (let dy = 0; dy < ny; dy++)
      for (let dz = 0; dz < nz; dz++)
        pending.delete(key(x + dx, y + dy, z + dz));
  contacts.push({
    type: "box",
    center: offset
      .set((x + nx / 2) * cell, (y + ny / 2) * cell, (z + nz / 2) * cell)
      .toArray(),
    half: [
      (nx * cell) / 2 + 0.00002,
      (ny * cell) / 2 + 0.00002,
      (nz * cell) / 2 + 0.00002,
    ],
    quaternion: [0, 0, 0, 1],
  });
}
const result = {
  format: 1,
  kind,
  source: "Microsoft TRELLIS.2-4B",
  sourceSha256,
  normalization:
    "Rigid rotation and uniform longest-axis Z length 1; no anatomy warping",
  sourceNormalization: {
    center: center.toArray(),
    scale,
    yaw: Number(yawArg),
    pitch: Number(pitchArg),
    roll: Number(rollArg),
  },
  vertices: used.size,
  triangles: nearIndices.length / 3,
  farTriangles: farIndices.length / 3,
  min,
  max,
  position: b64(quantized),
  normal: b64(normal),
  uv: b64(uv),
  color: b64(colors),
  index: b64(new Uint16Array([...nearIndices].map((id) => remap.get(id)))),
  farIndex: b64(new Uint16Array([...farIndices].map((id) => remap.get(id)))),
  pbr: {
    baseColor,
    roughness: material.getRoughnessFactor(),
    metalness: material.getMetallicFactor(),
    normalScale: material.getNormalScale(),
    occlusionStrength: material.getOcclusionStrength(),
    textures,
  },
  contacts,
  conversion: {
    sourceVertices: positions.length / 3,
    sourceTriangles: sourceIndex.length / 3,
    nearError,
    farError,
    contactCell: cell,
    collisionMode,
    rawSurfaceVoxels,
    occupiedSurfaceVoxels: surfaceVoxels,
    occupiedSolidVoxels: occupied.size,
  },
};
await writeFile(
  join(out, `${kind}_hf_mesh.json`),
  JSON.stringify(result) + "\n",
);
console.log(
  JSON.stringify(
    {
      sourceSha256,
      vertices: used.size,
      triangles: result.triangles,
      farTriangles: result.farTriangles,
      contacts: contacts.length,
      textures,
      min,
      max,
      conversion: result.conversion,
    },
    null,
    2,
  ),
);
