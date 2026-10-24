import * as THREE from "three";
/** 温暖贝灰岩铺地：块石拼缝、低频矿物变化和边缘积沙共用一层不透明表面。 */
export function createMarianaRefugePaving(keep) {
  const material = keep(
    new THREE.MeshStandardMaterial({ color: 0xc4bc9c, roughness: 0.94 }),
  );
  material.name = "refuge_paving";
  material.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRefugeP;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvRefugeP=position;",
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
   varying vec3 vRefugeP;
   float rfHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float rfNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(rfHash(i),rfHash(i+vec2(1,0)),f.x),mix(rfHash(i+vec2(0,1)),rfHash(i+vec2(1,1)),f.x),f.y);}
  `,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
   vec2 p=vRefugeP.xz;
   float row=floor(p.y/7.0);
   vec2 tile=vec2(p.x/9.0+mod(row,2.0)*.5,p.y/7.0);
   vec2 edge=min(fract(tile),1.0-fract(tile));
   float seam=1.0-smoothstep(.008,.034,min(edge.x,edge.y));
   float grain=rfNoise(p*1.7)*.06+rfNoise(p*.16)*.10;
   float variation=rfHash(floor(tile))*.13;
   float border=max(abs(p.x)/80.0,abs(p.y-10.0)/85.0);
   float sediment=smoothstep(.72,1.0,border+rfNoise(p*.085)*.12);
   vec3 stone=vec3(.86,.85,.77)*(1.02+variation+grain-seam*.24);
   float r=length(p-vec2(0,10));
   float ring=(1.0-smoothstep(.15,.65,abs(r-26.0)))*.6;
   stone=mix(stone,vec3(.43,.67,.62),ring*(1.0-seam));
   vec3 sandy=vec3(.82,.80,.69)*(1.0+grain);
   diffuseColor.rgb*=mix(stone,sandy,sediment);
  `,
      );
  };
  material.customProgramCacheKey = () => "mariana_refuge_paving_v1";
  return material;
}
