import * as THREE from "three";
import {
  skinMaterial,
  sampleSection,
  sculptedFin,
  bindAxialMotion,
} from "./creature_surface.js";

export const MARIANA_CREATURE_KINDS = new Set([
  "moorish_idol",
  "lanternfish",
  "barreleye",
  "dragonfish",
  "snailfish",
  "goblin_shark",
]);
const geometryCache = new Map(),
  materialCache = new Map();
const geometry = (key, make) => {
  if (!geometryCache.has(key)) geometryCache.set(key, make());
  return geometryCache.get(key);
};
function material(color, emission = 0) {
  const key = `${color}_${emission}`;
  if (!materialCache.has(key))
    materialCache.set(
      key,
      skinMaterial({
        color,
        roughness: 0.43,
        emissive: color,
        emissiveIntensity: emission,
      }),
    );
  return materialCache.get(key);
}
const bodyMaterial = skinMaterial({
  vertexColors: true,
  roughness: 0.46,
  pattern: 0.03,
});
function part(parent, g, m, name, p = [0, 0, 0], scale = null) {
  const mesh = new THREE.Mesh(g, m);
  mesh.name = name;
  mesh.position.fromArray(p);
  if (scale) mesh.scale.fromArray(scale);
  parent.add(mesh);
  return mesh;
}
function oval(parent, p, scale, color, name, emission = 0) {
  return part(
    parent,
    geometry("eye_sphere", () => new THREE.SphereGeometry(1, 24, 16)),
    material(color, emission),
    name,
    p,
    scale,
  );
}
function ribbon(parent, key, outline, color, orientation = "vertical") {
  return part(
    parent,
    geometry(key, () => sculptedFin(outline, 0.004, orientation)),
    material(color),
    key,
  );
}
function filament(parent, key, points, radius, color, emission = 0) {
  return part(
    parent,
    geometry(
      key,
      () =>
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(
            points.map((p) => new THREE.Vector3(...p)),
          ),
          24,
          radius,
          6,
          false,
        ),
    ),
    material(color, emission),
    key,
  );
}

