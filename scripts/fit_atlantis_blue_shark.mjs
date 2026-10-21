/** 修正 HF 大青鲨的左右胸鳍静态差异；保留检查合格的左半表面，连续裁切后镜像。 */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as T from "three";
const [input, output] = process.argv.slice(2);
const data = await readFile(input),
  d = JSON.parse(data);
if (d.kind !== "blue_shark" || d.bilateralRepair)
  throw Error("Expected unmodified Blue Shark");
const decode = (s, C) =>
  new C(Uint8Array.from(Buffer.from(s, "base64")).buffer);
const q = decode(d.position, Uint16Array),
  nq = decode(d.normal, Int16Array),
  uv = decode(d.uv, Uint16Array),
  idx = decode(d.index, Uint16Array);
const vertices = Array.from({ length: d.vertices }, (_, i) => ({
  p: [0, 1, 2].map(
    (a) => d.min[a] + (q[i * 3 + a] / 65535) * (d.max[a] - d.min[a]),
  ),
  n: [0, 1, 2].map((a) => nq[i * 3 + a] / 32767),
  uv: [uv[i * 2] / 65535, uv[i * 2 + 1] / 65535],
}));
const ps = [],
  ns = [],
  us = [],
  indices = [],
  lookup = new Map();
function vertex(v, side) {
  const p = [v.p[0] * side, v.p[1], v.p[2]],
    n = new T.Vector3(v.n[0] * side, v.n[1], v.n[2]);
  if (Math.abs(p[0]) < 1e-9) {
    p[0] = 0;
    n.x = 0;
  }
  n.normalize();
  const a = n.toArray();
  const key = [...p, ...a, ...v.uv].map((x) => Math.round(x * 1e7)).join(",");
  if (lookup.has(key)) return lookup.get(key);
  const id = ps.length / 3;
  ps.push(...p);
  ns.push(...a);
  us.push(...v.uv);
  lookup.set(key, id);
  return id;
}
for (let i = 0; i < idx.length; i += 3) {
  let poly = [vertices[idx[i]], vertices[idx[i + 1]], vertices[idx[i + 2]]],
    out = [];
  for (let j = 0; j < 3; j++) {
    const a = poly[j],
      b = poly[(j + 1) % 3],
      inside = a.p[0] <= 0,
      next = b.p[0] <= 0;
    if (inside) out.push(a);
    if (inside !== next) {
      const t = -a.p[0] / (b.p[0] - a.p[0]);
      out.push({
        p: a.p.map((x, k) => (k === 0 ? 0 : x + (b.p[k] - x) * t)),
        n: a.n.map((x, k) => x + (b.n[k] - x) * t),
        uv: a.uv.map((x, k) => x + (b.uv[k] - x) * t),
      });
    }
  }
  for (let j = 1; j < out.length - 1; j++) {
    const tri = [out[0], out[j], out[j + 1]],
      a = new T.Vector3(...tri[0].p),
      b = new T.Vector3(...tri[1].p),
      c = new T.Vector3(...tri[2].p);
    if (b.sub(a).cross(c.sub(a)).lengthSq() < 1e-20) continue;
    indices.push(...tri.map((v) => vertex(v, 1)));
    indices.push(...[tri[2], tri[1], tri[0]].map((v) => vertex(v, -1)));
  }
}
if (ps.length / 3 > 65535) throw Error("Vertex budget");
const zlo = Math.min(...ps.filter((_, i) => i % 3 === 2)),
  zhi = Math.max(...ps.filter((_, i) => i % 3 === 2)),
  ylo = Math.min(...ps.filter((_, i) => i % 3 === 1)),
  yhi = Math.max(...ps.filter((_, i) => i % 3 === 1));
for (let i = 0; i < ps.length; i++)
  ps[i] =
    (ps[i] -
      (i % 3 === 2 ? (zlo + zhi) / 2 : i % 3 === 1 ? (ylo + yhi) / 2 : 0)) /
    (zhi - zlo);
const min = [0, 1, 2].map((a) => Math.min(...ps.filter((_, i) => i % 3 === a))),
  max = [0, 1, 2].map((a) => Math.max(...ps.filter((_, i) => i % 3 === a)));
const pq = Uint16Array.from(ps, (x, i) =>
  Math.round(((x - min[i % 3]) / (max[i % 3] - min[i % 3])) * 65535),
);
const b64 = (a) =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
const result = {
  ...d,
  min,
  max,
  vertices: ps.length / 3,
  triangles: indices.length / 3,
  position: b64(pq),
  normal: b64(Int16Array.from(ns, (x) => Math.round(x * 32767))),
  uv: b64(Uint16Array.from(us, (x) => Math.round(x * 65535))),
  index: b64(Uint16Array.from(indices)),
  bilateralRepair: {
    sourceSha256: createHash("sha256").update(data).digest("hex"),
    retainedSide:
      "negative X; continuous midline clipping and mirrored original UV/color",
    reason: "Unequal generated pectoral silhouettes and neutral angles",
  },
};
delete result.uvChart;
await writeFile(output, JSON.stringify(result) + "\n");
console.log({
  vertices: result.vertices,
  triangles: result.triangles,
  min,
  max,
});
