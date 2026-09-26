import * as THREE from "three";

export const EXTRA_CREATURE_KINDS = new Set([
  "squid",
  "dunkleosteus",
  "mayan",
  "hydra",
  "kraken",
  "seagull",
]);

/**
 * 构建扩展生物的归一化模型，供 createCreature 统一缩放及更新动画。
 * @param {string} kind 扩展生物名称。
 * @param {THREE.Group} root 模型根节点，前进方向为 -Z。
 * @param {Function[]} motions 动作回调列表，参数为累计游泳相位和速度强度。
 * @returns {void} 模型直接添加到 root。
 */
export function buildExtraCreature(kind, root, motions) {
  if (kind === "squid") buildSquid(root, motions);
  else if (kind === "kraken") buildKraken(root, motions);
  else if (kind === "dunkleosteus") buildDunkleosteus(root, motions);
  else if (kind === "mayan") buildMayan(root, motions);
  else if (kind === "hydra") buildHydra(root, motions);
  else if (kind === "seagull") buildSeagull(root, motions);
}

const CACHE = new Map();
const SPHERE = new THREE.SphereGeometry(1, 14, 10);
const FACET = new THREE.IcosahedronGeometry(1, 1);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const M = {
  squid: material("#a05d66", 0.48),
  squidFin: material("#b57d87", 0.55),
  kraken: material("#283047", 0.44),
  krakenRidge: material("#514967", 0.55),
  sucker: material("#b994b6", 0.62),
  armor: material("#6b7776", 0.63),
  armorDark: material("#35444c", 0.55),
  bone: material("#c4c9ab", 0.5),
  jade: material("#237c74", 0.42),
  jadeDark: material("#164d50", 0.55),
  gold: material("#b9984c", 0.39, "#554016", 0.18),
  hydra: material("#254951", 0.43),
  hydraFin: material("#477c7b", 0.58),
  white: material("#e2e9df", 0.65),
  gray: material("#929f9f", 0.7),
  wingtip: material("#23343e", 0.65),
  yellow: material("#deab49", 0.5),
  black: material("#040a11", 0.4),
  glow: material("#7ee6cf", 0.32, "#25cdbb", 1.7),
  amber: material("#ffcb77", 0.3, "#ff8d24", 1.8),
  violet: material("#a886e2", 0.4, "#7947d7", 1.3),
};

