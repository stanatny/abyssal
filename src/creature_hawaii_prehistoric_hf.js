import * as THREE from "three";
import { hawaiiPrehistoricAsset } from "./hawaii_prehistoric_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  createLordBones,
  chainWeights,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";

const point = new THREE.Vector3();
const smooth = (a, b, value) => THREE.MathUtils.smoothstep(value, a, b);

/** 长颈巨兽以四鳍推进；装甲鱼保持头盾稳定，以柔软后躯和尾鳍推进。 */
export function buildHawaiiPrehistoricHF(kind, root, motions) {
  const plesio = kind === "plesiosaur";
  const spinePoints = plesio
    ? [
        [0, 0.005, 0.08],
        [0, 0.01, 0.18],
        [0, 0.025, 0.28],
        [0, 0.04, 0.4],
      ]
    : [
        [0, 0, 0.02],
        [0, 0, 0.13],
        [0, 0, 0.23],
        [0, 0, 0.33],
      ];
  const chains = [{ name: `${kind}_spine`, type: "tail", points: spinePoints }];
  for (const rear of [false, true])
    for (const side of [-1, 1]) {
      const position = plesio
        ? rear
          ? [side * 0.06, -0.02, 0.23]
          : [side * 0.045, -0.014, 0.025]
        : rear
          ? [side * 0.035, -0.065, 0.16]
          : [side * 0.105, -0.1, -0.19];
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
  const asset = hawaiiPrehistoricAsset(
    kind,
    (x, y, z, ids, weights, offset) => {
      point.set(x, y, z);
      chainWeights(
        spine,
        point,
        smooth(plesio ? 0.04 : 0, plesio ? 0.18 : 0.12, z),
        ids,
        weights,
        offset,
      );
      if (!plesio) {
        const fan = smooth(0.31, 0.35, z);
        for (let i = 0; i < 3; i++) weights[offset + i] *= 1 - fan;
        ids[offset + 3] = spine.ids.at(-1);
        weights[offset + 3] = fan;
      }
      const rear = z > (plesio ? 0.17 : 0.1),
        fin = fins[(rear ? 2 : 0) + (x < 0 ? 0 : 1)];
      const mask = plesio
        ? rear
          ? [0.062, 0.1, -0.005, 0.03, 0.19, 0.22, 0.33, 0.35]
          : [0.05, 0.095, 0.012, 0.04, -0.02, 0.01, 0.095, 0.12]
        : rear
          ? [0.035, 0.065, -0.07, -0.04, 0.11, 0.145, 0.235, 0.27]
          : [0.105, 0.15, -0.09, -0.04, -0.25, -0.2, 0.015, 0.04];
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
    },
  );
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
  root.userData.artRevision = "trellis_hawaii_prehistoric_20261019";
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (!disposed) {
      disposed = true;
      mesh.skeleton.dispose();
    }
  };
  const effort = lordEffortSmoother(),
    amplitudes = plesio
      ? [0.003, 0.005, 0.012, 0.02]
      : [0.025, 0.07, 0.12, 0.15];
  motions.push((phase, speed) => {
    const e = smooth(0.5, 3, effort(phase, speed)),
      t = phase * (plesio ? 0.88 : 0.85);
    spine.ids.forEach((id, i) => {
      bones[id].rotation.y =
        Math.sin(t - i * 0.65) * amplitudes[i] * (0.8 + e * 0.3);
    });
    for (const fin of fins) {
      const b = bones[fin.ids[0]],
        s = fin.side,
        stroke = t - (fin.rear ? 0.65 : 0);
      if (plesio) {
        b.rotation.z = s * (0.035 + Math.sin(stroke) * (0.3 + e * 0.075));
        b.rotation.y = -s * Math.cos(stroke) * 0.09;
        b.rotation.x = Math.cos(stroke) * 0.11;
      } else {
        b.rotation.z = s * (0.045 + Math.sin(stroke * 0.6) * 0.14);
        b.rotation.y = -s * (0.02 + e * 0.045);
        b.rotation.x = Math.cos(stroke * 0.6) * 0.025;
      }
    }
  });
}
