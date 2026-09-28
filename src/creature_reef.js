import * as THREE from "three";
import {
  bindAxialMotion,
  sampleSection,
  sculptedFin,
  skinMaterial,
} from "./creature_surface.js";

const GEOMETRY = new Map();
const MATERIAL = new Map();
const SPHERE = new THREE.SphereGeometry(1, 12, 8);
const DARK = plain("#183a36", 0.43);
const IRIS = plain("#a5ac72", 0.33);
const PUPIL = plain("#071a1e", 0.15);
const CONFIG = {
  boxfish: {
    back: "#c3a742",
    belly: "#dfc985",
    fin: "#b6b87d",
    square: 0.56,
    profile: [
      [-0.365, 0.012, 0.026, -0.02],
      [-0.328, 0.094, 0.105, 0],
      [-0.25, 0.155, 0.151, 0.008],
      [-0.07, 0.167, 0.155, 0.008],
      [0.11, 0.149, 0.142, 0],
      [0.225, 0.09, 0.09, -0.02],
      [0.3, 0.029, 0.038, -0.025],
      [0.355, 0.016, 0.024, -0.025],
    ],
  },
  parrotfish: {
    back: "#397e69",
    belly: "#8aaf86",
    fin: "#527f6d",
    square: 0.94,
    profile: [
      [-0.43, 0.025, 0.046, -0.066],
      [-0.39, 0.08, 0.134, -0.019],
      [-0.323, 0.111, 0.219, 0.034],
      [-0.21, 0.126, 0.223, 0.033],
      [-0.04, 0.119, 0.199, 0.008],
      [0.15, 0.077, 0.124, -0.006],
      [0.29, 0.031, 0.047, -0.006],
      [0.365, 0.019, 0.034, -0.006],
    ],
  },
  wrasse: {
    back: "#367d78",
    belly: "#8dbba4",
    fin: "#478f8d",
    square: 1,
    profile: [
      [-0.437, 0.019, 0.031, -0.065],
      [-0.395, 0.068, 0.106, -0.033],
      [-0.312, 0.107, 0.208, 0.03],
      [-0.218, 0.123, 0.23, 0.045],
      [-0.065, 0.13, 0.195, 0.021],
      [0.1, 0.09, 0.139, 0],
      [0.27, 0.034, 0.06, -0.002],
      [0.36, 0.021, 0.043, -0.002],
    ],
  },
};

/**
 * 构建三种浅礁慢游鱼的独立解剖轮廓；外部生态入口统一居中和归一化长度。
 * @param {'boxfish'|'parrotfish'|'wrasse'} kind 礁鱼种类。
 * @param {THREE.Group} body 外部提供的解剖组，头部朝-Z。
 * @param {Function[]} motions 写入独立实例的游泳动作，不修改共享材质或几何。
 */