function buildSquid(root, motions) {
  add(
    root,
    cached("squid_mantle", () =>
      form([
        [-0.49, 0.003, 0.004],
        [-0.43, 0.04, 0.052],
        [-0.31, 0.068, 0.082],
        [-0.15, 0.061, 0.074],
        [-0.045, 0.048, 0.049],
        [0.01, 0.035, 0.037],
      ]),
    ),
    M.squid,
  );
  for (const side of [-1, 1]) {
    fin(
      root,
      [
        [0, 0, -0.46],
        [side * 0.175, 0.002, -0.28],
        [side * 0.089, -0.003, -0.105],
        [0, 0, -0.17],
      ],
      M.squidFin,
    );
    blob(root, M.black, [side * 0.056, 0, -0.072], [0.015, 0.026, 0.028]);
    blob(root, M.bone, [side * 0.068, 0, -0.074], [0.005, 0.014, 0.016]);
    blob(root, M.black, [side * 0.073, 0, -0.077], [0.002, 0.011, 0.008]);
  }
  for (let index = 0; index < 8; index++) {
    const angle = (index / 8) * Math.PI * 2;
    const c = Math.cos(angle),
      s = Math.sin(angle);
    const arm = new THREE.Group();
    arm.position.set(c * 0.025, s * 0.025, -0.008);
    root.add(arm);
    add(
      arm,
      cached(`squid_arm_${index}`, () =>
        tendril(
          [
            [0, 0, 0],
            [c * 0.06, s * 0.058, 0.075],
            [c * 0.11, s * 0.09, 0.19],
            [c * 0.081, s * 0.085, 0.27],
            [c * 0.04, s * 0.072, 0.25],
          ],
          0.012,
          0.0015,
        ),
      ),
      M.squid,
    );
    motions.push((t) => {
      arm.rotation.z = Math.sin(t * 0.48 + angle) * 0.17;
    });
  }
  // 两条捕食触腕显著长于八条普通腕，末端具有扁平触腕穗。
  for (const side of [-1, 1]) {
    const tentacle = new THREE.Group();
    tentacle.position.set(side * 0.02, -0.015, -0.01);
    root.add(tentacle);
    add(
      tentacle,
      cached(`squid_long_arm_${side}`, () =>
        tendril(
          [
            [0, 0, 0],
            [side * 0.086, -0.054, 0.18],
            [side * 0.13, -0.07, 0.35],
            [side * 0.12, -0.041, 0.475],
          ],
          0.009,
          0.004,
        ),
      ),
      M.squidFin,
    );
    blob(
      tentacle,
      M.squidFin,
      [side * 0.12, -0.04, 0.466],
      [0.019, 0.009, 0.051],
    );
    for (let index = 0; index < 7; index++) {
      blob(
        tentacle,
        M.sucker,
        [side * 0.12, -0.049, 0.43 + index * 0.011],
        [0.006, 0.003, 0.004],
      );
    }
    motions.push((t) => {
      tentacle.rotation.y = Math.sin(t * 0.42 + side) * 0.11;
      tentacle.rotation.x = Math.cos(t * 0.36) * 0.06;
    });
  }
}

function buildKraken(root, motions) {
  // 粗壮球形头胸和宽展的八条腕，与纺锤形大王乌贼保持清楚区别。
  add(
    root,
    cached("kraken_overlord", () =>
      form([
        [-0.48, 0.025, 0.031],
        [-0.39, 0.123, 0.155],
        [-0.23, 0.19, 0.205],
        [-0.055, 0.18, 0.157],
        [0.065, 0.115, 0.103],
        [0.12, 0.07, 0.072],
      ]),
    ),
    M.kraken,
  );
  for (const side of [-1, 1]) {
    blob(root, M.black, [side * 0.165, 0.01, -0.122], [0.047, 0.052, 0.057]);
    blob(root, M.amber, [side * 0.202, 0.012, -0.135], [0.011, 0.036, 0.029]);
    blob(root, M.black, [side * 0.211, 0.012, -0.139], [0.004, 0.029, 0.006]);
    for (let row = 0; row < 6; row++) {
      const z = -0.36 + row * 0.065;
      fin(
        root,
        [
          [side * 0.035, 0.13, z - 0.025],
          [side * 0.08, 0.235 - row * 0.008, z],
          [side * 0.145, 0.11, z + 0.048],
        ],
        row % 3 === 0 ? M.violet : M.krakenRidge,
      );
    }
  }
  blob(root, M.black, [0, -0.06, 0.093], [0.064, 0.052, 0.047]);
  for (let index = 0; index < 8; index++) {
    const angle = (index / 8) * Math.PI * 2;
    const c = Math.cos(angle),
      s = Math.sin(angle);
    const arm = new THREE.Group();
    arm.position.set(c * 0.09, s * 0.079, 0.04);
    root.add(arm);
    const points = [
      [0, 0, 0],
      [c * 0.16, s * 0.15, 0.095],
      [c * 0.31, s * 0.28, 0.24],
      [c * 0.4, s * 0.35, 0.38],
      [c * 0.34, s * 0.29, 0.455],
      [c * 0.24, s * 0.22, 0.395],
    ];
    add(
      arm,
      cached(`kraken_overlord_arm_${index}`, () =>
        tendril(points, 0.038, 0.002),
      ),
      M.kraken,
    );
    const curve = curveFrom(points);
    for (let j = 1; j < 11; j++) {
      const p = curve.getPoint(j / 13);
      const size = 0.015 * (1 - j / 15);
      blob(
        arm,
        M.sucker,
        [p.x - c * 0.022, p.y - s * 0.022, p.z + 0.005],
        [size, size * 0.6, size],
      );
    }
    motions.push((t) => {
      arm.rotation.z = Math.sin(t * 0.32 + angle) * 0.16;
      arm.rotation.x = Math.cos(t * 0.36 + angle) * 0.11;
      arm.rotation.y = Math.sin(t * 0.29 + angle) * 0.13;
    });
  }
}

