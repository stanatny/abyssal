import * as THREE from "three";
import packed from "./assets/models/crimson_sail_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

let cached;
/** 珍兽实例共用表面与色图，独立骨架只负责局部显示动作。 */
export function crimsonSailAsset(bind) {
  if (cached) return cached;
  const geometry = decodeOrganicMesh(packed, bind, (x, y, z, c) =>
    c.set(y > 0 ? 0x8d2943 : 0xb39a98),
  );
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.65,
    metalness: 0,
    vertexColors: true,
  });
  material.name = "crimson_sail_hf_skin";
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: new URL(
          "./assets/models/crimson_sail_hf_color.webp",
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
