import * as THREE from "three";
import {
  pgMaterial as mat,
  pgLoft as loft,
  pgTaper as taper,
  pgFin as fin,
  pgEyes as eyes,
  pgFeather as feather,
} from "./creature_penglai_art.js";

/** 鲲的阔首、云脊与横尾，以及鹏的鹰首、巨翼与爪足，各有连续的运动结构。 */
export function buildKunPeng(kind, body, motions) {
  const bird = kind === "peng";
  const skin = mat(bird ? "#39465d" : "#315e71", bird ? 3 : 2),
    light = mat(bird ? "#d3bf8c" : "#91bab5", 3),
    gold = mat("#ad8850", 4),
    dark = mat("#1b303d");
  loft(
    body,
    `kun_peng_body_${kind}`,
    skin,
    bird
      ? [
          [-0.36, 0.02, 0.035],
          [-0.26, 0.13, 0.15],
          [-0.07, 0.2, 0.18],
          [0.15, 0.15, 0.14],
          [0.3, 0.055, 0.06],
          [0.4, 0.012, 0.012],
        ]
      : [
          [-0.58, 0.022, 0.045],
          [-0.54, 0.12, 0.095],
          [-0.46, 0.21, 0.165],
          [-0.32, 0.28, 0.21],
          [-0.06, 0.29, 0.22],
          [0.17, 0.2, 0.15],
          [0.33, 0.06, 0.046],
          [0.42, 0.017, 0.014],
        ],
  );
  if (bird) {
    loft(body, "peng_hooked_skull", light, [
      [-0.58, 0.012, 0.02, 0.09],
      [-0.49, 0.085, 0.085, 0.12],
      [-0.4, 0.085, 0.105, 0.14],
      [-0.31, 0.074, 0.095, 0.13],
    ]);
    taper(
      body,
      gold,
      [
        [0, 0.12, -0.51],
        [0, 0.09, -0.61],
        [0, 0.02, -0.63],
      ],
      [0.052, 0.031, 0.001],
      "peng_hooked_beak",
    );
    eyes(body, 0.072, 0.145, -0.47, 0.014, true);
    for (const side of [-1, 1]) {
      taper(
        body,
        skin,
        [
          [side * 0.045, 0.19, -0.48],
          [side * 0.08, 0.19, -0.435],
          [side * 0.105, 0.17, -0.4],
        ],
        [0.019, 0.022, 0.008],
        "peng_commanding_brow",
      );
      taper(
        body,
        gold,
        [
          [side * 0.075, -0.1, 0.14],
          [side * 0.09, -0.21, 0.21],
          [side * 0.115, -0.23, 0.16],
        ],
        [0.023, 0.017, 0.013],
        "peng_trailing_leg",
      );
      for (let j = -1; j <= 1; j++)
        taper(
          body,
          dark,
          [
            [side * 0.115, -0.23, 0.16],
            [side * 0.115 + j * 0.025, -0.24, 0.09],
            [side * 0.115 + j * 0.029, -0.22, 0.07],
          ],
          [0.008, 0.005, 0.0005],
          "peng_hooked_talon",
        );
    }
  } else {
    // 宽阔头部和贴合腹面的褶沟，避免仍像放大的普通鱼。
    loft(body, "kun_continuous_pale_jaw", light, [
      [-0.555, 0.016, 0.014, -0.026],
      [-0.47, 0.15, 0.055, -0.09],
      [-0.31, 0.245, 0.088, -0.123],
      [-0.1, 0.22, 0.08, -0.13],
      [0.08, 0.12, 0.04, -0.1],
      [0.18, 0.018, 0.009, -0.067],
    ]);
    eyes(body, 0.247, 0.055, -0.37, 0.016, true);
    for (const side of [-1, 1]) {
      taper(
        body,
        dark,
        [
          [side * 0.13, -0.026, -0.477],
          [side * 0.24, -0.067, -0.36],
          [side * 0.25, -0.056, -0.23],
        ],
        [0.003, 0.004, 0.001],
        "kun_broad_jaw_seam",
      );
      taper(
        body,
        light,
        [
          [side * 0.16, -0.08, -0.4],
          [side * 0.24, -0.12, -0.22],
          [side * 0.18, -0.1, 0.12],
        ],
        [0.008, 0.012, 0.002],
        "kun_ventral_crease",
      );
      taper(
        body,
        light,
        [
          [side * 0.21, 0.06, -0.33],
          [side * 0.3, 0.07, -0.26],
          [side * 0.37, 0.04, -0.11],
          [side * 0.39, 0.07, 0.03],
        ],
        [0.006, 0.006, 0.003, 0.0005],
        "kun_cloud_whisker",
      );
    }
    for (let j = -3; j <= 3; j++)
      taper(
        body,
        light,
        [
          [j * 0.033, -0.15, -0.37],
          [j * 0.044, -0.205, -0.14],
          [j * 0.027, -0.14, 0.16],
        ],
        [0.002, 0.003, 0.0004],
        "kun_throat_pleat",
      );
    const crest = fin(
      body,
      skin,
      [
        [-0.25, 0.19],
        [-0.17, 0.28],
        [-0.04, 0.27],
        [0.08, 0.3],
        [0.16, 0.18],
        [0.26, 0.1],
        [0.14, 0.12],
        [-0.08, 0.21],
      ],
      0.015,
      "swept_dorsal_fin",
    );
    crest.rotation.y = -Math.PI / 2;
  }
  for (const side of [-1, 1]) {
    const wing = new THREE.Group();
    wing.name = bird ? "peng_giant_wing" : "kun_fan_flipper";
    wing.position.set(side * (bird ? 0.15 : 0.24), -0.025, bird ? -0.1 : -0.17);
    body.add(wing);
    if (bird) {
      const mantle = fin(
        wing,
        skin,
        [
          [0, -0.02],
          [side * 0.27, -0.06],
          [side * 0.55, -0.18],
          [side * 0.87, -0.18],
          [side * 0.79, 0.1],
          [side * 0.55, 0.34],
          [side * 0.25, 0.32],
          [0, 0.2],
        ],
        0.015,
        "curved_pectoral_membrane",
      );
      mantle.rotation.x = Math.PI / 2;
      taper(
        wing,
        skin,
        [
          [0, 0, 0],
          [side * 0.28, 0.025, 0.01],
          [side * 0.55, 0.04, -0.12],
          [side * 0.86, 0.01, -0.18],
        ],
        [0.065, 0.061, 0.032, 0.009],
        "peng_wing_arm",
      );
      for (let row = 0; row < 2; row++)
        for (let j = 0; j < 15; j++) {
          const f = feather(
            wing,
            row ? light : skin,
            0.26 + row * 0.1 + j * 0.008,
            0.053,
            0.018,
            "peng_layered_covert",
          );
          f.position.set(
            side * (0.04 + j * 0.048),
            0.02 - row * 0.013,
            0.04 + row * 0.04,
          );
          f.rotation.y = side * (0.04 + j * 0.025);
        }
      for (let j = 0; j < 12; j++) {
        const f = feather(
          wing,
          j % 3 ? skin : gold,
          0.41 + Math.sin((j / 11) * Math.PI) * 0.14,
          0.053,
          0.024,
          "peng_primary_feather",
        );
        f.position.set(side * (0.61 + j * 0.036), 0, -0.13 + j * 0.03);
        f.rotation.y = side * (0.28 + j * 0.08);
      }
    } else {
      const f = fin(
        wing,
        skin,
        [
          [0, 0],
          [side * 0.16, -0.04],
          [side * 0.38, -0.015],
          [side * 0.52, 0.08],
          [side * 0.46, 0.23],
          [side * 0.25, 0.27],
          [side * 0.06, 0.1],
        ],
        0.022,
        "curved_pectoral_membrane",
      );
      f.rotation.x = Math.PI / 2;
      for (let j = 0; j < 6; j++)
        taper(
          wing,
          light,
          [
            [0, -0.003, 0],
            [side * (0.19 + j * 0.04), -0.009, 0.055 + j * 0.025],
            [side * (0.36 + j * 0.026), -0.006, 0.07 + j * 0.019],
          ],
          [0.002, 0.003, 0.0004],
          "kun_flipper_ray",
        );
    }
    motions.push((t, e) => {
      wing.rotation.z =
        side *
        (Math.sin(t * (bird ? 0.52 : 0.45)) *
          (bird ? 0.19 : 0.09) *
          (1 + Math.min(e, 2) * 0.15) -
          0.03);
      wing.rotation.x = Math.sin(t * 0.36) * 0.035;
    });
  }
  const tail = new THREE.Group();
  tail.position.z = bird ? 0.28 : 0.35;
  body.add(tail);
  if (bird)
    for (let j = -4; j <= 4; j++) {
      const f = feather(
        tail,
        j % 2 ? light : skin,
        0.3 - Math.abs(j) * 0.018,
        0.04,
        0.017,
        "peng_fan_tail",
      );
      f.position.x = j * 0.017;
      f.rotation.y = j * 0.075;
    }
  else {
    const f = fin(
      tail,
      light,
      [
        [0, 0],
        [-0.19, 0.06],
        [-0.38, 0.2],
        [-0.39, 0.3],
        [-0.2, 0.22],
        [0, 0.11],
        [0.2, 0.22],
        [0.39, 0.3],
        [0.38, 0.2],
        [0.19, 0.06],
      ],
      0.021,
      "flowing_bilobed_caudal",
    );
    f.rotation.x = Math.PI / 2;
  }
  motions.push((t, e) => {
    tail.rotation.x = Math.sin(t * 0.48) * (bird ? 0.045 : 0.13 + e * 0.016);
  });
  body.userData.headAnchor = new THREE.Vector3(0, 0, bird ? -0.63 : -0.51);
}
