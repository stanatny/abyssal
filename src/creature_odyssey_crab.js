import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { skinMaterial } from "./creature_surface.js";
import { bindKarkinosGrounding } from "./creature_odyssey_crab_grounding.js";
import {
  part,
  loft,
  curvedGeometry,
  paint,
  anchor,
  coneGeometry,
} from "./creature_odyssey_geometry.js";

const SHELL = skinMaterial({
    vertexColors: true,
    roughness: 0.61,
    metalness: 0.19,
    clearcoat: 0.19,
    pattern: 0.065,
  }),
  JOINT = skinMaterial({
    vertexColors: true,
    roughness: 0.72,
    pattern: 0.027,
  }),
  EYE = skinMaterial({
    vertexColors: true,
    roughness: 0.27,
    clearcoat: 0.33,
    pattern: 0.012,
  });

/**
 * 创建潮怒巨蟹的甲壳、八条分节步足和一大一小两只螯足。
 * @param {THREE.Group} body 调用方的解剖根，-Z 朝前且 Y 朝上。
 * @param {Function[]} motions 由游戏既有时钟驱动的实例动作列表。
 * @returns {void} 嘴与螯尖锚点保存在 body.userData，不移动游戏根。
 */
export function buildKarkinos(body, motions) {
  const shell = new THREE.Group();
  shell.name = "karkinos_suspended_thorax";
  body.add(shell);
  part(shell, "karkinos_sculpted_carapace", buildCarapace, SHELL);
  part(shell, "karkinos_sternum_and_pleon", buildUnderside, JOINT);

  const legs = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) legs.push(buildLeg(shell, side, i));
  }
  const claws = [buildClaw(shell, -1, 1), buildClaw(shell, 1, 1.23)],
    eyes = [-1, 1].map((side) => buildEye(shell, side)),
    mouth = buildMouth(shell),
    combat = { phase: "dormant", ability: "", progress: 0 };

  body.userData.mouthAnchors = [mouth.anchor];
  body.userData.combatAnchor = anchor(
    shell,
    "karkinos_frontal_combat_anchor",
    [0, 0.008, -0.32],
  );
  body.userData.clawAnchors = claws.map((claw) => claw.tip);
  body.userData.clawInnerAnchors = claws.map((claw) => claw.innerTip);
  body.userData.anatomy = {
    walkingLegs: 8,
    articulatedSegmentsPerLeg: 3,
    chelipeds: 2,
    asymmetricClaws: true,
    stalkedEyes: 2,
    mouthparts: 4,
    tentacles: 0,
    crabCarapace: true,
    recessedCrabMouth: true,
  };
  // 可由领主状态机传入，不要求图鉴/普通模型调用方提供战斗状态。
  body.userData.setKarkinosCombat = (state = {}) => {
    combat.phase = state.phase || "dormant";
    combat.ability = state.ability || "";
    combat.progress = THREE.MathUtils.clamp(state.progress || 0, 0, 1);
  };
  body.userData.karkinosRig = { shell, legs, claws, eyes, mouth };
  const grounding = bindKarkinosGrounding(body, shell, legs);

  let poseTime,
    effortPose = 0.7,
    attackPose = 0,
    windupPose = 0,
    crushingPose = 0;
  motions.push((time, effort = 0.7, motionState) => {
    const delta =
      poseTime === undefined ? 0 : Math.max(0, Math.min(0.12, time - poseTime));
    poseTime = time;
    const phase = motionState?.phase || combat.phase,
      ability = motionState?.ability || combat.ability,
      alpha = 1 - Math.exp(-delta * 7),
      active = phase === "attack",
      winding = phase === "windup",
      pincer = ability === "claw" || ability === "pincer";
    effortPose += (THREE.MathUtils.clamp(effort, 0.15, 3) - effortPose) * alpha;
    attackPose += ((active ? 1 : 0) - attackPose) * alpha;
    windupPose += ((winding ? 1 : 0) - windupPose) * alpha;
    crushingPose += ((active && pincer ? 1 : 0) - crushingPose) * alpha;

    // 步足交错抬落；地形拟合在真实根变换后进行，不用整只蟹悬空掩盖穿地。
    shell.position.y = Math.sin(time * 1.14) * 0.005 - attackPose * 0.014;
    shell.rotation.set(0, 0, Math.sin(time * 0.6) * 0.009);
    for (const leg of legs) {
      const wave = time * 0.78 + leg.index * Math.PI * 0.75 + leg.side * 0.8,
        sweep = Math.sin(wave),
        lift = Math.max(0, Math.cos(wave)),
        stride = 0.022 + effortPose * 0.012;
      leg.gaitLift = lift * (0.015 + effortPose * 0.01);
      leg.gaitSwing = Math.cos(wave) > 0;
      leg.gaitTarget.copy(leg.restSole);
      leg.gaitTarget.x += leg.side * sweep * stride * 0.32;
      leg.gaitTarget.y += leg.gaitLift;
      leg.gaitTarget.z += sweep * stride;
      grounding.solveLeg(leg, leg.gaitTarget);
    }
    for (const claw of claws) {
      const idle = Math.sin(time * 0.5 + claw.side * 0.6);
      claw.shoulder.rotation.y =
        claw.side * (idle * 0.035 - windupPose * 0.19 + crushingPose * 0.47);
      claw.shoulder.rotation.x = -0.022 + windupPose * 0.17 + attackPose * 0.11;
      claw.elbow.rotation.y =
        -claw.side * (idle * 0.018 + windupPose * 0.06 - crushingPose * 0.08);
      claw.wrist.rotation.z =
        claw.side * (Math.sin(time * 0.37) * 0.025 - attackPose * 0.065);
      claw.finger.rotation.y =
        claw.side *
        (0.16 +
          Math.sin(time * 0.65) * 0.035 +
          windupPose * 0.28 -
          crushingPose * 0.16);
    }
    for (const eye of eyes) {
      eye.rotation.y = Math.sin(time * 0.37 + eye.userData.side) * 0.07;
      eye.rotation.z =
        eye.userData.side * (Math.sin(time * 0.26) * 0.02 - windupPose * 0.045);
    }
    for (let i = 0; i < mouth.palps.length; i++)
      mouth.palps[i].rotation.z =
        (i % 2 ? 1 : -1) *
        (0.06 + Math.sin(time * 0.8 + i) * 0.025 + attackPose * 0.045);
  });
}

