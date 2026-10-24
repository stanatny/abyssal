import * as T from "three";
import { createFluidTexture } from "./effect_textures.js";
import { createMaterialPreparation } from "./material_loading.js";

const output =
  "\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n#include <fog_fragment>\n";
const noise = `float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.13)+.15*noise(p*4.37);}`;

/** HF去底云雾贴图与有界GPU流动；全区域共享资源，实例只保留种子和质量状态。 */
export function createWaterspoutVisuals(time) {
  const resources = new Set(),
    keep = (r) => (resources.add(r), r);
  const fallback = keep(createFluidTexture("mist"));
  const cloudMap = { value: fallback },
    atlasReady = { value: 0 },
    motionTime = { value: 0 };
  let disposed = false;
  const prepare = createMaterialPreparation(
    [
      {
        name: "cloud",
        url: new URL(
          "./assets/textures/bermuda_storm_cloud_hf.webp",
          import.meta.url,
        ),
        colorSpace: T.SRGBColorSpace,
        apply(texture) {
          cloudMap.value = texture;
          atlasReady.value = 1;
        },
      },
    ],
    () => {},
  );
  const material = (vertexShader, fragmentShader) =>
    keep(
      new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: T.DoubleSide,
        forceSinglePass: true,
        fog: true,
        uniforms: {
          ...T.UniformsUtils.clone(T.UniformsLib.fog),
          weatherTime: motionTime,
          cloudMap,
          atlasReady,
        },
        vertexShader,
        fragmentShader,
      }),
    );
  const vertex = `varying vec2 vUv; varying vec3 vLocal; varying vec3 vNormal,vView; uniform float weatherTime;
#include <fog_pars_vertex>
void main(){vUv=uv;vLocal=position;vec3 p=position;float h=position.y/138.;p.x+=sin(h*4.7+weatherTime*.11)*h*4.;p.z+=sin(h*6.1-weatherTime*.09)*h*3.;vec4 mvPosition=modelViewMatrix*vec4(p,1.);vNormal=normalMatrix*normal;vView=-mvPosition.xyz;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
  const coreMaterial = material(
    vertex,
    `varying vec2 vUv;varying vec3 vLocal;varying vec3 vNormal,vView;uniform float weatherTime;
#include <fog_pars_fragment>
${noise}
void main(){float h=vLocal.y/138.;float a=atan(vLocal.z,vLocal.x);vec2 flow=vec2(a*2.5-h*7.+weatherTime*.8,h*13.-weatherTime*.5);float n=fbm(flow);float thread=fbm(flow*vec2(3.,.7)+5.);float fade=smoothstep(0.,.045,h)*(1.-smoothstep(.73,1.,h));float edge=pow(abs(dot(normalize(vNormal),normalize(vView))),.75);float opacity=(.10+n*.26+thread*.06)*fade*edge;vec3 color=mix(vec3(.15,.22,.25),vec3(.46,.53,.55),n*.75+thread*.25);gl_FragColor=vec4(color,opacity);${output}}`,
  );
  const coreGeometry = keep(new T.CylinderGeometry(22, 4.5, 138, 40, 24, true));
  coreGeometry.translate(0, 69, 0);
  const plane = keep(new T.PlaneGeometry(1, 1));
  // 一个实例绘制容纳整条漏斗的云团、云根与底部飞溅，避免每团独立绘制。
  const puffGeometry = keep(new T.InstancedBufferGeometry());
  puffGeometry.index = plane.index;
  puffGeometry.attributes.position = plane.attributes.position;
  puffGeometry.attributes.uv = plane.attributes.uv;
  const seeds = new Float32Array(68 * 4);
  for (let i = 0; i < 68; i++) {
    seeds[i * 4] = i;
    seeds[i * 4 + 1] = (i * 0.61803398875) % 1;
    seeds[i * 4 + 2] = (i * 0.38196601125) % 1;
    seeds[i * 4 + 3] = i < 32 || i >= 52 ? 0 : i < 40 ? 1 : 2;
  }
  puffGeometry.setAttribute(
    "particle",
    new T.InstancedBufferAttribute(seeds, 4),
  );
  puffGeometry.instanceCount = 68;
  const puffMaterial = material(
    `attribute vec4 particle;varying vec2 vUv;varying float vTile,vOpacity,vShade;uniform float weatherTime;
