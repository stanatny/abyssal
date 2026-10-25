import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import neon_tetra from "./assets/models/neon_tetra_hf_mesh.json" with { type: "json" };
import amazon_discus from "./assets/models/amazon_discus_hf_mesh.json" with { type: "json" };
import silver_hatchet from "./assets/models/silver_hatchet_hf_mesh.json" with { type: "json" };
import armored_cory from "./assets/models/armored_cory_hf_mesh.json" with { type: "json" };
const data = { neon_tetra, amazon_discus, silver_hatchet, armored_cory };
const urls = {
  neon_tetra: new URL(
    "./assets/models/neon_tetra_hf_color.webp",
    import.meta.url,
  ),
  amazon_discus: new URL(
    "./assets/models/amazon_discus_hf_color.webp",
    import.meta.url,
  ),
  silver_hatchet: new URL(
    "./assets/models/silver_hatchet_hf_color.webp",
    import.meta.url,
  ),
  armored_cory: new URL(
    "./assets/models/armored_cory_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 每种鱼共享不可变表面和贴图重试队列，各实例保留独立骨架。 */
export function amazonSmallAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    const palette = {
      neon_tetra:
        Math.abs(y + 0.015) < 0.028
          ? 0x32b8d2
          : y < -0.04
            ? z > -0.1
              ? 0xc03834
              : 0xc3c7bc
            : 0x485e64,
      amazon_discus:
        Math.sin(z * 52) > 0.55 ? 0x394438 : y > 0.1 ? 0x8e8960 : 0x629a93,
      silver_hatchet: y > 0.06 ? 0x6b776f : 0xbac4c4,
      armored_cory:
        Math.sin(z * 83) * Math.cos(y * 94) > 0.55
          ? 0x3b3b32
          : y < -0.09
            ? 0xc5ba98
            : 0x8c8865,
    };
    color.setHex(palette[kind]);
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.65,
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
