import * as THREE from "three";
import {
  pgMaterial as mat,
  pgOval as oval,
  pgTaper as taper,
  pgLoft as loft,
  pgFeather as feather,
  pgEyes as eyes,
} from "./creature_penglai_art.js";
/** 展翼包含肩肘、覆羽和不对称初级飞羽；仙鹤伸颈，毕方仅一足。 */
export function buildPenglaiBird(kind, b, motions) {
  const red = kind === "vermilion_bird",
    crane = kind === "cloud_crane",
    eagle = kind === "gudiao";
  const skin = mat(
      red ? "#a63b23" : crane ? "#d9decf" : eagle ? "#645466" : "#367b91",
      3,
    ),
    flight = mat(
      red ? "#bd772f" : crane ? "#253335" : eagle ? "#352d3f" : "#598e9b",
      3,
    ),
    light = mat(red ? "#d3ab59" : "#cbd6bc", 3),
    gold = mat("#b28c4d", 4),
    dark = mat("#253138");
  loft(b, `bird_v2_${kind}`, skin, [
    [-0.28, 0.014, 0.024],
    [-0.2, 0.062, 0.089],
    [0, 0.078, 0.096],
    [0.17, 0.052, 0.061],
    [0.26, 0.008, 0.013],
  ]);
  const head = new THREE.Group();
  head.position.set(0, crane ? 0.14 : 0.2, crane ? -0.54 : -0.34);
  b.add(head);
  taper(
    b,
    skin,
    crane
      ? [
          [0, 0.06, -0.17],
          [0, 0.12, -0.3],
          [0, 0.14, -0.43],
          [0, 0.14, -0.54],
        ]
      : [
          [0, 0.07, -0.15],
          [0, 0.2, -0.18],
          [0, 0.245, -0.25],
          [0, 0.2, -0.34],
        ],
    crane ? [0.032, 0.026, 0.022, 0.027] : [0.047, 0.035, 0.031, 0.036],
    "continuous_extended_neck",
  );
  loft(head, `avian_skull_${kind}`, skin, [
    [-0.077, 0.005, 0.008],
    [-0.035, 0.037, 0.041],
    [0.014, 0.039, 0.043],
    [0.055, 0.008, 0.02],
  ]);
  eyes(head, 0.031, 0.017, -0.026, 0.006, red || eagle);
  if (crane)
    oval(
      head,
      mat("#973f3b"),
      [0, 0.043, 0.008],
      [0.029, 0.007, 0.032],
      "red_crane_crown",
    );
  taper(
    head,
    eagle ? gold : crane ? dark : light,
    [
      [0, -0.01, -0.04],
      [0, -0.014, eagle ? -0.09 : -0.145],
      [0, eagle ? -0.064 : -0.018, eagle ? -0.104 : -0.205],
    ],
    [0.025, 0.013, 0.0008],
    "tapered_beak",
  );
  if (eagle)
    for (const side of [-1, 1])
      taper(
        head,
        gold,
        [
          [side * 0.025, 0.034, 0.01],
          [side * 0.045, 0.11, 0.035],
          [side * 0.03, 0.17, 0.01],
        ],
        [0.012, 0.009, 0.0007],
        "swept_horn",
      );
  if (!crane)
    for (let j = 0; j < (red ? 9 : 4); j++) {
      const f = feather(
        head,
        j % 2 ? flight : gold,
        0.12 + (j % 3) * 0.036,
        0.01,
        0.035,
        "tapered_crown_feather",
      );
      f.position.set((j - (red ? 4 : 1.5)) * 0.007, 0.043, 0.012);
      f.rotation.x = -0.9 - j * 0.045;
      f.rotation.y = (j - (red ? 4 : 1.5)) * 0.11;
    }
  if (red) {
    // 朱雀的披肩与后掠颈羽形成厚实火焰鬃冠，根部嵌入真实颈胸表面。
    for (let row = 0; row < 3; row++)
      for (let j = 0; j < 10; j++) {
        const a = (j / 10) * Math.PI * 2;
        const f = feather(
          b,
          j % 3 ? flight : light,
          0.16 + row * 0.035,
          0.039 + row * 0.003,
          0.024,
          "flame_mane_neck_feather",
        );
        f.position.set(
          Math.cos(a) * (0.043 + row * 0.011),
          0.19 - row * 0.04 + Math.sin(a) * 0.035,
          -0.2 + row * 0.025,
        );
        f.rotation.y = Math.cos(a) * 0.8;
        f.rotation.x = -Math.sin(a) * 0.6;
      }
    head.scale.setScalar(1.18);
    for (const side of [-1, 1])
      taper(
        head,
        flight,
        [
          [side * 0.016, 0.038, -0.04],
          [side * 0.036, 0.048, -0.012],
          [side * 0.047, 0.04, 0.014],
        ],
        [0.008, 0.011, 0.002],
        "vermilion_commanding_brow",
      );
  }
  for (const side of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(side * 0.06, 0.025, -0.04);
    wing.name = "articulated_feathered_wing";
    b.add(wing);
    taper(
      wing,
      skin,
      [
        [0, 0, 0],
        [side * 0.18, 0.018, 0.02],
        [side * 0.36, 0.015, -0.055],
        [side * 0.48, 0, -0.035],
      ],
      [0.034, 0.04, 0.023, 0.014],
      "shoulder_elbow_wrist",
    );
    for (let row = 0; row < 3; row++)
      for (let j = 0; j < 12; j++) {
        const f = feather(
          wing,
          row === 0 ? skin : j % 3 === 0 ? light : flight,
          0.13 + row * 0.06 + (j / 12) * 0.035,
          0.021 + row * 0.002,
          0.013,
          "layered_wing_covert",
        );
        f.position.set(
          side * (0.024 + j * 0.034),
          0.015 - row * 0.012,
          -0.01 + row * 0.027,
        );
        f.rotation.y = side * (0.1 + j * 0.017);
      }
    for (let j = 0; j < 10; j++) {
      const f = feather(
        wing,
        flight,
        0.26 + Math.sin((j / 9) * Math.PI) * 0.1,
        0.027,
        0.025,
        "separated_primary_flight_feather",
      );
      f.position.set(side * (0.34 + j * 0.025), -0.012, -0.04 + j * 0.016);
      f.rotation.y = side * (0.3 + j * 0.078);
      // 羽轴贴合弯曲羽片，而非悬浮在外。
      taper(
        wing,
        light,
        [
          [side * (0.34 + j * 0.025), -0.01, -0.04 + j * 0.016],
          [side * (0.41 + j * 0.029), 0.006, 0.12 + j * 0.008],
        ],
        [0.0014, 0.0003],
        "fine_feather_shaft",
      );
    }
    if (red) wing.scale.setScalar(1.2);
    motions.push((t, e) => {
      const beat = t * (crane ? 0.95 : 1.15);
      wing.rotation.z =
        side * (Math.sin(beat) * (0.22 + Math.min(e, 2) * 0.06) - 0.035);
      wing.rotation.x = Math.cos(beat) * 0.038;
    });
    if (kind !== "bifang" || side === 1) {
      taper(
        b,
        gold,
        [
          [side * 0.04, -0.07, 0.12],
          [side * 0.038, -0.13, 0.25],
          [side * 0.028, -0.135, 0.39],
        ],
        [0.009, 0.006, 0.004],
        "streamlined_trailing_leg",
      );
      for (let j = -1; j <= 1; j++)
        taper(
          b,
          dark,
          [
            [side * 0.028, -0.135, 0.39],
            [side * 0.028 + j * 0.012, -0.14, 0.44],
            [side * 0.028 + j * 0.019, -0.157, 0.45],
          ],
          [0.004, 0.003, 0.0005],
          "trailing_bird_toe",
        );
    }
  }
  const tail = new THREE.Group();
  tail.position.z = 0.18;
  tail.name = "articulated_tail_plumes";
  b.add(tail);
  for (let j = -(red ? 5 : 3); j <= (red ? 5 : 3); j++) {
    const f = feather(
      tail,
      j % 2 ? flight : light,
      red ? 0.62 - Math.abs(j) * 0.045 : 0.2 - Math.abs(j) * 0.018,
      red ? 0.028 : 0.023,
      red ? 0.045 : 0.013,
      "flowing_tail_plume",
    );
    f.position.set(j * 0.008, -0.013, 0);
    f.rotation.y = j * (red ? 0.055 : 0.12);
    if (red) {
      const eye = oval(
        tail,
        gold,
        [
          Math.sin(j * 0.055) * (0.52 - Math.abs(j) * 0.045) + j * 0.008,
          0.008,
          0.52 - Math.abs(j) * 0.045,
        ],
        [0.014, 0.003, 0.025],
        "tail_plume_ocellus",
      );
      eye.rotation.y = j * 0.055;
    }
  }
  motions.push((t) => {
    tail.rotation.x = Math.sin(t * 0.7) * 0.06;
    tail.rotation.y = Math.sin(t * 0.43) * 0.035;
  });
  if (kind === "bifang")
    for (const side of [-1, 1])
      for (let j = 0; j < 6; j++)
        oval(
          b,
          mat("#a84532"),
          [side * 0.064, 0.035 - j * 0.01, -0.1 + j * 0.044],
          [0.011, 0.009, 0.022],
          "red_bifang_marking",
        );
  b.userData.headAnchor = new THREE.Vector3(
    0,
    crane ? 0.125 : 0.15,
    crane ? -0.74 : -0.45,
  );
}