export function buildReefCreature(kind, body, motions) {
  const config = CONFIG[kind];
  if (!config) throw new Error(`Unknown reef creature: ${kind}`);
  const torso = mesh(
    body,
    cached(`${kind}_torso`, () => torsoGeometry(config)),
    patternedMaterial(kind),
  );
  torso.name = `${kind}_continuous_body`;
  torso.userData.keepSeparate = true;
  // 箱鲀的骨甲保持刚性，以胸鳍划动和尾柄轻摆推进；另两种鱼只弯曲后半身。
  if (kind !== "boxfish")
    bindAxialMotion(torso, motions, {
      axis: "y",
      amplitude: 0.04,
      frequency: 1.25,
    });
  const finMaterial = plain(config.fin, 0.49);
  if (kind === "boxfish") buildCowfishFace(body);
  else buildLippedFace(kind, body, config);

  const tail = pivot(body, [0, kind === "boxfish" ? -0.025 : -0.006, 0.322]);
  tail.name = `${kind}_tail`;
  const tailOutline =
    kind === "boxfish"
      ? [
          [-0.012, -0.02],
          [0.085, -0.076],
          [0.177, -0.102],
          [0.204, -0.064],
          [0.208, 0.038],
          [0.179, 0.09],
          [0.084, 0.06],
          [-0.012, 0.022],
        ]
      : kind === "parrotfish"
        ? [
            [-0.005, -0.034],
            [0.171, -0.166],
            [0.181, -0.141],
            [0.159, 0],
            [0.181, 0.146],
            [0.171, 0.17],
            [-0.005, 0.033],
          ]
        : [
            [-0.006, -0.038],
            [0.133, -0.128],
            [0.186, -0.119],
            [0.199, -0.052],
            [0.199, 0.069],
            [0.177, 0.139],
            [0.13, 0.139],
            [-0.006, 0.04],
          ];
  fin(tail, `${kind}_caudal`, tailOutline, finMaterial);
  motions.push((time, effort) => {
    tail.rotation.y =
      Math.sin(time * (kind === "boxfish" ? 1.6 : 1.25) - 0.7) *
      (0.12 + Math.min(3, effort) * 0.023);
  });

  if (kind === "boxfish") {
    const dorsal = pivot(body, [0, 0.105, 0.16]);
    fin(
      dorsal,
      "boxfish_dorsal",
      [
        [-0.035, 0],
        [-0.007, 0.086],
        [0.059, 0.09],
        [0.104, 0.034],
        [0.056, -0.01],
      ],
      finMaterial,
    );
    const anal = pivot(body, [0, -0.125, 0.16]);
    fin(
      anal,
      "boxfish_anal",
      [
        [-0.025, 0],
        [0.012, -0.057],
        [0.09, -0.047],
        [0.07, 0.018],
      ],
      finMaterial,
    );
    motions.push((time) => {
      dorsal.rotation.y = Math.sin(time * 4) * 0.16;
      anal.rotation.y = -Math.sin(time * 4) * 0.15;
    });
  } else {
    const top = [];
    for (let i = 0; i <= 12; i++) {
      const z = -0.2 + i * 0.043;
      const [, ry, center] = sampleSection(config.profile, z);
      top.push([z, ry + center + 0.028 + Math.sin(i * Math.PI * 0.82) * 0.007]);
    }
    const base = [...top].reverse().map(([z]) => {
      const [, ry, center] = sampleSection(config.profile, z);
      return [z, ry + center - 0.008];
    });
    const dorsal = fin(body, `${kind}_dorsal`, [...top, ...base], finMaterial);
    bindAxialMotion(dorsal, motions, {
      axis: "y",
      frequency: 1.25,
      amplitude: kind === "wrasse" ? 0.085 : 0.055,
    });
    fin(
      body,
      `${kind}_anal`,
      [
        [0.055, -0.12],
        [0.105, -0.172],
        [0.269, -0.08],
        [0.307, -0.036],
        [0.16, -0.066],
      ],
      finMaterial,
    );
    for (const side of [-1, 1]) {
      const pelvic = fin(
        body,
        `${kind}_pelvic_${side}`,
        [
          [-0.115, -0.17],
          [-0.03, -0.234],
          [0.036, -0.199],
          [-0.015, -0.155],
        ],
        finMaterial,
      );
      pelvic.position.x = side * 0.037;
      pelvic.rotation.z = side * 0.25;
    }
  }
  for (const side of [-1, 1]) {
    const box = kind === "boxfish";
    const pectoral = pivot(body, [
      side * (box ? 0.148 : 0.105),
      box ? -0.009 : -0.03,
      box ? -0.18 : -0.194,
    ]);
    pectoral.name = `${kind}_pectoral_${side}`;
    const paddle = fin(
      pectoral,
      `${kind}_paddle_${side}`,
      [
        [0, 0],
        [0.035, -0.028],
        [0.104, -0.038],
        [0.151, -0.018],
        [0.157, 0.023],
        [0.082, 0.046],
        [0.016, 0.019],
      ],
      finMaterial,
    );
    paddle.rotation.z = side * 0.85;
    motions.push((time) => {
      pectoral.rotation.y =
        side *
        (0.35 +
          Math.sin(time * (box ? 5.2 : 2.6) + side * 0.6) *
            (box ? 0.48 : 0.34));
      pectoral.rotation.z = side * (0.22 + Math.sin(time * 2.6) * 0.05);
    });
  }
}