/** 每个物种使用独立轮廓、附肢和动作；长度归一与已接受生物管线一致。 */
export function buildMarianaCreature(kind, root, motions) {
  if (!MARIANA_CREATURE_KINDS.has(kind))
    throw new Error(`Unknown Mariana creature: ${kind}`);
  const anatomy = new THREE.Group();
  anatomy.name = `${kind}_anatomy`;
  root.add(anatomy);
  const idol = kind === "moorish_idol",
    snail = kind === "snailfish",
    barrel = kind === "barreleye",
    shark = kind === "goblin_shark",
    dragon = kind === "dragonfish";
  const back = idol
    ? "#eddb92"
    : snail
      ? "#d3a6a4"
      : barrel
        ? "#334e54"
        : shark
          ? "#a18693"
          : "#193640";
  const belly = snail
    ? "#f0d6c6"
    : shark
      ? "#d8b7b6"
      : idol
        ? "#f3e5ac"
        : "#98afb5";
  const w = idol
    ? 0.05
    : snail
      ? 0.13
      : barrel
        ? 0.095
        : shark
          ? 0.085
          : dragon
            ? 0.045
            : 0.067;
  const h = idol
    ? 0.21
    : snail
      ? 0.1
      : barrel
        ? 0.105
        : shark
          ? 0.08
          : dragon
            ? 0.048
            : 0.095;
  const profile = [
    [-0.43, 0.002, 0.003, 0],
    [-0.39, w * 0.5, h * 0.55, 0],
    [-0.28, w, h, 0],
    [-0.1, w * 0.98, h, 0],
    [0.1, w * 0.7, h * 0.74, 0],
    [0.27, w * 0.32, h * 0.36, 0],
    [0.37, w * 0.11, h * 0.14, 0],
    [0.405, 0.002, 0.004, 0],
  ];
  if (shark) {
    profile[0] = [-0.61, 0.002, 0.002, 0.066];
    profile[1] = [-0.48, 0.022, 0.014, 0.057];
    profile.splice(2, 0, [-0.35, 0.057, 0.044, 0.032]);
  }
  if (snail) {
    profile[1] = [-0.395, 0.065, 0.058, 0];
    profile[2] = [-0.28, 0.145, 0.12, 0.015];
  }
  const torso = part(
    anatomy,
    geometry(`${kind}_loft`, () => loft(profile, back, belly, idol)),
    bodyMaterial,
    `${kind}_body`,
  );
  const skinned = bindAxialMotion(torso, motions, {
    amplitude: snail ? 0.17 : shark ? 0.09 : 0.12,
    frequency: snail ? 0.75 : 1,
  });
  const tail = new THREE.Group();
  tail.position.z = 0.37;
  skinned.skeleton.bones[2].add(tail);
  tail.position.z -= 0.25;
  if (snail) {
    ribbon(
      tail,
      "snail_tail",
      [
        [-0.04, 0],
        [0.08, 0.065],
        [0.17, 0.03],
        [0.185, 0],
        [0.17, -0.03],
        [0.08, -0.065],
      ],
      "#c5b1bd",
    );
    ribbon(
      anatomy,
      "snail_dorsal",
      [
        [-0.19, 0.095],
        [0, 0.115],
        [0.23, 0.075],
        [0.39, 0.008],
        [0.23, 0.03],
        [0, 0.055],
      ],
      "#c6aabd",
    );
    ribbon(
      anatomy,
      "snail_anal",
      [
        [-0.12, -0.07],
        [0.1, -0.073],
        [0.36, -0.025],
        [0.4, -0.008],
        [0.18, -0.012],
      ],
      "#d5b5b8",
    );
  } else {
    ribbon(
      tail,
      `${kind}_tail`,
      [
        [0, 0],
        [0.13, shark ? 0.18 : 0.115],
        [0.08, shark ? 0.055 : 0.035],
        [0.14, -0.095],
        [0.025, -0.035],
      ],
      back,
    );
    ribbon(
      anatomy,
      `${kind}_dorsal`,
      shark
        ? [
            [-0.03, 0.07],
            [0.015, 0.107],
            [0.08, 0.114],
            [0.145, 0.074],
          ]
        : [
            [-0.16, h * 0.85],
            [-0.04, h * (idol ? 1.45 : 1.65)],
            [0.19, h * 0.7],
            [0.28, h * 0.28],
          ],
      back,
    );
    ribbon(
      anatomy,
      `${kind}_anal`,
      [
        [0.06, -h * 0.7],
        [0.23, -h * (idol ? 1.32 : 1.15)],
        [0.29, -h * 0.22],
      ],
      back,
    );
  }
  for (const side of [-1, 1]) {
    const z = barrel ? -0.27 : shark ? -0.285 : -0.315,
      y = barrel ? 0.008 : shark ? 0.041 : h * 0.37,
      ex = sampleSection(profile, z)[0];
    if (!barrel) {
      const r = shark ? 0.012 : snail ? 0.016 : 0.024;
      oval(
        anatomy,
        [side * ex * 0.94, y, z],
        [r * 0.7, r, r],
        "#b9ac78",
        `${kind}_iris`,
      );
      oval(
        anatomy,
        [side * (ex * 0.94 + r * 0.5), y, z - 0.002],
        [r * 0.28, r * 0.72, r * 0.72],
        "#08151c",
        `${kind}_pupil`,
      );
      oval(
        anatomy,
        [side * (ex * 0.94 + r * 0.71), y + r * 0.29, z - r * 0.25],
        [r * 0.11, r * 0.17, r * 0.17],
        "#e3ece5",
        `${kind}_glint`,
      );
    }
    const fin = new THREE.Group();
    anatomy.add(fin);
    fin.position.set(side * w * 0.85, -h * 0.13, -0.17);
    const reach = snail ? 0.2 : barrel ? 0.19 : shark ? 0.2 : 0.13;
    ribbon(
      fin,
      `${kind}_pectoral_${side}`,
      [
        [-0.04, 0],
        [0.065, side * reach],
        [0.16, side * reach * 0.68],
        [0.05, side * 0.018],
      ],
      snail ? "#e0c3c3" : back,
      "horizontal",
    );
    for (let j = 1; j <= 5; j++)
      filament(
        fin,
        `${kind}_finray_${side}_${j}`,
        [
          [0, 0, 0],
          [side * reach * 0.42, 0, 0.02 + j * 0.012],
          [side * reach * (0.6 + j * 0.055), 0, 0.035 + j * 0.017],
        ],
        0.0011,
        belly,
      );
    motions.push((t, e) => {
      fin.rotation.z =
        side * (0.12 + Math.sin(t * 0.8 + side) * 0.16 * Math.min(e, 1.5));
    });
    if (shark)
      for (let i = 0; i < 5; i++)
        filament(
          anatomy,
          `goblin_gill_${side}_${i}`,
          [
            [side * 0.075, 0.043, -0.24 + i * 0.015],
            [side * 0.087, 0.005, -0.235 + i * 0.015],
            [side * 0.072, -0.045, -0.23 + i * 0.015],
          ],
          0.0024,
          "#634453",
        );
    if (dragon || kind === "lanternfish")
      for (let i = 0; i < 15; i++) {
        const z = -0.22 + i * 0.033,
          r = sampleSection(profile, z)[0];
        oval(
          anatomy,
          [side * r * 0.9, -sampleSection(profile, z)[1] * 0.43, z],
          [0.005, 0.004, 0.006],
          "#73e1ea",
          `${kind}_photophore`,
          1.5,
        );
      }
  }
  if (shark)
    ribbon(
      anatomy,
      "goblin_second_dorsal",
      [
        [0.2, 0.044],
        [0.245, 0.082],
        [0.3, 0.071],
        [0.33, 0.025],
      ],
      back,
    );
  // 鳃盖线与鳍条沿真实体表附着，避免只剩光滑的轮廓块。
  for (const side of [-1, 1]) {
    if (!shark)
      filament(
        anatomy,
        `${kind}_operculum_${side}`,
        [-0.13, -0.19, -0.22].map((z, i) => [
          side * sampleSection(profile, z)[0] * 0.985,
          (1 - i) * h * 0.52,
          z,
        ]),
        0.0017,
        idol ? "#c9b779" : "#596b71",
      );
  }
  if (idol) {
    ribbon(
      anatomy,
      "idol_streamer_membrane",
      [
        [-0.17, 0.19],
        [-0.13, 0.35],
        [0.015, 0.437],
        [0.23, 0.36],
        [0.43, 0.265],
        [0.23, 0.345],
        [0.01, 0.422],
        [-0.15, 0.19],
      ],
      "#f6efd5",
    );
    filament(
      anatomy,
      "idol_streamer",
      [
        [0, 0.19, -0.16],
        [0, 0.37, -0.14],
        [0, 0.44, 0.02],
        [0, 0.36, 0.26],
        [0, 0.26, 0.45],
      ],
      0.0026,
      "#f2e9c6",
    );
    oval(
      anatomy,
      [0, 0, -0.427],
      [0.019, 0.024, 0.027],
      "#e6c478",
      "idol_tubular_mouth",
    );
  }
  if (barrel) {
    const key = "barreleye_dome";
    if (!materialCache.has(key))
      materialCache.set(
        key,
        new THREE.MeshPhysicalMaterial({
          color: 0xaadbd3,
          transparent: true,
          opacity: 0.28,
          roughness: 0.13,
          metalness: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
          clearcoat: 1,
        }),
      );
    const dome = part(
      anatomy,
      geometry(
        "dome",
        () =>
          new THREE.SphereGeometry(
            1,
            32,
            24,
            0,
            Math.PI * 2,
            0,
            Math.PI * 0.62,
          ),
      ),
      materialCache.get(key),
      key,
      [0, 0.057, -0.26],
      [0.105, 0.135, 0.135],
    );
    dome.renderOrder = 2;
    for (const side of [-1, 1]) {
      oval(
        anatomy,
        [side * 0.039, 0.105, -0.255],
        [0.027, 0.065, 0.029],
        "#72af65",
        "barreleye_tubular_eye",
      );
      oval(
        anatomy,
        [side * 0.039, 0.167, -0.262],
        [0.023, 0.009, 0.023],
        "#b5e393",
        "barreleye_upward_lens",
        0.2,
      );
      oval(
        anatomy,
        [side * 0.034, 0.035, -0.391],
        [0.012, 0.009, 0.009],
        "#0c2025",
        "barreleye_olfactory_organ",
      );
    }
  }
  if (shark || dragon) {
    const jaw = new THREE.Group();
    jaw.name = `${kind}_articulated_jaw`;
    anatomy.add(jaw);
    jaw.position.set(0, -h * 0.37, -0.29);
    oval(
      jaw,
      [0, -0.008, -0.042],
      [w * 0.72, h * 0.27, 0.095],
      shark ? "#c899a2" : "#293647",
      `${kind}_mandible`,
    );
    oval(
      anatomy,
      [0, -h * 0.19, -0.367],
      [w * 0.68, h * 0.13, 0.025],
      "#311e30",
      `${kind}_mouth_cavity`,
    );
    for (const side of [-1, 1])
      for (let j = 0; j < 7; j++) {
        const tooth = part(
          jaw,
          geometry(
            `${kind}_tooth_${j % 3}`,
            () => new THREE.ConeGeometry(0.0028, 0.019 + (j % 3) * 0.007, 7),
          ),
          material("#d8d9c5"),
          `${kind}_needle_tooth`,
          [side * w * (0.3 + j * 0.049), 0.016, -0.105 + j * 0.018],
        );
        tooth.rotation.z = side * 0.17;
      }
    motions.push((t) => {
      jaw.rotation.x = -0.035 - Math.sin(t * 0.7) * 0.045;
    });
    if (dragon) {
      const whisker = new THREE.Group();
      anatomy.add(whisker);
      filament(
        whisker,
        "dragonfish_barbel",
        [
          [0, -0.03, -0.37],
          [0, -0.12, -0.42],
          [0, -0.15, -0.52],
          [0, -0.1, -0.58],
        ],
        0.0025,
        "#94b2b8",
      );
      oval(
        whisker,
        [0, -0.1, -0.58],
        [0.011, 0.009, 0.011],
        "#92eae1",
        "dragonfish_barbel_tip",
        1.5,
      );
      motions.push((t) => {
        whisker.rotation.z = Math.sin(t * 0.45) * 0.07;
      });
    }
  } else {
    filament(
      anatomy,
      `${kind}_mouth`,
      [
        [-w * 0.4, -h * 0.15, -0.401],
        [0, -h * 0.22, -0.431],
        [w * 0.4, -h * 0.15, -0.401],
      ],
      0.0025,
      "#4a4448",
    );
  }
  // 长背鳍与臀鳍复用躯干骨骼，避免摆尾时鳍根与身体分离。
  for (const fin of [...anatomy.children]) {
    if (!fin.isMesh || fin.isSkinnedMesh || !/dorsal|anal$/.test(fin.name))
      continue;
    const g = fin.geometry;
    if (!g.getAttribute("skinIndex")) {
      const indices = [],
        weights = [],
        positions = g.getAttribute("position");
      for (let i = 0; i < positions.count; i++) {
        const t = THREE.MathUtils.smoothstep(positions.getZ(i), 0.035, 0.38);
        indices.push(0, 1, 2, 0);
        weights.push((1 - t) ** 2, 2 * t * (1 - t), t * t, 0);
      }
      g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(indices, 4));
      g.setAttribute(
        "skinWeight",
        new THREE.Float32BufferAttribute(weights, 4),
      );
    }
    const attached = new THREE.SkinnedMesh(g, fin.material);
    attached.name = fin.name;
    attached.userData.keepSeparate = true;
    attached.bind(skinned.skeleton, skinned.bindMatrix);
    anatomy.remove(fin);
    anatomy.add(attached);
  }
  anatomy.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(anatomy),
    scale = 1 / box.getSize(new THREE.Vector3()).z;
  anatomy.scale.setScalar(scale);
  anatomy.position
    .copy(box.getCenter(new THREE.Vector3()))
    .multiplyScalar(-scale);
  root.userData.marianaAnatomy = kind;
  root.userData.normalizedLength = 1;
}

