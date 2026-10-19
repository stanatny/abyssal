import * as THREE from "three";
import { hawaiiReptileAsset } from "./hawaii_reptile_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  createLordBones,
  chainWeights,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";

const point = new THREE.Vector3();
const smooth = (a, b, value) => THREE.MathUtils.smoothstep(value, a, b);

/** 沧龙以尾部推进、四肢调姿；上龙四鳍错相划水，短尾只作稳定。 */
export function buildHawaiiReptileHF(kind, root, motions) {
  const plio = kind === "pliosaur";
  const spinePoints = plio
    ? [
        [0, 0.02, -0.08],
        [0, 0.02, 0.08],
        [0, 0.035, 0.2],
        [0, 0.04, 0.34],
      ]
    : [
        [0, 0, -0.1],
        [0, 0, 0.02],
        [0, 0.01, 0.14],
        [0, 0.025, 0.25],
        [0, 0.04, 0.35],
        [0, 0.045, 0.4],
      ];
  const chains = [{ name: `${kind}_spine`, type: "tail", points: spinePoints }];
  for (const rear of [false, true])
    for (const side of [-1, 1]) {
      const position = plio
        ? rear
          ? [side * 0.07, -0.025, 0.14]
          : [side * 0.102, -0.035, -0.185]
        : rear
          ? [side * 0.05, -0.02, 0.04]
          : [side * 0.075, -0.025, -0.28];
      chains.push({
        name: `${kind}_${rear ? "hind" : "fore"}_${side}`,
        type: "fin",
        side,
        rear,
        points: [position],
      });
    }
  const bones = createLordBones(root, chains),
    spine = chains[0],
    fins = chains.slice(1);
  const asset = hawaiiReptileAsset(kind, (x, y, z, ids, weights, offset) => {
    point.set(x, y, z);
    chainWeights(spine, point, smooth(-0.16, 0.01, z), ids, weights, offset);
    if (!plio) {
      const fan = smooth(0.35, 0.39, z);
      for (let i = 0; i < 3; i++) weights[offset + i] *= 1 - fan;
      ids[offset + 3] = spine.ids.at(-1);
      weights[offset + 3] = fan;
    }
    const rear = z > (plio ? 0.08 : -0.02);
    const fin = fins[(rear ? 2 : 0) + (x < 0 ? 0 : 1)];
    const mask = plio
      ? rear
        ? [0.07, 0.105, 0.005, 0.04, 0.105, 0.15, 0.33, 0.36]
        : [0.115, 0.17, 0.02, 0.06, -0.28, -0.24, -0.07, -0.02]
      : rear
        ? [0.045, 0.07, -0.008, 0.015, 0, 0.045, 0.14, 0.17]
        : [0.075, 0.105, -0.015, 0.015, -0.33, -0.28, -0.18, -0.14];
    const blend =
      smooth(mask[0], mask[1], Math.abs(x)) *
      (1 - smooth(mask[2], mask[3], y)) *
      smooth(mask[4], mask[5], z) *
      (1 - smooth(mask[6], mask[7], z));
    if (blend > 0) {
      for (let i = 0; i < 4; i++) weights[offset + i] *= 1 - blend;
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
    0.3,
  );
  root.userData.hfRig = { kind, chains, bones, mesh };
  root.userData.ancientAnatomy = kind;
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_hawaii_reptiles_20261019";
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
  const amplitudes = plio
    ? [0.003, 0.006, 0.012, 0.022]
    : [0.012, 0.04, 0.075, 0.1, 0.13, 0.12];
  motions.push((phase, speed) => {
    const e = smooth(0.5, 3, effort(phase, speed)),
      t = phase * (plio ? 0.92 : 0.9);
    spine.ids.forEach((id, i) => {
      bones[id].rotation.y =
        Math.sin(t - i * 0.62) * amplitudes[i] * (0.8 + e * 0.3);
    });
    for (const fin of fins) {
      const b = bones[fin.ids[0]],
        s = fin.side,
        stroke = t - (fin.rear ? 0.65 : 0);
      if (plio) {
        b.rotation.z = s * (0.1 + Math.sin(stroke) * (0.32 + e * 0.06));
        b.rotation.y = -s * (0.03 + Math.cos(stroke) * 0.12);
        b.rotation.x = Math.cos(stroke) * 0.16;
      } else {
        b.rotation.z =
          s * (0.05 + Math.sin(stroke * 0.55) * (fin.rear ? 0.18 : 0.15));
        b.rotation.y = -s * (0.02 + e * 0.055);
        b.rotation.x = Math.sin(stroke * 0.55) * (fin.rear ? 0.015 : 0.04);
      }
    }
  });
}
