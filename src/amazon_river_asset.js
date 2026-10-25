import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import amazon_pacu from "./assets/models/amazon_pacu_hf_mesh.json" with { type: "json" };
import silver_arowana from "./assets/models/silver_arowana_hf_mesh.json" with { type: "json" };
import arapaima from "./assets/models/arapaima_hf_mesh.json" with { type: "json" };
import redtail_catfish from "./assets/models/redtail_catfish_hf_mesh.json" with { type: "json" };
const data = { amazon_pacu, silver_arowana, arapaima, redtail_catfish };
const urls = {
  amazon_pacu: new URL(
    "./assets/models/amazon_pacu_hf_color.webp",
    import.meta.url,
  ),
  silver_arowana: new URL(
    "./assets/models/silver_arowana_hf_color.webp",
    import.meta.url,
  ),
  arapaima: new URL("./assets/models/arapaima_hf_color.webp", import.meta.url),
  redtail_catfish: new URL(
    "./assets/models/redtail_catfish_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 每种鱼共享不可变表面和贴图重试队列，各实例保留独立骨架。 */
export function amazonRiverAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    const palette = {
      amazon_pacu: y > 0 ? 0x666f59 : 0xa4a080,
      silver_arowana: y > 0.05 ? 0x758c88 : 0xc1c8bc,
      arapaima: z > 0.03 ? 0x9c5745 : y < -0.04 ? 0xaaa797 : 0x687262,
      redtail_catfish: z > 0.3 ? 0xc65e32 : y < -0.025 ? 0xd1c6a0 : 0x4d5145,
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
