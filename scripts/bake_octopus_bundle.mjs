import * as T from "three";
import { readFile, writeFile } from "node:fs/promises";
import { decodeOrganicMesh } from "../src/hf_organic_asset.js";
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw Error("Usage: bake_octopus_bundle.mjs source.json output.json");
const packed = JSON.parse(await readFile(input, "utf8"));
const smooth = T.MathUtils.smoothstep;
// Roll the continuous web gradually; rotate its thickness instead of crushing it.
function point(x, y, z, amount, out = new T.Vector3()) {
  const dz = z + 0.23,
    r = Math.hypot(x, dz),
    a = Math.atan2(x, dz);
  const b = smooth(r, 0.1, 0.32) * smooth(z, -0.29, -0.18) * amount;
  const radius = 0.085 - 0.04 * smooth(r, 0.3, 0.7),
    phi = a * 2.6,
    h = y + 0.075;
  return out.set(
    T.MathUtils.lerp(x, radius * Math.sin(phi), b) + h * Math.sin(phi * b),
    T.MathUtils.lerp(-0.075, -0.035 + radius * Math.cos(phi), b) +
      h * Math.cos(phi * b),
    T.MathUtils.lerp(z, r - 0.23, b),
  );
}

const curves = packed.swimChains.slice(0, 8).map(
  (c) =>
    new T.CatmullRomCurve3(
      c.points.map((p) => new T.Vector3(...p)),
      false,
      "centripetal",
    ),
);
function target(c, arm) {
  const r = Math.hypot(c.x, c.z + 0.23),
    R = 0.08 - 0.044 * smooth(r, 0.3, 0.72),
    phi = -2.75 + (arm * Math.PI) / 4;
  return new T.Vector3(R * Math.sin(phi), -0.035 + R * Math.cos(phi), r - 0.23);
}
const frames = curves.map((curve, arm) =>
  Array.from({ length: 121 }, (_, i) => {
    const u = i / 120,
      c = curve.getPoint(u),
      t = curve.getTangent(u).normalize(),
      n = new T.Vector3(0, 1, 0).addScaledVector(t, -t.y).normalize(),
      r = new T.Vector3().crossVectors(n, t),
      q = target(c, arm),
      q0 = target(curve.getPoint(Math.max(0, u - 0.001)), arm),
      q1 = target(curve.getPoint(Math.min(1, u + 0.001)), arm),
      tt = q1.sub(q0).normalize(),
      phi = -2.75 + (arm * Math.PI) / 4,
      nn = new T.Vector3(Math.sin(phi), Math.cos(phi), 0);
    nn.addScaledVector(tt, -nn.dot(tt)).normalize();
    const rr = new T.Vector3().crossVectors(nn, tt);
    return { c, t, n, r, q, tt, nn, rr };
  }),
);
function apply(p, amount) {
  let f,
    d = Infinity;
  for (const fs of frames)
    for (const row of fs) {
      let dist = row.c.distanceToSquared(p);
      if (dist < d) {
        d = dist;
        f = row;
      }
    }
  const delta = p.clone().sub(f.c);
  const b = smooth(Math.hypot(p.x, p.z + 0.23), 0.34, 0.43);
  const source = new T.Matrix4().makeBasis(f.r, f.n, f.t),
    dest = new T.Matrix4().makeBasis(f.rr, f.nn, f.tt),
    rotation = new T.Quaternion().setFromRotationMatrix(
      dest.multiply(source.transpose()),
    );
  rotation.slerp(new T.Quaternion(), 1 - amount);
  const preserved = f.c
    .clone()
    .lerp(f.q, amount)
    .add(delta.applyQuaternion(rotation));
  return point(p.x, p.y, p.z, amount).lerp(preserved, b);
}
function prepare(g, amount) {
  const p = g.attributes.position,
    ps = new Float32Array(p.count * 3),
    v = new T.Vector3();
  for (let i = 0; i < p.count; i++)
    apply(v.fromBufferAttribute(p, i), amount).toArray(ps, i * 3);
  // Smooth normals across original UV copies, retain the existing indexed topology.
  const sums = new Map(),
    keys = [],
    a = new T.Vector3(),
    b = new T.Vector3(),
    c = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    const k = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
    keys.push(k);
    if (!sums.has(k)) sums.set(k, new T.Vector3());
  }
  for (let i = 0; i < g.index.count; i += 3) {
    const ids = [g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)];
    a.fromArray(ps, ids[0] * 3);
    b.fromArray(ps, ids[1] * 3).sub(a);
    c.fromArray(ps, ids[2] * 3).sub(a);
    b.cross(c);
    for (const id of ids) sums.get(keys[id]).add(b);
  }
  const ns = new Float32Array(ps.length);
  for (let i = 0; i < p.count; i++) {
    if (p.getZ(i) < -0.3) v.fromBufferAttribute(g.attributes.normal, i);
    else v.copy(sums.get(keys[i]));
    if (v.lengthSq() < 1e-20) v.fromBufferAttribute(g.attributes.normal, i);
    if (v.lengthSq() < 1e-20) v.set(0, 1, 0);
    v.normalize().toArray(ns, i * 3);
  }
  g.morphAttributes.position = [new T.BufferAttribute(ps, 3)];
  g.morphAttributes.normal = [new T.BufferAttribute(ns, 3)];
  g.computeBoundingSphere();
}

const geometry = decodeOrganicMesh(packed, null, (_x, _y, _z, c) =>
  c.set(0xffffff),
);
const targets = [];
for (const amount of [0.5, 1]) {
  prepare(geometry, amount);
  const p = geometry.morphAttributes.position[0],
    n = geometry.morphAttributes.normal[0],
    bounds = new T.Box3().setFromBufferAttribute(p),
    min = bounds.min.toArray(),
    max = bounds.max.toArray(),
    qp = new Uint16Array(p.count * 3),
    qn = new Int16Array(p.count * 3);
  for (let i = 0; i < qp.length; i++) {
    const a = i % 3;
    qp[i] = Math.round(((p.array[i] - min[a]) / (max[a] - min[a])) * 65535);
    qn[i] = Math.round(T.MathUtils.clamp(n.array[i], -1, 1) * 32767);
  }
  const enc = (a) => Buffer.from(a.buffer).toString("base64");
  targets.push({ amount, min, max, position: enc(qp), normal: enc(qn) });
}
const result = {
  ...packed,
  jetPose: { revision: "volumetric-arm-bundle-20261020", targets },
};
await writeFile(output, JSON.stringify(result, null, 2) + "\n");
console.log(
  JSON.stringify({
    vertices: geometry.attributes.position.count,
    triangles: geometry.index.count / 3,
    targets: targets.length,
  }),
);
