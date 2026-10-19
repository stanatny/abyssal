import * as THREE from "three";
import { hawaiiSharkAsset } from "./hawaii_shark_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  createLordBones,
  chainWeights,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";

const point = new THREE.Vector3();
const smooth = (a, b, v) => THREE.MathUtils.smoothstep(v, a, b);

/** 大白鲨与路氏双髻鲨的实际重建网格；只变更外观，沿用普通猎手全部行为。 */
export function buildHawaiiSharkHF(kind, root, motions) {
  const hammer = kind === "hammerhead";
  const chains = [
    {
      name: `${kind}_spine`,
      type: "tail",
      points: [
        [0, -0.025, -0.12],
        [0, -0.025, 0.02],
        [0, -0.025, 0.14],
        [0, -0.025, 0.23],
        [0, -0.025, hammer ? 0.27 : 0.31],
      ],
    },
    ...[-1, 1].map((side) => ({
      name: `${kind}_pectoral_${side}`,
      type: "pectoral",
      side,
      points: [[side * (hammer ? 0.052 : 0.09), -0.04, hammer ? -0.3 : -0.275]],
    })),
  ];
  const bones = createLordBones(root, chains),
    spine = chains[0];
  const asset = hawaiiSharkAsset(kind, (x, y, z, ids, weights, offset) => {
    point.set(x, y, z);
    chainWeights(spine, point, smooth(-0.15, 0.02, z), ids, weights, offset);
    // 整片尾鳍归末节；上下尾叶不会随其前后位置被分开扭折。
    const fan = smooth(hammer ? 0.23 : 0.27, hammer ? 0.28 : 0.32, z);
    for (let i = 0; i < 3; i++) weights[offset + i] *= 1 - fan;
    ids[offset + 3] = spine.ids.at(-1);
    weights[offset + 3] = fan;
    const fin = chains[x < 0 ? 1 : 2];
    const blend =
      smooth(hammer ? 0.055 : 0.095, hammer ? 0.11 : 0.17, Math.abs(x)) *
      (1 - smooth(-0.025, 0.025, y)) *
      smooth(-0.36, -0.31, z) *
      (1 - smooth(-0.12, -0.07, z));
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
    0.2,
  );
  root.userData.hfRig = { kind, chains, bones, mesh };
  root.userData.hunterAnatomy = kind;
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_hawaii_sharks_20261019";
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
      drive = 0.8 + smooth(0.5, 3, e) * 0.35;
    spine.ids.forEach((id, i) => {
      bones[id].rotation.y =
        Math.sin(phase - i * 0.62) *
        [0.018, 0.065, 0.11, 0.15, 0.16][i] *
        drive;
    });
    for (const fin of chains.slice(1)) {
      const b = bones[fin.ids[0]],
        s = fin.side;
      b.rotation.z = s * (0.025 + Math.sin(phase * 0.55 + s * 0.25) * 0.08);
      b.rotation.y = -s * (0.025 + smooth(1, 3, e) * 0.055);
      b.rotation.x = Math.sin(phase * 0.55) * 0.025;
    }
  });
}
