import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import moorish_idol from "./assets/models/moorish_idol_hf_mesh.json" with { type: "json" };
import lanternfish from "./assets/models/lanternfish_hf_mesh.json" with { type: "json" };
import goblin_shark from "./assets/models/goblin_shark_hf_mesh.json" with { type: "json" };
const data = { moorish_idol, lanternfish, goblin_shark };
const urls = {
  moorish_idol: new URL(
    "./assets/models/moorish_idol_hf_color.webp",
    import.meta.url,
  ),
  lanternfish: new URL(
    "./assets/models/lanternfish_hf_color.webp",
    import.meta.url,
  ),
  goblin_shark: new URL(
    "./assets/models/goblin_shark_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 共用表面、重试色图，独立骨架；加载失败仍保留各物种的基本配色。 */
export function marianaFishAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    color.set(
      kind === "goblin_shark"
        ? y < 0
          ? 0xd8b9b5
          : 0xb39199
        : kind === "lanternfish"
          ? y < 0
            ? 0xaab8bc
            : 0x354c59
          : Math.sin((z + 0.5) * 22) > 0.2
            ? 0x20262a
            : y < 0
              ? 0xe3dfc0
              : 0xe0ca61,
    );
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.68,
    metalness: 0,
    vertexColors: true,
  });
  material.name = `${kind}_hf_skin`;
  if (kind === "lanternfish") {
    // 保留色图中的发光器，并沿实际腹侧补一排小光点；不增加绘制或光源。
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = "varying vec3 lanternRest;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nlanternRest = position;",
      );
      shader.fragmentShader =
        "varying vec3 lanternRest;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        #ifdef USE_MAP
          float belly = (1.0-smoothstep(-0.025,0.005,lanternRest.y))*(1.0-smoothstep(0.30,0.36,lanternRest.z));
          float cyan = smoothstep(0.13,0.27,diffuseColor.b-diffuseColor.r)*smoothstep(0.06,0.17,diffuseColor.g-diffuseColor.r);
          float rowY = -0.073 + 0.066*smoothstep(-0.13,0.34,lanternRest.z);
          float dots = 1.0-smoothstep(0.65,1.0,length(vec2((lanternRest.y-rowY)/0.0045,(fract(lanternRest.z*42.0)-0.5)/0.20)));
          float body = smoothstep(-0.34,-0.30,lanternRest.z)*(1.0-smoothstep(0.28,0.33,lanternRest.z))*(1.0-smoothstep(0.057,0.07,abs(lanternRest.x)));
          totalEmissiveRadiance += vec3(0.12,0.65,0.9)*max(cyan*belly, dots*body)*1.6;
        #endif`,
      );
    };
    material.customProgramCacheKey = () => "mariana_lantern_photophores_v1";
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
