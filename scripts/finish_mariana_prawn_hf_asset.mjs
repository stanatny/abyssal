/** 仅修补本批 HF 虾：分开误粘的须尖，并以源腹足表面补齐五对腹足。 */
import fs from "node:fs";
const path = process.argv[2];
if (!path) throw Error("Provide converted glass_prawn mesh path");
const d = JSON.parse(fs.readFileSync(path));
if (d.prawnFinish) throw Error("Preserve source; finish must run once");
const dec = (s, T) => new T(Uint8Array.from(Buffer.from(s, "base64")).buffer),
  q = dec(d.position, Uint16Array),
  n = dec(d.normal, Int16Array),
  u = dec(d.uv, Uint16Array),
  chart = dec(d.uvChart, Uint16Array),
  oldIndex = dec(d.index, Uint16Array);
const p = Array.from({ length: d.vertices }, (_, i) =>
    [0, 1, 2].map(
      (a) => d.min[a] + (q[i * 3 + a] / 65535) * (d.max[a] - d.min[a]),
    ),
  ),
  norm = Array.from(n),
  uv = Array.from(u),
  charts = Array.from(chart),
  indices = [],
  leaf = [];
for (let i = 0; i < oldIndex.length; i += 3) {
  const t = Array.from(oldIndex.slice(i, i + 3));
  if (t.some((id) => p[id][2] < -0.49)) continue;
  indices.push(...t);
  if (
    t.every(
      (id) =>
        p[id][1] < -0.037 &&
        p[id][2] > 0.17 &&
        p[id][2] < 0.25 &&
        Math.abs(p[id][0]) < 0.061,
    )
  )
    leaf.push(t);
}
if (leaf.length < 30) throw Error("Missing source pleopod patch");
for (const target of [0.16, 0.255]) {
  const mapping = new Map();
  for (const t of leaf)
    for (const id of t) {
      if (!mapping.has(id)) {
        const v = p[id],
          side = Math.sign(v[0]) || 1;
        mapping.set(id, p.length);
        p.push([
          side * 0.024 + (v[0] - side * 0.024) * 0.75,
          -0.027 + (v[1] + 0.037) * 0.8,
          target + (v[2] - 0.21) * 0.58,
        ]);
        norm.push(n[id * 3] / 0.75, n[id * 3 + 1] / 0.8, n[id * 3 + 2] / 0.58);
        uv.push(u[id * 2], u[id * 2 + 1]);
        charts.push(chart[id]);
      }
      indices.push(mapping.get(id));
    }
}
const used = [...new Set(indices)],
  map = new Map(used.map((id, i) => [id, i])),
  pp = used.map((id) => p[id]),
  lo = [0, 1, 2].map((a) => Math.min(...pp.map((p) => p[a]))),
  hi = [0, 1, 2].map((a) => Math.max(...pp.map((p) => p[a]))),
  center = lo.map((v, a) => (v + hi[a]) / 2),
  scale = 1 / (hi[2] - lo[2]);
for (const v of pp)
  for (let a = 0; a < 3; a++) v[a] = (v[a] - center[a]) * scale;
const min = lo.map((v, a) => (v - center[a]) * scale),
  max = hi.map((v, a) => (v - center[a]) * scale);
const positions = new Uint16Array(
    pp.flatMap((v) =>
      v.map((x, a) => Math.round(((x - min[a]) / (max[a] - min[a])) * 65535)),
    ),
  ),
  normals = new Int16Array(
    used.flatMap((id) => {
      const v = norm.slice(id * 3, id * 3 + 3),
        l = Math.hypot(...v);
      return v.map((x) => Math.round((x / l) * 32767));
    }),
  );
const b64 = (a) =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
d.position = b64(positions);
d.normal = b64(normals);
d.uv = b64(new Uint16Array(used.flatMap((id) => uv.slice(id * 2, id * 2 + 2))));
d.uvChart = b64(new Uint16Array(used.map((id) => charts[id])));
d.index = b64(new Uint16Array(indices.map((id) => map.get(id))));
d.vertices = used.length;
d.triangles = indices.length / 3;
d.min = min;
d.max = max;
d.prawnFinish = {
  sourceTriangles: oldIndex.length / 3,
  sourcePleopodTriangles: leaf.length,
  addedPairs: 2,
  antennaTipCutZ: -0.49,
  center,
  scale,
};
fs.writeFileSync(path, JSON.stringify(d) + "\n");
console.log(d.prawnFinish, { vertices: d.vertices, triangles: d.triangles });
