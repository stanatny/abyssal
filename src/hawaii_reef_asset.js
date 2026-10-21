import * as THREE from "three";
import reef_branch from "./assets/models/reef_branch_hf_mesh.json" with { type: "json" };
import reef_fan from "./assets/models/reef_fan_hf_mesh.json" with { type: "json" };
import reef_brain from "./assets/models/reef_brain_hf_mesh.json" with { type: "json" };
import reef_sponge from "./assets/models/reef_sponge_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const definitions = {
  reef_branch: [
    reef_branch,
    new URL("./assets/models/reef_branch_hf_color.webp", import.meta.url),
  ],
  reef_fan: [
    reef_fan,
    new URL("./assets/models/reef_fan_hf_color.webp", import.meta.url),
  ],
  reef_brain: [
    reef_brain,
    new URL("./assets/models/reef_brain_hf_color.webp", import.meta.url),
  ],
  reef_sponge: [
    reef_sponge,
    new URL("./assets/models/reef_sponge_hf_color.webp", import.meta.url),
  ],
};
const cache = new Map();

/** 珊瑚静态网格按类别共享；材质失败时保留源顶点色，最后一个场景释放资源。 */
export function acquireHawaiiReefAsset(kind) {
  const definition = definitions[kind];
  if (!definition) throw new Error(`Unknown Hawaii reef: ${kind}`);
  if (!cache.has(kind)) {
    const [packed, url] = definition;
    const geometry = decodeOrganicMesh(packed, null, (_x, _y, _z, c) =>
      c.set(0x7b8274),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    // 用完整原型替代旧枝条；统一缩放保留 HF 比例，根部归零后贴地。
    const box = geometry.boundingBox;
    const extent =
      kind === "reef_brain" ? box.max.x - box.min.x : box.max.y - box.min.y;
    const target = {
      reef_branch: 1.6,
      reef_fan: 1.22,
      reef_brain: 2,
      reef_sponge: 1.6,
    }[kind];
    geometry.translate(
      -(box.min.x + box.max.x) / 2,
      -box.min.y,
      -(box.min.z + box.max.z) / 2,
    );
    geometry.scale(target / extent, target / extent, target / extent);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const farGeometry = geometry.clone();
    const farIndex = Uint8Array.from(atob(packed.farIndex), (c) =>
      c.charCodeAt(0),
    );
    farGeometry.setIndex(
      new THREE.BufferAttribute(new Uint16Array(farIndex.buffer), 1),
    );
    const farNormal = Uint8Array.from(atob(packed.farNormal), (c) =>
      c.charCodeAt(0),
    );
    farGeometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(new Int16Array(farNormal.buffer), 3, true),
    );
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    material.name = `hawaii_${kind}_hf_surface`;
    const farMaterial = material.clone();
    farMaterial.name = `hawaii_${kind}_hf_distant`;
    const asset = {
      geometry,
      material,
      farGeometry,
      farMaterial,
      references: 0,
      prepare: null,
    };
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
    farGeometry: asset.farGeometry,
    farMaterial: asset.farMaterial,
    prepare: asset.prepare,
    release() {
      if (released) return;
      released = true;
      if (--asset.references) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      asset.material.dispose();
      asset.farGeometry.dispose();
      asset.farMaterial.dispose();
      if (cache.get(kind) === asset) cache.delete(kind);
    },
  };
}
