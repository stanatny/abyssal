import * as THREE from "three";
import {
  part,
  flexible,
  material,
  anchor,
} from "./creature_odyssey_geometry.js";

const PROFILES = {
  nereid: [
    [-0.05, 0.012, 0.015, -0.024],
    [-0.037, 0.026, 0.029, -0.021],
    [-0.02, 0.039, 0.038, -0.018],
    [0.003, 0.048, 0.043, -0.019],
    [0.031, 0.049, 0.045, -0.017],
    [0.056, 0.046, 0.044, -0.012],
    [0.08, 0.037, 0.036, -0.003],
    [0.097, 0.023, 0.022, 0.003],
    [0.105, 0.001, 0.002, 0.005],
  ],
  triton_guard: [
    [-0.052, 0.023, 0.022, -0.02],
    [-0.035, 0.036, 0.031, -0.019],
    [-0.015, 0.046, 0.039, -0.018],
    [0.009, 0.054, 0.045, -0.018],
    [0.034, 0.055, 0.047, -0.016],
    [0.059, 0.05, 0.045, -0.012],
    [0.082, 0.042, 0.039, -0.002],
    [0.098, 0.026, 0.024, 0.003],
    [0.108, 0.001, 0.002, 0.006],
  ],
  naga_huntress: [
    [-0.053, 0.012, 0.019, -0.021],
    [-0.036, 0.028, 0.031, -0.019],
    [-0.014, 0.043, 0.041, -0.019],
    [0.008, 0.05, 0.045, -0.02],
    [0.034, 0.047, 0.045, -0.017],
    [0.057, 0.044, 0.043, -0.011],
    [0.082, 0.035, 0.035, -0.002],
    [0.098, 0.021, 0.022, 0.004],
    [0.106, 0.001, 0.002, 0.006],
  ],
  siren_eel: [
    [-0.051, 0.012, 0.018, -0.026],
    [-0.035, 0.026, 0.031, -0.022],
    [-0.011, 0.042, 0.041, -0.02],
    [0.013, 0.046, 0.046, -0.02],
    [0.038, 0.045, 0.046, -0.018],
    [0.064, 0.042, 0.042, -0.01],
    [0.085, 0.031, 0.033, 0],
    [0.101, 0.017, 0.019, 0.005],
    [0.107, 0.001, 0.002, 0.007],
  ],
};

/**
 * 创建连续成人颅面、贴合眼睑与软骨耳；缓存表面，动作和嘴锚点归实例所有。
 * @param {THREE.Group} parent 头部依附的实际身体组。
 * @param {object} options 种类、位置、尺度、体色及主循环动作列表。
 * @returns {object} 实际头组、口部锚点与解剖核验元数据。
 */
