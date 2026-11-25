/** 将 HF 单首海龙按实测朝向刚性旋转、等比归一化，并按原 UV 保留生成鳞片。 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as T from "three";
import { padTextureIslands } from "./lib/pad_texture_islands.mjs";
const [input, tools, output = "src/assets/models"] = process.argv.slice(2);
if (!input || !tools)
  throw Error("Usage: raw.glb tools-directory [output-directory]");
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
    [
      rawNormals[i * 3],
      rawNormals[i * 3 + 1],
      rawNormals[i * 3 + 2],
      rawUV[i * 2],
      rawUV[i * 2 + 1],
    ],
    i * 5,
  );
await MeshoptSimplifier.ready;
const [reduced] = MeshoptSimplifier.simplifyWithAttributes(
  new Uint32Array(primitive.getIndices().getArray()),
  rawPositions,
  3,
  attributes,
  5,
  [0.5, 0.5, 0.5, 1, 1],
  null,
  24000 * 3,
  0.012,
  ["Permissive"],
);
primitive.getIndices().setArray(reduced);
compactPrimitive(primitive);
const p = primitive.getAttribute("POSITION").getArray(),
  n = primitive.getAttribute("NORMAL").getArray(),
  uv = primitive.getAttribute("TEXCOORD_0").getArray(),
  ix = primitive.getIndices().getArray();
const positions = new Float32Array(p.length),
  normals = new Float32Array(n.length);
const v = new T.Vector3();
// 新源资产本身已是自然水平游姿；只旋转朝向，不再拉直或改变任何中性截面。
const rotation = new T.Matrix4().makeRotationY(Math.PI);
for (let i = 0; i < p.length; i += 3) {
  v.fromArray(p, i).applyMatrix4(rotation).toArray(positions, i);
  v.fromArray(n, i).transformDirection(rotation).toArray(normals, i);
}
const geometry = new T.BufferGeometry();
geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
geometry.computeBoundingBox();
const center = geometry.boundingBox.getCenter(new T.Vector3());
const scale = 1 / (geometry.boundingBox.max.z - geometry.boundingBox.min.z);
for (let i = 0; i < positions.length; i += 3) {
  v.fromArray(positions, i)
    .sub(center)
    .multiplyScalar(scale)
    .toArray(positions, i);
}
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
  qn[i] = Math.round(normals[i] * 32767);
}
for (let i = 0; i < quv.length; i++)
  quv[i] = Math.round(T.MathUtils.clamp(uv[i], 0, 1) * 65535);
const median = (values) => {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
};
const centerline = Array.from({ length: 24 }, (_, i) => {
  const z = T.MathUtils.lerp(-0.49, 0.49, i / 23);
  const xs = [],
    ys = [];
  for (let j = 0; j < positions.length; j += 3) {
    if (Math.abs(positions[j + 2] - z) < 0.015) {
      xs.push(positions[j]);
      ys.push(positions[j + 1]);
    }
  }
  if (!xs.length) throw Error(`No actual axial surface at ${z}`);
  return [median(xs), median(ys), z];
});
const centerlineRadii = centerline.map((point) => {
  let radius = 0.002;
  for (let j = 0; j < positions.length; j += 3) {
    if (Math.abs(positions[j + 2] - point[2]) < 0.022)
      radius = Math.max(
        radius,
        Math.hypot(positions[j] - point[0], positions[j + 1] - point[1]),
      );
  }
  return radius;
});
const centerlineLength = centerline
  .slice(1)
  .reduce(
    (sum, point, i) =>
      sum + new T.Vector3(...point).distanceTo(new T.Vector3(...centerline[i])),
    0,
  );
const mouthAnchor = [...centerline[0]];
mouthAnchor[2] = -0.497;
const b64 = (a) =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
const sourceSha256 = createHash("sha256")
  .update(await readFile(input))
  .digest("hex");
const asset = {
  format: 1,
  kind: "ladon",
  source: "Microsoft TRELLIS.2-4B",
  sourceSha256,
  sourceSpaceRevision: "ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d",
  sourceNormalization: {
    yaw: Math.PI,
    center: center.toArray(),
    scale,
    method:
      "Rigid orientation and uniform normalization only; natural horizontal source geometry retained",
  },
  vertices: positions.length / 3,
  triangles: ix.length / 3,
  min,
  max,
  position: b64(q),
  normal: b64(qn),
  uv: b64(quv),
  index: b64(new Uint16Array(ix)),
  centerline,
  centerlineRadii,
  centerlineLength,
  mouthAnchor,
};
await mkdir(resolve(output), { recursive: true });
await writeFile(
  join(resolve(output), "ladon_hf_mesh.json"),
  JSON.stringify(asset) + "\n",
);
const image = primitive.getMaterial().getBaseColorTexture().getImage();
const decoded = await sharp(image)
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
await sharp(padded.data, {
  raw: { width: decoded.info.width, height: decoded.info.height, channels: 4 },
})
  .webp({ quality: 94 })
  .toFile(join(resolve(output), "ladon_hf_color.webp"));
console.log(
  JSON.stringify({
    sourceSha256,
    rawTriangles,
    vertices: asset.vertices,
    triangles: asset.triangles,
    min,
    max,
    centerlineLength,
    centerlineRadii,
    texturePadding: padded.stats,
  }),
);
