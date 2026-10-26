import * as THREE from "three";
import data from "./assets/models/crystal_seraph_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

import { decodePackedArray } from "./packed_array.js";
export const seraphMembraneLabels = decodePackedArray(
  data.membraneLabels,
  Uint8Array,
);
let cached;
/** One immutable surface/color queue; each Seraph owns its own six-wing rig. */
export function europaRareAsset(bind) {
  if (cached) return cached;
  const geometry = decodeOrganicMesh(data, bind, (_x, y, _z, c) =>
    c.set(y > 0 ? 0xc4a8c4 : 0x997caa),
  );
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.68,
    metalness: 0,
    vertexColors: true,
    emissive: 0x88b7cf,
    emissiveIntensity: 0.3,
  });
  material.name = "crystal_seraph_hf_skin";
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = "varying float seraphZ;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nseraphZ = position.z;",
    );
    shader.fragmentShader = "varying float seraphZ;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= 1.0 - smoothstep(-0.44, -0.33, seraphZ);",
    );
  };
  material.customProgramCacheKey = () => "europa_seraph_sensory_tip_v1";
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: new URL(
          "./assets/models/crystal_seraph_hf_color.webp",
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
  cached = { geometry, material, prepare };
  return cached;
}
