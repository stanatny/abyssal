/** 将生成船体离线适配现有航行/浅吃水包络；同步逆转置法线，不改游戏碰撞。 */
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { join } from "node:path";
const [kind, inputDir, outDir = "src/assets/models"] = process.argv.slice(2);
const specs = {
  cruise: {
    length: 64,
    width: 11,
    ys: [
      [null, -1.8],
      [-0.107, 1.65],
      [0.0107, 6.5],
      [null, 12.1],
    ],
  },
  schooner: {
    length: 29,
    width: 6.4,
    ys: [
      [null, -1.8],
      [-0.235, 1.65],
      [null, 24.61],
    ],
    zs: [
      [-0.5, -0.51],
      [-0.35, -0.47],
      [0.5, 0.49],
    ],
  },
  sloop: {
    length: 21,
    width: 5.1,
    ys: [
      [null, -1.8],
      [-0.3, 1.65],
      [null, 18.29],
    ],
  },
};
const spec = specs[kind];
if (!spec) throw Error("Missing inspected hull fitting");
const d = JSON.parse(
  await readFile(join(inputDir, `${kind}_hf_mesh.json`), "utf8"),
);
const decode = (v, Type) =>
    new Type(Uint8Array.from(Buffer.from(v, "base64")).buffer),
  q = decode(d.position, Uint16Array),
  n = decode(d.normal, Int16Array),
  p = new Float32Array(q.length),
  norm = new Int16Array(n.length);
const xScale = spec.width / spec.length / (d.max[0] - d.min[0]);
const ys = spec.ys.map(([a, b], i) => [
  a ?? (i === 0 ? d.min[1] : d.max[1]),
  b / spec.length,
]);
for (let i = 0; i < q.length; i += 3) {
  const v = [0, 1, 2].map(
    (a) => d.min[a] + (q[i + a] / 65535) * (d.max[a] - d.min[a]),
  );
  let j = 1;
  while (j < ys.length - 1 && v[1] > ys[j][0]) j++;
  const [a, b] = [ys[j - 1], ys[j]],
    dy = (b[1] - a[1]) / (b[0] - a[0]);
  p[i] = v[0] * xScale;
  p[i + 1] = a[1] + (v[1] - a[0]) * dy;
  let dz = 1;
  p[i + 2] = v[2] - 0.01;
  if (spec.zs) {
    let k = 1;
    while (k < spec.zs.length - 1 && v[2] > spec.zs[k][0]) k++;
    const [za, zb] = [spec.zs[k - 1], spec.zs[k]];
    dz = (zb[1] - za[1]) / (zb[0] - za[0]);
    p[i + 2] = za[1] + (v[2] - za[0]) * dz;
  }
  const nn = [n[i] / xScale, n[i + 1] / dy, n[i + 2] / dz],
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
  hullFit: {
    ...spec,
    xScale,
    sourceBounds: [d.min, d.max],
    method:
      "offline beam fit, piecewise waterline/deck height, inverse-transpose normals; original hull colliders unchanged",
  },
});
// 清除生成器悬空的高处索具碎段；连续帆面与连接船体的实体保持，索具另按真实端点补齐。
if (kind !== "cruise") {
  const index = decode(d.index, Uint16Array),
    parent = [],
    canonical = [],
    positionIds = new Map();
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  for (let i = 0; i < q.length / 3; i++) {
    const key = `${q[i * 3]},${q[i * 3 + 1]},${q[i * 3 + 2]}`;
    if (!positionIds.has(key)) {
      const id = parent.length;
      positionIds.set(key, id);
      parent.push(id);
    }
    canonical.push(positionIds.get(key));
  }
  for (let i = 0; i < index.length; i += 3) {
    const a = find(canonical[index[i]]),
      b = find(canonical[index[i + 1]]),
      c = find(canonical[index[i + 2]]);
    parent[b] = a;
    parent[c] = a;
  }
  const groups = new Map();
  for (let i = 0; i < index.length; i += 3) {
    const id = find(canonical[index[i]]);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(index[i], index[i + 1], index[i + 2]);
  }
  const largest = [...groups.values()].sort((a, b) => b.length - a.length)[0],
    kept = [];
  let removed = 0;
  for (const group of groups.values()) {
    const maxY = Math.max(...group.map((i) => p[i * 3 + 1]));
    if (group !== largest && maxY > 0.25) {
      removed += group.length / 3;
      continue;
    }
    kept.push(...group);
  }
  d.index = b64(new Uint16Array(kept));
  d.triangles = kept.length / 3;
  d.hullFit.removedDetachedRiggingTriangles = removed;
}
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, `${kind}_hf_mesh.json`), JSON.stringify(d) + "\n");
await copyFile(
  join(inputDir, `${kind}_hf_color.webp`),
  join(outDir, `${kind}_hf_color.webp`),
);
console.log({
  kind,
  boundsMeters: [
    min.map((v) => v * spec.length),
    max.map((v) => v * spec.length),
  ],
  triangles: d.triangles,
});
