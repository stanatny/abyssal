import * as THREE from "three";
import { createBermudaBuilder } from "./bermuda_geometry.js";
import { createDavyJones } from "./bermuda_davy_jones.js";

/** 飞翔的荷兰人号：弧形船壳、双炮层、腐朽艉廊、残帆与附着生态。 */
export function createFlyingDutchman(m, keep) {
  const root = new THREE.Group();
  root.name = "bermuda_flying_dutchman";
  const b = createBermudaBuilder(root, keep),
    sails = [],
    muzzles = [];
  const timber = keep(m.wood.clone());
  timber.name = "dutchman_old_growth_timber";
  timber.color.set("#625f45");
  const growth = keep(m.brass.clone());
  growth.name = "salt_encrusted_carvings";
  growth.color.set("#849084");
  growth.metalness = 0.08;
  growth.roughness = 0.96;
  const window = keep(m.pearl.clone());
  window.name = "cursed_cabin_windows";
  window.color.set("#8ca386");
  window.emissiveIntensity = 0.65;
  const widthAt = (z) =>
    12.5 * Math.pow(Math.max(0.035, 1 - (Math.abs(z - 3) / 54) ** 3), 0.6);
  // 舷侧每块板有自己的边缘与弧度，炮门处留真实视觉开口。
  for (const side of [-1, 1]) {
    for (let z = -46; z < 47; z += 3) {
      for (let y = -10; y < 15; y += 1.25) {
        if (
          (Math.abs(y - 3) < 1.8 || Math.abs(y - 8) < 1.8) &&
          Math.abs(z) < 33 &&
          Math.abs((z + 31) % 8) < 2.1
        )
          continue;
        const x =
          side *
          widthAt(z) *
          (0.6 + Math.sin((Math.max(0, (y + 11) / 27) * Math.PI) / 2) * 0.4);
        const nextX =
          side *
          widthAt(z + 3) *
          (0.6 + Math.sin((Math.max(0, (y + 11) / 27) * Math.PI) / 2) * 0.4);
        b.box(
          timber,
          [(x + nextX) / 2, y + 0.06 * Math.sin(z * 1.9 + y), z + 1.5],
          [0.7, 1.16, Math.hypot(nextX - x, 3)],
          false,
          Math.atan2(nextX - x, 3),
        );
      }
      const x = side * widthAt(z);
      b.beam(
        growth,
        [x * 0.67, -9, z],
        [x, 14 + Math.abs(z / 48) ** 4 * 7, z],
        0.3,
        7,
      );
      for (const y of [0.5, 5.5, 11.5])
        b.beam(growth, [x, y, z], [side * widthAt(z + 3), y, z + 3], 0.23, 7);
    }
    for (const y of [3, 8])
      for (let z = -29; z <= 31; z += 8) {
        const x = side * widthAt(z);
        b.box(m.dark, [x - side * 0.4, y, z], [0.4, 2.8, 3.2]);
        for (const dz of [-1.65, 1.65])
          b.beam(growth, [x, y - 1.6, z + dz], [x, y + 1.6, z + dz], 0.19);
        const barrel = new THREE.CylinderGeometry(0.57, 0.85, 4.7, 16, 3, true);
        barrel.rotateZ(Math.PI / 2);
        b.add(barrel, m.dark, [x + side * 0.7, y, z]);
        for (const offset of [0.7, 2.5])
          b.add(
            new THREE.TorusGeometry(0.65, 0.13, 8, 16).rotateY(Math.PI / 2),
            growth,
            [x + side * offset, y, z],
          );
        b.add(new THREE.SphereGeometry(0.45, 10, 8), window, [
          x + side * 2.9,
          y,
          z,
        ]);
        if (y === 8 && z >= -21 && z <= 19)
          muzzles.push(new THREE.Vector3(x + side * 3, y, z));
      }
  }
  b.box(timber, [0, -9, 0], [13, 2, 88]);
  for (let x = -11; x < 12; x += 0.95)
    b.box(timber, [x, 12.1 + Math.abs(x) * 0.025, 0], [0.88, 0.32, 79]);
  for (const side of [-1, 1]) {
    // 艉廊拱窗和露台层叠，不用矩形房盒代替完整艉楼。
    for (const [level, y] of [16, 21, 26].entries()) {
      const w = 11 - level * 1.4;
      b.box(timber, [0, y, 36], [w * 2, 0.8, 21 - level * 3]);
      for (let z = 29; z < 44 - level; z += 3.3) {
        b.box(timber, [side * w, y + 1.8, z], [0.7, 4.5, 0.65]);
        b.box(window, [side * (w - 0.1), y + 2, z + 1.4], [0.2, 2.1, 1.5]);
        b.add(
          new THREE.TorusGeometry(1.1, 0.2, 8, 16, Math.PI).rotateY(
            Math.PI / 2,
          ),
          growth,
          [side * w, y + 2.4, z + 1.4],
        );
      }
      for (let x = -w + 1; x < w; x += 2.8) {
        b.box(window, [x, y + 2, 45 - level * 1.5], [1.7, 2.6, 0.3]);
        b.beam(
          growth,
          [x - 1, y, 45 - level * 1.5],
          [x - 1, y + 4, 45 - level * 1.5],
          0.17,
        );
      }
      b.beam(
        growth,
        [side * w, y + 4.4, 26],
        [side * w, y + 4.4, 44 - level],
        0.25,
      );
    }
    for (let z = -40; z < 26; z += 3.8) {
      const x = side * widthAt(z);
      b.beam(growth, [x, 12, z], [x, 15.2, z], 0.24);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 14, z),
        new THREE.Vector3(x, 16, z + 1.8),
        new THREE.Vector3(side * widthAt(z + 3.8), 14, z + 3.8),
      ]);
      b.add(new THREE.TubeGeometry(curve, 12, 0.18, 5), growth);
    }
    for (let i = 0; i < 12; i++)
      b.box(
        timber,
        [side * 6.5, 12.6 + i * 0.37, 21 + i * 0.8],
        [3.5, 0.35, 1.1],
      );
  }
  // 腐朽船首尖角和骸骨雕首，轮廓沿艏向延伸。
  for (const side of [-1, 1])
    for (let i = 0; i < 7; i++) {
      const z = -36 - i * 2.4,
        y = 13 + i * 1.1,
        x = side * (7 - i * 0.7);
      b.beam(growth, [x, y, z], [x * 0.8, y + 4, z - 2], 0.26);
    }
  b.beam(timber, [0, 13, -38], [0, 22, -68], 0.55, 12);
  b.add(
    new THREE.SphereGeometry(1.5, 16, 12).scale(0.7, 1.15, 1),
    growth,
    [0, 19, -51],
  );
  for (const x of [-0.6, 0.6])
    b.add(new THREE.SphereGeometry(0.36, 10, 8), m.dark, [x, 19.5, -52.1]);
  for (let i = 0; i < 7; i++)
    b.box(growth, [(i - 3) * 0.23, 17.8, -52.1], [0.12, 0.75, 0.15]);
  const sailTexture = keep(tornCanvas());
  const cloth = keep(
    new THREE.MeshStandardMaterial({
      color: "#9caa91",
      map: sailTexture,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 1,
    }),
  );
  cloth.name = "dutchman_salt_torn_sails";
  for (const [i, z] of [-27, 0, 30].entries()) {
    const height = i === 1 ? 66 : 58;
    b.beam(timber, [0, 12, z], [0, height, z], 0.65, 12);
    b.add(
      new THREE.TorusGeometry(2.5, 0.4, 8, 24).rotateX(Math.PI / 2),
      timber,
      [0, height * 0.68, z],
    );
    for (const [j, y] of (i === 2 ? [40, 52] : [30, 45, 58]).entries()) {
      if (y > height - 2) continue;
      const width = i === 2 ? 27 - j * 6 : 34 - j * 7,
        h = 12 - j;
      b.beam(timber, [-width / 2, y, z], [width / 2, y, z], 0.35, 10);
      const g = keep(new THREE.PlaneGeometry(width, h, 28, 18)),
        p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k),
          v = p.getY(k);
        p.setZ(
          k,
          Math.cos((x / width) * Math.PI) *
            Math.sin(((v + h / 2) / h) * Math.PI) *
            3,
        );
      }
      g.computeVertexNormals();
      const sail = new THREE.Mesh(g, cloth);
      sail.position.set(0, y - h / 2, z);
      root.add(sail);
      sails.push(sail);
    }
    for (const side of [-1, 1])
      for (const dz of [-15, 15]) {
        b.beam(m.dark, [0, height, z], [side * 11, 12, z + dz], 0.085, 5);
        for (let j = 0; j < 20; j++) {
          const f = j / 20,
            y = 12 + (height - 12) * f;
          b.beam(
            m.dark,
            [side * 11 * (1 - f), y, z - 15 * (1 - f)],
            [side * 11 * (1 - f), y, z + 15 * (1 - f)],
            0.045,
            4,
          );
        }
      }
    if (i < 2) b.beam(m.dark, [0, height, z], [0, 20, z + 30], 0.07, 5);
  }
  // 海藻与藤壶沿真实船壳放置，静态合批，避免几百个独立绘制。
  for (let i = 0; i < 170; i++) {
    const side = i % 2 ? 1 : -1,
      z = -39 + ((i * 7.73) % 78),
      y = -4 + ((i * 4.31) % 20),
      x =
        side *
        widthAt(z) *
        (0.6 + Math.sin((((y + 11) / 27) * Math.PI) / 2) * 0.4);
    const r = 0.15 + (i % 5) * 0.1;
    const barnacle = new THREE.ConeGeometry(r, r * 1.4, 6, 1, true);
    barnacle.rotateZ((-side * Math.PI) / 2);
    b.add(barnacle, growth, [x + side * 0.3, y, z]);
    if (i % 3 === 0) {
      const g = new THREE.PlaneGeometry(0.9, 3.5 + (i % 4), 1, 6),
        p = g.attributes.position;
      for (let n = 0; n < p.count; n++)
        p.setX(n, p.getX(n) + Math.sin(p.getY(n) * 1.3 + i) * 0.25);
      b.add(
        g,
        growth,
        [x + side * 0.4, y - 2, z],
        [0, (side * Math.PI) / 2, 0.13],
      );
    }
  }
  b.finish();
  const captain = createDavyJones(root, keep);
  captain.root.position.set(4.2, 26.4, 29);
  captain.root.scale.setScalar(1.65);
  return {
    root,
    sails,
    muzzles: muzzles,
    captain,
    length: 96,
    width: 25,
    localColliders: [
      { center: [0, 1, 0], size: [24, 24, 82] },
      { center: [0, 23, 36], size: [21, 22, 22] },
    ],
  };
}

