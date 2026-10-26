import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import glass_seed from "./assets/models/glass_seed_hf_mesh.json" with { type: "json" };
import ribbon_spore from "./assets/models/ribbon_spore_hf_mesh.json" with { type: "json" };
import tripod_bloom from "./assets/models/tripod_bloom_hf_mesh.json" with { type: "json" };
import sail_crawler from "./assets/models/sail_crawler_hf_mesh.json" with { type: "json" };
const data = { glass_seed, ribbon_spore, tripod_bloom, sail_crawler };
const urls = {
  glass_seed: new URL(
    "./assets/models/glass_seed_hf_color.webp",
    import.meta.url,
  ),
  ribbon_spore: new URL(
    "./assets/models/ribbon_spore_hf_color.webp",
    import.meta.url,
  ),
  tripod_bloom: new URL(
    "./assets/models/tripod_bloom_hf_color.webp",
    import.meta.url,
  ),
  sail_crawler: new URL(
    "./assets/models/sail_crawler_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 每种木卫二生物共享不可变表面和贴图重试队列，各实例保留独立骨架。 */
export function europaSmallAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    const palette = {
      glass_seed: Math.abs(x) + Math.abs(y) > 0.25 ? 0x899fa7 : 0xb27a39,
      ribbon_spore: 0x9c829f,
      tripod_bloom: 0xb47453,
      sail_crawler: y > 0.05 ? 0x4b6c6d : 0x777b69,
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
