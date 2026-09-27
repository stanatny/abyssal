import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// 地标需要留出观看与穿行空间，随机岩石和热泉不得占据其主体。
export const LANDMARK_CLEARINGS = [
  { x: -49, z: -167, radius: 37 },
  { x: 83, z: -373, radius: 39 },
  { x: -83, z: -795, radius: 59 },
  { x: 67, z: -1075, radius: 65 },
];

/**
 * 添加可辨认的海洋地标与生态群落，保持环境碰撞数据的原有结构。
 * @param {THREE.Group} parent 海洋场景根节点。
 * @param {object} context 共享海床函数、碰撞球列表与时间 uniform。
 * @returns {object} 地标坐标、逐帧更新函数及资源释放函数。
 */
export function createOceanExtra(
  parent,
  { seabedHeight, obstacles, colliders = [], worldUniforms },
) {
  const root = new THREE.Group();
  root.name = "ocean_landmarks";
  parent.add(root);
  const resources = new Set();
  const landmarks = [];
  const landmarkGroups = [];
  const random = randomSource(22119);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const track = (resource) => {
    resources.add(resource);
    return resource;
  };
  const material = (color, extra = {}) =>
    track(new THREE.MeshStandardMaterial({ color, roughness: 0.81, ...extra }));
  const box = track(new THREE.BoxGeometry(1, 1, 1));
  const sphere = track(new THREE.IcosahedronGeometry(1, 1));
  const cylinder = track(new THREE.CylinderGeometry(1, 1, 1, 7));
  const wood = material("#2b3833", { roughness: 0.92 });
  const iron = material("#46555c", { metalness: 0.3, roughness: 0.6 });
  const sail = material("#63796c", { side: THREE.DoubleSide, roughness: 0.95 });
  const bone = material("#c2cbb6", {
    roughness: 0.62,
    emissive: "#232e28",
    emissiveIntensity: 0.5,
  });
  const dark = material("#0c2027");
  const stone = material("#2a4b54", { flatShading: true, roughness: 0.9 });
  const jade = material("#4a8172", {
    roughness: 0.68,
    emissive: "#16332b",
    emissiveIntensity: 0.55,
  });
  const glow = material("#7df2da", {
    emissive: "#36e0c3",
    emissiveIntensity: 2.1,
    roughness: 0.45,
  });
  const basalt = material("#152328", { roughness: 1, flatShading: true });

  const add = (group, geometry, mat, position, scale, rotation) => {
    track(geometry);
    const mesh = new THREE.Mesh(geometry, mat);
    if (position) mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    if (rotation) mesh.rotation.set(...rotation);
    group.add(mesh);
    // 只把主体结构变为实体；符文、海带、薄帆布等装饰不拦截游泳。
    if (
      position &&
      scale &&
      (geometry === box || geometry === cylinder) &&
      [wood, iron, stone, jade].includes(mat)
    ) {
      registerMeshCollider(mesh, geometry === cylinder ? "pillar" : "landmark");
    }
    if (geometry === sphere && mat === bone && scale?.[2] > 3)
      registerMeshCollider(mesh, "skull", true);
    return mesh;
  };
  const registerMeshCollider = (mesh, kind, ellipsoid = false) => {
    mesh.updateWorldMatrix(true, false);
    const position = new THREE.Vector3(),
      rotation = new THREE.Quaternion(),
      scale = new THREE.Vector3();
    mesh.matrixWorld.decompose(position, rotation, scale);
    const isCylinder = mesh.geometry === cylinder;
    const size = {
      x: Math.abs(scale.x) * (isCylinder || ellipsoid ? 1 : 0.5),
      y: Math.abs(scale.y) * (ellipsoid ? 1 : 0.5),
      z: Math.abs(scale.z) * (isCylinder || ellipsoid ? 1 : 0.5),
    };
    colliders.push({
      type: ellipsoid ? "ellipsoid" : "box",
      kind,
      x: position.x,
      y: position.y,
      z: position.z,
      ...(ellipsoid ? { axes: size } : { halfSize: size }),
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
    });
  };
  const beam = (group, start, end, radius, mat = wood) => {
    const a = new THREE.Vector3(...start),
      b = new THREE.Vector3(...end);
    const mesh = add(group, cylinder, mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    mesh.scale.set(radius, a.distanceTo(b), radius);
    group.updateWorldMatrix(true, false);
    colliders.push({
      type: "capsule",
      kind: "beam",
      a: group.localToWorld(a.clone()),
      b: group.localToWorld(b.clone()),
      radius,
    });
    return mesh;
  };
  const landmark = (name, x, z, radius = 250) => {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(x, seabedHeight(x, z), z);
    group.userData.visibilityRadius = radius;
    root.add(group);
    landmarkGroups.push(group);
    landmarks.push({ name, x, y: group.position.y, z });
    return group;
  };
  const obstacleAt = (group, x, y, z, radius) => {
    group.updateMatrixWorld(true);
    const point = group.localToWorld(new THREE.Vector3(x, y, z));
    obstacles.push({ x: point.x, y: point.y, z: point.z, radius });
  };

  // 海带由实例化的弯曲叶片组成，与浅海低矮海草形成不同的植被层次。
  const kelpMaterial = material("#356858", { side: THREE.DoubleSide });
  applyOrganicSway(kelpMaterial, worldUniforms, 0.1);
  const kelpStemGeometry = track(
    new THREE.CylinderGeometry(0.07, 0.11, 1, 5, 5),
  );
  kelpStemGeometry.translate(0, 0.5, 0);
  const kelpLeafGeometry = track(leafGeometry());
  const kelpStemCount = 210;
  const kelpStems = new THREE.InstancedMesh(
    kelpStemGeometry,
    kelpMaterial,
    kelpStemCount,
  );
  const kelpLeaves = new THREE.InstancedMesh(
    kelpLeafGeometry,
    kelpMaterial,
    kelpStemCount * 7,
  );
  const kelpBeds = [
    [-34, 41, 21],
    [45, -25, 31],
    [-85, -98, 36],
    [94, -166, 34],
    [-157, -242, 34],
    [173, -76, 40],
  ];
  for (let index = 0; index < kelpStemCount; index++) {
    const bed = kelpBeds[index % kelpBeds.length];
    const x = bed[0] + (random() - 0.5) * bed[2];
    const z = bed[1] + (random() - 0.5) * bed[2];
    const y = seabedHeight(x, z);
    const height = 6 + random() * 15;
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.12);
    dummy.scale.set(1, height, 1);
    dummy.updateMatrix();
    kelpStems.setMatrixAt(index, dummy.matrix);
    color.setHSL(0.29 + random() * 0.08, 0.37, 0.19 + random() * 0.13);
    kelpStems.setColorAt(index, color);
    for (let leaf = 0; leaf < 7; leaf++) {
      dummy.position.set(x, y + height * (0.18 + leaf * 0.108), z);
      dummy.rotation.set(
        0.2 + random() * 0.48,
        leaf * 2.4 + index,
        (leaf % 2 ? -1 : 1) * (0.54 + random() * 0.4),
      );
      dummy.scale.set(0.8 + random() * 0.7, 2.1 + height * 0.16, 1.3);
      dummy.updateMatrix();
      kelpLeaves.setMatrixAt(index * 7 + leaf, dummy.matrix);
      kelpLeaves.setColorAt(index * 7 + leaf, color);
    }
  }
  root.add(kelpStems, kelpLeaves);

  // 水母统一实例化，钟形伞体和垂落触丝分别渲染，时间变化留在 GPU。
  const jellyMaterial = material("#a6dbe5", {
    emissive: "#4294ad",
    emissiveIntensity: 0.7,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const jellyThreadMaterial = material("#67aebc", {
    emissive: "#285f81",
    emissiveIntensity: 0.7,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });
  applyJellyPulse(jellyMaterial, worldUniforms, false);
  applyJellyPulse(jellyThreadMaterial, worldUniforms, true);
  const jellyBellGeometry = track(
    new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.6),
  );
  const jellyRimGeometry = track(new THREE.TorusGeometry(0.95, 0.027, 5, 18));
  jellyRimGeometry.rotateX(Math.PI / 2);
  jellyRimGeometry.translate(0, -0.31, 0);
  const strands = [];
  for (let strand = 0; strand < 6; strand++) {
    const angle = (strand / 6) * Math.PI * 2;
    const c = Math.cos(angle),
      s = Math.sin(angle);
    strands.push(
      tubeGeometry(
        [
          [c * 0.63, -0.2, s * 0.63],
          [c * 0.71, -0.85, s * 0.71],
          [c * 0.6 + 0.15, -1.65, s * 0.58],
          [c * 0.56 - 0.1, -2.55, s * 0.52],
        ],
        0.018,
        12,
        4,
      ),
    );
  }
  const jellyThreadsGeometry = track(mergeGeometries(strands));
  for (const strand of strands) strand.dispose();
  const jellyCount = 36;
  const jellyBells = new THREE.InstancedMesh(
    jellyBellGeometry,
    jellyMaterial,
    jellyCount,
  );
  const jellyRims = new THREE.InstancedMesh(
    jellyRimGeometry,
    jellyThreadMaterial,
    jellyCount,
  );
  const jellyThreads = new THREE.InstancedMesh(
    jellyThreadsGeometry,
    jellyThreadMaterial,
    jellyCount,
  );
  for (let index = 0; index < jellyCount; index++) {
    const x = index < 9 ? -30 + random() * 75 : (random() - 0.5) * 440;
    const z = index < 9 ? -45 - random() * 105 : -170 - random() * 840;
    const floor = seabedHeight(x, z);
    const y = Math.min(-12, floor + 22 + random() * 58);
    const size = 0.8 + random() * 1.6;
    dummy.position.set(x, y, z);
    dummy.rotation.set(
      (random() - 0.5) * 0.1,
      random() * Math.PI,
      (random() - 0.5) * 0.13,
    );
    dummy.scale.set(size, size * 0.82, size);
    dummy.updateMatrix();
    jellyBells.setMatrixAt(index, dummy.matrix);
    jellyRims.setMatrixAt(index, dummy.matrix);
    jellyThreads.setMatrixAt(index, dummy.matrix);
  }
  root.add(jellyBells, jellyRims, jellyThreads);

  const wreck = landmark("沉船遗骸", -49, -167, 230);
  wreck.rotation.set(-Math.atan(0.5), -0.31, 0.09);
  for (let rib = 0; rib < 12; rib++) {
    const z = -19 + rib * 3.5;
    const width = 6.8 * (0.46 + 0.54 * Math.sin(((rib + 1) / 13) * Math.PI));
    add(
      wreck,
      tubeGeometry(
        [
          [-width, 5.8, z],
          [-width * 0.94, 2.5, z],
          [0, 0, z],
          [width * 0.94, 2.5, z],
          [width, 5.8, z],
        ],
        0.22,
      ),
      wood,
    );
  }
  for (const side of [-1, 1]) {
    for (let plank = 0; plank < 6; plank++) {
      add(
        wreck,
        box,
        wood,
        [
          side * (4.4 + plank * 0.33),
          1.8 + plank * 0.67,
          ((plank % 3) - 1) * 2.7,
        ],
        [0.23, 0.63, 31 + (plank % 3) * 3],
      );
    }
    for (let plank = 0; plank < 4; plank++) {
      add(
        wreck,
        box,
        wood,
        [side * (2.6 + plank * 0.72), 5.25, 3],
        [0.6, 0.2, 28],
        [0, 0, side * 0.025],
      );
    }
  }
  beam(wreck, [0, 1, -19], [0, 1, 22], 0.38);
  beam(wreck, [0, 1, -1], [-2.1, 24, -4], 0.31);
  beam(wreck, [-9.3, 18, -3], [6.8, 18, -3], 0.17);
  beam(wreck, [1.2, 5, 12], [15, 1.2, 19], 0.24);
  add(wreck, ragGeometry(), sail, [-1.5, 17.8, -3.1]);
  const wheel = add(
    wreck,
    new THREE.TorusGeometry(1.65, 0.12, 5, 12),
    iron,
    [0, 7.1, 14],
  );
  wheel.rotation.y = 0.15;
  for (let spoke = 0; spoke < 6; spoke++) {
    const angle = (spoke / 6) * Math.PI * 2;
    beam(
      wreck,
      [0, 7.1, 14],
      [Math.cos(angle) * 1.75, 7.1 + Math.sin(angle) * 1.75, 14],
      0.055,
      iron,
    );
  }
  for (const side of [-1, 1]) {
    for (const z of [-12, 0, 12]) obstacleAt(wreck, side * 5.2, 3, z, 3.1);
  }
  obstacleAt(wreck, -1, 12, -3, 1.4);

  const whale = landmark("鲸落骨架", 83, -373, 240);
  whale.rotation.set(-Math.atan(0.72), 0.16, 0.055);
  for (let vertebra = 0; vertebra < 27; vertebra++) {
    const z = -14 + vertebra * 1.4;
    const taper = 1 - Math.max(0, vertebra - 13) * 0.043;
    add(whale, sphere, bone, [0, 1.55, z], [0.97 * taper, 0.74 * taper, 0.61]);
    add(whale, box, bone, [0, 2.29 * taper, z], [0.2, 1.05 * taper, 0.24]);
  }
  for (let rib = 0; rib < 13; rib++) {
    const z = -11 + rib * 1.7;
    const width = 3.3 + Math.sin(((rib + 1) / 14) * Math.PI) * 3;
    for (const side of [-1, 1]) {
      add(
        whale,
        tubeGeometry(
          [
            [0, 1.6, z],
            [side * 2, 4.4, z - 0.15],
            [side * width, 5.2, z + 0.1],
            [side * (width + 1), 1.7, z + 0.6],
            [side * width, 0.35, z + 0.9],
          ],
          0.2,
          18,
          5,
        ),
        bone,
      );
    }
  }
  add(whale, sphere, bone, [0, 1.25, -19.5], [3.1, 2, 6.6]);
  for (const side of [-1, 1]) {
    add(whale, sphere, dark, [side * 2.7, 1.65, -18.7], [0.9, 0.84, 1.24]);
    add(
      whale,
      tubeGeometry(
        [
          [side * 1.5, 1.5, -15.3],
          [side * 4.7, 0.8, -21],
          [side * 1.2, 0.35, -30],
        ],
        0.31,
        22,
        6,
      ),
      bone,
    );
    beam(whale, [side * 1.8, 1.3, -9], [side * 12, 0.2, -1.5], 0.36, bone);
  }
  obstacleAt(whale, 0, 2, -20, 4);

  const temple = landmark("沉没阶梯神殿", -83, -795, 340);
  add(temple, box, stone, [0, -13, 0], [68, 30, 65]);
  for (let step = 0; step < 7; step++) {
    add(
      temple,
      box,
      step % 2 ? jade : stone,
      [0, 2 + step * 4.4, 0],
      [60 - step * 6.7, 4.4, 57 - step * 6.4],
    );
  }
  for (let step = 0; step < 20; step++) {
    add(
      temple,
      box,
      jade,
      [0, 0.9 + step * 1.5, 29.5 - step * 1.5],
      [9.2, 1.5, 1.7],
    );
  }
  for (const side of [-1, 1]) {
    add(temple, box, stone, [side * 5.2, 35, 4], [3.5, 12, 4]);
    add(temple, box, jade, [side * 5.2, 41.7, 4], [5.4, 1.8, 6]);
    for (let rune = 0; rune < 5; rune++) {
      add(
        temple,
        box,
        glow,
        [side * 5.2, 31 + rune * 1.85, 6.07],
        [1.32, 0.27, 0.04],
      );
      add(
        temple,
        box,
        glow,
        [side * (5.2 + (rune % 2 ? 0.45 : -0.45)), 31.5 + rune * 1.85, 6.08],
        [0.22, 0.76, 0.04],
      );
    }
    for (let pillar = 0; pillar < 5; pillar++) {
      const z = 40 + pillar * 15;
      const height = 13 + (pillar % 3) * 4;
      const y =
        seabedHeight(temple.position.x + side * 26, temple.position.z + z) -
        temple.position.y;
      add(
        temple,
        cylinder,
        stone,
        [side * 26, y + height * 0.5, z],
        [2.7, height, 2.7],
      );
      add(temple, box, jade, [side * 26, y + height, z], [7, 1.6, 6]);
      obstacleAt(temple, side * 26, y + height * 0.5, z, 3.2);
    }
  }
  add(temple, box, jade, [0, 41.4, 4], [15.2, 3, 5]);
  obstacleAt(temple, 0, 8, 0, 24);
  obstacleAt(temple, 0, 26, 0, 11);

  const gate = landmark("深渊裂隙之门", 67, -1075, 360);
  add(gate, box, stone, [0, -12, 0], [87, 28, 38]);
  for (const side of [-1, 1]) {
    add(gate, box, stone, [side * 26, 24, 0], [10, 48, 12]);
    for (let cap = 0; cap < 4; cap++)
      add(gate, box, jade, [side * 26, 7 + cap * 11, 0], [12, 2.5, 14]);
    for (let glyph = 0; glyph < 7; glyph++) {
      add(
        gate,
        box,
        glow,
        [side * 26, 7 + glyph * 5.3, 6.04],
        [4.2, 0.35, 0.04],
      );
      add(
        gate,
        box,
        glow,
        [side * (25 + (glyph % 2) * 2), 8.1 + glyph * 5.3, 6.05],
        [0.45, 2.4, 0.04],
      );
    }
    obstacleAt(gate, side * 26, 24, 0, 8);
  }
  add(gate, box, stone, [0, 50, 0], [67, 10, 16]);
  add(gate, box, jade, [0, 57, 0], [74, 4, 19]);
  const ring = add(
    gate,
    new THREE.TorusGeometry(18, 0.22, 5, 40, Math.PI * 1.84),
    glow,
    [0, 27, 2],
  );
  ring.rotation.z = 0.22;
  obstacleAt(gate, 0, 50, 0, 8);

  // 黑烟囱与火山分离，低矮成簇烟囱和向上翻涌的暗色烟羽易于辨认。
  const smokers = [];
  const chimneyClusters = [
    [-109, -451],
    [64, -603],
    [-164, -857],
    [109, -984],
  ];
  const chimneyGeometry = track(
    new THREE.CylinderGeometry(0.72, 1.8, 1, 7, 3, true),
  );
  const chimneys = new THREE.InstancedMesh(chimneyGeometry, basalt, 36);
  const hotRings = new THREE.InstancedMesh(
    track(new THREE.TorusGeometry(0.73, 0.12, 5, 9)),
    glow,
    36,
  );
  for (let index = 0; index < 36; index++) {
    const cluster = chimneyClusters[index % 4];
    const x = cluster[0] + (random() - 0.5) * 23;
    const z = cluster[1] + (random() - 0.5) * 23;
    const y = seabedHeight(x, z),
      height = 5 + random() * 13;
    dummy.position.set(x, y + height * 0.5, z);
    dummy.rotation.set(0, random() * Math.PI, 0);
    dummy.scale.set(1, height, 1);
    dummy.updateMatrix();
    chimneys.setMatrixAt(index, dummy.matrix);
    dummy.position.y = y + height;
    dummy.rotation.x = Math.PI / 2;
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    hotRings.setMatrixAt(index, dummy.matrix);
    smokers.push(new THREE.Vector3(x, y + height, z));
    obstacles.push({ x, y: y + height * 0.5, z, radius: 1.8 });
    colliders.push({
      type: "capsule",
      kind: "chimney",
      a: { x, y, z },
      b: { x, y: y + height, z },
      radius: 1.8,
    });
  }
  root.add(chimneys, hotRings);
  const smokeGeometry = track(new THREE.BufferGeometry());
  const smokePositions = [],
    smokeSeeds = [];
  for (let index = 0; index < 324; index++) {
    const origin = smokers[index % smokers.length];
    smokePositions.push(origin.x, origin.y, origin.z);
    smokeSeeds.push(random(), random(), random());
  }
  smokeGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(smokePositions, 3),
  );
  smokeGeometry.setAttribute(
    "aSeed",
    new THREE.Float32BufferAttribute(smokeSeeds, 3),
  );
  const smokeMaterial = track(
    new THREE.ShaderMaterial({
      uniforms: { oceanTime: worldUniforms.oceanTime },
      vertexShader: `
      uniform float oceanTime;
      attribute vec3 aSeed;
      varying float vOpacity;
      void main() {
        float lift = mod(oceanTime * (1.4 + aSeed.x) + aSeed.y * 45.0, 45.0);
        vec3 p = position;
        p.y += lift;
        p.x += sin(aSeed.z * 30.0 + lift * 0.13) * (0.2 + lift * 0.13);
        p.z += cos(aSeed.x * 25.0 + lift * 0.17) * (0.2 + lift * 0.08);
        vec4 view = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp((13.0 + lift * 2.7) * 120.0 / max(5.0, -view.z), 2.0, 80.0);
        vOpacity = sin(lift / 45.0 * 3.14159265) * exp(-length(view.xyz) * 0.006);
      }`,
      fragmentShader: `
      varying float vOpacity;
      void main() {
        float radius = length(gl_PointCoord - 0.5) * 2.0;
        float alpha = pow(max(0.0, 1.0 - radius), 1.5) * vOpacity * 0.44;
        gl_FragColor = vec4(0.045, 0.075, 0.088, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      transparent: true,
      depthWrite: false,
    }),
  );
  const smoke = new THREE.Points(smokeGeometry, smokeMaterial);
  smoke.frustumCulled = false;
  root.add(smoke);

  for (const group of landmarkGroups) batchStatic(group, track);

  return {
    landmarks,
    update(time, playerPosition) {
      for (const group of landmarkGroups) {
        group.visible =
          group.position.distanceToSquared(playerPosition) <
          group.userData.visibilityRadius ** 2;
      }
      // 符文、热泉环与遗迹刻痕共用同一发光材质，缓慢呼吸提示地标活性。
      glow.emissiveIntensity = 1.9 + Math.sin(time * 0.8) * 0.5;
    },
    dispose() {
      parent.remove(root);
      for (const resource of resources) resource.dispose();
    },
  };
}

function randomSource(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function tubeGeometry(points, radius, segments = 18, sides = 5) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
  );
  return new THREE.TubeGeometry(curve, segments, radius, sides, false);
}

function leafGeometry() {
  const positions = [],
    indices = [];
  for (let row = 0; row <= 8; row++) {
    const p = row / 8;
    const width = Math.sin(p * Math.PI) * (0.47 + Math.sin(p * 18) * 0.07);
    positions.push(
      -width,
      p,
      Math.sin(p * 3.8) * 0.3,
      width,
      p,
      Math.sin(p * 3.8) * 0.3,
    );
    if (row < 8) {
      const a = row * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
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

function ragGeometry() {
  const positions = [
    -6, 0, 0, 5, 0, 0, 4.2, -6.4, 0.5, -6, 0, 0, 4.2, -6.4, 0.5, 1.8, -4, 0.3,
    -6, 0, 0, 1.8, -4, 0.3, -2.8, -8.2, 0.8, -6, 0, 0, -2.8, -8.2, 0.8, -5.1,
    -4.7, 0.5,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.computeVertexNormals();
  return geometry;
}

function applyOrganicSway(material, uniforms, amount) {
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
        float phase = 0.0;
        #ifdef USE_INSTANCING
          phase = instanceMatrix[3].x * 0.2 + instanceMatrix[3].z * 0.11;
        #endif
        transformed.x += sin(oceanTime * 0.7 + phase + position.y * 2.0) * position.y * ${amount.toFixed(2)};
        transformed.z += cos(oceanTime * 0.5 + phase) * position.y * 0.07;
      `,
      );
  };
  material.customProgramCacheKey = () => "abyssal_kelp_v2";
}

function applyJellyPulse(material, uniforms, threads) {
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
        float phase = 0.0;
        #ifdef USE_INSTANCING
          phase = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.15;
        #endif
        float pulse = sin(oceanTime * 1.4 + phase);
        transformed.y += sin(oceanTime * 0.45 + phase) * 0.28;
        ${threads ? "transformed.x += sin(oceanTime * 0.7 + phase + position.y) * abs(position.y) * 0.08;" : "transformed.xz *= 1.0 + pulse * 0.1; transformed.y *= 1.0 - pulse * 0.12;"}
      `,
      );
  };
  material.customProgramCacheKey = () => `abyssal_jelly_${threads}`;
}

function batchStatic(group, track) {
  const batches = new Map();
  for (const child of group.children) {
    if (!child.isMesh) continue;
    if (!batches.has(child.material)) batches.set(child.material, []);
    batches.get(child.material).push(child);
  }
  for (const [material, children] of batches) {
    const geometries = children.map((child) => {
      child.updateMatrix();
      const geometry = child.geometry.index
        ? child.geometry.toNonIndexed()
        : child.geometry.clone();
      geometry.applyMatrix4(child.matrix);
      geometry.deleteAttribute("uv");
      return geometry;
    });
    const merged = track(mergeGeometries(geometries));
    for (const geometry of geometries) geometry.dispose();
    for (const child of children) group.remove(child);
    group.add(new THREE.Mesh(merged, material));
  }
}
