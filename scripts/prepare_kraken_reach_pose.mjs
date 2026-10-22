import * as T from "three";
import { writeFileSync } from "node:fs";
import { createCreature } from "../src/creatures.js";
// Offline only: a forward capture basket, preserving the shared HF topology/UV.
const m = createCreature("kraken", 1),
  { mesh, chains, bones } = m.userData.hfRig,
  g = mesh.geometry,
  p = g.attributes.position;
const a = new T.Vector3(),
  b = new T.Vector3(),
  dir = new T.Vector3(),
  aim = new T.Vector3(),
  q = new T.Quaternion(),
  prev = new T.Quaternion();
for (const c of chains) {
  prev.identity();
  for (let i = 0; i < c.ids.length; i++) {
    const j = Math.min(i, c.ids.length - 2);
    a.fromArray(c.points[j + 1])
      .sub(b.fromArray(c.points[j]))
      .normalize();
    aim
      .set(
        c.side * (0.11 + c.index * 0.02),
        (c.index - 1.5) * 0.095 - 0.07,
        -0.65,
      )
      .sub(b.fromArray(c.points[0]))
      .normalize();
    dir
      .copy(a)
      .lerp(aim, T.MathUtils.smoothstep(j / (c.ids.length - 2), 0, 0.6))
      .normalize();
    q.setFromUnitVectors(a, dir);
    bones[c.ids[i]].quaternion.copy(prev).invert().multiply(q);
    prev.copy(q);
  }
}
m.updateMatrixWorld(true);
mesh.skeleton.update();
const unique = new Map(),
  ids = [],
  rest = [],
  pos = [],
  mass = [];
for (let i = 0; i < p.count; i++) {
  a.fromBufferAttribute(p, i);
  const key = a
    .toArray()
    .map((x) => x.toFixed(6))
    .join(",");
  let id = unique.get(key);
  if (id === undefined) {
    id = rest.length;
    unique.set(key, id);
    rest.push(a.clone());
    pos.push(mesh.getVertexPosition(i, b).clone());
    mass.push(Math.abs(a.x) < 0.145 && a.z > -0.095 ? 0 : 1);
  }
  ids.push(id);
}
const edges = [],
  seen = new Set();
for (let j = 0; j < g.index.count; j++) {
  const x = ids[g.index.array[j]],
    y = ids[g.index.array[j - (j % 3) + (((j % 3) + 1) % 3)]],
    key = [Math.min(x, y), Math.max(x, y)].join(",");
  if (x === y || seen.has(key)) continue;
  seen.add(key);
  edges.push([x, y, rest[x].distanceTo(rest[y])]);
}
for (let i = 0; i < pos.length; i++) if (!mass[i]) pos[i].copy(rest[i]);
// Project excessive tension/compression throughout the connected skin, including
// welded UV seams. No body masks or separate joint spheres hide a discontinuity.
for (let n = 0; n < 900; n++)
  for (const [x, y, len] of edges) {
    dir.copy(pos[y]).sub(pos[x]);
    const d = dir.length(),
      sum = mass[x] + mass[y];
    if (!sum || d < 1e-10) continue;
    const wanted = T.MathUtils.clamp(d, len * 0.72, len * 1.28),
      delta = (d - wanted) / d;
    pos[x].addScaledVector(dir, (delta * mass[x]) / sum);
    pos[y].addScaledVector(dir, (-delta * mass[y]) / sum);
  }
const vertices = new Float32Array(p.count * 3);
for (let i = 0; i < p.count; i++) pos[ids[i]].toArray(vertices, i * 3);
const geom = g.clone();
geom.setAttribute("position", new T.BufferAttribute(vertices, 3));
geom.computeVertexNormals();
const normals = Array.from({ length: pos.length }, () => new T.Vector3());
for (let i = 0; i < p.count; i++)
  normals[ids[i]].add(a.fromBufferAttribute(geom.attributes.normal, i));
for (const n of normals) n.normalize();
const min = [Infinity, Infinity, Infinity],
  max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < vertices.length; i++) {
  min[i % 3] = Math.min(min[i % 3], vertices[i]);
  max[i % 3] = Math.max(max[i % 3], vertices[i]);
}
const packed = new Uint16Array(vertices.length),
  normal = new Int16Array(vertices.length);
for (let i = 0; i < vertices.length; i++) {
  packed[i] = Math.round(
    ((vertices[i] - min[i % 3]) / (max[i % 3] - min[i % 3])) * 65535,
  );
  normal[i] = Math.round(
    normals[ids[Math.floor(i / 3)]].getComponent(i % 3) * 32767,
  );
}
const encode = (a) => Buffer.from(a.buffer).toString("base64");
writeFileSync(
  "src/assets/models/kraken_reach_pose.json",
  JSON.stringify({
    schema: 1,
    source: "kraken_hf_mesh",
    targets: [{ min, max, position: encode(packed), normal: encode(normal) }],
  }) + "\n",
);
console.log({
  vertices: p.count,
  edges: edges.length,
  maxStretch: Math.max(
    ...edges.map(([x, y, d]) => pos[x].distanceTo(pos[y]) / d),
  ),
});
