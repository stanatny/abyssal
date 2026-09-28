import * as THREE from "three";
import {
  mergeGeometries,
  mergeVertices,
} from "three/addons/utils/BufferGeometryUtils.js";
import { sampleSection, sculptedFin } from "./creature_surface.js";

const CACHE = new Map();
const SKIN = new THREE.Color("#b98160");
const SUIT = new THREE.Color("#26353d");
const TRUNKS = new THREE.Color("#bd503e");
const HAIR = new THREE.Color("#342823");
const SWIMSUIT = new THREE.Color("#315f77");
const SUIT_PANEL = new THREE.Color("#70a7a4");

/**
 * 创建成年游泳者或潜水员；局部-Z为头部、+Y为背部，length沿用人类活动接口。
 * 几何与材质按种类及性别共享，骨骼和姿态独立；dispose只在最后一个引用释放时销毁缓存。
 * @param {'swimmer'|'diver'} kind 人类种类。
 * @param {number} length 世界尺度。
 * @param {'male'|'female'} sex 成年人物外观，默认为男性。
 * @returns {THREE.Group} userData含animate(time)、samplePose(周期比例)、motionPeriod(秒)、dispose()及命名骨骼poseBones。
 */
export function createArticulatedHuman(kind, length = 1, sex = "male") {
  sex = sex === "female" ? "female" : "male";
  const cacheKey = `${kind}_${sex}`;
  if (!CACHE.has(cacheKey)) CACHE.set(cacheKey, buildAsset(kind, sex));
  const asset = CACHE.get(cacheKey);
  asset.references++;
  const root = new THREE.Group();
  root.name = kind;
  const bones = boneDefinitions(sex).map(([name, , point]) => {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(...point).multiplyScalar(kind === "diver" ? 0.82 : 0.9);
    return bone;
  });
  boneDefinitions(sex).forEach(([, parent], index) => {
    (parent < 0 ? root : bones[parent]).add(bones[index]);
  });
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const meshes = asset.parts.map(({ geometry, material, name }) => {
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.name = `${kind}_${name}`;
    root.add(mesh);
    mesh.bind(skeleton);
    // 手臂回转的包络比静态身体大；射线使用真实蒙皮顶点，不沿用首帧的紧包围盒。
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.1);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  });
  root.scale.setScalar(length);
  const poseBones = Object.fromEntries(bones.map((bone) => [bone.name, bone]));
  let disposed = false;
  root.userData.kind = kind;
  root.userData.sex = sex;
  root.userData.length = length;
  root.userData.poseBones = poseBones;
  const period = (Math.PI * 2) / (kind === "diver" ? 1.65 : 2.35);
  const applyPose = (normalizedPhase) => {
    if (disposed || !Number.isFinite(normalizedPhase)) return;
    const progress = THREE.MathUtils.euclideanModulo(normalizedPhase, 1);
    const cycle = progress * Math.PI * 2;
    bones[1].rotation.z = Math.sin(cycle) * (kind === "diver" ? 0.035 : 0.07);
    bones[2].rotation.z =
      kind === "diver" ? 0.025 : Math.max(0, Math.sin(cycle)) * 0.34;
    bones[2].rotation.x = kind === "diver" ? -0.1 : 0.06;
    for (let side = 0; side < 2; side++) {
      const sign = side ? 1 : -1;
      const phase = cycle + side * Math.PI;
      const shoulder = bones[3 + side * 3],
        elbow = bones[4 + side * 3],
        wrist = bones[5 + side * 3];
      const hip = bones[9 + side * 3],
        knee = bones[10 + side * 3],
        ankle = bones[11 + side * 3];
      if (kind === "swimmer") {
        // 绑定上臂指向+Z，肩部从π向0递减才会在水下向脚侧推水。
        // 肘只沿同一个解剖屈曲方向弯曲；恢复半周加强屈肘，避免倒播造成反折。
        const armPhase = (progress + side * 0.5) % 1;
        const armCycle = armPhase * Math.PI * 2;
        const pull = Math.max(0, Math.sin(armCycle));
        const recovery = Math.max(0, -Math.sin(armCycle));
        shoulder.rotation.set(
          Math.PI - armCycle,
          sign * (0.08 + recovery ** 2 * 0.13),
          0,
        );
        const recoveryProgress = Math.max(0, (armPhase - 0.5) * 2);
        const highElbow =
          (recoveryProgress ** 2 * (1 - recoveryProgress) ** 3) / 0.03456;
        elbow.rotation.set(-0.12 - pull ** 2 * 0.8 - highElbow * 2.1, 0, 0);
        wrist.rotation.set(0.04 + recovery ** 2 * 0.08, 0, 0);
        hip.rotation.x = Math.sin(phase * 2 + side * Math.PI) * 0.16;
        knee.rotation.x =
          -0.08 - Math.max(0, Math.sin(phase * 2 + side * Math.PI)) * 0.23;
        ankle.rotation.x = 0.2;
      } else {
        // 潜水员保持前伸配平；脚蹼沿脚侧伸展，膝只向背侧屈曲。
        shoulder.rotation.set(-3.65 + Math.sin(phase) * 0.055, -sign * 0.08, 0);
        elbow.rotation.x = 0.6 + Math.sin(phase) * 0.04;
        wrist.rotation.x = 0.16;
        hip.rotation.x = Math.sin(phase) * 0.23;
        knee.rotation.x = -0.13 - Math.max(0, Math.sin(phase)) * 0.32;
        ankle.rotation.x = 0.14 + Math.sin(phase - 0.45) * 0.1;
      }
    }
    for (const mesh of meshes) mesh.boundingBox = null;
  };
  root.userData.motionPeriod = period;
  // 按归一化完整周期采样，便于图鉴定格与录像；不创建额外时钟或动画循环。
  root.userData.samplePose = applyPose;
  root.userData.animate = (time) => {
    if (!Number.isFinite(time)) return;
    applyPose(time / period);
  };
  root.userData.dispose = () => {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    skeleton.dispose();
    if (--asset.references === 0) {
      for (const part of asset.parts) {
        part.geometry.dispose();
        part.material.dispose();
      }
      CACHE.delete(cacheKey);
    }
  };
  root.userData.animate(0);
  return root;
}

