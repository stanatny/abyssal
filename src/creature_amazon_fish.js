import * as THREE from "three";
import { bindSerpentineMotion } from "./serpentine_motion.js";
import { bindAxialMotion, sampleSection } from "./creature_surface.js";
import {
  amazonGeometry,
  amazonLoft,
  amazonMesh,
  amazonEyes,
  amazonEllipsoid,
  amazonFin,
  amazonTube,
  amazonSpike,
} from "./amazon_anatomy.js";

// 每种鱼的轮廓、鳍位和花纹按体型分别建模，不能把同一梭形体涂成不同颜色。
const forms = {
  neon_tetra: {
    w: 0.043,
    h: 0.068,
    back: "#2c777a",
    belly: "#d3d7b9",
    fin: "#b3bda5",
    small: true,
  },
  amazon_discus: {
    w: 0.047,
    h: 0.29,
    back: "#a6693d",
    belly: "#da9a63",
    fin: "#8da899",
    disk: true,
  },
  silver_hatchet: {
    w: 0.031,
    h: 0.205,
    back: "#6e827b",
    belly: "#dce1d1",
    fin: "#bac6ba",
    hatchet: true,
    small: true,
  },
  armored_cory: {
    w: 0.092,
    h: 0.083,
    back: "#7d8571",
    belly: "#ceb98d",
    fin: "#9a805c",
    cat: true,
    small: true,
  },
  amazon_pacu: {
    w: 0.105,
    h: 0.22,
    back: "#53605c",
    belly: "#c2b38b",
    fin: "#72694c",
    disk: true,
  },
  red_piranha: {
    w: 0.094,
    h: 0.2,
    back: "#61756c",
    belly: "#cf5534",
    fin: "#813f30",
    disk: true,
    piranha: true,
  },
  silver_arowana: {
    w: 0.043,
    h: 0.077,
    back: "#83a28e",
    belly: "#e0dabc",
    fin: "#afbcb0",
    long: true,
  },
  arapaima: {
    w: 0.076,
    h: 0.106,
    back: "#4c6353",
    belly: "#b4b290",
    fin: "#b84831",
    long: true,
    armor: true,
  },
  flood_arapaima: {
    w: 0.088,
    h: 0.13,
    back: "#445f3f",
    belly: "#c2ac7b",
    fin: "#a4472f",
    long: true,
    armor: true,
  },
  redtail_catfish: {
    w: 0.119,
    h: 0.092,
    back: "#343f39",
    belly: "#d8d0ab",
    fin: "#c8492b",
    cat: true,
  },
  electric_eel: {
    w: 0.023,
    h: 0.027,
    back: "#3b4132",
    belly: "#b69b52",
    fin: "#9a864c",
    eel: true,
    long: true,
  },
};
export function buildAmazonFish(kind, parent, motions) {
  const f = forms[kind],
    w = f.w,
    h = f.h;
  let profile;
  if (f.eel)
    profile = [
      [-0.5, 0.012, 0.016],
      [-0.48, w * 0.86, h * 0.82],
      [-0.42, w, h],
      [0.12, w * 0.91, h * 0.85],
      [0.37, w * 0.61, h * 0.56],
      [0.49, 0.005, 0.009],
      [0.54, 0.0001, 0.0001],
    ];
  else if (f.disk)
    profile = [
      [-0.47, 0.01, 0.018],
      [-0.44, w * 0.4, h * 0.14],
      [-0.36, w * 0.78, h * 0.65],
      [-0.21, w, h * 0.96],
      [-0.03, w * 0.97, h],
      [0.14, w * 0.73, h * 0.76],
      [0.31, 0.015, 0.039],
      [0.39, 0.005, 0.018],
    ];
  else if (f.hatchet)
    profile = [
      [-0.45, 0.009, 0.016, 0.036],
      [-0.34, w * 0.92, h * 0.62, -0.053],
      [-0.2, w, h, -0.071],
      [0.02, w * 0.8, h * 0.86, -0.07],
      [0.22, w * 0.56, h * 0.4, -0.033],
      [0.34, 0.009, 0.025, 0],
      [0.38, 0.005, 0.018, 0],
    ];
  else if (f.cat)
    profile = [
      [-0.48, w * 0.47, h * 0.18, -0.008],
      [-0.44, w * 0.87, h * 0.47, 0],
      [-0.32, w, h * 0.72, 0],
      [-0.18, w * 0.88, h, 0],
      [0.08, w * 0.74, h * 0.91, 0],
      [0.28, w * 0.38, h * 0.49, 0],
      [0.39, 0.012, 0.026, 0],
    ];
  else
    profile = [
      [-0.49, w * 0.27, h * 0.23, 0.012],
      [-0.45, w * 0.67, h * 0.53, 0.008],
      [-0.34, w * 0.94, h * 0.94, 0],
      [-0.15, w, h, 0],
      [0.1, w * 0.88, h * 0.89, 0],
      [0.29, w * 0.54, h * 0.53, 0],
      [0.4, 0.012, 0.024, 0],
    ];
  const rings = f.small ? 48 : 72,
    sides = f.small ? 22 : 32;
  const geo = amazonLoft(
    `${kind}_sculpted_body_v2`,
    profile,
    f.back,
    f.belly,
    (x, y, z) => {
      if (kind === "amazon_discus")
        return (
          (Math.sin(z * 57 + Math.sin(y * 12)) > 0.6 ? 0.52 : 0) +
          (Math.sin(z * 145 + y * 85) > 0.85 ? 0.15 : 0)
        );
      if (kind === "armored_cory")
        return Math.sin(z * 70 + x * 70) * Math.cos(y * 100) > 0.25 ? 0.43 : 0;
      if (f.cat)
        return y > h * 0.3 && Math.sin(z * 250) * Math.cos(x * 340) > 0.54
          ? 0.5
          : 0;
      return 0;
    },
    rings,
    sides,
  );
  // 鳞缘、红尾和霓虹带直接沿连续肌肉曲面着色。
  const pos = geo.attributes.position,
    col = geo.attributes.color,
    c = new THREE.Color(),
    accent = new THREE.Color(),
    scratch = new THREE.Color("#aaa382");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    c.fromBufferAttribute(col, i);
    if (f.armor || kind === "silver_arowana") {
      const row = Math.floor((y / h) * 12),
        u = ((z + 0.5) * 58 + row * 0.5) % 1,
        edge = THREE.MathUtils.smoothstep(u, 0.67, 0.95);
      c.lerp(scratch, edge * 0.32);
      if (f.armor && z > -0.01)
        c.lerp(accent.set("#bc3e25"), Math.max(0, z) * 1.25 * edge);
    }
    if (kind === "neon_tetra") {
      if (Math.abs(y - 0.014) < 0.011 && Math.abs(x) > 0.017)
        c.lerp(accent.set("#3dccdb"), 0.94);
      if (y < 0.004 && z > -0.08) c.lerp(accent.set("#ba2d27"), 0.88);
    }
    if (
      kind === "redtail_catfish" &&
      Math.abs(y + 0.022) < 0.019 &&
      Math.abs(x) > w * 0.5
    )
      c.lerp(accent.set("#dfd9b8"), 0.9);
    if (
      kind === "amazon_discus" &&
      Math.sin(y * 83 + Math.sin(z * 83) * 1.5) > 0.52
    )
      c.lerp(accent.set("#54a8a1"), 0.7);
    if (
      kind === "armored_cory" &&
      Math.abs(x) > w * 0.55 &&
      z > -0.25 &&
      z < 0.29
    ) {
      const row = y > 0 ? 1 : 0,
        phase = ((z + 0.3) * 17 + row * 0.5) % 1;
      pos.setX(i, x * (1 + Math.sin(phase * Math.PI) * 0.028));
      if (phase < 0.15) c.multiplyScalar(0.7);
    }
    c.toArray(col.array, i * 3);
  }
  geo.computeVertexNormals();
  const torso = amazonMesh(
    parent,
    geo,
    "#ffffff",
    [0, 0, 0],
    "sculpted_scaled_torso",
    true,
  );
  const eelMotion = {
    headZ: -0.35,
    tailZ: 0.535,
    segments: 16,
    amplitude: 0.4,
    frequency: 1.13,
    waves: 1.25,
  };
  const swimmingSkin = f.eel
    ? bindSerpentineMotion(torso, motions, eelMotion)
    : bindAxialMotion(torso, motions, {
        amplitude: f.long ? 0.095 : 0.075,
        frequency: f.small ? 1.7 : 1.13,
      });
  const eyeZ = f.eel ? -0.46 : f.cat ? -0.373 : -0.376,
    [eyeWidth, eyeHeight, eyeOffset] = sampleSection(profile, eyeZ);
  amazonEyes(
    parent,
    eyeWidth * 0.965,
    eyeOffset + eyeHeight * 0.31,
    eyeZ,
    f.small ? 0.0105 : f.disk ? 0.017 : 0.0125,
    f.piranha ? "#c46326" : "#a98949",
  );
  const head = new THREE.Group();
  parent.add(head);
  const mouthY = f.long ? h * 0.1 : f.cat ? -h * 0.22 : -h * 0.04;
  amazonEllipsoid(
    head,
    "#242820",
    [0, mouthY, -0.474],
    [w * 0.43, 0.004, 0.012],
    "oral_opening",
  );
  amazonTube(
    head,
    kind + "_upper_lip",
    [
      [-w * 0.39, mouthY + 0.002, -0.47],
      [0, mouthY + 0.009, -0.486],
      [w * 0.39, mouthY + 0.002, -0.47],
    ],
    0.0038,
    f.cat ? "#c5b78c" : f.back,
  );
  const jaw = new THREE.Group();
  jaw.position.set(0, mouthY, -0.425);
  head.add(jaw);
  amazonEllipsoid(
    jaw,
    f.belly,
    [0, -0.006, -0.037],
    [w * 0.41, 0.011, 0.045],
    "mandible",
  );
  motions.push((t) => {
    jaw.rotation.x = -(0.028 + Math.sin(t * 0.6) * 0.026);
  });
  if (f.piranha)
    for (let i = 0; i < 7; i++)
      amazonSpike(
        head,
        `piranha_incisor_${i}`,
        [
          [(i - 3) * 0.007, mouthY + 0.005, -0.482],
          [(i - 3) * 0.007, mouthY - 0.005, -0.484],
          [(i - 3) * 0.007, mouthY - 0.009, -0.479],
        ],
        0.0035,
        "#d6ccac",
      );
  for (const side of [-1, 1]) {
    const gz = f.cat ? -0.235 : -0.24,
      [gw, gh, gcy] = sampleSection(profile, gz);
    amazonTube(
      head,
      `${kind}_gill_cover_${side}`,
      [
        [side * gw * 0.77, gcy + gh * 0.65, gz - 0.025],
        [side * gw * 1.008, gcy + gh * 0.12, gz],
        [side * gw * 0.85, gcy - gh * 0.55, gz + 0.025],
      ],
      0.0023,
      "#2e4238",
    );
    for (let i = 0; i < 3; i++)
      amazonTube(
        head,
        `${kind}_gill_ridge_${side}_${i}`,
        [
          [side * gw * 0.92, gcy + gh * 0.3, gz + 0.006 + i * 0.01],
          [side * gw * 0.99, gcy, gz + 0.012 + i * 0.01],
          [side * gw * 0.93, gcy - gh * 0.24, gz + 0.02 + i * 0.01],
        ],
        0.0011,
        f.belly,
      );
    const fin = new THREE.Group();
    fin.position.set(side * gw * 0.82, -h * 0.15, -0.24);
    parent.add(fin);
    const span = f.hatchet ? 0.24 : f.cat ? 0.18 : f.disk ? 0.14 : 0.12;
    amazonFin(
      fin,
      `${kind}_ray_pectoral_${side}`,
      [
        [0, 0],
        [0.035, side * span * 0.52],
        [0.17, side * span],
        [0.21, side * span * 0.7],
        [0.19, side * span * 0.25],
        [0.065, side * 0.016],
      ],
      f.fin,
      "horizontal",
    );
    motions.push((t, e) => {
      fin.rotation.z = side * (0.12 + Math.sin(t * 1.4) * 0.13);
      fin.rotation.y = side * Math.sin(t * 1.25) * 0.14 * (0.5 + e * 0.2);
    });
    if (f.cat || kind === "silver_arowana")
      for (let i = 0; i < (f.cat ? 3 : 1); i++)
        amazonTube(
          head,
          `${kind}_barbel_v2_${side}_${i}`,
          [
            [side * w * 0.37, -h * 0.1, -0.465],
            [side * (w + 0.025 + i * 0.025), -h * 0.35, -0.525],
            [side * (w + 0.065 + i * 0.034), -h * 0.48, -0.48],
          ],
          0.0019,
          "#c6c0a0",
        );
  }
  if (!f.eel) {
    // 鳍根按同一真实截面埋入肌肉；共用本实例骨架，弯尾时不会与躯干分离。
    const fitRoot = (outline, upper) => {
      const last = outline.reduce(
          (best, point, i) => (point[0] > outline[best][0] ? i : best),
          0,
        ),
        edge = outline.slice(0, last + 1).map((p) => [...p]),
        start = edge[0][0],
        end = edge.at(-1)[0],
        yAt = (z) => {
          const [, ry, cy] = sampleSection(profile, z);
          return cy + (upper ? 1 : -1) * ry * 0.93;
        };
      edge[0][1] = yAt(start);
      edge.at(-1)[1] = yAt(end);
      for (let i = 3; i > 0; i--) {
        const z = THREE.MathUtils.lerp(start, end, i / 4);
        edge.push([z, yAt(z)]);
      }
      return edge;
    };
    const bindFin = (mesh) => {
      const g = mesh.geometry;
      if (!g.getAttribute("skinIndex")) {
        const indices = [],
          weights = [];
        for (let i = 0; i < g.attributes.position.count; i++) {
          const t = THREE.MathUtils.smoothstep(
            g.attributes.position.getZ(i),
            0.035,
            0.38,
          );
          indices.push(0, 1, 2, 0);
          weights.push((1 - t) ** 2, 2 * t * (1 - t), t * t, 0);
        }
        g.setAttribute(
          "skinIndex",
          new THREE.Uint16BufferAttribute(indices, 4),
        );
        g.setAttribute(
          "skinWeight",
          new THREE.Float32BufferAttribute(weights, 4),
        );
      }
      const fin = new THREE.SkinnedMesh(g, mesh.material);
      fin.name = mesh.name;
      fin.userData.keepSeparate = true;
      parent.remove(mesh);
      parent.add(fin);
      fin.bind(swimmingSkin.skeleton, swimmingSkin.bindMatrix);
      g.computeBoundingSphere();
      fin.boundingSphere = g.boundingSphere.clone();
      fin.boundingSphere.radius += 0.035;
      return fin;
    };
    const dorsal = f.long
      ? [
          [-0.01, h * 0.73],
          [0.15, h * 1.32],
          [0.34, h * 0.92],
          [0.39, h * 0.34],
          [0.13, h * 0.36],
        ]
      : f.hatchet
        ? [
            [0.04, 0.068],
            [0.12, 0.132],
            [0.24, 0.071],
            [0.29, 0.025],
          ]
        : [
            [-0.27, h * 0.76],
            [-0.2, h * 1.27],
            [-0.07, h * 1.35],
            [0.14, h * 1.03],
            [0.32, h * 0.36],
            [0.09, h * 0.47],
          ];
    bindFin(
      amazonFin(
        parent,
        `${kind}_sculpted_dorsal`,
        fitRoot(dorsal, true),
        f.fin,
      ),
    );
    bindFin(
      amazonFin(
        parent,
        `${kind}_sculpted_anal`,
        fitRoot(
          f.hatchet
            ? [
                [-0.23, -0.24],
                [0.1, -0.29],
                [0.29, -0.05],
                [0.18, -0.035],
              ]
            : f.long
              ? [
                  [0.03, -h * 0.66],
                  [0.14, -h * 1.16],
                  [0.37, -h * 0.61],
                  [0.36, -h * 0.26],
                ]
              : [
                  [-0.13, -h * 0.85],
                  [0.07, -h * 1.25],
                  [0.26, -h * 0.52],
                  [0.29, -h * 0.25],
                ],
          false,
        ),
        f.fin,
      ),
    );
    const tail = new THREE.Group();
    tail.position.z = 0.355 - 0.25;
    swimmingSkin.skeleton.bones[2].add(tail);
    const span = f.disk ? 0.19 : f.long ? 0.125 : 0.137;
    const rounded = f.armor || kind === "silver_arowana";
    amazonFin(
      tail,
      `${kind}_caudal_rays`,
      rounded
        ? [
            [0, 0],
            [0.08, span * 0.74],
            [0.16, span],
            [0.2, span * 0.72],
            [0.214, 0],
            [0.2, -span * 0.72],
            [0.16, -span],
            [0.08, -span * 0.74],
          ]
        : [
            [0, 0],
            [0.12, span],
            [0.2, span * 1.02],
            [0.158, span * 0.35],
            [0.11, 0],
            [0.158, -span * 0.35],
            [0.2, -span * 1.02],
            [0.12, -span],
          ],
      f.fin,
    );
    motions.push((t, e) => {
      tail.rotation.y = Math.sin(t * 1.3 - 1.4) * 0.22 * (0.6 + e * 0.25);
    });
    if (f.cat)
      bindFin(
        amazonFin(
          parent,
          `${kind}_adipose`,
          fitRoot(
            [
              [0.19, h * 0.65],
              [0.245, h * 0.92],
              [0.31, h * 0.49],
            ],
            true,
          ),
          f.back,
        ),
      );
  } else {
    const fin = amazonFin(
      parent,
      "electrophorus_long_anal_wave",
      [
        [-0.4, -0.019],
        [-0.28, -0.063],
        [0.28, -0.057],
        [0.5, -0.025],
        [0.535, 0],
        [0.34, -0.018],
      ],
      f.fin,
    );
    bindSerpentineMotion(fin, motions, eelMotion);
  }
}

