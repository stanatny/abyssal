import * as THREE from "three";
import shark from "./assets/models/shark_hf_mesh.json" with { type: "json" };
import hammerhead from "./assets/models/hammerhead_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";

const data = { shark, hammerhead };
const urls = {
  shark: new URL("./assets/models/shark_hf_color.webp", import.meta.url),
  hammerhead: new URL(
    "./assets/models/hammerhead_hf_color.webp",
    import.meta.url,
  ),
};
const cache = new Map();

/** 常规鲨类共享不可变网格与单张色图；离线失败保留实体与腹背配色。 */
export function hawaiiSharkAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    color.set(y < -0.025 ? 0xd3d6ce : kind === "shark" ? 0x687b86 : 0x888b7c);
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.64,
    metalness: 0,
    vertexColors: true,
  });
  material.name = `${kind}_hf_skin`;
  // 生成色图包含固化的黑亮反差；腹背分区保留纹理细节，抑制背部白斑式高光。
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = "varying vec3 sharkRest;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nsharkRest = position;",
    );
    shader.fragmentShader = "varying vec3 sharkRest;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      #ifdef USE_MAP
        float back = smoothstep(-0.06, -0.015, sharkRest.y);
        vec3 softened = pow(max(diffuseColor.rgb, vec3(0.0)), vec3(0.64));
        vec3 dorsal = clamp(softened * 0.65 + vec3(0.035,0.043,0.049), vec3(0.055), vec3(0.31));
        float eye = (1.0 - smoothstep(-0.36,-0.31,sharkRest.z)) *
          smoothstep(0.015,0.04,abs(sharkRest.x)) * (1.0-smoothstep(0.004,0.015,dot(diffuseColor.rgb,vec3(0.333))));
        diffuseColor.rgb = mix(softened, dorsal, back * (1.0-eye));
      #endif`,
    );
  };
  material.customProgramCacheKey = () => "hawaii_shark_albedo_v1";
  let task;
  const prepare = () => {
    if (typeof window === "undefined") return Promise.resolve(false);
    if (task) return task;
    task = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(urls[kind], { signal: controller.signal });
        if (!response.ok) throw new Error("Shark texture unavailable");
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
