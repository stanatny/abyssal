import * as THREE from "three";
/** 矿物沉积按实体坐标连续过渡；导数过滤裂纹，避免远处细条闪烁。 */
export function addEuropaGeologySurface(material, kind) {
  const before = material.onBeforeCompile,
    key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec3 geoP = vSurfaceDetail;
      float geoN = detailNoise(geoP * .045);
      float geoFine = detailNoise(geoP * .47);
      float geoVein = abs(sin(geoP.y * .095 + geoN * 5.0 + sin(geoP.z * .024)));
      float geoAA = max(.015, fwidth(geoVein));
      float geoBand = 1.0 - smoothstep(.09-geoAA, .14+geoAA, geoVein);
      ${
        kind === "ice"
          ? `
      float pressure = abs(sin(geoP.x*.055 + sin(geoP.z*.018)*2.3 + geoN));
      float lineAA=max(.015,fwidth(pressure));
      float seam=1.0-smoothstep(.035-lineAA,.065+lineAA,pressure);
      diffuseColor.rgb *= mix(vec3(.63,.78,.84),vec3(1.12,1.13,1.08),geoN);
      diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.12,.18,.19),seam*.42);
      diffuseColor.rgb += vec3(.09,.10,.10)*geoFine;
      `
          : `
      float sediment = smoothstep(.37,.7,geoN + .08 * sin(geoP.y*.09));
      diffuseColor.rgb = mix(diffuseColor.rgb*vec3(.73,.85,.82), diffuseColor.rgb*vec3(1.48,1.21,.88),sediment);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.25,.31,.28),geoBand*.35);
      diffuseColor.rgb *= .84 + geoFine*.29;
      `
      }
    `,
    );
  };
  material.customProgramCacheKey = () =>
    key + "_europa_geological_" + kind + "_1";
}
/** 只向碰撞包络内凹刻蚀，保留实体支撑，不制造无碰撞的突岩。 */
export function europaWeatheredStone() {
  const g = new THREE.SphereGeometry(1, 28, 20),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      a = Math.atan2(z, x);
    const ledge =
      0.82 + 0.1 * Math.sin(y * 16 + a * 0.5) + 0.06 * Math.sin(a * 5 + y * 8);
    p.setXYZ(i, x * ledge, y, z * ledge);
  }
  g.computeVertexNormals();
  return g;
}
