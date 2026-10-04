import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  bindAxialMotion,
  sampleSection,
  sculptedFin,
  skinMaterial,
} from "./creature_surface.js";

/** 浅水十三种动物共享静态资源；每个实例拥有独立骨架和鳍关节。 */
export const SHOAL_CREATURE_KINDS = new Set([
  "fish",
  "anchovy",
  "sardine",
  "herring",
  "mackerel",
  "flying_fish",
  "turtle",
  "sunfish",
  "boxfish",
  "parrotfish",
  "wrasse",
  "tuna",
  "ray",
]);

/**
 * 构建浅水动物，头朝 -Z，含尾部的纵向全长精确归一为 1。
 * @param {string} kind 浅水物种标识。
 * @param {THREE.Group} root 外部提供的空根组。
 * @param {Function[]} motions 接收时间和推进力度的实例动作。
 * @returns {void} 写入模型、归一化信息；飞鱼另提供 setGliding(active)。
 */
export function buildShoalCreature(kind, root, motions) {
  if (!SHOAL_CREATURE_KINDS.has(kind))
    throw new Error(`Unknown shoal creature: ${kind}`);
  const body = new THREE.Group();
  body.name = `${kind}_anatomy`;
  root.add(body);
  if (kind === "turtle") buildTurtle(body, motions);
  else if (kind === "ray") buildRay(body, motions);
  else buildFish(kind, body, motions, root);
  body.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(body);
  const scale = 1 / bounds.getSize(new THREE.Vector3()).z;
  body.scale.setScalar(scale);
  body.position
    .copy(bounds.getCenter(new THREE.Vector3()))
    .multiplyScalar(-scale);
  root.userData.normalizedLength = 1;
  root.userData.shoalAnatomy = kind;
}

const GEOMETRIES = new Map();
const MATERIALS = new Map();
const DETAIL = skinMaterial({
  color: "#ffffff",
  vertexColors: true,
  roughness: 0.39,
  pattern: 0.006,
});
// 薄鳍保留双面受光及极弱环境底色，避免背光时呈现切开的黑色缺口。
const FIN_MATERIAL = skinMaterial({
  color: "#ffffff",
  vertexColors: true,
  roughness: 0.46,
  metalness: 0.06,
  side: THREE.DoubleSide,
  emissive: "#455b67",
  emissiveIntensity: 0.22,
  pattern: 0.006,
});
const SPHERE = new THREE.SphereGeometry(1, 8, 6);
const FISH = {
  fish: {
    w: 0.085,
    h: 0.165,
    back: "#426e96",
    belly: "#d6dbcf",
    fin: "#cbb96b",
    tail: 0.145,
    pattern: 0,
  },
  anchovy: {
    w: 0.042,
    h: 0.064,
    back: "#456e67",
    belly: "#dee2cb",
    fin: "#8b9c8d",
    tail: 0.095,
    pattern: 1,
  },
  sardine: {
    w: 0.065,
    h: 0.1,
    back: "#286b84",
    belly: "#dce8db",
    fin: "#5d9cad",
    tail: 0.14,
    pattern: 2,
  },
  herring: {
    w: 0.065,
    h: 0.155,
    back: "#425576",
    belly: "#e5e7e2",
    fin: "#7a8b9c",
    tail: 0.16,
    pattern: 3,
  },
  mackerel: {
    w: 0.078,
    h: 0.105,
    back: "#266f73",
    belly: "#d8e0d4",
    fin: "#527d87",
    tail: 0.165,
    pattern: 4,
  },
  flying_fish: {
    w: 0.055,
    h: 0.071,
    back: "#357593",
    belly: "#cbdfe0",
    fin: "#86acbc",
    tail: 0.14,
    pattern: 1,
  },
  tuna: {
    w: 0.127,
    h: 0.166,
    back: "#294a63",
    belly: "#b9c8c5",
    fin: "#627c89",
    tail: 0.235,
    pattern: 5,
  },
  boxfish: {
    w: 0.17,
    h: 0.163,
    back: "#b39737",
    belly: "#e1d4a0",
    fin: "#b6b57a",
    tail: 0.105,
    pattern: 6,
    square: 0.52,
  },
  parrotfish: {
    w: 0.126,
    h: 0.181,
    back: "#397d6a",
    belly: "#8dad78",
    fin: "#548e87",
    tail: 0.18,
    pattern: 7,
  },
  wrasse: {
    w: 0.128,
    h: 0.204,
    back: "#38746d",
    belly: "#8aac93",
    fin: "#507f87",
    tail: 0.174,
    pattern: 8,
  },
  sunfish: {
    w: 0.094,
    h: 0.345,
    back: "#777e7a",
    belly: "#bec2ad",
    fin: "#858d82",
    tail: 0.2,
    pattern: 9,
  },
};

