import * as THREE from "three";
import dragon from "./assets/models/dragon_column_hf_mesh.json" with { type: "json" };
import tiger from "./assets/models/tiger_que_hf_mesh.json" with { type: "json" };
import bird from "./assets/models/vermilion_statue_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
const definitions = {
  dragon_column: [
    dragon,
    new URL("./assets/models/dragon_column_hf_color.webp", import.meta.url),
  ],
  tiger_que: [
    tiger,
    new URL("./assets/models/tiger_que_hf_color.webp", import.meta.url),
  ],
  vermilion_statue: [
    bird,
    new URL("./assets/models/vermilion_statue_hf_color.webp", import.meta.url),
  ],
};
/** 资源只在本地图内共享；离开后连同下载队列、位图和显存一起释放。 */
export function createPenglaiLandmarkAsset(kind, keep) {
  const [packed, url] = definitions[kind];
  const geometry = keep(
    decodeOrganicMesh(packed, null, (x, y, z, c) => c.set(0xaeb5a4)),
  );
  geometry.deleteAttribute("skinIndex");
  geometry.deleteAttribute("skinWeight");
  const bronze = kind === "vermilion_statue";
  const material = keep(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: bronze ? 0.7 : 0.88,
      metalness: bronze ? 0.22 : 0,
    }),
  );
  material.name = `penglai_${kind}_hf`;
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url,
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
  keep({ dispose: prepare.dispose });
  prepare();
  return { geometry, material, prepare, packed };
}