export function createOdysseyFace(parent, options) {
  const { key, position, scale, skin, hair, motions } = options;
  const profile = PROFILES[key] || PROFILES.nereid;
  const guard = key === "triton_guard",
    naga = key === "naga_huntress";
  const head = new THREE.Group();
  head.name = `${key}_anatomical_head`;
  head.position.set(...position);
  head.scale.setScalar(scale);
  parent.add(head);
  const skinMat = material(skin, 0.66);
  const sculpt = part(
    head,
    `${key}_adult_craniofacial_surface_v4`,
    () => headGeometry(profile, key),
    skinMat,
  );
  const eyeGroups = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.name = `${key}_anatomical_eye_${side}`;
    head.add(eye);
    part(
      eye,
      `${key}_almond_sclera_v4_${side}`,
      () => eyeSurface(profile, key, side),
      material("#c2c0b2", 0.48),
    );
    part(
      eye,
      `${key}_iris_v4_${side}`,
      () => eyeDisc(profile, key, side, 0.0045, 0.00035),
      material(naga ? "#a18e55" : guard ? "#65766a" : "#6d827e", 0.39),
    );
    part(
      eye,
      `${key}_pupil_v4_${side}`,
      () => eyeDisc(profile, key, side, 0.00225, 0.0006),
      material("#17242b", 0.38),
    );
    for (const upper of [false, true])
      part(
        head,
        `${key}_fitted_lid_v4_${side}_${upper}`,
        () => lidGeometry(profile, key, side, upper),
        skinMat,
      );
    part(
      head,
      `${key}_brow_v4_${side}`,
      () => browGeometry(profile, key, side),
      material(hair, 0.84),
    );
    part(
      head,
      `${key}_cartilage_ear_v4_${side}`,
      () => earGeometry(profile, side),
      skinMat,
    );
    part(
      head,
      `${key}_nostril_slit_v4_${side}`,
      () => nostrilGeometry(profile, key, side),
      material("#7a6657", 0.88),
    );
    eyeGroups.push(eye);
  }
  part(
    head,
    `${key}_mouth_seam_v4`,
    () => mouthGeometry(profile, key, 0),
    material("#785751", 0.8),
  );
  part(
    head,
    `${key}_upper_vermilion_v4`,
    () => mouthGeometry(profile, key, 1),
    material(guard ? "#89786f" : "#ae8b81", 0.65),
  );
  part(
    head,
    `${key}_lower_vermilion_v4`,
    () => mouthGeometry(profile, key, -1),
    material(guard ? "#a19186" : "#ba9b8c", 0.62),
  );
  part(
    head,
    `${key}_swept_scalp_v4`,
    () => scalpGeometry(profile),
    material(hair, 0.78),
  );
  // 发束沿后脑向 +Z 拖流；低幅连续变形而非触须状大摆动。
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.014;
    flexible(
      head,
      `${key}_waterborne_hair_v4_${i}`,
      [
        [x, 0.05, 0.027],
        [x * 1.12, 0.023, 0.1],
        [x * 1.22, 0.012, 0.21],
        [x * 1.4, 0.018, 0.32],
      ],
      [0.013, 0.012, 0.007, 0.0005],
      hair,
      motions,
      { amplitude: 0.055, count: 6, segments: 24, sides: 8, phase: i * 0.8 },
    );
  }
  motions.push((time) => {
    const blink = THREE.MathUtils.euclideanModulo(
      time + (guard ? 2.4 : naga ? 1.1 : 0),
      17,
    );
    const open = !(blink > 16.82 && blink < 16.94);
    for (const eye of eyeGroups) eye.visible = open;
  });
  const mouth = anchor(head, `${key}_mouth`, [0, -0.009, -0.077]);
  head.userData.face = {
    profile,
    eyeGroups,
    sculpt,
    mouth,
    continuousSurface: true,
    expression: guard
      ? "stern"
      : naga
        ? "watchful"
        : key === "siren_eel"
          ? "enigmatic"
          : "calm",
  };
  return { head, mouth };
}

