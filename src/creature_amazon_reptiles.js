import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { bindSerpentineMotion } from "./serpentine_motion.js";
import { bindCrocodilianTail } from "./aquatic_reptile_motion.js";
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

/** 鳄类：长吻与独立下颌、连贯肌肉尾、嵌入式眼眶、分区骨甲和五/四趾足。 */
export function buildAmazonReptile(kind, parent, motions) {
  const lord = kind === "rootjaw",
    colossus = kind === "rootback_colossus",
    giant = lord || colossus,
    broad = kind === "purussaurus" || giant;
  const w = lord ? 0.19 : colossus ? 0.16 : broad ? 0.137 : 0.098,
    h = lord ? 0.115 : colossus ? 0.105 : 0.063;
  const back = lord
      ? "#35413a"
      : colossus
        ? "#56533b"
        : kind === "saltwater_crocodile"
          ? "#796849"
          : kind === "purussaurus"
            ? "#706548"
            : "#344339",
    belly = giant ? "#a28c69" : "#baa37b";
  const profile = [
    [-0.24, w * 0.75, h * 0.66],
    [-0.12, w, h],
    [0.08, w * 0.96, h * 0.98],
    [0.28, w * 0.68, h * 0.8],
    [0.4, w * 0.38, h * 0.72],
    [0.57, w * 0.21, h * 0.55],
    [0.76, w * 0.09, h * 0.25],
    [0.9, 0.001, 0.003],
  ];
  const trunk = new THREE.Group();
  parent.add(trunk);
  amazonMesh(
    trunk,
    amazonLoft(
      kind + "_muscular_trunk_v2",
      profile,
      back,
      belly,
      (x, y, z) =>
        Math.sin(z * 95 + Math.sin(x * 120)) * Math.cos(y * 180) > 0.3
          ? 0.28
          : 0,
      80,
      36,
    ),
    "#ffffff",
    [0, 0, 0],
    "muscular_crocodilian",
    true,
  );
  // 纵向背甲采用贴合躯干截面的不等大骨板，尾部双脊合成单脊。
  for (let row = 0; row < 23; row++) {
    const z = -0.15 + row * 0.04,
      [rx, ry] = sampleSection(profile, z);
    for (const column of [-2, -1, 0, 1, 2]) {
      if (row > 13 && Math.abs(column) > 1) continue;
      const x = column * rx * 0.34,
        y = ry * Math.sqrt(Math.max(0.1, 1 - (x / rx) ** 2)),
        size = Math.max(0.005, rx * (giant ? 0.23 : 0.21));
      const g = amazonGeometry(`osteoderm_${kind}_${row}_${column}`, () => {
        const g = new THREE.SphereGeometry(1, 8, 6),
          p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const v = new THREE.Vector3().fromBufferAttribute(p, i);
          v.x *= size;
          v.z *= 0.024;
          v.y *= size * 0.42;
          v.y += Math.max(0, v.y / size) * size * 0.5;
          p.setXYZ(i, v.x, v.y, v.z);
        }
        g.computeVertexNormals();
        return g;
      });
      amazonMesh(
        trunk,
        g,
        row % 3 ? back : giant ? "#8d8062" : "#697255",
        [x, y - 0.004, z],
        "keeled_osteoderm",
      );
    }
    if (row > 11)
      for (const side of [-1, 1])
        amazonFin(
          trunk,
          `${kind}_tail_crest_${row}_${side}`,
          [
            [z - 0.018, 0],
            [z, ry * (giant ? 0.33 : 0.16) + (giant ? 0.017 : 0.009)],
            [z + 0.025, 0],
          ],
          back,
          "vertical",
          [side * rx * 0.5, ry * 0.76, 0],
        );
  }
  if (giant)
    for (const side of [-1, 1])
      for (let i = 0; i < 9; i++) {
        const z = -0.16 + i * 0.055,
          [rx, ry] = sampleSection(profile, z);
        amazonSpike(
          trunk,
          `${kind}_weathered_dorsal_${side}_${i}`,
          [
            [side * rx * 0.66, ry * 0.82, z],
            [side * rx * 0.87, ry + 0.025 + (i % 3) * 0.014, z + 0.015],
            [side * rx * 0.95, ry + 0.047 + (i % 3) * 0.021, z + 0.055],
          ],
          0.016 * (1 - i * 0.06),
          "#8f8262",
        );
      }
  const parts = [];
  trunk.updateMatrixWorld(true);
  for (const child of [...trunk.children]) {
    child.updateMatrix();
    const g = child.geometry.index
      ? child.geometry.toNonIndexed()
      : child.geometry.clone();
    g.deleteAttribute("uv");
    g.applyMatrix4(child.matrix);
    parts.push(g);
    trunk.remove(child);
  }
  const body = amazonMesh(
    trunk,
    amazonGeometry(kind + "_coherent_armor_v2", () => mergeGeometries(parts)),
    "#ffffff",
    [0, 0, 0],
    "armored_swimming_body",
    true,
  );
  parts.forEach((g) => g.dispose());
  bindCrocodilianTail(body, motions);
  const head = new THREE.Group();
  parent.add(head);
  const snoutW = w * (broad ? 0.89 : 0.63),
    nose = -0.62;
  amazonMesh(
    head,
    amazonLoft(
      kind + "_cranium_v2",
      [
        [nose, 0.017, 0.015, 0.002],
        [-0.59, snoutW * 0.8, 0.022, 0.006],
        [-0.45, snoutW, 0.028, 0.006],
        [-0.34, w * 0.77, 0.05, 0.012],
        [-0.24, w * 0.83, h * 0.75, 0.014],
        [-0.19, w * 0.65, h * 0.53, 0.006],
      ],
      back,
      belly,
      (x, y, z) => (Math.sin(x * 191 + z * 175) > 0.65 ? 0.24 : 0),
      64,
      32,
    ),
    "#ffffff",
    [0, 0, 0],
    "long_sculpted_skull",
    true,
  );
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.023, -0.225);
  head.add(jaw);
  amazonMesh(
    jaw,
    amazonLoft(
      kind + "_mandible_v2",
      [
        [-0.395, 0.017, 0.01],
        [-0.36, snoutW * 0.79, 0.016],
        [-0.23, snoutW * 0.94, 0.018],
        [-0.12, w * 0.75, 0.024],
        [0.02, w * 0.65, 0.018],
      ],
      belly,
      back,
      () => 0.05,
      44,
      24,
    ),
    "#ffffff",
    [0, -0.012, 0],
    "muscular_lower_jaw",
    true,
  );
  amazonMesh(
    jaw,
    amazonLoft(
      kind + "_palate_v2",
      [
        [-0.38, 0.014, 0.002],
        [-0.34, snoutW * 0.73, 0.007],
        [-0.2, snoutW * 0.84, 0.007],
        [-0.04, w * 0.57, 0.01],
        [0.01, 0.015, 0.003],
      ],
      giant ? "#632f2a" : "#77604d",
      "#392e25",
      () => 0.04,
      28,
      20,
    ),
    "#ffffff",
    [0, 0.005, 0],
    "mouth_palate",
    true,
  );
  const tongue = amazonEllipsoid(
    jaw,
    giant ? "#914938" : "#8e7560",
    [0, 0.012, -0.2],
    [snoutW * 0.45, 0.007, 0.11],
    "tongue",
  );
  motions.push((t, e) => {
    jaw.rotation.x = -(
      (giant ? 0.22 : 0.065) +
      Math.sin(t * 0.46) * 0.035 +
      Math.max(0, e - 1) * 0.022
    );
    tongue.scale.y = 0.007 * (1 + Math.sin(t * 0.5) * 0.07);
  });
  amazonEyes(
    head,
    w * 0.61,
    h * 0.45 + 0.014,
    -0.275,
    giant ? 0.012 : 0.009,
    "#c58d35",
    true,
  );
  for (const side of [-1, 1]) {
    for (let i = 0; i < 20; i++) {
      const z = -0.585 + i * 0.016,
        x = side * snoutW * (0.77 + 0.14 * Math.sin((i / 19) * Math.PI)),
        r = (i % 5 === 2 ? 0.007 : 0.0045) * (giant ? 1.55 : 0.52);
      amazonSpike(
        head,
        `${kind}_upper_tooth_${side}_${i}`,
        [
          [x, -0.011, z],
          [x * 1.005, -0.027 - r, z - 0.004],
          [x * 0.97, -0.032 - r * 1.5, z + 0.003],
        ],
        r,
        "#cfc39a",
      );
      amazonSpike(
        jaw,
        `${kind}_lower_tooth_${side}_${i}`,
        [
          [x, 0, z + 0.225],
          [x, -0.001 + r * 2, z + 0.222],
          [x * 0.97, 0.003 + r * 3, z + 0.218],
        ],
        r * 0.85,
        "#d2c69f",
      );
    }
    amazonTube(
      head,
      `${kind}_supraorbital_ridge_${side}`,
      [
        [side * w * 0.35, h * 0.43 + 0.013, -0.34],
        [side * w * 0.6, h * 0.5 + 0.014, -0.285],
        [side * w * 0.58, h * 0.52 + 0.014, -0.23],
      ],
      giant ? 0.015 : 0.008,
      back,
    );
    amazonEllipsoid(
      head,
      "#20291d",
      [side * snoutW * 0.42, 0.033, -0.576],
      [0.007, 0.0024, 0.009],
      "nostril",
    );
    for (let i = 0; i < 7; i++)
      amazonTube(
        head,
        `${kind}_jaw_scale_seam_${side}_${i}`,
        [
          [side * snoutW * 0.99, -0.015, -0.55 + i * 0.027],
          [side * snoutW * 0.96, 0.012, -0.54 + i * 0.027],
        ],
        0.0015,
        "#394234",
      );
    if (lord) {
      amazonSpike(
        head,
        `rootjaw_cheek_hook_${side}`,
        [
          [side * w * 0.69, h * 0.69, -0.25],
          [side * w * 1.08, h * 0.92, -0.17],
          [side * w * 1.3, h * 0.62, -0.1],
        ],
        0.026,
        "#a19373",
      );
      amazonSpike(
        head,
        `rootjaw_brow_horn_${side}`,
        [
          [side * w * 0.47, h * 0.72, -0.27],
          [side * w * 0.58, h * 1.48, -0.21],
          [side * w * 0.83, h * 1.62, -0.14],
        ],
        0.023,
        "#99886d",
      );
      amazonTube(
        head,
        `rootjaw_broken_scar_${side}`,
        [
          [side * w * 0.8, h * 0.4, -0.325],
          [side * w * 0.77, h * 0.69, -0.302],
          [side * w * 0.68, h * 0.92, -0.26],
        ],
        0.003,
        "#86624c",
      );
    }
    for (let pair = 0; pair < 2; pair++) {
      const limb = new THREE.Group();
      limb.position.set(side * w * 0.72, -h * 0.35, pair ? 0.235 : -0.07);
      parent.add(limb);
      const length = giant ? 0.185 : 0.143;
      const points = [
        [0, 0, 0],
        [side * length * 0.46, -0.028, 0.028],
        [side * length * 0.75, -0.039, 0.07],
        [side * length, -0.041, 0.045],
      ];
      const g = amazonGeometry(`${kind}_limb_${side}_${pair}`, () => {
        const curve = new THREE.CatmullRomCurve3(
            points.map((p) => new THREE.Vector3(...p)),
          ),
          g = new THREE.TubeGeometry(
            curve,
            22,
            giant ? 0.035 : 0.022,
            12,
            false,
          ),
          p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const t = Math.floor(i / 13) / 22,
            c = curve.getPointAt(t),
            v = new THREE.Vector3()
              .fromBufferAttribute(p, i)
              .sub(c)
              .multiplyScalar(0.95 - t * 0.45)
              .add(c);
          p.setXYZ(i, v.x, v.y, v.z);
        }
        g.computeVertexNormals();
        return g;
      });
      amazonMesh(limb, g, back, [0, 0, 0], "jointed_croc_limb");
      amazonFin(
        limb,
        `${kind}_webbed_foot_${side}_${pair}`,
        [
          [0.025, side * length * 0.73],
          [0.06, side * length * 1.06],
          [0.12, side * length * 1.2],
          [0.13, side * length * 0.74],
        ],
        belly,
        "horizontal",
        [0, -0.045, 0],
      );
      for (let toe = 0; toe < (pair ? 4 : 5); toe++) {
        const x = side * (length * 0.76 + toe * 0.016),
          z = 0.091 + Math.sin(toe * 0.73) * 0.013;
        amazonTube(
          limb,
          `${kind}_digit_${side}_${pair}_${toe}`,
          [
            [x, -0.04, 0.053],
            [x + side * 0.012, -0.047, z],
            [x + side * 0.01, -0.045, z + 0.025],
          ],
          0.0038,
          back,
        );
        if (toe < 3)
          amazonSpike(
            limb,
            `${kind}_claw_${side}_${pair}_${toe}`,
            [
              [x + side * 0.01, -0.045, z + 0.021],
              [x + side * 0.01, -0.039, z + 0.035],
              [x + side * 0.007, -0.047, z + 0.042],
            ],
            0.0033,
            "#bbab82",
          );
      }
      limb.userData.keepSeparate = true;
      limb.name = `swimming_limb_${side}_${pair}`;
      motions.push((t, e) => {
        // 快游时收拢四肢，由尾推进；缓游只保留微弱的后足划动。
        const fold = THREE.MathUtils.smoothstep(e, 0.3, 0.9);
        const scull = (1 - fold) * (pair ? 0.13 : 0.035);
        limb.rotation.y =
          side *
          (-0.3 - fold * 1.0 + Math.sin(t * 0.72 + pair * Math.PI) * scull);
        limb.rotation.z = side * Math.sin(t * 0.72 + pair) * (1 - fold) * 0.025;
      });
    }
  }
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
