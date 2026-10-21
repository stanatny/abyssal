import * as THREE from "three";
import { acquireContactMineAsset } from "./contact_mine_asset.js";

/**
 * 创建球形接触水雷，length 为含触角的直径，兼容旧 torpedo 模型标识。
 * 实体和色图按引用共享，红色镜片强度由实例独占，动画不会移动碰撞中心。
 * @param {number} length 含触角的世界直径。
 * @returns {THREE.Group} 保留 contactRadius、animate(time) 与幂等 dispose()。
 */
export function createContactMine(length = 1) {
  const asset = acquireContactMineAsset();
  const root = new THREE.Group();
  root.name = "torpedo";
  const body = new THREE.Mesh(asset.geometry, asset.material);
  body.name = "contact_mine_warning";
  body.castShadow = body.receiveShadow = true;
  root.add(body);
  root.scale.setScalar(length);
  root.userData.kind = "torpedo";
  root.userData.length = length;
  root.userData.contactRadius = length * 0.5;
  root.userData.artRevision = "contact-mine-hf-20261020";
  root.userData.mineArt = { body };
  root.userData.prepareMaterials = asset.prepare;
  let disposed = false;
  root.userData.animate = (time) => {
    if (disposed || !Number.isFinite(time)) return;
    // 只在真实红色镜片处缓慢明灭，不让金属壳体泛红或改变原有警示节奏。
    asset.material.emissiveIntensity = 0.5 + (Math.sin(time * 3.5) + 1) * 0.4;
  };
  root.userData.disposeLocalMotion = root.userData.dispose = () => {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    asset.release();
  };
  asset.prepare();
  return root;
}
