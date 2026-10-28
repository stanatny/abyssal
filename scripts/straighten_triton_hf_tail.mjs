/** 离线消除海螺卫士源网格的单侧弯尾；保留纵向尺度、UV 与上身。 */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as T from "three";
import { decodeOrganicMesh } from "../src/hf_organic_asset.js";
import { creatureGeometryKey } from "../src/creature_interior_key.js";

const [input, output, interiorPath] = process.argv.slice(2);
if (!input || !output) throw Error("Usage: source-mesh.json output-mesh.json");
const original = await readFile(input),
  data = JSON.parse(original);
if (data.tailNeutralization) throw Error("Input is already neutralized");
// 从俯视网格测量尾干中心；鳍末端延续同一轴，不能只给动画加反向偏角。
const samples = [
  [-0.08, 0.03],
  [0, 0.03],
  [0.08, 0.006],
  [0.16, -0.02],
  [0.24, -0.067],
  [0.32, -0.131],
  [0.4, -0.235],
  [0.46, -0.35],
  [0.5, -0.4],
];
const slopes = samples.map((p, i) => {
  if (i === 0) return 0;
  if (i === samples.length - 1)
    return (p[1] - samples[i - 1][1]) / (p[0] - samples[i - 1][0]);
  const left = (p[1] - samples[i - 1][1]) / (p[0] - samples[i - 1][0]),
    right = (samples[i + 1][1] - p[1]) / (samples[i + 1][0] - p[0]);
  return left * right <= 0 ? 0 : (2 * left * right) / (left + right);
});
function center(z) {
  if (z <= samples[0][0]) return [0.03, 0];
  const i = Math.min(
      samples.length - 2,
      samples.findIndex((p) => p[0] >= z) - 1,
    ),
    j = i < 0 ? samples.length - 2 : i,
    [a, b] = [samples[j], samples[j + 1]],
    h = b[0] - a[0],
    t = T.MathUtils.clamp((z - a[0]) / h, 0, 1),
    [m, n] = [slopes[j], slopes[j + 1]];
  return [
    (2 * t ** 3 - 3 * t * t + 1) * a[1] +
      (t ** 3 - 2 * t * t + t) * h * m +
      (-2 * t ** 3 + 3 * t * t) * b[1] +
      (t ** 3 - t * t) * h * n,
    ((6 * t * t - 6 * t) * a[1] +
      (3 * t * t - 4 * t + 1) * h * m +
      (-6 * t * t + 6 * t) * b[1] +
      (3 * t * t - 2 * t) * h * n) /
      h,
  ];
}
const decode = (s, Type) =>
    new Type(Uint8Array.from(Buffer.from(s, "base64")).buffer),
  p = decode(data.position, Uint16Array),
  n = decode(data.normal, Int16Array),
  v = new T.Vector3();
let changed = 0;
for (let i = 0; i < p.length; i += 3) {
  const z = data.min[2] + (p[i + 2] / 65535) * (data.max[2] - data.min[2]);
  if (z <= 0) continue;
  const [cx, derivative] = center(z),
    x = data.min[0] + (p[i] / 65535) * (data.max[0] - data.min[0]) - cx + 0.03,
    packed = Math.round(
      ((x - data.min[0]) / (data.max[0] - data.min[0])) * 65535,
    );
  if (packed < 0 || packed > 65535)
    throw Error("Corrected tail exceeds packed domain");
  p[i] = packed;
  // x'=x-c(z)+c0 的雅可比行列式为一；用逆转置修正法线。
  v.set(
    n[i] / 32767,
    n[i + 1] / 32767,
    (n[i + 2] + derivative * n[i]) / 32767,
  ).normalize();
  n[i] = Math.round(v.x * 32767);
  n[i + 1] = Math.round(v.y * 32767);
  n[i + 2] = Math.round(v.z * 32767);
  changed++;
}
data.position = Buffer.from(p.buffer).toString("base64");
data.normal = Buffer.from(n.buffer).toString("base64");
data.tailNeutralization = {
  sourceMeshSha256: createHash("sha256").update(original).digest("hex"),
  method:
    "Monotone centerline shear; determinant one; inverse-transpose normals",
  samples,
  slopes,
  centerX: 0.03,
  changedVertices: changed,
};
await writeFile(output, JSON.stringify(data) + "\n");
console.log(data.tailNeutralization);

// 同步离线内部壳体；保持闭合拓扑及其蒙皮来源，避免旧哈希失配后失去截面。
if (interiorPath) {
  const records = JSON.parse(await readFile(interiorPath, "utf8"));
  const key = (packed) => {
    const g = decodeOrganicMesh(
      packed,
      (x, y, z, ids, w, o) => (w[o] = 1),
      (x, y, z, c) => c.set(0xffffff),
    );
    const result = creatureGeometryKey(g);
    g.dispose();
    return result;
  };
  const oldKey = key(JSON.parse(original)),
    newKey = key(data),
    record = records[oldKey];
  if (!record?.position) throw Error("Missing source closed interior");
  const packed = decode(record.position, Uint16Array),
    values = [];
  for (let i = 0; i < packed.length; i += 3) {
    const point = [0, 1, 2].map(
      (k) => record.low[k] + (packed[i + k] / 65535) * record.span[k],
    );
    if (point[2] > 0) point[0] -= center(point[2])[0] - 0.03;
    values.push(...point);
  }
  const low = [0, 1, 2].map((k) =>
      Math.min(...values.filter((_, i) => i % 3 === k)),
    ),
    span = [0, 1, 2].map(
      (k) => Math.max(...values.filter((_, i) => i % 3 === k)) - low[k],
    );
  const position = Uint16Array.from(values, (v, i) =>
    Math.round(((v - low[i % 3]) / span[i % 3]) * 65535),
  );
  records[newKey] = {
    ...record,
    position: Buffer.from(position.buffer).toString("base64"),
    low,
    span,
  };
  await writeFile(interiorPath, JSON.stringify(records) + "\n");
  console.log({ oldKey, newKey, interiorVertices: values.length / 3 });
}
