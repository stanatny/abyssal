import * as THREE from "three";
import hydra from "./assets/models/hydra_chimneys_hf_mesh.json" with { type: "json" };
import kraken from "./assets/models/kraken_grotto_hf_mesh.json" with { type: "json" };
import maja from "./assets/models/maja_ribs_hf_mesh.json" with { type: "json" };
import leviathan from "./assets/models/leviathan_folds_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const entries = {
  hydra: [
    hydra,
    new URL("./assets/models/hydra_chimneys_hf_color.webp", import.meta.url),
  ],
  kraken: [
    kraken,
    new URL("./assets/models/kraken_grotto_hf_color.webp", import.meta.url),
  ],
  maja: [
    maja,
    new URL("./assets/models/maja_ribs_hf_color.webp", import.meta.url),
  ],
  leviathan: [
    leviathan,
    new URL("./assets/models/leviathan_folds_hf_color.webp", import.meta.url),
  ],
};
const cache = new Map();

/** 四层地貌各自持有真实 HF 原型；纹理失败时保留同源顶点色，末个引用负责回收。 */
export function acquireMarianaStrataAsset(kind) {
  if (!entries[kind]) throw new TypeError(`Unknown Mariana strata: ${kind}`);
  if (!cache.has(kind)) {
    const [packed, url] = entries[kind];
    const geometry = decodeOrganicMesh(packed, null, (_x, _y, _z, c) =>
      c.set(0x778887),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0,
    });
    material.name = `mariana_${kind}_hf_strata`;
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
