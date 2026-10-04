import * as THREE from "three";
import { sampleSection } from "./creature_surface.js";
import { buildLuoSkyfish } from "./creature_penglai_luoyu.js";
import {
  pgMaterial as mat,
  pgOval as oval,
  pgTaper as taper,
  pgLoft as loft,
  pgFin as fin,
  pgEyes as eyes,
  pgFeather as feather,
} from "./creature_penglai_art.js";
const tones = {
  jade_minnow: "#68aa90",
  chiru: "#a24f3f",
  spirit_carp: "#c68143",
  dragon_carp: "#9a7839",
  wenyao: "#4c889a",
  luoyu: "#a18c4f",
};

/** 翼鱼、细身玉鱼、深体鲤鱼和人面赤鱬保留各自的头型与推进附肢。 */
export function buildPenglaiFish(kind, b, motions) {
  if (kind === "luoyu") return buildLuoSkyfish(b, motions);
  const winged = kind === "wenyao",
    carp = kind.includes("carp"),
    slim = kind === "jade_minnow";
  const skin = mat(tones[kind], 2),
    light = mat("#cfba87", 2),
    gold = mat("#b59755", 4),
    dark = mat("#283b3b");
  // 幻想鱼分别拥有细长、侧扁、锦鲤和深体金鲤轮廓，不能只换颜色。
  const profiles = {
    jade_minnow: [
      [-0.48, 0.003, 0.008],
      [-0.39, 0.018, 0.031],
      [-0.25, 0.038, 0.048],
      [-0.05, 0.044, 0.053],
      [0.19, 0.027, 0.037],
      [0.32, 0.008, 0.015],
      [0.36, 0.003, 0.008],
    ],
    chiru: [
      [-0.43, 0.012, 0.044],
      [-0.36, 0.047, 0.106],
      [-0.24, 0.076, 0.175],
      [-0.05, 0.075, 0.187],
      [0.13, 0.05, 0.13],
      [0.28, 0.022, 0.051],
      [0.36, 0.003, 0.017],
    ],
    spirit_carp: [
      [-0.46, 0.014, 0.02],
      [-0.39, 0.038, 0.045],
      [-0.25, 0.059, 0.086],
      [-0.075, 0.064, 0.105],
      [0.12, 0.05, 0.08],
      [0.29, 0.019, 0.034],
      [0.36, 0.004, 0.012],
    ],
    dragon_carp: [
      [-0.43, 0.014, 0.035],
      [-0.36, 0.062, 0.094],
      [-0.25, 0.106, 0.151],
      [-0.07, 0.115, 0.167],
      [0.12, 0.083, 0.12],
      [0.28, 0.025, 0.039],
      [0.36, 0.004, 0.015],
    ],
    wenyao: [
      [-0.43, 0.005, 0.014],
      [-0.365, 0.054, 0.067],
      [-0.24, 0.075, 0.085],
      [-0.02, 0.075, 0.08],
      [0.2, 0.045, 0.057],
      [0.33, 0.011, 0.017],
      [0.36, 0.002, 0.004],
    ],
  };
  const profile = profiles[kind];
  const surface = (z, latitude = 0) => {
    const [w, h, y] = sampleSection(profile, z);
    return [w * Math.sqrt(1 - latitude * latitude), y + h * latitude];
  };

  loft(b, `fish_v2_${kind}`, skin, profile);
  taper(
    b,
    light,
    [-0.33, -0.15, 0.08, 0.27].map((z) => {
      const [w, h, y] = sampleSection(profile, z);
      return [0, y - h * 0.96, z];
    }),
    [0.003, 0.004, 0.003, 0.001],
    "continuous_countershaded_belly",
  );
  if (kind !== "chiru") {
    const z =
      kind === "jade_minnow" ? -0.367 : kind === "spirit_carp" ? -0.35 : -0.326;
    const [x, y] = surface(z, 0.24);
    eyes(b, x, y, z, slim ? 0.006 : 0.008, false);
  }
  const nose = profile[0][0];
  taper(
    b,
    dark,
    [
      [0, -0.003, nose - 0.003],
      [0.024, -0.018, nose + 0.045],
      [0.031, -0.025, nose + 0.065],
    ],
    [0.0018, 0.002, 0.0004],
    "natural_mouth_fold",
  );
  for (const side of [-1, 1]) {
    taper(
      b,
      light,
      [0.64, 0, -0.68].map((latitude, i) => {
        const z = -0.28 + i * 0.017,
          [x, y] = surface(z, latitude);
        return [side * (x + 0.001), y, z];
      }),
      [0.0018, 0.002, 0.0008],
      "fitted_operculum",
    );
    const wing = new THREE.Group();
    const [wingX, wingY] = surface(-0.16, -0.3);
    wing.position.set(side * wingX, wingY, -0.16);
    wing.name = "articulated_pectoral";
    b.add(wing);
    if (winged) {
      taper(
        wing,
        skin,
        [
          [0, 0, 0],
          [side * 0.18, 0.015, 0.01],
          [side * 0.36, 0.01, -0.04],
        ],
        [0.028, 0.022, 0.011],
        "wing_fish_shoulder",
      );
      for (let j = 0; j < 14; j++) {
        const f = feather(
          wing,
          j < 5 ? light : skin,
          0.17 + Math.sin((j / 14) * Math.PI) * 0.14,
          0.023,
          0.02,
          "overlapping_wingfish_feather",
        );
        f.position.set(side * j * 0.025, 0, j * 0.009);
        f.rotation.y = side * (0.14 + j * 0.054);
      }
    } else {
      const f = fin(
        wing,
        light,
        [
          [0, 0],
          [side * (slim ? 0.095 : 0.16), -0.03],
          [side * (slim ? 0.08 : 0.12), -0.17],
          [side * 0.025, -0.05],
        ],
        0.009,
        "curved_pectoral_membrane",
      );
      f.rotation.x = -Math.PI / 2;
      for (let j = 0; j < 6; j++)
        taper(
          wing,
          gold,
          [
            [0, 0.004, 0],
            [side * (0.08 + j * 0.017), 0.006, 0.042 + j * 0.018],
          ],
          [0.0011, 0.0004],
          "pectoral_fin_ray",
        );
    }
    motions.push(
      (t) =>
        (wing.rotation.z =
          side * Math.sin(t * (winged ? 1.08 : 0.65)) * (winged ? 0.21 : 0.1)),
    );
    if (carp) {
      const barbelZ = nose + 0.046;
      const [barbelX, barbelY] = surface(barbelZ, -0.28);
      taper(
        b,
        gold,
        [
          [side * barbelX, barbelY, barbelZ],
          [side * 0.075, -0.06, -0.43],
          [side * 0.11, -0.076, -0.34],
          [side * 0.17, -0.05, -0.22],
        ],
        [0.0035, 0.003, 0.002, 0.0004],
        "long_carp_barbel",
      );
    }
  }
  if (kind === "wenyao") {
    loft(b, "white_wenyao_cranium", light, [
      [-0.49, 0.002, 0.01],
      [-0.39, 0.035, 0.036, 0.015],
      [-0.29, 0.063, 0.061, 0.011],
      [-0.25, 0.038, 0.035],
    ]);
    taper(
      b,
      mat("#98493b"),
      [
        [0, 0.012, -0.4],
        [0, -0.002, -0.49],
        [0, -0.015, -0.53],
      ],
      [0.026, 0.013, 0.0005],
      "red_wenyao_beak",
    );
    eyes(b, 0.037, 0.037, -0.377, 0.006);
  }
  if (kind === "chiru") {
    const face = loft(b, "chiru_human_mask", mat("#b99478"), [
      [-0.435, 0.002, 0.024],
      [-0.42, 0.04, 0.064, 0.026],
      [-0.382, 0.056, 0.064, 0.029],
      [-0.33, 0.057, 0.06],
    ]);
    for (const side of [-1, 1]) {
      oval(
        b,
        dark,
        [side * 0.026, 0.049, -0.426],
        [0.013, 0.004, 0.004],
        "forward_chiru_eye",
      );
      taper(
        b,
        light,
        [
          [side * 0.012, 0.065, -0.421],
          [side * 0.04, 0.073, -0.415],
        ],
        [0.004, 0.002],
        "human_mask_brow",
      );
    }
    taper(
      b,
      mat("#be977d"),
      [
        [0, 0.067, -0.418],
        [0, 0.024, -0.448],
      ],
      [0.006, 0.008],
      "human_mask_nose",
    );
    taper(
      b,
      dark,
      [
        [-0.021, -0.008, -0.432],
        [0, -0.014, -0.435],
        [0.021, -0.008, -0.432],
      ],
      [0.001, 0.002, 0.001],
      "human_mask_lips",
    );
    face.name = "carved_human_face_on_fish";
  }
  const tail = new THREE.Group();
  tail.position.z = 0.325;
  tail.name = "articulated_forked_caudal";
  b.add(tail);
  const outlines = {
    jade_minnow: [
      [0, 0],
      [0.095, 0.085],
      [0.15, 0.12],
      [0.09, 0.026],
      [0.045, 0],
      [0.09, -0.026],
      [0.15, -0.12],
      [0.095, -0.085],
    ],
    chiru: [
      [0, -0.01],
      [0.07, 0.15],
      [0.14, 0.21],
      [0.18, 0.13],
      [0.175, -0.13],
      [0.13, -0.2],
      [0.04, -0.085],
    ],
    spirit_carp: [
      [0, 0],
      [0.14, 0.09],
      [0.31, 0.21],
      [0.24, 0.075],
      [0.11, 0.015],
      [0.23, -0.075],
      [0.29, -0.17],
      [0.12, -0.05],
    ],
    dragon_carp: [
      [0, 0],
      [0.12, 0.115],
      [0.205, 0.155],
      [0.17, 0.042],
      [0.07, 0],
      [0.17, -0.042],
      [0.205, -0.155],
      [0.12, -0.115],
    ],
    wenyao: [
      [0, 0],
      [0.13, 0.15],
      [0.235, 0.195],
      [0.17, 0.054],
      [0.09, 0],
      [0.17, -0.054],
      [0.235, -0.195],
      [0.13, -0.15],
    ],
  };
  const caudal = fin(
    tail,
    light,
    outlines[kind],
    0.009,
    "flowing_bilobed_caudal",
  );
  caudal.rotation.y = -Math.PI / 2;
  const [endZ, endY] =
    kind === "jade_minnow"
      ? [0.12, 0.084]
      : kind === "spirit_carp"
        ? [0.26, 0.12]
        : kind === "chiru"
          ? [0.15, 0.145]
          : [0.18, 0.13];
  for (let j = -5; j <= 5; j++)
    taper(
      tail,
      gold,
      [
        [0, 0, 0],
        [0, (j / 5) * endY * 0.6, endZ * 0.6],
        [0, (j / 5) * endY, endZ],
      ],
      [0.0012, 0.0008, 0.0002],
      "caudal_fin_ray",
    );
  motions.push((t, e) => {
    tail.rotation.y =
      Math.sin(t * (slim ? 1.35 : 0.92)) * (0.17 + Math.min(e, 3) * 0.04);
  });
  if (!winged) {
    const top = (z) => {
      const [, h, y] = sampleSection(profile, z);
      return y + h * 0.97;
    };
    const outline =
      kind === "spirit_carp"
        ? [
            [-0.26, top(-0.26)],
            [-0.2, top(-0.2) + 0.09],
            [-0.04, top(-0.04) + 0.04],
            [0.18, top(0.18)],
          ]
        : kind === "chiru"
          ? [
              [-0.22, top(-0.22)],
              [-0.11, top(-0.11) + 0.12],
              [0.12, top(0.12) + 0.085],
              [0.23, top(0.23)],
            ]
          : kind === "jade_minnow"
            ? [
                [-0.1, top(-0.1)],
                [-0.025, top(-0.025) + 0.1],
                [0.1, top(0.1)],
              ]
            : [
                [-0.28, top(-0.28)],
                [-0.2, top(-0.2) + 0.05],
                [0.075, top(0.075) + 0.025],
                [0.21, top(0.21)],
              ];
    const dorsal = fin(b, skin, outline, 0.009, "swept_dorsal_fin");
    dorsal.rotation.y = -Math.PI / 2;
    if (kind === "spirit_carp") {
      const ribbon = fin(
        b,
        light,
        [
          [-0.06, -0.1],
          [0.09, -0.11],
          [0.23, -0.22],
          [0.36, -0.28],
          [0.24, -0.1],
        ],
        0.005,
        "flowing_bilobed_caudal",
      );
      ribbon.rotation.y = -Math.PI / 2;
    }
  }
  b.userData.headAnchor = new THREE.Vector3(
    0,
    -0.01,
    kind === "wenyao" ? -0.53 : profile[0][0],
  );
}
