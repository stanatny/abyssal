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
  body: material("#ffffff", 0.45, "#000000", 0, { vertexColors: true }),
  squid: material("#9d5f68", 0.5),
  squidFin: material("#c08b92", 0.55),
  sucker: material("#e0bfcc", 0.6),
  kraken: material("#2a2340", 0.46),
  krakenRidge: material("#4a3f66", 0.55),
  krakenSucker: material("#c49bc4", 0.6),
  armor: material("#5a6963", 0.6),
  armorDark: material("#2c383f", 0.55),
  bone: material("#cfc9a8", 0.48),
  jade: material("#237c74", 0.46),
  jadeDark: material("#143a3e", 0.56),
  gold: material("#c8a24c", 0.36, "#554016", 0.22),
  hydra: material("#1e474b", 0.45),
  hydraFin: material("#2f6560", 0.58),
  white: material("#e9eee8", 0.62),
  gray: material("#9aa8ab", 0.68),
  wingtip: material("#2b3a42", 0.65),
  yellow: material("#deab49", 0.5),
  black: material("#040a11", 0.4),
  glow: material("#7ee6cf", 0.32, "#25cdbb", 1.7),
  amber: material("#ffcb77", 0.3, "#ff8d24", 1.8),
  violet: material("#a886e2", 0.4, "#7947d7", 1.3),
};

function buildSquid(root, motions) {
  const inner = new THREE.Group();
  root.add(inner);
  // 纤细火箭形外套膜，喷流推进时腕足拖在身后。
  add(
    inner,
    cached("squid_mantle", () =>
      formColored(
        [
          [-0.5, 0.002, 0.004],
          [-0.44, 0.03, 0.04],
          [-0.3, 0.058, 0.071],
          [-0.14, 0.052, 0.063],
          [0.0, 0.036, 0.043],
          [0.08, 0.026, 0.03],
        ],
        "#8d4f58",
        "#d3a5a8",
      ),
    ),
    M.body,
  );
  for (const side of [-1, 1]) {
    // 菱形的末端鳍长在外套膜尖端，微微外张。
    add(
      inner,
      cached(`squid_fin_${side}`, () =>
        finSolid(
          mirrorOutline(
            [
              [-0.5, 0.02],
              [-0.44, 0.1],
              [-0.3, 0.118],
              [-0.21, 0.05],
            ],
            side,
          ),
          0.006,
          "horizontal",
          { bevel: 0.003 },
        ),
      ),
      M.squidFin,
    ).rotation.z = -side * 0.24;
    // 大王乌贼的巨眼：肤色眼窝包裹黑色晶状体。
    blob(inner, M.squid, [side * 0.042, 0, 0.034], [0.036, 0.039, 0.033]);
    blob(inner, M.black, [side * 0.054, 0, 0.044], [0.026, 0.029, 0.025]);
    blob(inner, M.white, [side * 0.064, 0.012, 0.034], [0.006, 0.006, 0.006]);
  }
  // 八条细腕成束拖曳，各自带相位差的缓慢扭动。
  for (let index = 0; index < 8; index++) {
    const angle = (index / 8) * Math.PI * 2;
    const c = Math.cos(angle),
      s = Math.sin(angle);
    const curl = Math.sin(index * 2.4) * 0.05;
    const arm = new THREE.Group();
    arm.position.set(c * 0.024, s * 0.022 - 0.004, 0.075);
    inner.add(arm);
    add(
      arm,
      cached(`squid_arm_${index}`, () =>
        tendril(
          [
            [0, 0, 0],
            [c * 0.07, s * 0.065, 0.13],
            [c * 0.1 + curl, s * 0.09, 0.28],
            [c * 0.085 + curl * 1.6, s * 0.08 + curl * 0.5, 0.38],
          ],
          0.013,
          0.0018,
        ),
      ),
      M.squid,
    );
    motions.push((t, effort) => {
      arm.rotation.z = Math.sin(t * 0.55 + angle) * (0.13 + effort * 0.03);
      arm.rotation.x = Math.cos(t * 0.48 + angle * 1.3) * 0.08;
    });
  }
  // 两条捕食触腕显著更长，末端带穗状吸盘球。
  for (const side of [-1, 1]) {
    const tentacle = new THREE.Group();
    tentacle.position.set(side * 0.018, -0.02, 0.08);
    inner.add(tentacle);
    add(
      tentacle,
      cached(`squid_tentacle_${side}`, () =>
        tendril(
          [
            [0, 0, 0],
            [side * 0.05, -0.03, 0.18],
            [side * 0.09, -0.04, 0.36],
            [side * 0.1, -0.03, 0.46],
          ],
          0.008,
          0.0032,
        ),
      ),
      M.squid,
    );
    blob(
      tentacle,
      M.squidFin,
      [side * 0.1, -0.028, 0.49],
      [0.017, 0.009, 0.05],
    );
    for (let index = 0; index < 6; index++) {
      blob(
        tentacle,
        M.sucker,
        [side * (0.1 - 0.004), -0.036, 0.468 + index * 0.012],
        [0.005, 0.003, 0.005],
      );
    }
    motions.push((t, effort) => {
      tentacle.rotation.y = Math.sin(t * 0.45 + side) * (0.1 + effort * 0.02);
      tentacle.rotation.x = Math.cos(t * 0.38 + side * 2) * 0.06;
    });
  }
  motions.push((t) => {
    inner.rotation.x = Math.sin(t * 0.5) * 0.02;
    inner.position.y = Math.sin(t * 0.7) * 0.004;
  });
}

