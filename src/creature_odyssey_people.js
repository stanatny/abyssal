import * as THREE from "three";
import { bindTentacleMotion } from "./tentacle_motion.js";
import { createOdysseyFace } from "./creature_odyssey_face.js";
import {
  bindOdysseySerpentine,
  odysseySerpentineSupport,
} from "./creature_odyssey_serpentine.js";
import {
  part,
  loft,
  oval,
  tube,
  fin,
  flexible,
  eyePair,
  anchor,
  teeth,
  BRONZE,
  curvedGeometry,
} from "./creature_odyssey_geometry.js";

/** 人鱼、海神马和蛇冠娜迦共享解剖工具，但保留独立身材、头部与推进方式。 */
export function buildOdysseyPeople(kind, body, motions) {
  if (kind === "hippocampus") horse(body, motions);
  else if (kind === "siren_eel") siren(body, motions);
  else humanoid(kind, body, motions);
}
function face(parent, key, p, scale, skin, hair, motions) {
  return createOdysseyFace(parent, {
    key,
    position: p,
    scale,
    skin,
    hair,
    motions,
  });
}
function humanoid(kind, body, motions) {
  const naga = kind === "naga_huntress",
    guard = kind === "triton_guard",
    k = kind;
  const skin = naga ? "#829e88" : guard ? "#789d9c" : "#d7b1a1",
    tailColor = naga ? "#3e7964" : guard ? "#4b7e83" : "#98728b",
    hair = naga ? "#183e39" : guard ? "#395154" : "#614450";
  const torso = part(body, `${k}_thorax_v2`, () =>
    loft(
      smoothThorax([
        [-0.275, 0.034, 0.038, 0.026],
        [-0.235, 0.11, 0.067, 0.01],
        [-0.17, guard ? 0.14 : 0.1, 0.071, 0],
        [-0.075, 0.07, 0.054, -0.01],
        [0.025, 0.06, 0.046, -0.003],
        [0.09, 0.075, 0.048, 0],
      ]),
      skin,
      "#c6b79b",
      { rings: 32, sides: 24 },
    ),
  );
  const head = face(
    body,
    k,
    [0, 0.087, -0.26],
    guard ? 1.2 : 1,
    skin,
    hair,
    motions,
  );
  tube(
    body,
    `${k}_neck`,
    [
      [0, 0.025, -0.235],
      [0, 0.075, -0.265],
    ],
    0.034,
    skin,
    12,
    14,
  );
  const tail = naga
    ? createNagaTail(body, k, tailColor, motions)
    : createMermaidTail(body, k, tailColor, motions);
  if (!naga)
    body.userData.propulsion = {
      axis: "vertical",
      tailRoot: tail.arm,
      bones: tail.rig.bones,
      headStable: true,
    };
  for (const side of [-1, 1]) createDragArm(body, k, side, skin, motions);
  if (naga) {
    // 蛇冠是连续厚膜，位于头后且与肩颈连通，剪影不同于人鱼与塞壬。
    part(body, `${k}_cobra_hood`, () => {
      const g = loft(
        [
          [-0.27, 0.043, 0.07, 0.1],
          [-0.21, 0.1, 0.13, 0.075],
          [-0.145, 0.153, 0.145, 0.065],
          [-0.08, 0.128, 0.12, 0.04],
          [0.02, 0.078, 0.075, 0.005],
          [0.08, 0.055, 0.06, 0],
        ],
        "#396e58",
        "#afaf78",
        { rings: 40, sides: 28, relief: 0.025 },
      );
      return g;
    });
    for (const s of [-1, 1])
      tube(
        body,
        `${k}_hood_trim${s}`,
        [
          [s * 0.07, 0.07, 0.04],
          [s * 0.145, 0.105, -0.08],
          [s * 0.12, 0.2, -0.15],
          [s * 0.06, 0.207, -0.21],
        ],
        0.005,
        "#c2a565",
        24,
        8,
      );
    for (let i = 0; i < 5; i++)
      part(head.head, `${k}_crown_v2${i}`, () =>
        curvedGeometry(
          [
            [0.022 * (i - 2), 0.093, 0.015],
            [0.024 * (i - 2), 0.127 + 0.015 * (2 - Math.abs(i - 2)), 0.024],
            [0.025 * (i - 2), 0.142 + 0.025 * (2 - Math.abs(i - 2)), 0.027],
          ],
          [0.006, 0.004, 0.0002],
          "#b59b64",
          "#ddc58b",
          24,
          8,
        ),
      );
  } else if (guard) {
    for (const s of [-1, 1]) {
      oval(
        body,
        `${k}_shell_pauldron${s}`,
        [s * 0.109, 0.054, -0.171],
        [0.053, 0.073, 0.093],
        "#809688",
        18,
      );
      for (let i = 0; i < 5; i++)
        tube(
          body,
          `${k}_armor_rib${s}_${i}`,
          [
            [s * 0.1, 0.104, -0.2 + i * 0.022],
            [s * 0.142, 0.047, -0.175 + i * 0.022],
          ],
          0.004,
          "#c5b07a",
          10,
          6,
        );
    }
    part(body, `${k}_cuirass`, () =>
      loft(
        [
          [-0.219, 0.08, 0.028, 0.064],
          [-0.15, 0.093, 0.029, 0.066],
          [-0.065, 0.057, 0.023, 0.039],
        ],
        "#64867c",
        "#a69c77",
        { rings: 22, sides: 18, relief: 0.05 },
      ),
    );
    for (let i = 0; i < 4; i++)
      part(head.head, `${k}_sea_beard_v2${i}`, () =>
        curvedGeometry(
          [
            [0.015 * (i - 1.5), -0.027, -0.063],
            [0.018 * (i - 1.5), -0.057, -0.022],
            [0.024 * (i - 1.5), -0.045, 0.051],
          ],
          [0.006, 0.0048, 0.0004],
          hair,
          hair,
          24,
          8,
        ),
      );
  } else {
    for (const s of [-1, 1])
      part(
        body,
        `${k}_ventral_shell_bodice_v2${s}`,
        () => {
          const g = new THREE.SphereGeometry(1, 28, 18),
            p = g.attributes.position;
          for (let i = 0; i < p.count; i++) {
            const x = p.getX(i),
              y = p.getY(i),
              z = p.getZ(i),
              rib = 1 + 0.055 * Math.cos(Math.atan2(x, z) * 12);
            p.setXYZ(
              i,
              s * 0.037 + x * 0.04,
              y * 0.015 - 0.071,
              z * 0.064 * rib - 0.145,
            );
          }
          g.computeVertexNormals();
          return g;
        },
        BRONZE,
        `${k}_ventral_shell_bodice_v2${s}`,
      );
    for (let i = 0; i < 5; i++)
      part(head.head, `${k}_coral_crown_v2${i}`, () =>
        curvedGeometry(
          [
            [0.021 * (i - 2), 0.09, 0.007],
            [0.025 * (i - 2), 0.127 + Math.sin(i) * 0.012, 0.012],
            [0.031 * (i - 2), 0.145, 0.004],
          ],
          [0.004, 0.003, 0.0002],
          "#c67b80",
          "#d6a09a",
          22,
          8,
        ),
      );
  }
  body.userData.mouthAnchors = [head.mouth];
  torso.userData.anatomicalSupport = true;
}
/** 人鱼尾的垂向波由腰根向尾柄传播，鳍和鳞饰都使用同一活动表面。 */
function createMermaidTail(body, key, color, motions) {
  const arm = new THREE.Group(),
    points = [
      [0, 0, 0.055],
      [0, -0.015, 0.21],
      [0, -0.018, 0.45],
      [0, 0.026, 0.65],
      [0, 0.035, 0.83],
    ],
    radii = [0.075, 0.065, 0.038, 0.021, 0.008],
    support = odysseySerpentineSupport(points, radii, {
      segments: 74,
      relief: 0.012,
    });
  arm.name = `${key}_propulsive_tail_v3`;
  body.add(arm);
  part(arm, `${key}_propulsive_tail_skin_v3`, () =>
    curvedGeometry(points, radii, color, "#b8a9ba", 74, 20, 0.012),
  );
  for (let i = 0; i < 6; i++)
    for (const side of [-1, 1]) {
      const u = 0.07 + i * 0.106,
        angles = [0.47, 0.18, -0.12].map((a) => (side === 1 ? a : Math.PI - a));
      tube(
        arm,
        `${key}_fitted_tail_scale_v3_${side}_${i}`,
        angles.map((a, j) => support.sample(u + (j - 1) * 0.005, a).toArray()),
        0.0014,
        "#ceb3c8",
        8,
        4,
      );
    }
  fin(
    arm,
    `${key}_bound_fluke_v3`,
    [
      [-0.03, 0],
      [0.01, -0.12],
      [0.13, -0.19],
      [0.08, -0.03],
      [0.025, 0],
      [0.08, 0.03],
      [0.13, 0.19],
      [0.01, 0.12],
    ],
    "#b791b0",
    "horizontal",
    0.016,
  ).position.set(...points.at(-1));
  const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    ),
    rig = bindTentacleMotion(
      arm,
      `${key}_vertical_propulsion_v3`,
      curve,
      motions,
      { count: 12, amplitude: 0 },
    );
  motions[motions.length - 1] = (phase, effort) => {
    const power = 0.25 * (0.82 + Math.min(Math.max(effort, 0), 3) * 0.14);
    let previous = 0;
    for (let i = 0; i < rig.bones.length; i++) {
      const u = i / (rig.bones.length - 1),
        tangent = Math.sin(phase * 1.1 - u * 3.7) * power * u * u;
      rig.bones[i].position.copy(rig.points[i]);
      if (i) rig.bones[i].position.sub(rig.points[i - 1]);
      rig.bones[i].rotation.set(tangent - previous, 0, 0);
      previous = tangent;
    }
  };
  rig.motion = {
    axis: "vertical",
    frequency: 1.1,
    amplitude: 0.25,
    headStable: true,
  };
  for (const mesh of rig.meshes) mesh.userData.odysseyVerticalRig = rig;
  arm.userData.odysseyVerticalRig = rig;
  return { arm, rig, tip: rig.bones.at(-1) };
}

