import * as THREE from "three";
import { MOON_DIRECTION } from "./atlantis_art_sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

/**
 * 为实时海洋建立共享环境反射、克制辉光与悬浮颗粒，不持有玩法状态。
 * @param {THREE.WebGLRenderer} renderer 游戏渲染器。
 * @param {THREE.Scene} scene 世界场景。
 * @param {THREE.Camera} camera 游戏相机。
 * @returns {object} 渲染、质量切换、尺寸更新、时间推进及释放接口。
 */
export function createVisualPipeline(renderer, scene, camera) {
  renderer.info.autoReset = false;
  const environment = createMarineEnvironment(renderer);
  let nightEnvironment = null;
  let iceEnvironment = null;
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.38;
  const target = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
    type: THREE.HalfFloatType,
    samples: 2,
  });
  const composer = new EffectComposer(renderer, target);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    0.17,
    0.45,
    1.15,
  );
  const output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);
  composer.setSize(innerWidth, innerHeight);
  const particles = createMarineSnow();
  scene.add(particles.points);
  let highQuality = true;
  let disposed = false;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    update({
      time,
      depth,
      position,
      aboveWater = false,
      ink = 0,
      night = false,
      ice = false,
    }) {
      if (disposed) return;
      // 天空高度不是负水深，不能向辉光与颗粒着色器传入负强度。
      depth = aboveWater ? 0 : Math.max(0, Number.isFinite(depth) ? depth : 0);
      // 首次进入夜海才预过滤月光环境，反复切图直接复用两套渲染目标。
      if (night && !nightEnvironment)
        nightEnvironment = createMarineEnvironment(renderer, { night: true });
      if (ice && !iceEnvironment)
        iceEnvironment = createMarineEnvironment(renderer, { ice: true });
      const reflection = ice
        ? iceEnvironment.texture
        : night
          ? nightEnvironment.texture
          : environment.texture;
      if (scene.environment !== reflection) scene.environment = reflection;
      particles.points.position.copy(position);
      particles.uniforms.time.value = reducedMotion ? 0 : time;
      particles.uniforms.strength.value = aboveWater
        ? 0
        : 0.22 + Math.min(depth / 500, 0.3);
      particles.points.visible = !aboveWater;
      bloom.strength = 0.15 + Math.min(depth / 600, 0.12);
      scene.environmentIntensity =
        (aboveWater
          ? 0.52
          : Math.max(0.1, 0.38 - depth / 2100) * (1 - ink * 0.45)) *
        (ice ? 0.6 : night ? 0.72 : 1);
    },
    render() {
      if (disposed) return;
      renderer.info.reset();
      if (highQuality) composer.render();
      else renderer.render(scene, camera);
    },
    setQuality(high) {
      highQuality = high;
      particles.geometry.setDrawRange(0, high ? 700 : 210);
      this.resize();
    },
    resize() {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(innerWidth, innerHeight);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(particles.points);
      particles.geometry.dispose();
      particles.material.dispose();
      if (
        scene.environment === environment.texture ||
        scene.environment === nightEnvironment?.texture ||
        scene.environment === iceEnvironment?.texture
      )
        scene.environment = null;
      environment.dispose();
      nightEnvironment?.dispose();
      iceEnvironment?.dispose();
      nightEnvironment = null;
      iceEnvironment = null;
      bloom.dispose();
      renderPass.dispose();
      output.dispose();
      composer.dispose();
    },
    get enabled() {
      return highQuality;
    },
  };
}

/**
 * 创建无外部依赖的反射环境；日间默认用于夏威夷与图鉴，夜间不含暖色太阳。
 * @param {THREE.WebGLRenderer} renderer 用于预过滤的渲染器。
 * @param {{night?:boolean}} options 夜间开关，默认保留原日间环境。
 * @returns {THREE.WebGLRenderTarget} 独立环境目标，由调用方缓存与释放。
 */
