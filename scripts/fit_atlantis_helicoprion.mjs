import fs from "node:fs";
import crypto from "node:crypto";
import * as THREE from "three";
const [input, output] = process.argv.slice(2);
if (!output)
  throw Error(
    "Usage: node fit_atlantis_helicoprion.mjs input.json output.json",
  );
const source = fs.readFileSync(input),
  data = JSON.parse(source);
const decode = (s, T) =>
  new T(Uint8Array.from(Buffer.from(s, "base64")).buffer);
const p = decode(data.position, Uint16Array),
  n = decode(data.normal, Int16Array);
const smooth = THREE.MathUtils.smoothstep;
// 齿旋应在下颌正中呈窄刃状；离线压窄 HF 生成的横向牙团，并连续过渡到颌根。
const scale = (y, z) =>
  1 - 0.7 * (1 - smooth(z, -0.44, -0.34)) * (1 - smooth(y, -0.015, 0.035));
let changed = 0;
const eps = 1e-5,
  v = new THREE.Vector3();
for (let i = 0; i < data.vertices; i++) {
  const x = data.min[0] + (p[i * 3] / 65535) * (data.max[0] - data.min[0]);
  const y = data.min[1] + (p[i * 3 + 1] / 65535) * (data.max[1] - data.min[1]);
  const z = data.min[2] + (p[i * 3 + 2] / 65535) * (data.max[2] - data.min[2]);
  const s = scale(y, z),
    sy = (scale(y + eps, z) - scale(y - eps, z)) / (2 * eps),
    sz = (scale(y, z + eps) - scale(y, z - eps)) / (2 * eps);
  if (s < 0.99999) changed++;
  p[i * 3] = Math.round(
    ((x * s - data.min[0]) / (data.max[0] - data.min[0])) * 65535,
  );
  const nx = n[i * 3] / 32767,
    ny = n[i * 3 + 1] / 32767,
    nz = n[i * 3 + 2] / 32767;
  v.set(nx / s, ny - (x * sy * nx) / s, nz - (x * sz * nx) / s).normalize();
  for (let j = 0; j < 3; j++)
    n[i * 3 + j] = Math.round(v.getComponent(j) * 32767);
}
data.position = Buffer.from(p.buffer).toString("base64");
data.normal = Buffer.from(n.buffer).toString("base64");
data.jawFit = {
  method:
    "continuous sagittal narrowing of generated lower tooth-whorl and jaw; inverse-transpose normal transport",
  inputSha256: crypto.createHash("sha256").update(source).digest("hex"),
  changedVertices: changed,
  minLateralScale: 0.3,
};
fs.writeFileSync(output, JSON.stringify(data));
console.log(data.jawFit);
