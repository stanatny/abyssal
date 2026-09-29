import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * Shared geometry, texture and material helpers for the Atlantis city module.
 * 模块级缓存与 creature_hunters.js 的 GEOMETRIES 语义一致：跨实例复用，
 * dispose 时保留共享缓存，仅释放每次 create 生成的合并几何与实例缓冲。
 */

/** 基础构件几何共享缓存（模块级，跨城市实例复用）。 */
export const GEOMETRIES = new Map();
const TEXTURES = new Map();
let SHARED_MATERIALS = null;

/** 确定性伪随机序列，保证多次构建得到同一城市。 */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * 取或建共享几何体。
 * @param {string} key 缓存键。
 * @param {Function} make 首次调用时的构建函数。
 * @returns {THREE.BufferGeometry} 缓存的几何体。
 */
export function cachedGeometry(key, make) {
  if (!GEOMETRIES.has(key)) GEOMETRIES.set(key, make());
  return GEOMETRIES.get(key);
}

/*********************************************
 * 程序化石材质纹理（CanvasTexture，节点环境下留空）
 ********************************************/

function makeCanvas(size) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

/**
 * 砌筑石材质纹理：砖缝、斑点、裂缝与苔藻渍。
 * @param {string} key 缓存键（"stone" 粗砌块 / "marble" 细石材）。
 * @returns {THREE.CanvasTexture|null} 共享纹理；无 DOM 环境返回 null。
 */
export function stoneTexture(key = "stone") {
  if (TEXTURES.has(key)) return TEXTURES.get(key);
  const canvas = makeCanvas(512);
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  const rand = seededRandom(key === "marble" ? 4117 : 9281);
  const fine = key === "marble";
  ctx.fillStyle = fine ? "#9aa0a2" : "#848b89";
  ctx.fillRect(0, 0, 512, 512);

  // 砌缝：水平灰缝加错缝竖线，大理石用更密更弱的线。
  const course = fine ? 42 : 64;
  ctx.strokeStyle = fine ? "rgba(52,56,58,0.34)" : "rgba(38,42,44,0.55)";
  ctx.lineWidth = fine ? 2 : 4;
  for (let y = 0; y <= 512; y += course) {
    ctx.beginPath();
    ctx.moveTo(0, y + (rand() - 0.5) * 3);
    ctx.lineTo(512, y + (rand() - 0.5) * 3);
    ctx.stroke();
    const offset = (Math.floor(y / course) % 2) * course;
    for (let x = offset; x < 512 + course; x += course * (fine ? 1 : 2)) {
      ctx.beginPath();
      ctx.moveTo(x + (rand() - 0.5) * 4, y);
      ctx.lineTo(x + (rand() - 0.5) * 4, y + course);
      ctx.stroke();
    }
  }

  // 石面斑点与高光颗粒。
  for (let i = 0; i < (fine ? 2600 : 4200); i += 1) {
    const shade = rand() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${0.03 + rand() * 0.06})`;
    ctx.fillRect(
      rand() * 512,
      rand() * 512,
      1 + rand() * 2.5,
      1 + rand() * 2.5,
    );
  }

  // 侵蚀裂缝：随机折线。
  ctx.strokeStyle = "rgba(30,34,36,0.5)";
  for (let i = 0; i < (fine ? 6 : 14); i += 1) {
    ctx.lineWidth = 0.8 + rand() * 1.6;
    let x = rand() * 512;
    let y = rand() * 512;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segments = 4 + Math.floor(rand() * 5);
    for (let s = 0; s < segments; s += 1) {
      x += (rand() - 0.5) * 90;
      y += (rand() - 0.3) * 70;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // 苔藻与水渍晕染。
  for (let i = 0; i < (fine ? 8 : 16); i += 1) {
    const x = rand() * 512;
    const y = rand() * 512;
    const radius = 24 + rand() * 90;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const green = rand() > 0.45;
    gradient.addColorStop(
      0,
      green ? "rgba(64,102,74,0.34)" : "rgba(52,64,70,0.3)",
    );
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // 大理石加浅色脉络。
  if (fine) {
    ctx.strokeStyle = "rgba(214,220,222,0.28)";
    for (let i = 0; i < 9; i += 1) {
      ctx.lineWidth = 1 + rand() * 2;
      ctx.beginPath();
      ctx.moveTo(rand() * 512, rand() * 512);
      ctx.bezierCurveTo(
        rand() * 512,
        rand() * 512,
        rand() * 512,
        rand() * 512,
        rand() * 512,
        rand() * 512,
      );
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  texture.colorSpace = THREE.SRGBColorSpace;
  TEXTURES.set(key, texture);
  return texture;
}

/** 粒子用的柔边圆点纹理。 */
export function softDotTexture() {
  if (TEXTURES.has("soft_dot")) return TEXTURES.get("soft_dot");
  const canvas = makeCanvas(64);
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.4)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  TEXTURES.set("soft_dot", texture);
  return texture;
}

/*********************************************
 * 共享材质：深海雾减免让发光体在雾中保留剪影
 ********************************************/

/**
 * 给材质注入雾减免：fogFactor 乘以 relief（<1 看得更远）。
 * 发光标志物在 0.011 密度雾中 250m 仍保留约三成亮度，不是截图专用打光。
 */
function applyFogRelief(material, relief) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.atlFogRelief = { value: relief };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <fog_pars_fragment>",
        "#include <fog_pars_fragment>\nuniform float atlFogRelief;",
      )
      .replace(
        "#include <fog_fragment>",
        `#ifdef USE_FOG
        #ifdef FOG_EXP2
          float atlFogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
        #else
          float atlFogFactor = smoothstep( fogNear, fogFar, vFogDepth );
        #endif
        gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, atlFogFactor * atlFogRelief );
        #endif`,
      );
  };
  material.customProgramCacheKey = () => `atl_fog_${relief}`;
}

