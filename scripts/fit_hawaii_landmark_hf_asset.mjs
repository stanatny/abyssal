/** 将 HF 地标离线拟合到已有场景尺度；同步逆转置法线，保留 UV 和原始表面色。 */
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { join } from "node:path";
const [kind, inputDir, outDir = "src/assets/models"] = process.argv.slice(2);
const specs = {
  wreck: {
    min: [-6.8, -0.2, -19.18],
    max: [6.8, 24.05, 22],
    yKnots: [[-0.065, 5.8]],
  },
  whale: { min: [-12.21, -0.75, -30.1], max: [12.21, 5.58, 23.01] },
  temple: {
    min: [-30, -0.2, -28.5],
    max: [30, 42.9, 30.35],
    yKnots: [[0.2, 29]],
    zKnots: [[0.405, 28.5]],
  },
  gate: {
    min: [-37, 0, -9.5],
    max: [37, 59, 9.5],
    xKnots: [
      [-1.1, -31],
      [-0.57, -21],
      [0.57, 21],
      [1.1, 31],
    ],
    yKnots: [
      [-0.64, 2],
      [0.55, 45],
    ],
  },
};
const spec = specs[kind];
if (!spec) throw Error("Missing landmark fit");
const d = JSON.parse(
  await readFile(join(inputDir, `${kind}_hf_mesh.json`), "utf8"),
);
const decode = (s, T) =>
  new T(Uint8Array.from(Buffer.from(s, "base64")).buffer);
const q = decode(d.position, Uint16Array),
  sourceNormals = decode(d.normal, Int16Array),
  p = new Float32Array(q.length),
  n = new Int16Array(q.length);
const sourceBounds = [d.min, d.max];
const knots = [0, 1, 2].map((a) => [
  [d.min[a], spec.min[a]],
  ...(spec[["xKnots", "yKnots", "zKnots"][a]] || []),
  [d.max[a], spec.max[a]],
]);
for (let i = 0; i < q.length; i += 3) {
  const slopes = [];
  for (let a = 0; a < 3; a++) {
    const v = d.min[a] + (q[i + a] / 65535) * (d.max[a] - d.min[a]);
    let j = 1;
    while (j < knots[a].length - 1 && v > knots[a][j][0]) j++;
    const [l, h] = [knots[a][j - 1], knots[a][j]],
      s = (h[1] - l[1]) / (h[0] - l[0]);
    p[i + a] = l[1] + (v - l[0]) * s;
    slopes[a] = s;
  }
  const nn = [0, 1, 2].map((a) => sourceNormals[i + a] / slopes[a]),
    mag = Math.hypot(...nn);
  for (let a = 0; a < 3; a++) n[i + a] = Math.round((nn[a] / mag) * 32767);
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
  normal: b64(n),
  landmarkFit: {
    ...spec,
    sourceBounds,
    method:
      "Offline landmark envelope fitting; inverse-transpose normals; source color and UV retained",
  },
  normalization: "World-meter landmark-local coordinates",
});
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, `${kind}_hf_mesh.json`), JSON.stringify(d) + "\n");
await copyFile(
  join(inputDir, `${kind}_hf_color.webp`),
  join(outDir, `${kind}_hf_color.webp`),
);
console.log({ kind, triangles: d.triangles, vertices: d.vertices, min, max });
