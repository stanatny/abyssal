import * as T from "three";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import aegis_sturgeon from "./assets/models/aegis_sturgeon_hf_mesh.json" with { type: "json" };
import thalassa_manta from "./assets/models/thalassa_manta_hf_mesh.json" with { type: "json" };
import cerulean_hound from "./assets/models/cerulean_hound_hf_mesh.json" with { type: "json" };
import bronze_turtle from "./assets/models/bronze_turtle_hf_mesh.json" with { type: "json" };
export const ODYSSEY_LARGE_HF_DATA = {
  aegis_sturgeon,
  thalassa_manta,
  cerulean_hound,
  bronze_turtle,
};
const urls = {
  aegis_sturgeon: new URL(
    "./assets/models/aegis_sturgeon_hf_color.webp",
    import.meta.url,
  ),
  thalassa_manta: new URL(
    "./assets/models/thalassa_manta_hf_color.webp",
    import.meta.url,
  ),
  cerulean_hound: new URL(
    "./assets/models/cerulean_hound_hf_color.webp",
    import.meta.url,
  ),
  bronze_turtle: new URL(
    "./assets/models/bronze_turtle_hf_color.webp",
    import.meta.url,
  ),
};
const colors = {
  aegis_sturgeon: 0x777e70,
  thalassa_manta: 0x597c8c,
  cerulean_hound: 0x657b87,
  bronze_turtle: 0x79745b,
};
const cache = new Map();
/** 四种表面共用加载队列；颜色失败可重试，单个实例仅拥有骨架。 */
export function odysseyLargeHFAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(
    ODYSSEY_LARGE_HF_DATA[kind],
    bind,
    (x, y, z, c) => c.set(colors[kind]),
  );
  const material = new T.MeshStandardMaterial({
    roughness: kind === "bronze_turtle" ? 0.83 : 0.72,
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