/**
 * 城市共享材质集（懒单例；dispose 不释放，跨实例复用）。
 * @returns {object} 命名材质表。
 */
export function atlantisMaterials() {
  if (SHARED_MATERIALS) return SHARED_MATERIALS;
  const stone = new THREE.MeshStandardMaterial({
    map: stoneTexture("stone"),
    vertexColors: true,
    roughness: 0.93,
    metalness: 0.06,
  });
  const marble = new THREE.MeshStandardMaterial({
    map: stoneTexture("marble"),
    vertexColors: true,
    roughness: 0.78,
    metalness: 0.04,
  });
  const rockDark = new THREE.MeshStandardMaterial({
    map: stoneTexture("stone"),
    color: "#5d6a6d",
    vertexColors: true,
    roughness: 0.96,
    metalness: 0.03,
  });
  const bronze = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.46,
    metalness: 0.62,
  });
  const guideTeal = new THREE.MeshStandardMaterial({
    color: "#0d3f46",
    emissive: "#2fe8d0",
    emissiveIntensity: 1.9,
    roughness: 0.4,
    metalness: 0.1,
  });
  const lapisGlow = new THREE.MeshStandardMaterial({
    color: "#10235c",
    emissive: "#4d8dff",
    emissiveIntensity: 2.4,
    roughness: 0.35,
    metalness: 0.15,
  });
  const pearlReef = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.03,
  });
  const shell = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.61,
    metalness: 0.12,
  });
  const nacre = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.3,
    metalness: 0.18,
    clearcoat: 0.55,
    iridescence: 0.65,
    iridescenceIOR: 1.32,
  });
  const pearl = new THREE.MeshPhysicalMaterial({
    color: "#fff0bd",
    emissive: "#ffe1a4",
    emissiveIntensity: 1.2,
    roughness: 0.2,
    metalness: 0.05,
    clearcoat: 1,
    iridescence: 0.4,
  });
  applyFogRelief(shell, 0.8);
  applyFogRelief(nacre, 0.75);
  applyFogRelief(pearl, 0.55);
  // 结构材只轻微减免，发光导引与火光减免更强，保证雾中剪影可读。
  applyFogRelief(stone, 0.9);
  applyFogRelief(marble, 0.88);
  applyFogRelief(rockDark, 0.95);
  applyFogRelief(bronze, 0.85);
  applyFogRelief(guideTeal, 0.58);
  applyFogRelief(lapisGlow, 0.52);
  SHARED_MATERIALS = {
    pearlReef,
    shell,
    nacre,
    pearl,
    stone,
    marble,
    rockDark,
    bronze,
    guideTeal,
    lapisGlow,
  };
  return SHARED_MATERIALS;
}

