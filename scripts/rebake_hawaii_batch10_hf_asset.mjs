/** 为第十批鱼群低面网格重新展开图集，并离线投射原始 HF 表面颜色；保持三角面、姿态与体长。 */
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { padTextureIslands } from "./lib/pad_texture_islands.mjs";
const [rawPath, lowPath, baseTools, bakeTools, outPath] = process.argv.slice(2);
if (!outPath)
  throw Error("Usage: raw.glb low.json base-tools bake-tools out-dir");
const req = createRequire(join(resolve(baseTools), "package.json")),
  req2 = createRequire(join(resolve(bakeTools), "package.json")),
  load = (n) => import(pathToFileURL(req.resolve(n)).href),
  load2 = (n) => import(pathToFileURL(req2.resolve(n)).href);
const { NodeIO } = await load("@gltf-transform/core"),
  { ALL_EXTENSIONS } = await load("@gltf-transform/extensions"),
  T = await load2("three"),
  watlas = await load2("watlas"),
  { MeshBVH, getTriangleHitPointInfo } = await load2("three-mesh-bvh"),
  sharp = req("sharp");
const d = JSON.parse(await readFile(lowPath, "utf8")),
  decode = (s, Type) =>
    new Type(Uint8Array.from(Buffer.from(s, "base64")).buffer),
  q = decode(d.position, Uint16Array),
  nq = decode(d.normal, Int16Array),
  index = decode(d.index, Uint16Array),
  positions = new Float32Array(q.length),
  normals = new Float32Array(nq.length);
for (let i = 0; i < q.length; i++) {
  positions[i] = d.min[i % 3] + (q[i] / 65535) * (d.max[i % 3] - d.min[i % 3]);
  normals[i] = nq[i] / 32767;
}
await watlas.Initialize();
const atlas = new watlas.Atlas();
atlas.addMesh({
  vertexPositionData: positions,
  vertexCount: d.vertices,
  vertexPositionStride: 12,
  vertexNormalData: normals,
  vertexNormalStride: 12,
  indexData: index,
  indexCount: index.length,
});
atlas.generate(
  { normalSeamWeight: 2, maxIterations: 4 },
  { resolution: 1024, padding: 4, bilinear: true, rotateCharts: true },
);
if (atlas.atlasCount !== 1) throw Error("Expected one atlas");
const mesh = atlas.getMesh(0),
  uv = new Float32Array(mesh.vertexCount * 2),
  pq = new Uint16Array(mesh.vertexCount * 3),
  nq2 = new Int16Array(mesh.vertexCount * 3),
  chart = new Uint16Array(mesh.vertexCount),
  dstIndex = new Uint32Array(mesh.indexCount);
mesh.getIndexArray(dstIndex);
for (let i = 0; i < mesh.vertexCount; i++) {
  const v = mesh.getVertex(i);
  if (v.atlasIndex !== 0) throw Error("Invalid atlas index");
  uv.set([v.uv[0] / atlas.width, v.uv[1] / atlas.height], i * 2);
  pq.set(q.subarray(v.xref * 3, v.xref * 3 + 3), i * 3);
  nq2.set(nq.subarray(v.xref * 3, v.xref * 3 + 3), i * 3);
  chart[i] = v.chartIndex;
}
const atlasInfo = {
  width: atlas.width,
  height: atlas.height,
  charts: atlas.chartCount,
  vertices: mesh.vertexCount,
};
atlas.delete();
console.log("atlas", atlasInfo);
const rawDoc = await new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .read(resolve(rawPath)),
  prim = rawDoc.getRoot().listMeshes()[0].listPrimitives()[0],
  rawP = prim.getAttribute("POSITION").getArray(),
  rawUV = prim.getAttribute("TEXCOORD_0").getArray(),
  rawI = prim.getIndices().getArray(),
  rawGeom = new T.BufferGeometry(),
  p = new Float32Array(rawP.length),
  rot = new T.Matrix4().makeRotationY(d.yaw),
  v = new T.Vector3();
for (let i = 0; i < p.length; i += 3)
  v.fromArray(rawP, i).applyMatrix4(rot).toArray(p, i);
rawGeom.setAttribute("position", new T.BufferAttribute(p, 3));
rawGeom.computeBoundingBox();
const center = new T.Vector3().fromArray(d.sourceNormalization.center),
  scale = d.sourceNormalization.scale;
for (let i = 0; i < p.length; i += 3)
  v.fromArray(p, i).sub(center).multiplyScalar(scale).toArray(p, i);
rawGeom.setAttribute("uv", new T.BufferAttribute(rawUV, 2));
rawGeom.setIndex(new T.BufferAttribute(rawI, 1));
const bvh = new MeshBVH(rawGeom, { indirect: true }),
  image = await sharp(prim.getMaterial().getBaseColorTexture().getImage())
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
const size = 1024,
  pixels = new Uint8Array(size * size * 4),
  point = new T.Vector3(),
  hit = { point: new T.Vector3() },
  info = {};
