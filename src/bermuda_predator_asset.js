import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import tiger_shark from "./assets/models/tiger_shark_hf_mesh.json" with { type: "json" };
import cameroceras from "./assets/models/cameroceras_hf_mesh.json" with { type: "json" };
import livyatan from "./assets/models/livyatan_hf_mesh.json" with { type: "json" };

const data = { tiger_shark, cameroceras, livyatan };
const urls = {
  tiger_shark: new URL(
    "./assets/models/tiger_shark_hf_color.webp",
    import.meta.url,
  ),
  cameroceras: new URL(
    "./assets/models/cameroceras_hf_color.webp",
    import.meta.url,
  ),
  livyatan: new URL("./assets/models/livyatan_hf_color.webp", import.meta.url),
};
const cache = new Map();

/** 实体表面只解码一次；贴图失败保留配色并由共用加载器重试。 */
export function bermudaPredatorAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    color.set(
      kind === "cameroceras"
        ? z > -0.16
          ? 0xb4ac8d
          : 0x8e806c
        : kind === "livyatan"
          ? y < -0.05
            ? 0x687779
            : 0x37454c
          : y < -0.055
            ? 0xb8bdb2
            : 0x6e7c7d,
    );
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: kind === "cameroceras" ? 0.74 : 0.67,
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
