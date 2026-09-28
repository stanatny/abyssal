import * as THREE from "three";
import {
  sampleSection,
  sculptedFin,
  skinMaterial,
} from "./creature_surface.js";

/** 独立雕塑轮廓的深渊领主种类；名称仅用于现有模型分发。 */
export const LORD_CREATURE_KINDS = new Set([
  "kraken",
  "mayan",
  "hydra",
  "leviathan",
]);

/**
 * 创建朝向 -Z、Y 轴向上的深渊领主，纵向静态长度统一为一。
 * @param {string} kind 四种领主之一。
 * @param {THREE.Group} root 由调用方缩放和合批的根节点。
 * @param {Function[]} motions 接收累计游泳时间与运动强度的动作列表。
 * @returns {void} 共享网格资源，保留每个实例独立的动作节点。
 */
export function buildLordCreature(kind, root, motions) {
  const body = new THREE.Group();
  body.name = `${kind}_lord_anatomy`;
  root.add(body);
  if (kind === "kraken") buildKraken(body, motions);
  else if (kind === "mayan") buildMayan(body, motions);
  else if (kind === "hydra") buildHydra(body, motions);
  else if (kind === "leviathan") buildLeviathan(body, motions);
  else throw new Error(`Unknown abyssal lord: ${kind}`);
  body.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(body);
  const length = bounds.max.z - bounds.min.z;
  body.scale.setScalar(1 / length);
  body.position.z = -(bounds.max.z + bounds.min.z) / (2 * length);
}

const GEOMETRIES = new Map();
const SURFACE = skinMaterial({
  vertexColors: true,
  roughness: 0.46,
  pattern: 0.16,
});
const STONE = skinMaterial({
  vertexColors: true,
  roughness: 0.72,
  pattern: 0.25,
});
const METAL = skinMaterial({
  vertexColors: true,
  roughness: 0.5,
  metalness: 0.54,
  pattern: 0.14,
});
const DARK = new THREE.MeshStandardMaterial({
  color: "#080e1c",
  roughness: 0.38,
});
const VIOLET = new THREE.MeshStandardMaterial({
  color: "#b69ce0",
  emissive: "#683ca0",
  emissiveIntensity: 0.85,
  roughness: 0.34,
});
const AQUA = new THREE.MeshStandardMaterial({
  color: "#8fd7cc",
  emissive: "#36bcae",
  emissiveIntensity: 0.9,
  roughness: 0.3,
});
const AMBER = new THREE.MeshStandardMaterial({
  color: "#ecbd72",
  emissive: "#c77828",
  emissiveIntensity: 0.7,
  roughness: 0.38,
});

function buildKraken(body, motions) {
  const profile = [
    [-0.12, 0.12, 0.11],
    [-0.035, 0.21, 0.175],
    [0.14, 0.23, 0.225],
    [0.31, 0.185, 0.195],
    [0.44, 0.095, 0.12],
    [0.49, 0.001, 0.002],
  ];
  add(
    body,
    shape("kraken_mantle", profile, "#473959", "#8b6981", {
      ribs: 18,
      relief: 0.055,
      rings: 64,
      sides: 40,
      wrinkles: true,
    }),
    SURFACE,
    "kraken_ribbed_mantle",
  );
  // 褶皱直接雕在外套膜中，只有靠近眼窝的短缝发出暗紫光。
  for (const side of [-1, 1]) {
    const eye = ellipsoid(
      body,
      DARK,
      [side * 0.207, 0.045, -0.038],
      [0.032, 0.035, 0.044],
    );
    eye.rotation.z = -side * 0.2;
    ellipsoid(body, AMBER, [side * 0.232, 0.046, -0.05], [0.015, 0.022, 0.028]);
    ellipsoid(body, DARK, [side * 0.244, 0.047, -0.053], [0.006, 0.015, 0.009]);
    shell(
      body,
      `kraken_socket_${side}`,
      profile,
      -0.07,
      0.047,
      side === 1 ? 0.35 : Math.PI - 0.35,
      0.35,
      0.012,
      "#6b516d",
    );
    tube(
      body,
      `kraken_eye_seam_${side}`,
      [
        [side * 0.219, 0.087, -0.055],
        [side * 0.223, 0.103, -0.01],
        [side * 0.219, 0.118, 0.047],
      ],
      0.0017,
      0.0007,
      null,
      VIOLET,
      16,
      5,
    );
  }
  // 八腕的厚根部埋在头胸，前方中央保留可穿过的真实水域。
  for (let index = 0; index < 8; index++) {
    const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.cos(angle),
      y = Math.sin(angle),
      curl = index % 2 ? 1 : -1;
    const arm = group(body, `kraken_curled_arm_${index + 1}`, [
      x * 0.13,
      y * 0.1 - 0.015,
      -0.06,
    ]);
    const points = [
      [0, 0, 0],
      [x * 0.1, y * 0.09, -0.15],
      [x * 0.23, y * 0.18, -0.34],
      [x * 0.31, y * 0.26, -0.46],
      [x * 0.36 + curl * 0.014, y * 0.29, -0.35],
      [x * 0.32 + curl * 0.012, y * 0.26, -0.27],
      [x * 0.28, y * 0.23, -0.31],
    ];
    tube(
      arm,
      `kraken_arm_${index}`,
      points,
      0.06,
      0.002,
      "#725477",
      SURFACE,
      48,
      12,
      0.76,
    );
    const curve = curveFrom(points);
    for (let row = 0; row < 2; row++)
      for (let cup = 0; cup < 8; cup++) {
        const t = 0.09 + cup * 0.102;
        const point = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        const facing = new THREE.Vector3(-x, -y, -0.3)
          .projectOnPlane(tangent)
          .normalize();
        const sideways = new THREE.Vector3()
          .crossVectors(tangent, facing)
          .normalize();
        const radius = THREE.MathUtils.lerp(0.06, 0.002, t ** 0.76);
        const sucker = add(
          arm,
          colored(
            "kraken_sucker",
            () => new THREE.TorusGeometry(0.71, 0.29, 4, 8),
            "#bc96ab",
          ),
          SURFACE,
        );
        sucker.position
          .copy(point)
          .addScaledVector(facing, radius * 0.91)
          .addScaledVector(sideways, (row ? 1 : -1) * radius * 0.35);
        sucker.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          facing,
        );
        sucker.scale.setScalar(0.017 * (1 - t * 0.83));
      }
    motions.push((time, effort) => {
      const power = 0.9 - Math.min(effort, 3) * 0.12;
      arm.rotation.x = Math.sin(time * 0.3 + angle) * 0.085 * power;
      arm.rotation.y = Math.cos(time * 0.27 + angle) * 0.095 * power;
      arm.rotation.z = Math.sin(time * 0.24 + angle) * 0.09 * power;
    });
  }
}

