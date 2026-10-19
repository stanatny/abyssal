import * as THREE from "three";
import { hawaiiAncientAsset } from "./hawaii_ancient_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  createLordBones,
  chainWeights,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";

const point = new THREE.Vector3();
const smooth = (a, b, value) => THREE.MathUtils.smoothstep(value, a, b);

/** 巨齿鲨侧向尾波；龙王鲸长躯垂直波动，微小后肢随躯干而不作推进。 */
export function buildHawaiiAncientHF(kind, root, motions) {
  const whale = kind === "basilosaurus";
  const zs = whale
    ? [-0.2, -0.1, 0, 0.1, 0.2, 0.29, 0.36, 0.43]
    : [-0.12, 0.02, 0.15, 0.25, 0.33];
  const chains = [
    {
      name: `${kind}_spine`,
      type: "tail",
      points: zs.map((z, i) => [
        0,
        whale ? [0, -0.01, -0.005, 0, 0.015, 0.024, 0.024, 0.02][i] : -0.02,
        z,
      ]),
    },
    ...[-1, 1].map((side) => ({
      name: `${kind}_pectoral_${side}`,
      type: "fin",
      side,
      points: [[side * (whale ? 0.04 : 0.09), whale ? -0.025 : -0.055, -0.28]],
    })),
  ];
  const bones = createLordBones(root, chains),
    spine = chains[0];
  const asset = hawaiiAncientAsset(kind, (x, y, z, ids, weights, offset) => {
    point.set(x, y, z);
    chainWeights(
      spine,
      point,
      smooth(whale ? -0.25 : -0.15, whale ? -0.12 : 0.02, z),
      ids,
      weights,
      offset,
    );
    const fan = smooth(whale ? 0.41 : 0.31, whale ? 0.45 : 0.35, z);
    for (let i = 0; i < 3; i++) weights[offset + i] *= 1 - fan;
    ids[offset + 3] = spine.ids.at(-1);
    weights[offset + 3] = fan;
    const fin = chains[x < 0 ? 1 : 2];
    const blend =
      smooth(whale ? 0.045 : 0.098, whale ? 0.075 : 0.155, Math.abs(x)) *
      (1 - smooth(whale ? -0.025 : -0.06, whale ? -0.005 : -0.015, y)) *
      smooth(whale ? -0.35 : -0.32, whale ? -0.29 : -0.27, z) *
      (1 - smooth(whale ? -0.12 : -0.11, whale ? -0.08 : -0.075, z));
    if (blend > 0) {
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
    0.24,
  );
  root.userData.hfRig = { kind, chains, bones, mesh };
  root.userData.ancientAnatomy = kind;
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_hawaii_ancients_20261019";
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (!disposed) {
      disposed = true;
      mesh.skeleton.dispose();
    }
  };
  const fins = chains.slice(1);
  const effort = lordEffortSmoother();
  const amplitudes = whale
    ? [0.012, 0.03, 0.05, 0.07, 0.085, 0.1, 0.12, 0.11]
    : [0.016, 0.055, 0.095, 0.14, 0.15];
  motions.push((phase, speed) => {
    const e = effort(phase, speed),
      t = phase * (whale ? 0.7 : 0.9),
      drive = 0.8 + smooth(0.5, 3, e) * 0.34;
    spine.ids.forEach((id, i) => {
      bones[id].rotation[whale ? "x" : "y"] =
        Math.sin(t - i * (whale ? 0.55 : 0.64)) * amplitudes[i] * drive;
    });
    for (const fin of fins) {
      const b = bones[fin.ids[0]],
        s = fin.side;
      b.rotation.z =
        s * (0.02 + Math.sin(t * 0.55 + s * 0.25) * (whale ? 0.12 : 0.1));
      b.rotation.y = -s * (0.02 + smooth(1, 3, e) * 0.07);
      b.rotation.x = Math.sin(t * 0.55) * 0.035;
    }
  });
}