#include <fog_pars_vertex>
void main(){vUv=uv;float id=particle.x,seed=particle.y,h;vec3 center;vec2 scale;float angle;
if(particle.w<.5){h=fract(seed+weatherTime*.028);angle=id*2.39996+weatherTime*(1.9-h*.8);float r=3.+19.*pow(h,1.35);center=vec3(cos(angle)*r*.66,h*138.,sin(angle)*r*.66);scale=vec2(10.+h*23.,13.+h*21.);vOpacity=.50*smoothstep(0.,.07,h)*(1.-smoothstep(.82,1.,h));vShade=.65;}
else if(particle.w<1.5){h=1.;angle=id*2.39996+weatherTime*.13;center=vec3(cos(angle)*30.,129.+sin(id*3.)*5.,sin(angle)*30.);scale=vec2(54.,25.);vOpacity=.26;vShade=.27;}
else{h=fract(seed+weatherTime*.19);angle=id*2.39996+weatherTime*1.6;float r=7.+h*9.;center=vec3(cos(angle)*r,h*14.-1.,sin(angle)*r);scale=vec2(8.+h*10.,6.+h*8.);vOpacity=.44*sin(h*3.14159);vShade=.92;}
center.x+=sin(h*4.7+weatherTime*.11)*h*4.;center.z+=sin(h*6.1-weatherTime*.09)*h*3.;vec4 mvPosition=modelViewMatrix*vec4(center,1.);float rot=sin(id*1.7)*.5+weatherTime*.08;vec2 q=mat2(cos(rot),-sin(rot),sin(rot),cos(rot))*position.xy;mvPosition.xy+=q*scale;gl_Position=projectionMatrix*mvPosition;vTile=mod(id,4.);
#include <fog_vertex>
}`,
    `varying vec2 vUv;varying float vTile,vOpacity,vShade;uniform sampler2D cloudMap;uniform float atlasReady;
#include <fog_pars_fragment>
void main(){vec2 uv=vUv;if(atlasReady>.5)uv=vec2(vUv.x,1.-vUv.y);vec4 tex=texture2D(cloudMap,uv);float radial=1.-smoothstep(.30,.50,length(vUv-.5));float lum=dot(tex.rgb,vec3(.299,.587,.114));float density=atlasReady>.5?smoothstep(.015,.18,lum)*(.40+.60*lum):tex.a;float a=density*vOpacity*radial;vec3 shade=mix(vec3(.12,.19,.22),vec3(.64,.72,.75),clamp(dot(tex.rgb,vec3(.299,.587,.114))*.8+vShade*.32,0.,1.));gl_FragColor=vec4(shade,a);${output}}`,
  );
  const foamGeometry = keep(new T.PlaneGeometry(42, 42));
  const foamMaterial = material(
    `varying vec2 vUv;
#include <fog_pars_vertex>
void main(){vUv=uv;vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
    `varying vec2 vUv;uniform float weatherTime;
#include <fog_pars_fragment>
${noise}
void main(){vec2 p=(vUv-.5)*2.;float r=length(p),a=atan(p.y,p.x);float n=fbm(p*9.+vec2(weatherTime*.24,-weatherTime*.16));float spiral=sin(a*5.+r*23.-weatherTime*3.);float foam=smoothstep(.24,.72,n+spiral*.20);float band=smoothstep(.18,.36,r)*(1.-smoothstep(.48,.98,r));float inner=(1.-smoothstep(.15,.50,r))*.22;gl_FragColor=vec4(mix(vec3(.08,.20,.24),vec3(.69,.82,.84),foam),band*foam*.46+inner);${output}}`,
  );
  function create(index) {
    const group = new T.Group();
    group.name = `bermuda_waterspout_${index}`;
    const funnel = new T.Mesh(coreGeometry, coreMaterial),
      clouds = new T.Mesh(puffGeometry, puffMaterial),
      skirt = new T.Mesh(foamGeometry, foamMaterial);
    clouds.frustumCulled = false;
    skirt.rotation.x = -Math.PI / 2;
    skirt.position.y = 0.32;
    group.rotation.y = index * 1.7;
    group.add(funnel, clouds, skirt);
    group.userData.artRevision = "bermuda-waterspout-hf-20261024";
    return { group, funnel, clouds, skirt };
  }
  void prepare();
  return {
    create,
    prepare,
    resources,
    cloudMap,
    atlasReady,
    motionTime,
    update(highQuality, reducedMotion) {
      motionTime.value = reducedMotion ? 0 : time.value;
      puffGeometry.instanceCount = highQuality ? 68 : 52;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      prepare.dispose();
      for (const r of resources) r.dispose();
      resources.clear();
    },
  };
}