// 骨骼位置采用父骨骼局部坐标，建模顶点始终保留统一的身体坐标。
function boneDefinitions(sex) {
  const shoulderWidth = sex === "female" ? 0.095 : 0.103;
  const hipWidth = sex === "female" ? 0.051 : 0.047;
  const definitions = [
    ["pelvis", -1, [0, 0, 0]],
    ["chest", 0, [0, 0, -0.1]],
    ["head", 1, [0, 0, -0.205]],
  ];
  for (const side of [-1, 1]) {
    const start = definitions.length;
    const prefix = side < 0 ? "left" : "right";
    definitions.push(
      [`${prefix}_shoulder`, 1, [side * shoulderWidth, 0, -0.12]],
      [`${prefix}_elbow`, start, [side * 0.012, 0, 0.155]],
      [`${prefix}_wrist`, start + 1, [0, 0, 0.143]],
    );
  }
  for (const side of [-1, 1]) {
    const start = definitions.length;
    const prefix = side < 0 ? "left" : "right";
    definitions.push(
      [`${prefix}_hip`, 0, [side * hipWidth, 0, 0.105]],
      [`${prefix}_knee`, start, [0, 0, 0.18]],
      [`${prefix}_ankle`, start + 1, [0, 0, 0.18]],
    );
  }
  return definitions;
}

