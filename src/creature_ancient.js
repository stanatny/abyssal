import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { ICHTHYOTITAN_ANATOMY } from "./creature_ichthyotitan.js";
import {
  bindAxialMotion,
  sampleSection,
  sculptedFin,
  skinMaterial,
} from "./creature_surface.js";

/** 史前动物采用独立解剖比例，共享资产、独立关节。 */
export const ANCIENT_CREATURE_KINDS = new Set([
  "dunkleosteus",
  "pliosaur",
  "plesiosaur",
  "mosasaur",
  "basilosaurus",
  "megalodon",
  "ichthyotitan",
]);

/**
 * 构建头朝 -Z 的史前动物，并按包含尾鳍的全长归一化。
 * @param {string} kind 已注册的史前动物标识。
 * @param {THREE.Group} root 外部创建的根节点。
 * @param {Function[]} motions 接收累积游泳相位与推进力度的实例动作列表。
 * @returns {void} 模型、独立关节与 normalizedLength 写入给定参数。
 */
export function buildAncientCreature(kind, root, motions) {
  const config = CONFIG[kind];
  if (!config) throw new Error(`Unknown ancient creature: ${kind}`);
  const body = new THREE.Group();
  body.name = `${kind}_anatomy`;
  root.add(body);
  const skin = ancientSkin(kind);
  const torso = mesh(
    body,
    `${kind}_torso`,
    () => loft(config.profile, config),
    skin,
  );
  const swimming = bindAxialMotion(torso, motions, {
    axis: kind === "basilosaurus" ? "x" : "y",
    amplitude: kind === "basilosaurus" ? 0.11 : 0.052,
    frequency: config.frequency || 0.82,
  });
  swimming.name = `${kind}_continuous_body`;
  buildMouth(kind, body, config, motions);
  buildEyes(kind, body, config);
  buildFins(kind, body, swimming, config, motions);
  buildSurfaceDetails(kind, body, config);
  body.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(body);
  const scale = 1 / bounds.getSize(new THREE.Vector3()).z;
  body.scale.setScalar(scale);
  body.position
    .copy(bounds.getCenter(new THREE.Vector3()))
    .multiplyScalar(-scale);
  root.userData.normalizedLength = 1;
  root.userData.ancientAnatomy = kind;
}

