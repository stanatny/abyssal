import * as THREE from "three";
import {
  bindAxialMotion,
  skinMaterial,
  sampleSection,
  sculptedFin,
} from "./creature_surface.js";
import { buildOctopus } from "./creature_octopus.js";
import { buildReefCreature } from "./creature_reef.js";

/** 新生态模型拥有独立剪影；几何与材质按物种缓存，群游实例不重复创建资产。 */
export const ECOSYSTEM_CREATURE_KINDS = new Set([
  "boxfish",
  "parrotfish",
  "wrasse",
  "sardine",
  "anchovy",
  "herring",
  "mackerel",
  "flying_fish",
  "turtle",
  "sunfish",
  "hammerhead",
  "sperm_whale",
  "octopus",
  "mosasaur",
  "plesiosaur",
  "megalodon",
  "pliosaur",
  "basilosaurus",
]);

/**
 * 向根节点填充新生物模型，头朝 -Z；归一化后的纵向全长为 1。
 * @param {string} kind 物种标识。
 * @param {THREE.Group} root 创建入口的根节点。
 * @param {Function[]} motions 由统一游泳时钟更新的动作函数。
 * @returns {void} 模型与动作写入参数；飞鱼读取 root.userData.airborne 展翼。
 */
export function buildEcosystemCreature(kind, root, motions) {
  if (kind === "flying_fish") {
    root.userData.setGliding = (active) => {
      root.userData.airborne = Boolean(active);
    };
  }
  const body = new THREE.Group();
  body.name = `${kind}_anatomy`;
  root.add(body);
  if (["boxfish", "parrotfish", "wrasse"].includes(kind))
    buildReefCreature(kind, body, motions);
  else if (SMALL_FISH[kind]) buildSchoolFish(kind, body, motions, root);
  else if (kind === "turtle") buildTurtle(body, motions);
  else if (kind === "sunfish") buildSunfish(body, motions);
  else if (kind === "hammerhead" || kind === "megalodon")
    buildPredatoryShark(kind, body, motions);
  else if (kind === "sperm_whale") buildSpermWhale(body, motions);
  else if (kind === "octopus") buildOctopus(body, motions);
  else if (kind === "basilosaurus") buildBasilosaurus(body, motions);
  else buildReptile(kind, body, motions);
  body.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(body);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 1 / size.z;
  body.scale.setScalar(scale);
  body.position.copy(center).multiplyScalar(-scale);
  root.userData.normalizedLength = 1;
}

const GEOMETRIES = new Map();
const MATERIALS = new Map();
const SPHERE = new THREE.SphereGeometry(1, 12, 8);
const EYE = material("#091821", 0.12);
const PALE = material("#e2e8cf", 0.46);
const DARK = material("#17313d", 0.64);
const SILVER = material("#d7e6e5", 0.24);
const SMALL_FISH = {
  sardine: {
    width: 0.085,
    height: 0.115,
    back: "#286c78",
    belly: "#d9e6de",
    tail: 0.15,
  },
  anchovy: {
    width: 0.052,
    height: 0.064,
    back: "#406c73",
    belly: "#e8e4c8",
    tail: 0.105,
  },
  herring: {
    width: 0.077,
    height: 0.16,
    back: "#485d87",
    belly: "#e3e7ea",
    tail: 0.18,
  },
  mackerel: {
    width: 0.103,
    height: 0.13,
    back: "#2a737c",
    belly: "#dae4cb",
    tail: 0.19,
  },
  flying_fish: {
    width: 0.068,
    height: 0.079,
    back: "#347da7",
    belly: "#d6e9df",
    tail: 0.18,
  },
};