function profileFor(kind, c) {
  if (kind === "sunfish")
    return [
      [-0.49, 0.018, 0.052],
      [-0.43, 0.051, 0.19],
      [-0.29, 0.088, 0.31],
      [-0.08, 0.094, 0.345],
      [0.13, 0.079, 0.298],
      [0.3, 0.056, 0.23],
      [0.37, 0.025, 0.19],
      [0.39, 0.004, 0.17],
    ];
  if (kind === "boxfish")
    return [
      [-0.43, 0.016, 0.028, -0.025],
      [-0.365, 0.093, 0.1],
      [-0.27, 0.163, 0.158],
      [0.055, 0.17, 0.163],
      [0.2, 0.115, 0.12],
      [0.3, 0.035, 0.034, -0.02],
      [0.39, 0.013, 0.022, -0.02],
    ];
  // 同科近亲也分别放样头、腹线与尾柄；纹理不承担轮廓识别。
  const profiles = {
    anchovy: [
      [-0.52, 0.006, 0.012, 0.007],
      [-0.45, 0.019, 0.026, 0.008],
      [-0.35, 0.033, 0.049],
      [-0.19, 0.042, 0.064],
      [-0.02, 0.038, 0.057],
      [0.18, 0.025, 0.042],
      [0.325, 0.01, 0.015],
      [0.4, 0.005, 0.01],
    ],
    sardine: [
      [-0.49, 0.01, 0.025],
      [-0.43, 0.035, 0.062],
      [-0.31, 0.059, 0.092],
      [-0.12, 0.065, 0.102],
      [0.06, 0.057, 0.087],
      [0.22, 0.032, 0.059],
      [0.33, 0.012, 0.022],
      [0.4, 0.006, 0.012],
    ],
    herring: [
      [-0.49, 0.007, 0.018],
      [-0.41, 0.032, 0.065],
      [-0.29, 0.053, 0.127, -0.013],
      [-0.11, 0.062, 0.145, -0.016],
      [0.08, 0.045, 0.112, -0.018],
      [0.24, 0.026, 0.056, -0.012],
      [0.34, 0.011, 0.024],
      [0.4, 0.006, 0.015],
    ],
    mackerel: [
      [-0.51, 0.004, 0.009],
      [-0.43, 0.028, 0.04],
      [-0.3, 0.061, 0.087],
      [-0.13, 0.078, 0.105],
      [0.06, 0.061, 0.087],
      [0.23, 0.028, 0.042],
      [0.34, 0.009, 0.017],
      [0.4, 0.005, 0.01],
    ],
    flying_fish: [
      [-0.5, 0.004, 0.01],
      [-0.43, 0.025, 0.034],
      [-0.29, 0.048, 0.064],
      [-0.1, 0.055, 0.071],
      [0.1, 0.042, 0.055],
      [0.27, 0.02, 0.029],
      [0.36, 0.007, 0.013],
      [0.4, 0.004, 0.008],
    ],
    fish: [
      [-0.46, 0.011, 0.026],
      [-0.39, 0.042, 0.085],
      [-0.27, 0.075, 0.14],
      [-0.1, 0.085, 0.165],
      [0.08, 0.071, 0.141],
      [0.25, 0.036, 0.073],
      [0.34, 0.013, 0.028],
      [0.4, 0.007, 0.018],
    ],
    parrotfish: [
      [-0.48, 0.025, 0.037, -0.04],
      [-0.445, 0.059, 0.097, -0.015],
      [-0.409, 0.085, 0.169, 0.05],
      [-0.34, 0.117, 0.19, 0.048],
      [-0.2, 0.126, 0.183, 0.018],
      [-0.015, 0.107, 0.161],
      [0.17, 0.07, 0.109],
      [0.31, 0.027, 0.049],
      [0.39, 0.019, 0.034],
    ],
    wrasse: [
      [-0.49, 0.024, 0.03, -0.059],
      [-0.438, 0.052, 0.07, -0.041],
      [-0.376, 0.077, 0.131, 0.021],
      [-0.315, 0.094, 0.194, 0.07],
      [-0.22, 0.113, 0.204, 0.045],
      [-0.045, 0.124, 0.191, 0.015],
      [0.15, 0.084, 0.134],
      [0.31, 0.029, 0.053],
      [0.39, 0.018, 0.033],
    ],
    tuna: [
      [-0.51, 0.009, 0.019],
      [-0.43, 0.05, 0.068],
      [-0.31, 0.102, 0.131],
      [-0.15, 0.127, 0.166],
      [0.035, 0.111, 0.145],
      [0.21, 0.052, 0.074],
      [0.34, 0.014, 0.024],
      [0.4, 0.008, 0.014],
    ],
  };
  return profiles[kind];
}

