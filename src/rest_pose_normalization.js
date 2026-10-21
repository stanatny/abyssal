import * as THREE from "three";

/**
 * 为确定性工厂复用静止姿态的归一化结果；缓存随该工厂模块重建而失效。
 * 仅在动画和调用方缩放之前调用，同一 key 必须具有相同几何及绑定姿态。
 * 缓存只保存数值和几何标识，不持有实例、骨架、材质或可变的包围盒。
 * @returns {Function} normalize(body, key)，空 key 或非单位世界变换沿用逐实例计算。
 */
export function createRestPoseNormalizer() {
  const cache = new Map(),
    identity = new THREE.Matrix4();
  return (body, key) => {
    body.updateMatrixWorld(true);
    const reusable = key != null && body.matrixWorld.equals(identity);
    const bounded = [];
    body.traverse((node) => {
      if (node.geometry && node.boundingBox !== undefined) bounded.push(node);
    });
    let saved = reusable ? cache.get(key) : null;
    if (
      saved &&
      (saved.boxes.length !== bounded.length ||
        bounded.some(
          (node, i) => node.geometry.uuid !== saved.boxes[i].geometry,
        ))
    )
      saved = null;
    if (!saved) {
      const bounds = new THREE.Box3().setFromObject(body),
        scale = 1 / bounds.getSize(new THREE.Vector3()).z;
      saved = {
        scale,
        position: bounds
          .getCenter(new THREE.Vector3())
          .multiplyScalar(-scale)
          .toArray(),
        boxes: bounded.map((node) => ({
          geometry: node.geometry.uuid,
          min: node.boundingBox.min.toArray(),
          max: node.boundingBox.max.toArray(),
        })),
      };
      if (reusable) cache.set(key, saved);
    } else {
      // Box3 原路径会初始化蒙皮网格自身的包围盒；命中缓存也保留此副作用及实例独立性。
      bounded.forEach((node, i) => {
        node.boundingBox ??= new THREE.Box3();
        node.boundingBox.min.fromArray(saved.boxes[i].min);
        node.boundingBox.max.fromArray(saved.boxes[i].max);
      });
    }
    body.scale.setScalar(saved.scale);
    body.position.fromArray(saved.position);
  };
}
