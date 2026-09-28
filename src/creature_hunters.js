import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  bindAxialMotion,
  sampleSection,
  sculptedFin,
  skinMaterial,
} from "./creature_surface.js";

/** 现代海洋霸主的独立解剖模型，不包含可选乌贼角色。 */
export const HUNTER_CREATURE_KINDS = new Set([
  "angler",
  "hammerhead",
  "shark",
  "octopus",
  "sperm_whale",
]);

/**
 * 创建头朝 -Z、纵长为一且包围盒居中的现代海洋动物。
 * @param {string} kind 已注册的现代猎手类型。
 * @param {THREE.Group} root 调用方负责世界缩放与最终合批的空根节点。
 * @param {Function[]} motions 接收游泳相位及推进力度的独立动作列表。
 * @returns {void} 向根节点添加共享资源模型及 normalizedLength 标记。
 */
export function buildHunterCreature(kind, root, motions) {
  if (!HUNTER_CREATURE_KINDS.has(kind))
    throw new Error(`Unknown hunter creature: ${kind}`);
  const body = new THREE.Group();
  body.name = `${kind}_hunter_anatomy`;
  root.add(body);
  if (kind === "octopus") buildOctopus(body, motions);
  else if (kind === "angler") buildAngler(body, motions);
  else buildSwimmer(kind, body, motions);
  body.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(body);
  const scale = 1 / bounds.getSize(new THREE.Vector3()).z;
  body.scale.setScalar(scale);
  body.position
    .copy(bounds.getCenter(new THREE.Vector3()))
    .multiplyScalar(-scale);
  root.userData.normalizedLength = 1;
  root.userData.hunterAnatomy = kind;
}

const GEOMETRIES = new Map();
const SURFACE = skinMaterial({
  vertexColors: true,
  roughness: 0.44,
  pattern: 0.065,
});
const DARK = skinMaterial({
  color: "#101819",
  roughness: 0.24,
  pattern: 0.006,
});
const TEETH = skinMaterial({ color: "#dcd5b9", roughness: 0.4 });
const GLOW = new THREE.MeshStandardMaterial({
  color: "#b8efc6",
  emissive: "#75d3b0",
  emissiveIntensity: 1.35,
  roughness: 0.26,
});
const ANGLER_SKIN = skinMaterial({
  vertexColors: true,
  roughness: 0.69,
  clearcoat: 0.035,
  pattern: 0.21,
});
const CONFIG = {
  shark: {
    back: "#667781",
    belly: "#e4e2cf",
    fin: "#73828a",
    roof: -0.031,
    hinge: -0.22,
    front: -0.473,
    gap: 0.023,
    eye: [0.079, 0.025, -0.343, 0.0105],
    profile: [
      [-0.49, 0.004, 0.007, -0.004],
      [-0.444, 0.036, 0.034, 0.008],
      [-0.35, 0.078, 0.073, 0.009],
      [-0.24, 0.103, 0.109, 0.008],
      [-0.09, 0.12, 0.117, 0],
      [0.08, 0.092, 0.093, 0],
      [0.24, 0.049, 0.057, 0],
      [0.36, 0.019, 0.026, 0],
      [0.405, 0.012, 0.018, 0],
    ],
  },
  hammerhead: {
    back: "#707e78",
    belly: "#d6d5bb",
    fin: "#7a8780",
    roof: -0.016,
    hinge: -0.287,
    front: -0.431,
    gap: 0.014,
    eye: [0.219, 0.004, -0.407, 0.009],
    profile: [
      [-0.441, 0.023, 0.014, 0],
      [-0.399, 0.065, 0.039, 0.006],
      [-0.31, 0.065, 0.056, 0.004],
      [-0.19, 0.081, 0.078, 0],
      [0, 0.078, 0.076, 0],
      [0.19, 0.044, 0.048, 0],
      [0.33, 0.018, 0.025, 0],
      [0.39, 0.009, 0.018, 0],
    ],
  },
  sperm_whale: {
    back: "#535e63",
    belly: "#89918c",
    fin: "#687477",
    roof: -0.084,
    hinge: -0.125,
    front: -0.472,
    gap: 0.01,
    eye: [0.114, -0.048, -0.175, 0.0075],
    profile: [
      [-0.493, 0.078, 0.081, 0.008],
      [-0.477, 0.105, 0.109, 0.012],
      [-0.397, 0.118, 0.13, 0.014],
      [-0.25, 0.12, 0.131, 0.012],
      [-0.1, 0.107, 0.116, 0.005],
      [0.08, 0.083, 0.089, -0.007],
      [0.23, 0.047, 0.062, -0.012],
      [0.36, 0.019, 0.029, -0.011],
      [0.413, 0.012, 0.018, -0.009],
    ],
  },
};

