import * as THREE from "three";
import { acquireHawaiiReefAsset } from "./hawaii_reef_asset.js";

/** 海沟复用已验收 HF 群落；地图拥有实例，缓存按引用计数拥有只读原型。 */
export function createMarianaColonies() {
  const assets = new Map(),
    batches = [],
    placements = [],
    point = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0),
    dummy = new THREE.Object3D();
  let disposed = false,
    lastTime = -Infinity;
  const assetFor = (kind) => {
    if (!assets.has(kind)) assets.set(kind, acquireHawaiiReefAsset(kind));
    return assets.get(kind);
  };
  const prepare = async (options) =>
    (
      await Promise.all([...assets.values()].map((a) => a.prepare(options)))
    ).every(Boolean);
  return {
    assets,
    batches,
    placements,
    prepare,
    add(parent, kind, rows, support) {
      if (disposed) throw new Error("Cannot add to disposed Mariana colonies");
      if (!rows.length) return;
      const a = assetFor(kind),
        near = new THREE.InstancedMesh(a.geometry, a.material, rows.length),
        far = new THREE.InstancedMesh(
          a.farGeometry,
          a.farMaterial,
          rows.length,
        ),
        matrices = [],
        bottom = [],
        p = a.geometry.attributes.position,
        box = a.geometry.boundingBox,
        band = box.min.y + (box.max.y - box.min.y) * 0.025,
        seen = new Set();
      for (let i = 0; i < p.count; i++) {
        if (p.getY(i) > band) continue;
        const v = [p.getX(i), p.getY(i), p.getZ(i)],
          key = v.map((n) => n.toFixed(5)).join(",");
        if (!seen.has(key)) bottom.push(v);
        seen.add(key);
      }
      near.name = `mariana_hf_colony_${kind}_close`;
      far.name = `mariana_hf_colony_${kind}_distant`;
      for (const row of rows) {
        const center = support(row, row.x, row.z);
        if (!center) throw new Error("Missing Mariana colony center support");
        dummy.quaternion.setFromUnitVectors(up, center.normal);
        dummy.quaternion.multiply(
          new THREE.Quaternion().setFromAxisAngle(up, row.yaw),
        );
        dummy.scale.setScalar(row.scale);
        dummy.position.set(row.x, center.y, row.z);
        dummy.updateMatrix();
        let maxGap = -Infinity;
        for (const vertex of bottom) {
          point.fromArray(vertex).applyMatrix4(dummy.matrix);
          const hit = support(row, point.x, point.z);
          if (!hit) throw new Error("Missing full Mariana colony root support");
          maxGap = Math.max(maxGap, point.y - hit.y);
        }
        dummy.position.y -= maxGap + 0.06;
        dummy.updateMatrix();
        const matrix = dummy.matrix.clone();
        matrices.push(matrix);
        placements.push({
          kind,
          group: parent.name,
          source: { ...row },
          matrix: matrix.toArray(),
          rootSamples: bottom.length,
          rootSink: maxGap + 0.06,
        });
      }
      for (let i = 0; i < matrices.length; i++) {
        near.setMatrixAt(i, matrices[i]);
        far.setMatrixAt(i, matrices[i]);
      }
      near.computeBoundingSphere();
      far.computeBoundingSphere();
      near.count = 0;
      near.visible = false;
      parent.add(near, far);
      // 普通进图和场景重试都能找到准备函数，不依赖验收脚本手动加载。
      near.userData.prepareMaterials = prepare;
      far.userData.prepareMaterials = prepare;
      batches.push({
        kind,
        parent,
        near,
        far,
        matrices,
        close: new Uint8Array(rows.length),
      });
      void a.prepare();
    },
    update(time, position) {
      if (disposed || (time >= lastTime && time - lastTime < 0.35)) return;
      lastTime = time;
      for (const b of batches) {
        if (!b.parent.visible) continue;
        let n = 0,
          f = 0;
        for (let i = 0; i < b.matrices.length; i++) {
          point.setFromMatrixPosition(b.matrices[i]);
          const close =
            point.distanceToSquared(position) < (b.close[i] ? 34 : 28) ** 2;
          b.close[i] = Number(close);
          (close ? b.near : b.far).setMatrixAt(
            close ? n++ : f++,
            b.matrices[i],
          );
        }
        for (const [mesh, count] of [
          [b.near, n],
          [b.far, f],
        ]) {
          mesh.count = count;
          mesh.visible = count > 0;
          mesh.instanceMatrix.needsUpdate = true;
        }
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      // InstancedMesh 由海域统一释放；这里只释放本池持有的原型引用。
      for (const a of assets.values()) a.release();
      assets.clear();
    },
  };
}