function buildCowfishFace(body) {
  const hornMaterial = plain("#d4c595", 0.57);
  for (const side of [-1, 1]) {
    eye(body, [side * 0.109, 0.085, -0.297], 0.018);
    // 弯角从眼前骨板连续收尖，尾部另有一对短棱；不将整条鱼做成尖锥拼装。
    horn(
      body,
      `cowfish_front_horn_${side}`,
      [
        [side * 0.093, 0.089, -0.314],
        [side * 0.115, 0.148, -0.357],
        [side * 0.128, 0.197, -0.406],
      ],
      0.021,
      hornMaterial,
    );
    horn(
      body,
      `cowfish_rear_horn_${side}`,
      [
        [side * 0.128, -0.088, 0.168],
        [side * 0.169, -0.115, 0.21],
        [side * 0.188, -0.12, 0.248],
      ],
      0.017,
      hornMaterial,
    );
    line(
      body,
      `cowfish_gill_${side}`,
      [
        [side * 0.143, 0.031, -0.196],
        [side * 0.155, 0.002, -0.168],
        [side * 0.153, -0.027, -0.163],
      ],
      0.0021,
      DARK,
    );
  }
  ellipsoid(
    body,
    plain("#bd985b", 0.49),
    [0, -0.035, -0.359],
    [0.024, 0.019, 0.012],
  );
  ellipsoid(body, DARK, [0, -0.034, -0.371], [0.012, 0.008, 0.0025]);
}
function buildLippedFace(kind, body, config) {
  const parrot = kind === "parrotfish";
  const eyeZ = parrot ? -0.31 : -0.307;
  const [rx] = sampleSection(config.profile, eyeZ);
  for (const side of [-1, 1]) {
    eye(body, [side * rx * 0.98, 0.055, eyeZ], parrot ? 0.014 : 0.017);
    const points = [
      [0.12, -0.214],
      [0.035, -0.185],
      [-0.07, -0.196],
      [-0.14, -0.235],
    ].map(([y, z]) => {
      const [width, height, center] = sampleSection(config.profile, z);
      return [
        side *
          (width * Math.sqrt(Math.max(0.02, 1 - ((y - center) / height) ** 2)) +
            0.001),
        y,
        z,
      ];
    });
    line(body, `${kind}_operculum_${side}`, points, 0.0015, DARK);
  }
  if (parrot) {
    // 融合齿板呈短钝喙，保留上下颌分界，避免普通鱼的圆洞嘴。
    const ivory = plain("#c3c5a3", 0.42);
    ellipsoid(body, ivory, [0, -0.047, -0.421], [0.047, 0.027, 0.03]);
    ellipsoid(body, ivory, [0, -0.084, -0.417], [0.04, 0.019, 0.028]);
    line(
      body,
      "parrot_beak_seam",
      [
        [-0.035, -0.066, -0.437],
        [0, -0.065, -0.451],
        [0.035, -0.066, -0.437],
      ],
      0.002,
      DARK,
    );
  } else {
    const lip = plain("#7cafa0", 0.47);
    ellipsoid(body, DARK, [0, -0.066, -0.439], [0.032, 0.015, 0.004]);
    line(
      body,
      "wrasse_upper_lip",
      [
        [-0.037, -0.063, -0.423],
        [-0.022, -0.05, -0.447],
        [0, -0.048, -0.457],
        [0.022, -0.05, -0.447],
        [0.037, -0.063, -0.423],
      ],
      0.009,
      lip,
    );
    line(
      body,
      "wrasse_lower_lip",
      [
        [-0.034, -0.068, -0.425],
        [-0.02, -0.082, -0.449],
        [0, -0.085, -0.454],
        [0.02, -0.082, -0.449],
        [0.034, -0.068, -0.425],
      ],
      0.008,
      lip,
    );
  }
}

