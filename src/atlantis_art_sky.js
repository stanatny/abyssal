import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createFluidTexture } from "./effect_textures.js";

/**
 * 亚特兰蒂斯夜空的纯几何/材质构建件：天穹渐变与银河、分层星空、
 * 月相圆盘与晕光、世界边界之外的夜岛剪影。只返回场景节点与 uniform 句柄，
 * 不注册任何动画循环；动画由 atlantis_surface.js 的统一 update 驱动。
 */

// 月亮相对天穹中心的方向，预览页的平行月光应与它保持一致。
export const MOON_DIRECTION = new THREE.Vector3(0.42, 0.4, -0.8).normalize();

// 低成本 3D 值噪声，天穹银河与月面斑块共用。
const NOISE_GLSL = `
float atlHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float atlNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(atlHash(i), atlHash(i + vec3(1, 0, 0)), f.x), mix(atlHash(i + vec3(0, 1, 0)), atlHash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(atlHash(i + vec3(0, 0, 1)), atlHash(i + vec3(1, 0, 1)), f.x), mix(atlHash(i + vec3(0, 1, 1)), atlHash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z
  );
}
float atlFbm(vec3 p) {
  return atlNoise(p) * 0.62 + atlNoise(p * 2.31) * 0.38;
}
`;

// 确定性伪随机，保证星空与岛屿轮廓每次构建一致。
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 夜空穹顶：深蓝天顶到微亮地平线的三段渐变，银河为沿倾斜大圆的
 * 噪声辉光加一条尘埃暗纹；uFade 供水下淡出，uMilkyWay 供画质分档。
 */