function buildKraken(root, motions) {
  const inner = new THREE.Group();
  root.add(inner);
  // 巨大球状头胸低坐在后，八条粗腕向前张开，与火箭形乌贼严格区分。
  const head = new THREE.Group();
  inner.add(head);
  add(
    head,
    cached("kraken_mantle", () =>
      formColored(
        [
          [-0.08, 0.17, 0.16],
          [0.06, 0.225, 0.22],
          [0.24, 0.2, 0.205],
          [0.38, 0.125, 0.135],
          [0.48, 0.028, 0.04],
        ],
        "#241f3d",
        "#453a63",
      ),
    ),
    M.body,
  );
  for (const side of [-1, 1]) {
    // 琥珀色横瞳巨眼与压顶的眉脊，构成正面威慑。
    blob(head, M.black, [side * 0.118, 0.005, -0.07], [0.036, 0.042, 0.022]);
    blob(head, M.amber, [side * 0.123, 0.006, -0.08], [0.025, 0.031, 0.015]);
    const pupil = blob(
      head,
      M.black,
      [side * 0.125, 0.007, -0.09],
      [0.006, 0.021, 0.006],
    );
    pupil.rotation.x = 0.2;
    const brow = blob(
      head,
      M.krakenRidge,
      [side * 0.11, 0.068, -0.055],
      [0.09, 0.032, 0.055],
      true,
    );
    brow.rotation.z = -side * 0.34;
    // 头顶四根后弯犄角。
    add(
      head,
      cached(`kraken_horn_${side}`, () =>
        tendril(
          [
            [side * 0.07, 0.14, 0.08],
            [side * 0.1, 0.22, 0.16],
            [side * 0.11, 0.26, 0.28],
          ],
          0.028,
          0.004,
        ),
      ),
      M.krakenRidge,
    );
    add(
      head,
      cached(`kraken_horn_inner_${side}`, () =>
        tendril(
          [
            [side * 0.03, 0.15, 0.05],
            [side * 0.045, 0.235, 0.12],
            [side * 0.05, 0.28, 0.22],
          ],
          0.022,
          0.003,
        ),
      ),
      M.krakenRidge,
    );
  }
  // 头胸表面的疣粒与鹦鹉喙。
  const warts = [
    [0.0, 0.19, 0.16, 0.035],
    [-0.09, 0.16, 0.24, 0.028],
    [0.1, 0.15, 0.28, 0.024],
    [-0.05, 0.18, 0.34, 0.02],
    [0.06, 0.17, 0.38, 0.016],
  ];
  for (const [x, y, z, size] of warts)
    blob(head, M.krakenRidge, [x, y, z], [size, size * 0.7, size], true);
  blob(head, M.black, [0, -0.085, -0.075], [0.055, 0.045, 0.038]);
  spike(head, M.krakenRidge, [0, -0.06, -0.09], [0, -0.4, -1], 0.022, 0.055);
  for (let index = 0; index < 8; index++) {
    const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
    const c = Math.cos(angle),
      s = Math.sin(angle);
    // 上方两条腕扬得更高，形成扑击姿态。
    const lift = s > 0.3 ? 0.08 : 0;
    const arm = new THREE.Group();
    arm.position.set(c * 0.11, s * 0.095 - 0.01, -0.04);
    inner.add(arm);
    const points = [
      [0, 0, 0],
      [c * 0.2, s * 0.18 + lift * 0.4, -0.14],
      [c * 0.32, s * 0.27 + lift, -0.28],
      [c * 0.42, s * 0.33 + lift, -0.4],
      [c * 0.46, s * 0.35 + lift, -0.3],
      [c * 0.44, s * 0.36 + lift * 0.8, -0.14],
    ];
    add(
      arm,
      cached(`kraken_arm_${index}`, () => tendril(points, 0.048, 0.003)),
      M.kraken,
    );
    const curve = curveFrom(points);
    for (let j = 1; j < 9; j++) {
      const p = curve.getPoint(j / 10.5);
      const size = 0.017 * (1 - j / 13);
      blob(
        arm,
        M.krakenSucker,
        [p.x - c * 0.026, p.y - s * 0.026 - 0.006, p.z + 0.004],
        [size, size * 0.55, size],
      );
    }
    motions.push((t, effort) => {
      // 缓慢挥舞；高速移动时略微收拢减阻。
      const amp = 1.15 - effort * 0.25;
      arm.rotation.z = Math.sin(t * 0.3 + angle) * 0.14 * amp;
      arm.rotation.x = Math.cos(t * 0.26 + angle) * 0.1 * amp;
      arm.rotation.y = Math.sin(t * 0.24 + angle * 1.4) * 0.1 * amp;
    });
  }
  motions.push((t) => {
    head.scale.setScalar(1 + Math.sin(t * 0.45) * 0.018);
    inner.rotation.z = Math.sin(t * 0.2) * 0.025;
  });
}

