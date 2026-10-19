import { createMaterialPreparation } from "./material_loading.js";
import * as THREE from "three";
import wrasse from "./assets/models/wrasse_hf_mesh.json" with { type: "json" };
import parrotfish from "./assets/models/parrotfish_hf_mesh.json" with { type: "json" };
import boxfish from "./assets/models/boxfish_hf_mesh.json" with { type: "json" };
import angler from "./assets/models/angler_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
const data = { wrasse, parrotfish, boxfish, angler };
const urls = {
  wrasse: new URL("./assets/models/wrasse_hf_color.webp", import.meta.url),
  parrotfish: new URL(
    "./assets/models/parrotfish_hf_color.webp",
    import.meta.url,
  ),
  boxfish: new URL("./assets/models/boxfish_hf_color.webp", import.meta.url),
  angler: new URL("./assets/models/angler_hf_color.webp", import.meta.url),
};
const cache = new Map();

/** 四种生物分别共享实体与色图；每个实例保留独立的解剖骨架。 */
export function hawaiiBatch8Asset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    color.set(
      kind === "angler"
        ? 0x46342e
        : kind === "boxfish"
          ? 0xd6ac46
          : kind === "wrasse"
            ? 0x518f82
            : 0x829380,
    );
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: kind === "angler" ? 0.72 : 0.64,
    metalness: 0,
    vertexColors: true,
  });
  material.name = `${kind}_hf_skin`;
  material.onBeforeCompile = (shader) => {
    if (kind === "angler") {
      shader.vertexShader =
        "varying vec3 lureRest;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nlureRest = position;",
        );
      shader.fragmentShader =
        "varying vec3 lureRest;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float lure = 1.0-smoothstep(0.022,0.039,distance(lureRest,vec3(0.0,0.168,-0.479)));
        totalEmissiveRadiance += vec3(0.95,1.3,1.65)*lure;`,
      );
    }
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
  material.customProgramCacheKey = () => `hawaii_batch8_${kind}_albedo_lure_v1`;
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
