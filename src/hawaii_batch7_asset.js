import { createMaterialPreparation } from "./material_loading.js";
import * as THREE from "three";
import ray from "./assets/models/ray_hf_mesh.json" with { type: "json" };
import sunfish from "./assets/models/sunfish_hf_mesh.json" with { type: "json" };
import tuna from "./assets/models/tuna_hf_mesh.json" with { type: "json" };
import octopus from "./assets/models/octopus_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { prepareOctopusJetPose } from "./octopus_jet_pose.js";
const data = { ray, sunfish, tuna, octopus };
const urls = {
  ray: new URL("./assets/models/ray_hf_color.webp", import.meta.url),
  sunfish: new URL("./assets/models/sunfish_hf_color.webp", import.meta.url),
  tuna: new URL("./assets/models/tuna_hf_color.webp", import.meta.url),
  octopus: new URL("./assets/models/octopus_hf_color.webp", import.meta.url),
};
const cache = new Map();

// 翻车鱼保持高而短的侧影，只压薄左右轴；胸鳍支点使用同一个比例。
export const SUNFISH_LATERAL_SCALE = 0.66;

/** 返回独立的游进骨架支点；与离线蒙皮使用相同网格和配置。 */
export function octopusSwimAnatomy() {
  return octopus.swimChains.map((chain) => ({
    ...chain,
    points: chain.points.map((point) => [...point]),
  }));
}

/** 四种生物分别共享实体与色图；每个实例保留独立的解剖骨架。 */
export function hawaiiBatch7Asset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(
    data[kind],
    kind === "octopus" ? null : bind,
    (x, y, z, color) => {
      color.set(
        kind === "octopus"
          ? 0xb96b49
          : y < 0
            ? 0xc2c8c3
            : kind === "ray"
              ? 0x3c4850
              : kind === "tuna"
                ? 0x526978
                : 0x8e9b9d,
      );
    },
  );
  if (kind === "sunfish") geometry.scale(SUNFISH_LATERAL_SCALE, 1, 1);
  if (kind === "octopus") prepareOctopusJetPose(geometry, octopus.jetPose);
  const material = new THREE.MeshStandardMaterial({
    roughness: kind === "tuna" ? 0.5 : kind === "ray" ? 0.68 : 0.73,
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
  material.customProgramCacheKey = () => "hawaii_batch7_albedo_v1";
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
