import * as THREE from "three";
import { bindAxialMotion, sampleSection } from "./creature_surface.js";
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
  paddlePair,
  material,
  DARK,
  curvedGeometry,
  paint,
} from "./creature_odyssey_geometry.js";

/** 新的海兽、环口兽与巨鲸各有独立嘴型、躯体比例及推进结构。 */
export function buildOdysseyHunters(kind, body, motions) {
  if (kind === "ketos") ketos(body, motions);
  else if (kind === "bronze_turtle") turtle(body, motions);
  else if (kind === "abyss_lamprey") lamprey(body, motions);
  else if (kind === "oracle_whale") whale(body, motions);
  else if (kind === "ceto_serpent") serpent(body, motions);
  else throw new Error(`Unknown Odyssean hunter anatomy: ${kind}`);
}
/** 有深腔与铰接下颌的兽首；眼与牙始终连在真实头部，而非光球装饰。 */
export function seaBeastHead(
  parent,
  key,
  motions,
  { color = "#597e81", scale = 1, lion = false } = {},
) {
  const head = new THREE.Group();
  head.scale.setScalar(scale);
  parent.add(head);
  const skull = part(head, `${key}_sculpted_skull`, () =>
    loft(
      [
        [-0.238, 0.006, 0.013, 0.043],
        [-0.2, 0.048, 0.049, 0.045],
        [-0.155, 0.09, 0.074, 0.067],
        [-0.065, 0.119, 0.115, 0.07],
        [0.055, 0.116, 0.131, 0.044],
        [0.115, 0.076, 0.094, 0.016],
      ],
      color,
      "#abafa0",
      {
        rings: 42,
        sides: 28,
        cut: { start: -0.12, end: 0.025, roof: 0.018 },
        relief: 0.018,
      },
    ),
  );
  part(head, `${key}_palate`, () =>
    loft(
      [
        [-0.197, 0.044, 0.006, 0.018],
        [-0.13, 0.087, 0.011, 0.021],
        [-0.045, 0.076, 0.028, 0.005],
        [0.017, 0.022, 0.016, -0.012],
      ],
      "#493746",
      "#322b38",
      { rings: 22, sides: 16 },
    ),
  );
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.025, 0.026);
  head.add(jaw);
  part(jaw, `${key}_lower_jaw`, () =>
    loft(
      [
        [-0.24, 0.005, 0.005, -0.056],
        [-0.222, 0.04, 0.009, -0.055],
        [-0.15, 0.075, 0.028, -0.06],
        [-0.06, 0.097, 0.031, -0.045],
        [0.018, 0.047, 0.025, -0.022],
      ],
      color,
      "#b0b3a1",
      { rings: 32, sides: 20 },
    ),
  );
  const upper = [],
    lower = [];
  for (const s of [-1, 1])
    for (let i = 0; i < 8; i++) {
      const z = -0.175 + i * 0.027,
        x = s * (0.039 + 0.052 * Math.sin((i / 7) * Math.PI * 0.72));
      upper.push({
        p: [x, 0.022, z],
        d: [-s * 0.1, -1, -0.08],
        r: 0.006,
        l: i < 3 ? 0.045 : 0.027,
      });
      lower.push({
        p: [x, -0.041, z - 0.026],
        d: [-s * 0.08, 1, -0.09],
        r: 0.0055,
        l: i < 3 ? 0.036 : 0.025,
      });
    }
  teeth(head, `${key}_upper_fangs`, upper);
  teeth(jaw, `${key}_lower_fangs`, lower);
  eyePair(head, key, 0.111, 0.097, -0.032, 0.014, "#c4a362", true);
  for (const s of [-1, 1]) {
    oval(
      head,
      `${key}_nostril${s}`,
      [s * 0.024, 0.067, -0.211],
      [0.01, 0.009, 0.008],
      "#27353b",
      12,
    );
    tube(
      head,
      `${key}_jaw_hinge_crease${s}`,
      [
        [s * 0.079, 0.018, -0.144],
        [s * 0.12, 0.047, -0.06],
        [s * 0.113, 0.074, 0.049],
      ],
      0.0045,
      "#47636b",
      16,
      10,
    );
    if (lion) {
      for (let i = 0; i < 4; i++)
        tube(
          head,
          `${key}_mane${s}_${i}`,
          [
            [s * 0.085, 0.127 - i * 0.035, 0.046],
            [s * (0.135 + i * 0.009), 0.149 - i * 0.026, 0.109],
            [s * (0.106 + i * 0.009), 0.078 - i * 0.031, 0.163],
          ],
          0.014,
          "#938d64",
          16,
          8,
        );
    } else
      part(head, `${key}_horn${s}`, () =>
        curvedGeometry(
          [
            [s * 0.075, 0.148, 0.015],
            [s * 0.11, 0.215, 0.048],
            [s * 0.145, 0.27, 0.093],
          ],
          [0.016, 0.009, 0.0005],
          "#b4b394",
          "#9fa48c",
          24,
          10,
        ),
      );
  }
  motions.push((t, e) => {
    jaw.rotation.x =
      -0.11 - (Math.sin(t * 0.76) * 0.5 + 0.5) * (0.05 + e * 0.009);
  });
  return {
    head,
    mouth: anchor(head, `${key}_mouth`, [0, -0.013, -0.205]),
    jaw,
    skull,
  };
}
function ketos(body, motions) {
  const k = "ketos",
    color = "#7b8265";
  const torsoProfile = [
    [-0.3, 0.083, 0.115],
    [-0.2, 0.135, 0.16],
    [-0.04, 0.143, 0.152],
    [0.17, 0.083, 0.102],
    [0.32, 0.023, 0.035],
    [0.4, 0.011, 0.017],
  ];
  const torso = part(body, `${k}_muscular_trunk`, () =>
    loft(torsoProfile, color, "#b9b494", {
      rings: 44,
      sides: 28,
      relief: 0.028,
    }),
  );
  const rig = bindAxialMotion(torso, motions, {
    axis: "y",
    frequency: 0.85,
    amplitude: 0.055,
  });
  const head = seaBeastHead(body, k, motions, {
    color,
    lion: true,
    scale: 0.95,
  });
  head.head.position.set(0, 0.025, -0.29);
  paddlePair(
    body,
    `${k}_foreflipper`,
    [0.104, -0.078, -0.16],
    0.28,
    0.21,
    "#6e775d",
    motions,
  );
  const tail = new THREE.Group();
  tail.position.z = 0.14;
  rig.skeleton.bones[2].add(tail);
  fin(
    tail,
    `${k}_tail`,
    [
      [0, 0.015],
      [0.15, 0.155],
      [0.19, 0.124],
      [0.09, 0.015],
      [0.17, -0.105],
      [0.08, -0.071],
      [0, -0.015],
    ],
    "#687760",
  );
  fin(
    body,
    `${k}_crest`,
    [
      [-0.2, 0.146],
      [-0.15, 0.223],
      [-0.06, 0.204],
      [0.02, 0.182],
      [0.11, 0.132],
      [0.17, 0.06],
    ],
    "#92946d",
  );
  for (const side of [-1, 1])
    for (let i = 0; i < 5; i++) {
      const points = [0.47, 0.07, -0.43].map((angle, j) => {
        const z = -0.173 + i * 0.033 + j * 0.012,
          [rx, ry, cy] = sampleSection(torsoProfile, z),
          relief =
            1 +
            0.028 *
              Math.cos(angle * 10) *
              Math.sin(((z + 0.3) / 0.7) * Math.PI);
        return [
          side * rx * Math.cos(angle) * relief,
          cy + ry * Math.sin(angle) * relief,
          z,
        ];
      });
      tube(
        body,
        `${k}_fitted_scute_v3_${side}_${i}`,
        points,
        0.0024,
        "#c1b98e",
        8,
        5,
      );
    }
  body.userData.mouthAnchors = [head.mouth];
}
function turtle(body, motions) {
  const k = "bronze_turtle";
  part(
    body,
    `${k}_layered_carapace_v3`,
    () => {
      const g = new THREE.SphereGeometry(1, 48, 28),
        p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i),
          xSurface = x * 0.275,
          zSurface = z * 0.38,
          relief =
            1 + 0.025 * Math.cos(zSurface * 18) * Math.cos(xSurface * 15);
        p.setXYZ(i, xSurface, Math.max(-0.068, y * 0.2 * relief), zSurface);
      }
      g.computeVertexNormals();
      return g;
    },
    material("#657e70", 0.66, 0.16),
  );
  oval(
    body,
    `${k}_plastron`,
    [0, -0.073, 0],
    [0.25, 0.037, 0.33],
    "#b1ab7a",
    32,
  );
  // 甲片使用贴合穹顶的六边形倒角层，避免椭圆小球贴在背上。
  part(body, `${k}_hexagonal_scutes_v4`, () => {
    const points = [],
      indices = [],
      colors = [];
    const base = new THREE.Color("#aa9d65"),
      edge = new THREE.Color("#516c63");
    const shellY = (x, z) =>
      0.2 *
      Math.sqrt(Math.max(0, 1 - (x / 0.275) ** 2 - (z / 0.38) ** 2)) *
      (1 + 0.025 * Math.cos(z * 18) * Math.cos(x * 15));
    const addPlate = (cx, cz, rx, rz) => {
      // 每个六边甲片细分为六片曲面扇区，线性大三角形不能跨过凸壳形成破口。
      const subdivisions = 6;
      for (let sector = 0; sector < 6; sector++) {
        const angleA = Math.PI / 6 + (sector * Math.PI) / 3,
          angleB = Math.PI / 6 + ((sector + 1) * Math.PI) / 3,
          ax = Math.cos(angleA) * rx,
          az = Math.sin(angleA) * rz,
          bx = Math.cos(angleB) * rx,
          bz = Math.sin(angleB) * rz,
          rows = [];
        for (let i = 0; i <= subdivisions; i++) {
          rows[i] = [];
          for (let j = 0; j <= subdivisions - i; j++) {
            const u = i / subdivisions,
              v = j / subdivisions,
              radial = u + v;
            let x = cx + ax * u + bx * v,
              z = cz + az * u + bz * v;
            const ellipse = (x / 0.275) ** 2 + (z / 0.38) ** 2;
            if (ellipse > 0.985) {
              const fit = Math.sqrt(0.985 / ellipse);
              x *= fit;
              z *= fit;
            }
            rows[i][j] = points.length / 3;
            points.push(
              x,
              shellY(x, z) + 0.0012 + 0.007 * (1 - radial) ** 1.5,
              z,
            );
            const c = base.clone().lerp(edge, 0.12 + radial ** 4 * 0.5);
            colors.push(c.r, c.g, c.b);
          }
        }
        for (let i = 0; i < subdivisions; i++)
          for (let j = 0; j < subdivisions - i; j++) {
            indices.push(rows[i][j], rows[i][j + 1], rows[i + 1][j]);
            if (j < subdivisions - i - 1)
              indices.push(rows[i + 1][j], rows[i][j + 1], rows[i + 1][j + 1]);
          }
      }
    };
    for (let i = 0; i < 5; i++) addPlate(0, -0.258 + i * 0.129, 0.061, 0.078);
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++)
        addPlate(side * 0.128, -0.21 + i * 0.14, 0.071, 0.087);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  });
  part(body, `${k}_neck`, () =>
    loft(
      [
        [-0.49, 0.025, 0.034, -0.015],
        [-0.42, 0.065, 0.052, -0.008],
        [-0.32, 0.048, 0.04, -0.02],
      ],
      "#79897c",
      "#b8bda1",
      { rings: 22, sides: 18 },
    ),
  );
  eyePair(body, k, 0.047, 0.02, -0.438, 0.012, "#b9af70");
  tube(
    body,
    `${k}_beak`,
    [
      [-0.026, -0.026, -0.476],
      [0, -0.035, -0.497],
      [0.026, -0.026, -0.476],
    ],
    0.005,
    "#b0ab7c",
    10,
    6,
  );
  paddlePair(
    body,
    `${k}_front_paddle`,
    [0.18, -0.054, -0.17],
    0.27,
    0.28,
    "#7d9584",
    motions,
  );
  paddlePair(
    body,
    `${k}_rear_paddle`,
    [0.162, -0.061, 0.225],
    0.14,
    0.15,
    "#748d7c",
    motions,
  );
  flexible(
    body,
    `${k}_tail`,
    [
      [0, -0.054, 0.29],
      [0, -0.074, 0.39],
      [0, -0.081, 0.455],
    ],
    [0.022, 0.014, 0.001],
    "#6e8375",
    motions,
    { amplitude: 0.05, segments: 20, sides: 8, count: 5 },
  );
  body.userData.mouthAnchors = [
    anchor(body, `${k}_mouth`, [0, -0.035, -0.498]),
  ];
}
export function ringmaw(
  parent,
  key,
  motions,
  { radius = 0.15, depth = 0.08, color = "#6d556c", eyes = false } = {},
) {
  const mouth = new THREE.Group();
  parent.add(mouth);
  part(
    mouth,
    `${key}_fleshy_oral_ring`,
    () => {
      const g = new THREE.TorusGeometry(radius, radius * 0.225, 14, 48);
      g.scale(1, 1, 0.8);
      return g;
    },
    material(color, 0.45),
  );
  part(
    mouth,
    `${key}_recessed_throat`,
    () => {
      const g = new THREE.CylinderGeometry(
        radius * 0.72,
        radius * 0.23,
        depth,
        36,
        4,
        true,
      );
      // 宽口朝向 -Z，深处收窄；不能把锥形喉腔前后倒置。
      g.rotateX(-Math.PI / 2);
      g.translate(0, 0, depth * 0.5);
      return g;
    },
    (() => {
      const m = material("#1b1e2d", 0.74);
      m.side = THREE.DoubleSide;
      return m;
    })(),
  );
  oval(
    mouth,
    `${key}_throat_end`,
    [0, 0, depth * 0.91],
    [radius * 0.3, radius * 0.3, 0.012],
    "#201c2a",
    20,
  );
  const rows = [];
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + (row % 2) * 0.09,
        r = radius * (0.78 - row * 0.14);
      rows.push({
        p: [Math.cos(a) * r, Math.sin(a) * r, row * depth * 0.18],
        d: [-Math.cos(a), -Math.sin(a), -0.24],
        r: radius * 0.03,
        l: radius * (0.17 - row * 0.014),
      });
    }
  teeth(mouth, `${key}_radial_teeth`, rows);
  if (eyes)
    eyePair(
      mouth,
      key,
      radius * 0.91,
      radius * 0.68,
      depth * 0.25,
      radius * 0.09,
      "#cfc191",
    );
  motions.push((t) => {
    mouth.scale.set(
      1 + Math.sin(t * 0.57) * 0.018,
      1 + Math.sin(t * 0.57) * 0.018,
      1,
    );
  });
  return {
    mouth,
    anchor: anchor(mouth, `${key}_mouth_anchor`, [0, 0, -radius * 0.03]),
  };
}
function lamprey(body, motions) {
  const k = "abyss_lamprey",
    trunk = new THREE.Group(),
    points = [
      [0, 0, -0.36],
      [0, 0.005, -0.16],
      [0.015, 0.012, 0.08],
      [-0.02, 0.01, 0.35],
      [0.015, -0.005, 0.66],
      [0, 0, 0.87],
    ];
  trunk.name = `${k}_lateral_trunk_v3`;
  body.add(trunk);
  const radii = [0.095, 0.092, 0.08, 0.061, 0.035, 0.001],
    support = odysseySerpentineSupport(points, radii, { segments: 82 });
  part(trunk, `${k}_lateral_skin_v3`, () =>
    curvedGeometry(points, radii, "#735569", "#a7909e", 82, 22),
  );
  const maw = ringmaw(body, k, motions, {
    radius: 0.095,
    depth: 0.067,
    color: "#ad7c8c",
    eyes: true,
  });
  maw.mouth.position.z = -0.38;
  // 鳃孔贴在相同的活动皮肤上，不再以刚性饰条悬于侧面。
  for (const side of [-1, 1])
    for (let i = 0; i < 7; i++) {
      const u = 0.1 + i * 0.027,
        angle = side === 1 ? 0 : Math.PI,
        point = support.sample(u, angle, -0.001);
      oval(
        trunk,
        `${k}_gill_pit_v4_${side}_${i}`,
        point.toArray(),
        [0.0024, 0.0105, 0.007],
        "#362c3f",
        12,
      );
      tube(
        trunk,
        `${k}_gill_rim_v4_${side}_${i}`,
        [
          support.sample(u, angle - 0.11).toArray(),
          support.sample(u - 0.005, angle).toArray(),
          support.sample(u, angle + 0.1).toArray(),
        ],
        0.0012,
        "#aa8692",
        8,
        5,
      );
    }
  part(trunk, `${k}_attached_dorsal_fin_v4`, () =>
    support.finGeometry({
      start: 0.28,
      end: 0.995,
      height: 0.067,
      color: "#80657d",
      thickness: 0.0023,
    }),
  );
  part(trunk, `${k}_attached_ventral_fin_v4`, () =>
    support.finGeometry({
      start: 0.58,
      end: 0.995,
      height: 0.036,
      color: "#6f5a70",
      lower: true,
      thickness: 0.0018,
    }),
  );
  bindOdysseySerpentine(trunk, `${k}_lateral_v4`, points, motions, {
    count: 16,
    frequency: 1.05,
    amplitude: 0.61,
    waves: 1.18,
    stableFraction: 0.08,
  });
  body.userData.mouthAnchors = [maw.anchor];
}

