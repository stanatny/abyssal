import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import crown_filterer from "./assets/models/crown_filterer_hf_mesh.json" with { type: "json" };
import bell_carrier from "./assets/models/bell_carrier_hf_mesh.json" with { type: "json" };
import siphon_colossus from "./assets/models/siphon_colossus_hf_mesh.json" with { type: "json" };
import spiral_grazer from "./assets/models/spiral_grazer_hf_mesh.json" with { type: "json" };
const data = { crown_filterer, bell_carrier, siphon_colossus, spiral_grazer };
const urls = {
  crown_filterer: new URL(
    "./assets/models/crown_filterer_hf_color.webp",
    import.meta.url,
  ),
  bell_carrier: new URL(
    "./assets/models/bell_carrier_hf_color.webp",
    import.meta.url,
  ),
  siphon_colossus: new URL(
    "./assets/models/siphon_colossus_hf_color.webp",
    import.meta.url,
  ),
  spiral_grazer: new URL(
    "./assets/models/spiral_grazer_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 每种木卫二生物共享不可变表面和贴图重试队列，各实例保留独立骨架。 */
export function europaGiantAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(
    data[kind],
    data[kind].skinIndex ? undefined : bind,
    (x, y, z, color) => {
      const palette = {
        crown_filterer: 0x454e49,
        bell_carrier: 0x586885,
        siphon_colossus: 0x6b454b,
        spiral_grazer: 0x465e68,
      };
      color.setHex(palette[kind]);
    },
  );
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.75,
    metalness: 0,
    vertexColors: true,
  });
  material.name = `${kind}_hf_skin`;
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: urls[kind],
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
  const asset = { geometry, material, prepare };
  cache.set(kind, asset);
  return asset;
}
