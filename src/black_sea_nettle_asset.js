import * as THREE from "three";
import data from "./assets/models/black_sea_nettle_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

export const BLACK_SEA_NETTLE_ARMS = Object.freeze(
  data.oralArmChains.map((points) =>
    Object.freeze(points.map((p) => Object.freeze([...p]))),
  ),
);
export const BLACK_SEA_NETTLE_DIMENSIONS = Object.freeze({
  unit: "per one bell diameter",
  bellDiameter: 1,
  totalHeight: data.max[1] - data.min[1],
  belowBellOrigin: -data.min[1],
  oralArmCount: 4,
  sourceSha256: data.sourceSha256,
});
let cache;

/** 四根口腕与伞体保留同一 HF 实体；世界和图鉴共享色图与静态几何。 */
export function blackSeaNettleAsset(bind) {
  if (cache) return cache;
  const geometry = decodeOrganicMesh(data, bind, (x, y, z, color) => {
    color.set(y > -0.3 ? 0x452340 : 0xc59ab7);
    color.multiplyScalar(0.92 + Math.sin(x * 9 + z * 7) * 0.04);
  });
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.4,
    metalness: 0,
    transparent: true,
    opacity: 0.92,
    // 半透明伞体仍需写入自身深度，避免前后面按索引顺序叠出亮暗三角块。
    depthWrite: true,
    side: THREE.FrontSide,
  });
  material.name = "black_sea_nettle_hf_skin";
  material.onBeforeCompile = (shader) => {
    // 只平衡原色图的暗部；不以发光球或光晕冒充伞体。
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      #ifdef USE_MAP
        diffuseColor.rgb = pow(max(diffuseColor.rgb, vec3(0.0)), vec3(0.82)) * 0.95;
      #endif`,
    );
  };
  material.customProgramCacheKey = () => "black_sea_nettle_source_albedo_v1";
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: new URL(
          "./assets/models/black_sea_nettle_hf_color.webp",
          import.meta.url,
        ),
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
  cache = { geometry, material, prepare };
  return cache;
}
