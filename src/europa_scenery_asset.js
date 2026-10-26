import * as THREE from "three";
import bow from "./assets/models/europa_wreck_bow_hf_mesh.json" with { type: "json" };
import vent from "./assets/models/europa_mineral_vent_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { decodePackedArray } from "./packed_array.js";
import { createMaterialPreparation } from "./material_loading.js";
import consoleAsset from "./assets/models/europa_lab_console_hf_mesh.json" with { type: "json" };
const definitions = {
  console: [
    consoleAsset,
    new URL(
      "./assets/models/europa_lab_console_hf_color.webp",
      import.meta.url,
    ),
  ],
  bow: [
    bow,
    new URL("./assets/models/europa_wreck_bow_hf_color.webp", import.meta.url),
  ],
  vent: [
    vent,
    new URL(
      "./assets/models/europa_mineral_vent_hf_color.webp",
      import.meta.url,
    ),
  ],
};
const cache = new Map();

/** 木卫二地质与科考船构件保留原 HF 配色与后备顶点色；场景实例共享资源，最后一个所有者释放。 */
export function acquireEuropaSceneryAsset(kind) {
  if (!definitions[kind]) throw new Error(`Unknown wreck asset: ${kind}`);
  if (!cache.has(kind)) {
    const [packed, url] = definitions[kind];
    const geometry = decodeOrganicMesh(packed, null, (x, y, z, c) =>
      c.set(0x6d7777),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const farGeometry = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(geometry.attributes))
      farGeometry.setAttribute(name, attribute);
    farGeometry.setIndex(
      new THREE.BufferAttribute(
        decodePackedArray(packed.lodIndex || packed.index, Uint16Array),
        1,
      ),
    );
    farGeometry.boundingBox = geometry.boundingBox.clone();
    farGeometry.boundingSphere = geometry.boundingSphere.clone();
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: kind === "console" ? 0.79 : 0.87,
      metalness: kind === "console" ? 0.22 : 0.08,
      side: THREE.FrontSide,
    });
    material.color.setScalar(1);
    material.name = `${kind}_hf_surface`;
    const asset = { geometry, farGeometry, material, references: 0 };
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
    farGeometry: asset.farGeometry,
    material: asset.material,
    prepare: asset.prepare,
    release() {
      if (released) return;
      released = true;
      if (--asset.references > 0) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      asset.farGeometry.dispose();
      asset.material.dispose();
      if (cache.get(kind) === asset) cache.delete(kind);
    },
  };
}
