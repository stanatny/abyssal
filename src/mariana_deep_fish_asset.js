import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { prepareBarreleyeHead } from "./mariana_barreleye_head.js";
import barreleye from "./assets/models/barreleye_hf_mesh.json" with { type: "json" };
import dragonfish from "./assets/models/dragonfish_hf_mesh.json" with { type: "json" };
import snailfish from "./assets/models/snailfish_hf_mesh.json" with { type: "json" };
const data = { barreleye, dragonfish, snailfish },
  urls = {
    barreleye: new URL(
      "./assets/models/barreleye_hf_color.webp",
      import.meta.url,
    ),
    dragonfish: new URL(
      "./assets/models/dragonfish_hf_color.webp",
      import.meta.url,
    ),
    snailfish: new URL(
      "./assets/models/snailfish_hf_color.webp",
      import.meta.url,
    ),
  };
const cache = new Map();
export function marianaDeepFishAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) =>
    color.set(
      kind === "snailfish"
        ? y < 0
          ? 0xe6d3d0
          : 0xcbadad
        : kind === "dragonfish"
          ? 0x252e36
          : 0x504b3d,
    ),
  );
  const material = new THREE.MeshStandardMaterial({
    roughness: kind === "snailfish" ? 0.7 : 0.64,
    metalness: 0,
    vertexColors: true,
  });
  material.name = `${kind}_hf_skin`;
  if (kind === "dragonfish") {
    material.onBeforeCompile = (s) => {
      s.vertexShader = "varying vec3 deepRest;\n" + s.vertexShader;
      s.vertexShader = s.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ndeepRest=position;",
      );
      s.fragmentShader = "varying vec3 deepRest;\n" + s.fragmentShader;
      s.fragmentShader = s.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float rowY=-0.027+0.019*smoothstep(-0.16,0.32,deepRest.z);
        float dots=1.0-smoothstep(.58,1.0,length(vec2((deepRest.y-rowY)/.003,(fract(deepRest.z*39.0)-.5)/.15)));
        float span=smoothstep(-.27,-.23,deepRest.z)*(1.0-smoothstep(.29,.33,deepRest.z));
        totalEmissiveRadiance+=vec3(.12,.65,.88)*dots*span*.9;
      `,
      );
    };
    material.customProgramCacheKey = () => "mariana_dragonfish_photophores_v1";
  }
  const head =
    kind === "barreleye" ? prepareBarreleyeHead(geometry, material) : null;
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
  const asset = { geometry, material, prepare, head };
  cache.set(kind, asset);
  return asset;
}
