import * as T from "three";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import ambrosia_sprat from "./assets/models/ambrosia_sprat_hf_mesh.json" with { type: "json" };
import moon_scallop from "./assets/models/moon_scallop_hf_mesh.json" with { type: "json" };
import lyre_ray from "./assets/models/lyre_ray_hf_mesh.json" with { type: "json" };
import pearl_seahorse from "./assets/models/pearl_seahorse_hf_mesh.json" with { type: "json" };
export const ODYSSEY_SHALLOW_HF_DATA = {
  ambrosia_sprat,
  moon_scallop,
  lyre_ray,
  pearl_seahorse,
};
const urls = {
  ambrosia_sprat: new URL(
    "./assets/models/ambrosia_sprat_hf_color.webp",
    import.meta.url,
  ),
  moon_scallop: new URL(
    "./assets/models/moon_scallop_hf_color.webp",
    import.meta.url,
  ),
  lyre_ray: new URL("./assets/models/lyre_ray_hf_color.webp", import.meta.url),
  pearl_seahorse: new URL(
    "./assets/models/pearl_seahorse_hf_color.webp",
    import.meta.url,
  ),
};
const colors = {
  ambrosia_sprat: 0xb08a56,
  moon_scallop: 0xc9b8c1,
  lyre_ray: 0x679da7,
  pearl_seahorse: 0xc7b38b,
};
const cache = new Map();
/** 四种表面共用加载队列；颜色失败可重试，单个实例仅拥有骨架。 */
export function odysseyShallowHFAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(
    ODYSSEY_SHALLOW_HF_DATA[kind],
    bind,
    (x, y, z, c) => c.set(colors[kind]),
  );
  const material = new T.MeshStandardMaterial({
    roughness: 0.76,
    metalness: 0,
    vertexColors: true,
  });
  material.name = `${kind}_hf_skin`;
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: urls[kind],
        colorSpace: T.SRGBColorSpace,
        apply(texture) {
          material.map = texture;
          material.vertexColors = kind === "pearl_seahorse";
          if (material.vertexColors) {
            // The source eyes have irises but no pupils. Tint only the fitted
            // eye surface; white elsewhere preserves the atlas exactly.
            const p = geometry.attributes.position,
              c = geometry.attributes.color;
            for (let i = 0; i < p.count; i++) {
              const r = Math.hypot(
                (p.getY(i) - 0.715) / 0.021,
                (p.getZ(i) + 0.245) / 0.018,
              );
              const ink =
                Math.abs(p.getX(i)) > 0.07
                  ? 1 - T.MathUtils.smoothstep(r, 0.65, 1.25)
                  : 0;
              const shade = 1 - 0.96 * ink;
              c.setXYZ(i, shade, shade, shade);
            }
            c.needsUpdate = true;
          }
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
