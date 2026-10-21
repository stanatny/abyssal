import * as THREE from "three";
import fisher from "./assets/models/fisher_hf_mesh.json" with { type: "json" };
import ketch from "./assets/models/ketch_hf_mesh.json" with { type: "json" };
import launch from "./assets/models/launch_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const definitions = {
  fisher: [
    fisher,
    new URL("./assets/models/fisher_hf_color.webp", import.meta.url),
  ],
  ketch: [
    ketch,
    new URL("./assets/models/ketch_hf_color.webp", import.meta.url),
  ],
  launch: [
    launch,
    new URL("./assets/models/launch_hf_color.webp", import.meta.url),
  ],
};
const cache = new Map();

/** 夜航船保留原始 HF 配色与低面后备色；多个区域实例共享资源并独立释放。 */
export function acquireAtlantisFleetAsset(kind) {
  const definition = definitions[kind];
  if (!definition) throw new Error(`Unknown Atlantis ship: ${kind}`);
  if (!cache.has(kind)) {
    const [packed, url] = definition;
    const geometry = decodeOrganicMesh(packed, null, (x, y, z, c) =>
      c.set(0x6d7777),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.78,
      metalness: 0.03,
      side: THREE.DoubleSide,
    });
    material.name = `${kind}_hf_hull_and_superstructure`;
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
