import * as THREE from "three";
import { hawaiiBatch11Asset } from "./hawaii_batch11_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  chainWeights,
  createLordBones,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b),
  p = new THREE.Vector3();
/** 连续胸翼/分节羽翼使用各自实测的支点；不改变珍兽追逃或海鸟飞行轨迹。 */
export function buildHawaiiBatch11HF(kind, root, motions) {
  const manta = kind === "golden_manta",
    tropic = kind === "tropicbird",
    anatomy = new THREE.Group();
  anatomy.name = `${kind}_anatomy`;
  root.add(anatomy);
  const chains = [];
  for (const side of [-1, 1])
    chains.push({
      name: `wing_${side}`,
      type: "wing",
      side,
      points: (manta
        ? [
            [0.09, 0, -0.31],
            [0.23, -0.025, -0.23],
            [0.4, -0.04, -0.18],
          ]
        : tropic
          ? [
              [0.045, 0.015, -0.31],
              [0.22, 0.005, -0.29],
              [0.42, 0, -0.24],
            ]
          : [
              [0.1, 0.015, -0.02],
              [0.42, 0.015, 0.04],
              [0.76, 0.06, 0.11],
            ]
      ).map(([x, y, z]) => [side * x, y, z]),
    });
  chains.push({
    name: "tail",
    type: "tail",
    points: manta
      ? [
          [0, -0.015, 0.025],
          [0, -0.05, 0.21],
          [0, -0.08, 0.4],
        ]
      : tropic
        ? [
            [0, -0.025, 0],
            [0, -0.035, 0.2],
            [0, -0.04, 0.4],
          ]
        : [
            [0, 0, 0.27],
            [0, 0, 0.36],
            [0, 0, 0.43],
          ],
  });
  const bones = createLordBones(anatomy, chains);
  bones[0].name = `${kind}_root`;
  const asset = hawaiiBatch11Asset(kind, (x, y, z, ids, w, o) => {
    ids[o] = 0;
    w[o] = 1;
    p.set(x, y, z);
    const blend =
      smooth(
        manta ? 0.09 : tropic ? 0.045 : 0.1,
        manta ? 0.16 : tropic ? 0.095 : 0.18,
        Math.abs(x),
      ) * (manta ? smooth(-0.43, -0.34, z) : 1);
    if (blend > 0) chainWeights(chains[x < 0 ? 0 : 1], p, blend, ids, w, o);
    else if (z > (manta ? -0.005 : tropic ? -0.03 : 0.26))
      chainWeights(
        chains[2],
        p,
        smooth(
          manta ? -0.005 : tropic ? -0.03 : 0.26,
          manta ? 0.05 : tropic ? 0.06 : 0.35,
          z,
        ),
        ids,
        w,
        o,
      );
  });
  const mesh = bindOrganicBody(
    anatomy,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.65,
  );
  root.userData.hfRig = { kind, chains, bones, mesh };
  root.userData.artRevision = "trellis_hawaii_batch11_20261019";
  root.userData.normalizedLength = 1;
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    mesh.skeleton.dispose();
  };
  const effort = lordEffortSmoother();
  motions.push((t, speed) => {
    const e = smooth(0.5, 3, effort(t, speed));
    for (const c of chains.slice(0, 2))
      c.ids.forEach((id, j) => {
        if (manta) {
          bones[id].rotation.z =
            c.side *
            Math.sin(t * 0.85 - j * 0.45) *
            (0.11 + j * 0.035) *
            (1 + e * 0.2);
          bones[id].rotation.y = c.side * Math.cos(t * 0.85 - j * 0.5) * 0.015;
        } else {
          const gate = smooth(
              tropic ? -0.25 : 0.15,
              tropic ? 0.35 : 0.7,
              Math.sin(t * (tropic ? 0.13 : 0.085)),
            ),
            wave = Math.sin(t * (tropic ? 1.8 : 1.2) - j * 0.55),
            amp =
              gate *
              (tropic ? 0.28 : 0.36) *
              (j === 1 ? 0.38 : j === 2 ? 0.23 : 1);
          bones[id].rotation.z = c.side * (0.035 + wave * amp);
          bones[id].rotation.y = c.side * Math.sin(t * 0.5 - j * 0.4) * 0.015;
        }
      });
    chains[2].ids.forEach((id, j) => {
      bones[id].rotation.y =
        Math.sin(t * (manta ? 0.7 : 0.6) - j * 0.4) *
        (manta ? 0.035 : tropic ? 0.025 : 0.045);
      bones[id].rotation.x = Math.sin(t * 0.4 - j * 0.2) * 0.012;
    });
  });
}
