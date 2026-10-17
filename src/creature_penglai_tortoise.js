import * as T from "three";
import { bindPenglaiTortoiseMotion } from "./penglai_tortoise_motion.js";
import {
  pgMaterial as mat,
  pgOval as oval,
  pgPart as part,
  pgGeometry,
} from "./creature_penglai_art.js";
import {
  guardianLoft as loft,
  guardianSweep as sweep,
} from "./creature_guardian_art.js";

/** 山脊般甲壳、鹰喙龟首与甲缘盘蛇；厚实游泳桨肢替代圆球状的陆行脚。 */
export function buildPenglaiTortoise(b, motions, root) {
  const limbs = [],
    shell = mat("#233c39", 2),
    skin = mat("#4f6259", 2),
    bronze = mat("#817658", 4),
    pale = mat("#9b9b7c", 2),
    dark = mat("#192a28"),
    rx = 0.36,
    rz = 0.43;
  const height = (x, z) =>
    0.015 + 0.222 * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2 - (z / rz) ** 2));
  const dome = pgGeometry("xuanwu_ridged_dome_v3", () => {
    const g = new T.SphereGeometry(1, 48, 24),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        ridge =
          Math.max(0, y) *
          (0.013 * Math.cos(z * 10) + 0.008 * Math.cos(x * 13));
      p.setXYZ(i, x * rx, 0.015 + y * (y < 0 ? 0.055 : 0.222) + ridge, z * rz);
    }
    g.computeVertexNormals();
    return g;
  });
  const core = part(
    b,
    dome,
    shell,
    [0, 0, 0],
    [1, 1, 1],
    [],
    "massive_turtle_carapace",
  );
  core.userData.keepSeparate = core.userData.articulated = true;
  loft(
    b,
    "xuanwu_thick_plastron_v3",
    pale,
    [
      [-0.395, 0.06, 0.016, -0.037],
      [-0.3, 0.26, 0.04, -0.048],
      [0, 0.327, 0.044, -0.05],
      [0.3, 0.27, 0.037, -0.046],
      [0.4, 0.055, 0.014, -0.031],
    ],
    0.72,
  ).name = "thick_turtle_plastron";
  // 甲片与主甲同源曲面，尖脊厚边在普通遭遇距离也能读出结构。
  for (let row = -3; row <= 3; row++)
    for (let col = -2; col <= 2; col++) {
      const x = col * 0.122 + (Math.abs(row) % 2) * 0.06,
        z = row * 0.11;
      if ((x / rx) ** 2 + (z / rz) ** 2 > 0.7) continue;
      const geometry = pgGeometry(
        `xuanwu_ridged_scute_v3_${row}_${col}`,
        () => {
          const ps = [x, height(x, z) + 0.028 + (col === 0 ? 0.024 : 0), z],
            ix = [];
          for (let j = 0; j < 6; j++) {
            const a = (j * Math.PI) / 3,
              xx = x + Math.cos(a) * 0.071,
              zz = z + Math.sin(a) * 0.062;
            ps.push(xx, height(xx, zz) + 0.008, zz);
            ix.push(0, ((j + 1) % 6) + 1, j + 1);
          }
          const g = new T.BufferGeometry();
          g.setAttribute("position", new T.Float32BufferAttribute(ps, 3));
          g.setIndex(ix);
          g.computeVertexNormals();
          return g;
        },
      );
      part(
        b,
        geometry,
        (row + col) % 3 ? shell : skin,
        [0, 0, 0],
        [1, 1, 1],
        [],
        "ridged_interlocking_xuanwu_scute",
      );
    }
  for (let i = 0; i < 28; i++) {
    const a = (i * Math.PI) / 14,
      c = Math.cos(a),
      s = Math.sin(a);
    const edge = loft(
      b,
      `xuanwu_flared_margin_v3_${i}`,
      i % 3 ? shell : bronze,
      [
        [-0.047, 0.034, 0.016, 0],
        [0, 0.042, 0.022, 0],
        [0.05, 0.034, 0.016, -0.003],
      ],
      0.58,
    );
    edge.position.set(c * rx * 0.97, 0.008, s * rz * 0.97);
    edge.rotation.y = Math.PI / 2 - a;
    sweep(
      b,
      shell,
      [
        [c * rx * 0.9, 0.015, s * rz * 0.9],
        [c * rx * 1.035, 0.025, s * rz * 1.035],
        [c * rx * 1.08, 0.035, s * rz * 1.08],
      ],
      [0.015, 0.013, 0.0005],
      "broken_heavy_shell_rim",
    );
  }
  loft(
    b,
    "xuanwu_armored_neck_v3",
    skin,
    [
      [-0.55, 0.064, 0.048, 0.022],
      [-0.46, 0.084, 0.057, 0.009],
      [-0.33, 0.12, 0.064, -0.006],
      [-0.26, 0.08, 0.047, -0.012],
    ],
    0.73,
  );
  const head = new T.Group();
  head.name = "xuanwu_heavy_beaked_head";
  head.position.set(0, 0.025, -0.5);
  b.add(head);
  loft(
    head,
    "xuanwu_blocky_turtle_skull",
    skin,
    [
      [-0.193, 0.028, 0.026, -0.003],
      [-0.153, 0.067, 0.048, 0.014],
      [-0.08, 0.085, 0.066, 0.025],
      [0.015, 0.075, 0.052, 0.013],
      [0.085, 0.044, 0.033, 0],
    ],
    0.54,
  );
  loft(
    head,
    "xuanwu_lower_armored_jaw_v3",
    pale,
    [
      [-0.187, 0.022, 0.009, -0.023],
      [-0.12, 0.057, 0.017, -0.027],
      [-0.018, 0.065, 0.022, -0.02],
      [0.043, 0.037, 0.017, -0.013],
    ],
    0.68,
  );
  for (const side of [-1, 1]) {
    oval(
      head,
      dark,
      [side * 0.061, 0.045, -0.135],
      [0.02, 0.009, 0.012],
      "recessed_turtle_eye_socket",
    );
    oval(
      head,
      bronze,
      [side * 0.068, 0.045, -0.14],
      [0.009, 0.004, 0.006],
      "watchful_turtle_iris",
    );
    oval(
      head,
      dark,
      [side * 0.071, 0.045, -0.142],
      [0.0025, 0.004, 0.003],
      "turtle_pupil",
    );
    sweep(
      head,
      shell,
      [
        [side * 0.032, 0.058, -0.171],
        [side * 0.063, 0.077, -0.132],
        [side * 0.093, 0.07, -0.065],
        [side * 0.103, 0.045, 0.01],
      ],
      [0.009, 0.021, 0.018, 0.0005],
      "heavy_xuanwu_orbital_ridge",
    );
    sweep(
      head,
      dark,
      [
        [side * 0.063, -0.008, -0.056],
        [side * 0.054, -0.019, -0.14],
        [0, -0.018, -0.197],
      ],
      [0.002, 0.002, 0.001],
      "firm_turtle_jaw_seam",
    );
    sweep(
      head,
      shell,
      [
        [side * 0.06, 0.02, 0.022],
        [side * 0.11, 0.027, 0.064],
        [side * 0.135, 0.033, 0.088],
      ],
      [0.017, 0.016, 0.0005],
      "backward_turtle_cheek_spur",
    );
    oval(
      head,
      dark,
      [side * 0.023, 0.031, -0.177],
      [0.004, 0.003, 0.006],
      "turtle_recessed_nostril",
    );
  }
  sweep(
    head,
    pale,
    [
      [0, 0.035, -0.153],
      [0, 0.021, -0.198],
      [0, -0.02, -0.202],
      [0, -0.029, -0.18],
    ],
    [0.036, 0.025, 0.013, 0.001],
    "powerful_turtle_beak",
  );
  for (const side of [-1, 1])
    for (const hind of [false, true]) {
      const limb = new T.Group();
      limb.name = "xuanwu_swimming_shoulder";
      limb.position.set(side * 0.282, -0.021, hind ? 0.25 : -0.23);
      b.add(limb);
      const wrist = new T.Group();
      wrist.name = "xuanwu_feathering_wrist";
      wrist.position.set(side * 0.125, -0.103, -0.045);
      limb.add(wrist);
      limbs.push({ limb, wrist, side, hind });
      sweep(
        limb,
        skin,
        [
          [0, 0, 0],
          [side * 0.07, -0.055, 0.008],
          [side * 0.13, -0.106, -0.041],
        ],
        [hind ? 0.071 : 0.084, hind ? 0.057 : 0.07, 0.044],
        "continuous_xuanwu_shoulder_muscle",
      );
      const paddle = loft(
        wrist,
        hind ? "xuanwu_hind_steering_paddle_v3" : "xuanwu_fore_power_paddle_v3",
        skin,
        hind
          ? [
              [-0.155, 0.013, 0.011],
              [-0.11, 0.055, 0.022],
              [-0.045, 0.069, 0.034],
              [0.025, 0.042, 0.035],
            ]
          : [
              [-0.235, 0.011, 0.009],
              [-0.17, 0.058, 0.018],
              [-0.09, 0.093, 0.03],
              [0.012, 0.061, 0.041],
              [0.052, 0.035, 0.029],
            ],
        0.7,
      );
      paddle.rotation.y = (-side * Math.PI) / 2;
      paddle.name = "broad_turtle_armored_paw";
      paddle.userData.articulated = true;
      for (let j = -1; j <= 1; j++) {
        sweep(
          wrist,
          bronze,
          [
            [side * (hind ? 0.115 : 0.18), -0.002, j * 0.036],
            [side * (hind ? 0.16 : 0.23), -0.013, j * 0.043 - 0.01],
            [side * (hind ? 0.174 : 0.25), -0.007, j * 0.045 - 0.025],
          ],
          [0.012, 0.008, 0.0005],
          "swept_xuanwu_paddle_claw",
        );
        const plate = oval(
          limb,
          shell,
          [side * (0.044 + j * 0.014), -0.022, -0.003 + j * 0.024],
          [0.024, 0.012, 0.043],
          "embedded_xuanwu_forearm_plate",
        );
        plate.rotation.z = side * 0.4;
      }
    }
  const serpent = new T.Group();
  serpent.name = "xuanwu_rim_guardian_serpent";
  b.add(serpent);
  const points = [];
  for (let i = 0; i <= 32; i++) {
    const a = -0.2 + (i / 32) * Math.PI * 2.55;
    points.push([
      Math.cos(a) * 0.337,
      0.065 + (i / 32) * 0.045,
      Math.sin(a) * 0.409,
    ]);
  }
  const last = points.at(-1);
  points.push(
    [last[0] * 0.94, 0.19, last[2]],
    [0.17, 0.285, 0.04],
    [0.12, 0.34, -0.07],
    [0.075, 0.325, -0.15],
  );
  sweep(
    serpent,
    shell,
    points,
    [0.005, 0.035, 0.04, 0.032, 0.025],
    "continuous_rim_coiled_serpent",
  );
  for (let i = 5; i < 31; i += 2) {
    const a = -0.2 + (i / 32) * Math.PI * 2.55;
    sweep(
      serpent,
      bronze,
      [
        [Math.cos(a) * 0.337, 0.1 + (i / 32) * 0.045, Math.sin(a) * 0.409],
        [Math.cos(a) * 0.34, 0.13 + (i / 32) * 0.045, Math.sin(a) * 0.413],
      ],
      [0.011, 0.0005],
      "guardian_serpent_dorsal_scale",
    );
  }
  const sh = new T.Group();
  sh.name = "xuanwu_guardian_serpent_head";
  sh.position.set(0.075, 0.325, -0.15);
  serpent.add(sh);
  loft(
    sh,
    "xuanwu_serpent_guard_skull_v3",
    skin,
    [
      [-0.117, 0.012, 0.01],
      [-0.085, 0.035, 0.022],
      [-0.03, 0.042, 0.03, 0.009],
      [0.033, 0.025, 0.025, 0],
    ],
    0.6,
  );
  for (const side of [-1, 1]) {
    oval(
      sh,
      bronze,
      [side * 0.029, 0.019, -0.08],
      [0.009, 0.004, 0.006],
      "serpent_watchful_eye",
    );
    oval(
      sh,
      dark,
      [side * 0.032, 0.019, -0.082],
      [0.002, 0.004, 0.003],
      "serpent_guard_pupil",
    );
    sweep(
      sh,
      shell,
      [
        [side * 0.017, 0.032, -0.093],
        [side * 0.032, 0.042, -0.062],
        [side * 0.043, 0.038, -0.016],
      ],
      [0.006, 0.011, 0.001],
      "serpent_armored_brow",
    );
    sweep(
      sh,
      bronze,
      [
        [side * 0.028, 0.03, 0.006],
        [side * 0.048, 0.08, 0.04],
        [side * 0.053, 0.094, 0.058],
      ],
      [0.011, 0.007, 0.0005],
      "swept_guardian_serpent_horn",
    );
  }
  bindPenglaiTortoiseMotion(root, motions, limbs, head, sh);
  b.userData.headAnchor = new T.Vector3(0, 0.025, -0.702);
}