function buildSwimmer(kind, body, motions) {
  const c = CONFIG[kind],
    whale = kind === "sperm_whale";
  const torso = add(
    body,
    `${kind}_torso`,
    () => loft(c.profile, c, { square: whale ? 0.53 : 1, cut: true }),
    SURFACE,
  );
  const swimming = bindAxialMotion(torso, motions, {
    axis: whale ? "x" : "y",
    amplitude: whale ? 0.063 : 0.075,
    frequency: whale ? 0.68 : 0.98,
  });
  swimming.name = `${kind}_continuous_body`;
  if (kind === "hammerhead") {
    add(
      body,
      "hammerhead_cephalofoil",
      () => {
        // 头锤为一个有厚度的连续横向翼体，眼睛位于远端外侧。
        const profile = [
          [-0.22, 0.012, 0.012],
          [-0.21, 0.033, 0.023],
          [-0.15, 0.033, 0.025],
          [-0.075, 0.027, 0.03],
          [0, 0.038, 0.034],
          [0.075, 0.027, 0.03],
          [0.15, 0.033, 0.025],
          [0.21, 0.033, 0.023],
          [0.22, 0.012, 0.012],
        ];
        const g = loft(profile, c, { rings: 64, sides: 20 });
        g.rotateY(Math.PI / 2);
        g.translate(0, 0, -0.407);
        return g;
      },
      SURFACE,
    );
  }
  eyes(body, kind, c.eye, whale ? "#887e63" : "#a7a291");
  const jaw = new THREE.Group();
  jaw.name = `${kind}_jaw`;
  jaw.position.set(0, c.roof, c.hinge);
  body.add(jaw);
  add(
    jaw,
    `${kind}_mandible`,
    () => {
      const profile = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12,
          z = THREE.MathUtils.lerp(c.front, c.hinge + 0.025, t),
          [rx] = sampleSection(c.profile, z);
        profile.push([
          z,
          whale
            ? (0.011 + 0.022 * t) * Math.sin(0.2 + Math.PI * t * 0.8)
            : rx * 0.91,
          whale ? 0.009 : 0.013,
          c.roof - c.gap * (1 - THREE.MathUtils.smoothstep(t, 0.55, 1)) - 0.009,
        ]);
      }
      return loft(profile, c, { jaw: true, rings: 28, sides: 24 }).translate(
        0,
        -c.roof,
        -c.hinge,
      );
    },
    SURFACE,
  );
  add(
    jaw,
    `${kind}_lower_teeth`,
    () => dentition(kind, true).translate(0, -c.roof, -c.hinge),
    TEETH,
  );
  if (!whale)
    add(body, `${kind}_upper_teeth`, () => dentition(kind, false), TEETH);
  motions.push((t, e) => {
    jaw.rotation.x =
      -0.01 - Math.sin(t * 0.43) * (0.013 + Math.min(e, 3) * 0.003);
  });
  add(body, `${kind}_skin_grooves`, () => swimmerDetails(kind), DARK);
  fins(kind, body, swimming, motions);
}