/*********************************************
 * 顶点着色：石缝、侵蚀、苔藻、分色
 ********************************************/

// 廉价确定性"噪声"：多频正弦叠加，足以做宏观色斑。
function grain(x, y, z, seed) {
  return (
    Math.sin(x * 0.31 + seed * 1.7) * Math.sin(y * 0.43 + seed * 0.9) * 0.5 +
    Math.sin(x * 0.083 + z * 0.117 + seed) * 0.35 +
    Math.sin(y * 0.157 + x * 0.071 + seed * 2.3) * 0.15
  );
}

/**
 * 为几何体写入顶点色：基色起伏、侵蚀暗斑、低位苔藻、朝下面阴影。
 * @param {THREE.BufferGeometry} geometry 目标几何（就地写入 color 属性）。
 * @param {object} options base/algae 色、seed、worldOffset、algaeTop 等。
 * @returns {THREE.BufferGeometry} 同一几何体。
 */
export function paintStone(geometry, options = {}) {
  const {
    base = "#8d918c",
    algae = "#3f6a52",
    seed = 1,
    worldOffset = { x: 0, y: 0, z: 0 },
    algaeAmount = 0.55,
    algaeTop = Infinity,
    darkenDown = 0.78,
    tint,
  } = options;
  const baseColor = new THREE.Color(base);
  const algaeColor = new THREE.Color(algae);
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const colors = new Float32Array(position.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i) + worldOffset.x;
    const y = position.getY(i) + worldOffset.y;
    const z = position.getZ(i) + worldOffset.z;
    const large = grain(x, y, z, seed);
    color
      .copy(baseColor)
      .multiplyScalar(0.8 + 0.18 * (large * 0.5 + 0.5) + 0.1 * large);
    // 高频侵蚀坑斑。
    const pit =
      Math.sin(x * 1.9 + seed) *
      Math.sin(y * 2.3 + seed * 1.3) *
      Math.sin(z * 2.1 + seed * 0.7);
    if (pit > 0.62) color.multiplyScalar(0.62);
    else if (pit < -0.72) color.multiplyScalar(1.12);
    // 低位与潮湿面苔藻。
    const heightFactor =
      y + worldOffset.y * 0 < algaeTop
        ? 0.5
        : Math.max(0, 1 - (y - algaeTop) * 0.08);
    const algaeNoise =
      grain(x * 0.6 + 40, y * 0.6, z * 0.6, seed + 7) * 0.5 + 0.5;
    const algaeMix = Math.min(
      1,
      algaeNoise * algaeAmount * (0.35 + 0.65 * heightFactor),
    );
    color.lerp(algaeColor, algaeMix * 0.7);
    // 朝下凹槽更暗，近似环境光遮蔽。
    if (normal && normal.getY(i) < -0.25) color.multiplyScalar(darkenDown);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  if (tint) multiplyColorAttribute(geometry, tint);
  return geometry;
}

/** 几何顶点色整体乘色，用于同一批石件分出冷暖。 */
export function multiplyColorAttribute(geometry, tint) {
  const color = new THREE.Color(tint);
  const attribute = geometry.attributes.color;
  if (!attribute) return geometry;
  for (let i = 0; i < attribute.count; i += 1) {
    attribute.setXYZ(
      i,
      attribute.getX(i) * color.r,
      attribute.getY(i) * color.g,
      attribute.getZ(i) * color.b,
    );
  }
  return geometry;
}

/*********************************************
 * UV 工具：按世界尺度平铺，避免大面拉伸
 ********************************************/

/**
 * 依据顶点法线主轴做平面投影 UV，tile 为一张纹理的世界尺寸（米）。
 * 合并前几何应已烘焙到城市局部坐标。
 */
export function worldUVs(geometry, tile = 5.5) {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uvs = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i += 1) {
    const nx = normal ? Math.abs(normal.getX(i)) : 0;
    const ny = normal ? Math.abs(normal.getY(i)) : 1;
    const nz = normal ? Math.abs(normal.getZ(i)) : 0;
    let u;
    let v;
    if (ny >= nx && ny >= nz) {
      u = position.getX(i);
      v = position.getZ(i);
    } else if (nx >= nz) {
      u = position.getZ(i);
      v = position.getY(i);
    } else {
      u = position.getX(i);
      v = position.getY(i);
    }
    uvs[i * 2] = u / tile;
    uvs[i * 2 + 1] = v / tile;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  return geometry;
}

