import * as THREE from "three";
import { createBermudaBuilder } from "./bermuda_geometry.js";
import { skinMaterial } from "./creature_surface.js";

/** 可近看船长：三角帽、旧军服、触须胡须与螯手，采用独立原创几何。 */
export function createDavyJones(parent, keep) {
  const root = new THREE.Group();
  root.name = "davy_jones_captain";
  parent.add(root);
  const b = createBermudaBuilder(root, keep);
  const skin = keep(
    skinMaterial({ color: "#78958c", roughness: 0.75, pattern: 0.12 }),
  );
  skin.name = "captain_marine_skin";
  const coat = keep(
    new THREE.MeshStandardMaterial({ color: "#253b3a", roughness: 0.95 }),
  );
  coat.name = "captain_waterlogged_coat";
  const trim = keep(
    new THREE.MeshStandardMaterial({
      color: "#8d8970",
      roughness: 0.7,
      metalness: 0.16,
    }),
  );
  trim.name = "captain_salt_braid";
  const dark = keep(
    new THREE.MeshStandardMaterial({ color: "#131d1b", roughness: 0.72 }),
  );
  dark.name = "captain_hat_and_boots";
  const amber = keep(
    new THREE.MeshStandardMaterial({ color: "#c5bb83", roughness: 0.36 }),
  );
  amber.name = "captain_eyes";
  function bulb(mat, p, s) {
    const g = new THREE.SphereGeometry(1, 24, 16);
    g.scale(...s);
    b.add(g, mat, p);
  }
  bulb(coat, [0, 1.55, 0], [0.45, 0.65, 0.25]);
  for (const side of [-1, 1]) {
    bulb(dark, [side * 0.2, 0.28, 0.05], [0.16, 0.3, 0.21]);
    bulb(coat, [side * 0.23, 0.8, 0], [0.22, 0.6, 0.21]);
    b.box(trim, [side * 0.2, 1.72, -0.255], [0.045, 0.65, 0.06], false, [
      0,
      0,
      side * 0.18,
    ]);
    bulb(coat, [side * 0.53, 1.9, 0], [0.25, 0.31, 0.22]);
    b.beam(coat, [side * 0.5, 1.8, -0.05], [side * 0.7, 1.18, -0.25], 0.19, 14);
    if (side === 1) {
      bulb(skin, [0.73, 1.12, -0.33], [0.19, 0.2, 0.13]);
      b.beam(skin, [0.76, 1.12, -0.4], [0.63, 1.33, -0.7], 0.1, 10);
      b.beam(skin, [0.76, 1.05, -0.4], [0.84, 1.28, -0.69], 0.11, 10);
    } else {
      bulb(skin, [-0.71, 1.18, -0.3], [0.12, 0.15, 0.08]);
      for (let j = 0; j < 4; j++)
        b.beam(
          skin,
          [-0.75 + j * 0.035, 1.15, -0.34],
          [-0.78 + j * 0.03, 1.03, -0.45],
          0.026,
          7,
        );
    }
  }
  for (let i = 0; i < 6; i++)
    bulb(trim, [0, 1.16 + i * 0.14, -0.249], [0.037, 0.037, 0.02]);
  bulb(skin, [0, 2.26, 0], [0.21, 0.31, 0.21]);
  bulb(skin, [0, 2.31, -0.15], [0.27, 0.28, 0.17]);
  for (const side of [-1, 1]) {
    bulb(dark, [side * 0.14, 2.4, -0.293], [0.083, 0.064, 0.035]);
    bulb(amber, [side * 0.14, 2.397, -0.322], [0.043, 0.039, 0.014]);
    bulb(dark, [side * 0.14, 2.397, -0.335], [0.014, 0.03, 0.01]);
    b.beam(
      skin,
      [side * 0.075, 2.47, -0.3],
      [side * 0.21, 2.46, -0.245],
      0.046,
      9,
    );
  }
  // 三折帽沿弧面上翻，避免平面的三角形头饰。
  const points = [],
    idx = [];
  for (let j = 0; j <= 2; j++)
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2,
        r = j === 0 ? 0.12 : j === 1 ? 0.3 : 0.47 + 0.11 * Math.cos(a * 3);
      points.push(
        Math.cos(a) * r,
        2.58 +
          (j === 1 ? 0.08 : 0) +
          (j === 2 ? 0.16 * (0.5 + 0.5 * Math.cos(a * 3)) : 0),
        Math.sin(a) * r,
      );
    }
  for (let j = 0; j < 2; j++)
    for (let i = 0; i < 72; i++) {
      const n = j * 73 + i;
      idx.push(n, n + 73, n + 1, n + 1, n + 73, n + 74);
    }
  const brim = new THREE.BufferGeometry();
  brim.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  brim.setIndex(idx);
  brim.computeVertexNormals();
  dark.side = THREE.DoubleSide;
  b.add(brim, dark);
  bulb(dark, [0, 2.7, 0], [0.29, 0.15, 0.27]);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2,
      r = 0.47 + 0.11 * Math.cos(a * 3);
    bulb(
      trim,
      [
        Math.cos(a) * r,
        2.6 + 0.16 * (0.5 + 0.5 * Math.cos(a * 3)),
        Math.sin(a) * r,
      ],
      [0.018, 0.015, 0.018],
    );
  }
  b.finish();
  const beards = [];
  for (let i = 0; i < 12; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(
      ((i % 6) - 2.5) * 0.06,
      2.25 - Math.floor(i / 6) * 0.06,
      -0.28,
    );
    root.add(pivot);
    const end = 0.37 + (i % 4) * 0.12,
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(Math.sin(i) * 0.035, -end * 0.35, -0.11),
        new THREE.Vector3(Math.sin(i * 0.7) * 0.1, -end * 0.8, -0.18),
        new THREE.Vector3(Math.cos(i) * 0.12, -end, -0.08),
      ]);
    const g = keep(new THREE.TubeGeometry(curve, 24, 0.034, 9, false)),
      p = g.attributes.position;
    for (let j = 0; j <= 24; j++) {
      const c = curve.getPointAt(j / 24),
        scale = 1 - (j / 24) * 0.9;
      for (let k = 0; k <= 9; k++) {
        const n = j * 10 + k;
        p.setXYZ(
          n,
          c.x + (p.getX(n) - c.x) * scale,
          c.y + (p.getY(n) - c.y) * scale,
          c.z + (p.getZ(n) - c.z) * scale,
        );
      }
    }
    g.computeVertexNormals();
    const n = new THREE.Mesh(g, skin);
    pivot.add(n);
    beards.push(pivot);
  }
  return {
    root,
    update(time, charging = false) {
      for (const [i, p] of beards.entries()) {
        p.rotation.x = Math.sin(time * 0.9 + i) * 0.09;
        p.rotation.z = Math.sin(time * 0.7 + i) * 0.065;
      }
      root.rotation.y = charging ? 0.12 : Math.sin(time * 0.16) * 0.07;
    },
  };
}
