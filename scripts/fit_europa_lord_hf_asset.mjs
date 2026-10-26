import { repairPackedNormals } from "./repair_packed_normals.mjs";
/** 根据原始实体的截面和中心线拟合冰下领主；保持 UV、可复现源哈希与独立骨架。 */
import * as T from "three";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const [kind, input, out] = process.argv.slice(2),
  d = JSON.parse(await readFile(input, "utf8"));
const dec = (s, C) => new C(Uint8Array.from(Buffer.from(s, "base64")).buffer),
  enc = (a) =>
    Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
const q = dec(d.position, Uint16Array),
  p = Array.from(
    { length: d.vertices },
    (_, i) =>
      new T.Vector3(
        ...[0, 1, 2].map(
          (j) => d.min[j] + (q[i * 3 + j] / 65535) * (d.max[j] - d.min[j]),
        ),
      ),
  );
const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b),
  chains = [];
const add = (name, points, type, extra = {}) => {
  const c = { name, points, type, ...extra };
  chains.push(c);
  return c;
};
if (kind === "brine_regent") {
  add(
    "axis",
    [-0.1, 0, 0.1, 0.2, 0.3, 0.4, 0.49].map((z) => [0, 0.035, z]),
    "tail",
  );
  for (const side of [-1, 1])
    for (const [i, z] of [-0.32, -0.16, 0.015].entries())
      add(
        "fin_" + side + "_" + i,
        [
          [side * 0.1, -0.055, z - 0.025],
          [side * 0.17, -0.12, z],
          [side * 0.225, -0.15, z + 0.035],
        ],
        "fin",
        { side, index: i },
      );
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    add(
      "jaw_" + i,
      [[Math.cos(a) * 0.065, Math.sin(a) * 0.065 + 0.025, -0.425]],
      "jaw",
      { angle: a },
    );
  }
} else if (kind === "lumen_stalker") {
  const xz = [
    [
      [0.015, -0.11],
      [0.055, -0.21],
      [0.105, -0.31],
      [0.12, -0.4],
      [0.09, -0.478],
      [0.04, -0.49],
      [0.014, -0.45],
    ],
    [
      [-0.03, -0.1],
      [-0.08, -0.19],
      [-0.17, -0.24],
      [-0.25, -0.265],
      [-0.27, -0.31],
      [-0.24, -0.37],
      [-0.2, -0.39],
      [-0.17, -0.36],
    ],
    [
      [-0.06, -0.06],
      [-0.17, -0.11],
      [-0.28, -0.12],
      [-0.39, -0.13],
      [-0.43, -0.18],
      [-0.42, -0.23],
      [-0.4, -0.25],
    ],
    [
      [-0.075, 0.01],
      [-0.19, -0.015],
      [-0.3, 0.015],
      [-0.4, 0.045],
      [-0.47, 0.015],
      [-0.49, -0.03],
      [-0.46, -0.08],
    ],
    [
      [-0.07, 0.09],
      [-0.18, 0.12],
      [-0.245, 0.2],
      [-0.29, 0.28],
      [-0.27, 0.32],
      [-0.22, 0.325],
      [-0.18, 0.3],
    ],
    [
      [0.07, 0.08],
      [0.16, 0.1],
      [0.22, 0.15],
      [0.29, 0.18],
      [0.33, 0.23],
      [0.3, 0.27],
      [0.28, 0.23],
    ],
    [
      [0.075, -0.005],
      [0.19, -0.025],
      [0.28, 0.04],
      [0.37, 0.065],
      [0.46, 0.03],
      [0.48, -0.02],
      [0.44, -0.07],
    ],
    [
      [0.04, -0.095],
      [0.145, -0.145],
      [0.245, -0.16],
      [0.31, -0.19],
      [0.33, -0.26],
      [0.315, -0.32],
      [0.3, -0.34],
    ],
  ];
  // 单一连续空间变换保留腕根连接；不按最近腕硬切顶点，避免跨腕三角形撕裂。
  const warp = (v) => {
    const z = v.z + 0.035;
    const radius = Math.hypot(v.x, z);
    const angle = Math.atan2(v.x, -z) * 1.25;
    const guard = 1 - smooth(0.13, 0.2, Math.abs(v.x));
    const body = smooth(-0.07, 0.04, v.z) * guard;
    const weight = smooth(0.09, 0.22, radius) * (1 - body);
    const target = new T.Vector3(
      Math.sin(angle) * radius * 3.35,
      Math.cos(angle) * radius * 2.35 + v.y * 0.4,
      -0.09 - radius * 0.28 + v.y * 2.5,
    );
    return v.clone().lerp(target, weight);
  };
  for (let i = 0; i < 8; i++) {
    const pts = xz[i].map(([x, z]) => {
      const near = p.filter((v) => (v.x - x) ** 2 + (v.z - z) ** 2 < 0.0005);
      return new T.Vector3(
        x,
        near.length ? near.reduce((s, v) => s + v.y, 0) / near.length : -0.025,
        z,
      );
    });
    const old = new T.CatmullRomCurve3(pts).getSpacedPoints(24);
    add(
      "arm_" + i,
      old.map((v) => warp(v).toArray()),
      "arm",
      { source: old.map((v) => v.toArray()), index: i },
    );
  }
  // 在原始连续表面上绑定，再随同几何搬运，避免收腕后按空间近邻误认另一条腕。
  const nearest = (v, c) => {
    let best = { distance: Infinity };
    for (let j = 0; j < c.source.length - 1; j++) {
      const a = new T.Vector3(...c.source[j]),
        b = new T.Vector3(...c.source[j + 1]),
        seg = b.clone().sub(a);
      const t = T.MathUtils.clamp(
        v.clone().sub(a).dot(seg) / seg.lengthSq(),
        0,
        1,
      );
      const distance = v.distanceToSquared(a.addScaledVector(seg, t));
      if (distance < best.distance) best = { distance, j, t, c };
    }
    return best;
  };
  const glow = new Uint8Array(p.length);
  const weights = p.map((v, vertex) => {
    const n = chains
      .map((c) => nearest(v, c))
      .sort((a, b) => a.distance - b.distance)[0];
    const body =
      smooth(-0.07, 0.04, v.z) * (1 - smooth(0.13, 0.2, Math.abs(v.x)));
    const f = smooth(0.09, 0.22, Math.hypot(v.x, v.z + 0.035)) * (1 - body);
    const u = (n.j + n.t) / 24,
      spot = Math.abs(((u * 8 + 0.3) % 1) - 0.5);
    glow[vertex] = Math.round(
      255 *
        (1 - smooth(0.12, 0.26, spot)) *
        smooth(0.12, 0.25, u) *
        f *
        (1 - smooth(0.018, 0.045, Math.sqrt(n.distance))),
    );
    const bone = 1 + n.c.index * 25 + n.j;
    return new Map([
      [0, 1 - f],
      [bone, f * (1 - n.t)],
      [bone + 1, f * n.t],
    ]);
  });
  // UV 分岛副本共享拓扑邻域；局部扩散只柔化连接，不增加运行时运算。
  const vertices = new Map(),
    canonical = [];
  for (let i = 0; i < p.length; i++) {
    const key = p[i]
      .toArray()
      .map((x) => x.toFixed(5))
      .join(",");
    if (!vertices.has(key)) vertices.set(key, i);
    canonical[i] = vertices.get(key);
  }
  const adjacent = Array.from({ length: p.length }, () => new Set());
  const index = dec(d.index, Uint16Array);
  for (let i = 0; i < index.length; i += 3)
    for (let j = 0; j < 3; j++) {
      const a = canonical[index[i + j]],
        b = canonical[index[i + ((j + 1) % 3)]];
      if (a !== b) {
        adjacent[a].add(b);
        adjacent[b].add(a);
      }
    }
  let all = weights;
  for (let iteration = 0; iteration < 6; iteration++) {
    const next = all.map((w, i) => {
      if (canonical[i] !== i) return null;
      const result = new Map([...w].map(([k, v]) => [k, v * 0.6])),
        near = adjacent[i];
      for (const j of near)
        for (const [k, v] of all[j])
          result.set(k, (result.get(k) || 0) + (v * 0.4) / near.size);
      const top = [...result].sort((a, b) => b[1] - a[1]).slice(0, 4),
        sum = top.reduce((s, v) => s + v[1], 0);
      return new Map(top.map(([k, v]) => [k, v / sum]));
    });
    all = next.map((w, i) => w || next[canonical[i]]);
  }
  const skinI = new Uint16Array(p.length * 4),
    skinW = new Uint16Array(p.length * 4);
  all.forEach((w, i) => {
    const rows = [...w];
    let used = 0;
    rows.forEach(([k, v], j) => {
      skinI[i * 4 + j] = k;
      skinW[i * 4 + j] =
        j === rows.length - 1 ? 65535 - used : Math.floor(v * 65535);
      used += skinW[i * 4 + j];
    });
  });
  d.skinIndex = enc(skinI);
  d.skinWeight = enc(skinW);
  d.luminescence = enc(glow);
  const outp = p.map(warp);
  p.splice(0, p.length, ...outp);
} else if (kind === "abyss_weaver") {
  // 在分离的六腕截面上追踪中心；所有分叉跟随各自末梢，避免一个轴骨架拖动整个腕冠。
  const cluster = (pts, centers) => {
    for (let it = 0; it < 24; it++) {
      const groups = centers.map(() => []);
      for (const v of pts) {
        let n = 0;
        for (let j = 1; j < centers.length; j++)
          if (v.distanceToSquared(centers[j]) < v.distanceToSquared(centers[n]))
            n = j;
        groups[n].push(v);
      }
      centers = centers.map((v, i) =>
        groups[i].length
          ? groups[i]
              .reduce((s, x) => s.add(x), new T.Vector2())
              .multiplyScalar(1 / groups[i].length)
          : v,
      );
    }
    return centers;
  };
  let centers = [
    [-0.2, -0.03],
    [0.136, -0.047],
    [-0.124, -0.197],
    [-0.064, -0.024],
    [0.058, -0.09],
    [0.064, -0.007],
  ].map((v) => new T.Vector2(...v));
  const zvals = [0.04, 0.09, 0.14, 0.19, 0.24, 0.29, 0.34, 0.39, 0.44],
    lines = centers.map(() => []);
  for (const z of zvals) {
    centers = cluster(
      p
        .filter((v) => Math.abs(v.z - z) < 0.018)
        .map((v) => new T.Vector2(v.x, v.y)),
      centers,
    );
    centers.forEach((c, i) => lines[i].push([c.x, c.y, z]));
  }
  lines.forEach((line, i) => {
    const a = line[0],
      root = [a[0] * 0.65, a[1] * 0.6, -0.16],
      mid = [a[0] * 0.85, a[1] * 0.85, -0.06];
    add("arm_" + i, [root, mid, ...line], "arm", { index: i });
  });
  const widen = (v) => {
    const k = 1 + 1.65 * smooth(-0.2, 0.02, v.z);
    return new T.Vector3(v.x * k, v.y, v.z);
  };
  p.forEach((v) => v.copy(widen(v)));
  chains.forEach(
    (c) =>
      (c.points = c.points.map((v) => widen(new T.Vector3(...v)).toArray())),
  );
} else throw Error(kind);
const normal = dec(d.normal, Int16Array);
if (kind !== "brine_regent") {
  const g = new T.BufferGeometry();
  g.setAttribute(
    "position",
    new T.Float32BufferAttribute(
      p.flatMap((v) => v.toArray()),
      3,
    ),
  );
  g.setIndex(new T.BufferAttribute(dec(d.index, Uint16Array), 1));
  g.computeVertexNormals();
  const n = g.attributes.normal;
  // UV 接缝副本共用平均法线，防止光照细线。
  const groups = new Map();
  for (let i = 0; i < p.length; i++) {
    const k = p[i]
      .toArray()
      .map((x) => x.toFixed(6))
      .join(",");
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  }
  for (const ids of groups.values()) {
    const v = new T.Vector3();
    for (const i of ids) v.add(new T.Vector3().fromBufferAttribute(n, i));
    v.normalize();
    for (const i of ids) {
      normal[i * 3] = Math.round(v.x * 32767);
      normal[i * 3 + 1] = Math.round(v.y * 32767);
      normal[i * 3 + 2] = Math.round(v.z * 32767);
    }
  }
}
const initialBox = new T.Box3().setFromPoints(p),
  finalScale = 1 / (initialBox.max.z - initialBox.min.z),
  shift = (initialBox.max.z + initialBox.min.z) / 2;
