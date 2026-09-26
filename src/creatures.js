import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { buildExtraCreature, EXTRA_CREATURE_KINDS } from "./creature_extra.js";

/**
 * 创建原创程序化海洋生物，所有模型朝向 -Z，Y 轴向上。
 * @param {string} kind 生物名称，包含虎鲸、鱼群、深海巨兽及海鸥等模型。
 * @param {number} length 包括尾鳍的近似全长，单位与场景一致。
 * @param {number} seed 外观与动作的确定性种子。
 * @returns {THREE.Group} 根节点；userData.animate(time, speed) 用于更新游泳动作。
 */
export function createCreature(kind, length = 6, seed = 1) {
  const root = new THREE.Group();
  root.name = `creature_${kind}`;
  const random = seededRandom(seed);
  const phase = random() * Math.PI * 2;
  const motions = [];
  let previousTime;
  let swimTime = phase;

  if (kind === "orca") buildOrca(root, motions);
  else if (kind === "shark") buildShark(root, motions, false);
  else if (kind === "leviathan") buildShark(root, motions, true);
  else if (EXTRA_CREATURE_KINDS.has(kind))
    buildExtraCreature(kind, root, motions);
  else if (kind === "ray") buildRay(root, motions);
  else if (kind === "angler") buildAngler(root, motions);
  else buildFish(root, motions, kind === "tuna", random);

  mergeStaticParts(root, kind);
  root.scale.setScalar(length);
  root.userData.kind = kind;
  root.userData.length = length;
  root.userData.animate = (time, speed = 1) => {
    const effort = THREE.MathUtils.clamp(Math.abs(speed), 0.15, 3);
    // 累积动作相位，冲刺切换和远距离休眠恢复时不会突然跳帧。
    const delta =
      previousTime === undefined
        ? 0
        : THREE.MathUtils.clamp(time - previousTime, 0, 0.12);
    previousTime = time;
    swimTime += delta * (1.7 + effort * 1.1);
    for (const motion of motions) motion(swimTime, effort);
  };
  return root;
}

const MATERIALS = {
  orca: material("#10212a", 0.3),
  white: material("#e2f1e7", 0.4),
  body: material("#ffffff", 0.4, { vertexColors: true }),
  eye: material("#03080b", 0.12),
  mouth: material("#08151c", 0.7),
  gum: material("#291523", 0.55),
  tooth: material("#b9c9b4", 0.5),
  shark: material("#617e8b", 0.38),
  ray: material("#20394b", 0.5),
  fin: material("#4c8b9b", 0.45),
  angler: material("#394b55", 0.67),
  kraken: material("#401f4b", 0.48),
  suckers: material("#b575ae", 0.55),
  leviathan: material("#1f3c4a", 0.48),
  armor: material("#395967", 0.58),
  aqua: material("#73e6e0", 0.3, {
    emissive: "#25deca",
    emissiveIntensity: 2.4,
  }),
  amber: material("#ffb850", 0.3, {
    emissive: "#ff721e",
    emissiveIntensity: 2.2,
  }),
  violet: material("#be9cea", 0.35, {
    emissive: "#964eed",
    emissiveIntensity: 1.3,
  }),
};

const SPHERE = new THREE.SphereGeometry(1, 14, 10);
const SMALL_SPHERE = new THREE.SphereGeometry(1, 8, 6);
const GEOMETRY_CACHE = new Map();

// 每个截面依次为 Z、横向半径、竖向半径、竖向偏移。
const ORCA_PROFILE = [
  [-0.46, 0.012, 0.025, -0.015],
  [-0.43, 0.064, 0.071, -0.006],
  [-0.35, 0.115, 0.119, 0.012],
  [-0.21, 0.148, 0.143, 0.01],
  [-0.05, 0.145, 0.142, 0],
  [0.12, 0.108, 0.116, -0.012],
  [0.27, 0.049, 0.058, -0.023],
  [0.37, 0.017, 0.028, -0.026],
  [0.405, 0.006, 0.013, -0.026],
];

