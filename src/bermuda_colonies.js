import * as THREE from "three";
import { acquireHawaiiReefAsset } from "./hawaii_reef_asset.js";

/** 复用已验收 HF 群落；保留原分布点，以完整底面贴坡，近远网格共用原型。 */
export function createBermudaColonies(parent, { heightAt, nursery = false }) {
  const root = new THREE.Group();
  root.name = nursery ? "bermuda_hf_nursery" : "bermuda_hf_colonies";
  parent.add(root);
  const rows = { reef_branch: [], reef_fan: [], reef_sponge: [] };
  if (nursery)
    for (let i = 0; i < 64; i++)
      rows.reef_branch.push({
        x: (i % 2 ? 1 : -1) * (28 + (i % 9) * 4),
        z: 120 - Math.floor(i / 2) * 7,
        height: 3 + (i % 3) * 1.2,
        yaw: i,
      });
  else
    for (let i = 0; i < 90; i++) {
      const x = (i % 2 ? 1 : -1) * (72 + (i % 7) * 25),
        z = -190 - Math.floor(i / 2) * 20;
      if (x > -150 && x < 35 && z < -360 && z > -940) continue;
      const kind = ["reef_branch", "reef_fan", "reef_sponge"][i % 3];
      rows[kind].push({
        x,
        z,
        height:
          kind === "reef_branch" ? 3 + (i % 4) : kind === "reef_fan" ? 6 : 4,
        yaw: i * 0.7,
      });
    }
  const assets = [],
    batches = [],
    dummy = new THREE.Object3D(),
    point = new THREE.Vector3();
  for (const [kind, placements] of Object.entries(rows)) {
    if (!placements.length) continue;
    const a = acquireHawaiiReefAsset(kind);
    assets.push(a);
    void a.prepare();
    const near = new THREE.InstancedMesh(
        a.geometry,
        a.material,
        placements.length,
      ),
      far = new THREE.InstancedMesh(
        a.farGeometry,
        a.farMaterial,
        placements.length,
      ),
      matrices = [],
      box = a.geometry.boundingBox,
      band = box.min.y + (box.max.y - box.min.y) * 0.12;
    near.name = `bermuda_${kind}_close`;
    far.name = `bermuda_${kind}_distant`;
    for (const row of placements) {
      const dx = (heightAt(row.x + 2, row.z) - heightAt(row.x - 2, row.z)) / 4,
        dz = (heightAt(row.x, row.z + 2) - heightAt(row.x, row.z - 2)) / 4;
      dummy.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(-dx, 1, -dz).normalize(),
      );
      dummy.quaternion.multiply(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          row.yaw,
        ),
      );
      dummy.scale.setScalar(row.height / (box.max.y - box.min.y));
      dummy.position.set(row.x, 0, row.z);
      dummy.updateMatrix();
      let low = Infinity;
      for (let j = 0; j < a.geometry.attributes.position.count; j++) {
        if (a.geometry.attributes.position.getY(j) > band) continue;
        point
          .fromBufferAttribute(a.geometry.attributes.position, j)
          .applyMatrix4(dummy.matrix);
        low = Math.min(low, point.y - heightAt(point.x, point.z));
      }
      dummy.position.y = -low - 0.15;
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
      row.y = dummy.position.y;
    }
    // 全体变换先建立包围体，之后仅压缩可见实例；保留稳定剔除边界。
    for (let i = 0; i < matrices.length; i++) {
      near.setMatrixAt(i, matrices[i]);
      far.setMatrixAt(i, matrices[i]);
    }
    near.computeBoundingSphere();
    far.computeBoundingSphere();
    batches.push({
      kind,
      near,
      far,
      matrices,
      close: new Uint8Array(matrices.length),
    });
    near.count = 0;
    near.visible = false;
    root.add(near, far);
  }
  const prepare = async (options) =>
    (await Promise.all(assets.map((a) => a.prepare(options)))).every(Boolean);
  root.userData.prepareMaterials = prepare;
  let disposed = false,
    lastTime = -Infinity;
  return {
    root,
    assets,
    batches,
    placements: rows,
    prepare,
    update(time, position) {
      if (disposed || (time >= lastTime && time - lastTime < 0.4)) return;
      lastTime = time;
      for (const b of batches) {
        let n = 0,
          f = 0;
        for (let i = 0; i < b.matrices.length; i++) {
          point.setFromMatrixPosition(b.matrices[i]);
          const close = point.distanceTo(position) < (b.close[i] ? 34 : 28);
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
      root.removeFromParent();
      for (const b of batches) {
        b.near.dispose();
        b.far.dispose();
      }
      root.clear();
      for (const a of assets) a.release();
    },
  };
}
