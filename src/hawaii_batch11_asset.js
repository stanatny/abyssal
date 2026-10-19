import { createMaterialPreparation } from "./material_loading.js";
import * as THREE from "three";
import golden_manta from "./assets/models/golden_manta_hf_mesh.json" with { type: "json" };
import seagull from "./assets/models/seagull_hf_mesh.json" with { type: "json" };
import tropicbird from "./assets/models/tropicbird_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
const data = { golden_manta, seagull, tropicbird };
const urls = {
  golden_manta: new URL(
    "./assets/models/golden_manta_hf_color.webp",
    import.meta.url,
  ),
  seagull: new URL("./assets/models/seagull_hf_color.webp", import.meta.url),
  tropicbird: new URL(
    "./assets/models/tropicbird_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();

/** 三种生物分别共享实体与色图；每个实例保留独立的解剖骨架。 */
export function hawaiiBatch11Asset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    color.set(kind === "golden_manta" ? 0xbca06a : 0xb8c5cb);
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
  material.customProgramCacheKey = () => `hawaii_batch11_${kind}_albedo_v1`;
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