export function createMarineEnvironment(
  renderer,
  { night = false, ice = false } = {},
) {
  const backdrop = new THREE.Scene();
  const geometry = new THREE.SphereGeometry(20, 32, 20);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      lowerTone: {
        value: new THREE.Vector3(
          ...(ice
            ? [0.025, 0.055, 0.065]
            : night
              ? [0.025, 0.05, 0.075]
              : [0.075, 0.11, 0.105]),
        ),
      },
      upperTone: {
        value: new THREE.Vector3(
          ...(ice
            ? [0.11, 0.18, 0.21]
            : night
              ? [0.09, 0.17, 0.26]
              : [0.46, 0.67, 0.74]),
        ),
      },
      keyDirection: {
        value: night
          ? MOON_DIRECTION.clone()
          : new THREE.Vector3(-0.5, 0.85, 0.25).normalize(),
      },
      keyTone: {
        value: new THREE.Vector3(
          ...(ice ? [0, 0, 0] : night ? [0.9, 1.3, 1.8] : [2.8, 2.65, 2.15]),
        ),
      },
      keyPower: { value: night ? 96 : 24 },
      fillTone: {
        value: new THREE.Vector3(
          ...(ice
            ? [0.13, 0.21, 0.22]
            : night
              ? [0.12, 0.22, 0.32]
              : [0.32, 0.5, 0.58]),
        ),
      },
    },
    vertexShader: `varying vec3 vDirection;
      void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vDirection;
      uniform vec3 lowerTone, upperTone, keyDirection, keyTone, fillTone;
      uniform float keyPower;
      void main() {
        vec3 d = normalize(vDirection);
        vec3 color = mix(lowerTone, upperTone, smoothstep(-0.2, 0.85, d.y));
        float key = pow(max(0.0, dot(d, keyDirection)), keyPower);
        float softbox = pow(max(0.0, dot(d, normalize(vec3(0.75, 0.38, -0.4)))), 7.0);
        color += keyTone * key + fillTone * softbox;
        gl_FragColor = vec4(color, 1.0);
      }`,
  });
  backdrop.add(new THREE.Mesh(geometry, material));
  const generator = new THREE.PMREMGenerator(renderer);
  try {
    return generator.fromScene(backdrop, 0.12, 0.1, 80);
  } finally {
    generator.dispose();
    geometry.dispose();
    material.dispose();
  }
}

function createMarineSnow() {
  const count = 700;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  let state = 81671;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let index = 0; index < count; index++) {
    positions[index * 3] = (random() - 0.5) * 100;
    positions[index * 3 + 1] = (random() - 0.5) * 66;
    positions[index * 3 + 2] = (random() - 0.5) * 100;
    sizes[index] = 0.45 + random() * 0.85;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  const uniforms = { time: { value: 0 }, strength: { value: 0.3 } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `uniform float time; attribute float size; varying float vFade;
      void main() {
        vec3 p = position;
        p.y = mod(p.y - time * 0.32 + 33.0, 66.0) - 33.0;
        p.x += sin(time * 0.17 + position.z) * 0.35;
        vec4 view = modelViewMatrix * vec4(p, 1.0);
        float distanceFade = 1.0 - smoothstep(15.0, 50.0, length(view.xyz));
        vFade = distanceFade * smoothstep(0.8, 4.0, -view.z);
        gl_PointSize = clamp(size * 45.0 / max(2.0, -view.z), 0.8, 2.5);
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: `uniform float strength; varying float vFade;
      void main() {
        float radius = length(gl_PointCoord - 0.5) * 2.0;
        float alpha = (1.0 - smoothstep(0.25, 1.0, radius)) * vFade * strength;
        if (alpha < 0.008) discard;
        gl_FragColor = vec4(0.64, 0.82, 0.79, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(geometry, material);
  points.name = "marine_snow";
  points.frustumCulled = false;
  return { points, material, geometry, uniforms };
}
