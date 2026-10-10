import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  sampleSection,
  sculptedFin,
  skinMaterial,
} from "./creature_surface.js";
import { addFeedingMouth, bindPlayerAppendage } from "./player_motion.js";

/**
 * 原创尸鲨：凹陷肌肉伤口、裸露骨架、断鳍和破损颌面；不是完整鲨鱼的换色模型。
 * @param {THREE.Group} root 单位全长根节点，头朝-Z，调用方负责实际成长缩放。
 * @param {Function[]} motions 接收独立角色动作时钟，不移动游戏根节点。
 * @returns {void} 安装共享几何、独立骨架、咬合姿态和可见嘴部锚点。
 */
export function buildZombieShark(root, motions) {
  const torso = new THREE.Group();
  torso.name = "zombie_shark_exposed_skeleton";
  root.add(torso);
  add(torso, "torn_skin", skin, SKIN);
  add(torso, "cartilage_ribs", skeleton, BONE);
  add(torso, "recessed_muscle_lining", muscleLining, MUSCLE);
  add(
    torso,
    "raw_wound_edges",
    () => merge([wounds(), tornMuscleFibers()]),
    FLESH,
  );
  add(torso, "shredded_dorsal_tail", fins, SKIN);
  add(torso, "predatory_brow", brow, SKIN);
  const bones = bindPlayerAppendage(
    torso,
    "zombie_shark_axial",
    [0, 0.12, 0.32],
  );
  // 分裂起点跟随躯干骨架和转弯倾斜；选择面向实际仆从的一侧伤口。
  const splitAnchors = [-1, 1].map((side) => {
    const anchor = new THREE.Object3D();
    anchor.name = `zombie_fission_flank_${side}`;
    anchor.position.set(side * 0.094, 0.005, -0.035);
    bones[0].add(anchor);
    return anchor;
  });
  const left = new THREE.Vector3(),
    right = new THREE.Vector3();
  root.userData.getFissionSource = (out, toward) => {
    splitAnchors[0].getWorldPosition(left);
    splitAnchors[1].getWorldPosition(right);
    return out.copy(
      left.distanceToSquared(toward) < right.distanceToSquared(toward)
        ? left
        : right,
    );
  };
  for (const side of [-1, 1]) {
    const fin = new THREE.Group();
    fin.name = `zombie_shark_pectoral_${side}`;
    fin.position.set(side * 0.082, -0.044, -0.18);
    torso.add(fin);
    add(fin, `torn_pectoral_${side}`, () => pectoral(side), SKIN);
    motions.push((phase, effort, state) => {
      fin.rotation.z =
        side * (-0.16 + Math.sin(phase * 0.55) * 0.07) +
        (state?.turn || 0) * 0.13;
      fin.rotation.y = side * (0.025 + (state?.boost || 0) * 0.13);
    });
  }
  const jaw = new THREE.Group();
  jaw.name = "zombie_shark_broken_mandible";
  jaw.position.set(0, -0.036, -0.245);
  torso.add(jaw);
  add(jaw, "broken_jaw_bone", jawBone, BONE);
  add(jaw, "ragged_gums", () => merge([gum(false), jawTissue()]), FLESH);
  add(jaw, "lower_dentition", () => teeth(false), BONE);
  add(torso, "upper_dentition", () => teeth(true), BONE);
  add(
    torso,
    "sunken_orbit",
    () =>
      merge([
        ellipsoid([-0.073, 0.027, -0.354], [0.013, 0.008, 0.023]),
        ellipsoid([0.073, 0.027, -0.354], [0.013, 0.008, 0.023]),
        ellipsoid([-0.091, 0.025, -0.354], [0.001, 0.0036, 0.002]),
        ellipsoid([0.091, 0.025, -0.354], [0.001, 0.0036, 0.002]),
        ellipsoid([-0.031, 0.004, -0.435], [0.006, 0.003, 0.006]),
        ellipsoid([0.031, 0.004, -0.435], [0.006, 0.003, 0.006]),
      ]),
    CAVITY,
  );
  add(
    torso,
    "narrow_predator_eyes",
    () =>
      merge(
        [-1, 1].map((side) =>
          ellipsoid([side * 0.087, 0.025, -0.354], [0.003, 0.0045, 0.01]),
        ),
      ),
    EYE,
  );
  addFeedingMouth(root, jaw, [0, -0.01, -0.205]);
  root.userData.normalizedLength = 1;
  root.userData.zombieAnatomy = {
    recessedFlankWounds: 2,
    solidMuscleLining: true,
    muscleTears: MUSCLE_TEARS.length,
    ribs: 11,
    tornPectorals: 2,
    damagedRegions: ["skull", "gills", "flanks", "spine", "tail"],
  };
  motions.push((phase, effort, state) => {
    const power =
      0.065 +
      (state?.power || Math.min(1, effort / 3)) * 0.07 +
      (state?.boost || 0) * 0.025;
    bones[1].rotation.y = Math.sin(phase - 0.8) * power * 0.65;
    bones[2].rotation.y = Math.sin(phase - 1.45) * power * 1.65;
    torso.rotation.z = (state?.turn || 0) * -0.11;
    jaw.rotation.x =
      -0.105 - (state?.feed || 0) * 0.27 - Math.sin(phase * 0.55) * 0.014;
    Object.assign(root.userData.pose || {}, {
      tailBeat: bones[2].rotation.y,
      jawOpen: -jaw.rotation.x,
      power,
    });
  });
}

