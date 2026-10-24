import * as THREE from "three";
import { acquireMarianaFossilAsset } from "./mariana_fossil_asset.js";

/** 每层一批静态化石；完整基底采样真实岩台，实例缓冲由海域统一回收。 */
export function createMarianaFossils() {
  const asset = acquireMarianaFossilAsset(),
    placements = [],
    batches = [];
  const p = asset.geometry.attributes.position,
    box = asset.geometry.boundingBox;
  const base = [],
    seen = new Set(),
    bottomBand = box.min.y + (box.max.y - box.min.y) * 0.08;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > bottomBand) continue;
    const v = [p.getX(i), p.getY(i), p.getZ(i)],
      key = v.map((n) => n.toFixed(5)).join(",");
    if (!seen.has(key)) base.push(v);
    seen.add(key);
  }
  let disposed = false;
  return {
    asset,
    placements,
    batches,
    add(parent, rows, support) {
      if (disposed) throw new Error("Cannot add to disposed Mariana fossils");
      const mesh = new THREE.InstancedMesh(
        asset.geometry,
        asset.material,
        rows.length,
      );
      mesh.name = `mariana_hf_fossils_${parent.name}`;
      const dummy = new THREE.Object3D(),
        up = new THREE.Vector3(0, 1, 0),
        point = new THREE.Vector3();
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        dummy.quaternion.setFromUnitVectors(
          up,
          new THREE.Vector3(...row.normal),
        );
        dummy.quaternion.multiply(
          new THREE.Quaternion().setFromAxisAngle(up, row.yaw),
        );
        dummy.scale.setScalar(row.scale);
        dummy.position.set(row.x, row.y, row.z);
        dummy.updateMatrix();
        let maxGap = -Infinity;
        const footprint = [];
        for (const v of base) {
          point.fromArray(v).applyMatrix4(dummy.matrix);
          const hit = support(point.x, point.z);
          maxGap = Math.max(maxGap, point.y - hit.y);
          footprint.push(hit.toArray());
        }
        dummy.position.y -= maxGap + 0.43;
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        row.record.footprint = footprint;
        placements.push({
          site: row.site,
          index: row.index,
          matrix: dummy.matrix.toArray(),
          source: {
            x: row.x,
            y: row.y,
            z: row.z,
            scale: row.scale,
            yaw: row.yaw,
          },
          baseSamples: base.length,
        });
      }
      mesh.computeBoundingSphere();
      mesh.userData.prepareMaterials = asset.prepare;
      parent.add(mesh);
      batches.push(mesh);
      void asset.prepare();
      return {
        meshes: 1,
        triangles: (rows.length * asset.geometry.index.count) / 3,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      asset.release();
    },
  };
}