function loft(profile, c, options = {}) {
  const rings = options.rings || 56,
    sides = options.sides || 36,
    positions = [],
    colors = [],
    indices = [];
  const top = new THREE.Color(c.back),
    bottom = new THREE.Color(c.belly),
    shade = new THREE.Color(),
    inside = new THREE.Color("#352b2e");
  for (let row = 0; row <= rings; row++) {
    const z = THREE.MathUtils.lerp(
        profile[0][0],
        profile.at(-1)[0],
        row / rings,
      ),
      [rx, ry, cy] = sampleSection(profile, z);
    for (let col = 0; col <= sides; col++) {
      const a = (col / sides) * Math.PI * 2,
        s = Math.sin(a),
        cos = Math.cos(a),
        power = THREE.MathUtils.lerp(
          options.square || 1,
          1,
          THREE.MathUtils.smoothstep(z, -0.2, 0.1),
        );
      const x = Math.sign(cos) * Math.abs(cos) ** power * rx;
      let y = cy + Math.sign(s) * Math.abs(s) ** power * ry;
      const opening = options.cut
        ? 1 - THREE.MathUtils.smoothstep(z, c.hinge - 0.015, c.hinge + 0.035)
        : 0;
      if (options.cut)
        y = THREE.MathUtils.lerp(y, Math.max(y, c.roof), opening);
      // 抹香鲸后躯的细褶直接进入轮廓；不以外挂粗条伪装皮肤。
      const crease =
        options.square && z > -0.12
          ? 1 +
            Math.sin(z * 250 + s * 8) *
              0.009 *
              Math.sin((row / rings) * Math.PI)
          : 1;
      positions.push(x * crease, y * crease, z);
      shade
        .copy(top)
        .lerp(bottom, 1 - THREE.MathUtils.smoothstep(s, -0.45, 0.08));
      if (options.jaw) shade.copy(bottom).lerp(top, 0.15);
      if ((options.jaw && s > 0.45) || (opening > 0.85 && s < -0.4))
        shade.lerp(inside, 0.96);
      shade.multiplyScalar(
        1 + 0.025 * Math.sin(z * 127 + cos * 17) * Math.sin(s * 31 - z * 67),
      );
      colors.push(shade.r, shade.g, shade.b);
      if (row < rings && col < sides) {
        const n = row * (sides + 1) + col;
        indices.push(
          n,
          n + 1,
          n + sides + 1,
          n + 1,
          n + sides + 2,
          n + sides + 1,
        );
      }
    }
  }
  for (const end of [0, 1]) {
    const row = end ? rings : 0,
      z = profile[end ? profile.length - 1 : 0][0],
      n = positions.length / 3;
    let y = sampleSection(profile, z)[2];
    if (options.cut && z < c.hinge) y = Math.max(y, c.roof);
    positions.push(0, y, z);
    colors.push(top.r, top.g, top.b);
    for (let col = 0; col < sides; col++) {
      const p = row * (sides + 1) + col;
      indices.push(n, end ? p : p + 1, end ? p + 1 : p);
    }
  }
  return geometry(positions, indices, colors);
}

function dentition(kind, lower) {
  const c = CONFIG[kind],
    whale = kind === "sperm_whale",
    parts = [],
    count = whale ? 17 : kind === "shark" ? 12 : 11;
  for (const side of [-1, 1])
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count,
        z = THREE.MathUtils.lerp(c.front + 0.025, c.hinge - 0.015, t),
        [rx] = sampleSection(c.profile, z);
      const size =
        (whale ? 0.009 : kind === "shark" ? 0.014 : 0.007) *
        (0.75 + Math.sin(t * Math.PI) * 0.25);
      const g = tooth(size, lower, kind === "shark");
      g.translate(
        side * (whale ? 0.012 + 0.012 * t : rx * 0.82),
        c.roof -
          (lower
            ? c.gap * (1 - THREE.MathUtils.smoothstep(t, 0.55, 1)) + 0.001
            : 0),
        z,
      );
      parts.push(g);
    }
  return merge(parts);
}

