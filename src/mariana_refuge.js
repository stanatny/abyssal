import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createBermudaBuilder as baseBuilder } from "./bermuda_geometry.js";
import { sculptedFin } from "./creature_surface.js";

function createBermudaBuilder(...args) {
  const builder = baseBuilder(...args),
    add = builder.add;
  builder.add = (g, ...rest) => {
    // 多面体与倒角箱默认不带索引，统一索引后才能与旋转曲面合批。
    if (!g.index)
      g.setIndex(
        Array.from({ length: g.attributes.position.count }, (_, i) => i),
      );
    return add(g, ...rest);
  };
  return builder;
}

/** 原创程序化彩蛋：暖色菠萝屋与招手的黄色海绵，所有陈设拥有真实支撑与独立接触。 */
export function createMarianaRefuge(parent, { keep, heightAt }) {
  const root = new THREE.Group();
  root.name = "mariana_bottom_refuge";
  parent.add(root);
  const origin = new THREE.Vector3(0, heightAt(0, -460), -460);
  root.position.copy(origin);
  const b = createBermudaBuilder(root, keep, origin),
    colliders = b.colliders;
  const m = (name, color, emissive = 0) => {
    const material = keep(
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.72,
        emissive: color,
        emissiveIntensity: emissive,
      }),
    );
    material.name = name;
    return material;
  };
  const gold = m("pineapple_ochre", 0xd59643),
    ridge = m("pineapple_scales", 0xecd078),
    green = m("leaf_green", 0x577e64),
    sand = m("refuge_sand", 0xaaa698),
    blue = m("door_ocean_blue", 0x558893),
    dark = m("deep_recesses", 0x45475b),
    warm = m("warm_windows", 0xf6d99a, 1.2);
  b.box(sand, [0, 0, 10], [160, 12, 170], true);
  colliders[0].id = "refuge_plinth";
  b.box(sand, [-52, 7.5, -19.5], [28, 3, 28], true);
  const pineapple = new THREE.Group();
  pineapple.name = "refuge_pineapple_house";
  pineapple.position.set(-52, 6, -12);
  pineapple.scale.setScalar(1.5);
  root.add(pineapple);
  const pb = createBermudaBuilder(pineapple, keep);
  // 旋转曲面定义果壳，外侧菱形棱纹顺着同一曲面附着。
  const outline = [
    new THREE.Vector2(0, 2),
    new THREE.Vector2(7.5, 2),
    new THREE.Vector2(10, 7),
    new THREE.Vector2(10.5, 14),
    new THREE.Vector2(8.5, 22),
    new THREE.Vector2(4.5, 26),
    new THREE.Vector2(0, 26),
  ];
  pb.add(new THREE.LatheGeometry(outline, 64), gold, [0, 0, -5]);
  colliders.push({
    type: "ellipsoid",
    id: "pineapple_house",
    x: -52,
    y: origin.y + 27,
    z: origin.z - 19.5,
    axes: new THREE.Vector3(15.75, 18.75, 15.75),
  });
  function shellPoint(y, theta) {
    const r =
      y < 7
        ? 7.5 + (y - 2) * 0.5
        : y < 14
          ? 10 + ((y - 7) * 0.5) / 7
          : y < 22
            ? 10.5 - (y - 14) * 0.25
            : 8.5 - (y - 22);
    return [Math.cos(theta) * (r + 0.09), y, Math.sin(theta) * (r + 0.09) - 5];
  }
  for (let row = 0; row < 8; row++)
    for (let j = 0; j < 16; j++) {
      const y = 3.5 + row * 2.6,
        theta = ((j + (row % 2) * 0.5) / 16) * Math.PI * 2;
      const corners = [
        shellPoint(y - 1.25, theta),
        shellPoint(y, theta + 0.18),
        shellPoint(y + 1.25, theta),
        shellPoint(y, theta - 0.18),
      ];
      for (let i = 0; i < 4; i++)
        pb.beam(ridge, corners[i], corners[(i + 1) % 4], 0.09, 5);
    }
  for (let i = 0; i < 11; i++) {
    const angle = (i / 11) * Math.PI * 2;
    pb.add(
      sculptedFin(
        [
          [0, 0],
          [3, 1.2],
          [9, 1.5],
          [13, 0.2],
          [7, -0.8],
          [2, -0.7],
        ],
        0.13,
        "vertical",
      ),
      green,
      [0, 25, -5],
      [-0.85, angle, 0],
    );
  }
  // 面向入口的蓝色船舱门、铆钉边缘与温暖圆窗。
  pb.box(blue, [0, 6, 3.875], [4.7, 8, 3.75]);
  colliders.push({
    type: "box",
    id: "refuge_pineapple_door",
    x: -52,
    y: origin.y + 15,
    z: origin.z - 6.1875,
    halfSize: new THREE.Vector3(3.525, 6, 2.8125),
  });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    pb.add(new THREE.SphereGeometry(0.11, 8, 6), ridge, [
      Math.cos(a) * 2.0,
      6 + Math.sin(a) * 3.4,
      5.85,
    ]);
  }
  for (const side of [-1, 1]) {
    pb.add(
      new THREE.CylinderGeometry(1.5, 1.5, 2, 24),
      blue,
      [side * 4.3, 16, 3.9],
      [Math.PI / 2, side * 0.35, 0],
    );
    pb.add(
      new THREE.TorusGeometry(1.5, 0.23, 8, 32),
      blue,
      [side * 4.3, 16, 4.7],
      [0, side * 0.35, 0],
    );
    pb.add(
      new THREE.CircleGeometry(1.32, 32),
      warm,
      [side * 4.3, 16, 4.72],
      [0, side * 0.35, 0],
    );
  }
  for (let i = 0; i < 6; i++) {
    const height = 2 - i * 0.28;
    pb.box(sand, [0, height / 2, 8 + i * 3], [5, height, 2]);
  }
  pb.finish();
  // 两侧天然石拱像海底裂隙，作为彩蛋广场边界，而非平面背景板。
  for (const side of [-1, 1]) {
    const points = Array.from({ length: 17 }, (_, i) => {
      const a = (i / 16) * Math.PI;
      return new THREE.Vector3(
        side * 75,
        6 + Math.sin(a) * 25,
        12 + Math.cos(a) * 26,
      );
    });
    const curve = new THREE.CatmullRomCurve3(points);
    b.add(new THREE.TubeGeometry(curve, 48, 3.7, 9, false), sand);
    for (let i = 0; i < points.length - 1; i++)
      colliders.push({
        type: "capsule",
        id: `refuge_arch_${side}_${i}`,
        a: points[i].clone().add(origin),
        b: points[i + 1].clone().add(origin),
        radius: 3.7,
      });
  }
  addNeighborhood(b, colliders, origin, {
    sand,
    blue,
    dark,
    warm,
    ridge,
    green,
  });
  b.finish();
  const sponge = new THREE.Group();
  sponge.name = "yellow_sponge_easter_egg";
  sponge.position.set(-48, 6.08, 30);
  root.add(sponge);
  const sb = createBermudaBuilder(sponge, keep);
  const yellow = m("sponge_gold", 0xf3dc53),
    pores = m("sponge_pores", 0xb19940),
    white = m("cotton_white", 0xf4eee0),
    brown = m("square_shorts", 0x8d5c43),
    black = m("shoe_black", 0x17212d),
    iris = m("iris_blue", 0x4aa9cb),
    red = m("tie_coral", 0xcf655d);
  sb.add(new RoundedBoxGeometry(2.2, 2.4, 0.82, 4, 0.17), yellow, [0, 2.7, 0]);
  for (const [x, y, r] of [
    [-0.84, 3.55, 0.15],
    [0.83, 3.5, 0.14],
    [-0.91, 2.6, 0.18],
    [0.83, 2.3, 0.14],
    [-0.65, 1.85, 0.12],
    [0.59, 3.78, 0.11],
  ])
    sb.add(new THREE.SphereGeometry(r, 12, 8), pores, [x, y, 0.36]);
  sb.box(white, [0, 1.37, 0], [2.12, 0.35, 0.79]);
  sb.add(new RoundedBoxGeometry(2.1, 0.65, 0.84, 3, 0.07), brown, [0, 0.94, 0]);
  for (const side of [-1, 1]) {
    sb.beam(
      yellow,
      [side * 0.56, 0.66, 0],
      [side * 0.56, 0.22, 0.02],
      0.09,
      10,
    );
    sb.box(white, [side * 0.56, 0.24, 0.02], [0.19, 0.3, 0.2]);
    sb.add(new RoundedBoxGeometry(0.52, 0.25, 0.5, 3, 0.07), black, [
      side * 0.65,
      0.1,
      0.1,
    ]);
    sb.add(new THREE.SphereGeometry(0.49, 24, 16), white, [
      side * 0.43,
      3.02,
      0.45,
    ]);
    sb.add(new THREE.SphereGeometry(0.23, 20, 12), iris, [
      side * 0.43,
      3.02,
      0.87,
    ]);
    sb.add(new THREE.SphereGeometry(0.11, 16, 12), black, [
      side * 0.43,
      3.02,
      1.04,
    ]);
    sb.add(new THREE.SphereGeometry(0.047, 12, 8), white, [
      side * 0.4,
      3.09,
      1.12,
    ]);
    for (let i = 0; i < 3; i++)
      sb.beam(
        black,
        [side * 0.43 + (i - 1) * 0.23, 3.4, 0.51],
        [side * 0.43 + (i - 1) * 0.29, 3.66, 0.53],
        0.026,
        6,
      );
    sb.box(white, [side * 0.15, 2.07, 0.53], [0.23, 0.34, 0.15]);
  }
  sb.add(
    new THREE.CapsuleGeometry(0.12, 0.36, 4, 12),
    yellow,
    [0, 2.64, 0.74],
    [Math.PI / 2, 0, 0],
  );
  sb.add(
    new THREE.TorusGeometry(0.51, 0.027, 6, 32, Math.PI * 0.8),
    brown,
    [0, 2.31, 0.45],
    [0, 0, Math.PI * 1.1],
  );
  sb.add(new THREE.OctahedronGeometry(0.19), red, [0, 1.23, 0.5], [0, 0, 0.3]);
  sb.beam(yellow, [-1.06, 2.52, 0], [-1.38, 1.9, 0.2], 0.075, 8);
  sb.finish();
  const arm = new THREE.Group();
  arm.position.set(1.06, 2.55, 0);
  sponge.add(arm);
  const ab = createBermudaBuilder(arm, keep);
  ab.beam(yellow, [0, 0, 0], [0.46, 0.65, 0.12], 0.07, 8);
  for (let i = 0; i < 4; i++)
    ab.beam(
      yellow,
      [0.46, 0.65, 0.12],
      [0.3 + i * 0.11, 0.93 + Math.sin(i) * 0.1, 0.12],
      0.035,
      6,
    );
  ab.finish();
  sponge.scale.setScalar(2.5);
  colliders.push({
    type: "ellipsoid",
    id: "refuge_sponge",
    x: -48,
    y: origin.y + 11.1,
    z: origin.z + 30,
    axes: new THREE.Vector3(4, 5.1, 3),
  });
  const residents = addResidents(root, keep, m, origin, colliders);
  return {
    root,
    colliders,
    landmarks: [
      {
        id: "mariana_refuge",
        position: origin.clone().add(new THREE.Vector3(0, 20, 25)),
      },
    ],
    supportRecords: [
      {
        id: "refuge_plaza",
        meshRoot: root,
        center: origin.clone().add(new THREE.Vector3(0, 6, 10)),
        halfSize: [80, 85],
      },
    ],
    lightSources: [
      {
        position: origin.clone().add(new THREE.Vector3(-48, 42, 5)),
        color: 0xffda9c,
        intensity: 230,
        distance: 190,
      },
      {
        position: origin.clone().add(new THREE.Vector3(52, 28, 65)),
        color: 0xffe4b9,
        intensity: 200,
        distance: 180,
      },
      {
        position: origin.clone().add(new THREE.Vector3(0, 35, 10)),
        color: 0xc0f1d9,
        intensity: 150,
        distance: 180,
      },
    ],
    update(t, p) {
      root.visible = p.y < -2400;
      arm.rotation.z = Math.sin(t * 1.4) * 0.12;
      residents.update(t);
    },
  };
}

