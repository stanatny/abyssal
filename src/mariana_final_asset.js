import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import shonisaurus from "./assets/models/shonisaurus_hf_mesh.json" with { type: "json" };
import glass_prawn from "./assets/models/glass_prawn_hf_mesh.json" with { type: "json" };
const data = { shonisaurus, glass_prawn };
const urls = {
  shonisaurus: new URL(
    "./assets/models/shonisaurus_hf_color.webp",
    import.meta.url,
  ),
  glass_prawn: new URL(
    "./assets/models/glass_prawn_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 两种马里亚纳独有生物共享只读表面，贴图准备沿用普通入口的重试所有权。 */
export function marianaFinalAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const prawn = kind === "glass_prawn";
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, c) =>
    c.set(prawn ? 0x8ec8d6 : y < 0 ? 0xbfc4bd : 0x4b6273),
  );
  const material = new THREE.MeshStandardMaterial({
    roughness: prawn ? 0.36 : 0.68,
    metalness: 0,
    vertexColors: true,
  });
  material.name = kind + "_hf_skin";
  if (prawn) {
    material.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
  float cyan=max(0.0,min(diffuseColor.g,diffuseColor.b)-diffuseColor.r*1.25);
  totalEmissiveRadiance+=vec3(.08,.6,.85)*cyan*.35;
  `,
      );
    };
    material.customProgramCacheKey = () => "mariana_prawn_soft_lantern_v1";
  }
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: urls[kind],
        colorSpace: THREE.SRGBColorSpace,
        apply(t) {
          material.map = t;
          material.vertexColors = false;
          material.needsUpdate = true;
        },
      },
    ],
    (ready) => (material.userData.texturesReady = ready),
  );
  const asset = { geometry, material, prepare };
  cache.set(kind, asset);
  return asset;
}
