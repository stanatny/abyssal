import * as THREE from "three";

/** 三组长涌浪叠加；船只视觉与水面取同一相位，碰撞随船姿同步。 */
export function stormWaveHeight(x, z, time) {
  return (
    Math.sin(x * 0.042 + z * 0.018 - time * 0.82) * 1.55 +
    Math.sin(x * -0.027 + z * 0.068 - time * 1.12) * 0.85 +
    Math.sin(x * 0.1 - z * 0.085 + time * 1.7) * 0.27
  );
}

/** GPU涌浪和解析法线；波峰泡沫按坡度出现，不再在起伏网格上保留平面法线。 */
export function createStormWater(root, keep, time) {
  const material = keep(
    new THREE.MeshStandardMaterial({
      color: "#214652",
      roughness: 0.38,
      envMapIntensity: 0.35,
      metalness: 0.12,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
    }),
  );
  material.onBeforeCompile = (shader) => {
    shader.uniforms.stormTime = time;
    const wave = `
      uniform float stormTime;
      varying float vStormCrest;
      varying vec2 vStormOcean;
      vec3 stormWave(vec2 p) {
        float a=p.x*.042+p.y*.018-stormTime*.82;
        float b=p.x*-.027+p.y*.068-stormTime*1.12;
        float c=p.x*.10-p.y*.085+stormTime*1.7;
        return vec3(sin(a)*1.55+sin(b)*.85+sin(c)*.27,
          cos(a)*1.55*.042-cos(b)*.85*.027+cos(c)*.27*.10,
          cos(a)*1.55*.018+cos(b)*.85*.068-cos(c)*.27*-.085);
      }`;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\n" + wave)
      .replace(
        "#include <beginnormal_vertex>",
        "#include <beginnormal_vertex>\nvec2 stormP=vec2(position.x, -position.y-505.0);vec3 swell=stormWave(stormP);objectNormal=normalize(vec3(-swell.y,swell.z,1.0));",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.z+=swell.x;vStormCrest=swell.x;vStormOcean=stormP;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vStormCrest;varying vec2 vStormOcean;uniform float stormTime;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      float grain=sin(vStormOcean.x*.68+sin(vStormOcean.y*.41)+stormTime)*sin(vStormOcean.y*.73-stormTime*.8);
      float foam=smoothstep(1.60,2.50,vStormCrest+grain*.25);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.58,.70,.70),foam*.7);
      diffuseColor.rgb*=.85+.15*grain;`,
      );
  };
  material.customProgramCacheKey = () => "bermuda_swell_normals_foam_v2";
  const water = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(2800, 3000, 200, 220)),
    material,
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 4, -505);
  water.name = "bermuda_storm_water";
  root.add(water);
  return { water, material };
}
