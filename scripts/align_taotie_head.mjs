import fs from "node:fs";
import * as T from "three";
import { decodePackedArray } from "../src/packed_array.js";

// Offline rest-pose correction, fitted to bilateral skull surfaces (not the
// asymmetric horn tips). Keep the accepted coat, topology and lower legs.
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error("Usage: node align_taotie_head.mjs INPUT OUTPUT");
const data = JSON.parse(fs.readFileSync(input));
if (data.headAlignment) throw new Error("Source is already aligned");
const yaw = -0.31827287,
  roll = 0.01080842,
  offset = -0.10247595;
const normal = new T.Vector3(
  Math.cos(yaw) * Math.cos(roll),
  Math.sin(roll),
  Math.sin(yaw) * Math.cos(roll),
);
const rotation = new T.Quaternion().setFromUnitVectors(
  normal,
  new T.Vector3(1, 0, 0),
);
const center = new T.Vector3(0, 0.07, -0.32);
const shiftX = offset + normal.dot(center) - center.x;
const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);
let shiftZ = 0;
function deform(p) {
  const w = smooth(-0.1, 0.27, -p.z) * smooth(-0.15, -0.075, p.y);
  const q = p.clone().sub(center).applyQuaternion(rotation).add(center);
  q.x += shiftX;
  q.z += shiftZ;
  return p.clone().lerp(q, w);
}
const quantized = decodePackedArray(data.position, Uint16Array),
  ns = decodePackedArray(data.normal, Int16Array);
const points = Array.from(
  { length: data.vertices },
  (_, i) =>
    new T.Vector3(
      ...[0, 1, 2].map(
        (a) =>
          data.min[a] +
          (quantized[i * 3 + a] / 65535) * (data.max[a] - data.min[a]),
      ),
    ),
);
// Preserve the existing muzzle-to-tail unit length; the tail is untouched.
for (let i = 0; i < 3; i++)
  shiftZ += data.min[2] - Math.min(...points.map((p) => deform(p).z));
const posed = points.map(deform),
  box = new T.Box3().setFromPoints(posed),
  size = box.getSize(new T.Vector3());
const qp = new Uint16Array(quantized.length),
  qn = new Int16Array(ns.length),
  e = 1e-5;
let minJacobian = Infinity;
for (let i = 0; i < points.length; i++) {
  const p = points[i],
    q = posed[i];
  for (let a = 0; a < 3; a++)
    qp[i * 3 + a] = Math.round(
      ((q.getComponent(a) - box.min.getComponent(a)) / size.getComponent(a)) *
        65535,
    );
  const columns = [0, 1, 2].map((a) => {
    const d = new T.Vector3().setComponent(a, e);
    return deform(p.clone().add(d))
      .sub(deform(p.clone().sub(d)))
      .multiplyScalar(1 / (2 * e));
  });
  const j = new T.Matrix3().set(
    ...[0, 1, 2].flatMap((a) => columns.map((c) => c.getComponent(a))),
  );
  minJacobian = Math.min(minJacobian, j.determinant());
  const n = new T.Vector3(
    ns[i * 3] / 32767,
    ns[i * 3 + 1] / 32767,
    ns[i * 3 + 2] / 32767,
  )
    .applyMatrix3(j.clone().invert().transpose())
    .normalize();
  for (let a = 0; a < 3; a++)
    qn[i * 3 + a] = Math.round(n.getComponent(a) * 32767);
}
if (minJacobian < 0.65)
  throw Error(
    "Unsafe neck deformation: " + minJacobian + ", z shift=" + shiftZ,
  );
const b64 = (a) =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
data.position = b64(qp);
data.normal = b64(qn);
data.min = box.min.toArray();
data.max = box.max.toArray();
for (const c of data.contactFit.chains)
  if (c.type === "neck" || c.type === "jaw")
    c.points = c.points.map((a) => {
      const p = deform(new T.Vector3(...a));
      p.x = 0;
      return p.toArray();
    });
const h = new T.Vector3(...data.contactFit.head);
h.x = -(normal.y * h.y + normal.z * h.z + offset) / normal.x;
data.contactFit.head = deform(h).toArray();
data.headAlignment = {
  revision: "taotie_skull_axis_20261030",
  planeYaw: yaw,
  planeRoll: roll,
  planeOffset: offset,
  neckBlendZ: [0.1, -0.27],
  legProtectionY: [-0.15, -0.075],
  shiftZ,
  minJacobian,
};
fs.writeFileSync(output, JSON.stringify(data));
console.log({
  minJacobian,
  shiftZ,
  bounds: [data.min, data.max],
  head: data.contactFit.head,
});