const GEOMETRY = new Map();
const MATERIAL = new Map();
const CONFIG = {
  ichthyotitan: ICHTHYOTITAN_ANATOMY,
  dunkleosteus: {
    back: "#706b51",
    belly: "#b2ab82",
    fin: "#777a64",
    iris: "#bf9449",
    armor: true,
    profile: [
      [-0.48, 0.054, 0.041, 0.035],
      [-0.44, 0.114, 0.078, 0.029],
      [-0.34, 0.168, 0.139, 0.023],
      [-0.21, 0.16, 0.151, 0.009],
      [-0.06, 0.134, 0.139, 0],
      [0.12, 0.096, 0.103, -0.003],
      [0.29, 0.041, 0.055, 0],
      [0.38, 0.018, 0.027, 0],
      [0.43, 0.007, 0.014, 0],
    ],
    mouth: {
      front: -0.482,
      hinge: -0.265,
      roof: -0.012,
      gap: 0.062,
      thickness: 0.028,
      teeth: 5,
      tooth: 0.029,
    },
    eye: [-0.362, 0.082, 0.015],
    paddles: [
      [-0.115, 0.117, 0.22, 0.14],
      [0.2, 0.047, 0.085, 0.065],
    ],
    tail: "armored",
    dorsal: true,
  },
  pliosaur: {
    back: "#42615e",
    belly: "#b4b49a",
    fin: "#4d6964",
    iris: "#c7a058",
    profile: [
      [-0.5, 0.026, 0.024, 0.024],
      [-0.46, 0.061, 0.042, 0.032],
      [-0.38, 0.087, 0.062, 0.04],
      [-0.28, 0.117, 0.098, 0.033],
      [-0.18, 0.103, 0.094, 0.011],
      [-0.035, 0.164, 0.138, 0.002],
      [0.13, 0.157, 0.124, 0],
      [0.28, 0.103, 0.087, 0],
      [0.4, 0.044, 0.043, 0],
      [0.5, 0.002, 0.004, 0],
    ],
    mouth: {
      front: -0.495,
      hinge: -0.245,
      roof: 0.003,
      gap: 0.047,
      thickness: 0.021,
      teeth: 12,
      tooth: 0.023,
    },
    eye: [-0.283, 0.065, 0.01],
    paddles: [
      [-0.087, 0.125, 0.265, 0.155],
      [0.223, 0.105, 0.245, 0.125],
    ],
    tail: "point",
  },
  plesiosaur: {
    back: "#466974",
    belly: "#b7c1ad",
    fin: "#597782",
    iris: "#c7a571",
    profile: [
      [-0.54, 0.012, 0.012, 0.107],
      [-0.515, 0.029, 0.022, 0.108],
      [-0.466, 0.032, 0.028, 0.114],
      [-0.42, 0.021, 0.021, 0.118],
      [-0.31, 0.022, 0.022, 0.1],
      [-0.19, 0.025, 0.025, 0.057],
      [-0.065, 0.029, 0.028, 0.015],
      [0.04, 0.041, 0.041, -0.012],
      [0.13, 0.085, 0.069, -0.023],
      [0.24, 0.103, 0.079, -0.024],
      [0.335, 0.072, 0.056, -0.017],
      [0.41, 0.023, 0.025, -0.008],
      [0.48, 0.002, 0.003, 0],
    ],
    mouth: {
      front: -0.538,
      hinge: -0.436,
      roof: 0.104,
      gap: 0.018,
      thickness: 0.008,
      teeth: 9,
      tooth: 0.01,
    },
    eye: [-0.475, 0.127, 0.0065],
    paddles: [
      [0.11, 0.07, 0.229, 0.111],
      [0.302, 0.071, 0.21, 0.1],
    ],
    tail: "point",
    frequency: 0.7,
  },
  mosasaur: {
    back: "#455d48",
    belly: "#b5b394",
    fin: "#596d52",
    iris: "#ba9749",
    scales: true,
    profile: [
      [-0.5, 0.014, 0.019, 0.021],
      [-0.46, 0.033, 0.03, 0.024],
      [-0.365, 0.05, 0.046, 0.029],
      [-0.285, 0.072, 0.064, 0.026],
      [-0.2, 0.07, 0.071, 0.008],
      [-0.07, 0.105, 0.103, 0],
      [0.09, 0.1, 0.094, 0],
      [0.22, 0.057, 0.061, -0.001],
      [0.34, 0.025, 0.043, -0.008],
      [0.405, 0.012, 0.023, -0.022],
    ],
    mouth: {
      front: -0.495,
      hinge: -0.25,
      roof: 0.003,
      gap: 0.033,
      thickness: 0.014,
      teeth: 16,
      tooth: 0.014,
    },
    eye: [-0.302, 0.052, 0.008],
    paddles: [
      [-0.11, 0.083, 0.139, 0.107],
      [0.16, 0.064, 0.118, 0.089],
    ],
    tail: "mosasaur",
  },
  basilosaurus: {
    back: "#566978",
    belly: "#c4c1a8",
    fin: "#677f8a",
    iris: "#a18f66",
    profile: [
      [-0.51, 0.012, 0.013, 0.019],
      [-0.47, 0.03, 0.025, 0.024],
      [-0.39, 0.043, 0.038, 0.032],
      [-0.31, 0.062, 0.067, 0.025],
      [-0.215, 0.061, 0.061, 0.028],
      [-0.1, 0.05, 0.052, 0.017],
      [0.045, 0.041, 0.042, -0.018],
      [0.2, 0.032, 0.033, -0.035],
      [0.34, 0.022, 0.027, -0.019],
      [0.425, 0.013, 0.02, 0.012],
    ],
    mouth: {
      front: -0.507,
      hinge: -0.292,
      roof: 0.003,
      gap: 0.027,
      thickness: 0.014,
      teeth: 11,
      tooth: 0.017,
    },
    eye: [-0.324, 0.043, 0.007],
    paddles: [
      [-0.195, 0.052, 0.105, 0.085],
      [0.25, 0.026, 0.044, 0.028],
    ],
    tail: "whale",
    dorsal: true,
    frequency: 0.72,
  },
  megalodon: {
    back: "#536c7e",
    belly: "#d0d3bf",
    fin: "#627987",
    iris: "#647a80",
    shark: true,
    profile: [
      [-0.49, 0.003, 0.009, 0.019],
      [-0.453, 0.048, 0.04, 0.025],
      [-0.38, 0.095, 0.08, 0.03],
      [-0.27, 0.133, 0.119, 0.012],
      [-0.11, 0.151, 0.144, 0],
      [0.04, 0.135, 0.125, 0],
      [0.19, 0.085, 0.078, 0],
      [0.32, 0.031, 0.032, 0],
      [0.41, 0.011, 0.015, 0],
    ],
    mouth: {
      front: -0.443,
      hinge: -0.247,
      roof: -0.03,
      gap: 0.054,
      thickness: 0.025,
      teeth: 12,
      tooth: 0.025,
    },
    eye: [-0.355, 0.047, 0.009],
    paddles: [
      [-0.11, 0.12, 0.24, 0.165],
      [0.185, 0.061, 0.08, 0.075],
    ],
    tail: "shark",
    dorsal: true,
  },
};

