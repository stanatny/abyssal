import * as THREE from "three";
import { hawaiiBatch7Asset } from "./hawaii_batch7_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { chainWeights, lordEffortSmoother } from "./hawaii_lord_rig.js";

const smooth = (a, b, v) => THREE.MathUtils.smoothstep(v, a, b);
const point = new THREE.Vector3();

/** Each species retains its propulsion anatomy; the shared world clock owns all motion. */
export function buildHawaiiBatch7HF(kind, root, motions) {
  const chains = [];
  const add = (name, type, points, extra = {}) =>
    chains.push({ name, type, points, ...extra });
  if (kind === "ray") {
    for (const side of [-1, 1])
      add(
        `wing_${side}`,
        "wing",
        [
          [side * 0.125, -0.025, -0.27],
          [side * 0.28, -0.015, -0.21],
          [side * 0.42, 0.015, -0.16],
        ],
        { side },
      );
    add("tail", "tail", [
      [0, -0.05, 0.015],
      [0, -0.05, 0.2],
      [0, -0.05, 0.38],
    ]);
  } else if (kind === "sunfish") {
    for (const side of [-1, 1])
      add(
        `vertical_${side}`,
        "vertical",
        [
          [0, side * 0.27, 0.235],
          [0, side * 0.43, 0.26],
        ],
        { side },
      );
    for (const side of [-1, 1])
      add(`pectoral_${side}`, "pectoral", [[side * 0.19, -0.015, -0.2]], {
        side,
      });
    add("clavus", "clavus", [[0, 0, 0.37]]);
  } else if (kind === "tuna") {
    add("spine", "tail", [
      [0, 0, -0.04],
      [0, 0, 0.12],
      [0, 0, 0.26],
      [0, 0, 0.37],
      [0, 0, 0.415],
    ]);
    for (const side of [-1, 1])
      add(`pectoral_${side}`, "pectoral", [[side * 0.09, -0.015, -0.2]], {
        side,
      });
  } else {
    // Eight distinct radial arms; sequential joints carry the same cup-bearing surface.
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI / 8 + (i * Math.PI) / 4;
      add(
        `arm_${i + 1}`,
        "arm",
        [0.1, 0.23, 0.36, 0.48].map((r) => [
          Math.cos(angle) * r,
          -0.077,
          Math.sin(angle) * r,
        ]),
        { angle, index: i },
      );
    }
    add("mantle", "mantle", [[0, 0.015, 0.17]]);
  }
  const base = new THREE.Bone();
  base.name = `${kind}_root`;
  root.add(base);
  const bones = [base];
  for (const c of chains) {
    c.ids = [];
    c.points.forEach((p, i) => {
      const bone = new THREE.Bone();
      bone.name = `${kind}_${c.name}_${i}`;
      bone.position.fromArray(p);
      const parent = i ? bones[c.ids[i - 1]] : base;
      if (i) bone.position.sub(new THREE.Vector3(...c.points[i - 1]));
      parent.add(bone);
      c.ids.push(bones.length);
      bones.push(bone);
    });
  }
  const asset = hawaiiBatch7Asset(kind, (x, y, z, ids, w, o) => {
    ids[o] = 0;
    w[o] = 1;
    point.set(x, y, z);
    if (kind === "ray") {
      const c = chains[x < 0 ? 0 : 1];
      chainWeights(
        c,
        point,
        smooth(0.12, 0.23, Math.abs(x)) * (1 - smooth(-0.015, 0.035, z)),
        ids,
        w,
        o,
      );
      if (z > 0) chainWeights(chains[2], point, smooth(0, 0.07, z), ids, w, o);
    } else if (kind === "sunfish") {
      const c = chains[y < 0 ? 0 : 1];
      chainWeights(
        c,
        point,
        smooth(0.27, 0.36, Math.abs(y)) * smooth(0.05, 0.15, z),
        ids,
        w,
        o,
      );
      const p = chains[x < 0 ? 2 : 3],
        blend =
          smooth(0.19, 0.235, Math.abs(x)) *
          (1 - smooth(0.1, 0.16, Math.abs(y))) *
          (1 - smooth(-0.04, 0.01, z));
      if (blend > 0) {
        for (let j = 0; j < 3; j++) w[o + j] *= 1 - blend;
        ids[o + 3] = p.ids[0];
        w[o + 3] = blend;
      }
      if (z > 0.36)
        chainWeights(chains[4], point, smooth(0.36, 0.44, z), ids, w, o);
    } else if (kind === "tuna") {
      chainWeights(chains[0], point, smooth(-0.16, 0.015, z), ids, w, o);
      const fan = smooth(0.39, 0.42, z);
      for (let j = 0; j < 3; j++) w[o + j] *= 1 - fan;
      ids[o + 3] = chains[0].ids.at(-1);
      w[o + 3] = fan;
      const blend =
        smooth(0.09, 0.14, Math.abs(x)) *
        (1 - smooth(0.025, 0.07, y)) *
        smooth(-0.27, -0.2, z) *
        (1 - smooth(0.025, 0.08, z));
      if (blend > 0) {
        for (let j = 0; j < 4; j++) w[o + j] *= 1 - blend;
        ids[o + 3] = chains[x < 0 ? 1 : 2].ids[0];
        w[o + 3] += blend;
      }
    } else {
      const radius = Math.hypot(x, z),
        angle = Math.atan2(z, x);
      let selected = chains[0],
        best = Infinity;
      for (const c of chains.slice(0, 8)) {
        const d = Math.abs(
          Math.atan2(Math.sin(angle - c.angle), Math.cos(angle - c.angle)),
        );
        if (d < best) {
          best = d;
          selected = c;
        }
      }
      const arm = smooth(0.105, 0.22, radius) * (1 - smooth(-0.015, 0.045, y));
      chainWeights(selected, point, arm, ids, w, o);
      const mantle =
        smooth(-0.005, 0.075, y) *
        smooth(0.04, 0.12, z) *
        (1 - smooth(0.1, 0.17, Math.abs(x)));
      for (let j = 0; j < 3; j++) w[o + j] *= 1 - mantle;
      ids[o + 3] = chains[8].ids[0];
      w[o + 3] = mantle;
    }
  });
  const mesh = bindOrganicBody(
    root,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.5,
  );
  root.userData.hfRig = { kind, chains, bones, mesh };
  root.userData.normalizedLength = 1;
  root.userData[kind === "octopus" ? "hunterAnatomy" : "shoalAnatomy"] = kind;
  root.userData.artRevision = "trellis_hawaii_batch7_20261019";
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (!disposed) {
      disposed = true;
      mesh.skeleton.dispose();
    }
  };
  const effort = lordEffortSmoother();
  motions.push((phase, speed) => {
    const e = smooth(0.5, 3, effort(phase, speed));
    if (kind === "ray") {
      const t = phase * 0.7;
      for (const c of chains.filter((c) => c.type === "wing"))
        c.ids.forEach((id, j) => {
          bones[id].rotation.z =
            c.side *
            Math.sin(t - j * 0.48) *
            (0.16 + e * 0.055) *
            (j === 0 ? 1 : 0.72);
          bones[id].rotation.x = Math.cos(t - j * 0.4) * 0.018;
        });
      chains[2].ids.forEach(
        (id, j) => (bones[id].rotation.y = Math.sin(t * 0.7 - j * 0.5) * 0.035),
      );
    } else if (kind === "sunfish") {
      const t = phase * 0.88;
      for (const c of chains.filter((c) => c.type === "vertical"))
        c.ids.forEach((id, j) => {
          bones[id].rotation.z =
            c.side * Math.sin(t - j * 0.35) * (0.19 + e * 0.07);
          bones[id].rotation.y = Math.cos(t - j * 0.3) * 0.045;
        });
      for (const c of chains.filter((c) => c.type === "pectoral"))
        bones[c.ids[0]].rotation.y = -c.side * Math.sin(t * 1.3) * 0.1;
      bones[chains[4].ids[0]].rotation.y = Math.sin(t * 0.7) * 0.035;
    } else if (kind === "tuna") {
      const t = phase * 1.7;
      chains[0].ids.forEach(
        (id, j) =>
          (bones[id].rotation.y =
            (Math.sin(t - j * 0.65) * (0.045 + e * 0.025) * (j + 1)) / 3),
      );
      for (const c of chains.slice(1)) {
        bones[c.ids[0]].rotation.y =
          c.side * (e * 0.07 + Math.sin(t * 0.45) * 0.04);
        bones[c.ids[0]].rotation.z = c.side * Math.sin(t * 0.5) * 0.045;
      }
    } else {
      const t = phase * 0.65;
      for (const c of chains.slice(0, 8))
        c.ids.forEach((id, j) => {
          const bend =
            Math.sin(t - j * 0.7 + c.index * 0.65) *
            (0.1 + e * 0.035) *
            (j ? 1 : 0.55);
          bones[id].rotation.set(
            Math.sin(c.angle) * bend,
            Math.sin(t * 0.8 - j * 0.5 + c.index) * 0.025,
            -Math.cos(c.angle) * bend,
          );
        });
      const breath = 1 + Math.sin(t * 1.4) * 0.013;
      bones[chains[8].ids[0]].scale.set(breath, breath, 1);
    }
  });
}