function buildDunkleosteus(root, motions) {
  add(
    root,
    cached("dunkleosteus_body", () =>
      form([
        [-0.44, 0.08, 0.073],
        [-0.3, 0.17, 0.173],
        [-0.12, 0.153, 0.158],
        [0.11, 0.074, 0.095],
        [0.31, 0.016, 0.033],
        [0.37, 0.009, 0.019],
      ]),
    ),
    M.armorDark,
  );
  const forehead = blob(
    root,
    M.armor,
    [0, 0.052, -0.28],
    [0.176, 0.157, 0.228],
    true,
  );
  forehead.rotation.x = -0.1;
  for (const side of [-1, 1]) {
    blob(
      root,
      M.armor,
      [side * 0.118, -0.017, -0.245],
      [0.062, 0.109, 0.145],
      true,
    );
    blob(root, M.black, [side * 0.146, 0.049, -0.382], [0.019, 0.024, 0.025]);
    blob(root, M.amber, [side * 0.158, 0.049, -0.385], [0.004, 0.012, 0.01]);
    fin(
      root,
      [
        [side * 0.13, -0.07, -0.19],
        [side * 0.3, -0.107, 0.055],
        [side * 0.123, -0.068, 0.003],
      ],
      M.armorDark,
    );
    fin(
      root,
      [
        [side * 0.025, 0.158, -0.35],
        [side * 0.13, 0.117, -0.265],
        [side * 0.151, 0.017, -0.107],
        [side * 0.027, 0.12, -0.15],
      ],
      M.bone,
    );
  }
  blob(root, M.black, [0, -0.045, -0.449], [0.105, 0.042, 0.026]);
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.083, -0.298);
  root.add(jaw);
  blob(jaw, M.armor, [0, -0.009, -0.06], [0.111, 0.04, 0.153], true);
  for (const side of [-1, 1]) {
    fin(
      jaw,
      [
        [side * 0.052, 0.002, -0.07],
        [side * 0.079, 0.072, -0.148],
        [side * 0.023, 0.003, -0.16],
      ],
      M.bone,
    );
  }
  motions.push((t) => {
    jaw.rotation.x = -0.03 + Math.sin(t * 0.4) * 0.035;
  });
  fin(
    root,
    [
      [0, 0.099, -0.045],
      [0, 0.2, 0.126],
      [0, 0.028, 0.262],
    ],
    M.armorDark,
  );
  swimmingTail(root, motions, M.armorDark, 0.31);
}

