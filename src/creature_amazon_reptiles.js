import * as THREE from "three";
import { bindSerpentineMotion } from "./serpentine_motion.js";
import { buildCrocodilian } from "./crocodilian_anatomy.js";
import { sampleSection } from "./creature_surface.js";
import {
  amazonGeometry,
  amazonLoft,
  amazonMesh,
  amazonEllipsoid,
  amazonEyes,
  amazonFin,
  amazonTube,
  amazonSpike,
} from "./amazon_anatomy.js";

/**
 * 接入鳄类专用解剖与骨架，蛇和龟仍使用已有的独立构造。
 * @param {string} kind 已注册的鳄类名称。
 * @param {THREE.Group} parent 亚马逊解剖根节点。
 * @param {Function[]} motions 主循环动作队列。
 * @returns {void} 在已有根节点中添加鳄类部件。
 */
export function buildAmazonReptile(kind, parent, motions) {
  buildCrocodilian(kind, parent, motions);
}

/** 细长蛇身与低宽蛇头；稳定前段、延迟侧波，不以夸张弯折把长蛇缩成短胖虫。 */
export function buildAmazonSerpent(kind, parent, motions) {
  const lord = kind === "yacumama",
    w = lord ? 0.049 : kind === "titanoboa" ? 0.024 : 0.017;
  const back = lord ? "#485646" : kind === "titanoboa" ? "#77724c" : "#6b7841",
    belly = lord ? "#9f8560" : "#c2aa6b";
  const profile = [
    [-0.435, w * 0.69, w * 0.71],
    [-0.37, w * 0.91, w * 0.94],
    [-0.23, w, w],
    [0.22, w * 0.93, w * 0.96],
    [0.43, w * 0.7, w * 0.73],
    [0.54, w * 0.39, w * 0.42],
    [0.62, 0.0002, 0.0003],
  ];
  const g = amazonLoft(
    `${kind}_long_skeletal_body_v2`,
    profile,
    back,
    belly,
    (x, y, z, a) => {
      // 背侧的错列椭圆斑不能跨过整圈，否则长蛇会呈现不自然的横向条纹。
      const angleDistance = (target) =>
        Math.abs(Math.atan2(Math.sin(a - target), Math.cos(a - target)));
      let spot = Infinity;
      for (const side of [-1, 1]) {
        const row = (z + 0.44) * 17 + (side > 0 ? 0.28 : 0),
          k = Math.floor(row),
          dz = row - k - (0.5 + Math.sin(k * 4.2) * 0.08);
        spot = Math.min(
          spot,
          Math.hypot(
            dz / 0.35,
            angleDistance(Math.PI / 2 + side * 0.48) / 0.38,
          ),
        );
      }
      const row = (z + 0.43) * 17,
        dz = row - Math.floor(row) - 0.5,
        lateral = Math.hypot(
          dz / 0.28,
          Math.min(angleDistance(0), angleDistance(Math.PI)) / 0.26,
        );
      return spot < 1
        ? 0.75 * THREE.MathUtils.smoothstep(1 - spot, 0, 0.3)
        : lateral > 0.52 && lateral < 1
          ? 0.66
          : y < -w * 0.6 && Math.sin(z * 350) > 0.6
            ? 0.24
            : 0;
    },
    136,
    36,
  );
  const temporary = amazonMesh(
    parent,
    g,
    "#ffffff",
    [0, 0, 0],
    "long_continuous_serpent",
    true,
  );
  bindSerpentineMotion(temporary, motions, { amplitude: lord ? 0.7 : 0.65 });
  const head = new THREE.Group();
  parent.add(head);
  const hw = w * (lord ? 1.65 : 1.38),
    hh = w * 0.61;
  amazonMesh(
    head,
    amazonLoft(
      `${kind}_angular_skull_v2`,
      [
        [-0.546, 0.004, 0.004],
        [-0.535, hw * 0.49, hh * 0.43],
        [-0.513, hw * 0.93, hh * 0.88],
        [-0.482, hw, hh],
        [-0.45, w * 0.8, w * 0.6],
        [-0.419, w * 0.7, w * 0.7],
      ],
      back,
      belly,
      (x, y, z) => (Math.sin(z * 240 + x * 310) > 0.4 ? 0.2 : 0),
      54,
      30,
    ),
    "#ffffff",
    [0, w * 0.1, 0],
    "flattened_serpent_skull",
    true,
  );
  const jaw = new THREE.Group();
  jaw.position.set(0, -w * 0.22, -0.447);
  head.add(jaw);
  amazonMesh(
    jaw,
    amazonLoft(
      `${kind}_hinged_serpent_jaw`,
      [
        [-0.097, 0.002, 0.002],
        [-0.087, hw * 0.49, w * 0.14],
        [-0.058, hw * 0.89, w * 0.23],
        [-0.023, hw * 0.83, w * 0.28],
        [0.009, w * 0.6, w * 0.21],
      ],
      belly,
      back,
      () => 0.03,
      40,
      24,
    ),
    "#ffffff",
    [0, -w * 0.1, 0],
    "serpent_mandible",
    true,
  );
  const gape = lord ? 0.36 : 0.03;
  motions.push((t, e) => {
    jaw.rotation.x = -(
      gape +
      Math.sin(t * 0.5) * 0.025 +
      Math.max(0, e - 1) * (lord ? 0.018 : 0.006)
    );
  });
  amazonEyes(
    head,
    hw * (lord ? 0.79 : 0.83),
    hh * 0.61,
    -0.508,
    w * (lord ? 0.14 : 0.2),
    lord ? "#b76325" : "#ae984f",
    true,
  );
  for (const side of [-1, 1]) {
    amazonTube(
      head,
      `${kind}_eye_stripe_${side}`,
      [
        [side * hw * 0.79, hh * 0.37, -0.512],
        [side * hw * 0.96, hh * 0.03, -0.491],
        [side * w * 0.83, -hh * 0.15, -0.453],
      ],
      w * 0.12,
      "#1e2b22",
    );
    amazonEllipsoid(
      head,
      "#1c261c",
      [side * hw * 0.3, hh * 0.74, -0.531],
      [w * 0.08, w * 0.045, w * 0.1],
      "dorsal_nostril",
    );
    if (lord)
      for (let i = 0; i < 8; i++) {
        const z = -0.526 + i * 0.009,
          x = side * hw * (0.52 + Math.sin((i / 7) * Math.PI) * 0.35);
        amazonSpike(
          head,
          `yacumama_recurved_fang_${side}_${i}`,
          [
            [x, -w * 0.1, z],
            [x * 0.97, -w * 0.47, z + 0.007],
            [x * 0.9, -w * 0.65, z + 0.013],
          ],
          w * 0.09,
          "#ccb893",
        );
      }
  }
  if (lord) {
    for (const side of [-1, 1]) {
      amazonSpike(
        head,
        `yacumama_bony_brow_${side}`,
        [
          [side * hw * 0.61, hh * 0.77, -0.503],
          [side * hw * 0.84, hh * 1.55, -0.472],
          [side * hw * 0.61, hh * 1.82, -0.437],
        ],
        w * 0.22,
        "#94846a",
      );
      amazonSpike(
        head,
        `yacumama_scarred_cheek_${side}`,
        [
          [side * hw * 0.82, hh * 0.16, -0.481],
          [side * hw * 1.14, hh * 0.14, -0.461],
          [side * hw * 1.28, hh * 0.55, -0.421],
        ],
        w * 0.25,
        "#7c7758",
      );
      amazonTube(
        head,
        `yacumama_old_scar_${side}`,
        [
          [side * hw * 0.82, hh * 0.2, -0.521],
          [side * hw * 0.95, hh * 0.38, -0.494],
          [side * hw * 0.79, hh * 0.9, -0.467],
        ],
        0.0019,
        "#957354",
      );
    }
    // 舌与暗红口腔提供近距离威胁感；不是独立技能或伤害区域。
    amazonEllipsoid(
      jaw,
      "#522c28",
      [0, 0.013, -0.043],
      [hw * 0.67, 0.004, 0.04],
      "dark_oral_cavity",
    );
    for (const side of [-1, 1])
      amazonTube(
        jaw,
        `yacumama_forked_tongue_${side}`,
        [
          [0, 0.019, -0.063],
          [0, 0.016, -0.088],
          [side * 0.008, 0.011, -0.109],
        ],
        0.002,
        "#7c4038",
      );
  }
}