const dstPositions = new Float32Array(pq.length);
for (let i = 0; i < pq.length; i++)
  dstPositions[i] =
    d.min[i % 3] + (pq[i] / 65535) * (d.max[i % 3] - d.min[i % 3]);
let samples = 0,
  maxDistance = 0,
  sumDistance = 0;
const distances = [];
for (let t = 0; t < dstIndex.length; t += 3) {
  const ids = [dstIndex[t], dstIndex[t + 1], dstIndex[t + 2]],
    tri = ids.map((i) => [uv[2 * i] * size - 0.5, uv[2 * i + 1] * size - 0.5]),
    [[ax, ay], [bx, by], [cx, cy]] = tri,
    den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  if (Math.abs(den) < 1e-10) continue;
  for (
    let y = Math.max(0, Math.ceil(Math.min(ay, by, cy)));
    y <= Math.min(size - 1, Math.floor(Math.max(ay, by, cy)));
    y++
  )
    for (
      let x = Math.max(0, Math.ceil(Math.min(ax, bx, cx)));
      x <= Math.min(size - 1, Math.floor(Math.max(ax, bx, cx)));
      x++
    ) {
      const a = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den,
        b = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den,
        c = 1 - a - b;
      if (Math.min(a, b, c) < -1e-6) continue;
      point.set(0, 0, 0);
      for (let k = 0; k < 3; k++)
        point.addScaledVector(
          v.fromArray(dstPositions, ids[k] * 3),
          [a, b, c][k],
        );
      const h = bvh.closestPointToPoint(point, hit, 0, 0.05);
      if (!h) throw Error("Missing source surface");
      getTriangleHitPointInfo(hit.point, rawGeom, hit.faceIndex, info);
      const sx = Math.max(
          0,
          Math.min(image.info.width - 1, info.uv.x * image.info.width - 0.5),
        ),
        sy = Math.max(
          0,
          Math.min(image.info.height - 1, info.uv.y * image.info.height - 0.5),
        ),
        ix = Math.floor(sx),
        iy = Math.floor(sy),
        fx = sx - ix,
        fy = sy - iy,
        o = (y * size + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        let col = 0;
        for (let j = 0; j < 2; j++)
          for (let i = 0; i < 2; i++)
            col +=
              image.data[
                (Math.min(image.info.height - 1, iy + j) * image.info.width +
                  Math.min(image.info.width - 1, ix + i)) *
                  4 +
                  ch
              ] *
              (i ? fx : 1 - fx) *
              (j ? fy : 1 - fy);
        pixels[o + ch] = Math.round(col);
      }
      pixels[o + 3] = 255;
      samples++;
      sumDistance += hit.distance;
      maxDistance = Math.max(maxDistance, hit.distance);
      distances.push(hit.distance);
    }
  if (t % 1500 === 0)
    console.log("baking", t / 3, "/", dstIndex.length / 3, samples);
}
const pad = padTextureIslands(pixels, size, size, uv, dstIndex),
  b64 = (a) =>
    Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64"),
  uv16 = new Uint16Array(uv.length);
for (let i = 0; i < uv.length; i++) uv16[i] = Math.round(uv[i] * 65535);
const out = {
  ...d,
  vertices: pq.length / 3,
  position: b64(pq),
  normal: b64(nq2),
  uv: b64(uv16),
  index: b64(new Uint16Array(dstIndex)),
  uvChart: b64(chart),
  textureBake: {
    method: "watlas UV unwrap + closest source surface albedo transfer",
    sourceSha256: createHash("sha256")
      .update(await readFile(rawPath))
      .digest("hex"),
    lowMeshSha256: createHash("sha256")
      .update(await readFile(lowPath))
      .digest("hex"),
    atlas: atlasInfo,
  },
};
await mkdir(outPath, { recursive: true });
await writeFile(
  join(outPath, `${d.kind}_hf_mesh.json`),
  JSON.stringify(out) + "\n",
);
await sharp(pad.data, { raw: { width: size, height: size, channels: 4 } })
  .webp({ quality: 94 })
  .toFile(join(outPath, `${d.kind}_hf_color.webp`));
distances.sort((a, b) => a - b);
const report = {
  triangles: d.triangles,
  vertices: out.vertices,
  samples,
  meanDistance: sumDistance / samples,
  maxDistance,
  p99Distance: distances[Math.floor(distances.length * 0.99)],
  atlas: atlasInfo,
  padding: pad.stats,
};
await writeFile(
  join(outPath, `${d.kind}_bake_report.json`),
  JSON.stringify(report, null, 2),
);
console.log(report);
