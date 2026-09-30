import * as THREE from "three";
import {
  skinMaterial,
  sculptedFin,
  sampleSection,
  bindAxialMotion,
} from "./creature_surface.js";

export const BERMUDA_CREATURE_KINDS = new Set([
  "queen_angelfish",
  "triggerfish",
  "needlefish",
  "barracuda",
  "tiger_shark",
  "cameroceras",
  "livyatan",
]);
const GEOMETRY = new Map(),
  MATERIALS = new Map();
const cache = (key, make) => {
  if (!GEOMETRY.has(key)) GEOMETRY.set(key, make());
  return GEOMETRY.get(key);
};
const skin = skinMaterial({
  vertexColors: true,
  roughness: 0.45,
  pattern: 0.035,
});
function material(color, roughness = 0.5) {
  const key = color + roughness;
  if (!MATERIALS.has(key))
    MATERIALS.set(key, skinMaterial({ color, roughness }));
  return MATERIALS.get(key);
}
function mesh(parent, geometry, mat, name, position = [0, 0, 0]) {
  const node = new THREE.Mesh(geometry, mat);
  node.name = name;
  node.position.fromArray(position);
  parent.add(node);
  return node;
}
function ellipsoid(parent, color, position, scale, name) {
  const n = mesh(
    parent,
    cache("sphere", () => new THREE.SphereGeometry(1, 24, 16)),
    material(color),
    name,
    position,
  );
  n.scale.fromArray(scale);
  return n;
}
function fin(
  parent,
  key,
  outline,
  color,
  orientation = "vertical",
  thickness = 0.005,
) {
  const geometry = cache(key, () => {
    const g = sculptedFin(outline, thickness, orientation);
    g.computeBoundingBox();
    const p = g.getAttribute("position"),
      uv = [];
    const bounds = g.boundingBox,
      vertical = orientation === "vertical";
    const span =
      (vertical ? bounds.max.y - bounds.min.y : bounds.max.x - bounds.min.x) ||
      1;
    for (let i = 0; i < p.count; i++)
      uv.push(
        (p.getZ(i) - bounds.min.z) / (bounds.max.z - bounds.min.z || 1),
        ((vertical ? p.getY(i) : p.getX(i)) -
          (vertical ? bounds.min.y : bounds.min.x)) /
          span,
      );
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    return g;
  });
  const materialKey = `fin_${color}`;
  if (!MATERIALS.has(materialKey)) {
    const m = skinMaterial({
      color,
      roughness: 0.53,
      side: THREE.DoubleSide,
      emissive: "#253943",
      emissiveIntensity: 0.12,
    });
    const original = m.onBeforeCompile;
    m.onBeforeCompile = (shader) => {
      original(shader);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec2 vFinMap;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvFinMap = uv;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec2 vFinMap;",
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
        float rayAngle = atan(vFinMap.y + 0.18, vFinMap.x - 0.45);
        float rays = pow(abs(sin(rayAngle * 27.0)), 14.0);
        float edge = smoothstep(0.55, 1.0, vFinMap.y);
        diffuseColor.rgb *= 0.94 - rays * 0.15 + edge * 0.13;`,
        );
    };
    m.customProgramCacheKey = () => "bermuda_fin_rays_v1";
    MATERIALS.set(materialKey, m);
  }
  return mesh(parent, geometry, MATERIALS.get(materialKey), key);
}

/** 新海域生物各自放样和骨骼动作；不改变根节点旅行朝向或共享实例状态。 */
export function buildBermudaCreature(kind, root, motions) {
  if (!BERMUDA_CREATURE_KINDS.has(kind))
    throw new Error(`Unknown Bermuda creature: ${kind}`);
  const body = new THREE.Group();
  body.name = `${kind}_bermuda_anatomy`;
  root.add(body);
  if (kind === "cameroceras") buildCameroceras(body, motions);
  else if (kind === "livyatan") buildLivyatan(body, motions);
  else buildFish(kind, body, motions);
  body.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(body),
    size = bounds.getSize(new THREE.Vector3()),
    scale = 1 / size.z;
  body.scale.setScalar(scale);
  body.position
    .copy(bounds.getCenter(new THREE.Vector3()))
    .multiplyScalar(-scale);
  root.userData.normalizedLength = 1;
  root.userData.bermudaAnatomy = kind;
}

/** 连续体表带背腹色和物种斑纹，首尾小半径封口防止出现空管。 */
function loft(profile, back, belly, pattern = () => 0, rings = 48, sides = 32) {
  const p = [],
    c = [],
    idx = [],
    a = new THREE.Color(back),
    b = new THREE.Color(belly),
    dark = new THREE.Color("#1c3339"),
    shade = new THREE.Color();
  for (let row = 0; row <= rings; row++) {
    const z = THREE.MathUtils.lerp(
        profile[0][0],
        profile.at(-1)[0],
        row / rings,
      ),
      [rx, ry, cy] = sampleSection(profile, z);
    for (let col = 0; col <= sides; col++) {
      const angle = (col / sides) * Math.PI * 2,
        x = Math.cos(angle) * rx,
        y = Math.sin(angle) * ry + (cy || 0),
        s = Math.sin(angle);
      p.push(x, y, z);
      shade
        .copy(b)
        .lerp(a, THREE.MathUtils.smoothstep(s, -0.15, 0.65))
        .lerp(dark, Math.max(0, Math.min(0.75, pattern(x, y, z, s))));
      shade.toArray(c, c.length);
    }
  }
  for (let r = 0; r < rings; r++)
    for (let s = 0; s < sides; s++) {
      const i = r * (sides + 1) + s,
        j = i + sides + 1;
      idx.push(i, i + 1, j, j, i + 1, j + 1);
    }
  // 端面用同一圈顶点封闭，防止神像式近看时从头部或尾柄看到空洞。
  for (const [row, forward] of [
    [0, false],
    [rings, true],
  ]) {
    const id = p.length / 3;
    const z = profile[forward ? profile.length - 1 : 0][0];
    p.push(0, sampleSection(profile, z)[2], z);
    a.toArray(c, c.length);
    for (let j = 0; j < sides; j++) {
      const n = row * (sides + 1) + j;
      idx.push(...(forward ? [id, n, n + 1] : [id, n + 1, n]));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const FISH = {
  queen_angelfish: {
    w: 0.072,
    h: 0.22,
    back: "#237aa1",
    belly: "#77a798",
    fin: "#efcd58",
    tail: 0.15,
    head: -0.35,
  },
  triggerfish: {
    w: 0.095,
    h: 0.18,
    back: "#617873",
    belly: "#c0c7a2",
    fin: "#648f93",
    tail: 0.17,
    head: -0.37,
  },
  needlefish: {
    w: 0.023,
    h: 0.026,
    back: "#398581",
    belly: "#d4e8d9",
    fin: "#719693",
    tail: 0.09,
    head: -0.3,
  },
  barracuda: {
    w: 0.072,
    h: 0.081,
    back: "#547278",
    belly: "#ced7cf",
    fin: "#4b6169",
    tail: 0.14,
    head: -0.44,
  },
  tiger_shark: {
    w: 0.15,
    h: 0.14,
    back: "#677870",
    belly: "#d5d5ba",
    fin: "#707e74",
    tail: 0.28,
    head: -0.43,
  },
};
function buildFish(kind, body, motions) {
  const f = FISH[kind],
    shark = kind === "tiger_shark",
    queen = kind === "queen_angelfish",
    trigger = kind === "triggerfish",
    needle = kind === "needlefish",
    predator = shark || kind === "barracuda";
  const profile = queen
    ? [
        [-0.38, 0.006, 0.014],
        [-0.35, 0.032, 0.065],
        [-0.29, 0.046, 0.14],
        [-0.18, 0.065, 0.225],
        [-0.02, 0.065, 0.23],
        [0.15, 0.046, 0.16],
        [0.3, 0.016, 0.049],
        [0.38, 0.009, 0.025],
      ]
    : trigger
      ? [
          [-0.4, 0.006, 0.014],
          [-0.35, 0.031, 0.055],
          [-0.25, 0.071, 0.115],
          [-0.13, 0.088, 0.16],
          [0.02, 0.079, 0.166],
          [0.19, 0.047, 0.099],
          [0.34, 0.012, 0.026],
          [0.38, 0.009, 0.019],
        ]
      : needle
        ? [
            [-0.32, 0.009, 0.012],
            [-0.25, 0.022, 0.025],
            [-0.05, 0.024, 0.028],
            [0.17, 0.019, 0.024],
            [0.32, 0.009, 0.014],
            [0.39, 0.003, 0.008],
          ]
        : shark
          ? [
              [-0.48, 0.012, 0.013, 0.012],
              [-0.456, 0.059, 0.03, 0.015],
              [-0.395, 0.085, 0.053, 0.012],
              [-0.28, 0.104, 0.087, 0.008],
              [-0.1, 0.116, 0.1],
              [0.1, 0.079, 0.08],
              [0.27, 0.037, 0.046],
              [0.4, 0.01, 0.021],
            ]
          : [
              [-0.48, 0.007, 0.018],
              [-0.435, 0.031, 0.037],
              [-0.34, 0.055, 0.062],
              [-0.17, 0.061, 0.071],
              [0.02, 0.055, 0.062],
              [0.23, 0.028, 0.036],
              [0.38, 0.009, 0.016],
            ];
  const torso = mesh(
    body,
    cache(kind + "_body_v2", () =>
      loft(profile, f.back, f.belly, () => 0, 72, 40),
    ),
    fishSkin(kind),
    kind + "_body",
  );
  if (predator) {
    const p = torso.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i);
      if (z < -0.27 && p.getY(i) < -0.022) p.setY(i, -0.022);
    }
    torso.geometry.computeVertexNormals();
  }
  const swim = bindAxialMotion(torso, motions, {
    amplitude: needle ? 0.055 : trigger ? 0.045 : 0.075,
    frequency: trigger ? 0.75 : 1.1,
  });
  const tailPivot = new THREE.Group();
  tailPivot.position.z = 0.36;
  body.add(tailPivot);
  const tail = shark
    ? [
        [0, 0],
        [0.06, 0.043],
        [0.22, 0.225],
        [0.29, 0.24],
        [0.24, 0.115],
        [0.13, 0.024],
        [0.16, -0.083],
        [0.105, -0.116],
        [0.035, -0.045],
      ]
    : queen
      ? [
          [0, 0.018],
          [0.13, 0.093],
          [0.17, 0.065],
          [0.18, 0],
          [0.17, -0.065],
          [0.13, -0.093],
          [0, -0.018],
        ]
      : trigger
        ? [
            [0, 0.019],
            [0.14, 0.083],
            [0.12, 0.02],
            [0.12, -0.02],
            [0.14, -0.083],
            [0, -0.019],
          ]
        : [
            [0, 0.011],
            [0.14, needle ? 0.047 : 0.1],
            [0.11, 0.02],
            [0.047, 0],
            [0.11, -0.02],
            [0.15, needle ? -0.061 : -0.1],
            [0, -0.012],
          ];
  fin(tailPivot, kind + "_tail_v2", tail, f.fin);
  // 尾根沿主体同一骨骼运动，避免鳍面与尾柄各自摇动后断开。
  const rest = new THREE.Vector3();
  motions.push(() => {
    swim.updateMatrixWorld(true);
    const bone = swim.skeleton.bones[2];
    rest.set(0, 0, 0.11).applyMatrix4(bone.matrixWorld);
    body.worldToLocal(rest);
    tailPivot.position.copy(rest);
    tailPivot.quaternion
      .copy(swim.skeleton.bones[1].quaternion)
      .multiply(bone.quaternion);
  });
  const dorsal = queen
    ? [
        [-0.27, 0.115],
        [-0.22, 0.21],
        [-0.1, 0.28],
        [0.11, 0.25],
        [0.34, 0.28],
        [0.28, 0.12],
        [0.16, 0.1],
      ]
    : trigger
      ? [
          [0.015, 0.146],
          [0.065, 0.228],
          [0.2, 0.16],
          [0.275, 0.07],
          [0.17, 0.055],
        ]
      : shark
        ? [
            [-0.06, 0.092],
            [0.025, 0.235],
            [0.066, 0.231],
            [0.085, 0.147],
            [0.18, 0.07],
          ]
        : needle
          ? [
              [0.22, 0.018],
              [0.25, 0.07],
              [0.35, 0.039],
              [0.37, 0.012],
            ]
          : [
              [-0.11, 0.062],
              [-0.075, 0.14],
              [0.005, 0.09],
              [0.04, 0.056],
            ];
  const dorsalFin = fin(body, kind + "_dorsal_v2", dorsal, f.fin);
  const anal = fin(
    body,
    kind + "_anal_v2",
    queen
      ? dorsal.map(([z, y]) => [z + 0.04, -y * 0.9])
      : trigger
        ? dorsal.map(([z, y]) => [z, -y * 0.9])
        : [
            [0.22, -0.02],
            [0.26, -0.074],
            [0.34, -0.046],
            [0.37, -0.015],
          ],
    f.fin,
  );
  if (shark || kind === "barracuda")
    fin(
      body,
      kind + "_second_dorsal",
      [
        [0.23, 0.04],
        [0.26, 0.092],
        [0.33, 0.039],
        [0.36, 0.019],
      ],
      f.fin,
    );
  if (trigger) {
    fin(
      body,
      kind + "_trigger_v2",
      [
        [-0.23, 0.11],
        [-0.195, 0.26],
        [-0.177, 0.26],
        [-0.16, 0.12],
      ],
      "#86938a",
    );
    motions.push((t) => {
      dorsalFin.rotation.z = Math.sin(t * 1.7) * 0.045;
      anal.rotation.z = -Math.sin(t * 1.7) * 0.045;
    });
  }
  if (queen) {
    for (const [suffix, out] of [
      ["dorsal", dorsal],
      ["anal", dorsal.map(([z, y]) => [z + 0.04, -y * 0.9])],
    ]) {
      curveDetail(
        body,
        kind + "_" + suffix + "_blue_edge",
        out.slice(1, 5).map(([z, y]) => [0, y, z]),
        0.0024,
        "#178dc4",
      );
    }
  }
  const eyeZ = queen
    ? -0.295
    : trigger
      ? -0.265
      : needle
        ? -0.268
        : shark
          ? -0.384
          : -0.366;
  const eyeY = queen
    ? 0.047
    : trigger
      ? 0.073
      : needle
        ? 0.006
        : shark
          ? 0.028
          : 0.025;
  const [rx, ry, cy] = sampleSection(profile, eyeZ);
  const eyeX = rx * Math.sqrt(Math.max(0.1, 1 - ((eyeY - cy) / ry) ** 2));
  const eyeR = needle ? 0.0065 : shark ? 0.009 : queen ? 0.012 : 0.011;
  for (const side of [-1, 1]) {
    ellipsoid(
      body,
      queen ? "#d6b953" : f.back,
      [side * eyeX, eyeY, eyeZ],
      [eyeR * 0.6, eyeR * 1.3, eyeR * 1.4],
      kind + "_orbital_rim",
    );
    ellipsoid(
      body,
      shark ? "#302d26" : "#b1a46a",
      [side * (eyeX + eyeR * 0.36), eyeY, eyeZ],
      [eyeR * 0.5, eyeR, eyeR],
      kind + "_iris",
    );
    ellipsoid(
      body,
      "#081519",
      [side * (eyeX + eyeR * 0.76), eyeY, eyeZ - 0.001],
      [eyeR * 0.16, eyeR * 0.62, eyeR * 0.64],
      kind + "_pupil",
    );
    ellipsoid(
      body,
      "#b9d9d3",
      [side * (eyeX + eyeR * 0.82), eyeY + eyeR * 0.28, eyeZ - eyeR * 0.25],
      [eyeR * 0.07, eyeR * 0.17, eyeR * 0.16],
      kind + "_eye_glint",
    );
    const anchorZ = shark
      ? -0.2
      : queen
        ? -0.18
        : trigger
          ? -0.2
          : needle
            ? -0.18
            : -0.24;
    const [ax, ay] = sampleSection(profile, anchorZ);
    const pivot = new THREE.Group();
    pivot.position.set(side * ax * 0.92, -ay * 0.2, anchorZ);
    body.add(pivot);
    const spread = shark
      ? 0.22
      : queen
        ? 0.07
        : trigger
          ? 0.065
          : needle
            ? 0.034
            : 0.06;
    fin(
      pivot,
      kind + "_pectoral_v2_" + side,
      [
        [0, 0],
        [shark ? 0.17 : 0.1, side * spread],
        [shark ? 0.2 : 0.16, side * spread * 0.8],
        [0.08, side * 0.016],
      ],
      queen ? "#ddb644" : f.fin,
      "horizontal",
      shark ? 0.009 : 0.003,
    );
    pivot.rotation.z = side * 0.16;
    motions.push((t) => {
      pivot.rotation.y = side * (0.1 + Math.sin(t * (queen ? 2 : 1.1)) * 0.15);
    });
    if (shark)
      for (let j = 0; j < 5; j++) {
        const z = -0.27 + j * 0.017;
        curveDetail(
          body,
          kind + "_gill_" + side + "_" + j,
          [-0.65, -0.25, 0.2, 0.56].map((a) => {
            const [x, y] = sampleSection(profile, z);
            return [
              side * x * Math.sqrt(1 - a * a) * 1.012,
              y * a,
              z + 0.006 * (1 - a * a),
            ];
          }),
          0.0018,
          "#304348",
        );
      }
    else {
      const z = queen ? -0.22 : trigger ? -0.205 : needle ? -0.208 : -0.255;
      curveDetail(
        body,
        kind + "_operculum_" + side,
        [-0.7, -0.4, 0, 0.4, 0.67].map((a) => {
          const [x, y] = sampleSection(profile, z + 0.018 * (1 - a * a));
          return [
            side * x * Math.sqrt(1 - a * a) * 1.016,
            y * a,
            z + 0.018 * (1 - a * a),
          ];
        }),
        needle ? 0.0007 : 0.0015,
        queen ? "#d9b343" : "#596d6c",
      );
    }
    if (shark || kind === "barracuda") {
      ellipsoid(
        body,
        "#263b40",
        [
          side * (shark ? 0.052 : 0.025),
          shark ? 0.007 : 0.015,
          shark ? -0.451 : -0.434,
        ],
        [0.009, 0.002, 0.004],
        kind + "_nostril",
      );
    }
  }
  if (predator) {
    const zFront = shark ? -0.455 : -0.48,
      hinge = -0.26,
      width = shark ? 0.075 : 0.042;
    const jawPivot = new THREE.Group();
    jawPivot.position.set(0, -0.025, hinge);
    body.add(jawPivot);
    const jawProfile = [
      [zFront - hinge, 0.006, 0.005],
      [zFront - hinge + 0.035, width * 0.74, 0.009],
      [-0.08, width, 0.018],
      [0, width * 0.75, 0.011],
      [0.015, 0.005, 0.004],
    ];
    mesh(
      jawPivot,
      cache(kind + "_sculpted_jaw", () =>
        loft(jawProfile, f.belly, f.belly, () => 0, 40, 24),
      ),
      skin,
      kind + "_lower_jaw",
    );
    ellipsoid(
      body,
      "#283837",
      [0, -0.023, (zFront + hinge) / 2],
      [width * 0.97, 0.008, (hinge - zFront) * 0.5],
      kind + "_mouth_cavity",
    );
    for (const side of [-1, 1])
      for (let j = 0; j < 11; j++) {
        const z = zFront + 0.022 + (j * (hinge - zFront - 0.04)) / 11;
        const x = width * Math.sin(((j / 14 + 0.17) * Math.PI) / 2) * side;
        const tooth = mesh(
          jawPivot,
          cache(
            kind + "_fang",
            () =>
              new THREE.ConeGeometry(
                shark ? 0.0037 : 0.0023,
                shark ? 0.014 : 0.015,
                7,
              ),
          ),
          material("#d8d7bb"),
          kind + "_lower_tooth",
          [x, 0.011, z - hinge],
        );
        tooth.rotation.z = side * 0.12;
        const upper = mesh(
          body,
          tooth.geometry,
          tooth.material,
          kind + "_upper_tooth",
          [x, -0.018, z + 0.004],
        );
        upper.rotation.z = Math.PI - side * 0.1;
      }
    motions.push((t, e) => {
      jawPivot.rotation.x =
        -0.015 - Math.max(0, Math.sin(t * 0.65)) * (0.024 + e * 0.018);
    });
  } else if (needle) {
    for (const [y, end] of [
      [0.002, -0.6],
      [-0.007, -0.61],
    ]) {
      mesh(
        body,
        cache("needlefish_jaw_" + y, () =>
          loft(
            [
              [end, 0.0005, 0.0005],
              [end + 0.045, 0.004, 0.003],
              [-0.38, 0.009, 0.004],
              [-0.285, 0.009, 0.006],
            ],
            "#739b87",
            "#c0d0b1",
            () => 0,
            48,
            16,
          ),
        ),
        skin,
        "needlefish_elongated_jaw",
        [0, y, 0],
      );
    }
  } else {
    curveDetail(
      body,
      kind + "_lips",
      [
        [-0.016, -0.014, profile[0][0] + 0.006],
        [0, -0.023, profile[0][0] - 0.002],
        [0.016, -0.014, profile[0][0] + 0.006],
      ],
      0.003,
      queen ? "#ddba50" : "#8a947c",
    );
    ellipsoid(
      body,
      "#283c40",
      [0, -0.014, profile[0][0]],
      [0.012, 0.0025, 0.003],
      kind + "_small_mouth",
    );
  }
  body.userData.torso = swim;
}

/** 贴附曲面缝线和轮廓细节缓存；不为每条鱼重复创建静态资源。 */
function curveDetail(parent, key, points, radius, color) {
  return mesh(
    parent,
    cache(
      key,
      () =>
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(
            points.map((p) => new THREE.Vector3(...p)),
          ),
          Math.max(12, points.length * 4),
          radius,
          6,
          false,
        ),
    ),
    material(color),
    key,
  );
}

function fishSkin(kind) {
  const key = kind + "_detailed_skin";
  if (MATERIALS.has(key)) return MATERIALS.get(key);
  const m = skinMaterial({
    vertexColors: true,
    roughness: kind === "needlefish" ? 0.32 : 0.46,
    pattern: 0.028,
  });
  const original = m.onBeforeCompile;
  const pattern =
    kind === "queen_angelfish"
      ? `
    vec2 cells=vec2(p.z*85.,p.y*94.);cells.x+=mod(floor(cells.y),2.)*.5;
    vec2 q=fract(cells)-.5;float scaleEdge=smoothstep(.29,.49,length(q));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.57,.40,.045),scaleEdge*.34);
    float crown=length(vec2((p.z+.283)/.041,(p.y-.147)/.035));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.015,.035,.058),1.-smoothstep(.77,.85,crown));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.02,.43,.72),(1.-smoothstep(.06,.15,abs(crown-.92)))*smoothstep(.04,.065,p.y));
    float cheek=exp(-pow((p.z+.32)*50.,2.))*exp(-pow((p.y+.025)*20.,2.));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.48,.36,.055),cheek*.7);
  `
      : kind === "triggerfish"
        ? `
    vec2 q=fract(vec2(p.z*97.+floor(p.y*106.)*.5,p.y*106.))-.5;
    float net=smoothstep(.34,.49,length(q));diffuseColor.rgb*=.88+.16*net;
    float cheek=sin(p.y*180.+p.z*48.)*.5+.5;diffuseColor.rgb*=1.-cheek*.13*exp(-pow((p.z+.28)*10.,2.));
  `
        : kind === "tiger_shark"
          ? `
    float stripe=pow(max(0.,sin(p.z*77.+sin(p.y*47.)*.7)),10.);
    float broken=.55+.45*sin(p.z*29.+p.y*61.);diffuseColor.rgb*=1.-stripe*.45*smoothstep(-.036,.01,p.y)*broken;
    float speckles=pow(max(0.,sin(p.z*193.)*sin(p.y*223.+p.z*37.)),12.);diffuseColor.rgb*=1.-speckles*.1;
  `
          : kind === "barracuda"
            ? `
    float bar=pow(max(0.,sin(p.z*69.+p.y*31.)),11.);diffuseColor.rgb*=1.-bar*.35*smoothstep(-.032,.01,p.y);
    float spots=pow(max(0.,sin(p.z*157.)*sin(p.y*210.+p.z*29.)),14.);diffuseColor.rgb*=1.-spots*.4;
    float lateral=exp(-pow((p.y-.008)*600.,2.));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.26,.35,.36),lateral*.45);
  `
            : `float silver=exp(-pow(p.y*250.,2.));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.72,.84,.82),silver*.5);`;
  m.onBeforeCompile = (shader) => {
    original(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      "#include <color_fragment>\nvec3 p=vSkinPosition;\n" + pattern,
    );
  };
  m.customProgramCacheKey = () => key;
  MATERIALS.set(key, m);
  return m;
}

function buildCameroceras(body, motions) {
  const shellProfile = [
    [-0.13, 0.105, 0.105],
    [0.03, 0.09, 0.09],
    [0.23, 0.066, 0.066],
    [0.43, 0.029, 0.029],
    [0.66, 0.001, 0.001],
  ];
  mesh(
    body,
    cache("cameroceras_shell", () =>
      loft(
        shellProfile,
        "#b7b3a1",
        "#d9cfb4",
        (x, y, z) => 0.14 * Math.pow(Math.max(0, Math.sin(z * 170)), 8),
        72,
        40,
      ),
    ),
    shellSkin(),
    "cameroceras_tapered_shell",
  );
  mesh(
    body,
    cache(
      "cameroceras_aperture",
      () => new THREE.TorusGeometry(0.107, 0.008, 10, 40),
    ),
    material("#c8c2a9"),
    "cameroceras_aperture",
    [0, 0, -0.132],
  );
  ellipsoid(
    body,
    "#9d8d76",
    [0, 0, -0.165],
    [0.1, 0.09, 0.095],
    "cameroceras_head",
  );
  for (const side of [-1, 1]) {
    ellipsoid(
      body,
      "#c4b99c",
      [side * 0.082, 0.025, -0.19],
      [0.035, 0.03, 0.036],
      "cameroceras_eye_socket",
    );
    ellipsoid(
      body,
      "#132b32",
      [side * 0.107, 0.026, -0.196],
      [0.014, 0.024, 0.023],
      "cameroceras_eye",
    );
  }
  ellipsoid(
    body,
    "#8a8d78",
    [0, -0.072, -0.21],
    [0.029, 0.023, 0.055],
    "cameroceras_siphon",
  );
  ellipsoid(
    body,
    "#443d36",
    [0, 0, -0.225],
    [0.03, 0.03, 0.022],
    "cameroceras_beak_cavity",
  );
  ellipsoid(
    body,
    "#9a8267",
    [0, 0, -0.24],
    [0.015, 0.019, 0.015],
    "cameroceras_beak",
  );
  for (const side of [-1, 1]) {
    ellipsoid(
      body,
      "#b4a774",
      [side * 0.11, 0.026, -0.196],
      [0.006, 0.022, 0.02],
      "cameroceras_iris",
    );
    ellipsoid(
      body,
      "#112124",
      [side * 0.115, 0.026, -0.196],
      [0.0025, 0.016, 0.014],
      "cameroceras_pupil",
    );
    ellipsoid(
      body,
      "#b6d0bd",
      [side * 0.117, 0.032, -0.2],
      [0.001, 0.003, 0.003],
      "cameroceras_eye_glint",
    );
  }
  const armMaterial = material("#887660", 0.6);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2,
      pivot = new THREE.Group();
    pivot.name = "cameroceras_arm";
    pivot.position.set(
      Math.cos(angle) * 0.065,
      Math.sin(angle) * 0.065,
      -0.205,
    );
    body.add(pivot);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(),
      new THREE.Vector3(Math.cos(angle) * 0.025, Math.sin(angle) * 0.025, -0.1),
      new THREE.Vector3(
        Math.cos(angle) * (0.065 + (i % 3) * 0.008),
        Math.sin(angle) * 0.08,
        -0.2 - (i % 3) * 0.018,
      ),
      new THREE.Vector3(
        Math.cos(angle + 0.24) * 0.09,
        Math.sin(angle + 0.24) * 0.11,
        -0.29 - (i % 3) * 0.018,
      ),
      new THREE.Vector3(
        Math.cos(angle + 0.45) * 0.064,
        Math.sin(angle + 0.45) * 0.09,
        -0.33 - (i % 3) * 0.018,
      ),
    ]);
    mesh(
      pivot,
      cache(`cameroceras_arm_${i}`, () => taperedArm(curve, 36, 0.018)),
      armMaterial,
      `cameroceras_arm_${i}`,
    );
    motions.push((t, e) => {
      pivot.rotation.x = Math.sin(t * 0.75 + i) * 0.09 * (0.8 + e * 0.2);
      pivot.rotation.y = Math.cos(t * 0.67 + i) * 0.07;
    });
  }
}
function buildLivyatan(body, motions) {
  const profile = [
    [-0.51, 0.035, 0.052, 0.01],
    [-0.488, 0.114, 0.083, 0.018],
    [-0.44, 0.159, 0.121, 0.022],
    [-0.32, 0.174, 0.14, 0.017],
    [-0.14, 0.151, 0.137],
    [0.06, 0.112, 0.111],
    [0.24, 0.055, 0.064],
    [0.37, 0.018, 0.025],
    [0.415, 0.01, 0.016],
  ];
  const torso = mesh(
    body,
    cache("livyatan_torso_v2", () => {
      const g = loft(profile, "#49585d", "#8a9187", () => 0, 88, 48);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const z = p.getZ(i);
        if (z < -0.165 && p.getY(i) < -0.057) p.setY(i, -0.057);
      }
      g.computeVertexNormals();
      return g;
    }),
    whaleSkin(),
    "livyatan_robust_torso",
  );
  const swim = bindAxialMotion(torso, motions, {
    axis: "x",
    frequency: 0.75,
    amplitude: 0.09,
  });
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.066, -0.15);
  body.add(jaw);
  mesh(
    jaw,
    cache("livyatan_sculpted_mandible", () =>
      loft(
        [
          [-0.36, 0.01, 0.008],
          [-0.33, 0.104, 0.025],
          [-0.25, 0.147, 0.038],
          [-0.1, 0.149, 0.038],
          [0, 0.108, 0.023],
          [0.025, 0.01, 0.007],
        ],
        "#80877d",
        "#8f9485",
        () => 0,
        64,
        40,
      ),
    ),
    skin,
    "livyatan_powerful_mandible",
  );
  ellipsoid(
    body,
    "#293333",
    [0, -0.059, -0.332],
    [0.15, 0.016, 0.162],
    "livyatan_mouth_cavity",
  );
  for (const side of [-1, 1]) {
    const eyeZ = -0.227,
      eyeY = -0.025;
    const [rx, ry, cy] = sampleSection(profile, eyeZ);
    const eyeX = rx * Math.sqrt(1 - ((eyeY - cy) / ry) ** 2);
    ellipsoid(
      body,
      "#3f4d50",
      [side * eyeX, eyeY, eyeZ],
      [0.008, 0.014, 0.022],
      "livyatan_eye_socket",
    );
    ellipsoid(
      body,
      "#111a1c",
      [side * (eyeX + 0.006), eyeY, eyeZ - 0.002],
      [0.006, 0.008, 0.013],
      "livyatan_eye",
    );
    ellipsoid(
      body,
      "#a4b5b0",
      [side * (eyeX + 0.0105), eyeY + 0.003, eyeZ - 0.005],
      [0.0015, 0.002, 0.003],
      "livyatan_eye_glint",
    );
    const lip = [];
    for (let j = 0; j <= 18; j++) {
      const z = -0.485 + (j * 0.315) / 18;
      const [x, y, cy] = sampleSection(profile, z);
      lip.push([
        side *
          x *
          Math.sqrt(Math.max(0.2, 1 - ((-0.057 - cy) / y) ** 2)) *
          1.02,
        -0.056,
        z,
      ]);
    }
    curveDetail(body, "livyatan_lip_" + side, lip, 0.0035, "#42504e");
    for (let i = 0; i < 13; i++) {
      const z = -0.46 + (i * 0.285) / 13;
      const [x, y, cy] = sampleSection(profile, z);
      const tx =
        side *
        x *
        Math.sqrt(Math.max(0.2, 1 - ((-0.057 - cy) / y) ** 2)) *
        0.93;
      const geo = cache("livyatan_curved_tooth_" + i, () => {
        const g = new THREE.ConeGeometry(0.0058, 0.032, 10, 5);
        const p = g.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const h = (p.getY(k) + 0.016) / 0.032;
          p.setZ(k, p.getZ(k) - h * h * 0.006);
        }
        g.computeVertexNormals();
        return g;
      });
      mesh(jaw, geo, material("#cbc6aa"), "livyatan_lower_tooth", [
        tx,
        0.032,
        z + 0.15,
      ]);
      const upper = mesh(
        body,
        geo,
        material("#cbc6aa"),
        "livyatan_upper_tooth",
        [tx, -0.054, z + 0.009],
      );
      upper.rotation.z = Math.PI;
    }
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.12, -0.08, -0.1);
    body.add(pivot);
    fin(
      pivot,
      "livyatan_flipper_v2_" + side,
      [
        [0, 0],
        [0.06, side * 0.11],
        [0.17, side * 0.23],
        [0.22, side * 0.19],
        [0.18, side * 0.11],
        [0.055, side * 0.01],
      ],
      "#4c6264",
      "horizontal",
      0.018,
    );
    pivot.rotation.z = side * 0.24;
    motions.push((t) => {
      pivot.rotation.z = side * (0.24 + Math.sin(t * 0.65) * 0.07);
    });
    // 头部浅沟及旧擦痕贴合轮廓，避免外置装饰漂在皮肤外。
    for (let j = 0; j < 5; j++) {
      const z = -0.38 + j * 0.025;
      curveDetail(
        body,
        "livyatan_head_fold_" + side + "_" + j,
        [0.2, 0.35, 0.5, 0.65].map((a) => {
          const [x, y, cy] = sampleSection(profile, z);
          return [
            side * x * Math.sqrt(1 - a * a) * 1.004,
            cy + y * a,
            z + 0.004 * Math.sin(a * 5),
          ];
        }),
        0.0012,
        "#69746e",
      );
    }
  }
  motions.push((t, e) => {
    jaw.rotation.x =
      -0.015 - Math.max(0, Math.sin(t * 0.55)) * (0.025 + e * 0.02);
  });
  fin(
    body,
    "livyatan_dorsal_v2",
    [
      [0.055, 0.1],
      [0.11, 0.173],
      [0.17, 0.161],
      [0.22, 0.071],
    ],
    "#4d6062",
  );
  for (let i = 0; i < 3; i++)
    fin(
      body,
      "livyatan_knuckle_" + i,
      [
        [0.23 + i * 0.036, 0.058 - i * 0.01],
        [0.248 + i * 0.036, 0.077 - i * 0.012],
        [0.275 + i * 0.033, 0.045 - i * 0.011],
      ],
      "#566763",
    );
  const tail = new THREE.Group();
  tail.position.set(0, 0, 0.36);
  body.add(tail);
  fin(
    tail,
    "livyatan_fluke_v2",
    [
      [0, 0],
      [0.055, -0.13],
      [0.07, -0.235],
      [0.13, -0.226],
      [0.16, -0.13],
      [0.105, 0],
      [0.16, 0.13],
      [0.13, 0.226],
      [0.07, 0.235],
      [0.055, 0.13],
    ],
    "#4f6466",
    "horizontal",
    0.015,
  );
  const tip = new THREE.Vector3();
  motions.push(() => {
    swim.updateMatrixWorld(true);
    const bone = swim.skeleton.bones[2];
    tip.set(0, 0, 0.11).applyMatrix4(bone.matrixWorld);
    body.worldToLocal(tip);
    tail.position.copy(tip);
    tail.quaternion
      .copy(swim.skeleton.bones[1].quaternion)
      .multiply(bone.quaternion);
  });
  ellipsoid(
    body,
    "#273a3e",
    [-0.028, 0.16, -0.35],
    [0.021, 0.003, 0.01],
    "livyatan_blowhole",
  );
}

function whaleSkin() {
  const key = "livyatan_weathered_skin";
  if (MATERIALS.has(key)) return MATERIALS.get(key);
  const m = skinMaterial({
    vertexColors: true,
    roughness: 0.51,
    pattern: 0.055,
  });
  const old = m.onBeforeCompile;
  m.onBeforeCompile = (s) => {
    old(s);
    s.fragmentShader = s.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
    vec3 p=vSkinPosition;float mottles=sin(p.z*64.+sin(p.y*51.))*sin(p.y*83.+p.z*25.);diffuseColor.rgb*=.95+mottles*.05;
    float scratch=pow(max(0.,sin(p.z*180.+p.y*51.)),44.)*exp(-pow((p.z-.05)*9.,2.))*exp(-pow((p.y-.04)*19.,2.));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.37,.40,.35),scratch*.58);
  `,
    );
  };
  m.customProgramCacheKey = () => key;
  MATERIALS.set(key, m);
  return m;
}

