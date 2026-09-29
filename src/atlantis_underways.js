import * as THREE from "three";
import {
  MergeBucket,
  atlantisMaterials,
  loftGeometry,
  paintStone,
} from "./atlantis_art_geometry.js";

// 只替换侧城街坊；范围不改变五城区边界，也不侵占圣道和克拉肯战斗空间。
export const ATLANTIS_UNDERWAY_SITES = Object.freeze([
  Object.freeze({
    id: "harbor_sanctuary",
    x: -215,
    z: -240.5,
    width: 112,
    depth: 124,
    variant: "sanctuary",
  }),
  Object.freeze({
    id: "agora_bridges",
    x: 215,
    z: -447.5,
    width: 112,
    depth: 124,
    variant: "bridges",
  }),
  Object.freeze({
    id: "memorial_terrace",
    x: -215,
    z: -999.5,
    width: 112,
    depth: 124,
    variant: "terrace",
  }),
]);

/**
 * 查询原建筑投影是否碰到预留街坊，供城市在构建原基座之前过滤。
 * @param {number} x 建筑中心横坐标。
 * @param {number} z 建筑中心纵坐标。
 * @param {number} width 原建筑投影宽度。
 * @param {number} depth 原建筑投影深度。
 * @returns {boolean} 是否需要让出街坊。
 */
export function isAtlantisUnderwayReserved(x, z, width = 0, depth = 0) {
  return ATLANTIS_UNDERWAY_SITES.some(
    (site) =>
      Math.abs(x - site.x) < (site.width + width) / 2 &&
      Math.abs(z - site.z) < (site.depth + depth) / 2,
  );
}

/**
 * 构建三处上下可穿行的抬升圣所，所有实体与碰撞共用尺寸。
 * @param {THREE.Object3D} parent 场景父节点。
 * @param {{heightAt:function}} options 已有海床采样函数。
 * @returns {object} 场景、碰撞、地标、记录、统计、更新与幂等释放接口。
 */
export function createAtlantisUnderways(parent, { heightAt } = {}) {
  if (!parent?.add || typeof heightAt !== "function")
    throw new Error(
      "Atlantis underways require a parent and seabed height function",
    );
  const root = new THREE.Group();
  root.name = "atlantis_underways";
  parent.add(root);
  const owned = new Set(),
    colliders = [],
    obstacles = [],
    landmarks = [],
    records = [];
  const materials = atlantisMaterials();
  for (const site of ATLANTIS_UNDERWAY_SITES) {
    const group = new THREE.Group();
    group.name = site.id;
    root.add(group);
    const builder = new UnderwayBuilder(site, heightAt, colliders);
    const maximum = builder.floorRange(0, 0, 100, 112).max;
    const deck = maximum + 52;
    buildGallery(builder, deck, maximum);
    if (site.variant === "bridges") {
      // 双翼上殿围出真实的露天竖井，两端石桥形成上下层环游路线。
      for (const side of [-1, 1]) {
        builder.box("stone", 30, 4, 112, side * 35, deck - 2, 0);
        hall(builder, side * 35, deck, 0, 27, 94, 27, 8);
      }
      for (const z of [-46, 46])
        builder.box("marble", 40, 4, 20, 0, deck - 2, z);
    } else {
      builder.box("stone", 100, 4, 112, 0, deck - 2, 0);
      if (site.variant === "sanctuary")
        hall(builder, 0, deck, 0, 86, 88, 33, 13);
      else {
        hall(builder, 0, deck, -25, 76, 53, 30, 11);
        for (const side of [-1, 1]) {
          hall(builder, side * 36, deck, 35, 24, 30, 20, 6);
          builder.column(side * 43, deck, 6, 28, 2.2);
        }
      }
    }
    for (const x of [-49, 49])
      builder.box("marble", 2, 1.4, 112, x, deck + 0.7, 0);
    // 横向边缘压顶分开，入口保持敞开；层叠檐口、齿饰和铜嵌条继承王城语言。
    for (const z of [-55, 55]) {
      for (const x of [-37, 37])
        builder.box("marble", 26, 1.4, 2, x, deck + 0.7, z);
      builder.box("marble", 102, 1.1, 3, 0, deck - 1.3, z);
      for (let x = -47; x <= 47; x += 5)
        builder.box(
          "bronze",
          1.4,
          2.4,
          0.5,
          x,
          deck - 1.9,
          z + Math.sign(z) * 1.7,
          false,
        );
    }
    builder.bucket.build(materials, group, owned);
    group.traverse((mesh) => {
      if (!mesh.isMesh) return;
      mesh.receiveShadow = true;
      mesh.geometry.computeBoundingSphere();
    });
    const lowerY = maximum + 23;
    const record = {
      ...site,
      kind: "underway",
      y: deck,
      floorMaximum: maximum,
      lowerY,
      upperY: deck + 14,
      height: deck - maximum + 49,
      lowerRoute: [
        { x: site.x, y: lowerY, z: site.z + 69 },
        { x: site.x, y: lowerY, z: site.z - 69 },
      ],
      upperRoute: [
        { x: site.x, y: deck + 14, z: site.z + 69 },
        { x: site.x, y: deck + 14, z: site.z - 69 },
      ],
      verticalRoute:
        site.variant === "bridges"
          ? [
              { x: site.x, y: lowerY, z: site.z },
              { x: site.x, y: deck + 44, z: site.z },
            ]
          : null,
      clearWidth: 64,
      lowerClearance: 44,
      group,
    };
    records.push(record);
    landmarks.push({
      id: site.id,
      position: new THREE.Vector3(site.x, deck + 14, site.z),
    });
  }
  const stats = {
    sites: records.length,
    levels: 2,
    meshes: owned.size,
    colliders: colliders.length,
    triangles: [...owned].reduce(
      (sum, geometry) => sum + geometry.attributes.position.count / 3,
      0,
    ),
  };
  root.userData.underwayStats = stats;
  let disposed = false;
  return {
    root,
    colliders,
    obstacles,
    landmarks,
    records,
    stats,
    update(time, dt, position, highQuality = true) {
      if (disposed) return;
      for (const record of records)
        record.group.visible =
          !position ||
          Math.hypot(record.x - position.x, record.z - position.z) <
            (highQuality ? 400 : 330);
      void time;
      void dt;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      parent.remove(root);
      for (const geometry of owned) geometry.dispose();
      owned.clear();
      root.clear();
      colliders.length =
        obstacles.length =
        landmarks.length =
        records.length =
          0;
    },
  };
}

