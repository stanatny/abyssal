import * as THREE from "three";
import column from "./assets/models/odyssey_column_hf_mesh.json" with { type: "json" };
import galley from "./assets/models/odyssey_galley_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { decodePackedArray } from "./packed_array.js";
import { createMaterialPreparation } from "./material_loading.js";

/** 地图独立拥有实体；先显示源顶点色，异步贴图失败也不出现白片或空船。 */
export function createOdysseyRuinsAssets(keep) {
  const result = {};
  for (const [kind, packed, url] of [
    [
      "column",
      column,
      new URL("./assets/models/odyssey_column_hf_color.webp", import.meta.url),
    ],
    [
      "galley",
      galley,
      new URL("./assets/models/odyssey_galley_hf_color.webp", import.meta.url),
    ],
  ]) {
    const geometry = keep(
      decodeOrganicMesh(packed, null, (_x, _y, _z, c) => c.set(0x9c998a)),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const farGeometry = keep(geometry.clone());
    farGeometry.setIndex(
      new THREE.BufferAttribute(
        decodePackedArray(packed.farIndex, Uint16Array),
        1,
      ),
    );
    farGeometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(
        decodePackedArray(packed.farNormal, Int16Array),
        3,
        true,
      ),
    );
    const material = keep(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.94,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    );
    material.name = `odyssey_ruins_${kind}_hf`;
    const farMaterial = keep(material.clone());
    farMaterial.name = `odyssey_ruins_${kind}_far`;
    const prepare = createMaterialPreparation(
      [
        {
          name: "color",
          url,
          colorSpace: THREE.SRGBColorSpace,
          apply(texture) {
            material.map = texture;
            material.vertexColors = false;
            material.needsUpdate = true;
          },
        },
      ],
      (ready) => (material.userData.texturesReady = ready),
    );
    keep({ dispose: prepare.dispose });
    result[kind] = {
      geometry,
      farGeometry,
      material,
      farMaterial,
      prepare,
      packed,
    };
    prepare();
  }
  return result;
}

/** 距离滞回避免在临界距离闪动；细节切换不修改碰撞或清空贴图。 */
export function createOdysseyRuinMesh(asset, name, range) {
  const mesh = new THREE.Mesh(asset.geometry, asset.material);
  mesh.name = name;
  mesh.userData.artRevision = "hf-odyssey-ruins-20261028";
  let far = false;
  mesh.userData.updateDetail = (position, highQuality = true) => {
    const d = mesh.position.distanceTo(position),
      limit = range * (highQuality ? 1 : 0.85);
    const next = far ? d > limit * 0.85 : d > limit * 1.15;
    if (next === far) return;
    far = next;
    mesh.geometry = far ? asset.farGeometry : asset.geometry;
    mesh.material = far ? asset.farMaterial : asset.material;
  };
  return mesh;
}
