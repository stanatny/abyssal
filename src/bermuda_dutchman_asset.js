import * as THREE from "three";
import hull from "./assets/models/dutchman_hull_hf_mesh.json" with { type: "json" };
import sail from "./assets/models/dutchman_sail_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const definitions = {
  hull: [
    hull,
    new URL("./assets/models/dutchman_hull_hf_color.webp", import.meta.url),
  ],
  sail: [
    sail,
    new URL("./assets/models/dutchman_sail_hf_color.webp", import.meta.url),
  ],
};
const cache = new Map();

/** 船壳与七面残帆分别共享网格/材质；最后一个船队所有者负责释放。 */
export function acquireDutchmanAsset(kind) {
  if (!definitions[kind]) throw new Error(`Unknown Dutchman asset: ${kind}`);
  if (!cache.has(kind)) {
    const [packed, url] = definitions[kind];
    const geometry = decodeOrganicMesh(packed, null, (x, y, z, c) =>
      c.set(kind === "hull" ? 0x656659 : 0xa4aaa0),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: kind === "hull" ? 0.88 : 1,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    material.name = `dutchman_${kind}_hf_surface`;
    material.color.setScalar(kind === "hull" ? 1.8 : 1.0);
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