function buildMayan(root, motions) {
  add(
    root,
    cached("mayan_body", () =>
      form([
        [-0.45, 0.065, 0.06],
        [-0.31, 0.155, 0.143],
        [-0.12, 0.17, 0.145],
        [0.07, 0.113, 0.099],
        [0.29, 0.031, 0.033],
        [0.37, 0.011, 0.016],
      ]),
    ),
    M.jadeDark,
  );
  blob(root, M.jade, [0, 0.021, -0.332], [0.17, 0.12, 0.163], true);
  blob(root, M.black, [0, -0.061, -0.428], [0.12, 0.049, 0.032]);
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.1, -0.31);
  root.add(jaw);
  blob(jaw, M.jade, [0, -0.008, -0.073], [0.13, 0.045, 0.14], true);
  for (let index = -4; index <= 4; index++) {
    spike(
      root,
      M.bone,
      [index * 0.024, -0.038, -0.452],
      [0, -1, -0.1],
      0.006,
      0.034,
    );
    spike(
      jaw,
      M.gold,
      [index * 0.024, 0.032, -0.131],
      [0, 1, -0.05],
      0.005,
      0.025,
    );
  }
  motions.push((t) => {
    jaw.rotation.x = Math.sin(t * 0.28) * 0.055;
  });
  for (const side of [-1, 1]) {
    blob(root, M.black, [side * 0.14, 0.053, -0.37], [0.028, 0.025, 0.037]);
    blob(root, M.amber, [side * 0.158, 0.053, -0.375], [0.008, 0.013, 0.022]);
    for (let plate = 0; plate < 5; plate++) {
      const z = -0.23 + plate * 0.104;
      const width = 0.156 - plate * 0.023;
      const armor = blob(
        root,
        M.jade,
        [side * width * 0.7, 0.047, z],
        [width * 0.47, 0.083 - plate * 0.009, 0.067],
        true,
      );
      armor.rotation.z = side * -0.4;
      for (let step = 0; step < 3; step++) {
        const rune = add(root, BOX, M.gold);
        rune.position.set(
          side * (width + 0.002),
          0.018 + step * 0.017,
          z + step * 0.013,
        );
        rune.scale.set(0.004, 0.009, 0.037 - step * 0.008);
      }
    }
    for (let feather = 0; feather < 5; feather++) {
      const spread = 0.07 + feather * 0.043;
      fin(
        root,
        [
          [side * 0.058, 0.1, -0.275],
          [side * spread, 0.29 - feather * 0.014, -0.29 + feather * 0.025],
          [
            side * (spread + 0.015),
            0.18 - feather * 0.015,
            -0.196 + feather * 0.014,
          ],
          [side * 0.073, 0.089, -0.158],
        ],
        feather % 2 ? M.jade : M.gold,
      );
    }
    fin(
      root,
      [
        [side * 0.14, -0.044, -0.185],
        [side * 0.34, -0.034, 0.05],
        [side * 0.288, -0.012, 0.121],
        [side * 0.103, -0.007, 0.025],
      ],
      M.jade,
    );
  }
  swimmingTail(root, motions, M.jade, 0.31);
}

