import * as THREE from "three";
import {
  carvedLoft,
  carvedSweep,
  carvedBlade,
  carvedCloth,
  gaussian,
} from "./atlantis_poseidon_sculpture_geometry.js";

const TRIDENT_X = -9.8;
const TRIDENT_Z = 4.2;
const MARBLE = "#c9c4b1";
const HAIR = "#bcb9a6";
const BRONZE = "#a88b55";
let SCULPTURE_PARTS = null;

/**
 * 构建面向 +Z 的海神巨像；足底为原点，冠顶 66m，戟尖 81.5m。
 * @param {object} bucket 负责克隆与合并的城市几何桶。
 * @param {object} origin 雕像足底城市坐标 {x, y, z}。
 * @returns {object} 碰撞体、障碍物、戟尖、头部中心及总高度。
 */
export function buildPoseidon(bucket, origin) {
  // 原件跨地图共用，调用方只持有克隆，销毁城市不得释放此缓存。
  if (!SCULPTURE_PARTS) SCULPTURE_PARTS = sculptPoseidon();
  for (const { geometry, material } of SCULPTURE_PARTS)
    bucket.add(geometry, material, {
      position: [origin.x, origin.y, origin.z],
    });
  const at = (p) => ({
    x: p[0] + origin.x,
    y: p[1] + origin.y,
    z: p[2] + origin.z,
  });
  const capsule = (kind, a, b, radius) => ({
    type: "capsule",
    kind: `poseidon_${kind}`,
    a: at(a),
    b: at(b),
    radius,
  });
  return {
    // 分开腿、臂、布料与叉齿，肘内和两腿之间的负空间允许穿行。
    colliders: [
      capsule("right_thigh", [-3, 29, 0.8], [-3.8, 17.5, 1.6], 2.6),
      capsule("right_calf", [-3.8, 14.5, 1.6], [-4.4, 3.6, 2.3], 1.7),
      capsule("right_foot", [-4.4, 1.1, 1.5], [-4.5, 0.9, 6.1], 1.15),
      capsule("left_leg", [3.5, 29, -0.2], [4.6, 4, -0.7], 2.5),
      capsule("left_foot", [4.6, 1.1, -0.5], [5.3, 0.9, 4], 1.25),
      capsule("robe_side", [6, 5, -1], [5.7, 26.5, -0.1], 2.4),
      capsule("robe_back", [0.7, 4, -4], [0.5, 29, -3.4], 2.1),
      capsule("pelvis", [-3.9, 30.9, 0.2], [4.8, 30.9, 0.2], 3.5),
      capsule("abdomen", [0.3, 34.5, 0], [0, 41.8, 0], 4.1),
      capsule("chest", [-4.2, 47.8, -0.1], [4.6, 47.5, -0.1], 4.3),
      capsule("neck", [0, 51, 0], [0, 56, 0], 2.25),
      capsule("head", [0, 56.8, 0.2], [0, 61.5, 0.1], 3.35),
      capsule("beard", [0, 53.3, 3.1], [0, 56.6, 3.1], 2.05),
      capsule("right_upper_arm", [-7.2, 50, 0], [-10.3, 43.9, 0.4], 2.55),
      capsule("right_forearm", [-10.6, 43.8, 0.7], [-10.2, 53.8, 3.7], 1.65),
      capsule("right_hand", [-10, 54.1, 3.8], [-9.8, 57, 3.9], 1.12),
      capsule("left_upper_arm", [7.1, 49.7, 0], [10, 41.5, 1.5], 2.35),
      capsule("left_forearm", [10, 41.5, 1.5], [6.05, 35.4, 3.35], 1.65),
      capsule("left_hand", [6.05, 35.4, 3.35], [5.05, 32.7, 4.05], 1.0),
      capsule(
        "trident_shaft",
        [TRIDENT_X, 0.53, TRIDENT_Z],
        [TRIDENT_X, 72.5, TRIDENT_Z],
        0.53,
      ),
      capsule(
        "trident_middle",
        [TRIDENT_X, 72, TRIDENT_Z],
        [TRIDENT_X, 80.9, TRIDENT_Z],
        0.48,
      ),
      ...[-1, 1].flatMap((s) => [
        capsule(
          "trident_branch",
          [TRIDENT_X, 70.6, TRIDENT_Z],
          [TRIDENT_X + s * 2.95, 73.9, TRIDENT_Z],
          0.5,
        ),
        capsule(
          "trident_prong",
          [TRIDENT_X + s * 2.95, 73.9, TRIDENT_Z],
          [TRIDENT_X + s * 2.95, 79.4, TRIDENT_Z],
          0.44,
        ),
      ]),
    ],
    obstacles: [{ kind: "poseidon_torso", ...at([0, 42, 0]), radius: 8.5 }],
    tridentTip: new THREE.Vector3(
      TRIDENT_X + origin.x,
      81.5 + origin.y,
      TRIDENT_Z + origin.z,
    ),
    headCenter: new THREE.Vector3(origin.x, 59.4 + origin.y, 0.6 + origin.z),
    height: 82,
  };
}

