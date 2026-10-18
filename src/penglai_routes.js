import * as THREE from "three";
import {
  PENGLAI_WORLD as W,
  PENGLAI_PEAKS,
  penglaiHeightAt,
} from "./penglai_config.js";

/** 山径从山脚连续盘上真实峰顶，静态采样同时用于林木避让与可见铺石。 */
export const PENGLAI_SUMMIT_ROUTES = Object.freeze(
  PENGLAI_PEAKS.filter((p) => p.x !== 0 && p.x !== -320).map((peak, index) => {
    let top = { x: peak.x, z: peak.z, y: penglaiHeightAt(peak.x, peak.z) };
    for (let x = -24; x <= 24; x += 4)
      for (let z = -24; z <= 24; z += 4) {
        const y = penglaiHeightAt(peak.x + x, peak.z + z);
        if (y > top.y) top = { x: peak.x + x, z: peak.z + z, y };
      }
    const points = [];
    for (let i = 0; i <= 100; i++) {
      const t = i / 100,
        r = 104 * (1 - t),
        a = index * 0.8 + t * Math.PI * 2.2,
        x = top.x + Math.sin(a) * r,
        // 边缘北岳沿现有边界盘山，不把石径和亭台延伸到地图外。
        rz = Math.min(r, top.z - W.minZ - 12, W.maxZ - top.z - 12),
        z = top.z + Math.cos(a) * Math.max(0, rz);
      points.push(Object.freeze({ x, z, y: penglaiHeightAt(x, z) }));
    }
    return Object.freeze({
      top: Object.freeze(top),
      points: Object.freeze(points),
    });
  }),
);
export function besideSummitPath(x, z, margin = 7) {
  return PENGLAI_SUMMIT_ROUTES.some((r) =>
    r.points.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < margin ** 2),
  );
}
/** 石路直接铺进真实山体材质，避免独立薄片与地形穿插或争夺深度。 */
export function applyPenglaiSummitPaths(material, keep) {
  const size = 1024,
    pixels = new Uint8Array(size * size),
    spanX = W.maxX - W.minX,
    spanZ = W.maxZ - W.minZ,
    halfWidth = 3,
    feather = 0.8;
  // 只遍历每一段路附近的纹素；构造一次，远景用 mipmap 平滑采样。
  for (const route of PENGLAI_SUMMIT_ROUTES) {
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1],
        b = route.points[i],
        dx = b.x - a.x,
        dz = b.z - a.z,
        lengthSquared = dx * dx + dz * dz,
        margin = halfWidth + feather,
        lowX = Math.max(
          0,
          Math.floor(((Math.min(a.x, b.x) - margin - W.minX) / spanX) * size),
        ),
        highX = Math.min(
          size - 1,
          Math.ceil(((Math.max(a.x, b.x) + margin - W.minX) / spanX) * size),
        ),
        lowZ = Math.max(
          0,
          Math.floor(((Math.min(a.z, b.z) - margin - W.minZ) / spanZ) * size),
        ),
        highZ = Math.min(
          size - 1,
          Math.ceil(((Math.max(a.z, b.z) + margin - W.minZ) / spanZ) * size),
        );
      for (let iz = lowZ; iz <= highZ; iz++) {
        for (let ix = lowX; ix <= highX; ix++) {
          const x = W.minX + ((ix + 0.5) / size) * spanX,
            z = W.minZ + ((iz + 0.5) / size) * spanZ,
            t = lengthSquared
              ? Math.max(
                  0,
                  Math.min(
                    1,
                    ((x - a.x) * dx + (z - a.z) * dz) / lengthSquared,
                  ),
                )
              : 0,
            distance = Math.hypot(x - a.x - dx * t, z - a.z - dz * t),
            coverage = Math.max(
              0,
              Math.min(1, (halfWidth + feather - distance) / (2 * feather)),
            ),
            index = iz * size + ix;
          pixels[index] = Math.max(pixels[index], Math.round(coverage * 255));
        }
      }
    }
  }
  const texture = keep(
    new THREE.DataTexture(pixels, size, size, THREE.RedFormat),
  );
  texture.name = "penglai_summit_stone_mask";
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  const previous = material.onBeforeCompile,
    previousKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.summitPathMask = { value: texture };
    shader.uniforms.summitPathColor = { value: new THREE.Color("#b3b5a3") };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 vSummitPathUv;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vSummitPathUv = (position.xz - vec2(${W.minX.toFixed(1)}, ${W.minZ.toFixed(1)})) / vec2(${spanX.toFixed(1)}, ${spanZ.toFixed(1)});`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 vSummitPathUv;\nuniform sampler2D summitPathMask;\nuniform vec3 summitPathColor;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float summitPathCoverage = texture2D(summitPathMask, vSummitPathUv).r;
diffuseColor.rgb = mix(diffuseColor.rgb, summitPathColor, summitPathCoverage);`,
      );
  };
  material.customProgramCacheKey = () => `${previousKey()}_summit_path_v1`;
  material.userData.summitPathTexture = texture;
  return texture;
}