function fins(kind, body, swimming, motions) {
  const c = CONFIG[kind],
    whale = kind === "sperm_whale",
    hammer = kind === "hammerhead";
  for (const side of [-1, 1]) {
    const joint = new THREE.Group();
    joint.name = `${kind}_pectoral_${side}`;
    joint.position.set(
      side * (whale ? 0.088 : hammer ? 0.069 : 0.092),
      whale ? -0.065 : -0.055,
      whale ? -0.1 : -0.16,
    );
    body.add(joint);
    add(
      joint,
      `${kind}_pectoral_mesh_${side}`,
      () => {
        const outline = whale
          ? [
              [-0.035, -0.018],
              [-0.04, 0.025],
              [0.008, 0.105],
              [0.06, 0.131],
              [0.085, 0.1],
              [0.067, 0.028],
              [0.051, -0.018],
            ]
          : [
              [-0.04, -0.016],
              [-0.033, 0.04],
              [0.063, hammer ? 0.2 : 0.225],
              [0.102, hammer ? 0.22 : 0.243],
              [0.085, 0.13],
              [0.055, 0.017],
              [0.064, -0.015],
            ];
        const g = paint(
          sculptedFin(outline, 0.018, "horizontal", {
            detail: 1,
            camber: 0.003,
          }),
          c.fin,
          c.belly,
        );
        return side < 0 ? mirror(g) : g;
      },
      SURFACE,
    );
    motions.push((t, e) => {
      joint.rotation.z =
        side * (-0.18 + Math.sin(t * 0.8) * (0.045 + Math.min(e, 3) * 0.009));
      joint.rotation.y = side * Math.cos(t * 0.8) * 0.025;
    });
  }
  add(
    body,
    `${kind}_dorsal_fins`,
    () => {
      const outlines = whale
        ? [
            [
              [0.07, 0.072],
              [0.17, 0.095],
              [0.205, 0.075],
              [0.24, 0.05],
            ],
            [
              [0.22, 0.045],
              [0.255, 0.056],
              [0.277, 0.035],
            ],
            [
              [0.28, 0.028],
              [0.302, 0.035],
              [0.327, 0.022],
            ],
          ]
        : [
            [
              [-0.06, hammer ? 0.07 : 0.108],
              [0.004, hammer ? 0.256 : 0.24],
              [0.042, hammer ? 0.266 : 0.255],
              [0.049, 0.13],
              [0.105, hammer ? 0.058 : 0.081],
            ],
            [
              [0.205, 0.04],
              [0.245, 0.085],
              [0.27, 0.032],
            ],
          ];
      const parts = outlines.map((o) =>
        paint(sculptedFin(o, 0.012, "vertical", { detail: 1 }), c.fin),
      );
      if (!whale)
        for (const side of [-1, 1]) {
          const g = paint(
            sculptedFin(
              [
                [0.07, -0.02],
                [0.113, 0.072],
                [0.157, 0.065],
                [0.16, -0.016],
              ],
              0.01,
              "horizontal",
              { detail: 1 },
            ),
            c.fin,
            c.belly,
          );
          if (side < 0) mirror(g);
          g.translate(side * 0.04, -0.052, 0);
          parts.push(g);
        }
      return merge(parts);
    },
    SURFACE,
  );
  const tail = new THREE.Group();
  tail.name = `${kind}_tail`;
  swimming.skeleton.bones[2].add(tail);
  tail.position.set(0, whale ? -0.009 : 0, c.profile.at(-1)[0] - 0.265);
  add(
    tail,
    `${kind}_caudal`,
    () => {
      const outline = whale
        ? [
            [-0.014, 0],
            [0.015, 0.066],
            [0.055, 0.163],
            [0.095, 0.193],
            [0.098, 0.148],
            [0.068, 0.043],
            [0.052, 0],
            [0.068, -0.043],
            [0.098, -0.148],
            [0.095, -0.193],
            [0.055, -0.163],
            [0.015, -0.066],
          ]
        : [
            [-0.018, -0.012],
            [0.095, -0.15],
            [0.126, -0.17],
            [0.12, -0.108],
            [0.069, -0.018],
            [0.072, 0.021],
            [0.185, hammer ? 0.234 : 0.198],
            [0.17, hammer ? 0.252 : 0.22],
            [0.075, 0.126],
            [-0.018, 0.018],
          ];
      return paint(
        sculptedFin(outline, 0.016, whale ? "horizontal" : "vertical", {
          detail: 1,
          camber: 0.001,
        }),
        c.fin,
        c.belly,
      );
    },
    SURFACE,
  );
  motions.push((t) => {
    tail.rotation[whale ? "x" : "y"] =
      Math.sin(t * (whale ? 0.68 : 0.98) - 1.5) * 0.09;
  });
}

function swimmerDetails(kind) {
  const c = CONFIG[kind],
    parts = [];
  if (kind !== "sperm_whale")
    for (const side of [-1, 1])
      for (let i = 0; i < 5; i++) {
        const z = (kind === "hammerhead" ? -0.257 : -0.246) + i * 0.015;
        const points = [0.052, 0.025, 0, -0.027, -0.046].map((y) => {
          const [rx, ry, cy] = sampleSection(c.profile, z);
          return [
            side *
              (rx * Math.sqrt(Math.max(0.05, 1 - ((y - cy) / ry) ** 2)) +
                0.001),
            y,
            z + (y < 0 ? 0.005 : 0),
          ];
        });
        parts.push(tube(points, 0.0015));
      }
  if (kind === "sperm_whale") {
    parts.push(blob([-0.026, 0.126, -0.447], [0.015, 0.0018, 0.008]));
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const z = -0.355 + i * 0.021;
        parts.push(
          tube(
            [
              [side * 0.116, 0.035, z],
              [side * 0.119, 0.016, z + 0.01],
              [side * 0.116, -0.006, z + 0.026],
            ],
            0.0007,
          ),
        );
      }
  }
  if (kind === "hammerhead")
    for (const side of [-1, 1])
      parts.push(blob([side * 0.176, -0.014, -0.434], [0.014, 0.003, 0.003]));
  else if (kind === "shark")
    for (const side of [-1, 1])
      parts.push(blob([side * 0.033, -0.004, -0.439], [0.01, 0.0028, 0.004]));
  return merge(parts);
}