function buildDunkleosteus(root, motions) {
  const inner = new THREE.Group();
  root.add(inner);
  // 厚重骨甲头盾占据前半身，后半身裸露渐细。
  add(
    inner,
    cached("dunkleosteus_rear", () =>
      formColored(
        [
          [-0.12, 0.152, 0.156],
          [0.05, 0.128, 0.13],
          [0.2, 0.07, 0.08],
          [0.33, 0.028, 0.038],
          [0.4, 0.01, 0.016],
        ],
        "#2c3941",
        "#4d5a55",
      ),
    ),
    M.body,
  );
  add(
    inner,
    cached("dunkleosteus_shield", () =>
      formColored(
        [
          [-0.46, 0.1, 0.09],
          [-0.38, 0.165, 0.156],
          [-0.24, 0.185, 0.176],
          [-0.09, 0.163, 0.158],
        ],
        "#38474a",
        "#4d5a55",
      ),
    ),
    M.body,
  );
  const forehead = blob(
    inner,
    M.armor,
    [0, 0.1, -0.26],
    [0.16, 0.1, 0.18],
    true,
  );
  forehead.rotation.x = -0.08;
  blob(inner, M.armor, [0, 0.03, -0.425], [0.095, 0.07, 0.07], true);
  for (const side of [-1, 1]) {
    const cheek = blob(
      inner,
      M.armor,
      [side * 0.132, -0.02, -0.26],
      [0.05, 0.11, 0.13],
      true,
    );
    cheek.rotation.y = side * 0.12;
    blob(
      inner,
      M.armorDark,
      [side * 0.09, 0.078, -0.35],
      [0.06, 0.028, 0.06],
      true,
    );
    blob(inner, M.black, [side * 0.126, 0.032, -0.348], [0.017, 0.017, 0.017]);
    blob(inner, M.amber, [side * 0.131, 0.033, -0.352], [0.009, 0.009, 0.009]);
    // 无齿骨板：上下两片铡刀状骨刃。
    add(
      inner,
      cached(`dunkleosteus_blade_up_${side}`, () =>
        finSolid(
          [
            [-0.46, -0.028],
            [-0.435, -0.095],
            [-0.395, -0.048],
            [-0.37, -0.055],
            [-0.38, -0.03],
          ],
          0.008,
          "vertical",
          { smooth: false, bevel: 0.002 },
        ),
      ),
      M.bone,
    ).position.x = side * 0.052;
    add(
      inner,
      cached(`dunkleosteus_pectoral_${side}`, () =>
        finSolid(
          mirrorOutline(
            [
              [-0.14, 0.04],
              [-0.02, 0.16],
              [0.08, 0.17],
              [0.04, 0.05],
            ],
            side,
          ),
          0.008,
          "horizontal",
          { bevel: 0.003 },
        ),
      ),
      M.armorDark,
    ).position.set(side * 0.1, -0.09, -0.04);
  }
  blob(inner, M.black, [0, -0.042, -0.43], [0.1, 0.045, 0.03]);
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.085, -0.3);
  inner.add(jaw);
  blob(jaw, M.armor, [0, -0.008, -0.08], [0.105, 0.038, 0.14], true);
  for (const side of [-1, 1]) {
    add(
      jaw,
      cached(`dunkleosteus_blade_low_${side}`, () =>
        finSolid(
          [
            [-0.17, 0.026],
            [-0.145, 0.085],
            [-0.1, 0.04],
            [-0.08, 0.03],
          ],
          0.007,
          "vertical",
          { smooth: false, bevel: 0.002 },
        ),
      ),
      M.bone,
    ).position.x = side * 0.045;
  }
  motions.push((t) => {
    jaw.rotation.x = 0.05 + Math.sin(t * 0.35) * 0.045;
  });
  add(
    inner,
    cached("dunkleosteus_dorsal", () =>
      finSolid(
        [
          [0.05, 0.12],
          [0.15, 0.2],
          [0.28, 0.095],
        ],
        0.008,
        "vertical",
        { bevel: 0.003 },
      ),
    ),
    M.armorDark,
  );
  const tail = new THREE.Group();
  tail.position.set(0, 0.002, 0.385);
  inner.add(tail);
  add(
    tail,
    cached("dunkleosteus_tail", () =>
      finSolid(
        [
          [-0.015, -0.02],
          [0.02, 0.06],
          [0.09, 0.165],
          [0.105, 0.15],
          [0.05, 0.02],
          [0.08, -0.075],
          [0.09, -0.09],
          [0.03, -0.04],
        ],
        0.007,
        "vertical",
        { bevel: 0.002 },
      ),
    ),
    M.armorDark,
  );
  motions.push((t, effort) => {
    tail.rotation.y = Math.sin(t * 0.85) * (0.16 + effort * 0.05);
    inner.rotation.y = -Math.sin(t * 0.85) * 0.02;
    inner.rotation.z = Math.sin(t * 0.3) * 0.02;
  });
}