function torsoGeometry(config) {
  const positions = [],
    colors = [],
    indices = [];
  const rings = 38,
    segments = 28;
  const top = new THREE.Color(config.back),
    bottom = new THREE.Color(config.belly),
    color = new THREE.Color();
  for (let row = 0; row <= rings; row++) {
    const z = THREE.MathUtils.lerp(
      config.profile[0][0],
      config.profile.at(-1)[0],
      row / rings,
    );
    const [rx, ry, offset] = sampleSection(config.profile, z);
    for (let col = 0; col <= segments; col++) {
      const angle = (col / segments) * Math.PI * 2,
        x = Math.cos(angle),
        y = Math.sin(angle);
      positions.push(
        Math.sign(x) * Math.abs(x) ** config.square * rx,
        Math.sign(y) * Math.abs(y) ** config.square * ry + offset,
        z,
      );
      color
        .copy(top)
        .lerp(bottom, 1 - THREE.MathUtils.smoothstep(y, -0.8, 0.1));
      colors.push(color.r, color.g, color.b);
      if (row < rings && col < segments) {
        const a = row * (segments + 1) + col,
          b = a + segments + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  for (const end of [0, 1]) {
    const row = end ? rings : 0,
      center = positions.length / 3,
      z = config.profile[end ? config.profile.length - 1 : 0][0];
    positions.push(0, sampleSection(config.profile, z)[2], z);
    colors.push(top.r, top.g, top.b);
    for (let col = 0; col < segments; col++) {
      const a = row * (segments + 1) + col;
      indices.push(center, end ? a : a + 1, end ? a + 1 : a);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
function patternedMaterial(kind) {
  const key = `${kind}_skin`;
  if (!MATERIAL.has(key)) {
    const material = skinMaterial({
      vertexColors: true,
      roughness: 0.46,
      pattern: 0.003,
    });
    const baseCompile = material.onBeforeCompile;
    material.onBeforeCompile = (shader) => {
      baseCompile(shader);
      const pattern =
        kind === "boxfish"
          ? `
        vec2 cell = vSkinPosition.zy * vec2(17.0, 21.0);
        cell.x += mod(floor(cell.y), 2.0) * 0.5;
        vec2 tile = floor(cell);
        float jitter = fract(sin(dot(tile, vec2(12.9898,78.233))) * 43758.5453);
        float spot = 1.0 - smoothstep(0.105, 0.18, length(fract(cell) - vec2(0.5 + (jitter - 0.5) * 0.2, 0.5)));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.3,0.4,0.35), spot * 0.82);
      `
          : `
        vec2 scales = vSkinPosition.zy * vec2(24.0, 30.0);
        scales.x += mod(floor(scales.y), 2.0) * 0.5;
        vec2 scaleCell = fract(scales) - 0.5;
        float edge = smoothstep(0.33, 0.41, length(scaleCell * vec2(0.88, 1.0))) * (1.0 - smoothstep(0.43, 0.49, length(scaleCell * vec2(0.88, 1.0))));
        float scalesMask = smoothstep(-0.28, -0.1, vSkinPosition.z);
        diffuseColor.rgb *= 1.0 - edge * 0.16 * scalesMask;
        ${
          kind === "wrasse"
            ? `float faceLines = smoothstep(0.77,0.94,sin(vSkinPosition.y*142.0 + sin(vSkinPosition.z*44.0)*2.7));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(0.82,1.13,1.11), faceLines * (1.0-scalesMask) * 0.5);`
            : ""
        }
      `;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <roughnessmap_fragment>",
        `${pattern}\n#include <roughnessmap_fragment>`,
      );
    };
    material.customProgramCacheKey = () => `reef_skin_${kind}_1`;
    MATERIAL.set(key, material);
  }
  return MATERIAL.get(key);
}
function plain(color, roughness = 0.45) {
  const key = `${color}_${roughness}`;
  if (!MATERIAL.has(key))
    MATERIAL.set(key, skinMaterial({ color, roughness, pattern: 0.002 }));
  return MATERIAL.get(key);
}
function cached(key, make) {
  if (!GEOMETRY.has(key)) GEOMETRY.set(key, make());
  return GEOMETRY.get(key);
}
function mesh(parent, geometry, material) {
  const object = new THREE.Mesh(geometry, material);
  parent.add(object);
  return object;
}
function pivot(parent, point) {
  const group = new THREE.Group();
  group.position.set(...point);
  parent.add(group);
  return group;
}
function ellipsoid(parent, material, position, scale) {
  const object = mesh(parent, SPHERE, material);
  object.position.set(...position);
  object.scale.set(...scale);
  return object;
}
function eye(parent, point, radius) {
  ellipsoid(parent, IRIS, point, [radius * 0.32, radius, radius]);
  const side = Math.sign(point[0]);
  ellipsoid(
    parent,
    PUPIL,
    [point[0] + side * radius * 0.25, point[1], point[2] - radius * 0.12],
    [radius * 0.17, radius * 0.66, radius * 0.67],
  );
}
function fin(parent, key, outline, material) {
  return mesh(
    parent,
    cached(key, () =>
      sculptedFin(outline, 0.004, "vertical", { detail: 1, camber: 0.003 }),
    ),
    material,
  );
}
function line(parent, key, points, radius, material) {
  return mesh(
    parent,
    cached(
      key,
      () =>
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(
            points.map((point) => new THREE.Vector3(...point)),
          ),
          points.length * 2,
          radius,
          4,
          false,
        ),
    ),
    material,
  );
}
function horn(parent, key, points, radius, material) {
  return mesh(
    parent,
    cached(key, () => {
      const curve = new THREE.CatmullRomCurve3(
        points.map((point) => new THREE.Vector3(...point)),
      );
      const g = new THREE.TubeGeometry(curve, 10, radius, 8, false),
        p = g.attributes.position;
      for (let i = 0; i <= 10; i++) {
        const center = curve.getPointAt(i / 10),
          taper = (1 - i / 10) ** 1.1 + 0.015;
        for (let j = 0; j <= 8; j++) {
          const index = i * 9 + j;
          p.setXYZ(
            index,
            center.x + (p.getX(index) - center.x) * taper,
            center.y + (p.getY(index) - center.y) * taper,
            center.z + (p.getZ(index) - center.z) * taper,
          );
        }
      }
      g.computeVertexNormals();
      return g;
    }),
    material,
  );
}
