import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";

// 王城材质是有界的跨地图缓存，与既有建筑套件同寿命；只保存两张纹理。
const entries = new Map();
const urls = {
  stone: new URL("./assets/textures/atlantis_limestone.webp", import.meta.url),
  marble: new URL("./assets/textures/atlantis_marble.webp", import.meta.url),
};
function entry(kind) {
  if (entries.has(kind)) return entries.get(kind);
  const item = { texture: null, materials: new Set() };
  item.prepare = createMaterialPreparation(
    [
      {
        name: kind,
        url: urls[kind],
        colorSpace: THREE.SRGBColorSpace,
        apply(texture) {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.anisotropy = 4;
          item.texture = texture;
          for (const material of item.materials) {
            material.map = texture;
            material.needsUpdate = true;
          }
        },
      },
    ],
    (ready) => {
      for (const material of item.materials)
        material.userData.texturesReady = ready;
    },
  );
  entries.set(kind, item);
  return item;
}

/** 实际世界坐标三向投影，避免缩放台基拉伸、圆柱投影接缝与细线摩尔纹。 */
export function applyAtlantisSurface(material, kind = "stone", role = kind) {
  const item = entry(kind);
  item.materials.add(material);
  material.name = `atlantis_surface_${role}`;
  material.map = item.texture;
  material.userData.texturesReady = !!item.texture;
  const compile = material.onBeforeCompile,
    key = material.customProgramCacheKey;
  material.onBeforeCompile = (shader, renderer) => {
    compile.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vAtlSurface;\nvarying vec3 vAtlSurfaceNormal;",
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vec4 atlSurface = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          atlSurface = instanceMatrix * atlSurface;
        #endif
        vAtlSurface = (modelMatrix * atlSurface).xyz;
        vAtlSurfaceNormal = inverseTransformDirection(transformedNormal, viewMatrix);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
       varying vec3 vAtlSurface;
       varying vec3 vAtlSurfaceNormal;
       float atlHeight = 0.0;
       float atlMineral = 0.5;
       vec3 atlPerturb(vec3 surface, vec3 n, float h) {
         vec3 dx = dFdx(surface), dy = dFdy(surface);
         vec3 r1 = cross(dy, n), r2 = cross(n, dx);
         float det = dot(dx, r1);
         vec3 gradient = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
         return normalize(abs(det) * n - gradient);
       }`,
      )
      .replace(
        "#include <map_fragment>",
        `
        #ifdef USE_MAP
          vec3 w = pow(abs(normalize(vAtlSurfaceNormal)), vec3(6.0));
          w /= max(dot(w, vec3(1.0)), 0.00001);
          vec3 p = vAtlSurface / ${kind === "stone" ? "12.0" : "15.0"};
          vec3 texel = texture2D(map, p.zy).rgb * w.x
                     + texture2D(map, p.xz).rgb * w.y
                     + texture2D(map, p.xy).rgb * w.z;
          atlMineral = dot(texel, vec3(0.2126, 0.7152, 0.0722));
          atlHeight = atlMineral * ${role === "bronze" ? "0.035" : kind === "stone" ? "0.065" : "0.018"};
          diffuseColor.rgb *= ${role === "bronze" ? "mix(vec3(0.22,0.38,0.31), vec3(0.62,0.40,0.16), smoothstep(0.32,0.70,atlMineral)) * 2.2" : "texel"};
        #endif`,
      )
      .replace(
        "#include <color_fragment>",
        `
        #ifdef USE_COLOR
          diffuseColor.rgb *= ${role === "bronze" ? "mix(vec3(1.0), vColor, 0.3)" : "mix(vec3(1.0), vColor, 0.62)"};
        #endif`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (0.55-atlMineral)*0.13, ${role === "bronze" ? "0.55" : "0.80"}, 0.98);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        #ifdef USE_MAP
          normal = atlPerturb(-vViewPosition, normal, atlHeight);
        #endif`,
      );
  };
  material.customProgramCacheKey = () =>
    `${key.call(material)}_atl_surface_v1_${kind}_${role}`;
  return material;
}

export function prepareAtlantisSurfaces(options) {
  return Promise.all([...entries.values()].map((e) => e.prepare(options)));
}
