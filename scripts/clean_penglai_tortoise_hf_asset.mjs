/** 剔除原始 HF 导出中与躯体完全分离的重影头；原始 GLB 和 UV 颜色均保留。 */
import { readFile, writeFile } from "node:fs/promises";
const [input, output, report] = process.argv.slice(2);
const a = JSON.parse(await readFile(input, "utf8"));
const decode = (s) => {
  const b = Buffer.from(s, "base64");
  return new Uint16Array(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  );
};
const q = decode(a.position),
  index = decode(a.index),
  parent = Int32Array.from({ length: a.vertices }, (_, i) => i),
  seen = new Map();
const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  },
  join = (x, y) => {
    parent[find(x)] = find(y);
  };
const point = (i) =>
  [0, 1, 2].map(
    (k) => a.min[k] + (q[i * 3 + k] / 65535) * (a.max[k] - a.min[k]),
  );
for (let i = 0; i < a.vertices; i++) {
  const key = point(i)
    .map((x) => x.toFixed(4))
    .join(",");
  if (seen.has(key)) join(i, seen.get(key));
  else seen.set(key, i);
}
for (let i = 0; i < index.length; i += 3) {
  join(index[i], index[i + 1]);
  join(index[i], index[i + 2]);
}
const groups = new Map();
for (let i = 0; i < a.vertices; i++) {
  const r = find(i);
  if (!groups.has(r)) groups.set(r, []);
  groups.get(r).push(i);
}
const remove = new Set(),
  removed = [];
for (const ids of groups.values()) {
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (const i of ids) {
    const p = point(i);
    p.forEach((x, k) => {
      min[k] = Math.min(min[k], x);
      max[k] = Math.max(max[k], x);
    });
  }
  // 仅删除实测右后方漂浮头部及其独立小碎片，不触及四肢、原龟头；另移除脱离蛇嘴的孤立舌尖。
  if (
    (min[0] > 0.3 && min[1] > 0.035 && min[2] > 0.06 && max[2] < 0.28) ||
    (min[0] < -0.21 && max[0] < -0.2 && min[1] > 0.2 && ids.length < 100)
  ) {
    ids.forEach((i) => remove.add(i));
    removed.push({ vertices: ids.length, min, max });
  }
}
if (remove.size < 1500 || remove.size > 4000)
  throw Error("Unexpected ghost fragment; inspect source before filtering");
const kept = [];
for (let i = 0; i < index.length; i += 3)
  if (!remove.has(index[i])) kept.push(index[i], index[i + 1], index[i + 2]);
const used = [...new Set(kept)].sort((a, b) => a - b),
  mapping = new Map(used.map((id, i) => [id, i]));
for (const [key, stride] of [
  ["position", 6],
  ["normal", 6],
  ["uv", 4],
]) {
  const b = Buffer.from(a[key], "base64"),
    out = Buffer.alloc(used.length * stride);
  used.forEach((id, i) =>
    b.copy(out, i * stride, id * stride, (id + 1) * stride),
  );
  a[key] = out.toString("base64");
}
a.index = Buffer.from(
  new Uint16Array(kept.map((i) => mapping.get(i))).buffer,
).toString("base64");
const before = { vertices: a.vertices, triangles: a.triangles };
a.vertices = used.length;
a.triangles = kept.length / 3;
a.offlineCleanup = "Isolated duplicate head removed; source preserved";
await writeFile(output, JSON.stringify(a));
await writeFile(
  report,
  JSON.stringify(
    {
      before,
      after: { vertices: a.vertices, triangles: a.triangles },
      removed,
    },
    null,
    2,
  ),
);
