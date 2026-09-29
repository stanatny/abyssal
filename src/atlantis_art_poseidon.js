import * as THREE from "three";
import {
  loftGeometry,
  tubeGeometry,
  paintStone,
} from "./atlantis_art_geometry.js";

const TRIDENT_X = -9.6;
const TRIDENT_Z = 0.9;
const MARBLE = "#c4c6b8";
let SCULPTURE_PARTS = null;

/**
 * 构建面向 +Z 的波塞冬巨像：脚底为原点，冠顶约 61m，戟顶 81.5m。
 * @param {object} bucket 城市几何合并桶。
 * @param {object} origin 脚底城市坐标 {x, y, z}。
 * @returns {object} 城市碰撞体、障碍物与头部和三叉戟锚点。
 */
export function buildPoseidon(bucket, origin) {
  // 缓存保持模型局部坐标；MergeBucket 克隆后平移，禁止释放共享原件。
  if (!SCULPTURE_PARTS) SCULPTURE_PARTS = sculptPoseidon();
  for (const { geometry, material } of SCULPTURE_PARTS) {
    bucket.add(geometry, material, {
      position: [origin.x, origin.y, origin.z],
    });
  }
  const at = (p) => ({
    x: p[0] + origin.x,
    y: p[1] + origin.y,
    z: p[2] + origin.z,
  });
  return {
    colliders: [
      {
        type: "capsule",
        kind: "poseidon_robe",
        a: at([0, 0.5, 0.3]),
        b: at([0.4, 30, 0.4]),
        radius: 7.2,
      },
      {
        type: "capsule",
        kind: "poseidon_torso",
        a: at([0.3, 29, 0.3]),
        b: at([0, 51, 0.2]),
        radius: 6.2,
      },
      {
        type: "capsule",
        kind: "poseidon_head",
        a: at([0, 51.5, 0.3]),
        b: at([0, 59.5, 0.2]),
        radius: 3.3,
      },
      {
        type: "capsule",
        kind: "poseidon_arm_right",
        a: at([-6.1, 48.5, 0.3]),
        b: at([TRIDENT_X, 63.5, TRIDENT_Z]),
        radius: 1.9,
      },
      {
        type: "capsule",
        kind: "poseidon_arm_left",
        a: at([6.2, 48.3, 0.5]),
        b: at([10.2, 39, 9.3]),
        radius: 1.8,
      },
      {
        type: "capsule",
        kind: "poseidon_trident",
        a: at([TRIDENT_X, 4, TRIDENT_Z]),
        b: at([TRIDENT_X, 72, TRIDENT_Z]),
        radius: 1,
      },
      {
        type: "box",
        kind: "poseidon_prongs",
        x: TRIDENT_X + origin.x,
        y: 76 + origin.y,
        z: TRIDENT_Z + origin.z,
        halfSize: { x: 4.4, y: 5.4, z: 1.2 },
      },
    ],
    obstacles: [
      {
        kind: "poseidon_torso",
        x: origin.x,
        y: origin.y + 38,
        z: origin.z,
        radius: 9.5,
      },
    ],
    tridentTip: new THREE.Vector3(
      TRIDENT_X + origin.x,
      81.5 + origin.y,
      TRIDENT_Z + origin.z,
    ),
    headCenter: new THREE.Vector3(origin.x, 55.6 + origin.y, 0.4 + origin.z),
    height: 82,
  };
}

/*********************************************
 * 雕刻：连续截面与局部浮雕，不使用球形关节
 ********************************************/

