import * as THREE from "three";
import packed from "./assets/models/river_driftwood_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
let cached;
/** 沉木共用实体网格和色图；场景持有引用，最后一个所有者回收完整资源。 */
export function acquireAmazonDriftwood() {
  if (!cached) {
    const geometry = decodeOrganicMesh(packed, null, (_x, _y, _z, c) =>
      c.set(0x796143),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    geometry.scale(14, 14, 14);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0,
    });
    material.name = "amazon_driftwood_hf_surface";
    const prepare = createMaterialPreparation(
      [
        {
          name: "color",
          url: new URL(
            "./assets/models/river_driftwood_hf_color.webp",
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
    cached = { geometry, material, prepare, references: 0 };
  }
  const asset = cached;
  asset.references++;
  let released = false;
  return {
    geometry: asset.geometry,
    material: asset.material,
    prepare: asset.prepare,
    release() {
      if (released) return;
      released = true;
      if (--asset.references) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      asset.material.dispose();
      if (cached === asset) cached = undefined;
    },
  };
}
