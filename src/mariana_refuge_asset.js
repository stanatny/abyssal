import * as THREE from "three";
import pineapple from "./assets/models/refuge_pineapple_hf_mesh.json" with { type: "json" };
import stoneface from "./assets/models/refuge_stoneface_hf_mesh.json" with { type: "json" };
import rockhouse from "./assets/models/refuge_rockhouse_hf_mesh.json" with { type: "json" };
import restaurant from "./assets/models/refuge_restaurant_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const entries = {
  pineapple: [
    pineapple,
    new URL("./assets/models/refuge_pineapple_hf_color.webp", import.meta.url),
  ],
  stoneface: [
    stoneface,
    new URL("./assets/models/refuge_stoneface_hf_color.webp", import.meta.url),
  ],
  rockhouse: [
    rockhouse,
    new URL("./assets/models/refuge_rockhouse_hf_color.webp", import.meta.url),
  ],
  restaurant: [
    restaurant,
    new URL("./assets/models/refuge_restaurant_hf_color.webp", import.meta.url),
  ],
};
const cache = new Map();
/** 终点建筑共用静态原型，色图未就绪时使用同源顶点色；最后一个持有者释放。 */
export function acquireMarianaRefugeAsset(kind) {
  if (!entries[kind]) throw new TypeError(`Unknown refuge building: ${kind}`);
  if (!cache.has(kind)) {
    const [packed, url] = entries[kind],
      geometry = decodeOrganicMesh(packed, null, (_x, _y, _z, c) =>
        c.set(0xb3a889),
      );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.86,
      metalness: 0,
    });
    material.name = `refuge_${kind}_hf`;
    const asset = { geometry, material, references: 0 };
    asset.prepare = createMaterialPreparation(
      [
        {
          name: "color",
          url,
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
    cache.set(kind, asset);
  }
  const asset = cache.get(kind);
  asset.references++;
  let released = false;
  return {
    geometry: asset.geometry,
    material: asset.material,
    prepare: asset.prepare,
    release() {
      if (released) return;
      released = true;
      if (--asset.references) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      asset.material.dispose();
      if (cache.get(kind) === asset) cache.delete(kind);
    },
  };
}
