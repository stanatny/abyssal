import * as T from "three";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import white_tiger from "./assets/models/white_tiger_hf_mesh.json" with { type: "json" };
import vermilion_bird from "./assets/models/vermilion_bird_hf_mesh.json" with { type: "json" };
export const PENGLAI_HF_GUARDIAN_DATA = { white_tiger, vermilion_bird };
const urls = {
  white_tiger: new URL(
    "./assets/models/white_tiger_hf_color.webp",
    import.meta.url,
  ),
  vermilion_bird: new URL(
    "./assets/models/vermilion_bird_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 材质沿用全局加载队列，贴图失效可重试；不把生成时的金属反光带进毛发与羽毛。 */
export function penglaiGuardianHFAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(
    PENGLAI_HF_GUARDIAN_DATA[kind],
    bind,
    (x, y, z, c) => c.set(kind === "white_tiger" ? 0xc1b9a8 : 0x9d4431),
  );
  const material = new T.MeshStandardMaterial({
    roughness: 0.84,
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
