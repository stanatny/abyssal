/** 为选定的六颈 HF 源补齐十二鳍足；新增足复用同源实际肢体和 UV，根部埋入躯干。 */
import fs from "node:fs";
const [input, output] = process.argv.slice(2),
  a = JSON.parse(fs.readFileSync(input));
if (a.kind !== "scylla") throw Error("Expected Scylla");
const decode = (key, Type) => {
    const b = Buffer.from(a[key], "base64");
    return new Type(b.buffer, b.byteOffset, b.length / Type.BYTES_PER_ELEMENT);
  },
  enc = (v) =>
    Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString("base64");
const q = decode("position", Uint16Array),
  normal = decode("normal", Int16Array),
  uv = decode("uv", Uint16Array),
  index = decode("index", Uint16Array),
  pos = (i) =>
    [0, 1, 2].map(
      (j) => a.min[j] + (q[i * 3 + j] / 65535) * (a.max[j] - a.min[j]),
    );
const inFoot = (i) => {
    const [x, y, z] = pos(i);
    return Math.abs(x) > 0.09 && y < -0.09 && z > -0.24 && z < -0.025;
  },
  donor = [];
for (let i = 0; i < index.length; i += 3)
  if ([index[i], index[i + 1], index[i + 2]].every(inFoot))
    donor.push(index[i], index[i + 1], index[i + 2]);
const unique = [...new Set(donor)],
  copies = [-0.235, 0.13],
  p2 = new Uint16Array(q.length + unique.length * 6),
  n2 = new Int16Array(normal.length + unique.length * 6),
  uv2 = new Uint16Array(uv.length + unique.length * 4),
  ix = new Uint16Array(index.length + donor.length * 2);
p2.set(q);
n2.set(normal);
uv2.set(uv);
ix.set(index);
const ownership = new Uint8Array(p2.length / 3);
for (let c = 0; c < 2; c++) {
  const copy = new Map(
    unique.map((i, j) => [i, a.vertices + c * unique.length + j]),
  );
  for (const i of unique) {
    const j = copy.get(i),
      p = pos(i);
    p[0] -= Math.sign(p[0]) * 0.02;
    p[2] = copies[c] + (p[2] + 0.12) * 0.63;
    ownership[j] = (p[0] < 0 ? 0 : 6) + (c === 0 ? 1 : 4) + 1;
    const n = [normal[i * 3], normal[i * 3 + 1], normal[i * 3 + 2] / 0.63],
      l = Math.hypot(...n);
    for (let axis = 0; axis < 3; axis++) {
      p2[j * 3 + axis] = Math.round(
        ((p[axis] - a.min[axis]) / (a.max[axis] - a.min[axis])) * 65535,
      );
      n2[j * 3 + axis] = Math.round((n[axis] / l) * 32767);
    }
    uv2.set(uv.slice(i * 2, i * 2 + 2), j * 2);
  }
  for (let i = 0; i < donor.length; i++)
    ix[index.length + c * donor.length + i] = copy.get(donor[i]);
}
// 在六个真实颈面分离处建立归属，再沿连续表面向肩根扩展；相近嘴部不串绑。
const positions = Array.from({ length: a.vertices }, (_, i) => pos(i)),
  weld = new Map(),
  weldIds = positions.map((v, i) => {
    const key = v.map((n) => n.toFixed(5)).join(",");
    if (!weld.has(key)) weld.set(key, i);
    return weld.get(key);
  }),
  adj = Array.from({ length: a.vertices }, () => new Set());
for (let i = 0; i < index.length; i += 3)
  for (let j = 0; j < 3; j++) {
    const u = weldIds[index[i + j]],
      v = weldIds[index[i + ((j + 1) % 3)]];
    adj[u].add(v);
    adj[v].add(u);
  }
const seen = new Set(),
  groups = [];
for (const i of new Set(weldIds)) {
  if (seen.has(i) || positions[i][1] <= -0.02 || positions[i][2] >= -0.05)
    continue;
  const stack = [i],
    group = [];
  seen.add(i);
  while (stack.length) {
    const u = stack.pop();
    group.push(u);
    for (const v of adj[u])
      if (!seen.has(v) && positions[v][1] > -0.02 && positions[v][2] < -0.05) {
        seen.add(v);
        stack.push(v);
      }
  }
  if (group.length > 300) groups.push(group);
}
if (groups.length !== 6)
  throw Error("Expected six independent upper neck surfaces");
const headPart = new Uint8Array(p2.length / 3),
  queue = [];
for (const group of groups) {
  const maxY = Math.max(...group.map((i) => positions[i][1])),
    x = group.reduce((v, i) => v + positions[i][0], 0),
    row = maxY < 0.1 ? 0 : maxY < 0.2 ? 1 : 2,
    label = row * 2 + (x > 0 ? 2 : 1);
  for (const i of group) {
    headPart[i] = label;
    queue.push(i);
  }
}
for (let k = 0; k < queue.length; k++) {
  const u = queue[k];
  for (const v of adj[u])
    if (!headPart[v] && positions[v][1] > -0.105 && positions[v][2] < -0.035) {
      headPart[v] = headPart[u];
      queue.push(v);
    }
}
for (let i = 0; i < a.vertices; i++) headPart[i] = headPart[weldIds[i]];
a.headPart = enc(headPart);
let blend = Array.from({ length: a.vertices }, (_, i) => {
  const v = new Float64Array(6);
  if (headPart[i]) v[headPart[i] - 1] = 1;
  return v;
});
const movable = [...new Set(weldIds)].filter(
  (i) => headPart[i] && positions[i][1] < -0.02,
);
for (let iteration = 0; iteration < 180; iteration++) {
  const next = blend.slice();
  for (const i of movable) {
    const values = new Float64Array(6);
    let count = 0;
    for (const j of adj[i])
      if (headPart[j]) {
        for (let h = 0; h < 6; h++) values[h] += blend[j][h];
        count++;
      }
    if (count) {
      for (let h = 0; h < 6; h++) values[h] /= count;
      next[i] = values;
    }
  }
  blend = next;
}
const headBlend = new Uint16Array((p2.length / 3) * 6);
for (let i = 0; i < a.vertices; i++)
  for (let h = 0; h < 6; h++)
    headBlend[i * 6 + h] = Math.round(blend[weldIds[i]][h] * 65535);
a.headBlend = enc(headBlend);

a.anatomyPart = enc(ownership);
a.position = enc(p2);
a.normal = enc(n2);
a.uv = enc(uv2);
a.index = enc(ix);
a.vertices = p2.length / 3;
a.triangles = ix.length / 3;
a.surfaceRepair = {
  version: 2,
  addedFinFeet: 4,
  sourceFinFeet: 8,
  addedVertices: unique.length * 2,
  addedTriangles: (donor.length / 3) * 2,
  source: "same selected HF lateral fin-foot pair, UV retained",
};
if (a.vertices > 65535) throw Error("Uint16 vertex budget");
fs.writeFileSync(output, JSON.stringify(a) + "\n");
console.log(a.surfaceRepair);
