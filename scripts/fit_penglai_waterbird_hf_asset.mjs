/** 离线拟合实测中轴，保留 UV 和表面体积；不以动画反向偏置掩盖静态弯尾。 */
import { readFile, writeFile } from "node:fs/promises";
import * as T from "three";
const [input, output] = process.argv.slice(2),
  d = JSON.parse(await readFile(input));
if (
  d.restFit ||
  !["xuangui", "bifang", "hujiao", "pool_hujiao"].includes(d.kind)
)
  throw Error("Expected unfitted waterbird surface");
const cx =
  d.kind === "hujiao"
    ? [0, 0, 0, 0, 0, 0, 0, -0.015, -0.03, -0.065, -0.11]
    : d.kind === "pool_hujiao"
      ? [0, 0, 0, 0, 0, 0, -0.01, -0.025, -0.05, -0.085, -0.12]
      : Array(11).fill(0);
const cy =
  d.kind === "hujiao"
    ? [0, 0, 0, 0, 0, -0.03, -0.01, 0.015, 0.025, 0.03, 0.07]
    : d.kind === "pool_hujiao"
      ? [0, 0, 0, 0, 0, -0.02, -0.005, 0.01, 0.02, 0.028, 0.04]
      : Array(11).fill(
          d.kind === "xuangui" ? 0.105 : d.kind === "bifang" ? 0.12 : 0,
        );
function offset(z, c) {
  const t = T.MathUtils.clamp((z + 0.5) * 10, 0, 10),
    i = Math.min(9, Math.floor(t)),
    u = t - i,
    at = (k) => c[Math.max(0, Math.min(10, k))],
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
const dec = (s, C) => new C(Uint8Array.from(Buffer.from(s, "base64")).buffer),
  q = dec(d.position, Uint16Array),
  n = dec(d.normal, Int16Array),
  p = new Float32Array(q.length),
  nn = new Int16Array(n.length),
  v = new T.Vector3();
for (let i = 0; i < q.length; i += 3) {
  const a = [0, 1, 2].map(
      (k) => d.min[k] + (q[i + k] / 65535) * (d.max[k] - d.min[k]),
    ),
    z = a[2];
  p.set([a[0] - offset(z, cx), a[1] - offset(z, cy), z], i);
  const dx = (offset(z + 1e-5, cx) - offset(z - 1e-5, cx)) / 2e-5,
    dy = (offset(z + 1e-5, cy) - offset(z - 1e-5, cy)) / 2e-5;
  v.set(n[i], n[i + 1], n[i + 2] + dx * n[i] + dy * n[i + 1]).normalize();
  for (let k = 0; k < 3; k++) nn[i + k] = Math.round(v.getComponent(k) * 32767);
}
const min = [Infinity, Infinity, Infinity],
  max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < p.length; i++) {
  min[i % 3] = Math.min(min[i % 3], p[i]);
  max[i % 3] = Math.max(max[i % 3], p[i]);
}
const qp = new Uint16Array(p.length);
for (let i = 0; i < p.length; i++)
  qp[i] = Math.round(((p[i] - min[i % 3]) / (max[i % 3] - min[i % 3])) * 65535);
const b64 = (a) =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
d.position = b64(qp);
d.normal = b64(nn);
d.min = min;
d.max = max;
d.restFit = {
  method:
    "Measured axial shear / contact-height translation, inverse-transpose normals; UV unchanged",
  x: cx,
  y: cy,
  zStart: -0.5,
  zStep: 0.1,
  jacobianDeterminant: 1,
};
await writeFile(output, JSON.stringify(d) + "\n");
console.log({ kind: d.kind, min, max });
