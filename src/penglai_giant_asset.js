import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import bashe from "./assets/models/bashe_hf_mesh.json" with { type: "json" };
import kui from "./assets/models/kui_hf_mesh.json" with { type: "json" };
import kun from "./assets/models/kun_hf_mesh.json" with { type: "json" };

const data = { bashe, kui, kun };
const urls = {
  bashe: new URL("./assets/models/bashe_hf_color.webp", import.meta.url),
  kui: new URL("./assets/models/kui_hf_color.webp", import.meta.url),
  kun: new URL("./assets/models/kun_hf_color.webp", import.meta.url),
};
const cache = new Map();
export const penglaiGiantFit = (kind) => data[kind].contactFit;

/** Shared immutable surfaces; only skeletons and pose state belong to an instance. */
export function penglaiGiantAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) =>
    color.setHex({ bashe: 0x344e49, kui: 0x586063, kun: 0x456b75 }[kind]),
  );
  const material = new THREE.MeshStandardMaterial({
    roughness: kind === "kui" ? 0.86 : 0.7,
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
