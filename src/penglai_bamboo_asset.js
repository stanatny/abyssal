import * as THREE from "three";
import packed from "./assets/models/bamboo_clump_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

/** 竹丛在地图内共用网格和贴图；纹理失败时保留原始 HF 顶点色。 */
export function createPenglaiBambooAsset(keep) {
  const geometry = keep(
    decodeOrganicMesh(packed, null, (x, y, z, c) => c.set(0x63823d)),
  );
  geometry.deleteAttribute("skinIndex");
  geometry.deleteAttribute("skinWeight");
  geometry.translate(0, -packed.min[1], 0);
  geometry.scale(20, 20, 20);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = keep(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
  );
  material.name = "penglai_bamboo_hf";
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: new URL(
          "./assets/models/bamboo_clump_hf_color.webp",
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
  keep({ dispose: prepare.dispose });
  geometry.userData.prepareMaterials = prepare;
  geometry.userData.hfGardenKind = "bamboo_clump";
  prepare();
  return { geometry, material, prepare };
}
