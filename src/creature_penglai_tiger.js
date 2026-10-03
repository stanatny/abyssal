import * as THREE from "three";
import {
  pgGeometry as geometry,
  pgMaterial as mat,
  pgPart as part,
  pgLoft as loft,
  pgTaper as taper,
  pgCurve as curve,
  pgCone as cone,
} from "./creature_penglai_art.js";

/** 白虎采用独立猫科骨架：长腰、肩胛、短宽吻、掌垫与分节四肢，不再套用马形身体。 */
export function buildPenglaiTiger(b, motions, root) {
  const fur = mat("#d9ddd5", 6),
    white = mat("#e4e7dc", 6),
    black = mat("#25312f"),
    nose = mat("#67514f"),
    mouth = mat("#382c2e"),
    ivory = mat("#e2d9b8"),
    iris = mat("#83b9bd"),
    pupil = mat("#152329");
  const ovalGeo = geometry(
    "tiger_oval",
    () => new THREE.SphereGeometry(1, 20, 12),
  );
  const oval = (p, m, at, size, name) =>
    part(p, ovalGeo, m, at, size, [0, 0, 0], name);
  const torso = new THREE.Group();
  b.add(torso);
  const sections = [
    [-0.43, 0.025, 0.05, 0.055],
    [-0.34, 0.13, 0.17, 0.04],
    [-0.23, 0.148, 0.188, 0.035],
    [-0.08, 0.131, 0.164, 0.018],
    [0.1, 0.116, 0.128, 0.025],
    [0.29, 0.131, 0.146, 0.034],
    [0.4, 0.094, 0.113, 0.025],
    [0.45, 0.025, 0.04, 0.014],
  ];
  loft(torso, "white_tiger_feline_torso_v3", fur, sections);
  // 条纹沿放样截面贴合，粗细、倾斜与分叉有变化；避免整身均匀正弦条纹。
  const profile = new THREE.CatmullRomCurve3(
    sections.map((s) => new THREE.Vector3(s[1], s[2], s[3])),
    false,
    "catmullrom",
    0.25,
  );
  for (let stripe = 0; stripe < 13; stripe++) {
    const z = -0.32 + stripe * 0.054;
    const k = sections.findIndex(
      (s, i) => i < sections.length - 1 && z >= s[0] && z <= sections[i + 1][0],
    );
    const t =
        (k + (z - sections[k][0]) / (sections[k + 1][0] - sections[k][0])) /
        (sections.length - 1),
      r = profile.getPoint(t);
    const vertices = [],
      indices = [];
    for (let i = 0; i <= 24; i++) {
      const angle = -0.7 + (i / 24) * (Math.PI + 1.4),
        taperWidth = 0.003 + 0.013 * Math.sin((i / 24) * Math.PI) ** 0.7;
      const drift =
        0.028 * Math.cos(angle) * Math.sin(stripe * 2.1) +
        0.014 * Math.sin(angle * 3 + stripe);
      for (const side of [-1, 1])
        vertices.push(
          Math.cos(angle) * (r.x + 0.0018),
          Math.sin(angle) * (r.y + 0.0018) + r.z,
          z + drift + side * taperWidth,
        );
      if (i < 24) {
        const k = i * 2;
        indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const g = geometry(`tiger_fitted_stripe_${stripe}`, () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      g.setIndex(indices);
      g.computeVertexNormals();
      return g;
    });
    part(
      torso,
      g,
      black,
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
      "fitted_feline_flank_stripe",
    );
  }
  oval(
    torso,
    white,
    [0, -0.111, -0.04],
    [0.095, 0.025, 0.27],
    "pale_abdominal_fur",
  );
  for (const side of [-1, 1]) {
    oval(
      torso,
      fur,
      [side * 0.11, -0.005, -0.25],
      [0.065, 0.154, 0.133],
      "scapular_muscle",
    );
    oval(
      torso,
      fur,
      [side * 0.098, -0.017, 0.29],
      [0.071, 0.132, 0.127],
      "haunch_muscle",
    );
  }
  loft(torso, "tiger_neck_v3", fur, [
    [-0.48, 0.075, 0.104, 0.062],
    [-0.4, 0.124, 0.137, 0.066],
    [-0.31, 0.123, 0.16, 0.042],
    [-0.27, 0.04, 0.075, 0.01],
  ]);
  const head = new THREE.Group();
  head.position.set(0, 0.095, -0.42);
  torso.add(head);
  loft(head, "tiger_broad_skull_v3", fur, [
    [-0.198, 0.043, 0.045, -0.025],
    [-0.155, 0.107, 0.073, 0.003],
    [-0.086, 0.129, 0.104, 0.017],
    [0.006, 0.12, 0.104, 0.024],
    [0.064, 0.05, 0.068, 0.012],
  ]);
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.042, -0.05);
  head.add(jaw);
  oval(
    jaw,
    white,
    [0, -0.038, -0.055],
    [0.092, 0.041, 0.105],
    "continuous_lower_jaw",
  );
  oval(
    jaw,
    mouth,
    [0, -0.002, -0.065],
    [0.075, 0.005, 0.092],
    "inside_lower_jaw",
  );
  for (const side of [-1, 1]) {
    oval(
      head,
      white,
      [side * 0.057, -0.017, -0.173],
      [0.059, 0.046, 0.048],
      "feline_whisker_pad",
    );
    oval(
      head,
      white,
      [side * 0.102, -0.018, -0.018],
      [0.039, 0.07, 0.071],
      "tiger_cheek_ruff",
    );
    oval(
      head,
      black,
      [side * 0.087, 0.042, -0.144],
      [0.033, 0.022, 0.014],
      "fierce_eye_socket",
    );
    oval(
      head,
      iris,
      [side * 0.087, 0.043, -0.157],
      [0.021, 0.012, 0.006],
      "blue_feline_iris",
    );
    oval(
      head,
      pupil,
      [side * 0.087, 0.044, -0.163],
      [0.008, 0.012, 0.003],
      "round_tiger_pupil",
    );
    oval(
      head,
      ivory,
      [side * 0.081, 0.048, -0.165],
      [0.003, 0.003, 0.002],
      "tiger_eye_glint",
    );
    curve(
      head,
      black,
      [
        [side * 0.058, 0.074, -0.16],
        [side * 0.089, 0.072, -0.149],
        [side * 0.116, 0.076, -0.123],
      ],
      0.006,
      "feline_brow_stripe",
    );
    const ear = new THREE.Group();
    ear.position.set(side * 0.094, 0.098, 0.016);
    head.add(ear);
    oval(
      ear,
      black,
      [0, 0.027, 0.001],
      [0.035, 0.043, 0.021],
      "rounded_black_ear",
    );
    oval(
      ear,
      white,
      [0, 0.029, -0.018],
      [0.023, 0.028, 0.004],
      "fitted_inner_ear",
    );
    oval(ear, white, [0, 0.034, 0.02], [0.014, 0.014, 0.004], "ear_ocellus");
    for (let j = 0; j < 3; j++) {
      curve(
        head,
        black,
        [
          [side * 0.077, 0.083 - j * 0.023, -0.067],
          [side * 0.121, 0.05 - j * 0.021, -0.076],
          [side * 0.134, 0.016 - j * 0.02, -0.032],
        ],
        0.004 - j * 0.0006,
        "cheek_tiger_stripe",
      );
      for (let k = 0; k < 3; k++)
        oval(
          head,
          black,
          [side * (0.039 + j * 0.014), -0.011 + k * 0.011, -0.214 + j * 0.007],
          [0.002, 0.002, 0.002],
          "whisker_follicle",
        );
      curve(
        head,
        ivory,
        [
          [side * 0.058, -0.015 + j * 0.013, -0.21],
          [side * 0.116, -0.013 + j * 0.014, -0.224],
          [side * 0.168, -0.012 + j * 0.014, -0.218],
        ],
        0.0009,
        "white_whisker",
      );
    }
    cone(
      head,
      ivory,
      [side * 0.065, -0.051, -0.153],
      [0.007, 0.043, 0.007],
      [Math.PI, 0, 0],
      "upper_canine",
    );
    cone(
      jaw,
      ivory,
      [side * 0.06, -0.004, -0.11],
      [0.005, 0.022, 0.005],
      [0, 0, 0],
      "lower_canine",
    );
  }
  oval(
    head,
    nose,
    [0, 0.003, -0.217],
    [0.031, 0.017, 0.01],
    "broad_tiger_nose",
  );
  curve(
    head,
    black,
    [
      [0, -0.006, -0.227],
      [0, -0.031, -0.219],
      [0.027, -0.036, -0.211],
    ],
    0.0025,
    "feline_philtrum",
  );
  for (let j = 0; j < 3; j++)
    curve(
      head,
      black,
      [
        [-0.043 + j * 0.011, 0.107, -0.059],
        [0, 0.121, -0.049],
        [0.043 - j * 0.011, 0.107, -0.059],
      ],
      0.004,
      "forehead_crown_stripe",
    );
  const legs = [];
  for (const front of [true, false])
    for (const side of [-1, 1]) {
      const upper = new THREE.Group();
      upper.position.set(side * 0.109, -0.077, front ? -0.267 : 0.297);
      torso.add(upper);
      taper(
        upper,
        fur,
        [
          [0, 0.015, 0],
          [side * 0.008, -0.082, front ? 0.013 : -0.039],
          [side * 0.008, -0.171, front ? 0.018 : 0.015],
        ],
        [0.054, 0.047, 0.033],
        "muscular_upper_limb",
      );
      const lower = new THREE.Group();
      lower.position.set(side * 0.008, -0.16, front ? 0.018 : 0.015);
      upper.add(lower);
      taper(
        lower,
        fur,
        [
          [0, 0.015, 0],
          [0, -0.083, front ? -0.009 : 0.046],
          [0, -0.164, -0.015],
        ],
        [0.034, 0.026, 0.025],
        "connected_feline_shin",
      );
      oval(
        lower,
        white,
        [0, -0.166, -0.037],
        [0.044, 0.025, 0.071],
        "broad_four_toed_paw",
      );
      for (let j = 0; j < 4; j++) {
        oval(
          lower,
          white,
          [(j - 1.5) * 0.02, -0.17, -0.085],
          [0.014, 0.019, 0.023],
          "individual_toe",
        );
        cone(
          lower,
          ivory,
          [(j - 1.5) * 0.02, -0.166, -0.111],
          [0.004, 0.018, 0.004],
          [Math.PI / 2, 0, 0],
          "retractable_claw",
        );
      }
      for (let j = 0; j < 3; j++)
        curve(
          upper,
          black,
          [
            [-0.035, -0.02 - j * 0.045, -0.026],
            [0, -0.025 - j * 0.045, -0.051],
            [0.034, -0.035 - j * 0.045, -0.024],
          ],
          0.005,
          "foreleg_stripe",
        );
      for (let j = 0; j < 2; j++)
        curve(
          lower,
          black,
          [
            [-0.025, -0.044 - j * 0.06, -0.018],
            [0, -0.05 - j * 0.06, -0.033],
            [0.025, -0.053 - j * 0.06, -0.018],
          ],
          0.004,
          "shin_stripe",
        );
      legs.push({ upper, lower, front, side });
    }
  const tail = new THREE.Group();
  tail.position.set(0, 0.01, 0.41);
  torso.add(tail);
  const tailPoints = [
    [0, 0, 0],
    [0, -0.065, 0.13],
    [0.035, -0.12, 0.27],
    [0.063, -0.1, 0.42],
    [0.085, -0.035, 0.48],
  ];
  taper(
    tail,
    fur,
    tailPoints,
    [0.032, 0.027, 0.022, 0.017, 0.012],
    "long_feline_tail",
  );
  for (let j = 0; j < 8; j++) {
    const u = (j + 1) / 9;
    const c = new THREE.CatmullRomCurve3(
      tailPoints.map((v) => new THREE.Vector3(...v)),
    ).getPoint(u);
    oval(
      tail,
      black,
      [c.x, c.y, c.z],
      [0.022 * (1 - u * 0.45), 0.023 * (1 - u * 0.45), 0.007],
      "irregular_tail_ring",
    );
  }
  b.userData.headAnchor = new THREE.Vector3(0, 0.07, -0.637);
  let phase = "dormant";
  root.userData.setBossPhase = (p) => {
    phase = p;
  };
  motions.push((time, speed = 1) => {
    const leap = phase === "attack",
      crouch = phase === "windup",
      stride = time * (2 + Math.min(speed, 2) * 1.6);
    torso.rotation.x = leap
      ? -0.06
      : crouch
        ? 0.03
        : Math.sin(stride * 2) * 0.009;
    torso.position.y = crouch
      ? -0.025
      : leap
        ? 0
        : Math.sin(stride * 2) * 0.003;
    head.rotation.x = crouch ? -0.08 : leap ? 0.04 : Math.sin(stride) * 0.012;
    jaw.rotation.x = crouch ? 0.18 : leap ? 0.34 : 0.035;
    for (const { upper, lower, front, side } of legs) {
      const walk = Math.sin(
        stride + (front ? 0 : Math.PI) + (side === 1 ? Math.PI : 0),
      );
      upper.rotation.x = leap
        ? front
          ? 1.02
          : -0.72
        : crouch
          ? front
            ? 0.12
            : -0.28
          : walk * 0.27;
      lower.rotation.x = leap
        ? front
          ? -0.35
          : 0.42
        : crouch
          ? 0.48
          : Math.max(0, -walk) * 0.28;
    }
    tail.rotation.y = Math.sin(time * 1.4) * 0.14;
    tail.rotation.x = crouch ? 0.12 : leap ? -0.06 : 0.02;
  });
}