// 上颌直接属于连续躯干，口腔底面从轮廓中压出；下颌独立闭合曲面围住口底。
function loft(profile, config, jaw = false) {
  const positions = [],
    colors = [],
    indices = [];
  const rows = jaw ? 28 : 68,
    segments = 32;
  const top = new THREE.Color(config.back),
    bottom = new THREE.Color(config.belly),
    inside = new THREE.Color("#302d2b"),
    color = new THREE.Color();
  for (let row = 0; row <= rows; row++) {
    const z = THREE.MathUtils.lerp(
      profile[0][0],
      profile.at(-1)[0],
      row / rows,
    );
    const [rx, ry, cy] = sampleSection(profile, z);
    const mouth = config.mouth;
    const open = jaw
      ? 1
      : (1 -
          THREE.MathUtils.smoothstep(
            z,
            mouth.hinge - 0.025,
            mouth.hinge + 0.03,
          )) *
        THREE.MathUtils.smoothstep(z, mouth.front - 0.012, mouth.front + 0.006);
    for (let col = 0; col <= segments; col++) {
      const angle = (col / segments) * Math.PI * 2,
        s = Math.sin(angle),
        c = Math.cos(angle);
      let y = cy + s * ry;
      if (!jaw) y = THREE.MathUtils.lerp(y, Math.max(y, mouth.roof), open);
      const square = config.armor && z < -0.2 ? 0.7 : 1;
      const x = Math.sign(c) * Math.abs(c) ** square * rx;
      positions.push(x, y, z);
      color
        .copy(top)
        .lerp(bottom, 1 - THREE.MathUtils.smoothstep(s, -0.65, 0.15));
      if (jaw) color.copy(bottom).lerp(top, 0.22);
      if ((jaw && s > 0.55) || (!jaw && s < -0.5 && open > 0.75))
        color.lerp(inside, jaw ? 0.89 : 0.96);
      const variation =
        1 + 0.025 * Math.sin(z * 88 + c * 7) * Math.sin(s * 13 + z * 45);
      color.multiplyScalar(variation);
      colors.push(color.r, color.g, color.b);
      if (row < rows && col < segments) {
        const a = row * (segments + 1) + col,
          b = a + segments + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  for (const end of [0, 1]) {
    const row = end ? rows : 0,
      z = profile[end ? profile.length - 1 : 0][0],
      center = positions.length / 3;
    let y = sampleSection(profile, z)[2];
    if (!jaw && z < config.mouth.hinge) y = Math.max(y, config.mouth.roof);
    positions.push(0, y, z);
    colors.push(top.r, top.g, top.b);
    for (let col = 0; col < segments; col++) {
      const a = row * (segments + 1) + col;
      indices.push(center, end ? a : a + 1, end ? a + 1 : a);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildMouth(kind, body, config, motions) {
  const m = config.mouth,
    profile = [];
  const hinge = new THREE.Group();
  hinge.name = `${kind}_jaw`;
  hinge.position.set(0, m.roof, m.hinge);
  body.add(hinge);
  for (let i = 0; i <= 10; i++) {
    const z = THREE.MathUtils.lerp(m.front, m.hinge + 0.025, i / 10);
    const t = i / 10,
      [rx] = sampleSection(config.profile, z);
    const gap = m.gap * (1 - THREE.MathUtils.smoothstep(t, 0.58, 1));
    const thickness = m.thickness * (0.4 + 0.6 * Math.sin(Math.PI * t));
    profile.push([
      z,
      rx * (i === 0 ? 0.62 : i === 10 ? 0.45 : 0.94),
      thickness,
      m.roof - gap - thickness,
    ]);
  }
  mesh(
    hinge,
    `${kind}_mandible`,
    () => loft(profile, config, true).translate(0, -m.roof, -m.hinge),
    ancientSkin(kind),
  );
  const dental = plain(config.armor ? "#c4b78b" : "#ded7b4", 0.47);
  for (const lower of [false, true]) {
    const target = lower ? hinge : body;
    mesh(
      target,
      `${kind}_${lower ? "lower" : "upper"}_dentition`,
      () => {
        const parts = [];
        if (config.armor) {
          for (const side of [-1, 1]) {
            const plate = bitingPlate(config, profile, side, lower);
            if (lower) plate.translate(0, -m.roof, -m.hinge);
            parts.push(plate);
          }
          return combine(parts);
        }
        for (const side of [-1, 1])
          for (let i = 0; i < m.teeth; i++) {
            const t = (i + 0.35) / m.teeth;
            const z = THREE.MathUtils.lerp(m.front + 0.015, m.hinge - 0.012, t);
            const [rx] = sampleSection(config.profile, z);
            const [, , jawCenter] = sampleSection(profile, z),
              [, jawHeight] = sampleSection(profile, z);
            const y = lower ? jawCenter + jawHeight * 0.8 : m.roof - 0.001;
            const size =
              m.tooth *
              (0.65 + 0.35 * Math.sin(Math.PI * t)) *
              (config.armor ? (i % 2 ? 1.35 : 1) : 1);
            const tooth = toothGeometry(
              size,
              config.shark || config.armor,
              lower,
            );
            tooth.translate(side * rx * 0.86, y, z);
            if (lower) tooth.translate(0, -m.roof, -m.hinge);
            parts.push(tooth);
          }
        return combine(parts);
      },
      dental,
    );
  }
  motions.push((phase, effort) => {
    hinge.rotation.x =
      -0.016 - Math.sin(phase * 0.45) * (0.018 + Math.min(effort, 3) * 0.003);
  });
}

function toothGeometry(size, broad, up) {
  // 宽齿有扁平三角冠和独立侧面；爬行动物的圆锥齿向口内微弯。
  const geometry = new THREE.ConeGeometry(
    size * (broad ? 0.48 : 0.22),
    size,
    broad ? 4 : 6,
    1,
  );
  geometry.translate(0, size * 0.5, 0);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setXYZ(
      i,
      p.getX(i) * (broad ? 1.3 : 1),
      y * (up ? 1 : -1),
      p.getZ(i) * (broad ? 0.3 : 1) + ((y * y) / size) * 0.12,
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}

function buildEyes(kind, body, config) {
  const [z, y, r] = config.eye,
    [rx, ry, cy] = sampleSection(config.profile, z);
  const x = config.armor
    ? (rx + 0.005) *
      Math.max(0.1, 1 - Math.abs((y - cy - 0.003) / ry) ** (2 / 0.7)) ** 0.35
    : rx * Math.sqrt(Math.max(0.2, 1 - ((y - cy) / ry) ** 2));
  for (const pupil of [false, true])
    mesh(
      body,
      `${kind}_${pupil ? "pupils" : "eyes"}`,
      () => {
        const parts = [];
        for (const side of [-1, 1]) {
          const sphere = new THREE.SphereGeometry(1, 12, 8);
          sphere.scale(
            r * (pupil ? 0.24 : 0.48),
            r * (pupil ? 0.57 : 1),
            r * (pupil ? 0.65 : 1.12),
          );
          sphere.translate(
            side * (x + r * (pupil ? 0.37 : 0.03)),
            y,
            z - (pupil ? r * 0.08 : 0),
          );
          parts.push(sphere);
        }
        return combine(parts);
      },
      plain(pupil ? "#101b1c" : config.iris, pupil ? 0.19 : 0.36),
    );
}

function buildFins(kind, body, swimming, config, motions) {
  const material = plain(config.fin, 0.47);
  for (let row = 0; row < config.paddles.length; row++)
    for (const side of [-1, 1]) {
      const [z, x, span, chord] = config.paddles[row];
      const group = new THREE.Group();
      group.name = `${kind}_${row ? "rear" : "front"}_flipper_${side}`;
      group.position.set(
        side * x,
        kind === "basilosaurus"
          ? row
            ? -0.06
            : -0.018
          : -(kind === "plesiosaur" ? 0.06 : 0.04),
        z,
      );
      body.add(group);
      const outline = config.shark
        ? [
            [-0.03, -0.018],
            [-0.055, 0.035],
            [chord * 0.35, span * 0.72],
            [chord * 0.75, span],
            [chord * 0.7, span * 0.69],
            [chord * 0.66, 0.035],
            [chord * 0.8, -0.014],
          ]
        : [
            [-0.025, -0.025],
            [-chord * 0.25, 0.025],
            [-chord * 0.08, span * 0.48],
            [chord * 0.35, span * 0.9],
            [chord * 0.62, span],
            [chord * 0.83, span * 0.86],
            [chord * 0.72, span * 0.59],
            [chord * 0.55, 0.045],
            [chord * 0.55, -0.025],
          ];
      const fin = mesh(
        group,
        `${kind}_paddle_${row}_${side}`,
        () => {
          const geometry = sculptedFin(
            outline,
            row ? 0.017 : 0.022,
            "horizontal",
            { detail: 1, camber: 0.002 },
          );
          // 镜像必须反转三角面序，避免单侧鳍在背面消失。
          if (side < 0) mirrorX(geometry);
          return geometry;
        },
        material,
      );
      fin.userData.keepSeparate = true;
      motions.push((phase, effort) => {
        group.rotation.z =
          side *
          (-0.12 +
            Math.sin(phase * 0.82 - row * 0.9) *
              (0.075 + Math.min(effort, 3) * 0.012));
        group.rotation.y =
          side * (0.035 + Math.cos(phase * 0.82 - row * 0.9) * 0.055);
      });
    }
  if (config.dorsal) {
    const outline =
      kind === "megalodon"
        ? [
            [-0.1, 0.11],
            [-0.025, 0.25],
            [0.014, 0.283],
            [0.048, 0.169],
            [0.115, 0.11],
          ]
        : kind === "basilosaurus"
          ? [
              [0.11, 0.006],
              [0.174, 0.041],
              [0.21, 0.027],
              [0.255, -0.006],
            ]
          : [
              [-0.025, 0.117],
              [0.045, 0.2],
              [0.091, 0.203],
              [0.2, 0.064],
            ];
    mesh(
      body,
      `${kind}_dorsal`,
      () =>
        sculptedFin(outline, 0.016, "vertical", { detail: 1, camber: 0.002 }),
      material,
    );
  }
  if (config.tail === "point") return;
  const z = config.profile.at(-1)[0] - 0.018,
    y = config.profile.at(-1)[3] || 0;
  const tail = new THREE.Group();
  tail.name = `${kind}_tail`;
  // 尾鳍直接随末节骨骼移动，与连续尾柄共享姿态，不产生裂口。
  swimming.skeleton.bones[2].add(tail);
  tail.position.set(0, y, z - 0.25);
  const outline =
    config.tail === "whale"
      ? [
          [-0.016, 0],
          [0.012, 0.07],
          [0.052, 0.145],
          [0.085, 0.156],
          [0.071, 0.085],
          [0.067, 0.023],
          [0.046, 0],
          [0.067, -0.023],
          [0.071, -0.085],
          [0.085, -0.156],
          [0.052, -0.145],
          [0.012, -0.07],
        ]
      : config.tail === "shark"
        ? [
            [-0.018, -0.012],
            [0.085, -0.159],
            [0.111, -0.185],
            [0.1, -0.09],
            [0.06, -0.015],
            [0.071, 0.025],
            [0.174, 0.2],
            [0.161, 0.237],
            [0.062, 0.124],
            [-0.018, 0.019],
          ]
        : config.tail === "ichthyosaur"
          ? [
              [-0.018, -0.006],
              [0.025, -0.077],
              [0.102, -0.174],
              [0.151, -0.207],
              [0.149, -0.161],
              [0.108, -0.06],
              [0.061, -0.015],
              [0.11, 0.078],
              [0.128, 0.139],
              [0.102, 0.123],
              [0.031, 0.055],
              [-0.018, 0.011],
            ]
          : config.tail === "mosasaur"
            ? [
                [-0.016, -0.007],
                [0.09, -0.15],
                [0.124, -0.17],
                [0.114, -0.065],
                [0.057, -0.012],
                [0.09, 0.071],
                [0.084, 0.125],
                [0.032, 0.071],
                [-0.016, 0.011],
              ]
            : [
                [-0.016, -0.02],
                [0.09, -0.102],
                [0.14, -0.112],
                [0.119, -0.025],
                [0.177, 0.087],
                [0.152, 0.142],
                [0.078, 0.106],
                [-0.016, 0.019],
              ];
  mesh(
    tail,
    `${kind}_caudal`,
    () =>
      sculptedFin(
        outline,
        0.014,
        config.tail === "whale" ? "horizontal" : "vertical",
        { detail: 1, camber: 0.002 },
      ),
    material,
  );
  motions.push((phase) => {
    tail.rotation[config.tail === "whale" ? "x" : "y"] =
      Math.sin(phase * (config.frequency || 0.82) - 1.6) * 0.09;
  });
}

function buildSurfaceDetails(kind, body, config) {
  if (config.armor) {
    mesh(
      body,
      `${kind}_cranial_shield`,
      () => armorGeometry(config),
      armorMaterial(),
    );
  }
  mesh(
    body,
    `${kind}_anatomical_grooves`,
    () => {
      const parts = [];
      if (config.shark) {
        // 五对鳃裂沿真实体侧弧线排布，瘢痕只刻在皮肤表面。
        for (const side of [-1, 1])
          for (let i = 0; i < 5; i++) {
            const z = -0.239 + i * 0.02;
            const points = [0.07, 0.038, 0, -0.039, -0.067].map((y) =>
              surfacePoint(config, z + (y < 0 ? 0.005 : 0), y, side, 0.001),
            );
            parts.push(tube(points, 0.0019));
          }
      }
      if (config.armor) {
        const [eyeZ, eyeY, r] = config.eye,
          [rx, ry, cy] = sampleSection(config.profile, eyeZ);
        const eyeX =
          (rx + 0.005) *
          Math.max(0.1, 1 - Math.abs((eyeY - cy - 0.003) / ry) ** (2 / 0.7)) **
            0.35;
        for (const side of [-1, 1])
          parts.push(
            ellipsoid(
              [side * (eyeX - 0.001), eyeY, eyeZ],
              [0.005, r * 1.35, r * 1.48],
            ),
          );
        // 骨甲片遵循头部曲面，保持后方柔软躯干，不堆叠浮空甲块。

        for (const side of [-1, 1]) {
          for (const z of [-0.405, -0.325, -0.232]) {
            const points = [];
            for (let i = 0; i <= 10; i++) {
              const a = 0.12 + (i / 10) * 1.31;
              const [rx, ry, cy] = sampleSection(config.profile, z);
              points.push([
                side * Math.cos(a) ** 0.7 * (rx + 0.0025),
                cy + Math.sin(a) ** 0.7 * ry + 0.0015,
                z,
              ]);
            }
            parts.push(tube(points, 0.0022));
          }
        }
      }
      if (!config.shark && !config.armor) {
        for (const side of [-1, 1]) {
          const z = config.mouth.front + 0.032;
          const [rx, ry, cy] = sampleSection(config.profile, z);
          parts.push(
            ellipsoid(
              [side * rx * 0.58, cy + ry * 0.84, z],
              [0.002, 0.0016, 0.005],
            ),
          );
        }
      }
      return combine(parts);
    },
    plain("#263c39", 0.62),
  );
  if (config.shark) {
    mesh(
      body,
      `${kind}_healed_scars`,
      () => {
        const scars = [];
        for (const side of [-1, 1])
          for (let i = 0; i < 3; i++) {
            const points = [];
            for (let j = 0; j < 6; j++) {
              const z = -0.071 + i * 0.026 + j * 0.008,
                y = 0.081 - j * 0.012;
              points.push(surfacePoint(config, z, y, side, 0.0007));
            }
            scars.push(tube(points, 0.0014));
          }
        return combine(scars);
      },
      plain("#adb6a7", 0.64),
    );
  }
}

function armorGeometry(config) {
  const positions = [],
    colors = [],
    indices = [];
  const bone = new THREE.Color("#9c9571"),
    weathered = new THREE.Color("#73735b"),
    color = new THREE.Color();
  // 九块曲面骨板沿真实头形错缝拼接，薄暗缝与磨损边缘显示厚度。
  for (const [start, end] of [
    [-0.44, -0.369],
    [-0.367, -0.284],
    [-0.282, -0.196],
  ]) {
    for (const [from, to] of [
      [0.055, 0.9],
      [0.918, 2.223],
      [2.241, 3.086],
    ]) {
      const base = positions.length / 3,
        rows = 10,
        cols = 10;
      for (let i = 0; i <= rows; i++)
        for (let j = 0; j <= cols; j++) {
          const a = THREE.MathUtils.lerp(from, to, j / cols),
            c = Math.cos(a),
            sn = Math.sin(a);
          const z =
            THREE.MathUtils.lerp(start, end, i / rows) +
            0.01 * Math.sin(a * 2.2) * Math.sin((Math.PI * i) / rows);
          const [rx, ry, cy] = sampleSection(config.profile, z);
          const edge = Math.min(i / rows, 1 - i / rows, j / cols, 1 - j / cols);
          const relief =
            0.0015 + 0.0035 * THREE.MathUtils.smoothstep(edge, 0, 0.12);
          positions.push(
            Math.sign(c) * Math.abs(c) ** 0.7 * (rx + relief),
            cy + sn ** 0.7 * ry + relief,
            z,
          );
          const mottling =
            0.2 +
            0.14 * Math.sin(z * 139 + sn * 24) * Math.sin(c * 59 + z * 71);
          color.copy(bone).lerp(weathered, mottling + (edge < 0.08 ? 0.23 : 0));
          colors.push(color.r, color.g, color.b);
          if (i < rows && j < cols) {
            const n = base + i * (cols + 1) + j,
              b = n + cols + 1;
            indices.push(n, n + 1, b, n + 1, b + 1, b);
          }
        }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
function armorMaterial() {
  const key = "ancient_cranial_bone";
  if (!MATERIAL.has(key))
    MATERIAL.set(
      key,
      skinMaterial({
        vertexColors: true,
        roughness: 0.66,
        clearcoat: 0.04,
        pattern: 0.14,
      }),
    );
  return MATERIAL.get(key);
}
function bitingPlate(config, jawProfile, side, lower) {
  const positions = [],
    indices = [],
    m = config.mouth;
  const cuts = [
    [0, 0.009],
    [0.14, 0.042],
    [0.25, 0.014],
    [0.52, 0.018],
    [0.8, 0.016],
    [1, 0.004],
  ];
  for (const [t, depth] of cuts) {
    const z = THREE.MathUtils.lerp(m.front + 0.012, m.hinge - 0.009, t),
      [rx] = sampleSection(config.profile, z);
    const [, ry, cy] = sampleSection(jawProfile, z);
    const base = lower ? cy + ry * 0.72 : m.roof + 0.003,
      edge = base + depth * (lower ? 1 : -1),
      x = side * rx * 0.85;
    positions.push(
      x - 0.006,
      base,
      z,
      x + 0.006,
      base,
      z,
      x + 0.001,
      edge,
      z,
      x - 0.001,
      edge,
      z,
    );
  }
  for (let i = 0; i < cuts.length - 1; i++)
    for (let j = 0; j < 4; j++) {
      const a = i * 4 + j,
        b = i * 4 + ((j + 1) % 4);
      indices.push(a, b, a + 4, b, b + 4, a + 4);
    }
  indices.push(0, 2, 1, 0, 3, 2);
  const end = (cuts.length - 1) * 4;
  indices.push(end, end + 1, end + 2, end, end + 2, end + 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(
    lower
      ? indices
      : indices.flatMap((_, i) =>
          i % 3 ? [] : [indices[i], indices[i + 2], indices[i + 1]],
        ),
  );
  geometry.computeVertexNormals();
  return geometry;
}
function surfacePoint(config, z, y, side, offset) {
  const [rx, ry, cy] = sampleSection(config.profile, z);
  return [
    side * (rx * Math.sqrt(Math.max(0.03, 1 - ((y - cy) / ry) ** 2)) + offset),
    y,
    z,
  ];
}
function ancientSkin(kind) {
  if (!MATERIAL.has(kind)) {
    const material = skinMaterial({
      vertexColors: true,
      roughness: 0.46,
      pattern: 0.045,
    });
    const compile = material.onBeforeCompile;
    material.onBeforeCompile = (shader) => {
      compile(shader);
      const pattern =
        CONFIG[kind].scales || kind === "pliosaur" || kind === "plesiosaur"
          ? `
        vec2 tile = vSkinPosition.zy * vec2(115.0, 135.0);
        tile.x += mod(floor(tile.y), 2.0) * 0.5;
        float seam = smoothstep(0.35, 0.49, length(fract(tile)-0.5));
        float bars = 0.5 + 0.5 * sin(vSkinPosition.z * 57.0 + sin(vSkinPosition.y * 43.0));
        float upper = smoothstep(-0.03, 0.055, vSkinPosition.y);
        diffuseColor.rgb *= 1.0 - seam * 0.12 - bars * upper * 0.09;
        roughnessFactor += seam * 0.05;`
          : `
        float flecks = sin(vSkinPosition.z * 173.0 + sin(vSkinPosition.y * 129.0)) * sin(vSkinPosition.x * 211.0);
        diffuseColor.rgb *= 1.0 + flecks * 0.025;`;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <metalnessmap_fragment>",
        `${pattern}\n#include <metalnessmap_fragment>`,
      );
    };
    material.customProgramCacheKey = () => `ancient_skin_${kind}_1`;
    MATERIAL.set(kind, material);
  }
  return MATERIAL.get(kind);
}
function plain(color, roughness) {
  const key = `${color}_${roughness}`;
  if (!MATERIAL.has(key))
    MATERIAL.set(key, skinMaterial({ color, roughness, pattern: 0.008 }));
  return MATERIAL.get(key);
}
function mesh(parent, key, make, material) {
  if (!GEOMETRY.has(key)) GEOMETRY.set(key, make());
  const mesh = new THREE.Mesh(GEOMETRY.get(key), material);
  mesh.name = key;
  parent.add(mesh);
  return mesh;
}
function combine(parts) {
  const prepared = parts.map((part) => {
    const geometry = part.index ? part.toNonIndexed() : part.clone();
    geometry.deleteAttribute("uv");
    part.dispose();
    return geometry;
  });
  const merged = mergeGeometries(prepared);
  prepared.forEach((geometry) => geometry.dispose());
  return merged;
}
function tube(points, radius) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(
      points.map((point) => new THREE.Vector3(...point)),
    ),
    Math.max(8, points.length * 2),
    radius,
    4,
    false,
  );
}
function ellipsoid(position, scale) {
  const geometry = new THREE.SphereGeometry(1, 10, 6);
  geometry.scale(...scale);
  geometry.translate(...position);
  return geometry;
}
function mirrorX(geometry) {
  geometry.scale(-1, 1, 1);
  const index = geometry.index;
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    index.setX(i, index.getX(i + 2));
    index.setX(i + 2, a);
  }
  geometry.computeVertexNormals();
  return geometry;
}
