import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * 创建角色独立的连续动作时钟与平滑输入。
 * @param {string} kind 角色种类。
 * @param {number} phase 初始相位。
 * @returns {object} update(time, effort, input) 返回稳定状态对象，feed() 触发收腕，reset() 恢复初始状态。
 */
export function createPlayerMotion(kind, phase = 0) {
  const initialState = {
    phase,
    dt: 0,
    effort: 1,
    speed: 12,
    power: 0.3,
    boost: 0,
    jet: 0,
    turn: 0,
    pitchInput: 0,
    airborne: 0,
    feed: 0,
  };
  const state = { ...initialState };
  let previousTime;
  let feedTarget = 0;
  return {
    state,
    reset() {
      Object.assign(state, initialState);
      previousTime = undefined;
      feedTarget = 0;
      return state;
    },
    feed() {
      feedTarget = 1;
    },
    update(time, effort = 1, input) {
      const elapsed = previousTime === undefined ? 0 : time - previousTime;
      const dt = clamp(finite(input?.dt, elapsed), 0, 0.12);
      previousTime = time;
      state.dt = dt;
      const speed = Math.abs(finite(input?.speed, effort * 12));
      const boost = input
        ? Number(Boolean(input.boosting))
        : THREE.MathUtils.smoothstep(effort, 1.25, 2.3);
      const jet = Number(Boolean(input?.jet));
      const targetPower = THREE.MathUtils.smoothstep(
        speed,
        2,
        kind === "orca" ? 42 : 32,
      );
      const smoothing = 1 - Math.exp(-dt * 8);
      for (const [key, target] of Object.entries({
        effort: clamp(effort, 0.15, 3),
        speed,
        power: targetPower,
        boost,
        jet,
        turn: clamp(finite(input?.turn, 0), -1, 1),
        pitchInput: clamp(finite(input?.pitchInput, 0), -1, 1),
        airborne: Number(Boolean(input?.airborne)),
        feed: feedTarget,
      }))
        state[key] += (target - state[key]) * smoothing;
      feedTarget *= Math.exp(-dt * 5);
      state.phase +=
        dt *
        (kind === "orca"
          ? 3.3 + state.power * 2.7 + state.boost * 1.2
          : 2.8 + state.power * 1.7 + state.jet * 2.2);
      return state;
    },
  };
}

/**
 * 为现有附肢网格与吸盘绑定连续分段骨架；几何缓存跨实例共享。
 * @param {THREE.Group} group 包含静态附肢网格的局部组。
 * @param {string} key 共享几何的唯一键。
 * @param {number[]} stations 各骨骼在局部 Z 轴上的绑定位置。
 * @returns {THREE.Bone[]} 每个实例独立的骨骼。
 */
export function bindPlayerAppendage(group, key, stations) {
  const parts = group.children.filter((part) => part.isMesh);
  if (!APPENDAGE_CACHE.has(key)) {
    const batches = new Map();
    for (const part of parts) {
      if (!batches.has(part.material)) batches.set(part.material, []);
      part.updateMatrix();
      const geometry = part.geometry.index
        ? part.geometry.toNonIndexed()
        : part.geometry.clone();
      geometry.applyMatrix4(part.matrix);
      geometry.deleteAttribute("uv");
      batches.get(part.material).push(geometry);
    }
    const resources = [];
    for (const [material, geometries] of batches) {
      const geometry = mergeGeometries(geometries);
      for (const item of geometries) item.dispose();
      const positions = geometry.attributes.position,
        indices = [],
        weights = [];
      for (let index = 0; index < positions.count; index++) {
        const z = positions.getZ(index);
        let joint = 0;
        while (joint < stations.length - 2 && z > stations[joint + 1]) joint++;
        const weight = clamp(
          (z - stations[joint]) / (stations[joint + 1] - stations[joint]),
          0,
          1,
        );
        indices.push(joint, joint + 1, 0, 0);
        weights.push(1 - weight, weight, 0, 0);
      }
      geometry.setAttribute(
        "skinIndex",
        new THREE.Uint16BufferAttribute(indices, 4),
      );
      geometry.setAttribute(
        "skinWeight",
        new THREE.Float32BufferAttribute(weights, 4),
      );
      geometry.computeBoundingSphere();
      resources.push({ geometry, material });
    }
    APPENDAGE_CACHE.set(key, resources);
  }
  for (const part of parts) group.remove(part);
  const bones = stations.map((z, index) => {
    const bone = new THREE.Bone();
    bone.name = `${key}_joint_${index}`;
    bone.position.z = z - (index ? stations[index - 1] : 0);
    return bone;
  });
  bones.forEach((bone, index) => (index ? bones[index - 1] : group).add(bone));
  group.updateWorldMatrix(true, true);
  const skeleton = new THREE.Skeleton(bones);
  for (const { geometry, material } of APPENDAGE_CACHE.get(key)) {
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.name = key;
    mesh.userData.keepSeparate = true;
    group.add(mesh);
    mesh.bind(skeleton);
    mesh.boundingSphere = geometry.boundingSphere.clone();
    mesh.boundingSphere.radius += 0.25;
  }
  return bones;
}

/**
 * 添加真实嘴部世界坐标查询接口，调用时更新当前父级变换。
 * @param {THREE.Group} root 角色根节点。
 * @param {THREE.Object3D} parent 嘴部所在的动画局部节点。
 * @param {number[]} position 归一化局部嘴部位置。
 * @returns {THREE.Object3D} 嘴部锚点。
 */
export function addFeedingMouth(root, parent, position) {
  const mouth = new THREE.Object3D();
  mouth.name = "feeding_mouth";
  mouth.position.set(...position);
  parent.add(mouth);
  root.userData.getFeedingMouth = (out) => mouth.getWorldPosition(out);
  return mouth;
}

const APPENDAGE_CACHE = new Map();
const clamp = THREE.MathUtils.clamp;
function finite(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}