function buildAsset(kind, sex) {
  const diver = kind === "diver";
  const female = sex === "female";
  const armCenter = female ? 0.101 : 0.109;
  const legCenter = female ? 0.051 : 0.047;
  const buckets = { body: [], equipment: [], lens: [] };
  // 截面刻画锁骨、肋骨、腰、骨盆和颅面，而不是将椭球作为整个身体。
  surface(
    [
      [-0.31, 0.025, 0.029],
      [-0.273, 0.03, 0.035],
      [-0.245, female ? 0.069 : 0.076, 0.045],
      [-0.207, female ? 0.095 : 0.106, 0.052],
      [-0.155, female ? 0.089 : 0.098, 0.058],
      [-0.09, female ? 0.073 : 0.083, 0.052],
      [-0.02, female ? 0.06 : 0.065, 0.043],
      [0.055, female ? 0.079 : 0.073, 0.046],
      [0.1, female ? 0.077 : 0.071, 0.05],
      [0.14, 0.012, 0.026],
    ],
    24,
    20,
    0,
    (p) => blend(0, 1, smooth(-0.02, -0.18, p.z)),
    (p) => {
      if (diver)
        return female && Math.abs(p.x) > 0.064 && p.z > -0.18
          ? SUIT_PANEL
          : SUIT;
      if (!female) return p.z > 0.038 ? TRUNKS : SKIN;
      // 连体泳衣覆盖躯干和骨盆，肩部保留运动泳衣肩带与自然领口。
      if (p.z < -0.239 || (p.z < -0.196 && Math.abs(p.x) < 0.029)) return SKIN;
      return Math.abs(p.x) > 0.048 && p.z > -0.16 && p.z < 0.08
        ? SUIT_PANEL
        : SWIMSUIT;
    },
  );
  surface(
    [
      [-0.431, 0.003, 0.004],
      [-0.418, 0.028, 0.033],
      [-0.395, 0.041, 0.047],
      [-0.362, 0.045, 0.049],
      [-0.329, female ? 0.032 : 0.036, 0.041],
      [-0.305, 0.022, 0.026],
      [-0.296, 0.005, 0.009],
    ],
    16,
    20,
    0,
    () => rigid(2),
    (p) => (p.y > (female ? 0.006 : 0.021) || p.z < -0.407 ? HAIR : SKIN),
  );
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1;
    const arm = 3 + i * 3,
      leg = 9 + i * 3;
    surface(
      [
        [-0.245, 0.009, 0.013],
        [-0.219, 0.037, 0.039],
        [-0.183, 0.035, 0.033],
        [-0.13, 0.03, 0.032],
        [-0.067, 0.026, 0.027],
        [-0.027, 0.026, 0.026],
        [0.025, 0.021, 0.019],
        [0.075, 0.014, 0.015],
        [0.094, 0.013, 0.013],
      ],
      20,
      12,
      side * armCenter,
      (p) =>
        p.z < 0.052
          ? blend(arm, arm + 1, smooth(-0.086, -0.04, p.z))
          : blend(arm + 1, arm + 2, smooth(0.06, 0.088, p.z)),
      () => (diver ? SUIT : SKIN),
    );
    surface(
      [
        [0.069, 0.014, 0.013],
        [0.104, 0.024, 0.012],
        [0.135, 0.023, 0.009],
        [0.174, 0.012, 0.006],
        [0.18, 0.001, 0.002],
      ],
      10,
      12,
      side * (armCenter + 0.002),
      () => rigid(arm + 2),
      () => (diver ? SUIT : SKIN),
    );
    // 拇指从掌侧长出，保留成人手掌方向，避免末端成为无特征圆棒。
    ellipsoid(
      [0.012, 0.008, 0.027],
      [side * (armCenter - 0.019), -0.003, 0.111],
      diver ? SUIT : SKIN,
      arm + 2,
      "body",
      [0, side * 0.32, 0],
    );
    surface(
      [
        [0.085, 0.041, 0.046],
        [0.13, 0.048, 0.049],
        [0.19, 0.041, 0.041],
        [0.255, 0.028, 0.03],
        [0.286, 0.026, 0.028],
        [0.324, 0.03, 0.032],
        [0.375, 0.027, 0.028],
        [0.427, 0.018, 0.02],
        [0.466, 0.015, 0.017],
        [0.48, 0.013, 0.012],
      ],
      22,
      14,
      side * legCenter,
      (p) =>
        p.z < 0.423
          ? blend(leg, leg + 1, smooth(0.258, 0.305, p.z))
          : blend(leg + 1, leg + 2, smooth(0.442, 0.475, p.z)),
      (p) =>
        diver
          ? SUIT
          : female
            ? p.z < 0.113
              ? SWIMSUIT
              : SKIN
            : p.z < 0.181
              ? TRUNKS
              : SKIN,
    );
    surface(
      [
        [0.449, 0.015, 0.017],
        [0.477, 0.022, 0.017, -0.005],
        [0.513, 0.023, 0.012, -0.012],
        [0.543, 0.012, 0.006, -0.018],
        [0.548, 0.001, 0.002, -0.019],
      ],
      10,
      12,
      side * legCenter,
      () => rigid(leg + 2),
      () => (diver ? SUIT : SKIN),
    );
    ellipsoid(
      [0.01, 0.018, 0.015],
      [side * 0.043, -0.002, -0.347],
      SKIN,
      2,
      "body",
    );
    if (diver) {
      const fin = sculptedFin(
        [
          [0.482, -0.016],
          [0.49, 0.016],
          [0.6, 0.052],
          [0.656, 0.043],
          [0.661, -0.043],
          [0.6, -0.052],
        ],
        0.008,
        "horizontal",
        { camber: 0.009, detail: 1 },
      );
      fin.translate(side * legCenter, -0.013, 0);
      add(fin, new THREE.Color("#b5aa68"), () => rigid(leg + 2), "equipment");
      for (const offset of [-0.025, 0.025])
        tube(
          [
            [side * legCenter + offset * 0.45, -0.006, 0.505],
            [side * legCenter + offset, -0.003, 0.58],
            [side * legCenter + offset, -0.008, 0.642],
          ],
          0.0022,
          "#4d5956",
          leg + 2,
        );
    }
  }
  if (female) {
    ellipsoid(
      [0.026, 0.02, 0.031],
      [0, 0.042, -0.313],
      HAIR,
      2,
      "body",
      [-0.25, 0, 0],
    );
    ellipsoid([0.016, 0.009, 0.016], [0, 0.054, -0.314], HAIR, 2, "body");
    tube(
      [
        [-0.012, 0.051, -0.32],
        [0, 0.058, -0.33],
        [0.012, 0.051, -0.32],
      ],
      0.0025,
      diver ? "#79aaa4" : "#98bdcb",
      2,
    );
  }
  ellipsoid([0.01, 0.011, 0.019], [0, -0.042, -0.346], SKIN, 2, "body");
  // 贴合脸部的双眼镜片与鼻梁，不用发光蓝方块替代面镜。
  for (const side of [-1, 1]) {
    ellipsoid(
      [diver ? 0.026 : 0.02, 0.007, diver ? 0.019 : 0.011],
      [side * 0.022, -0.045, -0.369],
      "#202d30",
      2,
    );
    ellipsoid(
      [diver ? 0.022 : 0.016, 0.003, diver ? 0.015 : 0.008],
      [side * 0.022, -0.052, -0.371],
      "#6b9e9d",
      2,
      "lens",
    );
  }
  tube(
    [
      [-0.041, -0.027, -0.365],
      [-0.048, 0.003, -0.366],
      [0, 0.048, -0.367],
      [0.048, 0.003, -0.366],
      [0.041, -0.027, -0.365],
    ],
    0.003,
    "#354344",
    2,
  );
  if (diver) {
    // 浮力背心贴在胸背两侧，气瓶与阀门位于背部；软管沿肩侧回到呼吸器。
    for (const side of [-1, 1]) {
      ellipsoid(
        [0.031, 0.045, 0.137],
        [side * 0.074, 0.017, -0.063],
        "#19262c",
        1,
      );
      tube(
        [
          [side * 0.06, 0.056, 0.056],
          [side * 0.072, 0.062, -0.19],
          [side * 0.062, 0.004, -0.23],
          [side * 0.052, -0.058, -0.16],
          [side * 0.051, -0.049, 0.025],
        ],
        0.009,
        "#555e59",
        1,
      );
      ellipsoid(
        [0.017, 0.008, 0.026],
        [side * 0.052, -0.058, -0.12],
        "#a3a39a",
        1,
      );
    }
    surface(
      [
        [-0.197, 0.003, 0.003, 0.1],
        [-0.188, 0.031, 0.032, 0.1],
        [-0.166, 0.04, 0.041, 0.1],
        [0.059, 0.04, 0.041, 0.1],
        [0.086, 0.026, 0.026, 0.1],
        [0.093, 0.002, 0.002, 0.1],
      ],
      20,
      18,
      0,
      () => rigid(1),
      () => new THREE.Color("#aab4ae"),
      "equipment",
    );
    for (const z of [-0.105, 0.025])
      tube(
        [
          [-0.041, 0.095, z],
          [-0.027, 0.139, z],
          [0.027, 0.139, z],
          [0.041, 0.095, z],
        ],
        0.007,
        "#293638",
        1,
      );
    ellipsoid([0.016, 0.015, 0.018], [0, 0.101, -0.205], "#737c75", 1);
    tube(
      [
        [0, 0.105, -0.205],
        [0.084, 0.09, -0.21],
        [0.101, -0.005, -0.286],
        [0.052, -0.059, -0.319],
        [0, -0.055, -0.319],
      ],
      0.0055,
      "#293638",
      1,
    );
    ellipsoid([0.019, 0.012, 0.018], [0, -0.052, -0.316], "#525d5d", 2);
    ellipsoid([0.025, 0.015, 0.027], [-0.108, 0.009, 0.039], "#414e4d", 4);
  }
  if (!diver) {
    if (female) {
      for (const side of [-1, 1])
        tube(
          [
            [side * 0.066, -0.031, 0.08],
            [side * 0.058, -0.036, -0.035],
            [side * 0.075, -0.044, -0.15],
            [side * 0.063, -0.038, -0.22],
          ],
          0.0028,
          "#a0c1ca",
          1,
        );
    } else {
      tube(
        [
          [-0.068, 0.009, 0.047],
          [-0.048, -0.031, 0.047],
          [0, -0.045, 0.047],
          [0.048, -0.031, 0.047],
          [0.068, 0.009, 0.047],
        ],
        0.0038,
        "#e0bf9e",
        0,
      );
    }
  }
  const parts = Object.entries(buckets)
    .filter(([, pieces]) => pieces.length)
    .map(([name, pieces]) => {
      const merged = mergeGeometries(pieces);
      const geometry = mergeVertices(merged, 1e-5);
      merged.dispose();
      pieces.forEach((piece) => piece.dispose());
      geometry.scale(...Array(3).fill(diver ? 0.82 : 0.9));
      geometry.computeBoundingSphere();
      const material = new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: name === "lens" ? 0.14 : name === "body" ? 0.51 : 0.48,
        metalness: name === "equipment" ? 0.2 : 0,
        clearcoat: name === "lens" ? 0.55 : 0.12,
        clearcoatRoughness: 0.28,
      });
      return { geometry, material, name };
    });
  return { parts, references: 0 };

  function surface(
    profile,
    rings,
    segments,
    x,
    weights,
    color,
    bucket = "body",
  ) {
    const positions = [],
      indices = [];
    for (let row = 0; row <= rings; row++) {
      const z = THREE.MathUtils.lerp(
        profile[0][0],
        profile.at(-1)[0],
        row / rings,
      );
      const [rx, ry, y] = sampleSection(profile, z);
      for (let col = 0; col <= segments; col++) {
        const angle = (col / segments) * Math.PI * 2;
        positions.push(x + Math.cos(angle) * rx, y + Math.sin(angle) * ry, z);
        if (row < rings && col < segments) {
          const a = row * (segments + 1) + col,
            b = a + segments + 1;
          indices.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    add(geometry, color, weights, bucket);
  }
  function add(source, color, weights, bucket) {
    const geometry = source.index ? source.toNonIndexed() : source;
    if (geometry !== source) source.dispose();
    geometry.deleteAttribute("uv");
    const colors = [],
      skinIndices = [],
      skinWeights = [];
    const point = new THREE.Vector3();
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      point.fromBufferAttribute(geometry.attributes.position, i);
      const tint =
        typeof color === "function"
          ? color(point)
          : color.isColor
            ? color
            : new THREE.Color(color);
      colors.push(tint.r, tint.g, tint.b);
      const influence = weights(point);
      skinIndices.push(...influence.indices);
      skinWeights.push(...influence.weights);
    }
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute(
      "skinIndex",
      new THREE.Uint16BufferAttribute(skinIndices, 4),
    );
    geometry.setAttribute(
      "skinWeight",
      new THREE.Float32BufferAttribute(skinWeights, 4),
    );
    buckets[bucket].push(geometry);
  }
  function ellipsoid(
    scale,
    position,
    color,
    bone,
    bucket = "equipment",
    rotation = [0, 0, 0],
  ) {
    const geometry = new THREE.SphereGeometry(1, 10, 7);
    geometry.scale(...scale);
    geometry.applyMatrix4(
      new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation)),
    );
    geometry.translate(...position);
    add(geometry, color, () => rigid(bone), bucket);
  }
  function tube(points, radius, color, bone) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    add(
      new THREE.TubeGeometry(curve, points.length * 3, radius, 6, false),
      color,
      () => rigid(bone),
      "equipment",
    );
  }
}
function rigid(bone) {
  return { indices: [bone, 0, 0, 0], weights: [1, 0, 0, 0] };
}
function blend(a, b, t) {
  return { indices: [a, b, 0, 0], weights: [1 - t, t, 0, 0] };
}
function smooth(a, b, value) {
  const t = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
