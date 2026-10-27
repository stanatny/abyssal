import * as T from "three";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
// Usage: node scripts/fit_penglai_giant_hf_asset.mjs EVIDENCE_DIR bashe kui kun
// EVIDENCE_DIR contains converted/ and the measured original_contract.json.
const base = process.argv[2],
  contracts = JSON.parse(readFileSync(base + "/original_contract.json"));
for (const kind of process.argv.slice(3)) {
  const d = JSON.parse(readFileSync(`${base}/converted/${kind}_hf_mesh.json`)),
    ct = contracts[kind];
  const dec = (k, C) =>
      new C(Uint8Array.from(Buffer.from(d[k], "base64")).buffer),
    q = dec("position", Uint16Array),
    n = dec("normal", Int16Array),
    p = Float32Array.from(
      q,
      (v, i) => d.min[i % 3] + (v / 65535) * (d.max[i % 3] - d.min[i % 3]),
    );
  let sx = 1,
    sy = 1,
    dy =
      kind === "bashe"
        ? ct.head[0][1] - 0.065
        : kind === "kun"
          ? ct.head[0][1] - 0.04
          : 0,
    dz = kind === "kun" ? 0.05 : 0;
  if (kind === "kui") {
    sx = 0.73;
    sy = (ct.ground + ct.head[0][1]) / (0.133 - d.min[1]);
    dy = -ct.ground - d.min[1] * sy;
  }
  const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);
  const map = ([x, y, z]) => [
    x * sx,
    y * sy +
      dy +
      (kind === "kui"
        ? 0.09 * smooth(-0.25, -0.05, z) * smooth(-0.27, -0.04, y)
        : 0),
    z + dz,
  ];
  const chains = [];
  const add = (name, type, points, extra = {}) =>
    chains.push({ name, type, points: points.map(map), ...extra });
  if (kind === "bashe") {
    const centers = [];
    for (const z of [
      -0.45, -0.4, -0.35, -0.3, -0.25, -0.2, -0.15, -0.1, -0.05, 0, 0.05, 0.1,
      0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.49,
    ]) {
      const ys = [];
      for (let i = 0; i < p.length; i += 3)
        if (Math.abs(p[i + 2] - z) < 0.02) ys.push(p[i + 1]);
      ys.sort((a, b) => a - b);
      centers.push([
        0,
        (ys[Math.floor(ys.length * 0.1)] + ys[Math.floor(ys.length * 0.9)]) / 2,
        z,
      ]);
    }
    add("axis", "axis", centers);
  } else if (kind === "kun") {
    add("tail", "tail", [
      [0, -0.02, 0.04],
      [0, -0.01, 0.15],
      [0, 0.005, 0.25],
      [0, 0.04, 0.35],
      [0, 0.09, 0.43],
    ]);
    for (const side of [-1, 1])
      add(
        "paddle_" + side,
        "paddle",
        [
          [side * 0.1, -0.015, -0.25],
          [side * 0.21, -0.065, -0.23],
          [side * 0.34, -0.13, -0.21],
          [side * 0.47, -0.15, -0.16],
        ],
        { side },
      );
  } else {
    add("neck", "neck", [
      [0, 0.1, -0.21],
      [0, 0.16, -0.34],
      [0, 0.133, -0.46],
    ]);
    add("leg", "leg", [
      [0, -0.065, -0.045],
      [0, -0.21, -0.045],
      [0, -0.31, -0.045],
    ]);
    add("tail", "tail", [
      [0, 0.08, 0.39],
      [0, -0.015, 0.43],
      [0, -0.15, 0.47],
    ]);
  }
  for (let i = 0; i < p.length; i += 3) {
    p.set(map(Array.from(p.slice(i, i + 3))), i);
    const orig = Array.from(
      q.slice(i, i + 3),
      (v, j) => d.min[j] + (v / 65535) * (d.max[j] - d.min[j]),
    );
    const cols = [0, 1, 2].map((j) => {
      const a = [...orig],
        b = [...orig];
      a[j] += 0.00001;
      b[j] -= 0.00001;
      return new T.Vector3(...map(a))
        .sub(new T.Vector3(...map(b)))
        .multiplyScalar(50000);
    });
    const mat = new T.Matrix3()
      .set(
        cols[0].x,
        cols[1].x,
        cols[2].x,
        cols[0].y,
        cols[1].y,
        cols[2].y,
        cols[0].z,
        cols[1].z,
        cols[2].z,
      )
      .invert()
      .transpose();
    const v = new T.Vector3(n[i], n[i + 1], n[i + 2])
      .applyMatrix3(mat)
      .normalize();
    n[i] = Math.round(v.x * 32767);
    n[i + 1] = Math.round(v.y * 32767);
    n[i + 2] = Math.round(v.z * 32767);
  }
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  p.forEach((v, i) => {
    min[i % 3] = Math.min(min[i % 3], v);
    max[i % 3] = Math.max(max[i % 3], v);
  });
  p.forEach(
    (v, i) =>
      (q[i] = Math.round(
        ((v - min[i % 3]) / (max[i % 3] - min[i % 3])) * 65535,
      )),
  );
  const pack = (a) =>
    Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
  Object.assign(d, {
    min,
    max,
    position: pack(q),
    normal: pack(n),
    contactFit: {
      head: ct.head[0],
      ground: ct.ground,
      chains,
      legY: map([0, -0.065, -0.045])[1],
      legZ: -0.045,
      tailStart: 0.39,
      sx,
      sy,
      dy,
      dz,
      reason:
        "Fit rendered anatomy while preserving existing head/support metadata and world size; no species or combat changes.",
    },
  });
  writeFileSync(
    `src/assets/models/${kind}_hf_mesh.json`,
    JSON.stringify(d) + "\n",
  );
  copyFileSync(
    `${base}/converted/${kind}_hf_color.webp`,
    `src/assets/models/${kind}_hf_color.webp`,
  );
  console.log(kind, d.triangles, d.contactFit);
}