/*********************************************
 * 参数化放样：柱身、雕像躯干、袍褶
 ********************************************/

/**
 * 截面参数插值采样。
 * 每个控制截面：{ y, rx, rz, cx, cz, rot, wave, waveAmp, wavePhase, wave2, wave2Amp }
 * rx/rz 为椭圆半径；wave 为径向余弦调制（袍褶/凹槽/方化）；rot 扭转角。
 */
function sampleSections(sections, subdivision) {
  const samples = [];
  for (let i = 0; i < sections.length - 1; i += 1) {
    const a = sections[i];
    const b = sections[i + 1];
    const steps = Math.max(1, Math.round(Math.abs(b.y - a.y) * subdivision));
    for (let s = 0; s < steps; s += 1) {
      const t = s / steps;
      const smooth = t * t * (3 - 2 * t);
      const blend = (key, fallback = 0) =>
        (a[key] ?? fallback) +
        ((b[key] ?? fallback) - (a[key] ?? fallback)) * smooth;
      samples.push({
        y: a.y + (b.y - a.y) * t,
        rx: blend("rx", 1),
        rz: blend("rz", 1),
        cx: blend("cx"),
        cz: blend("cz"),
        rot: blend("rot"),
        wave: blend("wave"),
        waveAmp: blend("waveAmp"),
        wavePhase: blend("wavePhase"),
        wave2: blend("wave2"),
        wave2Amp: blend("wave2Amp"),
      });
    }
  }
  // 最后一环也补齐默认值，避免未指定的扭转/偏移把整片网格变成 NaN。
  samples.push({
    rx: 1,
    rz: 1,
    cx: 0,
    cz: 0,
    rot: 0,
    wave: 0,
    waveAmp: 0,
    wavePhase: 0,
    wave2: 0,
    wave2Amp: 0,
    ...sections[sections.length - 1],
  });
  return samples;
}

/**
 * 纵向放样几何体（原点在底，沿 +Y 生长）。
 * @param {string|null} key 共享缓存键；null 表示不缓存。
 * @param {object[]} sections 控制截面列表。
 * @param {object} options radial、tile、capStart、capEnd、jaggedTop、seed。
 * @returns {THREE.BufferGeometry} 放样几何。
 */
