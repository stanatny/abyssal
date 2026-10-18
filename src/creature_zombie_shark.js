import * as THREE from "three";
import { addFeedingMouth } from "./player_motion.js";
import { createZombieSharkRig } from "./zombie_shark_asset.js";

/**
 * 原创尸鲨参考经 HF 重建并减面；连续实体肌肉、断鳍、颌面共用独立蒙皮。
 * @param {THREE.Group} root 单位全长根节点，头朝-Z，调用方负责成长缩放。
 * @param {Function[]} motions 接收独立动作时钟，不移动游戏根节点。
 * @returns {void} 安装共享网格、实例骨架及真实嘴部、分裂锚点。
 */
export function buildZombieShark(root, motions) {
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
      (state?.power || Math.min(1, effort / 3)) * 0.07 +
      (state?.boost || 0) * 0.025;
    bones[1].rotation.y = Math.sin(phase - 0.8) * power * 0.65;
    bones[2].rotation.y = Math.sin(phase - 1.45) * power * 1.3;
    bones[3].rotation.y = Math.sin(phase - 1.9) * power * 0.55;
    bones[0].rotation.z = (state?.turn || 0) * -0.11;
    jaw.rotation.x =
      0.025 - (state?.feed || 0) * 0.2 - Math.sin(phase * 0.55) * 0.014;
    // 尾部仍是推进主动作；胸鳍以较慢周期调整升力，转弯时两侧差动。
    // 输入已由实例动作时钟平滑，冲刺收鳍/松开及升降不能直接跳姿态。
    const finPhase = phase * 0.55,
      boost = state?.boost || 0,
      turn = state?.turn || 0,
      pitch = state?.pitchInput || 0,
      lift = 0.07 + Math.sin(finPhase) * (0.18 - boost * 0.05) + pitch * 0.1,
      sweep = 0.03 + boost * 0.24 + Math.sin(finPhase - 0.65) * 0.055;
    for (const [side, fin] of fins) {
      fin.rotation.z = side * lift + turn * 0.14;
      // 头朝-Z；左右反号的Y旋转将鳍尖向+Z后掠，不能向吻部折叠。
      fin.rotation.y = -side * sweep - turn * 0.06;
      fin.rotation.x = Math.cos(finPhase) * 0.035 - pitch * 0.08;
    }
    Object.assign(root.userData.pose || {}, {
      tailBeat: bones[2].rotation.y,
      jawOpen: 0.2 - jaw.rotation.x,
      power,
    });
  });
}