// 所有复合几何只在首次创建时合批，运行中只改私有关节变换。
function join(parts) {
  const normalized = parts.map((source) => {
    const g = source.index ? source.toNonIndexed() : source.clone();
    g.deleteAttribute("uv");
    source.dispose();
    return g;
  });
  const result = mergeGeometries(normalized, false);
  normalized.forEach((g) => g.dispose());
  return result;
}

function ellipsoid(p, scale, color, segments = 14) {
  const g = new THREE.SphereGeometry(1, segments, Math.max(8, segments >> 1));
  g.scale(...scale);
  g.translate(...p);
  return paint(g, color, color, 0.028);
}

function curve(points, radii, color, belly = color, segments = 16, sides = 8) {
  return curvedGeometry(points, radii, color, belly, segments, sides, 0.028);
}

function spike(p, direction, length, radius, color = "#bc966a") {
  return paint(coneGeometry(radius, length, direction, p), color);
}

function buildCarapace() {
  const g = new THREE.SphereGeometry(1, 64, 32),
    p = g.attributes.position,
    colors = [],
    red = new THREE.Color("#693c39"),
    bronze = new THREE.Color("#ac885b"),
    patina = new THREE.Color("#637b72"),
    dark = new THREE.Color("#302e2d"),
    color = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const nx = p.getX(i),
      ny = p.getY(i),
      nz = p.getZ(i),
      angle = Math.atan2(nz, nx),
      rim = 1 + 0.022 * Math.cos(angle * 12) * (1 - Math.abs(ny)),
      centralRidge = Math.exp(-((nx / 0.16) ** 2)) * Math.max(0, ny),
      plates =
        (0.5 + 0.5 * Math.cos(angle * 8 + nz * 2)) * Math.max(0, ny) ** 1.8,
      x = nx * 0.347 * rim,
      y =
        0.018 +
        (ny < 0 ? ny * 0.093 : ny * 0.145) +
        centralRidge * 0.02 +
        plates * 0.011,
      z = nz * 0.286 * rim;
    p.setXYZ(i, x, y, z);
    const weathering =
        (0.5 + 0.5 * Math.sin(x * 106 + z * 82)) *
        (0.5 + 0.5 * Math.sin(z * 132 - x * 69)),
      edge = 1 - THREE.MathUtils.smoothstep(Math.abs(ny), 0.02, 0.3),
      ridgeWear = centralRidge * 0.36 + plates * 0.22;
    color
      .copy(red)
      .lerp(bronze, Math.min(0.74, edge * 0.51 + ridgeWear))
      .lerp(patina, weathering * 0.25)
      .lerp(dark, Math.max(0, -ny) * 0.6);
    color.multiplyScalar(0.91 + weathering * 0.14);
    colors.push(color.r, color.g, color.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const pieces = [g];
  // 固定外缘形成真实锯齿侧甲，而非把角刺悬在平滑球面上。
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const angle = -1.04 + (i / 6) * 2.06,
        x = side * Math.cos(angle) * 0.331,
        z = Math.sin(angle) * 0.278;
      pieces.push(
        spike(
          [x, 0.032, z],
          [side * 0.92, 0.22, Math.sin(angle) * 0.5],
          0.047 + (i === 3 ? 0.018 : 0),
          0.017,
        ),
      );
    }
    pieces.push(
      curve(
        [
          [side * 0.085, 0.161, -0.125],
          [side * 0.145, 0.143, -0.049],
          [side * 0.22, 0.102, 0.022],
          [side * 0.293, 0.061, 0.067],
        ],
        [0.009, 0.013, 0.009, 0.004],
        "#ad895f",
        "#695743",
        22,
        7,
      ),
      curve(
        [
          [side * 0.049, 0.167, 0.035],
          [side * 0.134, 0.15, 0.102],
          [side * 0.208, 0.111, 0.168],
          [side * 0.25, 0.061, 0.202],
        ],
        [0.007, 0.011, 0.008, 0.002],
        "#95836a",
        "#534c43",
        22,
        7,
      ),
    );
    // 小型角质瘤与侵蚀斑沿边甲分布，保持中央大甲片清晰。
    for (let i = 0; i < 12; i++) {
      const a = -1.18 + (i / 11) * 2.36,
        x = side * Math.cos(a) * 0.286,
        z = Math.sin(a) * 0.226,
        y =
          0.022 +
          Math.sqrt(Math.max(0, 1 - (x / 0.347) ** 2 - (z / 0.286) ** 2)) *
            0.145;
      pieces.push(
        ellipsoid(
          [x, y, z],
          [0.009 + (i % 3) * 0.002, 0.004, 0.009],
          i % 3 ? "#8c6d52" : "#779083",
          10,
        ),
      );
    }
  }
  // 前缘双齿遮住眼柄根，嘴孔在这条额甲下方保持可见。
  for (const side of [-1, 1])
    pieces.push(
      spike(
        [side * 0.055, 0.027, -0.272],
        [side * 0.17, 0.08, -1],
        0.035,
        0.021,
      ),
    );
  return join(pieces);
}

