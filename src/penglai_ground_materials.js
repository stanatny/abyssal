import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";

/** 两张地图内共享贴图；失败时用有色底材，退出地图由同一所有者释放。 */
export function createPenglaiGroundMaterials(keep) {
  const fallback = (rgb) => {
    const t = keep(new THREE.DataTexture(new Uint8Array([...rgb, 255]), 1, 1));
    t.needsUpdate = true;
    return { value: t };
  };
  const rock = fallback([97, 101, 94]),
    grass = fallback([38, 60, 18]);
  const prepare = createMaterialPreparation(
    [
      [
        "rock",
        rock,
        new URL("./assets/textures/penglai_rock.webp", import.meta.url),
      ],
      [
        "grass",
        grass,
        new URL("./assets/textures/penglai_grass.webp", import.meta.url),
      ],
    ].map(([name, slot, url]) => ({
      name,
      url,
      colorSpace: THREE.SRGBColorSpace,
      apply(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = 4;
        texture.needsUpdate = true;
        slot.value = texture;
      },
    })),
    () => {},
  );
  keep({ dispose: prepare.dispose });
  prepare();
  return { rock, grass, prepare };
}

const common = `
varying vec3 vPenglaiGroundPosition;
varying vec3 vPenglaiGroundNormal;
uniform sampler2D penglaiRock;
uniform sampler2D penglaiGrass;
float pgHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float pgNoise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(pgHash(i),pgHash(i+vec2(1,0)),f.x),mix(pgHash(i+vec2(0,1)),pgHash(i+vec2(1,1)),f.x),f.y);
}
vec3 pgStone(vec3 p, vec3 n, float scale) {
  vec3 w=pow(abs(n),vec3(5.0)); w/=max(.001,w.x+w.y+w.z);
  return texture2D(penglaiRock,p.zy*scale).rgb*w.x
       + texture2D(penglaiRock,p.xz*scale).rgb*w.y
       + texture2D(penglaiRock,p.xy*scale).rgb*w.z;
}`;

/** 材质细节只作用于表面；山体顶点、路径与碰撞保持原样。 */
export function applyPenglaiGroundSurface(material, kit, kind = "terrain") {
  const previous = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.userData.penglaiGroundSurface = kind;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.penglaiRock = kit.rock;
    shader.uniforms.penglaiGrass = kit.grass;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vPenglaiGroundPosition;\nvarying vec3 vPenglaiGroundNormal;",
      )
      .replace(
        "#include <defaultnormal_vertex>",
        "#include <defaultnormal_vertex>\nvPenglaiGroundNormal = inverseTransformDirection(transformedNormal,viewMatrix);",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec4 pgWorld = vec4(position,1.0);
        #ifdef USE_INSTANCING
          pgWorld = instanceMatrix*pgWorld;
        #endif
        vPenglaiGroundPosition=(modelMatrix*pgWorld).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${common}`)
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        vec3 pgP=vPenglaiGroundPosition, pgN=normalize(vPenglaiGroundNormal);
        vec3 pgRock=pgStone(pgP,pgN,${kind === "terrain" ? ".075" : ".23"});
        float pgMacro=pgNoise(pgP.xz*.031);
        ${
          kind === "terrain"
            ? `
          vec3 pgGrass=texture2D(penglaiGrass,pgP.xz*.19).rgb;
          float pgGrowth=smoothstep(.54,.87,pgN.y+(pgMacro-.5)*.19)*smoothstep(.4,8.0,pgP.y);
          vec3 pgCliff=pgRock*vec3(.79,.83,.80)*(.87+pgMacro*.2);
          vec3 pgMeadow=pgGrass*vec3(.82,1.05,.9)*(.86+pgMacro*.3);
          diffuseColor.rgb=mix(pgCliff,pgMeadow,pgGrowth);
          diffuseColor.rgb=mix(diffuseColor.rgb*vec3(.56,.73,.69),diffuseColor.rgb,smoothstep(-14.0,6.0,pgP.y));
        `
            : `
          diffuseColor.rgb *= .57+pgRock*1.5;
          diffuseColor.rgb *= .91+pgMacro*.16;
        `
        }
        float pgRelief=dot(pgRock,vec3(.2126,.7152,.0722))*.055;
      `,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        vec3 pgDx=dFdx(-vViewPosition), pgDy=dFdy(-vViewPosition);
        vec3 pgR1=cross(pgDy,normal), pgR2=cross(normal,pgDx);
        float pgDet=dot(pgDx,pgR1);
        vec3 pgGrad=sign(pgDet)*(dFdx(pgRelief)*pgR1+dFdy(pgRelief)*pgR2);
        normal=normalize(abs(pgDet)*normal-pgGrad*.32+normal*.000001);
      `,
      );
  };
  material.customProgramCacheKey = () => `${key()}_penglai_ground_${kind}_v1`;
  return material;
}
