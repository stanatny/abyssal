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
  b.add(new THREE.CylinderGeometry(42, 45, 2, 64), sand, [0, 1, 0]);
  colliders.push({
    type: "box",
    id: "refuge_plinth",
    x: origin.x,
    y: origin.y + 1,
    z: origin.z,
    halfSize: new THREE.Vector3(37, 1, 30),
  });
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
  b.add(new THREE.LatheGeometry(outline, 64), gold, [0, 0, -5]);
  colliders.push({
    type: "ellipsoid",
    id: "pineapple_house",
    x: 0,
    y: origin.y + 14,
    z: origin.z - 5,
    axes: new THREE.Vector3(10.5, 12.5, 10.5),
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
        b.beam(ridge, corners[i], corners[(i + 1) % 4], 0.09, 5);
    }
  for (let i = 0; i < 11; i++) {
    const angle = (i / 11) * Math.PI * 2;
    b.add(
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
  b.box(blue, [0, 6, 5.4], [4.7, 8, 0.7]);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    b.add(new THREE.SphereGeometry(0.11, 8, 6), ridge, [
      Math.cos(a) * 2.0,
      6 + Math.sin(a) * 3.4,
      5.85,
    ]);
  }
  for (const side of [-1, 1]) {
    b.add(
      new THREE.TorusGeometry(1.5, 0.23, 8, 32),
      blue,
      [side * 4.3, 16, 4.7],
      [0, side * 0.35, 0],
    );
    b.add(
      new THREE.CircleGeometry(1.32, 32),
      warm,
      [side * 4.3, 16, 4.72],
      [0, side * 0.35, 0],
    );
  }
  for (let i = 0; i < 6; i++) b.box(sand, [0, 1.4, 8 + i * 3], [5, 0.5, 2]);
  // 两侧天然石拱像海底裂隙，作为彩蛋广场边界，而非平面背景板。
  for (const side of [-1, 1]) {
    const points = Array.from({ length: 17 }, (_, i) => {
      const a = (i / 16) * Math.PI;
      return new THREE.Vector3(
        side * 30,
        2 + Math.sin(a) * 16,
        4 + Math.cos(a) * 17,
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
  b.finish();
  const sponge = new THREE.Group();
  sponge.name = "yellow_sponge_easter_egg";
  sponge.position.set(9, 2.1, 15);
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
  sponge.scale.setScalar(1.6);
  return {
    root,
    colliders,
    landmarks: [
      {
        id: "mariana_refuge",
        position: origin.clone().add(new THREE.Vector3(0, 20, 25)),
      },
    ],
    lightSources: [
      {
        position: origin.clone().add(new THREE.Vector3(0, 30, 20)),
        color: 0xffda9c,
        intensity: 180,
        distance: 150,
      },
    ],
    update(t, p) {
      root.visible = p.y < -2400;
      arm.rotation.z = Math.sin(t * 2) * 0.15;
    },
  };
}