/** 娜迦的蛇尾以开放 S 形游曳，鳞纹与皮肤一次绑定，不做固定线圈。 */
function createNagaTail(body, key, color, motions) {
  const arm = new THREE.Group(),
    points = [
      [0, 0, 0.055],
      [0, -0.015, 0.21],
      [-0.012, 0, 0.38],
      [0.035, 0.01, 0.57],
      [-0.035, 0.01, 0.73],
      [0, 0, 0.87],
    ];
  arm.name = `${key}_lateral_tail_v3`;
  body.add(arm);
  const radii = [0.075, 0.064, 0.05, 0.037, 0.022, 0.0005],
    support = odysseySerpentineSupport(points, radii, {
      segments: 78,
      relief: 0.025,
    });
  part(arm, `${key}_lateral_tail_skin_v3`, () =>
    curvedGeometry(points, radii, color, "#b2b991", 78, 22, 0.025),
  );
  for (let i = 0; i < 9; i++)
    for (const side of [-1, 1]) {
      const u = 0.04 + i * 0.095,
        angles = [0.48, 0.18, -0.15].map((a) => (side === 1 ? a : Math.PI - a));
      tube(
        arm,
        `${key}_bound_scale_v4_${side}_${i}`,
        angles.map((a, j) => support.sample(u + (j - 1) * 0.006, a).toArray()),
        0.0014,
        "#9cb599",
        8,
        4,
      );
    }
  const rig = bindOdysseySerpentine(arm, `${key}_lateral_v4`, points, motions, {
    count: 16,
    frequency: 1.02,
    amplitude: 0.61,
    waves: 1.15,
    stableFraction: 0.15,
    phase: 0.5,
  });
  return { arm, rig, tip: rig.bones.at(-1) };
}

