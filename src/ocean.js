import * as THREE from "three";
import { WORLD } from "./world_config.js";
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
  return slope + shelf + ridges + trenchWall;
}

/**
 * createOcean 创建三层海域与可用于遮挡的障碍物。
 * 参数：scene 为 Three.js 场景；返回 update、obstacles 与 dispose。
 */
export function createOcean(scene) {
  const root = new THREE.Group();
  root.name = "ocean_environment";
  scene.add(root);
  const obstacles = [];
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
      WORLD.maxZ - WORLD.minZ + 160,
      140,
      280,
    ),
  );
  terrainGeometry.rotateX(-Math.PI / 2);
  terrainGeometry.translate(0, 0, (WORLD.minZ + WORLD.maxZ) * 0.5);
  const terrainPosition = terrainGeometry.attributes.position;
  const terrainColors = [];
  const sand = new THREE.Color("#729d91");
  const shelfRock = new THREE.Color("#244b59");
  const abyssRock = new THREE.Color("#102b3a");
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
        diffuseColor.rgb *= 0.92 + ripple * 0.07 * shallow + detail * 0.025;
        float c1 = sin(sandUv.x * 0.38 + oceanTime * 0.37 + sin(sandUv.y * 0.2));
        float c2 = cos(sandUv.y * 0.43 - oceanTime * 0.24 + cos(sandUv.x * 0.18));
        float caustic = pow(max(0.0, 1.0 - abs(c1 + c2)), 13.0);
        diffuseColor.rgb += vec3(0.20, 0.45, 0.32) * caustic * shallow;
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
      color: "#42616a",
      roughness: 0.97,
      flatShading: true,
      vertexColors: false,
    }),
  );
  const rockGeometry = track(new THREE.IcosahedronGeometry(1, 1));
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
    color.set(z > -110 ? "#456f70" : z > -310 ? "#294957" : "#26383f");
    color.multiplyScalar(0.8 + rand() * 0.45);
    rocks.setColorAt(i, color);
    if (Math.abs(x) < 275) obstacles.push({ x, y, z, radius: radius * 0.82 });
  }
  root.add(rocks);

  // 岩拱以数个小碰撞球表示，中央留出能逃脱追击的通道。
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
  const grassGeometry = track(new THREE.ConeGeometry(0.65, 1, 4, 4, true));
  grassGeometry.translate(0, 0.5, 0);
  const grassMaterial = track(
    new THREE.MeshStandardMaterial({
      color: "#2b8581",
      roughness: 0.9,
      side: THREE.DoubleSide,
    }),
  );
  addSway(grassMaterial, worldUniforms, 0.17, 1.0);
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
  root.add(grass);

  const coralColors = ["#d76a6f", "#e29577", "#bd76a7", "#eac486", "#72bec1"];
  const coralMaterial = track(
    new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0.03 }),
  );
  const coralGeometry = track(new THREE.CylinderGeometry(0.13, 0.23, 1, 5));
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
  root.add(coral);

  const fanMaterial = track(
    new THREE.MeshStandardMaterial({
      color: "#d87975",
      roughness: 0.85,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
    }),
  );
  const fanGeometry = track(createFanGeometry());
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
  root.add(fans);

  // 海面在水下呈现游动的细碎亮纹，光柱负责传达水体厚度。
  const surfaceMaterial = track(
    new THREE.ShaderMaterial({
      uniforms: { oceanTime: worldUniforms.oceanTime },
      vertexShader: `
      uniform float oceanTime;
      varying vec3 vWorld;
      void main() {
        vec3 p = position;
        p.z += sin(p.x * 0.055 + oceanTime * 0.3) * 0.35;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
      fragmentShader: `
      uniform float oceanTime;
      varying vec3 vWorld;
      void main() {
        vec2 p = vWorld.xz * 0.095;
        float a = sin(p.x + sin(p.y * 1.5 + oceanTime * 0.19));
        float b = cos(p.y * 1.32 + cos(p.x * 0.82 - oceanTime * 0.22));
        float light = pow(max(0.0, 1.0 - abs(a + b)), 7.0);
        float swell = sin(p.x * 0.31 + p.y * 0.19 + oceanTime * 0.09) * 0.5 + 0.5;
        float distanceFade = exp(-distance(cameraPosition, vWorld) * 0.006);
        vec3 base = mix(vec3(0.025, 0.25, 0.33), vec3(0.32, 0.74, 0.70), swell);
        float above = step(4.0, cameraPosition.y);
        vec3 oceanTop = mix(vec3(0.012,0.12,0.17), vec3(0.035,0.29,0.34), swell);
        vec3 waterColor = mix(base + vec3(0.35,0.7,0.65)*light, oceanTop + vec3(0.08,0.18,0.18)*light, above);
        gl_FragColor = vec4(waterColor, mix((0.21+light*0.18)*distanceFade, 0.97, above));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const surface = addMesh(
    new THREE.PlaneGeometry(1100, 1800, 52, 84),
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
        gl_FragColor = vec4(0.25, 0.74, 0.74, edge * vertical * pulse * distanceFade * 0.035);
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
      color: "#29454e",
      roughness: 0.94,
      flatShading: true,
    }),
  );
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
        vec2 uv = vUv * 13.0;
        float hot = sin(uv.x + oceanTime * 0.22) * cos(uv.y - oceanTime * 0.19);
        float crust = smoothstep(0.18, 0.42, abs(hot + sin(uv.x * 1.4 + uv.y) * 0.24));
        vec3 glow = mix(vec3(2.2, 0.4, 0.015), vec3(0.11, 0.016, 0.012), crust);
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
      color: "#282f31",
      roughness: 1,
      flatShading: true,
    }),
  );
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
    worldUniforms,
  });

  return {
    obstacles,
    landmarks: extra.landmarks,
    update(time, playerPosition) {
      worldUniforms.oceanTime.value = time;
      extra.update(time, playerPosition);
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

function createFanGeometry() {
  const positions = [];
  const indices = [];
  const segments = 16;
  positions.push(0, 0, 0);
  for (let i = 0; i <= segments; i += 1) {
    const theta = (i / segments) * Math.PI;
    const scallop = 0.9 + (i % 2) * 0.13;
    positions.push(
      Math.cos(theta) * scallop,
      0.5 + Math.sin(theta) * 1.45,
      Math.sin(i * 1.7) * 0.12,
    );
    if (i > 0) indices.push(0, i, i + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
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