function buildSchoolFish(kind, body, motions, root) {
  const config = SMALL_FISH[kind];
  const torso = add(
    body,
    cached(`${kind}_body`, () =>
      loft(
        [
          [-0.49, 0.008, 0.012],
          [-0.4, config.width * 0.54, config.height * 0.5],
          [-0.24, config.width, config.height],
          [0.01, config.width, config.height],
          [0.25, config.width * 0.52, config.height * 0.57],
          [0.38, 0.013, 0.023],
        ],
        config.back,
        config.belly,
        { school: true },
      ),
    ),
    schoolMaterial(kind),
  );
  bindAxialMotion(torso, motions, {
    axis: "y",
    frequency: 2.2,
    amplitude: 0.065,
  });
  eyes(
    body,
    config.width * 0.78,
    0.018,
    -0.36,
    kind === "anchovy" ? 0.011 : 0.014,
  );
  for (const side of [-1, 1]) {
    tube(
      body,
      `${kind}_operculum_${side}`,
      [
        [side * config.width * 0.87, config.height * 0.42, -0.275],
        [side * config.width * 0.985, 0, -0.252],
        [side * config.width * 0.82, -config.height * 0.5, -0.269],
      ],
      0.0013,
      EYE,
    );
    tube(
      body,
      `${kind}_lip_${side}`,
      [
        [0, -0.008, -0.49],
        [side * config.width * 0.24, -0.016, -0.458],
        [side * config.width * 0.42, -0.019, -0.424],
      ],
      0.0013,
      EYE,
    );
  }
  const tail = pivot(body, [0, 0, 0.34]);
  fin(
    tail,
    `${kind}_tail`,
    [
      [0, 0, 0],
      [0, config.tail, 0.19],
      [0, 0, 0.13],
      [0, -config.tail, 0.19],
    ],
    material(config.back),
  );
  motions.push((t, e) => {
    tail.rotation.y = Math.sin(t * 2.2) * (0.22 + e * 0.035);
  });
  fin(
    body,
    `${kind}_dorsal`,
    [
      [0, config.height * 0.8, -0.1],
      [0, config.height + 0.095, -0.04],
      [0, config.height * 0.65, 0.12],
    ],
    material(config.back),
  );
  for (const side of [-1, 1]) {
    if (kind === "flying_fish") {
      const pectoral = pivot(body, [side * config.width * 0.65, -0.025, -0.22]);
      fin(
        pectoral,
        `fly_wing_${side}`,
        [
          [0, 0, 0],
          [side * 0.49, -0.014, 0.1],
          [side * 0.46, -0.024, 0.29],
          [side * 0.07, -0.02, 0.36],
        ],
        material("#85b9d8", 0.3),
      );
      for (let i = 1; i <= 4; i++)
        tube(
          pectoral,
          `fly_ray_${side}_${i}`,
          [
            [0, 0, 0],
            [side * (0.17 + i * 0.065), -0.006, 0.1 + i * 0.043],
          ],
          0.0025,
          SILVER,
        );
      motions.push((t) => {
        pectoral.rotation.z =
          side * (root.userData.airborne ? 0.04 : 0.5 + Math.sin(t) * 0.06);
      });
    } else {
      fin(
        body,
        `${kind}_pectoral_${side}`,
        [
          [side * config.width * 0.65, -0.025, -0.22],
          [side * (config.width * 0.65 + 0.08), -0.1, -0.12],
          [side * config.width * 0.65, -0.025, -0.14],
        ],
        material(config.back),
      );
    }
  }
  if (kind === "anchovy") {
    for (const side of [-1, 1])
      tube(
        body,
        `anchovy_band_${side}`,
        [
          [side * 0.035, 0, -0.38],
          [side * 0.054, 0, -0.16],
          [side * 0.046, 0, 0.16],
          [side * 0.017, 0, 0.33],
        ],
        0.006,
        material("#f1dea1"),
      );
    ellipsoid(body, SILVER, [0, -0.028, -0.39], [0.029, 0.017, 0.1]);
  }
  if (kind === "herring") {
    for (let i = 0; i < 9; i++)
      fin(
        body,
        `herring_keel_${i}`,
        [
          [0, -0.14 + i * 0.006, -0.2 + i * 0.045],
          [0, -0.167 + i * 0.006, -0.18 + i * 0.045],
          [0, -0.13 + i * 0.006, -0.15 + i * 0.045],
        ],
        PALE,
      );
  }
  if (kind === "mackerel") {
    for (let i = 0; i < 4; i++)
      fin(
        body,
        `mackerel_finlet_${i}`,
        [
          [0, 0.055, 0.2 + i * 0.04],
          [0, 0.09, 0.21 + i * 0.04],
          [0, 0.035, 0.245 + i * 0.04],
        ],
        material("#abca84"),
      );
  }
}

