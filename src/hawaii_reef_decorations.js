import * as THREE from "three";
import { acquireHawaiiReefAsset } from "./hawaii_reef_asset.js";
import { clusterInstances } from "./ocean_visuals.js";

/** 替换浅海装饰形体，保留旧随机序列、群落锚点与后续地形分布。 */
export function createHawaiiReefDecorations(parent, { rand, heightAt }) {
  const root = new THREE.Group();
  root.name = "hawaii_reef_decorations";
  root.userData.artRevision = "hawaii-reef-hf-20261020";
  parent.add(root);
  const placements = {
    reef_branch: [],
    reef_fan: [],
    reef_brain: [],
    reef_sponge: [],
  };
  let branchIndex = 0;
  while (branchIndex < 880) {
    const x = (rand() - 0.5) * 170,
      z = 126 - rand() * 243;
    const size = 0.8 + rand() * 2.3,
      palette = Math.floor(rand() * 5);
    const branches = 6 + Math.floor(rand() * 5);
    let yaw = 0;
    for (let j = 0; j < branches && branchIndex < 880; j++, branchIndex++) {
      const angle = rand() * Math.PI * 2;
      if (j === 0) yaw = angle;
      // 旧枝条的扩展与高度仍消耗相同随机数，不额外移动其他场景元素。
      if (j !== 0) {
        rand();
        rand();
      }
      rand();
    }
    placements.reef_branch.push({
      x,
      z,
      size,
      rotation: [0, yaw, 0],
      scale: [size, size, size],
      palette,
    });
  }
  for (let i = 0; i < 100; i++) {
    const x = (rand() - 0.5) * 175,
      z = 125 - rand() * 200,
      size = 1 + rand() * 1.9;
    const rotation = [0, rand() * Math.PI, (rand() - 0.5) * 0.35],
      palette = Math.floor(rand() * 4);
    placements.reef_fan.push({
      x,
      z,
      size,
      rotation,
      scale: [size, size, size],
      palette,
    });
  }
  for (let i = 0; i < 150; i++) {
    const x = (rand() - 0.5) * 180,
      z = 128 - rand() * 250,
      size = 0.5 + rand() * 1.6;
    const rotation = [rand() * 0.4, rand() * Math.PI, rand() * 0.3];
    const scale = [size, size * (0.55 + rand() * 0.5), size];
    const palette = Math.floor(rand() * 5),
      tone = 0.8 + rand() * 0.4;
    placements[i % 2 ? "reef_sponge" : "reef_brain"].push({
      x,
      z,
      size,
      rotation,
      scale,
      palette,
      tone,
    });
  }

  const assets = [],
    batches = [],
    dummy = new THREE.Object3D(),
    sample = new THREE.Vector3();
  for (const [kind, rows] of Object.entries(placements)) {
    const asset = acquireHawaiiReefAsset(kind);
    assets.push(asset);
    // 正常进图也进入有界贴图队列，不能只依赖检查工具主动准备材质。
    asset.prepare();
    const instances = new THREE.InstancedMesh(
      asset.geometry,
      asset.material,
      rows.length,
    );
    instances.name = `hawaii_${kind}_hf`;
    const position = asset.geometry.attributes.position,
      box = asset.geometry.boundingBox;
    const footBand = box.min.y + (box.max.y - box.min.y) * 0.06;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      dummy.position.set(row.x, 0, row.z);
      dummy.rotation.set(...row.rotation);
      dummy.scale.set(...row.scale);
      dummy.updateMatrix();
      // 采样真实底面并略微压入海床，倾斜底座也有接触，不用额外垫台遮盖。
      let lowestGap = Infinity;
      for (let v = 0; v < position.count; v++) {
        if (position.getY(v) > footBand) continue;
        sample.fromBufferAttribute(position, v).applyMatrix4(dummy.matrix);
        lowestGap = Math.min(
          lowestGap,
          sample.y - heightAt(sample.x, sample.z),
        );
      }
      dummy.position.y = -lowestGap - row.size * 0.08;
      dummy.updateMatrix();
      instances.setMatrixAt(i, dummy.matrix);
      // HF 色图已包含明暗与色相，实例仅作轻微亮度变化，避免二次重染。
      const tone = 0.92 + row.palette * 0.025;
      instances.setColorAt(i, new THREE.Color().setRGB(tone, tone, tone));
      row.y = dummy.position.y;
    }
    const clusters = clusterInstances(instances);
    clusters.userData.reefKind = kind;
    for (const near of [...clusters.children]) {
      const far = new THREE.InstancedMesh(
        asset.farGeometry,
        asset.farMaterial,
        near.count,
      );
      far.instanceMatrix.array.set(near.instanceMatrix.array);
      far.instanceColor = near.instanceColor.clone();
      far.boundingSphere = near.boundingSphere.clone();
      far.name = `${kind}_distant`;
      near.name = `${kind}_close`;
      batches.push({
        near,
        far,
        count: near.count,
        matrices: near.instanceMatrix.array.slice(),
        colors: near.instanceColor.array.slice(),
        close: new Uint8Array(near.count),
      });
      near.count = 0;
      near.visible = false;
      clusters.add(far);
    }
    root.add(clusters);
  }
  root.userData.prepareMaterials = async (options) => {
    const ready = await Promise.all(
      assets.map((asset) => asset.prepare(options)),
    );
    return ready.every(Boolean);
  };
  let disposed = false;
  let lastUpdate = -Infinity;
  const matrix = new THREE.Matrix4(),
    tint = new THREE.Color();
  return {
    root,
    placements,
    update(time, position) {
      if (disposed || (time >= lastUpdate && time - lastUpdate < 0.4)) return;
      lastUpdate = time;
      for (const batch of batches) {
        let n = 0,
          f = 0;
        for (let i = 0; i < batch.count; i++) {
          const offset = i * 16;
          const distance = Math.hypot(
            batch.matrices[offset + 12] - position.x,
            batch.matrices[offset + 13] - position.y,
            batch.matrices[offset + 14] - position.z,
          );
          // 双阈值避免边界来回跳精度；远景使用同源顶点色，不再申请第二张贴图。
          const close = distance < (batch.close[i] ? 30 : 26);
          batch.close[i] = Number(close);
          const mesh = close ? batch.near : batch.far,
            index = close ? n++ : f++;
          matrix.fromArray(batch.matrices, offset);
          tint.fromArray(batch.colors, i * 3);
          mesh.setMatrixAt(index, matrix);
          mesh.setColorAt(index, tint);
        }
        for (const [mesh, count] of [
          [batch.near, n],
          [batch.far, f],
        ]) {
          mesh.count = count;
          mesh.visible = count > 0;
          mesh.instanceMatrix.needsUpdate = true;
          mesh.instanceColor.needsUpdate = true;
        }
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.traverse((node) => {
        if (node.isInstancedMesh) node.dispose();
      });
      for (const asset of assets) asset.release();
    },
  };
}