/** 腕尖逐渐收细，并保持端点封闭，避免筒状截断。 */
function taperedArm(curve, segments, radius) {
  const g = new THREE.TubeGeometry(curve, segments, radius, 8, false),
    p = g.attributes.position;
  for (let ring = 0; ring <= segments; ring++) {
    const t = ring / segments,
      center = curve.getPointAt(t),
      factor = 0.05 + 0.95 * (1 - t) ** 0.8;
    for (let side = 0; side <= 8; side++) {
      const i = ring * 9 + side;
      p.setXYZ(
        i,
        center.x + (p.getX(i) - center.x) * factor,
        center.y + (p.getY(i) - center.y) * factor,
        center.z + (p.getZ(i) - center.z) * factor,
      );
    }
  }
  g.computeVertexNormals();
  return g;
}

function shellSkin() {
  const key = "cameroceras_layered_shell";
  if (MATERIALS.has(key)) return MATERIALS.get(key);
  const m = skinMaterial({
    vertexColors: true,
    roughness: 0.64,
    pattern: 0.07,
  });
  const old = m.onBeforeCompile;
  m.onBeforeCompile = (s) => {
    old(s);
    s.fragmentShader = s.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
    vec3 p=vSkinPosition;float theta=atan(p.y,p.x);float rings=pow(abs(sin(p.z*245.+sin(theta*3.)*.25)),12.);
    float bands=pow(max(0.,sin(theta*7.+p.z*36.+sin(p.z*31.))),5.);
    diffuseColor.rgb*=.95-rings*.19-bands*.21;
    float edge=exp(-pow((p.z+.12)*85.,2.));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.22,.19,.14),edge*.5);`,
    );
  };
  m.customProgramCacheKey = () => key;
  MATERIALS.set(key, m);
  return m;
}
