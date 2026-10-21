import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import blue_shark from "./assets/models/blue_shark_hf_mesh.json" with { type: "json" };
import swordfish from "./assets/models/swordfish_hf_mesh.json" with { type: "json" };
import helicoprion from "./assets/models/helicoprion_hf_mesh.json" with { type: "json" };
import ichthyosaur from "./assets/models/ichthyosaur_hf_mesh.json" with { type: "json" };
const data = { blue_shark, swordfish, helicoprion, ichthyosaur };
const urls = {
  blue_shark: new URL(
    "./assets/models/blue_shark_hf_color.webp",
    import.meta.url,
  ),
  swordfish: new URL(
    "./assets/models/swordfish_hf_color.webp",
    import.meta.url,
  ),
  helicoprion: new URL(
    "./assets/models/helicoprion_hf_color.webp",
    import.meta.url,
  ),
  ichthyosaur: new URL(
    "./assets/models/ichthyosaur_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 四种独立猎手缓存各自实体和颜色；加载失败保留腹背配色并复用公共重试队列。 */
export function atlantisPredatorAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, c) => {
    c.set(
      y < -0.025
        ? 0xc6cec6
        : {
            blue_shark: 0x326ea5,
            swordfish: 0x586b79,
            helicoprion: 0x71796c,
            ichthyosaur: 0x596c70,
          }[kind],
    );
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.67,
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
