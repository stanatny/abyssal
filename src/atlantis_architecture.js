import * as THREE from "three";
import {
  GEOMETRIES,
  MergeBucket,
  atlantisMaterials,
  paintStone,
  loftGeometry,
} from "./atlantis_art_geometry.js";

import { pearlHabitat } from "./atlantis_pearl.js";

const templates = new Map();
const PALETTE = {
  stone: "#b4bab0",
  marble: "#d3d2bc",
  bronze: "#65867c",
  guideTeal: "#ffffff",
  lapisGlow: "#ffffff",
};

/**
 * 返回精雕建筑套件，共享几何与材质；碰撞体保持模型局部坐标。
 * @param {string} kind 建筑种类。
 * @returns {object} parts、colliders、width、depth、height，供城区实例化。
 */
export function cityArchitecture(kind) {
  if (kind === "pearl") return pearlHabitat();
  if (templates.has(kind)) return templates.get(kind);
  const b = new Builder(kind);
  if (kind === "courtyard") courtyard(b);
  else if (kind === "villa") villa(b);
  else if (kind === "ruins") ruins(b);
  else if (kind === "stoa") stoa(b);
  else if (kind === "rotunda") rotunda(b);
  else if (kind === "tower") tower(b);
  else if (kind === "gateway") gateway(b);
  else if (kind === "temple") temple(b);
  else if (kind === "obelisk") obelisk(b);
  else if (kind === "column") {
    b.width = b.depth = 3.6;
    b.height = 17;
    b.column(0, 0, 0, 17, 1.4);
  } else if (kind === "amphora") {
    b.width = b.depth = 1.4;
    b.height = 2.4;
    b.amphora(0, 0, 0);
  } else throw new Error(`Unknown city architecture: ${kind}`);
  const result = b.finish();
  templates.set(kind, result);
  return result;
}

