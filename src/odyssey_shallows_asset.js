import { decodePackedArray } from "./packed_array.js";
import * as THREE from "three";
import { acquireHawaiiReefAsset } from "./hawaii_reef_asset.js";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import amphora from "./assets/models/aegean_amphora_hf_mesh.json" with { type: "json" };

/** 已验收珊瑚共用引用计数缓存；新陶罐由本地图独立持有。 */
export function createOdysseyShallowAssets(keep) {
  const assets = {};
  for (const kind of ["reef_branch", "reef_fan", "reef_sponge"]) {
    const asset = acquireHawaiiReefAsset(kind);
    keep({ dispose: asset.release });
    asset.prepare();
    assets[kind] = asset;
  }
  const geometry = keep(
    decodeOrganicMesh(amphora, null, (_x, _y, _z, c) => c.set(0x9f6640)),
  );
  geometry.deleteAttribute("skinIndex");
  geometry.deleteAttribute("skinWeight");
  geometry.translate(0, -amphora.min[1], 0);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const farGeometry = keep(geometry.clone());
  farGeometry.setIndex(
    new THREE.BufferAttribute(
      decodePackedArray(amphora.farIndex, Uint16Array),
      1,
    ),
  );
  farGeometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(
      decodePackedArray(amphora.farNormal, Int16Array),
      3,
      true,
    ),
  );
  const material = keep(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
  );
  material.name = "odyssey_aegean_amphora_hf";
  const farMaterial = keep(material.clone());
  farMaterial.name = "odyssey_aegean_amphora_distant";
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: new URL(
          "./assets/models/aegean_amphora_hf_color.webp",
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
    (ready) => (material.userData.texturesReady = ready),
  );
  keep({ dispose: prepare.dispose });
  prepare();
  assets.aegean_amphora = {
    geometry,
    material,
    farGeometry,
    farMaterial,
    prepare,
  };
  return assets;
}
