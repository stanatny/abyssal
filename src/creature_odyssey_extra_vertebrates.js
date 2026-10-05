import * as THREE from "three";
import { sampleSection, bindAxialMotion } from "./creature_surface.js";
import { bindSerpentineMotion } from "./serpentine_motion.js";
import {
  material,
  paint,
  part,
  loft,
  oval,
  tube,
  fin,
  eyePair,
  flexible,
  paddlePair,
  anchor,
  curvedGeometry,
} from "./creature_odyssey_geometry.js";

const ODYSSEY_WING = material("#5d8b9d", 0.5);
ODYSSEY_WING.side = THREE.DoubleSide;

/** 海龙、骨甲鱼、宽翼滤食者与鳍足猎手各自保持解剖和推进方向。 */
export function buildOdysseyVertebrate(kind, body, motions) {
  if (kind === "silver_pipefish") pipefish(body, motions);
  else if (kind === "aegis_sturgeon") sturgeon(body, motions);
  else if (kind === "thalassa_manta") manta(body, motions);
  else if (kind === "cerulean_hound") hound(body, motions);
  else throw new Error(`Unknown Odyssean vertebrate: ${kind}`);
}
function pipefish(body, motions) {
  const k = "silver_pipefish";
  const skin = part(body, `${k}_torso`, () =>
    loft(
      [
        [-0.49, 0.006, 0.009],
        [-0.28, 0.012, 0.018],
        [-0.23, 0.033, 0.045],
        [-0.08, 0.045, 0.055],
        [0.16, 0.03, 0.04],
        [0.44, 0.005, 0.007],
      ],
      "#7c9da5",
      "#c4bfaa",
      { rings: 50, sides: 18, relief: 0.04 },
    ),
  );
  const rig = bindSerpentineMotion(skin, motions, {
    headZ: -0.49,
    tailZ: 0.44,
    segments: 12,
    amplitude: 0.18,
    frequency: 1.4,
    waves: 1.35,
  });
  rig.userData.tentacleSkeleton = rig.skeleton;
  eyePair(body, k, 0.021, 0.02, -0.25, 0.008, "#d2b97f");
  for (let j = 0; j < 9; j++) {
    const z = -0.12 + j * 0.063,
      b =
        rig.skeleton.bones[Math.min(12, Math.floor(((z + 0.49) / 0.93) * 12))];
    const ornament = new THREE.Group();
    // 使用绑定时骨架世界位置换算，不让叶片在躯干摆动时脱根。
    const rest = new THREE.Vector3();
    b.getWorldPosition(rest);
    ornament.position.set(0, 0, z - rest.z);
    b.add(ornament);
    for (const s of [-1, 1])
      fin(
        ornament,
        `${k}_leaf_${j}_${s}`,
        [
          [0, s * 0.018],
          [0.025, s * 0.12],
          [0.073, s * 0.15],
          [0.06, s * 0.045],
          [0.025, s * 0.014],
        ],
        "#bdc4a0",
        "horizontal",
        0.004,
      );
    oval(
      ornament,
      `${k}_ring${j}`,
      [0, 0, 0],
      [0.042 - j * 0.002, 0.047 - j * 0.003, 0.008],
      "#9daca6",
      14,
    );
  }
  fin(
    body,
    `${k}_dorsal`,
    [
      [-0.14, 0.045],
      [-0.07, 0.11],
      [0.07, 0.11],
      [0.14, 0.033],
      [0.02, 0.05],
    ],
    "#baac91",
  );
  tube(
    body,
    `${k}_snout_lip`,
    [
      [0, 0, -0.489],
      [0, 0.005, -0.501],
    ],
    0.008,
    "#596c76",
    4,
    10,
  );
  body.userData.mouthAnchors = [anchor(body, `${k}_mouth`, [0, 0, -0.501])];
}
function sturgeon(body, motions) {
  const k = "aegis_sturgeon",
    profile = [
      [-0.5, 0.004, 0.013],
      [-0.38, 0.065, 0.035],
      [-0.24, 0.1, 0.095],
      [-0.05, 0.12, 0.115],
      [0.16, 0.074, 0.085],
      [0.32, 0.025, 0.04],
      [0.4, 0.011, 0.018],
    ];
  const torso = part(body, `${k}_torso`, () =>
    loft(profile, "#445d69", "#b2b7a0", {
      rings: 42,
      sides: 26,
      relief: 0.018,
    }),
  );
  const skin = bindAxialMotion(torso, motions, {
    axis: "y",
    frequency: 1.65,
    amplitude: 0.075,
  });
  skin.userData.tentacleSkeleton = skin.skeleton;
  eyePair(body, k, 0.074, 0.022, -0.32, 0.013, "#c2a777");
  oval(
    body,
    `${k}_ventral_mouth`,
    [0, -0.027, -0.362],
    [0.033, 0.009, 0.025],
    "#293d43",
    18,
  );
  for (let i = 0; i < 4; i++)
    flexible(
      body,
      `${k}_barbel${i}`,
      [
        [(-1.5 + i) * 0.013, -0.026, -0.386],
        [(-1.5 + i) * 0.014, -0.06, -0.39],
        [(-1.5 + i) * 0.018, -0.08, -0.375],
      ],
      [0.004, 0.0025, 0.0006],
      "#b1b098",
      motions,
      { count: 4, segments: 14, sides: 6, amplitude: 0.08, phase: i },
    );
  // 五条骨盾列跟随同一轴向骨架，避免摆尾时装甲漂浮。
  for (let row = 0; row < 5; row++)
    for (let j = 0; j < 9; j++) {
      const z = -0.19 + j * 0.063,
        a = Math.PI / 2 + row * Math.PI * 0.4,
        [rx, ry] = sampleSection(profile, z);
      const bone = skin.skeleton.bones[z > 0.22 ? 2 : z > 0.06 ? 1 : 0],
        rest = new THREE.Vector3();
      bone.getWorldPosition(rest);
      const plate = part(bone, `${k}_scute_${row}_${j}`, () => {
        const g = new THREE.OctahedronGeometry(0.025, 0);
        g.scale(0.6, 0.55, 1);
        g.translate(
          Math.cos(a) * rx * 0.94,
          Math.sin(a) * ry * 0.94,
          z - rest.z,
        );
        return paint(g, "#a9b5ab");
      });
      // 骨盾缓和银灰高光，而非强烈金属灯点。
      plate.material = torso.material;
    }
  paddlePair(body, k, [0.087, -0.047, -0.19], 0.22, 0.16, "#748582", motions);
  const rear = new THREE.Group();
  rear.position.z = 0.1;
  skin.skeleton.bones[2].add(rear);
  fin(
    rear,
    `${k}_heterocercal_tail`,
    [
      [0, 0.02],
      [0.15, 0.17],
      [0.23, 0.2],
      [0.17, 0.07],
      [0.11, 0],
      [0.16, -0.09],
      [0.12, -0.105],
      [0.025, -0.025],
    ],
    "#87978c",
  );
  fin(
    body,
    `${k}_dorsal`,
    [
      [0.12, 0.085],
      [0.19, 0.22],
      [0.3, 0.11],
      [0.3, 0.045],
      [0.2, 0.072],
    ],
    "#748786",
  );
  body.userData.mouthAnchors = [
    anchor(body, `${k}_mouth`, [0, -0.028, -0.374]),
  ];
}
function wingGeometry(side) {
  const pos = [],
    idx = [],
    r = 24,
    c = 18;
  for (let i = 0; i <= r; i++)
    for (let j = 0; j <= c; j++) {
      const u = i / r,
        v = j / c,
        x = side * (0.055 + u * 0.55),
        z = -0.25 + u * 0.18 + v * (0.55 - u * 0.43);
      const y = 0.075 * Math.sin(Math.PI * v) * Math.sqrt(1 - u) - 0.028 * u;
      pos.push(x, y, z);
      if (i < r && j < c) {
        const n = i * (c + 1) + j;
        idx.push(n, n + 1, n + c + 1, n + 1, n + c + 2, n + c + 1);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function manta(body, motions) {
  const k = "thalassa_manta";
  part(body, `${k}_central_disc`, () =>
    loft(
      [
        [-0.29, 0.075, 0.038],
        [-0.24, 0.17, 0.06],
        [-0.05, 0.19, 0.074],
        [0.19, 0.1, 0.043],
        [0.32, 0.02, 0.014],
      ],
      "#315c6c",
      "#d0cbbb",
      { rings: 36, sides: 26 },
    ),
  );
  eyePair(body, k, 0.133, 0.034, -0.228, 0.018, "#9abcb4");
  for (const s of [-1, 1]) {
    const wing = part(body, `${k}_pectoral${s}`, () => {
      const g = wingGeometry(s),
        v = g.attributes.position,
        colors = [];
      const a = new THREE.Color("#335e73"),
        b = new THREE.Color("#8db5b7"),
        col = new THREE.Color();
      for (let i = 0; i < v.count; i++) {
        col.copy(a).lerp(b, Math.min(1, Math.abs(v.getX(i)) * 0.85));
        colors.push(col.r, col.g, col.b);
      }
      g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      return g;
    });
    wing.material = ODYSSEY_WING;
    // 宽翼以跨度加权的骨架传递波动，根部留在胸盘内部。
    const g = wing.geometry;
    if (!g.attributes.skinIndex) {
      const ids = [],
        weights = [],
        v = g.attributes.position;
      for (let i = 0; i < v.count; i++) {
        const t = Math.max(
            0,
            Math.min(3, ((Math.abs(v.getX(i)) - 0.055) / 0.55) * 3),
          ),
          q = Math.min(2, Math.floor(t)),
          f = t - q;
        ids.push(q, q + 1, 0, 0);
        weights.push(1 - f, f, 0, 0);
      }
      g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(ids, 4));
      g.setAttribute(
        "skinWeight",
        new THREE.Float32BufferAttribute(weights, 4),
      );
    }
    const moving = new THREE.SkinnedMesh(g, wing.material);
    moving.name = wing.name;
    moving.userData.keepSeparate = true;
    body.remove(wing);
    body.add(moving);
    const bones = Array.from({ length: 4 }, () => new THREE.Bone());
    bones[0].position.x = s * 0.055;
    for (let i = 1; i < 4; i++) {
      bones[i].position.x = (s * 0.55) / 3;
      bones[i - 1].add(bones[i]);
    }
    moving.add(bones[0]);
    moving.bind(new THREE.Skeleton(bones));
    moving.userData.tentacleSkeleton = moving.skeleton;
    g.computeBoundingSphere();
    moving.boundingSphere = g.boundingSphere.clone();
    moving.boundingSphere.radius += 0.18;
    motions.push((t, e) => {
      for (let i = 1; i < 4; i++)
        bones[i].rotation.z =
          s * Math.sin(t * (1.5 + e * 0.1) - i * 0.38) * (0.12 + i * 0.027);
    });
    flexible(
      body,
      `${k}_cephalic_lobe${s}`,
      [
        [s * 0.073, 0.025, -0.255],
        [s * 0.085, 0.016, -0.32],
        [s * 0.07, -0.02, -0.345],
        [s * 0.055, -0.015, -0.3],
      ],
      [0.022, 0.024, 0.016, 0.008],
      "#90a7a2",
      motions,
      { count: 5, segments: 22, sides: 10, amplitude: 0.055, phase: s },
    );
    for (let i = 0; i < 5; i++)
      tube(
        body,
        `${k}_gill${s}_${i}`,
        [
          [s * 0.045, -0.054, -0.17 + i * 0.035],
          [s * 0.1, -0.047, -0.155 + i * 0.035],
        ],
        0.0028,
        "#465d62",
        8,
        5,
      );
  }
  flexible(
    body,
    `${k}_tail`,
    [
      [0, 0, 0.26],
      [0, -0.02, 0.45],
      [0.015, -0.03, 0.68],
      [0.028, -0.02, 0.89],
    ],
    [0.019, 0.01, 0.005, 0.0007],
    "#496979",
    motions,
    { count: 9, segments: 34, sides: 8, amplitude: 0.14 },
  );
  oval(
    body,
    `${k}_mouth`,
    [0, -0.01, -0.28],
    [0.06, 0.02, 0.012],
    "#172d38",
    20,
  );
  body.userData.mouthAnchors = [
    anchor(body, `${k}_oral_anchor`, [0, -0.01, -0.294]),
  ];
}
function hound(body, motions) {
  const k = "cerulean_hound";
  const skin = part(body, `${k}_muscular_trunk`, () =>
    loft(
      [
        [-0.36, 0.05, 0.056],
        [-0.28, 0.13, 0.14],
        [-0.12, 0.19, 0.19],
        [0.1, 0.145, 0.13],
        [0.3, 0.075, 0.065],
        [0.41, 0.025, 0.027],
      ],
      "#3b617b",
      "#94a5a6",
      { rings: 42, sides: 30, relief: 0.014 },
    ),
  );
  const rig = bindAxialMotion(skin, motions, {
    axis: "x",
    frequency: 1.25,
    amplitude: 0.07,
  });
  rig.userData.tentacleSkeleton = rig.skeleton;
  part(body, `${k}_continuous_head`, () =>
    loft(
      [
        [-0.508, 0.025, 0.016, 0.078],
        [-0.472, 0.057, 0.038, 0.06],
        [-0.402, 0.085, 0.068, 0.061],
        [-0.32, 0.113, 0.108, 0.069],
        [-0.235, 0.14, 0.14, 0.028],
        [-0.19, 0.15, 0.15, 0.005],
      ],
      "#5b7c8d",
      "#acb6a6",
      { rings: 40, sides: 26, relief: 0.012 },
    ),
  );
  oval(
    body,
    `${k}_nose`,
    [0, 0.093, -0.478],
    [0.044, 0.02, 0.023],
    "#263940",
    20,
  );
  eyePair(body, k, 0.093, 0.081, -0.375, 0.012, "#d4b273");
  for (const s of [-1, 1]) {
    oval(
      body,
      `${k}_ear${s}`,
      [s * 0.116, 0.115, -0.23],
      [0.02, 0.029, 0.024],
      "#779393",
      16,
    );
    tube(
      body,
      `${k}_lip${s}`,
      [
        [0, 0.032, -0.491],
        [s * 0.052, 0.022, -0.46],
        [s * 0.069, 0.026, -0.425],
      ],
      0.004,
      "#3e4d52",
      12,
      6,
    );
    for (let i = 0; i < 5; i++)
      tube(
        body,
        `${k}_whisker${s}_${i}`,
        [
          [s * 0.058, 0.067 - i * 0.01, -0.441],
          [s * 0.105, 0.065 - i * 0.012, -0.469],
          [s * (0.158 + i * 0.005), 0.063 - i * 0.014, -0.459 + i * 0.01],
        ],
        0.0015,
        "#c4c6ad",
        14,
        4,
      );
    const fore = new THREE.Group();
    fore.position.set(s * 0.105, -0.048, -0.15);
    body.add(fore);
    part(fore, `${k}_flipper${s}`, () =>
      curvedGeometry(
        [
          [0, 0, 0],
          [s * 0.07, -0.1, 0.1],
          [s * 0.16, -0.09, 0.19],
          [s * 0.205, -0.075, 0.24],
        ],
        [0.045, 0.041, 0.026, 0.001],
        "#527586",
        "#a3b1a5",
        26,
        12,
      ),
    );
    motions.push((t, e) => {
      fore.rotation.x = Math.sin(t * (1.2 + e * 0.22) + s * 0.2) * 0.2;
      fore.rotation.z = s * (0.05 + Math.sin(t * 1.2) * 0.08);
    });
    const rear = new THREE.Group();
    rear.position.set(s * 0.018, 0, 0.13);
    rig.skeleton.bones[2].add(rear);
    fin(
      rear,
      `${k}_hind_web${s}`,
      [
        [0, 0],
        [0.065, s * 0.07],
        [0.155, s * 0.125],
        [0.23, s * 0.1],
        [0.2, s * 0.015],
        [0.04, 0],
      ],
      "#5f8294",
      "horizontal",
      0.009,
    );
  }
  for (let i = 0; i < 8; i++) {
    const s = i % 2 ? 1 : -1,
      z = -0.11 + ((i / 2) | 0) * 0.065;
    oval(
      body,
      `${k}_rosette${i}`,
      [s * 0.153, 0.04, z],
      [0.003, 0.01, 0.012],
      "#809aa4",
      12,
    );
  }
  body.userData.mouthAnchors = [
    anchor(body, `${k}_oral_anchor`, [0, 0.03, -0.49]),
  ];
}
