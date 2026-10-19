import * as THREE from "three";
import { addFeedingMouth } from "./player_motion.js";
import {
  createZombieSharkRig,
  prepareZombieSharkMaterials,
} from "./zombie_shark_asset.js";
import { poseSharkPectorals } from "./shark_swim_motion.js";

/**
 * 原创尸鲨参考经 HF 重建并减面；连续实体肌肉、断鳍、颌面共用独立蒙皮。
 * @param {THREE.Group} root 单位全长根节点，头朝-Z，调用方负责成长缩放。
 * @param {Function[]} motions 接收独立动作时钟，不移动游戏根节点。
 * @returns {void} 安装共享网格、实例骨架及真实嘴部、分裂锚点。
 */
export function buildZombieShark(root, motions) {
  root.userData.prepareMaterials = prepareZombieSharkMaterials;
  prepareZombieSharkMaterials({ priority: 10 });
  const { bones } = createZombieSharkRig(root);
  const jaw = bones[4];
  const splitAnchors = [-1, 1].map((side) => {
    const anchor = new THREE.Object3D();
    anchor.name = `zombie_fission_flank_${side}`;
    anchor.position.set(side * 0.094, 0.005, 0.005);
    bones[0].add(anchor);
    return anchor;
  });
  const left = new THREE.Vector3(),
    right = new THREE.Vector3();
  root.userData.getFissionSource = (out, toward) => {
    splitAnchors[0].getWorldPosition(left);
    splitAnchors[1].getWorldPosition(right);
    return out.copy(
      left.distanceToSquared(toward) < right.distanceToSquared(toward)
        ? left
        : right,
    );
  };
  addFeedingMouth(root, jaw, [0, -0.01, -0.165]);
  root.userData.normalizedLength = 1;
  root.userData.zombieAnatomy = {
    source: "Microsoft TRELLIS.2-4B",
    recessedFlankWounds: 2,
    solidMuscleLining: true,
    tornPectorals: 2,
    damagedRegions: ["skull", "gills", "flanks", "spine", "tail"],
  };
  const fins = [
    [-1, bones[5]],
    [1, bones[6]],
  ];
  motions.push((phase, effort, state) => {
    const power =
      0.065 +
      (state?.power ?? Math.min(1, effort / 3)) * 0.07 +
      (state?.boost || 0) * 0.028;
    bones[1].rotation.y = Math.sin(phase - 0.8) * power * 0.65;
    bones[2].rotation.y = Math.sin(phase - 1.45) * power * 1.3;
    bones[3].rotation.y = Math.sin(phase - 1.9) * power * 0.55;
    bones[0].rotation.z = (state?.turn || 0) * -0.11;
    jaw.rotation.x =
      0.025 - (state?.feed || 0) * 0.2 - Math.sin(phase * 0.55) * 0.014;
    poseSharkPectorals(fins, phase, state);
    Object.assign(root.userData.pose || {}, {
      tailBeat: bones[2].rotation.y,
      jawOpen: 0.2 - jaw.rotation.x,
      power,
    });
  });
}
