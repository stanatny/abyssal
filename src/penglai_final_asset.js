import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import gate_dragon from "./assets/models/gate_dragon_hf_mesh.json" with { type: "json" };
import peng from "./assets/models/peng_hf_mesh.json" with { type: "json" };
import gilded_cloud_carp from "./assets/models/gilded_cloud_carp_hf_mesh.json" with { type: "json" };
import taotie from "./assets/models/taotie_hf_mesh.json" with { type: "json" };
const data = { gate_dragon, peng, gilded_cloud_carp, taotie };
const urls = {
  gate_dragon: new URL(
    "./assets/models/gate_dragon_hf_color.webp",
    import.meta.url,
  ),
  peng: new URL("./assets/models/peng_hf_color.webp", import.meta.url),
  gilded_cloud_carp: new URL(
    "./assets/models/gilded_cloud_carp_hf_color.webp",
    import.meta.url,
  ),
  taotie: new URL("./assets/models/taotie_hf_color.webp", import.meta.url),
};
const cache = new Map();
export const penglaiFinalFit = (kind) => data[kind].contactFit;

/** Shared immutable surfaces; only skeletons and pose state belong to an instance. */
export function penglaiFinalAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) =>
    color.setHex(
      {
        gate_dragon: 0xac7040,
        peng: 0x5e6067,
        gilded_cloud_carp: 0xccac59,
        taotie: 0x596f60,
      }[kind],
    ),
  );
  const material = new THREE.MeshStandardMaterial({
    roughness: kind === "taotie" ? 0.86 : kind === "peng" ? 0.83 : 0.65,
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
