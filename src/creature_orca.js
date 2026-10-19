import * as THREE from "three";
import packed from "./assets/models/orca_mesh.json" with { type: "json" };
import { addFeedingMouth } from "./player_motion.js";
import {
  decodeOrganicMesh,
  organicSurface,
  bindOrganicBody,
} from "./hf_organic_asset.js";

const surface = organicSurface(
  "orca_hf_skin",
  new URL("./assets/models/orca_color.webp", import.meta.url),
  0.62,
  "orca",
);
export const prepareOrcaMaterials = surface.prepare;
const stations = [
  [0, 0, 0],
  [0, -0.025, 0.1],
  [0, -0.041, 0.24],
  [0, -0.06, 0.355],
  [0, -0.065, 0.375],
];
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
let geometry;
function sharedGeometry() {
  if (geometry) return geometry;
  geometry = decodeOrganicMesh(
    packed,
    (x, y, z, ids, weights, k) => {
      let joint = 0;
      while (joint < stations.length - 2 && z > stations[joint + 1][2]) joint++;
      const wave = smooth(stations[joint][2], stations[joint + 1][2], z);
      // 转轴落在真实腹侧鳍根，最外侧全鳍随单骨移动，根部平滑过渡。
      const fin =
        smooth(0.087, 0.133, Math.abs(x)) *
        (1 - smooth(-0.082, -0.058, y)) *
        smooth(-0.315, -0.285, z) *
        (1 - smooth(-0.165, -0.135, z));
      ids[k] = joint;
      ids[k + 1] = joint + 1;
      ids[k + 2] = x < 0 ? 5 : 6;
      weights[k] = (1 - wave) * (1 - fin);
      weights[k + 1] = wave * (1 - fin);
      weights[k + 2] = fin;
    },
    (x, y, z, color) => {
      const belly =
        y < -0.06 + (1 - smooth(-0.45, -0.32, z)) * 0.038 && Math.abs(x) < 0.09;
      const eyePatch =
        Math.abs(z + 0.34) < 0.045 &&
        Math.abs(y + 0.008) < 0.017 &&
        Math.abs(x) > 0.06;
      color.set(belly || eyePatch ? 0xe3e6df : 0x121c22);
    },
  );
  return geometry;
}

/** 虎鲸以尾柄和整片水平尾鳍上下推进；胸鳍承担可读的姿态微调而非鸟翼扑动。 */
export function buildOrca(root, motions) {
  const inner = new THREE.Group();
  inner.name = "orca_swimming_frame";
  root.add(inner);
  const bones = stations.map((point, i) => {
    const bone = new THREE.Bone();
    bone.name = i === 4 ? "orca_flukes" : `orca_axial_${i}`;
    bone.position.fromArray(point);
    if (i) bone.position.sub(new THREE.Vector3(...stations[i - 1]));
    return bone;
  });
  bones.forEach((bone, i) => (i ? bones[i - 1] : inner).add(bone));
  for (const side of [-1, 1]) {
    const bone = new THREE.Bone();
    bone.name = `orca_flipper_${side}`;
    bone.position.set(side * 0.092, -0.087, -0.23);
    bones[0].add(bone);
    bones.push(bone);
  }
  bindOrganicBody(
    inner,
    "orca_hf_body",
    sharedGeometry(),
    surface.material,
    bones,
    0.16,
  );
  addFeedingMouth(root, inner, [0, -0.052, -0.43]);
  root.userData.normalizedLength = 1;
  motions.push((phase, effort, state) => {
    const folded = Math.max(state.boost, state.airborne);
    const amplitude =
      (0.09 + state.power * 0.09 + state.boost * 0.045) *
      (1 - state.airborne * 0.85);
    bones[1].rotation.x = Math.sin(phase) * amplitude * 0.25;
    bones[2].rotation.x = Math.sin(phase - 0.58) * amplitude * 0.65;
    bones[3].rotation.x = Math.sin(phase - 1.06) * amplitude;
    bones[4].rotation.x = Math.sin(phase - 1.6) * amplitude * 0.7;
    bones[2].rotation.y = -state.turn * 0.05;
    bones[3].rotation.y = -state.turn * 0.06;
    for (const [side, fin] of [
      [-1, bones[5]],
      [1, bones[6]],
    ]) {
      fin.rotation.z =
        side *
          Math.sin(phase * 0.5 - 0.7) *
          0.095 *
          (1 - state.boost * 0.38) *
          (1 - state.airborne * 0.7) +
        state.turn * 0.18;
      fin.rotation.x =
        Math.sin(phase * 0.5 - 1.1) * 0.045 + state.pitchInput * 0.2;
      fin.rotation.y = -side * (folded * 0.32 + state.turn * side * 0.07);
    }
    inner.rotation.z = -state.turn * 0.14;
    Object.assign(root.userData.pose, {
      tailBeat: bones[3].rotation.x,
      flukePitch: bones[4].rotation.x,
      bank: inner.rotation.z,
      folded,
    });
  });
}