function buildTurtle(body, motions) {
  const shell = material("#505c37", 0.57),
    skin = material("#7f8860", 0.6);
  const carapace = add(
    body,
    cached("turtle_carapace", () => {
      const g = new THREE.SphereGeometry(1, 40, 24),
        p = g.attributes.position;
      for (let i = 0; i < p.count; i++)
        if (p.getY(i) < 0) p.setY(i, p.getY(i) * 0.25);
      g.computeVertexNormals();
      return g;
    }),
    shell,
  );
  carapace.position.set(0, 0.025, 0);
  carapace.scale.set(0.32, 0.16, 0.37);
  ellipsoid(
    body,
    material("#c0b887", 0.65),
    [0, -0.025, 0],
    [0.29, 0.037, 0.34],
  );
  // 盾片边界沿同一连续背甲投影，避免把龟甲拼成一排悬浮椭球。
  const seam = material("#3b4329", 0.62);
  const shellY = (x, z) =>
    0.026 +
    0.162 * Math.sqrt(Math.max(0.02, 1 - (x / 0.32) ** 2 - (z / 0.37) ** 2));
  for (let i = 0; i < 5; i++) {
    const z = -0.255 + i * 0.126;
    const width = 0.083 * Math.sqrt(Math.max(0.3, 1 - (z / 0.38) ** 2));
    const shield = [
      [0, z - 0.073],
      [-width, z - 0.031],
      [-width, z + 0.036],
      [0, z + 0.071],
      [width, z + 0.036],
      [width, z - 0.031],
      [0, z - 0.073],
    ];
    tube(
      body,
      `turtle_shield_${i}`,
      shield.map(([x, pz]) => [x, shellY(x, pz), pz]),
      0.0022,
      seam,
    );
    for (const side of [-1, 1]) {
      const x = side * width,
        outerX = side * 0.27 * Math.sqrt(Math.max(0.1, 1 - (z / 0.37) ** 2));
      tube(
        body,
        `turtle_lateral_${side}_${i}`,
        [
          [x, shellY(x, z), z],
          [outerX * 0.85, shellY(outerX * 0.85, z + 0.025), z + 0.025],
          [outerX, shellY(outerX, z + 0.06), z + 0.06],
        ],
        0.002,
        seam,
      );
    }
  }
  ellipsoid(body, skin, [0, 0, -0.395], [0.088, 0.075, 0.13]);
  eyes(body, 0.075, 0.023, -0.44, 0.011);
  for (const side of [-1, 1]) {
    tube(
      body,
      `turtle_beak_${side}`,
      [
        [0, -0.022, -0.519],
        [side * 0.06, -0.028, -0.484],
        [side * 0.078, -0.014, -0.43],
      ],
      0.0025,
      DARK,
    );
    ellipsoid(body, DARK, [side * 0.026, 0.028, -0.503], [0.007, 0.005, 0.004]);
  }
  for (const side of [-1, 1]) {
    const front = pivot(body, [side * 0.21, -0.02, -0.21]);
    fin(
      front,
      `turtle_front_${side}`,
      [
        [0, 0, 0],
        [side * 0.22, -0.03, -0.01],
        [side * 0.38, -0.025, 0.18],
        [side * 0.21, 0.0, 0.15],
        [side * 0.04, 0, 0.1],
      ],
      skin,
    );
    const rear = pivot(body, [side * 0.19, -0.03, 0.24]);
    fin(
      rear,
      `turtle_rear_${side}`,
      [
        [0, 0, 0],
        [side * 0.22, -0.025, 0.04],
        [side * 0.2, 0, 0.18],
        [side * 0.06, 0, 0.12],
      ],
      skin,
    );
    motions.push((t, e) => {
      front.rotation.z = side * Math.sin(t * 0.8) * 0.38;
      rear.rotation.z = side * Math.sin(t * 0.8 + 1) * 0.14;
      front.rotation.y = side * Math.sin(t * 0.8) * 0.08 * e;
    });
  }
  ellipsoid(body, skin, [0, -0.02, 0.38], [0.035, 0.03, 0.08]);
}

