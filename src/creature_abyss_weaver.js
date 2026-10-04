import * as THREE from "three";
import { bindTentacleMotion } from "./tentacle_motion.js";
import {
  alienPart as part,
  alienMaterial as mat,
  alienTrunk as trunk,
  alienTube as tube,
  alienRing as ring,
  alienTaperedTube as tapered,
} from "./creature_europa_geometry.js";

/** 三叶外套与六条分叉腕构成原创冰下领主，腕间空隙不增加碰撞代理。 */
export function buildAbyssWeaver(root, motions) {
  const mantle = new THREE.Group();
  mantle.name = "weaver_continuous_mantle";
  root.add(mantle);
  const skin = mat("#667786"),
    rib = mat("#b6a397"),
    organMat = mat("#bb98c6", 0.32),
    dark = mat("#172332");
  part(
    mantle,
    trunk(
      "weaver_three_lobed_mantle",
      [
        [-0.3, 0.1, 0.09, 0],
        [-0.2, 0.25, 0.18, 0.01],
        [0, 0.28, 0.22, 0.03],
        [0.22, 0.22, 0.17, 0.01],
        [0.32, 0.04, 0.03, 0],
      ],
      0.055,
      0.22,
    ),
    skin,
    "three_lobed_mantle",
  );
  part(
    mantle,
    trunk(
      "weaver_recessed_organ",
      [
        [-0.12, 0.05, 0.035, 0.2],
        [0, 0.07, 0.055, 0.22],
        [0.12, 0.045, 0.03, 0.2],
      ],
      0.09,
    ),
    organMat,
    "pulsing_recess",
  );
  const mouth = part(
    mantle,
    ring("weaver_radial_aperture", 0.09, 0.022),
    dark,
    "ventral_mouth",
    [0, -0.19, -0.05],
  );
  mouth.rotation.x = Math.PI / 2;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    part(
      mantle,
      tube(
        `weaver_feeding_rib${i}`,
        [
          [Math.cos(a) * 0.1, -0.17, Math.sin(a) * 0.1 - 0.05],
          [Math.cos(a) * 0.05, -0.2, Math.sin(a) * 0.05 - 0.05],
        ],
        0.007,
        8,
      ),
      rib,
      "feeding_rib",
    );
  }
  let phase = "dormant";
  const arms = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.17,
      arm = new THREE.Group();
    arm.position.set(Math.cos(a) * 0.17, -0.03, Math.sin(a) * 0.13);
    arm.rotation.y = -a;
    mantle.add(arm);
    part(
      arm,
      tapered(
        `weaver_arm_root${i}`,
        [
          [0, 0, 0],
          [0.12, -0.02, 0.02],
          [0.26, -0.04, 0.03],
          [0.4, -0.06, 0.04],
        ],
        0.055,
        0.019,
        32,
      ),
      skin,
      "muscular_arm",
    );
    const distal = new THREE.Group();
    distal.position.set(0.38, -0.06, 0.04);
    arm.add(distal);
    for (const side of [-1, 1]) {
      part(
        distal,
        tapered(
          `weaver_arm_fork${i}_${side}`,
          [
            [0, 0, 0],
            [0.14, 0.01, side * 0.06],
            [0.27, 0.05, side * 0.1],
            [0.35, 0.08, side * 0.08],
          ],
          0.019,
          0.0015,
          28,
        ),
        skin,
        "bifurcating_tip",
      );
      for (let j = 0; j < 5; j++)
        part(
          distal,
          tube(
            `weaver_fringe${i}_${side}_${j}`,
            [
              [0.06 + j * 0.045, 0.01, side * (0.035 + j * 0.009)],
              [0.08 + j * 0.045, -0.035, side * (0.085 + j * 0.015)],
            ],
            0.0025,
            5,
          ),
          rib,
          "sensory_fringe",
        );
    }
    part(
      arm,
      tube(
        `weaver_pressure_ridge${i}`,
        [
          [0.02, 0.028, 0],
          [0.13, 0.015, 0.015],
          [0.28, -0.008, 0.03],
          [0.4, -0.025, 0.04],
        ],
        0.009,
        16,
      ),
      rib,
      "pressure_ridge",
    );
    const curve = new THREE.CatmullRomCurve3(
      [
        [0, 0, 0],
        [0.12, -0.02, 0.02],
        [0.26, -0.04, 0.03],
        [0.4, -0.06, 0.04],
        [0.52, -0.05, 0.04],
        [0.65, -0.01, 0.04],
        [0.73, 0.02, 0.04],
      ].map((p) => new THREE.Vector3(...p)),
    );
    bindTentacleMotion(arm, `weaver_soft_arm_${i}`, curve, motions, {
      count: 10,
      phase: a,
      amplitude: 0.28,
      curl: () => (phase === "windup" ? 0.2 : phase === "attack" ? 0.35 : 0),
    });
    arms.push({ arm });
  }
  root.userData.setBossPhase = (p) => (phase = p);
  motions.push((t, e) => {
    const warning = phase === "windup" ? 1 : phase === "attack" ? 1.2 : 0;
    mantle.scale.y = normalizedScale * (1 + Math.sin(t * 0.7) * 0.035);
    arms.forEach(({ arm }, i) => {
      arm.rotation.z = Math.sin(t * 0.55 + i * 0.9) * 0.1 - warning * 0.12;
      arm.rotation.x = Math.sin(t * 0.43 + i * 0.7) * 0.1;
    });
  });
  const bounds = new THREE.Box3().setFromObject(root),
    axis = bounds.max.z - bounds.min.z,
    normalizedScale = 1 / axis;
  mantle.scale.set(normalizedScale * 1.4, normalizedScale, normalizedScale);
  mantle.position.z = -(bounds.max.z + bounds.min.z) / 2 / axis;
}