/** 连续截面网格：封闭首尾、背腹渐变与镰鱼条纹均直接附着在体表。 */
function loft(profile, back, belly, striped) {
  const p = [],
    c = [],
    idx = [],
    a = new THREE.Color(back),
    b = new THREE.Color(belly),
    dark = new THREE.Color("#17282d"),
    col = new THREE.Color();
  const rings = 56,
    sides = 32;
  for (let i = 0; i <= rings; i++) {
    const z = THREE.MathUtils.lerp(profile[0][0], profile.at(-1)[0], i / rings),
      [rx, ry, cy] = sampleSection(profile, z);
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2,
        x = Math.cos(angle) * rx,
        y = Math.sin(angle) * ry + cy;
      p.push(x, y, z);
      col
        .copy(b)
        .lerp(a, THREE.MathUtils.smoothstep(Math.sin(angle), -0.35, 0.65));
      if (striped) {
        const stripe =
          Math.abs(z + 0.22 + y * 0.26) < 0.048 ||
          Math.abs(z - 0.075 + y * 0.3) < 0.068;
        if (stripe) col.copy(dark);
      }
      col.toArray(c, c.length);
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < sides; j++) {
      const k = i * (sides + 1) + j,
        n = k + sides + 1;
      idx.push(k, k + 1, n, n, k + 1, n + 1);
    }
  for (const row of [0, rings]) {
    const n = p.length / 3,
      z = profile[row === 0 ? 0 : profile.length - 1][0];
    p.push(0, sampleSection(profile, z)[2], z);
    a.toArray(c, c.length);
    for (let j = 0; j < sides; j++) {
      const v = row * (sides + 1) + j;
      idx.push(...(row === 0 ? [n, v + 1, v] : [n, v, v + 1]));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