function buildAngler(body, motions) {
  const c = { back: "#68523e", belly: "#aa8661" };
  // 外壳首圈就是口唇；口腔沿同一开口深入头颅，不以黑色贴片遮盖椭球。
  add(
    body,
    "angler_open_body",
    () => {
      const exterior = loft(
        [
          [-0.405, 0.185, 0.115, -0.018],
          [-0.3, 0.224, 0.202, -0.024],
          [-0.17, 0.236, 0.229, -0.037],
          [-0.045, 0.198, 0.201, -0.04],
          [0.1, 0.097, 0.107, -0.021],
          [0.26, 0.029, 0.043, -0.007],
          [0.36, 0.012, 0.02, -0.007],
        ],
        c,
        { rings: 48, sides: 40 },
      );
      // 去掉朝向口部的盖片，使口腔真正连通。
      const index = Array.from(exterior.index.array);
      index.splice(48 * 40 * 6, 40 * 3);
      exterior.setIndex(index);
      sculptAnglerSurface(exterior, false);
      const cavity = loft(
        [
          [-0.405, 0.185, 0.115, -0.018],
          [-0.34, 0.143, 0.099, -0.016],
          [-0.27, 0.09, 0.072, -0.005],
          [-0.19, 0.025, 0.029, 0.004],
          [-0.17, 0.001, 0.001, 0],
        ],
        { back: "#291b20", belly: "#4b2e30" },
        { rings: 24, sides: 40 },
      );
      const insideIndex = Array.from(cavity.index.array);
      insideIndex.splice(24 * 40 * 6, 40 * 3);
      cavity.setIndex(insideIndex);
      sculptAnglerSurface(cavity, true);
      reverse(cavity);
      // 上颌窄、下颌厚而前突；两条口缘在后收的嘴角相接，不能形成吸盘圆环。
      const lips = [];
      for (const lower of [false, true]) {
        const curve = new THREE.CatmullRomCurve3(
          Array.from({ length: 25 }, (_, i) =>
            anglerMouthPoint((lower ? Math.PI : 0) + (i / 24) * Math.PI),
          ),
        );
        const lip = new THREE.TubeGeometry(curve, 32, 1, 8, false),
          p = lip.attributes.position;
        for (let ring = 0; ring <= 32; ring++) {
          const t = ring / 32,
            center = curve.getPointAt(t),
            radius =
              (lower ? 0.009 : 0.0045) +
              Math.sin(t * Math.PI) * (lower ? 0.009 : 0.002);
          for (let side = 0; side <= 8; side++) {
            const n = ring * 9 + side;
            p.setXYZ(
              n,
              center.x + (p.getX(n) - center.x) * radius,
              center.y + (p.getY(n) - center.y) * radius,
              center.z + (p.getZ(n) - center.z) * radius,
            );
          }
        }
        lip.computeVertexNormals();
        paint(lip, lower ? "#a18462" : "#897152");
        lips.push(lip);
      }
      return merge([exterior, cavity, ...lips]);
    },
    ANGLER_SKIN,
  );
  add(
    body,
    "angler_lip_dentition",
    () => {
      const parts = [];
      for (const lower of [false, true])
        for (let i = 0; i < 17; i++) {
          const a = (lower ? Math.PI : 0) + (0.14 + (i / 16) * 0.72) * Math.PI,
            size =
              (lower ? 0.063 : 0.058) * (0.64 + 0.36 * Math.sin(i * 3.7) ** 2),
            g = tooth(size, true, false);
          const direction = new THREE.Vector3(
            -Math.cos(a) * 0.13,
            lower ? 1 : -1,
            0.28,
          ).normalize();
          g.applyQuaternion(
            new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              direction,
            ),
          );
          const point = anglerMouthPoint(a);
          g.translate(
            point.x * 0.98,
            point.y + (lower ? 0.004 : -0.003),
            point.z + 0.002,
          );
          parts.push(g);
        }
      return merge(parts);
    },
    TEETH,
  );
  eyes(body, "angler", [0.174, 0.119, -0.276, 0.019], "#b09d73");
  add(
    body,
    "angler_skin_folds",
    () => {
      const parts = [];
      for (const side of [-1, 1]) {
        parts.push(
          tube(
            [
              [side * 0.189, 0.085, -0.31],
              [side * 0.208, 0.065, -0.24],
              [side * 0.23, 0.012, -0.17],
            ],
            0.002,
          ),
        );
        parts.push(
          tube(
            [
              [side * 0.226, -0.085, -0.2],
              [side * 0.201, -0.143, -0.12],
              [side * 0.162, -0.14, -0.03],
            ],
            0.0025,
          ),
        );
      }
      return merge(parts);
    },
    DARK,
  );
  const lure = new THREE.Group();
  lure.name = "angler_illicium";
  body.add(lure);
  add(
    lure,
    "angler_lure_stalk",
    () =>
      paint(
        tube(
          [
            [0, 0.184, -0.215],
            [0, 0.327, -0.27],
            [0, 0.38, -0.375],
            [0, 0.349, -0.47],
            [0, 0.287, -0.49],
          ],
          0.004,
          32,
          7,
        ),
        "#a28e77",
      ),
    SURFACE,
  );
  add(
    lure,
    "angler_luminous_esca",
    () => blob([0, 0.278, -0.49], [0.023, 0.03, 0.021]),
    GLOW,
  );
  motions.push((t) => {
    lure.rotation.z = Math.sin(t * 0.75) * 0.05;
  });
  const tail = new THREE.Group();
  tail.name = "angler_tail";
  tail.position.set(0, -0.007, 0.33);
  body.add(tail);
  add(
    tail,
    "angler_caudal",
    () =>
      paint(
        sculptedFin(
          [
            [-0.015, -0.019],
            [0.12, -0.091],
            [0.17, -0.071],
            [0.183, 0],
            [0.17, 0.071],
            [0.12, 0.091],
            [-0.015, 0.019],
          ],
          0.015,
          "vertical",
          { detail: 1 },
        ),
        "#786957",
      ),
    SURFACE,
  );
  motions.push((t, e) => {
    tail.rotation.y = Math.sin(t * 1.5) * (0.12 + Math.min(e, 3) * 0.018);
  });
  for (const side of [-1, 1]) {
    const fin = new THREE.Group();
    fin.name = `angler_pectoral_${side}`;
    fin.position.set(side * 0.183, -0.11, -0.075);
    body.add(fin);
    add(
      fin,
      `angler_paddle_${side}`,
      () => {
        const g = paint(
          sculptedFin(
            [
              [-0.06, -0.014],
              [-0.063, 0.034],
              [-0.017, 0.112],
              [0.042, 0.13],
              [0.085, 0.065],
              [0.052, -0.014],
            ],
            0.014,
            "horizontal",
            { detail: 1 },
          ),
          "#887660",
        );
        return side < 0 ? mirror(g) : g;
      },
      SURFACE,
    );
    motions.push((t) => {
      fin.rotation.z = side * (-0.27 + Math.sin(t * 0.9) * 0.14);
    });
  }
  add(
    body,
    "angler_dorsal",
    () =>
      paint(
        sculptedFin(
          [
            [0.015, 0.111],
            [0.124, 0.133],
            [0.275, 0.059],
            [0.306, 0.029],
          ],
          0.01,
          "vertical",
          { detail: 1 },
        ),
        "#786957",
      ),
    SURFACE,
  );
}

