import * as T from "three";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import iris_cuttlefish from "./assets/models/iris_cuttlefish_hf_mesh.json" with { type: "json" };
import amphora_hermit from "./assets/models/amphora_hermit_hf_mesh.json" with { type: "json" };
import aegean_jelly from "./assets/models/aegean_jelly_hf_mesh.json" with { type: "json" };
import silver_pipefish from "./assets/models/silver_pipefish_hf_mesh.json" with { type: "json" };
export const ODYSSEY_GARDEN_HF_DATA = {
  iris_cuttlefish,
  amphora_hermit,
  aegean_jelly,
  silver_pipefish,
};
const urls = {
  iris_cuttlefish: new URL(
    "./assets/models/iris_cuttlefish_hf_color.webp",
    import.meta.url,
  ),
  amphora_hermit: new URL(
    "./assets/models/amphora_hermit_hf_color.webp",
    import.meta.url,
  ),
  aegean_jelly: new URL(
    "./assets/models/aegean_jelly_hf_color.webp",
    import.meta.url,
  ),
  silver_pipefish: new URL(
    "./assets/models/silver_pipefish_hf_color.webp",
    import.meta.url,
  ),
};
const colors = {
  iris_cuttlefish: 0xaa677d,
  amphora_hermit: 0xae806c,
  aegean_jelly: 0xac98b7,
  silver_pipefish: 0x9aafa6,
};
const cache = new Map();
/** 四种表面共用加载队列；颜色失败可重试，单个实例仅拥有骨架。 */
export function odysseyGardenHFAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(
    ODYSSEY_GARDEN_HF_DATA[kind],
    bind,
    (x, y, z, c) => c.set(colors[kind]),
  );
  const material = new T.MeshStandardMaterial({
    roughness: kind === "aegean_jelly" ? 0.46 : 0.76,
    color: kind === "aegean_jelly" ? 0xe7ddf7 : 0xffffff,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    side: T.FrontSide,
    emissive: kind === "aegean_jelly" ? 0x403050 : 0x000000,
    emissiveIntensity: kind === "aegean_jelly" ? 0.12 : 0,
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
