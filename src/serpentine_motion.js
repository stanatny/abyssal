import * as THREE from "three";

/**
 * 为连续长躯干建立实例独立的侧向游曳骨架，头部保持稳定。
 * @param {THREE.Mesh} mesh 已有躯干网格，几何可复用，节点会替换为蒙皮网格。
 * @param {Function[]} motions 现有活动相位动作列表，不创建额外循环。
 * @param {object} options 颈根、尾端、关节数及波速/幅度参数。
 * @returns {THREE.SkinnedMesh} 独立骨架、共享几何的连续动画躯干。
 */
export function bindSerpentineMotion(mesh, motions, options = {}) {
  const {
    headZ = -0.42,
    tailZ = 0.62,
    segments = 15,
    frequency = 0.85,
    waves = 1.25,
    amplitude = 0.65,
  } = options;
  const geometry = mesh.geometry;
  if (!geometry.getAttribute("skinIndex")) {
    const indices = [],
      weights = [],
      p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t =
        THREE.MathUtils.clamp((p.getZ(i) - headZ) / (tailZ - headZ), 0, 1) *
        segments;
      const k = Math.min(segments - 1, Math.floor(t)),
        u = t - k;
      indices.push(k, k + 1, 0, 0);
      weights.push(1 - u, u, 0, 0);
    }
    geometry.setAttribute(
      "skinIndex",
      new THREE.Uint16BufferAttribute(indices, 4),
    );
    geometry.setAttribute(
      "skinWeight",
      new THREE.Float32BufferAttribute(weights, 4),
    );
  }
  const skin = new THREE.SkinnedMesh(geometry, mesh.material);
  skin.name = mesh.name;
  skin.position.copy(mesh.position);
  skin.quaternion.copy(mesh.quaternion);
  skin.scale.copy(mesh.scale);
  skin.userData = { ...mesh.userData, keepSeparate: true, serpentine: true };
  mesh.parent.add(skin);
  mesh.removeFromParent();
  const bones = Array.from({ length: segments + 1 }, () => new THREE.Bone());
  bones[0].position.z = headZ;
  skin.add(bones[0]);
  for (let i = 1; i <= segments; i++) {
    bones[i].position.z = (tailZ - headZ) / segments;
    bones[i - 1].add(bones[i]);
  }
  skin.bind(new THREE.Skeleton(bones));
  geometry.computeBoundingSphere();
  skin.boundingSphere = geometry.boundingSphere.clone();
  skin.boundingSphere.radius += (tailZ - headZ) * 0.22;
  motions.push((phase, effort) => {
    let previous = 0;
    const power = amplitude * (0.8 + Math.min(3, effort) * 0.2);
    for (let i = 1; i <= segments; i++) {
      const p = i / segments;
      const tangent =
        Math.sin(phase * frequency - p * Math.PI * 2 * waves) *
        Math.min(1, p * 4) *
        power;
      bones[i].rotation.y = tangent - previous;
      bones[i].rotation.x = bones[i].rotation.z = 0;
      previous = tangent;
    }
  });
  return skin;
}