function buildFish(kind, body, motions, root) {
  const c = FISH[kind],
    profile = profileFor(kind, c);
  const large = ["tuna", "boxfish", "parrotfish", "wrasse", "sunfish"].includes(
    kind,
  );
  let torso = mesh(
    body,
    `${kind}_continuous_body`,
    () => loft(profile, large ? 46 : 30, large ? 26 : 18, c.square),
    fishSkin(kind, c),
  );
  if (kind !== "boxfish" && kind !== "sunfish") {
    torso = bindAxialMotion(torso, motions, {
      frequency: large ? 1.1 : 1.85,
      amplitude: large ? 0.038 : 0.055,
    });
    torso.name = `${kind}_continuous_body`;
  }
  const details = GEOMETRIES.has(`${kind}_face_and_median_fins`) ? null : [];
  const ez =
    kind === "sunfish" ? -0.405 : large && kind !== "tuna" ? -0.365 : -0.381;
  const section = sampleSection(profile, ez);
  const ey =
    kind === "sunfish" ? 0.064 : large && kind !== "tuna" ? 0.05 : c.h * 0.2;
  for (const side of [-1, 1]) {
    const x =
      side * section[0] * Math.sqrt(1 - ((ey - section[2]) / section[1]) ** 2);
    eye(details, [x, ey, ez], large ? 0.017 : 0.0105, side);
    const gz = large && kind !== "tuna" ? -0.27 : -0.265;
    // 逐点沿真实截面采样鳃盖和唇线，避免中段埋入躯干、嘴角悬空。
    const surfacePoint = (z, latitude) => {
      const [width, height, centerY] = sampleSection(profile, z);
      const exponent = c.square || 1;
      const x =
        width *
        Math.pow(1 - Math.pow(Math.abs(latitude), 2 / exponent), exponent / 2);
      return [side * (x + 0.0012), centerY + height * latitude, z];
    };
    const gill = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      gill.push(
        surfacePoint(gz + 0.026 * Math.sin(t * Math.PI), 0.68 - t * 1.27),
      );
    }
    curve(details, gill, large ? 0.0021 : 0.0015, "#465950", 8);
    const lip = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const z =
        profile[0][0] + 0.001 + t * (kind === "anchovy" ? 0.145 : 0.076);
      lip.push(
        surfacePoint(z, large && kind !== "tuna" ? -0.3 : -0.08 - t * 0.25),
      );
    }
    curve(details, lip, large ? 0.0018 : 0.0013, "#3b4e46", 5);
  }
  if (kind === "parrotfish") {
    ellipsoid(details, [0, -0.063, -0.461], [0.027, 0.032, 0.024], "#d4cdb0");
    curve(
      details,
      [
        [-0.028, -0.065, -0.465],
        [0, -0.07, -0.487],
        [0.028, -0.065, -0.465],
      ],
      0.002,
      "#5b6350",
      6,
    );
  }
  if (kind === "wrasse") {
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++)
        curve(
          details,
          [
            [side * 0.072, 0.058 - i * 0.016, -0.418],
            [side * 0.102, 0.038 - i * 0.018, -0.345],
            [side * 0.117, 0.05 - i * 0.023, -0.29],
          ],
          0.0022,
          "#4aa599",
          6,
        );
    ellipsoid(details, [0, -0.066, -0.472], [0.035, 0.028, 0.023], "#94ac8c");
  }
  if (kind === "boxfish") {
    for (const side of [-1, 1]) {
      curve(
        details,
        [
          [side * 0.103, 0.093, -0.31],
          [side * 0.113, 0.163, -0.376],
          [side * 0.123, 0.205, -0.434],
        ],
        0.009,
        "#d7c482",
        6,
        true,
      );
      curve(
        details,
        [
          [side * 0.12, -0.11, 0.16],
          [side * 0.135, -0.135, 0.25],
          [side * 0.14, -0.14, 0.3],
        ],
        0.007,
        "#c2ae6e",
        5,
        true,
      );
    }
  }
  // 中线背鳍、臀鳍与尾柄小鳍合批；只有实际推进的胸鳍保存独立关节。
  if (kind === "sunfish") {
    for (const side of [-1, 1]) {
      const pivot = joint(body, `${kind}_vertical_fin_${side}`, [
        0,
        side * 0.23,
        0.12,
      ]);
      const outline = [
        [-0.15, 0],
        [0.01, side * 0.37],
        [0.08, side * 0.45],
        [0.17, side * 0.28],
        [0.2, side * 0.02],
        [0.07, 0],
      ];
      mesh(
        pivot,
        `${kind}_vertical_surface_${side}`,
        () => finGeometry(outline, "vertical", c.fin, 6),
        DETAIL,
      );
      motions.push((t) => {
        pivot.rotation.y = Math.sin(t * 0.8) * 0.16 * side;
      });
    }
  } else {
    const top = (z) => {
      const [, height, centerY] = sampleSection(profile, z);
      return height + centerY;
    };
    const dorsal =
      kind === "wrasse"
        ? [
            [-0.31, top(-0.31)],
            [-0.23, top(-0.23) + 0.041],
            [0.15, top(0.15) + 0.048],
            [0.28, top(0.28) + 0.015],
            [0.29, top(0.29)],
            [0.1, top(0.1)],
            [-0.11, top(-0.11)],
          ]
        : kind === "parrotfish"
          ? [
              [-0.27, top(-0.27)],
              [-0.23, top(-0.23) + 0.057],
              [0.04, top(0.04) + 0.038],
              [0.24, top(0.24) + 0.033],
              [0.29, top(0.29)],
              [0.12, top(0.12)],
              [-0.08, top(-0.08)],
            ]
          : kind === "boxfish"
            ? [
                [0.12, 0.11],
                [0.2, 0.21],
                [0.29, 0.16],
                [0.28, 0.07],
              ]
            : kind === "mackerel"
              ? [
                  [-0.22, top(-0.22)],
                  [-0.155, top(-0.155) + 0.08],
                  [-0.065, top(-0.065) + 0.017],
                  [0.03, top(0.03)],
                ]
              : kind === "tuna"
                ? [
                    [-0.23, top(-0.23)],
                    [-0.14, top(-0.14) + 0.13],
                    [-0.05, top(-0.05) + 0.035],
                    [0.07, top(0.07)],
                  ]
                : kind === "anchovy"
                  ? [
                      [-0.06, top(-0.06)],
                      [0.005, top(0.005) + 0.052],
                      [0.105, top(0.105) + 0.012],
                      [0.135, top(0.135)],
                    ]
                  : kind === "herring"
                    ? [
                        [-0.14, top(-0.14)],
                        [-0.08, top(-0.08) + 0.081],
                        [0.05, top(0.05) + 0.031],
                        [0.115, top(0.115)],
                      ]
                    : kind === "sardine"
                      ? [
                          [-0.2, top(-0.2)],
                          [-0.14, top(-0.14) + 0.065],
                          [-0.025, top(-0.025) + 0.034],
                          [0.055, top(0.055)],
                        ]
                      : kind === "flying_fish"
                        ? [
                            [0.1, top(0.1)],
                            [0.16, top(0.16) + 0.05],
                            [0.26, top(0.26) + 0.008],
                            [0.27, top(0.27)],
                          ]
                        : [
                            [-0.25, top(-0.25)],
                            [-0.18, top(-0.18) + 0.058],
                            [-0.07, top(-0.07) + 0.06],
                            [0.065, top(0.065) + 0.045],
                            [0.22, top(0.22) + 0.015],
                            [0.25, top(0.25)],
                            [0.05, top(0.05)],
                            [-0.12, top(-0.12)],
                          ];
    details?.push(finGeometry(dorsal, "vertical", c.fin, large ? 5 : 3));
    details?.push(
      finGeometry(
        [
          [0.04, -c.h * 0.85],
          [0.18, -c.h * 1.3],
          [0.29, -c.h * 0.45],
        ],
        "vertical",
        c.fin,
        3,
      ),
    );
    if (kind === "mackerel" || kind === "tuna") {
      details?.push(
        finGeometry(
          [
            [0.075, c.h * 0.82],
            [0.18, c.h * 1.31],
            [0.23, c.h * 0.44],
          ],
          "vertical",
          kind === "tuna" ? "#bca64e" : c.fin,
          2,
        ),
      );
      for (let i = 0; i < 4; i++)
        for (const side of [-1, 1]) {
          const z = 0.24 + i * 0.034,
            h = (0.045 - i * 0.006) * side;
          details?.push(
            finGeometry(
              [
                [z, h],
                [z + 0.009, h + side * 0.022],
                [z + 0.029, h * 0.74],
              ],
              "vertical",
              kind === "tuna" ? "#c5af4e" : c.fin,
              0,
            ),
          );
        }
    }
  }
  mesh(body, `${kind}_face_and_median_fins`, () => combine(details), DETAIL);
  const tailOrigin = kind === "sunfish" ? 0.355 : 0.36;
  const tailParent = torso.isSkinnedMesh ? torso.skeleton.bones[2] : body;
  const tail = joint(tailParent, `${kind}_tail`, [
    0,
    kind === "boxfish" ? -0.02 : 0,
    tailOrigin - (torso.isSkinnedMesh ? 0.25 : 0),
  ]);
  let outline;
  if (kind === "sunfish")
    outline = [
      [-0.013, -0.183],
      [0.058, -0.196],
      [0.086, -0.16],
      [0.07, -0.117],
      [0.097, -0.07],
      [0.083, -0.015],
      [0.097, 0.038],
      [0.08, 0.093],
      [0.08, 0.148],
      [0.046, 0.188],
      [-0.013, 0.185],
    ];
  else if (kind === "parrotfish")
    outline = [
      [0, -0.026],
      [0.105, -0.13],
      [0.155, -0.127],
      [0.14, -0.06],
      [0.13, 0],
      [0.14, 0.06],
      [0.155, 0.127],
      [0.105, 0.13],
      [0, 0.026],
    ];
  else if (kind === "boxfish" || kind === "wrasse")
    outline = [
      [0, -0.025],
      [0.115, -c.tail],
      [kind === "wrasse" ? 0.19 : 0.174, -c.tail * 0.8],
      [kind === "wrasse" ? 0.19 : 0.18, c.tail * 0.74],
      [0.12, c.tail],
      [0, 0.025],
    ];
  else
    outline = [
      [0, -0.018],
      [0.15, -c.tail],
      [0.18, -c.tail * 0.96],
      [0.1, -c.tail * 0.2],
      [0.075, 0],
      [0.1, c.tail * 0.2],
      [0.18, c.tail * (kind === "flying_fish" ? 0.66 : 0.96)],
      [0.15, c.tail * (kind === "flying_fish" ? 0.69 : 1)],
      [0, 0.018],
    ];
  mesh(
    tail,
    `${kind}_caudal_surface`,
    () => finGeometry(outline, "vertical", c.fin, large ? 6 : 4),
    DETAIL,
  );
  motions.push((t, e) => {
    tail.rotation.y =
      Math.sin(t * (large ? 1.1 : 1.85) - 1.2) *
      (kind === "sunfish" ? 0.05 : 0.16) *
      (0.8 + e * 0.2);
  });
  for (const side of [-1, 1]) {
    const flying = kind === "flying_fish";
    const pz = kind === "flying_fish" ? -0.29 : -0.245;
    const [pw, ph, py] = sampleSection(profile, pz);
    const pivot = joint(body, `${kind}_pectoral_${side}`, [
      side * pw * 0.97,
      py - ph * 0.18,
      pz,
    ]);
    const wing = flying
      ? [
          [0, 0],
          [0.045, side * 0.38],
          [0.16, side * 0.46],
          [0.34, side * 0.13],
          [0.37, side * 0.022],
        ]
      : kind === "tuna"
        ? [
            [0, 0],
            [0.25, side * 0.13],
            [0.34, side * 0.125],
            [0.12, side * 0.024],
          ]
        : [
            [0, 0],
            [0.06, side * (large ? 0.16 : 0.076)],
            [0.145, side * (large ? 0.12 : 0.062)],
            [0.12, side * 0.017],
          ];
    mesh(
      pivot,
      `${kind}_pectoral_surface_${side}`,
      () => finGeometry(wing, "horizontal", c.fin, flying ? 6 : 3),
      FIN_MATERIAL,
    );
    motions.push((t) => {
      pivot.scale.x = flying && !root.userData.airborne ? 0.14 : 1;
      pivot.rotation.z =
        side *
        (flying
          ? root.userData.airborne
            ? 0.06
            : 0.08
          : 0.34 + Math.sin(t * 1.4) * 0.14);
      pivot.rotation.y = flying
        ? side * (root.userData.airborne ? 0.03 : -0.1)
        : Math.sin(t * 1.3) * 0.1;
    });
  }
  if (kind === "flying_fish") {
    root.userData.setGliding = (active) => {
      root.userData.airborne = Boolean(active);
    };
    root.userData.airborne = false;
  }
}

