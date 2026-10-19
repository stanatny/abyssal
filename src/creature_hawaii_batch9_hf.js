import * as THREE from "three";
import { hawaiiBatch9Asset } from "./hawaii_batch9_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  chainWeights,
  createLordBones,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";
const smooth = (a, b, v) => THREE.MathUtils.smoothstep(v, a, b);
const point = new THREE.Vector3();

/** 鱼群以尾波推进；飞鱼由现有状态控制展鳍，沿用原飞行轨迹。 */
export function buildHawaiiBatch9HF(kind, root, motions) {
  const flying = kind === "flying_fish",
    reef = kind === "fish";
  const fin = flying
    ? [0.041, 0.032, -0.32]
    : reef
      ? [0.067, -0.035, -0.29]
      : kind === "mackerel"
        ? [0.067, 0.015, -0.26]
        : [0.052, -0.012, -0.3];
  const chains = [
    {
      name: "tail",
      type: "tail",
      points: [0.02, 0.19, 0.35].map((z) => [0, flying ? 0.032 : 0, z]),
    },
  ];
  for (const side of [-1, 1])
    chains.push({
      name: `pectoral_${side}`,
      type: "pectoral",
      side,
      points: [[side * fin[0], fin[1], fin[2]]],
    });
  if (flying)
    for (const side of [-1, 1])
      chains.push({
        name: `pelvic_${side}`,
        type: "pelvic",
        side,
        points: [[side * 0.018, -0.023, 0.015]],
      });
  const bones = createLordBones(root, chains);
  bones[0].name = `${kind}_root`;
  const asset = hawaiiBatch9Asset(kind, (x, y, z, ids, w, o) => {
    ids[o] = 0;
    w[o] = 1;
    point.set(x, y, z);
    chainWeights(chains[0], point, smooth(-0.08, 0.12, z), ids, w, o);
    const blend = flying
      ? smooth(0.044, 0.067, Math.abs(x)) *
        smooth(-0.355, -0.3, z) *
        (1 - smooth(0.1, 0.18, z))
      : smooth(fin[0] + 0.006, fin[0] + 0.035, Math.abs(x)) *
        smooth(-0.32, -0.25, z) *
        (1 - smooth(0.08, 0.14, z)) *
        (1 - smooth(0.04, 0.075, y)) *
        smooth(reef ? -0.135 : -0.1, reef ? -0.095 : -0.055, y);
    for (let j = 0; j < 3; j++) w[o + j] *= 1 - blend;
    ids[o + 3] = chains[x < 0 ? 1 : 2].ids[0];
    w[o + 3] = blend;
    if (flying && blend === 0) {
      const pelvic =
        smooth(0.033, 0.073, -y) *
        smooth(-0.015, 0.025, z) *
        (1 - smooth(0.17, 0.22, z));
      for (let j = 0; j < 3; j++) w[o + j] *= 1 - pelvic;
      ids[o + 3] = chains[x < 0 ? 3 : 4].ids[0];
      w[o + 3] = pelvic;
    }
  });
  const mesh = bindOrganicBody(
    root,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.3,
  );
  root.userData.hfRig = { kind, chains, bones, mesh };
  root.userData.normalizedLength = 1;
  root.userData.shoalAnatomy = kind;
  root.userData.artRevision = "trellis_hawaii_batch9_20261019";
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (!disposed) {
      disposed = true;
      mesh.skeleton.dispose();
    }
  };
  let glide = 0,
    previous;
  if (flying) {
    root.userData.airborne = false;
    root.userData.setGliding = (active) => {
      root.userData.airborne = Boolean(active);
    };
  }
  const effort = lordEffortSmoother();
  motions.push((phase, speed) => {
    const delta =
      previous === undefined || phase < previous
        ? 0
        : Math.min(0.6, phase - previous);
    previous = phase;
    glide +=
      ((root.userData.airborne ? 1 : 0) - glide) * (1 - Math.exp(-delta * 2));
    const e = smooth(0.5, 3, effort(phase, speed)),
      t = phase * (reef ? 1.35 : 1.8);
    chains[0].ids.forEach((id, j) => {
      bones[id].rotation.y =
        ((Math.sin(t - j * 0.55) * 0.065 * (1 + e * 0.4) * (j + 1)) / 2) *
        (1 - glide * 0.85);
    });
    for (const c of chains.filter((c) => c.type === "pectoral")) {
      const bone = bones[c.ids[0]];
      bone.rotation.y =
        -c.side *
        Math.sin(t * 0.75) *
        (reef ? 0.24 : 0.15) *
        (1 + e * 0.2) *
        (1 - glide);
      bone.rotation.z = c.side * Math.cos(t * 0.75) * 0.1 * (1 - glide);
      if (flying) {
        bone.rotation.y =
          -c.side *
          (0.96 * (1 - glide) +
            0.04 * glide +
            Math.sin(t * 0.7) * 0.025 * (1 - glide));
        bone.rotation.z = c.side * 0.31;
      }
    }
    if (flying)
      for (const c of chains.filter((c) => c.type === "pelvic"))
        bones[c.ids[0]].rotation.z = c.side * glide * 0.55;
    root.userData.glideBlend = glide;
  });
}
