import * as THREE from "three";
import {
  addSurfaceDetail,
  ribbonGeometry,
  coralBranchGeometry,
  seaFanGeometry,
  moundCoralGeometry,
  smoothCoincidentNormals,
  clusterInstances,
  addLeafDetail,
} from "./ocean_visuals.js";
import { WORLD } from "./world_config.js";
import { createBeachEnvironment, islandHeight } from "./beach_environment.js";
import { createOceanExtra, LANDMARK_CLEARINGS } from "./ocean_extra.js";

/**
 * seabedHeight 返回海床高度，供游泳边界、AI 与场景共用。
 * 参数：x、z 为世界坐标；返回对应位置的海床 Y 坐标。
 */
export function seabedHeight(x, z) {
  const slope = THREE.MathUtils.clamp(
    z >= -200 ? -40 + z * 0.5 : -140 + (z + 200) * 0.72,
    -WORLD.maxDepth,
    -26,
  );
  const shelf = Math.sin(x * 0.034 + z * 0.018) * 3.4;
  const ridges = Math.sin(x * 0.077) * Math.cos(z * 0.041) * 2.1;
  const trenchWall = Math.max(0, Math.abs(x) - 94) * 0.16;
  return islandHeight(x, z, slope + shelf + ridges + trenchWall);
}

/**
 * createOcean 创建三层海域与可用于遮挡的障碍物。
 * 参数：scene 为 Three.js 场景；返回 update、colliders（实体）、obstacles（兼容遮挡球）与 dispose。
 */