function buildUnderside() {
  const pieces = [
    ellipsoid([0, -0.066, 0.022], [0.29, 0.073, 0.237], "#3d3432", 32),
  ];
  // 折叠腹脐与分开的胸腹硬板给壳底提供结构，而不是空洞的壳盖。
  for (let i = 0; i < 7; i++) {
    const z = 0.14 - i * 0.036,
      width = 0.118 - i * 0.012;
    pieces.push(
      ellipsoid([0, -0.128, z], [width, 0.012, 0.027], "#a28663", 14),
    );
  }
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++)
      pieces.push(
        ellipsoid(
          [side * 0.228, -0.074, -0.144 + i * 0.101],
          [0.062, 0.049, 0.043],
          "#744b3d",
          16,
        ),
      );
  return join(pieces);
}

function buildLeg(parent, side, index) {
  const k = `karkinos_leg${side}_${index}`,
    hip = new THREE.Group(),
    knee = new THREE.Group(),
    ankle = new THREE.Group(),
    z = -0.17 + index * 0.116,
    rearward = (index - 1.4) * 0.038,
    upperEnd = [side * (0.185 + (index < 2 ? 0.017 : 0)), -0.025, rearward],
    lowerEnd = [side * 0.105, -0.17, rearward * 0.58],
    soleEnd = [side * 0.092, -0.108, -0.027];
  hip.name = `${k}_coxa`;
  knee.name = `${k}_merus_joint`;
  ankle.name = `${k}_carpus_joint`;
  hip.position.set(side * 0.246, -0.064, z);
  parent.add(hip);
  knee.position.set(...upperEnd);
  hip.add(knee);
  ankle.position.set(...lowerEnd);
  knee.add(ankle);
  part(
    hip,
    `${k}_upper_armored_merus`,
    () => {
      const pieces = [
        curve(
          [[0, 0, 0], [side * 0.07, -0.005, rearward * 0.45], upperEnd],
          [0.034, 0.04, 0.025],
          "#87573e",
          "#b18d5f",
          20,
          12,
        ),
        ellipsoid(upperEnd, [0.028, 0.025, 0.028], "#302e2b", 14),
      ];
      for (let i = 0; i < 4; i++) {
        const t = 0.24 + i * 0.16;
        pieces.push(
          spike(
            [upperEnd[0] * t, 0.031, rearward * t],
            [side * 0.1, 1, 0.1],
            0.018 - i * 0.002,
            0.006,
            "#bca17b",
          ),
        );
      }
      return join(pieces);
    },
    SHELL,
  );
  part(
    knee,
    `${k}_tibial_shield`,
    () =>
      join([
        curve(
          [[0, 0, 0], [side * 0.073, -0.088, rearward * 0.35], lowerEnd],
          [0.026, 0.027, 0.017],
          "#85513b",
          "#aa8d67",
          20,
          10,
        ),
        curve(
          [
            [side * 0.01, 0.014, 0],
            [side * 0.078, -0.072, rearward * 0.35],
            [side * 0.12, -0.15, rearward * 0.58],
          ],
          [0.003, 0.005, 0.002],
          "#c1a37b",
          "#c1a37b",
          18,
          6,
        ),
        ellipsoid(lowerEnd, [0.018, 0.016, 0.021], "#322f2b", 12),
      ]),
    SHELL,
  );
  part(
    ankle,
    `${k}_pointed_dactyl`,
    () =>
      curve(
        [
          [0, 0, 0],
          [side * 0.043, -0.047, -0.003],
          [side * 0.083, -0.106, -0.02],
          [side * 0.092, -0.108, -0.027],
        ],
        [0.018, 0.016, 0.008, 0.001],
        "#a18c64",
        "#403f36",
        22,
        10,
      ),
    SHELL,
  );
  const sole = anchor(ankle, `${k}_actual_sole`, soleEnd),
    restSole = hip.position
      .clone()
      .add(knee.position)
      .add(ankle.position)
      .add(sole.position);
  return {
    hip,
    knee,
    ankle,
    sole,
    restSole,
    gaitTarget: restSole.clone(),
    gaitLift: 0,
    gaitSwing: false,
    side,
    index,
  };
}