/** 稳定肩根、轻屈肘与顺流手掌，接触点随真实蒙皮走，不做软管式摆动。 */
function createDragArm(body, key, side, skin, motions) {
  const shoulder = new THREE.Group();
  shoulder.name = `${key}_stable_shoulder_${side}`;
  shoulder.position.set(side * 0.091, -0.003, -0.2);
  body.add(shoulder);
  const arm = new THREE.Group();
  shoulder.add(arm);
  const points = [
    [0, 0, 0],
    [side * 0.017, -0.007, 0.08],
    [side * 0.027, -0.019, 0.15],
    [side * 0.029, -0.025, 0.24],
    [side * 0.026, -0.019, 0.3],
  ];
  const cacheKey = `${key}_anatomical_drag_arm_v2_${side}`;
  part(arm, `${cacheKey}_muscle`, () =>
    curvedGeometry(
      points,
      [0.029, 0.025, 0.018, 0.017, 0.01],
      skin,
      skin,
      44,
      16,
    ),
  );
  part(arm, `${cacheKey}_hand`, () =>
    loft(
      [
        [0.292, 0.011, 0.008, -0.019],
        [0.321, 0.021, 0.0065, -0.018],
        [0.348, 0.019, 0.0055, -0.017],
        [0.355, 0.003, 0.002, -0.017],
      ],
      skin,
      skin,
      { rings: 18, sides: 16 },
    ),
  ).position.x = side * 0.026;
  for (let finger = 0; finger < 5; finger++) {
    const x = side * 0.026 + (finger - 2) * 0.007,
      end = 0.374 + 0.015 * (1 - Math.abs(finger - 2) / 2);
    part(arm, `${cacheKey}_finger_${finger}`, () =>
      curvedGeometry(
        [
          [x, -0.017, 0.341],
          [x + (finger - 2) * 0.001, -0.018, 0.363],
          [x + (finger - 2) * 0.002, -0.016, end],
        ],
        [0.0035, 0.003, 0.0009],
        skin,
        skin,
        12,
        7,
      ),
    );
  }
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
  );
  const rig = bindTentacleMotion(arm, cacheKey, curve, motions, {
    count: 8,
    amplitude: 0,
  });
  motions[motions.length - 1] = (phase, effort) => {
    const elbow = 0.1 + Math.sin(phase * 0.72 + side * 0.6) * 0.022;
    for (let i = 0; i < rig.bones.length; i++) {
      rig.bones[i].position.copy(rig.points[i]);
      if (i) rig.bones[i].position.sub(rig.points[i - 1]);
      rig.bones[i].rotation.set(
        i === 4 ? elbow : i === 5 ? elbow * 0.28 : i === 7 ? -0.035 : 0,
        0,
        0,
      );
    }
    shoulder.rotation.set(
      Math.sin(phase * 0.8 + side) * 0.012,
      side * (0.035 + Math.sin(phase * 0.7) * 0.012),
      side * 0.025,
    );
  };
  if (!body.userData.dragArms) body.userData.dragArms = [];
  body.userData.dragArms.push({ side, shoulder, arm, rig });
}
/** 胸肩至腰臀用共同切线过渡，避免折线放样在人形皮肤上留下硬台阶。 */
function smoothThorax(profile) {
  const result = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i],
      b = profile[i + 1],
      prev = profile[Math.max(0, i - 1)],
      next = profile[Math.min(profile.length - 1, i + 2)],
      span = b[0] - a[0];
    for (let n = 0; n < 8; n++) {
      const t = n / 8,
        h00 = 2 * t ** 3 - 3 * t ** 2 + 1,
        h10 = t ** 3 - 2 * t ** 2 + t,
        h01 = -2 * t ** 3 + 3 * t ** 2,
        h11 = t ** 3 - t ** 2;
      result.push([
        THREE.MathUtils.lerp(a[0], b[0], t),
        ...[1, 2, 3].map((j) => {
          const m0 = ((b[j] - prev[j]) / (b[0] - prev[0])) * span,
            m1 = ((next[j] - a[j]) / (next[0] - a[0])) * span,
            value = h00 * a[j] + h10 * m0 + h01 * b[j] + h11 * m1;
          return j < 3
            ? THREE.MathUtils.clamp(
                value,
                0.002,
                Math.max(...profile.map((p) => p[j])),
              )
            : value;
        }),
      ]);
    }
  }
  result.push(profile.at(-1));
  return result;
}

