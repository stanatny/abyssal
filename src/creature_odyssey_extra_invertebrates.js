import * as THREE from "three";
import {
  part,
  loft,
  oval,
  tube,
  fin,
  eyePair,
  flexible,
  anchor,
  material,
  paint,
  curvedGeometry,
  geometry,
} from "./creature_odyssey_geometry.js";

const JELLY_BELL = new THREE.MeshPhysicalMaterial({
  color: "#ad9dbb",
  roughness: 0.43,
  metalness: 0,
  transparent: true,
  opacity: 0.66,
  depthWrite: false,
  side: THREE.DoubleSide,
});

/** 乌贼的外套膜、壶居甲壳与水母伞体分别承担完全不同的推进动作。 */
export function buildOdysseyInvertebrate(kind, body, motions) {
  if (kind === "iris_cuttlefish") cuttlefish(body, motions);
  else if (kind === "amphora_hermit") hermit(body, motions);
  else if (kind === "aegean_jelly") jelly(body, motions);
  else throw new Error(`Unknown Odyssean invertebrate: ${kind}`);
}
function cuttlefish(body, motions) {
  const k = "iris_cuttlefish";
  part(body, `${k}_mantle`, () =>
    loft(
      [
        [-0.3, 0.07, 0.048],
        [-0.2, 0.17, 0.105],
        [-0.02, 0.2, 0.12],
        [0.23, 0.17, 0.09],
        [0.39, 0.075, 0.04],
        [0.43, 0.005, 0.004],
      ],
      "#8a4567",
      "#cdb8a8",
      { rings: 40, sides: 26, relief: 0.012 },
    ),
  );
  oval(body, `${k}_head`, [0, 0, -0.31], [0.112, 0.065, 0.088], "#ad677c", 24);
  eyePair(body, k, 0.101, 0.013, -0.328, 0.017, "#d6b988");
  for (const s of [-1, 1]) {
    cuttleRibbon(body, motions, s);
    tube(
      body,
      `${k}_mantle_edge${s}`,
      [
        [s * 0.08, 0.065, -0.23],
        [s * 0.15, 0.07, -0.08],
        [s * 0.15, 0.045, 0.16],
        [s * 0.06, 0.025, 0.35],
      ],
      0.0028,
      "#bba775",
      20,
      5,
    );
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2,
      x = Math.cos(a) * 0.067,
      y = Math.sin(a) * 0.036;
    flexible(
      body,
      `${k}_arm${i}`,
      [
        [x, y, -0.34],
        [x * 1.6, y * 1.3, -0.44],
        [x * 1.9, y, -0.52],
        [x * 1.5, y * 0.4, -0.56],
      ],
      [0.018, 0.014, 0.007, 0.001],
      "#a3767f",
      motions,
      { count: 6, segments: 20, sides: 8, amplitude: 0.085, phase: i * 0.7 },
    );
  }
  for (const s of [-1, 1])
    flexible(
      body,
      `${k}_feeding_arm${s}`,
      [
        [s * 0.025, -0.018, -0.34],
        [s * 0.035, -0.035, -0.46],
        [s * 0.04, -0.01, -0.6],
        [s * 0.07, 0.006, -0.63],
      ],
      [0.011, 0.007, 0.009, 0.001],
      "#cab99e",
      motions,
      { count: 6, segments: 24, sides: 8, amplitude: 0.1, phase: s },
    );
  tube(
    body,
    `${k}_siphon`,
    [
      [0.018, -0.05, -0.26],
      [0.026, -0.057, -0.33],
      [0.022, -0.052, -0.37],
    ],
    0.014,
    "#c6aaa1",
    8,
    10,
  );
  body.userData.mouthAnchors = [anchor(body, `${k}_mouth`, [0, -0.018, -0.37])];
}
/** 连续侧鳍通过固定在膜缘的短骨节起伏，薄膜之间没有独立叶片缝隙。 */
function cuttleRibbon(body, motions, side) {
  const count = 13,
    start = -0.26,
    end = 0.38;
  const width = (z) =>
    0.075 + 0.127 * Math.sin((Math.PI * (z - start)) / (end - start));
  const g = geometry(`iris_cuttlefish_continuous_fin${side}`, () => {
    const p = [],
      c = [],
      ids = [],
      weights = [],
      idx = [],
      rings = 52,
      cols = 6;
    for (let i = 0; i <= rings; i++)
      for (let j = 0; j <= cols; j++) {
        const u = i / rings,
          v = j / cols,
          z = start + (end - start) * u;
        const root = width(z),
          span = (0.028 + 0.033 * Math.sin(u * Math.PI)) * 0.95;
        p.push(
          side * (root + v * span),
          -0.002 + Math.sin(v * Math.PI) * 0.003,
          z,
        );
        const col = new THREE.Color("#b99e83").multiplyScalar(
          0.85 + 0.1 * Math.cos(u * Math.PI * 36) * v,
        );
        c.push(col.r, col.g, col.b);
        const t = u * (count - 1),
          q = Math.min(count - 2, Math.floor(t)),
          f = t - q;
        ids.push(q, q + 1, 0, 0);
        weights.push(1 - f, f, 0, 0);
        if (i < rings && j < cols) {
          const n = i * (cols + 1) + j;
          idx.push(n, n + 1, n + cols + 1, n + 1, n + cols + 2, n + cols + 1);
        }
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(ids, 4));
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
  const mat = material("#bdab95", 0.57);
  mat.side = THREE.DoubleSide;
  const mesh = new THREE.SkinnedMesh(g, mat);
  mesh.name = `iris_cuttlefish_continuous_fin${side}`;
  mesh.userData.keepSeparate = true;
  body.add(mesh);
  const bones = Array.from({ length: count }, (_, i) => {
    const b = new THREE.Bone(),
      z = start + ((end - start) * i) / (count - 1);
    b.position.set(side * width(z), 0, z);
    mesh.add(b);
    return b;
  });
  mesh.bind(new THREE.Skeleton(bones));
  mesh.userData.tentacleSkeleton = mesh.skeleton;
  g.computeBoundingSphere();
  mesh.boundingSphere = g.boundingSphere.clone();
  mesh.boundingSphere.radius += 0.06;
  motions.push((t, e) => {
    for (let i = 0; i < count; i++)
      bones[i].rotation.z =
        side * Math.sin(t * (3.2 + e * 0.2) - i * 0.48) * 0.3;
  });
}
function amphoraGeometry() {
  const profile = [
    [0.12, -0.23],
    [0.19, -0.18],
    [0.23, -0.05],
    [0.22, 0.12],
    [0.15, 0.23],
    [0.085, 0.28],
    [0.08, 0.34],
    [0.103, 0.355],
    [0.103, 0.374],
    [0.068, 0.374],
    [0.063, 0.33],
    [0.064, 0.28],
    [0.1, 0.245],
    [0.12, 0.235],
  ];
  const g = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    44,
    0,
    Math.PI * 2,
  );
  g.rotateX(Math.PI / 2);
  g.rotateY(0.18);
  g.translate(0, 0.025, 0.08);
  return paint(g, "#a56845", "#8d644c", 0.055);
}
function hermit(body, motions) {
  const k = "amphora_hermit";
  part(body, `${k}_shell`, amphoraGeometry, material("#987158", 0.87));
  for (let i = 0; i < 3; i++) {
    const band = part(body, `${k}_pot_band${i}`, () => {
      const g = new THREE.TorusGeometry(0.225 - i * 0.018, 0.0035, 5, 40);
      g.translate(0, 0.025, 0.04 + i * 0.065);
      return paint(g, "#d1b18b");
    });
  }
  for (const s of [-1, 1]) {
    tube(
      body,
      `${k}_handle${s}`,
      [
        [s * 0.1, 0.03, 0.31],
        [s * 0.18, 0.09, 0.2],
        [s * 0.27, 0.03, 0.1],
        [s * 0.18, -0.06, 0.045],
      ],
      0.025,
      "#a56d4e",
      20,
      10,
    );
    for (let j = 0; j < 3; j++)
      tube(
        body,
        `${k}_engraving${s}_${j}`,
        [
          [s * 0.12, 0.145, 0.07 + j * 0.035],
          [s * 0.16, 0.13, 0.025 + j * 0.035],
          [s * 0.19, 0.09, 0.04 + j * 0.035],
        ],
        0.003,
        "#d7b786",
        8,
        5,
      );
  }
  part(body, `${k}_thorax`, () =>
    loft(
      [
        [-0.4, 0.08, 0.035],
        [-0.33, 0.14, 0.07],
        [-0.23, 0.16, 0.085],
        [-0.12, 0.09, 0.05],
        [0.03, 0.035, 0.025],
      ],
      "#8b6171",
      "#bd947d",
      { rings: 28, sides: 18 },
    ),
  );
  for (const s of [-1, 1]) {
    tube(
      body,
      `${k}_eyestalk${s}`,
      [
        [s * 0.075, 0.045, -0.34],
        [s * 0.082, 0.11, -0.365],
        [s * 0.097, 0.13, -0.37],
      ],
      0.008,
      "#aa7b82",
      12,
      7,
    );
    oval(
      body,
      `${k}_eye${s}`,
      [s * 0.097, 0.131, -0.372],
      [0.023, 0.02, 0.022],
      "#17252b",
      16,
    );
    oval(
      body,
      `${k}_iris${s}`,
      [s * 0.098, 0.134, -0.388],
      [0.011, 0.011, 0.005],
      "#d2af70",
      12,
    );
    for (let i = 0; i < 3; i++) {
      const joint = new THREE.Group();
      joint.position.set(s * 0.1, -0.01, -0.22 + i * 0.055);
      body.add(joint);
      part(joint, `${k}_leg${s}_${i}`, () =>
        curvedGeometry(
          [
            [0, 0, 0],
            [s * 0.16, -0.018, -0.07],
            [s * 0.21, -0.14, -0.1],
            [s * 0.23, -0.15, -0.12],
          ],
          [0.018, 0.02, 0.01, 0.001],
          "#a07381",
          "#c19a8b",
          22,
          8,
        ),
      );
      oval(
        joint,
        `${k}_leg_joint${s}_${i}`,
        [s * 0.16, -0.018, -0.07],
        [0.024, 0.023, 0.024],
        "#ba957e",
        12,
      );
      motions.push((t, e) => {
        joint.rotation.y =
          Math.sin(t * (2 + e * 0.2) + i * Math.PI * 0.7 + s) * 0.16;
        joint.rotation.z = s * Math.max(0, Math.sin(t * 2 + i * 2 + s)) * 0.16;
      });
    }
    const claw = new THREE.Group();
    claw.position.set(s * 0.1, 0.005, -0.34);
    body.add(claw);
    tube(
      claw,
      `${k}_forearm${s}`,
      [
        [0, 0, 0],
        [s * 0.1, -0.005, -0.075],
        [s * 0.1, 0.014, -0.18],
      ],
      0.025,
      "#9b697e",
      18,
      10,
    );
    oval(
      claw,
      `${k}_palm${s}`,
      [s * 0.1, 0.015, -0.195],
      [s < 0 ? 0.075 : 0.045, 0.04, 0.075],
      "#b28482",
      20,
    );
    for (let j = 0; j < 2; j++)
      tube(
        claw,
        `${k}_pincer${s}_${j}`,
        [
          [s * 0.1 + (j ? 1 : -1) * 0.025, 0.015, -0.21],
          [s * 0.1 + (j ? 1 : -1) * 0.032, 0.008, -0.28],
          [s * 0.1, 0.008, -0.305],
        ],
        0.012,
        "#d1b39b",
        14,
        8,
      );
    motions.push((t) => {
      claw.rotation.y = s * (0.07 + Math.sin(t * 1.2 + s) * 0.08);
    });
    flexible(
      body,
      `${k}_antenna${s}`,
      [
        [s * 0.025, 0.05, -0.385],
        [s * 0.05, 0.07, -0.48],
        [s * 0.12, 0.08, -0.57],
      ],
      [0.004, 0.003, 0.0005],
      "#d0af8b",
      motions,
      { count: 5, segments: 20, sides: 5, amplitude: 0.09, phase: s },
    );
  }
  oval(
    body,
    `${k}_oral_field`,
    [0, -0.018, -0.393],
    [0.035, 0.017, 0.008],
    "#44393a",
    16,
  );
  body.userData.mouthAnchors = [anchor(body, `${k}_mouth`, [0, -0.018, -0.4])];
}
function jelly(body, motions) {
  const k = "aegean_jelly",
    bell = new THREE.Group();
  body.add(bell);
  part(
    bell,
    `${k}_bell`,
    () => {
      const g = new THREE.SphereGeometry(
        0.255,
        40,
        22,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.61,
      );
      return paint(g, "#796a9e", "#bc9db4", 0.03);
    },
    JELLY_BELL,
  );
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    oval(
      bell,
      `${k}_gonad${i}`,
      [Math.sin(a) * 0.085, 0.1, Math.cos(a) * 0.085],
      [0.065, 0.028, 0.045],
      "#c29cae",
      18,
    );
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    tube(
      bell,
      `${k}_radial${i}`,
      [
        [Math.sin(a) * 0.02, 0.25, Math.cos(a) * 0.02],
        [Math.sin(a) * 0.15, 0.195, Math.cos(a) * 0.15],
        [Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25],
      ],
      0.0034,
      "#cfb1bd",
      16,
      5,
    );
    flexible(
      body,
      `${k}_tentacle${i}`,
      [
        [Math.sin(a) * 0.23, -0.025, Math.cos(a) * 0.23],
        [Math.sin(a) * 0.22, -0.2, Math.cos(a) * 0.22],
        [Math.sin(a + 0.2) * 0.19, -0.43, Math.cos(a + 0.2) * 0.19],
        [Math.sin(a + 0.4) * 0.16, -0.6, Math.cos(a + 0.4) * 0.16],
      ],
      [0.0045, 0.004, 0.002, 0.0004],
      "#ad91ab",
      motions,
      { count: 7, segments: 26, sides: 5, amplitude: 0.11, phase: i * 0.6 },
    );
  }
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    flexible(
      body,
      `${k}_oral_frill${i}`,
      [
        [Math.sin(a) * 0.025, 0.02, Math.cos(a) * 0.025],
        [Math.sin(a + 0.3) * 0.065, -0.12, Math.cos(a + 0.3) * 0.065],
        [Math.sin(a + 0.4) * 0.07, -0.3, Math.cos(a + 0.4) * 0.07],
        [Math.sin(a + 0.1) * 0.04, -0.44, Math.cos(a + 0.1) * 0.04],
      ],
      [0.027, 0.023, 0.018, 0.002],
      "#be9da7",
      motions,
      {
        count: 7,
        segments: 30,
        sides: 10,
        relief: 0.2,
        amplitude: 0.15,
        phase: i,
      },
    );
  }
  motions.push((t, e) => {
    const pulse = Math.sin(t * (1.4 + e * 0.1));
    bell.scale.set(1 - pulse * 0.035, 1 + pulse * 0.055, 1 - pulse * 0.035);
  });
  body.userData.mouthAnchors = [anchor(body, `${k}_mouth`, [0, -0.035, -0.06])];
}
