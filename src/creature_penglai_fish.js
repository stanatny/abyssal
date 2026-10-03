import * as THREE from "three";
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
  kun: "#355f73",
};

/** 翼鱼、深体鲤鱼、人面赤鱬和巨鲲保留各自的头型与推进附肢。 */
export function buildPenglaiFish(kind, b, motions) {
  if (kind === "luoyu") return buildLuoSkyfish(b, motions);
  const whale = kind === "kun",
    winged = ["wenyao", "luoyu"].includes(kind),
    carp = kind.includes("carp"),
    slim = kind === "jade_minnow";
  const skin = mat(tones[kind], 2),
    light = mat(whale ? "#95b5b3" : "#cfba87", 2),
    gold = mat("#b59755", 4),
    dark = mat("#283b3b");
  const profile = whale
    ? [
        [-0.5, 0.013, 0.037],
        [-0.45, 0.12, 0.087],
        [-0.29, 0.18, 0.12],
        [-0.04, 0.19, 0.147],
        [0.18, 0.13, 0.096],
        [0.32, 0.045, 0.029],
        [0.4, 0.009, 0.009],
      ]
    : slim
      ? [
          [-0.4, 0.005, 0.01],
          [-0.34, 0.035, 0.043],
          [-0.15, 0.063, 0.074],
          [0.08, 0.052, 0.058],
          [0.29, 0.013, 0.02],
          [0.36, 0.004, 0.004],
        ]
      : [
          [-0.43, 0.005, 0.014],
          [-0.365, 0.054, 0.067],
          [-0.24, winged ? 0.075 : 0.105, winged ? 0.085 : 0.128],
          [-0.02, winged ? 0.075 : 0.1, winged ? 0.08 : 0.145],
          [0.2, 0.045, 0.057],
          [0.33, 0.011, 0.017],
          [0.36, 0.002, 0.004],
        ];
  loft(b, `fish_v2_${kind}`, skin, profile);
  taper(
    b,
    light,
    [
      [0, -0.035, -0.33],
      [0, whale ? -0.11 : -0.09, -0.15],
      [0, -0.07, 0.08],
      [0, -0.021, 0.27],
    ],
    [0.025, whale ? 0.13 : 0.055, whale ? 0.1 : 0.038, 0.007],
    "continuous_countershaded_belly",
  );
  if (kind !== "chiru")
    eyes(
      b,
      whale ? 0.115 : slim ? 0.037 : 0.064,
      0.02,
      -0.326,
      whale ? 0.009 : 0.008,
      whale,
    );
  taper(
    b,
    dark,
    [
      [-(whale ? 0.11 : 0.037), -0.015, -0.38],
      [0, -0.034, whale ? -0.48 : -0.424],
      [whale ? 0.11 : 0.037, -0.015, -0.38],
    ],
    [0.0025, 0.003, 0.0025],
    "natural_mouth_fold",
  );
  for (const side of [-1, 1]) {
    const gill = taper(
      b,
      light,
      [
        [side * (slim ? 0.044 : 0.083), 0.048, -0.28],
        [side * (slim ? 0.054 : 0.092), -0.006, -0.255],
        [side * (slim ? 0.042 : 0.072), -0.056, -0.239],
      ],
      [0.002, 0.003, 0.001],
      "fitted_operculum",
    );
    if (whale) gill.visible = false;
    const wing = new THREE.Group();
    wing.position.set(
      side * (whale ? 0.15 : slim ? 0.047 : 0.083),
      -0.028,
      -0.115,
    );
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
          [side * (whale ? 0.32 : 0.16), -0.03],
          [side * (whale ? 0.3 : 0.12), -0.17],
          [side * 0.025, -0.05],
        ],
        0.009,
        "curved_pectoral_membrane",
      );
      f.rotation.x = Math.PI / 2;
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
    if (carp)
      taper(
        b,
        gold,
        [
          [side * 0.039, -0.016, -0.406],
          [side * 0.075, -0.06, -0.43],
          [side * 0.11, -0.076, -0.34],
          [side * 0.17, -0.05, -0.22],
        ],
        [0.0035, 0.003, 0.002, 0.0004],
        "long_carp_barbel",
      );
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
  const caudal = fin(
    tail,
    light,
    [
      [-0.018, 0],
      [0.13, 0.15],
      [0.235, 0.195],
      [0.17, 0.054],
      [0.09, 0],
      [0.17, -0.054],
      [0.235, -0.195],
      [0.13, -0.15],
    ],
    0.009,
    "flowing_bilobed_caudal",
  );
  caudal.rotation.y = -Math.PI / 2;
  for (let j = -5; j <= 5; j++)
    taper(
      tail,
      gold,
      [
        [0, 0, 0],
        [0, j * 0.019, 0.095],
        [0, j * 0.031, 0.175],
      ],
      [0.0015, 0.001, 0.0002],
      "caudal_fin_ray",
    );
  if (whale) {
    tail.rotation.z = Math.PI / 2;
    tail.scale.set(1, 1.5, 1);
  }
  motions.push((t, e) => {
    if (whale) tail.rotation.x = Math.sin(t * 0.6) * (0.12 + e * 0.025);
    else tail.rotation.y = Math.sin(t * 0.92) * (0.17 + e * 0.04);
  });
  if (!winged) {
    const f = fin(
      b,
      skin,
      [
        [-0.19, 0.08],
        [-0.04, whale ? 0.18 : 0.23],
        [0.11, 0.15],
        [0.22, 0.047],
      ],
      0.011,
      "swept_dorsal_fin",
    );
    f.rotation.y = Math.PI / 2;
    if (whale)
      for (let j = 0; j < 10; j++)
        taper(
          b,
          light,
          [
            [0, -0.089, -0.32 + j * 0.025],
            [0.035, -0.105, -0.16 + j * 0.025],
            [0.07, -0.075, 0.045 + j * 0.01],
          ],
          [0.0018, 0.0016, 0.0005],
          "giant_kun_throat_pleat",
        );
  }
  if (kind === "dragon_carp")
    for (const side of [-1, 1])
      taper(
        b,
        gold,
        [
          [side * 0.038, 0.103, -0.25],
          [side * 0.066, 0.21, -0.23],
          [side * 0.082, 0.25, -0.29],
        ],
        [0.009, 0.006, 0.0004],
        "carp_antler_crown",
      );
  b.userData.headAnchor = new THREE.Vector3(
    0,
    -0.01,
    kind === "wenyao" ? -0.53 : whale ? -0.5 : -0.43,
  );
}