function buildClaw(parent, side, scale) {
  const k = `karkinos_cheliped${side}`,
    shoulder = new THREE.Group(),
    elbow = new THREE.Group(),
    wrist = new THREE.Group(),
    finger = new THREE.Group(),
    upperEnd = [side * 0.119, 0.046, -0.124],
    foreEnd = [side * 0.026, 0.03, -0.145];
  shoulder.name = `${k}_shoulder`;
  elbow.name = `${k}_elbow`;
  wrist.name = `${k}_wrist`;
  finger.name = `${k}_moving_finger`;
  shoulder.position.set(side * 0.213, -0.024, -0.206);
  parent.add(shoulder);
  elbow.position.set(...upperEnd);
  shoulder.add(elbow);
  wrist.position.set(...foreEnd);
  wrist.scale.setScalar(scale);
  elbow.add(wrist);
  part(
    shoulder,
    `${k}_upper_arm`,
    () =>
      join([
        curve(
          [[0, 0, 0], [side * 0.075, 0.026, -0.059], upperEnd],
          [0.041, 0.055, 0.043],
          "#815341",
          "#9d815d",
          22,
          14,
        ),
        ellipsoid(upperEnd, [0.045, 0.034, 0.041], "#33312c", 16),
        spike([side * 0.05, 0.052, -0.05], [side * 0.5, 1, 0.2], 0.026, 0.012),
      ]),
    SHELL,
  );
  part(
    elbow,
    `${k}_forearm`,
    () =>
      join([
        curve(
          [[0, 0, 0], [side * 0.028, 0.02, -0.07], foreEnd],
          [0.045, 0.049, 0.037],
          "#86583e",
          "#af9163",
          24,
          14,
        ),
        ellipsoid(foreEnd, [0.039, 0.035, 0.032], "#302e29", 16),
        spike(
          [side * 0.025, 0.063, -0.084],
          [side * 0.1, 1, -0.2],
          0.039,
          0.016,
        ),
      ]),
    SHELL,
  );
  part(
    wrist,
    `${k}_massive_fixed_palm`,
    () => {
      const pieces = [
        loft(
          [
            [-0.134, 0.041, 0.045, 0],
            [-0.092, 0.09, 0.082, 0.004],
            [0.009, 0.086, 0.077, 0.004],
            [0.058, 0.037, 0.039, 0],
          ],
          "#8d513b",
          "#bd9464",
          { rings: 38, sides: 24, relief: 0.042 },
        ),
        curve(
          [
            [side * 0.052, 0, -0.094],
            [side * 0.077, 0.008, -0.153],
            [side * 0.055, 0.012, -0.238],
            [side * 0.018, 0.005, -0.27],
          ],
          [0.035, 0.031, 0.019, 0.004],
          "#a56b48",
          "#c2a476",
          28,
          14,
        ),
      ];
      for (let i = 0; i < 4; i++)
        pieces.push(
          spike(
            [side * (0.071 - i * 0.009), 0.007, -0.15 - i * 0.026],
            [-side, 0.1, -0.07],
            0.018 - i * 0.002,
            0.009,
            "#ddc79c",
          ),
        );
      for (let i = 0; i < 5; i++) {
        const z = -0.052 + i * 0.016;
        pieces.push(
          curve(
            [
              [-0.063, 0.043, z],
              [0, 0.081, z - 0.006],
              [0.063, 0.043, z],
            ],
            [0.0015, 0.0032, 0.0015],
            i % 2 ? "#615245" : "#bf9b71",
            "#bf9b71",
            14,
            6,
          ),
        );
      }
      for (let i = 0; i < 4; i++)
        pieces.push(
          spike(
            [side * 0.055, 0.044, -0.071 + i * 0.035],
            [side * 0.9, 0.8, 0.12],
            0.023,
            0.01,
          ),
        );
      return join(pieces);
    },
    SHELL,
  );
  finger.position.set(-side * 0.057, 0.003, -0.09);
  wrist.add(finger);
  part(
    finger,
    `${k}_jointed_movable_dactyl`,
    () => {
      const pieces = [
        curve(
          [
            [0, 0, 0],
            [-side * 0.026, 0.008, -0.062],
            [-side * 0.007, 0.01, -0.145],
            [side * 0.07, 0.004, -0.18],
          ],
          [0.031, 0.027, 0.017, 0.004],
          "#a27550",
          "#c1a77e",
          28,
          14,
        ),
        ellipsoid([0, 0, 0], [0.034, 0.019, 0.027], "#3b3630", 14),
      ];
      for (let i = 0; i < 4; i++)
        pieces.push(
          spike(
            [-side * 0.012 + side * i * 0.005, 0.006, -0.06 - i * 0.028],
            [side * 0.96, 0.08, 0.12],
            0.018 - i * 0.001,
            0.008,
            "#e3d2a8",
          ),
        );
      return join(pieces);
    },
    SHELL,
  );
  const tip = anchor(wrist, `${k}_fixed_tip_anchor`, [
      side * 0.018,
      0.005,
      -0.27,
    ]),
    innerTip = anchor(finger, `${k}_moving_tip_anchor`, [
      side * 0.07,
      0.004,
      -0.18,
    ]);
  return { shoulder, elbow, wrist, finger, tip, innerTip, side };
}