const SHARK_PROFILE = [
  [-0.49, 0.004, 0.008, -0.015],
  [-0.44, 0.055, 0.04, -0.005],
  [-0.35, 0.103, 0.09, 0],
  [-0.19, 0.12, 0.115, 0],
  [0.02, 0.095, 0.095, 0],
  [0.18, 0.052, 0.053, 0],
  [0.32, 0.021, 0.026, 0],
  [0.39, 0.009, 0.011, 0],
];

function buildOrca(root, motions) {
  const body = cached("orca_body", () =>
    bodyGeometry(ORCA_PROFILE, "#071720", "#e4f4ec", "orca"),
  );
  mesh(root, body, MATERIALS.body);

  // 眼斑贴合体表，避免从侧面观察时呈现浮起的白色球体。
  for (const side of [-1, 1]) {
    mesh(
      root,
      cached(`orca_patch_${side}`, () =>
        surfacePatch(ORCA_PROFILE, -0.295, 0.012, 0.058, 0.035, side),
      ),
      MATERIALS.white,
    );
    ellipsoid(
      root,
      MATERIALS.eye,
      [side * 0.098, 0.022, -0.361],
      [0.01, 0.01, 0.012],
    );
    ellipsoid(
      root,
      MATERIALS.white,
      [side * 0.104, 0.025, -0.363],
      [0.002, 0.002, 0.003],
    );
    const mouthPoints = [
      [side * 0.035, -0.04, -0.448],
      [side * 0.073, -0.057, -0.408],
      [side * 0.092, -0.064, -0.354],
      [side * 0.093, -0.057, -0.311],
    ];
    mesh(root, tube(mouthPoints, 0.0024), MATERIALS.mouth);
    const flipper = new THREE.Group();
    flipper.position.set(side * 0.092, -0.05, -0.19);
    root.add(flipper);
    mesh(
      flipper,
      blade(
        [
          [0, 0, -0.045],
          [side * 0.103, -0.06, -0.013],
          [side * 0.174, -0.089, 0.09],
          [side * 0.17, -0.077, 0.14],
          [side * 0.12, -0.039, 0.13],
          [side * 0.025, 0.005, 0.045],
        ],
        0.013,
        "y",
      ),
      MATERIALS.orca,
    );
    motions.push((t) => {
      flipper.rotation.z = side * (0.06 + Math.sin(t * 0.55) * 0.07);
      flipper.rotation.x = Math.sin(t * 0.55 + 0.8) * 0.05;
    });
  }
  mesh(
    root,
    blade(
      [
        [0, 0.111, -0.07],
        [0, 0.285, -0.04],
        [0, 0.343, 0.002],
        [0, 0.325, 0.028],
        [0, 0.179, 0.069],
        [0, 0.092, 0.137],
      ],
      0.016,
      "x",
    ),
    MATERIALS.orca,
  );

  const tail = new THREE.Group();
  tail.position.set(0, -0.026, 0.335);
  root.add(tail);
  for (const side of [-1, 1]) {
    mesh(
      tail,
      blade(
        [
          [0, 0, 0.015],
          [side * 0.098, 0.003, 0.032],
          [side * 0.232, 0.01, 0.112],
          [side * 0.221, 0.007, 0.138],
          [side * 0.132, -0.002, 0.12],
          [side * 0.036, -0.004, 0.124],
          [0, -0.002, 0.103],
        ],
        0.008,
        "y",
      ),
      MATERIALS.orca,
    );
  }
  motions.push((t, effort) => {
    tail.rotation.x = Math.sin(t) * (0.14 + effort * 0.05);
    tail.position.y = -0.026 + Math.sin(t - 0.5) * 0.009;
  });
}