function buildMayan(body, motions) {
  const profile = [
    [-0.29, 0.11, 0.11],
    [-0.17, 0.172, 0.16],
    [0.03, 0.166, 0.144],
    [0.22, 0.106, 0.09],
    [0.39, 0.026, 0.032],
    [0.44, 0.001, 0.001],
  ];
  add(
    body,
    shape("mayan_body", profile, "#214d47", "#5a8070", {
      ribs: 9,
      relief: 0.018,
    }),
    STONE,
    "mayan_jade_torso",
  );
  const skull = [
    [-0.555, 0.057, 0.032, 0.023],
    [-0.51, 0.089, 0.041, 0.027],
    [-0.415, 0.108, 0.047, 0.029],
    [-0.335, 0.148, 0.083, 0.052],
    [-0.24, 0.15, 0.099, 0.042],
    [-0.15, 0.082, 0.059, 0.035],
  ];
  add(
    body,
    shape("mayan_continuous_skull", skull, "#326957", "#648772", {
      ribs: 4,
      relief: 0.045,
    }),
    STONE,
    "mayan_carved_guardian_skull",
  );
  // 甲片沿躯干的实际曲面贴合，浅雕脊替代等间距悬浮石块。
  for (let row = 0; row < 7; row++)
    for (let sector = 0; sector < 7; sector++) {
      const z = -0.15 + row * 0.074 + (sector % 2) * 0.019;
      shell(
        body,
        `mayan_scale_${row}_${sector}`,
        profile,
        z - 0.045,
        z + 0.043,
        0.08 + sector * 0.5,
        0.29,
        0.009 * (1 - row * 0.07),
        row % 2 ? "#3c705c" : "#477c64",
        STONE,
      );
    }
  for (let row = 0; row < 3; row++) {
    const z = -0.42 + row * 0.077;
    shell(
      body,
      `mayan_face_relief_${row}`,
      skull,
      z - 0.036,
      z + 0.049,
      Math.PI / 2,
      0.64,
      0.009,
      "#58896c",
      STONE,
    );
  }
  // 宽肩胸甲与金色刻纹沿实体曲面包覆，不扩张隐形碰撞体积。
  for (let panel = 0; panel < 7; panel++) {
    const angle = -0.1 + panel * 0.56;
    shell(
      body,
      `mayan_chest_plate_${panel}`,
      profile,
      -0.232,
      -0.082,
      angle,
      0.35,
      0.023,
      "#507e60",
      STONE,
    );
    shell(
      body,
      `mayan_chest_gold_${panel}`,
      profile,
      -0.148,
      -0.131,
      angle,
      0.34,
      0.026,
      "#c5a567",
      METAL,
    );
  }
  for (const side of [-1, 1]) {
    const center = side === 1 ? 0.34 : Math.PI - 0.34;
    // 折线由嵌入表面的窄片构成，粗度不会读成绕身圆管。
    shell(
      body,
      `mayan_chest_rune_a_${side}`,
      profile,
      -0.21,
      -0.163,
      center,
      0.027,
      0.024,
      "#d1ae6c",
      METAL,
    );
    shell(
      body,
      `mayan_chest_rune_b_${side}`,
      profile,
      -0.174,
      -0.163,
      center + side * 0.11,
      0.13,
      0.028,
      "#d1ae6c",
      METAL,
    );
    shell(
      body,
      `mayan_chest_rune_c_${side}`,
      profile,
      -0.174,
      -0.119,
      center + side * 0.24,
      0.029,
      0.025,
      "#d1ae6c",
      METAL,
    );
  }
  const jaw = group(body, "mayan_sculpted_jaw", [0, -0.075, -0.23]);
  add(
    jaw,
    shape(
      "mayan_jaw",
      [
        [-0.32, 0.051, 0.012],
        [-0.27, 0.079, 0.024],
        [-0.18, 0.101, 0.029],
        [-0.08, 0.127, 0.035],
        [0.019, 0.1, 0.047],
      ],
      "#355e50",
      "#77927b",
    ),
    STONE,
  );
  ellipsoid(body, DARK, [0, -0.031, -0.35], [0.095, 0.024, 0.082]);
  for (const side of [-1, 1]) {
    ellipsoid(body, DARK, [side * 0.133, 0.071, -0.339], [0.029, 0.022, 0.038]);
    ellipsoid(body, AQUA, [side * 0.154, 0.071, -0.352], [0.009, 0.009, 0.019]);
    shell(
      body,
      `mayan_brow_${side}`,
      skull,
      -0.38,
      -0.245,
      side === 1 ? 0.65 : Math.PI - 0.65,
      0.25,
      0.024,
      "#689176",
      STONE,
    );
    // 短厚的三级石冠和嵌金阶梯纹，让守护兽与尖长的海兽剪影分开。
    const crest = fin(
      body,
      `mayan_temple_crest_${side}`,
      [
        [-0.305, 0.083],
        [-0.305, 0.185],
        [-0.27, 0.185],
        [-0.27, 0.234],
        [-0.22, 0.234],
        [-0.22, 0.277],
        [-0.165, 0.277],
        [-0.165, 0.197],
        [-0.105, 0.197],
        [-0.105, 0.135],
        [-0.162, 0.098],
      ],
      0.045,
      "vertical",
      "#48765b",
      STONE,
      false,
    );
    crest.position.x = side * 0.112;
    crest.rotation.z = -side * 0.16;
    const inlay = fin(
      body,
      `mayan_crest_gold_${side}`,
      [
        [-0.29, 0.165],
        [-0.29, 0.172],
        [-0.257, 0.172],
        [-0.257, 0.22],
        [-0.207, 0.22],
        [-0.207, 0.258],
        [-0.179, 0.258],
        [-0.179, 0.248],
        [-0.197, 0.248],
        [-0.197, 0.21],
        [-0.247, 0.21],
        [-0.247, 0.161],
      ],
      0.006,
      "vertical",
      "#d6b677",
      METAL,
      false,
    );
    inlay.position.x = side * 0.137;
    inlay.rotation.z = -side * 0.16;
    const seal = fin(
      body,
      `mayan_crown_seal_${side}`,
      [
        [-0.232, 0.147],
        [-0.221, 0.171],
        [-0.202, 0.159],
        [-0.193, 0.176],
        [-0.18, 0.169],
        [-0.192, 0.143],
        [-0.211, 0.154],
        [-0.22, 0.136],
      ],
      0.006,
      "vertical",
      "#c8a564",
      METAL,
      false,
    );
    seal.position.x = side * 0.137;
    seal.rotation.z = -side * 0.16;
    for (let tooth = 0; tooth < 8; tooth++) {
      const z = -0.523 + tooth * 0.026,
        [rx, ry, cy] = sampleSection(skull, z);
      const x = side * rx * 0.84;
      fang(
        body,
        `mayan_upper_fang_${side}_${tooth}`,
        [x, cy - ry * 0.68, z],
        [x * 0.94, -0.067 - (tooth % 3 === 0 ? 0.016 : 0), z - 0.004],
        tooth % 3 === 0 ? 0.006 : 0.0035,
      );
      fang(
        jaw,
        `mayan_lower_fang_${side}_${tooth}`,
        [x * 0.94, 0.023, z + 0.23],
        [x * 0.9, 0.053, z + 0.226],
        0.0035,
      );
    }
    const flipper = group(body, `mayan_stone_flipper_${side}`, [
      side * 0.105,
      -0.077,
      -0.08,
    ]);
    fin(
      flipper,
      `mayan_flipper_${side}`,
      [
        [0, 0],
        [0.058, side * 0.105],
        [0.18, side * 0.185],
        [0.16, side * 0.105],
        [0.1, side * 0.016],
      ],
      0.039,
      "horizontal",
      "#365f51",
      STONE,
      true,
    );
    // 暗色浮雕沟与极细裂纹贴着石甲，金色仅留在局部符形中。
    for (let crack = 0; crack < 3; crack++) {
      const z = -0.085 + crack * 0.12;
      const points = [0, 0.018, 0.033, 0.054].map((dz, i) => {
        const [rx, ry] = sampleSection(profile, z + dz);
        const angle =
          side === 1 ? 0.36 + (i % 2) * 0.06 : Math.PI - 0.36 - (i % 2) * 0.06;
        return [
          Math.cos(angle) * (rx + 0.009),
          Math.sin(angle) * (ry + 0.009),
          z + dz,
        ];
      });
      tube(
        body,
        `mayan_micro_crack_${side}_${crack}`,
        points,
        0.0012,
        0.0006,
        null,
        AQUA,
        12,
        4,
      );
    }
    motions.push((time) => {
      flipper.rotation.z = side * Math.sin(time * 0.39) * 0.045;
    });
  }
  const core = ellipsoid(body, AQUA, [0, 0.153, -0.12], [0.021, 0.009, 0.036]);
  core.name = "mayan_recessed_core";
  for (const side of [-1, 1])
    shell(
      body,
      `mayan_core_gold_${side}`,
      profile,
      -0.16,
      -0.08,
      Math.PI / 2 + side * 0.15,
      0.038,
      0.011,
      "#a79158",
      METAL,
    );
  const tail = group(body, "mayan_tail", [0, 0, 0.37]);
  fin(
    tail,
    "mayan_tail_fin",
    [
      [-0.025, 0],
      [0.04, -0.06],
      [0.16, -0.11],
      [0.1, 0],
      [0.16, 0.11],
      [0.04, 0.06],
    ],
    0.022,
    "horizontal",
    "#416d5f",
    STONE,
    true,
  );
  motions.push((time, effort) => {
    tail.rotation.y = Math.sin(time * 0.58) * (0.09 + effort * 0.02);
    jaw.rotation.x = -0.055 - Math.sin(time * 0.27) * 0.016;
  });
}

