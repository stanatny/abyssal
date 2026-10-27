import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import lotus_sprite from "./assets/models/lotus_sprite_hf_mesh.json" with { type: "json" };
import wenyao from "./assets/models/wenyao_hf_mesh.json" with { type: "json" };
import luoyu from "./assets/models/luoyu_hf_mesh.json" with { type: "json" };
import cloud_crane from "./assets/models/cloud_crane_hf_mesh.json" with { type: "json" };
const data = { lotus_sprite, wenyao, luoyu, cloud_crane };
const urls = {
  lotus_sprite: new URL(
    "./assets/models/lotus_sprite_hf_color.webp",
    import.meta.url,
  ),
  wenyao: new URL("./assets/models/wenyao_hf_color.webp", import.meta.url),
  luoyu: new URL("./assets/models/luoyu_hf_color.webp", import.meta.url),
  cloud_crane: new URL(
    "./assets/models/cloud_crane_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 每种贝灵或翼兽共享不可变表面和贴图重试队列，各实例保留独立骨架。 */
export function penglaiWingedAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    const palette = {
      lotus_sprite: y > 0 ? 0xb88c95 : 0xdbbbae,
      wenyao: z < -0.34 ? 0xdcd8cd : 0x345a65,
      luoyu: y > 0 ? 0x8f7755 : 0xcab588,
      cloud_crane: Math.abs(x) > 0.45 ? 0x33373b : 0xe2dfd6,
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
