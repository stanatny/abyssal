import * as THREE from "three";
import crag from "./assets/models/odyssey_crag_hf_mesh.json" with { type: "json" };
import memorial from "./assets/models/odyssey_memorial_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { decodePackedArray } from "./packed_array.js";
import { createMaterialPreparation } from "./material_loading.js";

/** 地图独立拥有实体；先显示源顶点色，异步贴图失败也不出现白片。 */
export function createOdysseyAbyssAssets(keep) {
  const result = {};
  for (const [kind, packed, url] of [
    [
      "crag",
      crag,
      new URL("./assets/models/odyssey_crag_hf_color.webp", import.meta.url),
    ],
    [
      "memorial",
      memorial,
      new URL(
        "./assets/models/odyssey_memorial_hf_color.webp",
        import.meta.url,
      ),
    ],
  ]) {
    const geometry = keep(
      decodeOrganicMesh(packed, null, (_x, _y, _z, c) => c.set(0x9c998a)),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    // 两档只改变索引与法线；位置、UV 和源颜色在同一地图内只保留一份。
    const farGeometry = keep(new THREE.BufferGeometry());
    for (const [name, attribute] of Object.entries(geometry.attributes))
      farGeometry.setAttribute(name, attribute);
    farGeometry.boundingBox = geometry.boundingBox.clone();
    farGeometry.boundingSphere = geometry.boundingSphere.clone();
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
    material.name = `odyssey_abyss_${kind}_hf`;
    const farMaterial = keep(material.clone());
    farMaterial.name = `odyssey_abyss_${kind}_far`;
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
