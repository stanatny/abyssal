import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import xuangui from "./assets/models/xuangui_hf_mesh.json" with { type: "json" };
import bifang from "./assets/models/bifang_hf_mesh.json" with { type: "json" };
import hujiao from "./assets/models/hujiao_hf_mesh.json" with { type: "json" };
import pool_hujiao from "./assets/models/pool_hujiao_hf_mesh.json" with { type: "json" };
const data = { xuangui, bifang, hujiao, pool_hujiao };
const urls = {
  xuangui: new URL("./assets/models/xuangui_hf_color.webp", import.meta.url),
  bifang: new URL("./assets/models/bifang_hf_color.webp", import.meta.url),
  hujiao: new URL("./assets/models/hujiao_hf_color.webp", import.meta.url),
  pool_hujiao: new URL(
    "./assets/models/pool_hujiao_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 每种水兽或火鸟共享不可变表面和贴图重试队列，各实例保留独立骨架。 */
export function penglaiWaterbirdAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    const palette = {
      xuangui: y > 0 ? 0x385849 : 0x8a8b6c,
      bifang: z < -0.39 ? 0xdcd8cd : 0x316977,
      hujiao: y > 0 ? 0x596e48 : 0xb5b18a,
      pool_hujiao: y > 0.02 ? 0x47697a : 0xa5b0b2,
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
