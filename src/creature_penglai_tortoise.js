import * as THREE from "three";
import {
  pgMaterial as mat,
  pgOval as oval,
  pgTaper as taper,
  pgLoft as loft,
  pgPart as part,
  pgGeometry,
} from "./creature_penglai_art.js";

/** 玄武的主轮廓由宽厚大龟承重，蛇沿甲缘盘绕，不能压过龟的主体。 */
export function buildPenglaiTortoise(b, motions, root) {
  let guarded = false;
  const shell = mat("#304d45", 2),
    skin = mat("#5e7060", 2),
    bronze = mat("#968969", 4),
    pale = mat("#a9ab85", 2),
    dark = mat("#1c2e29");
  const rx = 0.35,
    rz = 0.44;
  const dome = pgGeometry("xuanwu_massive_dome", () => {
    const g = new THREE.SphereGeometry(1, 48, 32),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      p.setXYZ(
        i,
        p.getX(i) * rx,
        0.018 + y * (y < 0 ? 0.062 : 0.245),
        p.getZ(i) * rz,
      );
    }
    g.computeVertexNormals();
    return g;
  });
  part(b, dome, shell, [0, 0, 0], [1, 1, 1], [], "massive_turtle_carapace");
  oval(
    b,
    pale,
    [0, -0.056, 0.015],
    [0.32, 0.045, 0.405],
    "thick_turtle_plastron",
  );
  const height = (x, z) =>
    0.018 + 0.245 * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2 - (z / rz) ** 2));
  for (let row = -3; row <= 3; row++)
    for (let col = -2; col <= 2; col++) {
      const x = col * 0.118 + (row % 2) * 0.052,
        z = row * 0.11;
      if ((x / rx) ** 2 + (z / rz) ** 2 > 0.64) continue;
      const g = pgGeometry(`xuanwu_armored_scute_${row}_${col}`, () => {
        const p = [x, height(x, z) + 0.019, z],
          ix = [];
        for (let j = 0; j < 6; j++) {
          const a = (j * Math.PI) / 3,
            xx = x + Math.cos(a) * 0.063,
            zz = z + Math.sin(a) * 0.059;
          p.push(xx, height(xx, zz) + 0.004, zz);
          ix.push(0, ((j + 1) % 6) + 1, j + 1);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
        g.setIndex(ix);
        g.computeVertexNormals();
        return g;
      });
      part(
        b,
        g,
        mat((row + col) % 2 ? "#516651" : "#737761", 2),
        [0, 0, 0],
        [1, 1, 1],
        [],
        "raised_interlocking_scute",
      );
    }
  for (let j = 0; j < 32; j++) {
    const a = (j * Math.PI) / 16;
    const scute = oval(
      b,
      bronze,
      [Math.cos(a) * rx * 0.94, 0.017, Math.sin(a) * rz * 0.94],
      [0.026, 0.025, 0.055],
      "thick_marginal_shell_plate",
    );
    scute.rotation.y = -a;
  }
  taper(
    b,
    skin,
    [
      [0, -0.015, -0.29],
      [0, 0.007, -0.44],
      [0, 0.055, -0.53],
    ],
    [0.115, 0.092, 0.065],
    "heavy_turtle_neck",
  );
  const head = new THREE.Group();
  head.position.set(0, 0.047, -0.5);
  b.add(head);
  loft(head, "xuanwu_blocky_turtle_skull", skin, [
    [-0.18, 0.035, 0.028, -0.005],
    [-0.13, 0.072, 0.054, 0.019],
    [-0.065, 0.092, 0.065, 0.027],
    [0.022, 0.08, 0.055, 0.01],
    [0.08, 0.045, 0.04],
  ]);
  for (const side of [-1, 1]) {
    oval(
      head,
      dark,
      [side * 0.059, 0.05, -0.133],
      [0.017, 0.009, 0.007],
      "recessed_turtle_eye_socket",
    );
    oval(
      head,
      bronze,
      [side * 0.059, 0.05, -0.14],
      [0.009, 0.005, 0.004],
      "watchful_turtle_iris",
    );
    oval(
      head,
      dark,
      [side * 0.059, 0.05, -0.144],
      [0.003, 0.005, 0.002],
      "turtle_pupil",
    );
    taper(
      head,
      skin,
      [
        [side * 0.032, 0.056, -0.14],
        [side * 0.061, 0.068, -0.12],
        [side * 0.08, 0.055, -0.075],
      ],
      [0.013, 0.017, 0.007],
      "armored_brow_plate",
    );
    taper(
      head,
      dark,
      [
        [side * 0.066, 0.001, -0.08],
        [side * 0.05, -0.012, -0.15],
        [0, -0.013, -0.18],
      ],
      [0.002, 0.002, 0.001],
      "firm_turtle_jaw_seam",
    );
  }
  taper(
    head,
    pale,
    [
      [0, 0.027, -0.14],
      [0, 0.012, -0.189],
      [0, -0.019, -0.182],
    ],
    [0.041, 0.026, 0.003],
    "powerful_turtle_beak",
  );
  for (const side of [-1, 1])
    for (const z of [-0.225, 0.245]) {
      const limb = new THREE.Group();
      limb.position.set(side * 0.275, -0.025, z);
      b.add(limb);
      taper(
        limb,
        skin,
        [
          [0, 0, 0],
          [side * 0.07, -0.06, 0.014],
          [side * 0.105, -0.117, -0.035],
        ],
        [0.079, 0.067, 0.051],
        "thick_turtle_weight_bearing_limb",
      );
      oval(
        limb,
        skin,
        [side * 0.1, -0.11, -0.055],
        [0.075, 0.043, 0.085],
        "broad_turtle_armored_paw",
      );
      for (let j = -1; j <= 2; j++) {
        taper(
          limb,
          bronze,
          [
            [side * 0.09 + j * 0.022, -0.109, -0.105],
            [side * 0.1 + j * 0.026, -0.133, -0.157],
            [side * 0.09 + j * 0.026, -0.132, -0.178],
          ],
          [0.013, 0.009, 0.001],
          "heavy_turtle_claw",
        );
        oval(
          limb,
          bronze,
          [side * 0.055 + j * 0.012, -0.028, -0.015 + j * 0.013],
          [0.015, 0.011, 0.028],
          "forearm_scale_plate",
        );
      }
      motions.push((t) => {
        // 护阵时收紧四肢，仍保持关节根部在龟甲内；恢复阶段重新伸展。
        limb.position.x = side * (guarded ? 0.25 : 0.275);
        limb.rotation.y = Math.sin(t * 0.45 + side + z * 4) * 0.085;
      });
    }
  // 盘蛇紧贴甲缘，只在后肩抬起颈首；龟头和甲板从前方仍清楚可见。
  const serpent = new THREE.Group();
  b.add(serpent);
  serpent.name = "xuanwu_rim_guardian_serpent";
  const points = [];
  for (let i = 0; i <= 36; i++) {
    const a = -0.2 + (i / 36) * Math.PI * 2.65;
    points.push([
      Math.cos(a) * 0.342,
      0.068 + (i / 36) * 0.035,
      Math.sin(a) * 0.43,
    ]);
  }
  const last = points.at(-1);
  points.push(
    [last[0] * 0.9, 0.17, last[2]],
    [0.17, 0.27, 0.03],
    [0.12, 0.31, -0.065],
    [0.07, 0.29, -0.14],
  );
  taper(
    serpent,
    shell,
    points,
    [0.006, 0.034, 0.04, 0.034, 0.026],
    "continuous_rim_coiled_serpent",
  );
  const sh = new THREE.Group();
  sh.position.set(0.07, 0.29, -0.14);
  serpent.add(sh);
  loft(sh, "xuanwu_serpent_guard_skull", skin, [
    [-0.11, 0.012, 0.009],
    [-0.078, 0.044, 0.026],
    [-0.025, 0.05, 0.036],
    [0.039, 0.026, 0.026],
  ]);
  for (const side of [-1, 1]) {
    oval(
      sh,
      bronze,
      [side * 0.036, 0.025, -0.063],
      [0.009, 0.005, 0.007],
      "serpent_watchful_eye",
    );
    oval(
      sh,
      dark,
      [side * 0.039, 0.025, -0.066],
      [0.003, 0.005, 0.003],
      "serpent_guard_pupil",
    );
  }
  motions.push((t) => {
    sh.rotation.y = Math.sin(t * 0.37) * 0.055;
    sh.rotation.x = Math.sin(t * 0.45) * 0.04;
  });
  root.userData.setBossPhase = (phase) => {
    guarded = phase === "windup" || phase === "attack";
  };
  b.userData.headAnchor = new THREE.Vector3(0, 0.047, -0.686);
}