function fishSkin(kind, c) {
  if (MATERIALS.has(kind)) return MATERIALS.get(kind);
  const material = skinMaterial({
    color: "#ffffff",
    roughness: c.pattern >= 6 ? 0.49 : 0.3,
    metalness: c.pattern >= 6 ? 0 : 0.23,
    pattern: 0.012,
  });
  const previous = material.onBeforeCompile;
  const back = new THREE.Color(c.back),
    belly = new THREE.Color(c.belly);
  material.onBeforeCompile = (shader) => {
    previous(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
    vec3 p = vSkinPosition;
    float flank = smoothstep(-${(c.h * 0.48).toFixed(5)},${(c.h * 0.68).toFixed(5)},p.y);
    vec3 skin = mix(vec3(${belly.toArray().join(",")}), vec3(${back.toArray().join(",")}),flank);
    float row=floor(p.y*150.0);
    vec2 scaleUV=vec2(p.z*105.0+mod(row,2.0)*0.5,p.y*150.0);
    vec2 cell=fract(scaleUV)-0.5;
    float scaleEdge=smoothstep(0.39,0.48,length(cell*vec2(0.82,1.0)));
    float scaleMask=smoothstep(-0.33,-0.26,p.z)*(1.0-smoothstep(0.25,0.37,p.z));
    skin*=1.0-scaleEdge*scaleMask*${c.pattern >= 6 ? "0.16" : "0.07"};
    ${c.pattern === 1 || c.pattern === 2 ? `float band=1.0-smoothstep(0.008,0.023,abs(p.y+0.004)); skin=mix(skin,vec3(0.73,0.8,0.77),band*0.57);` : ""}
    ${c.pattern === 2 ? `float dotRow=length(vec2((fract((p.z+0.24)*24.0)-0.5)*0.042,p.y-0.035)); skin*=1.0-(1.0-smoothstep(0.004,0.007,dotRow))*smoothstep(-0.23,-0.18,p.z)*0.58;` : ""}
    ${c.pattern === 4 ? `float bars=sin(p.z*106.0+sin(p.y*80.0)*1.7); skin*=1.0-smoothstep(0.3,0.65,bars)*smoothstep(0.018,0.05,p.y)*0.62;` : ""}
    ${c.pattern === 3 ? `skin=mix(skin,vec3(0.57,0.64,0.73),(1.0-smoothstep(0.005,0.024,abs(p.y+0.014)))*0.28);` : ""}
    ${c.pattern === 6 ? `vec2 spotUV=vec2(p.z*30.0+mod(floor(p.y*29.0),2.0)*0.5,p.y*29.0); float spot=1.0-smoothstep(0.1,0.17,length(fract(spotUV)-0.5)); skin=mix(skin,vec3(0.14,0.19,0.13),spot*0.78);` : ""}
    ${c.pattern === 7 ? `float colorPatch=sin(p.z*14.0+p.y*8.0); skin=mix(skin,vec3(0.11,0.39,0.38),smoothstep(0.1,0.8,colorPatch)*0.38); skin=mix(skin,vec3(0.4,0.43,0.29),smoothstep(0.05,0.13,p.y)*(1.0-smoothstep(-0.3,-0.15,p.z))*0.26);` : ""}
    ${c.pattern === 8 ? `float maze=sin(p.y*147.0+sin(p.z*70.0)*2.3); skin=mix(skin,vec3(0.1,0.32,0.29),smoothstep(0.45,0.76,maze)*0.4);` : ""}
    ${c.pattern === 9 ? `float mottles=sin(p.z*80.0+sin(p.y*39.0))*sin(p.y*112.0+p.z*43.0); skin*=1.0+mottles*0.13;` : ""}
    diffuseColor.rgb*=skin;
    `,
    );
  };
  material.customProgramCacheKey = () => `shoal_skin_v6_6_${kind}`;
  MATERIALS.set(kind, material);
  return material;
}

function buildTurtle(body, motions) {
  const shellProfile = [
    [-0.32, 0.015, 0.016, 0.015],
    [-0.26, 0.15, 0.046, 0.012],
    [-0.1, 0.257, 0.085, 0.026],
    [0.11, 0.254, 0.086, 0.025],
    [0.28, 0.162, 0.041, 0.011],
    [0.36, 0.007, 0.006, 0],
  ];
  mesh(body, "turtle_carapace", () => loft(shellProfile, 44, 32), turtleSkin());
  const details = GEOMETRIES.has("turtle_head_and_scute_seams") ? null : [];
  const neck =
    details &&
    loft(
      [
        [-0.51, 0.028, 0.024, -0.005],
        [-0.48, 0.06, 0.052, 0.003],
        [-0.405, 0.062, 0.053, 0.012],
        [-0.348, 0.042, 0.04, -0.004],
        [-0.26, 0.056, 0.043, -0.019],
      ],
      24,
      18,
    );
  details?.push(painted(neck, "#798467"));
  for (const side of [-1, 1]) {
    eye(details, [side * 0.05, 0.025, -0.455], 0.012, side);
    curve(
      details,
      [
        [0, -0.015, -0.517],
        [side * 0.047, -0.02, -0.474],
        [side * 0.051, -0.017, -0.44],
      ],
      0.0028,
      "#394b3e",
      8,
    );
    for (let i = 0; i < 3; i++)
      curve(
        details,
        [
          [side * (0.026 + i * 0.009), 0.035, -0.465],
          [side * (0.035 + i * 0.007), 0.052, -0.428],
          [side * (0.038 + i * 0.005), 0.039, -0.389],
        ],
        0.002,
        "#bcc2a0",
        6,
      );
  }
  // 背甲纵向椎盾与横向肋盾有实际浅沟，轮廓仍保持连续拱壳。
  const shellY = (x, z) => {
    const [w, h, cy] = sampleSection(shellProfile, z);
    return cy + h * Math.sqrt(Math.max(0, 1 - (x / w) ** 2)) + 0.001;
  };
  for (const side of [-1, 1]) {
    const seam = [];
    for (let i = 0; i <= 18; i++) {
      const z = -0.25 + i * 0.03,
        x =
          side *
          (0.073 + 0.012 * Math.cos(i * Math.PI * 0.62)) *
          Math.sin(((z + 0.33) / 0.7) * Math.PI);
      seam.push([x, shellY(x, z), z]);
    }
    curve(details, seam, 0.0029, "#424b2f", 36);
  }
  for (const z of [-0.22, -0.105, 0.025, 0.15, 0.26]) {
    const width = sampleSection(shellProfile, z)[0] * 0.95,
      points = [];
    for (let i = 0; i <= 12; i++) {
      const x = (i / 6 - 1) * width,
        zz = z + 0.027 * Math.sin((Math.abs(x) / width) * Math.PI);
      points.push([x, shellY(x, zz), zz]);
    }
    curve(details, points, 0.0028, "#485236", 24);
  }
  for (const side of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= 24; i++) {
      const z = -0.295 + i * 0.026,
        x = side * sampleSection(shellProfile, z)[0] * 0.985;
      points.push([x, shellY(x, z), z]);
    }
    curve(details, points, 0.005, "#a59f6b", 32);
  }
  curve(
    details,
    [
      [0, -0.016, 0.29],
      [0, -0.025, 0.365],
      [0, -0.024, 0.418],
    ],
    0.013,
    "#7f8966",
    8,
    true,
  );
  mesh(body, "turtle_head_and_scute_seams", () => combine(details), DETAIL);
  for (const side of [-1, 1])
    for (const front of [true, false]) {
      const pivot = joint(
        body,
        `turtle_${front ? "front" : "hind"}_flipper_${side}`,
        [side * (front ? 0.14 : 0.16), -0.025, front ? -0.21 : 0.22],
      );
      const outline = front
        ? [
            [-0.05, 0],
            [-0.065, side * 0.09],
            [0.045, side * 0.21],
            [0.2, side * 0.38],
            [0.29, side * 0.43],
            [0.31, side * 0.34],
            [0.17, side * 0.13],
            [0.12, side * 0.005],
          ]
        : [
            [-0.015, 0],
            [0.015, side * 0.09],
            [0.14, side * 0.2],
            [0.19, side * 0.16],
            [0.15, side * 0.045],
            [0.06, 0],
          ];
      mesh(
        pivot,
        `turtle_flipper_surface_${front}_${side}`,
        () =>
          finGeometry(
            outline,
            "horizontal",
            "#879275",
            front ? 7 : 4,
            front ? 0.034 : 0.024,
          ),
        DETAIL,
      );
      motions.push((t, e) => {
        pivot.rotation.z =
          side *
          (Math.sin(t * 0.65 + (front ? 0 : 1.1)) * (0.24 + e * 0.02) - 0.14);
        pivot.rotation.y = side * Math.sin(t * 0.65 + 0.7) * 0.08;
      });
    }
}

function turtleSkin() {
  if (MATERIALS.has("turtle")) return MATERIALS.get("turtle");
  const mat = skinMaterial({
      color: "#ffffff",
      roughness: 0.54,
      pattern: 0.04,
    }),
    old = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader) => {
    old(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
    vec3 p=vSkinPosition;
    float growth=sin(length(vec2(p.x*1.3,p.z))*170.0+sin(p.z*47.0)*1.5);
    float cloud=sin(p.x*53.0+sin(p.z*25.0))*sin(p.z*47.0);
    vec3 shell=mix(vec3(0.15,0.18,0.065),vec3(0.36,0.33,0.15),0.5+cloud*0.22+growth*0.065);
    diffuseColor.rgb*=mix(vec3(0.48,0.46,0.28),shell,smoothstep(-0.03,0.015,p.y));
  `,
    );
  };
  mat.customProgramCacheKey = () => "shoal_turtle_scutes_v6_6";
  MATERIALS.set("turtle", mat);
  return mat;
}

