import * as THREE from "three";
import poseidon from "./assets/models/poseidon_hf_mesh.json" with { type: "json" };
import obelisk from "./assets/models/obelisk_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
const definitions = {
  poseidon: [
    poseidon,
    new URL("./assets/models/poseidon_hf_color.webp", import.meta.url),
  ],
  obelisk: [
    obelisk,
    new URL("./assets/models/obelisk_hf_color.webp", import.meta.url),
  ],
};
const cache = new Map();
/** 纪念碑共享雕刻网格和原始色图；城市所有者引用归零时释放，失败保留同源顶点色。 */
export function acquireAtlantisMonumentAsset(kind) {
  if (!definitions[kind]) throw Error(`Unknown Atlantis monument: ${kind}`);
  if (!cache.has(kind)) {
    const [packed, url] = definitions[kind];
    const geometry = decodeOrganicMesh(packed, null, (x, y, z, c) =>
      c.set(0xb7b4a2),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.86,
      metalness: 0.06,
      side: THREE.DoubleSide,
    });
    material.name = `atlantis_${kind}_hf_stone`;
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