function buildMayan(root, motions) {
  const inner = new THREE.Group();
  root.add(inner);
  // 巨石守护者：厚重玉质身躯、阶梯背甲、金饰符文，是幻想遗迹风格。
  add(
    inner,
    cached("mayan_body", () =>
      formColored(
        [
          [-0.42, 0.08, 0.082],
          [-0.3, 0.15, 0.15],
          [-0.1, 0.168, 0.16],
          [0.1, 0.12, 0.12],
          [0.28, 0.05, 0.06],
          [0.38, 0.012, 0.022],
        ],
        "#1c4f4a",
        "#35776a",
      ),
    ),
    M.body,
  );
  // 面具般的方颅：眉甲压眼、钝吻、黄金须。
  const brow = blob(inner, M.jade, [0, 0.1, -0.3], [0.175, 0.055, 0.13], true);
  brow.rotation.x = -0.06;
  blob(inner, M.jade, [0, 0.012, -0.385], [0.13, 0.09, 0.09], true);
  blob(inner, M.black, [0, -0.048, -0.43], [0.115, 0.045, 0.03]);
  for (const side of [-1, 1]) {
    blob(inner, M.black, [side * 0.106, 0.045, -0.352], [0.02, 0.018, 0.022]);
    blob(inner, M.amber, [side * 0.111, 0.046, -0.357], [0.011, 0.01, 0.014]);
    add(
      inner,
      cached(`mayan_whisker_${side}`, () =>
        tendril(
          [
            [side * 0.06, -0.02, -0.42],
            [side * 0.16, -0.05, -0.36],
            [side * 0.22, -0.09, -0.24],
          ],
          0.006,
          0.001,
        ),
      ),
      M.gold,
    );
    // 体侧黄金符纹与发光玉刻。
    for (let rune = 0; rune < 4; rune++) {
      const mark = add(inner, BOX, M.gold);
      mark.position.set(
        side * 0.148,
        0.02 + (rune % 2) * 0.028,
        -0.18 + rune * 0.1,
      );
      mark.scale.set(0.004, 0.012, 0.03);
      mark.rotation.y = side * 0.12;
    }
    for (let rune = 0; rune < 3; rune++) {
      const glyph = add(inner, BOX, M.glow);
      glyph.position.set(side * 0.152, -0.04, -0.13 + rune * 0.13);
      glyph.scale.set(0.003, 0.008, 0.045);
      glyph.rotation.y = side * 0.12;
    }
    // 扇形排列的雕纹背冠。
    for (let plume = 0; plume < 5; plume++) {
      const length = 0.16 + (2 - Math.abs(plume - 2)) * 0.05;
      const blade = add(
        inner,
        cached(`mayan_plume_${plume}`, () =>
          finSolid(
            [
              [0, 0],
              [0.035, length * 0.45],
              [0.02, length],
              [-0.02, length],
              [-0.035, length * 0.45],
            ],
            0.008,
            "vertical",
            { bevel: 0.003 },
          ),
        ),
        plume % 2 ? M.gold : M.jade,
      );
      blade.position.set(
        side * (0.028 + plume * 0.026),
        0.115,
        -0.24 + plume * 0.012,
      );
      blade.rotation.z = -side * (0.25 + plume * 0.14);
      blade.rotation.x = -0.35;
    }
    add(
      inner,
      cached(`mayan_pectoral_${side}`, () =>
        finSolid(
          mirrorOutline(
            [
              [-0.15, 0.05],
              [-0.02, 0.2],
              [0.12, 0.21],
              [0.08, 0.06],
            ],
            side,
          ),
          0.01,
          "horizontal",
          { bevel: 0.004 },
        ),
      ),
      M.jadeDark,
    ).position.set(side * 0.09, -0.075, -0.06);
  }
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.085, -0.3);
  inner.add(jaw);
  blob(jaw, M.jadeDark, [0, -0.008, -0.07], [0.125, 0.045, 0.13], true);
  for (let index = -3; index <= 3; index++) {
    spike(
      inner,
      M.gold,
      [index * 0.028, -0.032, -0.445],
      [index * 0.05, -1, 0.1],
      0.006,
      0.032,
    );
    spike(
      jaw,
      M.gold,
      [index * 0.026, 0.02, -0.125],
      [index * 0.05, 1, 0.08],
      0.005,
      0.026,
    );
  }
  motions.push((t) => {
    jaw.rotation.x = Math.sin(t * 0.3) * 0.05;
  });
  // 阶梯金字塔形背甲，一看便是遗迹风格剪影。
  for (let plate = 0; plate < 5; plate++) {
    const z = -0.15 + plate * 0.1;
    const height = 0.13 - plate * 0.016;
    const width = 0.1 - plate * 0.007;
    add(
      inner,
      cached(`mayan_plate_${plate}`, () =>
        finSolid(
          [
            [-width / 2, 0],
            [-width * 0.3, height * 0.5],
            [-width * 0.3, height * 0.72],
            [-width * 0.12, height * 0.72],
            [-width * 0.12, height],
            [width * 0.12, height],
            [width * 0.12, height * 0.72],
            [width * 0.3, height * 0.72],
            [width * 0.3, height * 0.5],
            [width / 2, 0],
          ],
          0.026,
          "vertical",
          { smooth: false, bevel: 0.004 },
        ),
      ),
      plate % 2 ? M.jadeDark : M.jade,
    ).position.set(0, sampleHeight(z), z);
    const cap = add(inner, BOX, M.gold);
    cap.position.set(0, sampleHeight(z) + height + 0.004, z);
    cap.scale.set(0.03, 0.008, width * 0.26);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0, 0.35);
  inner.add(tail);
  add(
    tail,
    cached("mayan_tail", () =>
      finSolid(
        [
          [0, -0.085],
          [0.045, -0.115],
          [0.115, -0.095],
          [0.125, -0.05],
          [0.125, 0.05],
          [0.115, 0.095],
          [0.045, 0.115],
          [0, 0.085],
        ],
        0.011,
        "vertical",
        { smooth: false, bevel: 0.004 },
      ),
    ),
    M.jadeDark,
  );
  for (let stud = 0; stud < 4; stud++) {
    const bead = add(tail, BOX, M.gold);
    bead.position.set(0.006, -0.075 + stud * 0.05, 0.118);
    bead.scale.set(0.012, 0.018, 0.008);
  }
  motions.push((t, effort) => {
    tail.rotation.y = Math.sin(t * 0.7) * (0.14 + effort * 0.04);
    inner.rotation.y = -Math.sin(t * 0.7) * 0.015;
    inner.rotation.z = Math.sin(t * 0.25) * 0.015;
  });
}

