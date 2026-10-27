/** Remove only the detached HF pelvic-ribbon fragment seen behind the Spirit Carp. */
import { readFile, writeFile } from "node:fs/promises";
const [input, output] = process.argv.slice(2),
  d = JSON.parse(await readFile(input));
if (d.kind !== "spirit_carp" || d.removedFloatingRibbon)
  throw Error("Expected original fitted Spirit Carp");
const decode = (s) =>
    new Uint16Array(Uint8Array.from(Buffer.from(s, "base64")).buffer),
  q = decode(d.position),
  index = decode(d.index),
  parent = Array.from({ length: d.vertices }, (_, i) => i),
  find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i]))),
  join = (a, b) => (parent[find(a)] = find(b)),
  seen = new Map();
for (let i = 0; i < d.vertices; i++) {
  const key = [...q.subarray(i * 3, i * 3 + 3)].join(",");
  if (seen.has(key)) join(i, seen.get(key));
  else seen.set(key, i);
}
for (let i = 0; i < index.length; i += 3) {
  join(index[i], index[i + 1]);
  join(index[i], index[i + 2]);
}
const groups = new Map();
for (let i = 0; i < index.length; i += 3) {
  const key = find(index[i]);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(i);
}
const removed = new Set();
for (const triangles of groups.values()) {
  if (triangles.length > 100) continue;
  if (
    triangles.every((t) =>
      [0, 1, 2].every((k) => {
        const i = index[t + k],
          x = d.min[0] + (q[i * 3] / 65535) * (d.max[0] - d.min[0]),
          y = d.min[1] + (q[i * 3 + 1] / 65535) * (d.max[1] - d.min[1]),
          z = d.min[2] + (q[i * 3 + 2] / 65535) * (d.max[2] - d.min[2]);
        return x > 0.08 && y < -0.1 && z > 0.11 && z < 0.26;
      }),
    )
  )
    for (const t of triangles) removed.add(t);
}
if (removed.size !== 64)
  throw Error("Unexpected detached-ribbon topology; review the input");
const kept = [];
for (let i = 0; i < index.length; i += 3)
  if (!removed.has(i)) kept.push(index[i], index[i + 1], index[i + 2]);
d.index = Buffer.from(new Uint16Array(kept).buffer).toString("base64");
d.triangles = kept.length / 3;
d.removedFloatingRibbon = {
  triangles: removed.size,
  reason:
    "Detached pelvic fin-tip artifact, confirmed in side and opposite-side raw/native views",
};
await writeFile(output, JSON.stringify(d) + "\n");
console.log(d.removedFloatingRibbon);