function buildShark(root, motions, monster) {
  const skin = monster ? MATERIALS.leviathan : MATERIALS.shark;
  mesh(
    root,
    cached(monster ? "leviathan_body" : "shark_body", () =>
      bodyGeometry(
        SHARK_PROFILE,
        monster ? "#153444" : "#536f80",
        monster ? "#4c6670" : "#dae5dd",
      ),
    ),
    MATERIALS.body,
  );
  for (const side of [-1, 1]) {
    ellipsoid(
      root,
      MATERIALS.eye,
      [side * 0.087, 0.028, -0.367],
      [0.012, 0.012, 0.015],
    );
    if (monster)
      ellipsoid(
        root,
        MATERIALS.amber,
        [side * 0.096, 0.029, -0.371],
        [0.003, 0.009, 0.01],
      );
    for (let index = 0; index < 5; index++) {
      const z = -0.248 + index * 0.021;
      mesh(
        root,
        tube(
          [
            [side * 0.107, 0.05, z],
            [side * 0.124, 0.008, z + 0.006],
            [side * 0.105, -0.052, z + 0.012],
          ],
          0.0022,
        ),
        MATERIALS.mouth,
      );
    }
    mesh(
      root,
      blade(
        [
          [side * 0.085, -0.055, -0.19],
          [side * 0.267, -0.085, -0.015],
          [side * 0.307, -0.092, 0.08],
          [side * 0.19, -0.044, 0.047],
          [side * 0.084, -0.039, -0.023],
        ],
        0.008,
        "y",
      ),
      skin,
    );
    mesh(
      root,
      blade(
        [
          [side * 0.056, -0.029, 0.125],
          [side * 0.13, -0.039, 0.222],
          [side * 0.043, -0.037, 0.201],
        ],
        0.004,
        "y",
      ),
      skin,
    );
  }
  mesh(
    root,
    blade(
      [
        [0, 0.1, -0.1],
        [0, 0.271, 0.004],
        [0, 0.114, 0.081],
        [0, 0.071, 0.14],
      ],
      0.01,
      "x",
    ),
    skin,
  );
  mesh(
    root,
    blade(
      [
        [0, 0.049, 0.18],
        [0, 0.099, 0.227],
        [0, 0.021, 0.267],
      ],
      0.004,
      "x",
    ),
    skin,
  );

  const tail = new THREE.Group();
  tail.position.z = 0.327;
  root.add(tail);
  mesh(
    tail,
    blade(
      [
        [0, 0, 0],
        [0, 0.191, 0.155],
        [0, 0.205, 0.18],
        [0, 0.078, 0.148],
        [0, 0.008, 0.091],
        [0, -0.123, 0.16],
        [0, -0.14, 0.15],
        [0, -0.06, 0.047],
      ],
      0.009,
      "x",
    ),
    skin,
  );
  motions.push((t, effort) => {
    tail.rotation.y = Math.sin(t) * (0.18 + effort * 0.05);
  });

  // 黑色口腔和两排不规则齿形成从前方接近时的捕食者轮廓。
  ellipsoid(root, MATERIALS.gum, [0, -0.043, -0.432], [0.054, 0.023, 0.025]);
  const teeth = [];
  for (let index = -4; index <= 4; index++) {
    const x = index * 0.01;
    const arc = Math.sqrt(1 - (index / 5) ** 2);
    teeth.push(
      coneGeometry(
        [x, -0.031 - 0.004 * arc, -0.45],
        [0, -1, -0.25],
        0.004,
        monster ? 0.022 : 0.013,
      ),
    );
    teeth.push(coneGeometry([x, -0.058, -0.445], [0, 1, -0.25], 0.003, 0.009));
  }
  mesh(root, mergeGeometries(teeth), MATERIALS.tooth);

  if (monster) {
    for (const side of [-1, 1]) {
      mesh(
        root,
        tube(
          [
            [side * 0.096, 0.055, -0.26],
            [side * 0.153, 0.08, -0.18],
            [side * 0.175, 0.138, -0.28],
            [side * 0.165, 0.205, -0.42],
          ],
          0.012,
        ),
        MATERIALS.armor,
      );
      mesh(
        root,
        tube(
          [
            [side * 0.096, 0.017, -0.3],
            [side * 0.123, 0.015, -0.18],
            [side * 0.112, 0.005, -0.06],
            [side * 0.081, 0.005, 0.09],
            [side * 0.04, 0, 0.255],
          ],
          0.003,
        ),
        MATERIALS.aqua,
      );
      for (let index = 0; index < 7; index++) {
        const z = -0.17 + index * 0.06;
        const radius = sampleProfile(SHARK_PROFILE, z)[0];
        mesh(
          root,
          blade(
            [
              [side * radius * 0.62, 0.048, z - 0.016],
              [side * (radius + 0.063), 0.117, z + 0.027],
              [side * radius * 0.69, 0.023, z + 0.042],
            ],
            0.005,
            "x",
          ),
          index % 3 === 0 ? MATERIALS.aqua : MATERIALS.armor,
        );
      }
    }
  }
}

