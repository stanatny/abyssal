import * as THREE from "three";
import mosasaur from "./assets/models/mosasaur_hf_mesh.json" with { type: "json" };
import pliosaur from "./assets/models/pliosaur_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";

const data = { mosasaur, pliosaur };
const urls = {
  mosasaur: new URL("./assets/models/mosasaur_hf_color.webp", import.meta.url),
  pliosaur: new URL("./assets/models/pliosaur_hf_color.webp", import.meta.url),
};
const cache = new Map();

/** 普通巨兽共享实体和单张色图，动画骨架仍由每个实例拥有。 */
export function hawaiiReptileAsset(kind, bind) {
  if (cache.has(kind)) return cache.get(kind);
  const geometry = decodeOrganicMesh(data[kind], bind, (x, y, z, color) => {
    color.set(y < -0.02 ? 0xc4c4b9 : kind === "mosasaur" ? 0x626c58 : 0x5d6c75);
  });
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.72,
    metalness: 0,
    vertexColors: true,
  });
  material.name = `${kind}_hf_skin`;
  // 压缩生成色图固化的阴影反差；保留眼睛、下颌和腹背花纹，不添加发光。
  material.onBeforeCompile = (shader) => {
    // 上龙腹部的色图带有少量固化黑斑；中性材质确认网格完整后，只柔化腹部低亮度色块。
    if (kind === "pliosaur") {
      shader.vertexShader =
        "varying vec3 reptileRestPosition;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nreptileRestPosition = position;",
      );
      shader.fragmentShader =
        "varying vec3 reptileRestPosition;\n" + shader.fragmentShader;
    }
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      #ifdef USE_MAP
        float skinLum = dot(diffuseColor.rgb, vec3(0.2126,0.7152,0.0722));
        vec3 skin = pow(max(diffuseColor.rgb,vec3(0.0)),vec3(0.72)) * 0.86;
        diffuseColor.rgb = mix(diffuseColor.rgb,skin,smoothstep(0.001,0.012,skinLum));
        ${
          kind === "pliosaur"
            ? `
          float belly = (1.0-smoothstep(-0.06,-0.015,reptileRestPosition.y)) *
            (1.0-smoothstep(0.06,0.12,abs(reptileRestPosition.x))) *
            smoothstep(-0.32,-0.20,reptileRestPosition.z) *
            (1.0-smoothstep(0.22,0.32,reptileRestPosition.z));
          diffuseColor.rgb = mix(diffuseColor.rgb,vec3(0.12,0.135,0.13),
            belly * (1.0-smoothstep(0.003,0.025,skinLum)) * 0.9);
        `
            : ""
        }
      #endif`,
    );
  };
  material.customProgramCacheKey = () => `hawaii_reptile_albedo_v1_${kind}`;
  let task;
  const prepare = () => {
    if (typeof window === "undefined") return Promise.resolve(false);
    if (task) return task;
    task = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(urls[kind], { signal: controller.signal });
        if (!response.ok) throw new Error("Reptile texture unavailable");
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
