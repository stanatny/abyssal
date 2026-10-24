import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";

const definitions = {
  wall: {
    url: new URL(
      "./assets/textures/mariana_wall_hf_color.webp",
      import.meta.url,
    ),
    heightUrl: new URL(
      "./assets/textures/mariana_wall_hf_height.webp",
      import.meta.url,
    ),
    tile: 52,
    gain: 7.5,
    relief: 0.32,
  },
  outcrop: {
    url: new URL(
      "./assets/textures/mariana_outcrop_hf_color.webp",
      import.meta.url,
    ),
    heightUrl: new URL(
      "./assets/textures/mariana_outcrop_hf_height.webp",
      import.meta.url,
    ),
    tile: 44,
    gain: 18,
    relief: 0.24,
  },
};

// 色图来自实际 HF 岩样的无光照烘焙，独立低分辨率高程来自真实几何。
// 三向世界投影跨越墙体分块；保留原顶点、碰撞和各水层的颜色分布。
function surfaceShader(material, kind, group) {
  const settings = definitions[kind];
  material.onBeforeCompile = (shader) => {
    shader.uniforms.marRockHeightMap = group.heightUniform;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vMarRockPosition;\nvarying vec3 vMarRockNormal;",
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vec4 marRockPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          marRockPosition = instanceMatrix * marRockPosition;
        #endif
        vMarRockPosition = (modelMatrix * marRockPosition).xyz;
        vMarRockNormal = inverseTransformDirection(transformedNormal, viewMatrix);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D marRockHeightMap;
        varying vec3 vMarRockPosition;
        varying vec3 vMarRockNormal;
        float marRockHeight = 0.0;
        vec3 marRockBump(vec3 p, vec3 n, float h) {
          vec3 dx = dFdx(p), dy = dFdy(p);
          vec3 r1 = cross(dy, n), r2 = cross(n, dx);
          float det = dot(dx, r1);
          vec3 perturbed = abs(det) * n - sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
          float magnitude = dot(perturbed, perturbed);
          return magnitude > 1e-18 ? perturbed * inversesqrt(magnitude) : n;
        }`,
      )
      .replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
          vec3 weights = pow(abs(normalize(vMarRockNormal)), vec3(6.0));
          weights /= max(dot(weights, vec3(1.0)), 0.00001);
          vec3 p = vMarRockPosition / ${settings.tile.toFixed(1)};
          vec3 rock = texture2D(map, p.zy).rgb * weights.x
                    + texture2D(map, p.xz + vec2(0.31, 0.17)).rgb * weights.y
                    + texture2D(map, p.xy + vec2(0.57, 0.29)).rgb * weights.z;
          diffuseColor.rgb *= mix(vec3(0.72), clamp(rock * ${settings.gain.toFixed(1)}, vec3(0.38), vec3(1.25)), 0.58);
          #ifdef MARIANA_ROCK_HEIGHT
            marRockHeight = (texture2D(marRockHeightMap, p.zy).r * weights.x
+ texture2D(marRockHeightMap, p.xz + vec2(0.31, 0.17)).r * weights.y
+ texture2D(marRockHeightMap, p.xy + vec2(0.57, 0.29)).r * weights.z) * ${settings.relief.toFixed(2)};
          #endif
        #endif`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        #ifdef USE_MAP
          normal = marRockBump(-vViewPosition, normal, marRockHeight);
        #endif`,
      );
  };
  material.customProgramCacheKey = () => `mariana_hf_rock_v1_${kind}`;
}

/** 每张地图只拥有两组色图和低分辨率高程；切图或中断构造时连同 ImageBitmap 一起释放。 */
export function createMarianaRockSurfaces() {
  const groups = new Map();
  let disposed = false;
  const slots = [];
  for (const [kind, settings] of Object.entries(definitions)) {
    const group = {
      texture: null,
      height: null,
      heightUniform: { value: null },
      materials: new Set(),
    };
    groups.set(kind, group);
    for (const channel of ["texture", "height"])
      slots.push({
        name: `${kind}_${channel}`,
        url: channel === "texture" ? settings.url : settings.heightUrl,
        colorSpace:
          channel === "texture" ? THREE.SRGBColorSpace : THREE.NoColorSpace,
        apply(texture) {
          texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
          texture.anisotropy = 4;
          group[channel] = texture;
          if (channel === "height") group.heightUniform.value = texture;
          for (const material of group.materials) update(material, group);
        },
      });
  }
  function update(material, group) {
    material.map = group.texture;
    material.userData.rockSurfaceReady = !!group.texture && !!group.height;
    material.defines = { ...material.defines };
    if (group.height) material.defines.MARIANA_ROCK_HEIGHT = 1;
    else delete material.defines.MARIANA_ROCK_HEIGHT;
    material.needsUpdate = true;
  }
  const prepare = createMaterialPreparation(slots, () => {});
  return {
    groups,
    prepare,
    apply(material, kind) {
      const group = groups.get(kind);
      if (!group || disposed)
        throw new Error("Invalid Mariana rock surface owner");
      group.materials.add(material);
      material.userData.rockSurfaceKind = kind;
      surfaceShader(material, kind, group);
      update(material, group);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      prepare.dispose();
      for (const group of groups.values()) {
        for (const material of group.materials) {
          material.map = null;
          material.userData.rockSurfaceReady = false;
        }
        group.materials.clear();
        group.texture = group.height = group.heightUniform.value = null;
      }
    },
  };
}