/** 街区建筑沿广场两侧布置，中央航道保留给成年体型与最终抵达判定。 */
function addNeighborhood(b, colliders, origin, p) {
  const { sand, blue, dark, warm, ridge, green } = p;
  // 石像屋有连续脸部体积，眉骨、双眼与鼻梁均贴合实体正面。
  b.add(new RoundedBoxGeometry(24, 35, 23, 3, 3), blue, [54, 23.5, -20]);
  b.box(blue, [54, 8, -20], [29, 4, 27], true);
  colliders.push({
    type: "box",
    id: "refuge_stone_face_house",
    x: 54,
    y: origin.y + 23.5,
    z: origin.z - 20,
    halfSize: new THREE.Vector3(12, 17.5, 11.5),
  });
  b.add(new RoundedBoxGeometry(11, 5, 6, 3, 1), blue, [54, 34, -6.9]);
  b.add(new RoundedBoxGeometry(5, 16, 6, 3, 1.6), blue, [54, 25, -5]);
  for (const side of [-1, 1]) {
    b.add(new THREE.SphereGeometry(3.1, 20, 12), dark, [
      54 + side * 5.9,
      30,
      -8.9,
    ]);
    b.add(new THREE.CircleGeometry(2.4, 24), warm, [54 + side * 5.9, 30, -5.8]);
    b.add(new THREE.TorusGeometry(2.7, 0.3, 8, 24), ridge, [
      54 + side * 5.9,
      30,
      -5.65,
    ]);
  }
  for (const [id, center, size] of [
    ["nose", [54, 25, -5], [5, 16, 6]],
    ["brow", [54, 34, -6.9], [11, 5, 6]],
  ])
    colliders.push({
      type: "box",
      id: `refuge_stone_${id}`,
      x: center[0],
      y: origin.y + center[1],
      z: origin.z + center[2],
      halfSize: new THREE.Vector3(...size).multiplyScalar(0.5),
    });
  for (const side of [-1, 1])
    colliders.push({
      type: "box",
      id: `refuge_stone_eye_${side}`,
      x: 54 + side * 5.9,
      y: origin.y + 30,
      z: origin.z - 8.9,
      halfSize: new THREE.Vector3(3.1, 3.1, 3.7),
    });
  b.add(new RoundedBoxGeometry(7, 10, 1, 3, 1), dark, [54, 11.1, -7.9]);
  b.add(new THREE.SphereGeometry(0.4, 12, 8), ridge, [56, 11, -7.1]);
  // 派大星的岩屋与屋前散落贝壳，实际半球壳保留圆润轮廓。
  b.add(
    new THREE.SphereGeometry(17, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    sand,
    [-53, 6, -57],
  );
  colliders.push({
    type: "ellipsoid",
    id: "refuge_rock_house",
    x: -53,
    y: origin.y + 6,
    z: origin.z - 57,
    axes: new THREE.Vector3(17, 17, 17),
  });
  b.add(new THREE.TorusGeometry(2.4, 0.28, 8, 24), ridge, [-53, 10, -40.5]);
  b.add(new THREE.CircleGeometry(2.1, 24), dark, [-53, 10, -40.6]);
  // 木肋桶形餐馆，侧面圆窗、双门、檐口、烟囱与招牌具有真实厚度。
  b.box(blue, [52, 8, 64], [40, 4, 34], true);
  b.box(green, [52, 16, 64], [38, 16, 32]);
  b.add(
    new THREE.CylinderGeometry(16, 16, 38, 32, 1, false, 0, Math.PI),
    sand,
    [52, 24, 64],
    [0, 0, Math.PI / 2],
  );
  colliders.push({
    type: "box",
    id: "refuge_restaurant",
    x: 52,
    y: origin.y + 24,
    z: origin.z + 64,
    halfSize: new THREE.Vector3(20, 18, 17),
  });
  for (let x = 35; x <= 69; x += 4.25) {
    const points = Array.from({ length: 17 }, (_, i) => [
      x,
      24 + Math.sin((i * Math.PI) / 16) * 16,
      64 + Math.cos((i * Math.PI) / 16) * 16,
    ]);
    for (let i = 0; i < 16; i++)
      b.beam(ridge, points[i], points[i + 1], 0.32, 6);
  }
  b.box(ridge, [52, 24, 47.6], [40, 1, 1]);
  for (const dx of [-11, 11]) {
    b.add(
      new THREE.TorusGeometry(3, 0.3, 8, 24),
      ridge,
      [52 + dx, 17, 47.4],
      [0, Math.PI, 0],
    );
    b.add(
      new THREE.CircleGeometry(2.7, 24),
      warm,
      [52 + dx, 17, 47.3],
      [0, Math.PI, 0],
    );
  }
  b.box(dark, [52, 14, 47.3], [9, 12, 1]);
  for (const dx of [-2.2, 2.2])
    b.box(blue, [52 + dx, 14, 46.6], [3.7, 10, 0.3]);
  b.box(ridge, [52, 27, 46.8], [21, 5, 1]);
  b.add(new THREE.SphereGeometry(1.7, 16, 10), warm, [52, 27, 45.9]);
  for (const side of [-1, 1]) {
    b.beam(
      warm,
      [52 + side * 1.3, 27, 45.9],
      [52 + side * 4, 28.7, 45.9],
      0.32,
      8,
    );
    b.add(
      new THREE.TorusGeometry(1.2, 0.35, 8, 16, Math.PI * 1.6),
      warm,
      [52 + side * 4, 29, 45.9],
      [0, 0, side * 0.5],
    );
  }
  b.box(dark, [65, 36, 66], [3, 12, 3]);
  // 房屋前的小路、路灯和花簇都在支撑平台上；中央45米航道无竖向障碍。
  for (const x of [-52, 54])
    for (let z = -38; z <= 38; z += 7) b.box(ridge, [x, 6.1, z], [7, 0.2, 5]);
  for (const [x, z] of [
    [-73, 32],
    [75, 20],
    [-73, -56],
    [75, 82],
  ]) {
    b.box(blue, [x, 6.5, z], [3, 1, 3]);
    b.beam(dark, [x, 7, z], [x, 21, z], 0.25, 8);
    b.add(new THREE.SphereGeometry(1.6, 16, 10), warm, [x, 21, z]);
    for (let j = 0; j < 5; j++) {
      const a = (j * Math.PI * 2) / 5;
      b.beam(
        green,
        [x + (x > 0 ? -5 : 5), 6, z + 5],
        [
          x + (x > 0 ? -5 : 5) + Math.cos(a) * 2,
          9 + Math.sin(j),
          z + 5 + Math.sin(a) * 2,
        ],
        0.23,
        6,
      );
      b.add(new THREE.SphereGeometry(0.6, 10, 8), ridge, [
        x + (x > 0 ? -5 : 5) + Math.cos(a) * 2,
        9 + Math.sin(j),
        z + 5 + Math.sin(a) * 2,
      ]);
    }
  }
}

/** 角色与贝壳均用圆润连续曲面，眼柄与四肢有真实连接和独立的温和动作。 */
function addResidents(root, keep, m, origin, colliders) {
  const pink = m("starfish_coral", 0xe5a799),
    purple = m("snail_shell_lilac", 0xaa8bac),
    lime = m("starfish_shorts_lime", 0x9fb96e),
    eye = m("resident_cream", 0xfff2d4),
    dark = m("resident_ink", 0x283843),
    aqua = m("snail_mint", 0x82c2bc);
  const star = new THREE.Group();
  star.name = "refuge_starfish_resident";
  star.position.set(-74, 6.2, -25);
  root.add(star);
  const sb = createBermudaBuilder(star, keep);
  sb.add(
    new THREE.SphereGeometry(1, 28, 18).scale(2.6, 3.7, 1.9),
    pink,
    [0, 5.1, 0],
  );
  sb.add(
    new THREE.CapsuleGeometry(1.25, 3, 6, 16).scale(1, 1, 0.86),
    pink,
    [0, 9, 0],
  );
  const limbs = [];
  for (const side of [-1, 1]) {
    sb.add(
      new THREE.CapsuleGeometry(0.95, 2.3, 6, 16),
      pink,
      [side * 1.2, 1.9, 0],
      [0, 0, side * 0.15],
    );
    const arm = new THREE.Group();
    arm.position.set(side * 2.05, 6, 0);
    star.add(arm);
    const ab = createBermudaBuilder(arm, keep);
    ab.add(
      new THREE.CapsuleGeometry(0.85, 2.8, 6, 16),
      pink,
      [side * 1.4, -0.65, 0],
      [0, 0, side * 1.12],
    );
    ab.finish();
    limbs.push({ arm, side });
    sb.add(new THREE.SphereGeometry(0.77, 20, 14).scale(0.85, 1.2, 0.8), eye, [
      side * 0.58,
      9.1,
      1.04,
    ]);
    sb.add(new THREE.SphereGeometry(0.25, 14, 10), dark, [
      side * 0.58,
      9.2,
      1.64,
    ]);
    sb.beam(dark, [side * 0.85, 10.2, 1], [side * 0.24, 10.35, 1.16], 0.09, 8);
  }
  sb.add(
    new THREE.SphereGeometry(1, 24, 16).scale(2.6, 1.5, 2),
    lime,
    [0, 3.3, 0],
  );
  for (const side of [-1, 1])
    sb.add(new THREE.SphereGeometry(0.38, 12, 8).scale(1, 0.55, 0.25), purple, [
      side * 1.35,
      3.5,
      1.83,
    ]);
  sb.add(
    new THREE.TorusGeometry(0.66, 0.08, 6, 24, Math.PI * 0.9),
    dark,
    [0, 7.8, 1.77],
    [0, 0, Math.PI * 1.05],
  );
  sb.add(new THREE.SphereGeometry(0.16, 12, 8), dark, [0, 5.1, 1.9]);
  sb.finish();
  const snail = new THREE.Group();
  snail.name = "refuge_snail_resident";
  snail.position.set(-33, 6.15, 32);
  root.add(snail);
  const nb = createBermudaBuilder(snail, keep);
  nb.add(
    new THREE.SphereGeometry(1, 24, 16).scale(4.6, 0.55, 2),
    aqua,
    [0, 0.4, 0],
  );
  nb.add(
    new THREE.SphereGeometry(1, 28, 20).scale(2.8, 3.2, 2.2),
    purple,
    [-0.65, 3, 0],
  );
  // 蜗壳两侧的盘旋纹贴合壳体表面，避免漂浮平面圆环。
  for (const side of [-1, 1]) {
    const pts = Array.from({ length: 49 }, (_, i) => {
      const t = i / 48,
        a = t * Math.PI * 4.8,
        r = 0.25 + t * 2.4,
        x = -0.65 + Math.cos(a) * r,
        y = 3 + Math.sin(a) * r;
      return new THREE.Vector3(
        x,
        y,
        side *
          2.2 *
          Math.sqrt(
            Math.max(0.01, 1 - ((x + 0.65) / 2.8) ** 2 - ((y - 3) / 3.2) ** 2),
          ),
      );
    });
    nb.add(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(pts),
        64,
        0.14,
        6,
        false,
      ),
      pink,
    );
    nb.beam(aqua, [2.5, 0.6, side * 0.6], [3.25, 5.4, side * 1.15], 0.3, 10);
    nb.add(new THREE.SphereGeometry(0.85, 20, 14), eye, [
      3.25,
      5.4,
      side * 1.15,
    ]);
    nb.add(new THREE.SphereGeometry(0.38, 16, 12), purple, [
      3.92,
      5.4,
      side * 1.15,
    ]);
    nb.add(new THREE.SphereGeometry(0.17, 12, 8), dark, [
      4.24,
      5.4,
      side * 1.15,
    ]);
  }
  nb.finish();
  for (const [id, c, axes] of [
    ["refuge_starfish", [-74, 6, -25], [4.6, 6, 2.7]],
    ["refuge_snail", [-33, 3.4, 32], [5, 3.4, 2.5]],
  ])
    colliders.push({
      type: "ellipsoid",
      id,
      x: c[0],
      y: origin.y + 6 + c[1],
      z: origin.z + c[2],
      axes: new THREE.Vector3(...axes),
    });
  return {
    update(t) {
      for (const { arm, side } of limbs)
        arm.rotation.z = side * Math.sin(t * 1.05) * 0.045;
      snail.rotation.y = Math.sin(t * 0.32) * 0.035;
    },
  };
}
