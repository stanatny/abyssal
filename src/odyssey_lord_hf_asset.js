import * as T from "three";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import charybdis from "./assets/models/charybdis_hf_mesh.json" with { type: "json" };
import karkinos from "./assets/models/karkinos_hf_mesh.json" with { type: "json" };
import scylla from "./assets/models/scylla_hf_mesh.json" with { type: "json" };
export const ODYSSEY_HF_LORD_DATA = { scylla, charybdis, karkinos };
const urls = {
  scylla: new URL("./assets/models/scylla_hf_color.webp", import.meta.url),
  karkinos: new URL("./assets/models/karkinos_hf_color.webp", import.meta.url),
  charybdis: new URL(
    "./assets/models/charybdis_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 实体与材质共用，骨架独立；贴图准备沿用全局有界队列及失败重试。 */
export function odysseyLordHFAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(
    ODYSSEY_HF_LORD_DATA[kind],
    bind,
    (x, y, z, c) => c.set(kind === "karkinos" ? 0x805347 : 0x687c79),
  );
  const material = new T.MeshStandardMaterial({
    roughness: 0.81,
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
  const result = { geometry, material, prepare };
  cache.set(kind, result);
  return result;
}
