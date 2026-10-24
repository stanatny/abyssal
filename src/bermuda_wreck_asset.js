import * as THREE from "three";
import funnel from "./assets/models/wreck_funnel_hf_mesh.json" with { type: "json" };
import windowPanel from "./assets/models/wreck_window_hf_mesh.json" with { type: "json" };
import boiler from "./assets/models/wreck_boiler_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import liner_sofa from "./assets/models/liner_sofa_hf_mesh.json" with { type: "json" };
import liner_bed from "./assets/models/liner_bed_hf_mesh.json" with { type: "json" };
import liner_wardrobe from "./assets/models/liner_wardrobe_hf_mesh.json" with { type: "json" };
import liner_trunk from "./assets/models/liner_trunk_hf_mesh.json" with { type: "json" };
const definitions = {
  liner_sofa: [
    liner_sofa,
    new URL("./assets/models/liner_sofa_hf_color.webp", import.meta.url),
  ],
  liner_bed: [
    liner_bed,
    new URL("./assets/models/liner_bed_hf_color.webp", import.meta.url),
  ],
  liner_wardrobe: [
    liner_wardrobe,
    new URL("./assets/models/liner_wardrobe_hf_color.webp", import.meta.url),
  ],
  liner_trunk: [
    liner_trunk,
    new URL("./assets/models/liner_trunk_hf_color.webp", import.meta.url),
  ],

  wreck_funnel: [
    funnel,
    new URL("./assets/models/wreck_funnel_hf_color.webp", import.meta.url),
  ],
  wreck_window: [
    windowPanel,
    new URL("./assets/models/wreck_window_hf_color.webp", import.meta.url),
  ],
  wreck_boiler: [
    boiler,
    new URL("./assets/models/wreck_boiler_hf_color.webp", import.meta.url),
  ],
};
const cache = new Map();

/** 沉船构件保留原 HF 配色与后备顶点色；场景实例共享资源，最后一个所有者释放。 */
export function acquireBermudaWreckAsset(kind) {
  if (!definitions[kind]) throw new Error(`Unknown wreck asset: ${kind}`);
  if (!cache.has(kind)) {
    const [packed, url] = definitions[kind];
    const geometry = decodeOrganicMesh(packed, null, (x, y, z, c) =>
      c.set(0x6d7777),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.87,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    material.color.setScalar(1.15);
    material.name = `${kind}_hf_surface`;
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
      if (--asset.references > 0) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      asset.material.dispose();
      if (cache.get(kind) === asset) cache.delete(kind);
    },
  };
}