class Builder {
  constructor(kind) {
    this.kind = kind;
    this.bucket = new MergeBucket();
    this.colliders = [];
    this.width = 24;
    this.depth = 20;
    this.height = 20;
    this.ordinal = 0;
  }
  add(geometry, mat, position, euler = null, tint = null) {
    paintStone(geometry, {
      base: tint || PALETTE[mat],
      algae: "#467967",
      algaeAmount: mat === "stone" ? 0.2 : 0.12,
      seed: 73 + this.ordinal++,
    });
    this.bucket.add(geometry, mat, {
      position,
      euler,
      tile: mat === "stone" ? 11 : 18,
    });
    geometry.dispose();
  }
  box(mat, w, h, d, x, y, z, solid = false, tint = null) {
    this.add(new THREE.BoxGeometry(w, h, d), mat, [x, y, z], null, tint);
    if (solid)
      this.colliders.push({
        type: "box",
        kind: "city_masonry",
        x,
        y,
        z,
        halfSize: { x: w / 2, y: h / 2, z: d / 2 },
      });
  }
  cylinder(mat, rt, rb, h, x, y, z, solid = false, segments = 24) {
    this.add(new THREE.CylinderGeometry(rt, rb, h, segments), mat, [x, y, z]);
    if (solid) {
      // 扁圆台不能用大胶囊，否则端帽会封住上方柱廊。薄条贴合实际圆柱边界。
      const r = Math.max(rt, rb),
        count = r > 3 ? 12 : 6,
        step = (2 * r) / count;
      for (let i = 0; i < count; i++) {
        const offset = -r + (i + 0.5) * step;
        const near = Math.max(0, Math.abs(offset) - step / 2);
        this.colliders.push({
          type: "box",
          kind: "city_cylinder",
          x: x + offset,
          y,
          z,
          halfSize: {
            x: step / 2,
            y: h / 2,
            z: Math.sqrt(r * r - near * near),
          },
        });
      }
    }
  }
  column(x, y, z, h, r = 1) {
    // 台基、圆础、带收分的凹槽柱身、双层柱头与卷涡细部。
    this.box("marble", r * 2.8, 0.6, r * 2.8, x, y + 0.3, z);
    this.cylinder("marble", r * 1.18, r * 1.32, 0.7, x, y + 0.85, z);
    const shaft = loftGeometry(
      null,
      [
        { y: 0, rx: r, rz: r, wave: 20, waveAmp: 0.07 },
        { y: h * 0.48, rx: r * 0.94, rz: r * 0.94, wave: 20, waveAmp: 0.07 },
        { y: h - 2.4, rx: r * 0.78, rz: r * 0.78, wave: 20, waveAmp: 0.07 },
      ],
      {
        radial: 24,
        // 柱身收分只有两段平滑曲线；至少八段轴向采样，长柱每约 2.5 米一段。
        subdivision: Math.max(0.4, 8 / (h - 2.4)),
        capStart: true,
        capEnd: true,
      },
    );
    this.add(shaft, "marble", [x, y + 1.2, z]);
    this.cylinder("marble", r * 1.35, r * 0.85, 0.65, x, y + h - 1, z);
    this.box("marble", r * 3.0, 0.65, r * 2.8, x, y + h - 0.35, z);
    this.colliders.push({
      type: "capsule",
      kind: "city_column",
      a: { x, y: y + 0.4, z },
      b: { x, y: y + h - 0.5, z },
      radius: r * 1.1,
    });
    for (const side of [-1, 1])
      this.add(new THREE.TorusGeometry(r * 0.43, r * 0.12, 6, 14), "marble", [
        x + side * r * 0.94,
        y + h - 0.72,
        z + r * 0.91,
      ]);
  }
  band(w, d, y, x = 0, z = 0) {
    this.box("marble", w + 0.9, 0.55, d + 0.9, x, y, z);
    this.box("bronze", w + 0.6, 0.17, d + 0.6, x, y + 0.42, z);
    // 齿饰与交替的三陇板；只在视觉层细分，碰撞不逐齿增加。
    for (let k = -w / 2 + 0.7; k < w / 2; k += 2.4) {
      this.box("marble", 0.5, 0.65, 0.65, x + k, y - 0.45, z + d / 2 + 0.1);
      this.box("marble", 0.5, 0.65, 0.65, x + k, y - 0.45, z - d / 2 - 0.1);
    }
  }
  portal(x, y, z, w, h, d = 1.4, mat = "marble") {
    const r = w / 2,
      spring = h - r;
    this.box(mat, 1.5, spring, d, x - r - 0.75, y + spring / 2, z, true);
    this.box(mat, 1.5, spring, d, x + r + 0.75, y + spring / 2, z, true);
    // 楔形拱石构成真实开口，无封住洞口的隐形整盒。
    for (let i = 0; i < 13; i++) {
      const a = ((i + 0.5) / 13) * Math.PI;
      const mid = r + 0.72;
      const px = x + Math.cos(a) * mid,
        py = y + spring + Math.sin(a) * mid;
      const geo = new THREE.BoxGeometry(1.52, ((Math.PI * mid) / 13) * 1.02, d);
      this.add(geo, mat, [px, py, z], [0, 0, a]);
      this.colliders.push({
        type: "box",
        kind: "city_arch",
        x: px,
        y: py,
        z,
        halfSize: { x: 1.52 / 2, y: (Math.PI * mid) / 13 / 2, z: d / 2 },
        rotation: { x: 0, y: 0, z: Math.sin(a / 2), w: Math.cos(a / 2) },
      });
    }
  }
  pediment(w, rise, d, y, z = 0) {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(0, rise);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: d,
      bevelEnabled: true,
      bevelThickness: 0.15,
      bevelSize: 0.18,
      bevelSegments: 1,
      steps: 1,
    });
    this.add(geo, "marble", [0, y, z - d / 2]);
    // 三角山墙分条贴合，不以整块矩形碰撞遮挡两侧天空。
    for (let i = 0; i < 16; i++) {
      const x = -w / 2 + ((i + 0.5) * w) / 16;
      const h = rise * (1 - Math.abs(x) / (w / 2));
      this.colliders.push({
        type: "box",
        kind: "city_pediment",
        x,
        y: y + h / 2,
        z,
        halfSize: { x: w / 32, y: h / 2, z: d / 2 },
      });
    }
    for (const sign of [-1, 1]) {
      const angle = sign * Math.atan2(rise, w / 2);
      this.add(
        new THREE.BoxGeometry(Math.hypot(w / 2, rise), 0.55, d + 0.6),
        "marble",
        [(sign * w) / 4, y + rise / 2, z],
        [0, 0, -angle],
      );
    }
    this.add(new THREE.TorusGeometry(rise * 0.23, 0.2, 6, 24), "bronze", [
      0,
      y + rise * 0.38,
      z + d / 2 + 0.3,
    ]);
  }
  pearlNiche(x, y, z, scale = 1) {
    for (const part of pearlHabitat({ detail: "niche" }).parts)
      this.bucket.add(part.geometry, part.key, {
        position: [x, y, z],
        scale: scale * 0.38,
      });
  }
  amphora(x, y, z) {
    const points = [
      [0, 0],
      [0.36, 0.1],
      [0.5, 0.3],
      [0.64, 0.85],
      [0.52, 1.4],
      [0.23, 1.62],
      [0.2, 1.9],
      [0.31, 2.0],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    this.add(
      new THREE.LatheGeometry(points, 18),
      "bronze",
      [x, y, z],
      null,
      "#9c816a",
    );
    for (const side of [-1, 1])
      this.add(
        new THREE.TorusGeometry(0.3, 0.07, 6, 14, Math.PI * 1.65),
        "bronze",
        [x + side * 0.45, y + 1.5, z],
        [0, (side * Math.PI) / 2, 0],
      );
  }
  stairs(w, z, y, steps = 5) {
    for (let i = 0; i < steps; i++)
      this.box("marble", w, 0.55, 1.15, 0, y + i * 0.52, z - i * 1.1, true);
  }
  finish() {
    const group = new THREE.Group(),
      owned = new Set();
    this.bucket.build(atlantisMaterials(), group, owned);
    const parts = group.children.map((mesh, i) => {
      const key = `city_kit_v2_${this.kind}_${i}`;
      GEOMETRIES.set(key, mesh.geometry);
      mesh.geometry.computeBoundingSphere();
      return { geometry: mesh.geometry, material: mesh.material };
    });
    return {
      kind: this.kind,
      parts,
      colliders: this.colliders,
      width: this.width,
      depth: this.depth,
      height: this.height,
    };
  }
}

