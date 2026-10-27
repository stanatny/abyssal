/** Offline removal of a generated lateral rest bend. UV/color and Z length stay intact. */
import { readFile, writeFile } from "node:fs/promises";
import * as THREE from "three";
const [input, output] = process.argv.slice(2),
  d = JSON.parse(await readFile(input));
if (!["chiru", "spirit_carp"].includes(d.kind) || d.restFit)
  throw Error("Expected unfitted fish");
// Centers measured from the actual export's sagittal trunk slices, not its image.
const centers = {
  chiru: [
    0.02, 0.02, 0.016, 0.001, -0.003, -0.022, -0.041, -0.071, -0.112, -0.151,
    -0.165,
  ],
  spirit_carp: [
    0.037, 0.037, 0.042, 0.042, 0.03, 0.008, -0.024, -0.057, -0.083, -0.131,
    -0.189,
  ],
}[d.kind];
function offset(z) {
  const t = THREE.MathUtils.clamp((z + 0.5) * 10, 0, 10),
    i = Math.min(9, Math.floor(t)),
    u = t - i,
    at = (k) => centers[Math.max(0, Math.min(10, k))],
    a = at(i),
    b = at(i + 1),
    m = (b - at(i - 1)) * 0.5,
    n = (at(i + 2) - a) * 0.5;
  return (
    (2 * u ** 3 - 3 * u * u + 1) * a +
    (u ** 3 - 2 * u * u + u) * m +
    (-2 * u ** 3 + 3 * u * u) * b +
    (u ** 3 - u * u) * n
  );
}
const decode = (s, C) =>
    new C(Uint8Array.from(Buffer.from(s, "base64")).buffer),
  q = decode(d.position, Uint16Array),
  n = decode(d.normal, Int16Array),
  p = new Float32Array(q.length),
  normal = new Int16Array(n.length),
  v = new THREE.Vector3();
for (let i = 0; i < q.length; i += 3) {
  const a = [0, 1, 2].map(
    (k) => d.min[k] + (q[i + k] / 65535) * (d.max[k] - d.min[k]),
  );
  p.set([a[0] - offset(a[2]), a[1], a[2]], i);
  const slope = (offset(a[2] + 1e-5) - offset(a[2] - 1e-5)) / 2e-5;
  v.set(n[i], n[i + 1], n[i + 2] + slope * n[i]).normalize();
  for (let k = 0; k < 3; k++)
    normal[i + k] = Math.round(v.getComponent(k) * 32767);
}
const low = [Infinity, Infinity, Infinity],
  high = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < p.length; i++) {
  low[i % 3] = Math.min(low[i % 3], p[i]);
  high[i % 3] = Math.max(high[i % 3], p[i]);
}
const packed = new Uint16Array(p.length);
for (let i = 0; i < p.length; i++)
  packed[i] = Math.round(
    ((p[i] - low[i % 3]) / (high[i % 3] - low[i % 3])) * 65535,
  );
const b64 = (a) =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
d.position = b64(packed);
d.normal = b64(normal);
d.min = low;
d.max = high;
d.restFit = {
  method:
    "Volume-preserving lateral centerline shear after atlas bake; inverse-transpose normals",
  centers,
  zStart: -0.5,
  zStep: 0.1,
  jacobianDeterminant: 1,
};
await writeFile(output, JSON.stringify(d) + "\n");
console.log({ kind: d.kind, bounds: [low, high], restFit: d.restFit });