/*********************************************
 * 雕刻主体：承重腿、宽阔胸廓与非对称持戟姿态
 ********************************************/

function sculptPoseidon() {
  const parts = [];
  const add = (geometry, color = MARBLE, material = "marble") => {
    finishSurface(geometry, color, material);
    parts.push({ geometry, material });
    return geometry;
  };
  const sweep = (
    points,
    radii,
    color = MARBLE,
    options = {},
    material = "marble",
  ) => add(carvedSweep(points, radii, options), color, material);
  const oval = (
    position,
    scale,
    color = MARBLE,
    rotation = 0,
    material = "marble",
  ) => {
    const geometry = new THREE.SphereGeometry(1, 18, 12);
    geometry.scale(...scale);
    geometry.rotateZ(rotation);
    geometry.translate(...position);
    return add(geometry, color, material);
  };

  // 双腿的膝、胫骨和踝部都由同一表面雕出；立腿略前，另一腿后撤。
  for (const side of [-1, 1]) {
    const stand = side === -1;
    const leg = carvedLoft(
      [
        { y: 0, x: side * 4.55, z: stand ? 3.8 : 1.35, rx: 1.28, rz: 2.75 },
        { y: 0.72, x: side * 4.55, z: stand ? 3.8 : 1.35, rx: 1.4, rz: 2.77 },
        { y: 1.7, x: side * 4.6, z: stand ? 2.9 : 0.3, rx: 1.13, rz: 1.72 },
        { y: 4, x: side * 4.45, z: stand ? 2 : -0.65, rx: 1.05, rz: 1.15 },
        { y: 8.4, x: side * 4.05, z: stand ? 1.5 : -1.1, rx: 1.7, rz: 1.68 },
        { y: 12, x: side * 3.8, z: stand ? 1.25 : -1.1, rx: 1.7, rz: 1.85 },
        { y: 16.6, x: side * 3.8, z: stand ? 1.6 : -0.55, rx: 1.64, rz: 1.64 },
        { y: 20, x: side * 3.5, z: stand ? 0.8 : -0.15, rx: 2.4, rz: 2.3 },
        { y: 25.5, x: side * 3.1, z: 0.3, rx: 3, rz: 2.8 },
        { y: 30.7, x: side * 2.85, z: 0, rx: 3.25, rz: 3.05 },
        { y: 32.8, x: side * 2.7, z: 0, rx: 2.65, rz: 2.7 },
      ],
      {
        radial: 48,
        rows: 108,
        sculpt: ([x, y, z], angle) => {
          const front = Math.max(0, Math.sin(angle));
          z +=
            front ** 5 *
            (0.48 * gaussian(y, 16.7, 1.4) +
              0.24 * gaussian(y, 9, 4) +
              0.44 * gaussian(y, 24.5, 4));
          return [x, y, z];
        },
      },
    );
    add(leg);
    const footX = side * 4.55,
      footZ = stand ? 3.8 : 1.35;

    for (let toe = 0; toe < 5; toe++) {
      const across = (toe - 2) * 0.48;
      oval(
        [footX + side * across, 0.44, footZ + 2.24 - toe * 0.16],
        [0.34 - toe * 0.027, 0.31 - toe * 0.016, 0.73 - toe * 0.064],
      );
    }
    sweep(
      [
        [footX + side * 0.52, 3.1, footZ - 0.8],
        [footX + side * 0.55, 1.29, footZ + 0.5],
        [footX + side * 0.45, 0.78, footZ + 2.2],
      ],
      [0.12, 0.16, 0.045],
      MARBLE,
      { samples: 16, radial: 8 },
    );
  }

  // 胸腹用同一网格的位移表达：胸肌下缘、腹白线、髂嵴和肋缘有真实凹凸。
  add(
    carvedLoft(
      [
        { y: 29.4, x: 0.25, rx: 5.85, rz: 3.55 },
        { y: 33, x: 0.45, rx: 5.75, rz: 3.6 },
        { y: 36.2, x: 0.4, rx: 4.8, rz: 3.1 },
        { y: 40, x: 0.15, rx: 5.65, rz: 3.7 },
        { y: 44, x: 0, rx: 7.4, rz: 4.05 },
        { y: 47.5, x: 0, rx: 8.15, rz: 4.1 },
        { y: 49.9, x: 0, rx: 7.6, rz: 3.35 },
        { y: 51.5, x: 0, rx: 5.1, rz: 2.85 },
        { y: 53.1, x: 0, rx: 2.65, rz: 2.25 },
        { y: 55.9, x: 0, rx: 2.25, rz: 2.05 },
      ],
      {
        rows: 144,
        radial: 96,
        sculpt: ([x, y, z], angle) => {
          const front = Math.max(0, Math.sin(angle)),
            back = Math.max(0, -Math.sin(angle));
          let relief =
            1.3 * gaussian(Math.abs(x), 3.65, 2.3) * gaussian(y, 47.15, 2);
          relief -= 0.4 * gaussian(x, 0, 0.43) * gaussian(y, 44.8, 4.7);
          relief -=
            0.47 *
            gaussian(y, 44.5 + Math.abs(x) * 0.035, 0.4) *
            gaussian(Math.abs(x), 3.1, 2.8);
          for (const row of [36.8, 39.35, 41.7])
            relief +=
              0.64 * gaussian(Math.abs(x), 1.5, 1.05) * gaussian(y, row, 0.96);
          relief -= 0.17 * gaussian(x, 0.2, 0.21) * gaussian(y, 39.3, 4);
          relief -= 0.35 * gaussian(x, 0.15, 0.3) * gaussian(y, 35.6, 0.32);
          relief += 0.45 * gaussian(Math.abs(x), 4.2, 1) * gaussian(y, 38.4, 4);
          relief +=
            0.34 *
            gaussian(y, 50 - Math.abs(x) * 0.105, 0.22) *
            gaussian(Math.abs(x), 3.6, 2.1);
          relief -=
            0.2 * gaussian(Math.abs(x), 4.8, 0.5) * gaussian(y, 40.3, 2.8);
          z += relief * front ** 1.9;
          z -=
            back ** 2 *
            (0.55 * gaussian(Math.abs(x), 3.8, 2.6) * gaussian(y, 47, 4) -
              0.3 * gaussian(x, 0, 0.38));
          return [x, y, z];
        },
      },
    ),
  );

  // 整条手臂一体扫掠，肩根深嵌胸廓，肘部不产生端盖接缝。
  sweep(
    [
      [-4.7, 49.1, 0],
      [-7.7, 49.5, 0],
      [-9.7, 46.7, 0.1],
      [-10.6, 43.9, 0.7],
      [-11.2, 47.5, 1.9],
      [-10.55, 51.6, 3.25],
      [-9.94, 54.7, 3.7],
    ],
    [2.1, 3.2, 2.55, 1.86, 2.05, 1.43, 0.9],
    MARBLE,
    { radial: 32, samples: 88, flatten: 0.97 },
  );
  sweep(
    [
      [4.7, 49.1, 0],
      [7.7, 49.2, 0.18],
      [9.1, 46, 0.6],
      [10, 41.5, 1.5],
      [9.45, 39.2, 2.8],
      [7.45, 36.8, 3.55],
      [5.85, 34.5, 3.55],
    ],
    [2.1, 3.2, 2.6, 1.77, 1.96, 1.5, 0.85],
    MARBLE,
    { radial: 32, samples: 88, flatten: 0.97 },
  );
  // 可读的前臂肌腱嵌入前面，绝不以独立球体表示关节。
  sweep(
    [
      [-11, 45.3, 2.1],
      [-11, 48.7, 3.2],
      [-10.3, 53.7, 4.5],
    ],
    [0.045, 0.16, 0.08],
    MARBLE,
    { radial: 8, samples: 24 },
  );
  sweep(
    [
      [10.6, 42.1, 2.9],
      [9.8, 39.1, 4.15],
      [6.3, 35.1, 4.15],
    ],
    [0.05, 0.19, 0.06],
    MARBLE,
    { radial: 8, samples: 24 },
  );
  sculptHands(add, sweep, oval);
  sculptDrapery(add, sweep);
  sculptHead(add, sweep, oval);
  sculptRegalia(add, sweep, oval);
  return parts;
}