function sampleHeight(z) {
  const profile = [
    [-0.42, 0.08],
    [-0.3, 0.15],
    [-0.1, 0.168],
    [0.1, 0.12],
    [0.28, 0.05],
    [0.38, 0.012],
  ];
  let index = 0;
  while (index < profile.length - 2 && z > profile[index + 1][0]) index++;
  const a = profile[index],
    b = profile[index + 1];
  const t = THREE.MathUtils.clamp((z - a[0]) / (b[0] - a[0]), 0, 1);
  return THREE.MathUtils.lerp(a[1], b[1], t) - 0.004;
}

function buildHydra(root, motions) {
  const inner = new THREE.Group();
  root.add(inner);
  // 粗壮躯干拖长尾，肩上伸出三条独立摆动的长颈。
  add(
    inner,
    cached("hydra_body", () =>
      formColored(
        [
          [-0.05, 0.145, 0.135],
          [0.1, 0.165, 0.15],
          [0.26, 0.105, 0.1],
          [0.4, 0.045, 0.05],
          [0.48, 0.008, 0.014],
        ],
        "#1a4044",
        "#3d6b68",
        null,
        true,
      ),
    ),
    M.body,
  );
  // 连贯的棘刺背帆。
  add(
    inner,
    cached("hydra_sail", () => {
      const outline = [[-0.04, 0.125]];
      for (let index = 0; index < 6; index++) {
        const z = -0.02 + index * 0.075;
        const height = 0.15 - index * 0.016;
        outline.push([z + 0.02, 0.13 - index * 0.012]);
        outline.push([z + 0.045, 0.13 - index * 0.012 + height]);
        outline.push([z + 0.075, 0.128 - index * 0.012]);
      }
      outline.push([0.46, 0.045]);
      return finSolid(outline, 0.012, "vertical", {
        smooth: false,
        bevel: 0.003,
      });
    }),
    M.hydraFin,
  );
  for (let index = 0; index < 5; index++) {
    blob(
      inner,
      M.glow,
      [0, 0.135 - index * 0.011, 0.0 + index * 0.075],
      [0.006, 0.007, 0.01],
    );
  }
  for (const side of [-1, 1]) {
    add(
      inner,
      cached(`hydra_pectoral_${side}`, () =>
        finSolid(
          mirrorOutline(
            [
              [-0.06, 0.05],
              [0.05, 0.21],
              [0.13, 0.2],
              [0.08, 0.06],
            ],
            side,
          ),
          0.008,
          "horizontal",
          { bevel: 0.003 },
        ),
      ),
      M.hydra,
    ).position.set(side * 0.1, -0.06, 0.06);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0, 0.46);
  inner.add(tail);
  add(
    tail,
    cached("hydra_tail", () =>
      finSolid(
        [
          [0, -0.06],
          [0.05, -0.12],
          [0.1, -0.1],
          [0.06, 0],
          [0.1, 0.1],
          [0.05, 0.12],
          [0, 0.06],
        ],
        0.006,
        "vertical",
        { bevel: 0.002 },
      ),
    ),
    M.hydraFin,
  );
  motions.push((t, effort) => {
    tail.rotation.y = Math.sin(t * 0.7) * (0.15 + effort * 0.04);
  });
  for (let index = 0; index < 3; index++) {
    const side = index - 1;
    const neck = new THREE.Group();
    neck.position.set(side * 0.095, 0.1, -0.02);
    inner.add(neck);
    const visibleNeckPoints =
      side === 0
        ? [
            [0, 0, 0],
            [0, 0.14, -0.06],
            [0, 0.235, -0.16],
            [0, 0.25, -0.27],
          ]
        : [
            [0, 0, 0],
            [side * 0.06, 0.11, -0.05],
            [side * 0.13, 0.185, -0.15],
            [side * 0.16, 0.195, -0.26],
          ];
    // 将颈管开口完全埋进肩部，保留原有可见颈线和头部锚点。
    const neckPoints = [[-side * 0.04, -0.085, 0.115], ...visibleNeckPoints];
    add(
      neck,
      cached(`hydra_neck_${index}`, () =>
        tendril(neckPoints, 0.056, 0.036, 36),
      ),
      M.hydra,
    );
    const tip = neckPoints.at(-1);
    const head = new THREE.Group();
    head.position.set(...tip);
    neck.add(head);
    // 蛇形长颅：上下颌微张、琥珀瞳、后弯双角。
    blob(head, M.hydra, [0, 0.005, -0.05], [0.052, 0.046, 0.075]);
    blob(head, M.hydra, [0, -0.002, -0.125], [0.04, 0.034, 0.06]);
    blob(head, M.black, [0, -0.018, -0.155], [0.032, 0.014, 0.03]);
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.032, -0.06);
    head.add(jaw);
    blob(jaw, M.hydraFin, [0, -0.006, -0.06], [0.034, 0.012, 0.075]);
    for (const eyeSide of [-1, 1]) {
      blob(
        head,
        M.amber,
        [eyeSide * 0.042, 0.018, -0.085],
        [0.011, 0.012, 0.016],
      );
      add(
        head,
        cached(`hydra_horn_${index}_${eyeSide}`, () =>
          tendril(
            [
              [eyeSide * 0.03, 0.032, -0.02],
              [eyeSide * 0.05, 0.075, 0.06],
              [eyeSide * 0.055, 0.095, 0.14],
            ],
            0.011,
            0.0018,
          ),
        ),
        M.bone,
      );
      spike(
        head,
        M.bone,
        [eyeSide * 0.018, -0.014, -0.168],
        [0, -1, 0.15],
        0.0035,
        0.026,
      );
      spike(
        jaw,
        M.bone,
        [eyeSide * 0.015, 0.002, -0.105],
        [0, 1, -0.1],
        0.003,
        0.02,
      );
      add(
        head,
        cached(`hydra_earfin_${index}_${eyeSide}`, () =>
          finSolid(
            [
              [-0.02, 0],
              [0.0, 0.05],
              [0.05, 0.055],
              [0.04, 0.01],
            ],
            0.004,
            "vertical",
            { bevel: 0.0015 },
          ),
        ),
        M.glow,
      ).position.set(eyeSide * 0.045, 0.005, 0.01);
    }
    motions.push((t, effort) => {
      const yaw = Math.sin(t * 0.33 + index * 2.1) * 0.1;
      const pitch = Math.cos(t * 0.27 + index * 1.7) * 0.07 - effort * 0.015;
      neck.rotation.y = yaw;
      neck.rotation.x = pitch;
      // 头部反向补偿，保持蛇首大致朝前。
      head.rotation.y = -yaw * 0.7;
      head.rotation.x = -pitch * 0.5;
      jaw.rotation.x = 0.06 + Math.sin(t * 0.4 + index * 1.3) * 0.05;
    });
  }
  motions.push((t) => {
    inner.rotation.z = Math.sin(t * 0.22) * 0.02;
    inner.position.y = Math.sin(t * 0.5) * 0.005;
  });
}

