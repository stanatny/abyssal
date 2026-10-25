import * as THREE from "three";
import leafData from "./assets/models/victoria_leaf_hf_mesh.json" with { type: "json" };
import flowerData from "./assets/models/victoria_flower_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const definitions = {
  leaf: [
    leafData,
    new URL("./assets/models/victoria_leaf_hf_color.webp", import.meta.url),
  ],
  flower: [
    flowerData,
    new URL("./assets/models/victoria_flower_hf_color.webp", import.meta.url),
  ],
};
const cache = new Map();

/** 王莲叶片与花朵共享实体和色图；地图各自拥有随波材质与时间。 */
export function acquireAmazonLily(kind) {
  if (!definitions[kind]) throw new Error(`Unknown Amazon lily ${kind}`);
  if (!cache.has(kind)) {
    const [packed, url] = definitions[kind];
    const geometry = decodeOrganicMesh(packed, null, (_x, y, _z, color) =>
      color.set(
        kind === "leaf"
          ? y < 0
            ? 0x684a3c
            : 0x648647
          : y < -0.12
            ? 0x617347
            : 0xe7d9bf,
      ),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    // 中央叶面用于区分叶柄；用整片叶面低点定水线，避免透明水面切穿凹处。
    const position = geometry.attributes.position,
      normal = geometry.attributes.normal,
      heights = [];
    for (let i = 0; i < position.count; i++)
      if (
        Math.hypot(position.getX(i), position.getZ(i)) < 0.28 &&
        normal.getY(i) > 0.65
      )
        heights.push(position.getY(i));
    heights.sort((a, b) => a - b);
    geometry.computeBoundingBox();
    const laminaCenter = heights[Math.floor(heights.length * 0.5)] ?? 0;
    let waterAnchor = geometry.boundingBox.min.y + 0.32;
    if (kind === "leaf") {
      waterAnchor = laminaCenter;
      for (let i = 0; i < position.count; i++)
        if (normal.getY(i) > 0.65 && position.getY(i) > laminaCenter - 0.1)
          waterAnchor = Math.min(waterAnchor, position.getY(i));
    }
    geometry.translate(0, -waterAnchor, 0);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: kind === "leaf" ? 0.78 : 0.92,
      side: THREE.DoubleSide,
    });
    material.name = `amazon_victoria_${kind}_hf_surface`;
    const subscribers = new Set([material]);
    const prepare = createMaterialPreparation(
      [
        {
          name: "color",
          url,
          colorSpace: THREE.SRGBColorSpace,
          apply(texture) {
            for (const m of subscribers) {
              m.map = texture;
              m.vertexColors = false;
              m.needsUpdate = true;
            }
          },
        },
      ],
      (ready) => {
        for (const m of subscribers) m.userData.texturesReady = ready;
      },
    );
    cache.set(kind, {
      geometry,
      material,
      prepare,
      subscribers,
      references: 0,
      waterAnchor,
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

export function createAmazonLilyMaterial(asset, time, resources) {
  const material = asset.material.clone();
  asset.subscribers.add(material);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.lilyTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float lilyTime;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      #ifdef USE_INSTANCING
      float phase = instanceMatrix[3].x * 0.15 + instanceMatrix[3].z * 0.11;
      float width = max(length(instanceMatrix[0].xyz), 0.1);
      transformed.y += (sin(lilyTime * 0.85 + phase) * 0.012) / width;
      transformed.y += sin(lilyTime * 0.63 + phase) * position.x * 0.008;
      #endif`,
      );
  };
  material.customProgramCacheKey = () => "amazon_lily_float_v1";
  resources.add({
    dispose() {
      asset.subscribers.delete(material);
      material.dispose();
    },
  });
  return material;
}
