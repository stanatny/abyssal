import * as THREE from "three";
import { sculptedFin } from "./creature_surface.js";

/** 带纵肋的闭合虹吸杯，底部实心、上部向内卷成真实腔口。 */
export function createSiphonColonyGeometry() {
  const profile = [
      [0, 1.25],
      [0.5, 1.05],
      [2, 0.72],
      [5, 0.75],
      [7, 1.3],
      [8.5, 2],
      [9, 1.9],
      [8.7, 1.5],
      [7.5, 1.05],
      [6.6, 0.2],
      [6.5, 0],
    ],
    g = new THREE.LatheGeometry(
      profile.map(([y, r]) => new THREE.Vector2(r, y)),
      24,
    );
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i),
      a = Math.atan2(p.getZ(i), p.getX(i)),
      fold = 1 + Math.sin(a * 12) * 0.075 * Math.min(1, y / 2);
    p.setXYZ(
      i,
      p.getX(i) * fold + Math.sin(y * 0.17) * 0.6,
      y,
      p.getZ(i) * fold,
    );
  }
  g.computeVertexNormals();
  repairLathePoleNormals(g);
  return g;
}

/** 旋转面极点的 UV 接缝可只有退化邻面；借用同一实体点的有效法线，形体与索引不变。 */
export function repairLathePoleNormals(geometry) {
  const p = geometry.attributes.position,
    n = geometry.attributes.normal;
  const sum = new THREE.Vector3();
  for (let i = 0; i < n.count; i++) {
    const length2 = n.getX(i) ** 2 + n.getY(i) ** 2 + n.getZ(i) ** 2;
    if (Number.isFinite(length2) && length2 > 1e-12) continue;
    sum.set(0, 0, 0);
    for (let j = 0; j < n.count; j++) {
      const d =
        (p.getX(i) - p.getX(j)) ** 2 +
        (p.getY(i) - p.getY(j)) ** 2 +
        (p.getZ(i) - p.getZ(j)) ** 2;
      const l = n.getX(j) ** 2 + n.getY(j) ** 2 + n.getZ(j) ** 2;
      if (d < 1e-10 && Number.isFinite(l) && l > 1e-12)
        sum.add(new THREE.Vector3(n.getX(j), n.getY(j), n.getZ(j)));
    }
    if (sum.lengthSq() < 1e-12)
      throw new Error("Lathe pole has no valid neighbouring normal");
    sum.normalize();
    n.setXYZ(i, sum.x, sum.y, sum.z);
  }
  return geometry;
}

/** 多层折扇生物用一份闭合曲面供实例共享，薄边与根部有明显厚度差。 */
export function createFanColonyGeometry() {
  const g = sculptedFin(
    [
      [0, 0],
      [1, -1.4],
      [4, -2.8],
      [7, -1.8],
      [9, 0],
      [7, 1.8],
      [4, 2.8],
      [1, 1.4],
    ],
    0.25,
    "vertical",
    { camber: 0.3, detail: 2 },
  );
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, -0.2);
  return g;
}

/** 局部生物光按实际视距消隐；柔和摆动固定根部，沿用主循环时间。 */
export function addEuropaColonySurface(material, time, sway = false) {
  const previous = material.onBeforeCompile,
    previousKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.europaTime = time;
    if (sway)
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float europaTime;",
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
        float rootWeight = smoothstep(0.0, 9.0, position.y);
        transformed.x += sin(europaTime * 0.55 + position.y * 0.35) * rootWeight * 0.2;`,
        );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
      totalEmissiveRadiance *= 1.0 - smoothstep(20.0, 70.0, length(vViewPosition));`,
    );
  };
  material.customProgramCacheKey = () => `${previousKey}_europa_colony_${sway}`;
  return material;
}

/** 冰面裂纹与锈色盐脉是材质细节，不把无实体的光条作为照明装置。 */
export function addPressureIceSurface(material) {
  const previous = material.onBeforeCompile,
    previousKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      float foldLine = sin(vSurfaceDetail.x * 0.075 + sin(vSurfaceDetail.z * 0.026) * 2.0);
      float hairline = 1.0 - smoothstep(0.005, 0.022, abs(foldLine));
      float fracture = 1.0 - smoothstep(0.0, 0.025, abs(sin(vSurfaceDetail.z * 0.13 + sin(vSurfaceDetail.x * 0.045))));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.28, 0.17, 0.12), hairline * 0.3);
      diffuseColor.rgb *= 1.0 - fracture * 0.1;`,
    );
  };
  material.customProgramCacheKey = () => `${previousKey}_pressure_ice`;
  return material;
}
