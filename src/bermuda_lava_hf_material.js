import * as THREE from "three";
import { createMaterialPreparation } from "./material_loading.js";

const colorUrl = new URL(
    "./assets/textures/bermuda_lava_hf_color.webp",
    import.meta.url,
  ),
  surfaceUrl = new URL(
    "./assets/textures/bermuda_lava_hf_surface.webp",
    import.meta.url,
  );
let cached;

function applyMaps(entry, instance) {
  const { material, uniforms } = instance;
  material.map = entry.color || null;
  material.roughnessMap = material.bumpMap = entry.surface || null;
  material.color.set(entry.color ? 0xffffff : 0x9b3518);
  uniforms.uLavaSurface.value = entry.surface || null;
  uniforms.uLavaHasSurface.value = entry.surface ? 1 : 0;
  material.userData.hfTexturesReady = entry.ready;
  material.needsUpdate = true;
}

/** HF原图提供颜色；线性表面图打包从原图派生的高度、粗糙度与热量。 */
export function acquireBermudaLavaHfMaterial({
  kind = "stream",
  thermalAttributes = false,
  exposureAttributes = false,
} = {}) {
  if (!["stream", "sheet", "pool", "residue"].includes(kind))
    throw Error("Unknown HF lava material kind");
  if (!cached) {
    const entry = {
      color: null,
      surface: null,
      ready: false,
      instances: new Set(),
      prepare: null,
    };
    const slot = (name, url, colorSpace) => ({
      name,
      url,
      colorSpace,
      apply(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 2;
        entry[name] = texture;
        for (const instance of entry.instances) applyMaps(entry, instance);
      },
    });
    entry.prepare = createMaterialPreparation(
      [
        slot("color", colorUrl, THREE.SRGBColorSpace),
        slot("surface", surfaceUrl, THREE.NoColorSpace),
      ],
      (ready) => {
        entry.ready = ready;
        for (const instance of entry.instances)
          instance.material.userData.hfTexturesReady = ready;
      },
    );
    cached = entry;
  }
  const entry = cached,
    pool = kind === "pool" || kind === "residue",
    residue = kind === "residue",
    material = new THREE.MeshStandardMaterial({
      name: `bermuda_lava_hf_${kind}`,
      color: 0x9b3518,
      roughness: pool ? 0.94 : 0.78,
      metalness: 0,
      bumpScale: pool ? 0.3 : 0.18,
      side: pool || kind === "sheet" ? THREE.DoubleSide : THREE.FrontSide,
      emissive: 0xffffff,
      fog: true,
      transparent: residue,
      depthWrite: !residue,
      forceSinglePass: true,
    }),
    uniforms = {
      uLavaClock: { value: 0 },
      uLavaMotion: { value: 1 },
      uLavaFlow: { value: pool ? 0.025 : 0.28 },
      uLavaAxialScale: { value: pool ? 1 : 0.24 },
      uLavaWarp: { value: pool ? 0.01 : 0.045 },
      uLavaMaxRelief: { value: pool ? 0 : 0.06 },
      uLavaSurface: { value: null },
      uLavaHasSurface: { value: 0 },
    },
    instance = { material, uniforms };
  // 同材质的口部短喷头没有动态属性，显式常量避免复用上一绘制的属性状态。
  material.defaultAttributeValues = {
    aLavaExposure: [0],
    aLavaThermal: [1, 1],
  };
  material.userData.lavaUniforms = uniforms;
  material.userData.hfSource = "bermuda_lava_hf_color.webp";
  material.userData.surfaceChannels =
    "R=derived height; G=derived roughness; B=derived heat";
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    const declarations =
      "uniform float uLavaClock;uniform float uLavaMotion;uniform float uLavaFlow;uniform float uLavaAxialScale;uniform float uLavaWarp;uniform float uLavaMaxRelief;uniform float uLavaHasSurface;uniform sampler2D uLavaSurface;varying vec2 vLavaUv;varying vec2 vLavaThermal;varying float vLavaExposure;\n";
    shader.vertexShader =
      declarations +
      (thermalAttributes ? "attribute vec2 aLavaThermal;\n" : "") +
      (exposureAttributes ? "attribute float aLavaExposure;\n" : "") +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
      vLavaThermal=${thermalAttributes ? "clamp(aLavaThermal,vec2(0.),vec2(1.))" : "vec2(1.)"};
      vLavaExposure=${exposureAttributes ? "clamp(aLavaExposure,0.,1.)" : "0."};
      vLavaUv=vec2(uv.x,uv.y*uLavaAxialScale-uLavaClock*uLavaMotion*uLavaFlow);
      // 绕圆扰动保持整圈周期，不为减密度制造可见贴图接缝。
      vLavaUv.x+=uLavaWarp*sin(uv.x*6.2831853+vLavaUv.y*.7-uLavaClock*uLavaMotion*.12);
      vLavaUv.y+=uLavaWarp*.7*sin(uv.x*12.5663706+vLavaUv.y*.45);
      #ifdef USE_MAP
        vMapUv=(mapTransform*vec3(vLavaUv,1.)).xy;
      #endif
      #ifdef USE_ROUGHNESSMAP
        vRoughnessMapUv=(roughnessMapTransform*vec3(vLavaUv,1.)).xy;
      #endif
      #ifdef USE_BUMPMAP
        vBumpMapUv=(bumpMapTransform*vec3(vLavaUv,1.)).xy;
      #endif
    `,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      if(uLavaHasSurface>.5 && uLavaMaxRelief>0.){
        float height=texture2D(uLavaSurface,vLavaUv).r;
        transformed -= normal*((1.-clamp(height,0.,1.))*uLavaMaxRelief);
      }
    `,
      );
    shader.fragmentShader = declarations + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `
      float heat=uLavaHasSurface>.5?texture2D(uLavaSurface,vLavaUv).b:.18;
      // 新鲜切面和湿亮厚边也有真正二维HF褶纹，不留下无热量的黑色截板。
      float fresh=clamp(vLavaExposure,0.,1.);
      heat=max(clamp(heat,0.,1.),fresh*.43);
      float warmth=clamp(vLavaThermal.x,0.,1.);
      float coverage=clamp(vLavaThermal.y,0.,1.);
      // 炽热裂褶保留HF细节，低热部不是没有反照的纯黑大板。
      vec3 moltenColor=max(diffuseColor.rgb*vec3(1.,.94,.88),mix(vec3(.055,.006,.001),vec3(.18,.027,.003),fresh));
      diffuseColor.rgb=mix(vec3(.045,.022,.014),moltenColor,.3+.7*warmth);
      diffuseColor.a*=coverage;
      vec3 temperature=mix(vec3(.64,.035,.002),vec3(1.25,.34,.018),smoothstep(.28,.95,heat));
      // 保留HF原图的红橙折叠变化，不以恒定金色覆盖；冷壳只接收普通PBR光照。
      totalEmissiveRadiance=(moltenColor*pow(heat,1.65)*(.72+.55*heat)+temperature*pow(heat,3.)*.07+vec3(.028,.0014,.0001))*pow(warmth,1.35);
    `,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      `#include <roughnessmap_fragment>
      // 高温流体有湿亮褶面；冷却时恢复粗糙岩壳，不额外增加灯或白色光核。
      roughnessFactor=clamp(mix(.97,roughnessFactor*.72+.14,clamp(vLavaThermal.x,0.,1.)),.36,.98);
    `,
    );
  };
  material.customProgramCacheKey = () =>
    `bermuda_hf_lava_flow_v3_${kind}_${thermalAttributes}_${exposureAttributes}`;
  entry.instances.add(instance);
  applyMaps(entry, instance);
  let released = false;
  return {
    material,
    prepare(options) {
      return released ? Promise.resolve(false) : entry.prepare(options);
    },
    setTime(clock, { reducedMotion = false } = {}) {
      if (released) return;
      uniforms.uLavaClock.value = Number.isFinite(clock) ? clock : 0;
      uniforms.uLavaMotion.value = reducedMotion ? 0.18 : 1;
    },
    release() {
      if (released) return;
      released = true;
      entry.instances.delete(instance);
      material.dispose();
      if (!entry.instances.size) {
        entry.prepare.dispose();
        if (cached === entry) cached = undefined;
      }
    },
  };
}
