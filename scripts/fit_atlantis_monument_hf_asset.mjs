/** 离线贴合现有纪念碑尺度和地面；同步逆转置法线，不改碰撞体或导航地标。 */
import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
const [kind, source, out = "src/assets/models"] = process.argv.slice(2);
const d = JSON.parse(
  await readFile(join(source, kind + "_hf_mesh.json"), "utf8"),
);
const sourceBounds = { min: [...d.min], max: [...d.max] };
const decode = (s, T) =>
  new T(Uint8Array.from(Buffer.from(s, "base64")).buffer);
const q = decode(d.position, Uint16Array),
  n = decode(d.normal, Int16Array),
  p = new Float32Array(q.length),
  nn = new Int16Array(n.length);
const spec =
  kind === "poseidon"
    ? {
        sx: 80,
        sz: 53.3,
        ox: -0.44,
        oz: 0.74,
        ys: [
          [-0.5, 0],
          [-0.15, 29],
          [0.1, 47.5],
          [0.285, 61.5],
          [0.33, 66],
          [0.5, 81.5],
        ],
      }
    : kind === "obelisk"
      ? {
          sx: 9 / (d.max[0] - d.min[0]),
          sz: 9 / (d.max[2] - d.min[2]),
          ox: 0,
          oz: 0,
          ys: [
            [-0.5, 0],
            [0.5, 38],
          ],
        }
      : null;
if (!spec) throw Error("Unknown monument");
for (let i = 0; i < q.length; i += 3) {
  const v = [0, 1, 2].map(
    (a) => d.min[a] + (q[i + a] / 65535) * (d.max[a] - d.min[a]),
  );
  let j = 1;
  while (j < spec.ys.length - 1 && v[1] > spec.ys[j][0]) j++;
  const [a, b] = [spec.ys[j - 1], spec.ys[j]],
    sy = (b[1] - a[1]) / (b[0] - a[0]);
  p[i] = v[0] * spec.sx + spec.ox;
  p[i + 1] = a[1] + (v[1] - a[0]) * sy;
  p[i + 2] = v[2] * spec.sz + spec.oz;
  const normal = [n[i] / spec.sx, n[i + 1] / sy, n[i + 2] / spec.sz],
    l = Math.hypot(...normal);
  for (let a = 0; a < 3; a++) nn[i + a] = Math.round((normal[a] / l) * 32767);
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
d.position = b64(q);
d.normal = b64(nn);
d.min = min;
d.max = max;
d.monumentFit = {
  units: "local world meters",
  spec,
  preserved:
    "original placement, footprints, collision contract and landmark coordinates",
  sourceBounds,
};
await mkdir(out, { recursive: true });
await writeFile(join(out, kind + "_hf_mesh.json"), JSON.stringify(d) + "\n");
await copyFile(
  join(source, kind + "_hf_color.webp"),
  join(out, kind + "_hf_color.webp"),
);
console.log({
  kind,
  vertices: d.vertices,
  triangles: d.triangles,
  min,
  max,
  spec,
});
