import * as THREE from "three";
import {
  MergeBucket,
  atlantisMaterials,
  cachedGeometry,
  paintStone,
} from "./atlantis_art_geometry.js";
import { pearlHabitat, PEARL_LIGHT_INTENSITY } from "./atlantis_pearl.js";

let SharedRitualMaterials = null;

/** 共享亚光青金石嵌片，弱自发光只帮助浮雕读图，不替代真实贝珠光源。 */
export function poseidonTempleMaterials() {
  if (!SharedRitualMaterials)
    SharedRitualMaterials = {
      ...atlantisMaterials(),
      ritualLapis: new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.84,
        metalness: 0.08,
        emissive: "#284f62",
        emissiveIntensity: 0.28,
      }),
    };
  return SharedRitualMaterials;
}

/** 主殿精雕构件装配器：实体与可见几何共享同一尺寸和变换。 */
export class PoseidonTempleBuilder {
  constructor(colliders) {
    this.bucket = new MergeBucket();
    this.colliders = colliders;
    this.ordinal = 0;
  }
  add(geometry, material, position, euler = null, scale = 1) {
    this.bucket.add(geometry, material, {
      position,
      euler,
      scale,
      tile: material === "stone" ? 12 : 18,
    });
  }
  box(material, w, h, d, x, y, z, options = {}) {
    const { solid = true, euler = null, kind = "poseidon_masonry" } = options;
    this.add(unitBox(material), material, [x, y, z], euler, [w, h, d]);
    if (!solid) return;
    const rotation = euler
      ? new THREE.Quaternion().setFromEuler(new THREE.Euler(...euler))
      : null;
    this.colliders.push({
      type: "box",
      kind,
      x,
      y,
      z,
      halfSize: { x: w / 2, y: h / 2, z: d / 2 },
      ...(rotation && {
        rotation: {
          x: rotation.x,
          y: rotation.y,
          z: rotation.z,
          w: rotation.w,
        },
      }),
    });
  }
  column(x, y, z, height, radius, ornate = true) {
    const trunk = cachedGeometry("poseidon_fluted_column_v1", () => {
      const g = new THREE.CylinderGeometry(0.83, 1, 1, 48, 12);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const angle = Math.atan2(p.getZ(i), p.getX(i));
        const flute = 0.955 + Math.cos(angle * 24) * 0.045;
        const entasis = 1 + Math.sin((p.getY(i) + 0.5) * Math.PI) * 0.045;
        p.setXYZ(
          i,
          p.getX(i) * flute * entasis,
          p.getY(i),
          p.getZ(i) * flute * entasis,
        );
      }
      g.computeVertexNormals();
      return paintStone(g, { base: "#bcc9bd", algaeAmount: 0.12, seed: 411 });
    });
    const foot = radius * 0.7;
    this.box("marble", radius * 3.2, foot, radius * 3.2, x, y + foot / 2, z);
    this.add(trunk, "marble", [x, y + height / 2, z], null, [
      radius,
      height - foot * 2,
      radius,
    ]);
    // 柱身胶囊上下端位于柱内；基座和柱头分别承担其额外宽度。
    this.colliders.push({
      type: "capsule",
      kind: "poseidon_column",
      a: { x, y: y + radius + foot, z },
      b: { x, y: y + height - radius - foot, z },
      radius: radius * 1.015,
    });
    for (const offset of [foot, height - foot]) {
      this.add(
        moulding(),
        "marble",
        [x, y + offset, z],
        [Math.PI / 2, 0, 0],
        radius,
      );
    }
    this.box(
      "marble",
      radius * 3.3,
      foot,
      radius * 3.3,
      x,
      y + height - foot / 2,
      z,
    );
    if (!ornate) return;
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      this.add(
        acanthusLeaf(),
        "marble",
        [
          x + Math.sin(a) * radius * 0.9,
          y + height - foot * 2,
          z + Math.cos(a) * radius * 0.9,
        ],
        [0, a, 0],
        radius * 0.82,
      );
    }
  }
  arch(x, floor, z, width, height, depth, material = "marble") {
    const r = width / 2;
    const spring = height - r;
    for (const sign of [-1, 1])
      this.box(
        material,
        2.2,
        spring,
        depth,
        x + sign * (r + 1.1),
        floor + spring / 2,
        z,
      );
    for (let i = 0; i < 24; i++) {
      const a = ((i + 0.5) * Math.PI) / 24;
      const mid = r + 1.1;
      this.box(
        material,
        2.2,
        (Math.PI * mid) / 24 + 0.05,
        depth,
        x + Math.cos(a) * mid,
        floor + spring + Math.sin(a) * mid,
        z,
        { euler: [0, 0, a], kind: "poseidon_arch" },
      );
    }
  }
  pediment(x, y, z, width, rise, depth) {
    const geometry = cachedGeometry(
      `poseidon_pediment_${width}_${rise}_${depth}`,
      () => {
        const shape = new THREE.Shape();
        shape.moveTo(-width / 2, 0);
        shape.lineTo(width / 2, 0);
        shape.lineTo(0, rise);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: false,
          steps: 1,
        });
        g.translate(0, 0, -depth / 2);
        return paintStone(g, { base: "#d4d5bf", algaeAmount: 0.13, seed: 316 });
      },
    );
    this.add(geometry, "marble", [x, y, z]);
    // 薄条的上沿误差小于0.5m，不用整块矩形堵住三角山墙两侧水域。
    const count = 64;
    for (let i = 0; i < count; i++) {
      const px = -width / 2 + ((i + 0.5) * width) / count;
      const h = rise * (1 - Math.abs(px) / (width / 2));
      this.colliders.push({
        type: "box",
        kind: "poseidon_pediment",
        x: x + px,
        y: y + h / 2,
        z,
        halfSize: { x: width / count / 2, y: h / 2, z: depth / 2 },
      });
    }
    for (const sign of [-1, 1]) {
      const angle = -sign * Math.atan2(rise, width / 2);
      this.box(
        "marble",
        Math.hypot(width / 2, rise),
        0.8,
        depth + 0.8,
        x + (sign * width) / 4,
        y + rise / 2,
        z,
        { euler: [0, 0, angle] },
      );
    }
    this.waveRelief(x, y + 3.3, z + depth / 2 + 0.25, width * 0.7, 1.25);
    this.add(
      tridentRelief(),
      "bronze",
      [x, y + rise * 0.48, z + depth / 2 + 0.35],
      null,
      1.6,
    );
    for (const sign of [-1, 1])
      for (let k = 0; k < 4; k++) {
        this.add(
          acanthusLeaf(),
          "marble",
          [
            x + sign * (15 + k * 8),
            y + rise * (0.55 - k * 0.08),
            z + depth / 2 + 0.3,
          ],
          [0, 0, (sign * Math.PI) / 2],
          2.4,
        );
      }
  }
  waveRelief(x, y, z, width, scale = 1) {
    this.add(waveGeometry(), "bronze", [x, y, z], null, [
      width / 24,
      scale,
      scale,
    ]);
  }
  seaEmblem(x, y, z, yaw, scale = 1) {
    for (const sign of [-1, 1])
      this.add(
        sign < 0 ? mirroredHippocampRelief() : hippocampRelief(),
        "bronze",
        [x, y, z],
        [0, yaw, 0],
        scale,
      );
  }
  pearl(x, floor, z, scale, lightSources, id) {
    const kit = pearlHabitat({ detail: "niche" });
    for (const part of kit.parts)
      this.add(part.geometry, part.key, [x, floor, z], null, scale);
    for (const c of kit.colliders) {
      if (c.type === "box")
        this.colliders.push({
          ...c,
          x: x + c.x * scale,
          y: floor + c.y * scale,
          z: z + c.z * scale,
          halfSize: {
            x: c.halfSize.x * scale,
            y: c.halfSize.y * scale,
            z: c.halfSize.z * scale,
          },
        });
      else
        this.colliders.push({
          ...c,
          a: {
            x: x + c.a.x * scale,
            y: floor + c.a.y * scale,
            z: z + c.a.z * scale,
          },
          b: {
            x: x + c.b.x * scale,
            y: floor + c.b.y * scale,
            z: z + c.b.z * scale,
          },
          radius: c.radius * scale,
        });
    }
    lightSources.push({
      id,
      x,
      y: floor + scale * 1.36,
      z: z - scale * 0.22,
      color: "#e3d5a5",
      intensity: PEARL_LIGHT_INTENSITY * scale ** 2,
      distance: 100,
    });
  }
}