function buildSunfish(body, motions) {
  add(
    body,
    cached("sunfish_disc", () =>
      loft(
        [
          [-0.44, 0.04, 0.09],
          [-0.37, 0.12, 0.2],
          [-0.18, 0.17, 0.3],
          [0.08, 0.15, 0.29],
          [0.3, 0.09, 0.22],
          [0.37, 0.04, 0.19],
        ],
        "#788b98",
        "#c8d1cf",
      ),
    ),
    vertexMaterial(),
  );
  const top = pivot(body, [0, 0.24, 0.08]),
    bottom = pivot(body, [0, -0.24, 0.08]);
  fin(
    top,
    "sunfish_dorsal",
    [
      [0, 0, 0],
      [0, 0.45, 0.025],
      [0, 0.5, 0.12],
      [0, 0.02, 0.21],
    ],
    material("#7e919a"),
  );
  fin(
    bottom,
    "sunfish_anal",
    [
      [0, 0, 0],
      [0, -0.43, 0.025],
      [0, -0.48, 0.12],
      [0, -0.02, 0.21],
    ],
    material("#8d9fa5"),
  );
  motions.push((t) => {
    top.rotation.z = Math.sin(t) * 0.24;
    bottom.rotation.z = -Math.sin(t) * 0.24;
  });
  // 截尾鳍为带波状边缘的圆钝舵，不使用普通鱼叉尾。
  for (let i = 0; i < 7; i++)
    ellipsoid(
      body,
      material("#9baaaa"),
      [0, -0.2 + i * 0.066, 0.36],
      [0.03, 0.046, 0.06],
    );
  eyes(body, 0.105, 0.075, -0.34, 0.019);
  ellipsoid(body, DARK, [0, -0.018, -0.448], [0.038, 0.039, 0.005]);
  for (const side of [-1, 1])
    fin(
      body,
      `sunfish_pectoral_${side}`,
      [
        [side * 0.15, 0, -0.2],
        [side * 0.24, -0.04, -0.08],
        [side * 0.14, -0.065, -0.11],
      ],
      material("#a4b5ba"),
    );
}

function buildPredatoryShark(kind, body, motions) {
  const mega = kind === "megalodon",
    back = mega ? "#43596a" : "#497581",
    width = mega ? 0.16 : 0.09;
  const torso = add(
    body,
    cached(`${kind}_body`, () =>
      loft(
        [
          [-0.48, mega ? 0.035 : 0.015, 0.028],
          [-0.36, width * 0.72, 0.075],
          [-0.17, width, width * 0.95],
          [0.08, width * 0.85, width * 0.8],
          [0.28, width * 0.38, 0.055],
          [0.4, 0.017, 0.028],
        ],
        back,
        "#d1d8ca",
      ),
    ),
    vertexMaterial(),
  );
  bindAxialMotion(torso, motions, {
    axis: "y",
    frequency: 1.1,
    amplitude: 0.045,
  });
  if (!mega) {
    add(
      body,
      cached("hammer_skull", () =>
        loft(
          [
            [-0.475, 0.2, 0.025],
            [-0.44, 0.255, 0.041],
            [-0.39, 0.23, 0.035],
            [-0.355, 0.075, 0.035],
          ],
          back,
          "#d8dfd3",
        ),
      ),
      vertexMaterial(),
    );
    eyes(body, 0.249, 0.008, -0.443, 0.012);
  } else {
    eyes(body, 0.097, 0.045, -0.352, 0.014);
    jaw(body, `${kind}_jaw`, 0.1, -0.064, -0.33, 0.14, 14);
  }
  for (const side of [-1, 1]) {
    fin(
      body,
      `${kind}_pectoral_${side}`,
      [
        [side * width * 0.65, -0.055, -0.18],
        [side * (mega ? 0.36 : 0.32), -0.1, 0.05],
        [side * 0.1, -0.08, 0.015],
      ],
      material(back),
    );
    for (let i = 0; i < 5; i++)
      tube(
        body,
        `${kind}_gill_${side}_${i}`,
        [
          [side * width * 0.9, 0.055, -0.235 + i * 0.023],
          [side * width, -0.005, -0.24 + i * 0.023],
          [side * width * 0.85, -0.06, -0.23 + i * 0.023],
        ],
        0.0027,
        DARK,
      );
  }
  fin(
    body,
    `${kind}_dorsal`,
    [
      [0, 0.09, -0.09],
      [0, mega ? 0.33 : 0.29, 0],
      [0, 0.08, 0.17],
    ],
    material(back),
  );
  const tail = pivot(body, [0, 0, 0.34]);
  fin(
    tail,
    `${kind}_caudal`,
    [
      [0, 0, 0],
      [0, 0.25, 0.19],
      [0, 0.035, 0.14],
      [0, -0.18, 0.2],
      [0, -0.035, 0.05],
    ],
    material(back),
  );
  motions.push((t, e) => {
    tail.rotation.y = Math.sin(t * 1.1) * (0.2 + e * 0.045);
  });
}