for (const v of p) {
  v.z -= shift;
  v.multiplyScalar(finalScale);
}
for (const c of chains)
  c.points = c.points.map((v) => [
    v[0] * finalScale,
    v[1] * finalScale,
    (v[2] - shift) * finalScale,
  ]);
d.fitTransform = { scale: finalScale, shift };
const box = new T.Box3().setFromPoints(p);
d.min = box.min.toArray();
d.max = box.max.toArray();
for (let i = 0; i < p.length; i++)
  for (let j = 0; j < 3; j++)
    q[i * 3 + j] = Math.round(
      ((p[i].getComponent(j) - d.min[j]) / (d.max[j] - d.min[j])) * 65535,
    );
d.position = enc(q);
d.normal = enc(normal);
d.rig = { chains };
d.fitSourceSha256 = createHash("sha256")
  .update(await readFile(input))
  .digest("hex");
repairPackedNormals(d);
await mkdir(out, { recursive: true });
await writeFile(out + "/" + kind + "_hf_mesh.json", JSON.stringify(d) + "\n");
console.log(
  kind,
  d.min,
  d.max,
  chains.map((c) => ({
    name: c.name,
    points: c.points.length,
    length: c.points
      .slice(1)
      .reduce(
        (s, v, i) =>
          s + new T.Vector3(...v).distanceTo(new T.Vector3(...c.points[i])),
        0,
      ),
  })),
);
