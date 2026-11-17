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
      // 沿现有闭合嘴缝平滑带动下颌，不切开网格或在嘴内制造未衬里的空洞。
      const jawLine = THREE.MathUtils.lerp(
        -0.018,
        -0.06,
        smooth(-0.485, -0.32, z),
      );
      const jaw =
        (1 - smooth(-0.365, -0.305, z)) *
        (1 - smooth(jawLine - 0.014, jawLine + 0.014, y));
      const head =
        smooth(-0.465, -0.405, z) *
        (1 - smooth(-0.235, -0.065, z)) *
        smooth(-0.05, -0.02, y) *
        (1 - smooth(0.045, 0.085, y)) *
        (1 - fin);
      const appendage = Math.max(fin, jaw);
      ids[k] = joint;
      ids[k + 1] = joint + 1;
      ids[k + 2] = jaw > fin ? 7 : x < 0 ? 5 : 6;
      ids[k + 3] = 8;
      weights[k] = (1 - wave) * (1 - appendage) * (1 - head);
      weights[k + 1] = wave * (1 - appendage) * (1 - head);
      weights[k + 2] = appendage;
      weights[k + 3] = (1 - appendage) * head;
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
  root.userData.prepareMaterials = surface.prepare;
  surface.prepare({ priority: 10 });
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
  const jaw = new THREE.Bone(),
    throat = new THREE.Bone();
  jaw.name = "orca_lower_jaw";
  throat.name = "orca_head_throat";
  throat.position.set(0, -0.02, -0.36);
  jaw.position.set(0, -0.06, -0.32);
  // 吻端下颌独立开合，侧颈展开不会横向拉宽鼻端或改变嘴部锚点。
  bones[0].add(throat, jaw);
  bones.push(jaw, throat);
  bindOrganicBody(
    inner,
    "orca_hf_body",
    sharedGeometry(),
    surface.material,
    bones,
    0.16,
  );
  addFeedingMouth(root, jaw, [0, 0.008, -0.11]);
  root.userData.normalizedLength = 1;
  motions.push((phase, effort, state) => {
    // 共享时钟控制进食停留和回落；本物种仅映射有界的开颌、侧颈展开。
    const feeding = smooth(
      0,
      1,
      THREE.MathUtils.clamp(state.feed * 2.05, 0, 1),
    );
    jaw.rotation.x = -feeding * 0.16;
    throat.scale.set(1 + feeding * 0.18, 1 + feeding * 0.02, 1);
    throat.position.y = -0.02 - feeding * 0.001;
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
      feeding,
      jawOpen: -jaw.rotation.x,
      throatExpansion: feeding * 0.02,
      headSideExpansion: feeding * 0.18,
    });
  });
}