function section(profile, y) {
  let i = 0;
  while (i < profile.length - 2 && y > profile[i + 1][0]) i++;
  const a = profile[i],
    b = profile[i + 1],
    span = b[0] - a[0],
    t = THREE.MathUtils.clamp((y - a[0]) / span, 0, 1),
    prev = profile[Math.max(0, i - 1)],
    next = profile[Math.min(profile.length - 1, i + 2)],
    h00 = 2 * t ** 3 - 3 * t ** 2 + 1,
    h10 = t ** 3 - 2 * t ** 2 + t,
    h01 = -2 * t ** 3 + 3 * t ** 2,
    h11 = t ** 3 - t ** 2;
  // 相邻骨点共用切线，颧骨到下颌和头顶保留 C1 连续，不逐环收成台阶。
  return [1, 2, 3].map((j) => {
    const m0 = ((b[j] - prev[j]) / (b[0] - prev[0])) * span,
      m1 = ((next[j] - a[j]) / (next[0] - a[0])) * span,
      value = h00 * a[j] + h10 * m0 + h01 * b[j] + h11 * m1;
    return j < 3 ? Math.max(0.0006, value) : value;
  });
}
function g(x, y, cx, cy, sx, sy) {
  return Math.exp(-(((x - cx) / sx) ** 2) - ((y - cy) / sy) ** 2);
}
function faceDepth(profile, key, x, y) {
  const [rx, rz, cz] = section(profile, y);
  const front = Math.sqrt(Math.max(0, 1 - (x / Math.max(rx, 0.001)) ** 2));
  const guard = key === "triton_guard",
    naga = key === "naga_huntress";
  let z = cz - rz * front;
  const nose =
    (guard ? 0.015 : 0.0115) * g(x, y, 0, 0.025, 0.0058, 0.024) +
    (guard ? 0.01 : 0.0085) * g(x, y, 0, 0.009, 0.0072, 0.0068) +
    0.0031 *
      (g(x, y, -0.0065, 0.007, 0.0035, 0.005) +
        g(x, y, 0.0065, 0.007, 0.0035, 0.005));
  const cheek =
    0.0048 *
    (g(x, y, -0.028, 0.002, 0.02, 0.022) + g(x, y, 0.028, 0.002, 0.02, 0.022));
  const brow =
    (guard ? 0.009 : 0.004) *
    (g(x, y, -0.026, 0.05, 0.022, 0.012) + g(x, y, 0.026, 0.05, 0.022, 0.012));
  const socket =
    0.006 *
    (g(x, y, -0.024, 0.034, 0.014, 0.011) +
      g(x, y, 0.024, 0.034, 0.014, 0.011));
  const muzzle =
    0.0065 * g(x, y, 0, -0.009, 0.023, 0.012) +
    0.004 * g(x, y, 0, -0.034, 0.021, 0.013);
  const nasolabial =
    0.002 *
    (g(x, y, -0.013, -0.002, 0.004, 0.012) +
      g(x, y, 0.013, -0.002, 0.004, 0.012));
  z += front * (socket + nasolabial - nose - cheek - brow - muzzle);
  if (naga)
    z -=
      front *
      0.002 *
      (g(x, y, -0.03, 0.014, 0.012, 0.024) +
        g(x, y, 0.03, 0.014, 0.012, 0.024));
  return z;
}
function headGeometry(profile, key) {
  const pos = [],
    indices = [],
    rows = 70,
    sides = 64;
  for (let row = 0; row <= rows; row++) {
    const y = THREE.MathUtils.lerp(
        profile[0][0],
        profile.at(-1)[0],
        row / rows,
      ),
      [rx, rz, cz] = section(profile, y);
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2,
        x = Math.cos(a) * rx,
        s = Math.sin(a);
      let z = cz + s * rz;
      if (s < 0) z = faceDepth(profile, key, x, y);
      pos.push(x, y, z);
      if (row < rows && j < sides) {
        const n = row * (sides + 1) + j;
        indices.push(
          n,
          n + sides + 1,
          n + 1,
          n + 1,
          n + sides + 1,
          n + sides + 2,
        );
      }
    }
  }
  // 下颌和颅顶封口，侧下方观看时不会露出空的皮肤管腔。
  for (const top of [false, true]) {
    const y = profile[top ? profile.length - 1 : 0][0],
      center = pos.length / 3,
      start = top ? rows * (sides + 1) : 0;
    pos.push(0, y, section(profile, y)[2]);
    for (let j = 0; j < sides; j++)
      indices.push(
        center,
        start + j + (top ? 1 : 0),
        start + j + (top ? 0 : 1),
      );
  }
  return mesh(pos, indices);
}
function eyeShape(key, side, u) {
  const center = side * 0.024,
    tilt =
      (key === "naga_huntress"
        ? 0.0032
        : key === "triton_guard"
          ? 0.0008
          : 0.0018) *
      side *
      u;
  const curve = Math.max(0, 1 - u * u) ** 0.72;
  return {
    x: center + u * 0.0112,
    upper: 0.034 + tilt + curve * (key === "triton_guard" ? 0.004 : 0.0036),
    lower: 0.034 + tilt - curve * 0.00265,
  };
}
function eyeSurface(profile, key, side) {
  const pos = [],
    idx = [],
    nx = 26,
    ny = 8;
  for (let i = 0; i <= nx; i++)
    for (let j = 0; j <= ny; j++) {
      const u = (i / nx) * 2 - 1,
        p = eyeShape(key, side, u),
        v = j / ny,
        y = THREE.MathUtils.lerp(p.lower, p.upper, v);
      const bulge = 0.0019 * Math.sin(v * Math.PI) * Math.max(0, 1 - u * u);
      pos.push(p.x, y, faceDepth(profile, key, p.x, y) - 0.001 - bulge);
      if (i < nx && j < ny) {
        const n = i * (ny + 1) + j;
        idx.push(n, n + 1, n + ny + 1, n + 1, n + ny + 2, n + ny + 1);
      }
    }
  return mesh(pos, idx);
}
function eyeDisc(profile, key, side, radius, push) {
  const pos = [],
    idx = [],
    n = 40,
    cx = side * 0.024,
    cy = 0.034;
  const fitted = (x, y) => {
    const u = (x - cx) / 0.0112,
      edge = eyeShape(key, side, u),
      py = THREE.MathUtils.clamp(y, edge.lower + 0.00015, edge.upper - 0.00015),
      v = (py - edge.lower) / Math.max(0.0001, edge.upper - edge.lower),
      bulge = 0.0019 * Math.sin(v * Math.PI) * Math.max(0, 1 - u * u);
    return [x, py, faceDepth(profile, key, x, py) - 0.001 - bulge - push];
  };
  pos.push(...fitted(cx, cy));
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pos.push(
      ...fitted(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius * 0.9),
    );
    if (i < n) idx.push(0, i + 2, i + 1);
  }
  return mesh(pos, idx);
}
function lidGeometry(profile, key, side, upper) {
  const pos = [],
    idx = [],
    n = 30;
  for (let i = 0; i <= n; i++)
    for (let j = 0; j < 3; j++) {
      const u = (i / n) * 2 - 1,
        p = eyeShape(key, side, u),
        edge = upper ? p.upper : p.lower;
      const y =
        edge +
        (upper ? 1 : -1) * j * 0.0014 * Math.sqrt(Math.max(0, 1 - u * u));
      pos.push(p.x, y, faceDepth(profile, key, p.x, y) - 0.0015 * (1 - j / 3));
      if (i < n && j < 2) {
        const k = i * 3 + j;
        idx.push(
          ...(upper
            ? [k, k + 1, k + 3, k + 1, k + 4, k + 3]
            : [k, k + 3, k + 1, k + 1, k + 3, k + 4]),
        );
      }
    }
  return mesh(pos, idx);
}
function browGeometry(profile, key, side) {
  const pos = [],
    idx = [],
    n = 28;
  for (let i = 0; i <= n; i++)
    for (let j = 0; j < 2; j++) {
      const u = i / n,
        x = side * (0.012 + u * 0.029);
      const y =
        0.048 +
        Math.sin(u * Math.PI) * 0.0038 +
        (key === "triton_guard" ? u * 0.005 : 0.001) -
        j *
          (key === "triton_guard" ? 0.0018 : 0.0013) *
          Math.sin(Math.PI * (0.12 + u * 0.82));
      pos.push(x, y, faceDepth(profile, key, x, y) - 0.0017);
      if (i < n && j === 0) {
        const k = i * 2;
        idx.push(
          ...(side > 0
            ? [k, k + 2, k + 1, k + 1, k + 2, k + 3]
            : [k, k + 1, k + 2, k + 1, k + 3, k + 2]),
        );
      }
    }
  return mesh(pos, idx);
}
function earGeometry(profile, side) {
  const pos = [],
    idx = [],
    n = 36,
    rows = 12;
  for (let row = 0; row <= rows; row++)
    for (let i = 0; i <= n; i++) {
      const r = row / rows,
        a = (i / n) * Math.PI * 2,
        y = 0.018 + Math.sin(a) * 0.0175 * r,
        z = 0.003 + Math.cos(a) * 0.0088 * r * (1 + 0.1 * Math.sin(a)),
        [rx, rz, cz] = section(profile, y),
        attachedX = rx * Math.sqrt(Math.max(0, 1 - ((z - cz) / rz) ** 2)),
        helix =
          0.0048 * Math.sin(r * Math.PI) +
          0.0012 * Math.exp(-(((r - 0.82) / 0.12) ** 2)),
        x = side * (attachedX + 0.0005 + helix);
      pos.push(x, y, z);
      if (row < rows && i < n) {
        const k = row * (n + 1) + i;
        idx.push(
          ...(side > 0
            ? [k, k + 1, k + n + 1, k + 1, k + n + 2, k + n + 1]
            : [k, k + n + 1, k + 1, k + 1, k + n + 1, k + n + 2]),
        );
      }
    }
  return mesh(pos, idx);
}
function nostrilGeometry(profile, key, side) {
  const pos = [],
    idx = [],
    n = 16;
  for (let i = 0; i <= n; i++)
    for (let j = 0; j < 2; j++) {
      const u = i / n,
        x = side * (0.0038 + u * 0.0047),
        y = 0.0042 - Math.sin(u * Math.PI) * 0.0007 - j * 0.0007;
      pos.push(x, y, faceDepth(profile, key, x, y) - 0.0004);
      if (i < n && j === 0) {
        const k = i * 2;
        idx.push(
          ...(side > 0
            ? [k, k + 2, k + 1, k + 1, k + 2, k + 3]
            : [k, k + 1, k + 2, k + 1, k + 3, k + 2]),
        );
      }
    }
  return mesh(pos, idx);
}
function mouthGeometry(profile, key, type) {
  const pos = [],
    idx = [],
    nx = 42,
    ny = 5;
  for (let i = 0; i <= nx; i++)
    for (let j = 0; j <= ny; j++) {
      const u = (i / nx) * 2 - 1,
        x = u * 0.018,
        falloff = Math.max(0, 1 - u * u);
      const corner =
        key === "nereid"
          ? 0.0018 * u * u
          : key === "triton_guard"
            ? -0.001 * u * u
            : 0;
      const seam = -0.009 + corner - 0.0008 * Math.cos(u * Math.PI * 2);
      const width =
        type === 0 ? 0.00045 : (type > 0 ? 0.0021 : 0.0026) * falloff;
      const y =
        seam + (type === 0 ? (j / ny - 0.5) * width : (type * width * j) / ny);
      pos.push(
        x,
        y,
        faceDepth(profile, key, x, y) -
          0.0009 -
          0.0005 * Math.sin((j / ny) * Math.PI) * falloff,
      );
      if (i < nx && j < ny) {
        const k = i * (ny + 1) + j;
        idx.push(
          ...(type >= 0
            ? [k, k + 1, k + ny + 1, k + 1, k + ny + 2, k + ny + 1]
            : [k, k + ny + 1, k + 1, k + 1, k + ny + 1, k + ny + 2]),
        );
      }
    }
  return mesh(pos, idx);
}
function scalpGeometry(profile) {
  const pos = [],
    idx = [],
    rows = 24,
    sides = 64;
  for (let j = 0; j <= sides; j++)
    for (let row = 0; row <= rows; row++) {
      const a = (j / sides) * Math.PI * 2,
        s = Math.sin(a),
        front = Math.max(0, -s);
      const line = -0.007 + front * 0.08 + Math.abs(Math.cos(a)) * 0.033;
      const y = THREE.MathUtils.lerp(
          line,
          profile.at(-1)[0] + 0.0008,
          row / rows,
        ),
        [rx, rz, cz] = section(profile, y);
      const ridge =
        0.00065 * Math.cos(a * 21 + y * 80) * Math.sin((row / rows) * Math.PI);
      pos.push(
        Math.cos(a) * (rx + 0.0035 + ridge),
        y,
        cz + s * (rz + 0.0045 + ridge),
      );
      if (j < sides && row < rows) {
        const k = j * (rows + 1) + row;
        idx.push(k, k + 1, k + rows + 1, k + 1, k + rows + 2, k + rows + 1);
      }
    }
  return mesh(pos, idx);
}
function mesh(pos, idx) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.setIndex(idx);
  geometry.computeVertexNormals();
  return geometry;
}