/** 帆布自身带磨损、破洞和不规则长条边缘，图片不是外部电影贴图。 */
function tornCanvas() {
  const w = 256,
    h = 256,
    data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = x / w,
        v = y / h,
        thread = Math.sin(x * 1.7) * Math.cos(y * 1.9);
      const ragged =
        0.03 + 0.14 * (0.5 + 0.5 * Math.sin(u * 61 + Math.sin(u * 143))) ** 3;
      let alpha = v > ragged ? 255 : 0;
      for (const [a, b, rx, ry] of [
        [0.21, 0.42, 0.035, 0.13],
        [0.67, 0.31, 0.052, 0.075],
        [0.83, 0.59, 0.025, 0.095],
        [0.44, 0.18, 0.048, 0.09],
        [0.35, 0.77, 0.017, 0.08],
      ]) {
        if (
          ((u - a) / rx) ** 2 + ((v - b) / ry) ** 2 <
          1 + 0.15 * Math.sin(u * 180 + v * 150)
        )
          alpha = 0;
      }
      const salt = 0.82 + 0.1 * Math.sin(x * 0.1 + y * 0.03) + thread * 0.02,
        stain = Math.max(0, Math.sin(u * 55 + v * 4)) * 0.13;
      const n = (y * w + x) * 4;
      data[n] = Math.round(190 * (salt - stain));
      data[n + 1] = Math.round(190 * salt);
      data[n + 2] = Math.round(164 * (salt - stain * 0.5));
      data[n + 3] = alpha;
    }
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}
