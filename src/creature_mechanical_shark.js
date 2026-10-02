import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { sampleSection, sculptedFin } from "./creature_surface.js";
import { addFeedingMouth } from "./player_motion.js";

/**
 * 原创装甲鲨鱼：连续承力壳、分块陶瓷护甲、机械颌、尾部铰链与双涡流推进器。
 * @param {THREE.Group} root 单位全长、朝向-Z的角色根节点。
 * @param {Function[]} motions 共享角色动作状态驱动的更新函数。
 * @returns {void} 嘴部、鱼雷出口和动作接口写入root.userData。
 */
export function buildMechanicalShark(root, motions) {
  const torso = new THREE.Group();
  torso.name = "armored_hull";
  root.add(torso);
  part(
    torso,
    cached("hull", () => shell(-0.48, 0.295, 0, Math.PI * 2, 60, 48, 0)),
    MAT.dark,
  );
  part(torso, cached("armor", armor), MAT.armor);
  part(torso, cached("trim", trim), MAT.steel);
  part(torso, cached("vents", vents), MAT.recess);
  part(torso, cached("optics", optics), MAT.cyan);
  part(torso, cached("markings", markings), MAT.amber);
  part(torso, cached("shoulder_armor", shoulderArmor), MAT.armor);
  part(torso, cached("sensor_circuits", sensorCircuits), MAT.cyan);
  part(torso, cached("engineering_bands", engineeringBands), MAT.amber);
  const dorsal = new THREE.Group();
  dorsal.name = "dorsal_blade";
  torso.add(dorsal);
  part(
    dorsal,
    cached("dorsal", () =>
      sculptedFin(
        [
          [-0.17, 0.098],
          [-0.09, 0.265],
          [-0.054, 0.268],
          [0.076, 0.079],
        ],
        0.014,
        "vertical",
        { smooth: false, camber: 0 },
      ),
    ),
    MAT.armor,
  );
  part(
    dorsal,
    cached("dorsal_spine", () =>
      tube(
        [
          [0, 0.112, -0.162],
          [0, 0.22, -0.077],
          [0, 0.228, -0.058],
        ],
        0.0038,
      ),
    ),
    MAT.steel,
  );
  part(
    dorsal,
    cached("dorsal_light", () =>
      tube(
        [
          [0, 0.13, 0.041],
          [0, 0.19, -0.015],
          [0, 0.21, -0.029],
        ],
        0.0018,
      ),
    ),
    MAT.cyan,
  );

  const fins = [];
  for (const side of [-1, 1]) {
    const fin = new THREE.Group();
    fin.name = `servo_pectoral_${side}`;
    fin.position.set(side * 0.084, -0.038, -0.16);
    torso.add(fin);
    part(
      fin,
      cached(`fin_${side}`, () => {
        const g = sculptedFin(
          [
            [-0.05, 0],
            [0.003, side * 0.15],
            [0.08, side * 0.194],
            [0.065, side * 0.045],
            [0.048, 0],
          ],
          0.013,
          "horizontal",
          { smooth: false, camber: 0.008 },
        );
        return g;
      }),
      MAT.armor,
    );
    part(
      fin,
      cached(`fin_edge_${side}`, () =>
        tube(
          [
            [side * 0.009, -0.002, -0.032],
            [side * 0.142, -0.004, 0.02],
            [side * 0.176, -0.004, 0.063],
          ],
          0.0026,
        ),
      ),
      MAT.steel,
    );
    part(
      fin,
      cached(`fin_seam_${side}`, () =>
        tube(
          [
            [side * 0.047, 0.007, 0.003],
            [side * 0.075, 0.007, 0.039],
          ],
          0.002,
        ),
      ),
      MAT.recess,
    );
    part(
      fin,
      cached(`hinge_${side}`, () =>
        ellipsoid([side * 0.002, 0, 0.004], [0.018, 0.018, 0.036]),
      ),
      MAT.steel,
    );
    fins.push({ fin, side });
  }
  const tail = new THREE.Group();
  tail.name = "tail_servo";
  tail.position.z = 0.275;
  torso.add(tail);
  part(
    tail,
    cached("tail_stalk", () =>
      shell(0.274, 0.39, 0, Math.PI * 2, 16, 20, 0.001).translate(0, 0, -0.275),
    ),
    MAT.dark,
  );
  part(
    tail,
    cached("tail_rings", () =>
      batch(
        [0.292, 0.316, 0.343, 0.365].map((z) => {
          const g = new THREE.TorusGeometry(0.023, 0.003, 6, 20);
          g.scale(1, 0.82, 1);
          g.translate(0, 0, z - 0.275);
          return g;
        }),
      ),
    ),
    MAT.steel,
  );
  const caudal = new THREE.Group();
  caudal.name = "swept_caudal";
  caudal.position.z = 0.106;
  tail.add(caudal);
  part(
    caudal,
    cached("caudal", () =>
      sculptedFin(
        [
          [-0.017, 0.007],
          [0.095, 0.192],
          [0.117, 0.201],
          [0.079, 0.039],
          [0.116, -0.139],
          [0.09, -0.129],
          [0.002, -0.011],
        ],
        0.012,
        "vertical",
        { smooth: false, camber: 0 },
      ),
    ),
    MAT.armor,
  );
  part(
    caudal,
    cached("caudal_edge", () =>
      tube(
        [
          [0, 0.008, -0.013],
          [0, 0.18, 0.092],
          [0, 0.189, 0.107],
        ],
        0.003,
      ),
    ),
    MAT.cyan,
  );

  const jaw = new THREE.Group();
  jaw.name = "segmented_jaw";
  jaw.position.set(0, -0.038, -0.265);
  torso.add(jaw);
  part(
    jaw,
    cached("jaw_plate", () =>
      batch([
        ellipsoid([0, -0.002, -0.087], [0.06, 0.021, 0.108]),
        plate(
          [
            [-0.052, 0.008, -0.02],
            [-0.051, 0.005, -0.165],
            [0, 0.014, -0.204],
            [0.051, 0.005, -0.165],
            [0.052, 0.008, -0.02],
          ],
          0.009,
        ),
      ]),
    ),
    MAT.steel,
  );
  part(
    jaw,
    cached("jaw_shadow", () =>
      ellipsoid([0, 0.014, -0.076], [0.052, 0.006, 0.095]),
    ),
    MAT.recess,
  );
  part(
    jaw,
    cached("lower_teeth", () => teeth(false).translate(0, 0.038, 0.265)),
    MAT.steel,
  );
  part(
    torso,
    cached("upper_teeth", () => teeth(true)),
    MAT.steel,
  );
  addFeedingMouth(root, jaw, [0, 0.021, -0.154]);
  const muzzle = new THREE.Object3D();
  muzzle.name = "ventral_torpedo_exit";
  muzzle.position.set(0, -0.066, -0.465);
  torso.add(muzzle);
  root.userData.getTorpedoMuzzle = (out) => muzzle.getWorldPosition(out);
  part(
    torso,
    cached("launcher", () =>
      batch([
        tube(
          [
            [0, -0.055, -0.21],
            [0, -0.063, -0.32],
            [0, -0.064, -0.444],
          ],
          0.018,
        ),
        ...[-1, 1].map((s) =>
          tube(
            [
              [s * 0.024, -0.076, -0.26],
              [s * 0.024, -0.077, -0.4],
            ],
            0.0028,
          ),
        ),
      ]),
    ),
    MAT.recess,
  );
  part(
    torso,
    cached("launcher_lip", () => {
      const g = new THREE.TorusGeometry(0.0185, 0.003, 7, 24);
      g.translate(0, -0.064, -0.444);
      return g;
    }),
    MAT.steel,
  );

  const flames = [],
    pumps = [];
  for (const side of [-1, 1]) {
    const pod = new THREE.Group();
    pod.name = `vector_thruster_${side}`;
    pod.position.set(side * 0.142, -0.027, 0.035);
    torso.add(pod);
    part(
      pod,
      cached("pod_shell", () => {
        const g = new THREE.CapsuleGeometry(0.032, 0.165, 7, 24);
        g.rotateX(Math.PI / 2);
        return g;
      }),
      MAT.armor,
    );
    part(
      pod,
      cached("pod_cowl", () =>
        paint(
          batch([
            plate(
              [
                [-0.034, 0.016, -0.086],
                [-0.035, 0.028, 0.018],
                [-0.024, 0.04, 0.045],
                [0.024, 0.04, 0.045],
                [0.035, 0.028, 0.018],
                [0.034, 0.016, -0.086],
              ],
              0.005,
            ),
            plate(
              [
                [-0.032, -0.015, -0.035],
                [-0.037, -0.014, 0.063],
                [-0.029, -0.028, 0.076],
                [-0.024, -0.028, -0.035],
              ],
              0.004,
            ),
            plate(
              [
                [0.032, -0.015, -0.035],
                [0.024, -0.028, -0.035],
                [0.029, -0.028, 0.076],
                [0.037, -0.014, 0.063],
              ],
              0.004,
            ),
          ]),
          0x21549a,
        ),
      ),
      MAT.armor,
    );
    part(
      pod,
      cached("pod_stripes", () =>
        batch(
          [-0.047, 0.048].map((z) => {
            const g = new THREE.TorusGeometry(0.0325, 0.0028, 6, 24);
            g.translate(0, 0, z);
            return g;
          }),
        ),
      ),
      MAT.amber,
    );
    part(
      pod,
      cached("pod_recess", () => {
        const g = new THREE.CylinderGeometry(0.025, 0.03, 0.076, 24, 1, true);
        g.rotateX(Math.PI / 2);
        g.translate(0, 0, 0.098);
        return g;
      }),
      MAT.recess,
    );
    part(
      pod,
      cached("nozzle_rings", () =>
        batch(
          [0.09, 0.106, 0.123].map((z, i) => {
            const g = new THREE.TorusGeometry(0.029 - i * 0.002, 0.0032, 7, 24);
            g.translate(0, 0, z);
            return g;
          }),
        ),
      ),
      MAT.steel,
    );
    part(
      pod,
      cached("ignition_ring", () => {
        const g = new THREE.TorusGeometry(0.022, 0.0015, 5, 24);
        g.translate(0, 0, 0.121);
        return g;
      }),
      MAT.cyan,
    );
    part(
      pod,
      cached("pod_vanes", () =>
        batch(
          Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return tube(
              [
                [Math.cos(a) * 0.022, Math.sin(a) * 0.022, 0.087],
                [Math.cos(a) * 0.024, Math.sin(a) * 0.024, 0.119],
              ],
              0.0019,
            );
          }),
        ),
      ),
      MAT.steel,
    );
    part(
      torso,
      cached(`strut_${side}`, () =>
        tube(
          [
            [side * 0.07, -0.02, -0.04],
            [side * 0.142, -0.027, 0.015],
            [side * 0.142, -0.027, 0.04],
          ],
          0.012,
        ),
      ),
      MAT.dark,
    );
    const material = flameMaterial();
    const flame = part(
      pod,
      cached("flame", () => {
        const g = new THREE.ConeGeometry(0.028, 0.4, 24, 16, true);
        g.rotateX(Math.PI / 2);
        g.translate(0, 0, 0.2);
        return g;
      }),
      material,
      [0, 0, 0.128],
    );
    flame.name = "thruster_plume";
    flame.userData.keepSeparate = true;
    flame.userData.noShadow = true;
    flame.visible = false;
    flames.push(flame);
    pumps.push(pod);
  }
  let launch = 0;
  root.userData.triggerLaunch = () => {
    launch = 1;
  };
  root.userData.mechanicalAnatomy = {
    armorPanels: 35,
    twinThrusters: 2,
    launchPort: "ventral_torpedo_exit",
    normalizedLength: 1,
  };
  root.userData.normalizedLength = 1;
  // 火焰仅绑定实际冲刺状态，闭合循环不添加光源或额外RAF。
  motions.push((phase, effort, state = {}) => {
    const boost = state.boost || 0,
      power = state.power || 0.25,
      turn = state.turn || 0;
    const stroke = Math.sin(phase) * (0.045 + power * 0.08);
    tail.rotation.y = stroke - turn * 0.09;
    caudal.rotation.y = Math.sin(phase - 0.65) * (0.08 + power * 0.16);
    torso.rotation.z = -turn * 0.13 + Math.sin(phase * 0.5) * 0.006;
    for (const { fin, side } of fins) {
      fin.rotation.z = side * (0.03 + boost * 0.16) - turn * 0.045;
      fin.rotation.x = (state.pitchInput || 0) * 0.055;
    }
    launch *= Math.exp(-(state.dt || 0) * 11);
    jaw.rotation.x = 0.065 + (state.feed || 0) * 0.22 + launch * 0.045;
    for (const [i, flame] of flames.entries()) {
      flame.visible = boost > 0.015;
      flame.material.uniforms.power.value = boost;
      flame.material.uniforms.phase.value = phase * 7 + i * 2.1;
      flame.scale.set(1, 1, 0.55 + boost * 0.9);
    }
    root.userData.pose.mechanical = {
      tailYaw: tail.rotation.y,
      boost,
      launch,
      plumes: boost > 0.015 ? 2 : 0,
    };
  });
  root.userData.disposeMechanical = () => {
    flames.forEach((f) => f.material.dispose());
  };
}

