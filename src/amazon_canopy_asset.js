import * as THREE from "three";
import kapok from "./assets/models/kapok_tree_hf_mesh.json" with { type: "json" };
import kapokFar from "./assets/models/kapok_tree_far_hf_mesh.json" with { type: "json" };
import palm from "./assets/models/acai_palm_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const sources = {
  kapok: [
    kapok,
    34,
    new URL("./assets/models/kapok_tree_hf_color.webp", import.meta.url),
  ],
  kapokFar: [
    kapokFar,
    34,
    new URL("./assets/models/kapok_tree_far_hf_color.webp", import.meta.url),
  ],
  palm: [
    palm,
    26,
    new URL("./assets/models/acai_palm_hf_color.webp", import.meta.url),
  ],
};
const cache = new Map();

/** 实际 HF 树木共享实体与色图；每个森林另持有风动材质和时间。 */
export function acquireAmazonCanopy(kind) {
  if (!sources[kind]) throw new Error(`Unknown Amazon canopy ${kind}`);
  if (!cache.has(kind)) {
    const [packed, height, url] = sources[kind];
    const geometry = decodeOrganicMesh(packed, null, (_x, y, _z, color) =>
      color.set(y > 0.06 ? 0x496539 : 0x736756),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    geometry.scale(height, height, height);
    geometry.translate(0, height * 0.5, 0);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.93,
      side: THREE.DoubleSide,
    });
    material.name = `amazon_${kind}_hf_surface`;
    const subscribers = new Set([material]);
    const prepare = createMaterialPreparation(
      [
        {
          name: "color",
          url,
          colorSpace: THREE.SRGBColorSpace,
          apply(texture) {
            for (const target of subscribers) {
              target.map = texture;
              target.vertexColors = false;
              target.needsUpdate = true;
            }
          },
        },
      ],
      (ready) => {
        for (const target of subscribers) target.userData.texturesReady = ready;
      },
    );
    cache.set(kind, {
      geometry,
      material,
      prepare,
      references: 0,
      height,
      subscribers,
    });
  }
  const asset = cache.get(kind);
  asset.references++;
  let released = false;
  return {
    ...asset,
    release() {
      if (released) return;
      released = true;
      if (--asset.references) return;
      asset.prepare.dispose();
      asset.geometry.dispose();
      asset.material.dispose();
      if (cache.get(kind) === asset) cache.delete(kind);
    },
  };
}

export function createAmazonCanopyMaterial(asset, time, resources) {
  const material = asset.material.clone();
  asset.subscribers.add(material);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.canopyTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float canopyTime;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float crown = smoothstep(${(asset.height * 0.69).toFixed(3)}, ${asset.height.toFixed(3)}, position.y);
        transformed.x += sin(canopyTime * 0.75 + position.z * 0.23) * crown * 0.24;
        transformed.z += sin(canopyTime * 0.53 + position.x * 0.19) * crown * 0.13;`,
      );
  };
  material.customProgramCacheKey = () => `amazon_hf_canopy_${asset.height}`;
  resources.add({
    dispose() {
      asset.subscribers.delete(material);
      material.dispose();
    },
  });
  return { material, prepare: asset.prepare };
}
