import * as THREE from "three";
import {
  pgMaterial as mat,
  pgOval as oval,
  pgTaper as taper,
  pgLoft as loft,
  pgEyes as eyes,
  pgFeather as feather,
  pgPart as part,
  pgGeometry,
} from "./creature_penglai_art.js";
import { buildPenglaiTortoise } from "./creature_penglai_tortoise.js";
import { buildPenglaiSage } from "./creature_penglai_sage.js";

/** 龟蛇、瓣壳与御剑人物具有各自的结构，不用球体装饰替代主体。 */
export function buildPenglaiSpecial(kind, b, motions, root) {
  if (kind === "black_tortoise") return buildPenglaiTortoise(b, motions, root);
  if (kind === "sword_sage") return buildPenglaiSage(b, motions, root);
  if (kind === "lotus_sprite") {
    const shell = mat("#be8392", 4),
      inside = mat("#d9cbbb"),
      pearl = mat("#d6d9ba", 0, 0.025);
    oval(b, pearl, [0, 0, -0.035], [0.07, 0.078, 0.084], "pearl_inside_valves");
    for (let j = 0; j < 8; j++) {
      const valve = new THREE.Group();
      valve.rotation.y = (j / 8) * Math.PI * 2;
      valve.name = "living_shell_hinge";
      b.add(valve);
      const f = feather(valve, shell, 0.25, 0.092, 0.072, "ribbed_lotus_shell");
      f.position.set(0, -0.015, 0);
      const inner = feather(
        valve,
        inside,
        0.22,
        0.08,
        0.059,
        "mother_of_pearl_lining",
      );
      inner.position.set(0, 0.002, 0.008);
      for (let rib = -3; rib <= 3; rib++)
        taper(
          valve,
          inside,
          [
            [rib * 0.008, 0, 0.025],
            [rib * 0.019, 0.038, 0.125],
            [rib * 0.014, 0.061, 0.2],
          ],
          [0.0014, 0.001, 0.0004],
          "shell_growth_rib",
        );
      taper(
        valve,
        mat("#769a82"),
        [
          [0, -0.04, 0.07],
          [0.014, -0.1, 0.22],
          [0.028, -0.11, 0.35],
        ],
        [0.005, 0.003, 0.0004],
        "tapered_shell_feeler",
      );
      motions.push(
        (t) =>
          (valve.rotation.x = -0.15 + Math.sin(t * 0.48 + j * 0.35) * 0.055),
      );
    }
    return;
  }
  const shell = mat("#604e43", 2),
    skin = mat("#875345", 2),
    rim = mat("#ada47e", 2),
    dark = mat("#283a32");
  loft(b, `carapace_v2_${kind}`, shell, [
    [-0.31, 0.001, 0.006],
    [-0.25, 0.16, 0.084, 0.033],
    [-0.1, 0.245, 0.14, 0.045],
    [0.1, 0.24, 0.14, 0.045],
    [0.26, 0.16, 0.07, 0.027],
    [0.32, 0.001, 0.005],
  ]);
  oval(b, rim, [0, -0.055, 0.015], [0.23, 0.039, 0.3], "flattened_plastron");
  for (let row = -2; row <= 2; row++)
    for (let col = -2; col <= 2; col++) {
      const x = col * 0.077 + (row % 2) * 0.032,
        z = row * 0.09,
        d = (x / 0.24) ** 2 + (z / 0.3) ** 2;
      if (d > 0.83) continue;
      const geometry = pgGeometry(`scute_v2_${kind}_${row}_${col}`, () => {
        const p = [],
          ix = [];
        const height = (xx, zz) =>
          0.045 +
          0.139 *
            Math.sqrt(Math.max(0, 1 - (xx / 0.248) ** 2 - (zz / 0.32) ** 2));
        p.push(x, height(x, z) + 0.009, z);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2,
            xx = x + Math.cos(a) * 0.04,
            zz = z + Math.sin(a) * 0.044;
          p.push(xx, height(xx, zz) + 0.006, zz);
          ix.push(0, ((k + 1) % 6) + 1, k + 1);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
        g.setIndex(ix);
        g.computeVertexNormals();
        return g;
      });
      part(
        b,
        geometry,
        mat((row + col) % 2 ? "#516d55" : "#718366", 2),
        [0, 0, 0],
        [1, 1, 1],
        [],
        "fitted_hexagonal_shell_plate",
      );
    }
  taper(
    b,
    skin,
    [
      [0, -0.016, -0.23],
      [0, 0.025, -0.32],
      [0, 0.075, -0.44],
    ],
    [0.067, 0.052, 0.042],
    "turtle_armored_neck",
  );
  loft(b, `turtle_skull_v2_${kind}`, skin, [
    [-0.56, 0.001, 0.012, 0.047],
    [-0.5, 0.041, 0.033, 0.064],
    [-0.435, 0.058, 0.057, 0.081],
    [-0.39, 0.039, 0.042, 0.055],
  ]);
  eyes(b, 0.047, 0.106, -0.463, 0.007, true);
  taper(
    b,
    rim,
    [
      [0, 0.049, -0.52],
      [0, 0.028, -0.568],
      [0, 0.006, -0.551],
    ],
    [0.021, 0.015, 0.0005],
    "hooked_bird_beak",
  );
  taper(
    b,
    dark,
    [
      [-0.041, 0.044, -0.485],
      [0, 0.023, -0.535],
      [0.041, 0.044, -0.485],
    ],
    [0.003, 0.002, 0.003],
    "tortoise_mouth_edge",
  );
  for (const side of [-1, 1])
    for (const z of [-0.15, 0.16]) {
      const limb = new THREE.Group();
      limb.position.set(side * 0.18, -0.013, z);
      limb.name = "articulated_turtle_limb";
      b.add(limb);
      taper(
        limb,
        skin,
        [
          [0, 0, 0],
          [side * 0.055, -0.057, 0.012],
          [side * 0.1, -0.071, -0.017],
        ],
        [0.052, 0.039, 0.028],
        "scaly_forearm",
      );
      for (let j = -1; j <= 1; j++)
        taper(
          limb,
          rim,
          [
            [side * 0.085, -0.068, j * 0.02],
            [side * 0.14, -0.075, j * 0.024],
            [side * 0.16, -0.068, j * 0.024],
          ],
          [0.009, 0.006, 0.0006],
          "tortoise_hooked_claw",
        );
      motions.push(
        (t) => (limb.rotation.y = Math.sin(t * 0.7 + side + z * 5) * 0.11),
      );
    }
  taper(
    b,
    skin,
    [
      [0, -0.023, 0.27],
      [0.074, -0.035, 0.39],
      [0.09, 0.018, 0.5],
      [0.04, 0.063, 0.6],
    ],
    [0.025, 0.018, 0.01, 0.0005],
    "tapered_serpent_tail",
  );
  b.userData.headAnchor = new THREE.Vector3(0, 0.039, -0.563);
}
