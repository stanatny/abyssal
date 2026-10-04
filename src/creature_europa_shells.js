import { bindTentacleMotion } from "./tentacle_motion.js";
import * as THREE from "three";
import { sculptedFin } from "./creature_surface.js";

/** 硬质甲片仍有饱满截面和倒角，避免用平面三角片冒充甲壳。 */
export function buildEuropaShellForm(c) {
  const { kind, skin, edge, dark, organ } = c;
  const plate = (
    name,
    outline,
    pos = [0, 0, 0],
    parent = c.anatomy,
    material = edge,
  ) =>
    c.part(
      name,
      c.geometry(name, () =>
        sculptedFin(outline, 0.052, "horizontal", {
          smooth: ["glass_seed", "prism_hunter"].includes(kind) ? false : true,
          camber: 0.065,
          detail: 2,
        }),
      ),
      material,
      pos,
      parent,
    );
  const mouth = (pos, r, parent = c.anatomy) =>
    c.part("intake_rim", c.ring("intake", r, 0.012), dark, pos, parent);
  if (kind === "glass_seed") {
    c.root.userData.anatomyType = "crystal-shell";
    // 菱晶甲片环绕可见核心，外壳有实体厚度与分明棱线。
    c.oval("amber_core", [0, 0, 0], [0.11, 0.095, 0.18], organ);
    const shells = c.group("prismatic_shell");
    for (let i = 0; i < 6; i++) {
      const p = plate(
        `crystal_valve${i}`,
        [
          [-0.5, 0],
          [-0.25, 0.14],
          [0.22, 0.17],
          [0.5, 0],
          [0.08, -0.08],
        ],
        [0, 0, 0],
        shells,
        skin,
      );
      p.rotation.z = (i * Math.PI) / 3;
      c.part(
        "edge_seam",
        c.tapered(
          `crystal_seam${i}`,
          [
            [0, 0.012, -0.48],
            [
              Math.cos((i * Math.PI) / 3) * 0.18,
              Math.sin((i * Math.PI) / 3) * 0.16,
              0,
            ],
            [0, 0.012, 0.48],
          ],
          0.006,
          0.003,
          12,
        ),
        edge,
      );
    }
    for (const s of [-1, 1]) {
      const keel = plate(
        `keel${s}`,
        [
          [-0.28, 0],
          [0.1, s * 0.2],
          [0.38, s * 0.1],
          [0.42, 0],
        ],
        [0, -0.02, 0],
        c.anatomy,
        edge,
      );
      c.moving(keel, (m, t) => (m.rotation.x = Math.sin(t * 0.8 + s) * 0.08));
    }
  } else if (kind === "sail_crawler" || kind === "hinge_walker") {
    const walking = kind === "hinge_walker";
    c.root.userData.anatomyType = walking
      ? "six-legged-carapace"
      : "armored-paddle-crawler";
    c.part(
      "ventral_body",
      c.trunk("ventral", [
        [-0.36, 0.03, 0.025, 0],
        [-0.2, 0.13, 0.06, 0],
        [0.18, 0.12, 0.055, 0],
        [0.4, 0.025, 0.02, 0],
      ]),
      skin,
    );
    for (let i = 0; i < 4; i++) {
      const z = -0.3 + i * 0.18;
      const p = plate(
        `carapace_plate${i}`,
        [
          [-0.11, 0],
          [-0.06, 0.19],
          [0.065, 0.17],
          [0.12, 0],
          [0.065, -0.17],
          [-0.06, -0.19],
        ],
        [0, 0.06, z],
      );
      p.rotation.x = -0.04;
      c.part(
        "dorsal_ridge",
        c.tapered(
          `ridge${i}`,
          [
            [0, 0.11, z - 0.07],
            [0, 0.17, z],
            [0, 0.115, z + 0.07],
          ],
          0.012,
          0.006,
          10,
        ),
        skin,
      );
    }
    for (const s of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const limb = c.group(`jointed_limb_${s}_${i}`, [
          s * 0.105,
          -0.018,
          -0.2 + i * 0.2,
        ]);
        c.part(
          "upper_joint",
          c.tapered(
            `upper_${s}_${i}`,
            [
              [0, 0, 0],
              [s * 0.13, -0.045, -0.025],
              [s * 0.17, -0.07, 0.01],
            ],
            0.026,
            0.016,
            10,
          ),
          skin,
          [0, 0, 0],
          limb,
        );
        c.part(
          "distal_joint",
          c.tapered(
            `distal_${s}_${i}`,
            [
              [s * 0.16, -0.07, 0.01],
              [s * 0.23, walking ? -0.18 : -0.055, -0.065],
              [s * 0.27, walking ? -0.19 : -0.04, -0.035],
            ],
            0.017,
            0.006,
            10,
          ),
          edge,
          [0, 0, 0],
          limb,
        );
        if (!walking)
          plate(
            `paddle_${s}_${i}`,
            [
              [-0.075, 0],
              [-0.04, s * 0.07],
              [0.08, s * 0.1],
              [0.105, 0],
            ],
            [s * 0.22, -0.075, -0.015],
            limb,
            skin,
          );
        c.motions.push((t, e) => {
          limb.rotation.y =
            Math.sin(t * (walking ? 1.1 : 0.9) - i * 0.8 + s) * 0.17;
          limb.rotation.z = walking
            ? Math.max(0, Math.sin(t * 1.1 - i * 0.8 + s)) * 0.1 * s
            : 0;
        });
      }
    for (const s of [-1, 1])
      c.part(
        "sensory_whisker",
        c.tapered(
          `antenna${s}`,
          [
            [s * 0.06, 0.02, -0.3],
            [s * 0.11, 0.12, -0.4],
            [s * 0.1, 0.16, -0.52],
          ],
          0.009,
          0.0015,
          12,
        ),
        edge,
      );
    mouth([0, -0.015, -0.34], 0.04);
    if (!walking) {
      const sail = plate(
        "folded_back_sail",
        [
          [-0.22, 0],
          [-0.13, 0.24],
          [0.1, 0.29],
          [0.24, 0.03],
        ],
        [0, 0.1, 0.02],
        c.anatomy,
        skin,
      );
      sail.rotation.z = Math.PI / 2;
      c.moving(sail, (m, t) => (m.rotation.x = Math.sin(t * 0.4) * 0.025));
    }
  } else if (kind === "forkjaw_stalker") {
    c.root.userData.anatomyType = "pincer-predator";
    c.part(
      "thorax",
      c.trunk(
        "thorax",
        [
          [-0.32, 0.12, 0.11, 0],
          [-0.2, 0.19, 0.14, 0],
          [0.1, 0.13, 0.11, 0],
          [0.38, 0.025, 0.03, 0],
        ],
        0,
      ),
      skin,
    );
    for (let i = 0; i < 3; i++)
      plate(
        `thoracic_shield${i}`,
        [
          [-0.1, 0],
          [-0.07, 0.19],
          [0.065, 0.15],
          [0.13, 0],
          [0.065, -0.15],
          [-0.07, -0.19],
        ],
        [0, 0.11, -0.18 + i * 0.17],
      );
    for (const s of [-1, 1]) {
      const jaw = c.group(`split_mandible${s}`, [s * 0.08, 0, -0.28]);
      c.part(
        "curved_pincer",
        c.tapered(
          `pincer${s}`,
          [
            [0, 0, 0],
            [s * 0.19, -0.02, -0.09],
            [s * 0.18, -0.03, -0.22],
            [s * 0.06, -0.035, -0.27],
          ],
          0.045,
          0.003,
          20,
        ),
        edge,
        [0, 0, 0],
        jaw,
      );
      for (let i = 0; i < 4; i++)
        c.part(
          "pincer_tooth",
          c.tapered(
            `tooth${s}_${i}`,
            [
              [s * (0.1 + i * 0.025), -0.025, -0.08 - i * 0.038],
              [s * (0.075 + i * 0.016), -0.025, -0.105 - i * 0.038],
            ],
            0.01,
            0.001,
            5,
          ),
          dark,
          [0, 0, 0],
          jaw,
        );
      c.motions.push(
        (t) =>
          (jaw.rotation.y =
            s *
            ((c.phase() === "windup"
              ? 0.35
              : c.phase() === "active"
                ? -0.08
                : 0.12) +
              Math.sin(t * 0.7) * 0.035)),
      );
      for (let i = 0; i < 2; i++) {
        const fin = plate(
          `steering_spine${s}_${i}`,
          [
            [-0.1, 0],
            [-0.05, s * 0.24],
            [0.08, s * 0.19],
            [0.13, 0],
          ],
          [s * 0.12, -0.03, 0.05 + i * 0.2],
          c.anatomy,
          skin,
        );
        c.moving(
          fin,
          (m, t) => (m.rotation.x = Math.sin(t * 0.8 + s + i) * 0.05),
        );
      }
    }
    mouth([0, 0, -0.31], 0.075);
  } else if (kind === "prism_hunter") {
    c.root.userData.anatomyType = "trihedral-dart";
    const core = c.part(
      "trihedral_core",
      c.trunk(
        "prism_core",
        [
          [-0.52, 0.015, 0.015, 0],
          [-0.28, 0.16, 0.14, 0],
          [0.1, 0.12, 0.13, 0],
          [0.45, 0.015, 0.025, 0],
        ],
        0,
        0.24,
      ),
      skin,
    );
    for (let i = 0; i < 3; i++) {
      const blade = plate(
        `knife_shield${i}`,
        [
          [-0.47, 0],
          [-0.25, 0.25],
          [0.24, 0.15],
          [0.47, 0.025],
          [0.23, -0.01],
        ],
        [0, 0, 0],
      );
      blade.rotation.z = (i * Math.PI * 2) / 3;
      const vane = plate(
        `steering_vane${i}`,
        [
          [0.12, 0],
          [0.3, 0.16],
          [0.51, 0.13],
          [0.45, 0],
        ],
        [0, 0, 0],
        c.anatomy,
        skin,
      );
      vane.rotation.z = (i * Math.PI * 2) / 3;
      const rz = vane.rotation.z;
      c.moving(vane, (m, t) => {
        m.rotation.z = rz;
        m.rotation.x =
          (c.phase() === "windup" ? 0.28 : 0) + Math.sin(t * 0.8 + i) * 0.03;
      });
    }
    c.part(
      "sensory_slit",
      c.tapered(
        "slit",
        [
          [0, 0.025, -0.43],
          [0, 0.085, -0.27],
          [0, 0.12, -0.14],
        ],
        0.014,
        0.004,
        10,
      ),
      organ,
    );
    mouth([0, 0, -0.39], 0.055);
  } else if (kind === "spiral_grazer") {
    c.root.userData.anatomyType = "spiral-disc";
    const shell = c.group("coiled_shell");
    const points = [];
    for (let i = 0; i <= 50; i++) {
      const a = (i / 50) * Math.PI * 4.6,
        r = 0.035 + (i / 50) * 0.37;
      points.push([
        Math.cos(a) * r,
        Math.sin(a) * r,
        0.055 + Math.sin(a) * 0.025,
      ]);
    }
    c.part(
      "continuous_coil",
      c.tapered("spiral_coil", points, 0.07, 0.11, 72),
      skin,
      [0, 0, 0],
      shell,
    );
    for (let i = 0; i < 16; i++) {
      const f = (29 + (i * 21) / 15) / 50,
        a = f * Math.PI * 4.6,
        r = 0.035 + f * 0.37;
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r,
        z = 0.055 + Math.sin(a) * 0.025,
        w = 0.07 + f * 0.04;
      c.part(
        "shell_suture",
        c.tapered(
          `suture${i}`,
          [
            [
              x - Math.cos(a) * w * 0.9,
              y - Math.sin(a) * w * 0.9,
              z + w * 0.35,
            ],
            [x, y, z + w * 1.02],
            [
              x + Math.cos(a) * w * 0.9,
              y + Math.sin(a) * w * 0.9,
              z + w * 0.35,
            ],
          ],
          0.006,
          0.003,
          12,
        ),
        edge,
        [0, 0, 0],
        shell,
      );
    }
    c.part(
      "soft_foot",
      c.trunk("foot", [
        [-0.46, 0.03, 0.035, -0.22],
        [-0.23, 0.12, 0.06, -0.22],
        [0.22, 0.1, 0.05, -0.22],
        [0.47, 0.005, 0.008, -0.22],
      ]),
      edge,
    );
    for (const s of [-1, 1]) {
      const fin = plate(
        `ribbon_fin${s}`,
        [
          [-0.42, 0],
          [-0.27, s * 0.24],
          [0.2, s * 0.27],
          [0.46, 0.06],
          [0.33, 0],
        ],
        [s * 0.08, -0.24, 0],
        c.anatomy,
        skin,
      );
      c.moving(fin, (m, t) => (m.rotation.x = Math.sin(t * 0.7 + s) * 0.08));
      const arm = c.group(`spiral_feeler_${s}`, [s * 0.045, -0.21, -0.34]);
      const points = [
        [0, 0, 0],
        [s * 0.075, 0.06, -0.09],
        [s * 0.045, 0.09, -0.19],
      ];
      c.part(
        "probing_feeler",
        c.tapered(`spiral_feeler${s}`, points, 0.012, 0.001, 12),
        edge,
        [0, 0, 0],
        arm,
      );
      bindTentacleMotion(
        arm,
        `spiral_grazer_soft_feeler_${s}`,
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        c.motions,
        { count: 6, phase: s, amplitude: 0.2 },
      );
    }
    c.motions.push((t) => (shell.rotation.z = Math.sin(t * 0.35) * 0.025));
  } else return false;
  return true;
}
