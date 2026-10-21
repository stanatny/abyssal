/** 离线剔除 HF 生成在细触须末端的游离微片；保留主表面、完整卷须和眼部结构。 */
import { readFile, writeFile } from "node:fs/promises";
const path = process.argv[2];
if (!path) throw Error("Usage: pearl_nautilus_hf_mesh.json");
const d = JSON.parse(await readFile(path, "utf8"));
if (d.kind !== "pearl_nautilus") throw Error("Only Pearl Nautilus");
const dec = (s) =>
    new Uint16Array(Uint8Array.from(Buffer.from(s, "base64")).buffer),
  q = dec(d.position),
  idx = dec(d.index),
  parent = Array.from({ length: d.vertices }, (_, i) => i),
  weld = new Map(),
  id = [];
const root = (i) => {
  while (parent[i] !== i) {
    parent[i] = parent[parent[i]];
    i = parent[i];
  }
  return i;
};
for (let i = 0; i < d.vertices; i++) {
  const key = Array.from(q.subarray(i * 3, i * 3 + 3)).join(",");
  if (!weld.has(key)) weld.set(key, i);
  id.push(weld.get(key));
}
for (let i = 0; i < idx.length; i += 3) {
  const a = root(id[idx[i]]);
  parent[root(id[idx[i + 1]])] = a;
  parent[root(id[idx[i + 2]])] = a;
}
const groups = new Map();
for (let i = 0; i < idx.length; i += 3) {
  const r = root(id[idx[i]]);
  if (!groups.has(r)) groups.set(r, []);
  groups.get(r).push(i);
}
const removed = new Set(),
  evidence = [];
for (const rows of groups.values()) {
  if (rows.length > 24) continue;
  const ids = new Set(rows.flatMap((i) => Array.from(idx.subarray(i, i + 3)))),
    min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (const i of ids)
    for (let a = 0; a < 3; a++) {
      const p = d.min[a] + (q[i * 3 + a] / 65535) * (d.max[a] - d.min[a]);
      min[a] = Math.min(min[a], p);
      max[a] = Math.max(max[a], p);
    }
  if (max[2] >= -0.35 || Math.hypot(...max.map((v, i) => v - min[i])) > 0.09)
    continue;
  rows.forEach((i) => removed.add(i));
  evidence.push({ triangles: rows.length, min, max });
}
const retained = [];
for (let i = 0; i < idx.length; i += 3)
  if (!removed.has(i)) retained.push(...idx.subarray(i, i + 3));
const packed = new Uint16Array(retained);
d.index = Buffer.from(packed.buffer).toString("base64");
d.triangles = retained.length / 3;
d.fragmentCleanup = {
  method:
    "Disconnected distal fragments <=24 faces, z below -0.35, diameter below 0.09; main surface unchanged",
  removedTriangles: removed.size,
  components: evidence,
};
await writeFile(path, JSON.stringify(d) + "\n");
console.log({
  triangles: d.triangles,
  removedTriangles: removed.size,
  components: evidence.length,
});
