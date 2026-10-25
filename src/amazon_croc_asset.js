import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import black_caiman from "./assets/models/black_caiman_hf_mesh.json" with { type: "json" };
import saltwater_crocodile from "./assets/models/saltwater_crocodile_hf_mesh.json" with { type: "json" };
import purussaurus from "./assets/models/purussaurus_hf_mesh.json" with { type: "json" };
import rootback_colossus from "./assets/models/rootback_colossus_hf_mesh.json" with { type: "json" };
const data = {
  black_caiman,
  saltwater_crocodile,
  purussaurus,
  rootback_colossus,
};
const urls = {
  black_caiman: new URL(
    "./assets/models/black_caiman_hf_color.webp",
    import.meta.url,
  ),
  saltwater_crocodile: new URL(
    "./assets/models/saltwater_crocodile_hf_color.webp",
    import.meta.url,
  ),
  purussaurus: new URL(
    "./assets/models/purussaurus_hf_color.webp",
    import.meta.url,
  ),
  rootback_colossus: new URL(
    "./assets/models/rootback_colossus_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 四种鳄形生物共享各自不可变网格和可重试色图，骨架归实例所有。 */
export function amazonCrocAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, c) =>
    c.setHex(
      y < -0.015
        ? 0x9b916e
        : {
            black_caiman: 0x35413c,
            saltwater_crocodile: 0x776c47,
            purussaurus: 0x795441,
            rootback_colossus: 0x515c3c,
          }[kind],
    ),
  );
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.76,
    metalness: 0,
    vertexColors: true,
  });
  material.name = kind + "_hf_skin";
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
    (ready) => (material.userData.texturesReady = ready),
  );
  const asset = { geometry, material, prepare, packed: data[kind] };
  cache.set(kind, asset);
  return asset;
}