function buildSpermWhale(body, motions) {
  const torso = add(
    body,
    cached("sperm_whale_body", () =>
      loft(
        [
          [-0.502, 0.075, 0.123, 0.016],
          [-0.485, 0.131, 0.158, 0.014],
          [-0.45, 0.145, 0.163, 0.012],
          [-0.27, 0.15, 0.17],
          [-0.1, 0.145, 0.15],
          [0.16, 0.1, 0.09],
          [0.36, 0.026, 0.028],
          [0.44, 0.012, 0.015],
        ],
        "#424e54",
        "#8c9290",
        { squareFront: true },
      ),
    ),
    vertexMaterial(),
  );
  bindAxialMotion(torso, motions, {
    axis: "x",
    frequency: 0.8,
    amplitude: 0.045,
  });
  ellipsoid(
    body,
    material("#7c888b"),
    [0, -0.161, -0.3],
    [0.045, 0.024, 0.195],
  );
  for (const side of [-1, 1])
    ellipsoid(body, EYE, [side * 0.135, -0.072, -0.15], [0.008, 0.007, 0.01]);
  for (const side of [-1, 1])
    tube(
      body,
      `sperm_lip_${side}`,
      [
        [side * 0.047, -0.126, -0.49],
        [side * 0.07, -0.138, -0.37],
        [side * 0.114, -0.123, -0.22],
        [side * 0.14, -0.092, -0.12],
      ],
      0.003,
      DARK,
    );
  // 左前侧单鼻孔是抹香鲸辨识点，不以发光点代替真实解剖。
  ellipsoid(body, DARK, [-0.042, 0.172, -0.443], [0.016, 0.003, 0.025]);
  fin(
    body,
    "sperm_dorsal_ridge",
    [
      [0, 0.096, 0.065],
      [0, 0.13, 0.11],
      [0, 0.106, 0.155],
      [0, 0.083, 0.18],
      [0, 0.086, 0.205],
      [0, 0.065, 0.23],
      [0, 0.065, 0.258],
      [0, 0.042, 0.3],
      [0, 0.032, 0.33],
      [0, 0.024, 0.35],
    ],
    material("#424e54"),
  );
  for (const side of [-1, 1]) {
    const flipper = pivot(body, [side * 0.125, -0.08, -0.08]);
    fin(
      flipper,
      `sperm_flipper_${side}`,
      [
        [0, 0, 0],
        [side * 0.13, -0.015, 0.09],
        [side * 0.095, -0.025, 0.16],
        [0, 0, 0.1],
      ],
      material("#62717a"),
    );
    motions.push((t) => {
      flipper.rotation.z = side * Math.sin(t * 0.6) * 0.12;
    });
  }
  const tail = pivot(body, [0, 0, 0.35]);
  fin(
    tail,
    "sperm_fluke",
    [
      [0, 0, 0.12],
      [-0.22, 0, 0.18],
      [-0.15, 0, 0.08],
      [0, 0, 0.01],
      [0.15, 0, 0.08],
      [0.22, 0, 0.18],
    ],
    material("#576b76"),
  );
  motions.push((t, e) => {
    tail.rotation.x = Math.sin(t * 0.8) * (0.17 + e * 0.035);
  });
  tube(
    body,
    "sperm_scar",
    [
      [-0.025, 0.165, -0.34],
      [0.013, 0.172, -0.29],
      [0.055, 0.158, -0.24],
    ],
    0.003,
    material("#a3adae"),
  );
}

