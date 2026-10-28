import * as T from "three";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import naga_huntress from "./assets/models/naga_huntress_hf_mesh.json" with { type: "json" };
import golden_argonaut from "./assets/models/golden_argonaut_hf_mesh.json" with { type: "json" };
export const ODYSSEY_FINAL_HF_DATA = { naga_huntress, golden_argonaut };
const urls = {
  naga_huntress: new URL(
    "./assets/models/naga_huntress_hf_color.webp",
    import.meta.url,
  ),
  golden_argonaut: new URL(
    "./assets/models/golden_argonaut_hf_color.webp",
    import.meta.url,
  ),
};
const colors = { naga_huntress: 0x5c846a, golden_argonaut: 0xc7ae7c };
const cache = new Map();
/** 两种表面共用加载队列；颜色失败可重试，单个实例仅拥有骨架。 */
export function odysseyFinalHFAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(
    ODYSSEY_FINAL_HF_DATA[kind],
    (x, y, z, ids, w, o, i) => bind(x, y, z, ids, w, o, i),
    (x, y, z, c) => c.set(colors[kind]),
  );
  const material = new T.MeshStandardMaterial({
    roughness: 0.78,
    color: 0xffffff,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    side: T.FrontSide,
    emissive: 0x000000,
    emissiveIntensity: 0,
    metalness: 0,
    vertexColors: true,
  });
  material.name = `${kind}_hf_skin`;
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
  const asset = { geometry, material, prepare };
  cache.set(kind, asset);
  return asset;
}