function courtyard(b) {
  b.width = 25;
  b.depth = 24;
  b.height = 15;
  b.box("stone", 25, 1.4, 24, 0, 0.7, 0, true);
  b.box("stone", 25, 12, 1.8, 0, 7.4, -11.1, true);
  for (const x of [-11.6, 11.6]) {
    b.box("stone", 1.8, 11.5, 24, x, 7.15, 0, true);
    b.band(2.2, 24, 13.3, x);
  }
  for (const x of [-8.5, 8.5]) b.box("stone", 8, 10, 1.8, x, 6.4, 11.1, true);
  b.portal(0, 1.4, 11.5, 7, 10, 1.5);
  b.band(25, 24, 13.7);
  for (const x of [-8, 8]) for (const z of [-6, 6]) b.column(x, 1.4, z, 9, 0.6);
  for (const z of [-10, 10]) b.box("marble", 22, 0.4, 3, 0, 11.2, z);
  b.box("bronze", 11, 0.1, 10, 0, 1.45, 0, false, "#5e9691");
  for (const x of [-6.5, 6.5]) {
    b.box("lapisGlow", 1.3, 3.6, 0.15, x, 7, -10.15);
    b.amphora(x, 1.4, 6);
  }
  b.pearlNiche(-9, 1.4, 11);
  b.pearlNiche(9, 1.4, 11);
}
function villa(b) {
  b.width = 26;
  b.depth = 23;
  b.height = 21;
  b.box("stone", 26, 1.7, 23, 0, 0.85, 0, true);
  for (const x of [-11, 11]) b.box("stone", 2, 13, 20, x, 8.2, -1, true);
  b.box("stone", 24, 13, 2, 0, 8.2, -10.5, true);
  for (const x of [-9, -3, 3, 9]) b.column(x, 1.7, 9, 13, 0.75);
  b.box("marble", 25, 1.3, 2.5, 0, 15.35, 9, true);
  b.pediment(27, 5, 2.2, 16, 9);
  b.band(25, 22, 15.9);
  b.box("stone", 25, 1.1, 14, 0, 15, -3.5, true);
  for (const x of [-7, 7]) {
    b.box("bronze", 3.6, 5, 0.2, x, 8, -9.35, false, "#365760");
    b.box("marble", 4.4, 0.6, 0.9, x, 5.3, -9.1);
  }
  b.stairs(12, 14, 0.3, 3);
  b.amphora(-8, 1.7, 5);
  b.amphora(9, 1.7, -4);
}
function stoa(b) {
  b.width = 43;
  b.depth = 22;
  b.height = 24;
  b.box("stone", 43, 2, 22, 0, 1, 0, true);
  b.box("stone", 43, 18, 2, 0, 11, -10, true);
  for (const x of [-19, -11.4, -3.8, 3.8, 11.4, 19]) b.column(x, 2, 8.8, 18, 1);
  for (const x of [-20, 20]) b.box("stone", 2, 15, 15, x, 9.5, -1, true);
  b.box("marble", 43, 1.6, 3.2, 0, 20.8, 8.8, true);
  b.band(44, 23, 22.2);
  b.box("stone", 43, 1.2, 19, 0, 21.1, -1, true);
  for (const x of [-15, -5, 5, 15]) {
    b.portal(x, 3, -8.8, 5, 10, 0.5);
    b.box("lapisGlow", 3, 6, 0.12, x, 6.5, -8.85);
  }
  for (const x of [-19, 19]) b.pearlNiche(x, 2, 9, 1.3);
  for (const x of [-14, -7, 7, 14]) b.amphora(x, 2, -3);
}
function rotunda(b) {
  b.width = b.depth = 32;
  b.height = 34;
  b.cylinder("stone", 16, 17, 2, 0, 1, 0, true, 48);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    b.column(Math.sin(a) * 13, 2, Math.cos(a) * 13, 20, 1);
  }
  b.cylinder("marble", 15.7, 15.7, 1.8, 0, 23, 0, false, 48);
  const dome = new THREE.SphereGeometry(
    15.5,
    40,
    14,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  );
  dome.scale(1, 0.62, 1);
  b.add(dome, "bronze", [0, 24, 0], null, "#61938b");
  for (let i = 0; i < 5; i++) {
    const angle = (((i + 1) / 6) * Math.PI) / 2;
    const radius = 15.6 * Math.sin(angle);
    b.add(
      new THREE.TorusGeometry(radius, 0.14, 5, 48),
      "bronze",
      [0, 24 + 9.65 * Math.cos(angle), 0],
      [Math.PI / 2, 0, 0],
      "#b6ab82",
    );
  }
  b.add(new THREE.IcosahedronGeometry(1.25, 1), "lapisGlow", [0, 34, 0]);
  // 通透环廊与中央圣龛分开；穹顶使用实际椭球上半部的分段盒近似。
  b.cylinder("stone", 5.5, 5.5, 14, 0, 9, 0, true, 24);
  // 顺穹顶表面铺薄碰撞片，保留柱廊内的净空。
  for (let row = 0; row < 5; row++)
    for (let j = 0; j < 16; j++) {
      const p0 = (row * Math.PI) / 10,
        p1 = ((row + 1) * Math.PI) / 10;
      const a0 = (j * Math.PI) / 8,
        a1 = ((j + 1) * Math.PI) / 8;
      const point = (p, a) =>
        new THREE.Vector3(
          15.5 * Math.sin(p) * Math.cos(a),
          24 + 9.61 * Math.cos(p),
          15.5 * Math.sin(p) * Math.sin(a),
        );
      const vertices = [
        point(p0, a0),
        point(p0, a1),
        point(p1, a0),
        point(p1, a1),
      ];
      const center = vertices
        .reduce((v, p) => v.add(p), new THREE.Vector3())
        .multiplyScalar(0.25);
      const normal = new THREE.Vector3(
        center.x / 15.5 ** 2,
        (center.y - 24) / 9.61 ** 2,
        center.z / 15.5 ** 2,
      ).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        normal,
      );
      const inverse = q.clone().invert();
      const local = vertices.map((p) =>
        p.clone().sub(center).applyQuaternion(inverse),
      );
      b.colliders.push({
        type: "box",
        kind: "city_dome",
        x: center.x,
        y: center.y,
        z: center.z,
        halfSize: {
          x: Math.max(...local.map((p) => Math.abs(p.x))) + 0.08,
          y: 0.35 + Math.max(...local.map((p) => Math.abs(p.y))),
          z: Math.max(...local.map((p) => Math.abs(p.z))) + 0.08,
        },
        rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
      });
    }
}
function tower(b) {
  b.width = b.depth = 17;
  b.height = 43;
  b.box("stone", 17, 2, 17, 0, 1, 0, true);
  b.box("stone", 13, 30, 13, 0, 17, 0, true);
  for (const y of [8, 19, 31]) b.band(14, 14, y);
  for (const x of [-6.7, 6.7])
    for (const z of [-6.7, 6.7]) b.box("marble", 1.3, 31, 1.3, x, 17.5, z);
  for (const y of [13, 25])
    for (const x of [-3.7, 3.7]) {
      b.box("bronze", 2.2, 4, 0.2, x, y, 6.6, false, "#253a3d");
      b.portal(x, y - 2, 6.75, 2.1, 4, 0.45);
    }
  for (const x of [-6, 6]) for (const z of [-6, 6]) b.column(x, 32, z, 8, 0.7);
  b.box("marble", 16, 1.2, 16, 0, 40.6, 0, true);
  b.band(16, 16, 41.4);
  b.pearlNiche(0, 40.6, 0, 0.9);
}
function gateway(b) {
  b.width = 62;
  b.depth = 16;
  b.height = 49;
  for (const x of [-25, 25]) {
    b.box("stone", 13, 39, 15, x, 19.5, 0, true);
    b.band(15, 17, 39, x);
    b.band(14, 16, 6, x);
    for (const side of [-1, 1]) b.column(x + side * 4.7, 1, 8.2, 31, 1.1);
    b.pearlNiche(x, 40, 0, 1.6);
  }
  b.portal(0, 0, 0, 35, 44, 6);
  b.box("marble", 61, 3, 16, 0, 45, 0, true);
  b.pediment(63, 8, 4, 47, 0);
  for (const x of [-22, 22])
    b.box("bronze", 7, 8, 0.3, x, 28, 7.7, false, "#5c968e");
}
function temple(b) {
  b.width = 100;
  b.depth = 71;
  b.height = 60;
  b.box("stone", 100, 3, 71, 0, 1.5, 0, true);
  b.box("marble", 95, 1.2, 67, 0, 3.6, 0, true);
  for (const z of [-29, 29])
    for (const x of [-42, -30, -18, -6, 6, 18, 30, 42])
      b.column(x, 4.2, z, 38, 1.9);
  for (const x of [-42, 42])
    for (const z of [-15, 0, 15]) b.column(x, 4.2, z, 38, 1.9);
  for (const z of [-29, 29]) b.box("marble", 96, 3.4, 5, 0, 44, z, true);
  for (const x of [-43, 43]) b.box("marble", 5, 3.4, 62, x, 44, 0, true);
  b.band(97, 66, 47);
  b.pediment(100, 14, 5, 48, 30);
  b.pediment(100, 14, 5, 48, -30);
  // 破损屋顶保留两翼，中央露天让巨像与深海光柱透出。
  for (const x of [-31, 31]) b.box("stone", 25, 2.2, 60, x, 47.5, 0, true);
  for (const x of [-19, 19]) b.box("stone", 2.2, 22, 32, x, 15.2, -3, true);
  b.box("stone", 38, 22, 2, 0, 15.2, -19, true);
  b.portal(0, 4.2, 14, 22, 23, 2.7);
  for (const x of [-33, 33])
    for (const z of [-24, 24]) b.pearlNiche(x, 4.2, z, 2);
  for (let x = -43; x <= 43; x += 5) {
    b.box("bronze", 1.7, 2, 0.4, x, 44.5, 31.6);
    b.box("bronze", 1.7, 2, 0.4, x, 44.5, -31.6);
  }
  b.stairs(69, 43, 0.35, 7);
}
function obelisk(b) {
  b.width = b.depth = 9;
  b.height = 38;
  b.box("stone", 9, 2.2, 9, 0, 1.1, 0, true);
  b.box("marble", 7, 2, 7, 0, 3.2, 0, true);
  b.add(
    new THREE.CylinderGeometry(1.3, 2.5, 30, 4, 1, false, Math.PI / 4),
    "marble",
    [0, 19, 0],
  );
  b.colliders.push({
    type: "box",
    kind: "city_obelisk",
    x: 0,
    y: 19,
    z: 0,
    halfSize: { x: 2.6, y: 15, z: 2.6 },
  });
  b.add(
    new THREE.ConeGeometry(1.9, 4, 4),
    "bronze",
    [0, 36, 0],
    [0, Math.PI / 4, 0],
  );
  for (const y of [8, 13, 18, 23, 28])
    for (const side of [-1, 1])
      b.box(
        "guideTeal",
        0.7,
        1.4,
        0.15,
        0,
        y,
        side * (2.5 - ((y - 4) / 30) * 1.2),
      );
}