function buildReptile(kind, body, motions) {
  const longNeck = kind === "plesiosaur",
    plio = kind === "pliosaur";
  const back = longNeck ? "#527e72" : plio ? "#57654d" : "#376b5b";
  const profile = longNeck
    ? [
        [-0.51, 0.022, 0.025],
        [-0.43, 0.035, 0.033],
        [-0.37, 0.024, 0.027],
        [-0.06, 0.038, 0.048],
        [0.08, 0.115, 0.09],
        [0.26, 0.115, 0.084],
        [0.38, 0.045, 0.04],
        [0.48, 0.003, 0.009],
      ]
    : plio
      ? [
          [-0.5, 0.015, 0.027],
          [-0.43, 0.09, 0.068],
          [-0.22, 0.116, 0.085],
          [-0.11, 0.074, 0.065],
          [0.08, 0.17, 0.115],
          [0.28, 0.127, 0.09],
          [0.44, 0.013, 0.019],
        ]
      : [
          [-0.5, 0.019, 0.025],
          [-0.38, 0.067, 0.055],
          [-0.22, 0.085, 0.07],
          [-0.02, 0.116, 0.087],
          [0.18, 0.087, 0.062],
          [0.33, 0.036, 0.031],
          [0.49, 0.006, 0.013],
        ];
  add(
    body,
    cached(`${kind}_body`, () => loft(profile, back, "#b7c6a0")),
    vertexMaterial(),
  );
  eyes(
    body,
    longNeck ? 0.03 : plio ? 0.1 : 0.066,
    longNeck ? 0.018 : 0.035,
    longNeck ? -0.45 : plio ? -0.32 : -0.35,
    longNeck ? 0.008 : 0.011,
  );
  if (!longNeck)
    jaw(
      body,
      `${kind}_jaw`,
      plio ? 0.087 : 0.049,
      -0.038,
      plio ? -0.32 : -0.34,
      plio ? 0.18 : 0.16,
      plio ? 12 : 10,
    );
  const frontZ = longNeck ? 0.045 : plio ? -0.03 : -0.13;
  const rearZ = longNeck ? 0.28 : 0.23;
  for (const side of [-1, 1])
    for (let pair = 0; pair < 2; pair++) {
      const width = longNeck ? 0.28 : plio ? 0.35 : 0.18;
      const finRoot = pivot(body, [
        side * (longNeck ? 0.085 : 0.11),
        -0.035,
        pair ? rearZ : frontZ,
      ]);
      fin(
        finRoot,
        `${kind}_paddle_${side}_${pair}`,
        [
          [0, 0, 0],
          [side * width, -0.016, 0.045],
          [side * width * 0.85, -0.025, 0.12],
          [side * 0.065, 0.0, 0.095],
        ],
        material(back),
      );
      motions.push((t) => {
        finRoot.rotation.z = side * Math.sin(t * 0.85 + pair * 0.8) * 0.27;
        finRoot.rotation.y = side * Math.cos(t * 0.85 + pair * 0.8) * 0.07;
      });
    }
  if (kind === "mosasaur") {
    const tail = pivot(body, [0, 0, 0.32]);
    fin(
      tail,
      "mosa_tail",
      [
        [0, 0, 0],
        [0, 0.16, 0.22],
        [0, 0.02, 0.19],
        [0, -0.15, 0.22],
      ],
      material(back),
    );
    motions.push((t, e) => {
      tail.rotation.y = Math.sin(t) * (0.25 + e * 0.05);
    });
  }
  // 背部细小斑纹沿躯干布置，避免用不符合化石证据的巨大棘冠。
  for (let i = 0; i < 6; i++)
    for (const side of [-1, 1])
      ellipsoid(
        body,
        material("#324d44"),
        [
          side * (longNeck ? 0.072 : 0.077),
          longNeck ? 0.071 : 0.066,
          (longNeck ? 0.065 : -0.07) + i * 0.041,
        ],
        [0.012, 0.006, 0.016],
      );
}

