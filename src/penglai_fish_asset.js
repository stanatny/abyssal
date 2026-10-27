import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import jade_minnow from "./assets/models/jade_minnow_hf_mesh.json" with { type: "json" };
import chiru from "./assets/models/chiru_hf_mesh.json" with { type: "json" };
import spirit_carp from "./assets/models/spirit_carp_hf_mesh.json" with { type: "json" };
import dragon_carp from "./assets/models/dragon_carp_hf_mesh.json" with { type: "json" };
const data = { jade_minnow, chiru, spirit_carp, dragon_carp };
const urls = {
  jade_minnow: new URL(
    "./assets/models/jade_minnow_hf_color.webp",
    import.meta.url,
  ),
  chiru: new URL("./assets/models/chiru_hf_color.webp", import.meta.url),
  spirit_carp: new URL(
    "./assets/models/spirit_carp_hf_color.webp",
    import.meta.url,
  ),
  dragon_carp: new URL(
    "./assets/models/dragon_carp_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 每种鱼共享不可变表面和贴图重试队列，各实例保留独立骨架。 */
export function penglaiFishAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    const palette = {
      jade_minnow: y > 0 ? 0x429a8d : 0xc7dfc6,
      chiru: y > -0.04 ? 0xb66a49 : 0xd5b69a,
      spirit_carp: Math.sin(z * 21) > 0 ? 0xc85e31 : 0xdfd9bd,
      dragon_carp: y > 0 ? 0xb58732 : 0xd9bd65,
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
