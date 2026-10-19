import { createMaterialPreparation } from "./material_loading.js";
import * as THREE from "three";
import archelon from "./assets/models/archelon_hf_mesh.json" with { type: "json" };
import turtle from "./assets/models/turtle_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";

const data = { archelon, turtle };
const urls = {
  archelon: new URL("./assets/models/archelon_hf_color.webp", import.meta.url),
  turtle: new URL("./assets/models/turtle_hf_color.webp", import.meta.url),
};
const cache = new Map();

/** 两种海龟分别共享实体与色图；每个实例保留独立的鳍肢骨架。 */
export function hawaiiTurtleAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    color.set(
      y < -0.025 ? 0xc2ba95 : kind === "archelon" ? 0x687060 : 0x7b784b,
    );
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: kind === "archelon" ? 0.77 : 0.67,
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
  material.customProgramCacheKey = () => "hawaii_turtle_albedo_v1";
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
