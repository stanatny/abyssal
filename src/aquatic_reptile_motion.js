import * as THREE from "three";
const euler = new THREE.Euler(0, 0, 0, "YXZ");
const SPINE_Z = [0.1, 0.225, 0.36, 0.5, 0.645, 0.79, 0.93];

/**
 * 将后躯与尾部顶点权重追加到共享数组，统一几何与骨架的分段位置。
 * @param {number} z 原始解剖模型的纵向坐标。
 * @param {number[]} ids 输出的四分量骨骼索引数组。
 * @param {number[]} weights 输出的四分量权重数组。
 * @returns {void} 肩颈保持稳定，波动从骨盆连续向后传播。
 */
export function appendCrocodilianAxialWeights(z, ids, weights) {
  let k = 0;
  while (k < SPINE_Z.length - 2 && z > SPINE_Z[k + 1]) k++;
  const u = THREE.MathUtils.clamp(
    (z - SPINE_Z[k]) / (SPINE_Z[k + 1] - SPINE_Z[k]),
    0,
    1,
  );
  ids.push(k, k + 1, 0, 0);
  weights.push(1 - u, u, 0, 0);
}
/** 水生爬行动物以稳定背侧朝上转向，避免单向量最短弧造成翻滚。 */
export function aquaticHeading(out, direction, previousYaw = 0) {
  const horizontal = Math.hypot(direction.x, direction.z);
  const yaw =
    horizontal > 1e-5 ? Math.atan2(-direction.x, -direction.z) : previousYaw;
  const pitch = THREE.MathUtils.clamp(
    Math.atan2(direction.y, horizontal),
    -0.65,
    0.65,
  );
  return out.setFromEuler(euler.set(pitch, yaw, 0));
}
/**
 * 释放退役鳄类的实例骨架贴图，保留共享模型资源。
 * @param {THREE.Object3D} root 退役生物根节点。
 * @returns {void} 重复调用安全，不销毁缓存几何和材质。
 */
export function disposeCrocodilianMotion(root) {
  root.traverse((part) => {
    if (part.isSkinnedMesh && part.userData.crocodilianRig)
      part.skeleton.dispose();
  });
}
/**
 * 绑定稳定肩颈、后躯尾波和可选四肢关节，共用几何但保留独立姿态。
 * @param {THREE.Mesh} mesh 已合并的鳄类肌肉和骨甲几何。
 * @param {Function[]} motions 已有主循环动作队列。
 * @param {object} options 可选的四肢锚点、肘部和前后足资料。
 * @returns {THREE.SkinnedMesh} 包含尾部及四肢骨架的实例蒙皮。
 */
export function bindCrocodilianTail(mesh, motions, { limbs = [] } = {}) {
  const geometry = mesh.geometry,
    p = geometry.attributes.position;
  if (!geometry.attributes.skinIndex) {
    const ids = [],
      weights = [];
    for (let i = 0; i < p.count; i++)
      appendCrocodilianAxialWeights(p.getZ(i), ids, weights);
    geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(ids, 4));
    geometry.setAttribute(
      "skinWeight",
      new THREE.Float32BufferAttribute(weights, 4),
    );
  }
  const skin = new THREE.SkinnedMesh(geometry, mesh.material);
  skin.name = mesh.name;
  skin.userData.keepSeparate = true;
  mesh.parent.add(skin);
  mesh.parent.remove(mesh);
  const bones = Array.from({ length: 7 }, () => new THREE.Bone());
  bones[0].position.z = SPINE_Z[0];
  skin.add(bones[0]);
  for (let i = 1; i < 7; i++) {
    bones[i].position.z = SPINE_Z[i] - SPINE_Z[i - 1];
    bones[i - 1].add(bones[i]);
  }
  const joints = limbs.map(({ anchor, elbow, side, pair }, i) => {
    const upper = new THREE.Bone(),
      lower = new THREE.Bone();
    upper.name = `crocodilian_limb_${i}_upper`;
    lower.name = `crocodilian_limb_${i}_lower`;
    upper.position.copy(anchor);
    const support = pair ? 1 : 0;
    upper.position.z -= SPINE_Z[support];
    lower.position.copy(elbow);
    bones[support].add(upper);
    upper.add(lower);
    bones.push(upper, lower);
    return { upper, lower, side, pair };
  });
  bones.slice(0, 7).forEach((bone, i) => {
    bone.name = `crocodilian_tail_${i}`;
  });
  skin.bind(new THREE.Skeleton(bones));
  geometry.computeBoundingSphere();
  skin.boundingSphere = geometry.boundingSphere.clone();
  skin.boundingSphere.radius += 0.18;
  let effort, previousTime;
  motions.push((t, e) => {
    const dt =
      previousTime === undefined
        ? 0
        : Math.max(0, Math.min(0.12, (t - previousTime) / (1.7 + e * 1.1)));
    effort = effort === undefined ? e : THREE.MathUtils.damp(effort, e, 7, dt);
    previousTime = t;
    let previous = 0;
    for (let i = 1; i < 7; i++) {
      const along = (SPINE_Z[i] - SPINE_Z[0]) / (SPINE_Z[6] - SPINE_Z[0]);
      const tangent =
        Math.sin(t * 0.85 - along * 5.2) *
        along ** 1.35 *
        (0.18 + Math.min(3, effort) * 0.14);
      bones[i].rotation.y = tangent - previous;
      previous = tangent;
    }
    const fold = THREE.MathUtils.smoothstep(effort, 0.3, 1.6);
    for (const { upper, lower, side, pair } of joints) {
      // 快游肘部向后收，腕部反向折回，让脚掌沿体侧拖曳而非扫进腹部。
      const paddle =
        Math.sin(t * 0.55 + pair * Math.PI + (side > 0 ? 0 : Math.PI)) *
        (1 - fold);
      upper.rotation.y =
        -side * (0.1 + fold * 0.65 + paddle * (pair ? 0.16 : 0.1));
      lower.rotation.y = side * (fold * 0.55 - paddle * (pair ? 0.18 : 0.07));
      upper.rotation.z = side * (0.1 + fold * 0.19 + paddle * 0.035);
      lower.rotation.x = -fold * 0.1 + (1 - fold) * paddle * 0.07;
    }
  });
  return skin;
}