function anglerMouthPoint(angle) {
  const s = Math.sin(angle),
    c = Math.cos(angle);
  return new THREE.Vector3(
    0.185 * c,
    -0.018 + (s >= 0 ? 0.087 * s ** 0.62 : -0.122 * (-s) ** 0.72),
    -0.365 - Math.abs(s) * 0.04 - Math.max(0, -s) * 0.045,
  );
}

function sculptAnglerSurface(g, inside) {
  const p = g.attributes.position,
    colors = g.attributes.color,
    shade = new THREE.Color(),
    dark = new THREE.Color("#443a2e");
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      front = 1 - THREE.MathUtils.smoothstep(z, -0.405, -0.265);
    const angle = Math.atan2((y + 0.018) / 0.115, x / 0.185),
      target = anglerMouthPoint(angle);
    const wrinkle =
      Math.sin(x * 155 + Math.sin(z * 63)) * Math.sin(y * 139 - z * 95);
    const relief = inside
      ? 0
      : (0.001 + Math.max(0, wrinkle) * 0.0035) *
        (1 - front) *
        (1 - THREE.MathUtils.smoothstep(z, 0.12, 0.29));
    p.setXYZ(
      i,
      x + Math.sign(x) * relief,
      y +
        front * (target.y - (-0.018 + 0.115 * Math.sin(angle))) +
        Math.sign(y + 0.03) * relief,
      z + front * (target.z + 0.405),
    );
    if (!inside) {
      shade
        .fromBufferAttribute(colors, i)
        .lerp(dark, Math.max(0, wrinkle) * 0.24);
      colors.setXYZ(i, shade.r, shade.g, shade.b);
    }
  }
  g.computeVertexNormals();
}