function buildHydra(root, motions) {
  add(
    root,
    cached("hydra_body", () =>
      form([
        [-0.13, 0.126, 0.106],
        [-0.01, 0.155, 0.118],
        [0.15, 0.111, 0.088],
        [0.29, 0.051, 0.045],
        [0.48, 0.003, 0.005],
      ]),
    ),
    M.hydra,
  );
  for (const side of [-1, 1]) {
    fin(
      root,
      [
        [side * 0.113, 0, -0.08],
        [side * 0.34, 0.044, 0.102],
        [side * 0.27, -0.013, 0.202],
        [side * 0.081, -0.031, 0.115],
      ],
      M.hydraFin,
    );
  }
  for (let index = 0; index < 3; index++) {
    const side = index - 1;
    const head = new THREE.Group();
    head.position.set(side * 0.087, 0.015, -0.055);
    root.add(head);
    add(
      head,
      cached(`hydra_neck_${index}`, () =>
        tendril(
          [
            [0, 0, 0],
            [side * 0.032, 0.096, -0.107],
            [side * 0.079, side === 0 ? 0.23 : 0.142, -0.205],
            [side * 0.097, side === 0 ? 0.2 : 0.124, -0.31],
          ],
          0.049,
          0.045,
        ),
      ),
      M.hydra,
    );
    const tipX = side * 0.097,
      tipY = side === 0 ? 0.2 : 0.124;
    blob(head, M.hydra, [tipX, tipY, -0.354], [0.07, 0.06, 0.117], true);
    blob(head, M.black, [tipX, tipY - 0.026, -0.436], [0.05, 0.03, 0.018]);
    blob(
      head,
      M.hydraFin,
      [tipX, tipY - 0.049, -0.369],
      [0.052, 0.016, 0.084],
      true,
    );
    for (const eyeSide of [-1, 1]) {
      blob(
        head,
        M.amber,
        [tipX + eyeSide * 0.057, tipY + 0.018, -0.384],
        [0.011, 0.012, 0.018],
      );
      spike(
        head,
        M.bone,
        [tipX + eyeSide * 0.045, tipY + 0.066, -0.313],
        [eyeSide * 0.2, 0.7, 0.55],
        0.016,
        0.1,
      );
      for (let tooth = 0; tooth < 3; tooth++) {
        spike(
          head,
          M.bone,
          [tipX + eyeSide * (0.011 + tooth * 0.015), tipY - 0.019, -0.444],
          [0, -1, -0.1],
          0.0035,
          0.024,
        );
      }
    }
    for (let crest = 0; crest < 4; crest++) {
      fin(
        head,
        [
          [tipX, tipY + 0.029, -0.36 + crest * 0.033],
          [tipX, tipY + 0.102, -0.3 + crest * 0.033],
          [tipX, tipY + 0.037, -0.255 + crest * 0.033],
        ],
        crest % 2 ? M.glow : M.hydraFin,
      );
    }
    motions.push((t) => {
      head.rotation.y = Math.sin(t * 0.26 + index * 2) * 0.07;
      head.rotation.x = Math.cos(t * 0.21 + index * 1.7) * 0.045;
    });
  }
  for (let index = 0; index < 7; index++) {
    const z = 0.035 + index * 0.055;
    const height = 0.14 - index * 0.015;
    fin(
      root,
      [
        [0, height * 0.7, z - 0.023],
        [0, height + 0.063, z],
        [0, height * 0.7, z + 0.047],
      ],
      M.glow,
    );
  }
}

function buildSeagull(root, motions) {
  blob(root, M.white, [0, 0, -0.003], [0.111, 0.119, 0.285]);
  blob(root, M.white, [0, 0.111, -0.247], [0.075, 0.085, 0.105]);
  const beak = add(
    root,
    cached("seagull_beak", () => {
      const geometry = new THREE.ConeGeometry(0.034, 0.153, 4);
      geometry.rotateX(-Math.PI / 2);
      return geometry;
    }),
    M.yellow,
  );
  beak.position.set(0, 0.109, -0.39);
  for (const side of [-1, 1]) {
    blob(root, M.black, [side * 0.068, 0.137, -0.284], [0.006, 0.012, 0.011]);
    const wing = new THREE.Group();
    wing.position.set(side * 0.068, 0.046, -0.054);
    root.add(wing);
    fin(
      wing,
      [
        [0, 0, -0.092],
        [side * 0.249, 0.028, -0.094],
        [side * 0.596, -0.017, 0.133],
        [side * 0.64, -0.039, 0.244],
        [side * 0.318, -0.004, 0.177],
        [0, -0.011, 0.115],
      ],
      M.gray,
    );
    for (let index = 0; index < 5; index++) {
      fin(
        wing,
        [
          [side * (0.38 + index * 0.036), -0.013, 0.084 + index * 0.024],
          [side * (0.574 + index * 0.02), -0.04, 0.156 + index * 0.034],
          [side * (0.465 + index * 0.023), -0.025, 0.175 + index * 0.018],
        ],
        M.wingtip,
      );
    }
    motions.push((t) => {
      wing.rotation.z = side * (Math.sin(t * 1.25) * 0.48 - 0.06);
    });
    blob(root, M.yellow, [side * 0.054, -0.109, 0.165], [0.018, 0.009, 0.055]);
  }
  fin(
    root,
    [
      [0, 0, 0.18],
      [-0.12, 0.01, 0.402],
      [0, 0.004, 0.355],
      [0.12, 0.01, 0.402],
    ],
    M.white,
  );
}

