import * as THREE from "three";
import { bindTentacleMotion } from "./tentacle_motion.js";
import { bindAxialMotion } from "./creature_surface.js";
import {
  geometry,
  part,
  paint,
  loft,
  fin,
  tube,
  oval,
  eyePair,
  flexible,
  paddlePair,
  anchor,
  material,
  SKIN,
  BRONZE,
} from "./creature_odyssey_geometry.js";

/** 浅湾五种不同体制：帆鳍小鱼、双壳、宽翼鳐、直立海马及卷壳船蛸。 */
export function buildOdysseyShallows(kind, body, motions) {
  if (kind === "ambrosia_sprat") sprat(body, motions);
  else if (kind === "moon_scallop") scallop(body, motions);
  else if (kind === "lyre_ray") ray(body, motions);
  else if (kind === "pearl_seahorse") seahorse(body, motions);
  else if (kind === "golden_argonaut") argonaut(body, motions);
  else throw new Error(`Unknown Odyssean shallow anatomy: ${kind}`);
}
function sprat(body, motions) {
  const k = "ambrosia_sprat",
    profile = [
      [-0.43, 0.008, 0.012],
      [-0.36, 0.05, 0.07],
      [-0.2, 0.07, 0.125],
      [0.02, 0.055, 0.12],
      [0.23, 0.025, 0.055],
      [0.33, 0.01, 0.025],
    ];
  const skin = part(body, `${k}_torso`, () =>
    loft(profile, "#ae783c", "#e7c68f", {
      rings: 28,
      sides: 16,
      relief: 0.012,
    }),
  );
  const rig = bindAxialMotion(skin, motions, {
    axis: "y",
    frequency: 1.5,
    amplitude: 0.07,
  });
  eyePair(body, k, 0.043, 0.029, -0.35, 0.012, "#ddb877");
  tube(
    body,
    `${k}_lips`,
    [
      [0, -0.006, -0.429],
      [0, 0.002, -0.437],
    ],
    0.005,
    "#5d4734",
    3,
    6,
  );
  fin(
    body,
    `${k}_sail`,
    [
      [-0.22, 0.092],
      [-0.14, 0.23],
      [0.03, 0.285],
      [0.19, 0.17],
      [0.24, 0.047],
      [0.08, 0.098],
    ],
    "#be9048",
  );
  fin(
    body,
    `${k}_anal`,
    [
      [0.04, -0.105],
      [0.1, -0.17],
      [0.21, -0.105],
      [0.26, -0.037],
      [0.16, -0.062],
    ],
    "#a87b45",
  );
  paddlePair(body, k, [0.056, -0.035, -0.21], 0.13, 0.105, "#d8b77e", motions);
  const tail = new THREE.Group();
  tail.position.z = 0.085;
  rig.skeleton.bones[2].add(tail);
  fin(
    tail,
    `${k}_fork`,
    [
      [0, 0.025],
      [0.12, 0.16],
      [0.18, 0.145],
      [0.115, 0.03],
      [0.083, 0],
      [0.115, -0.03],
      [0.18, -0.145],
      [0.12, -0.16],
      [0, -0.025],
    ],
    "#b17b43",
  );
  for (let j = 0; j < 4; j++)
    tube(
      body,
      `${k}_flank${j}`,
      [
        [0.065, 0.01, -0.26 + j * 0.055],
        [0.054, 0.005, -0.13 + j * 0.05],
      ],
      0.0016,
      "#ead1a0",
      4,
      4,
    );
  body.userData.mouthAnchors = [anchor(body, `${k}_mouth`, [0, 0, -0.435])];
}
function shellGeometry(sign) {
  const p = [],
    idx = [],
    n = 48,
    rings = 20,
    stride = n + 1,
    layer = (rings + 1) * stride;
  for (let side = 0; side < 2; side++)
    for (let r = 0; r <= rings; r++)
      for (let a = 0; a <= n; a++) {
        const theta = ((-0.88 + (a / n) * 1.76) * Math.PI) / 2,
          t = r / rings;
        const radius = 0.45 * t,
          rib = 0.01 * Math.cos(theta * 30) * Math.sin(t * Math.PI);
        p.push(
          Math.sin(theta) * radius,
          sign * (0.014 + 0.075 * Math.sin(t * Math.PI) + rib - side * 0.009),
          0.24 - Math.cos(theta) * radius,
        );
        if (r < rings && a < n) {
          const j = side * layer + r * stride + a,
            forward = sign > 0 !== Boolean(side);
          idx.push(
            ...(forward
              ? [j, j + 1, j + stride, j + 1, j + stride + 1, j + stride]
              : [j, j + stride, j + 1, j + 1, j + stride, j + stride + 1]),
          );
        }
      }
  // 外缘与两侧封口，真实壳壁不再是两张纸片。
  const join = (i, j) => idx.push(i, j, layer + i, j, layer + j, layer + i);
  for (let a = 0; a < n; a++) join(rings * stride + a, rings * stride + a + 1);
  for (let r = 0; r < rings; r++) {
    join(r * stride, (r + 1) * stride);
    join(r * stride + n, (r + 1) * stride + n);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return paint(g, "#cbb3c5", "#8f789a", 0.09);
}
function scallop(body, motions) {
  const hinge = new THREE.Group();
  body.add(hinge);
  const valves = [];
  for (const sign of [-1, 1]) {
    const valve = new THREE.Group();
    valve.position.z = 0.24;
    hinge.add(valve);
    const shell = part(
      valve,
      `moon_scallop_valve${sign}`,
      () => shellGeometry(sign),
      material("#d1b9d0", 0.61),
    );
    shell.material.side = THREE.DoubleSide;
    shell.position.z = -0.24;
    valves.push({ valve, sign });
  }
  for (const sign of [-1, 1])
    part(body, `moon_scallop_mantle${sign}`, () => {
      const g = shellGeometry(sign);
      g.scale(0.93, 0.22, 0.93);
      g.translate(0, 0, 0.24 * (1 - 0.93));
      return paint(g, "#ab6d8b", "#925d83", 0.02);
    });
  const edge = [];
  for (let i = 0; i < 18; i++) {
    const a = ((-0.82 + (i / 17) * 1.64) * Math.PI) / 2;
    edge.push([Math.sin(a) * 0.443, 0, 0.24 - Math.cos(a) * 0.443]);
    oval(
      body,
      `moon_scallop_eye${i}`,
      [edge.at(-1)[0], 0.013, edge.at(-1)[2]],
      [0.006, 0.006, 0.007],
      "#285768",
      10,
    );
  }
  tube(body, "moon_scallop_soft_rim", edge, 0.012, "#e3b5b8", 30, 7);
  motions.push((t, e) => {
    const clap =
      0.025 + (Math.sin(t * (1.6 + e * 0.12)) * 0.5 + 0.5) ** 3 * 0.12;
    for (const { valve, sign } of valves) valve.rotation.x = sign * clap;
  });
  body.userData.mouthAnchors = [
    anchor(body, "moon_scallop_mouth", [0, 0, -0.16]),
  ];
}
function ray(body, motions) {
  const k = "lyre_ray";
  part(body, `${k}_disc`, () =>
    loft(
      [
        [-0.36, 0.024, 0.014],
        [-0.29, 0.09, 0.029],
        [-0.1, 0.12, 0.04],
        [0.15, 0.068, 0.028],
        [0.3, 0.02, 0.014],
      ],
      "#609aa9",
      "#c1d1c8",
      { rings: 28, sides: 16 },
    ),
  );
  eyePair(body, k, 0.06, 0.033, -0.23, 0.012, "#bba867");
  for (const s of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(s * 0.07, 0, -0.14);
    body.add(wing);
    fin(
      wing,
      `${k}_wing${s}`,
      [
        [0, 0],
        [-0.12, s * 0.14],
        [-0.09, s * 0.39],
        [0.08, s * 0.51],
        [0.26, s * 0.35],
        [0.34, s * 0.16],
        [0.23, s * 0.07],
        [0.16, 0],
      ],
      "#7bb5c2",
      "horizontal",
      0.026,
    );
    bindTentacleMotion(
      wing,
      `${k}_wing_rig${s}`,
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(s * 0.18, 0, 0.045),
        new THREE.Vector3(s * 0.34, 0, 0.075),
        new THREE.Vector3(s * 0.51, 0, 0.08),
      ]),
      motions,
      { count: 7, amplitude: 0.07, phase: s },
    );
    motions.push((t, e) => {
      wing.rotation.z = s * Math.sin(t * 0.95) * (0.16 + e * 0.025);
    });
    flexible(
      body,
      `${k}_ribbon${s}`,
      [
        [s * 0.014, 0, 0.24],
        [s * 0.03, 0.014, 0.4],
        [s * 0.06, -0.008, 0.56],
        [s * 0.07, 0.015, 0.68],
      ],
      [0.01, 0.008, 0.005, 0.001],
      "#81b7bf",
      motions,
      { amplitude: 0.17, count: 7, segments: 28, sides: 7, phase: s },
    );
    for (let j = 0; j < 4; j++)
      tube(
        body,
        `${k}_gill${s}_${j}`,
        [
          [s * 0.048, -0.025, -0.16 + j * 0.032],
          [s * 0.072, -0.023, -0.13 + j * 0.032],
        ],
        0.002,
        "#526d7b",
        5,
        4,
      );
  }
  body.userData.mouthAnchors = [
    anchor(body, `${k}_mouth`, [0, -0.015, -0.355]),
  ];
}
function seahorse(body, motions) {
  const k = "pearl_seahorse",
    p = [
      [0, 0.3, -0.34],
      [0, 0.32, -0.22],
      [0, 0.24, -0.15],
      [0, 0.14, -0.2],
      [0, -0.02, -0.16],
      [0, -0.2, -0.04],
      [0, -0.27, 0.13],
      [0, -0.21, 0.27],
      [0, -0.11, 0.2],
      [0, -0.14, 0.11],
    ],
    r = [0.018, 0.045, 0.037, 0.075, 0.093, 0.05, 0.025, 0.018, 0.01, 0.001];
  const rig = flexible(body, `${k}_continuous`, p, r, "#b89662", motions, {
    belly: "#dbc193",
    amplitude: 0.055,
    count: 10,
    segments: 64,
    sides: 16,
    relief: 0.12,
  });
  eyePair(body, k, 0.035, 0.312, -0.237, 0.012, "#a58545");
  tube(
    body,
    `${k}_snout`,
    [
      [0, 0.3, -0.3],
      [0, 0.296, -0.39],
      [0, 0.294, -0.425],
    ],
    0.018,
    "#c9ac79",
    12,
    14,
  );
  oval(
    body,
    `${k}_mouth_rim`,
    [0, 0.294, -0.425],
    [0.019, 0.018, 0.006],
    "#94784f",
    16,
  );
  oval(
    body,
    `${k}_mouth_hole`,
    [0, 0.294, -0.431],
    [0.009, 0.009, 0.003],
    "#403b2c",
    12,
  );
  for (let i = 0; i < 4; i++)
    oval(
      body,
      `${k}_pearl${i}`,
      [(i - 1.5) * 0.019, 0.376 - 0.008 * Math.abs(i - 1.5), -0.228],
      [0.013, 0.014, 0.012],
      "#e8d7b2",
      14,
    );
  for (let i = 2; i < rig.rig.bones.length - 1; i++) {
    const bone = rig.rig.bones[i],
      t = i / (rig.rig.bones.length - 1),
      q = t * (r.length - 1),
      j = Math.min(r.length - 2, Math.floor(q)),
      rr = THREE.MathUtils.lerp(r[j], r[j + 1], q - j) * 1.025;
    part(bone, `${k}_bone_ring${i}`, () => {
      const g = new THREE.TorusGeometry(rr, 0.0023, 5, 18);
      const tangent = rig.rig.points[i + 1]
        .clone()
        .sub(rig.rig.points[i - 1])
        .normalize();
      g.applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          tangent,
        ),
      );
      return paint(g, "#c6a977");
    });
  }
  const dorsal = new THREE.Group();
  dorsal.position.set(0, 0.025, -0.092);
  body.add(dorsal);
  fin(
    dorsal,
    `${k}_dorsal`,
    [
      [0, 0],
      [0.09, 0.028],
      [0.16, 0.08],
      [0.06, 0.104],
      [-0.03, 0.06],
    ],
    "#d4b782",
    "horizontal",
    0.008,
  );
  motions.push((t) => (dorsal.rotation.y = Math.sin(t * 12) * 0.2));
  rig.arm.userData.seahorseBody = true;
  body.userData.mouthAnchors = [anchor(body, `${k}_mouth`, [0, 0.294, -0.43])];
}
function argonaut(body, motions) {
  const k = "golden_argonaut";
  const shell = part(body, `${k}_fluted_shell`, () => {
    const g = new THREE.SphereGeometry(1, 40, 24),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        a = Math.atan2(z, y),
        ridge = 1 + 0.065 * Math.sin(a * 30);
      p.setXYZ(i, x * 0.105, y * 0.3 * ridge + 0.06, z * 0.285 * ridge + 0.14);
    }
    g.computeVertexNormals();
    return paint(g, "#cdb673", "#f0dab0", 0.08);
  });
  shell.material = material("#dac28a", 0.52, 0.15);
  // 壳口沿前缘向内卷，不把稀有个体画成普通金鱼换色。
  oval(
    body,
    `${k}_mantle`,
    [0, -0.022, -0.175],
    [0.075, 0.08, 0.12],
    "#a67545",
    20,
  );
  eyePair(body, k, 0.058, 0.005, -0.208, 0.018, "#dbb163");
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p = [
      [Math.cos(a) * 0.035, Math.sin(a) * 0.035, -0.235],
      [Math.cos(a) * 0.13, Math.sin(a) * 0.085, -0.36],
      [Math.cos(a) * 0.18, Math.sin(a) * 0.08, -0.52],
      [Math.cos(a) * 0.12, Math.sin(a) * 0.11, -0.58],
    ];
    flexible(
      body,
      `${k}_arm${i}`,
      p,
      [0.013, 0.011, 0.007, 0.001],
      "#c29a58",
      motions,
      { phase: a, amplitude: 0.17, count: 7, segments: 26, sides: 8 },
    );
  }
  for (const s of [-1, 1]) {
    const sail = new THREE.Group();
    sail.position.set(s * 0.058, 0.014, -0.19);
    body.add(sail);
    fin(
      sail,
      `${k}_sail${s}`,
      [
        [0, 0],
        [-0.07, s * 0.22],
        [0.09, s * 0.31],
        [0.23, s * 0.18],
        [0.18, s * 0.05],
      ],
      "#dab566",
      "horizontal",
      0.007,
    );
    motions.push(
      (t) => (sail.rotation.z = s * (0.65 + Math.sin(t * 0.8) * 0.15)),
    );
  }
  body.userData.mouthAnchors = [anchor(body, `${k}_mouth`, [0, -0.03, -0.27])];
}
