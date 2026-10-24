import { decodePackedArray } from "./packed_array.js";
import * as THREE from "three";
import arch from "./assets/models/bermuda_arch_hf_mesh.json" with { type: "json" };
import spire from "./assets/models/bermuda_spire_hf_mesh.json" with { type: "json" };
import rock from "./assets/models/bermuda_rock_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const definitions = {
  arch: [
    arch,
    new URL("./assets/models/bermuda_arch_hf_color.webp", import.meta.url),
  ],
  spire: [
    spire,
    new URL("./assets/models/bermuda_spire_hf_color.webp", import.meta.url),
  ],
  rock: [
    rock,
    new URL("./assets/models/bermuda_rock_hf_color.webp", import.meta.url),
  ],
};
const cache = new Map();

/** 岩体静态网格按类别共享；材质失败时保留源顶点色，最后一个场景释放资源。 */
export function acquireBermudaGeologyAsset(kind) {
  const definition = definitions[kind];
  if (!definition) throw new Error(`Unknown Bermuda geology: ${kind}`);
  if (!cache.has(kind)) {
    const [packed, url] = definition;
    const geometry = decodeOrganicMesh(packed, null, (_x, _y, _z, c) =>
      c.set(0x7b8274),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const farGeometry = geometry.clone();
    const farIndex = decodePackedArray(packed.farIndex, Uint16Array);
    farGeometry.setIndex(new THREE.BufferAttribute(farIndex, 1));
    const farNormal = decodePackedArray(packed.farNormal, Int16Array);
    farGeometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(farNormal, 3, true),
    );
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    material.name = `bermuda_${kind}_hf_surface`;
    const farMaterial = material.clone();
    farMaterial.name = `bermuda_${kind}_hf_distant`;
    const asset = {
      geometry,
      material,
      farGeometry,
      farMaterial,
      references: 0,
      prepare: null,
    };
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
    farGeometry: asset.farGeometry,
    farMaterial: asset.farMaterial,
    prepare: asset.prepare,
    release() {
      if (released) return;
      released = true;
      if (--asset.references) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      asset.material.dispose();
      asset.farGeometry.dispose();
      asset.farMaterial.dispose();
      if (cache.get(kind) === asset) cache.delete(kind);
    },
  };
}