function buildEye(parent, side) {
  const eye = new THREE.Group(),
    k = `karkinos_eye${side}`;
  eye.name = `${k}_stalk_rig`;
  eye.position.set(side * 0.106, 0.043, -0.23);
  eye.userData.side = side;
  parent.add(eye);
  part(
    eye,
    `${k}_armored_peduncle`,
    () =>
      join([
        curve(
          [
            [0, 0, 0],
            [side * 0.008, 0.045, -0.034],
            [side * 0.016, 0.079, -0.06],
          ],
          [0.016, 0.011, 0.012],
          "#ad9167",
          "#79654c",
          20,
          10,
        ),
        ellipsoid(
          [side * 0.016, 0.079, -0.06],
          [0.022, 0.019, 0.018],
          "#2d302b",
          16,
        ),
        curve(
          [
            [side * 0.016 - 0.024, 0.086, -0.067],
            [side * 0.016, 0.091, -0.077],
            [side * 0.016 + 0.024, 0.086, -0.067],
          ],
          [0.006, 0.008, 0.006],
          "#ad9167",
          "#79654c",
          18,
          8,
        ),
      ]),
    SHELL,
  );
  part(
    eye,
    `${k}_faceted_retina`,
    () =>
      ellipsoid(
        [side * 0.017, 0.081, -0.072],
        [0.016, 0.0105, 0.008],
        "#c5ae64",
        22,
      ),
    EYE,
  );
  part(
    eye,
    `${k}_fitted_pupil`,
    () =>
      join([
        ellipsoid(
          [side * 0.016, 0.081, -0.079],
          [0.0047, 0.008, 0.0025],
          "#10252a",
          18,
        ),
        ellipsoid(
          [side * 0.01, 0.085, -0.081],
          [0.0023, 0.0025, 0.001],
          "#e9dbb3",
          10,
        ),
      ]),
    EYE,
  );
  return eye;
}

