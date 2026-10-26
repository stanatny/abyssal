/** 修复本批已实查的 HF 解剖误差：去除帷翼尾端孤片，收回灯荚多生成的一片裙叶。 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import * as T from "three";
const [input, out] = process.argv.slice(2),
  source = await readFile(input),
  d = JSON.parse(source);
const dec = (s, C) => new C(Uint8Array.from(Buffer.from(s, "base64")).buffer),
  enc = (a) =>
    Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
const q = dec(d.position, Uint16Array),
  oldIndex = dec(d.index, Uint16Array),
  p = Array.from({ length: d.vertices }, (_, i) =>
    [0, 1, 2].map(
      (j) => d.min[j] + (q[i * 3 + j] / 65535) * (d.max[j] - d.min[j]),
    ),
  );
let ids = p.map((_, i) => i),
  indices = Array.from(oldIndex),
  reason = "";
if (d.kind === "veil_glider") {
  const parent = ids.slice(),
    seen = new Map();
  const root = (i) => {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]];
        i = parent[i];
      }
      return i;
    },
    join = (a, b) => (parent[root(b)] = root(a));
  ids.forEach((i) => {
    const k = q.slice(i * 3, i * 3 + 3).join(",");
    if (seen.has(k)) join(i, seen.get(k));
    else seen.set(k, i);
  });
  for (let i = 0; i < indices.length; i += 3) {
    join(indices[i], indices[i + 1]);
    join(indices[i], indices[i + 2]);
  }
  const groups = new Map();
  ids.forEach((i) => {
    const r = root(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(i);
  });
  const sorted = [...groups.values()].sort((a, b) => b.length - a.length);
  const fragments = sorted.filter(
    (g) =>
      g.length < 100 &&
      g.every((i) => p[i][2] > 0.35 && Math.abs(p[i][0]) < 0.08),
  );
  const removed = fragments.flat();
  const rejected = new Set(removed);
  ids = ids.filter((i) => !rejected.has(i));
  if (
    removed.length > d.vertices * 0.1 ||
    removed.some((i) => p[i][2] < 0.35 || Math.abs(p[i][0]) > 0.08)
  )
    throw Error("Unexpected detached anatomy");
  const keep = new Set(ids);
  indices = indices.filter((v, i) => keep.has(indices[i - (i % 3)]));
  reason = "Remove inspected detached diamond between intact forked tail tips";
} else if (d.kind === "lantern_pod") {
  // 删除多生成的侧叶外端，连续收回根部；其余五叶在原表面重新分布。
  const kept = [];
  for (let i = 0; i < indices.length; i += 3) {
    const tri = indices.slice(i, i + 3);
    const a = tri.map((id) => p[id]);
    const center = [0, 1, 2].map((j) => a.reduce((s, v) => s + v[j], 0) / 3);
    if (!(center[2] > 0.3 && Math.abs(Math.atan2(center[1], center[0])) < 0.77))
      kept.push(...tri);
  }
  indices = kept;
  for (const a of p) {
    const [x, y, z] = a;
    if (z <= 0.27) continue;
    const t = T.MathUtils.smoothstep(z, 0.27, 0.38),
      angle = Math.atan2(y, x),
      abs = Math.abs(angle),
      r = Math.hypot(x, y),
      w = 1 - T.MathUtils.smoothstep(abs, 0.55, 0.78),
      g = t * w;
    const targetAngle =
      Math.sign(angle) *
      (abs < 0.52
        ? abs * 0.18
        : 0.52 * 0.18 +
          ((abs - 0.52) * (Math.PI - 0.52 * 0.18)) / (Math.PI - 0.52));
    const theta = angle + (targetAngle - angle) * t,
      rad = r * (1 - g) + 0.055 * g;
    a[0] = rad * Math.cos(theta);
    a[1] = rad * Math.sin(theta);
    a[2] = z * (1 - g) + 0.295 * g;
  }
  reason =
    "Continuous remapping retracts the sixth generated skirt lobe into its existing collar; five retained broad leaves redistributed around the unchanged ribbed organ";
} else throw Error("Only reviewed mid-batch assets may be fitted");
const remap = new Map(ids.map((id, i) => [id, i]));
indices = indices.map((i) => remap.get(i));
let pts = ids.map((i) => p[i]);
if (d.kind === "lantern_pod") {
  const kept = [],
    a = new T.Vector3(),
    b = new T.Vector3(),
    c = new T.Vector3();
  for (let i = 0; i < indices.length; i += 3) {
    a.fromArray(pts[indices[i]]);
    b.fromArray(pts[indices[i + 1]]).sub(a);
    c.fromArray(pts[indices[i + 2]]).sub(a);
    if (b.cross(c).lengthSq() > 1e-18) kept.push(...indices.slice(i, i + 3));
  }
  indices = kept;
  const used = [...new Set(indices)],
    m = new Map(used.map((v, i) => [v, i]));
  pts = used.map((i) => pts[i]);
  ids = used.map((i) => ids[i]);
  indices = indices.map((i) => m.get(i));
}
const lo = [0, 1, 2].map((j) => Math.min(...pts.map((p) => p[j]))),
  hi = [0, 1, 2].map((j) => Math.max(...pts.map((p) => p[j]))),
  center = lo.map((v, j) => (v + hi[j]) / 2),
  scale = 1 / (hi[2] - lo[2]);
pts = pts.map((p) => p.map((v, j) => (v - center[j]) * scale));
const min = lo.map((v, j) => (v - center[j]) * scale),
  max = hi.map((v, j) => (v - center[j]) * scale),
  packed = new Uint16Array(pts.length * 3);
pts.forEach((p, i) =>
  p.forEach(
    (v, j) =>
      (packed[i * 3 + j] = Math.round(
        ((v - min[j]) / (max[j] - min[j])) * 65535,
      )),
  ),
);
for (const [name, C, n] of [
  ["normal", Int16Array, 3],
  ["uv", Uint16Array, 2],
  ["color", Uint8Array, 3],
])
  if (d[name]) {
    const a = dec(d[name], C),
      b = new C(ids.length * n);
    ids.forEach((id, i) => b.set(a.subarray(id * n, id * n + n), i * n));
    d[name] = enc(b);
  }
if (d.kind === "lantern_pod") {
  // 使用焊接位置计算面积加权法线，UV 分岛不会产生新的高光接缝。
  const sums = new Map(),
    keys = pts.map((p) => p.map((v) => Math.round(v * 1e6)).join(",")),
    v = new T.Vector3(),
    w = new T.Vector3(),
    a = new T.Vector3();
  for (let i = 0; i < indices.length; i += 3) {
    const [i0, i1, i2] = indices.slice(i, i + 3);
    a.fromArray(pts[i0]);
    v.fromArray(pts[i1]).sub(a);
    w.fromArray(pts[i2]).sub(a);
    v.cross(w);
    for (const id of [i0, i1, i2]) {
      if (!sums.has(keys[id])) sums.set(keys[id], new T.Vector3());
      sums.get(keys[id]).add(v);
    }
  }
  const n = new Int16Array(pts.length * 3);
  keys.forEach((k, i) =>
    sums
      .get(k)
      .clone()
      .normalize()
      .toArray()
      .forEach((v, j) => (n[i * 3 + j] = Math.round(v * 32767))),
  );
  d.normal = enc(n);
}
d.fit = {
  inputSha256: createHash("sha256").update(source).digest("hex"),
  reason,
  removedVertices: d.vertices - ids.length,
  center,
  scale,
};
d.position = enc(packed);
d.index = enc(new Uint16Array(indices));
d.min = min;
d.max = max;
d.vertices = pts.length;
d.triangles = indices.length / 3;
await mkdir(dirname(out), { recursive: true });
await writeFile(out, JSON.stringify(d) + "\n");
console.log({
  kind: d.kind,
  vertices: d.vertices,
  triangles: d.triangles,
  fit: d.fit,
});
