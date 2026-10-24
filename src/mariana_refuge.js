import * as THREE from "three";
import { addMarianaResidents } from "./mariana_residents.js";
import { createBermudaBuilder as baseBuilder } from "./bermuda_geometry.js";
import { addMarianaRefugeBuildings } from "./mariana_refuge_buildings.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { createMarianaRefugePaving } from "./mariana_refuge_paving.js";

// 世界坐标深度，不是 HUD 换算后的海拔；在最后一位守卫之前开始下载，距可见范围留 600 单位。
const MATERIAL_PRELOAD_Y = -1800;

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

/** 暖色终点街区：HF 建筑、石板广场与原有居民分别持有资源和接触。 */
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
  const ridge = m("pineapple_scales", 0xecd078),
    green = m("leaf_green", 0x577e64),
    sand = m("refuge_sand", 0xaaa698),
    blue = m("door_ocean_blue", 0x558893),
    dark = m("deep_recesses", 0x45475b),
    warm = m("warm_windows", 0xf6d99a, 1.2);
  addSurfaceDetail(sand, "stone", 0.23);
  b.box(createMarianaRefugePaving(keep), [0, 0, 10], [160, 12, 170], true);
  colliders[0].id = "refuge_plinth";
  b.box(sand, [-52, 7.5, -19.5], [34, 3, 34], true);
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
  // 低矮石阶逐层埋入海床，渲染方体与接触使用同一尺寸，避免悬空薄片。
  for (let i = 0; i < 5; i++) {
    const reach = (i + 1) * 2.4,
      inner = i * 2.4,
      top = 5 - i;
    for (const side of [-1, 1]) {
      const parts = [
        [
          [side * (80 + inner + 1.2), (top - 6) / 2, 10],
          [2.4, top + 6, 170 + inner * 2],
        ],
        [
          [0, (top - 6) / 2, 10 + side * (85 + inner + 1.2)],
          [160 + reach * 2, top + 6, 2.4],
        ],
      ];
      for (let j = 0; j < parts.length; j++) {
        b.box(sand, ...parts[j], true);
        colliders.at(-1).id = `refuge_bank_${i}_${side}_${j}`;
      }
    }
  }
  b.finish();
  const buildings = addMarianaRefugeBuildings(root, keep, origin, colliders);
  const residents = addMarianaResidents(root, keep, origin, colliders);
  let materialsRequested = false,
    disposed = false;
  keep({
    dispose() {
      disposed = true;
    },
  });
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
      if (disposed) return;
      // 实体从进图起就存在；仅推迟七张色图。共用下载器负责去重、失败底色、联网恢复和销毁取消。
      if (!materialsRequested && p.y <= MATERIAL_PRELOAD_Y) {
        materialsRequested = true;
        for (const a of buildings.assets.values()) void a.prepare();
        for (const a of residents.assets.values()) void a.prepare();
      }
      root.visible = p.y < -2400;
      if (!root.visible) return;
      residents.update(t);
    },
  };
}

/** 街区建筑沿广场两侧布置，中央航道保留给成年体型与最终抵达判定。 */
function addNeighborhood(b, colliders, origin, p) {
  const { sand, blue, dark, warm, ridge, green } = p;
  b.box(sand, [54, 8, -20], [29, 4, 27], true);
  b.box(sand, [52, 8, 64], [40, 4, 34], true);
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