function buildMouth(parent) {
  const mouth = new THREE.Group();
  mouth.name = "karkinos_buccal_apparatus";
  mouth.position.set(0, -0.036, -0.227);
  parent.add(mouth);
  // 口器背板与额甲、胸板相交，口裂嵌在其中；不再悬挂独立金边黑色杯状物。
  part(
    mouth,
    "karkinos_attached_oral_apron",
    () =>
      join([
        ellipsoid([0, 0, 0], [0.093, 0.044, 0.053], "#664d3d", 28),
        curve(
          [
            [-0.08, 0.022, -0.019],
            [-0.041, 0.026, -0.041],
            [0.041, 0.026, -0.041],
            [0.08, 0.022, -0.019],
          ],
          [0.011, 0.011, 0.011, 0.011],
          "#8a7251",
          "#5b4232",
          24,
          10,
        ),
      ]),
    JOINT,
  );
  const cavity = part(
    mouth,
    "karkinos_inset_oral_slit",
    () => ellipsoid([0, 0.001, -0.049], [0.033, 0.015, 0.005], "#1d2728", 22),
    JOINT,
  );
  const palps = [];
  for (const side of [-1, 1])
    for (let i = 0; i < 2; i++) {
      const palp = new THREE.Group();
      palp.name = `karkinos_maxilliped${side}_${i}`;
      palp.position.set(side * (0.026 + i * 0.022), 0.003 - i * 0.019, -0.044);
      mouth.add(palp);
      part(
        palp,
        `${palp.name}_laminated_surface`,
        () =>
          join([
            ellipsoid(
              [-side * 0.006, 0, -0.006],
              [0.019, 0.017, 0.008],
              "#a88759",
              18,
            ),
            curve(
              [
                [0, 0, 0],
                [-side * 0.011, -0.005, -0.006],
                [-side * 0.019, -0.002, -0.008],
              ],
              [0.011, 0.01, 0.003],
              "#b49a73",
              "#655340",
              14,
              8,
            ),
            spike(
              [-side * 0.013, -0.008, -0.009],
              [-side, -0.1, -0.1],
              0.008,
              0.003,
              "#c1a984",
            ),
          ]),
        JOINT,
      );
      palps.push(palp);
    }
  return {
    palps,
    cavity,
    root: mouth,
    anchor: anchor(mouth, "karkinos_true_mouth_anchor", [0, 0.001, -0.052]),
  };
}
