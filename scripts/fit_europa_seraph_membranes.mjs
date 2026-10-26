/** Label the six actual wing surfaces through connectivity outside the sensory sac. */
import fs from "node:fs";
import { decodeOrganicMesh } from "../src/hf_organic_asset.js";
const file = process.argv[2],
  d = JSON.parse(fs.readFileSync(file)),
  g = decodeOrganicMesh(d, null, (_x, _y, _z, c) => c.set(1)),
  p = g.attributes.position,
  idx = g.index.array;
const parent = Array.from({ length: p.count }, (_, i) => i),
  root = (i) => (parent[i] === i ? i : (parent[i] = root(parent[i]))),
  union = (a, b) => (parent[root(a)] = root(b)),
  keys = new Map();
for (let i = 0; i < p.count; i++) {
  const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
  if (keys.has(key)) union(i, keys.get(key));
  else keys.set(key, i);
}
for (let i = 0; i < idx.length; i += 3)
  for (let j = 0; j < 3; j++) {
    const a = idx[i + j],
      b = idx[i + ((j + 1) % 3)];
    if (
      Math.abs(p.getX(a)) > 0.1 &&
      Math.abs(p.getX(b)) > 0.1 &&
      p.getX(a) * p.getX(b) > 0
    )
      union(a, b);
  }
const components = new Map();
for (let i = 0; i < p.count; i++)
  if (Math.abs(p.getX(i)) > 0.1) {
    const r = root(i),
      a = components.get(r) || [];
    a.push(i);
    components.set(r, a);
  }
const labels = new Uint8Array(p.count),
  counts = Array(6).fill(0);
for (const a of components.values()) {
  const x = a.reduce((s, i) => s + p.getX(i), 0) / a.length,
    z = a.reduce((s, i) => s + p.getZ(i), 0) / a.length,
    pair = z < -0.14 ? 0 : z < 0.12 ? 1 : 2,
    id = 1 + (x < 0 ? 0 : 3) + pair;
  for (const i of a) {
    labels[i] = id;
    counts[id - 1]++;
  }
}
if (counts.some((n) => n < 100))
  throw Error("Six distinct membranes were not found");
d.membraneLabels = Buffer.from(labels).toString("base64");
d.membraneBinding = {
  method:
    "connected source surface beyond |x|=.1, continuous sac-to-membrane blend",
  counts,
};
fs.writeFileSync(file, JSON.stringify(d) + "\n");
console.log(d.membraneBinding);
