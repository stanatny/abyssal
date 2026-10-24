import * as THREE from "three";
import { acquireBermudaVentAsset } from "./bermuda_vent_asset.js";

/** 新矿物烟囱贴坡安放；接触体跟随同一刚性变换，周边航道和地标不变。 */
export function createBermudaVents(parent, { heightAt }) {
  const asset = acquireBermudaVentAsset(),
    root = new THREE.Group();
  root.name = "bermuda_hf_vents";
  parent.add(root);
  const mesh = new THREE.InstancedMesh(asset.geometry, asset.material, 12),
    box = asset.geometry.boundingBox,
    center = box.getCenter(new THREE.Vector3()),
    extent = box.getSize(new THREE.Vector3()),
    dummy = new THREE.Object3D(),
    v = new THREE.Vector3(),
    local = new THREE.Vector3(),
    placements = [],
    colliders = [];
  mesh.name = "bermuda_mineral_chimneys";
  const baseTransform = new THREE.Matrix4().makeTranslation(
    -center.x,
    -box.min.y,
    -center.z,
  );
  for (let i = 0; i < 12; i++) {
    const x = (i % 2 ? 1 : -1) * (195 + (i % 3) * 15),
      z = -740 - Math.floor(i / 2) * 55,
      h = 9 + (i % 4) * 5,
      dx = (heightAt(x + 2, z) - heightAt(x - 2, z)) / 4,
      dz = (heightAt(x, z + 2) - heightAt(x, z - 2)) / 4;
    dummy.position.set(x, 0, z);
    dummy.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(-dx, 1, -dz).normalize(),
    );
    dummy.quaternion.multiply(
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        i * 0.71,
      ),
    );
    // 岩柱统一缩放保持生成比例；最宽处不越过旧喷口约八米的占地宽度。
    dummy.scale.setScalar(h / extent.y);
    dummy.updateMatrix();
    let matrix = dummy.matrix.clone().multiply(baseTransform),
      low = Infinity;
    for (let j = 0; j < asset.geometry.attributes.position.count; j++) {
      v.fromBufferAttribute(asset.geometry.attributes.position, j).applyMatrix4(
        matrix,
      );
      low = Math.min(low, v.y - heightAt(v.x, v.z));
    }
    dummy.position.y = -low - 0.22;
    dummy.updateMatrix();
    matrix = dummy.matrix.clone().multiply(baseTransform);
    mesh.setMatrixAt(i, matrix);
    // 四个高度段由实际表面界定，避免单个椭球在烟囱底部漏出实体。
    for (let band = 0; band < 4; band++) {
      const bounds = new THREE.Box3(),
        lowY = box.min.y + (extent.y * band) / 4,
        highY = box.min.y + (extent.y * (band + 1)) / 4;
      for (let j = 0; j < asset.geometry.attributes.position.count; j++) {
        local.fromBufferAttribute(asset.geometry.attributes.position, j);
        if (local.y >= lowY - 0.0001 && local.y <= highY + 0.0001)
          bounds.expandByPoint(local);
      }
      bounds.min.y = lowY;
      bounds.max.y = highY;
      const midpoint = bounds
          .getCenter(new THREE.Vector3())
          .applyMatrix4(matrix),
        halfSize = bounds
          .getSize(new THREE.Vector3())
          .multiplyScalar(h / extent.y / 2)
          .addScalar(0.12);
      colliders.push({
        id: `vent_${i}_${band}`,
        type: "box",
        x: midpoint.x,
        y: midpoint.y,
        z: midpoint.z,
        halfSize,
        rotation: dummy.quaternion.clone(),
      });
    }
    placements.push({
      i,
      x,
      z,
      h,
      matrix: matrix.toArray(),
      position: dummy.position.toArray(),
      top: new THREE.Vector3(0, h, 0)
        .applyQuaternion(dummy.quaternion)
        .add(dummy.position)
        .toArray(),
    });
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  root.add(mesh);
  root.userData.prepareMaterials = asset.prepare;
  void asset.prepare();
  let disposed = false;
  return {
    root,
    mesh,
    asset,
    placements,
    colliders,
    prepare: asset.prepare,
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.clear();
      mesh.dispose();
      asset.release();
      colliders.length = 0;
    },
  };
}