function buildSeagull(root, motions) {
  const inner = new THREE.Group();
  root.add(inner);
  // 白腹灰背的流线鸟身。
  add(
    inner,
    cached("seagull_body", () =>
      formColored(
        [
          [-0.3, 0.045, 0.05],
          [-0.18, 0.085, 0.095],
          [0.02, 0.095, 0.105],
          [0.18, 0.065, 0.07],
          [0.3, 0.015, 0.022],
        ],
        "#9aa8ab",
        "#eef2ec",
        (z, y) => 0.12,
      ),
    ),
    M.body,
  );
  blob(inner, M.white, [0, 0.075, -0.27], [0.062, 0.066, 0.07]);
  const cap = blob(inner, M.gray, [0, 0.108, -0.245], [0.052, 0.032, 0.06]);
  cap.rotation.x = 0.25;
  const beak = add(
    inner,
    cached("seagull_beak", () => {
      const geometry = new THREE.ConeGeometry(0.017, 0.115, 6);
      geometry.rotateX(-Math.PI / 2);
      return geometry;
    }),
    M.yellow,
  );
  beak.position.set(0, 0.072, -0.385);
  beak.rotation.x = -0.08;
  for (const side of [-1, 1]) {
    blob(inner, M.black, [side * 0.045, 0.095, -0.305], [0.007, 0.008, 0.008]);
    // 内外两段翼：内段短宽，外段长而尖，端部分裂出指状初级飞羽。
    const wing = new THREE.Group();
    wing.position.set(side * 0.055, 0.05, -0.1);
    inner.add(wing);
    add(
      wing,
      cached(`seagull_wing_inner_${side}`, () =>
        finSolid(
          mirrorOutline(
            [
              [-0.17, -0.02],
              [-0.14, 0.15],
              [0.07, 0.19],
              [0.13, 0.0],
            ],
            side,
          ),
          0.008,
          "horizontal",
          { bevel: 0.003 },
        ),
      ),
      M.gray,
    );
    const outer = new THREE.Group();
    outer.position.set(side * 0.19, 0, 0);
    wing.add(outer);
    add(
      outer,
      cached(`seagull_wing_outer_${side}`, () =>
        finSolid(
          mirrorOutline(
            [
              [-0.14, 0.0],
              [-0.11, 0.17],
              [0.02, 0.32],
              [0.09, 0.28],
              [0.05, 0.1],
            ],
            side,
          ),
          0.006,
          "horizontal",
          { bevel: 0.0025 },
        ),
      ),
      M.gray,
    );
    for (let feather = 0; feather < 4; feather++) {
      const primary = add(
        outer,
        cached(`seagull_primary_${side}_${feather}`, () =>
          finSolid(
            mirrorOutline(
              [
                [0, 0],
                [0.03 + feather * 0.01, 0.1 + feather * 0.02],
                [0.06 + feather * 0.014, 0.13 + feather * 0.022],
                [0.055 + feather * 0.012, 0.04 + feather * 0.015],
              ],
              side,
            ),
            0.0035,
            "horizontal",
            { bevel: 0.0012 },
          ),
        ),
        M.wingtip,
      );
      primary.position.set(
        side * (0.14 + feather * 0.02),
        0.001,
        -0.06 + feather * 0.03,
      );
      primary.rotation.y = -side * (0.06 + 0.09 * feather);
    }
    motions.push((t, effort) => {
      // 大部分时间滑翔微振，周期性进入扇翅爆发段。
      const gate = THREE.MathUtils.smoothstep(Math.sin(t * 0.21), 0.15, 0.7);
      const flap = gate * (0.5 + effort * 0.12);
      wing.rotation.z =
        side * (0.1 + Math.sin(t * 0.8) * 0.05 + Math.sin(t * 3.1) * flap);
      outer.rotation.z = side * (-0.08 + Math.sin(t * 3.1 - 0.7) * flap * 0.85);
    });
    blob(inner, M.yellow, [side * 0.03, -0.095, 0.05], [0.01, 0.006, 0.02]);
  }
  const tail = add(
    inner,
    cached("seagull_tail", () =>
      finSolid(
        [
          [0.0, -0.055],
          [0.1, -0.095],
          [0.14, -0.06],
          [0.15, 0.0],
          [0.14, 0.06],
          [0.1, 0.095],
          [0.0, 0.055],
        ],
        0.006,
        "horizontal",
        { bevel: 0.002 },
      ),
    ),
    M.white,
  );
  tail.position.set(0, 0.01, 0.26);
  tail.userData.keepSeparate = true;
  motions.push((t) => {
    inner.rotation.x = Math.sin(t * 0.5) * 0.03;
    inner.rotation.z = Math.sin(t * 0.17) * 0.08;
    tail.rotation.y = Math.sin(t * 0.6) * 0.06;
  });
}

