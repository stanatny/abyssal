import * as THREE from "three";

const rgb = (hex) => {
  const c = new THREE.Color(hex);
  return `vec3(${c.r.toFixed(6)}, ${c.g.toFixed(6)}, ${c.b.toFixed(6)})`;
};

/** 世界尺度的泥砂层理；不改变河岸、河床或岛下通道的任何顶点。 */
export function addAmazonEarthFinish(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vEarthWorld;\nvarying vec3 vEarthNormal;",
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vEarthWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vEarthNormal = inverseTransformDirection(transformedNormal, viewMatrix);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vEarthWorld;
        varying vec3 vEarthNormal;
        float earthHash(vec2 p) {
          vec3 q = fract(vec3(p.xyx) * 0.1031);
          q += dot(q, q.yzx + 33.33);
          return fract((q.x + q.y) * q.z);
        }
        float earthNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f*f*(3.0-2.0*f);
          return mix(mix(earthHash(i), earthHash(i+vec2(1,0)), f.x),
            mix(earthHash(i+vec2(0,1)), earthHash(i+vec2(1,1)), f.x), f.y);
        }
        float earthGrain(vec3 p) {
          vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          float a=earthNoise(i.xy + i.z * vec2(37.0,17.0) + f.xy);
          float b=earthNoise(i.xy + (i.z+1.0) * vec2(37.0,17.0) + f.xy);
          return mix(a,b,f.z);
        }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec3 ep = vEarthWorld;
        vec3 en = normalize(vEarthNormal);
        float slope = 1.0 - smoothstep(0.38, 0.9, abs(en.y));
        vec2 face = vec2(ep.x + ep.z * 0.67, ep.y);
        float broad = earthNoise(ep.xz * 0.032 + ep.y * 0.017);
        float erosion = earthNoise(face * vec2(0.23, 0.045));
        vec3 grainUV = ep * 1.7;
        float grainVisibility = 1.0 - smoothstep(0.22, 0.85, length(fwidth(grainUV)));
        float grain = (earthGrain(grainUV) - 0.5) * grainVisibility;
        float sediment = earthNoise(face * vec2(0.055, 0.30) + broad * 1.7);
        float layer = (sediment - 0.5) * slope;
        float damp = 1.0 - smoothstep(4.0, 8.0 + broad * 3.0, ep.y);
        float humus = smoothstep(11.0, 28.0, ep.y) * (0.3 + broad * 0.45);
        vec3 clay = mix(${rgb("#65513f")}, ${rgb("#b29b7d")}, broad * 0.65 + sediment * 0.35);
        clay *= 0.88 + layer * 0.35 + grain * 0.22;
        clay = mix(clay, ${rgb("#485044")}, damp * 0.3);
        clay = mix(clay, ${rgb("#3a422c")}, humus);
        float wetEdge = 1.0 - smoothstep(4.0, 7.5, ep.y);
        clay *= mix(1.0, 0.77, wetEdge);
        diffuseColor.rgb = mix(diffuseColor.rgb, clay, 0.9);
        float earthRelief = grain * 0.025 + erosion * 0.045;`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        vec3 ex = dFdx(-vViewPosition), ey = dFdy(-vViewPosition);
        vec3 er1 = cross(ey, normal), er2 = cross(normal, ex);
        float edet = dot(ex, er1);
        vec3 eg = sign(edet) * (dFdx(earthRelief)*er1 + dFdy(earthRelief)*er2);
        vec3 bumped = abs(edet)*normal - eg * 0.2;
        float magnitude = dot(bumped, bumped);
        if (magnitude > 1e-18) normal = bumped * inversesqrt(magnitude);`,
      );
  };
  material.customProgramCacheKey = () => "amazon_earth_finish_v1";
  return material;
}
