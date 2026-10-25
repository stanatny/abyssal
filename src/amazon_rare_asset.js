import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import jade_arowana from "./assets/models/jade_arowana_hf_mesh.json" with { type: "json" };
const data = { jade_arowana };
const urls = {
  jade_arowana: new URL(
    "./assets/models/jade_arowana_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 每种鱼共享不可变表面和贴图重试队列，各实例保留独立骨架。 */
export function amazonRareAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    color.setHex(y > 0 ? 0x518c64 : 0xb5c4a0);
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.64,
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
