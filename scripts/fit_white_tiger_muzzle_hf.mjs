/** 压回 HF 将胡须垫误重建成的横向薄片；保留原始颜色/UV，法线随局部形变变换。 */
import { readFile, writeFile } from "node:fs/promises";
import * as T from "three";
const [input, output] = process.argv.slice(2),
  d = JSON.parse(await readFile(input));
if (d.kind !== "white_tiger" || d.muzzleFit)
  throw Error("Expected original converted White Tiger");
const decode = (s, C) => {
    const b = Buffer.from(s, "base64");
    return new C(b.buffer, b.byteOffset, b.byteLength / C.BYTES_PER_ELEMENT);
  },
  q = decode(d.position, Uint16Array),
  norm = decode(d.normal, Int16Array),
  positions = [],
  normals = new Int16Array(norm.length);
const sm = (a, b, x) => T.MathUtils.smoothstep(x, a, b);
function fit(x, y, z) {
  const w =
    (1 - sm(-0.46, -0.395, z)) * sm(0.075, 0.112, y) * (1 - sm(0.15, 0.18, y));
  return [x * (1 - 0.43 * w), y, z];
}
const normal = new T.Vector3(),
  j = new T.Matrix3();
let minimumJacobian = 1;
for (let i = 0; i < q.length; i += 3) {
  const p = [0, 1, 2].map(
    (k) => d.min[k] + (q[i + k] / 65535) * (d.max[k] - d.min[k]),
  );
  positions.push(...fit(...p));
  const cols = [];
  for (let k = 0; k < 3; k++) {
    const a = [...p],
      b = [...p];
    a[k] += 1e-5;
    b[k] -= 1e-5;
    const u = fit(...a),
      v = fit(...b);
    cols.push(u.map((x, l) => (x - v[l]) / 2e-5));
  }
  j.set(...[0, 1, 2].flatMap((row) => cols.map((c) => c[row])));
  minimumJacobian = Math.min(minimumJacobian, j.determinant());
  normal
    .set(norm[i], norm[i + 1], norm[i + 2])
    .applyMatrix3(j.invert().transpose())
    .normalize();
  for (let k = 0; k < 3; k++)
    normals[i + k] = Math.round(normal.getComponent(k) * 32767);
}
if (minimumJacobian < 0.5) throw Error("Invalid muzzle fold");
const out = new Uint16Array(q.length);
for (let i = 0; i < out.length; i++)
  out[i] = Math.round(
    ((positions[i] - d.min[i % 3]) / (d.max[i % 3] - d.min[i % 3])) * 65535,
  );
d.position = Buffer.from(out.buffer).toString("base64");
d.normal = Buffer.from(normals.buffer).toString("base64");
d.muzzleFit = {
  reason:
    "Remove exaggerated lateral whisker-pad sheets from the generated short-furred head",
  minimumJacobian,
};
await writeFile(output, JSON.stringify(d) + "\n");
console.log(d.muzzleFit);