function buildHydra(body, motions) {
  const profile = [
    [-0.13, 0.095, 0.09],
    [0, 0.17, 0.15],
    [0.18, 0.14, 0.135],
    [0.32, 0.075, 0.075],
    [0.47, 0.01, 0.014],
    [0.5, 0.001, 0.001],
  ];
  add(
    body,
    shape("hydra_torso", profile, "#254e50", "#699084", {
      ribs: 9,
      relief: 0.018,
    }),
    SURFACE,
    "hydra_broad_torso",
  );
  for (let row = 0; row < 5; row++) {
    const z = 0.015 + row * 0.077,
      [rx, ry] = sampleSection(profile, z);
    const scute = add(
      body,
      armor(`hydra_scute_${row}`, rx * 0.58, 0.018, 0.077, "#52766d"),
      SURFACE,
    );
    scute.position.set(0, ry * 0.96, z);
  }
  fin(
    body,
    "hydra_dorsal_sail",
    [
      [-0.03, 0.12],
      [0.04, 0.31],
      [0.12, 0.21],
      [0.19, 0.28],
      [0.24, 0.15],
      [0.33, 0.18],
      [0.43, 0.045],
      [0.24, 0.065],
    ],
    0.013,
    "vertical",
    "#668c77",
    SURFACE,
    false,
  );
  for (const side of [-1, 1])
    fin(
      body,
      `hydra_flipper_${side}`,
      [
        [-0.02, side * 0.1],
        [0.11, side * 0.35],
        [0.18, side * 0.28],
        [0.23, side * 0.12],
      ],
      0.018,
      "horizontal",
      "#3f6e66",
    );
  const tail = group(body, "hydra_tail", [0, 0, 0.43]);
  fin(
    tail,
    "hydra_tail_fin",
    [
      [0, 0],
      [0.12, -0.13],
      [0.17, -0.1],
      [0.1, 0],
      [0.17, 0.1],
      [0.12, 0.13],
    ],
    0.012,
    "vertical",
    "#5d8b78",
  );
  motions.push((time, effort) => {
    tail.rotation.y = Math.sin(time * 0.72) * (0.13 + effort * 0.025);
  });
  for (let index = 0; index < 3; index++) {
    const side = index - 1;
    const neck = group(body, `hydra_neck_${index + 1}`, [
      side * 0.086,
      0.04,
      -0.035,
    ]);
    const points =
      side === 0
        ? [
            [0, -0.02, 0.065],
            [0, 0.12, 0],
            [0, 0.27, -0.11],
            [0, 0.305, -0.26],
          ]
        : [
            [side * 0.02, -0.04, 0.1],
            [side * 0.085, 0.055, -0.01],
            [side * 0.18, 0.12, -0.13],
            [side * 0.205, 0.175, -0.29],
          ];
    tube(
      neck,
      `hydra_neck_surface_${index}`,
      points,
      0.066,
      0.039,
      "#416e64",
      SURFACE,
      40,
      14,
      0.7,
    );
    // 腹部甲节顺着颈线生长，颜色与厚度随颈部收细。
    const curve = curveFrom(points);
    for (let band = 1; band < 9; band++) {
      const t = band / 10,
        center = curve.getPointAt(t),
        tangent = curve.getTangentAt(t);
      const plate = add(
        neck,
        armor(
          `hydra_neck_band_${index}_${band}`,
          0.041 * (1 - t * 0.32),
          0.008,
          0.029,
          "#9aa581",
        ),
        SURFACE,
      );
      plate.position.copy(center).add(new THREE.Vector3(0, -0.028, -0.02));
      plate.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    }
    for (let ridge = 0; ridge < 9; ridge++) {
      const t = 0.13 + ridge * 0.084,
        center = curve.getPointAt(t),
        tangent = curve.getTangentAt(t);
      const radius = THREE.MathUtils.lerp(0.066, 0.039, t ** 0.7);
      const normal = new THREE.Vector3(0, 1, 0)
        .projectOnPlane(tangent)
        .normalize();
      const scute = add(
        neck,
        armor(
          `hydra_dorsal_neck_scale_${index}_${ridge}`,
          0.029 * (1 - t * 0.22),
          0.013,
          0.045,
          "#6a8c73",
        ),
        SURFACE,
      );
      scute.position.copy(center).addScaledVector(normal, radius * 0.92);
      const lateral = new THREE.Vector3()
        .crossVectors(normal, tangent)
        .normalize();
      scute.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(lateral, normal, tangent),
      );
    }
    const head = group(neck, `hydra_dragon_head_${index + 1}`, points.at(-1));
    const skull = [
      [-0.17, 0.029, 0.027, 0.008],
      [-0.135, 0.044, 0.037, 0.011],
      [-0.07, 0.057, 0.047, 0.008],
      [0.005, 0.045, 0.044],
      [0.042, 0.008, 0.015],
    ];
    add(
      head,
      shape(`hydra_skull_${index}`, skull, "#416b63", "#849f84", {
        ribs: 5,
        relief: 0.025,
        rings: 30,
        sides: 20,
      }),
      SURFACE,
      "hydra_carved_skull",
    );
    ellipsoid(head, DARK, [0, -0.022, -0.107], [0.037, 0.012, 0.065]);
    const jaw = group(head, `hydra_jaw_${index + 1}`, [0, -0.052, -0.005]);
    add(
      jaw,
      shape(
        `hydra_jaw_surface_${index}`,
        [
          [-0.162, 0.023, 0.014],
          [-0.12, 0.035, 0.02],
          [-0.05, 0.042, 0.024],
          [0.007, 0.023, 0.011],
        ],
        "#859478",
        "#b1b695",
      ),
      SURFACE,
    );
    for (const eyeSide of [-1, 1]) {
      ellipsoid(
        head,
        DARK,
        [eyeSide * 0.058, 0.018, -0.09],
        [0.014, 0.013, 0.022],
      );
      ellipsoid(
        head,
        AMBER,
        [eyeSide * 0.069, 0.019, -0.094],
        [0.008, 0.008, 0.015],
      );
      ellipsoid(
        head,
        DARK,
        [eyeSide * 0.075, 0.019, -0.097],
        [0.003, 0.006, 0.004],
      );
      shell(
        head,
        `hydra_brow_${index}_${eyeSide}`,
        skull,
        -0.114,
        0.025,
        eyeSide === 1 ? 0.63 : Math.PI - 0.63,
        0.24,
        0.014,
        "#6d9078",
      );
      tube(
        head,
        `hydra_horn_${index}_${eyeSide}`,
        [
          [eyeSide * 0.029, 0.03, 0],
          [eyeSide * 0.055, 0.078, 0.055],
          [eyeSide * 0.069, 0.095, 0.12],
        ],
        0.014,
        0.001,
        "#bec1a0",
        SURFACE,
        24,
        8,
      );
      fin(
        head,
        `hydra_web_${index}_${eyeSide}`,
        [
          [-0.015, 0.012],
          [0.07, 0.076],
          [0.105, 0.045],
          [0.085, -0.016],
          [0.02, -0.019],
        ],
        0.007,
        "vertical",
        "#638d78",
        SURFACE,
        false,
      ).position.x = eyeSide * 0.05;
      for (let tooth = 0; tooth < 4; tooth++) {
        const z = -0.055 - tooth * 0.026,
          x = eyeSide * (0.035 - tooth * 0.003);
        fang(
          head,
          `hydra_upper_tooth_${index}_${eyeSide}_${tooth}`,
          [x, -0.018, z],
          [x * 0.88, -0.067 - (tooth % 2) * 0.01, z - 0.01],
          tooth % 2 ? 0.0045 : 0.0065,
        );
        fang(
          jaw,
          `hydra_lower_tooth_${index}_${eyeSide}_${tooth}`,
          [x * 0.85, 0.018, z],
          [x * 0.8, 0.042, z - 0.005],
          0.003,
        );
      }
    }
    motions.push((time, effort) => {
      const yaw = Math.sin(time * 0.32 + index * 1.9) * 0.065;
      const pitch =
        Math.cos(time * 0.28 + index * 1.6) * 0.045 - effort * 0.009;
      neck.rotation.set(pitch, yaw, Math.sin(time * 0.21 + index) * 0.025);
      head.rotation.y = -yaw * 0.7;
      jaw.rotation.x = -0.11 - Math.sin(time * 0.42 + index) * 0.055;
    });
  }
}

