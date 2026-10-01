import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  skinMaterial,
  sampleSection,
  sculptedFin,
} from "./creature_surface.js";

export const WILDLIFE_KINDS = new Set([
  "moon_jelly",
  "spiny_lobster",
  "pelican",
  "tropicbird",
]);
const geometries = new Map();
const cached = (key, make) => {
  if (!geometries.has(key)) geometries.set(key, make());
  return geometries.get(key);
};
const M = {
  white: skinMaterial({ color: "#ecebdc", pattern: 0.012 }),
  dark: skinMaterial({ color: "#302c29", pattern: 0.025 }),
  feather: skinMaterial({ color: "#73685a", pattern: 0.05 }),
  bill: skinMaterial({ color: "#d2a875", roughness: 0.5 }),
  orange: skinMaterial({ color: "#e5a13c" }),
  pouch: skinMaterial({ color: "#b4946b", roughness: 0.68 }),
  eye: new THREE.MeshPhysicalMaterial({
    color: "#111e22",
    roughness: 0.12,
    clearcoat: 0.9,
  }),
  shell: skinMaterial({ color: "#aa603c", roughness: 0.54, pattern: 0.16 }),
  joint: skinMaterial({ color: "#e0ba89", roughness: 0.64, pattern: 0.04 }),
  jelly: new THREE.MeshPhysicalMaterial({
    color: "#d2e4ef",
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    side: THREE.DoubleSide,
    roughness: 0.2,
    clearcoat: 0.5,
  }),
  organ: new THREE.MeshStandardMaterial({
    color: "#c39dc1",
    emissive: "#654468",
    emissiveIntensity: 0.12,
    roughness: 0.6,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  }),
  arm: new THREE.MeshStandardMaterial({
    color: "#c9dbe5",
    roughness: 0.65,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  }),
};
const add = (parent, g, mat, name) => {
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = name || "";
  parent.add(mesh);
  return mesh;
};
function oval(parent, mat, point, scale) {
  const mesh = add(
    parent,
    cached("oval", () => new THREE.SphereGeometry(1, 18, 12)),
    mat,
  );
  mesh.position.set(...point);
  mesh.scale.set(...scale);
  return mesh;
}
function tube(points, radius, segments = 24, sides = 7) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
    segments,
    radius,
    sides,
    false,
  );
}
function form(profile, top, bottom, rings = 54, sides = 26) {
  const positions = [],
    colors = [],
    indices = [];
  const a = new THREE.Color(top),
    b = new THREE.Color(bottom),
    c = new THREE.Color();
  for (let i = 0; i <= rings; i++) {
    const z = THREE.MathUtils.lerp(profile[0][0], profile.at(-1)[0], i / rings),
      [rx, ry, oy] = sampleSection(profile, z);
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2,
        y = Math.sin(angle),
        x = Math.cos(angle);
      positions.push(x * rx, oy + y * ry, z);
      c.copy(b).lerp(a, THREE.MathUtils.smoothstep(y, -0.45, 0.2));
      c.multiplyScalar(
        1 + Math.sin(z * 121 + x * 37) * Math.cos(angle * 13) * 0.025,
      );
      colors.push(c.r, c.g, c.b);
      if (i < rings && j < sides) {
        const n = i * (sides + 1) + j;
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
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
const colored = skinMaterial({
  color: "#ffffff",
  vertexColors: true,
  pattern: 0.012,
});
const fin = (points, thickness = 0.008) =>
  sculptedFin(points, thickness, "horizontal", { detail: 1 });

/** 创建原创鸟类、刺龙虾与水母；共享几何/材质，动作节点每个实例独立。 */
export function buildWildlife(kind, root, motions) {
  const inner = new THREE.Group();
  inner.name = `${kind}_anatomy`;
  root.add(inner);
  if (kind === "moon_jelly") jelly(inner, motions);
  else if (kind === "spiny_lobster") lobster(inner, motions);
  else bird(inner, motions, kind);
  inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner),
    extent = box.getSize(new THREE.Vector3());
  const scale =
    1 / (kind === "moon_jelly" ? Math.max(extent.x, extent.z) : extent.z);
  inner.scale.setScalar(scale);
  // 鸟与甲壳动物以纵向包围盒中心对齐；水母按伞径标注，不将口腕冒充体长。
  if (kind !== "moon_jelly")
    inner.position.z = -(box.min.z + box.max.z) * 0.5 * scale;
  root.userData.anatomy = kind;
}
function jelly(root, motions) {
  const bell = new THREE.Group();
  bell.name = "jelly_bell_pulse";
  root.add(bell);
  const geometry = cached("jelly_bell", () => {
    const p = [],
      idx = [],
      rings = 16,
      sides = 64;
    for (let i = 0; i <= rings; i++)
      for (let j = 0; j <= sides; j++) {
        const u = i / rings,
          a = (j / sides) * Math.PI * 2,
          r = 0.5 * u * (1 + Math.sin(a * 16) * 0.012 * u ** 8);
        p.push(
          Math.cos(a) * r,
          0.2 * Math.sqrt(Math.max(0, 1 - u * u)) - 0.018 * u ** 12,
          Math.sin(a) * r,
        );
        if (i < rings && j < sides) {
          const n = i * (sides + 1) + j;
          idx.push(
            n,
            n + sides + 1,
            n + 1,
            n + 1,
            n + sides + 1,
            n + sides + 2,
          );
        }
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
  add(bell, geometry, M.jelly, "scalloped_translucent_bell");
  add(
    bell,
    cached("jelly_gonads", () => {
      const parts = [];
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2,
          ps = [];
        for (let i = 0; i <= 20; i++) {
          const q = -Math.PI * 0.78 + (i / 20) * Math.PI * 1.56;
          const x = 0.085 + Math.cos(q) * 0.055,
            z = Math.sin(q) * 0.065;
          ps.push([
            Math.cos(a) * x - Math.sin(a) * z,
            0.052,
            Math.sin(a) * x + Math.cos(a) * z,
          ]);
        }
        parts.push(tube(ps, 0.007, 20, 6));
      }
      const g = mergeGeometries(parts);
      parts.forEach((p) => p.dispose());
      return g;
    }),
    M.organ,
    "four_horseshoe_gonads",
  );
  const fringe = add(
    bell,
    cached("jelly_fringe", () => {
      const parts = [];
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        parts.push(
          tube(
            [
              [Math.cos(a) * 0.485, -0.008, Math.sin(a) * 0.485],
              [Math.cos(a) * 0.5, -0.08, Math.sin(a) * 0.5],
              [
                Math.cos(a + 0.12) * 0.47,
                -0.19 - (i % 3) * 0.018,
                Math.sin(a + 0.12) * 0.47,
              ],
            ],
            0.0019,
            9,
            4,
          ),
        );
      }
      const g = mergeGeometries(parts);
      parts.forEach((p) => p.dispose());
      return g;
    }),
    M.arm,
    "marginal_tentacles",
  );
  fringe.userData.keepSeparate = true;
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.name = `oral_arm_${i}`;
    arm.rotation.y = (i * Math.PI) / 2;
    root.add(arm);
    const g = cached("jelly_oral_arm", () => {
      const p = [],
        idx = [];
      for (let n = 0; n <= 32; n++)
        for (let side = 0; side < 2; side++) {
          const u = n / 32,
            w = (1 - u) * 0.032 + 0.003;
          p.push(
            0.04 + u * 0.14 + (side ? 1 : -1) * w,
            -0.03 - u * 0.57,
            Math.sin(u * 13) * 0.032 +
              (side ? 1 : -1) * Math.sin(u * 28) * w * 0.5,
          );
          if (n < 32 && side === 0) {
            const k = n * 2;
            idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
          }
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    });
    add(arm, g, M.arm, "ruffled_oral_ribbon");
    motions.push((t) => {
      arm.rotation.z = Math.sin(t * 0.45 + i) * 0.075;
      arm.rotation.x = Math.sin(t * 0.36 + i) * 0.07;
    });
  }
  motions.push((t) => {
    const pulse = Math.sin(t * 0.8);
    bell.scale.set(1 + pulse * 0.055, 1 - pulse * 0.12, 1 + pulse * 0.055);
    fringe.rotation.y = Math.sin(t * 0.2) * 0.045;
  });
}
function lobster(root, motions) {
  add(
    root,
    cached("lobster_carapace", () =>
      form(
        [
          [-0.23, 0.045, 0.055],
          [-0.18, 0.1, 0.085],
          [-0.06, 0.105, 0.09],
          [0.06, 0.09, 0.08],
          [0.12, 0.065, 0.05],
        ],
        "#ad643e",
        "#bb9069",
        44,
        24,
      ),
    ),
    colored,
    "spiny_carapace",
  );
  const tail = new THREE.Group();
  tail.position.z = 0.1;
  tail.name = "lobster_segmented_tail";
  root.add(tail);
  for (let i = 0; i < 6; i++) {
    oval(
      tail,
      M.shell,
      [0, -0.014 - i * 0.003, i * 0.038],
      [0.076 - i * 0.007, 0.05 - i * 0.004, 0.031],
    );
    const ridge = add(
      tail,
      cached(
        `lobster_segment_ridge_${i}`,
        () =>
          new THREE.TorusGeometry(0.074 - i * 0.007, 0.0028, 6, 24, Math.PI),
      ),
      M.joint,
    );
    ridge.position.set(0, -0.014 - i * 0.003, i * 0.038);
  }
  for (const side of [-1, 1]) {
    const blade = add(
      tail,
      cached(`lobster_fan_${side}`, () =>
        fin(
          [
            [0.17, 0],
            [0.29, side * 0.11],
            [0.34, side * 0.09],
            [0.33, side * 0.02],
            [0.2, 0],
          ],
          0.006,
        ),
      ),
      M.shell,
    );
    blade.position.y = -0.045;
    for (let i = 0; i < 7; i++) {
      const spine = add(
        root,
        cached("lobster_spine", () => new THREE.ConeGeometry(0.009, 0.033, 6)),
        M.joint,
      );
      spine.position.set(
        side * (0.078 - (i > 4 ? (i - 4) * 0.008 : 0)),
        0.055,
        -0.2 + i * 0.043,
      );
      spine.rotation.z = -side * 0.72;
      spine.rotation.x = -0.38;
    }
    const stalk = add(
      root,
      cached(`lobster_eye_stalk_${side}`, () =>
        tube(
          [
            [side * 0.038, 0.025, -0.19],
            [side * 0.052, 0.065, -0.255],
          ],
          0.008,
          6,
        ),
      ),
      M.shell,
    );
    oval(root, M.eye, [side * 0.052, 0.065, -0.255], [0.012, 0.014, 0.015]);
    const antenna = new THREE.Group();
    antenna.position.set(side * 0.042, 0.034, -0.215);
    root.add(antenna);
    antenna.name = `long_antenna_${side}`;
    add(
      antenna,
      cached(`lobster_antenna_${side}`, () =>
        tube(
          [
            [0, 0, 0],
            [side * 0.075, 0.05, -0.15],
            [side * 0.14, 0.03, -0.35],
            [side * 0.12, -0.01, -0.62],
          ],
          0.004,
          30,
          5,
        ),
      ),
      M.joint,
    );
    motions.push((t) => {
      antenna.rotation.y = Math.sin(t * 0.42 + side) * 0.13;
      antenna.rotation.x = Math.sin(t * 0.38) * 0.045;
    });
    for (let i = 0; i < 5; i++) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.075, -0.025, -0.16 + i * 0.053);
      leg.name = `walking_leg_${side}_${i}`;
      root.add(leg);
      add(
        leg,
        cached(`lobster_leg_${side}_${i}`, () => {
          const shaft = tube(
            [
              [0, 0, 0],
              [side * 0.066, -0.009, -0.016 + i * 0.009],
              [side * 0.14, -0.067, 0.022],
              [side * 0.148, -0.102, 0.058],
            ],
            0.0048,
            14,
            6,
          );
          const tip = new THREE.SphereGeometry(1, 18, 12);
          tip.scale(0.0045, 0.005, 0.012);
          tip.rotateX(-0.4);
          tip.translate(side * 0.145, -0.1, 0.053);
          // 同一动作关节内合并腿与浅色足尖，保留几何和体色而少一次绘制。
          for (const [g, color] of [
            [shaft, "#aa603c"],
            [tip, "#e0ba89"],
          ]) {
            const c = new THREE.Color(color),
              rgb = [];
            for (let n = 0; n < g.attributes.position.count; n++)
              rgb.push(c.r, c.g, c.b);
            g.setAttribute("color", new THREE.Float32BufferAttribute(rgb, 3));
          }
          const merged = mergeGeometries([shaft, tip]);
          shaft.dispose();
          tip.dispose();
          return merged;
        }),
        colored,
      );
      motions.push((t) => {
        leg.rotation.y = Math.sin(t * 1.5 + i * Math.PI * 0.6 + side) * 0.2;
        leg.rotation.z =
          side *
          Math.max(0, Math.sin(t * 1.5 + i * Math.PI * 0.6 + side)) *
          0.11;
      });
    }
    add(
      root,
      cached(`lobster_antennule_${side}`, () =>
        tube(
          [
            [side * 0.022, 0.025, -0.24],
            [side * 0.034, 0.02, -0.36],
            [side * 0.03, 0.025, -0.44],
          ],
          0.0025,
          10,
          5,
        ),
      ),
      M.shell,
    );
  }
  add(
    root,
    cached("lobster_tail_center", () =>
      fin(
        [
          [0.17, -0.025],
          [0.32, -0.032],
          [0.36, 0],
          [0.32, 0.032],
          [0.17, 0.025],
        ],
        0.006,
      ),
    ),
    M.joint,
  ).position.y = -0.046;
  motions.push((t) => {
    tail.rotation.x = Math.sin(t * 0.45) * 0.025;
  });
}
function bird(root, motions, kind) {
  const pelican = kind === "pelican";
  const bodyProfile = pelican
    ? [
        [-0.23, 0.035, 0.05],
        [-0.15, 0.105, 0.12],
        [0.06, 0.12, 0.135],
        [0.26, 0.06, 0.07],
        [0.35, 0.006, 0.009],
      ]
    : [
        [-0.28, 0.025, 0.035],
        [-0.16, 0.065, 0.075],
        [0.07, 0.075, 0.085],
        [0.22, 0.04, 0.045],
        [0.29, 0.005, 0.008],
      ];
  add(
    root,
    cached(`${kind}_body`, () =>
      form(
        bodyProfile,
        pelican ? "#776957" : "#e7e7df",
        pelican ? "#c4b299" : "#f5f2dd",
      ),
    ),
    colored,
    "continuous_feather_body",
  );
  const neck = new THREE.Group();
  neck.name = "curved_neck";
  root.add(neck);
  add(
    neck,
    cached(`${kind}_neck`, () =>
      tube(
        pelican
          ? [
              [0, 0.07, -0.14],
              [0, 0.12, -0.18],
              [0, 0.22, -0.17],
              [0, 0.26, -0.25],
              [0, 0.23, -0.33],
            ]
          : [
              [0, 0.04, -0.19],
              [0, 0.09, -0.23],
              [0, 0.105, -0.29],
            ],
        pelican ? 0.035 : 0.026,
        22,
        12,
      ),
    ),
    M.white,
  );
  const headZ = pelican ? -0.34 : -0.3,
    headY = pelican ? 0.23 : 0.11;
  oval(
    neck,
    M.white,
    [0, headY, headZ],
    pelican ? [0.04, 0.045, 0.064] : [0.031, 0.034, 0.041],
  );
  if (pelican) {
    const crest = oval(
      neck,
      M.feather,
      [0, headY + 0.025, headZ + 0.016],
      [0.032, 0.023, 0.045],
    );
    crest.rotation.x = 0.2;
  }
  const bill = add(
    neck,
    cached(`${kind}_bill`, () =>
      form(
        pelican
          ? [
              [-0.69, 0.002, 0.002],
              [-0.67, 0.008, 0.004],
              [-0.49, 0.017, 0.012],
              [-0.37, 0.025, 0.016],
              [-0.32, 0.014, 0.012],
            ]
          : [
              [-0.43, 0.001, 0.001],
              [-0.4, 0.005, 0.005],
              [-0.33, 0.012, 0.013],
              [-0.3, 0.012, 0.012],
            ],
        "#d5a257",
        "#b27c41",
        32,
        14,
      ),
    ),
    colored,
    "long_tapered_bill",
  );
  bill.position.y = headY - 0.008;
  if (pelican) {
    const pouch = add(
      neck,
      cached("pelican_pouch", () =>
        form(
          [
            [-0.665, 0.001, 0.001],
            [-0.58, 0.009, 0.018, -0.02],
            [-0.46, 0.018, 0.035, -0.027],
            [-0.345, 0.021, 0.02, -0.012],
          ],
          "#b69c76",
          "#a38460",
          32,
          18,
        ),
      ),
      colored,
      "throat_pouch",
    );
    pouch.position.y = headY - 0.028;
    add(
      neck,
      cached("pelican_bill_seam", () =>
        tube(
          [
            [0.02, headY - 0.011, -0.36],
            [0.014, headY - 0.011, -0.48],
            [0.003, headY - 0.013, -0.67],
          ],
          0.0018,
          16,
          4,
        ),
      ),
      M.dark,
    );
  }
  for (const side of [-1, 1]) {
    oval(
      neck,
      M.eye,
      [side * (pelican ? 0.035 : 0.028), headY + 0.008, headZ - 0.025],
      [0.0045, 0.005, 0.006],
    );
    const wing = new THREE.Group();
    wing.position.set(side * 0.07, 0.05, -0.09);
    wing.name = `wing_shoulder_${side}`;
    root.add(wing);
    const w = pelican ? 0.31 : 0.24;
    add(
      wing,
      cached(`${kind}_inner_wing_${side}`, () =>
        fin(
          [
            [-0.1, 0],
            [-0.11, side * w * 0.65],
            [0.03, side * w],
            [0.19, side * w * 0.72],
            [0.16, 0],
          ],
          0.01,
        ),
      ),
      pelican ? M.feather : M.white,
    );
    const outer = new THREE.Group();
    outer.position.set(side * w * 0.82, 0, 0.05);
    outer.name = `wing_wrist_${side}`;
    wing.add(outer);
    add(
      outer,
      cached(`${kind}_outer_wing_${side}`, () =>
        fin(
          [
            [-0.08, 0],
            [-0.03, side * w * 0.75],
            [0.12, side * w * 0.95],
            [0.23, side * w * 0.63],
            [0.14, 0],
          ],
          0.007,
        ),
      ),
      pelican ? M.dark : M.white,
    );
    if (!pelican)
      add(
        wing,
        cached(`tropicbird_wing_bar_${side}`, () =>
          fin(
            [
              [0.015, side * 0.08],
              [0.055, side * 0.17],
              [0.11, side * 0.19],
              [0.11, side * 0.11],
            ],
            0.003,
          ),
        ),
        M.dark,
      ).position.y = 0.008;
    for (let feather = 0; feather < (pelican ? 7 : 5); feather++) {
      const primary = add(
        outer,
        cached(`${kind}_primary_${side}_${feather}`, () =>
          fin(
            [
              [0, 0],
              [0.05, side * 0.15],
              [0.11, side * 0.19],
              [0.105, side * 0.02],
            ],
            0.003,
          ),
        ),
        pelican ? M.dark : M.white,
      );
      primary.position.set(
        side * (w * 0.4 + feather * 0.014),
        0,
        0.02 + feather * 0.026,
      );
      primary.rotation.y = -side * (0.1 + feather * 0.1);
    }
    for (let f = 0; f < 7; f++)
      add(
        wing,
        cached(`${kind}_secondary_${side}_${f}`, () =>
          fin(
            [
              [0, 0],
              [0.055, side * 0.025],
              [0.16, side * 0.024],
              [0.14, side * -0.003],
            ],
            0.0028,
          ),
        ),
        pelican ? M.feather : M.white,
      ).position.set(side * (0.08 + f * 0.028), -0.002, 0.04 + f * 0.005);
    add(
      root,
      cached(`${kind}_tucked_leg_${side}`, () =>
        tube(
          [
            [side * 0.036, -0.065, 0.09],
            [side * 0.045, -0.091, 0.11],
            [side * 0.045, -0.103, 0.13],
          ],
          0.004,
          8,
          6,
        ),
      ),
      M.bill,
    );
    const foot = add(
      root,
      cached(`${kind}_web_foot_${side}`, () =>
        fin(
          [
            [0, 0],
            [0.04, side * 0.02],
            [0.072, side * 0.01],
            [0.065, side * -0.017],
            [0.025, side * -0.024],
          ],
          0.006,
        ),
      ),
      M.bill,
    );
    foot.position.set(side * 0.045, -0.105, 0.13);
    foot.rotation.x = -0.22;
    motions.push((t) => {
      const gate = THREE.MathUtils.smoothstep(Math.sin(t * 0.22), 0.25, 0.65),
        amp = gate * (pelican ? 0.52 : 0.6);
      wing.rotation.z = side * (0.12 + Math.sin(t * 2.4) * amp);
      outer.rotation.z = side * (-0.08 + Math.sin(t * 2.4 - 0.7) * amp * 0.8);
    });
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.005, pelican ? 0.27 : 0.19);
  tail.name = "tail_feathers";
  root.add(tail);
  add(
    tail,
    cached(`${kind}_tail_fan`, () =>
      fin(
        [
          [0, -0.04],
          [0.15, -0.072],
          [0.19, -0.04],
          [0.17, 0.04],
          [0.14, 0.072],
          [0, 0.04],
        ],
        0.006,
      ),
    ),
    pelican ? M.dark : M.white,
  );
  if (!pelican)
    for (const side of [-1, 1]) {
      const feather = add(
        tail,
        cached(`tropicbird_streamer_${side}`, () =>
          fin(
            [
              [0.02, side * 0.012],
              [0.25, side * 0.022],
              [0.58, side * 0.019],
              [0.6, side * 0.008],
              [0.24, side * 0.011],
            ],
            0.002,
          ),
        ),
        M.white,
        "long_central_streamer",
      );
      feather.position.x = side * 0.008;
      feather.userData.keepSeparate = true;
      motions.push((t) => {
        feather.rotation.y = Math.sin(t * 0.5 + side) * 0.03;
        feather.rotation.x = Math.sin(t * 0.55) * 0.04;
      });
    }
  motions.push((t) => {
    neck.rotation.x = Math.sin(t * 0.35) * 0.018;
    tail.rotation.x = Math.sin(t * 0.45) * 0.035;
  });
}