class UnderwayBuilder {
  constructor(site, heightAt, colliders) {
    this.site = site;
    this.heightAt = heightAt;
    this.colliders = colliders;
    this.bucket = new MergeBucket();
    this.ordinal = 0;
  }
  add(geometry, material, x, y, z, euler = null) {
    paintStone(geometry, {
      base:
        material === "bronze"
          ? "#668b84"
          : material === "marble"
            ? "#d3d2bc"
            : "#a6b7ae",
      algaeAmount: material === "stone" ? 0.24 : 0.12,
      seed: 319 + this.ordinal++,
    });
    this.bucket.add(geometry, material, {
      position: [this.site.x + x, y, this.site.z + z],
      euler,
      tile: material === "stone" ? 11 : 18,
    });
    geometry.dispose();
  }
  box(material, w, h, d, x, y, z, solid = true, angle = 0) {
    this.add(new THREE.BoxGeometry(w, h, d), material, x, y, z, [0, 0, angle]);
    if (solid)
      this.colliders.push({
        type: "box",
        kind: "underway_masonry",
        site: this.site.id,
        x: this.site.x + x,
        y,
        z: this.site.z + z,
        halfSize: { x: w / 2, y: h / 2, z: d / 2 },
        ...(angle
          ? {
              rotation: {
                x: 0,
                y: 0,
                z: Math.sin(angle / 2),
                w: Math.cos(angle / 2),
              },
            }
          : {}),
      });
  }
  floorRange(x, z, w, d) {
    const samples = [];
    for (let ix = 0; ix <= 4; ix++)
      for (let iz = 0; iz <= 4; iz++)
        samples.push(
          this.heightAt(
            this.site.x + x + (ix / 4 - 0.5) * w,
            this.site.z + z + (iz / 4 - 0.5) * d,
          ),
        );
    return { min: Math.min(...samples), max: Math.max(...samples) };
  }
  column(x, y, z, height, radius) {
    this.box("marble", radius * 3, 1, radius * 3, x, y + 0.5, z);
    const shaft = loftGeometry(
      null,
      [
        { y: 0, rx: radius, rz: radius, wave: 20, waveAmp: 0.07 },
        {
          y: height * 0.5,
          rx: radius * 0.94,
          rz: radius * 0.94,
          wave: 20,
          waveAmp: 0.07,
        },
        {
          y: height - 2,
          rx: radius * 0.8,
          rz: radius * 0.8,
          wave: 20,
          waveAmp: 0.07,
        },
      ],
      { radial: 24, subdivision: 0.25, capStart: true, capEnd: true },
    );
    this.add(shaft, "marble", x, y + 1, z);
    this.colliders.push({
      type: "capsule",
      kind: "underway_column",
      site: this.site.id,
      a: { x: this.site.x + x, y: y + radius, z: this.site.z + z },
      b: { x: this.site.x + x, y: y + height - radius, z: this.site.z + z },
      radius: radius * 1.05,
    });
    this.box("marble", radius * 3, 1, radius * 3, x, y + height - 0.5, z);
    for (const sign of [-1, 1])
      this.add(
        new THREE.TorusGeometry(radius * 0.5, radius * 0.14, 6, 16),
        "marble",
        x + sign * radius,
        y + height - 1.2,
        z + radius,
      );
    for (const dy of [1.1, height - 1.4])
      this.add(
        new THREE.CylinderGeometry(radius * 1.15, radius * 1.2, 0.45, 24),
        "marble",
        x,
        y + dy,
        z,
      );
  }
  arch(z, spring, radius) {
    const thickness = 3.2,
      count = 25,
      mid = radius + thickness / 2;
    for (let i = 0; i < count; i++) {
      const angle = ((i + 0.5) / count) * Math.PI;
      this.box(
        "marble",
        thickness,
        ((Math.PI * mid) / count) * 1.025,
        5,
        Math.cos(angle) * mid,
        spring + Math.sin(angle) * mid,
        z,
        true,
        angle,
      );
    }
    for (const side of [-1, 1])
      this.box(
        "bronze",
        3,
        3.5,
        0.6,
        side * 16,
        spring + radius - 1,
        z + Math.sign(z) * 2.85,
        false,
      );
  }
}