function buildLeviathan(body, motions) {
  const profile = [
    [-0.29, 0.1, 0.11, 0],
    [-0.18, 0.172, 0.154, 0.004],
    [0.02, 0.146, 0.139, 0],
    [0.22, 0.087, 0.084, 0],
    [0.4, 0.036, 0.039, 0],
    [0.53, 0.001, 0.002, 0],
  ];
  add(
    body,
    shape("leviathan_torso", profile, "#122f43", "#456876", {
      ribs: 8,
      relief: 0.02,
    }),
    SURFACE,
    "leviathan_armored_torso",
  );
  const skull = [
    [-0.565, 0.045, 0.028, 0.031],
    [-0.516, 0.085, 0.042, 0.039],
    [-0.425, 0.113, 0.052, 0.052],
    [-0.34, 0.151, 0.08, 0.061],
    [-0.23, 0.174, 0.111, 0.036],
    [-0.13, 0.114, 0.093, 0.01],
  ];
  add(
    body,
    shape("leviathan_sculpted_skull", skull, "#244c61", "#577682", {
      ribs: 5,
      relief: 0.055,
    }),
    SURFACE,
    "leviathan_predator_skull",
  );
  // 贴合身体的细鳞与头骨的大板采用同一曲面坐标，保持装甲的连续重量感。
  for (let row = 0; row < 9; row++)
    for (let sector = 0; sector < 7; sector++) {
      const z = -0.14 + row * 0.064 + (sector % 2) * 0.018;
      shell(
        body,
        `leviathan_scale_${row}_${sector}`,
        profile,
        z - 0.035,
        z + 0.041,
        0.04 + sector * 0.52,
        0.28,
        0.0075,
        "#2f5266",
      );
    }
  for (let row = 0; row < 4; row++) {
    const z = -0.455 + row * 0.072;
    shell(
      body,
      `leviathan_skull_plate_${row}`,
      skull,
      z - 0.035,
      z + 0.064,
      Math.PI / 2,
      0.68,
      0.016 + row * 0.004,
      "#40677b",
    );
  }
  const jaw = group(body, "leviathan_massive_jaw", [0, -0.088, -0.225]);
  add(
    jaw,
    shape(
      "leviathan_jaw",
      [
        [-0.333, 0.041, 0.015],
        [-0.282, 0.074, 0.032],
        [-0.186, 0.107, 0.039],
        [-0.085, 0.135, 0.044],
        [0.024, 0.105, 0.056],
      ],
      "#37586b",
      "#7e9192",
    ),
    SURFACE,
  );
  // 咽部深藏于后颌内，前半口腔是真正敞开的水域，牙列能显露完整轮廓。
  ellipsoid(body, DARK, [0, -0.032, -0.322], [0.093, 0.047, 0.059]);
  for (const side of [-1, 1]) {
    ellipsoid(body, DARK, [side * 0.14, 0.069, -0.34], [0.027, 0.024, 0.043]);
    ellipsoid(body, AQUA, [side * 0.16, 0.071, -0.354], [0.01, 0.008, 0.024]);
    shell(
      body,
      `leviathan_brow_${side}`,
      skull,
      -0.385,
      -0.224,
      side === 1 ? 0.58 : Math.PI - 0.58,
      0.22,
      0.023,
      "#607e8b",
    );
    // 冠部为后掠的厚骨刃，不再使用跨越空水域的圆管犄角。
    const crown = fin(
      body,
      `leviathan_crown_blade_${side}`,
      [
        [-0.327, 0.061],
        [-0.27, 0.126],
        [-0.18, 0.171],
        [-0.064, 0.21],
        [-0.104, 0.139],
        [0.036, 0.16],
        [-0.064, 0.077],
        [-0.2, 0.045],
      ],
      0.046,
      "vertical",
      "#426779",
      SURFACE,
      true,
    );
    crown.position.x = side * 0.135;
    crown.rotation.z = -side * 0.24;
    const crest = fin(
      body,
      `leviathan_crown_inner_${side}`,
      [
        [-0.265, 0.085],
        [-0.19, 0.173],
        [-0.08, 0.201],
        [-0.115, 0.113],
        [-0.04, 0.13],
        [-0.15, 0.06],
      ],
      0.025,
      "vertical",
      "#60808c",
      SURFACE,
      true,
    );
    crest.position.x = side * 0.094;
    crest.rotation.z = -side * 0.16;
    for (let tooth = 0; tooth < 8; tooth++) {
      const z = -0.529 + tooth * 0.03,
        [rx, ry, cy] = sampleSection(skull, z),
        x = side * rx * 0.85;
      const large = tooth === 2 || tooth === 5;
      fang(
        body,
        `leviathan_upper_fang_${side}_${tooth}`,
        [x, cy - ry * 0.68, z],
        [x * 0.88, -0.087 - (large ? 0.038 : 0), z - 0.017],
        large ? 0.01 : 0.005,
      );
      fang(
        jaw,
        `leviathan_lower_fang_${side}_${tooth}`,
        [x * 0.91, 0.029, z + 0.225],
        [x * 0.84, 0.06 + (large ? 0.026 : 0), z + 0.218],
        large ? 0.007 : 0.004,
      );
    }
    for (let band = 0; band < 5; band++) {
      const z = -0.1 + band * 0.102;
      const points = [0, 0.025, 0.055].map((dz, i) => {
        const [x, y] = sampleSection(profile, z + dz);
        return [side * (x + 0.008), y * (0.13 + (i % 2) * 0.04), z + dz];
      });
      tube(
        body,
        `leviathan_glow_seam_${side}_${band}`,
        points,
        0.0014,
        0.0005,
        null,
        AQUA,
        12,
        4,
      );
    }
    for (let slit = 0; slit < 4; slit++) {
      const z = -0.164 + slit * 0.027,
        [rx, ry] = sampleSection(profile, z);
      tube(
        body,
        `leviathan_gill_${side}_${slit}`,
        [
          [side * rx * 0.96, ry * 0.2, z],
          [side * rx * 1.007, -0.008, z + 0.004],
          [side * rx * 0.86, -ry * 0.43, z + 0.012],
        ],
        0.0028,
        0.0015,
        null,
        DARK,
        12,
        5,
      );
    }
    const flipper = group(body, `leviathan_flipper_${side}`, [
      side * 0.115,
      -0.07,
      -0.102,
    ]);
    fin(
      flipper,
      `leviathan_swept_flipper_${side}`,
      [
        [0, 0],
        [0.04, side * 0.12],
        [0.23, side * 0.265],
        [0.18, side * 0.135],
        [0.09, side * 0.025],
      ],
      0.034,
      "horizontal",
      "#335769",
      SURFACE,
      true,
    );
    motions.push((time) => {
      flipper.rotation.z = side * Math.sin(time * 0.4) * 0.065;
    });
  }
  const sail = [[-0.14, 0.12]];
  for (let ridge = 0; ridge < 6; ridge++) {
    const z = -0.11 + ridge * 0.093,
      [, y] = sampleSection(profile, z);
    sail.push(
      [z, y * 0.88],
      [z + 0.072, y + 0.075 * (1 - ridge / 8)],
      [z + 0.073, y * 0.77],
    );
  }
  sail.push([0.5, 0.008]);
  fin(
    body,
    "leviathan_sweeping_spine",
    sail,
    0.024,
    "vertical",
    "#4e7284",
    SURFACE,
    true,
  );
  const tail = group(body, "leviathan_tail", [0, 0, 0.465]);
  fin(
    tail,
    "leviathan_crescent_tail",
    [
      [0, 0],
      [0.04, -0.08],
      [0.025, -0.205],
      [0.11, -0.16],
      [0.14, 0],
      [0.11, 0.16],
      [0.025, 0.205],
      [0.04, 0.08],
    ],
    0.025,
    "horizontal",
    "#416879",
  );
  motions.push((time, effort) => {
    tail.rotation.x = Math.sin(time * 0.6) * (0.12 + effort * 0.025);
    jaw.rotation.x = -0.1 + Math.sin(time * 0.29) * 0.015;
  });
}

