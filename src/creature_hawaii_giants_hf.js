import * as THREE from "three";
import { hawaiiGiantAsset } from "./hawaii_giant_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  createLordBones,
  chainWeights,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";

const point = new THREE.Vector3();
const smooth = (a, b, value) => THREE.MathUtils.smoothstep(value, a, b);

/** 抹香鲸上下摆尾；鱼龙侧向尾波与四鳍调姿。沿用普通猎手的根节点和行为。 */
export function buildHawaiiGiantHF(kind, root, motions) {
  const whale = kind === "sperm_whale";
  const chains = [
    {
      name: `${kind}_spine`,
      type: "tail",
      points: whale
        ? [
            [0, 0.02, -0.1],
            [0, 0.025, 0.08],
            [0, 0.05, 0.22],
            [0, 0.07, 0.34],
            [0, 0.075, 0.415],
          ]
        : [
            [0, 0.01, -0.12],
            [0, 0.01, 0.04],
            [0, 0.01, 0.17],
            [0, 0.02, 0.29],
            [0, 0.02, 0.38],
          ],
    },
    ...[-1, 1].map((side) => ({
      name: `${kind}_pectoral_${side}`,
      type: "fin",
      side,
      points: [
        [
          side * (whale ? 0.112 : 0.068),
          whale ? -0.03 : -0.025,
          whale ? -0.225 : -0.235,
        ],
      ],
    })),
    ...(!whale
      ? [-1, 1].map((side) => ({
          name: `${kind}_pelvic_${side}`,
          type: "fin",
          side,
          pelvic: true,
          points: [[side * 0.06, -0.035, 0.145]],
        }))
      : []),
  ];
  const bones = createLordBones(root, chains),
    spine = chains[0];
  const asset = hawaiiGiantAsset(kind, (x, y, z, ids, weights, offset) => {
    point.set(x, y, z);
    chainWeights(spine, point, smooth(-0.13, 0.03, z), ids, weights, offset);
    const fan = smooth(whale ? 0.39 : 0.35, whale ? 0.43 : 0.4, z);
    for (let i = 0; i < 3; i++) weights[offset + i] *= 1 - fan;
    ids[offset + 3] = spine.ids.at(-1);
    weights[offset + 3] = fan;
    for (const fin of chains.slice(1)) {
      if (Math.sign(x) !== fin.side) continue;
      const blend = fin.pelvic
        ? smooth(0.06, 0.076, Math.abs(x)) *
          (1 - smooth(-0.055, -0.025, y)) *
          smooth(0.1, 0.15, z) *
          (1 - smooth(0.25, 0.28, z))
        : smooth(whale ? 0.116 : 0.072, whale ? 0.17 : 0.125, Math.abs(x)) *
          (1 - smooth(-0.045, -0.015, y)) *
          smooth(-0.29, -0.24, z) *
          (1 - smooth(-0.035, 0.005, z));
      if (blend <= 0) continue;
      for (let i = 0; i < 3; i++) weights[offset + i] *= 1 - blend;
      ids[offset + 3] = fin.ids[0];
      weights[offset + 3] = blend;
    }
  });
  const mesh = bindOrganicBody(
    root,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.2,
  );
  root.userData.hfRig = { kind, chains, bones, mesh };
  root.userData[whale ? "hunterAnatomy" : "ancientAnatomy"] = kind;
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_hawaii_giants_20261019";
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
    const e = effort(phase, speed),
      t = phase * (whale ? 0.76 : 0.9),
      drive = 0.8 + smooth(0.5, 3, e) * 0.34;
    spine.ids.forEach((id, i) => {
      bones[id].rotation[whale ? "x" : "y"] =
        Math.sin(t - i * 0.64) * [0.016, 0.055, 0.105, 0.15, 0.14][i] * drive;
    });
    for (const fin of chains.slice(1)) {
      const b = bones[fin.ids[0]],
        s = fin.side;
      b.rotation.z =
        s *
        (0.025 + Math.sin(t * 0.55 + s * 0.25 + (fin.pelvic ? 0.8 : 0)) * 0.13);
      b.rotation.y = -s * (0.02 + smooth(1, 3, e) * 0.07);
      b.rotation.x =
        Math.sin(t * 0.55 + (fin.pelvic ? 0.8 : 0)) *
        (fin.pelvic ? -0.08 : 0.04);
    }
  });
}
