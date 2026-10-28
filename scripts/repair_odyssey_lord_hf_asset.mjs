/** 离线清除巨蟹游离碎片并按连续表面分支标记八足、双螯，避免近邻关节串绑。 */
import fs from "node:fs";
const [input, output] = process.argv.slice(2),
  a = JSON.parse(fs.readFileSync(input));
if (a.kind !== "karkinos") throw Error("Expected inspected Karkinos mesh");
const arr = (key, Type) => {
    const b = Buffer.from(a[key], "base64");
    return new Type(b.buffer, b.byteOffset, b.length / Type.BYTES_PER_ELEMENT);
  },
  enc = (v) =>
    Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64");
const q = arr("position", Uint16Array),
  idx = arr("index", Uint16Array),
  p = Array.from({ length: a.vertices }, (_, i) =>
    [0, 1, 2].map(
      (j) => a.min[j] + (q[i * 3 + j] / 65535) * (a.max[j] - a.min[j]),
    ),
  ),
  map = new Map(),
  ids = p.map((v, i) => {
    const key = v.map((n) => n.toFixed(5)).join(",");
    if (!map.has(key)) map.set(key, i);
    return map.get(key);
  }),
  adj = Array.from({ length: a.vertices }, () => new Set());
for (let i = 0; i < idx.length; i += 3)
  for (let j = 0; j < 3; j++) {
    const x = ids[idx[i + j]],
      y = ids[idx[i + ((j + 1) % 3)]];
    adj[x].add(y);
    adj[y].add(x);
  }
function components(accept) {
  const seen = new Set(),
    result = [];
  for (const v of new Set(ids)) {
    if (seen.has(v) || !accept(p[v])) continue;
    const stack = [v],
      vertices = [];
    seen.add(v);
    while (stack.length) {
      const u = stack.pop();
      vertices.push(u);
      for (const x of adj[u])
        if (!seen.has(x) && accept(p[x])) {
          seen.add(x);
          stack.push(x);
        }
    }
    result.push(vertices);
  }
  return result.sort((a, b) => b.length - a.length);
}
const full = components(() => true),
  removed = new Set(
    full
      .slice(1)
      .filter((v) => v.length > 25 && v.every((i) => Math.abs(p[i][0]) > 0.35))
      .flat(),
  );
const clean = [];
for (let i = 0; i < idx.length; i += 3)
  if (![idx[i], idx[i + 1], idx[i + 2]].some((v) => removed.has(ids[v])))
    clean.push(idx[i], idx[i + 1], idx[i + 2]);
const branches = components(
    (v) => Math.hypot(v[0] / 0.25, (v[2] - 0.04) / 0.3) > 1.1,
  ).filter((v) => v.length > 250),
  part = new Uint8Array(a.vertices),
  summary = [];
if (branches.length !== 10)
  throw Error(`Expected 10 limb surfaces, got ${branches.length}`);
for (const vs of branches) {
  const center = [0, 1, 2].map(
      (j) => vs.reduce((s, i) => s + p[i][j], 0) / vs.length,
    ),
    side = center[0] < 0 ? -1 : 1;
  let label;
  if (center[2] < -0.24 && Math.abs(center[0]) < 0.3) label = side < 0 ? 9 : 10;
  else {
    const z = center[2],
      row = z < -0.13 ? 0 : z < 0.13 ? 1 : z < 0.29 ? 2 : 3;
    label = (side < 0 ? 0 : 4) + row + 1;
  }
  for (const v of vs) part[v] = label;
  summary.push({ label, vertices: vs.length, center });
}
for (let i = 0; i < part.length; i++) part[i] = part[ids[i]];
if (new Set(summary.map((s) => s.label)).size !== 10)
  throw Error("Ambiguous anatomical ownership");
a.index = enc(new Uint16Array(clean));
a.triangles = clean.length / 3;
a.anatomyPart = enc(part);
a.surfaceRepair = {
  version: 1,
  removedIsolatedVertices: removed.size,
  limbs: summary,
};
fs.writeFileSync(output, JSON.stringify(a) + "\n");
console.log(JSON.stringify(a.surfaceRepair));