const CACHE = new Map();
const PROFILE = [
  [-0.484, 0.001, 0.002, -0.006],
  [-0.46, 0.029, 0.021, -0.002],
  [-0.425, 0.059, 0.048, 0.005],
  [-0.36, 0.082, 0.076, 0.007],
  [-0.25, 0.102, 0.097, 0.009],
  [-0.1, 0.106, 0.103, 0.008],
  [0.06, 0.078, 0.079, 0.001],
  [0.19, 0.046, 0.048, -0.004],
  [0.29, 0.026, 0.027, 0],
  [0.38, 0.016, 0.019, 0],
];
const MAT = {
  armor: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.56,
    roughness: 0.36,
    vertexColors: true,
  }),
  dark: new THREE.MeshStandardMaterial({
    color: 0x233544,
    metalness: 0.65,
    roughness: 0.4,
  }),
  recess: new THREE.MeshStandardMaterial({
    color: 0x06141e,
    metalness: 0.35,
    roughness: 0.56,
  }),
  steel: new THREE.MeshStandardMaterial({
    color: 0x728b9a,
    metalness: 0.74,
    roughness: 0.29,
  }),
  cyan: new THREE.MeshStandardMaterial({
    color: 0x5bbecf,
    emissive: 0x2196b5,
    emissiveIntensity: 0.7,
    roughness: 0.3,
    metalness: 0.3,
  }),
  amber: new THREE.MeshStandardMaterial({
    color: 0xe9a568,
    emissive: 0x993d12,
    emissiveIntensity: 0.22,
    metalness: 0.4,
    roughness: 0.4,
  }),
};
function cached(key, make) {
  if (!CACHE.has(key)) CACHE.set(key, make());
  return CACHE.get(key);
}
function part(parent, geometry, material, position = [0, 0, 0]) {
  if (!geometry.attributes.color)
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(
        Array(geometry.attributes.position.count * 3).fill(1),
        3,
      ),
    );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.fromArray(position);
  parent.add(mesh);
  return mesh;
}
function batch(items) {
  const transformed = items.map((g) => {
    const c = g.index ? g.toNonIndexed() : g.clone();
    c.deleteAttribute("uv");
    if (!c.attributes.color)
      c.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(
          Array(c.attributes.position.count * 3).fill(1),
          3,
        ),
      );
    return c;
  });
  const result = mergeGeometries(transformed);
  items.forEach((g) => g.dispose());
  transformed.forEach((g) => g.dispose());
  return result;
}
function ellipsoid(position, scale) {
  const g = new THREE.SphereGeometry(1, 20, 14);
  g.scale(...scale);
  g.translate(...position);
  return g;
}
function tube(points, radius) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
    Math.max(4, points.length * 4),
    radius,
    6,
    false,
  );
}
function surface(z, a, offset = 0) {
  const [x, y, shift] = sampleSection(PROFILE, z);
  return new THREE.Vector3(
    Math.cos(a) * (x + offset),
    Math.sin(a) * (y + offset) + shift,
    z,
  );
}
function shell(z0, z1, a0, a1, rings, sides, offset) {
  const p = [],
    indices = [],
    color = [];
  for (let i = 0; i <= rings; i++)
    for (let j = 0; j <= sides; j++) {
      const z = z0 + ((z1 - z0) * i) / rings,
        a = a0 + ((a1 - a0) * j) / sides;
      const edge = Math.min(i / rings, 1 - i / rings, j / sides, 1 - j / sides);
      const v = surface(
        z,
        a,
        offset > 0
          ? offset * (0.45 + 0.55 * THREE.MathUtils.smoothstep(edge, 0, 0.08))
          : offset,
      );
      p.push(v.x, v.y, v.z);
      const sector = Math.sin((a0 + a1) * 0.5),
        station = (z0 + z1) * 0.5;
      const c = new THREE.Color(
        station < -0.31
          ? 0xd2e1e9
          : sector > 0.6
            ? 0x142c4b
            : sector > -0.25
              ? 0x225ba1
              : 0x879ba8,
      );
      color.push(c.r, c.g, c.b);
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
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(color, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function armor() {
  const parts = [],
    stations = [-0.47, -0.392, -0.29, -0.175, -0.065, 0.05, 0.155, 0.274];
  for (let i = 0; i < stations.length - 1; i++)
    for (let sector = 0; sector < 5; sector++) {
      const a = (sector * Math.PI * 2) / 5 + 0.022;
      parts.push(
        shell(
          stations[i] + 0.002,
          stations[i + 1] - 0.002,
          a,
          a + (Math.PI * 2) / 5 - 0.044,
          8,
          10,
          0.004,
        ),
      );
    }
  return batch(parts);
}
// 宽肩装甲、低压眉骨、测距桅杆与铜色工程带，轮廓仍保持原单位全长。
function shoulderArmor() {
  const pieces = [];
  for (const side of [-1, 1]) {
    pieces.push(
      paint(
        plate(
          [
            [side * 0.081, 0.048, -0.302],
            [side * 0.112, 0.059, -0.231],
            [side * 0.113, 0.071, -0.13],
            [side * 0.078, 0.094, -0.096],
            [side * 0.068, 0.083, -0.234],
          ],
          0.009,
        ),
        0x285ba3,
      ),
    );
    pieces.push(
      paint(
        plate(
          [
            [side * 0.049, 0.04, -0.432],
            [side * 0.078, 0.066, -0.371],
            [side * 0.085, 0.062, -0.324],
            [side * 0.071, 0.048, -0.336],
          ],
          0.008,
        ),
        0x183656,
      ),
    );
  }
  pieces.push(
    paint(
      plate(
        [
          [-0.026, 0.104, -0.14],
          [-0.02, 0.134, -0.1],
          [0.02, 0.134, -0.1],
          [0.026, 0.104, -0.14],
        ],
        0.012,
      ),
      0x294d6e,
    ),
  );
  return batch(pieces);
}
function sensorCircuits() {
  const pieces = [];
  for (const side of [-1, 1]) {
    pieces.push(
      tube(
        [
          [side * 0.112, 0.057, -0.237],
          [side * 0.116, 0.068, -0.177],
          [side * 0.099, 0.082, -0.143],
          [side * 0.083, 0.095, -0.104],
        ],
        0.0023,
      ),
    );
    for (let i = 0; i < 4; i++)
      pieces.push(
        tube(
          [
            [side * 0.103, 0.013, -0.273 + i * 0.017],
            [side * 0.11, 0.032, -0.261 + i * 0.017],
          ],
          0.0021,
        ),
      );
    pieces.push(ellipsoid([side * 0.021, 0.12, -0.117], [0.005, 0.005, 0.008]));
  }
  return batch(pieces);
}
function engineeringBands() {
  const pieces = [];
  for (const side of [-1, 1]) {
    pieces.push(
      plate(
        [
          [side * 0.107, 0.061, -0.241],
          [side * 0.11, 0.063, -0.23],
          [side * 0.108, 0.073, -0.162],
          [side * 0.104, 0.071, -0.17],
        ],
        0.002,
      ),
    );
    for (const z of [-0.09, 0.019, 0.129])
      pieces.push(
        tube(
          [
            surface(z, side > 0 ? 0.48 : Math.PI - 0.48, 0.008).toArray(),
            surface(
              z + 0.014,
              side > 0 ? 0.16 : Math.PI - 0.16,
              0.008,
            ).toArray(),
          ],
          0.003,
        ),
      );
  }
  return batch(pieces);
}
function paint(geometry, color) {
  const c = new THREE.Color(color),
    colors = [];
  for (let i = 0; i < geometry.attributes.position.count; i++)
    colors.push(c.r, c.g, c.b);
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}
function trim() {
  const parts = [];
  for (const side of [-1, 1]) {
    const a = side > 0 ? 0.14 : Math.PI - 0.14;
    parts.push(
      tube(
        [-0.38, -0.26, -0.1, 0.055, 0.19].map((z) =>
          surface(z, a, 0.007).toArray(),
        ),
        0.0028,
      ),
    );
    // 低压眉骨和颞部透镜罩形成向前的凶狠视线。
    parts.push(
      plate(
        [
          [side * 0.053, 0.034, -0.427],
          [side * 0.071, 0.054, -0.367],
          [side * 0.086, 0.053, -0.324],
          [side * 0.079, 0.04, -0.332],
        ],
        0.004,
      ),
    );
    for (let i = 0; i < 5; i++) {
      const z = -0.27 + i * 0.016;
      parts.push(
        tube(
          [
            [side * 0.102, 0.028, z],
            [side * 0.102, -0.012, z + 0.005],
            [side * 0.096, -0.035, z + 0.01],
          ],
          0.0018,
        ),
      );
    }
    for (let i = 0; i < 6; i++) {
      const z = -0.2 + i * 0.065,
        v = surface(z, side > 0 ? 0.7 : Math.PI - 0.7, 0.006);
      parts.push(ellipsoid(v.toArray(), [0.0021, 0.0021, 0.0021]));
    }
  }
  return batch(parts);
}
function vents() {
  const p = [];
  for (const side of [-1, 1]) {
    p.push(
      plate(
        [
          [side * 0.1, 0.038, -0.289],
          [side * 0.108, 0.034, -0.187],
          [side * 0.104, -0.035, -0.18],
          [side * 0.095, -0.032, -0.28],
        ],
        0.002,
      ),
    );
    p.push(
      shell(
        -0.42,
        -0.33,
        side > 0 ? 0.16 : Math.PI - 0.57,
        side > 0 ? 0.57 : Math.PI - 0.16,
        12,
        10,
        0.009,
      ),
    );
  }
  return batch(p);
}
function optics() {
  return batch(
    [-1, 1].map((side) => {
      const points = [],
        indices = [];
      for (let i = 0; i <= 18; i++)
        for (let j = 0; j <= 4; j++) {
          const u = i / 18,
            z = -0.418 + u * 0.08,
            angle =
              0.12 +
              u * 0.35 +
              (j / 4 - 0.5) * (0.045 + 0.13 * Math.sin(u * Math.PI));
          const v = surface(z, side > 0 ? angle : Math.PI - angle, 0.014);
          points.push(v.x, v.y, v.z);
          if (i < 18 && j < 4) {
            const n = i * 5 + j;
            if (side > 0) indices.push(n, n + 1, n + 5, n + 1, n + 6, n + 5);
            else indices.push(n, n + 5, n + 1, n + 1, n + 5, n + 6);
          }
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
      g.setIndex(indices);
      g.computeVertexNormals();
      return g;
    }),
  );
}
function markings() {
  const pieces = [];
  for (const side of [-1, 1])
    for (const z of [-0.16, -0.12, 0.035]) {
      const a = side > 0 ? 0.23 : Math.PI - 0.23;
      pieces.push(
        tube(
          [
            surface(z, a, 0.007).toArray(),
            surface(z + 0.023, a + 0.025 * side, 0.007).toArray(),
          ],
          0.002,
        ),
      );
    }
  return batch(pieces);
}
function teeth(upper) {
  const p = [];
  for (const side of [-1, 1])
    for (let i = 0; i < 10; i++) {
      const z = -0.429 + i * 0.013,
        x = side * (0.024 + (i / 9) * 0.037),
        y = -0.021;
      const g = new THREE.ConeGeometry(0.0038, 0.013, 4);
      if (upper) g.rotateZ(Math.PI);
      g.translate(x, y + (upper ? -0.001 : -0.014), z);
      p.push(g);
    }
  return batch(p);
}
function plate(points, depth) {
  const contour = points.map((p) => new THREE.Vector3(...p)),
    center = contour
      .reduce((v, p) => v.add(p), new THREE.Vector3())
      .multiplyScalar(1 / contour.length);
  const normal = new THREE.Vector3()
    .subVectors(contour[1], contour[0])
    .cross(new THREE.Vector3().subVectors(contour[2], contour[0]))
    .normalize();
  const positions = [];
  const tri = (a, b, c) =>
    positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
  const back = contour.map((v) => v.clone().addScaledVector(normal, -depth)),
    backCenter = center.clone().addScaledVector(normal, -depth);
  for (let i = 0; i < contour.length; i++) {
    const j = (i + 1) % contour.length;
    tri(center, contour[i], contour[j]);
    tri(backCenter, back[j], back[i]);
    tri(contour[i], back[i], back[j]);
    tri(contour[i], back[j], contour[j]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}
function flameMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { phase: { value: 0 }, power: { value: 0 } },
    vertexShader: `varying vec3 vP;varying vec2 vUv;uniform float phase;uniform float power;
    void main(){vP=position;vUv=uv;vec3 p=position;float q=clamp(p.z/.4,0.,1.);p.x+=sin(q*14.-phase)*.004*q;p.y+=cos(q*17.-phase*1.2)*.003*q;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `varying vec3 vP;varying vec2 vUv;uniform float phase;uniform float power;
    void main(){float t=clamp(vP.z/.4,0.,1.);float stripes=.8+.2*sin(vUv.x*32.+phase+t*23.);float alpha=power*(1.-smoothstep(.65,1.,t))*.58*stripes;vec3 color=mix(vec3(.25,.72,1.),vec3(1.,.29,.045),smoothstep(.12,.85,t));color+=vec3(.3,.35,.35)*(1.-t);gl_FragColor=vec4(color,alpha);}`,
  });
}