function buildRay(body, motions) {
  const geometry = cached("ray_continuous_disc", rayGeometry);
  const mat = skinMaterialCached("ray", {
    color: "#ffffff",
    vertexColors: true,
    roughness: 0.48,
    pattern: 0.036,
  });
  const disk = new THREE.SkinnedMesh(geometry, mat);
  disk.name = "ray_continuous_wings";
  disk.userData.keepSeparate = true;
  body.add(disk);
  const base = new THREE.Bone(),
    bones = [base];
  disk.add(base);
  for (const side of [-1, 1]) {
    const inner = new THREE.Bone(),
      outer = new THREE.Bone();
    inner.position.x = side * 0.14;
    outer.position.x = side * 0.23;
    base.add(inner);
    inner.add(outer);
    bones.push(inner, outer);
  }
  disk.bind(new THREE.Skeleton(bones));
  geometry.computeBoundingSphere();
  disk.boundingSphere = geometry.boundingSphere.clone();
  disk.boundingSphere.radius += 0.18;
  motions.push((t, e) => {
    for (let side = 0; side < 2; side++) {
      const sign = side ? 1 : -1;
      bones[side * 2 + 1].rotation.z =
        sign * Math.sin(t * 0.68) * (0.18 + e * 0.035);
      bones[side * 2 + 2].rotation.z = sign * Math.sin(t * 0.68 - 0.7) * 0.19;
    }
  });
  const details = GEOMETRIES.has("ray_face_gills_and_tail") ? null : [];
  for (const side of [-1, 1]) {
    eye(details, [side * 0.125, 0.015, -0.342], 0.0105, side);
    const horn =
      details &&
      finGeometry(
        [
          [-0.405, side * 0.073],
          [-0.468, side * 0.07],
          [-0.489, side * 0.096],
          [-0.459, side * 0.123],
          [-0.368, side * 0.124],
        ],
        "horizontal",
        "#596861",
        3,
        0.025,
      );
    details?.push(horn);
    for (let i = 0; i < 5; i++)
      curve(
        details,
        [
          [side * 0.05, -0.032, -0.22 + i * 0.035],
          [side * 0.095, -0.041, -0.225 + i * 0.035],
          [side * 0.13, -0.031, -0.21 + i * 0.035],
        ],
        0.002,
        "#64736c",
        6,
      );
  }
  curve(
    details,
    [
      [-0.072, -0.015, -0.392],
      [0, -0.026, -0.409],
      [0.072, -0.015, -0.392],
    ],
    0.005,
    "#2b3936",
    12,
  );
  curve(
    details,
    [
      [0, 0.009, 0.16],
      [0, 0.005, 0.27],
      [0, -0.004, 0.42],
      [0, -0.013, 0.64],
    ],
    0.013,
    "#354d53",
    20,
    true,
  );
  details?.push(
    finGeometry(
      [
        [0.15, 0.021],
        [0.195, 0.086],
        [0.25, 0.025],
      ],
      "vertical",
      "#3d5960",
      2,
    ),
  );
  mesh(body, "ray_face_gills_and_tail", () => combine(details), DETAIL);
}

