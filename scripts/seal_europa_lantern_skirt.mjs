import { repairPackedNormals } from "./repair_packed_normals.mjs";
/** 缝合灯荚删去多余裙叶后的双层切边；连接内外表面，不填成新的叶片或遮挡球。 */
import { readFile, writeFile } from "node:fs/promises";
import * as T from "three";
const [file] = process.argv.slice(2),
  d = JSON.parse(await readFile(file));
if (d.kind !== "lantern_pod" || d.skirtClosure)
  throw Error("Expected unsealed fitted Lantern Pod");
const dec = (s, C) => new C(Uint8Array.from(Buffer.from(s, "base64")).buffer),
  enc = (a) =>
    Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64"),
  q = Array.from(dec(d.position, Uint16Array)),
  n = Array.from(dec(d.normal, Int16Array)),
  uv = Array.from(dec(d.uv, Uint16Array)),
  idx = Array.from(dec(d.index, Uint16Array)),
  p = Array.from({ length: d.vertices }, (_, i) =>
    [0, 1, 2].map(
      (j) => d.min[j] + (q[i * 3 + j] / 65535) * (d.max[j] - d.min[j]),
    ),
  ),
  map = new Map(),
  rep = [],
  edges = new Map();
for (let i = 0; i < p.length; i++) {
  const k = q.slice(i * 3, i * 3 + 3).join(",");
  if (!map.has(k)) map.set(k, i);
  rep.push(map.get(k));
}
for (let i = 0; i < idx.length; i += 3)
  for (let j = 0; j < 3; j++) {
    const a = rep[idx[i + j]],
      b = rep[idx[i + ((j + 1) % 3)]],
      key = [a, b].sort((a, b) => a - b).join(",");
    if (!edges.has(key)) edges.set(key, { a, b, n: 0 });
    edges.get(key).n++;
  }
const open = [...edges.values()].filter(
    (e) => e.n === 1 && p[e.a][2] > 0.28 && p[e.b][2] > 0.28,
  ),
  adj = new Map();
for (const e of open)
  for (const [a, b] of [
    [e.a, e.b],
    [e.b, e.a],
  ]) {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push(b);
  }
const seen = new Set(),
  loops = [];
for (const a of adj.keys()) {
  if (seen.has(a)) continue;
  const ids = [],
    queue = [a];
  while (queue.length) {
    const v = queue.pop();
    if (seen.has(v)) continue;
    seen.add(v);
    ids.push(v);
    queue.push(...adj.get(v));
  }
  if (ids.length > 10 && ids.every((i) => adj.get(i).length === 2)) {
    const order = [ids[0]];
    let prev = -1,
      current = ids[0];
    do {
      const next = adj.get(current).find((v) => v !== prev);
      prev = current;
      current = next;
      if (current !== order[0]) order.push(current);
    } while (current !== order[0] && order.length < 1000);
    loops.push(order);
  }
}
if (loops.length !== 2) throw Error("Unexpected skirt cut boundaries");
const dist = (a, b) =>
  new T.Vector3(...p[a]).distanceTo(new T.Vector3(...p[b]));
let [a, b] = loops;
const edge = open.find((e) => e.a === a[0] && e.b === a[1]);
if (!edge) a = a.slice().reverse();
let nearest = 0;
for (let j = 1; j < b.length; j++)
  if (dist(a[0], b[j]) < dist(a[0], b[nearest])) nearest = j;
b = b.slice(nearest).concat(b.slice(0, nearest));
if (dist(a[1], b[1]) > dist(a[1], b.at(-1)))
  b = [b[0], ...b.slice(1).reverse()];
const lengths = (c) => {
  const s = [0];
  for (let i = 0; i < c.length; i++)
    s.push(s.at(-1) + dist(c[i], c[(i + 1) % c.length]));
  return s.map((v) => v / s.at(-1));
};
let best = Infinity,
  bestB,
  bestPath;
for (const reverse of [false, true])
  for (let start = 0; start < b.length; start++) {
    let c = b.slice(start).concat(b.slice(0, start));
    if (reverse) c = [c[0], ...c.slice(1).reverse()];
    const N = a.length,
      M = c.length,
      dp = Array.from({ length: N + 1 }, () =>
        new Float64Array(M + 1).fill(Infinity),
      ),
      from = Array.from({ length: N + 1 }, () => new Uint8Array(M + 1));
    dp[0][0] = dist(a[0], c[0]);
    for (let i = 0; i <= N; i++)
      for (let j = 0; j <= M; j++) {
        if (i === 0 && j === 0) continue;
        const d = dist(a[i % N], c[j % M]),
          aa = i ? dp[i - 1][j] : Infinity,
          bb = j ? dp[i][j - 1] : Infinity;
        from[i][j] = aa <= bb ? 1 : 2;
        dp[i][j] = Math.max(d, Math.min(aa, bb));
      }
    if (dp[N][M] < best) {
      best = dp[N][M];
      bestB = c;
      const path = [];
      let i = N,
        j = M;
      while (i || j) {
        const v = from[i][j];
        path.push(v);
        if (v === 1) i--;
        else j--;
      }
      bestPath = path.reverse();
    }
  }
b = bestB;
const colorUV = uv.slice(
  a[Math.floor(a.length / 2)] * 2,
  a[Math.floor(a.length / 2)] * 2 + 2,
);
let i = 0,
  j = 0,
  added = 0,
  maxSpan = 0;
