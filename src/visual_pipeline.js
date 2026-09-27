import * as THREE from "three";
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
    update({ time, depth, position, aboveWater = false, ink = 0 }) {
      particles.points.position.copy(position);
      particles.uniforms.time.value = reducedMotion ? 0 : time;
      particles.uniforms.strength.value = aboveWater
        ? 0
        : 0.22 + Math.min(depth / 500, 0.3);
      particles.points.visible = !aboveWater;
      bloom.strength = 0.15 + Math.min(depth / 600, 0.12);
      scene.environmentIntensity = aboveWater
        ? 0.52
        : Math.max(0.1, 0.38 - depth / 2100) * (1 - ink * 0.45);
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
      if (scene.environment === environment.texture) scene.environment = null;
      environment.dispose();
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

/** 创建无外部依赖的柔光环境，供湿润皮肤和船窗反射；仅初始化时预过滤一次。 */
export function createMarineEnvironment(renderer) {
  const backdrop = new THREE.Scene();
  const geometry = new THREE.SphereGeometry(20, 32, 20);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {},
    vertexShader: `varying vec3 vDirection;
      void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vDirection;
      void main() {
        vec3 d = normalize(vDirection);
        vec3 lower = vec3(0.075, 0.11, 0.105);
        vec3 upper = vec3(0.46, 0.67, 0.74);
        vec3 color = mix(lower, upper, smoothstep(-0.2, 0.85, d.y));
        float sun = pow(max(0.0, dot(d, normalize(vec3(-0.5, 0.85, 0.25)))), 24.0);
        float softbox = pow(max(0.0, dot(d, normalize(vec3(0.75, 0.38, -0.4)))), 7.0);
        color += vec3(2.8, 2.65, 2.15) * sun + vec3(0.32, 0.5, 0.58) * softbox;
        gl_FragColor = vec4(color, 1.0);
      }`,
  });
  backdrop.add(new THREE.Mesh(geometry, material));
  const generator = new THREE.PMREMGenerator(renderer);
  const result = generator.fromScene(backdrop, 0.12, 0.1, 80);
  generator.dispose();
  geometry.dispose();
  material.dispose();
  return result;
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
