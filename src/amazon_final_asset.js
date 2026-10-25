import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import green_anaconda from "./assets/models/green_anaconda_hf_mesh.json" with { type: "json" };
import titanoboa from "./assets/models/titanoboa_hf_mesh.json" with { type: "json" };
import stupendemys from "./assets/models/stupendemys_hf_mesh.json" with { type: "json" };
import flood_arapaima from "./assets/models/flood_arapaima_hf_mesh.json" with { type: "json" };
const data = {
  green_anaconda,
  titanoboa,
  stupendemys,
  flood_arapaima,
};
const urls = {
  green_anaconda: new URL(
    "./assets/models/green_anaconda_hf_color.webp",
    import.meta.url,
  ),
  titanoboa: new URL(
    "./assets/models/titanoboa_hf_color.webp",
    import.meta.url,
  ),
  stupendemys: new URL(
    "./assets/models/stupendemys_hf_color.webp",
    import.meta.url,
  ),
  flood_arapaima: new URL(
    "./assets/models/flood_arapaima_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
/** 两种蛇、淡水巨龟和洪流巨骨鱼共享各自不可变网格和可重试色图，骨架归实例所有。 */
export function amazonFinalAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, c) =>
    c.setHex(
      y < -0.015
        ? 0x9b916e
        : {
            green_anaconda: 0x6e7444,
            titanoboa: 0x715b43,
            stupendemys: 0x776247,
            flood_arapaima: 0x4c695f,
          }[kind],
    ),
  );
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.76,
    metalness: 0,
    vertexColors: true,
  });
  material.name = kind + "_hf_skin";
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
    (ready) => (material.userData.texturesReady = ready),
  );
  const asset = { geometry, material, prepare, packed: data[kind] };
  cache.set(kind, asset);
  return asset;
}
