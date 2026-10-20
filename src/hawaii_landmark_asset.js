import * as THREE from "three";
import wreck from "./assets/models/wreck_hf_mesh.json" with { type: "json" };
import whale from "./assets/models/whale_hf_mesh.json" with { type: "json" };
import temple from "./assets/models/temple_hf_mesh.json" with { type: "json" };
import gate from "./assets/models/gate_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const definitions = {
  wreck: [
    wreck,
    new URL("./assets/models/wreck_hf_color.webp", import.meta.url),
  ],
  whale: [
    whale,
    new URL("./assets/models/whale_hf_color.webp", import.meta.url),
  ],
  temple: [
    temple,
    new URL("./assets/models/temple_hf_color.webp", import.meta.url),
  ],
  gate: [gate, new URL("./assets/models/gate_hf_color.webp", import.meta.url)],
};
const cache = new Map();

/** 地标静态网格按类别共享；材质失败时保留源顶点色，最后一个场景释放资源。 */
export function acquireHawaiiLandmarkAsset(kind) {
  const definition = definitions[kind];
  if (!definition) throw new Error(`Unknown Hawaii landmark: ${kind}`);
  if (!cache.has(kind)) {
    const [packed, url] = definition;
    const geometry = decodeOrganicMesh(packed, null, (_x, _y, _z, c) =>
      c.set(0x7b8274),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: kind === "whale" ? 0.76 : 0.92,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    material.name = `hawaii_${kind}_hf_surface`;
    const asset = { geometry, material, references: 0, prepare: null };
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
