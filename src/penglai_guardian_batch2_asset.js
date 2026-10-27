import * as T from "three";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import azure_dragon from "./assets/models/azure_dragon_hf_mesh.json" with { type: "json" };
import black_tortoise from "./assets/models/black_tortoise_hf_mesh.json" with { type: "json" };
export const PENGLAI_HF_GUARDIAN_BATCH2_DATA = { azure_dragon, black_tortoise };
const urls = {
  azure_dragon: new URL(
    "./assets/models/azure_dragon_hf_color.webp",
    import.meta.url,
  ),
  black_tortoise: new URL(
    "./assets/models/black_tortoise_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 材质沿用全局加载队列，贴图失效可重试；龟甲和鳞片使用粗糙的非金属表面。 */
export function penglaiGuardianBatch2Asset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(
    PENGLAI_HF_GUARDIAN_BATCH2_DATA[kind],
    bind,
    (x, y, z, c) => c.set(kind === "azure_dragon" ? 0x416d64 : 0x4e5447),
  );
  const material = new T.MeshStandardMaterial({
    roughness: 0.76,
    metalness: 0,
    vertexColors: true,
  });
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: urls[kind],
        colorSpace: T.SRGBColorSpace,
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
  const a = { geometry, material, prepare };
  cache.set(kind, a);
  return a;
}