/*********************************************
 * Private Helper Functions
 ********************************************/

function unitBox(material) {
  return cachedGeometry(`poseidon_box_${material}_v1`, () =>
    paintStone(new THREE.BoxGeometry(1, 1, 1), {
      base:
        material === "ritualLapis"
          ? "#2e6178"
          : material === "rockDark"
            ? "#697a73"
            : material === "bronze"
              ? "#7b9383"
              : material === "marble"
                ? "#ccd0bd"
                : "#a3b5a8",
      algaeAmount: material === "stone" ? 0.24 : 0.12,
      seed: 341,
    }),
  );
}
function moulding() {
  return cachedGeometry("poseidon_column_moulding_v1", () =>
    paintStone(new THREE.TorusGeometry(1.02, 0.16, 8, 32), {
      base: "#ccd0bd",
      algaeAmount: 0.1,
      seed: 432,
    }),
  );
}
function acanthusLeaf() {
  return cachedGeometry("poseidon_acanthus_leaf_v1", () => {
    const positions = [],
      indices = [];
    for (let j = 0; j <= 8; j++) {
      const t = j / 8;
      const w =
        0.035 +
        Math.sin(Math.PI * t) * (0.68 + Math.sin(t * Math.PI * 8) * 0.1);
      for (const side of [-1, 0, 1])
        positions.push(
          side * w,
          t * 2.5,
          Math.sin(t * Math.PI * 0.8) * 0.72 + Math.abs(side) * 0.17,
        );
    }
    for (let j = 0; j < 8; j++)
      for (let i = 0; i < 2; i++) {
        const a = j * 3 + i;
        indices.push(
          a,
          a + 3,
          a + 1,
          a + 1,
          a + 3,
          a + 4,
          a + 1,
          a + 3,
          a,
          a + 4,
          a + 3,
          a + 1,
        );
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return paintStone(g, { base: "#c3cbb6", algaeAmount: 0.1, seed: 768 });
  });
}
function waveGeometry() {
  return cachedGeometry("poseidon_carved_wave_v1", () => {
    const points = Array.from(
      { length: 97 },
      (_, i) =>
        new THREE.Vector3(
          -12 + i / 4,
          Math.sin((i * Math.PI) / 12) * 0.8,
          Math.cos((i * Math.PI) / 12) * 0.12,
        ),
    );
    return paintStone(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        96,
        0.13,
        6,
        false,
      ),
      { base: "#759387", algaeAmount: 0.08, seed: 889 },
    );
  });
}
function tridentRelief() {
  return cachedGeometry("poseidon_trident_relief_v1", () => {
    const bucket = new MergeBucket();
    for (const [x, y, w, h] of [
      [0, 0, 0.24, 7],
      [-1.25, 2.8, 0.24, 2.4],
      [1.25, 2.8, 0.24, 2.4],
      [0, 2.2, 2.7, 0.22],
    ])
      bucket.add(unitBox("bronze"), "bronze", {
        position: [x, y, 0],
        scale: [w, h, 0.25],
      });
    const group = new THREE.Group(),
      owned = new Set();
    bucket.build({ bronze: new THREE.MeshBasicMaterial() }, group, owned);
    const geometry = group.children[0].geometry;
    group.children[0].material.dispose();
    return geometry;
  });
}

