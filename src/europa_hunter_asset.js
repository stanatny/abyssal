import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import forkjaw_stalker from "./assets/models/forkjaw_stalker_hf_mesh.json" with { type: "json" };
import prism_hunter from "./assets/models/prism_hunter_hf_mesh.json" with { type: "json" };
import rift_reaver from "./assets/models/rift_reaver_hf_mesh.json" with { type: "json" };
import void_siphon from "./assets/models/void_siphon_hf_mesh.json" with { type: "json" };
const data = { forkjaw_stalker, prism_hunter, rift_reaver, void_siphon };
const urls = {
  forkjaw_stalker: new URL(
    "./assets/models/forkjaw_stalker_hf_color.webp",
    import.meta.url,
  ),
  prism_hunter: new URL(
    "./assets/models/prism_hunter_hf_color.webp",
    import.meta.url,
  ),
  rift_reaver: new URL(
    "./assets/models/rift_reaver_hf_color.webp",
    import.meta.url,
  ),
  void_siphon: new URL(
    "./assets/models/void_siphon_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 每种木卫二生物共享不可变表面和贴图重试队列，各实例保留独立骨架。 */
export function europaHunterAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    const palette = {
      forkjaw_stalker: 0x454e49,
      prism_hunter: 0x586885,
      rift_reaver: 0x6b454b,
      void_siphon: 0x465e68,
    };
    color.setHex(palette[kind]);
  });
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