function buildFish(root, motions, tuna, random) {
  const colorId = Math.floor(random() * 5);
  const palettes = tuna
    ? ["#25485d", "#b8d3ce"]
    : [
        ["#208ca9", "#b3e2d5"],
        ["#e9a048", "#f8e2a8"],
        ["#648fc5", "#d1d6f1"],
        ["#b95178", "#e8b8a4"],
        ["#64b2a2", "#d2e9b9"],
      ][colorId];
  const profile = [
    [-0.45, 0.008, 0.012, 0],
    [-0.33, 0.067, 0.105, 0],
    [-0.12, tuna ? 0.092 : 0.074, tuna ? 0.126 : 0.15, 0],
    [0.12, 0.05, 0.08, 0],
    [0.31, 0.013, 0.023, 0],
    [0.36, 0.006, 0.012, 0],
  ];
  mesh(
    root,
    cached(`fish_${tuna}_${colorId}`, () => bodyGeometry(profile, ...palettes)),
    MATERIALS.body,
  );
  mesh(
    root,
    cached("fish_fins", () => {
      const fins = [
        blade(
          [
            [0, 0.105, -0.22],
            [0, 0.219, -0.03],
            [0, 0.093, 0.095],
          ],
          0.003,
          "x",
        ),
        blade(
          [
            [0, -0.09, -0.01],
            [0, -0.162, 0.15],
            [0, -0.025, 0.23],
          ],
          0.002,
          "x",
        ),
      ];
      for (const side of [-1, 1]) {
        fins.push(
          blade(
            [
              [side * 0.057, -0.018, -0.2],
              [side * 0.15, -0.026, 0.036],
              [side * 0.055, -0.011, -0.03],
            ],
            0.002,
            "y",
          ),
        );
      }
      return mergeAndDispose(fins);
    }),
    MATERIALS.fin,
  );
  mesh(
    root,
    cached("fish_eyes", () => {
      const eyes = [];
      for (const side of [-1, 1]) {
        const geometry = SMALL_SPHERE.clone();
        geometry.scale(0.01, 0.018, 0.018);
        geometry.translate(side * 0.05, 0.026, -0.334);
        eyes.push(geometry);
      }
      return mergeAndDispose(eyes);
    }),
    MATERIALS.eye,
  );
  const tail = new THREE.Group();
  tail.position.z = 0.305;
  root.add(tail);
  mesh(
    tail,
    cached("fish_tail", () =>
      blade(
        [
          [0, 0, 0],
          [0, 0.17, 0.19],
          [0, 0.029, 0.13],
          [0, 0, 0.103],
          [0, -0.029, 0.13],
          [0, -0.17, 0.19],
        ],
        0.003,
        "x",
      ),
    ),
    MATERIALS.fin,
  );
  motions.push((t, effort) => {
    tail.rotation.y = Math.sin(t * 1.6) * (0.23 + effort * 0.07);
  });
}