// 几何缓存只包含确定性形状；节点变换与动作闭包永不跨实例共享。
function cached(key, build) {
  if (!GEOMETRIES.has(key)) {
    const geometry = build();
    geometry.deleteAttribute("uv");
    geometry.computeBoundingSphere();
    GEOMETRIES.set(key, geometry);
  }
  return GEOMETRIES.get(key);
}

function add(parent, geometry, material = SURFACE, name = "") {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function group(parent, name, position) {
  const node = new THREE.Group();
  node.name = name;
  node.position.set(...position);
  parent.add(node);
  return node;
}

function colorize(geometry, color, belly = color) {
  const positions = geometry.getAttribute("position"),
    colors = [];
  const top = new THREE.Color(color),
    bottom = new THREE.Color(belly),
    shade = new THREE.Color();
  geometry.computeBoundingBox();
  const height = Math.max(
    0.001,
    geometry.boundingBox.max.y - geometry.boundingBox.min.y,
  );
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      z = positions.getZ(i);
    const mottling =
      Math.sin(x * 103 + Math.sin(z * 49)) * Math.sin(y * 89 - z * 57);
    const underside = THREE.MathUtils.smoothstep(
      (geometry.boundingBox.max.y - y) / height,
      0.4,
      1,
    );
    shade
      .copy(top)
      .lerp(bottom, underside * 0.8)
      .multiplyScalar(1 + mottling * 0.09);
    colors.push(shade.r, shade.g, shade.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function colored(key, build, color, belly = color) {
  return cached(key, () => colorize(build(), color, belly));
}

function ellipsoid(parent, material, position, scale) {
  const mesh = add(
    parent,
    cached("eye_sphere", () => new THREE.SphereGeometry(1, 16, 10)),
    material,
  );
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  return mesh;
}

function shape(key, profile, color, belly, options = {}) {
  return colored(
    key,
    () => {
      const positions = [],
        indices = [],
        rings = options.rings || 40,
        sides = options.sides || 24;
      const start = profile[0][0],
        end = profile.at(-1)[0];
      for (let i = 0; i <= rings; i++) {
        const z = THREE.MathUtils.lerp(start, end, i / rings),
          [rx, ry, cy] = sampleSection(profile, z);
        for (let j = 0; j <= sides; j++) {
          const angle = (j / sides) * Math.PI * 2;
          const relief =
            1 +
            (options.relief || 0) *
              Math.cos(angle * (options.ribs || 8) + z * 7) *
              Math.sin((i / rings) * Math.PI) +
            (options.wrinkles
              ? 0.013 *
                Math.sin(z * 146 + Math.sin(angle * 11) * 1.7) *
                Math.sin((i / rings) * Math.PI)
              : 0);
          positions.push(
            Math.cos(angle) * rx * relief,
            cy + Math.sin(angle) * ry * relief,
            z,
          );
        }
      }
      for (let i = 0; i < rings; i++)
        for (let j = 0; j < sides; j++) {
          const a = i * (sides + 1) + j,
            b = a + sides + 1;
          indices.push(a, a + 1, b, a + 1, b + 1, b);
        }
      // 两端封口是可见主体的一部分，接触判定不另加透明代理体积。
      for (const [ring, direction] of [
        [0, -1],
        [rings, 1],
      ]) {
        const center = positions.length / 3;
        positions.push(
          0,
          sampleSection(profile, ring === 0 ? start : end)[2],
          ring === 0 ? start : end,
        );
        for (let j = 0; j < sides; j++) {
          const a = ring * (sides + 1) + j;
          indices.push(
            center,
            direction === 1 ? a : a + 1,
            direction === 1 ? a + 1 : a,
          );
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
    },
    color,
    belly,
  );
}

function curveFrom(points) {
  return new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    false,
    "centripetal",
  );
}

function tube(
  parent,
  key,
  points,
  base,
  tip,
  color,
  material = SURFACE,
  segments = 24,
  sides = 8,
  power = 1,
) {
  const geometry = cached(key, () => {
    const curve = curveFrom(points),
      frames = curve.computeFrenetFrames(segments, false),
      positions = [],
      indices = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments,
        center = curve.getPointAt(t),
        radius = THREE.MathUtils.lerp(base, tip, t ** power);
      for (let j = 0; j <= sides; j++) {
        const angle = (j / sides) * Math.PI * 2;
        const point = center
          .clone()
          .addScaledVector(frames.normals[i], Math.cos(angle) * radius)
          .addScaledVector(frames.binormals[i], Math.sin(angle) * radius);
        positions.push(point.x, point.y, point.z);
      }
    }
    for (let i = 0; i < segments; i++)
      for (let j = 0; j < sides; j++) {
        const a = i * (sides + 1) + j,
          b = a + sides + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    for (const [ring, reverse] of [
      [0, true],
      [segments, false],
    ]) {
      const center = positions.length / 3,
        point = curve.getPointAt(ring / segments);
      positions.push(point.x, point.y, point.z);
      for (let j = 0; j < sides; j++) {
        const a = ring * (sides + 1) + j;
        indices.push(center, reverse ? a + 1 : a, reverse ? a : a + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return color ? colorize(geometry, color) : geometry;
  });
  return add(parent, geometry, material);
}

function armor(key, width, height, length, color) {
  return colored(
    key,
    () => {
      // 斜切六边甲片，顶面中脊与折边由实体顶点塑形，避免平面贴纸感。
      const outline = [
        [-width * 0.65, -length * 0.5],
        [width * 0.65, -length * 0.5],
        [width, length * 0.12],
        [width * 0.55, length * 0.5],
        [-width * 0.55, length * 0.5],
        [-width, length * 0.12],
      ];
      const positions = [0, height, 0, 0, -height * 0.35, 0],
        indices = [];
      for (const [x, z] of outline) positions.push(x, height * 0.08, z);
      for (let i = 0; i < 6; i++) {
        const a = 2 + i,
          b = 2 + ((i + 1) % 6);
        indices.push(0, b, a, 1, a, b);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    },
    color,
  );
}

function fin(
  parent,
  key,
  outline,
  thickness,
  orientation,
  color,
  material = SURFACE,
  smooth = true,
) {
  return add(
    parent,
    colored(
      key,
      () =>
        sculptedFin(outline, thickness, orientation, {
          smooth,
          detail: 1,
          camber: thickness * 0.28,
        }),
      color,
    ),
    material,
  );
}

function fang(parent, key, base, tip, radius) {
  const middle = new THREE.Vector3(...base).lerp(
    new THREE.Vector3(...tip),
    0.58,
  );
  middle.z += radius;
  tube(
    parent,
    key,
    [base, middle.toArray(), tip],
    radius,
    0.0002,
    "#c8cab0",
    SURFACE,
    8,
    6,
  );
}

/** 贴着连续截面的浅浮雕甲壳，边缘埋入皮肤，顶面和底面共同闭合。 */
function shell(
  parent,
  key,
  profile,
  start,
  end,
  angle,
  halfAngle,
  height,
  color,
  material = SURFACE,
) {
  const geometry = colored(
    key,
    () => {
      const positions = [],
        indices = [],
        rings = 4,
        sides = 6,
        stride = sides + 1,
        layerSize = (rings + 1) * stride;
      for (let layer = 0; layer < 2; layer++)
        for (let v = 0; v <= rings; v++)
          for (let u = 0; u <= sides; u++) {
            const t = v / rings,
              q = (u / sides) * 2 - 1;
            const z =
              THREE.MathUtils.lerp(start, end, t) +
              Math.abs(q) * (end - start) * 0.11;
            const a =
              angle + q * halfAngle * (0.69 + Math.sin(t * Math.PI) * 0.31);
            const [rx, ry, cy] = sampleSection(profile, z);
            const edge = Math.sin((u / sides) * Math.PI);
            const relief =
              layer === 0
                ? 0.002 +
                  height * Math.pow(edge, 0.55) * Math.sin(t * Math.PI * 0.92)
                : -0.004;
            positions.push(
              Math.cos(a) * (rx + relief),
              cy + Math.sin(a) * (ry + relief),
              z,
            );
          }
      for (let layer = 0; layer < 2; layer++)
        for (let v = 0; v < rings; v++)
          for (let u = 0; u < sides; u++) {
            const a = layer * layerSize + v * stride + u,
              b = a + stride;
            if (layer === 0) indices.push(a, a + 1, b, a + 1, b + 1, b);
            else indices.push(a, b, a + 1, a + 1, b, b + 1);
          }
      const border = [];
      for (let u = 0; u <= sides; u++) border.push(u);
      for (let v = 1; v <= rings; v++) border.push(v * stride + sides);
      for (let u = sides - 1; u >= 0; u--) border.push(rings * stride + u);
      for (let v = rings - 1; v > 0; v--) border.push(v * stride);
      for (let i = 0; i < border.length; i++) {
        const a = border[i],
          b = border[(i + 1) % border.length];
        indices.push(a, b + layerSize, b, a, a + layerSize, b + layerSize);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      g.setIndex(indices);
      g.computeVertexNormals();
      return g;
    },
    color,
  );
  return add(parent, geometry, material);
}