function whale(body, motions) {
  const k = "oracle_whale";
  const torso = part(body, `${k}_vaulted_body`, () =>
    loft(
      [
        [-0.46, 0.065, 0.075, -0.018],
        [-0.4, 0.139, 0.145, 0.003],
        [-0.28, 0.17, 0.194, 0.022],
        [-0.05, 0.16, 0.19, 0.022],
        [0.19, 0.099, 0.121, 0.01],
        [0.36, 0.028, 0.041, 0],
        [0.47, 0.013, 0.019, 0],
      ],
      "#567686",
      "#b0bdb5",
      { rings: 54, sides: 32, relief: 0.004 },
    ),
  );
  const rig = bindAxialMotion(torso, motions, {
    axis: "x",
    frequency: 0.64,
    amplitude: 0.036,
  });
  eyePair(body, k, 0.162, 0.009, -0.341, 0.014, "#a8a574");
  for (const s of [-1, 1]) {
    tube(
      body,
      `${k}_lip${s}`,
      [
        [0, -0.045, -0.465],
        [s * 0.105, -0.1, -0.399],
        [s * 0.144, -0.11, -0.26],
      ],
      0.005,
      "#526776",
      20,
      6,
    );
    for (let i = 0; i < 5; i++)
      tube(
        body,
        `${k}_pleat${s}_${i}`,
        [
          [s * 0.015 * (i + 1), -0.098, -0.41],
          [s * 0.02 * (i + 1), -0.157, -0.24],
          [s * 0.018 * (i + 1), -0.15, -0.02],
        ],
        0.0025,
        "#d4d3b7",
        18,
        5,
      );
  }
  paddlePair(
    body,
    `${k}_flipper`,
    [0.136, -0.077, -0.19],
    0.29,
    0.26,
    "#76939b",
    motions,
  );
  const tail = new THREE.Group();
  tail.position.z = 0.18;
  rig.skeleton.bones[2].add(tail);
  fin(
    tail,
    `${k}_flukes`,
    [
      [0, 0],
      [0.08, -0.07],
      [0.16, -0.27],
      [0.2, -0.25],
      [0.19, -0.08],
      [0.13, 0],
      [0.19, 0.08],
      [0.2, 0.25],
      [0.16, 0.27],
      [0.08, 0.07],
    ],
    "#617f8c",
    "horizontal",
    0.022,
  );
  fin(
    body,
    `${k}_crest`,
    [
      [-0.3, 0.18],
      [-0.19, 0.251],
      [-0.02, 0.265],
      [0.085, 0.18],
      [0.16, 0.13],
      [0.07, 0.11],
    ],
    "#9cacaa",
  );
  tube(
    body,
    `${k}_blowhole`,
    [
      [-0.018, 0.188, -0.22],
      [0, 0.192, -0.25],
      [0.018, 0.188, -0.22],
    ],
    0.004,
    "#273b49",
    10,
    6,
  );
  body.userData.mouthAnchors = [anchor(body, `${k}_mouth`, [0, -0.04, -0.463])];
}
function serpent(body, motions) {
  const k = "ceto_serpent",
    head = seaBeastHead(body, k, motions, { color: "#3b6a72", scale: 0.6 }),
    trunk = new THREE.Group(),
    points = [
      [0, 0, -0.44],
      [0, 0, -0.25],
      [0.015, 0.005, 0.02],
      [-0.018, 0, 0.27],
      [0.022, -0.01, 0.56],
      [0, 0.008, 0.85],
      [0, 0.008, 1.1],
    ],
    radii = [0.071, 0.097, 0.08, 0.065, 0.043, 0.026, 0.001];
  head.head.position.z = -0.47;
  trunk.name = `${k}_lateral_trunk_v3`;
  body.add(trunk);
  part(trunk, `${k}_ridged_skin_v3`, () =>
    curvedGeometry(points, radii, "#325e68", "#8baca1", 100, 24, 0.038),
  );
  const support = odysseySerpentineSupport(points, radii, {
    segments: 100,
    relief: 0.038,
  });
  // 背帆以完整贴根鳍带替代悬在骨节上的叶片，随躯干波浪共同蒙皮。
  part(trunk, `${k}_attached_dorsal_sail_v4`, () =>
    support.finGeometry({
      start: 0.035,
      end: 0.985,
      height: 0.058,
      color: "#80a997",
      thickness: 0.0025,
    }),
  );
  for (const side of [-1, 1])
    for (let i = 0; i < 13; i++) {
      const u = 0.1 + i * 0.064,
        angles = [0.52, 0.22, -0.14].map((a) => (side === 1 ? a : Math.PI - a));
      tube(
        trunk,
        `${k}_attached_scale_v4_${side}_${i}`,
        angles.map((a, j) => support.sample(u + (j - 1) * 0.004, a).toArray()),
        0.0014,
        "#779a8b",
        7,
        4,
      );
    }
  bindOdysseySerpentine(trunk, `${k}_lateral_v4`, points, motions, {
    count: 20,
    frequency: 0.88,
    amplitude: 0.63,
    waves: 1.23,
    stableFraction: 0.12,
  });
  paddlePair(
    body,
    `${k}_webbed_forefin`,
    [0.065, -0.043, -0.3],
    0.18,
    0.15,
    "#5c8e8c",
    motions,
  );
  body.userData.mouthAnchors = [head.mouth];
}