function hippocampRelief() {
  return cachedGeometry("poseidon_hippocamp_relief_v1", () => {
    // 原创海马兽印章：马首、弯颈、背鳍与螺旋鱼尾组成连续浅浮雕轮廓。
    const s = new THREE.Shape();
    s.moveTo(0.5, -2.9);
    s.bezierCurveTo(2.9, -3.8, 4.9, -2.2, 4.2, -0.8);
    s.bezierCurveTo(3.9, 0.5, 2.5, 0.2, 2.9, -0.8);
    s.bezierCurveTo(3.1, -1.5, 3.8, -1.4, 3.8, -1.9);
    s.bezierCurveTo(3.8, -2.8, 2.1, -2.8, 1.8, -1.8);
    s.bezierCurveTo(1.3, -0.7, 2.1, 0.5, 2.3, 1.6);
    s.lineTo(2.8, 2.9);
    s.lineTo(3.5, 3.2);
    s.lineTo(3.4, 3.8);
    s.lineTo(2.2, 4.3);
    s.lineTo(1.9, 5.1);
    s.lineTo(1.2, 4.1);
    s.bezierCurveTo(0.6, 3.6, 0.8, 2.6, 1.1, 1.8);
    s.lineTo(0.2, 2.2);
    s.lineTo(0.8, 1.2);
    s.lineTo(0.1, 1.3);
    s.lineTo(0.8, 0.5);
    s.bezierCurveTo(0.1, -0.9, 0.1, -2.2, 0.5, -2.9);
    s.closePath();
    return paintStone(
      new THREE.ExtrudeGeometry(s, {
        depth: 0.38,
        bevelEnabled: true,
        bevelSegments: 1,
        bevelSize: 0.08,
        bevelThickness: 0.07,
        curveSegments: 10,
      }),
      { base: "#729786", algaeAmount: 0.13, seed: 515 },
    );
  });
}

function mirroredHippocampRelief() {
  return cachedGeometry("poseidon_hippocamp_mirror_v1", () => {
    const g = hippocampRelief().clone();
    g.scale(-1, 1, 1);
    // 镜像的负行列式会反转正反面，重新排列顶点序而不靠双面材质掩盖。
    const indices = g.index
      ? Array.from(g.index.array)
      : Array.from({ length: g.attributes.position.count }, (_, i) => i);
    for (let i = 0; i < indices.length; i += 3) {
      const second = indices[i + 1];
      indices[i + 1] = indices[i + 2];
      indices[i + 2] = second;
    }
    g.setIndex(indices);
    return g;
  });
}