/** 圆形魟盘使用连续起伏蒙皮，眼斑位于皮肤上；尾刺和腹部鳃缝可从背腹观察。 */
export function buildAmazonRay(parent, motions) {
  const geometry = amazonGeometry("motoro_disk_v2", () => {
    const p = [],
      c = [],
      uv = [],
      index = [],
      dark = new THREE.Color("#554631"),
      gold = new THREE.Color("#c29453"),
      belly = new THREE.Color("#c7b590");
    for (let side = 0; side < 2; side++)
      for (let r = 0; r <= 22; r++)
        for (let s = 0; s <= 72; s++) {
          const a = (s / 72) * Math.PI * 2,
            u = r / 22,
            x = Math.cos(a) * u * 0.255,
            z = Math.sin(a) * u * 0.275 - 0.055;
          const y =
            (side
              ? -0.011
              : 0.017 + Math.exp(-((x / 0.1) ** 2 + (z / 0.13) ** 2)) * 0.042) *
            (1 - u ** 5);
          p.push(x, y, z);
          uv.push(x, z);
          const spot = Math.hypot(
              (((x + 0.5) * 38) % 1) - 0.5,
              (((z + 0.5) * 35) % 1) - 0.5,
            ),
            color = side
              ? belly.clone()
              : dark.clone().lerp(gold, spot > 0.15 && spot < 0.31 ? 0.9 : 0);
          color.toArray(c, c.length);
          if (r < 22 && s < 72) {
            const i = side * 23 * 73 + r * 73 + s,
              j = i + 73;
            index.push(
              ...(side
                ? [i, j, i + 1, j, j + 1, i + 1]
                : [i, i + 1, j, j, i + 1, j + 1]),
            );
          }
        }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
  });
  const mesh = amazonMesh(
    parent,
    geometry,
    "#ffffff",
    [0, 0, 0],
    "undulating_ray_disk",
    true,
  );
  bindAxialMotion(mesh, motions, { axis: "z", frequency: 1.3, amplitude: 0.1 });
  amazonEyes(parent, 0.037, 0.05, -0.181, 0.012, "#b29861");
  for (const side of [-1, 1]) {
    amazonEllipsoid(
      parent,
      "#24291f",
      [side * 0.052, 0.041, -0.144],
      [0.01, 0.004, 0.016],
      "spiracle",
    );
    for (let i = 0; i < 5; i++)
      amazonTube(
        parent,
        `motoro_gill_${side}_${i}`,
        [
          [side * 0.045, -0.011, -0.105 + i * 0.021],
          [side * 0.08, -0.015, -0.09 + i * 0.021],
        ],
        0.0015,
        "#3c3b2a",
      );
  }
  const tail = new THREE.Group();
  tail.position.z = 0.15;
  parent.add(tail);
  const tailMesh = amazonMesh(
    tail,
    amazonLoft(
      "motoro_tapered_tail",
      [
        [0, 0.013, 0.012],
        [0.15, 0.008, 0.008],
        [0.42, 0.003, 0.003],
        [0.58, 0.0001, 0.0001],
      ],
      "#504b31",
      "#a28f60",
      () => 0,
      44,
      12,
    ),
    "#ffffff",
    [0, 0, 0],
    "whip_tail",
    true,
  );
  bindAxialMotion(tailMesh, motions, { amplitude: 0.15, frequency: 1.3 });
  amazonSpike(
    tail,
    "motoro_barbed_sting",
    [
      [0, 0.007, 0.1],
      [0, 0.019, 0.16],
      [0, 0.012, 0.25],
    ],
    0.004,
    "#b5ac8b",
  );
}