/** 下廊只放独立支墩，桥面以下始终没有整面碰撞盒。 */
function buildGallery(b, deck, maximum) {
  for (const x of [-44, 44])
    for (const z of [-46, 0, 46]) {
      const sample = b.floorRange(x, z, 11, 11),
        bottom = sample.min - 2,
        footing = sample.max + 2.4;
      b.box("stone", 11, footing - bottom, 11, x, (footing + bottom) / 2, z);
      b.column(x, footing, z, deck - footing - 2, 3.4);
      // 竖向壁柱和腰线与独立墩基重合，不填入中间通道。
      for (let y = footing + 7; y < deck - 4; y += 9) {
        const radius = 3.5 * (1 - (0.2 * (y - footing)) / (deck - footing));
        b.add(
          new THREE.CylinderGeometry(radius, radius, 0.25, 28),
          "bronze",
          x,
          y,
          z,
        );
      }
    }
  for (const z of [-46, 46]) {
    b.arch(z, deck - 44, 38);
    b.box("marble", 100, 3, 8, 0, deck - 2.5, z);
  }
  for (const x of [-44, 44]) b.box("marble", 8, 3, 106, x, deck - 2.5, 0);
  // 巨拱背后的斗拱传力到柱头；两端均留有真实贯通洞口。
  for (const side of [-1, 1])
    for (const z of [-46, 46]) b.box("stone", 9, 8, 6, side * 43, deck - 7, z);
  void maximum;
}

/** 上殿使用带凹槽柱、双层檐口、三角山墙和石屋面，四面透空。 */
function hall(b, cx, floor, cz, width, depth, height, rise) {
  const xEdge = width / 2 - 4,
    zEdge = depth / 2 - 4;
  for (const side of [-1, 1])
    for (const z of [-zEdge, 0, zEdge])
      b.column(
        cx + side * xEdge,
        floor,
        cz + z,
        height,
        width < 40 ? 1.6 : 2.3,
      );
  for (const x of [-xEdge, xEdge])
    b.box("marble", 5, 2.5, depth, cx + x, floor + height + 0.7, cz);
  for (const z of [-zEdge, zEdge]) {
    b.box("marble", width, 2.5, 5, cx, floor + height + 0.7, cz + z);
    for (let x = -width / 2 + 2; x < width / 2; x += 3.5)
      b.box(
        "marble",
        0.7,
        1,
        1.1,
        cx + x,
        floor + height - 0.8,
        cz + z + Math.sign(z) * 2.4,
        false,
      );
  }
  const roofBase = floor + height + 2.2;
  // 两片斜屋面使用相同旋转盒碰撞，不能用覆盖整座殿堂的隐形矩形。
  const slope = Math.atan2(rise, width / 2),
    span = Math.hypot(width / 2, rise);
  for (const side of [-1, 1])
    b.box(
      "stone",
      span + 1.1,
      2,
      depth + 3,
      cx + (side * width) / 4,
      roofBase + rise / 2,
      cz,
      true,
      -side * slope,
    );
  for (const z of [-depth / 2, depth / 2]) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(0, rise);
    shape.closePath();
    b.add(
      new THREE.ExtrudeGeometry(shape, {
        depth: 1.3,
        bevelEnabled: false,
        steps: 1,
      }),
      "marble",
      cx,
      roofBase,
      cz + z - 0.65,
    );
    // 分条山墙碰撞贴合三角形，不遮挡斜屋面上方的游动空间。
    for (let i = 0; i < 20; i++) {
      const x = -width / 2 + ((i + 0.5) * width) / 20,
        h = rise * (1 - Math.abs(x) / (width / 2));
      b.colliders.push({
        type: "box",
        kind: "underway_pediment",
        site: b.site.id,
        x: b.site.x + cx + x,
        y: roofBase + h / 2,
        z: b.site.z + cz + z,
        halfSize: { x: width / 40, y: h / 2, z: 0.65 },
      });
    }
    b.add(
      new THREE.TorusGeometry(Math.min(rise * 0.27, 3), 0.3, 8, 28),
      "bronze",
      cx,
      roofBase + rise * 0.4,
      cz + z + Math.sign(z) * 0.9,
    );
    for (const side of [-1, 1])
      b.box(
        "marble",
        span + 1,
        0.7,
        2,
        cx + (side * width) / 4,
        roofBase + rise / 2 + 0.7,
        cz + z,
        false,
        -side * slope,
      );
  }
  b.box("marble", 1.8, 1.6, depth + 4, cx, roofBase + rise + 0.3, cz);
}
