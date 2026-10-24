import * as THREE from "three";
import { acquireMarianaStrataAsset } from "./mariana_strata_asset.js";
import contacts from "./assets/models/mariana_strata_contacts.json" with { type: "json" };

export const MARIANA_STRATA = Object.freeze({
  hydra_shoulder: Object.freeze({
    kind: "hydra",
    width: 60,
    depth: 55,
    height: 70,
    rearExpansion: 1.05,
  }),
  kraken_echo_gallery: Object.freeze({
    kind: "kraken",
    width: 64,
    depth: 40,
    height: 25,
    rearExpansion: 0.8,
  }),
  maja_fossil_garden: Object.freeze({
    kind: "maja",
    width: 64,
    depth: 50,
    height: 65,
    rearExpansion: 1.1,
  }),
  leviathan_pressure_cathedral: Object.freeze({
    kind: "leviathan",
    width: 64,
    depth: 55,
    height: 78,
    rearExpansion: 1.1,
  }),
});

/** 后缘岩湾保留中心回转圈；网格只作统一缩放，接触盒来自同一源表面的离线体素。 */
export function createMarianaStrata() {
  const assets = new Map(),
    placements = [];
  let disposed = false;
  return {
    assets,
    placements,
    add(
      parent,
      site,
      {
        keep,
        support,
        siteColliders,
        solidRecords,
        supportRecords,
        floorFaceCount,
      },
    ) {
      const spec = MARIANA_STRATA[site.id];
      if (!spec || disposed) return { meshes: 0, triangles: 0 };
      const asset = acquireMarianaStrataAsset(spec.kind);
      assets.set(spec.kind, asset);
      const source = asset.geometry,
        box = source.boundingBox,
        size = box.getSize(new THREE.Vector3());
      const scale = Math.min(
        spec.width / size.x,
        spec.depth / size.z,
        spec.height / size.y,
      );
      const point = new THREE.Vector3(),
        center = box.getCenter(new THREE.Vector3());
      const translation = new THREE.Vector3(
        site.center[0] - center.x * scale,
        0,
        site.center[2] - 43 - box.max.z * scale,
      );
      const p = source.attributes.position,
        footprint = [];
      let gap = -Infinity;
      for (let i = 0; i < p.count; i++) {
        if (p.getY(i) > box.min.y + size.y * 0.025) continue;
        point.fromBufferAttribute(p, i).multiplyScalar(scale).add(translation);
        const ground = support(point.x, point.z);
        gap = Math.max(gap, point.y - ground.y);
        footprint.push(ground.toArray());
      }
      translation.y = -gap - 0.35;
      const matrix = new THREE.Matrix4()
        .makeTranslation(...translation.toArray())
        .multiply(new THREE.Matrix4().makeScale(scale, scale, scale));
      const geometry = keep(source.clone());
      // 量化法线先解为浮点，几何坐标写入世界空间以沿用地貌的实体审计。
      const normals = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++)
        point
          .fromBufferAttribute(source.attributes.normal, i)
          .toArray(normals, i * 3);
      geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
      geometry.applyMatrix4(matrix);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, asset.material);
      mesh.name = `mariana_hf_strata_${site.id}`;
      mesh.userData.prepareMaterials = asset.prepare;
      parent.add(mesh);
      const colliderIds = [];
      for (let i = 0; i < contacts[spec.kind].boxes.length; i++) {
        const b = contacts[spec.kind].boxes[i],
          id = `${mesh.name}_${i}`;
        point.fromArray(b.center).multiplyScalar(scale).add(translation);
        siteColliders.push({
          type: "box",
          id,
          x: point.x,
          y: point.y,
          z: point.z,
          halfSize: new THREE.Vector3(...b.size)
            .multiplyScalar(scale * 0.5)
            .addScalar(0.015),
        });
        colliderIds.push(id);
      }
      const root = support(site.center[0], site.center[2] - 50);
      supportRecords.push({
        site: site.id,
        id: "hf_strata_base",
        host: `${parent.name}_stone`,
        root: root.toArray(),
        footprint,
        hostFaceRange: [0, floorFaceCount],
      });
      solidRecords.push({
        site: site.id,
        id: `hf_${spec.kind}`,
        host: mesh.name,
        vertexRange: [0, p.count],
        faceRange: [0, source.index.count / 3],
        colliderIds,
      });
      placements.push({
        site: site.id,
        kind: spec.kind,
        matrix: matrix.toArray(),
        scale,
        bounds: {
          min: geometry.boundingBox.min.toArray(),
          max: geometry.boundingBox.max.toArray(),
        },
        footprintSamples: footprint.length,
        colliderCount: colliderIds.length,
      });
      void asset.prepare();
      return { meshes: 1, triangles: geometry.index.count / 3 };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const asset of assets.values()) asset.release();
    },
  };
}