function buildOctopus(body, motions) {
  const c = { back: "#a95d3f", belly: "#dcaa77" };
  add(
    body,
    "octopus_mantle_head_web",
    () => {
      const mantle = loft(
        [
          [-0.17, 0.09, 0.065, -0.002],
          [-0.1, 0.126, 0.095, 0.012],
          [0, 0.139, 0.139, 0.047],
          [0.14, 0.176, 0.181, 0.055],
          [0.27, 0.144, 0.151, 0.052],
          [0.36, 0.068, 0.079, 0.048],
          [0.38, 0.001, 0.001, 0.045],
        ],
        c,
        { rings: 56, sides: 40 },
      );
      const p = mantle.attributes.position,
        col = mantle.attributes.color,
        shade = new THREE.Color(),
        dark = new THREE.Color("#713b2b");
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i),
          m = Math.sin(x * 197 + Math.sin(z * 71)) * Math.sin(y * 183 - z * 93),
          relief = Math.max(0, m) * 0.0015;
        p.setXYZ(i, x * (1 + relief * 4), y + relief, z);
        shade.fromBufferAttribute(col, i).lerp(dark, Math.max(0, m) * 0.3);
        col.setXYZ(i, shade.r, shade.g, shade.b);
      }
      mantle.computeVertexNormals();
      const parts = [mantle, octopusWeb()];
      for (const side of [-1, 1])
        parts.push(
          paint(
            blob([side * 0.112, 0.05, -0.1], [0.043, 0.034, 0.043]),
            "#bd7850",
          ),
        );
      parts.push(
        paint(blob([0.078, -0.058, -0.14], [0.039, 0.025, 0.047]), "#8c5039"),
      );
      return merge(parts);
    },
    SURFACE,
  );
  eyes(body, "octopus", [0.145, 0.05, -0.115, 0.021], "#d4aa60", true);
  for (let index = 0; index < 8; index++) {
    const a = (index / 8) * Math.PI * 2 + Math.PI / 8,
      x = Math.cos(a),
      y = Math.sin(a),
      arm = new THREE.Group();
    arm.name = `octopus_arm_${index + 1}`;
    arm.position.set(x * 0.081, y * 0.061 - 0.008, -0.135);
    body.add(arm);
    const curve = new THREE.CatmullRomCurve3(
      [
        [0, 0, 0],
        [x * 0.075, y * 0.068 - 0.014, -0.1],
        [x * 0.17, y * 0.115 - 0.026, -0.23],
        [x * 0.235, y * 0.145 - 0.015, -0.38],
        [x * 0.24 + (index % 2 ? 0.016 : -0.016), y * 0.15 + 0.015, -0.49],
        [x * 0.215, y * 0.12 + 0.043, -0.53],
        [x * 0.185, y * 0.104 + 0.045, -0.49],
      ].map((p) => new THREE.Vector3(...p)),
    );
    add(
      arm,
      `octopus_continuous_arm_${index}`,
      () => {
        const segments = 44,
          sides = 10,
          g = new THREE.TubeGeometry(curve, segments, 1, sides, false),
          p = g.attributes.position,
          colors = [];
        const rust = new THREE.Color("#b46a47"),
          pale = new THREE.Color("#deb088"),
          shade = new THREE.Color();
        for (let ring = 0; ring <= segments; ring++) {
          const t = ring / segments,
            center = curve.getPointAt(t),
            r = armRadius(t);
          for (let side = 0; side <= sides; side++) {
            const n = ring * (sides + 1) + side,
              direction = new THREE.Vector3()
                .fromBufferAttribute(p, n)
                .sub(center);
            p.setXYZ(
              n,
              center.x + direction.x * r,
              center.y + direction.y * r,
              center.z + direction.z * r,
            );
            shade
              .copy(rust)
              .lerp(
                pale,
                THREE.MathUtils.smoothstep(-direction.y, 0, 0.8) * 0.65,
              )
              .multiplyScalar(1 + Math.sin(t * 133 + side * 3.1) * 0.06);
            colors.push(shade.r, shade.g, shade.b);
          }
        }
        g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        g.computeVertexNormals();
        const parts = [g];
        // 吸盘的方向沿各腕内侧法线计算，双列环口随腕弯曲，而非向下粘贴圆片。
        for (let row = 0; row < 2; row++)
          for (let cup = 0; cup < 10; cup++) {
            const t = 0.1 + cup * 0.079,
              center = curve.getPointAt(t),
              tangent = curve.getTangentAt(t),
              facing = new THREE.Vector3(-x, -y, -0.22)
                .projectOnPlane(tangent)
                .normalize(),
              across = new THREE.Vector3()
                .crossVectors(tangent, facing)
                .normalize(),
              r = armRadius(t),
              size = 0.0125 * (1 - t * 0.78);
            const sucker = paint(
              new THREE.TorusGeometry(0.7, 0.3, 4, 8),
              "#e6bf9c",
            );
            sucker.scale(size, size, size * 0.65);
            sucker.applyQuaternion(
              new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1),
                facing,
              ),
            );
            center
              .addScaledVector(facing, r * 0.92)
              .addScaledVector(across, (row ? 1 : -1) * r * 0.37);
            sucker.translate(center.x, center.y, center.z);
            parts.push(sucker);
          }
        return merge(parts);
      },
      SURFACE,
    );
    motions.push((t, e) => {
      const power = 0.08 + Math.min(e, 3) * 0.012;
      arm.rotation.x = Math.sin(t * 0.55 + a) * power;
      arm.rotation.y = Math.cos(t * 0.48 + a) * power;
      arm.rotation.z = Math.sin(t * 0.39 + a) * 0.055;
    });
  }
}

