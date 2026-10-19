import { createMaterialPreparation } from "./material_loading.js";
import * as THREE from "three";
import flying_fish from "./assets/models/flying_fish_hf_mesh.json" with { type: "json" };
import fish from "./assets/models/fish_hf_mesh.json" with { type: "json" };
import mackerel from "./assets/models/mackerel_hf_mesh.json" with { type: "json" };
import sardine from "./assets/models/sardine_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
const data = { flying_fish, fish, mackerel, sardine };
const urls = {
  flying_fish: new URL(
    "./assets/models/flying_fish_hf_color.webp",
    import.meta.url,
  ),
  fish: new URL("./assets/models/fish_hf_color.webp", import.meta.url),
  mackerel: new URL("./assets/models/mackerel_hf_color.webp", import.meta.url),
  sardine: new URL("./assets/models/sardine_hf_color.webp", import.meta.url),
};
const cache = new Map();

/** 四种生物分别共享实体与色图；每个实例保留独立的解剖骨架。 */
export function hawaiiBatch9Asset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    color.set(kind === "fish" ? 0xbba851 : 0x7b9ca3);
    color.multiplyScalar(
      THREE.MathUtils.lerp(
        0.65,
        1.2,
        THREE.MathUtils.smoothstep(-y, -0.08, 0.08),
      ),
    );
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.65,
    metalness: 0,
    vertexColors: true,
  });
  material.name = `${kind}_hf_skin`;
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      #ifdef USE_MAP
        float skinLum = dot(diffuseColor.rgb, vec3(0.2126,0.7152,0.0722));
        vec3 skin = pow(max(diffuseColor.rgb,vec3(0.0)),vec3(0.79)) * 0.91;
        diffuseColor.rgb = mix(diffuseColor.rgb,skin,smoothstep(0.001,0.012,skinLum));
      #endif`,
    );
  };
  material.customProgramCacheKey = () => `hawaii_batch9_${kind}_albedo_v1`;
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