/*********************************************
 * 手指、层叠布料与卷发
 ********************************************/

function sculptHands(add, sweep, oval) {
  oval([-10.05, 55.55, 3.5], [1.13, 1.7, 0.76], MARBLE, -0.12);
  for (let i = 0; i < 4; i++) {
    const y = 54.25 + i * 0.72;
    sweep(
      [
        [-10.9, y, 3.5],
        [-10.65, y + 0.11, 4.58],
        [-9.78, y + 0.02, 4.98],
        [-9.05, y - 0.09, 4.45],
        [-9.21, y - 0.15, 3.99],
      ],
      [0.33, 0.35, 0.31, 0.27, 0.12],
      MARBLE,
      { radial: 12, samples: 24 },
    );
  }
  sweep(
    [
      [-10.9, 56.7, 3.6],
      [-10.55, 57.2, 4.37],
      [-9.8, 56.6, 4.93],
      [-9.48, 55.87, 4.9],
    ],
    [0.42, 0.42, 0.37, 0.09],
    MARBLE,
    { radial: 12, samples: 22 },
  );
  // 收拢手落在真实腰布前缘，手腕和布料抓点保持同一局部坐标。
  const originalSweep = sweep,
    originalOval = oval;
  const shift = (geometry) => {
    geometry.translate(-0.75, 0, -0.85);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  };
  sweep = (...args) => shift(originalSweep(...args));
  oval = (...args) => shift(originalOval(...args));
  oval([6.13, 33.65, 4.62], [0.95, 1.5, 0.64], MARBLE, -0.36);
  for (let i = 0; i < 4; i++) {
    const x = 5.32 + i * 0.52,
      y = 32.9 + Math.abs(i - 1.5) * 0.12;
    sweep(
      [
        [x, y + 0.87, 4.73],
        [x - 0.25, y - 0.34, 5.28],
        [x - 0.56, y - 0.95, 5.12],
        [x - 0.52, y - 1.2, 4.79],
      ],
      [0.1, 0.27, 0.21, 0.07],
      MARBLE,
      { radial: 10, samples: 20 },
    );
  }
  sweep(
    [
      [6.94, 34.5, 4.75],
      [7.15, 33.35, 5.33],
      [6.6, 32.83, 5.43],
    ],
    [0.36, 0.33, 0.06],
    MARBLE,
    { radial: 10, samples: 18 },
  );
  // 手背细腱从腕背进入指根，强调手与前臂的连续关系。
  for (let i = 0; i < 3; i++)
    sweep(
      [
        [6.4 + i * 0.15, 34.4, 5.18],
        [5.95 + i * 0.34, 33.45, 5.25],
        [5.4 + i * 0.5, 32.8, 5.16],
      ],
      [0.045, 0.075, 0.03],
      MARBLE,
      { radial: 6, samples: 14 },
    );
}

