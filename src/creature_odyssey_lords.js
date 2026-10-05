import * as THREE from "three";
import {
  part,
  loft,
  oval,
  tube,
  fin,
  flexible,
  eyePair,
  anchor,
  paint,
  teeth,
  material,
} from "./creature_odyssey_geometry.js";
import { seaBeastHead, ringmaw } from "./creature_odyssey_hunters.js";

/** 双怪峡口两位完全不同的领主：六首猎食兽与环形吞潮巨口。 */
export function buildOdysseyLord(kind, body, motions) {
  if (kind === "scylla") scylla(body, motions);
  else if (kind === "charybdis") charybdis(body, motions);
  else throw new Error(`Unknown Odyssean lord anatomy: ${kind}`);
}
function scylla(body, motions) {
  const k = "scylla";
  part(body, `${k}_armored_core`, () =>
    loft(
      [
        [-0.21, 0.067, 0.074, 0.016],
        [-0.12, 0.185, 0.16, 0],
        [0.09, 0.215, 0.205, 0.013],
        [0.27, 0.175, 0.146, 0],
        [0.37, 0.032, 0.047, 0],
      ],
      "#53676a",
      "#9e9c7b",
      { rings: 64, sides: 32, relief: 0.07 },
    ),
  );
  for (const s of [-1, 1])
    for (let i = 0; i < 5; i++)
      tube(
        body,
        `${k}_core_shield${s}_${i}`,
        [
          [s * 0.045, 0.176, -0.09 + i * 0.075],
          [s * 0.16, 0.156, -0.06 + i * 0.071],
          [s * 0.2, 0.047, -0.025 + i * 0.06],
        ],
        0.009,
        "#9aa28e",
        20,
        8,
      );
  const mouths = [];
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 0.19;
    const height = [0.24, 0.4, 0.28, 0.49, 0.33, 0.22][i],
      depth = [-0.64, -0.69, -0.61, -0.57, -0.74, -0.64][i];
    const neckPoints = [
      [x * 0.26, 0.091, -0.06],
      [x * 0.5, height * 0.63 + 0.075, -0.145],
      [x * 0.84, height + 0.065, depth * 0.48],
      [x * 0.96, height + 0.055, depth * 0.76],
      [x, height, depth],
    ];
    const neck = flexible(
      body,
      `${k}_neck${i}`,
      neckPoints,
      [0.068, 0.063, 0.049, 0.04, 0.038],
      "#577579",
      motions,
      {
        belly: "#a7b3a1",
        amplitude: 0.12,
        count: 10,
        segments: 64,
        sides: 18,
        relief: 0.035,
        phase: i * 0.92,
      },
    );
    const head = seaBeastHead(neck.tip, `${k}_head${i}`, motions, {
      color: i % 2 ? "#547074" : "#657c77",
      scale: 0.72,
    });
    head.head.rotation.y = [-0.12, 0.08, -0.05, 0.03, 0.1, -0.08][i];
    head.head.rotation.x = [0.1, -0.08, 0.06, 0.12, -0.08, 0.08][i];
    head.head.rotation.z = [0.04, -0.05, 0.025, -0.04, 0.03, -0.045][i];
    mouths.push(head.mouth);
    // 喉下短皱褶随末端骨骼运动，维持六个头清晰分离而非头饰堆叠。
    for (let j = 0; j < 3; j++)
      tube(
        neck.tip,
        `${k}_throat_fold${i}_${j}`,
        [
          [-0.025, -0.024, -0.025 + j * 0.02],
          [0, -0.043, -0.04 + j * 0.02],
          [0.025, -0.024, -0.025 + j * 0.02],
        ],
        0.004,
        "#b4b69d",
        10,
        6,
      );
  }
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 1 : -1,
      z = -0.095 + Math.floor(i / 2) * 0.068;
    const leg = flexible(
      body,
      `${k}_foot${i}`,
      [
        [side * 0.12, -0.086, z],
        [side * 0.23, -0.159, z + 0.008],
        [side * 0.32, -0.173, z + 0.07],
        [side * 0.35, -0.142, z + 0.13],
      ],
      [0.036, 0.034, 0.021, 0.009],
      "#637d77",
      motions,
      {
        belly: "#a7ad8e",
        amplitude: 0.09,
        count: 5,
        segments: 26,
        sides: 10,
        phase: i * 0.7,
      },
    );
    fin(
      leg.tip,
      `${k}_foot_web${i}`,
      [
        [-0.017, 0],
        [0.045, side * 0.072],
        [0.112, side * 0.05],
        [0.095, side * 0.008],
        [0.018, -side * 0.014],
      ],
      "#899e87",
      "horizontal",
      0.008,
    );
  }
  body.userData.mouthAnchors = mouths;
  body.userData.combatAnchor = anchor(
    body,
    `${k}_core_anchor`,
    [0, 0.1, -0.08],
  );
  body.userData.anatomy = { heads: 6, feet: 12, continuousNecks: true };
}
function annularHull() {
  const p = [],
    idx = [],
    rings = 80,
    sides = 22;
  for (let ring = 0; ring <= rings; ring++) {
    const a = (ring / rings) * Math.PI * 2;
    for (let j = 0; j <= sides; j++) {
      const b = (j / sides) * Math.PI * 2,
        fold = 0.009 * Math.cos(a * 24),
        r =
          0.285 +
          Math.cos(b) * (0.13 + fold) +
          0.022 * Math.cos(a * 8) * Math.max(0, Math.cos(b)) ** 2,
        z = 0.05 + Math.sin(b) * 0.215;
      p.push(Math.cos(a) * r, Math.sin(a) * r, z);
      if (ring < rings && j < sides) {
        const n = ring * (sides + 1) + j;
        idx.push(n, n + sides + 1, n + 1, n + 1, n + sides + 1, n + sides + 2);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  paint(g, "#405e63", "#71817a", 0.085);
  const col = g.attributes.color;
  for (let i = 0; i < col.count; i++) {
    const angle = Math.atan2(p[i * 3 + 1], p[i * 3]),
      zone = 0.5 + 0.5 * Math.cos(angle * 12),
      front = THREE.MathUtils.smoothstep(-p[i * 3 + 2], -0.1, 0.14);
    const shade = new THREE.Color()
      .fromBufferAttribute(col, i)
      .lerp(new THREE.Color("#867e68"), zone * front * 0.35);
    col.setXYZ(i, shade.r, shade.g, shade.b);
  }
  return g;
}
function charybdis(body, motions) {
  const k = "charybdis";
  const hull = part(body, `${k}_annular_armored_hull`, annularHull);
  const maw = ringmaw(body, k, motions, {
    radius: 0.224,
    depth: 0.27,
    color: "#977e73",
  });
  maw.mouth.position.z = -0.225;
  // 环唇与外壳之间的连续颈膜承托整个口器，不能悬在空中。
  part(body, `${k}_oral_support_collar`, () => {
    const points = [],
      indices = [],
      n = 80;
    const sections = [
      [0.265, -0.216],
      [0.286, -0.183],
      [0.328, -0.143],
    ];
    for (let row = 0; row < sections.length; row++)
      for (let j = 0; j <= n; j++) {
        const a = (j / n) * Math.PI * 2,
          r = sections[row][0] + (0.004 * Math.cos(a * 16) * row) / 2;
        points.push(Math.cos(a) * r, Math.sin(a) * r, sections[row][1]);
        if (row < 2 && j < n) {
          const k = row * (n + 1) + j;
          indices.push(k, k + 1, k + n + 1, k + 1, k + n + 2, k + n + 1);
        }
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return paint(g, "#677e78", "#677e78", 0.06);
  });
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2,
      co = Math.cos(a),
      si = Math.sin(a);
    tube(
      body,
      `${k}_spiral_gill${i}`,
      [
        [co * 0.343, si * 0.343, -0.12],
        [Math.cos(a + 0.035) * 0.414, Math.sin(a + 0.035) * 0.414, -0.015],
        [Math.cos(a + 0.095) * 0.385, Math.sin(a + 0.095) * 0.385, 0.14],
        [Math.cos(a + 0.12) * 0.308, Math.sin(a + 0.12) * 0.308, 0.235],
      ],
      0.009,
      "#8b9789",
      24,
      8,
    );
    if (i % 4 === 0) {
      oval(
        body,
        `${k}_rim_socket${i}`,
        [co * 0.302, si * 0.302, -0.164],
        [0.031, 0.017, 0.009],
        "#223944",
        20,
      );
      oval(
        body,
        `${k}_rim_eye${i}`,
        [co * 0.303, si * 0.303, -0.171],
        [0.019, 0.009, 0.006],
        "#bea66d",
        20,
      );
      oval(
        body,
        `${k}_rim_pupil${i}`,
        [co * 0.304, si * 0.304, -0.178],
        [0.011, 0.005, 0.004],
        "#0c2430",
        16,
      );
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2,
      joint = new THREE.Group();
    joint.rotation.z = a;
    joint.position.set(Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0.1);
    body.add(joint);
    fin(
      joint,
      `${k}_skirt_fin${i}`,
      [
        [0, -0.024],
        [0.17, -0.042],
        [0.3, -0.03],
        [0.33, 0.026],
        [0.21, 0.084],
        [0.09, 0.09],
        [0, 0.023],
      ],
      "#73998f",
      "horizontal",
      0.016,
    );
    motions.push((t, e) => {
      joint.rotation.y = Math.sin(t * 0.56 + i * 0.7) * (0.055 + e * 0.007);
    });
  }
  // 身体本身保持轴向稳定，活物感来自鳃膜、嘴沿和裙鳍，不用旋转整条碰撞根。
  const pulse = new THREE.Group();
  body.add(pulse);
  const rows = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    rows.push({
      p: [Math.cos(a) * 0.244, Math.sin(a) * 0.244, -0.246],
      d: [-Math.cos(a) * 0.7, -Math.sin(a) * 0.7, -0.65],
      r: 0.009,
      l: 0.052,
    });
  }
  teeth(pulse, `${k}_outer_fangs`, rows, "#c4c7ae");
  motions.push((t) =>
    pulse.scale.set(
      1 + Math.sin(t * 0.57) * 0.018,
      1 + Math.sin(t * 0.57) * 0.018,
      1,
    ),
  );
  body.userData.mouthAnchors = [maw.anchor];
  body.userData.combatAnchor = maw.anchor;
  body.userData.anatomy = { annularMaw: true, teeth: 74, arms: 0 };
  hull.userData.annular = true;
}