const CACHE = new Map();
const SKIN = skinMaterial({
  vertexColors: true,
  roughness: 0.68,
  clearcoat: 0.04,
  pattern: 0.12,
  side: THREE.DoubleSide,
});
const BONE = skinMaterial({
  color: "#aaa18b",
  roughness: 0.66,
  clearcoat: 0.02,
  pattern: 0.06,
});
const FLESH = skinMaterial({
  color: "#85282d",
  roughness: 0.62,
  clearcoat: 0.12,
  pattern: 0.13,
});
const MUSCLE = skinMaterial({
  vertexColors: true,
  roughness: 0.7,
  clearcoat: 0.08,
  pattern: 0.09,
});
const CAVITY = new THREE.MeshStandardMaterial({
  color: "#181d1b",
  roughness: 0.9,
});
const EYE = new THREE.MeshStandardMaterial({
  color: "#e9a568",
  emissive: "#9e381f",
  emissiveIntensity: 0.28,
  roughness: 0.3,
});
const PROFILE = [
  [-0.48, 0.003, 0.004, 0],
  [-0.435, 0.045, 0.026, 0.008],
  [-0.34, 0.08, 0.063, 0.004],
  [-0.23, 0.102, 0.103, 0],
  [-0.09, 0.117, 0.116, 0],
  [0.09, 0.084, 0.084, 0],
  [0.25, 0.039, 0.048, 0],
  [0.36, 0.013, 0.021, 0],
];
// 在躯体参数面上切出彼此独立的撕裂，边缘与血污共用同一个形状定义。
const SCARS = [
  { z: -0.035, a: -0.08, rz: 0.142, ra: 0.83 },
  { z: 0.008, a: Math.PI + 0.12, rz: 0.118, ra: 0.88 },
  { z: -0.36, a: Math.PI + 0.24, rz: 0.074, ra: 0.66 },
  { z: -0.261, a: -0.25, rz: 0.03, ra: 0.52 },
  { z: 0.128, a: Math.PI / 2, rz: 0.088, ra: 0.42 },
  { z: 0.286, a: Math.PI + 0.14, rz: 0.047, ra: 0.89 },
  { z: 0.315, a: -0.18, rz: 0.032, ra: 0.57 },
  { z: -0.412, a: 1.02, rz: 0.029, ra: 0.43 },
];
function scarDistance(z, angle, scar, index) {
  const da = Math.atan2(Math.sin(angle - scar.a), Math.cos(angle - scar.a));
  const dz = (z - scar.z) / scar.rz;
  const d = Math.hypot(dz, da / scar.ra);
  const ragged =
    1 +
    Math.sin(z * 211 + angle * 13 + index) * 0.17 +
    Math.sin(z * 397 - angle * 21) * 0.08;
  return d / ragged;
}
function wound(z, angle) {
  return SCARS.some((scar, i) => scarDistance(z, angle, scar, i) < 1);
}
function skinPoint(z, angle, offset = 0) {
  const [rx, ry, cy] = sampleSection(PROFILE, z);
  const y = cy + (ry + offset) * Math.sin(angle);
  return [
    (rx + offset) * Math.cos(angle),
    THREE.MathUtils.lerp(
      y,
      Math.max(-0.031 + offset, y),
      1 - THREE.MathUtils.smoothstep(z, -0.265, -0.235),
    ),
    z,
  ];
}
function bloodAmount(z, angle) {
  let amount = 0;
  SCARS.forEach((scar, i) => {
    const d = scarDistance(z, angle, scar, i);
    amount = Math.max(amount, 1 - THREE.MathUtils.smoothstep(d, 0.96, 1.48));
    // 顺水流方向形成不规则拖痕，远离伤口逐渐褪为干涸暗红。
    const da = Math.atan2(Math.sin(angle - scar.a), Math.cos(angle - scar.a));
    const trail = (z - scar.z) / scar.rz;
    if (trail > 0.5 && trail < 2.2) {
      const stripe = Math.abs(da + Math.sin(z * 73 + i) * 0.08);
      amount = Math.max(
        amount,
        (1 - THREE.MathUtils.smoothstep(stripe, 0.05, 0.21)) *
          (1 - THREE.MathUtils.smoothstep(trail, 0.8, 2.2)) *
          0.7,
      );
    }
  });
  return amount;
}
function skin() {
  const rings = 72,
    sides = 48,
    p = [],
    colors = [],
    ix = [];
  const back = new THREE.Color("#394846"),
    belly = new THREE.Color("#a5a694"),
    rot = new THREE.Color("#293230"),
    driedBlood = new THREE.Color("#4e1d23"),
    freshBlood = new THREE.Color("#9c2630"),
    stain = new THREE.Color(),
    shade = new THREE.Color();
  for (let row = 0; row <= rings; row++) {
    const z = THREE.MathUtils.lerp(-0.48, 0.36, row / rings),
      [rx, ry, cy] = sampleSection(PROFILE, z);
    for (let col = 0; col <= sides; col++) {
      const a = (col / sides) * Math.PI * 2,
        s = Math.sin(a),
        c = Math.cos(a);
      const mottling = Math.sin(z * 189 + a * 7) * Math.sin(z * 67 - a * 19);
      const contraction = 1 + mottling * 0.012;
      const opening = 1 - THREE.MathUtils.smoothstep(z, -0.265, -0.235);
      p.push(
        rx * c * contraction,
        THREE.MathUtils.lerp(
          cy + ry * s * contraction,
          Math.max(-0.031, cy + ry * s),
          opening,
        ),
        z,
      );
      shade
        .copy(back)
        .lerp(belly, 1 - THREE.MathUtils.smoothstep(s, -0.6, 0.1))
        .lerp(rot, Math.max(0, mottling) * 0.35);
      const blood = bloodAmount(z, a);
      stain.copy(driedBlood).lerp(freshBlood, blood * 0.8);
      shade.lerp(stain, blood * (0.85 + mottling * 0.12));
      colors.push(shade.r, shade.g, shade.b);
      if (row < rings && col < sides) {
        const centerZ = z + (0.84 / rings) * 0.5,
          centerA = a + Math.PI / sides;
        if (!wound(centerZ, centerA)) {
          const n = row * (sides + 1) + col;
          ix.push(n, n + 1, n + sides + 1, n + 1, n + sides + 2, n + sides + 1);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(ix);
  g.computeVertexNormals();
  return g;
}
// 封闭的肌肉体积位于皮肤内、肋骨后；共享同一轴向蒙皮，伤口凹陷但不会贯通。
// 不规则深裂口切掉表层肌肉体积，底部保留暗色组织，避免穿透整个身体。
const MUSCLE_TEARS = [
  { z: -0.13, a: 0.12, rz: 0.033, ra: 0.39 },
  { z: -0.055, a: -0.28, rz: 0.039, ra: 0.31 },
  { z: 0.024, a: 0.17, rz: 0.029, ra: 0.36 },
  { z: -0.069, a: Math.PI + 0.2, rz: 0.033, ra: 0.4 },
  { z: 0.013, a: Math.PI - 0.29, rz: 0.034, ra: 0.32 },
  { z: 0.092, a: Math.PI + 0.21, rz: 0.028, ra: 0.36 },
  { z: 0.14, a: Math.PI / 2, rz: 0.027, ra: 0.3 },
];
function muscleDamage(z, a) {
  let gouge = 0,
    edge = 0;
  for (const tear of MUSCLE_TEARS) {
    const dz = (z - tear.z) / tear.rz;
    const da = Math.atan2(Math.sin(a - tear.a), Math.cos(a - tear.a)) / tear.ra;
    const d =
      Math.hypot(dz, da) *
      (1 +
        Math.sin(z * 337 + a * 13) * 0.15 +
        Math.sin(a * 23 - z * 191) * 0.09);
    gouge = Math.max(gouge, 1 - THREE.MathUtils.smoothstep(d, 0.48, 1));
    edge = Math.max(edge, Math.max(0, 1 - Math.abs(d - 1) * 5));
  }
  return { gouge, edge };
}
function muscleLining() {
  const rings = 56,
    sides = 32,
    positions = [],
    colors = [],
    indices = [];
  const deep = new THREE.Color("#30151c"),
    raw = new THREE.Color("#94353b"),
    shade = new THREE.Color();
  for (let row = 0; row <= rings; row++) {
    const z = THREE.MathUtils.lerp(-0.48, 0.36, row / rings);
    const [rx, ry, cy] = sampleSection(PROFILE, z);
    const cap = Math.min(1, row / 2, (rings - row) / 2);
    for (let col = 0; col <= sides; col++) {
      const a = (col / sides) * Math.PI * 2;
      // 细长纤维与局部鼓起形成肉层，不用透明材质掩盖裂缝。
      const fiber =
        Math.sin(a * 18 + z * 23) * 0.035 + Math.sin(z * 103 - a * 5) * 0.015;
      const { gouge, edge } = muscleDamage(z, a);
      const inset = (0.77 + fiber - gouge * 0.37 + edge * 0.028) * cap;
      const y = cy + ry * Math.sin(a) * inset;
      const opening = 1 - THREE.MathUtils.smoothstep(z, -0.265, -0.235);
      positions.push(
        rx * Math.cos(a) * inset,
        THREE.MathUtils.lerp(y, Math.max(-0.025, y), opening),
        z,
      );
      shade
        .copy(deep)
        .lerp(
          raw,
          (0.3 + (Math.sin(a * 18 + z * 23) * 0.5 + 0.5) * 0.45) *
            (1 - gouge * 0.9) +
            edge * 0.22,
        );
      colors.push(shade.r, shade.g, shade.b);
      if (row < rings && col < sides) {
        const n = row * (sides + 1) + col;
        // 端点为扇形封口，避免首尾环退化三角形。
        if (row > 0) indices.push(n, n + 1, n + sides + 1);
        if (row < rings - 1) indices.push(n + 1, n + sides + 2, n + sides + 1);
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
function tornMuscleFibers() {
  const parts = [];
  for (const [i, tear] of MUSCLE_TEARS.entries()) {
    for (const offset of [-0.11, 0.1]) {
      const a = tear.a + offset;
      const points = [-0.8, -0.28, 0.3, 0.55].map((t) => {
        const z = tear.z + tear.rz * t;
        const [rx, ry, cy] = sampleSection(PROFILE, z);
        const inset = 0.78 - (t + 0.8) * 0.18;
        return [
          rx * Math.cos(a) * inset,
          cy + ry * Math.sin(a) * inset - 0.003 * (t + 0.8),
          z,
        ];
      });
      // 纤维一端仍附着，另一端缩回深裂口；不跨越整个空隙填成平面。
      parts.push(tube(points, i % 2 ? 0.0018 : 0.0023, 6));
    }
  }
  return merge(parts);
}
function jawTissue() {
  return merge([
    ellipsoid([0, -0.02, -0.105], [0.043, 0.008, 0.087]),
    ellipsoid([0, -0.014, -0.087], [0.016, 0.006, 0.045]),
    ellipsoid([0, -0.006, -0.016], [0.049, 0.027, 0.02]),
  ]);
}
function skeleton() {
  const parts = [
    tube(
      [
        [0, 0.04, -0.27],
        [0, 0.037, -0.1],
        [0, 0.025, 0.12],
        [0, 0.009, 0.35],
      ],
      0.009,
      30,
    ),
  ];
  for (let i = 0; i < 11; i++) {
    const z = -0.195 + i * 0.034,
      [rx, ry] = sampleSection(PROFILE, z);
    for (const side of [-1, 1])
      parts.push(
        tube(
          [
            [0, ry * 0.6, z],
            [side * rx * 0.63, ry * 0.53, z + 0.007],
            [side * rx * 0.91, -ry * 0.13, z + 0.005],
            [side * rx * 0.6, -ry * 0.75, z + 0.003],
            [side * 0.014, -ry * 0.82, z],
          ],
          0.0033,
          16,
        ),
      );
    parts.push(ellipsoid([0, 0.035, z], [0.014, 0.011, 0.01]));
  }
  for (const side of [-1, 1]) {
    parts.push(
      tube(
        [
          [side * 0.019, 0.009, -0.455],
          [side * 0.036, 0.007, -0.409],
          [side * 0.058, -0.007, -0.357],
          [side * 0.071, -0.017, -0.305],
        ],
        0.006,
        16,
      ),
    );
    for (let g = 0; g < 5; g++)
      parts.push(
        tube(
          [
            [side * 0.052, 0.058, -0.255 + g * 0.013],
            [side * 0.09, 0.024, -0.245 + g * 0.013],
            [side * 0.086, -0.04, -0.237 + g * 0.013],
          ],
          0.002,
          10,
        ),
      );
  }
  for (let i = 0; i < 9; i++) {
    const z = 0.058 + i * 0.035;
    const [, ry, cy] = sampleSection(PROFILE, z);
    parts.push(ellipsoid([0, cy + ry * 0.58, z], [0.01, 0.011, 0.009]));
    parts.push(
      tube(
        [
          [0, cy + ry * 0.55, z],
          [0, cy + ry * 0.87, z - 0.003],
        ],
        0.003,
        4,
      ),
    );
  }
  return merge(parts);
}
function wounds() {
  const parts = [gum(true)];
  SCARS.forEach((scar, index) => {
    const edge = [];
    for (let i = 0; i <= 64; i++) {
      const phase = (i / 64) * Math.PI * 2;
      let lo = 0.65,
        hi = 1.4;
      for (let j = 0; j < 12; j++) {
        const r = (lo + hi) / 2;
        const z = scar.z + Math.cos(phase) * scar.rz * r;
        const a = scar.a + Math.sin(phase) * scar.ra * r;
        if (scarDistance(z, a, scar, index) < 1) lo = r;
        else hi = r;
      }
      const z = scar.z + Math.cos(phase) * scar.rz * hi;
      const a = scar.a + Math.sin(phase) * scar.ra * hi;
      edge.push(skinPoint(z, a, 0.0008));
    }
    // 分段的厚薄组织避免整齐镶边；较粗断肌伸向伤口内侧。
    for (let i = 0; i < 8; i++) {
      const start = i * 8;
      parts.push(
        tube(
          edge.slice(start, start + (i % 3 === 0 ? 5 : 8)),
          index < 2 ? 0.0031 : 0.0022,
          8,
        ),
      );
    }
    for (let i = 0; i < 5; i++) {
      const from = edge[5 + i * 11];
      parts.push(
        tube(
          [
            from,
            [from[0] * 0.92, from[1] * 0.87, from[2] + 0.013],
            [from[0] * 0.78, from[1] * 0.73, from[2] + 0.018],
          ],
          0.0026,
          5,
        ),
      );
    }
  });
  return merge(parts);
}
function brow() {
  const parts = [];
  for (const side of [-1, 1]) {
    parts.push(
      tube(
        [
          [side * 0.051, 0.021, -0.397],
          [side * 0.075, 0.034, -0.375],
          [side * 0.083, 0.044, -0.348],
          [side * 0.081, 0.046, -0.323],
        ],
        0.0075,
        14,
      ),
    );
    // 前低后高的眉压住杏形眼窝，颧骨与颌面连成凶狠的锐角。
    parts.push(
      tube(
        [
          [side * 0.068, 0.014, -0.375],
          [side * 0.083, 0.013, -0.347],
          [side * 0.085, -0.019, -0.309],
        ],
        0.006,
        12,
      ),
    );
  }
  return paint(
    merge(parts),
    "#394846",
    (x, y, z) => bloodAmount(z, Math.atan2(y - 0.004, x)) * 0.75,
  );
}
function fins() {
  const dorsal = sculptedFin(
    [
      [-0.063, 0.102],
      [0.014, 0.24],
      [0.027, 0.22],
      [0.04, 0.158],
      [0.05, 0.176],
      [0.059, 0.14],
      [0.084, 0.079],
    ],
    0.01,
    "vertical",
    { smooth: false },
  );
  const caudal = sculptedFin(
    [
      [0.342, -0.013],
      [0.415, -0.12],
      [0.44, -0.14],
      [0.439, -0.082],
      [0.414, -0.022],
      [0.423, 0.032],
      [0.5, 0.174],
      [0.51, 0.197],
      [0.477, 0.165],
      [0.469, 0.112],
      [0.451, 0.119],
      [0.407, 0.089],
      [0.347, 0.016],
    ],
    0.013,
    "vertical",
    { smooth: false },
  );
  return paint(merge([dorsal, caudal]), "#48514b", (x, y, z) => {
    const cut =
      z < 0.2
        ? Math.abs(y - (0.205 - (z - 0.02) * 1.7))
        : Math.min(Math.abs(z - 0.46), Math.abs(y + 0.12));
    return (1 - THREE.MathUtils.smoothstep(cut, 0.005, 0.045)) * 0.95;
  });
}
function pectoral(side) {
  const outline =
    side < 0
      ? [
          [-0.04, 0],
          [-0.036, -0.036],
          [0.016, -0.081],
          [0.045, -0.109],
          [0.037, -0.066],
          [0.055, -0.075],
          [0.064, -0.035],
          [0.056, 0],
        ]
      : [
          [-0.04, 0],
          [-0.035, 0.05],
          [0.062, 0.225],
          [0.08, 0.233],
          [0.063, 0.151],
          [0.072, 0.13],
          [0.061, 0.106],
          [0.074, 0.08],
          [0.061, 0.015],
          [0.055, 0],
        ];
  return paint(
    sculptedFin(outline, 0.012, "horizontal", { smooth: false }),
    "#575f54",
    (x, y, z) =>
      (1 -
        THREE.MathUtils.smoothstep(
          Math.abs(z - (side < 0 ? -0.07 : 0.13)),
          0.012,
          0.08,
        )) *
      0.95,
  );
}
function jawBone() {
  return merge(
    [-1, 1].map((side) =>
      tube(
        [
          [side * 0.062, 0, 0],
          [side * 0.057, -0.018, -0.075],
          [side * 0.035, -0.016, -0.165],
          [0, -0.012, -0.216],
        ],
        0.008,
        20,
      ),
    ),
  );
}
function gum(upper) {
  return merge(
    [-1, 1].map((side) =>
      tube(
        [
          [0, upper ? -0.031 : -0.009, upper ? -0.459 : -0.213],
          [side * 0.032, upper ? -0.031 : -0.013, upper ? -0.406 : -0.162],
          [side * 0.06, upper ? -0.031 : -0.014, upper ? -0.317 : -0.07],
        ],
        0.006,
        16,
      ),
    ),
  );
}
function teeth(upper) {
  const parts = [];
  for (const side of [-1, 1])
    for (let i = 0; i < 12; i++) {
      if ((i + (side > 0 ? 1 : 0)) % 5 === 0) continue;
      const t = i / 12,
        height = 0.012 + Math.sin(t * Math.PI) * 0.011;
      const g = new THREE.ConeGeometry(height * 0.43, height, 4);
      g.scale(1, 1, 0.38);
      if (upper) g.rotateZ(Math.PI);
      g.translate(
        side * (0.007 + 0.06 * Math.sin(t * 1.32)),
        upper ? -0.037 - height * 0.5 : -0.011 + height * 0.5,
        (upper ? -0.453 : -0.208) + t * 0.169,
      );
      parts.push(g);
    }
  return merge(parts);
}
function add(parent, key, make, material) {
  if (!CACHE.has(key)) CACHE.set(key, make());
  const mesh = new THREE.Mesh(CACHE.get(key), material);
  mesh.name = key;
  parent.add(mesh);
  return mesh;
}
function ellipsoid(position, scale) {
  const g = new THREE.SphereGeometry(1, 12, 8);
  g.scale(...scale);
  g.translate(...position);
  return g;
}
function tube(points, radius, segments) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
    segments,
    radius,
    6,
    false,
  );
}
function merge(parts) {
  const ready = parts.map((g) => {
    const p = g.index ? g.toNonIndexed() : g.clone();
    p.deleteAttribute("uv");
    g.dispose();
    return p;
  });
  const g = mergeGeometries(ready);
  ready.forEach((p) => p.dispose());
  return g;
}
function paint(g, color, bloodAt) {
  const c = new THREE.Color(color),
    blood = new THREE.Color("#8e252d"),
    shade = new THREE.Color(),
    p = g.attributes.position,
    colors = [];
  for (let i = 0; i < p.count; i++) {
    const k = 1 + Math.sin(p.getZ(i) * 113 + p.getX(i) * 97) * 0.05;
    shade.copy(c).multiplyScalar(k);
    if (bloodAt)
      shade.lerp(
        blood,
        THREE.MathUtils.clamp(bloodAt(p.getX(i), p.getY(i), p.getZ(i)), 0, 1),
      );
    colors.push(shade.r, shade.g, shade.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return g;
}