function sculptDrapery(add, sweep) {
  const clothSample = (u, v) => {
    const y = 3 + v * 27.8;
    const gap = 0.87 * (1 - v) ** 0.72;
    const angle = 2.12 + gap + u * (Math.PI * 2 - gap * 2);
    const radius = 5.95 + 0.65 * (1 - v) + 0.25 * Math.sin(v * Math.PI);
    const phase = angle * 13 + 0.58 * Math.sin(v * 3) + 0.5 * v;
    const fold =
      (0.19 + 0.37 * (1 - v)) * Math.cos(phase) +
      0.13 * Math.cos(angle * 25 - v * 2);
    const x = 0.5 + Math.cos(angle) * (radius + fold);
    const z = -0.15 + Math.sin(angle) * (3.7 + fold * 0.75);
    return [x, y + (1 - v) ** 7 * (1.4 * Math.sin(angle * 2 + 0.3) + 1.1), z];
  };
  add(carvedCloth(clothSample, 68, 84), "#babaa9");
  // 斜垂腰布的两端汇入攥握处；中央下坠，褶线按重力弯曲而非平行腰带。
  add(
    carvedCloth(
      (u, v) => {
        const angle = u * Math.PI * 2,
          front = Math.max(0, Math.sin(angle));
        const radius = 6.28 + Math.sin(v * Math.PI) * 0.22;
        const x = 0.4 + Math.cos(angle) * radius;
        const sag =
          front *
          (1.7 + Math.sin(v * Math.PI) * 0.85) *
          (1 - Math.cos(angle) ** 2);
        const y = 25.7 + v * 7.6 - sag + front * x * 0.23;
        const fold =
          0.3 *
          Math.cos(
            v * Math.PI * 6.5 +
              Math.sin(angle) * 1.1 +
              Math.cos(angle) * v * 2.4,
          );
        const z = 0.12 + Math.sin(angle) * (4.38 + fold * front);
        return [x, y, z];
      },
      38,
      84,
    ),
    "#c4c0ad",
  );
  // 两道低宽度卷边沿开衩落下；前腿和布缘之间仍保留明确空间。
  for (const u of [0, 1]) {
    const path = Array.from({ length: 8 }, (_, i) => clothSample(u, i / 7));
    sweep(path, [0.11, 0.2, 0.19, 0.2, 0.18, 0.15, 0.12, 0.07], "#c8c2ae", {
      radial: 9,
      samples: 48,
    });
  }
  // 侧披风从肩后下垂，前面保留完整胸肌；宽面起伏形成重石布褶。
  const mantle = (u, v) => {
    const y = 9.5 + v * 41.2;
    const width = 3.9 - v * 1.8;
    const x = 4.55 + (u - 0.5) * width + 0.5 * Math.sin(v * 2.8);
    const z =
      -3.55 +
      v * 0.9 -
      Math.sin(u * Math.PI) * (0.8 + Math.sin(v * Math.PI)) +
      Math.cos(u * Math.PI * 10 + v * 1.5) * 0.22;
    return [x, y + (1 - v) ** 6 * Math.cos(u * 4) * 1.1, z];
  };
  add(carvedCloth(mantle, 64, 28), "#b5b6a4");
  sweep(
    [
      [4.1, 49.1, -2.3],
      [5.75, 51.28, -0.65],
      [6.55, 50.5, 1.5],
      [5.8, 48.6, 3.5],
    ],
    [0.38, 0.7, 0.6, 0.18],
    "#c2bdab",
    { radial: 14, samples: 36, flatten: 0.68 },
  );
}