export function buildSkyDome(keep) {
  const uniforms = {
    uZenith: { value: new THREE.Color("#03060f") },
    uMid: { value: new THREE.Color("#08142a") },
    uHorizon: { value: new THREE.Color("#132a40") },
    uMilkyWay: { value: 1 },
    uFade: { value: 1 },
  };
  const material = keep(
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
      fragmentShader: `
      uniform vec3 uZenith;
      uniform vec3 uMid;
      uniform vec3 uHorizon;
      uniform float uMilkyWay;
      uniform float uFade;
      varying vec3 vDir;
      ${NOISE_GLSL}
      void main() {
        vec3 dir = normalize(vDir);
        float h = clamp(dir.y, -0.08, 1.0);
        vec3 color = mix(uHorizon, uMid, smoothstep(-0.02, 0.24, h));
        color = mix(color, uZenith, smoothstep(0.16, 0.72, h));
        // 银河带：倾斜大圆截面上的柔和亮带与偏移尘埃暗纹。
        vec3 bandNormal = normalize(vec3(0.581, 0.468, 0.665));
        float d = dot(dir, bandNormal);
        float band = exp(-d * d * 55.0) * smoothstep(-0.06, 0.12, dir.y);
        float wisps = atlFbm(dir * 5.5);
        float lane = exp(-pow(abs(d + 0.012), 2.0) * 700.0) * (0.3 + 0.7 * atlFbm(dir * 9.0 + 3.0));
        vec3 milky = mix(vec3(0.34, 0.42, 0.62), vec3(0.5, 0.44, 0.58), wisps);
        color += milky * band * (0.05 + wisps * 0.13) * uMilkyWay;
        color *= 1.0 - lane * band * 0.3 * uMilkyWay;
        // 月亮方位一侧地平线略微提亮，呼应月光。
        float moonSide = max(0.0, dot(normalize(vec3(0.42, 0.0, -0.8)), normalize(vec3(dir.x, 0.0, dir.z))));
        color += vec3(0.05, 0.065, 0.09) * pow(moonSide, 5.0) * (1.0 - smoothstep(0.0, 0.45, h));
        gl_FragColor = vec4(color, uFade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  );
  const geometry = keep(new THREE.SphereGeometry(1500, 40, 20));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "atlantis_sky_dome";
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

/**
 * 分层星空：亮星/中星/微星依次排入同一缓冲，银河带内再撒一层暗弱星尘。
 * 低质量档只用 setDrawRange 截掉尾部微星与星尘，不重建几何。
 */
export function buildStarField(keep) {
  const rand = seededRandom(20260929);
  const positions = [];
  const sizes = [];
  const phases = [];
  const tints = [];
  const bright = new THREE.Color("#fff7e8");
  const cool = new THREE.Color("#bcd2ff");
  const plain = new THREE.Color("#e8eeff");
  const color = new THREE.Color();
  // 银河带法线需与天穹 shader 内保持一致。
  const bandNormal = new THREE.Vector3(0.581, 0.468, 0.665).normalize();
  const pushStar = (direction, size, tint) => {
    positions.push(direction.x * 1360, direction.y * 1360, direction.z * 1360);
    sizes.push(size);
    phases.push(rand() * Math.PI * 2);
    tints.push(tint.r, tint.g, tint.b);
  };
  const randomDirection = () => {
    // 上半球均匀采样，略低于地平线的星会被水面与岛屿遮挡。
    const u = rand();
    const v = rand();
    const theta = Math.PI * 2 * u;
    const y = -0.04 + v * 1.04;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    return new THREE.Vector3(Math.cos(theta) * ring, y, Math.sin(theta) * ring);
  };
  const pickTint = (warmth) => {
    if (warmth < 0.12) return color.copy(bright);
    if (warmth < 0.34) return color.copy(cool);
    return color.copy(plain);
  };
  const tiers = [
    // [数量, 最小尺寸, 尺寸跨度, 亮度倍率]
    [90, 3.4, 1.8, 1.0],
    [520, 2.1, 1.3, 0.85],
    [890, 1.2, 1.0, 0.7],
  ];
  for (const [count, base, span, gain] of tiers) {
    for (let i = 0; i < count; i++) {
      const direction = randomDirection();
      const tint = pickTint(rand()).multiplyScalar(gain);
      pushStar(direction, base + rand() * span, tint);
    }
  }
  const lowCount = positions.length / 3;
  // 银河星尘：沿银带聚集的暗弱小星，仅高质量档绘制。
  const bandColor = new THREE.Color("#a9b6d8");
  for (let placed = 0; placed < 900; ) {
    const direction = randomDirection();
    const d = direction.dot(bandNormal);
    if (rand() > Math.exp(-d * d * 22) * 0.92) continue;
    const size = 0.7 + rand() * 0.8;
    pushStar(
      direction,
      size,
      color.copy(bandColor).multiplyScalar(0.34 + rand() * 0.2),
    );
    placed++;
  }
  const total = positions.length / 3;
  const geometry = keep(new THREE.BufferGeometry());
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(phases, 1));
  geometry.setAttribute("aTint", new THREE.Float32BufferAttribute(tints, 3));
  const uniforms = {
    uTime: { value: 0 },
    uFade: { value: 1 },
    uPixelScale: { value: 1.35 },
  };
  const material = keep(
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      attribute vec3 aTint;
      uniform float uTime;
      uniform float uPixelScale;
      varying vec3 vTint;
      varying float vTwinkle;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float twinkle = 0.74 + 0.26 * sin(uTime * (0.5 + fract(aPhase * 7.31) * 1.2) + aPhase);
        vTwinkle = twinkle;
        vTint = aTint;
        gl_PointSize = max(aSize * uPixelScale * (900.0 / -mv.z) * (0.85 + 0.3 * twinkle), 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
      fragmentShader: `
      uniform float uFade;
      varying vec3 vTint;
      varying float vTwinkle;
      void main() {
        float alpha = smoothstep(0.5, 0.1, length(gl_PointCoord - 0.5));
        gl_FragColor = vec4(vTint * vTwinkle * uFade, alpha * uFade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  const points = new THREE.Points(geometry, material);
  points.name = "atlantis_stars";
  points.renderOrder = -9;
  points.frustumCulled = false;
  return { points, uniforms, total, lowCount };
}

/**
 * 月亮：程序化月面圆盘（月海斑块、凸月明暗界线、边缘暗化与地照微光）
 * 加内层月晕与外层宽晕两片叠加光晕；圆盘每帧 lookAt 玩家保持正面。
 */
export function buildMoon(keep) {
  const group = new THREE.Group();
  group.name = "atlantis_moon";
  group.position.copy(MOON_DIRECTION).multiplyScalar(1250);
  const uniforms = { uFade: { value: 1 } };
  const discMaterial = keep(
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
      fragmentShader: `
      uniform float uFade;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        // 月海与高地：低频斑块定大形，高频颗粒补细节。
        float mare = atlFbm(vec3(p * 2.6, 4.7));
        float grain = atlFbm(vec3(p * 9.0, 1.3));
        vec3 highland = vec3(0.97, 0.94, 0.85);
        vec3 maria = vec3(0.6, 0.6, 0.58);
        vec3 color = mix(highland, maria, smoothstep(0.42, 0.66, mare) * 0.85);
        color *= 0.9 + grain * 0.16;
        // 凸月明暗界线：暗侧保留微弱地照，不是纯白圆片。
        float terminator = p.x + 0.42 - 0.22 * (1.0 - r * r);
        float lit = smoothstep(-0.1, 0.06, terminator);
        vec3 earthshine = color * vec3(0.14, 0.16, 0.23);
        color = mix(earthshine, color, lit);
        color *= 0.76 + 0.24 * smoothstep(1.0, 0.5, r);
        float alpha = smoothstep(1.0, 0.94, r);
        gl_FragColor = vec4(color, alpha * uFade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  );
  const disc = new THREE.Mesh(
    keep(new THREE.CircleGeometry(34, 48)),
    discMaterial,
  );
  disc.name = "atlantis_moon_disc";
  disc.renderOrder = -8;
  group.add(disc);
  const haloTexture = keep(createFluidTexture("mist"));
  const haloInner = keep(
    new THREE.SpriteMaterial({
      map: haloTexture,
      color: "#b9c8e8",
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  const inner = new THREE.Sprite(haloInner);
  inner.name = "atlantis_moon_halo_inner";
  inner.scale.set(165, 165, 1);
  inner.renderOrder = -9;
  group.add(inner);
  const haloOuter = keep(
    new THREE.SpriteMaterial({
      map: haloTexture,
      color: "#8ea3cf",
      transparent: true,
      opacity: 0.07,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  const outer = new THREE.Sprite(haloOuter);
  outer.name = "atlantis_moon_halo_outer";
  outer.scale.set(430, 430, 1);
  outer.renderOrder = -9;
  group.add(outer);
  return { group, uniforms, haloInner, haloOuter };
}

/**
 * 夜岛剪影：三排顶点拉出海岭折面，峰顶抖动形成岩石轮廓，
 * 全部位于航道（x±300、z -1150..140）之外，只看不碰。
 * 返回合并后的单网格岛屿群、脉动灯塔与村落灯点。
 */
export function buildIslands(keep) {
  const rand = seededRandom(4177);
  const configs = [
    // 南岛在主出生点后方 z>140 之外，最高主峰立一座小灯塔。
    {
      center: [-95, 2, 330],
      length: 210,
      height: 38,
      width: 34,
      peaks: 3,
      beacon: true,
    },
    // 西岛在 x<-300 之外，体量最大，双峰远山。
    { center: [-520, 2, -420], length: 320, height: 66, width: 52, peaks: 4 },
    // 东南火山锥独峰，x>300 之外。
    { center: [470, 2, -660], length: 230, height: 52, width: 40, peaks: 2 },
    // 南侧远处一条低平暗礁链，压出地平线层次。
    { center: [180, 2, 470], length: 170, height: 16, width: 22, peaks: 2 },
  ];
  const baseColor = new THREE.Color("#070c16");
  const crestColor = new THREE.Color("#131e31");
  const color = new THREE.Color();
  const geometries = [];
  const structures = [];
  const fit = { beacon: null, villages: [] };
  const samplingMaterial = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
  });
  let beaconPeak = null;
  const villageLights = [];
  const villageRandom = seededRandom(6711);
  function addStructure(geometry) {
    geometry.deleteAttribute("uv");
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3) crestColor.toArray(colors, i);
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    structures.push(geometry);
  }
  for (const config of configs) {
    const segments = 56;
    // 峰形为若干高斯峰叠加，两端收束到海平面。
    const peaks = [];
    for (let i = 0; i < config.peaks; i++) {
      const offset = (i + 0.5) / config.peaks - 0.5;
      peaks.push({
        x: offset * config.length * (0.72 + rand() * 0.2),
        h: config.height * (0.45 + rand() * 0.55),
        w: config.length * (0.08 + rand() * 0.09),
      });
    }
    peaks.sort((a, b) => b.h - a.h);
    if (config.beacon)
      beaconPeak = {
        x: peaks[0].x + config.center[0],
        y: peaks[0].h + config.center[1],
        z: config.center[2],
      };
    const positions = [];
    const colors = [];
    const indices = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = (t - 0.5) * config.length;
      let h = 0;
      for (const peak of peaks) {
        const dx = (x - peak.x) / peak.w;
        h = Math.max(h, peak.h * Math.exp(-dx * dx));
      }
      const envelope = Math.pow(Math.sin(Math.PI * t), 0.65);
      h *= envelope;
      // 峰线锯齿与走向抖动，剪影不是光滑圆锥。
      const jagged = 0.82 + rand() * 0.36;
      const crestX = x + (rand() - 0.5) * config.length * 0.02;
      const crestZ = (rand() - 0.5) * config.width * 0.5;
      const halfWidth = config.width * (0.55 + 0.45 * envelope);
      positions.push(
        x,
        -3,
        -halfWidth,
        crestX,
        h * jagged,
        crestZ,
        x,
        -3,
        halfWidth,
      );
      color.copy(baseColor).lerp(crestColor, Math.min(1, h / config.height));
      colors.push(
        baseColor.r,
        baseColor.g,
        baseColor.b,
        color.r,
        color.g,
        color.b,
        baseColor.r,
        baseColor.g,
        baseColor.b,
      );
    }
    for (let i = 0; i < segments; i++) {
      const a = i * 3;
      indices.push(
        a,
        a + 1,
        a + 3,
        a + 1,
        a + 4,
        a + 3,
        a + 1,
        a + 2,
        a + 4,
        a + 2,
        a + 5,
        a + 4,
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    // 山坡三角形必须朝外朝上，避免只渲染背坡造成贴地面的视觉缺失。
    geometry.computeVertexNormals();
    geometry.translate(...config.center);
    geometries.push(geometry);
    // 地标必须从最终三角网格取高程，不能再用未经包络和随机扰动的名义峰值。
    if (config.beacon) {
      const terrain = new THREE.Mesh(geometry, samplingMaterial);
      terrain.updateMatrixWorld(true);
      const ray = new THREE.Raycaster(
        new THREE.Vector3(),
        new THREE.Vector3(0, -1, 0),
      );
      const heightAt = (x, z) => {
        ray.ray.origin.set(x, 200, z);
        const hit = ray.intersectObject(terrain, false)[0];
        if (!hit)
          throw new Error("Atlantis island support lies outside the terrain");
        return hit.point.y;
      };
      const support = (x, z, radius, lift) => {
        const samples = [];
        for (let ix = -6; ix <= 6; ix++)
          for (let iz = -6; iz <= 6; iz++) {
            const dx = (ix * radius) / 6,
              dz = (iz * radius) / 6;
            if (dx * dx + dz * dz > radius * radius) continue;
            samples.push(heightAt(x + dx, z + dz));
          }
        return {
          x,
          z,
          radius,
          groundMin: Math.min(...samples),
          groundMax: Math.max(...samples),
          bottom: Math.min(...samples) - 0.65,
          top: Math.max(...samples) + lift,
        };
      };
      const x = beaconPeak.x - 0.5,
        z = beaconPeak.z;
      const base = support(x, z, 2.4, 0.25);
      const footing = new THREE.CylinderGeometry(
        2.15,
        2.4,
        base.top - base.bottom,
        12,
      );
      footing.translate(x, (base.top + base.bottom) / 2, z);
      addStructure(footing);
      const towerBottom = base.top - 0.2;
      const tower = new THREE.CylinderGeometry(1.1, 1.6, 7, 6);
      tower.translate(x, towerBottom + 3.5, z);
      addStructure(tower);
      beaconPeak = { x, y: towerBottom + 7.3, z };
      fit.beacon = {
        ...base,
        towerBottom,
        towerTop: towerBottom + 7,
        lightCenter: { ...beaconPeak },
        height: 7,
      };
      // 岛脚窗光也从同一片真实山坡取样；小屋基座下沉到整个占地的最低点。
      for (let i = 0; i < 6; i++) {
        const vx = x - 26 + villageRandom() * 44,
          vz = config.center[2] - 14 - villageRandom() * 6;
        const house = support(vx, vz, 1.45, 1.1);
        const building = new THREE.BoxGeometry(2, house.top - house.bottom, 2);
        building.translate(vx, (house.top + house.bottom) / 2, vz);
        addStructure(building);
        const light = { x: vx, y: house.top - 0.35, z: vz - 1.015 };
        villageLights.push(light.x, light.y, light.z);
        fit.villages.push({ ...house, light });
      }
    }
  }
  samplingMaterial.dispose();
  // 保留地形顶点范围供独立贴地校验，不额外持有或绘制一份地形。
  const ready = [...geometries, ...structures].map((g) => {
    if (!g.index) return g;
    const flat = g.toNonIndexed();
    g.dispose();
    return flat;
  });
  const terrainVertexCount = ready
    .slice(0, geometries.length)
    .reduce((sum, g) => sum + g.attributes.position.count, 0);
  const merged = keep(mergeGeometries(ready));
  for (const geometry of ready) geometry.dispose();
  const material = keep(
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      fog: true,
    }),
  );
  const group = new THREE.Group();
  group.name = "atlantis_islands";
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = "atlantis_island_ridges";
  mesh.userData.terrainVertexCount = terrainVertexCount;
  group.userData.surfaceFit = fit;
  group.add(mesh);
  // 灯塔暖光点与脉动光晕，夜间远岛的方位参照。
  const beaconDot = new THREE.Mesh(
    keep(new THREE.SphereGeometry(1.1, 8, 6)),
    keep(
      new THREE.MeshBasicMaterial({
        color: "#ffd9a0",
        transparent: true,
        opacity: 0.95,
        fog: false,
      }),
    ),
  );
  beaconDot.name = "atlantis_beacon_light";
  beaconDot.position.set(beaconPeak.x, beaconPeak.y, beaconPeak.z);
  group.add(beaconDot);
  const beaconGlow = keep(
    new THREE.SpriteMaterial({
      map: keep(createFluidTexture("mist")),
      color: "#ffb45c",
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  const beacon = new THREE.Sprite(beaconGlow);
  beacon.name = "atlantis_beacon_glow";
  beacon.position.copy(beaconDot.position);
  beacon.scale.set(30, 30, 1);
  group.add(beacon);
  // 南岛山脚的渔村灯点，一次绘制的微小暖色 Points。
  const villageGeometry = keep(new THREE.BufferGeometry());
  villageGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(villageLights, 3),
  );
  const villageMaterial = keep(
    new THREE.PointsMaterial({
      map: keep(createFluidTexture("bubble")),
      color: "#ff9a44",
      size: 1.4,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  const village = new THREE.Points(villageGeometry, villageMaterial);
  village.name = "atlantis_village_lights";
  group.add(village);
  return {
    group,
    material,
    fit,
    beaconDot: beaconDot.material,
    beaconGlow,
    villageMaterial,
  };
}