function rayGeometry() {
  const positions = [],
    colors = [],
    indices = [],
    skinIndex = [],
    skinWeight = [];
  const rows = 40,
    cols = 40;
  const shape = [
    [-0.405, 0.07, 0.02],
    [-0.34, 0.17, 0.045],
    [-0.18, 0.46, 0.061],
    [-0.005, 0.7, 0.052],
    [0.12, 0.42, 0.035],
    [0.215, 0.11, 0.013],
    [0.24, 0.008, 0.003],
  ];
  const dark = new THREE.Color("#3a555b"),
    light = new THREE.Color("#c2cbb7");
  for (let surface = 0; surface < 2; surface++)
    for (let row = 0; row <= rows; row++) {
      const z = shape[0][0] + ((shape.at(-1)[0] - shape[0][0]) * row) / rows;
      const [width, height] = sampleSection(shape, z);
      for (let col = 0; col <= cols; col++) {
        const u = (col / cols) * 2 - 1,
          x = u * width;
        const y =
          (surface === 0 ? 1 : -1) *
            height *
            Math.sqrt(Math.max(0, 1 - u * u)) *
            Math.exp(-Math.abs(x) * 5.2) +
          Math.abs(x) ** 1.5 * 0.018;
        positions.push(x, y, z);
        const color = (surface === 0 ? dark : light).clone();
        if (surface === 0)
          color.multiplyScalar(
            1 + 0.1 * Math.sin(z * 80 + x * 46) * Math.sin(x * 130),
          );
        colors.push(...color.toArray());
        const side = x < 0 ? 1 : 3,
          t = THREE.MathUtils.smoothstep(Math.abs(x), 0.09, 0.64);
        skinIndex.push(0, side, side + 1, 0);
        skinWeight.push((1 - t) ** 2, 2 * t * (1 - t), t * t, 0);
      }
    }
  const layer = (rows + 1) * (cols + 1);
  for (let surface = 0; surface < 2; surface++)
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const a = surface * layer + r * (cols + 1) + c,
          b = a + 1,
          d = a + cols + 1,
          e = d + 1;
        indices.push(
          ...(surface === 0 ? [a, d, b, b, d, e] : [a, b, d, b, e, d]),
        );
      }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(skinWeight, 4),
  );
  return geo;
}

