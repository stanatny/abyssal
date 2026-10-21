import * as THREE from "three";
import { atlantisPredatorAsset } from "./atlantis_predator_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  createLordBones,
  chainWeights,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";
export const ATLANTIS_HF_PREDATORS = new Set([
  "blue_shark",
  "swordfish",
  "helicoprion",
  "ichthyosaur",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const point = new THREE.Vector3();
const anatomy = {
  blue_shark: {
    spineY: 0,
    spineStart: -0.12,
    fan: 0.37,
    pec: { z: -0.2, y: -0.04, root: 0.07, outer: 0.135, z0: -0.26, z1: 0.05 },
  },
  swordfish: {
    spineY: -0.035,
    spineStart: -0.08,
    fan: 0.36,
    pec: { z: -0.13, y: -0.05, root: 0.055, outer: 0.095, z0: -0.2, z1: 0.045 },
  },
  helicoprion: {
    spineY: 0,
    spineStart: -0.1,
    fan: 0.36,
    pec: { z: -0.17, y: -0.05, root: 0.09, outer: 0.14, z0: -0.25, z1: 0.05 },
  },
  ichthyosaur: {
    spineY: 0.012,
    spineStart: -0.07,
    fan: 0.36,
    pec: {
      z: -0.21,
      y: -0.04,
      root: 0.065,
      outer: 0.12,
      z0: -0.28,
      z1: -0.045,
    },
    rear: { z: 0.13, y: -0.04, root: 0.04, outer: 0.07, z0: 0.075, z1: 0.23 },
  },
};
/** HF 网格的连续侧摆与鳍肢微调；保持头向 -Z、目录尺寸和既有生态/战斗。 */
export function buildAtlantisPredatorHF(kind, root, motions) {
  const a = anatomy[kind];
  if (!a) throw Error("Unknown Atlantis HF predator");
  const chains = [
    {
      name: `${kind}_spine`,
      type: "tail",
      points: [a.spineStart, 0.04, 0.16, 0.27, a.fan].map((z) => [
        0,
        a.spineY,
        z,
      ]),
    },
  ];
  for (const [role, f] of [
    ["pectoral", a.pec],
    ["pelvic", a.rear],
  ])
    if (f)
      for (const side of [-1, 1])
        chains.push({
          name: `${kind}_${role}_${side}`,
          role,
          type: "fin",
          side,
          area: f,
          points: [[side * f.root, f.y, f.z]],
        });
  const bones = createLordBones(root, chains),
    spine = chains[0];
  const asset = atlantisPredatorAsset(kind, (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    chainWeights(
      spine,
      point,
      smooth(a.spineStart - 0.06, a.spineStart + 0.08, z),
      ids,
      w,
      o,
    );
    const fan = smooth(a.fan - 0.025, a.fan + 0.035, z);
    for (let j = 0; j < 3; j++) w[o + j] *= 1 - fan;
    ids[o + 3] = spine.ids.at(-1);
    w[o + 3] = fan;
    for (const fin of chains.slice(1)) {
      if (Math.sign(x) !== fin.side) continue;
      const f = fin.area;
      const blend =
        smooth(f.root, f.outer, Math.abs(x)) *
        (1 - smooth(f.y + 0.03, f.y + 0.07, y)) *
        smooth(f.z0, f.z0 + 0.025, z) *
        (1 - smooth(f.z1 - 0.025, f.z1, z));
      if (blend <= 0) continue;
      for (let j = 0; j < 4; j++) w[o + j] *= 1 - blend;
      ids[o + 3] = fin.ids[0];
      w[o + 3] += blend;
    }
  });
  const mesh = bindOrganicBody(
    root,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.25,
  );
  root.userData.hfRig = { kind, chains, bones, mesh };
  root.userData.atlantisAnatomy = kind;
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_atlantis_predators_20261021";
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
      drive = 0.68 + smooth(0.3, 3, e) * 0.42;
    spine.ids.forEach((id, i) => {
      bones[id].rotation.y =
        Math.sin(phase - i * 0.58) * [0.018, 0.05, 0.1, 0.13, 0.13][i] * drive;
    });
    for (const fin of chains.slice(1)) {
      const b = bones[fin.ids[0]],
        s = fin.side;
      const rear = fin.role === "pelvic",
        amplitude = rear ? 0.045 : kind === "ichthyosaur" ? 0.065 : 0.055;
      b.rotation.z =
        s *
        (Math.sin(phase * 0.52 + (rear ? 0.5 : 0)) * amplitude -
          smooth(1, 3, e) * 0.035);
      b.rotation.y = -s * smooth(0.8, 3, e) * 0.045;
      b.rotation.x = Math.sin(phase * 0.52 + (rear ? 0.5 : 0)) * 0.025;
    }
  });
}
