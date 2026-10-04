import * as THREE from "three";
import { bindTentacleMotion, reachTentacle } from "./tentacle_motion.js";
import {
  alienPart as part,
  alienMaterial as mat,
  alienTrunk as trunk,
  alienTaperedTube as tube,
  cachedAlienGeometry as geometry,
} from "./creature_europa_geometry.js";

/** 电影长足发光生物启发的原创巡狩者：八条无分叉细腕与集中发光腔。 */
export function buildLumenStalker(root, motions) {
  const anatomy = new THREE.Group();
  anatomy.name = "lumen_stalker_anatomy";
  root.add(anatomy);
  root.userData.anatomyType = "luminous-long-legged-octopoid";
  const skin = mat("#273e50"),
    ridge = mat("#577586"),
    dark = mat("#0b1826"),
    glow = mat("#94d8e9", 0.75),
    warm = mat("#d9b9ae", 0.4);
  part(
    anatomy,
    trunk(
      "lumen_tapered_mantle",
      [
        [-0.15, 0.1, 0.12, 0],
        [-0.04, 0.165, 0.2, 0.02],
        [0.12, 0.15, 0.21, 0.06],
        [0.32, 0.065, 0.13, 0.045],
        [0.44, 0.008, 0.018, 0],
      ],
      0.022,
      0.055,
    ),
    skin,
    "long_mantle",
  );
  part(
    anatomy,
    trunk(
      "lumen_ventral_recess",
      [
        [-0.19, 0.078, 0.04, -0.06],
        [-0.04, 0.095, 0.048, -0.065],
        [0.12, 0.04, 0.018, -0.06],
      ],
      0.012,
    ),
    dark,
    "recessed_mouth",
  );
  // 发光腔嵌在背侧肌体表面并露出透光瓣，避免被实心躯干完全遮住。
  const organs = [];
  for (let i = 0; i < 3; i++) {
    const p = part(
      anatomy,
      trunk(
        `lumen_organ${i}`,
        [
          [-0.08, 0.006, 0.005, -0.045],
          [-0.025, 0.026, 0.035, -0.02],
          [0.075, 0.024, 0.034, 0.01],
          [0.17, 0.008, 0.012, -0.005],
          [0.2, 0.003, 0.004, -0.02],
        ],
        0.018,
      ),
      i === 1 ? warm : glow,
      "luminous_chamber",
      [(i - 1) * 0.07, 0.228 - Math.abs(i - 1) * 0.008, -0.01],
    );
    p.userData.keepSeparate = true;
    organs.push(p);
    part(
      anatomy,
      tube(
        `lumen_organ_brow${i}`,
        [
          [(i - 1) * 0.075 - 0.025, 0.18, -0.08],
          [(i - 1) * 0.075 - 0.02, 0.269, 0.06],
          [(i - 1) * 0.075 - 0.02, 0.22, 0.17],
        ],
        0.012,
        0.003,
        20,
      ),
      ridge,
      "chamber_brow",
    );
  }
  let phase = "dormant";
  const arms = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + 0.16,
      x = Math.cos(a),
      y = Math.sin(a) * 0.64,
      arm = new THREE.Group();
    arm.name = `lumen_arm${i}`;
    arm.position.set(x * 0.1, y * 0.1, -0.08);
    anatomy.add(arm);
    const joint = [x * 0.38, y * 0.33, -0.19];
    part(
      arm,
      tube(
        `lumen_upper${i}`,
        [
          [0, 0, 0],
          [x * 0.1, y * 0.06, -0.065],
          [x * 0.21, y * 0.14, -0.13],
          joint,
        ],
        0.042,
        0.018,
        28,
      ),
      skin,
      "long_arm_root",
    );
    part(
      arm,
      tube(
        `lumen_upper_seam${i}`,
        [
          [x * 0.025, y * 0.01 + 0.028, -0.015],
          [x * 0.15, y * 0.085 + 0.02, -0.08],
          [x * 0.28, y * 0.21 + 0.013, -0.18],
        ],
        0.006,
        0.0025,
        20,
      ),
      ridge,
      "arm_seam",
    );
    const distal = new THREE.Group();
    distal.position.fromArray(joint);
    arm.add(distal);
    const distalPoints = [
      [0, 0, 0],
      [x * 0.28, y * 0.2, -0.045],
      [x * 0.72 - Math.sin(a) * 0.03, y * 0.58 + Math.cos(a) * 0.0225, -0.15],
      [x * 0.99 - Math.sin(a) * 0.18, y * 0.72 + Math.cos(a) * 0.135, -0.26],
      [x * 0.96 - Math.sin(a) * 0.45, y * 0.55 + Math.cos(a) * 0.3375, -0.34],
      [x * 0.62 - Math.sin(a) * 0.65, y * 0.22 + Math.cos(a) * 0.4875, -0.4],
      [x * 0.22 - Math.sin(a) * 0.57, -y * 0.02 + Math.cos(a) * 0.4275, -0.46],
      [-x * 0.06 - Math.sin(a) * 0.3, -y * 0.13 + Math.cos(a) * 0.225, -0.51],
      [-x * 0.12, -y * 0.14, -0.48],
    ];
    part(
      distal,
      tube(`lumen_distal${i}`, distalPoints, 0.018, 0.0012, 64),
      skin,
      "probing_arm_tip",
    );
    // 径向长腕返回内卷，增加真实中心线长度，不延长躯干和隐形攻击距离。
    const sensorCurve = new THREE.CatmullRomCurve3(
      distalPoints.map((p) => new THREE.Vector3(...p)),
    );
    for (let j = 0; j < 4; j++) {
      const sensorPosition = sensorCurve.getPointAt(0.16 + j * 0.16);
      sensorPosition.y += 0.012;
      const p = part(
        distal,
        geometry("lumen_sensor", () => new THREE.SphereGeometry(1, 12, 8)),
        j === 0 ? warm : glow,
        "arm_light_node",
        sensorPosition.toArray(),
      );
      p.scale.set(0.008, 0.008, 0.016);
    }
    arm.userData.centerlineLength =
      sensorCurve.getLength() + new THREE.Vector3(...joint).length();
    const fullCurve = new THREE.CatmullRomCurve3(
      [
        [0, 0, 0],
        [x * 0.1, y * 0.06, -0.065],
        [x * 0.21, y * 0.14, -0.13],
        ...distalPoints.map((p) => [
          p[0] + joint[0],
          p[1] + joint[1],
          p[2] + joint[2],
        ]),
      ].map((p) => new THREE.Vector3(...p)),
    );
    bindTentacleMotion(arm, `lumen_soft_arm_${i}`, fullCurve, motions, {
      count: 14,
      phase: a,
      amplitude: 0.22,
      curl: () => (phase === "windup" ? 0.25 : phase === "attack" ? 0.4 : 0),
    });
    arms.push({ arm });
  }
  const bounds = new THREE.Box3().setFromObject(anatomy),
    axis = bounds.max.z - bounds.min.z,
    scale = 1 / axis;
  anatomy.scale.setScalar(scale);
  anatomy.position.z = -(bounds.max.z + bounds.min.z) / 2 / axis;
  root.userData.guideRadius =
    (bounds.getSize(new THREE.Vector3()).length() / axis) * 0.54;
  root.userData.setBossPhase = (p) => (phase = p);
  const attackingArms = [arms[6].arm, arms[0].arm, arms[2].arm];
  const target = new THREE.Vector3();
  root.userData.lashArms = attackingArms;
  root.userData.resetLumenLash = () => {
    attackingArms.forEach((arm) => {
      const { bones, points } = arm.userData.tentacle;
      bones.forEach((bone, i) => {
        bone.position.copy(points[i]);
        if (i) bone.position.sub(points[i - 1]);
        bone.quaternion.identity();
      });
    });
    root.updateMatrixWorld(true);
  };
  root.userData.poseLumenLash = (targets, poses) => {
    attackingArms.forEach((arm, i) => {
      if (!(poses[i].amount > 0)) return;
      target.copy(targets[i]);
      arm.worldToLocal(target);
      reachTentacle(arm, target, poses[i].amount, i === 1 ? -1 : 1);
    });
    root.updateMatrixWorld(true);
  };
  motions.push((t, e) => {
    const gather = phase === "windup" ? 1 : phase === "attack" ? 1.25 : 0;
    anatomy.scale.y = scale * (1 + Math.sin(t * 0.55) * 0.024);
    organs.forEach((o, i) => {
      o.scale.y = 1 + Math.sin(t * 0.9 + i) * 0.08 + gather * 0.16;
    });
    arms.forEach(({ arm }, i) => {
      arm.rotation.y =
        Math.sin(t * 0.43 + i * 0.8) * 0.05 +
        gather * Math.cos((i * Math.PI) / 4) * 0.12;
      arm.rotation.x = Math.sin(t * 0.38 + i * 0.72) * 0.05;
    });
  });
}
