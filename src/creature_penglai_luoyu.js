import * as THREE from "three";
import {
  pgMaterial as mat,
  pgLoft as loft,
  pgTaper as taper,
  pgFeather as feather,
  pgEyes as eyes,
  pgFin as fin,
} from "./creature_penglai_art.js";

/** 蠃鱼采用细长鱼躯、后掠尖翼和双带长尾，与文鳐的深体鲤形及圆阔翼区分。 */
export function buildLuoSkyfish(body, motions) {
  const bronze = mat("#96703d", 2),
    cream = mat("#d6cda9", 2),
    dark = mat("#354848", 2),
    teal = mat("#457c72", 2);
  loft(body, "luoyu_streamlined_fuselage", bronze, [
    [-0.46, 0.003, 0.008],
    [-0.39, 0.035, 0.047],
    [-0.26, 0.053, 0.073],
    [-0.04, 0.047, 0.055],
    [0.16, 0.029, 0.038],
    [0.29, 0.008, 0.012],
    [0.33, 0.002, 0.005],
  ]);
  taper(
    body,
    cream,
    [
      [0, -0.03, -0.36],
      [0, -0.065, -0.22],
      [0, -0.045, 0.12],
      [0, -0.012, 0.28],
    ],
    [0.024, 0.03, 0.021, 0.002],
    "luo_pale_keel",
  );
  eyes(body, 0.034, 0.018, -0.367, 0.006);
  taper(
    body,
    dark,
    [
      [-0.02, -0.017, -0.409],
      [0, -0.025, -0.448],
      [0.02, -0.017, -0.409],
    ],
    [0.001, 0.0015, 0.001],
    "luo_pointed_fish_mouth",
  );
  for (const side of [-1, 1]) {
    taper(
      body,
      cream,
      [
        [side * 0.04, 0.025, -0.325],
        [side * 0.051, -0.005, -0.3],
        [side * 0.037, -0.033, -0.285],
      ],
      [0.001, 0.002, 0.001],
      "luo_gill_cover",
    );
    const wing = new THREE.Group();
    wing.name = "luo_swept_bird_wing";
    wing.position.set(side * 0.046, 0, -0.19);
    body.add(wing);
    taper(
      wing,
      bronze,
      [
        [0, 0, 0],
        [side * 0.12, 0.034, 0.04],
        [side * 0.29, 0.025, 0.13],
        [side * 0.45, 0.012, 0.245],
      ],
      [0.02, 0.027, 0.017, 0.001],
      "luo_swept_wing_bone",
    );
    for (let i = 0; i < 17; i++) {
      const u = i / 16,
        f = feather(
          wing,
          i < 5 ? teal : i % 3 === 0 ? cream : dark,
          0.19 + Math.sin(u * Math.PI) * 0.06,
          0.017,
          0.018,
          "luo_long_primary",
        );
      f.position.set(side * (0.015 + u * 0.405), 0.003, u * 0.2);
      f.rotation.y = side * (0.16 + u * 0.55);
    }
    for (let i = 0; i < 9; i++) {
      const f = feather(
        wing,
        bronze,
        0.09,
        0.018,
        0.02,
        "luo_overlapping_coverts",
      );
      f.position.set(side * i * 0.044, 0.018, i * 0.023);
      f.rotation.y = side * 0.4;
    }
    motions.push((t) => {
      wing.rotation.z = side * Math.sin(t * 1.75) * 0.24;
      wing.rotation.x = 0.1 + Math.sin(t * 1.75 + 0.35) * 0.08;
    });
    const tail = new THREE.Group();
    tail.name = "luo_split_ribbon_tail";
    tail.position.z = 0.255;
    body.add(tail);
    taper(
      tail,
      bronze,
      [
        [side * 0.003, 0, 0],
        [side * 0.046, 0.006, 0.14],
        [side * 0.1, -0.01, 0.34],
        [side * 0.068, 0.02, 0.58],
      ],
      [0.008, 0.014, 0.009, 0.0007],
      "luo_long_tail_ribbon",
    );
    const vane = feather(
      tail,
      cream,
      0.26,
      0.038,
      0.018,
      "luo_caudal_streamer",
    );
    vane.position.set(side * 0.028, 0, 0.07);
    vane.rotation.y = side * 0.2;
    motions.push((t) => {
      tail.rotation.y = Math.sin(t * 1.15 - side * 0.3) * 0.16;
      tail.rotation.x = Math.sin(t * 0.8) * 0.07;
    });
  }
  const dorsal = fin(
    body,
    teal,
    [
      [-0.29, 0.055],
      [-0.12, 0.1],
      [0.15, 0.05],
      [0.21, 0.02],
    ],
    0.004,
    "luo_low_dorsal_sail",
  );
  dorsal.rotation.y = Math.PI / 2;
  body.userData.headAnchor = new THREE.Vector3(0, 0, -0.448);
}