export function loftGeometry(key, sections, options = {}) {
  const make = () => {
    const {
      radial = 36,
      tile = 4,
      subdivision = 0.6,
      capStart = false,
      capEnd = false,
      jaggedTop = 0,
      seed = 3,
      uvScale = 1,
    } = options;
    const samples = sampleSections(sections, subdivision);
    const rows = samples.length;
    const cols = radial + 1;
    const positions = new Float32Array(rows * cols * 3);
    const uvs = new Float32Array(rows * cols * 2);
    const indices = [];
    const jagged = new Array(cols)
      .fill(0)
      .map((_, j) =>
        jaggedTop
          ? Math.sin(j * 3.7 + seed * 5.1) * 0.5 +
            Math.sin(j * 8.3 + seed * 2.7) * 0.5
          : 0,
      );
    for (let r = 0; r < rows; r += 1) {
      const section = samples[r];
      const isTop = r === rows - 1;
      for (let c = 0; c < cols; c += 1) {
        const theta = (c / radial) * Math.PI * 2 + section.rot;
        let radiusScale = 1;
        if (section.waveAmp)
          radiusScale +=
            section.waveAmp *
            Math.cos(section.wave * theta + section.wavePhase);
        if (section.wave2Amp)
          radiusScale += section.wave2Amp * Math.cos(section.wave2 * theta);
        const index = (r * cols + c) * 3;
        positions[index] =
          Math.cos(theta) * section.rx * radiusScale + section.cx;
        positions[index + 1] = section.y + (isTop ? jagged[c] * jaggedTop : 0);
        positions[index + 2] =
          Math.sin(theta) * section.rz * radiusScale + section.cz;
        const uvIndex = (r * cols + c) * 2;
        uvs[uvIndex] =
          (c / radial) *
          Math.max(1, Math.round((section.rx * 6.28) / tile)) *
          uvScale;
        uvs[uvIndex + 1] = section.y / tile;
      }
    }
    for (let r = 0; r < rows - 1; r += 1) {
      for (let c = 0; c < radial; c += 1) {
        const a = r * cols + c;
        const b = a + 1;
        const d = a + cols;
        const e = d + 1;
        indices.push(a, d, b, b, d, e);
      }
    }
    // 端盖：扇形补面，粗糙柱头便于染深色。
    let finalPositions = positions;
    let finalUvs = uvs;
    const addCap = (row, flip) => {
      const centerIndex = finalPositions.length / 3;
      const section = samples[row];
      const capY = section.y + (row === rows - 1 ? jagged[0] * jaggedTop : 0);
      const mergedPositions = new Float32Array(finalPositions.length + 3);
      mergedPositions.set(finalPositions);
      mergedPositions.set(
        [section.cx, capY, section.cz],
        finalPositions.length,
      );
      const mergedUvs = new Float32Array(finalUvs.length + 2);
      mergedUvs.set(finalUvs);
      for (let c = 0; c < radial; c += 1) {
        const a = row * cols + c;
        const b = a + 1;
        if (flip) indices.push(centerIndex, b, a);
        else indices.push(centerIndex, a, b);
      }
      finalPositions = mergedPositions;
      finalUvs = mergedUvs;
    };
    if (capStart) addCap(0, false);
    if (capEnd) addCap(rows - 1, true);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(finalPositions, 3),
    );
    geometry.setAttribute("uv", new THREE.BufferAttribute(finalUvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  };
  return key ? cachedGeometry(key, make) : make();
}

/*********************************************
 * 沿空间曲线的变半径管道：手臂、三叉戟齿、须发
 ********************************************/

/**
 * 沿样条的变半径圆管。
 * @param {string|null} key 缓存键。
 * @param {THREE.Vector3[]|number[][]} points 控制点。
 * @param {number[]} radii 与控制点对应的半径。
 * @param {object} options radial、tile。
 */
export function tubeGeometry(key, points, radii, options = {}) {
  const make = () => {
    const { radial = 10, tile = 3, samples = 24 } = options;
    const vectors = points.map((p) =>
      p.isVector3 ? p.clone() : new THREE.Vector3(p[0], p[1], p[2]),
    );
    const curve = new THREE.CatmullRomCurve3(vectors);
    const frames = curve.computeFrenetFrames(samples, false);
    const cols = radial + 1;
    const positions = new Float32Array((samples + 1) * cols * 3);
    const uvs = new Float32Array((samples + 1) * cols * 2);
    const indices = [];
    const radiusAt = (t) => {
      const scaled = t * (radii.length - 1);
      const i = Math.min(radii.length - 2, Math.floor(scaled));
      return radii[i] + (radii[i + 1] - radii[i]) * (scaled - i);
    };
    for (let s = 0; s <= samples; s += 1) {
      const t = s / samples;
      const center = curve.getPointAt(t);
      const normal = frames.normals[s];
      const binormal = frames.binormals[s];
      const radius = radiusAt(t);
      for (let c = 0; c < cols; c += 1) {
        const theta = (c / radial) * Math.PI * 2;
        const index = (s * cols + c) * 3;
        positions[index] =
          center.x +
          radius * (Math.cos(theta) * normal.x + Math.sin(theta) * binormal.x);
        positions[index + 1] =
          center.y +
          radius * (Math.cos(theta) * normal.y + Math.sin(theta) * binormal.y);
        positions[index + 2] =
          center.z +
          radius * (Math.cos(theta) * normal.z + Math.sin(theta) * binormal.z);
        const uvIndex = (s * cols + c) * 2;
        uvs[uvIndex] =
          (c / radial) * Math.max(1, Math.round((radius * 6.28) / tile));
        uvs[uvIndex + 1] = (t * curve.getLength()) / tile;
      }
    }
    for (let s = 0; s < samples; s += 1) {
      for (let c = 0; c < radial; c += 1) {
        const a = s * cols + c;
        const b = a + 1;
        const d = a + cols;
        const e = d + 1;
        // Frenet 截面沿曲线推进时绕序与 Y 轴放样相反，管面法线必须朝外。
        indices.push(a, b, d, b, e, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  };
  return key ? cachedGeometry(key, make) : make();
}

/*********************************************
 * 静态合并与实例化
 ********************************************/

// 合并前统一属性集合：position/normal/uv/color，全部非索引化。
function finalizeForMerge(geometry, tile) {
  let result = geometry.index ? geometry.toNonIndexed() : geometry;
  if (!result.attributes.normal) result.computeVertexNormals();
  if (!result.attributes.color) {
    const count = result.attributes.position.count;
    const white = new Float32Array(count * 3).fill(1);
    result.setAttribute("color", new THREE.BufferAttribute(white, 3));
  }
  if (!result.attributes.uv || tile) worldUVs(result, tile || 5.5);
  for (const name of Object.keys(result.attributes)) {
    if (!["position", "normal", "uv", "color"].includes(name))
      result.deleteAttribute(name);
  }
  return result;
}

/**
 * 静态几何按材质合桶，一次 build 得到每材质一个 Mesh。
 * 所有几何先烘焙城市局部变换再合并，draw call 与材质数一致。
 */
export class MergeBucket {
  constructor() {
    this.buckets = new Map();
  }

  /**
   * 放入一件几何。
   * @param {THREE.BufferGeometry} geometry 源几何（克隆后变换，不改动原件）。
   * @param {string} materialKey 材质键（对应 atlantisMaterials 的键）。
   * @param {object} transform position/quaternion/scale/tint。
   */
  add(geometry, materialKey, transform = {}) {
    const {
      position = [0, 0, 0],
      quaternion = null,
      euler = null,
      scale = 1,
      tint = null,
      tile = null,
    } = transform;
    const clone = geometry.clone();
    const matrix = new THREE.Matrix4();
    const q = quaternion
      ? new THREE.Quaternion(...quaternion)
      : euler
        ? new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler))
        : new THREE.Quaternion();
    const s = Array.isArray(scale) ? scale : [scale, scale, scale];
    matrix.compose(new THREE.Vector3(...position), q, new THREE.Vector3(...s));
    clone.applyMatrix4(matrix);
    const ready = finalizeForMerge(clone, tile);
    if (ready !== clone) clone.dispose();
    if (tint) multiplyColorAttribute(ready, tint);
    if (!this.buckets.has(materialKey)) this.buckets.set(materialKey, []);
    this.buckets.get(materialKey).push(ready);
    return this;
  }

  /**
   * 合并并生成网格。
   * @param {object} materials atlantisMaterials() 的材质表。
   * @param {THREE.Object3D} parent 挂载节点。
   * @param {Set} disposables 调用方追踪释放的集合。
   * @returns {THREE.Mesh[]} 生成的网格列表。
   */
  build(materials, parent, disposables) {
    const meshes = [];
    for (const [key, geometries] of this.buckets) {
      const merged = mergeGeometries(geometries, false);
      geometries.forEach((geometry) => geometry.dispose());
      if (!merged) throw new Error(`Failed to merge Atlantis bucket: ${key}`);
      merged.name = `atlantis_merged_${key}`;
      disposables.add(merged);
      const mesh = new THREE.Mesh(merged, materials[key]);
      mesh.name = `atlantis_${key}`;
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.buckets.clear();
    return meshes;
  }
}

/**
 * 创建实例化构件网格。
 * @param {THREE.BufferGeometry} geometry 共享几何。
 * @param {THREE.Material} material 共享材质。
 * @param {object[]} transforms {position, euler?, scale?} 列表。
 * @param {Set} disposables 追踪集合（InstancedMesh 实例缓冲在 dispose 时释放）。
 * @returns {THREE.InstancedMesh} 实例网格。
 */
export function instanced(geometry, material, transforms, disposables) {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((transform, index) => {
    dummy.position.set(...transform.position);
    dummy.rotation.set(...(transform.euler || [0, 0, 0]));
    const scale = transform.scale ?? 1;
    if (Array.isArray(scale)) dummy.scale.set(...scale);
    else dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  disposables.add({
    dispose: () => mesh.dispose(),
  });
  return mesh;
}