function buildBasilosaurus(body, motions) {
  const back = material("#716b80"),
    belly = "#b8afb8";
  add(
    body,
    cached("basilosaurus_fore", () =>
      loft(
        [
          [-0.5, 0.016, 0.019],
          [-0.41, 0.037, 0.038],
          [-0.32, 0.06, 0.062],
          [-0.22, 0.066, 0.065],
          [0.03, 0.052, 0.054],
        ],
        "#696478",
        belly,
      ),
    ),
    vertexMaterial(),
  );
  const mid = pivot(body, [0, 0, -0.03]);
  add(
    mid,
    cached("basilosaurus_mid", () =>
      loft(
        [
          [0, 0.055, 0.055],
          [0.15, 0.05, 0.052],
          [0.29, 0.036, 0.038],
        ],
        "#696478",
        belly,
      ),
    ),
    vertexMaterial(),
  );
  const tail = pivot(mid, [0, 0, 0.24]);
  add(
    tail,
    cached("basilosaurus_tail", () =>
      loft(
        [
          [0, 0.041, 0.042],
          [0.13, 0.019, 0.025],
          [0.25, 0.004, 0.006],
        ],
        "#696478",
        belly,
      ),
    ),
    vertexMaterial(),
  );
  fin(
    tail,
    "basilosaurus_fluke",
    [
      [0, 0, 0.22],
      [-0.105, 0, 0.25],
      [-0.065, 0, 0.18],
      [0, 0, 0.14],
      [0.065, 0, 0.18],
      [0.105, 0, 0.25],
    ],
    back,
  );
  motions.push((t, e) => {
    mid.rotation.x = Math.sin(t * 0.8) * 0.11;
    tail.rotation.x = Math.sin(t * 0.8 - 0.7) * (0.16 + e * 0.025);
  });
  eyes(body, 0.041, 0.021, -0.382, 0.009);
  jaw(body, "basilosaurus_jaw", 0.026, -0.025, -0.405, 0.09, 10);
  for (const side of [-1, 1]) {
    fin(
      body,
      `basilosaurus_front_${side}`,
      [
        [side * 0.057, -0.025, -0.27],
        [side * 0.13, -0.048, -0.19],
        [side * 0.071, -0.045, -0.13],
      ],
      back,
    );
    fin(
      mid,
      `basilosaurus_hind_${side}`,
      [
        [side * 0.05, -0.025, 0.11],
        [side * 0.078, -0.047, 0.14],
        [side * 0.052, -0.051, 0.18],
      ],
      back,
    );
  }
}

function material(color, roughness = 0.46) {
  const key = `${color}_${roughness}`;
  if (!MATERIALS.has(key))
    MATERIALS.set(
      key,
      skinMaterial({
        color,
        roughness,
        metalness: 0.015,
        side: THREE.DoubleSide,
      }),
    );
  return MATERIALS.get(key);
}
function schoolMaterial(kind) {
  const key = `school_skin_${kind}`;
  if (!MATERIALS.has(key)) {
    const mat = skinMaterial({
      vertexColors: true,
      roughness: 0.31,
      metalness: 0.1,
      clearcoat: 0.25,
      pattern: 0.005,
    });
    const compile = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader) => {
      compile(shader);
      const pattern =
        kind === "mackerel"
          ? `
        float stripe = 1.0 - smoothstep(0.38,0.68,abs(sin(vSkinPosition.z*142.0+sin(vSkinPosition.x*72.0)*1.9)));
        stripe *= smoothstep(0.025,0.078,vSkinPosition.y)*smoothstep(-0.3,-0.2,vSkinPosition.z)*(1.0-smoothstep(0.2,0.3,vSkinPosition.z));
        diffuseColor.rgb *= 1.0 - stripe*0.56;
      `
          : kind === "sardine"
            ? `
        float spotZ=mod(vSkinPosition.z+0.17,0.065)-0.0325;
        float spot=1.0-smoothstep(0.006,0.011,length(vec2(spotZ,vSkinPosition.y-0.026)));
        spot*=smoothstep(-0.22,-0.16,vSkinPosition.z)*(1.0-smoothstep(0.17,0.22,vSkinPosition.z));
        diffuseColor.rgb*=1.0-spot*0.65;
      `
            : "";
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        pattern + "\n#include <roughnessmap_fragment>",
      );
    };
    mat.customProgramCacheKey = () => key;
    MATERIALS.set(key, mat);
  }
  return MATERIALS.get(key);
}

