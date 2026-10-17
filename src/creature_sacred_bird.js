import * as T from "three";
import {
  pgMaterial as mat,
  pgOval as oval,
  pgFeather as feather,
} from "./creature_penglai_art.js";
import {
  guardianLoft as loft,
  guardianSweep as sweep,
} from "./creature_guardian_art.js";

/** 朱雀以猛禽胸骨、覆羽翼面与外侧分指飞羽组成完整承力轮廓。 */
export function buildSacredBird(b, motions, root) {
  // 更宽的真实翼展保留旋转余量；不再以过远取景缩小领主体量。
  root.userData.guideRadius = 0.78;
  const red = mat("#722b22", 3),
    copper = mat("#a95530", 3),
    gold = mat("#bd9252", 3),
    dark = mat("#302a2b"),
    ivory = mat("#d1bc84", 4),
    eye = mat("#deaa63");
  const core = loft(
    b,
    "bird_v2_vermilion_bird",
    red,
    [
      [-0.33, 0.027, 0.042, 0.05],
      [-0.23, 0.119, 0.149, 0.02],
      [-0.065, 0.146, 0.173, -0.005],
      [0.1, 0.113, 0.131, -0.012],
      [0.25, 0.044, 0.063, -0.006],
      [0.31, 0.006, 0.015, 0],
    ],
    0.88,
  );
  core.userData.keepSeparate = core.userData.articulated = true;
  loft(
    b,
    "sacred_vermilion_forward_neck",
    red,
    [
      [-0.405, 0.038, 0.051, 0.14],
      [-0.34, 0.057, 0.068, 0.15],
      [-0.26, 0.084, 0.109, 0.1],
      [-0.13, 0.098, 0.119, 0.04],
    ],
    0.8,
  );
  const head = new T.Group();
  head.name = "vermilion_raptor_head";
  head.position.set(0, 0.15, -0.365);
  head.scale.setScalar(1.14);
  b.add(head);
  loft(
    head,
    "vermilion_angular_skull",
    red,
    [
      [-0.085, 0.018, 0.02, -0.003],
      [-0.047, 0.041, 0.04, 0.01],
      [0.006, 0.043, 0.044, 0.016],
      [0.065, 0.023, 0.033, 0.01],
    ],
    0.67,
  );
  sweep(
    head,
    ivory,
    [
      [0, 0.004, -0.053],
      [0, 0.004, -0.103],
      [0, -0.015, -0.141],
      [0, -0.046, -0.127],
    ],
    [0.029, 0.024, 0.012, 0.0005],
    "hooked_vermilion_beak",
  );
  sweep(
    head,
    dark,
    [
      [0, -0.02, -0.058],
      [0, -0.028, -0.108],
      [0, -0.039, -0.124],
    ],
    [0.019, 0.013, 0.0005],
    "vermilion_lower_mandible",
  );
  for (const side of [-1, 1]) {
    oval(
      head,
      dark,
      [side * 0.034, 0.025, -0.036],
      [0.019, 0.01, 0.014],
      "vermilion_recessed_orbit",
    );
    oval(
      head,
      eye,
      [side * 0.041, 0.025, -0.041],
      [0.009, 0.005, 0.008],
      "vermilion_focused_iris",
    );
    oval(
      head,
      dark,
      [side * 0.045, 0.025, -0.044],
      [0.003, 0.005, 0.003],
      "vermilion_pupil",
    );
    sweep(
      head,
      copper,
      [
        [side * 0.016, 0.042, -0.069],
        [side * 0.035, 0.05, -0.038],
        [side * 0.052, 0.048, 0.005],
        [side * 0.058, 0.033, 0.05],
      ],
      [0.006, 0.011, 0.012, 0.001],
      "swept_raptor_brow",
    );
  }
  for (let i = -3; i <= 3; i++) {
    const f = feather(
      head,
      i % 2 ? copper : gold,
      0.19 + (0.06 - Math.abs(i) * 0.015),
      0.022,
      0.055,
      "swept_vermilion_flame_crest",
    );
    f.position.set(i * 0.009, 0.043, 0.001);
    f.rotation.set(-0.52, i * 0.15, -i * 0.07);
  }
  // 胸肩披羽与躯干相叠；用宽羽片形成连续面，而不是细长梳齿。
  for (const side of [-1, 1])
    for (let row = 0; row < 3; row++)
      for (let j = 0; j < 5; j++) {
        const f = feather(
          b,
          row === 0 ? red : copper,
          0.135 + row * 0.015,
          0.031,
          0.022,
          "overlapping_vermilion_mantle",
        );
        f.position.set(
          side * (0.031 + j * 0.02),
          0.134 - row * 0.015,
          -0.205 + row * 0.044,
        );
        f.rotation.set(-0.18, side * (0.15 + j * 0.075), side * 0.13);
      }
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = new T.Group();
    wing.name = "sacred_broad_vermilion_wing";
    wing.position.set(side * 0.11, 0.06, -0.14);
    wing.scale.set(1.16, 1.12, 1.18);
    b.add(wing);
    sweep(
      wing,
      red,
      [
        [0, 0, 0],
        [side * 0.19, 0.025, 0.015],
        [side * 0.38, 0.012, -0.04],
        [side * 0.62, -0.006, -0.005],
      ],
      [0.055, 0.047, 0.033, 0.014],
      "vermilion_wing_leading_muscle",
    );
    for (let row = 0; row < 3; row++)
      for (let j = 0; j < 13; j++) {
        const x = 0.02 + j * 0.042,
          f = feather(
            wing,
            row === 0 ? red : row === 1 ? copper : gold,
            0.16 + row * 0.065 + Math.sin((j / 12) * Math.PI) * 0.05,
            0.033 + row * 0.003,
            0.017,
            "broad_overlapping_vermilion_covert",
          );
        f.position.set(side * x, 0.025 - row * 0.014, -0.009 + row * 0.045);
        f.rotation.y = side * (0.06 + j * 0.012);
      }
    const outer = new T.Group();
    outer.position.set(side * 0.37, 0, -0.026);
    wing.add(outer);
    outer.name = "vermilion_outer_wrist";
    for (let j = 0; j < 11; j++) {
      const f = feather(
        outer,
        j < 4 ? copper : gold,
        0.3 + Math.sin((j / 10) * Math.PI) * 0.11,
        0.038,
        0.022,
        "separated_vermilion_outer_primary",
      );
      f.position.set(side * j * 0.025, -0.014, j * 0.011);
      f.rotation.y = side * (0.16 + j * 0.105);
    }
    wings.push({ wing, outer, side });
    const leg = new T.Group();
    leg.position.set(side * 0.087, -0.115, 0.09);
    leg.scale.setScalar(1.15);
    b.add(leg);
    leg.name = "tucked_vermilion_grasping_leg";
    sweep(
      leg,
      copper,
      [
        [0, 0, 0],
        [side * 0.014, -0.07, 0.042],
        [side * 0.019, -0.091, 0.11],
      ],
      [0.026, 0.022, 0.014],
      "vermilion_muscular_thigh",
    );
    sweep(
      leg,
      ivory,
      [
        [side * 0.019, -0.091, 0.11],
        [side * 0.016, -0.12, 0.082],
        [side * 0.01, -0.12, 0.035],
      ],
      [0.013, 0.011, 0.009],
      "vermilion_scaled_ankle",
    );
    for (let j = -1; j <= 1; j++)
      sweep(
        leg,
        dark,
        [
          [side * 0.01, -0.12, 0.038],
          [side * 0.01 + j * 0.024, -0.13, -0.006],
          [side * 0.012 + j * 0.025, -0.108, -0.024],
        ],
        [0.008, 0.006, 0.0004],
        "hooked_vermilion_talon",
      );
  }
  const tail = new T.Group();
  tail.position.set(0, 0, 0.23);
  tail.name = "sacred_vermilion_tail_fan";
  b.add(tail);
  for (let j = -4; j <= 4; j++) {
    const f = feather(
      tail,
      j % 2 ? copper : gold,
      0.67 - Math.abs(j) * 0.06,
      0.044,
      0.035,
      "long_tapered_vermilion_tail_blade",
    );
    f.position.set(j * 0.012, -0.012, 0);
    f.rotation.y = j * 0.075;
  }
  const mouth = new T.Object3D();
  mouth.position.set(0, -0.02, -0.14);
  head.add(mouth);
  b.userData.mouthAnchors = [mouth];
  b.userData.headAnchor = new T.Vector3(
    0,
    0.15 - 0.02 * 1.14,
    -0.365 - 0.14 * 1.14,
  );
  const state = { effort: 0.5 };
  let previous;
  root.userData.vermilionFlightRig = { wings, tail, state };
  root.userData.resetSwimTravel = () => {
    state.effort = 0.5;
    previous = undefined;
  };
  motions.push((t, e) => {
    const dt =
      previous === undefined
        ? 0
        : Math.max(0, Math.min(0.12, (t - previous) / (1.7 + e * 1.1)));
    previous = t;
    state.effort = T.MathUtils.damp(state.effort, e, 4, dt);
    const beat = t * 0.67;
    for (const { wing, outer, side } of wings) {
      wing.rotation.z =
        side *
        (Math.sin(beat) * (0.19 + Math.min(state.effort, 2) * 0.05) - 0.04);
      wing.rotation.x = Math.cos(beat) * 0.035;
      outer.rotation.y = side * (0.06 + Math.max(0, Math.cos(beat)) * 0.1);
      outer.rotation.z = side * Math.sin(beat - 0.28) * 0.065;
    }
    tail.rotation.x = 0.025 + Math.sin(beat - 0.5) * 0.035;
    tail.rotation.y = Math.sin(t * 0.25) * 0.025;
    head.rotation.x = Math.sin(beat) * 0.012;
  });
}
