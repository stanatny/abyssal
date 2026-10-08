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

let limbMaterial;

/** 白虎采用独立猫科骨架：长腰、肩胛、短宽吻、掌垫与连续蒙皮四肢。 */
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
  torso.name = "feline_trunk";
  b.add(torso);
  const sections = [
    [-0.43, 0.025, 0.05, 0.055],
    [-0.34, 0.136, 0.18, 0.033],
    [-0.23, 0.15, 0.19, 0.023],
    [-0.08, 0.131, 0.164, 0.018],
    [0.1, 0.111, 0.127, 0.039],
    [0.29, 0.14, 0.159, 0.031],
    [0.4, 0.094, 0.113, 0.025],
    [0.45, 0.025, 0.04, 0.014],
  ];
  loft(torso, "white_tiger_feline_torso_v4", fur, sections);
  // 条纹沿放样截面贴合，粗细、倾斜与分叉有变化；避免整身均匀正弦条纹。
  const profile = new THREE.CatmullRomCurve3(
    sections.map((s) => new THREE.Vector3(s[1], s[2], s[3])),
    false,
    "catmullrom",
    0.25,
  );
  for (let stripe = 0; stripe < 13; stripe++) {
    const z = -0.32 + stripe * 0.054;
    const vertices = [],
      indices = [];
    for (let i = 0; i <= 24; i++) {
      const angle = -0.7 + (i / 24) * (Math.PI + 1.4),
        taperWidth = 0.003 + 0.013 * Math.sin((i / 24) * Math.PI) ** 0.7;
      const drift =
        0.028 * Math.cos(angle) * Math.sin(stripe * 2.1) +
        0.014 * Math.sin(angle * 3 + stripe);
      for (const side of [-1, 1]) {
        const stripeZ = z + drift + side * taperWidth;
        const k = sections.findIndex(
          (s, i) =>
            i < sections.length - 1 &&
            stripeZ >= s[0] &&
            stripeZ <= sections[i + 1][0],
        );
        const u =
          (k +
            (stripeZ - sections[k][0]) /
              (sections[k + 1][0] - sections[k][0])) /
          (sections.length - 1);
        const r = profile.getPoint(u);
        vertices.push(
          Math.cos(angle) * (r.x + 0.0015),
          Math.sin(angle) * (r.y + 0.0015) + r.z,
          stripeZ,
        );
      }
      if (i < 24) {
        const k = i * 2;
        indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const g = geometry(`tiger_fitted_stripe_v4_${stripe}`, () => {
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
    const eye = new THREE.Group();
    eye.name = "fitted_tiger_eye";
    eye.position.set(side * 0.093, 0.042, -0.147);
    eye.rotation.y = side * 2.22;
    head.add(eye);
    oval(eye, black, [0, 0, 0], [0.027, 0.016, 0.008], "fierce_eye_socket");
    oval(eye, iris, [0, 0, 0.006], [0.018, 0.01, 0.003], "blue_feline_iris");
    oval(
      eye,
      pupil,
      [0, 0, 0.0085],
      [0.0065, 0.009, 0.002],
      "round_tiger_pupil",
    );
    oval(
      eye,
      ivory,
      [-side * 0.005, 0.003, 0.01],
      [0.002, 0.002, 0.001],
      "tiger_eye_glint",
    );
    // 眼窝朝向固定，直接并回头部材质批次，避免增加双眼的独立绘制组。
    eye.updateMatrix();
    for (const mesh of [...eye.children]) {
      mesh.applyMatrix4(eye.matrix);
      head.add(mesh);
    }
    head.remove(eye);
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
  // 头朝局部 -Z、Y 向上；前肘朝后，后膝朝前，后踝构成独立的第三段。
  const legs = [];
  const joint = (parent, name) => {
    const bone = new THREE.Bone();
    bone.name = name;
    parent.add(bone);
    return bone;
  };
  for (const front of [true, false])
    for (const side of [-1, 1]) {
      const limb = new THREE.Group();
      limb.name = `${front ? "fore" : "hind"}_${side < 0 ? "left" : "right"}_limb`;
      limb.position.set(
        side * 0.112,
        front ? -0.043 : -0.022,
        front ? -0.263 : 0.29,
      );
      torso.add(limb);
      const upperLength = front ? 0.17 : 0.167;
      const lowerLength = front ? 0.19 : 0.164;
      const anchor = joint(limb, "embedded_limb_root");
      const upper = joint(limb, front ? "scapular_upper_arm" : "feline_thigh");
      const lower = joint(limb, front ? "feline_forearm" : "feline_hind_shin");
      const hock = front ? null : joint(limb, "raised_hock_to_metatarsal");
      const pawBone = joint(limb, "feline_paw_skin_joint");
      const paw = new THREE.Group();
      paw.name = "level_feline_paw";
      limb.add(paw);
      oval(
        paw,
        white,
        [0, -0.018, -0.017],
        [0.042, 0.025, 0.056],
        "broad_four_toed_paw",
      );
      oval(
        paw,
        mouth,
        [0, -0.039, -0.009],
        [0.026, 0.003, 0.03],
        "recessed_metacarpal_pad",
      );
      for (let j = 0; j < 4; j++) {
        const outer = Math.abs(j - 1.5) > 1;
        oval(
          paw,
          white,
          [(j - 1.5) * 0.019, -0.022, -0.053 + (outer ? 0.008 : 0)],
          [0.014, 0.019, 0.024],
          "individual_toe",
        );
      }
      legs.push({
        limb,
        anchor,
        pawBone,
        upper,
        lower,
        hock,
        paw,
        front,
        side,
        upperLength,
        lowerLength,
      });
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
  const groundGait = {
    active: false,
    phase: 0,
    distance: 0,
    speed: 0,
    stride: 0.078,
    duty: 0.74,
    running: 0,
  };
  root.userData.groundGaitState = groundGait;
  // 世界实测水平位移决定支撑脚的后移量，堵住时不再原地跑动。
  root.userData.setGroundTravel = (distance, dt) => {
    if (!(dt > 0) || !Number.isFinite(distance)) return;
    groundGait.active = true;
    groundGait.speed = Math.max(0, distance) / dt;
    if (!(distance > 0)) return;
    const scale = Math.max(0.001, b.scale.x * root.scale.x);
    const rawSpeed = groundGait.speed / scale;
    const running = THREE.MathUtils.smoothstep(rawSpeed, 0.2, 1.1);
    groundGait.running +=
      (running - groundGait.running) * (1 - Math.exp(-8 * dt));
    groundGait.stride = 0.078 + groundGait.running * 0.082;
    groundGait.duty = 0.74 - groundGait.running * 0.16;
    groundGait.distance += distance;
    groundGait.phase +=
      (((distance / scale) * groundGait.duty) / (2 * groundGait.stride)) *
      Math.PI *
      2;
  };
  root.userData.resetGroundTravel = () => {
    groundGait.active = false;
    groundGait.phase =
      groundGait.distance =
      groundGait.speed =
      groundGait.running =
        0;
    groundGait.stride = 0.078;
    groundGait.duty = 0.74;
  };
  let phase = "dormant",
    lastTime,
    crouchWeight = 0,
    leapWeight = 0,
    recoveryWeight = 0,
    changed = false;
  root.userData.setBossPhase = (p) => {
    if (p !== phase) changed = true;
    phase = p;
  };
  // 求解解剖关节后更新实例骨骼；缓存的蒙皮顶点不在动画中改写。
  function placeSegment(group, ay, az, by, bz, length) {
    group.position.set(0, ay, az);
    group.rotation.x = Math.atan2(az - bz, ay - by);
    group.scale.y = Math.hypot(by - ay, bz - az) / length;
  }
  const pose = (time, speed = 1) => {
    const dt =
      lastTime === undefined ? 0 : Math.min(0.3, Math.max(0, time - lastTime));
    lastTime = time;
    const ease = 1 - Math.exp(-12 * (changed ? Math.max(dt, 0.025) : dt));
    crouchWeight += ((phase === "windup" ? 1 : 0) - crouchWeight) * ease;
    leapWeight += ((phase === "attack" ? 1 : 0) - leapWeight) * ease;
    recoveryWeight += ((phase === "recover" ? 1 : 0) - recoveryWeight) * ease;
    changed = false;
    const stride = groundGait.active ? groundGait.phase : time * 1.08;
    // 落地恢复独立收拢步态，四爪落稳，不停在跃击结束时的悬空摆腿相位。
    const walking =
      (1 - crouchWeight) * (1 - leapWeight) * (1 - recoveryWeight);
    const running = groundGait.active ? groundGait.running : 0;
    const strideLength = groundGait.active ? groundGait.stride : 0.078;
    const duty = groundGait.active ? groundGait.duty : 0.74;
    const effort = groundGait.active ? 1 : Math.min(1, Math.max(0, speed));
    torso.rotation.x =
      0.025 * crouchWeight - 0.035 * leapWeight - 0.015 * running * walking;
    torso.position.y =
      -0.06 * crouchWeight -
      0.06 * running * walking +
      Math.sin(stride * 2) * (0.002 + 0.006 * running) * effort * walking;
    head.rotation.x = -0.07 * crouchWeight + 0.035 * leapWeight;
    jaw.rotation.x = 0.02 + 0.16 * crouchWeight + 0.27 * leapWeight;
    const cos = Math.cos(torso.rotation.x),
      sin = Math.sin(torso.rotation.x);
    for (const {
      limb,
      upper,
      lower,
      hock,
      paw,
      pawBone,
      front,
      side,
      upperLength,
      lowerLength,
    } of legs) {
      // 慢速四拍步态逐渐转为对角快步；支撑段掌垫水平，摆动段抬脚。
      const cycle =
        (((stride / (Math.PI * 2) +
          (side === 1 ? 0.5 : 0) +
          (front ? 0.25 + 0.25 * running : 0)) %
          1) +
          1) %
        1;
      const stance = cycle < duty;
      const u = stance ? cycle / duty : (cycle - duty) / (1 - duty);
      const smooth = u * u * (3 - 2 * u);
      const step =
        (stance ? -1 + 2 * u : 1 - 2 * smooth) *
        strideLength *
        effort *
        walking;
      const lift =
        (stance ? 0 : Math.sin(Math.PI * u) ** 2 * (0.05 + 0.025 * running)) *
        effort *
        walking;
      const restZ = front ? -0.277 : 0.28;
      let footZ = restZ + step + (front ? -0.04 : -0.055) * crouchWeight;
      let footY = -0.393 + lift;
      footZ += (front ? -0.235 : 0.13) * leapWeight;
      footY += (front ? 0.16 : 0.17) * leapWeight;
      // 逆变换抵消身体俯仰与下蹲，支撑掌垫留在原来的地面高度。
      const y = footY - torso.position.y;
      const ankleY = cos * y + sin * footZ - limb.position.y;
      const ankleZ = -sin * y + cos * footZ - limb.position.z;
      const hockY = ankleY + (front ? 0 : 0.08);
      const hockZ = ankleZ + (front ? 0 : 0.044);
      const distance = Math.hypot(hockY, hockZ);
      const d = Math.min(
        upperLength + lowerLength - 0.0001,
        Math.max(0.001, distance),
      );
      const along = (upperLength ** 2 - lowerLength ** 2 + d ** 2) / (2 * d);
      const bend =
        Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2)) *
        (front ? -1 : 1);
      const jointY = (hockY * along - hockZ * bend) / distance;
      const jointZ = (hockZ * along + hockY * bend) / distance;
      placeSegment(upper, 0, 0, jointY, jointZ, upperLength);
      placeSegment(lower, jointY, jointZ, hockY, hockZ, lowerLength);
      if (hock)
        placeSegment(
          hock,
          hockY,
          hockZ,
          ankleY,
          ankleZ,
          Math.hypot(0.08, 0.044),
        );
      paw.position.set(0, ankleY, ankleZ);
      paw.rotation.x = -torso.rotation.x + (front ? -0.18 : 0.32) * leapWeight;
      pawBone.position.copy(paw.position);
      pawBone.quaternion.copy(paw.quaternion);
    }
    tail.rotation.y = Math.sin(time * 0.72) * 0.13;
    tail.rotation.x = 0.02 + 0.1 * crouchWeight - 0.06 * leapWeight;
  };
  function bindLegSkin({
    limb,
    anchor,
    upper,
    lower,
    hock,
    pawBone,
    paw,
    front,
  }) {
    const bones = hock
      ? [anchor, upper, lower, hock, pawBone]
      : [anchor, upper, lower, pawBone];
    const skin = geometry(
      `tiger_${front ? "fore" : "hind"}_continuous_skin_v2`,
      () => {
        const points = [
          new THREE.Vector3(0, 0.092, 0),
          new THREE.Vector3(),
          lower.position.clone(),
        ];
        if (hock) points.push(hock.position.clone());
        points.push(
          paw.position.clone(),
          paw.position.clone().add(new THREE.Vector3(0, -0.027, -0.01)),
        );
        const path = new THREE.CatmullRomCurve3(points, false, "centripetal");
        const rows = 52,
          sides = 16;
        // 从埋入躯干的窄根渐扩至肌肉，再沿前臂/胫骨、后踝收细。
        const radii = front
          ? [0.008, 0.063, 0.035, 0.026, 0.012]
          : [0.008, 0.078, 0.037, 0.025, 0.026, 0.012];
        const radiusProfile = new THREE.CatmullRomCurve3(
          radii.map((radius) => new THREE.Vector3(radius, 0, 0)),
          false,
          "catmullrom",
          0.25,
        );
        const positions = [],
          indices = [],
          skinIndex = [],
          skinWeight = [],
          colors = [];
        const pale = new THREE.Color("#d9ddd5"),
          ink = new THREE.Color("#34413c");
        for (let row = 0; row <= rows; row++) {
          const t = row / rows;
          const center = path.getPoint(t),
            u = t * (points.length - 1);
          const radius = Math.max(0.006, radiusProfile.getPoint(t).x);
          // 各关节前后共同加权，让皮肤连续弯曲而非互相穿插的截断管。
          let a = 0,
            b = 1,
            blend = THREE.MathUtils.smoothstep(u, 0.05, 0.85);
          if (u >= 1) {
            const junction = Math.round(u);
            if (
              junction >= 2 &&
              junction < bones.length &&
              Math.abs(u - junction) < 0.38
            ) {
              a = junction - 1;
              b = junction;
              blend = THREE.MathUtils.smoothstep(
                u,
                junction - 0.38,
                junction + 0.38,
              );
            } else {
              a = b = Math.min(
                bones.length - 1,
                Math.max(1, Math.floor(u + 0.38)),
              );
              blend = 0;
            }
          }
          // 用同一曲线参数取切线与顶点，避免弧长采样帧和参数采样中心错位。
          const tangent = path.getTangent(t);
          const normal = new THREE.Vector3(1, 0, 0);
          const binormal = new THREE.Vector3()
            .crossVectors(tangent, normal)
            .normalize();
          for (let col = 0; col <= sides; col++) {
            const angle = (col / sides) * Math.PI * 2;
            const p = center
              .clone()
              .addScaledVector(normal, Math.cos(angle) * radius)
              .addScaledVector(
                binormal,
                Math.sin(angle) * radius * (front ? 1.03 : 1.13),
              );
            positions.push(p.x, p.y, p.z);
            skinIndex.push(a, b, 0, 0);
            skinWeight.push(1 - blend, blend, 0, 0);
            const stripe = Math.sin(u * 13 + Math.sin(angle * 2) * 0.65);
            const marked =
              u > 1.1 &&
              u < points.length - 1.5 &&
              stripe > 0.84 &&
              Math.sin(angle) > -0.4;
            const color = marked ? ink : pale;
            colors.push(color.r, color.g, color.b);
            if (row < rows && col < sides) {
              const n = row * (sides + 1) + col;
              indices.push(
                n,
                n + 1,
                n + sides + 1,
                n + 1,
                n + sides + 2,
                n + sides + 1,
              );
            }
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3),
        );
        g.setAttribute(
          "skinIndex",
          new THREE.Uint16BufferAttribute(skinIndex, 4),
        );
        g.setAttribute(
          "skinWeight",
          new THREE.Float32BufferAttribute(skinWeight, 4),
        );
        g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        g.setIndex(indices);
        g.computeVertexNormals();
        return g;
      },
    );
    const mesh = new THREE.SkinnedMesh(skin, limbMaterial);
    mesh.name = "continuous_feline_limb_skin";
    mesh.userData.articulated = true;
    mesh.frustumCulled = false;
    // 近身接触先用覆盖抬爪/扑跃的保守球筛选，再检查实时蒙皮三角形。
    mesh.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, -0.16, 0),
      0.44,
    );
    limb.add(mesh);
    root.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bones));
    mesh.userData.penglaiTigerSkeleton = mesh.skeleton;
  }
  pose(0, 0);
  if (!limbMaterial) {
    limbMaterial = fur.clone();
    limbMaterial.color.set("#ffffff");
    limbMaterial.vertexColors = true;
    limbMaterial.onBeforeCompile = fur.onBeforeCompile;
    limbMaterial.customProgramCacheKey = () => "tiger_continuous_limb_fur";
  }
  for (const leg of legs) bindLegSkin(leg);
  lastTime = undefined;
  motions.push(pose);
}

/** 只释放退役白虎的实例骨骼贴图，保留同类共用的几何与材质。 */
export function disposePenglaiTigerMotion(root) {
  root.traverse((part) => {
    part.userData.penglaiTigerSkeleton?.dispose();
  });
}