function horse(body, motions) {
  const k = "hippocampus",
    color = "#678f8e";
  part(body, `${k}_chest`, () =>
    loft(
      [
        [-0.3, 0.055, 0.095, 0.04],
        [-0.2, 0.108, 0.145, 0.01],
        [-0.02, 0.08, 0.12, -0.005],
        [0.11, 0.047, 0.06, 0],
      ],
      color,
      "#abbca0",
      { rings: 34, sides: 24 },
    ),
  );
  flexible(
    body,
    `${k}_neck`,
    [
      [0, 0.05, -0.22],
      [0, 0.16, -0.26],
      [0, 0.28, -0.34],
      [0, 0.34, -0.415],
    ],
    [0.075, 0.07, 0.052, 0.044],
    color,
    motions,
    { belly: "#b2c1ac", amplitude: 0.045, count: 6, segments: 34, sides: 18 },
  );
  const head = new THREE.Group();
  head.position.set(0, 0.34, -0.425);
  body.add(head);
  part(head, `${k}_equine_head`, () =>
    loft(
      [
        [-0.165, 0.018, 0.028, -0.046],
        [-0.13, 0.038, 0.044, -0.036],
        [-0.058, 0.037, 0.058, -0.002],
        [0.015, 0.052, 0.073, 0.006],
        [0.075, 0.022, 0.042, 0.01],
      ],
      "#688f8a",
      "#b5c4ad",
      { rings: 32, sides: 20 },
    ),
  );
  eyePair(head, k, 0.044, 0.029, 0.002, 0.01, "#a7a86d");
  for (const side of [-1, 1]) {
    oval(
      head,
      `${k}_nostril${side}`,
      [side * 0.027, -0.019, -0.145],
      [0.009, 0.007, 0.005],
      "#234d53",
      16,
    );
    tube(
      head,
      `${k}_lip${side}`,
      [
        [side * 0.004, -0.06, -0.164],
        [side * 0.028, -0.063, -0.123],
        [side * 0.028, -0.047, -0.097],
      ],
      0.0028,
      "#3a656c",
      12,
      5,
    );
  }
  for (const s of [-1, 1]) {
    fin(
      head,
      `${k}_ear${s}`,
      [
        [0.003, 0],
        [0.022, 0.097],
        [0.052, 0.106],
        [0.073, 0.016],
      ],
      "#587f7d",
    );
    head.children.at(-1).position.set(s * 0.032, 0.051, 0.013);
    const limb = flexible(
      body,
      `${k}_foreleg${s}`,
      [
        [s * 0.069, -0.065, -0.17],
        [s * 0.095, -0.15, -0.12],
        [s * 0.112, -0.14, 0.01],
        [s * 0.105, -0.1, 0.11],
      ],
      [0.027, 0.021, 0.014, 0.018],
      color,
      motions,
      { amplitude: 0.12, count: 5, segments: 26, sides: 10, phase: s },
    );
    oval(
      limb.tip,
      `${k}_hoof${s}`,
      [0, 0, 0.018],
      [0.024, 0.019, 0.027],
      "#b0b694",
      14,
    );
  }
  const tail = new THREE.Group(),
    tailPoints = [
      [0, 0, 0.08],
      [0.06, -0.015, 0.27],
      [0.115, -0.035, 0.45],
      [0.11, 0.035, 0.57],
      [0.02, 0.095, 0.55],
      [-0.04, 0.08, 0.45],
    ];
  tail.name = `${k}_finned_tail_v3`;
  body.add(tail);
  part(tail, `${k}_finned_tail_skin_v3`, () =>
    curvedGeometry(
      tailPoints,
      [0.051, 0.045, 0.03, 0.021, 0.014, 0.004],
      "#497d7d",
      "#497d7d",
      60,
      16,
      0.04,
    ),
  );
  fin(
    tail,
    `${k}_caudal_v3`,
    [
      [0, 0],
      [0.04, -0.095],
      [0.105, -0.08],
      [0.08, 0],
      [0.1, 0.07],
      [0.04, 0.1],
    ],
    "#73a0a1",
    "horizontal",
    0.011,
  ).position.set(-0.04, 0.08, 0.45);
  bindOdysseySerpentine(tail, `${k}_tail_lateral_v3`, tailPoints, motions, {
    count: 14,
    frequency: 0.86,
    amplitude: 0.43,
    waves: 1.05,
    stableFraction: 0.1,
  });
  fin(
    body,
    `${k}_mane`,
    [
      [-0.42, 0.347],
      [-0.38, 0.44],
      [-0.28, 0.4],
      [-0.19, 0.25],
      [-0.07, 0.12],
      [0.1, 0.057],
      [0.095, 0.025],
      [-0.21, 0.16],
    ],
    "#7cb1b0",
  );
  body.userData.mouthAnchors = [
    anchor(head, `${k}_mouth`, [0, -0.048, -0.157]),
  ];
}
function siren(body, motions) {
  const k = "siren_eel",
    trunk = new THREE.Group(),
    points = [
      [0, 0.053, -0.344],
      [0, 0.025, -0.29],
      [0, -0.015, -0.14],
      [0.015, -0.02, 0.09],
      [-0.018, 0.02, 0.34],
      [0.016, 0.01, 0.57],
      [0, -0.015, 0.77],
    ];
  trunk.name = `${k}_lateral_body_v3`;
  body.add(trunk);
  part(trunk, `${k}_lateral_skin_v4`, () =>
    curvedGeometry(
      points,
      [0.028, 0.06, 0.075, 0.07, 0.048, 0.023, 0.003],
      "#6d6587",
      "#b7a5b8",
      78,
      20,
    ),
  );
  const head = face(
    body,
    k,
    [0, 0.072, -0.34],
    0.84,
    "#d1c4b3",
    "#514659",
    motions,
  );
  for (const side of [-1, 1]) {
    // 披鳍根沿背侧连续延伸；鳍与鳃纹和躯干共用权重，不能独立悬空摆动。
    fin(
      trunk,
      `${k}_attached_veil_v3_${side}`,
      [
        [-0.22, side * 0.052],
        [-0.16, side * 0.17],
        [-0.04, side * 0.3],
        [0.12, side * 0.34],
        [0.24, side * 0.29],
        [0.32, side * 0.32],
        [0.42, side * 0.22],
        [0.52, side * 0.2],
        [0.67, side * 0.025],
        [0.4, side * 0.046],
        [0.1, side * 0.06],
      ],
      "#a78fbb",
      "horizontal",
      0.012,
    );
    tube(
      trunk,
      `${k}_bound_gill_sigil_v3_${side}`,
      [
        [side * 0.067, -0.001, -0.14],
        [side * 0.074, 0.023, -0.04],
        [side * 0.067, 0.021, 0.05],
      ],
      0.004,
      "#c3b5c7",
      12,
      6,
    );
  }
  fin(
    trunk,
    `${k}_ribbon_fin_v3`,
    [
      [0, 0],
      [0.05, -0.04],
      [0.13, -0.075],
      [0.16, 0],
      [0.13, 0.075],
      [0.05, 0.04],
    ],
    "#928db3",
  ).position.set(0, -0.015, 0.77);
  bindOdysseySerpentine(trunk, `${k}_lateral_v4`, points, motions, {
    count: 18,
    frequency: 0.94,
    amplitude: 0.59,
    waves: 1.2,
    stableFraction: 0.1,
  });
  body.userData.mouthAnchors = [head.mouth];
}
