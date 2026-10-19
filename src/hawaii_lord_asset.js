import * as THREE from "three";
import kraken from "./assets/models/kraken_hf_mesh.json" with { type: "json" };
import mayan from "./assets/models/mayan_hf_mesh.json" with { type: "json" };
import hydra from "./assets/models/hydra_hf_mesh.json" with { type: "json" };
import leviathan from "./assets/models/leviathan_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { openKrakenOralSocket } from "./kraken_intake_visual.js";

const packed = { kraken, mayan, hydra, leviathan };
const urls = {
  kraken: new URL("./assets/models/kraken_hf_color.webp", import.meta.url),
  mayan: new URL("./assets/models/mayan_hf_color.webp", import.meta.url),
  hydra: new URL("./assets/models/hydra_hf_color.webp", import.meta.url),
  leviathan: new URL(
    "./assets/models/leviathan_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();
const colors = {
  kraken: 0x755045,
  mayan: 0x838c91,
  hydra: 0x46665a,
  leviathan: 0x415964,
};

/** 每种领主共享实体、色图和材质；骨骼与动作状态由各实例独立持有。 */
export function hawaiiLordAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(packed[kind], bind, (x, y, z, color) =>
    color.set(colors[kind]),
  );
  if (kind === "kraken") openKrakenOralSocket(geometry);
  const material = new THREE.MeshPhysicalMaterial({
    roughness: 0.64,
    metalness: 0,
    ior: 1.36,
    specularIntensity: 0.55,
    vertexColors: true,
  });
  material.name = `${kind}_hf_skin`;
  // 只缓和生成贴图中固化的强明暗，不改变世界光照或借自发光掩盖形体。
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      #ifdef USE_MAP
        diffuseColor.rgb = mix(diffuseColor.rgb, sqrt(max(diffuseColor.rgb, vec3(0.0))) * 0.72, 0.22);
      #endif`,
    );
  };
  material.customProgramCacheKey = () => "hawaii_lord_organic_albedo_v1";
  let task;
  const prepare = () => {
    if (typeof window === "undefined") return Promise.resolve(false);
    if (task) return task;
    task = (async () => {
      const controller = new AbortController(),
        timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(urls[kind], { signal: controller.signal });
        if (!response.ok) throw new Error("Lord texture unavailable");
        const bitmap = await createImageBitmap(await response.blob()),
          texture = new THREE.Texture(bitmap);
        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;
        material.map = texture;
        material.vertexColors = false;
        material.needsUpdate = true;
        material.userData.texturesReady = true;
        return true;
      } catch {
        material.userData.texturesReady = false;
        return false;
      } finally {
        clearTimeout(timer);
      }
    })();
    return task;
  };
  const asset = { geometry, material, prepare, packed: packed[kind] };
  cache.set(kind, asset);
  return asset;
}
