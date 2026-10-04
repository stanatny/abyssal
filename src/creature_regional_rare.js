import * as THREE from "three";
import { REGIONAL_RARES } from "./regional_rare.js";
import {
  amazonLoft,
  amazonMesh,
  amazonFin,
  amazonTube,
  amazonEllipsoid,
  amazonEyes,
} from "./amazon_anatomy.js";
import {
  bindAxialMotion,
  sculptedFin,
  skinMaterial,
} from "./creature_surface.js";
const material = skinMaterial({
  color: "#c9a868",
  roughness: 0.45,
  metalness: 0.08,
  pattern: 0.04,
});
export const RARE_CREATURE_KINDS = new Set(REGIONAL_RARES.map((s) => s.kind));
/** 七种独立珍兽共享资源缓存，不共享关节或每帧几何；各自的剪影和运动结构独立。 */
export function buildRegionalRare(kind, root, motions) {
  const spec = REGIONAL_RARES.find((s) => s.kind === kind);
  if (!spec) throw new Error(`Unknown regional rare: ${kind}`);
  const body = new THREE.Group();
  body.name = `${kind}_rare_anatomy`;
  root.add(body);
  const skin = (
    profile,
    back = spec.color,
    belly = "#eee2bc",
    name = "rare_trunk",
  ) =>
    amazonMesh(
      body,
      amazonLoft(
        `${kind}_${name}`,
        profile,
        back,
        belly,
        (x, y, z) => (Math.sin(z * 100 + x * 40) > 0.7 ? 0.08 : 0),
        48,
        28,
      ),
      "#ffffff",
      [0, 0, 0],
      name,
      true,
    );
  const oval = (parent, name, p, axes, color) =>
    amazonEllipsoid(parent, color, p, axes, `${kind}_${name}`);
  const tube = (parent, name, points, r, color = spec.color) =>
    amazonTube(parent, `${kind}_${name}`, points, r, color);
  const fin = (
    parent,
    name,
    outline,
    p,
    orientation = "horizontal",
    color = spec.color,
  ) => amazonFin(parent, `${kind}_${name}`, outline, color, orientation, p);
  const fish = (deep = false) => {
    const h = deep ? 0.18 : 0.1;
    const mesh = skin([
      [-0.46, 0.004, 0.014],
      [-0.36, 0.055, h * 0.57],
      [-0.17, 0.087, h],
      [0.06, 0.079, h * 0.83],
      [0.31, 0.025, 0.03],
      [0.38, 0.014, 0.021],
    ]);
    bindAxialMotion(mesh, motions, { frequency: 1.1, amplitude: 0.11 });
    amazonEyes(body, 0.05, 0.029, -0.325, 0.012);
    for (const s of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(s * 0.07, -0.012, -0.2);
      body.add(wing);
      wing.userData.keepSeparate = true;
      fin(
        wing,
        `pectoral${s}`,
        [
          [0, 0],
          [0.07, s * 0.17],
          [0.22, s * 0.13],
          [0.15, 0],
        ],
        [0, 0, 0],
      );
      motions.push(
        (t, e) =>
          (wing.rotation.z = s * Math.sin(t * 1.1 + s) * 0.1 * (0.5 + e * 0.2)),
      );
      for (let i = 0; i < 4; i++)
        tube(
          body,
          `gill${s}_${i}`,
          [
            [s * 0.057, -0.034 + i * 0.013, -0.27],
            [s * 0.075, -0.028 + i * 0.012, -0.24],
          ],
          0.0016,
          "#487a71",
        );
    }
    const tail = new THREE.Group();
    tail.position.z = 0.36;
    tail.userData.keepSeparate = true;
    body.add(tail);
    fin(
      tail,
      "fork_tail",
      [
        [0, 0],
        [0.17, 0.16],
        [0.13, 0.025],
        [0.18, -0.16],
        [0.02, -0.028],
      ],
      [0, 0, 0],
      "vertical",
      "#ccae73",
    );
    motions.push(
      (t, e) =>
        (tail.rotation.y = Math.sin(t * 1.1 - 1.2) * 0.13 * (0.7 + e * 0.2)),
    );
    fin(
      body,
      "anal_fin",
      [
        [-0.03, 0],
        [0.04, -0.04],
        [0.29, -0.08],
        [0.34, 0],
      ],
      [0, -h * 0.6, 0],
      "vertical",
    );
  };
  if (kind === "golden_manta") {
    skin(
      [
        [-0.42, 0.016, 0.023],
        [-0.3, 0.115, 0.055],
        [0, 0.15, 0.065],
        [0.3, 0.058, 0.034],
        [0.38, 0.012, 0.015],
      ],
      "#7d6943",
      "#f0dfad",
    );
    amazonEyes(body, 0.098, 0.035, -0.27, 0.012);
    for (const s of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.x = s * 0.11;
      wing.userData.keepSeparate = true;
      body.add(wing);
      fin(
        wing,
        `wing${s}`,
        [
          [-0.31, 0],
          [-0.18, s * 0.2],
          [0.16, s * 0.51],
          [0.3, s * 0.12],
          [0.23, -s * 0.01],
        ],
        [0, 0, 0],
      );
      for (let i = 0; i < 5; i++)
        tube(
          wing,
          `wing_ray${s}_${i}`,
          [
            [0, 0.009, -0.19 + i * 0.09],
            [s * (0.19 + Math.sin(i * 0.63) * 0.15), 0.018, 0.1 + i * 0.022],
          ],
          0.0025,
          "#f1d98e",
        );
      tube(
        body,
        `cephalic${s}`,
        [
          [s * 0.058, -0.008, -0.36],
          [s * 0.068, -0.025, -0.49],
          [s * 0.047, -0.004, -0.52],
        ],
        0.014,
        "#dbc07b",
      );
      motions.push(
        (t, e) =>
          (wing.rotation.z =
            s * Math.sin(t * 0.85 + s * 0.1) * 0.21 * (0.5 + e * 0.15)),
      );
    }
    tube(
      body,
      "whip_tail",
      [
        [0, 0, 0.3],
        [0, 0.015, 0.51],
        [0.015, 0.025, 0.65],
        [0, 0.025, 0.74],
      ],
      0.009,
      "#8c7953",
    );
  } else if (kind === "pearl_nautilus") {
    // 对数螺旋由连续粗管构成，缝线沿同一曲线贴合；触腕根聚于壳口。
    const points = [];
    for (let i = 0; i <= 90; i++) {
      const a = (i / 90) * Math.PI * 4.2 + Math.PI * (1.07 - 4.2),
        r = 0.018 * Math.exp((i / 90) * Math.PI * 4.2 * 0.225);
      points.push([0, Math.sin(a) * r, Math.cos(a) * r]);
    }
    tube(body, "spiral_shell", points, 0.088, "#d8e2cb");
    for (let i = 20; i < 90; i += 4) {
      const p = points[i];
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.089, 0.0023, 5, 24),
        material,
      );
      ring.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3()
          .fromArray(points[i + 1])
          .sub(new THREE.Vector3().fromArray(points[i - 1]))
          .normalize(),
      );
      ring.position.fromArray(p);
      body.add(ring);
    }
    oval(body, "hood", [0, -0.09, -0.38], [0.08, 0.058, 0.12], "#9dc4b8");
    amazonEyes(body, 0.071, -0.085, -0.42, 0.012);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2,
        g = new THREE.Group();
      g.position.set(Math.cos(a) * 0.052, -0.09 + Math.sin(a) * 0.035, -0.46);
      g.userData.keepSeparate = true;
      body.add(g);
      tube(
        g,
        `arm${i}`,
        [
          [0, 0, 0],
          [Math.cos(a) * 0.037, Math.sin(a) * 0.035, -0.12],
          [Math.cos(a) * 0.046, Math.sin(a) * 0.03, -0.22],
          [Math.cos(a) * 0.033, Math.sin(a) * 0.03, -0.26],
        ],
        0.006,
        "#d4e8d3",
      );
      motions.push((t) => (g.rotation.y = Math.sin(t * 0.65 + i) * 0.06));
    }
    motions.push((t) => (body.rotation.x = Math.sin(t * 0.4) * 0.012));
  } else if (kind === "crimson_sail") {
    fish(true);
    tube(
      body,
      "spear_nose",
      [
        [0, 0.012, -0.38],
        [0, 0.015, -0.55],
        [0, 0.012, -0.75],
      ],
      0.012,
      "#d0ada3",
    );
    fin(
      body,
      "sail",
      [
        [-0.23, 0],
        [-0.16, 0.32],
        [0.06, 0.43],
        [0.25, 0.23],
        [0.29, 0],
      ],
      [0, 0.12, 0],
      "vertical",
      "#9c3c59",
    );
    for (let i = 0; i < 8; i++)
      tube(
        body,
        `sail_ray${i}`,
        [
          [0, 0.13, -0.2 + i * 0.057],
          [0, 0.19 + Math.sin((i / 8) * Math.PI) * 0.31, -0.14 + i * 0.045],
        ],
        0.0028,
        "#edaa92",
      );
  } else if (kind === "glass_prawn") {
    const trunk = skin(
      [
        [-0.32, 0.024, 0.034],
        [-0.18, 0.08, 0.093],
        [0.02, 0.075, 0.08],
        [0.26, 0.034, 0.035],
        [0.34, 0.014, 0.018],
      ],
      "#6398b0",
      "#b2cbd0",
    );
    bindAxialMotion(trunk, motions, { amplitude: 0.07, frequency: 1.15 });
    for (let i = 0; i < 7; i++) {
      const z = -0.13 + i * 0.065;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.081 - i * 0.006, 0.003, 5, 18),
        material,
      );
      ring.position.set(0, 0, z);
      ring.scale.y = 0.95;
      body.add(ring);
    }
    for (const s of [-1, 1]) {
      oval(
        body,
        `eye_stalk${s}`,
        [s * 0.064, 0.046, -0.29],
        [0.014, 0.015, 0.025],
        "#101c29",
      );
      tube(
        body,
        `antenna${s}`,
        [
          [s * 0.035, 0.027, -0.26],
          [s * 0.085, 0.038, -0.43],
          [s * 0.12, 0.025, -0.66],
          [s * 0.1, 0.018, -0.8],
        ],
        0.0035,
        "#c9dace",
      );
      for (let i = 0; i < 5; i++) {
        const g = new THREE.Group();
        g.position.set(s * 0.048, -0.04, -0.16 + i * 0.065);
        body.add(g);
        g.userData.keepSeparate = true;
        tube(
          g,
          `leg${s}_${i}`,
          [
            [0, 0, 0],
            [s * 0.03, -0.08, 0.015],
            [s * 0.075, -0.12, -0.035],
          ],
          0.006,
          "#9bbdcb",
        );
        motions.push(
          (t) => (g.rotation.x = Math.sin(t * 1.6 + i * 0.7) * 0.13),
        );
      }
      fin(
        body,
        `tailfan${s}`,
        [
          [0, 0],
          [0.16, s * 0.11],
          [0.21, s * 0.1],
          [0.1, 0],
        ],
        [0, 0, 0.31],
      );
    }
    tube(
      body,
      "rostrum",
      [
        [0, 0.05, -0.25],
        [0, 0.044, -0.37],
        [0, 0.028, -0.44],
      ],
      0.008,
      "#a2cee0",
    );
  } else if (kind === "crystal_seraph") {
    skin(
      [
        [-0.38, 0.006, 0.007],
        [-0.23, 0.1, 0.1],
        [0.1, 0.095, 0.08],
        [0.35, 0.025, 0.03],
        [0.48, 0.001, 0.004],
      ],
      "#7c709f",
      "#c1b7bf",
    );
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3,
        g = new THREE.Group();
      g.rotation.z = a;
      g.userData.keepSeparate = true;
      body.add(g);
      fin(
        g,
        `glass_wing${i}`,
        [
          [-0.23, 0],
          [-0.1, 0.18],
          [0.18, 0.34],
          [0.37, 0.18],
          [0.29, 0],
        ],
        [0.065, 0, 0],
        "horizontal",
        "#b9b2cf",
      );
      tube(
        g,
        `wing_vein${i}`,
        [
          [0.065, 0.009, -0.23],
          [0.15, 0.018, -0.05],
          [0.32, 0.012, 0.18],
          [0.18, 0.005, 0.32],
        ],
        0.006,
        "#e1cbb3",
      );
      oval(
        g,
        `sensory_node${i}`,
        [0.08, 0.025, -0.17],
        [0.02, 0.014, 0.03],
        "#a3d3cf",
      );
      motions.push(
        (t) => (g.rotation.z = a + Math.sin(t * 0.8 + i * 0.4) * 0.065),
      );
    }
    for (let i = 0; i < 3; i++)
      tube(
        body,
        `trailing_feeler${i}`,
        [
          [Math.sin(i * 2) * 0.025, 0.018, 0.3],
          [Math.sin(i * 2) * 0.055, 0.03, 0.49],
          [Math.sin(i * 2) * 0.05, 0.015, 0.68],
        ],
        0.007,
        "#cab49d",
      );
  } else {
    fish(kind === "gilded_cloud_carp");
    fin(
      body,
      "long_dorsal",
      [
        [-0.25, 0],
        [-0.2, 0.07],
        [0.19, 0.12],
        [0.32, 0],
      ],
      [0, 0.088, 0],
      "vertical",
      "#dfc592",
    );
    for (const s of [-1, 1]) {
      tube(
        body,
        `barbel${s}`,
        [
          [s * 0.026, -0.035, -0.39],
          [s * 0.075, -0.055, -0.43],
          [s * 0.11, -0.06, -0.37],
        ],
        0.004,
        "#d5c695",
      );
      if (kind === "gilded_cloud_carp") {
        const wing = new THREE.Group();
        wing.position.set(s * 0.075, 0.015, -0.14);
        body.add(wing);
        wing.userData.keepSeparate = true;
        fin(
          wing,
          `cloudwing${s}`,
          [
            [-0.1, 0],
            [0.01, s * 0.27],
            [0.2, s * 0.32],
            [0.31, 0],
          ],
          [0, 0, 0],
          "horizontal",
          "#d9ba76",
        );
        for (let i = 0; i < 6; i++)
          tube(
            wing,
            `cloud_vein${s}_${i}`,
            [
              [0, 0.008, -0.02],
              [s * (0.1 + i * 0.026), 0.015, 0.04 + i * 0.034],
            ],
            0.0025,
            "#f4dfaf",
          );
        motions.push((t) => (wing.rotation.z = s * Math.sin(t * 0.8) * 0.14));
      }
    }
  }
  body.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(body),
    scale = 1 / (box.max.z - box.min.z);
  body.scale.setScalar(scale);
  body.position.copy(box.getCenter(new THREE.Vector3())).multiplyScalar(-scale);
  root.userData.artRevision = "regional_rare_v1";
}