function material(
  color,
  roughness,
  emissive = "#000000",
  emissiveIntensity = 0,
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    emissive,
    emissiveIntensity,
    metalness: 0.09,
  });
}

function add(parent, geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  parent.add(mesh);
  return mesh;
}

function blob(parent, material, position, scale, faceted = false) {
  const mesh = add(parent, faceted ? FACET : SPHERE, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  return mesh;
}

function cached(key, build) {
  if (!CACHE.has(key)) CACHE.set(key, build());
  return CACHE.get(key);
}

function curveFrom(points) {
  return new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
}

function tendril(points, startRadius, endRadius) {
  const curve = curveFrom(points);
  const segments = 28;
  const sides = 7;
  const geometry = new THREE.TubeGeometry(curve, segments, 1, sides, false);
  const positions = geometry.attributes.position;
  for (let ring = 0; ring <= segments; ring++) {
    const center = curve.getPointAt(ring / segments);
    const radius = THREE.MathUtils.lerp(
      startRadius,
      endRadius,
      ring / segments,
    );
    for (let side = 0; side <= sides; side++) {
      const index = ring * (sides + 1) + side;
      positions.setXYZ(
        index,
        center.x + (positions.getX(index) - center.x) * radius,
        center.y + (positions.getY(index) - center.y) * radius,
        center.z + (positions.getZ(index) - center.z) * radius,
      );
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

function form(profile) {
  const rings = 38,
    sides = 24;
  const positions = [],
    indices = [];
  for (let ring = 0; ring <= rings; ring++) {
    const z = THREE.MathUtils.lerp(
      profile[0][0],
      profile.at(-1)[0],
      ring / rings,
    );
    let section = 0;
    while (section < profile.length - 2 && z > profile[section + 1][0])
      section++;
    const a = profile[section],
      b = profile[section + 1];
    const progress = THREE.MathUtils.smoothstep(z, a[0], b[0]);
    const width = THREE.MathUtils.lerp(a[1], b[1], progress);
    const height = THREE.MathUtils.lerp(a[2], b[2], progress);
    for (let side = 0; side <= sides; side++) {
      const theta = (side / sides) * Math.PI * 2;
      positions.push(Math.cos(theta) * width, Math.sin(theta) * height, z);
      if (ring < rings && side < sides) {
        const index = ring * (sides + 1) + side;
        indices.push(
          index,
          index + 1,
          index + sides + 1,
          index + sides + 1,
          index + 1,
          index + sides + 2,
        );
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
  return geometry;
}

function fin(parent, points, material) {
  const center = new THREE.Vector3();
  for (const p of points) center.add(new THREE.Vector3(...p));
  center.divideScalar(points.length);
  const positions = [];
  // 两侧分别生成面，既能从上方辨认剪影，也不会因背面剔除而消失。
  for (let index = 0; index < points.length; index++) {
    const a = points[index],
      b = points[(index + 1) % points.length];
    positions.push(
      ...a,
      ...b,
      ...center.toArray(),
      ...b,
      ...a,
      ...center.toArray(),
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.computeVertexNormals();
  return add(parent, geometry, material);
}

function spike(parent, material, position, direction, radius, length) {
  const geometry = new THREE.ConeGeometry(radius, length, 6);
  geometry.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(...direction).normalize(),
    ),
  );
  const mesh = add(parent, geometry, material);
  mesh.position.set(...position);
  return mesh;
}

function swimmingTail(root, motions, material, z) {
  const tail = new THREE.Group();
  tail.position.z = z;
  root.add(tail);
  fin(
    tail,
    [
      [0, 0, 0],
      [0, 0.175, 0.18],
      [0, 0.035, 0.145],
      [0, 0, 0.101],
      [0, -0.16, 0.179],
    ],
    material,
  );
  motions.push((t) => {
    tail.rotation.y = Math.sin(t * 0.8) * 0.22;
  });
}