function sculptHead(add, sweep, oval) {
  // 颅骨、颧弓、眼窝、口轮匝肌和鼻根全部属于主头部表面。
  add(
    carvedLoft(
      [
        { y: 54.6, rx: 1.8, rz: 1.85, z: 0.5 },
        { y: 55.5, rx: 2.5, rz: 2.35, z: 0.45 },
        { y: 57, rx: 3.05, rz: 2.68, z: 0.35 },
        { y: 58.65, rx: 3.17, rz: 2.75, z: 0.25 },
        { y: 60.3, rx: 3.18, rz: 2.77, z: 0.15 },
        { y: 62.1, rx: 2.96, rz: 2.53, z: 0 },
        { y: 63.45, rx: 2.13, rz: 1.87, z: 0 },
        { y: 64.07, rx: 0.055, rz: 0.055, z: 0 },
      ],
      {
        radial: 100,
        rows: 112,
        sculpt: ([x, y, z], angle) => {
          const front = Math.max(0, Math.sin(angle));
          let carving =
            0.66 *
            gaussian(Math.abs(x), 1.3, 0.93) *
            gaussian(y, 60.45 - Math.abs(x) * 0.075, 0.34);
          carving -=
            0.58 * gaussian(Math.abs(x), 1.4, 0.66) * gaussian(y, 59.68, 0.5);
          carving +=
            0.63 * gaussian(Math.abs(x), 2.05, 0.75) * gaussian(y, 58.6, 0.57);
          carving -=
            0.26 * gaussian(Math.abs(x), 2.05, 0.72) * gaussian(y, 57.35, 0.6);
          carving += 0.61 * gaussian(x, 0, 0.45) * gaussian(y, 60, 1.33);
          carving += 0.6 * gaussian(x, 0, 0.93) * gaussian(y, 57.25, 0.64);
          carving += 0.32 * gaussian(x, 0, 0.5) * gaussian(y, 55.8, 0.45);
          carving -= 0.1 * gaussian(x, 0, 0.2) * gaussian(y, 61.05, 0.45);
          carving -=
            0.105 *
            gaussian(y, 61.4 + 0.1 * Math.cos(x * 1.1), 0.09) *
            gaussian(x, 0, 1.9);
          return [x, y, z + carving * front ** 1.4];
        },
      },
    ),
  );
  // 鼻梁从眉间连续延伸至鼻尖，斜面和鼻翼明确形成希腊雕塑的侧影。
  add(
    carvedLoft(
      [
        { y: 58.05, rx: 0.54, rz: 0.33, z: 3.36 },
        { y: 58.39, rx: 0.62, rz: 0.64, z: 3.7 },
        { y: 58.8, rx: 0.43, rz: 0.54, z: 3.65 },
        { y: 59.6, rx: 0.36, rz: 0.4, z: 3.39 },
        { y: 60.6, rx: 0.29, rz: 0.24, z: 3.22 },
      ],
      { radial: 28, rows: 38 },
    ),
  );
  for (const s of [-1, 1]) {
    oval([s * 0.56, 58.22, 3.45], [0.43, 0.3, 0.5]);
    oval([s * 0.53, 58.09, 3.78], [0.2, 0.09, 0.1], "#8d9486");
    oval([s * 3.12, 58.7, 0.05], [0.51, 1.05, 0.66]);
    sweep(
      [
        [s * 3.25, 59.49, 0.47],
        [s * 3.49, 59.16, 0.53],
        [s * 3.44, 58.3, 0.45],
        [s * 3.2, 57.98, 0.4],
      ],
      [0.1, 0.16, 0.15, 0.06],
      MARBLE,
      { radial: 8, samples: 22 },
    );
    // 眼睑包住石雕眼球，眼睛不发光；眉压与暗缝负责庄严神情。
    oval([s * 1.42, 59.72, 2.88], [0.57, 0.235, 0.16], "#adaf9f");
    sweep(
      [
        [s * 0.72, 59.67, 3.01],
        [s * 1.34, 59.95, 3.18],
        [s * 2.08, 59.76, 2.7],
      ],
      [0.08, 0.17, 0.065],
      MARBLE,
      { radial: 10, samples: 22 },
    );
    sweep(
      [
        [s * 0.72, 59.63, 3.02],
        [s * 1.4, 59.48, 3.08],
        [s * 2.08, 59.75, 2.7],
      ],
      [0.065, 0.11, 0.04],
      MARBLE,
      { radial: 9, samples: 22 },
    );
    oval([s * 1.4, 59.72, 3.07], [0.11, 0.13, 0.036], "#768679");
    sweep(
      [
        [s * 0.46, 60.3, 3.29],
        [s * 1.34, 60.5, 3.33],
        [s * 2.35, 60.24, 2.64],
      ],
      [0.07, 0.19, 0.025],
      HAIR,
      { radial: 10, samples: 24, groove: 0.07 },
    );
    // 胡须前的口唇仍可辨认，鼻唇沟沉入须根。
    sweep(
      [
        [s * 0.59, 58.02, 3.66],
        [s * 1.02, 57.59, 3.61],
        [s * 1.19, 57.06, 3.51],
      ],
      [0.07, 0.1, 0.04],
      MARBLE,
      { samples: 20, radial: 8 },
    );
  }
  sweep(
    [
      [-0.99, 57.23, 3.54],
      [-0.38, 57.28, 3.78],
      [0, 57.2, 3.82],
      [0.38, 57.28, 3.78],
      [0.99, 57.23, 3.54],
    ],
    [0.05, 0.13, 0.11, 0.13, 0.05],
    "#b5b39f",
    { samples: 32, radial: 10 },
  );
  sweep(
    [
      [-0.91, 56.98, 3.6],
      [0, 56.9, 3.86],
      [0.91, 56.98, 3.6],
    ],
    [0.04, 0.21, 0.04],
    MARBLE,
    { samples: 24, radial: 10 },
  );

  // 卷须主面整体雕刻连续起伏，凹槽随波浪弯曲，避免管状须束之间的穿插。
  add(
    carvedLoft(
      [
        { y: 51.65, rx: 0.12, rz: 0.13, z: 3.03 },
        { y: 52.5, rx: 1.58, rz: 0.94, z: 2.94 },
        { y: 54.05, rx: 2.64, rz: 1.37, z: 2.65 },
        { y: 55.65, rx: 3.05, rz: 1.64, z: 2.05 },
        { y: 57.15, rx: 3.04, rz: 1.62, z: 1.37 },
        { y: 58.6, rx: 2.63, rz: 1.21, z: 0.77 },
      ],
      {
        radial: 104,
        rows: 92,
        sculpt: ([x, y, z], angle) => {
          const front = Math.max(0, Math.sin(angle)),
            end = Math.min(1, Math.max(0, (y - 51.65) / 1.2));
          const wave =
            0.28 * Math.cos(angle * 17 + 1.5 * Math.sin(y * 1.4 + angle * 2)) +
            0.075 * Math.cos(angle * 34 + 2.1 * Math.sin(y * 1.4));
          return [x + Math.cos(angle) * wave * end, y, z + front * wave * end];
        },
      },
    ),
    HAIR,
  );
  // 外层短卷嵌入须体，卷心形成局部阴影，远景仍是一块完整的胡须轮廓。
  for (let i = 0; i < 11; i++) {
    const a = -1.17 + (i / 10) * 2.34,
      x = Math.sin(a) * 2.62,
      y = 54.1 + Math.abs(x) * 0.35 + Math.sin(i * 2.4) * 0.65,
      z = 2.02 + Math.cos(a) * 1.79;
    const path = [];
    for (let j = 0; j < 10; j++) {
      const t = j / 9,
        angle = -Math.PI * 0.55 + t * Math.PI * 1.7 + Math.sin(i * 3) * 0.4;
      path.push([
        x + Math.cos(angle) * 0.31,
        y + Math.sin(angle) * 0.45,
        z + Math.sin(t * Math.PI) * 0.16,
      ]);
    }
    sweep(
      path,
      [0.025, 0.11, 0.17, 0.19, 0.2, 0.18, 0.16, 0.12, 0.075, 0.025],
      HAIR,
      { radial: 10, samples: 22, groove: 0.1 },
    );
  }
  for (const s of [-1, 1]) {
    sweep(
      [
        [s * 0.12, 58.05, 3.88],
        [s * 0.8, 57.79, 4.03],
        [s * 1.73, 57.33, 3.8],
        [s * 2.28, 56.3, 3.6],
        [s * 2, 55.91, 3.74],
      ],
      [0.22, 0.4, 0.46, 0.31, 0.055],
      HAIR,
      { radial: 14, samples: 32, groove: 0.11 },
    );
    for (let i = 0; i < 3; i++)
      sweep(
        [
          [s * 0.18, 58.15 - i * 0.13, 4],
          [s * 0.94, 57.88 - i * 0.13, 4.28],
          [s * 1.8, 57.3 - i * 0.14, 4.05],
          [s * 2.19, 56.4, 3.81],
        ],
        [0.035, 0.06, 0.07, 0.025],
        "#cec7b3",
        { radial: 6, samples: 22 },
      );
  }
  // 后脑先有连贯发帽，波浪发绺再从发冠向后下方分层生长。
  const scalp = new THREE.SphereGeometry(1, 48, 32);
  scalp.scale(3.28, 3.05, 2.92);
  scalp.translate(0, 61.1, -0.36);
  // 移除前半下部，避免发帽穿入额头和眉眼。
  const sp = scalp.attributes.position;
  for (let i = 0; i < sp.count; i++)
    if (sp.getZ(i) > 0.3 && sp.getY(i) < 62)
      sp.setZ(i, Math.min(sp.getZ(i), 1.38));
  scalp.computeVertexNormals();
  add(scalp, HAIR);
  for (let i = 0; i < 20; i++) {
    const a = -0.15 + (i / 19) * (Math.PI + 0.3),
      dx = Math.cos(a),
      dz = -Math.sin(a);
    const points = Array.from({ length: 10 }, (_, j) => {
      const t = j / 9,
        spread = Math.sin((Math.min(1, t * 2) * Math.PI) / 2),
        sway =
          Math.sin(t * Math.PI * 3.6 + i * 1.7) * 0.35 * Math.sin(t * Math.PI);
      return [
        dx * (0.58 + spread * 2.77) + dz * sway,
        64.0 - t * (8.75 + 0.5 * Math.sin(i)),
        dz * (0.58 + spread * 2.44) -
          dx * sway +
          Math.cos(t * Math.PI * 3.6 + i * 1.7) * 0.14 * Math.sin(t * Math.PI),
      ];
    });
    sweep(
      points,
      [0.08, 0.36, 0.55, 0.6, 0.58, 0.56, 0.54, 0.48, 0.35, 0.035],
      HAIR,
      { radial: 12, samples: 44, groove: 0.12 },
    );
  }
  // 鬓角加入向内卷回的大卷，打破直发帘的侧轮廓。
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const path = [];
      for (let j = 0; j < 11; j++) {
        const t = j / 10,
          a = -Math.PI * 0.45 + t * Math.PI * 1.65;
        path.push([
          side * (3.05 + Math.cos(a) * 0.5),
          60.6 - i * 1.22 + Math.sin(a) * 0.62,
          1.22 - i * 0.07 + 0.14 * t,
        ]);
      }
      sweep(
        path,
        [0.04, 0.2, 0.32, 0.38, 0.39, 0.38, 0.36, 0.3, 0.24, 0.16, 0.03],
        HAIR,
        { radial: 12, samples: 24, groove: 0.1 },
      );
    }
  for (const s of [-1, 1])
    for (let i = 0; i < 5; i++) {
      sweep(
        [
          [s * (0.1 + i * 0.06), 63.25 + i * 0.12, 1.64 - i * 0.33],
          [s * 1.19, 63.33 - i * 0.05, 2.53 - i * 0.18],
          [s * 2.5, 62.47 - i * 0.13, 2.39 - i * 0.22],
          [s * 3.1, 61.05 - i * 0.25, 1.9 - i * 0.2],
        ],
        [0.22, 0.46, 0.47, 0.07],
        HAIR,
        { radial: 12, samples: 30, groove: 0.09 },
      );
    }
}