function material(
  color,
  roughness,
  emissive = "#000000",
  emissiveIntensity = 0,
  options = {},
) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    emissive,
    emissiveIntensity,
    metalness: 0.09,
    ...options,
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

function tendril(points, startRadius, endRadius, segments = 28) {
  const curve = curveFrom(points);
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

function smoothOutline(points, segments = 6) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((point) => new THREE.Vector3(point[0], point[1], 0)),
    true,
    "centripetal",
  );
  return curve
    .getPoints(points.length * segments)
    .slice(0, -1)
    .map((point) => [point.x, point.y]);
}

function mirrorOutline(outline, side) {
  if (side > 0) return outline;
  return outline.map((point) => [point[0], -point[1]]).reverse();
}

function finSolid(outline, thickness, orientation, options = {}) {
  const { smooth = true, bevel = thickness * 0.4 } = options;
  const points = smooth ? smoothOutline(outline) : outline;
  const shape = new THREE.Shape(
    points.map((point) => new THREE.Vector2(point[0], point[1])),
  );
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: thickness * 0.45,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  geometry.translate(0, 0, -thickness / 2);
  const basis =
    orientation === "horizontal"
      ? new THREE.Matrix4().makeBasis(
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(0, 1, 0),
        )
      : new THREE.Matrix4().makeBasis(
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(-1, 0, 0),
        );
  geometry.applyMatrix4(basis);
  return geometry;
}

