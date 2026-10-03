import * as THREE from "three";
import {
  pgMaterial as mat,
  pgOval as oval,
  pgTaper as taper,
  pgLoft as loft,
  pgEyes as eyes,
  pgFeather as feather,
} from "./creature_penglai_art.js";

/** 长体采用重叠封闭截面与切线关节；鳞片、鬃毛和四足始终跟随所在躯节。 */
export function buildPenglaiDragon(kind, b, motions) {
  const dragon = kind === "azure_dragon",
    fish = kind === "hujiao";
  const skin = mat(dragon ? "#347868" : fish ? "#527361" : "#506743", 2),
    belly = mat("#b3b994", 2),
    gold = mat("#ad9154", 4),
    mane = mat("#c7cbb0", 6),
    dark = mat("#293d32");
  const start = fish ? 0.06 : -0.2,
    extent = fish ? 0.85 : 1.15,
    n = 28;
  const point = (p, t = 0, out = new THREE.Vector3()) =>
    out.set(
      Math.sin(p * 7.2) * (dragon ? 0.18 : 0.04) +
        Math.sin(t * 0.55 - p * 4) * (dragon ? 0.035 : 0.014) * p,
      Math.sin(p * 5.1) * (dragon ? 0.058 : 0.025),
      start + p * extent,
    );
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1),
      r =
        (fish ? 0.043 : dragon ? 0.059 : 0.067) * Math.pow(1 - p, 0.62) +
        0.0025;
    const g = new THREE.Group();
    g.name = "continuous_scaled_body_joint";
    g.position.copy(point(p));
    b.add(g);
    const length = (extent / (n - 1)) * (dragon ? 1.95 : 1.3);
    loft(g, `dragon_v2_${kind}_${i}`, skin, [
      [-length / 2, r * 0.97, r * 0.97],
      [0, r, r],
      [length / 2, r * 0.97, r * 0.97],
    ]);
    for (let row = 0; row < 3; row++)
      for (const side of [-1, 1]) {
        const scute = oval(
          g,
          row === 2 ? belly : skin,
          [side * r * (row === 0 ? 0.95 : 0.69), r * (0.44 - row * 0.54), 0],
          [0.008, r * 0.29, length * 0.45],
          "overlapping_reptile_scale",
        );
        scute.rotation.z = side * (row - 1) * 0.45;
      }
    if (dragon)
      for (let j = 0; j < 3; j++) {
        const f = feather(
          g,
          mane,
          0.038 + 0.033 * (1 - p),
          0.011,
          0.018,
          "dorsal_mane_lock",
        );
        f.position.set((j - 1) * 0.009, r * 0.88, 0);
        f.rotation.x = -0.9;
        f.rotation.y = (j - 1) * 0.13;
      }
    if (dragon && [4, 15].includes(i))
      for (const side of [-1, 1]) {
        const foot = new THREE.Group();
        foot.position.set(side * r * 0.65, -r * 0.25, 0);
        g.add(foot);
        taper(
          foot,
          skin,
          [
            [0, 0, 0],
            [side * 0.07, -0.033, -0.017],
            [side * 0.09, -0.087, 0.015],
            [side * 0.115, -0.108, -0.031],
          ],
          [0.022, 0.018, 0.012, 0.009],
          "jointed_dragon_leg",
        );
        for (let j = -1; j <= 2; j++)
          taper(
            foot,
            gold,
            [
              [side * 0.115, -0.108, -0.03],
              [side * 0.113 + j * 0.013, -0.11, -0.064],
              [side * 0.107 + j * 0.018, -0.102, -0.089],
            ],
            [0.006, 0.004, 0.0005],
            "four_hooked_dragon_talons",
          );
        motions.push(
          (t) => (foot.rotation.x = Math.sin(t * 0.5 + i + side) * 0.1),
        );
      }
    const upper = new THREE.Vector3(),
      lower = new THREE.Vector3(),
      axis = new THREE.Vector3(0, 0, 1);
    motions.push((t) => {
      point(p, t, g.position);
      point(Math.min(1, p + 0.012), t, upper);
      point(Math.max(0, p - 0.012), t, lower);
      upper.sub(lower).normalize();
      g.quaternion.setFromUnitVectors(axis, upper);
    });
  }
  if (fish) {
    loft(b, "hujiao_fish_body_v2", skin, [
      [-0.4, 0.008, 0.018],
      [-0.33, 0.06, 0.073],
      [-0.21, 0.115, 0.14],
      [-0.05, 0.105, 0.13],
      [0.075, 0.041, 0.052],
    ]);
    for (const side of [-1, 1]) {
      const f = feather(b, belly, 0.25, 0.09, 0.02, "hujiao_rayed_pectoral");
      f.userData.articulated = true;
      f.position.set(side * 0.08, -0.04, -0.17);
      f.rotation.y = side * 0.75;
      motions.push((t) => (f.rotation.z = side * Math.sin(t * 0.7) * 0.14));
    }
  }
  const head = new THREE.Group();
  head.position.set(0, 0.005, fish ? -0.34 : -0.235);
  if (dragon) head.scale.set(1.18, 1.18, 1.12);
  b.add(head);
  loft(head, `guardian_skull_${kind}`, skin, [
    [-0.26, dragon ? 0.04 : 0.042, 0.027, -0.012],
    [-0.21, dragon ? 0.061 : 0.055, 0.045, -0.005],
    [-0.11, dragon ? 0.094 : 0.068, 0.07, 0.026],
    [-0.02, dragon ? 0.082 : 0.061, 0.072, 0.017],
    [0.044, 0.043, 0.052],
  ]);
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.015, -0.032);
  head.add(jaw);
  loft(jaw, `guardian_jaw_${kind}`, belly, [
    [-0.227, 0.028, 0.01, -0.025],
    [-0.16, 0.056, 0.014, -0.027],
    [-0.04, 0.064, 0.021],
    [0.035, 0.04, 0.023],
  ]);
  taper(
    head,
    dark,
    [
      [-0.062, -0.015, -0.12],
      [0, -0.028, -0.248],
      [0.062, -0.015, -0.12],
    ],
    [0.003, 0.005, 0.003],
    "long_mouth_seam",
  );
  if (!dragon) eyes(head, 0.059, 0.048, -0.126, 0.008, true);
  for (const side of [-1, 1]) {
    if (dragon) {
      taper(
        head,
        skin,
        [
          [side * 0.044, 0.066, -0.155],
          [side * 0.073, 0.085, -0.115],
          [side * 0.093, 0.077, -0.073],
        ],
        [0.017, 0.021, 0.008],
        "royal_dragon_brow",
      );
      oval(
        head,
        gold,
        [side * 0.067, 0.045, -0.168],
        [0.012, 0.007, 0.006],
        "golden_dragon_forward_eye",
      );
      oval(
        head,
        dark,
        [side * 0.067, 0.045, -0.174],
        [0.004, 0.006, 0.003],
        "focused_dragon_pupil",
      );
    }
    oval(
      head,
      dark,
      [side * 0.029, 0.016, -0.231],
      [0.008, 0.004, 0.012],
      "reptilian_nostril",
    );
    for (let j = 0; j < 5; j++)
      taper(
        head,
        mat("#ded4ae"),
        [
          [side * 0.045, -0.01, -0.19 + j * 0.028],
          [side * 0.043, -0.055, -0.19 + j * 0.028],
        ],
        [j === 0 ? 0.007 : 0.004, 0.0003],
        "curved_reptile_fang",
      );
    if (dragon) {
      taper(
        head,
        gold,
        [
          [side * 0.047, 0.067, 0.004],
          [side * 0.074, 0.144, 0.049],
          [side * 0.061, 0.23, 0.08],
          [side * 0.091, 0.25, 0.045],
        ],
        [0.018, 0.015, 0.009, 0.0005],
        "branching_deer_antler",
      );
      taper(
        head,
        gold,
        [
          [side * 0.073, 0.142, 0.05],
          [side * 0.12, 0.19, 0.07],
          [side * 0.14, 0.215, 0.025],
        ],
        [0.01, 0.007, 0.0005],
        "antler_side_branch",
      );
      taper(
        head,
        gold,
        [
          [side * 0.044, -0.003, -0.247],
          [side * 0.102, -0.032, -0.275],
          [side * 0.19, 0.004, -0.18],
          [side * 0.22, 0.06, -0.04],
        ],
        [0.004, 0.004, 0.003, 0.0005],
        "long_tapered_whisker",
      );
      for (let j = 0; j < 7; j++)
        taper(
          head,
          mane,
          [
            [side * 0.063, 0.025 + j * 0.009, -0.045],
            [side * (0.1 + j * 0.003), 0.025 + j * 0.013, 0.04],
            [side * 0.085, 0.009 + j * 0.012, 0.145],
          ],
          [0.014, 0.012, 0.0005],
          "swept_cheek_mane",
        );
      taper(
        head,
        mane,
        [
          [0, -0.035, -0.13],
          [0, -0.1, -0.09],
          [0.018, -0.13, 0.04],
        ],
        [0.019, 0.014, 0.0008],
        "flowing_chin_beard",
      );
    }
  }
  motions.push((t) => (jaw.rotation.x = -0.025 + Math.sin(t * 0.6) * 0.017));
  b.userData.headAnchor = new THREE.Vector3(0, 0, fish ? -0.57 : -0.49);
}