/*********************************************
 * 王权器物：海冠、肩扣与三叉戟
 ********************************************/

function sculptRegalia(add, sweep, oval) {
  const bronze = (g) => add(g, BRONZE, "bronze");
  // 海冠为三层有厚度的箍带，珊瑚状棕榈叶沿前额展开。
  for (const [y, r] of [
    [62.44, 0.13],
    [62.7, 0.23],
    [62.97, 0.12],
  ]) {
    const g = new THREE.TorusGeometry(3.06, r, 8, 64);
    g.rotateX(Math.PI / 2);
    g.scale(1, 1, 0.88);
    g.translate(0, y, 0.05);
    bronze(g);
  }
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * 0.06 + (i / 8) * Math.PI * 0.88;
    const h = 1.25 + 1.05 * Math.sin(a) ** 3;
    const blade = carvedBlade(
      [
        [-0.31, 0],
        [-0.47, h * 0.36],
        [-0.3, h * 0.71],
        [0, h],
        [0.3, h * 0.71],
        [0.47, h * 0.36],
        [0.31, 0],
      ],
      0.16,
    );
    blade.rotateZ(-Math.cos(a) * 0.33);
    blade.rotateY(Math.PI / 2 - a);
    blade.translate(Math.cos(a) * 3.07, 62.78, Math.sin(a) * 2.72 + 0.05);
    bronze(blade);
    sweep(
      [
        [Math.cos(a) * 3.08, 62.9, Math.sin(a) * 2.73 + 0.15],
        [Math.cos(a) * 3.12, 63.5, Math.sin(a) * 2.78 + 0.16],
        [Math.cos(a) * 3.12, 62.78 + h * 0.88, Math.sin(a) * 2.78 + 0.16],
      ],
      [0.047, 0.061, 0.012],
      "#c6a76b",
      { radial: 6, samples: 12 },
      "bronze",
    );
  }
  const crest = carvedBlade(
    [
      [-0.4, 0],
      [-0.8, 0.75],
      [-0.51, 1.6],
      [0, 2.95],
      [0.51, 1.6],
      [0.8, 0.75],
      [0.4, 0],
    ],
    0.23,
  );
  crest.translate(0, 62.8, 2.95);
  bronze(crest);
  oval([0, 63.36, 3.2], [0.23, 0.37, 0.1], "#587f88", 0, "bronze");
  const clasp = new THREE.TorusGeometry(0.72, 0.14, 8, 32);
  clasp.translate(5.7, 49.1, 3.39);
  bronze(clasp);
  oval([5.7, 49.1, 3.42], [0.57, 0.57, 0.18], "#8b987e", 0, "bronze");
  for (let i = 0; i < 7; i++) {
    const a = (Math.PI * 2 * i) / 7;
    oval(
      [5.7 + Math.cos(a) * 0.42, 49.1 + Math.sin(a) * 0.42, 3.6],
      [0.13, 0.17, 0.1],
      BRONZE,
      a,
      "bronze",
    );
  }
  // 长戟的套节、螺纹与厚刃均为几何；远景先读取三尖剪影。
  const shaft = new THREE.CylinderGeometry(0.34, 0.47, 72.15, 18, 1);
  shaft.translate(TRIDENT_X, 36.075, TRIDENT_Z);
  bronze(shaft);
  for (const y of [1.1, 2.15, 51.5, 58.7, 60.1, 68.7, 70.5]) {
    const g = new THREE.CylinderGeometry(
      0.6,
      0.58,
      y === 68.7 ? 1.2 : 0.42,
      18,
    );
    g.translate(TRIDENT_X, y, TRIDENT_Z);
    bronze(g);
  }
  for (const baseY of [3, 59.9, 68.1]) {
    const path = [];
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 4;
      path.push([
        TRIDENT_X + Math.cos(a) * 0.49,
        baseY + (i / 28) * 2.3,
        TRIDENT_Z + Math.sin(a) * 0.49,
      ]);
    }
    sweep(
      path,
      new Array(path.length).fill(0.07),
      "#c4a674",
      { radial: 6, samples: 60 },
      "bronze",
    );
  }
  for (const s of [-1, 1]) {
    sweep(
      [
        [TRIDENT_X, 70.7, TRIDENT_Z],
        [TRIDENT_X + s * 1.55, 71.35, TRIDENT_Z],
        [TRIDENT_X + s * 2.95, 73.5, TRIDENT_Z],
        [TRIDENT_X + s * 2.95, 76.7, TRIDENT_Z],
        [TRIDENT_X + s * 2.95, 77.8, TRIDENT_Z],
      ],
      [0.57, 0.56, 0.43, 0.32, 0.23],
      BRONZE,
      { radial: 16, samples: 32 },
      "bronze",
    );
    // 内侧海浪涡卷与戟叉连成实体，保持叉齿之间的空隙。
    sweep(
      [
        [TRIDENT_X + s * 0.28, 71.05, TRIDENT_Z + 0.15],
        [TRIDENT_X + s * 1.24, 72.7, TRIDENT_Z + 0.16],
        [TRIDENT_X + s * 1.92, 73.38, TRIDENT_Z + 0.16],
        [TRIDENT_X + s * 1.98, 72.6, TRIDENT_Z + 0.16],
        [TRIDENT_X + s * 1.44, 72.4, TRIDENT_Z + 0.16],
      ],
      [0.19, 0.22, 0.2, 0.14, 0.06],
      "#b99c66",
      { radial: 10, samples: 26 },
      "bronze",
    );
  }
  const center = new THREE.CylinderGeometry(0.2, 0.42, 7.55, 14);
  center.translate(TRIDENT_X, 74.8, TRIDENT_Z);
  bronze(center);
  for (const s of [-1, 0, 1]) {
    const y = s === 0 ? 78.35363 : 77.35363;
    const blade = carvedBlade(
      [
        [-0.23, 0],
        [-0.6, 0.42],
        [-0.69, 0.77],
        [-0.32, 1.08],
        [0, 3],
        [0.32, 1.08],
        [0.69, 0.77],
        [0.6, 0.42],
        [0.23, 0],
      ],
      0.23,
    );
    blade.translate(TRIDENT_X + s * 2.95, y, TRIDENT_Z);
    bronze(blade);
    sweep(
      [
        [TRIDENT_X + s * 2.95, y + 0.35, TRIDENT_Z + 0.21],
        [TRIDENT_X + s * 2.95, y + 1.08, TRIDENT_Z + 0.25],
        [TRIDENT_X + s * 2.95, y + 2.58, TRIDENT_Z + 0.12],
      ],
      [0.085, 0.07, 0.012],
      "#d0b880",
      { radial: 7, samples: 16 },
      "bronze",
    );
  }
  const jewel = new THREE.OctahedronGeometry(0.57, 1);
  jewel.scale(0.65, 1.5, 0.48);
  jewel.translate(TRIDENT_X, 71.2, TRIDENT_Z + 0.47);
  add(jewel, "#789eb5", "lapisGlow");
}