// 以下几何只在首次请求该物种时构建；实例动作不会写入共享顶点。
function loft(profile, rings = 36, radial = 20, square = 1) {
  const positions = [],
    indices = [];
  for (let i = 0; i <= rings; i++) {
    const z = THREE.MathUtils.lerp(profile[0][0], profile.at(-1)[0], i / rings);
    const [w, h, y] = sampleSection(profile, z);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2,
        cs = Math.cos(a),
        sn = Math.sin(a);
      positions.push(
        Math.sign(cs) * Math.abs(cs) ** square * w,
        Math.sign(sn) * Math.abs(sn) ** square * h + y,
        z,
      );
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j,
        b = a + radial + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  // 两端封盖避免正面与尾柄透视时露出空腔。
  for (const end of [0, 1]) {
    const offset = positions.length / 3,
      section = profile[end ? profile.length - 1 : 0];
    positions.push(0, section[3] || 0, section[0]);
    for (let j = 0; j < radial; j++) {
      const a = (end ? rings * (radial + 1) : 0) + j;
      indices.push(...(end ? [offset, a, a + 1] : [offset, a + 1, a]));
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const normals = geo.attributes.normal;
  for (let ring = 0; ring <= rings; ring++) {
    const first = ring * (radial + 1),
      last = first + radial;
    const normal = new THREE.Vector3()
      .fromBufferAttribute(normals, first)
      .add(new THREE.Vector3().fromBufferAttribute(normals, last))
      .normalize();
    normals.setXYZ(first, normal.x, normal.y, normal.z);
    normals.setXYZ(last, normal.x, normal.y, normal.z);
  }
  return geo;
}
function finGeometry(outline, orientation, color, rays = 4, thickness = 0.009) {
  const base = sculptedFin(outline, thickness, orientation, {
    detail: 0,
    camber: 0.003,
  });
  const parts = [painted(base, color)],
    root = outline[0];
  const tone = new THREE.Color(color).multiplyScalar(0.67);
  for (let i = 1; i <= rays; i++) {
    const p = outline[1 + Math.floor(((outline.length - 2) * i) / (rays + 1))];
    const point = (u, v) =>
      orientation === "horizontal"
        ? [v, thickness * 0.26, u]
        : [thickness * 0.26, v, u];
    curve(
      parts,
      [
        point(root[0], root[1]),
        point(
          THREE.MathUtils.lerp(root[0], p[0], 0.53),
          THREE.MathUtils.lerp(root[1], p[1], 0.53),
        ),
        point(p[0] * 0.97 + root[0] * 0.03, p[1] * 0.97 + root[1] * 0.03),
      ],
      0.0009,
      tone,
      3,
    );
  }
  return combine(parts);
}
function eye(parts, position, radius, side) {
  if (!parts) return;
  ellipsoid(parts, position, [radius * 0.48, radius, radius], "#d1c78f");
  const outer = [
    position[0] + side * radius * 0.4,
    position[1],
    position[2] - radius * 0.07,
  ];
  ellipsoid(
    parts,
    outer,
    [radius * 0.22, radius * 0.71, radius * 0.71],
    "#0b1c22",
  );
  ellipsoid(
    parts,
    [
      outer[0] + side * radius * 0.17,
      outer[1] + radius * 0.23,
      outer[2] - radius * 0.21,
    ],
    [radius * 0.08, radius * 0.2, radius * 0.16],
    "#e4e9d8",
  );
}
function ellipsoid(parts, position, scale, color) {
  if (!parts) return;
  const geometry = SPHERE.clone();
  geometry.scale(...scale);
  geometry.translate(...position);
  parts.push(painted(geometry, color));
}
function curve(parts, points, radius, color, segments = 8, taper = false) {
  if (!parts) return;
  const path = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
  );
  const geo = new THREE.TubeGeometry(path, segments, radius, 4, false);
  if (taper) {
    const p = geo.attributes.position;
    for (let i = 0; i <= segments; i++) {
      const center = path.getPointAt(i / segments),
        factor = 1 - (i / segments) * 0.96;
      for (let j = 0; j <= 4; j++) {
        const id = i * 5 + j,
          v = new THREE.Vector3()
            .fromBufferAttribute(p, id)
            .sub(center)
            .multiplyScalar(factor)
            .add(center);
        p.setXYZ(id, v.x, v.y, v.z);
      }
    }
    geo.computeVertexNormals();
  }
  parts.push(painted(geo, color));
}
function painted(geometry, color) {
  const c = new THREE.Color(color),
    p = geometry.attributes.position,
    colors = [];
  for (let i = 0; i < p.count; i++) colors.push(c.r, c.g, c.b);
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.deleteAttribute("uv");
  return geometry;
}
function combine(parts) {
  const converted = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const result = mergeGeometries(converted, false);
  for (const p of new Set([...parts, ...converted])) p.dispose();
  return result;
}
function cached(key, make) {
  if (!GEOMETRIES.has(key)) GEOMETRIES.set(key, make());
  return GEOMETRIES.get(key);
}
function mesh(parent, name, make, material) {
  const node = new THREE.Mesh(cached(name, make), material);
  node.name = name;
  node.userData.keepSeparate = true;
  parent.add(node);
  return node;
}
function joint(parent, name, position) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(...position);
  parent.add(group);
  return group;
}
function skinMaterialCached(key, options) {
  if (!MATERIALS.has(key)) MATERIALS.set(key, skinMaterial(options));
  return MATERIALS.get(key);
}
