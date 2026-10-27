/** Fit actual HF surfaces and anatomical chains to existing interaction anchors. */
import * as T from "three";
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
const base = process.argv[2],
  contracts = JSON.parse(readFileSync(base + "/original_contract.json"));
for (const kind of process.argv.slice(3)) {
  const d = JSON.parse(readFileSync(`${base}/converted/${kind}_hf_mesh.json`));
  const dec = (k, C) =>
      new C(Uint8Array.from(Buffer.from(d[k], "base64")).buffer),
    q = dec("position", Uint16Array),
    n = dec("normal", Int16Array),
    p = Float32Array.from(
      q,
      (v, i) => d.min[i % 3] + (v / 65535) * (d.max[i % 3] - d.min[i % 3]),
    );
  const head =
    contracts[kind]?.head?.[0] ??
    (kind === "taotie" ? [0, 0.045, -0.47] : null);
  const sourceHead = {
    gate_dragon: [0, 0.12, -0.45],
    peng: [0, -0.015, -0.49],
    taotie: [0, 0.045, -0.47],
    gilded_cloud_carp: [0, 0, -0.48],
  }[kind];
  const offset = head ? head.map((v, j) => v - sourceHead[j]) : [0, 0, 0];
  const sx = kind === "peng" ? 1.45 : 1,
    map = ([x, y, z]) => [x * sx + offset[0], y + offset[1], z + offset[2]];
  const chains = [],
    add = (name, type, points, extra = {}) =>
      chains.push({ name, type, points: points.map(map), ...extra });
  let legY = -0.07,
    jawY = 0.018;
  if (kind === "gate_dragon") {
    const pts = [];
    for (let z = -0.45; z <= 0.501; z += 0.05) {
      let ys = [];
      for (let i = 0; i < p.length; i += 3)
        if (Math.abs(p[i + 2] - z) < 0.022 && Math.abs(p[i]) < 0.04)
          ys.push(p[i + 1]);
      ys.sort((a, b) => a - b);
      pts.push([0, ys.length ? ys[Math.floor(ys.length * 0.5)] : -0.07, z]);
    }
    add("axis", "axis", pts);
    legY = -0.09;
    for (const side of [-1, 1])
      for (const front of [true, false]) {
        const z = front ? -0.31 : 0.26;
        add(
          `leg_${side}_${front}`,
          "leg",
          [
            [side * 0.035, -0.07, z],
            [side * 0.07, -0.14, z + 0.01],
            [side * 0.085, -0.19, z - 0.015],
          ],
          { side, front },
        );
      }
  } else if (kind === "peng") {
    for (const side of [-1, 1])
      add(
        "wing_" + side,
        "wing",
        [
          [side * 0.065, -0.045, -0.13],
          [side * 0.255, 0.055, -0.12],
          [side * 0.43, 0.17, 0.04],
        ],
        { side },
      );
    add("tail", "tail", [
      [0, -0.075, 0.12],
      [0, -0.11, 0.29],
      [0, -0.1, 0.43],
    ]);
  } else if (kind === "gilded_cloud_carp") {
    add("tail", "tail", [
      [0, 0, -0.08],
      [0, 0, 0.07],
      [0, 0, 0.2],
      [0, 0, 0.32],
      [0, 0, 0.43],
    ]);
    for (const side of [-1, 1])
      add(
        "paddle_" + side,
        "paddle",
        [
          [side * 0.055, -0.035, -0.22],
          [side * 0.13, -0.09, -0.15],
          [side * 0.21, -0.13, -0.02],
        ],
        { side },
      );
  } else {
    for (const side of [-1, 1])
      for (const front of [true, false])
        add(
          `leg_${side}_${front}`,
          "leg",
          {
            "-1_true": [
              [-0.12, -0.055, -0.09],
              [-0.14, -0.155, -0.06],
              [-0.155, -0.245, -0.12],
            ],
            "-1_false": [
              [-0.09, -0.045, 0.29],
              [-0.075, -0.15, 0.395],
              [-0.105, -0.245, 0.38],
            ],
            "1_true": [
              [0.15, -0.05, -0.17],
              [0.185, -0.145, -0.19],
              [0.145, -0.245, -0.295],
            ],
            "1_false": [
              [0.1, -0.045, 0.25],
              [0.1, -0.15, 0.34],
              [0.115, -0.245, 0.295],
            ],
          }[`${side}_${front}`],
          { side, front },
        );
    add("neck", "neck", [
      [0, 0.045, -0.16],
      [0, 0.07, -0.32],
    ]);
    add("jaw", "jaw", [
      [0, 0.025, -0.28],
      [0, -0.005, -0.44],
    ]);
    add("tail", "tail", [
      [0, 0.025, 0.32],
      [0, 0.025, 0.42],
      [0, 0.01, 0.49],
    ]);
  }
  for (let i = 0; i < p.length; i += 3) {
    p.set(map(Array.from(p.slice(i, i + 3))), i);
    let v = new T.Vector3(n[i] / sx, n[i + 1], n[i + 2]).normalize();
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
      head,
      ground: contracts[kind]?.ground ?? -min[1],
      chains,
      legY: legY + offset[1],
      jawY: jawY + offset[1],
      sx,
      offset,
      reason:
        "Measured anatomy and source normalization; existing forms retain interaction anchors. Taotie introduces its own contact.",
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
  console.log(kind, d.triangles, { min, max, fit: d.contactFit });
}
