import * as THREE from "three";

/** 放射状生命用不同的承重结构与运动关节，软冠与硬壳不共用剪影。 */
export function buildEuropaRadialForm(c) {
  const { kind, skin, edge, dark, organ } = c;
  const rim = (key, r, p, parent = c.anatomy, material = dark) =>
    c.part(key, c.ring(key, r, 0.012), material, p, parent);
  if (kind === "tripod_bloom") {
    c.root.userData.anatomyType = "three-lobed-flower";
    c.oval("central_bulb", [0, 0, 0.06], [0.09, 0.09, 0.17], skin);
    rim("threefold_intake", 0.054, [0, 0, -0.18]);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const petal = c.group(`fleshy_petal${i}`);
      petal.rotation.z = a;
      c.part(
        "folded_lobe",
        c.trunk(
          `petal${i}`,
          [
            [-0.4, 0.014, 0.025, 0],
            [-0.22, 0.11, 0.065, 0.2],
            [0.06, 0.18, 0.09, 0.22],
            [0.3, 0.09, 0.04, 0.11],
            [0.4, 0.005, 0.008, 0],
          ],
          0.018,
        ),
        skin,
        [0, 0, 0],
        petal,
      );
      c.part(
        "petal_midvein",
        c.tapered(
          `vein${i}`,
          [
            [0, 0.025, -0.36],
            [0, 0.22, -0.1],
            [0, 0.31, 0.11],
            [0, 0.11, 0.32],
          ],
          0.012,
          0.004,
          20,
        ),
        edge,
        [0, 0, 0],
        petal,
      );
      c.oval(
        "sensory_node",
        [0, 0.25, -0.07],
        [0.026, 0.02, 0.05],
        organ,
        petal,
      );
      c.motions.push(
        (t) => (petal.rotation.z = a + Math.sin(t * 0.8 + i) * 0.035),
      );
    }
  } else if (kind === "lantern_pod") {
    c.root.userData.anatomyType = "fivefold-caged-lantern";
    c.part(
      "faceted_chamber",
      c.trunk(
        "chamber",
        [
          [-0.28, 0.03, 0.03, 0],
          [-0.17, 0.14, 0.14, 0],
          [0.12, 0.16, 0.16, 0],
          [0.28, 0.045, 0.045, 0],
        ],
        0.012,
        0.12,
      ),
      skin,
    );
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5,
        x = Math.cos(a),
        y = Math.sin(a);
      c.part(
        "lantern_rib",
        c.tapered(
          `rib${i}`,
          [
            [x * 0.045, y * 0.045, -0.3],
            [x * 0.2, y * 0.2, -0.15],
            [x * 0.205, y * 0.205, 0.1],
            [x * 0.06, y * 0.06, 0.3],
          ],
          0.024,
          0.013,
          20,
        ),
        edge,
      );
      c.oval(
        "recessed_glow",
        [x * 0.148, y * 0.148, -0.025],
        [0.03, 0.03, 0.095],
        organ,
      );
      const skirt = c.group(`lantern_lappet${i}`, [x * 0.065, y * 0.065, 0.23]);
      skirt.rotation.z = a;
      c.part(
        "tapered_lappet",
        c.tapered(
          `lappet${i}`,
          [
            [0, 0, 0],
            [0.07, 0.04, 0.13],
            [0.09, 0.025, 0.26],
            [0.06, -0.015, 0.35],
          ],
          0.032,
          0.003,
          18,
        ),
        skin,
        [0, 0, 0],
        skirt,
      );
      c.motions.push((t) => (skirt.rotation.x = Math.sin(t * 0.9 + i) * 0.11));
    }
    rim("lantern_mouth", 0.045, [0, 0, -0.3]);
  } else if (kind === "crown_filterer") {
    c.root.userData.anatomyType = "eight-armed-octopoid";
    c.part(
      "pear_mantle",
      c.trunk(
        "mantle",
        [
          [-0.16, 0.12, 0.13, 0],
          [0.02, 0.22, 0.21, 0.02],
          [0.22, 0.2, 0.18, 0.03],
          [0.4, 0.015, 0.02, 0],
        ],
        0.018,
        0.045,
      ),
      skin,
    );
    rim("radial_filter", 0.072, [0, -0.035, -0.17]);
    // 八腕呈宽冠状展开，每条腕的厚根、细尖和吸附褶独立可读。
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        x = Math.cos(a),
        y = Math.sin(a) * 0.65;
      const arm = c.group(`filter_arm${i}`, [x * 0.09, y * 0.09, -0.08]);
      c.part(
        "muscular_arm",
        c.tapered(
          `arm${i}`,
          [
            [0, 0, 0],
            [x * 0.22, y * 0.2, -0.15],
            [x * 0.46, y * 0.34, -0.32],
            [x * 0.52, y * 0.3, -0.49],
            [x * 0.42, y * 0.21, -0.58],
          ],
          0.06,
          0.003,
          28,
        ),
        skin,
        [0, 0, 0],
        arm,
      );
      c.part(
        "arm_crest",
        c.tapered(
          `arm_crest${i}`,
          [
            [x * 0.05, y * 0.05, -0.04],
            [x * 0.25, y * 0.21, -0.19],
            [x * 0.46, y * 0.32, -0.4],
          ],
          0.011,
          0.003,
          16,
        ),
        edge,
        [0, 0, 0],
        arm,
      );
      for (let j = 0; j < 5; j++) {
        const f = 0.12 + j * 0.063;
        const cup = c.part(
          "filter_cup",
          c.geometry(
            `cup${i}_${j}`,
            () => new THREE.TorusGeometry(0.013 - j * 0.0014, 0.004, 4, 12),
          ),
          edge,
          [x * f, y * f - 0.025, -0.08 - j * 0.068],
          arm,
        );
        cup.rotation.x = Math.PI / 2;
      }
      c.motions.push((t) => {
        arm.rotation.y = Math.sin(t * 0.7 + i * 0.72) * 0.065;
        arm.rotation.x = Math.cos(t * 0.63 + i * 0.68) * 0.05;
      });
    }
    for (const s of [-1, 1]) {
      c.oval(
        "sensory_facet",
        [s * 0.13, 0.08, -0.1],
        [0.045, 0.022, 0.03],
        dark,
      );
      c.oval(
        "facet_lens",
        [s * 0.143, 0.09, -0.116],
        [0.018, 0.012, 0.016],
        organ,
      );
    }
  } else if (kind === "brine_rosette") {
    c.root.userData.anatomyType = "low-sixfold-carapace";
    c.oval("basal_disc", [0, 0.016, 0], [0.27, 0.045, 0.27], dark);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const valve = c.group(`rosette_valve${i}`);
      valve.rotation.y = a;
      c.part(
        "radial_shell",
        c.membrane(
          `valve${i}`,
          [
            [-0.23, 0],
            [-0.12, 0.13],
            [0.11, 0.14],
            [0.3, 0.055],
            [0.1, -0.035],
          ],
          0.045,
        ),
        skin,
        [0, 0.035, 0],
        valve,
      );
      c.part(
        "shell_crest",
        c.tapered(
          `crest${i}`,
          [
            [0, 0.04, -0.23],
            [0.06, 0.09, -0.07],
            [0.09, 0.07, 0.17],
          ],
          0.009,
          0.005,
          12,
        ),
        edge,
        [0, 0, 0],
        valve,
      );
      valve.updateMatrix();
      for (const mesh of [...valve.children]) {
        mesh.applyMatrix4(valve.matrix);
        c.anatomy.add(mesh);
      }
      c.anatomy.remove(valve);
    }
    const mouth = rim("rosette_opening", 0.06, [0, 0.065, 0], c.anatomy, edge);
    mouth.rotation.x = Math.PI / 2;
    const tissue = c.oval(
      "rosette_tissue",
      [0, 0.063, 0],
      [0.043, 0.012, 0.043],
      organ,
    );
    c.moving(tissue, (m, t) => (m.scale.y = 0.012 * (1 + Math.sin(t) * 0.18)));
  } else return false;
  return true;
}