function sculptPoseidon() {
  const parts = [];
  let seed = 10;
  const add = (geometry, color = MARBLE, material = "marble") => {
    paintStone(geometry, {
      base: color,
      algae: material === "bronze" ? "#4a897a" : "#577365",
      seed: seed++,
      algaeAmount: material === "marble" ? 0.18 : 0.33,
      algaeTop: 12,
      darkenDown: 0.92,
    });
    // 独石雕刻不沿皮肤铺砌砖缝；保留共享纹理的小片细颗粒和顶点风化。
    if (material === "marble") {
      const p = geometry.attributes.position;
      const c = geometry.attributes.color;
      const marbleColor = new THREE.Color(color);
      const algaeColor = new THREE.Color("#627f70");
      const vertexColor = new THREE.Color();
      const uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i);
        const weather =
          Math.sin(x * 0.43 + z * 0.32) * Math.sin(y * 0.24 + x * 0.15);
        const vein = Math.sin(y * 1.3 + x * 0.5 + Math.sin(z * 0.6)) ** 18;
        vertexColor
          .copy(marbleColor)
          .multiplyScalar(0.92 + weather * 0.06 - vein * 0.04);
        vertexColor.lerp(
          algaeColor,
          Math.max(0, 1 - y / 22) * (0.12 + weather * 0.08),
        );
        c.setXYZ(i, vertexColor.r, vertexColor.g, vertexColor.b);
        uv[i * 2] =
          0.023 + Math.sin(p.getX(i) * 0.07 + p.getZ(i) * 0.03) * 0.012;
        uv[i * 2 + 1] = 0.032 + Math.sin(p.getY(i) * 0.02) * 0.015;
      }
      geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    }
    parts.push({ geometry, material });
    return geometry;
  };
  const loft = (sections, options = {}) =>
    loftGeometry(null, sections, {
      radial: 64,
      subdivision: 2,
      capStart: true,
      capEnd: true,
      ...options,
    });
  const tube = (points, radii, options = {}) =>
    tubeGeometry(null, points, radii, { radial: 12, samples: 28, ...options });
  const relief = (points, radii, color = MARBLE, options = {}) =>
    add(tube(points, radii, options), color);
  const oval = (
    position,
    scale,
    color = MARBLE,
    material = "marble",
    rotation = 0,
  ) => {
    const g = new THREE.SphereGeometry(1, 20, 14);
    g.scale(...scale);
    g.rotateZ(rotation);
    g.translate(...position);
    return add(g, color, material);
  };

  // 下身采用不对称承重姿态，右膝前顶。褶谷连续落至石台，侧面无圆筒轮廓。
  const robe = loft(
    [
      { y: 0.4, rx: 6.9, rz: 5.5, wave: 15, waveAmp: 0.12 },
      { y: 3, rx: 6.8, rz: 5.4, wave: 15, waveAmp: 0.12 },
      {
        y: 10,
        rx: 5.9,
        rz: 4.5,
        cx: 0.45,
        wave: 15,
        waveAmp: 0.15,
        wavePhase: 0.25,
      },
      {
        y: 18,
        rx: 5.1,
        rz: 4.0,
        cx: 0.7,
        cz: 0.4,
        wave: 15,
        waveAmp: 0.11,
        wavePhase: 0.5,
      },
      {
        y: 26,
        rx: 4.8,
        rz: 3.7,
        cx: 0.3,
        wave: 15,
        waveAmp: 0.065,
        wavePhase: 0.9,
      },
      {
        y: 30.8,
        rx: 4.9,
        rz: 3.5,
        cx: 0.3,
        wave: 15,
        waveAmp: 0.06,
        wavePhase: 1.1,
      },
      { y: 32.0, rx: 4.4, rz: 3.1, cx: 0.3, wave: 15, waveAmp: 0.03 },
    ],
    { radial: 90, subdivision: 1.2 },
  );
  const rp = robe.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i),
      y = rp.getY(i),
      z = rp.getZ(i);
    if (z > 0) rp.setZ(i, z + gaussian(x, 2.2, 2) * gaussian(y, 18, 6) * 1.1);
  }
  robe.computeVertexNormals();
  add(robe, "#b7bcae");
  // 腰间层叠布料的弧线从高侧汇入左髋，体现布料重量而非环形腰带。
  for (let i = 0; i < 6; i++) {
    relief(
      [
        [-4.6, 31.7 - i * 0.65, 1.4],
        [-3.2, 29.6 - i, 3.3],
        [0, 28 - i * 1.15, 4.1],
        [3.8, 29.5 - i * 0.7, 2.8],
        [4.8, 32.3 - i * 0.45, 0.3],
      ],
      [0.1, 0.21, 0.24, 0.2, 0.06],
      "#bec1b2",
    );
  }
  for (let i = 0; i < 7; i++) {
    const x = -4.5 + i * 1.5;
    relief(
      [
        [x * 0.7, 26 - (i % 3), 3.55],
        [x * 0.85, 18, 4 + (i % 2) * 0.4],
        [x * 1.15, 8, 4.9],
        [x * 1.24, 1, 5.25],
      ],
      [0.14, 0.3, 0.28, 0.13],
      "#bfc3b6",
    );
  }

  // 躯干轮廓在胸廓处展开、腰部收紧，胸腹浮雕直接变形同一表面。
  const torso = loft([
    { y: 29.4, rx: 4.55, rz: 3.15, cx: 0.3 },
    { y: 34.0, rx: 4.0, rz: 2.85, cx: 0.2 },
    { y: 38, rx: 4.55, rz: 3.1 },
    { y: 42.0, rx: 5.7, rz: 3.4 },
    { y: 46, rx: 6.6, rz: 3.4 },
    { y: 48.5, rx: 6.8, rz: 2.9 },
    { y: 49.6, rx: 5.4, rz: 2.5 },
    { y: 51.3, rx: 2.55, rz: 2.05, cz: -0.15 },
    { y: 53.2, rx: 2.0, rz: 1.9, cz: -0.1 },
  ]);
  const tp = torso.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i),
      y = tp.getY(i),
      z = tp.getZ(i);
    const front = Math.max(0, z / 3.4);
    let sculpt = 1.15 * gaussian(Math.abs(x), 2.9, 1.8) * gaussian(y, 46, 1.9);
    sculpt -= 0.45 * gaussian(x, 0, 0.4) * gaussian(y, 44, 4);
    sculpt -= 0.3 * gaussian(y, 43.2, 0.35) * gaussian(Math.abs(x), 2.5, 2.2);
    for (const ay of [35.2, 38.1, 40.9])
      sculpt +=
        0.54 * gaussian(Math.abs(x), 1.25, 0.95) * gaussian(y, ay, 0.95);
    sculpt -= 0.18 * gaussian(x, 0, 0.22) * gaussian(y, 38, 5);
    sculpt += 0.45 * gaussian(Math.abs(x), 3.5, 0.9) * gaussian(y, 38.5, 4);
    sculpt +=
      0.22 *
      gaussian(Math.abs(x), 2.9, 2.0) *
      gaussian(y, 49.0 - Math.abs(x) * 0.035, 0.18);
    tp.setZ(i, z + sculpt * front ** 2);
  }
  torso.computeVertexNormals();
  add(torso);
  // 连续变径上臂包含三角肌、肱二头肌、肘骨和前臂，不额外拼球。
  add(
    tube(
      [
        [-3.9, 47.9, 0],
        [-5.9, 48.6, 0],
        [-7.4, 49.9, -1.0],
        [-9.2, 53.2, -2.2],
        [-12.1, 57.0, -1.3],
        [-12.15, 58.7, -0.75],
        [-11.1, 60.4, -0.1],
        [-9.8, 62.3, 0.8],
      ],
      [2.0, 2.55, 2.3, 1.85, 1.34, 1.32, 1.35, 0.8],
      { radial: 24, samples: 48 },
    ),
  );
  add(
    tube(
      [
        [3.9, 47.9, 0.05],
        [5.9, 47.9, 0.15],
        [7.45, 46.6, 0.7],
        [8.9, 44.2, 1.8],
        [9.7, 42.2, 3.3],
        [10.35, 41.3, 5.1],
        [10.3, 40.0, 7.25],
        [10.2, 39.5, 8.6],
      ],
      [2.0, 2.5, 2.25, 1.9, 1.25, 1.45, 1.03, 0.7],
      { radial: 24, samples: 48 },
    ),
  );
  // 手掌与指骨沿握持方向塑形；四指绕过戟杆，拇指反向锁住。
  oval([-9.85, 63.05, 0.23], [1.13, 1.7, 0.66]);
  for (let i = 0; i < 4; i++) {
    const y = 61.95 + i * 0.73;
    relief(
      [
        [-10.48, y, 0.4],
        [-10.43, y + 0.08, 1.35],
        [-9.65, y + 0.03, 1.85],
        [-9.0, y - 0.1, 1.36],
        [-9.1, y - 0.12, 0.9],
      ],
      [0.33, 0.34, 0.32, 0.28, 0.09],
      MARBLE,
      { samples: 18 },
    );
  }
  relief(
    [
      [-10.6, 64.0, 0.45],
      [-10.6, 64.6, 1.2],
      [-9.95, 64.6, 1.7],
      [-9.25, 63.9, 1.65],
    ],
    [0.48, 0.43, 0.36, 0.08],
  );
  oval([10.15, 39.3, 9.25], [1.12, 0.55, 1.45]);
  for (let i = 0; i < 4; i++) {
    const x = 9.25 + i * 0.59,
      length = [1.4, 2, 2.1, 1.6][i];
    relief(
      [
        [x, 39.25, 9.7],
        [x + 0.02, 39.0, 10.7],
        [x - 0.1, 38.4, 10.7 + length * 0.6],
        [x - 0.1, 37.9, 10.4 + length * 0.55],
      ],
      [0.29, 0.27, 0.22, 0.05],
      MARBLE,
      { samples: 15 },
    );
  }
  relief(
    [
      [9.25, 39.2, 9.1],
      [8.55, 38.85, 9.7],
      [8.4, 38.3, 10.35],
    ],
    [0.4, 0.33, 0.05],
  );

  // 头颅前表面直接雕出眉骨、眼窝、颧骨与口鼻部，侧面保留希腊式直鼻轮廓。
  const head = loft(
    [
      { y: 51.3, rx: 1.7, rz: 1.8, cz: 0.45 },
      { y: 52.6, rx: 2.3, rz: 2.2, cz: 0.4 },
      { y: 54, rx: 2.65, rz: 2.5, cz: 0.35 },
      { y: 55.6, rx: 2.65, rz: 2.6, cz: 0.25 },
      { y: 57.4, rx: 2.65, rz: 2.55, cz: 0.1 },
      { y: 59, rx: 2.35, rz: 2.15 },
      { y: 59.9, rx: 0.8, rz: 0.8 },
      { y: 60.05, rx: 0.04, rz: 0.04 },
    ],
    { radial: 72, subdivision: 5 },
  );
  const hp = head.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i),
      y = hp.getY(i),
      z = hp.getZ(i);
    if (z < 0.5) continue;
    let s = 0.5 * gaussian(Math.abs(x), 1.2, 0.8) * gaussian(y, 56.4, 0.32);
    s -= 0.4 * gaussian(Math.abs(x), 1.2, 0.62) * gaussian(y, 55.85, 0.4);
    s += 0.46 * gaussian(Math.abs(x), 1.75, 0.65) * gaussian(y, 54.9, 0.65);
    s += 0.7 * gaussian(x, 0, 0.42) * gaussian(y, 55.6, 1.2);
    s += 0.5 * gaussian(x, 0, 0.55) * gaussian(y, 54.8, 0.37);
    hp.setZ(i, z + s * Math.min(1, z / 2.1));
  }
  head.computeVertexNormals();
  add(head);
  // 鼻梁楔形保持垂直，鼻翼嵌入颊面。
  add(
    loft(
      [
        { y: 54.55, rx: 0.44, rz: 0.24, cz: 3.65 },
        { y: 54.9, rx: 0.5, rz: 0.45, cz: 3.45 },
        { y: 55.6, rx: 0.32, rz: 0.35, cz: 3.22 },
        { y: 56.6, rx: 0.24, rz: 0.1, cz: 3.02 },
      ],
      { radial: 12, subdivision: 7 },
    ),
  );
  for (const s of [-1, 1]) {
    oval([s * 2.64, 55.05, 0.35], [0.39, 0.9, 0.53]);
    oval([s * 0.42, 54.65, 3.36], [0.38, 0.24, 0.39]);
    // 狭长眼睑包住内嵌的青金眼，避免两个发光圆球。
    relief(
      [
        [s * 0.57, 55.87, 2.94],
        [s * 1.12, 56.03, 2.97],
        [s * 1.78, 55.88, 2.59],
      ],
      [0.09, 0.16, 0.04],
    );
    relief(
      [
        [s * 0.57, 55.77, 2.93],
        [s * 1.13, 55.6, 2.96],
        [s * 1.78, 55.88, 2.58],
      ],
      [0.06, 0.13, 0.035],
    );
    oval(
      [s * 1.14, 55.81, 2.94],
      [0.29, 0.085, 0.065],
      "#7793b1",
      "lapisGlow",
      s * -0.09,
    );
  }
  // 下颌须体与卷须组成尖底轮廓，须纹顺着下巴分流至胸口。
  add(
    loft(
      [
        { y: 48.1, rx: 0.75, rz: 0.7, cz: 2.5 },
        { y: 49.5, rx: 1.55, rz: 1.0, cz: 2.4 },
        { y: 51.3, rx: 2.4, rz: 1.4, cz: 2.0 },
        { y: 53.35, rx: 2.6, rz: 1.55, cz: 1.45 },
        { y: 54.35, rx: 2.35, rz: 1.35, cz: 1.2 },
      ],
      { radial: 44, subdivision: 2 },
    ),
    "#aeb6a8",
  );
  for (let i = 0; i < 13; i++) {
    const a = -1.3 + (i / 12) * 2.6,
      x = Math.sin(a) * 2.37,
      z = 1.5 + Math.cos(a) * 1.65;
    const endY = 48.2 + Math.abs(x) * 0.85;
    relief(
      [
        [x, 53.65, z],
        [x * 1.06, 52.4, z + 0.42],
        [x * 0.88 + 0.2, 50.7, z + 0.25],
        [x * 0.65 - 0.14, endY + 0.6, 3.48],
        [x * 0.55 + 0.1, endY, 3.1],
      ],
      [0.2, 0.34, 0.32, 0.27, 0.025],
      "#b6beaf",
      { radial: 9, samples: 25 },
    );
  }
  for (const s of [-1, 1]) {
    relief(
      [
        [0, 54.3, 3.5],
        [s * 0.7, 54.2, 3.7],
        [s * 1.55, 53.8, 3.3],
        [s * 2.0, 52.9, 2.9],
      ],
      [0.25, 0.36, 0.32, 0.02],
      "#b0b9aa",
    );
    for (let i = 0; i < 3; i++)
      relief(
        [
          [s * 0.1, 54.4 - i * 0.14, 3.6],
          [s * 0.8, 54.2 - i * 0.15, 3.83],
          [s * 1.65, 53.5 - i * 0.12, 3.25],
        ],
        [0.06, 0.095, 0.025],
        "#c0c6b7",
      );
  }
  relief(
    [
      [-0.7, 53.5, 3.56],
      [0, 53.42, 3.73],
      [0.7, 53.5, 3.56],
    ],
    [0.05, 0.15, 0.05],
  );

  // 发绺以头皮为根向两侧和后颈卷落，前额保持敞开。
  for (let i = 0; i < 19; i++) {
    const a = -0.15 + (i / 18) * (Math.PI + 0.3),
      x = Math.cos(a),
      z = -Math.sin(a);
    relief(
      [
        [x * 0.55, 59.95, z * 0.7],
        [x * 2.3, 59.2, z * 2.15],
        [x * 2.85, 57.6, z * 2.75],
        [x * 2.97, 55.1, z * 2.65],
        [x * 2.65 + Math.sin(i) * 0.2, 52.6 + Math.sin(i) * 0.4, z * 2.45],
      ],
      [0.2, 0.45, 0.47, 0.42, 0.08],
      "#aeb7a8",
      { radial: 9, samples: 28 },
    );
  }
  for (const s of [-1, 1])
    for (let i = 0; i < 4; i++)
      relief(
        [
          [s * 0.15, 59.45 + i * 0.06, 1.6 - i * 0.4],
          [s * 1.25, 59.2, 2.3 - i * 0.27],
          [s * 2.35, 58.2, 1.8 - i * 0.28],
          [s * 2.65, 57.2 - i * 0.18, 1.3 - i * 0.3],
        ],
        [0.17, 0.39, 0.34, 0.06],
        "#b6bdaf",
        { samples: 20 },
      );

  // 披肩为宽扁绸面而非绳索，沿背部落下；胸前保留肌肉与胡须轮廓。
  const mantle = loft(
    [
      { y: 14, rx: 1.4, rz: 0.85, cx: 4.3, cz: -3.4, wave: 6, waveAmp: 0.22 },
      { y: 28, rx: 2.0, rz: 1.2, cx: 4.6, cz: -3.1, wave: 6, waveAmp: 0.23 },
      { y: 39, rx: 2.1, rz: 1.2, cx: 5.1, cz: -2.4, wave: 6, waveAmp: 0.2 },
      { y: 46.5, rx: 2.4, rz: 2.0, cx: 5.2, cz: -0.9, wave: 6, waveAmp: 0.11 },
      { y: 49.2, rx: 1.8, rz: 1.65, cx: 5.1, cz: 0.0, wave: 6, waveAmp: 0.08 },
    ],
    { radial: 42, subdivision: 1.0 },
  );
  add(mantle, "#b1b7aa");
  for (let i = 0; i < 3; i++)
    relief(
      [
        [6.4 - i * 0.52, 49.2, 0.1],
        [5.8 - i * 0.55, 46.7, 2.8],
        [4.8 - i * 0.6, 44.9, 3.45],
        [4.6 - i * 0.55, 41.7, 3.0],
      ],
      [0.14, 0.27, 0.3, 0.07],
      "#b5bdaf",
    );

  // 双足保留足背、脚趾和分开的支撑点。
  for (const s of [-1, 1]) {
    oval([s * 2.3, 0.65, 5.7], [1.15, 0.65, 2.05]);
    for (let i = 0; i < 5; i++)
      oval(
        [s * 2.3 + (i - 2) * 0.4, 0.38, 7.4 - i * 0.12],
        [0.24, 0.3, 0.55 - i * 0.04],
      );
  }

  // 古铜海冠与三叉戟：厚重叶片、弧形戟叉和清晰的三尖轮廓。
  const bronze = "#c0a36b";
  const band = new THREE.TorusGeometry(2.62, 0.16, 8, 48);
  band.rotateX(Math.PI / 2);
  band.scale(1, 1, 0.86);
  band.translate(0, 58.6, 0.2);
  add(band, bronze, "bronze");
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * 0.05 + (i / 8) * Math.PI * 1.1;
    const leaf = new THREE.SphereGeometry(1, 10, 8);
    leaf.scale(0.24, 0.9, 0.11);
    leaf.rotateZ(-Math.cos(a) * 0.55);
    leaf.rotateY(-a + Math.PI / 2);
    leaf.translate(Math.cos(a) * 2.63, 59.2, 0.2 + Math.sin(a) * 2.3);
    add(leaf, bronze, "bronze");
  }
  const shaft = new THREE.CylinderGeometry(0.36, 0.46, 70.4, 14);
  shaft.translate(TRIDENT_X, 37.2, TRIDENT_Z);
  add(shaft, bronze, "bronze");
  for (const y of [5, 59.8, 66, 70.6, 72]) {
    const cuff = new THREE.CylinderGeometry(0.57, 0.57, 0.5, 14);
    cuff.translate(TRIDENT_X, y, TRIDENT_Z);
    add(cuff, bronze, "bronze");
  }
  for (const s of [-1, 1])
    add(
      tube(
        [
          [TRIDENT_X, 70.8, TRIDENT_Z],
          [TRIDENT_X + s * 2.2, 71.7, TRIDENT_Z],
          [TRIDENT_X + s * 3.8, 73.5, TRIDENT_Z],
          [TRIDENT_X + s * 3.7, 76.8, TRIDENT_Z],
          [TRIDENT_X + s * 3.25, 78.6, TRIDENT_Z],
        ],
        [0.52, 0.56, 0.46, 0.34, 0.24],
        { radial: 12, samples: 30 },
      ),
      bronze,
      "bronze",
    );
  add(
    tube(
      [
        [TRIDENT_X, 70.7, TRIDENT_Z],
        [TRIDENT_X, 75, TRIDENT_Z],
        [TRIDENT_X, 79.1, TRIDENT_Z],
      ],
      [0.5, 0.43, 0.25],
      { radial: 12, samples: 16 },
    ),
    bronze,
    "bronze",
  );
  for (const s of [-1, 0, 1]) {
    const blade = loft(
      [
        { y: 0, rx: 0.25, rz: 0.2 },
        { y: 0.65, rx: 0.75, rz: 0.25 },
        { y: 1.05, rx: 0.46, rz: 0.22 },
        { y: 2.4, rx: 0.01, rz: 0.01 },
      ],
      { radial: 8, subdivision: 4 },
    );
    blade.translate(TRIDENT_X + s * 3.25, s === 0 ? 79.1 : 78.1, TRIDENT_Z);
    add(blade, bronze, "bronze");
    const inlay = new THREE.OctahedronGeometry(0.35);
    inlay.scale(0.6, 1.9, 0.15);
    inlay.translate(TRIDENT_X + s * 3.25, s === 0 ? 80 : 79, TRIDENT_Z + 0.25);
    add(inlay, "#8ac8e0", "lapisGlow");
  }
  return parts;
}

function gaussian(value, center, width) {
  return Math.exp(-(((value - center) / width) ** 2));
}