/** 河龟宽扁甲壳、连续腹甲、侧颈和有趾蹼的划水四肢。 */
export function buildAmazonTurtle(kind, parent, motions) {
  const giant = kind === "stupendemys",
    rx = giant ? 0.32 : 0.25,
    rz = giant ? 0.36 : 0.29,
    h = giant ? 0.115 : 0.103,
    color = giant ? "#7b7350" : "#506544";
  const shell = amazonGeometry(kind + "_carapace_v2", () => {
    const g = new THREE.SphereGeometry(1, 48, 24),
      p = g.attributes.position,
      c = [],
      a = new THREE.Color(color),
      b = new THREE.Color("#baa773");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      p.setXYZ(i, x * rx, y >= 0 ? y * h : y * 0.025, z * rz);
      const row = Math.floor((z + 1) * 4),
        u = ((x + 1) * 4 + row * 0.5) % 1,
        v = ((z + 1) * 4) % 1,
        seam = Math.min(u, 1 - u, v, 1 - v) < 0.085;
      const shade = a
        .clone()
        .lerp(b, seam ? 0.48 : 0.04)
        .multiplyScalar(0.9 + 0.09 * Math.sin(x * 32 + z * 41));
      shade.toArray(c, c.length);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
    g.computeVertexNormals();
    return g;
  });
  amazonMesh(parent, shell, "#ffffff", [0, 0.015, 0], "scuted_carapace", true);
  amazonEllipsoid(
    parent,
    "#baa77c",
    [0, -0.023, 0],
    [rx * 0.9, 0.029, rz * 0.94],
    "plastron",
  );
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2,
      x = Math.cos(a) * rx,
      z = Math.sin(a) * rz;
    const n = amazonEllipsoid(
      parent,
      i % 3 ? color : "#8c8558",
      [x * 0.97, 0.006, z * 0.97],
      [0.014, 0.007, 0.024],
      "marginal_scute",
    );
    n.rotation.y = -a;
  }
  const head = new THREE.Group();
  head.position.z = -rz * 0.78;
  parent.add(head);
  amazonTube(
    head,
    kind + "_folded_side_neck",
    [
      [0, -0.017, 0],
      [0.019, -0.024, -0.09],
      [0.012, -0.013, -0.158],
    ],
    0.029,
    color,
  );
  amazonMesh(
    head,
    amazonLoft(
      kind + "_beaked_head",
      [
        [-0.227, 0.004, 0.003],
        [-0.213, 0.028, 0.019],
        [-0.183, 0.037, 0.027],
        [-0.155, 0.03, 0.021],
        [-0.12, 0.022, 0.02],
      ],
      color,
      "#ae9e6b",
      () => 0.05,
      32,
      24,
    ),
    "#ffffff",
    [0, 0, 0],
    "beaked_turtle_head",
    true,
  );
  amazonEyes(head, 0.028, 0.014, -0.19, 0.0067, "#d0ac66");
  amazonTube(
    head,
    kind + "_turtle_beak_seam",
    [
      [-0.03, -0.006, -0.211],
      [0, -0.009, -0.22],
      [0.03, -0.006, -0.211],
    ],
    0.0018,
    "#302f1d",
  );
  for (const side of [-1, 1])
    for (let pair = 0; pair < 2; pair++) {
      const limb = new THREE.Group();
      limb.position.set(
        side * rx * 0.72,
        -0.026,
        pair ? rz * 0.65 : -rz * 0.64,
      );
      parent.add(limb);
      amazonSpike(
        limb,
        `${kind}_paddling_leg_${side}_${pair}`,
        [
          [0, 0, 0],
          [side * 0.062, -0.019, pair ? 0.034 : -0.017],
          [side * 0.1, -0.028, 0.065],
        ],
        0.039,
        color,
      );
      // 肉质手掌覆盖前肢末端，并将趾蹼和弯曲趾爪连接成连续的划水足。
      amazonEllipsoid(
        limb,
        color,
        [side * 0.107, -0.029, 0.076],
        [0.033, 0.015, 0.045],
        "webbed_turtle_palm",
      );
      amazonFin(
        limb,
        `${kind}_webbing_${side}_${pair}`,
        [
          [0.037, side * 0.07],
          [0.075, side * 0.149],
          [0.134, side * 0.139],
          [0.117, side * 0.074],
        ],
        color,
        "horizontal",
        [0, -0.027, 0],
      );
      for (let i = 0; i < 4; i++) {
        amazonSpike(
          limb,
          `${kind}_turtle_digit_${side}_${pair}_${i}`,
          [
            [side * (0.08 + i * 0.014), -0.028, 0.078],
            [side * (0.09 + i * 0.014), -0.029, 0.116],
            [side * (0.09 + i * 0.014), -0.024, 0.137],
          ],
          0.007,
          color,
        );
        amazonSpike(
          limb,
          `${kind}_turtle_claw_${side}_${pair}_${i}`,
          [
            [side * (0.09 + i * 0.014), -0.026, 0.124],
            [side * (0.09 + i * 0.014), -0.022, 0.137],
            [side * (0.085 + i * 0.014), -0.024, 0.144],
          ],
          0.0025,
          "#c2b18a",
        );
      }
      motions.push((t) => {
        limb.rotation.y = side * Math.sin(t * 0.8 + pair * Math.PI) * 0.24;
        limb.rotation.x = Math.sin(t * 0.8 + pair) * 0.08;
      });
    }
  amazonSpike(
    parent,
    kind + "_turtle_tail",
    [
      [0, -0.028, rz * 0.8],
      [0.008, -0.029, rz + 0.035],
      [0, -0.026, rz + 0.073],
    ],
    0.014,
    color,
  );
  if (giant)
    for (const side of [-1, 1])
      amazonSpike(
        parent,
        `stupendemys_anterior_horn_${side}`,
        [
          [side * rx * 0.66, 0.026, -rz * 0.76],
          [side * rx * 0.86, 0.078, -rz * 0.97],
          [side * rx * 0.69, 0.096, -rz * 1.18],
        ],
        0.035,
        "#a69870",
      );
  motions.push((t) => {
    parent.rotation.z = Math.sin(t * 0.32) * 0.017;
    head.rotation.y = Math.sin(t * 0.35) * 0.045;
  });
}
