/** 长带、扁翼、钟罩和管状巨兽各有独立的结构与推进动作。 */
export function buildEuropaRibbonForm(c) {
  const { kind, skin, edge, dark, organ } = c;
  const fin = (
    key,
    outline,
    p = [0, 0, 0],
    parent = c.anatomy,
    material = skin,
  ) => c.part(key, c.membrane(key, outline, 0.014), material, p, parent);
  const mouth = (key, r, p, parent = c.anatomy) =>
    c.part(key, c.ring(key, r, 0.018), dark, p, parent);
  if (kind === "ribbon_spore") {
    c.root.userData.anatomyType = "asymmetric-ribbon";
    c.part(
      "ribbon_midvein",
      c.tapered(
        "midvein",
        [
          [0, 0, -0.5],
          [0.015, 0.02, -0.24],
          [-0.025, -0.005, 0.08],
          [0.02, 0.025, 0.34],
          [0, 0, 0.55],
        ],
        0.025,
        0.002,
        28,
      ),
      edge,
    );
    for (const s of [-1, 1]) {
      const ribbon = fin(
        `ribbon${s}`,
        [
          [-0.48, 0],
          [-0.3, s * 0.1],
          [0.06, s * 0.12],
          [0.37, s * 0.06],
          [0.54, 0],
          [0.14, -s * 0.012],
        ],
        [0, 0, 0],
      );
      c.moving(ribbon, (m, t) => (m.rotation.x = Math.sin(t * 1.1 + s) * 0.09));
    }
    for (let i = 0; i < 3; i++)
      c.part(
        "trailing_filament",
        c.tapered(
          `filament${i}`,
          [
            [0, 0, 0.23],
            [0.07 * (i - 1), 0.035, 0.4],
            [0.12 * (i - 1), -0.02, 0.57],
          ],
          0.009,
          0.001,
          14,
        ),
        skin,
      );
    c.oval("anterior_nodule", [0, 0, -0.37], [0.034, 0.03, 0.06], organ);
  } else if (kind === "veil_glider") {
    c.root.userData.anatomyType = "wide-double-kite";
    c.part(
      "wing_keel",
      c.trunk("keel", [
        [-0.4, 0.02, 0.03, 0],
        [-0.25, 0.1, 0.07, 0],
        [0.12, 0.09, 0.055, 0],
        [0.35, 0.015, 0.02, 0],
      ]),
      edge,
    );
    for (const s of [-1, 1]) {
      const wing = c.group(`kite_wing${s}`, [s * 0.07, 0, -0.03]);
      fin(
        `wing${s}`,
        [
          [-0.34, 0],
          [-0.24, s * 0.38],
          [0.03, s * 0.62],
          [0.27, s * 0.46],
          [0.34, s * 0.13],
          [0.24, 0],
        ],
        [0, 0, 0],
        wing,
      );
      fin(
        `lower_lobe${s}`,
        [
          [-0.17, 0],
          [-0.05, s * 0.32],
          [0.26, s * 0.27],
          [0.37, 0],
        ],
        [0, -0.04, 0.05],
        wing,
        edge,
      );
      c.part(
        "wing_spar",
        c.tapered(
          `spar${s}`,
          [
            [0, 0, -0.25],
            [s * 0.28, 0.018, -0.08],
            [s * 0.55, 0.005, 0.15],
          ],
          0.018,
          0.003,
          16,
        ),
        edge,
        [0, 0, 0],
        wing,
      );
      c.motions.push((t) => (wing.rotation.z = s * Math.sin(t * 0.72) * 0.065));
      c.part(
        "split_tail",
        c.tapered(
          `tail${s}`,
          [
            [s * 0.03, 0, 0.22],
            [s * 0.065, 0.015, 0.41],
            [s * 0.11, -0.02, 0.65],
            [s * 0.075, -0.03, 0.81],
          ],
          0.02,
          0.002,
          22,
        ),
        skin,
      );
    }
    mouth("ventral_intake", 0.044, [0, -0.027, -0.32]);
    c.oval("sensory_crest", [0, 0.058, -0.17], [0.025, 0.018, 0.1], organ);
  } else if (kind === "bell_carrier") {
    c.root.userData.anatomyType = "umbrella-colony";
    // 钟罩轴转向竖直，伞缘波瓣与悬垂分支使其明显区别于轴向游鱼。
    const dome = c.group("main_umbrella", [0, 0.06, -0.1]);
    const canopy = c.part(
      "lobed_canopy",
      c.trunk(
        "canopy",
        [
          [-0.28, 0.025, 0.025, 0],
          [-0.14, 0.27, 0.27, 0],
          [0.03, 0.33, 0.33, 0],
          [0.1, 0.31, 0.31, 0],
        ],
        0.018,
        0.07,
      ),
      skin,
      [0, 0, 0],
      dome,
    );
    canopy.rotation.x = Math.PI / 2;
    const collar = c.part(
      "umbrella_rim",
      c.ring("umbrella_rim", 0.31, 0.022),
      edge,
      [0, -0.095, 0],
      dome,
    );
    collar.rotation.x = Math.PI / 2;
    c.oval("suspended_nucleus", [0, -0.11, -0.1], [0.085, 0.11, 0.085], organ);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3,
        x = Math.cos(a),
        z = Math.sin(a);
      c.part(
        "canopy_meridian",
        c.tapered(
          `meridian${i}`,
          [
            [0, 0.32, -0.1],
            [x * 0.23, 0.18, -0.1 + z * 0.23],
            [x * 0.31, -0.035, -0.1 + z * 0.31],
          ],
          0.009,
          0.003,
          16,
        ),
        edge,
      );
      const arm = c.group(`trailing_colony${i}`, [
        x * 0.16,
        -0.11,
        -0.1 + z * 0.16,
      ]);
      c.part(
        "colony_stem",
        c.tapered(
          `stem${i}`,
          [
            [0, 0, 0],
            [x * 0.06, -0.13, 0.13],
            [x * 0.1, -0.19, 0.32],
            [x * 0.06, -0.24, 0.48],
          ],
          0.023,
          0.004,
          24,
        ),
        skin,
        [0, 0, 0],
        arm,
      );
      if (i % 2 === 0) {
        const bud = c.part(
          "satellite_bell",
          c.trunk(`bud${i}`, [
            [-0.07, 0.02, 0.02, 0],
            [0, 0.08, 0.08, 0],
            [0.055, 0.09, 0.09, 0],
          ]),
          edge,
          [x * 0.075, -0.17, 0.25],
          arm,
        );
        bud.rotation.x = Math.PI / 2;
      }
      c.motions.push((t) => (arm.rotation.x = Math.sin(t * 0.65 + i) * 0.05));
    }
    c.motions.push((t) =>
      dome.scale.set(
        1 + Math.sin(t * 0.9) * 0.025,
        1 - Math.sin(t * 0.9) * 0.018,
        1 + Math.sin(t * 0.9) * 0.025,
      ),
    );
  } else if (kind === "siphon_colossus") {
    c.root.userData.anatomyType = "ribbed-siphon-worm";
    c.part(
      "long_siphon_body",
      c.trunk(
        "siphon",
        [
          [-0.48, 0.11, 0.13, 0],
          [-0.34, 0.2, 0.21, 0],
          [-0.03, 0.15, 0.17, 0],
          [0.26, 0.105, 0.12, 0],
          [0.54, 0.009, 0.013, 0],
        ],
        0.055,
      ),
      skin,
    );
    mouth("wide_filter_mouth", 0.095, [0, 0, -0.48]);
    c.part(
      "recessed_filter",
      c.trunk("filter", [
        [-0.45, 0.075, 0.075, 0],
        [-0.38, 0.045, 0.045, 0],
        [-0.31, 0.01, 0.01, 0],
      ]),
      dark,
    );
    for (const s of [-1, 1]) {
      const funnel = c.group(`external_siphon${s}`, [s * 0.14, 0.05, -0.21]);
      c.part(
        "siphon_tube",
        c.tapered(
          `siphon_tube${s}`,
          [
            [0, 0, 0],
            [s * 0.11, 0.08, 0.02],
            [s * 0.13, 0.13, -0.08],
          ],
          0.046,
          0.07,
          20,
        ),
        edge,
        [0, 0, 0],
        funnel,
      );
      const rim = mouth(
        `funnel_rim${s}`,
        0.065,
        [s * 0.13, 0.13, -0.08],
        funnel,
      );
      rim.rotation.y = s * 0.25;
      c.motions.push((t) => (funnel.rotation.x = Math.sin(t * 0.5 + s) * 0.04));
      const skirt = fin(
        `ventral_skirt${s}`,
        [
          [-0.28, 0],
          [-0.13, s * 0.22],
          [0.19, s * 0.19],
          [0.49, 0],
        ],
        [s * 0.06, -0.1, 0.02],
      );
      c.moving(skirt, (m, t) => (m.rotation.x = Math.sin(t * 0.6 + s) * 0.07));
    }
    for (let i = 0; i < 6; i++)
      c.oval(
        "pressure_node",
        [0, 0.19 - i * 0.013, -0.28 + i * 0.09],
        [0.02, 0.016, 0.018],
        organ,
      );
  } else if (kind === "rift_reaver") {
    c.root.userData.anatomyType = "armored-serpent";
    c.part(
      "front_trunk",
      c.trunk(
        "trunk",
        [
          [-0.48, 0.075, 0.075, 0],
          [-0.32, 0.14, 0.12, 0],
          [0.05, 0.12, 0.105, 0],
          [0.24, 0.1, 0.09, 0],
        ],
        0.01,
      ),
      skin,
    );
    const tail = c.group("articulated_serpent_tail", [0, 0, 0.19]);
    c.part(
      "long_tail",
      c.trunk(
        "tail",
        [
          [0, 0.1, 0.09, 0],
          [0.24, 0.085, 0.075, 0],
          [0.5, 0.05, 0.045, 0],
          [0.8, 0.003, 0.006, 0],
        ],
        0.012,
      ),
      skin,
      [0, 0, 0],
      tail,
    );
    for (let i = 0; i < 9; i++) {
      const z = -0.3 + i * 0.13,
        parent = i > 3 ? tail : c.anatomy,
        localZ = i > 3 ? z - 0.19 : z;
      for (const s of [-1, 1]) {
        const r = 0.115 - i * 0.006;
        c.part(
          "recurved_armor",
          c.tapered(
            `armor${s}_${i}`,
            [
              [s * r * 0.55, 0.085, localZ - 0.055],
              [s * r, 0.07, localZ],
              [s * (r + 0.055), 0.04, localZ + 0.05],
            ],
            0.025,
            0.004,
            12,
          ),
          edge,
          [0, 0, 0],
          parent,
        );
      }
      c.part(
        "serpent_spine",
        c.tapered(
          `spine${i}`,
          [
            [0, 0.1, localZ - 0.02],
            [0, 0.17 - i * 0.007, localZ + 0.03],
            [0, 0.12, localZ + 0.09],
          ],
          0.016,
          0.002,
          10,
        ),
        edge,
        [0, 0, 0],
        parent,
      );
    }
    for (const s of [-1, 1]) {
      const jaw = c.group(`hooked_jaw${s}`, [s * 0.045, -0.012, -0.35]);
      c.part(
        "jaw_hook",
        c.tapered(
          `jaw_hook${s}`,
          [
            [0, 0, 0],
            [s * 0.1, -0.03, -0.11],
            [s * 0.05, -0.035, -0.2],
          ],
          0.036,
          0.003,
          18,
        ),
        edge,
        [0, 0, 0],
        jaw,
      );
      c.motions.push(
        (t) =>
          (jaw.rotation.y =
            s *
            ((c.phase() === "windup" ? 0.25 : 0.06) +
              Math.sin(t * 0.5) * 0.02)),
      );
      c.oval(
        "hunting_sensor",
        [s * 0.092, 0.045, -0.28],
        [0.018, 0.016, 0.04],
        organ,
      );
    }
    mouth("serpent_maw", 0.067, [0, -0.008, -0.43]);
    c.motions.push((t) => (tail.rotation.y = Math.sin(t * 0.62) * 0.095));
  } else if (kind === "void_siphon") {
    c.root.userData.anatomyType = "four-jawed-annular-tube";
    c.part(
      "massive_tube",
      c.trunk(
        "tube",
        [
          [-0.3, 0.2, 0.2, 0],
          [-0.17, 0.22, 0.22, 0],
          [0.04, 0.18, 0.18, 0],
          [0.35, 0.085, 0.095, 0],
          [0.62, 0.009, 0.012, 0],
        ],
        0.035,
      ),
      skin,
    );
    mouth("dark_maw", 0.17, [0, 0, -0.31]);
    c.part(
      "maw_recess",
      c.trunk("recess", [
        [-0.31, 0.145, 0.145, 0],
        [-0.22, 0.07, 0.07, 0],
        [-0.12, 0.01, 0.01, 0],
      ]),
      dark,
    );
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2,
        x = Math.cos(a),
        y = Math.sin(a);
      const jaw = c.group(`quadrant_jaw${i}`, [x * 0.12, y * 0.12, -0.26]);
      jaw.rotation.z = a;
      c.part(
        "folding_mandible",
        c.tapered(
          `mandible${i}`,
          [
            [0, 0, 0],
            [0.08, 0, -0.1],
            [0.09, -0.015, -0.24],
            [0.01, 0, -0.33],
          ],
          0.065,
          0.004,
          24,
        ),
        edge,
        [0, 0, 0],
        jaw,
      );
      c.part(
        "jaw_edge",
        c.tapered(
          `jaw_edge${i}`,
          [
            [0.04, -0.045, -0.04],
            [0.1, -0.04, -0.15],
            [0.02, -0.018, -0.3],
          ],
          0.014,
          0.002,
          16,
        ),
        dark,
        [0, 0, 0],
        jaw,
      );
      c.motions.push(
        (t) =>
          (jaw.rotation.y =
            (c.phase() === "windup" ? -0.2 : 0.02) +
            Math.sin(t * 0.53 + i) * 0.025),
      );
    }
    for (let i = 0; i < 5; i++) {
      const z = -0.13 + i * 0.115,
        r = 0.217 - i * 0.026;
      c.part("annular_armor", c.ring(`annulus${i}`, r, 0.014), edge, [0, 0, z]);
    }
    for (const s of [-1, 1]) {
      const vane = fin(
        `rear_vane${s}`,
        [
          [0.08, 0],
          [0.31, s * 0.19],
          [0.56, s * 0.1],
          [0.6, 0],
        ],
        [s * 0.055, 0, 0],
      );
      c.moving(vane, (m, t) => (m.rotation.x = Math.sin(t * 0.45 + s) * 0.04));
      c.oval(
        "deep_sensor",
        [s * 0.19, 0.07, -0.15],
        [0.016, 0.018, 0.05],
        organ,
      );
    }
  } else return false;
  return true;
}
