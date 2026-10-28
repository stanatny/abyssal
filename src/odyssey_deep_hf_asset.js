import * as T from "three";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import ketos from "./assets/models/ketos_hf_mesh.json" with { type: "json" };
import abyss_lamprey from "./assets/models/abyss_lamprey_hf_mesh.json" with { type: "json" };
import oracle_whale from "./assets/models/oracle_whale_hf_mesh.json" with { type: "json" };
import ceto_serpent from "./assets/models/ceto_serpent_hf_mesh.json" with { type: "json" };
export const ODYSSEY_DEEP_HF_DATA = {
  ketos,
  abyss_lamprey,
  oracle_whale,
  ceto_serpent,
};
const urls = {
  ketos: new URL("./assets/models/ketos_hf_color.webp", import.meta.url),
  abyss_lamprey: new URL(
    "./assets/models/abyss_lamprey_hf_color.webp",
    import.meta.url,
  ),
  oracle_whale: new URL(
    "./assets/models/oracle_whale_hf_color.webp",
    import.meta.url,
  ),
  ceto_serpent: new URL(
    "./assets/models/ceto_serpent_hf_color.webp",
    import.meta.url,
  ),
};
const colors = {
  ketos: 0x827751,
  abyss_lamprey: 0x756778,
  oracle_whale: 0x697a89,
  ceto_serpent: 0x3f6370,
};
const cache = new Map();
/** 四种表面共用加载队列；颜色失败可重试，单个实例仅拥有骨架。 */
export function odysseyDeepHFAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(
    ODYSSEY_DEEP_HF_DATA[kind],
    bind,
    (x, y, z, c) => c.set(colors[kind]),
  );
  const material = new T.MeshStandardMaterial({
    roughness: kind === "oracle_whale" ? 0.8 : 0.75,
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
