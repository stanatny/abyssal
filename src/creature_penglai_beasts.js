import * as THREE from "three";
import {
  pgMaterial as mat,
  pgOval as oval,
  pgTaper as taper,
  pgLoft as loft,
  pgEyes as eyes,
  pgFin as fin,
} from "./creature_penglai_art.js";

/** 马、狐、豹、虎与独足夔具有不同的头颈、足型和承重轮廓。 */
export function buildPenglaiBeast(kind, b, motions) {
  const tiger = kind === "white_tiger",
    fox = kind === "nine_tail_fox",
    horse = kind === "lushu",
    kui = kind === "kui";
  const skin = mat(
      tiger
        ? "#d4d5c7"
        : fox
          ? "#c9b399"
          : horse
            ? "#ad9065"
            : kui
              ? "#436466"
              : "#a05d39",
      tiger || horse ? 1 : fox ? 6 : kui ? 2 : 5,
    ),
    cream = mat("#ded9c3", 6),
    dark = mat("#222c2b"),
    horn = mat("#a99a6c"),
    nose = mat("#5a5045");
  const body = loft(b, `beast_v2_${kind}`, skin, [
    [-0.33, 0.035, 0.055, 0.045],
    [-0.25, tiger ? 0.185 : horse ? 0.09 : 0.125, tiger ? 0.205 : 0.155, 0.02],
    [-0.12, tiger ? 0.195 : kui ? 0.18 : 0.14, tiger ? 0.2 : kui ? 0.19 : 0.15],
    [0.06, tiger ? 0.16 : 0.115, tiger ? 0.17 : 0.125],
    [0.23, tiger ? 0.16 : 0.12, tiger ? 0.16 : 0.13, 0.005],
    [0.31, 0.035, 0.05],
  ]);
  if (kui) body.scale.set(1.25, 1.1, 1);
  for (const side of [-1, 1]) {
    oval(
      b,
      skin,
      [side * (tiger ? 0.115 : 0.085), 0.0, -0.2],
      [tiger ? 0.09 : 0.07, tiger ? 0.18 : 0.13, tiger ? 0.17 : 0.14],
      "load_bearing_scapula",
    );
    oval(
      b,
      skin,
      [side * (tiger ? 0.105 : 0.08), -0.025, 0.2],
      [tiger ? 0.09 : 0.065, tiger ? 0.145 : 0.115, tiger ? 0.14 : 0.1],
      "pelvic_haunch",
    );
    taper(
      b,
      cream,
      [
        [side * 0.02, -0.09, -0.25],
        [side * 0.06, -0.145, -0.14],
        [side * 0.04, -0.12, 0.16],
      ],
      [0.045, 0.043, 0.016],
      "countershaded_underside",
    );
  }
  const head = new THREE.Group();
  head.position.set(0, horse ? 0.2 : tiger ? 0.12 : 0.1, -0.3);
  if (tiger) {
    head.scale.set(1.2, 1.18, 1.08);
    oval(
      b,
      skin,
      [0, 0.08, -0.255],
      [0.145, 0.16, 0.14],
      "powerful_tiger_neck",
    );
    oval(b, cream, [0, -0.06, -0.21], [0.115, 0.155, 0.09], "deep_tiger_chest");
  }
  b.add(head);
  if (horse) {
    const neck = loft(b, "lushu_arched_neck", skin, [
      [-0.13, 0.065, 0.05],
      [0, 0.085, 0.1],
      [0.16, 0.06, 0.08],
      [0.27, 0.055, 0.055],
    ]);
    neck.rotation.x = Math.PI / 2;
    neck.position.set(0, 0.04, -0.225);
    loft(head, "lushu_long_equine_skull", cream, [
      [-0.3, 0.032, 0.055, -0.055],
      [-0.26, 0.046, 0.058, -0.036],
      [-0.15, 0.045, 0.1, 0.018],
      [-0.035, 0.054, 0.105, 0.022],
      [0.02, 0.025, 0.05],
    ]);
    oval(
      head,
      nose,
      [0, -0.058, -0.285],
      [0.044, 0.028, 0.034],
      "equine_soft_muzzle",
    );
    for (const side of [-1, 1]) {
      oval(
        head,
        dark,
        [side * 0.036, -0.061, -0.3],
        [0.009, 0.006, 0.012],
        "equine_nostril",
      );
      const ear = fin(
        head,
        cream,
        [
          [0, 0],
          [side * 0.009, 0.096],
          [side * 0.035, 0.115],
          [side * 0.038, 0.028],
        ],
        0.016,
        "upright_equine_ear",
      );
      ear.position.set(side * 0.034, 0.083, -0.065);
      ear.rotation.x = -0.18;
    }
    eyes(head, 0.049, 0.037, -0.13, 0.007);
  } else {
    loft(head, `beast_skull_${kind}`, skin, [
      [-0.24, fox ? 0.022 : 0.055, 0.042, -0.022],
      [-0.19, fox ? 0.036 : kui ? 0.086 : 0.087, 0.051, -0.005],
      [-0.11, fox ? 0.067 : 0.095, 0.083, 0.025],
      [-0.02, fox ? 0.074 : 0.09, 0.1, 0.03],
      [0.05, 0.044, 0.074, 0.015],
    ]);
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.015, -0.03);
    head.add(jaw);
    loft(jaw, `beast_jaw_${kind}`, cream, [
      [-0.22, 0.04, 0.012, -0.03],
      [-0.15, fox ? 0.034 : 0.068, 0.022, -0.027],
      [-0.06, 0.062, 0.027, -0.02],
      [0.01, 0.045, 0.032],
    ]);
    taper(
      head,
      dark,
      [
        [-0.065, -0.01, -0.145],
        [0, -0.034, -0.234],
        [0.065, -0.01, -0.145],
      ],
      [0.003, 0.004, 0.003],
      "taut_mouth_corners",
    );
    oval(
      head,
      nose,
      [0, 0.014, -0.235],
      [fox ? 0.023 : 0.043, 0.016, 0.015],
      "feline_leather_nose",
    );
    for (const side of [-1, 1]) {
      oval(
        head,
        dark,
        [side * 0.023, 0.02, -0.248],
        [0.007, 0.003, 0.004],
        "nostril",
      );
      taper(
        head,
        cream,
        [
          [side * 0.055, -0.026, -0.17],
          [side * 0.052, -0.07, -0.18],
          [side * 0.045, -0.082, -0.179],
        ],
        [0.008, 0.005, 0.0005],
        "curved_canine",
      );
      for (let j = 0; j < 4; j++)
        taper(
          head,
          cream,
          [
            [side * 0.057, -0.01, -0.18],
            [side * 0.11, -0.003 + j * 0.008, -0.23],
            [side * 0.17, -0.02 + j * 0.012, -0.17],
          ],
          [0.0018, 0.0012, 0.0003],
          "splayed_sensory_whisker",
        );
      const ear = fin(
        head,
        skin,
        tiger
          ? [
              [-0.024, 0],
              [-0.026, 0.029],
              [0, 0.05],
              [0.023, 0.033],
              [0.025, 0],
            ]
          : [
              [0, 0],
              [side * 0.03, fox ? 0.098 : 0.07],
              [side * 0.052, 0.01],
            ],
        0.017,
        "anatomical_ear",
      );
      ear.position.set(side * 0.062, 0.086, -0.015);
      ear.rotation.y = side * 0.3;
      const inside = fin(
        head,
        nose,
        [
          [-0.011, 0],
          [0, tiger ? 0.029 : 0.058],
          [0.013, 0],
        ],
        0.004,
        "ear_inner_skin",
      );
      inside.position.set(side * 0.062, 0.104, -0.027);
      for (let j = 0; j < 5; j++)
        taper(
          head,
          cream,
          [
            [side * 0.068, 0.003 + j * 0.012, -0.07],
            [side * (0.095 + j * 0.006), -0.035 + j * 0.016, -0.032],
            [side * 0.078, -0.055 + j * 0.015, 0.037],
          ],
          [0.012, 0.007, 0.0005],
          "tapered_cheek_ruff",
        );
    }
    if (tiger) {
      // 虎眼朝向前方，内眼角压低；唇垫、鼻脊和露齿构成警戒咆哮的表情。
      for (const side of [-1, 1]) {
        oval(
          head,
          cream,
          [side * 0.035, -0.005, -0.214],
          [0.037, 0.027, 0.032],
          "feline_whisker_pad",
        );
        oval(
          head,
          dark,
          [side * 0.052, 0.058, -0.17],
          [0.02, 0.01, 0.009],
          "forward_feline_socket",
        );
        oval(
          head,
          mat("#b6a052"),
          [side * 0.052, 0.056, -0.179],
          [0.012, 0.0055, 0.004],
          "amber_tiger_iris",
        );
        oval(
          head,
          dark,
          [side * 0.052, 0.056, -0.183],
          [0.0025, 0.0052, 0.002],
          "vertical_tiger_pupil",
        );
        taper(
          head,
          skin,
          [
            [side * 0.029, 0.062, -0.17],
            [side * 0.053, 0.074, -0.157],
            [side * 0.074, 0.069, -0.13],
          ],
          [0.01, 0.012, 0.004],
          "pressed_brow_ridge",
        );
        taper(
          head,
          cream,
          [
            [side * 0.05, -0.011, -0.204],
            [side * 0.046, -0.065, -0.22],
            [side * 0.041, -0.092, -0.211],
          ],
          [0.009, 0.006, 0.0005],
          "exposed_upper_fang",
        );
        taper(
          jaw,
          cream,
          [
            [side * 0.04, -0.028, -0.175],
            [side * 0.038, 0.005, -0.182],
          ],
          [0.007, 0.001],
          "lower_fang",
        );
      }
      loft(jaw, "tiger_oral_cavity", dark, [
        [-0.218, 0.018, 0.009, -0.009],
        [-0.17, 0.044, 0.008, -0.011],
        [-0.07, 0.052, 0.008, -0.007],
      ]);
    } else
      eyes(head, fox ? 0.061 : 0.08, 0.058, -0.122, fox ? 0.007 : 0.009, true);
    motions.push(
      (t) =>
        (jaw.rotation.x =
          (tiger ? -0.2 : -0.035) + Math.sin(t * 0.5) * (tiger ? 0.04 : 0.015)),
    );
  }
  if (kui) {
    const foot = new THREE.Group();
    foot.name = "kui_support_joint";
    b.add(foot);
    taper(
      foot,
      skin,
      [
        [0, -0.025, 0.02],
        [0, -0.15, 0.045],
        [0, -0.28, -0.015],
      ],
      [0.11, 0.093, 0.08],
      "single_weight_bearing_leg",
    );
    oval(
      foot,
      dark,
      [0, -0.29, -0.03],
      [0.086, 0.036, 0.1],
      "single_cloven_hoof",
    );
    taper(
      foot,
      horn,
      [
        [0, -0.316, -0.126],
        [0, -0.318, -0.014],
      ],
      [0.004, 0.004],
      "cloven_hoof_division",
    );
    // 《大荒东经》的夔无角，不套用普通牛角。
    motions.push((t, e, state) => {
      foot.rotation.x =
        state?.phase === "leap"
          ? -0.24
          : state?.phase === "windup"
            ? 0.1
            : Math.sin(t) * (state ? Math.min(0.08, state.speed / 120) : 0.035);
    });
  } else
    for (const side of [-1, 1])
      for (let j = 0; j < 2; j++) {
        const leg = new THREE.Group();
        leg.position.set(
          side * (tiger ? 0.135 : 0.105),
          -0.035,
          j ? 0.22 : -0.205,
        );
        leg.name = "weight_bearing_limb";
        b.add(leg);
        taper(
          leg,
          skin,
          [
            [0, 0, 0],
            [0, -0.083, j ? 0.026 : -0.018],
            [0, -0.15, j ? 0.07 : 0],
          ],
          [
            tiger ? 0.067 : horse ? 0.026 : 0.043,
            tiger ? 0.046 : 0.031,
            tiger ? 0.032 : 0.018,
          ],
          "jointed_upper_leg",
        );
        const lower = new THREE.Group();
        lower.position.set(0, -0.15, j ? 0.07 : 0);
        leg.add(lower);
        taper(
          lower,
          skin,
          [
            [0, 0, 0],
            [0, -0.07, -0.025],
            [0, -0.11, -0.03],
          ],
          [tiger ? 0.034 : 0.021, tiger ? 0.025 : 0.014, tiger ? 0.028 : 0.018],
          "tendon_and_ankle",
        );
        oval(
          lower,
          horse ? dark : skin,
          [0, -0.118, -0.045],
          [
            tiger ? 0.055 : horse ? 0.023 : 0.038,
            tiger ? 0.03 : 0.024,
            tiger ? 0.065 : 0.052,
          ],
          horse ? "grounded_hoof" : "broad_toed_paw",
        );
        if (!horse)
          for (let toe = -1; toe <= 1; toe++) {
            oval(
              lower,
              skin,
              [toe * 0.019, -0.122, -0.084],
              [0.014, 0.016, 0.024],
              "distinct_paw_toe",
            );
            taper(
              lower,
              horn,
              [
                [toe * 0.019, -0.116, -0.099],
                [toe * 0.019, -0.122, -0.12],
              ],
              [0.004, 0.0003],
              "curved_claw",
            );
          }
        motions.push((t, e, state) => {
          const leap = state?.phase === "leap",
            crouch = state?.phase === "windup";
          const stride = Math.sin(t + j * Math.PI + side * Math.PI * 0.5);
          const amplitude = state
            ? Math.min(0.38, state.speed / 20)
            : Math.min(0.38, e * 0.15);
          leg.rotation.x = leap
            ? j
              ? -0.55
              : 0.7
            : crouch
              ? j
                ? -0.2
                : 0.08
              : stride * amplitude;
          lower.rotation.x = leap
            ? 0.35
            : crouch
              ? 0.4
              : Math.max(0, -stride) * amplitude * 0.8;
        });
      }
  const tails = fox ? 9 : kind === "zheng" ? 5 : 1;
  for (let j = 0; j < tails; j++) {
    const tail = new THREE.Group();
    tail.position.set(0, 0.065, 0.26);
    tail.name = "independent_tail_root";
    b.add(tail);
    const spread = (j - (tails - 1) / 2) * 0.051;
    taper(
      tail,
      horse ? mat("#804031", 6) : skin,
      [
        [0, 0, 0],
        [spread, 0.065, 0.15],
        [spread * 1.8, 0.16 + (j % 2) * 0.06, 0.34],
        [spread * 2, 0.12, tiger ? 0.38 : 0.58],
      ],
      [fox ? 0.032 : 0.02, fox ? 0.043 : 0.017, fox ? 0.039 : 0.013, 0.002],
      "long_tapered_tail",
    );
    if (fox)
      taper(
        tail,
        cream,
        [
          [spread * 1.8, 0.16 + (j % 2) * 0.06, 0.36],
          [spread * 2, 0.12, tiger ? 0.38 : 0.58],
        ],
        [0.028, 0.0005],
        "pale_brush_tip",
      );
    motions.push(
      (t) => (tail.rotation.y = Math.sin(t * 0.55 + j * 0.75) * 0.11),
    );
  }
  if (kind === "zheng")
    taper(
      head,
      horn,
      [
        [0, 0.105, -0.09],
        [0, 0.195, -0.06],
        [0, 0.25, -0.1],
      ],
      [0.017, 0.012, 0.0008],
      "single_leopard_horn",
    );
  if (horse)
    for (let j = 0; j < 16; j++)
      taper(
        b,
        mat("#79422e", 6),
        [
          [0, 0.26 - j * 0.012, -0.265 + j * 0.015],
          [0.018, 0.24 - j * 0.012, -0.17 + j * 0.015],
          [0.03, 0.17 - j * 0.012, -0.13 + j * 0.015],
        ],
        [0.01, 0.012, 0.001],
        "swept_equine_mane",
      );
  b.userData.headAnchor = new THREE.Vector3(
    0,
    horse ? 0.16 : 0.1,
    horse ? -0.6 : -0.55,
  );
}