export function createOcean(scene) {
  const root = new THREE.Group();
  root.name = "ocean_environment";
  scene.add(root);
  const obstacles = [];
  const colliders = [];
  const disposables = new Set();
  const rand = seededRandom(9371);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const worldUniforms = { oceanTime: { value: 0 } };

  const track = (resource) => {
    disposables.add(resource);
    return resource;
  };
  const addMesh = (geometry, material, position, scale) => {
    track(geometry);
    track(material);
    const mesh = new THREE.Mesh(geometry, material);
    if (position) mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    root.add(mesh);
    return mesh;
  };

  // 海床使用同一高度函数，避免视觉地形与角色碰撞边界不一致。
  const terrainGeometry = track(
    new THREE.PlaneGeometry(
      WORLD.maxX - WORLD.minX + 120,
      WORLD.maxZ - WORLD.minZ + 80,
      140,
      280,
    ),
  );
  terrainGeometry.rotateX(-Math.PI / 2);
  terrainGeometry.translate(0, 0, (WORLD.minZ + WORLD.maxZ - 80) * 0.5);
  const terrainPosition = terrainGeometry.attributes.position;
  const terrainColors = [];
  const sand = new THREE.Color("#c2b48b");
  const shelfRock = new THREE.Color("#4f6b65");
  const abyssRock = new THREE.Color("#263f49");
  for (let i = 0; i < terrainPosition.count; i += 1) {
    const x = terrainPosition.getX(i);
    const z = terrainPosition.getZ(i);
    const y = seabedHeight(x, z);
    terrainPosition.setY(i, y);
    const shallowMix = THREE.MathUtils.smoothstep(-z, 15, 130);
    const deepMix = THREE.MathUtils.smoothstep(-z, 190, 350);
    color.copy(sand).lerp(shelfRock, shallowMix).lerp(abyssRock, deepMix);
    color.multiplyScalar(0.85 + Math.sin(x * 0.05 + z * 0.08) * 0.1);
    terrainColors.push(color.r, color.g, color.b);
  }
  terrainGeometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(terrainColors, 3),
  );
  terrainGeometry.computeVertexNormals();
  const terrainMaterial = track(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.93,
      metalness: 0.08,
    }),
  );
  terrainMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.oceanTime = worldUniforms.oceanTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vOceanWorld;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvOceanWorld = (modelMatrix * vec4(position, 1.0)).xyz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float oceanTime;\nvarying vec3 vOceanWorld;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec2 sandUv = vOceanWorld.xz;
        float ripple = sin(sandUv.x * 2.3 + sin(sandUv.y * 0.24) * 3.0);
        float detail = sin(sandUv.x * 17.0 + sandUv.y * 23.0) * sin(sandUv.y * 14.0);
        float shallow = 1.0 - smoothstep(35.0, 110.0, -vOceanWorld.y);
        diffuseColor.rgb *= 0.93 + ripple * 0.05 * shallow + detail * 0.022;
        float c1 = sin(sandUv.x * 0.92 + oceanTime * 0.5 + sin(sandUv.y * 0.53));
        float c2 = cos(sandUv.y * 1.05 - oceanTime * 0.33 + cos(sandUv.x * 0.46));
        float caustic = pow(max(0.0, 1.0 - abs(c1 + c2)), 15.0);
        float d1 = sin(sandUv.x * 3.2 + oceanTime * 0.82 + sin(sandUv.y * 2.1));
        float d2 = cos(sandUv.y * 2.8 - oceanTime * 0.58 + cos(sandUv.x * 1.8));
        float fine = pow(max(0.0, 1.0 - abs(d1 + d2)), 9.0);
        diffuseColor.rgb += vec3(0.50, 0.64, 0.45) * (caustic * 0.12 + fine * 0.075) * shallow;
        float deep = smoothstep(640.0, 820.0, -vOceanWorld.z);
        float fault = abs(sin(sandUv.x * 0.13 + sin(sandUv.y * 0.12) * 2.5));
        float lava = pow(max(0.0, 1.0 - fault), 28.0) * deep;
        diffuseColor.rgb += vec3(0.68, 0.075, 0.008) * lava;
      `,
      );
  };
  terrainMaterial.customProgramCacheKey = () => "abyssal_terrain_v1";
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.receiveShadow = true;
  root.add(terrain);

  const rockMaterial = track(
    new THREE.MeshStandardMaterial({
      color: "#a3ada0",
      roughness: 0.97,
      flatShading: false,
      vertexColors: false,
    }),
  );
  addSurfaceDetail(rockMaterial, "stone", 1.2);
  // 岩石几何先做确定性噪声鼓包，实例化后每块仍保持有机轮廓而非光滑多面体。
  const rockGeometry = track(new THREE.IcosahedronGeometry(1, 2));
  {
    const positions = rockGeometry.attributes.position;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < positions.count; i += 1) {
      vertex.fromBufferAttribute(positions, i);
      const lump =
        1 +
        0.23 *
          Math.sin(vertex.x * 5.1 + vertex.y * 3.7) *
          Math.cos(vertex.y * 4.3 + vertex.z * 5.9) +
        0.11 * Math.sin(vertex.z * 9.1 + vertex.x * 7.3);
      vertex.multiplyScalar(lump);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    rockGeometry.computeVertexNormals();
  }
  smoothCoincidentNormals(rockGeometry);
  rockGeometry.computeBoundingSphere();
  const rockEnvelope =
    rockGeometry.boundingSphere.radius +
    rockGeometry.boundingSphere.center.length();
  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, 280);
  rocks.name = "reef_rocks";
  for (let i = 0; i < 280; i += 1) {
    let z = i < 100 ? 130 - rand() * 390 : -170 - rand() * 970;
    let x = (rand() - 0.5) * (WORLD.maxX - WORLD.minX - 30);
    if (i < 54) x = (i % 2 ? 1 : -1) * (24 + rand() * 36);
    const radius = 2.4 + rand() * 8.5;
    while (
      LANDMARK_CLEARINGS.some(
        (area) => Math.hypot(x - area.x, z - area.z) < area.radius + radius,
      )
    ) {
      x = (rand() - 0.5) * (WORLD.maxX - WORLD.minX - 30);
      z = 130 - rand() * 1260;
    }
    const height = radius * (0.7 + rand() * 1.45);
    const y = seabedHeight(x, z) + height * 0.33;
    dummy.position.set(x, y, z);
    dummy.rotation.set(rand() * 0.6, rand() * Math.PI, rand() * 0.5);
    dummy.scale.set(radius, height, radius * (0.75 + rand() * 0.7));
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    // 用真实实例的朝向、缩放和最大鼓包包住礁石，不能只取中心小球。
    colliders.push({
      type: "ellipsoid",
      kind: "reef",
      x,
      y,
      z,
      axes: {
        x: dummy.scale.x * rockEnvelope,
        y: dummy.scale.y * rockEnvelope,
        z: dummy.scale.z * rockEnvelope,
      },
      rotation: {
        x: dummy.quaternion.x,
        y: dummy.quaternion.y,
        z: dummy.quaternion.z,
        w: dummy.quaternion.w,
      },
    });
    color.set(z > -110 ? "#ada887" : z > -310 ? "#697e7a" : "#4b5863");
    color.multiplyScalar(0.78 + rand() * 0.5);
    rocks.setColorAt(i, color);
    if (Math.abs(x) < 275) obstacles.push({ x, y, z, radius: radius * 0.82 });
  }
  root.add(rocks);

  // 岩拱用连续胶囊段包住拱身，保留中央逃生通道；旧遮挡球继续供 NPC 使用。
  const arches = [
    { x: -3, z: 9, radius: 15, tube: 3.3, angle: -0.12 },
    { x: 31, z: -104, radius: 19, tube: 4, angle: 0.37 },
    { x: -39, z: -226, radius: 23, tube: 5, angle: -0.3 },
    { x: 93, z: -445, radius: 28, tube: 5, angle: 0.27 },
    { x: -122, z: -701, radius: 33, tube: 6, angle: -0.24 },
    { x: -174, z: -1030, radius: 39, tube: 7, angle: 0.18 },
  ];
  for (const arch of arches) {
    const baseY = seabedHeight(arch.x, arch.z) + 1.5;
    const mesh = addMesh(
      new THREE.TorusGeometry(arch.radius, arch.tube, 7, 26, Math.PI),
      rockMaterial,
      [arch.x, baseY, arch.z],
    );
    mesh.rotation.y = arch.angle;
    let previous = null;
    for (let segment = 0; segment <= 26; segment++) {
      const theta = (segment / 26) * Math.PI;
      const horizontal = Math.cos(theta) * arch.radius;
      const point = {
        x: arch.x + horizontal * Math.cos(arch.angle),
        y: baseY + Math.sin(theta) * arch.radius,
        z: arch.z - horizontal * Math.sin(arch.angle),
      };
      if (previous)
        colliders.push({
          type: "capsule",
          kind: "arch",
          a: previous,
          b: point,
          radius: arch.tube * 1.015,
        });
      previous = point;
    }
    for (let i = 0; i <= 9; i += 1) {
      const theta = (i / 9) * Math.PI;
      const horizontal = Math.cos(theta) * arch.radius;
      obstacles.push({
        x: arch.x + horizontal * Math.cos(arch.angle),
        y: baseY + Math.sin(theta) * arch.radius,
        z: arch.z - horizontal * Math.sin(arch.angle),
        radius: arch.tube * 1.06,
      });
    }
  }

  // 海草与珊瑚均使用实例化，丰富近景而不增加成百上千次绘制。
  const grassGeometry = track(ribbonGeometry(true));

  const grassMaterial = track(
    new THREE.MeshStandardMaterial({
      color: "#2b8581",
      roughness: 0.9,
      side: THREE.DoubleSide,
    }),
  );
  addSway(grassMaterial, worldUniforms, 0.17, 1.0);
  addLeafDetail(grassMaterial);
  const grass = new THREE.InstancedMesh(grassGeometry, grassMaterial, 920);
  for (let i = 0; i < 920; i += 1) {
    const z = 135 - rand() * 325;
    const x = (rand() - 0.5) * 220;
    const height = 1.3 + rand() * 5.0;
    dummy.position.set(x, seabedHeight(x, z) - 0.2, z);
    dummy.rotation.set(
      (rand() - 0.5) * 0.15,
      rand() * Math.PI,
      (rand() - 0.5) * 0.3,
    );
    dummy.scale.set(0.35 + rand() * 0.9, height, 0.35 + rand() * 0.8);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
    color.setHSL(
      0.41 + rand() * 0.08,
      0.48 + rand() * 0.2,
      0.16 + rand() * 0.15,
    );
    grass.setColorAt(i, color);
  }
  root.add(clusterInstances(grass));

  const coralColors = ["#ba7d70", "#d1aa81", "#9c7788", "#dac697", "#7f9e91"];
  const coralMaterial = track(
    new THREE.MeshStandardMaterial({
      roughness: 0.72,
      metalness: 0.03,
      emissive: "#2a1410",
      emissiveIntensity: 0.35,
    }),
  );
  addSurfaceDetail(coralMaterial, "coral", 1.4);
  const coralGeometry = track(coralBranchGeometry());
  const coralCount = 880;
  const coral = new THREE.InstancedMesh(
    coralGeometry,
    coralMaterial,
    coralCount,
  );
  let branchIndex = 0;
  const branchStart = new THREE.Vector3();
  const branchEnd = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const branchDirection = new THREE.Vector3();
  while (branchIndex < coralCount) {
    const x = (rand() - 0.5) * 170;
    const z = 126 - rand() * 243;
    const y = seabedHeight(x, z);
    const size = 0.8 + rand() * 2.3;
    const coralColor = color
      .set(coralColors[Math.floor(rand() * coralColors.length)])
      .clone();
    const branches = 6 + Math.floor(rand() * 5);
    for (let j = 0; j < branches && branchIndex < coralCount; j += 1) {
      const angle = rand() * Math.PI * 2;
      const spread = j === 0 ? 0 : (0.35 + rand() * 0.65) * size;
      branchStart.set(x, y + (j === 0 ? 0 : size * (0.25 + rand() * 0.5)), z);
      branchEnd.set(
        x + Math.cos(angle) * spread,
        y + size * (0.9 + rand() * 0.8),
        z + Math.sin(angle) * spread,
      );
      branchDirection.subVectors(branchEnd, branchStart);
      dummy.position.copy(branchStart).add(branchEnd).multiplyScalar(0.5);
      dummy.quaternion.setFromUnitVectors(
        up,
        branchDirection.clone().normalize(),
      );
      dummy.scale.set(
        size * (j === 0 ? 0.7 : 0.45),
        branchDirection.length(),
        size * 0.5,
      );
      dummy.updateMatrix();
      coral.setMatrixAt(branchIndex, dummy.matrix);
      coral.setColorAt(branchIndex, coralColor);
      branchIndex += 1;
    }
  }
  root.add(clusterInstances(coral));

  const fanMaterial = track(
    new THREE.MeshStandardMaterial({
      color: "#d87975",
      roughness: 0.85,
      side: THREE.DoubleSide,
      transparent: false,
    }),
  );
  const fanGeometry = track(seaFanGeometry());
  const fans = new THREE.InstancedMesh(fanGeometry, fanMaterial, 100);
  for (let i = 0; i < 100; i += 1) {
    const x = (rand() - 0.5) * 175;
    const z = 125 - rand() * 200;
    const size = 1.0 + rand() * 1.9;
    dummy.position.set(x, seabedHeight(x, z), z);
    dummy.rotation.set(0, rand() * Math.PI, (rand() - 0.5) * 0.35);
    dummy.scale.set(size, size, size);
    dummy.updateMatrix();
    fans.setMatrixAt(i, dummy.matrix);
    color.set(coralColors[Math.floor(rand() * 4)]);
    fans.setColorAt(i, color);
  }
  root.add(clusterInstances(fans));

  // 海绵与海葵丘补足浅海底被的中层细节，实例化一次绘制。
  const spongeGeometry = track(moundCoralGeometry());
  const spongeMaterial = track(
    new THREE.MeshStandardMaterial({
      roughness: 0.86,
      metalness: 0.02,
      emissive: "#1d1410",
      emissiveIntensity: 0.3,
    }),
  );
  addSurfaceDetail(spongeMaterial, "coral", 1.1);
  const spongeColors = ["#c9825a", "#b65f78", "#7f9a68", "#5f8f96", "#a97fb4"];
  const sponges = new THREE.InstancedMesh(spongeGeometry, spongeMaterial, 150);
  for (let i = 0; i < 150; i += 1) {
    const x = (rand() - 0.5) * 180;
    const z = 128 - rand() * 250;
    const size = 0.5 + rand() * 1.6;
    dummy.position.set(x, seabedHeight(x, z) + size * 0.32, z);
    dummy.rotation.set(rand() * 0.4, rand() * Math.PI, rand() * 0.3);
    dummy.scale.set(size, size * (0.55 + rand() * 0.5), size);
    dummy.updateMatrix();
    sponges.setMatrixAt(i, dummy.matrix);
    color
      .set(spongeColors[Math.floor(rand() * spongeColors.length)])
      .multiplyScalar(0.8 + rand() * 0.4);
    sponges.setColorAt(i, color);
  }
  root.add(clusterInstances(sponges));

  // 小幅长涌浪叠加经过像素足迹过滤的随机细波，避免远处整齐亮带与闪烁。
  const surfaceMaterial = track(
    new THREE.ShaderMaterial({
      uniforms: { oceanTime: worldUniforms.oceanTime },
      vertexShader: `
      uniform float oceanTime;
      varying vec3 vWorld;
      void main() {
        vec3 p = position;
        float swell = sin(p.x * 0.055 + oceanTime * 0.3) * 0.12
          + sin(p.x * 0.021 - oceanTime * 0.17 + p.y * 0.013) * 0.18;
        p.z += swell;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
      fragmentShader: `
      uniform float oceanTime;
      varying vec3 vWorld;
      float rippleHash(vec2 p) {
        vec3 q = fract(vec3(p.xyx) * 0.1031);
        q += dot(q, q.yzx + 33.33);
        return fract((q.x + q.y) * q.z);
      }
      // 同时求连续噪声和解析梯度，不用低频正弦条带模拟高光。
      vec3 rippleNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f), du = 6.0 * f * (1.0 - f);
        float a = rippleHash(i), b = rippleHash(i + vec2(1, 0));
        float c = rippleHash(i + vec2(0, 1)), d = rippleHash(i + vec2(1, 1));
        float k = a - b - c + d;
        return vec3(a + (b-a)*u.x + (c-a)*u.y + k*u.x*u.y,
          ((b-a) + k*u.y)*du.x, ((c-a) + k*u.x)*du.y);
      }
      void main() {
        vec2 p = vWorld.xz;
        float dist = distance(cameraPosition, vWorld);
        float footprint = max(length(dFdx(p)), length(dFdy(p)));
        mat2 rotation = mat2(0.8, -0.6, 0.6, 0.8);
        mat2 inverseRotation = mat2(0.8, 0.6, -0.6, 0.8);
        vec3 longRipple = rippleNoise(p * vec2(0.70, 0.37) + vec2(oceanTime * 0.12, -oceanTime * 0.045));
        vec3 midRipple = rippleNoise(rotation * p * vec2(2.7, 1.6) + vec2(-oceanTime * 0.24, oceanTime * 0.08));
        vec3 fineRipple = rippleNoise(inverseRotation * p * vec2(7.2, 3.8) + vec2(oceanTime * 0.35, oceanTime * 0.14));
        float longFilter = 1.0 - smoothstep(0.35, 1.4, footprint * 0.70);
        float midFilter = 1.0 - smoothstep(0.35, 1.4, footprint * 2.7);
        float fineFilter = 1.0 - smoothstep(0.35, 1.4, footprint * 7.2);
        vec2 slope = longRipple.yz * vec2(0.70, 0.37) * 0.075 * longFilter;
        slope += inverseRotation * (midRipple.yz * vec2(2.7, 1.6)) * 0.027 * midFilter;
        slope += rotation * (fineRipple.yz * vec2(7.2, 3.8)) * 0.009 * fineFilter;
        vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
        vec3 eye = normalize(cameraPosition - vWorld);
        float above = step(4.0, cameraPosition.y);
        float ndv = clamp(abs(dot(n, eye)), 0.0, 1.0);
        float fresnel = 0.025 + 0.975 * pow(1.0 - ndv, 5.0);
        vec3 reflected = reflect(-eye, n);
        // 柔和连续的蓝灰天空反射；不把远处水面额外混成白雾。
        float skyElevation = smoothstep(-0.18, 0.85, reflected.y);
        vec3 sky = mix(vec3(0.145, 0.255, 0.285), vec3(0.095, 0.185, 0.255), skyElevation);
        float sun = max(0.0, dot(reflected, normalize(vec3(-0.5, 0.85, 0.25))));
        float glint = pow(sun, 380.0) * (0.30 + 0.70 * fineFilter);
        sky += vec3(0.35, 0.32, 0.23) * glint;
        vec3 top = mix(vec3(0.016, 0.086, 0.115), sky, 0.20 + fresnel * 0.65);
        top = mix(top, vec3(0.11, 0.22, 0.26), smoothstep(180.0, 720.0, dist) * 0.16);
        // 水下主要保留透光窗口，细波只轻微影响亮度，保持角色与近处海域可读。
        float windowMask = smoothstep(0.54, 0.78, ndv);
        vec3 below = mix(vec3(0.024, 0.115, 0.155), vec3(0.19, 0.34, 0.36), windowMask);
        below += vec3(0.016, 0.023, 0.020) * (longRipple.x - 0.5) * longFilter;
        float alphaBelow = mix(0.54, 0.25, windowMask) * exp(-dist * 0.0035);
        gl_FragColor = vec4(mix(below, top, above), mix(alphaBelow, 0.97, above));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const surface = addMesh(
    new THREE.PlaneGeometry(1100, 2600, 52, 120),
    surfaceMaterial,
    [0, WORLD.surfaceY, (WORLD.minZ + WORLD.maxZ) * 0.5],
  );
  surface.rotation.x = -Math.PI / 2;
  surface.renderOrder = 1;

  const shaftGeometry = track(
    new THREE.CylinderGeometry(1.4, 11, 88, 12, 1, true),
  );
  const shaftMaterial = track(
    new THREE.ShaderMaterial({
      uniforms: { oceanTime: worldUniforms.oceanTime },
      vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        #ifdef USE_INSTANCING
          world = modelMatrix * instanceMatrix * vec4(position, 1.0);
        #endif
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
      fragmentShader: `
      uniform float oceanTime;
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        float edge = pow(sin(vUv.x * 3.14159265), 3.0);
        float vertical = sin(vUv.y * 3.14159265) * (0.25 + vUv.y * 0.75);
        float pulse = 0.7 + 0.3 * sin(oceanTime * 0.2 + vWorld.x * 0.07);
        float distanceFade = exp(-distance(cameraPosition, vWorld) * 0.013);
        gl_FragColor = vec4(0.31, 0.78, 0.76, edge * vertical * pulse * distanceFade * 0.05);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    }),
  );
  const shafts = new THREE.InstancedMesh(shaftGeometry, shaftMaterial, 20);
  for (let i = 0; i < 20; i += 1) {
    dummy.position.set((rand() - 0.5) * 270, -34, 125 - rand() * 300);
    dummy.rotation.set(0.06, 0, -0.2);
    dummy.scale.setScalar(0.7 + rand() * 0.7);
    dummy.updateMatrix();
    shafts.setMatrixAt(i, dummy.matrix);
  }
  root.add(shafts);

  // 深海荧光菌丛提供远处可识别的路径与尺度。
  const glowStemMaterial = track(
    new THREE.MeshStandardMaterial({
      color: "#193956",
      emissive: "#123541",
      emissiveIntensity: 0.65,
      roughness: 0.68,
    }),
  );
  const glowCapMaterial = track(
    new THREE.MeshStandardMaterial({
      color: "#60cde0",
      emissive: "#24d8d6",
      emissiveIntensity: 1.8,
      roughness: 0.35,
      transparent: true,
      opacity: 0.85,
    }),
  );
  const stemGeometry = track(new THREE.CylinderGeometry(0.12, 0.22, 1, 5));
  const capGeometry = track(
    new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.65),
  );
  const glowStems = new THREE.InstancedMesh(
    stemGeometry,
    glowStemMaterial,
    240,
  );
  const glowCaps = new THREE.InstancedMesh(capGeometry, glowCapMaterial, 240);
  for (let i = 0; i < 240; i += 1) {
    const x = (rand() - 0.5) * 515;
    const z = -155 - rand() * 975;
    const height = 0.8 + rand() * 3.5;
    const y = seabedHeight(x, z);
    dummy.position.set(x, y + height * 0.5, z);
    dummy.rotation.set(0, rand() * Math.PI, (rand() - 0.5) * 0.18);
    dummy.scale.set(1, height, 1);
    dummy.updateMatrix();
    glowStems.setMatrixAt(i, dummy.matrix);
    dummy.position.y = y + height;
    dummy.scale.set(height * 0.36, height * 0.18, height * 0.36);
    dummy.updateMatrix();
    glowCaps.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.48 + rand() * 0.21, 0.7, 0.56);
    glowCaps.setColorAt(i, color);
  }
  root.add(glowStems, glowCaps);

  const ruinsMaterial = track(
    new THREE.MeshStandardMaterial({
      color: "#65796e",
      roughness: 0.94,
      flatShading: true,
    }),
  );
  addSurfaceDetail(ruinsMaterial, "stone", 1.3);
  const runeMaterial = track(
    new THREE.MeshBasicMaterial({
      color: "#48c7c6",
      transparent: true,
      opacity: 0.63,
    }),
  );
  for (let i = 0; i < 9; i += 1) {
    const x = (i % 2 ? -1 : 1) * (26 + rand() * 8);
    const z = -235 - i * 9;
    const height = 7 + rand() * 10;
    const y = seabedHeight(x, z);
    const pillar = addMesh(
      new THREE.CylinderGeometry(2.3, 3, height, 5),
      ruinsMaterial,
      [x, y + height * 0.5, z],
    );
    pillar.rotation.z = (rand() - 0.5) * 0.17;
    const pillarAxis = new THREE.Vector3(0, height * 0.5, 0).applyQuaternion(
      pillar.quaternion,
    );
    colliders.push({
      type: "capsule",
      kind: "pillar",
      a: pillar.position.clone().sub(pillarAxis),
      b: pillar.position.clone().add(pillarAxis),
      radius: 3,
    });
    const rune = addMesh(
      new THREE.TorusGeometry(2.35, 0.075, 4, 5),
      runeMaterial,
      [x, y + height * 0.7, z],
    );
    rune.rotation.x = Math.PI / 2;
    obstacles.push({ x, y: y + height * 0.5, z, radius: 3 });
  }

  const lavaUniforms = { oceanTime: worldUniforms.oceanTime };
  const lavaMaterial = track(
    new THREE.ShaderMaterial({
      uniforms: lavaUniforms,
      vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() { vUv = uv; vec4 p = modelMatrix * vec4(position, 1.0); vWorld = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }`,
      fragmentShader: `
      uniform float oceanTime;
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        // 冷却岩壳之间只有狭窄裂隙发光，细胞边界替代大片规则橙色斑块。
        vec2 uv = vWorld.xz * 0.57;
        uv += vec2(sin(uv.y * 0.61 + oceanTime * 0.035), cos(uv.x * 0.43)) * 0.43;
        vec2 cell = floor(uv), local = fract(uv);
        float first = 9.0, second = 9.0;
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 seed = cell + offset;
            vec2 jitter = fract(sin(vec2(dot(seed, vec2(127.1, 311.7)), dot(seed, vec2(269.5, 183.3)))) * 43758.5453);
            float distanceToCell = length(offset + 0.18 + jitter * 0.64 - local);
            if (distanceToCell < first) { second = first; first = distanceToCell; }
            else second = min(second, distanceToCell);
          }
        }
        float edge = second - first;
        float grain = sin(uv.x * 31.0 + sin(uv.y * 13.0)) * sin(uv.y * 29.0);
        float crack = 1.0 - smoothstep(0.018, 0.095, edge + grain * 0.014);
        float core = 1.0 - smoothstep(0.003, 0.025, edge);
        float rimFade = 1.0 - smoothstep(0.36, 0.5, length(vUv - 0.5));
        float pulse = 0.72 + 0.28 * sin(oceanTime * 0.55 + uv.x * 0.7 + uv.y * 0.6);
        vec3 crust = vec3(0.018, 0.023, 0.024) * (0.8 + first * 0.4 + grain * 0.13);
        vec3 glow = crust + (vec3(1.6, 0.19, 0.014) * crack + vec3(1.7, 0.48, 0.035) * core) * rimFade * pulse;
        float mist = 1.0 - exp(-distance(cameraPosition, vWorld) * 0.009);
        glow = mix(glow, vec3(0.003, 0.018, 0.025), mist);
        gl_FragColor = vec4(glow, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      side: THREE.DoubleSide,
    }),
  );
  const basaltMaterial = track(
    new THREE.MeshStandardMaterial({
      color: "#41484b",
      roughness: 1,
      flatShading: true,
    }),
  );
  addSurfaceDetail(basaltMaterial, "stone", 1.8);
  const volcanoes = [
    { x: -42, z: -555, radius: 18, height: 24 },
    { x: 137, z: -728, radius: 24, height: 34 },
    { x: -61, z: -942, radius: 33, height: 47 },
    { x: 153, z: -1091, radius: 27, height: 39 },
  ];
  const ventSources = [];
  for (const volcano of volcanoes) {
    const { x, z, radius, height } = volcano;
    const y = seabedHeight(x, z);
    addMesh(
      new THREE.CylinderGeometry(radius * 0.29, radius, height, 17, 3, true),
      basaltMaterial,
      [x, y + height * 0.42, z],
    );
    const rim = addMesh(
      new THREE.TorusGeometry(radius * 0.3, radius * 0.08, 5, 18),
      basaltMaterial,
      [x, y + height * 0.92, z],
    );
    rim.rotation.x = Math.PI / 2;
    const lava = addMesh(
      new THREE.CircleGeometry(radius * 0.29, 24),
      lavaMaterial,
      [x, y + height * 0.86, z],
    );
    lava.rotation.x = -Math.PI / 2;
    const lakeX = x + radius * 0.6;
    const lakeZ = z - radius * 0.6;
    const lakeGeometry = new THREE.CircleGeometry(radius * 1.5, 30);
    lakeGeometry.rotateX(-Math.PI / 2);
    const lakePositions = lakeGeometry.attributes.position;
    for (let index = 0; index < lakePositions.count; index++) {
      const localX = lakePositions.getX(index);
      const localZ = lakePositions.getZ(index) * 0.6;
      lakePositions.setXYZ(
        index,
        localX,
        seabedHeight(lakeX + localX, lakeZ + localZ) - y + 0.18,
        localZ,
      );
    }
    lakeGeometry.computeVertexNormals();
    addMesh(lakeGeometry, lavaMaterial, [lakeX, y, lakeZ]);
    obstacles.push({ x, y: y + height * 0.34, z, radius: radius * 0.79 });
    // 分层薄椭球包络锥形火山，保持顶端收窄，不用贯穿全高的大球。
    for (let layer = 0; layer < 8; layer++) {
      const fraction = layer / 8;
      const layerRadius = radius * (1 - fraction * 0.71);
      colliders.push({
        type: "ellipsoid",
        kind: "volcano",
        x,
        y: y + height * (fraction - 0.08 + 1 / 16),
        z,
        axes: { x: layerRadius * 1.09, y: height / 8, z: layerRadius * 1.09 },
      });
    }
    ventSources.push({ x, y: y + height, z });
  }
  for (let i = 0; i < 2; i += 1) {
    const source = ventSources[i];
    const light = new THREE.PointLight("#ff642b", 75, 65, 2);
    light.position.set(source.x, source.y + 3, source.z);
    root.add(light);
  }
  for (let i = 0; i < 34; i += 1) {
    let x = (rand() - 0.5) * 380;
    let z = -455 - rand() * 660;
    while (
      LANDMARK_CLEARINGS.some(
        (area) => Math.hypot(x - area.x, z - area.z) < area.radius + 3,
      )
    ) {
      x = (rand() - 0.5) * 490;
      z = -455 - rand() * 660;
    }
    const height = 2.5 + rand() * 7;
    const y = seabedHeight(x, z);
    addMesh(new THREE.CylinderGeometry(0.6, 1.8, height, 6), basaltMaterial, [
      x,
      y + height * 0.45,
      z,
    ]);
    ventSources.push({ x, y: y + height, z });
    colliders.push({
      type: "capsule",
      kind: "vent",
      a: { x, y: y - height * 0.05, z },
      b: { x, y: y + height * 0.95, z },
      radius: 1.8,
    });
  }

  const moteCount = 1100;
  const motePositions = new Float32Array(moteCount * 3);
  const moteSeeds = new Float32Array(moteCount * 4);
  for (let i = 0; i < moteCount; i += 1) {
    moteSeeds[i * 4] = (rand() - 0.5) * 145;
    moteSeeds[i * 4 + 1] = (rand() - 0.5) * 92;
    moteSeeds[i * 4 + 2] = (rand() - 0.5) * 145;
    moteSeeds[i * 4 + 3] = rand();
  }
  const moteGeometry = track(new THREE.BufferGeometry());
  moteGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(motePositions, 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  const particleTexture = track(makeParticleTexture());
  const moteMaterial = track(
    new THREE.PointsMaterial({
      color: "#a7dfdb",
      size: 0.21,
      map: particleTexture,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  const motes = new THREE.Points(moteGeometry, moteMaterial);
  motes.frustumCulled = false;
  root.add(motes);

  const ventCount = 300;
  const ventPositions = new Float32Array(ventCount * 3);
  const ventGeometry = track(new THREE.BufferGeometry());
  ventGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(ventPositions, 3).setUsage(
      THREE.DynamicDrawUsage,
    ),
  );
  const ventMaterial = track(
    new THREE.PointsMaterial({
      color: "#719eac",
      size: 1.5,
      map: particleTexture,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  const bubbles = new THREE.Points(ventGeometry, ventMaterial);
  bubbles.frustumCulled = false;
  root.add(bubbles);

  const extra = createOceanExtra(root, {
    seabedHeight,
    obstacles,
    colliders,
    worldUniforms,
  });

  const beach = createBeachEnvironment(root, { seabedHeight });

  return {
    obstacles,
    colliders,
    landmarks: extra.landmarks,
    update(time, playerPosition) {
      worldUniforms.oceanTime.value = time;
      extra.update(time, playerPosition);
      beach.update(time);
      for (let i = 0; i < moteCount; i += 1) {
        const seed = i * 4;
        const point = i * 3;
        const phase = moteSeeds[seed + 3];
        motePositions[point] =
          playerPosition.x +
          wrap(
            moteSeeds[seed] -
              playerPosition.x +
              Math.sin(time * 0.08 + phase * 6) * 1.3,
            145,
          );
        motePositions[point + 1] = Math.min(
          3,
          playerPosition.y +
            wrap(
              moteSeeds[seed + 1] -
                playerPosition.y +
                time * (0.05 + phase * 0.1),
              92,
            ),
        );
        motePositions[point + 2] =
          playerPosition.z + wrap(moteSeeds[seed + 2] - playerPosition.z, 145);
      }
      moteGeometry.attributes.position.needsUpdate = true;
      const deep = THREE.MathUtils.smoothstep(-playerPosition.y, 85, 180);
      moteMaterial.color.setRGB(
        0.51 - deep * 0.18,
        0.82 - deep * 0.12,
        0.78 + deep * 0.13,
      );
      for (let i = 0; i < ventCount; i += 1) {
        const source = ventSources[i % ventSources.length];
        const lift = (time * (1 + (i % 4) * 0.23) + i * 1.71) % 34;
        const spread = 0.3 + lift * 0.055;
        ventPositions[i * 3] =
          source.x + Math.sin(i * 13.1 + lift * 0.2) * spread;
        ventPositions[i * 3 + 1] = source.y + lift;
        ventPositions[i * 3 + 2] =
          source.z + Math.cos(i * 4.13 + lift * 0.13) * spread;
      }
      ventGeometry.attributes.position.needsUpdate = true;
      glowCapMaterial.emissiveIntensity = 1.5 + Math.sin(time * 0.55) * 0.25;
    },
    dispose() {
      scene.remove(root);
      extra.dispose();
      beach.dispose();
      root.traverse((node) => {
        if (node.isInstancedMesh) node.dispose();
      });
      for (const resource of disposables) resource.dispose();
    },
  };
}

/*********************************************
 * 内部工具
 ********************************************/

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function wrap(value, size) {
  return THREE.MathUtils.euclideanModulo(value + size * 0.5, size) - size * 0.5;
}

function addSway(material, uniforms, strength, rate) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.oceanTime = uniforms.oceanTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float oceanTime;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float stemPhase = 0.0;
        #ifdef USE_INSTANCING
          stemPhase = instanceMatrix[3].x * 0.19 + instanceMatrix[3].z * 0.08;
        #endif
        transformed.x += sin(oceanTime * ${rate.toFixed(2)} + stemPhase + position.y) * pow(max(0.0, position.y), 2.0) * ${strength.toFixed(2)};
      `,
      );
  };
  material.customProgramCacheKey = () => `abyssal_sway_${strength}_${rate}`;
}

function makeParticleTexture() {
  const size = 32;
  const bytes = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const radius =
        Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2);
      const index = (y * size + x) * 4;
      bytes[index] = 255;
      bytes[index + 1] = 255;
      bytes[index + 2] = 255;
      bytes[index + 3] = Math.max(0, (1 - radius) ** 3) * 255;
    }
  }
  const texture = new THREE.DataTexture(bytes, size, size);
  texture.needsUpdate = true;
  return texture;
}
