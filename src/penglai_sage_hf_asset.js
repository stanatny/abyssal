import * as T from "three";
import data from "./assets/models/sword_sage_hf_mesh.json" with { type: "json" };
import { decodePackedArray } from "./packed_array.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import { applySageHairMaterial } from "./sage_hair_material.js";
let cache;
/** 人物保留生成的布纹与实体衣褶，复用共享贴图队列和失败重试。 */
export function penglaiSageHfAsset(bind) {
  if (cache) return cache;
  const sleeve = decodePackedArray(data.sleeveOwnership, Uint16Array);
  const geometry = decodeOrganicMesh(
    data,
    (x, y, z, ids, w, o, i) => bind(x, y, z, ids, w, o, sleeve[i] / 65535),
    (x, y, z, c) =>
      c.set(
        y > 0.3 ? 0xbdb7a2 : Math.abs(x) < 0.065 && z < 0 ? 0xc8c4af : 0x254a45,
      ),
  );
  const material = new T.MeshStandardMaterial({
    roughness: 0.83,
    metalness: 0,
    vertexColors: true,
  });
  applySageHairMaterial(material, geometry);
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: new URL(
          "./assets/models/sword_sage_hf_color.webp",
          import.meta.url,
        ),
        colorSpace: T.SRGBColorSpace,
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
  return (cache = { geometry, material, prepare });
}