function tri(ids) {
  const v = new T.Vector3(...p[ids[1]]).sub(new T.Vector3(...p[ids[0]])),
    w = new T.Vector3(...p[ids[2]]).sub(new T.Vector3(...p[ids[0]])),
    normal = v.cross(w);
  if (normal.lengthSq() < 1e-18) return;
  normal.normalize();
  for (const id of ids) {
    idx.push(q.length / 3);
    q.push(...q.slice(id * 3, id * 3 + 3));
    n.push(...normal.toArray().map((v) => Math.round(v * 32767)));
    uv.push(...colorUV);
  }
  added++;
}
for (const step of bestPath) {
  const ai = a[i % a.length],
    bj = b[j % b.length];
  maxSpan = Math.max(maxSpan, dist(ai, bj));
  if (step === 1) {
    tri([a[(i + 1) % a.length], ai, bj]);
    i++;
  } else {
    tri([ai, b[(j + 1) % b.length], bj]);
    j++;
  }
}
if (maxSpan > 0.12)
  throw Error("Skirt boundary match spans too far: " + maxSpan);
// 只柔化切边周围的既有颈环，保留五片叶面及硬肋的形状。
const keyMap = new Map(),
  reps = [],
  positions = [],
  groups = [];
for (let k = 0; k < q.length / 3; k++) {
  const key = q.slice(k * 3, k * 3 + 3).join(",");
  if (!keyMap.has(key)) {
    keyMap.set(key, positions.length);
    positions.push(
      new T.Vector3(
        ...[0, 1, 2].map(
          (c) => d.min[c] + (q[k * 3 + c] / 65535) * (d.max[c] - d.min[c]),
        ),
      ),
    );
    groups.push([]);
  }
  const id = keyMap.get(key);
  reps.push(id);
  groups[id].push(k);
}
// 裙叶基底为闭合软组织；收合原导出中无用途的中心孔，仍使用同一连续表面。
for (const p of positions) {
  const r = Math.hypot(p.x - 0.02, p.y - 0.008),
    a =
      T.MathUtils.smoothstep(p.z, 0.265, 0.32) *
      (1 - T.MathUtils.smoothstep(r, 0.075, 0.15));
  p.x += (0.02 - p.x) * a;
  p.y += (0.008 - p.y) * a;
  p.z += (0.315 - p.z) * a;
}
const neighbours = positions.map(() => new Set());
for (let k = 0; k < idx.length; k += 3)
  for (let c = 0; c < 3; c++) {
    const a = reps[idx[k + c]],
      b = reps[idx[k + ((c + 1) % 3)]];
    neighbours[a].add(b);
    neighbours[b].add(a);
  }
const masks = positions.map(
  (p) =>
    T.MathUtils.smoothstep(p.z, 0.26, 0.33) *
    (1 -
      T.MathUtils.smoothstep(Math.hypot(p.x - 0.02, p.y - 0.008), 0.1, 0.18)),
);
for (let pass = 0; pass < 12; pass++) {
  const next = positions.map((p, k) => {
    const a = new T.Vector3();
    for (const id of neighbours[k]) a.add(positions[id]);
    if (neighbours[k].size) a.multiplyScalar(1 / neighbours[k].size);
    return p
      .clone()
      .add(a.sub(p).multiplyScalar(masks[k] * (pass % 2 ? -0.38 : 0.42)));
  });
  positions.forEach((p, k) => p.copy(next[k]));
}
positions.forEach((p, k) => {
  for (const id of groups[k])
    p.toArray().forEach(
      (v, c) =>
        (q[id * 3 + c] = Math.round(
          ((v - d.min[c]) / (d.max[c] - d.min[c])) * 65535,
        )),
    );
});
const sums = positions.map(() => new T.Vector3());
for (let k = 0; k < idx.length; k += 3) {
  const ids = idx.slice(k, k + 3).map((i) => reps[i]),
    v = positions[ids[1]]
      .clone()
      .sub(positions[ids[0]])
      .cross(positions[ids[2]].clone().sub(positions[ids[0]]));
  for (const id of ids) sums[id].add(v);
}
sums.forEach((v, k) => {
  if (masks[k] > 0.001 && v.lengthSq() > 0) {
    v.normalize();
    for (const id of groups[k])
      v.toArray().forEach((x, c) => (n[id * 3 + c] = Math.round(x * 32767)));
  }
});
// 颈环闭合后移除压成零面积的面，避免保留无效三角形。
const clean = [];
for (let k = 0; k < idx.length; k += 3) {
  const vs = idx
    .slice(k, k + 3)
    .map(
      (i) =>
        new T.Vector3(
          ...[0, 1, 2].map(
            (c) => d.min[c] + (q[i * 3 + c] / 65535) * (d.max[c] - d.min[c]),
          ),
        ),
    );
  if (vs[1].sub(vs[0]).cross(vs[2].sub(vs[0])).lengthSq() > 1e-18)
    clean.push(...idx.slice(k, k + 3));
}
idx.splice(0, idx.length, ...clean);
d.position = enc(new Uint16Array(q));
d.normal = enc(new Int16Array(n));
d.uv = enc(new Uint16Array(uv));
d.index = enc(new Uint16Array(idx));
d.vertices = q.length / 3;
d.triangles = idx.length / 3;
d.skirtClosure = {
  boundaryLengths: loops.map((a) => a.length),
  addedTriangles: added,
  maxSpan,
  method:
    "Connect paired inner/outer cut loops with a minimum-span monotonic zipper; existing five leaf surfaces retained",
};
repairPackedNormals(d);
await writeFile(file, JSON.stringify(d) + "\n");
console.log(d.skirtClosure);