/*********************************************
 * 大理石表面：一致风化、细脉与低位海藻
 ********************************************/

function finishSurface(geometry, color, material) {
  const position = geometry.attributes.position,
    normal = geometry.attributes.normal;
  const colors = new Float32Array(position.count * 3),
    uvs = new Float32Array(position.count * 2);
  const base = new THREE.Color(color),
    weather = new THREE.Color(material === "bronze" ? "#4d8072" : "#73816a"),
    c = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i),
      y = position.getY(i),
      z = position.getZ(i);
    const cloud = Math.sin(x * 0.43 + z * 0.3) * Math.sin(y * 0.26 + x * 0.12);
    const grain = Math.sin(x * 10.7 + z * 4.5) * Math.sin(y * 9.3 - z * 7.1);
    const vein = Math.exp(
      -((Math.sin(y * 0.7 + x * 0.54 + Math.sin(z * 0.62) * 1.8) / 0.08) ** 2),
    );
    c.copy(base).multiplyScalar(
      0.95 + cloud * 0.045 + grain * 0.016 - vein * 0.025,
    );
    const low = Math.max(0, 1 - y / 23);
    c.lerp(
      weather,
      material === "bronze"
        ? 0.12 + 0.17 * (cloud + 1) * 0.5
        : low * (0.13 + cloud * 0.055),
    );
    if (normal.getY(i) < -0.55) c.multiplyScalar(0.94);
    colors.set([c.r, c.g, c.b], i * 3);
    // 取共享纹理内部的一小块细颗粒，雕塑皮肤不出现建筑砖缝。
    uvs[i * 2] = 0.023 + Math.sin(x * 0.065 + z * 0.036) * 0.01;
    uvs[i * 2 + 1] = 0.031 + Math.sin(y * 0.024) * 0.011;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}
