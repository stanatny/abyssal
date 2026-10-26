/** 清理缎带前端生成孤片；保留连续膜体及三条尾丝，重新等比归一化。 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
const [input, out] = process.argv.slice(2),
  source = await readFile(input),
  d = JSON.parse(source);
const dec = (s, T) => new T(Uint8Array.from(Buffer.from(s, "base64")).buffer),
  enc = (a) =>
    Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
if (d.kind !== "ribbon_spore")
  throw Error("Only the inspected Ribbon Spore input needs this cleanup");
const p = dec(d.position, Uint16Array),
  idx = dec(d.index, Uint16Array),
  parent = Array.from({ length: d.vertices }, (_, i) => i),
  seen = new Map();
function root(i) {
  while (parent[i] !== i) {
    parent[i] = parent[parent[i]];
    i = parent[i];
  }
  return i;
}
function union(a, b) {
  parent[root(b)] = root(a);
}
for (let i = 0; i < d.vertices; i++) {
  const k = Array.from(p.subarray(i * 3, i * 3 + 3)).join(",");
  if (seen.has(k)) union(i, seen.get(k));
  else seen.set(k, i);
}
for (let i = 0; i < idx.length; i += 3) {
  union(idx[i], idx[i + 1]);
  union(idx[i], idx[i + 2]);
}
const groups = new Map();
for (let i = 0; i < d.vertices; i++) {
  const r = root(i);
  if (!groups.has(r)) groups.set(r, []);
  groups.get(r).push(i);
}
const sorted = [...groups.values()].sort((a, b) => b.length - a.length),
  keep = new Set(sorted[0]),
  removed = d.vertices - keep.size;
if (removed > d.vertices * 0.1)
  throw Error(
    "Unexpected disconnected anatomy; review raw mesh instead of discarding",
  );
for (const g of sorted.slice(1))
  for (const i of g) {
    const z = d.min[2] + (p[i * 3 + 2] / 65535) * (d.max[2] - d.min[2]);
    if (z > -0.38)
      throw Error(
        "Unexpected detached region outside reviewed frontal artifact",
      );
  }
const ids = [...keep],
  remap = new Map(ids.map((id, i) => [id, i])),
  newIndex = [];
for (let i = 0; i < idx.length; i += 3)
  if (keep.has(idx[i]))
    newIndex.push(...[0, 1, 2].map((j) => remap.get(idx[i + j])));
const positions = ids.map((i) =>
    [0, 1, 2].map(
      (a) => d.min[a] + (p[i * 3 + a] / 65535) * (d.max[a] - d.min[a]),
    ),
  ),
  min = [0, 1, 2].map((a) => Math.min(...positions.map((p) => p[a]))),
  max = [0, 1, 2].map((a) => Math.max(...positions.map((p) => p[a]))),
  center = min.map((v, a) => (v + max[a]) / 2),
  scale = 1 / (max[2] - min[2]);
const lo = min.map((v, a) => (v - center[a]) * scale),
  hi = max.map((v, a) => (v - center[a]) * scale),
  q = new Uint16Array(ids.length * 3);
positions.forEach((p, i) =>
  p.forEach(
    (v, a) =>
      (q[i * 3 + a] = Math.round(
        (((v - center[a]) * scale - lo[a]) / (hi[a] - lo[a])) * 65535,
      )),
  ),
);
for (const [name, T, width] of [
  ["normal", Int16Array, 3],
  ["uv", Uint16Array, 2],
  ["color", Uint8Array, 3],
])
  if (d[name]) {
    const a = dec(d[name], T),
      b = new T(ids.length * width);
    ids.forEach((id, i) =>
      b.set(a.subarray(id * width, id * width + width), i * width),
    );
    d[name] = enc(b);
  }
d.cleanup = {
  inputSha256: createHash("sha256").update(source).digest("hex"),
  removedVertices: removed,
  removedTriangles: d.triangles - newIndex.length / 3,
  reason:
    "Disconnected frontal reconstruction fragments; continuous membrane and all three tail filaments retained",
  center,
  scale,
};
d.position = enc(q);
d.min = lo;
d.max = hi;
d.index = enc(new Uint16Array(newIndex));
d.vertices = ids.length;
d.triangles = newIndex.length / 3;
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(d) + "\n");
console.log({
  kind: d.kind,
  vertices: d.vertices,
  triangles: d.triangles,
  cleanup: d.cleanup,
});