function formColored(
  profile,
  upperColor,
  lowerColor,
  thresholdFn = null,
  capFront = false,
) {
  const rings = 38,
    sides = 26;
  const positions = [],
    colors = [],
    indices = [];
  const upper = new THREE.Color(upperColor);
  const lower = new THREE.Color(lowerColor);
  const shade = new THREE.Color();
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
      const y = Math.sin(theta);
      positions.push(Math.cos(theta) * width, y * height, z);
      const threshold = thresholdFn ? thresholdFn(z, y) : -0.25;
      shade
        .copy(upper)
        .lerp(
          lower,
          1 - THREE.MathUtils.smoothstep(y, threshold - 0.2, threshold + 0.2),
        );
      colors.push(shade.r, shade.g, shade.b);
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
  if (capFront) {
    // 独立顶点封住躯干前口，避免改变侧面法线或露出内部空腔。
    const center = positions.length / 3;
    positions.push(0, 0, profile[0][0]);
    shade.copy(upper).lerp(lower, 0.35);
    colors.push(shade.r, shade.g, shade.b);
    for (let side = 0; side <= sides; side++) {
      const source = side * 3;
      positions.push(...positions.slice(source, source + 3));
      colors.push(...colors.slice(source, source + 3));
      if (side < sides)
        indices.push(center, center + side + 2, center + side + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
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
