import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import queen_angelfish from "./assets/models/queen_angelfish_hf_mesh.json" with { type: "json" };
import triggerfish from "./assets/models/triggerfish_hf_mesh.json" with { type: "json" };
import needlefish from "./assets/models/needlefish_hf_mesh.json" with { type: "json" };
import barracuda from "./assets/models/barracuda_hf_mesh.json" with { type: "json" };

const data = { queen_angelfish, triggerfish, needlefish, barracuda };
const urls = {
  queen_angelfish: new URL(
    "./assets/models/queen_angelfish_hf_color.webp",
    import.meta.url,
  ),
  triggerfish: new URL(
    "./assets/models/triggerfish_hf_color.webp",
    import.meta.url,
  ),
  needlefish: new URL(
    "./assets/models/needlefish_hf_color.webp",
    import.meta.url,
  ),
  barracuda: new URL(
    "./assets/models/barracuda_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();

/** 共用不可变表面和可重试色图；未加载时保留各物种的腹背配色。 */
export function bermudaFishAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    color.set(
      kind === "queen_angelfish"
        ? z > 0.23 || Math.abs(y) > 0.26
          ? 0xc9ae39
          : 0x397c8e
        : y < -0.025
          ? 0xb9c5bf
          : {
              triggerfish: 0x6c786a,
              needlefish: 0x427876,
              barracuda: 0x697d84,
            }[kind],
    );
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: kind === "queen_angelfish" ? 0.66 : 0.63,
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
