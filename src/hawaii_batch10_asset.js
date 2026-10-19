import { createMaterialPreparation } from "./material_loading.js";
import * as THREE from "three";
import herring from "./assets/models/herring_hf_mesh.json" with { type: "json" };
import anchovy from "./assets/models/anchovy_hf_mesh.json" with { type: "json" };
import moon_jelly from "./assets/models/moon_jelly_hf_mesh.json" with { type: "json" };
import spiny_lobster from "./assets/models/spiny_lobster_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
const data = { herring, anchovy, moon_jelly, spiny_lobster };
const urls = {
  herring: new URL("./assets/models/herring_hf_color.webp", import.meta.url),
  anchovy: new URL("./assets/models/anchovy_hf_color.webp", import.meta.url),
  moon_jelly: new URL(
    "./assets/models/moon_jelly_hf_color.webp",
    import.meta.url,
  ),
  spiny_lobster: new URL(
    "./assets/models/spiny_lobster_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();

/** 四种生物分别共享实体与色图；每个实例保留独立的解剖骨架。 */
export function hawaiiBatch10Asset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    color.set(
      kind === "spiny_lobster"
        ? 0xa9764d
        : kind === "moon_jelly"
          ? 0xaac8df
          : 0x7b9ca3,
    );
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
    ...(kind === "moon_jelly"
      ? {
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
          side: THREE.FrontSide,
        }
      : {}),
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
  material.customProgramCacheKey = () => `hawaii_batch10_${kind}_albedo_v1`;
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
