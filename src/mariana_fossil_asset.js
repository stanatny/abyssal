import * as THREE from "three";
import packed from "./assets/models/mariana_fossil_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

let cached;
/** 化石表面由地图共享；只有最后一个引用退出时释放原型和异步贴图。 */
export function acquireMarianaFossilAsset() {
  if (!cached) {
    const geometry = decodeOrganicMesh(packed, null, (_x, _y, _z, color) =>
      color.set(0xb5b2a3),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0,
    });
    material.name = "mariana_fossil_hf_surface";
    const asset = { geometry, material, references: 0 };
    asset.prepare = createMaterialPreparation(
      [
        {
          name: "color",
          url: new URL(
            "./assets/models/mariana_fossil_hf_color.webp",
            import.meta.url,
          ),
          colorSpace: THREE.SRGBColorSpace,
          apply(texture) {
            material.map = texture;
            material.vertexColors = false;
            material.needsUpdate = true;
          },
        },
      ],
      (ready) => {
        material.userData.texturesReady = ready;
      },
    );
    cached = asset;
  }
  const asset = cached;
  asset.references++;
  let released = false;
  return {
    geometry: asset.geometry,
    material: asset.material,
    prepare: asset.prepare,
    release() {
      if (released) return;
      released = true;
      if (--asset.references) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      asset.material.dispose();
      if (cached === asset) cached = undefined;
    },
  };
}