function octopusWeb() {
  const positions = [],
    indices = [],
    colors = [],
    shade = new THREE.Color("#a96043");
  for (let segment = 0; segment <= 80; segment++) {
    const a = (segment / 80) * Math.PI * 2 + Math.PI / 8,
      scallop = (1 + Math.cos(a * 8 - Math.PI)) * 0.5;
    for (let ring = 0; ring <= 6; ring++) {
      const t = ring / 6,
        r = 0.072 + t * (0.077 + scallop * 0.027);
      positions.push(
        Math.cos(a) * r,
        Math.sin(a) * r * 0.75 - 0.008,
        -0.13 - t * (0.047 + scallop * 0.068),
      );
      colors.push(shade.r, shade.g, shade.b);
      if (segment < 80 && ring < 6) {
        const n = segment * 7 + ring;
        indices.push(n, n + 7, n + 1, n + 1, n + 7, n + 8);
      }
    }
  }
  const outer = geometry(positions, indices, colors),
    inner = outer.clone();
  inner.translate(0, 0, 0.0015);
  reverse(inner);
  return merge([outer, inner]);
}

function armRadius(t) {
  return 0.041 * (1 - t) ** 1.12 + 0.0015;
}
function eyes(parent, kind, [x, y, z, r], iris, horizontal = false) {
  add(
    parent,
    `${kind}_eyes`,
    () =>
      merge(
        [-1, 1].map((side) =>
          paint(blob([side * x, y, z], [r * 0.55, r, r * 1.12]), iris),
        ),
      ),
    SURFACE,
  );
  add(
    parent,
    `${kind}_pupils`,
    () =>
      merge(
        [-1, 1].map((side) =>
          blob(
            [side * (x + r * 0.46), y, z - 0.001],
            [
              r * 0.17,
              r * (horizontal ? 0.23 : 0.7),
              r * (horizontal ? 0.92 : 0.7),
            ],
          ),
        ),
      ),
    DARK,
  );
}
function tooth(size, up, broad) {
  const g = new THREE.ConeGeometry(
    size * (broad ? 0.44 : 0.13),
    size,
    broad ? 4 : 6,
    1,
  );
  g.translate(0, size * 0.5, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setXYZ(
      i,
      p.getX(i) * (broad ? 1.15 : 1),
      y * (up ? 1 : -1),
      p.getZ(i) * (broad ? 0.3 : 1) + ((y * y) / size) * 0.13,
    );
  }
  g.computeVertexNormals();
  return g;
}
function geometry(positions, indices, colors) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  if (colors)
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}
function paint(g, top, bottom = top) {
  const a = new THREE.Color(top),
    b = new THREE.Color(bottom),
    c = new THREE.Color(),
    colors = [],
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    c.copy(a).lerp(b, p.getY(i) < 0 ? 0.65 : 0);
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return g;
}
function add(parent, key, make, material) {
  if (!GEOMETRIES.has(key)) GEOMETRIES.set(key, make());
  const mesh = new THREE.Mesh(GEOMETRIES.get(key), material);
  mesh.name = key;
  parent.add(mesh);
  return mesh;
}
function merge(parts) {
  const ready = parts.map((part) => {
    const g = part.index ? part.toNonIndexed() : part.clone();
    g.deleteAttribute("uv");
    part.dispose();
    return g;
  });
  const merged = mergeGeometries(ready);
  ready.forEach((g) => g.dispose());
  return merged;
}
function blob(position, scale) {
  const g = new THREE.SphereGeometry(1, 12, 8);
  g.scale(...scale);
  g.translate(...position);
  return g;
}
function tube(points, radius, segments = 14, sides = 5) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
    segments,
    radius,
    sides,
    false,
  );
}
function reverse(g) {
  const index = g.index;
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    index.setX(i, index.getX(i + 2));
    index.setX(i + 2, a);
  }
  g.computeVertexNormals();
  return g;
}
function mirror(g) {
  g.scale(-1, 1, 1);
  return reverse(g);
}
