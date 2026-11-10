import * as THREE from "three";
import packed from "./assets/models/squid_mesh.json" with { type: "json" };
import { addFeedingMouth } from "./player_motion.js";
import {
  decodeOrganicMesh,
  organicSurface,
  organicMaterial,
  bindOrganicBody,
} from "./hf_organic_asset.js";

const surface = organicSurface(
  "squid_hf_skin",
  new URL("./assets/models/squid_color.webp", import.meta.url),
  0.7,
  "squid",
);
export const prepareSquidMaterials = surface.prepare;
let geometry;
const beakGeometry = new THREE.SphereGeometry(1, 12, 8);
const beakMaterial = new THREE.MeshStandardMaterial({
  color: 0x201219,
  roughness: 0.48,
});
const armMaterial = organicMaterial(0.7);
armMaterial.name = "squid_living_arm_tissue";
const bodyMaterials = [surface.material, armMaterial];
function sharedGeometry() {
  if (!geometry)
    geometry = decodeOrganicMesh(packed, null, (x, y, z, color) =>
      color.set(y < -0.02 ? 0xd0b49c : 0x9f533b),
    );
  return geometry;
}

/** 保留HF外套膜、眼部与鳍；重拓扑的八腕与两条长触腕沿各自的连续独立骨链变形。 */
export function buildSquid(root, motions) {
  root.userData.prepareMaterials = surface.prepare;
  surface.prepare({ priority: 10 });
  const inner = new THREE.Group();
  inner.name = "squid_swimming_frame";
  root.add(inner);
  const bones = packed.bones.map(({ name, position, parent }) => {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.fromArray(position);
    if (parent >= 0)
      bone.position.sub(new THREE.Vector3(...packed.bones[parent].position));
    return bone;
  });
  bones.forEach((bone, i) =>
    (packed.bones[i].parent < 0 ? inner : bones[packed.bones[i].parent]).add(
      bone,
    ),
  );
  bindOrganicBody(
    inner,
    "squid_hf_body",
    sharedGeometry(),
    bodyMaterials,
    bones,
    0.2,
  );
  const beak = new THREE.Mesh(beakGeometry, beakMaterial);
  beak.name = "squid_beak";
  beak.position.set(0, -0.004, 0.094);
  beak.scale.set(0.009, 0.009, 0.011);
  inner.add(beak);
  addFeedingMouth(root, inner, [0, -0.004, 0.09]);
  root.userData.normalizedLength = 1;
  root.userData.squidAnatomy = {
    arms: 8,
    tentacles: 2,
    source: "Microsoft TRELLIS.2-4B, fitted three-dimensional crown",
  };
  const captureTarget = new THREE.Vector3();
  let captureStrength = 0;
  let captureBlend = 0;
  let captureSide = 1;
  root.userData.setCaptureTarget = (point, strength = 1) => {
    if (!point) {
      captureStrength = 0;
      return;
    }
    inner.worldToLocal(captureTarget.copy(point));
    if (captureBlend < 0.01) captureSide = captureTarget.x < 0 ? -1 : 1;
    captureStrength = strength;
  };
  const resetMotion = root.userData.resetMotion;
  root.userData.resetMotion = () => {
    captureStrength = captureBlend = 0;
    resetMotion?.();
  };
  const restPositions = bones.map((bone) => bone.position.clone());
  const restTangents = packed.bones.map((bone, index) =>
    new THREE.Vector3(
      ...packed.bones[Math.min(index + 1, bones.length - 1)].position,
    )
      .sub(new THREE.Vector3(...bone.position))
      .normalize(),
  );
  for (const chain of packed.chains)
    restTangents[chain.first + chain.count - 1].copy(
      restTangents[chain.first + chain.count - 2],
    );
  const grip = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const previous = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const delta = new THREE.Vector3();
  const desiredLocal = new THREE.Vector3();
  const inverseParent = new THREE.Quaternion();
  const absoluteRotation = new THREE.Quaternion();
  const desiredRotation = new THREE.Quaternion();
  motions.push((phase, effort, state) => {
    captureBlend +=
      (captureStrength - captureBlend) * (1 - Math.exp(-state.dt * 18));
    const folded = Math.max(state.boost, state.jet);
    const sprintWave = state.boost * (1 - state.jet);
    // 冲刺保留更清晰的鳍波，强喷射时仍收拢；两者共用躯干收缩节奏。
    const finFold = Math.max(state.boost * 0.55, state.jet);
    const contraction =
      (0.018 +
        state.power * 0.018 +
        Math.max(state.boost * 0.02, state.jet * 0.045)) *
      (0.5 + Math.sin(phase * 1.4) * 0.5);
    bones[1].scale.set(1 - contraction, 1 - contraction, 1);
    for (const [side, first] of [
      [-1, 2],
      [1, 5],
    ])
      for (let j = 0; j < 3; j++) {
        const bone = bones[first + j];
        bone.rotation.z =
          side *
          (Math.sin(phase * 1.15 - j * 0.8) * (0.16 - finFold * 0.11) +
            finFold * 0.28);
        bone.rotation.x =
          Math.sin(phase * 1.15 - j * 0.8) * (0.055 - finFold * 0.035);
      }
    for (const chain of packed.chains)
      for (let j = 0; j < chain.count; j++) {
        const distal = j / (chain.count - 1),
          c = Math.cos(chain.angle),
          s = Math.sin(chain.angle),
          bone = bones[chain.first + j];
        bone.position.copy(restPositions[chain.first + j]);
        bone.rotation.z = 0;
        const wave =
          Math.sin(phase * 0.72 - j * 0.8 + chain.angle) *
          // 冲刺由腕根向末端逐渐放大游曳；喷墨仍保持原来的流线收束。
          ((0.016 + distal * 0.07) * (1 - state.jet * 0.5) +
            sprintWave *
              distal ** 1.3 *
              (chain.type === "tentacle" ? 0.04 : 0.03));
        const curl = state.feed * distal * 0.17;
        bone.rotation.x =
          -s * wave +
          s * (folded * 0.038 + curl) -
          state.pitchInput * distal * 0.025;
        bone.rotation.y =
          c * wave - c * (folded * 0.038 + curl) + state.turn * distal * 0.035;
      }
    // 只让同侧长触腕沿体外弧线抱住前端猎物；短腕保持既有收拢，根节点不翻转。
    if (captureBlend > 0.001) {
      const chain = packed.chains.find(
        (item) =>
          item.type === "tentacle" && Math.sign(item.root[0]) === captureSide,
      );
      const origin = restPositions[chain.first];
      grip.copy(captureTarget);
      const sideReach = Math.max(0.13, Math.abs(grip.x));
      p1.set(captureSide * sideReach, -0.045, origin.z);
      p2.set(captureSide * sideReach, grip.y, grip.z + 0.06);
      inverseParent.identity();
      previous.set(0, 0, 0);
      for (let j = 0; j < chain.count; j++) {
        const t = j / (chain.count - 1),
          u = 1 - t,
          index = chain.first + j,
          bone = bones[index];
        desired
          .copy(origin)
          .multiplyScalar(u ** 3)
          .addScaledVector(p1, 3 * u ** 2 * t)
          .addScaledVector(p2, 3 * u * t ** 2)
          .addScaledVector(grip, t ** 3);
        tangent
          .copy(p1)
          .sub(origin)
          .multiplyScalar(3 * u ** 2)
          .addScaledVector(delta.copy(p2).sub(p1), 6 * u * t)
          .addScaledVector(delta.copy(grip).sub(p2), 3 * t ** 2)
          .normalize();
        absoluteRotation.setFromUnitVectors(restTangents[index], tangent);
        desiredRotation.copy(inverseParent).multiply(absoluteRotation);
        bone.position.lerp(
          desiredLocal
            .copy(desired)
            .sub(previous)
            .applyQuaternion(inverseParent),
          captureBlend,
        );
        bone.quaternion.slerp(desiredRotation, captureBlend);
        // 下一关节的位置要使用实际混合后的父旋转，避免根部开裂。
        absoluteRotation.copy(inverseParent).invert().multiply(bone.quaternion);
        inverseParent.copy(absoluteRotation).invert();
        previous.copy(desired);
      }
    }
    inner.rotation.z = state.turn * 0.12;
    Object.assign(root.userData.pose, {
      mantleContraction: contraction,
      finFold: folded,
      bank: inner.rotation.z,
      armPhase: phase,
      feed: state.feed,
      capture: captureBlend,
    });
  });
}
