/** 根据灰模甲板/塔冠观测拟合既有油井；相应变换法线，原彩色 UV 不变。 */
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { join } from "node:path";
const [inputDir, outDir = "src/assets/models"] = process.argv.slice(2);
const d = JSON.parse(
  await readFile(join(inputDir, "oil_rig_hf_mesh.json"), "utf8"),
);
const decode = (s, T) =>
  new T(Uint8Array.from(Buffer.from(s, "base64")).buffer);
const q = decode(d.position, Uint16Array),
  n = decode(d.normal, Int16Array),
  p = new Float32Array(q.length),
  norm = new Int16Array(n.length);
const sourceMin = [...d.min],
  sourceMax = [...d.max];
const deckTop = -0.335,
  sx = 48,
  sz = 55 / (0.45614936442363174 + 0.48970019817352295),
  zCenter = (0.45614936442363174 - 0.48970019817352295) / 2;
for (let i = 0; i < q.length; i += 3) {
  const v = [0, 1, 2].map(
    (a) => d.min[a] + (q[i + a] / 65535) * (d.max[a] - d.min[a]),
  );
  const low = v[1] <= deckTop,
    y0 = low ? d.min[1] : deckTop,
    y1 = low ? deckTop : d.max[1],
    out0 = low ? 13.5 : 16.5,
    out1 = low ? 16.5 : 73,
    sy = (out1 - out0) / (y1 - y0);
  p[i] = -v[2] * sx;
  p[i + 1] = out0 + (v[1] - y0) * sy;
  p[i + 2] = (v[0] - zCenter) * sz;
  const nn = [-n[i + 2] / sx, n[i + 1] / sy, n[i] / sz],
    mag = Math.hypot(...nn);
  for (let a = 0; a < 3; a++) norm[i + a] = Math.round((nn[a] / mag) * 32767);
}
const min = [Infinity, Infinity, Infinity],
  max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < p.length; i++) {
  const a = i % 3;
  min[a] = Math.min(min[a], p[i]);
  max[a] = Math.max(max[a], p[i]);
}
for (let i = 0; i < q.length; i++) {
  const a = i % 3;
  q[i] = Math.round(((p[i] - min[a]) / (max[a] - min[a])) * 65535);
}
const b64 = (a) =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
Object.assign(d, {
  min,
  max,
  position: b64(q),
  normal: b64(norm),
  rigFit: {
    sourceMin,
    sourceMax,
    deckTop,
    sx,
    sz,
    zCenter,
    rotationY: -Math.PI / 2,
    deck: [48, 3, 55],
    towerTop: 73,
    method:
      "offline deck/slab and tower height fitting, inverse transpose normals; original supports and collision contract preserved",
  },
  normalization: "Physical metres in existing oil-rig local coordinate system",
});
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "oil_rig_hf_mesh.json"), JSON.stringify(d) + "\n");
await copyFile(
  join(inputDir, "oil_rig_hf_color.webp"),
  join(outDir, "oil_rig_hf_color.webp"),
);
console.log({ min, max, triangles: d.triangles });
