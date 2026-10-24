/** 离线装配鬼船与残帆；新图集不变，法线按逆转置变换。 */
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { join } from "node:path";
const [kind, inputDir, outDir = "src/assets/models"] = process.argv.slice(2);
if (!["dutchman_hull", "dutchman_sail"].includes(kind))
  throw Error("Unknown Dutchman kind");
const d = JSON.parse(
  await readFile(join(inputDir, kind + "_hf_mesh.json"), "utf8"),
);
const decode = (s, T) =>
    new T(Uint8Array.from(Buffer.from(s, "base64")).buffer),
  q = decode(d.position, Uint16Array),
  n = decode(d.normal, Int16Array),
  p = new Float32Array(q.length),
  nn = new Int16Array(n.length),
  span = d.max.map((v, a) => v - d.min[a]);
const scale =
  kind === "dutchman_hull"
    ? [25 / span[0], 44 / span[1], 96 / span[2]]
    : [1 / span[0], 1 / span[1], 1 / span[0]];
let sailTopZ = 0;
if (kind === "dutchman_sail") {
  const points = [];
  for (let i = 0; i < q.length; i += 3)
    if (q[i + 1] / 65535 > 0.94)
      points.push(d.min[2] + (q[i + 2] / 65535) * span[2]);
  points.sort((a, b) => a - b);
  sailTopZ = points[Math.floor(points.length / 2)];
}
const offset =
  kind === "dutchman_hull"
    ? [0, 9, 0]
    : [0, -0.5, ((d.min[2] + d.max[2]) / 2 - sailTopZ) / span[0]];
for (let i = 0; i < q.length; i += 3) {
  const normal = [];
  for (let a = 0; a < 3; a++) {
    p[i + a] =
      (d.min[a] + (q[i + a] / 65535) * span[a] - (d.min[a] + d.max[a]) / 2) *
        scale[a] +
      offset[a];
    normal[a] = n[i + a] / scale[a];
  }
  const l = Math.hypot(...normal);
  for (let a = 0; a < 3; a++) nn[i + a] = Math.round((normal[a] / l) * 32767);
}
const min = [Infinity, Infinity, Infinity],
  max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < p.length; i++) {
  const a = i % 3;
  min[a] = Math.min(min[a], p[i]);
  max[a] = Math.max(max[a], p[i]);
}
for (let i = 0; i < p.length; i++) {
  const a = i % 3;
  q[i] = Math.round(((p[i] - min[a]) / (max[a] - min[a])) * 65535);
}
const b64 = (a) =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
Object.assign(d, {
  dutchmanFit: {
    sourceMin: d.min,
    sourceMax: d.max,
    scale,
    offset,
    method: "offline dimension fit with inverse-transpose normals",
  },
  min,
  max,
  position: b64(q),
  normal: b64(nn),
  normalization:
    kind === "dutchman_hull"
      ? "Existing ghost hull metres"
      : "Sail width 1, top y=0, lower edge y=-1",
});
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, kind + "_hf_mesh.json"), JSON.stringify(d) + "\n");
await copyFile(
  join(inputDir, kind + "_hf_color.webp"),
  join(outDir, kind + "_hf_color.webp"),
);
console.log({ kind, min, max, triangles: d.triangles });
