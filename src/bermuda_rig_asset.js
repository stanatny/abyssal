import * as THREE from "three";
import packedRig from "./assets/models/oil_rig_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
const definition = [
  packedRig,
  new URL("./assets/models/oil_rig_hf_color.webp", import.meta.url),
];
const cache = new Map();

/** 油井上层保留原 HF 配色与后备顶点色；场景实例共享资源，最后一个所有者释放。 */
export function acquireBermudaRigAsset() {
  const kind = "oil_rig";
  if (!cache.has(kind)) {
    const [packed, url] = definition;
    const geometry = decodeOrganicMesh(packed, null, (x, y, z, c) =>
      c.set(0x6d7777),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.87,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    material.color.setScalar(1.5);
    material.name = `${kind}_hf_topside`;
    const asset = { geometry, material, references: 0 };
    asset.prepare = createMaterialPreparation(
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
    cache.set(kind, asset);
  }
  const asset = cache.get(kind);
  asset.references++;
  let released = false;
  return {
    geometry: asset.geometry,
    material: asset.material,
    prepare: asset.prepare,
    release() {
      if (released) return;
      released = true;
      if (--asset.references > 0) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      asset.material.dispose();
      if (cache.get(kind) === asset) cache.delete(kind);
    },
  };
}
