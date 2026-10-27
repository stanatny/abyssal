/** Reduce an outward dense repair surface; usage: basename tools-directory voxel-pitch optional-triangle-budget. Rebake source colors before runtime fitting. */
import { readFileSync, writeFileSync } from "node:fs";
import * as T from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
const { MeshoptSimplifier } = await import(
  pathToFileURL(
    join(resolve(process.argv[3]), "node_modules/meshoptimizer/index.js"),
  ).href
);
const path = process.argv[2],
  buf = readFileSync(path + ".ply"),
  g = new PLYLoader().parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  ),
  d = JSON.parse(readFileSync(path + ".source.json"));
let signed = 0;
const pp = g.attributes.position.array,
  ii = g.index.array;
for (let i = 0; i < ii.length; i += 3) {
  const a = ii[i] * 3,
    b = ii[i + 1] * 3,
    c = ii[i + 2] * 3;
  signed +=
    pp[a] * (pp[b + 1] * pp[c + 2] - pp[b + 2] * pp[c + 1]) +
    pp[a + 1] * (pp[b + 2] * pp[c] - pp[b] * pp[c + 2]) +
    pp[a + 2] * (pp[b] * pp[c + 1] - pp[b + 1] * pp[c]);
}
if (signed < 0)
  for (let i = 0; i < ii.length; i += 3) {
    [ii[i + 1], ii[i + 2]] = [ii[i + 2], ii[i + 1]];
  }
g.computeVertexNormals();
await MeshoptSimplifier.ready;
const [idx, error] = MeshoptSimplifier.simplify(
  new Uint32Array(g.index.array),
  g.attributes.position.array,
  3,
  Number(process.argv[5] || 16000) * 3,
  0.01,
  ["LockBorder"],
);
const unique = [...new Set(idx)].sort((a, b) => a - b),
  map = new Map(unique.map((n, i) => [n, i]));
const p = new Float32Array(unique.length * 3);
unique.forEach((id, i) =>
  p.set(g.attributes.position.array.subarray(id * 3, id * 3 + 3), i * 3),
);
const index = Uint16Array.from(idx, (i) => map.get(i));
const out = new T.BufferGeometry();
out.setAttribute("position", new T.BufferAttribute(p, 3));
out.setIndex(new T.BufferAttribute(index, 1));
const denseN = new Float32Array(p.length);
unique.forEach((id, i) =>
  denseN.set(g.attributes.normal.array.subarray(id * 3, id * 3 + 3), i * 3),
);
out.setAttribute("normal", new T.BufferAttribute(denseN, 3));
out.computeBoundingBox();
const min = out.boundingBox.min.toArray(),
  max = out.boundingBox.max.toArray(),
  q = Uint16Array.from(p, (v, i) =>
    Math.round(((v - min[i % 3]) / (max[i % 3] - min[i % 3])) * 65535),
  ),
  n = Int16Array.from(out.attributes.normal.array, (v) =>
    Math.round(v * 32767),
  ),
  pack = (a) =>
    Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
Object.assign(d, {
  min,
  max,
  vertices: p.length / 3,
  triangles: index.length / 3,
  position: pack(q),
  normal: pack(n),
  index: pack(index),
  uv: pack(new Uint16Array((p.length / 3) * 2)),
  surfaceCleanup: {
    method: "Closed source volume; topology-preserving meshoptimizer reduction",
    pitch: Number(process.argv[4] || 0.0025),
    error,
  },
});
d.albedoProjection = "normal";
delete d.uvChart;
writeFileSync(path + ".json", JSON.stringify(d) + "\n");
console.log(d.vertices, d.triangles, error);