function ruins(b) {
  b.width = 29;
  b.depth = 24;
  b.height = 16;
  b.box("stone", 29, 1.1, 24, 0, 0.55, 0, true);
  // 残墙按断面起伏落到台基上，不以几块漂浮碎片代替完整受损建筑。
  for (let i = 0; i < 7; i++) {
    const x = -12 + i * 4,
      h = [8, 12, 15, 6, 9, 4, 7][i];
    b.box("stone", 3.95, h, 1.7, x, 1.1 + h / 2, -10.8, true);
    if (i < 3) b.box("marble", 3.95, 0.55, 2.1, x, 1.1 + h, -10.8);
  }
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const z = -7 + i * 5,
        h = side < 0 ? 10 - i * 2 : 4 + i;
      b.box("stone", 1.7, h, 4.9, side * 13.5, 1.1 + h / 2, z, true);
    }
  for (const [x, h] of [
    [-10, 12],
    [0, 5],
    [10, 8],
  ]) {
    b.cylinder("marble", 0.9, 1.15, h, x, 1.1 + h / 2, 9, true);
    b.box("marble", 2.8, 0.45, 2.8, x, 1.3, 9);
  }
  b.add(
    new THREE.CylinderGeometry(0.9, 1.1, 8, 20),
    "marble",
    [-5, 2.6, 2],
    [0, 0, Math.PI / 2 - 0.12],
  );
  b.colliders.push({
    type: "capsule",
    kind: "city_fallen_column",
    a: { x: -9, y: 2.1, z: 2 },
    b: { x: -1, y: 3.1, z: 2 },
    radius: 1.1,
  });
  b.box("bronze", 8, 0.1, 7, 5, 1.15, -3, false, "#678782");
  b.amphora(9, 1.1, 6);
}
