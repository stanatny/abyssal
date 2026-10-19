import * as THREE from "three";
import megalodon from "./assets/models/megalodon_hf_mesh.json" with { type: "json" };
import basilosaurus from "./assets/models/basilosaurus_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";

const data = { megalodon, basilosaurus };
const urls = {
  megalodon: new URL(
    "./assets/models/megalodon_hf_color.webp",
    import.meta.url,
  ),
  basilosaurus: new URL(
    "./assets/models/basilosaurus_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();

/** 普通巨兽共享实体和单张色图，动画骨架仍由每个实例拥有。 */
export function hawaiiAncientAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    color.set(
      y < -0.02 ? 0xc4c4b9 : kind === "megalodon" ? 0x53616b : 0x737b73,
    );
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.72,
    metalness: 0,
    vertexColors: true,
  });
  material.name = `${kind}_hf_skin`;
  // 压缩生成色图固化的阴影反差；保留眼睛、下颌和腹背花纹，不添加发光。
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      #ifdef USE_MAP
        float skinLum = dot(diffuseColor.rgb, vec3(0.2126,0.7152,0.0722));
        vec3 skin = pow(max(diffuseColor.rgb,vec3(0.0)),vec3(0.72)) * 0.86;
        diffuseColor.rgb = mix(diffuseColor.rgb,skin,smoothstep(0.001,0.012,skinLum));
      #endif`,
    );
  };
  material.customProgramCacheKey = () => "hawaii_ancient_albedo_v1";
  let task;
  const prepare = () => {
    if (typeof window === "undefined") return Promise.resolve(false);
    if (task) return task;
    task = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(urls[kind], { signal: controller.signal });
        if (!response.ok) throw new Error("Ancient texture unavailable");
        const bitmap = await createImageBitmap(await response.blob());
        const texture = new THREE.Texture(bitmap);
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
  const asset = { geometry, material, prepare };
  cache.set(kind, asset);
  return asset;
}