function buildRay(root, motions) {
  ellipsoid(root, MATERIALS.ray, [0, 0, -0.17], [0.12, 0.042, 0.28]);
  for (const side of [-1, 1]) {
    const wing = new THREE.Group();
    root.add(wing);
    mesh(
      wing,
      blade(
        [
          [0, 0.012, -0.42],
          [side * 0.15, 0.013, -0.3],
          [side * 0.44, 0.015, -0.07],
          [side * 0.53, 0.005, 0.065],
          [side * 0.21, -0.01, -0.005],
          [side * 0.075, 0, 0.12],
          [0, 0, 0.11],
        ],
        0.015,
        "y",
      ),
      MATERIALS.ray,
    );
    ellipsoid(
      root,
      MATERIALS.eye,
      [side * 0.056, 0.041, -0.322],
      [0.016, 0.013, 0.016],
    );
    motions.push((t) => {
      wing.rotation.z = side * Math.sin(t * 0.7) * 0.22;
    });
  }
  mesh(
    root,
    tube(
      [
        [0, 0, 0.02],
        [0, -0.007, 0.2],
        [0.019, 0.005, 0.41],
        [0.025, 0.02, 0.53],
      ],
      0.009,
    ),
    MATERIALS.ray,
  );
}

function buildAngler(root, motions) {
  const profile = [
    [-0.4, 0.08, 0.08, 0],
    [-0.31, 0.17, 0.19, 0.01],
    [-0.08, 0.2, 0.21, 0.025],
    [0.14, 0.12, 0.13, 0.02],
    [0.31, 0.029, 0.039, 0],
    [0.36, 0.01, 0.02, 0],
  ];
  mesh(
    root,
    cached("angler_body", () => bodyGeometry(profile, "#263d49", "#687776")),
    MATERIALS.body,
  );
  ellipsoid(root, MATERIALS.mouth, [0, -0.01, -0.389], [0.108, 0.12, 0.022]);
  const teeth = [];
  for (let index = -4; index <= 4; index++) {
    const x = index * 0.023;
    const rim = Math.sqrt(1 - (index / 5) ** 2) * 0.095;
    teeth.push(
      coneGeometry([x, rim - 0.025, -0.402], [0, -1, -0.03], 0.004, 0.055),
    );
    teeth.push(
      coneGeometry([x, -rim - 0.018, -0.407], [0, 1, -0.03], 0.003, 0.064),
    );
  }
  mesh(root, mergeGeometries(teeth), MATERIALS.tooth);
  for (const side of [-1, 1]) {
    ellipsoid(
      root,
      MATERIALS.aqua,
      [side * 0.13, 0.107, -0.307],
      [0.017, 0.018, 0.014],
    );
    mesh(
      root,
      blade(
        [
          [side * 0.13, -0.03, -0.12],
          [side * 0.32, -0.09, 0.08],
          [side * 0.14, -0.01, 0.17],
        ],
        0.005,
        "y",
      ),
      MATERIALS.angler,
    );
  }
  mesh(
    root,
    tube(
      [
        [0, 0.16, -0.14],
        [0, 0.4, -0.25],
        [0, 0.43, -0.42],
        [0, 0.3, -0.49],
      ],
      0.006,
    ),
    MATERIALS.angler,
  );
  const lure = ellipsoid(
    root,
    MATERIALS.aqua,
    [0, 0.3, -0.49],
    [0.027, 0.032, 0.027],
  );
  lure.userData.keepSeparate = true;
  const tail = new THREE.Group();
  tail.position.z = 0.31;
  root.add(tail);
  mesh(
    tail,
    blade(
      [
        [0, 0, 0],
        [0, 0.12, 0.18],
        [0, -0.12, 0.18],
      ],
      0.004,
      "x",
    ),
    MATERIALS.angler,
  );
  motions.push((t) => {
    tail.rotation.y = Math.sin(t) * 0.2;
    lure.scale
      .set(0.027, 0.032, 0.027)
      .multiplyScalar(1 + Math.sin(t * 0.4) * 0.09);
  });
}

function material(color, roughness, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.08,
    ...options,
  });
}