function vertexMaterial() {
  if (!MATERIALS.has("vertex"))
    MATERIALS.set(
      "vertex",
      skinMaterial({
        vertexColors: true,
        roughness: 0.43,
        metalness: 0.015,
      }),
    );
  return MATERIALS.get("vertex");
}
function cached(key, make) {
  if (!GEOMETRIES.has(key)) GEOMETRIES.set(key, make());
  return GEOMETRIES.get(key);
}
function add(parent, geometry, mat) {
  const mesh = new THREE.Mesh(geometry, mat);
  parent.add(mesh);
  return mesh;
}
function pivot(parent, position) {
  const group = new THREE.Group();
  group.position.set(...position);
  parent.add(group);
  return group;
}
function ellipsoid(parent, mat, position, scale) {
  const mesh = add(parent, SPHERE, mat);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  return mesh;
}
function eyes(parent, x, y, z, radius) {
  for (const side of [-1, 1]) {
    ellipsoid(
      parent,
      PALE,
      [side * x, y, z],
      [radius * 1.2, radius * 1.2, radius * 1.2],
    );
    ellipsoid(
      parent,
      EYE,
      [side * (x + radius * 0.6), y, z - radius * 0.1],
      [radius * 0.7, radius * 0.8, radius * 0.9],
    );
  }
}
function fin(parent, key, points, mat) {
  const geometry = cached(key, () => {
    const horizontal = Math.max(...points.map((p) => Math.abs(p[0]))) > 0.001;
    const outline = points.map((p) => [p[2], horizontal ? p[0] : p[1]]);
    const g = sculptedFin(
      outline,
      0.009,
      horizontal ? "horizontal" : "vertical",
      {
        camber: 0.006,
        detail: /^(sardine|anchovy|herring|mackerel|flying_fish|fly_)/.test(key)
          ? 1
          : 2,
      },
    );
    if (horizontal)
      g.translate(
        0,
        points.reduce((sum, p) => sum + p[1], 0) / points.length,
        0,
      );
    return g;
  });
  return add(parent, geometry, mat);
}

function tube(parent, key, points, radius, mat) {
  return add(
    parent,
    cached(
      key,
      () =>
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(
            points.map((p) => new THREE.Vector3(...p)),
          ),
          /operculum|_lip_/.test(key) ? 4 : Math.max(4, points.length * 3),
          radius,
          /operculum|_lip_/.test(key) ? 3 : 4,
          false,
        ),
    ),
    mat,
  );
}
function jaw(parent, key, width, y, z, halfLength, teeth) {
  ellipsoid(parent, material("#26333b"), [0, y, z], [width, 0.023, halfLength]);
  for (const side of [-1, 1])
    for (let i = 0; i < teeth; i++) {
      const position = [
        side * width * (0.45 + Math.sin((i / (teeth - 1)) * Math.PI) * 0.42),
        y - 0.004,
        z - halfLength * 0.8 + (i / (teeth - 1)) * halfLength * 1.6,
      ];
      const tooth = add(
        parent,
        cached(`${key}_tooth`, () => new THREE.ConeGeometry(0.0045, 0.015, 5)),
        PALE,
      );
      tooth.position.set(...position);
      tooth.rotation.z = Math.PI;
    }
}
function loft(profile, upper, lower, options = {}) {
  const positions = [],
    colors = [],
    indices = [],
    sides = options.school ? 18 : 24,
    rings = (profile.length - 1) * (options.school ? 5 : 6);
  const top = new THREE.Color(upper),
    bottom = new THREE.Color(lower),
    color = new THREE.Color();
  for (let ring = 0; ring <= rings; ring++) {
    const z = THREE.MathUtils.lerp(
      profile[0][0],
      profile.at(-1)[0],
      ring / rings,
    );
    const [rx, ry, offset] = sampleSection(profile, z);
    for (let side = 0; side <= sides; side++) {
      const angle = (side / sides) * Math.PI * 2,
        y = Math.sin(angle);
      const exponent = options.squareFront
        ? THREE.MathUtils.lerp(
            0.66,
            1,
            THREE.MathUtils.smoothstep(z, -0.25, -0.08),
          )
        : 1;
      const xSection =
        Math.sign(Math.cos(angle)) * Math.abs(Math.cos(angle)) ** exponent;
      const ySection = Math.sign(y) * Math.abs(y) ** exponent;
      positions.push(xSection * rx, ySection * ry + offset, z);
      color
        .copy(top)
        .lerp(bottom, 1 - THREE.MathUtils.smoothstep(y, -0.48, 0.18));
      colors.push(color.r, color.g, color.b);
      if (ring < rings && side < sides) {
        const p = ring * (sides + 1) + side,
          q = p + sides + 1;
        indices.push(p, p + 1, q, p + 1, q + 1, q);
      }
    }
  }
  // 封闭首尾截面，近距离与碰撞射线不穿过模型端部。
  for (const end of [0, 1]) {
    const center = positions.length / 3;
    positions.push(0, 0, profile[end ? profile.length - 1 : 0][0]);
    colors.push(top.r, top.g, top.b);
    const base = end ? rings * (sides + 1) : 0;
    for (let side = 0; side < sides; side++) {
      if (end) indices.push(center, base + side, base + side + 1);
      else indices.push(center, base + side + 1, base + side);
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
