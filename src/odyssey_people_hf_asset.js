import { decodePackedArray } from "./packed_array.js";
import * as T from "three";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import nereid from "./assets/models/nereid_hf_mesh.json" with { type: "json" };
import hippocampus from "./assets/models/hippocampus_hf_mesh.json" with { type: "json" };
import triton_guard from "./assets/models/triton_guard_hf_mesh.json" with { type: "json" };
import siren_eel from "./assets/models/siren_eel_hf_mesh.json" with { type: "json" };
export const ODYSSEY_PEOPLE_HF_DATA = {
  nereid,
  hippocampus,
  triton_guard,
  siren_eel,
};
const urls = {
  nereid: new URL("./assets/models/nereid_hf_color.webp", import.meta.url),
  hippocampus: new URL(
    "./assets/models/hippocampus_hf_color.webp",
    import.meta.url,
  ),
  triton_guard: new URL(
    "./assets/models/triton_guard_hf_color.webp",
    import.meta.url,
  ),
  siren_eel: new URL(
    "./assets/models/siren_eel_hf_color.webp",
    import.meta.url,
  ),
};
const colors = {
  nereid: 0x9b8b9a,
  hippocampus: 0x678782,
  triton_guard: 0x56747d,
  siren_eel: 0x79677e,
};
const cache = new Map();
/** 四种表面共用加载队列；颜色失败可重试，单个实例仅拥有骨架。 */
export function odysseyPeopleHFAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const ownership = ODYSSEY_PEOPLE_HF_DATA[kind].armOwnership
    ? decodePackedArray(ODYSSEY_PEOPLE_HF_DATA[kind].armOwnership, Uint16Array)
    : null;
  const geometry = decodeOrganicMesh(
    ODYSSEY_PEOPLE_HF_DATA[kind],
    (x, y, z, ids, w, o, i) =>
      bind(x, y, z, ids, w, o, i, ownership ? ownership[i] / 65535 : null),
    (x, y, z, c) => c.set(colors[kind]),
  );
  const material = new T.MeshStandardMaterial({
    roughness: kind === "triton_guard" ? 0.8 : 0.75,
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