function mesh(parent, geometry, mat) {
  const object = new THREE.Mesh(geometry, mat);
  parent.add(object);
  return object;
}

function ellipsoid(parent, mat, position, scale) {
  const object = mesh(parent, SPHERE, mat);
  object.position.set(...position);
  object.scale.set(...scale);
  return object;
}

function cached(key, create) {
  if (!GEOMETRY_CACHE.has(key)) GEOMETRY_CACHE.set(key, create());
  return GEOMETRY_CACHE.get(key);
}

function seededRandom(seed) {
  let state = (Number(seed) || 1) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function sampleProfile(profile, z) {
  let index = 0;
  while (index < profile.length - 2 && z > profile[index + 1][0]) index++;
  const p1 = profile[index];
  const p2 = profile[index + 1];
  const p0 = profile[Math.max(0, index - 1)];
  const p3 = profile[Math.min(profile.length - 1, index + 2)];
  const t = THREE.MathUtils.clamp((z - p1[0]) / (p2[0] - p1[0]), 0, 1);
  return [1, 2, 3].map((dimension) => {
    const v0 = (p2[dimension] - p0[dimension]) * 0.5;
    const v1 = (p3[dimension] - p1[dimension]) * 0.5;
    const value =
      (2 * p1[dimension] - 2 * p2[dimension] + v0 + v1) * t ** 3 +
      (-3 * p1[dimension] + 3 * p2[dimension] - 2 * v0 - v1) * t ** 2 +
      v0 * t +
      p1[dimension];
    return dimension === 3 ? value : Math.max(0.0005, value);
  });
}

function bodyGeometry(profile, upperColor, lowerColor, pattern = "") {
  const positions = [];
  const colors = [];
  const indices = [];
  const upper = new THREE.Color(upperColor);
  const lower = new THREE.Color(lowerColor);
  const shade = new THREE.Color();
  const rings = 48;
  const sides = 32;
  for (let ring = 0; ring <= rings; ring++) {
    const z = THREE.MathUtils.lerp(
      profile[0][0],
      profile.at(-1)[0],
      ring / rings,
    );
    const [width, height, offset] = sampleProfile(profile, z);
    for (let side = 0; side <= sides; side++) {
      const theta = (side / sides) * Math.PI * 2;
      const y = Math.sin(theta);
      positions.push(Math.cos(theta) * width, y * height + offset, z);
      let blend = THREE.MathUtils.smoothstep(-y, 0.05, 0.65);
      if (pattern === "orca") {
        // 下颌到腹部形成连贯白区，后半身的白色向两侧卷起。
        const threshold =
          z < -0.32 ? -0.3 : z > -0.01 && z < 0.15 ? -0.15 : -0.58;
        blend =
          1 -
          THREE.MathUtils.smoothstep(y, threshold - 0.065, threshold + 0.065);
      }
      shade.copy(upper).lerp(lower, blend);
      if (pattern === "orca" && z > 0.045 && z < 0.145 && y > 0.45) {
        const saddle = Math.sin(((z - 0.045) / 0.1) * Math.PI) * 0.27;
        shade.lerp(new THREE.Color("#72848a"), saddle);
      }
      colors.push(shade.r, shade.g, shade.b);
      if (ring < rings && side < sides) {
        const a = ring * (sides + 1) + side;
        const b = a + sides + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
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

function surfacePatch(profile, centerZ, centerY, radiusZ, radiusY, side) {
  const positions = [];
  const indices = [];
  const rings = 6;
  const segments = 28;
  for (let ring = 0; ring <= rings; ring++) {
    for (let segment = 0; segment <= segments; segment++) {
      const angle = (segment / segments) * Math.PI * 2;
      const distance = ring / rings;
      const z = centerZ + Math.cos(angle) * radiusZ * distance;
      const y = centerY + Math.sin(angle) * radiusY * distance;
      const [width, height, offset] = sampleProfile(profile, z);
      const x =
        width * Math.sqrt(Math.max(0, 1 - ((y - offset) / height) ** 2)) +
        0.001;
      positions.push(side * x, y, z);
      if (ring < rings && segment < segments) {
        const a = ring * (segments + 1) + segment;
        const b = a + segments + 1;
        if (side > 0) indices.push(a, a + 1, b, b, a + 1, b + 1);
        else indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
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

function blade(points, thickness, axis) {
  const center = new THREE.Vector3();
  for (const point of points) center.add(new THREE.Vector3(...point));
  center.divideScalar(points.length);
  const normal = new THREE.Vector3(
    axis === "x" ? 1 : 0,
    axis === "y" ? 1 : 0,
    axis === "z" ? 1 : 0,
  );
  const vertices = [];
  const addTriangle = (a, b, c) =>
    vertices.push(...a.toArray(), ...b.toArray(), ...c.toArray());
  const top = center.clone().addScaledVector(normal, thickness);
  const bottom = center.clone().addScaledVector(normal, -thickness);
  for (let index = 0; index < points.length; index++) {
    const a = new THREE.Vector3(...points[index]);
    const b = new THREE.Vector3(...points[(index + 1) % points.length]);
    const cross = b.clone().sub(a).cross(top.clone().sub(a));
    if (cross.dot(normal) > 0) {
      addTriangle(a, b, top);
      addTriangle(b, a, bottom);
    } else {
      addTriangle(b, a, top);
      addTriangle(a, b, bottom);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.computeVertexNormals();
  return geometry;
}

function tube(points, radius) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((point) => new THREE.Vector3(...point)),
  );
  return new THREE.TubeGeometry(curve, points.length * 5, radius, 6, false);
}

function taperedTube(curve, startRadius, endRadius) {
  const geometry = new THREE.TubeGeometry(curve, 36, 1, 8, false);
  const positions = geometry.attributes.position;
  for (let ring = 0; ring <= 36; ring++) {
    const center = curve.getPointAt(ring / 36);
    const radius = THREE.MathUtils.lerp(startRadius, endRadius, ring / 36);
    for (let side = 0; side <= 8; side++) {
      const index = ring * 9 + side;
      positions.setXYZ(
        index,
        center.x + (positions.getX(index) - center.x) * radius,
        center.y + (positions.getY(index) - center.y) * radius,
        center.z + (positions.getZ(index) - center.z) * radius,
      );
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

function coneGeometry(position, direction, radius, length) {
  const geometry = new THREE.ConeGeometry(radius, length, 5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(...direction).normalize(),
  );
  geometry.applyQuaternion(quaternion);
  geometry.translate(...position);
  return geometry.toNonIndexed();
}

function mergeAndDispose(geometries) {
  const merged = mergeGeometries(geometries);
  for (const geometry of geometries) geometry.dispose();
  return merged;
}

// 只合并局部静态部件，尾鳍、胸鳍和触腕所在的动画组仍独立保留。
function mergeStaticParts(parent, kind, path = "root") {
  const batches = new Map();
  parent.children.forEach((child, index) => {
    if (child.isGroup) mergeStaticParts(child, kind, `${path}_${index}`);
    if (!child.isMesh || child.userData.keepSeparate) return;
    const key = child.material.uuid;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(child);
  });
  for (const [materialId, parts] of batches) {
    if (parts.length < 2) continue;
    const geometry = cached(`merged_${kind}_${path}_${materialId}`, () => {
      const transformed = parts.map((part) => {
        part.updateMatrix();
        const clone = part.geometry.index
          ? part.geometry.toNonIndexed()
          : part.geometry.clone();
        clone.applyMatrix4(part.matrix);
        // 所有生物均为程序化纯色材质，无需保留未使用的纹理坐标。
        clone.deleteAttribute("uv");
        return clone;
      });
      return mergeAndDispose(transformed);
    });
    mesh(parent, geometry, parts[0].material);
    for (const part of parts) parent.remove(part);
  }
}
