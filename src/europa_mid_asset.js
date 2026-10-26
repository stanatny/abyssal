import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import brine_rosette from "./assets/models/brine_rosette_hf_mesh.json" with { type: "json" };
import hinge_walker from "./assets/models/hinge_walker_hf_mesh.json" with { type: "json" };
import lantern_pod from "./assets/models/lantern_pod_hf_mesh.json" with { type: "json" };
import veil_glider from "./assets/models/veil_glider_hf_mesh.json" with { type: "json" };
const data = { brine_rosette, hinge_walker, lantern_pod, veil_glider };
const urls = {
  brine_rosette: new URL(
    "./assets/models/brine_rosette_hf_color.webp",
    import.meta.url,
  ),
  hinge_walker: new URL(
    "./assets/models/hinge_walker_hf_color.webp",
    import.meta.url,
  ),
  lantern_pod: new URL(
    "./assets/models/lantern_pod_hf_color.webp",
    import.meta.url,
  ),
  veil_glider: new URL(
    "./assets/models/veil_glider_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 每种木卫二生物共享不可变表面和贴图重试队列，各实例保留独立骨架。 */
export function europaMidAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    const palette = {
      brine_rosette: y > -0.1 ? 0xbfa486 : 0x725745,
      hinge_walker: 0x6b7678,
      lantern_pod: 0xbaa482,
      veil_glider: 0x506878,
    };
    color.setHex(palette[kind]);
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.75,
    metalness: 0,
    vertexColors: true,
  });
  material.name = `${kind}_hf_skin`;
  // 只有内囊暖色区域透出柔光，硬肋继续受场景光照；不增加灯光。
  if (kind === "lantern_pod") {
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
         float organ = smoothstep(1.08, 1.55, diffuseColor.r / max(diffuseColor.g, 0.01))
           * smoothstep(1.3, 2.0, diffuseColor.g / max(diffuseColor.b, 0.01));
         totalEmissiveRadiance += diffuseColor.rgb * organ * 0.22;`,
      );
    };
    material.customProgramCacheKey = () => "europa_lantern_organ_v1";
  }
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
