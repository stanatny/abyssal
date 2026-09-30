import * as THREE from "three";
import {
  MergeBucket,
  atlantisMaterials,
  cachedGeometry,
  paintStone,
  seededRandom,
} from "./atlantis_art_geometry.js";
import { ATLANTIS_EXCAVATION_SITES } from "./atlantis_terrain.js";
import { castSegment, isPositionBlocked } from "./collision.js";
import { createStaticColliderGrid } from "./static_collider_grid.js";

/**
 * 亚特兰蒂斯探索家具陈设:古代石凳/石桌、双耳瓶群、雕纹储物箱
 * (做旧铜带、贝嵌)与散落器物。纯场景陈设,不是掉落系统。
 * 当前切片在港口下厅东北角、西南角与上层展厅西北角成组陈设,
 * 并在街区立面墙脚点缀陶瓶;主游线、回转区、竖井与两条成人
 * 往返路线由避让体与宿主碰撞复核保持通畅。
 * 实质性固体给出与可见体贴合的 box 碰撞;细小器物不加碰撞。
 */

const STONE_TINT = "#8d9a90";
const FURNITURE_PROTOTYPES = new Map();

/** 局部坐标系:绕 Y  yaw 旋转后的放置点换算。 */
function frame(x, floor, z, yaw) {
  const sin = Math.sin(yaw),
    cos = Math.cos(yaw);
  return (lx, ly, lz) => [
    x + lx * cos + lz * sin,
    floor + ly,
    z - lx * sin + lz * cos,
  ];
}

function yawQuaternion(yaw) {
  return yaw
    ? new THREE.Quaternion()
        .setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
        .toArray()
    : null;
}

/** 避让体:与海洋殖民同一套合同,保证两片叠加后通道仍然通畅。 */
function keepOuts(site) {
  const zones = [];
  const shaft = site.shaft;
  zones.push({
    minX: shaft.minX - 2,
    maxX: shaft.maxX + 2,
    minZ: shaft.minZ - 2,
    maxZ: shaft.maxZ + 2,
    minY: site.levels[1].floorY - 1,
    maxY: shaft.topY + 8,
  });
  const turn = site.turningCircle;
  // 回转净区只约束游泳平面(turn.y)上下各 8m;厅底陈设在其下方十余米,
  // 水平方向仍按净半径避让,保证 30m 成体转平空间。
  zones.push({
    circle: { x: turn.x, z: turn.z, radius: turn.clearRadius + 1 },
    minY: turn.y - 8,
    maxY: turn.y + 8,
  });
  for (const route of site.routes ?? [])
    for (let i = 0; i < route.waypoints.length - 1; i += 1)
      zones.push({
        segment: [route.waypoints[i], route.waypoints[i + 1]],
        radius: 8.5,
      });
  const stair = site.entrance;
  zones.push({
    segment: [
      { x: stair.top.x, y: stair.top.y + 2, z: stair.top.z - 4 },
      { x: stair.bottom.x, y: stair.bottom.y + 2, z: stair.bottom.z + 4 },
    ],
    radius: stair.clearWidth / 2 + 0.6,
  });
  const portal = site.secondExit;
  zones.push({
    minX: portal.minX - 2.5,
    maxX: portal.maxX + 2.5,
    minY: portal.sillY - 3,
    maxY: portal.topY + 3,
    minZ: portal.z - 7,
    maxZ: portal.z + 7,
  });
  return zones;
}

/** 以完整陈设包围体复核避让区，不能只检查中心点。 */
function blockedByKeepOut(zones, box) {
  const minY = box.y - box.halfSize.y;
  const maxY = box.y + box.halfSize.y;
  for (const zone of zones) {
    if (zone.segment) {
      if (segmentBoxDistanceSquared(...zone.segment, box) < zone.radius ** 2)
        return true;
      continue;
    }
    if (maxY <= zone.minY || minY >= zone.maxY) continue;
    if (zone.circle) {
      const dx = Math.max(0, Math.abs(box.x - zone.circle.x) - box.halfSize.x);
      const dz = Math.max(0, Math.abs(box.z - zone.circle.z) - box.halfSize.z);
      if (Math.hypot(dx, dz) < zone.circle.radius) return true;
      continue;
    }
    if (
      box.x + box.halfSize.x > zone.minX &&
      box.x - box.halfSize.x < zone.maxX &&
      box.z + box.halfSize.z > zone.minZ &&
      box.z - box.halfSize.z < zone.maxZ
    )
      return true;
  }
  return false;
}

/** 线段至轴对齐包围体的精确最短距离，避免球形游线被扩大成方角通道。 */
function segmentBoxDistanceSquared(a, b, box) {
  const axes = ["x", "y", "z"];
  const delta = Object.fromEntries(
    axes.map((axis) => [axis, b[axis] - a[axis]]),
  );
  const cuts = [0, 1];
  for (const axis of axes) {
    if (Math.abs(delta[axis]) < 1e-8) continue;
    for (const side of [-1, 1]) {
      const t = (box[axis] + side * box.halfSize[axis] - a[axis]) / delta[axis];
      if (t > 0 && t < 1) cuts.push(t);
    }
  }
  cuts.sort((x, y) => x - y);
  let best = Infinity;
  const at = (t) =>
    axes.reduce(
      (sum, axis) =>
        sum +
        Math.max(
          0,
          Math.abs(a[axis] + delta[axis] * t - box[axis]) - box.halfSize[axis],
        ) **
          2,
      0,
    );
  for (let i = 1; i < cuts.length; i += 1) {
    const lo = cuts[i - 1],
      hi = cuts[i],
      mid = (lo + hi) / 2;
    let numerator = 0,
      denominator = 0;
    for (const axis of axes) {
      const distance = a[axis] + delta[axis] * mid - box[axis];
      if (Math.abs(distance) <= box.halfSize[axis]) continue;
      const offset =
        a[axis] - box[axis] - Math.sign(distance) * box.halfSize[axis];
      numerator += delta[axis] * offset;
      denominator += delta[axis] ** 2;
    }
    const closest = denominator
      ? Math.max(lo, Math.min(hi, -numerator / denominator))
      : lo;
    best = Math.min(best, at(lo), at(hi), at(closest));
  }
  return best;
}

/** 共享盒格式，碰撞方向与可见构件使用同一个 yaw。 */
function furnitureBox(w, h, d, x, y, z, yaw = 0) {
  const box = {
    type: "box",
    kind: "exploration_furniture",
    x,
    y,
    z,
    halfSize: { x: w / 2, y: h / 2, z: d / 2 },
  };
  const q = yawQuaternion(yaw);
  if (q) box.rotation = { x: q[0], y: q[1], z: q[2], w: q[3] };
  return box;
}

/** 取定向盒的十二条真实棱边，保留倾斜墙体与柱础的旋转。 */
function boxEdges(box) {
  const q = box.rotation
    ? new THREE.Quaternion(
        box.rotation.x,
        box.rotation.y,
        box.rotation.z,
        box.rotation.w,
      )
    : new THREE.Quaternion();
  const points = Array.from({ length: 8 }, (_, i) =>
    new THREE.Vector3(
      (i & 1 ? 1 : -1) * box.halfSize.x,
      (i & 2 ? 1 : -1) * box.halfSize.y,
      (i & 4 ? 1 : -1) * box.halfSize.z,
    )
      .applyQuaternion(q)
      .add(new THREE.Vector3(box.x, box.y, box.z)),
  );
  return points.flatMap((point, i) =>
    [1, 2, 4]
      .filter((bit) => !(i & bit))
      .map((bit) => [point, points[i | bit]]),
  );
}

/**
 * 宿主检测复用游戏的形状扫掠；盒棱双向检查同时覆盖包含关系和旋转墙面。
 * 略微收缩底面以允许真实楼板接触，不再跳过带 rotation 的实体。
 */
function overlapsHost(queryHosts, box) {
  const candidate = {
    ...box,
    y: box.y + 0.02,
    halfSize: { ...box.halfSize, y: Math.max(0.001, box.halfSize.y - 0.04) },
  };
  const corners = boxEdges(box).flat();
  const min = Object.fromEntries(
    ["x", "y", "z"].map((axis) => [
      axis,
      Math.min(...corners.map((point) => point[axis])),
    ]),
  );
  const max = Object.fromEntries(
    ["x", "y", "z"].map((axis) => [
      axis,
      Math.max(...corners.map((point) => point[axis])),
    ]),
  );
  const hosts = queryHosts(min, max);
  const edges = boxEdges(candidate);
  for (const host of hosts) {
    if (edges.some(([a, b]) => castSegment(a, b, [host]))) return true;
    if (host.type === "box") {
      if (boxEdges(host).some(([a, b]) => castSegment(a, b, [candidate])))
        return true;
    } else if (host.type === "capsule") {
      if (castSegment(host.a, host.b, [candidate], host.radius)) return true;
    } else if (host.type === "ellipsoid") {
      const q = host.rotation
        ? new THREE.Quaternion(
            host.rotation.x,
            host.rotation.y,
            host.rotation.z,
            host.rotation.w,
          )
        : new THREE.Quaternion();
      for (const axis of ["x", "y", "z"]) {
        const offset = new THREE.Vector3();
        offset[axis] = host.axes[axis];
        offset.applyQuaternion(q);
        const center = new THREE.Vector3(host.x, host.y, host.z);
        if (
          castSegment(center.clone().sub(offset), center.add(offset), [
            candidate,
          ])
        )
          return true;
      }
      const nearest = {
        x: Math.max(min.x, Math.min(max.x, host.x)),
        y: Math.max(min.y + 0.06, Math.min(max.y - 0.02, host.y)),
        z: Math.max(min.z, Math.min(max.z, host.z)),
      };
      if (isPositionBlocked(nearest, { colliders: [host] })) return true;
    } else if (castSegment(host, host, [candidate], host.radius)) return true;
  }
  return false;
}

/** 局部布局以场地中心为原点，所有陈设、散物与地标一起平移。 */
function siteOrigin(site) {
  return {
    x: (site.bounds.minX + site.bounds.maxX) / 2,
    z: (site.bounds.minZ + site.bounds.maxZ) / 2,
  };
}

/*********************************************
 * 装配工具:可见体与碰撞共用尺寸与变换(沿用港湾厅堂模式)
 *********************************************/

class FurnitureBuilder {
  constructor(colliders) {
    this.bucket = new MergeBucket();
    this.colliders = colliders;
    this.ordinal = 0;
  }
  add(geometry, material, x, y, z, options = {}) {
    const { quaternion = null, euler = null, tint = null } = options;
    paintStone(geometry, {
      base:
        tint ??
        (material === "bronze"
          ? "#668b84"
          : material === "marble"
            ? "#d3d2bc"
            : "#a6b7ae"),
      algaeAmount: material === "stone" ? 0.24 : 0.13,
      seed: 911 + this.ordinal++,
    });
    this.bucket.add(geometry, material, {
      position: [x, y, z],
      quaternion,
      euler,
      tile: material === "stone" ? 11 : 18,
    });
    geometry.dispose();
  }
  /** 并入已带顶点色的构件(贝嵌、瓶坯等),不再做石材着色。 */
  addRaw(geometry, materialKey, x, y, z, euler = null) {
    this.bucket.add(geometry, materialKey, { position: [x, y, z], euler });
  }
  box(material, w, h, d, x, y, z, options = {}) {
    const { solid = false, tint = null, yaw = 0 } = options;
    const quaternion = yawQuaternion(yaw);
    this.add(new THREE.BoxGeometry(w, h, d), material, x, y, z, {
      quaternion,
      tint,
    });
    if (solid) this.colliders.push(furnitureBox(w, h, d, x, y, z, yaw));
  }
}

/*********************************************
 * 单品构件:石凳、石桌、雕纹储物箱、双耳瓶群、散落器物
 *********************************************/

/** 石凳:叠涩涡卷侧墩、带齿饰的座面前沿与铜质靠杆。 */
function stoneBench(b, x, floor, z, yaw = 0) {
  const at = frame(x, floor, z, yaw);
  const q = yawQuaternion(yaw);
  for (const side of [-1, 1]) {
    // 侧墩:三层叠涩形成涡卷剪影。
    let [wx, wy, wz] = at(side * 1.45, 0.15, 0);
    b.box("stone", 0.55, 0.3, 1.25, wx, wy, wz, { solid: true, yaw });
    [wx, wy, wz] = at(side * 1.45, 0.55, 0);
    b.box("stone", 0.42, 0.5, 0.95, wx, wy, wz, { solid: true, yaw });
    [wx, wy, wz] = at(side * 1.45, 0.91, 0);
    b.box("marble", 0.62, 0.22, 1.1, wx, wy, wz, { solid: true, yaw });
  }
  let [wx, wy, wz] = at(0, 1.05, 0);
  b.box("marble", 3.6, 0.24, 1.3, wx, wy, wz, { solid: true, yaw });
  // 座面前沿齿饰带。
  for (let i = 0; i < 9; i += 1) {
    [wx, wy, wz] = at(-1.6 + i * 0.4, 0.86, 0.62);
    b.add(new THREE.BoxGeometry(0.22, 0.16, 0.1), "marble", wx, wy, wz, {
      quaternion: q,
    });
  }
  // 铜质靠杆与两端立杆。
  [wx, wy, wz] = at(0, 1.42, -0.58);
  b.box("bronze", 3.5, 0.12, 0.12, wx, wy, wz, { solid: true, yaw });
  for (const side of [-1, 1]) {
    [wx, wy, wz] = at(side * 1.68, 1.22, -0.58);
    b.box("bronze", 0.12, 0.5, 0.12, wx, wy, wz, { solid: true, yaw });
  }
}

/** 石桌:环纹柱础、圆盘面、铜缘与放射嵌条。 */
function stoneTable(b, x, floor, z) {
  b.add(
    new THREE.CylinderGeometry(1.05, 1.2, 0.3, 18),
    "stone",
    x,
    floor + 0.15,
    z,
  );
  const pedestal = cachedGeometry("exploration_table_pedestal", () => {
    const points = [
      [0.62, 0],
      [0.5, 0.12],
      [0.34, 0.3],
      [0.42, 0.55],
      [0.36, 0.8],
      [0.48, 1.0],
      [0.6, 1.1],
    ].map(([px, py]) => new THREE.Vector2(px, py));
    const g = new THREE.LatheGeometry(points, 18);
    paintStone(g, { base: "#aab9ae", algaeAmount: 0.2, seed: 55 });
    return g;
  });
  b.addRaw(pedestal, "marble", x, floor + 0.3, z);
  b.add(
    new THREE.CylinderGeometry(1.35, 1.28, 0.22, 24),
    "marble",
    x,
    floor + 1.5,
    z,
  );
  b.add(
    new THREE.TorusGeometry(1.32, 0.055, 6, 30),
    "bronze",
    x,
    floor + 1.61,
    z,
    {
      euler: [Math.PI / 2, 0, 0],
    },
  );
  // 桌面放射嵌条(视觉)。
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    b.add(
      new THREE.BoxGeometry(1.16, 0.035, 0.09),
      "bronze",
      x + Math.cos(a) * 0.58,
      floor + 1.62,
      z + Math.sin(a) * 0.58,
      { euler: [0, -a, 0] },
    );
  }
  b.colliders.push({
    type: "box",
    kind: "exploration_furniture",
    x,
    y: floor + 0.8,
    z,
    halfSize: { x: 1.35, y: 0.8, z: 1.35 },
  });
}

/** 雕纹储物箱:嵌板箱体、拱盖、做旧铜带铆钉、贝嵌徽章与青金石锁孔。 */
function storageChest(b, x, floor, z, yaw = 0) {
  const at = frame(x, floor, z, yaw);
  const q = yawQuaternion(yaw);
  // 四只矮足与箱体。
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const [wx, wy, wz] = at(sx * 1.05, 0.11, sz * 0.6);
      b.box("marble", 0.3, 0.22, 0.3, wx, wy, wz, { solid: true, yaw });
    }
  {
    const [wx, wy, wz] = at(0, 0.77, 0);
    b.box("stone", 2.6, 1.1, 1.55, wx, wy, wz, {
      solid: true,
      yaw,
      tint: STONE_TINT,
    });
  }
  // 前后嵌板:边框凸起、板面略凹,中央贝嵌徽章。
  for (const side of [-1, 1]) {
    let [wx, wy, wz] = at(0, 0.74, side * 0.79);
    b.add(new THREE.BoxGeometry(1.9, 0.72, 0.07), "marble", wx, wy, wz, {
      quaternion: q,
    });
    [wx, wy, wz] = at(0, 0.74, side * 0.775);
    b.add(new THREE.BoxGeometry(1.66, 0.5, 0.05), "stone", wx, wy, wz, {
      quaternion: q,
      tint: "#7c8d84",
    });
    [wx, wy, wz] = at(0, 0.74, side * 0.86);
    const medallion = cachedGeometry("exploration_chest_medallion", () => {
      const g = new THREE.CylinderGeometry(0.23, 0.23, 0.08, 18);
      const p = g.attributes.position;
      const colors = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i += 1) {
        const ridge =
          0.78 + 0.22 * Math.sin(Math.atan2(p.getZ(i), p.getX(i)) * 9);
        colors[i * 3] = ridge;
        colors[i * 3 + 1] = ridge * 0.96;
        colors[i * 3 + 2] = ridge * 0.9;
      }
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      return g;
    });
    b.addRaw(medallion, "nacre", wx, wy, wz, [Math.PI / 2, 0, -yaw]);
  }
  // 拱盖:方盖压边,上半圆拱顶沿箱长贯通。
  {
    const [wx, wy, wz] = at(0, 1.45, 0);
    b.box("marble", 2.72, 0.26, 1.66, wx, wy, wz, { solid: true, yaw });
  }
  const dome = cachedGeometry("exploration_chest_dome", () => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 0.82, 0, Math.PI, false);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 2.68,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 18,
    });
    g.translate(0, 0, -1.34);
    g.rotateY(Math.PI / 2);
    paintStone(g, { base: "#c9c8b4", algaeAmount: 0.16, seed: 57 });
    return g;
  });
  {
    const [wx, wy, wz] = at(0, 1.58, 0);
    b.addRaw(dome, "marble", wx, wy, wz, yaw ? [0, yaw, 0] : null);
  }
  // 三条做旧铜带(跨过箱身与拱盖)与铆钉。
  const rivet = cachedGeometry("exploration_chest_rivet", () => {
    const g = new THREE.IcosahedronGeometry(0.05, 0);
    const colors = new Float32Array(g.attributes.position.count * 3).fill(0.55);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  });
  for (const dx of [-0.86, 0, 0.86]) {
    let [wx, wy, wz] = at(dx, 0.78, 0);
    b.add(new THREE.BoxGeometry(0.2, 1.15, 1.62), "bronze", wx, wy, wz, {
      quaternion: q,
    });
    [wx, wy, wz] = at(dx, 1.46, 0);
    b.add(new THREE.BoxGeometry(0.2, 0.3, 1.7), "bronze", wx, wy, wz, {
      quaternion: q,
    });
    for (const side of [-1, 1])
      for (const dy of [0.45, 0.78, 1.1]) {
        [wx, wy, wz] = at(dx, dy, side * 0.83);
        b.addRaw(rivet, "bronze", wx, wy, wz);
      }
  }
  // 锁孔青金石与盖缘两侧贝珠小圆。
  {
    const [wx, wy, wz] = at(0, 0.92, 0.83);
    b.add(new THREE.BoxGeometry(0.2, 0.3, 0.08), "lapisGlow", wx, wy, wz, {
      quaternion: q,
    });
  }
  for (const dx of [-1.12, 1.12]) {
    const pearlDot = cachedGeometry(
      "exploration_chest_pearl_dot",
      () => new THREE.SphereGeometry(0.09, 10, 8),
    );
    const [wx, wy, wz] = at(dx, 1.5, 0.84);
    b.addRaw(pearlDot, "pearl", wx, wy, wz);
  }
  // 拱盖沿半圆曲线分成 36 条窄盒，最大轮廓偏差低于 0.072m。
  // 独立覆盖端面与内部实体，不把拱盖上方的空角封成整块大盒。
  for (let i = 0; i < 36; i += 1) {
    const a = (i * Math.PI) / 36;
    const next = ((i + 1) * Math.PI) / 36;
    const z0 = Math.cos(a) * 0.82;
    const z1 = Math.cos(next) * 0.82;
    const height = Math.max(Math.sin(a), Math.sin(next)) * 0.82;
    const [wx, wy, wz] = at(0, 1.58 + height / 2, (z0 + z1) / 2);
    b.colliders.push(
      furnitureBox(2.68, height, z0 - z1 + 1e-6, wx, wy, wz, yaw),
    );
  }
}

/** 双耳瓶:圈足、鼓腹、颈脊与翻唇,双柄;可倾倒。 */
function amphoraGeometry() {
  return cachedGeometry("exploration_amphora_v3", () => {
    const points = [
      [0.0, 0.0],
      [0.3, 0.02],
      [0.34, 0.1],
      [0.26, 0.2],
      [0.52, 0.55],
      [0.6, 0.95],
      [0.5, 1.35],
      [0.24, 1.55],
      [0.21, 1.78],
      [0.28, 1.86],
      [0.33, 1.98],
      [0.26, 2.02],
    ].map(([px, py]) => new THREE.Vector2(px, py));
    const g = new THREE.LatheGeometry(points, 16);
    paintStone(g, { base: "#bf957d", algaeAmount: 0.18, seed: 91 });
    return g;
  });
}
function amphoraHandle() {
  return cachedGeometry("exploration_amphora_handle_v4", () => {
    // 提耳处于瓶身径向平面，两端分别埋入瓶颈和肩部，避免切向圆弧悬空。
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0.13, 1.76, 0),
      new THREE.Vector3(0.8, 1.9, 0),
      new THREE.Vector3(0.74, 1.32, 0),
      new THREE.Vector3(0.35, 1.38, 0),
    );
    const g = new THREE.TubeGeometry(curve, 16, 0.06, 6, false);
    paintStone(g, { base: "#bc9078", algaeAmount: 0.12, seed: 92 });
    return g;
  });
}

/** 双耳瓶群:瓶座石盘上一簇立瓶,末尾一只倾倒,旁边一块残片。 */
function amphoraCluster(b, x, floor, z, count, seed) {
  const random = seededRandom(seed);
  b.box("stone", 3.4, 0.32, 2.6, x, floor + 0.16, z, { tint: "#97a79e" });
  const jar = amphoraGeometry(),
    handle = amphoraHandle();
  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.399 + random() * 0.4;
    const px = x + Math.cos(angle) * (0.35 + (i % 3) * 0.55);
    const pz = z + Math.sin(angle) * (0.35 + (i % 2) * 0.55);
    const tipped = i === count - 1 && count > 3;
    const yaw = random() * Math.PI * 2;
    b.addRaw(
      jar,
      // 复用无石砖纹理的高粗糙度、低金属度材质，使陶器与铜箍明确区分。
      "pearlReef",
      px,
      floor + 0.33 + (tipped ? 0.3 : 0),
      pz,
      tipped ? [0, yaw, 1.35] : [0, yaw, 0],
    );
    if (!tipped)
      for (const side of [-1, 1])
        b.addRaw(handle, "pearlReef", px, floor + 0.33, pz, [
          0,
          yaw + (side < 0 ? Math.PI : 0),
          0,
        ]);
  }
  // 残片:半只瓶壳侧卧在瓶座边。
  const shard = cachedGeometry("exploration_amphora_shard_v2", () => {
    const points = [
      [0.02, 0],
      [0.4, 0.2],
      [0.55, 0.6],
      [0.42, 1.0],
    ].map(([px, py]) => new THREE.Vector2(px, py));
    const g = new THREE.LatheGeometry(points, 12, 0, Math.PI * 0.9);
    paintStone(g, { base: "#a57e68", algaeAmount: 0.2, seed: 93 });
    return g;
  });
  b.addRaw(shard, "pearlReef", x + 1.9, floor + 0.54, z + 1.1, [
    1.45,
    random() * 2,
    0.4,
  ]);
  b.colliders.push({
    type: "box",
    kind: "exploration_furniture",
    x,
    y: floor + 1.1,
    z,
    halfSize: { x: 1.7, y: 1.1, z: 1.3 },
  });
}

/** 缓存不可变成品；住宅批次只烘焙世界变换，不为每幢房屋重雕同一单品。 */
function furniturePrototype(item) {
  const variant = (((item.seed ?? 9151) % 4) + 4) % 4;
  const count = item.kind === "amphora" ? (item.count ?? 3) : 0;
  const key = `${item.kind}:${count}:${variant}`;
  if (FURNITURE_PROTOTYPES.has(key)) return FURNITURE_PROTOTYPES.get(key);
  const colliders = [],
    builder = new FurnitureBuilder(colliders);
  if (item.kind === "bench") stoneBench(builder, 0, 0, 0);
  else if (item.kind === "table") stoneTable(builder, 0, 0, 0);
  else if (item.kind === "chest") storageChest(builder, 0, 0, 0);
  else if (item.kind === "amphora")
    amphoraCluster(builder, 0, 0, 0, count, 9151 + variant);
  else throw new Error(`Unsupported furniture kind: ${item.kind}`);
  const parent = new THREE.Group(),
    owned = new Set();
  const parts = builder.bucket
    .build(atlantisMaterials(), parent, owned)
    .map((mesh) => ({
      geometry: mesh.geometry,
      material: mesh.name.slice("atlantis_".length),
    }));
  const bounds = new THREE.Box3();
  for (const part of parts) {
    part.geometry.computeBoundingBox();
    bounds.union(part.geometry.boundingBox);
  }
  const prototype = { parts, colliders, bounds };
  FURNITURE_PROTOTYPES.set(key, prototype);
  return prototype;
}

/** 局部碰撞与可见网格使用相同的旋转、缩放和世界原点。 */
function placePrototype(builder, prototype, item) {
  const scale = item.scale ?? 1,
    yaw = item.yaw ?? 0;
  const quaternion = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    yaw,
  );
  for (const part of prototype.parts)
    builder.bucket.add(part.geometry, part.material, {
      position: [item.x, item.floor, item.z],
      quaternion: quaternion.toArray(),
      scale,
    });
  for (const source of prototype.colliders) {
    const position = new THREE.Vector3(source.x, source.y, source.z)
      .multiplyScalar(scale)
      .applyQuaternion(quaternion)
      .add(new THREE.Vector3(item.x, item.floor, item.z));
    const rotation = quaternion.clone();
    if (source.rotation)
      rotation.multiply(
        new THREE.Quaternion(
          source.rotation.x,
          source.rotation.y,
          source.rotation.z,
          source.rotation.w,
        ),
      );
    builder.colliders.push({
      ...source,
      x: position.x,
      y: position.y,
      z: position.z,
      halfSize: {
        x: source.halfSize.x * scale,
        y: source.halfSize.y * scale,
        z: source.halfSize.z * scale,
      },
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
    });
  }
}

/** 散落器物:碗、小罐、盘,实例化散布;小件不加碰撞。 */
function scatterPieces(transforms, seed) {
  const random = seededRandom(seed);
  const bowl = cachedGeometry("exploration_scatter_bowl", () => {
    const g = new THREE.LatheGeometry(
      [
        [0, 0],
        [0.32, 0.06],
        [0.46, 0.22],
        [0.4, 0.36],
      ].map(([px, py]) => new THREE.Vector2(px, py)),
      14,
    );
    paintStone(g, { base: "#9c816a", algaeAmount: 0.2, seed: 77 });
    return g;
  });
  const jug = cachedGeometry("exploration_scatter_jug", () => {
    const g = new THREE.LatheGeometry(
      [
        [0, 0],
        [0.26, 0.04],
        [0.38, 0.4],
        [0.3, 0.66],
        [0.16, 0.78],
        [0.2, 0.88],
      ].map(([px, py]) => new THREE.Vector2(px, py)),
      12,
    );
    paintStone(g, { base: "#a08b70", algaeAmount: 0.22, seed: 79 });
    return g;
  });
  const disc = cachedGeometry("exploration_scatter_disc", () => {
    const g = new THREE.CylinderGeometry(0.5, 0.58, 0.15, 14);
    paintStone(g, { base: "#b9b7a6", algaeAmount: 0.24, seed: 78 });
    return g;
  });
  const geometries = [bowl, jug, disc];
  const buckets = geometries.map(() => []);
  for (const t of transforms) buckets[Math.floor(random() * 3)].push(t);
  const meshes = [];
  buckets.forEach((bucket, i) => {
    if (!bucket.length) return;
    const mesh = new THREE.InstancedMesh(
      geometries[i],
      atlantisMaterials().bronze,
      bucket.length,
    );
    mesh.name = `exploration_scatter_${i}`;
    const dummy = new THREE.Object3D();
    bucket.forEach((t, index) => {
      // 倾倒件绕底缘翻转,重心下沉,避免悬浮。
      dummy.position.set(t.x, t.y - (t.tipped ? 0.14 : 0), t.z);
      dummy.rotation.set(t.tipped ? 1.45 : 0, t.yaw, 0);
      dummy.scale.setScalar(t.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    meshes.push(mesh);
  });
  return meshes;
}

/*********************************************
 * 布置表:港湾厅堂成组陈设(坐标避让既有家具,掉落记入 stats.dropped)
 *********************************************/

function planGroups(site) {
  const lower = site.levels[1].floorY,
    upper = site.levels[0].floorY;
  const origin = siteOrigin(site);
  return [
    // 下厅东北角:宴会角——圆桌、对凳、续排双箱(避开柱础与竖井护圈)。
    { kind: "table", x: 21.2, floor: lower, z: 19.6 },
    { kind: "bench", x: 24.8, floor: lower, z: 19, yaw: 0 },
    { kind: "bench", x: 17.8, floor: lower, z: 19, yaw: 0 },
    { kind: "chest", x: 8.8, floor: lower, z: 21.6, yaw: 0 },
    { kind: "chest", x: 25.5, floor: lower, z: 21.5, yaw: 0 },
    // 下厅西南角:贝珠壁龛旁的落货——瓶群、单箱。
    { kind: "amphora", x: -16, floor: lower, z: -22.2, count: 5, seed: 87 },
    { kind: "chest", x: -12, floor: lower, z: -20.2, yaw: 0 },
    // 上层展厅西北角:对弈角——圆桌、双凳与单箱。
    { kind: "table", x: -30, floor: upper, z: 15 },
    { kind: "bench", x: -30, floor: upper, z: 18.4, yaw: 0 },
    { kind: "bench", x: -28.5, floor: upper, z: 12.5, yaw: 0 },
    { kind: "chest", x: -31, floor: upper, z: 10.5, yaw: 0 },
  ].map((item) => ({ ...item, x: origin.x + item.x, z: origin.z + item.z }));
}

/** 散落器物点位:围绕陈设组与南墙根,全部贴地、避开通道。 */
function planScatter(site, random) {
  const lower = site.levels[1].floorY,
    upper = site.levels[0].floorY;
  const spots = [];
  const rings = [
    { x: 19, z: 18.6, floor: lower, r: 3.6, n: 6 },
    { x: -14, z: -21.4, floor: lower, r: 3.8, n: 7 },
    { x: -29.5, z: 14.5, floor: upper, r: 3.6, n: 5 },
  ];
  for (const ring of rings)
    for (let i = 0; i < ring.n; i += 1) {
      const a = random() * Math.PI * 2;
      const r = ring.r * (0.55 + random() * 0.6);
      spots.push({
        x: ring.x + Math.cos(a) * r,
        y: ring.floor + 0.04,
        z: ring.z + Math.sin(a) * r,
        yaw: random() * Math.PI * 2,
        tipped: random() > 0.72,
        scale: 0.8 + random() * 0.5,
      });
    }
  // 南墙根一线零星器物。
  for (let i = 0; i < 6; i += 1) {
    const x = -7 + random() * 22;
    spots.push({
      x,
      y: lower + 0.04,
      z: -23.5 + random() * 1.6,
      yaw: random() * Math.PI * 2,
      tipped: random() > 0.6,
      scale: 0.75 + random() * 0.5,
    });
  }
  const origin = siteOrigin(site);
  return spots.map((spot) => ({
    ...spot,
    x: origin.x + spot.x,
    z: origin.z + spot.z,
  }));
}

/** 托盘完整占地采样，石质基座从最低海床埋入并托至最高点。 */
function facadeFooting(heightAt, x, z) {
  let min = Infinity,
    max = -Infinity;
  for (let ix = 0; ix <= 12; ix += 1)
    for (let iz = 0; iz <= 10; iz += 1) {
      const y = heightAt(x + (ix / 12 - 0.5) * 3.4, z + (iz / 10 - 0.5) * 2.6);
      min = Math.min(min, y);
      max = Math.max(max, y);
    }
  return { bottom: min - 0.1, floor: max + 0.02 };
}

/**
 * 创建探索家具陈设切片。
 * @param {THREE.Object3D} parent 场景父节点(城市根节点)。
 * @param {object} options
 * @param {function} options.heightAt 共享海床高度(街区立面墙脚贴地用)。
 * @param {object} [options.site] 挖掘场地元数据,默认 ATLANTIS_EXCAVATION_SITES[0]。
 * @param {object[]} [options.hostColliders] 厅堂既有碰撞,用于避让既有陈设。
 * @param {object[]} [options.facades] 可选墙面锚点；center{x,z} 为真实墙面点，normal{x,z} 为朝街道法线。
 * @param {number} [options.seed] 布置随机种子。
 * @param {object[]} [options.groups] 可选世界坐标陈设表；省略时采用港湾布局。
 * @param {object[]} [options.scatter] 可选散落器物表；省略时采用港湾布局。
 * @returns {object} root、colliders、lightSources、landmarks、update、dispose、stats。
 */
export function createAtlantisExplorationFurniture(
  parent,
  {
    heightAt,
    site,
    hostColliders = [],
    facades = [],
    seed = 9151,
    groups,
    scatter,
    customLayout = false,
  } = {},
) {
  if (!parent?.add || typeof heightAt !== "function")
    throw new Error(
      "Exploration furniture requires a parent and height function",
    );
  const SITE = customLayout ? null : (site ?? ATLANTIS_EXCAVATION_SITES[0]);
  const root = new THREE.Group();
  root.name = "atlantis_exploration_furniture";
  parent.add(root);
  const owned = new Set(),
    colliders = [],
    landmarks = [],
    lightSources = [];
  const random = seededRandom(seed);
  const zones = SITE ? keepOuts(SITE) : [];
  const b = new FurnitureBuilder(colliders);
  const dropped = [];
  const placedGroups = [];
  const placed = { bench: 0, table: 0, chest: 0, amphora: 0 };

  // 宿主快照索引不污染集成方稍后仍在追加的城市碰撞数组。
  const hostGrid = createStaticColliderGrid([...hostColliders]);
  const queryHosts = (min, max) => [...hostGrid.query(min, max), ...colliders];
  const EXTENTS = {
    bench: { halfX: 1.8, halfZ: 0.68, height: 1.5 },
    table: { halfX: 1.38, halfZ: 1.38, height: 1.7 },
    chest: { halfX: 1.36, halfZ: 0.94, height: 2.4 },
    amphora: { halfX: 1.7, halfZ: 1.5, height: 2.4 },
  };
  function canPlace(kind, x, floor, z, bottom = floor, yaw = 0, scale = 1) {
    const extent = EXTENTS[kind];
    const c = Math.abs(Math.cos(yaw)),
      s = Math.abs(Math.sin(yaw));
    const box = furnitureBox(
      (extent.halfX * c + extent.halfZ * s) * 2 * scale,
      floor + extent.height * scale - bottom,
      (extent.halfX * s + extent.halfZ * c) * 2 * scale,
      x,
      (bottom + floor + extent.height * scale) / 2,
      z,
    );
    return !blockedByKeepOut(zones, box) && !overlapsHost(queryHosts, box);
  }
  function canPlaceGroup(item) {
    if (!customLayout)
      return canPlace(
        item.kind,
        item.x,
        item.floor,
        item.z,
        item.floor,
        item.yaw ?? 0,
      );
    const { bounds } = furniturePrototype(item);
    const scale = item.scale ?? 1,
      yaw = item.yaw ?? 0;
    const q = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      yaw,
    );
    const size = bounds.getSize(new THREE.Vector3()).multiplyScalar(scale);
    const center = bounds
      .getCenter(new THREE.Vector3())
      .multiplyScalar(scale)
      .applyQuaternion(q)
      .add(new THREE.Vector3(item.x, item.floor, item.z));
    const box = furnitureBox(
      size.x,
      size.y,
      size.z,
      center.x,
      center.y,
      center.z,
      yaw,
    );
    return !overlapsHost(queryHosts, box);
  }
  for (const item of groups ?? (SITE ? planGroups(SITE) : [])) {
    if (!canPlaceGroup(item)) {
      dropped.push({
        id: item.id,
        kind: item.kind,
        x: item.x,
        z: item.z,
        reason: "keepout_or_host",
      });
      continue;
    }
    if (customLayout) placePrototype(b, furniturePrototype(item), item);
    else if (item.kind === "bench")
      stoneBench(b, item.x, item.floor, item.z, item.yaw ?? 0);
    else if (item.kind === "table") stoneTable(b, item.x, item.floor, item.z);
    else if (item.kind === "chest")
      storageChest(b, item.x, item.floor, item.z, item.yaw ?? 0);
    else if (item.kind === "amphora")
      amphoraCluster(b, item.x, item.floor, item.z, item.count, item.seed);
    placed[item.kind] += 1;
    placedGroups.push({ ...item });
  }

  // facade.center 是真实墙面上的点；normal 为指向街道的世界 XZ 法线。
  // 按托盘投影留出墙面净距，无论朝向都不能让基座嵌入立面。
  for (const facade of facades ?? []) {
    const normal = new THREE.Vector2(facade.normal.x, facade.normal.z);
    if (!normal.lengthSq()) continue;
    normal.normalize();
    const offset = Math.abs(normal.x) * 1.7 + Math.abs(normal.y) * 1.5 + 0.6;
    let placement = null;
    // 柱脚和地基可以突出于墙面；有限向外退让后仍须通过同一实体/游线检测。
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const distance = offset + attempt * 0.6;
      const x = facade.center.x + normal.x * distance;
      const z = facade.center.z + normal.y * distance;
      const footing = facadeFooting(heightAt, x, z);
      if (!canPlace("amphora", x, footing.floor, z, footing.bottom)) continue;
      placement = { x, z, ...footing };
      break;
    }
    if (!placement) {
      dropped.push({
        kind: "amphora",
        x: facade.center.x,
        z: facade.center.z,
        reason: "keepout_or_host",
      });
      continue;
    }
    const { x: fx, z: fz, ...footing } = placement;
    const height = footing.floor - footing.bottom;
    b.box("stone", 3.4, height, 2.6, fx, footing.bottom + height / 2, fz, {
      solid: true,
      tint: "#97a79e",
    });
    amphoraCluster(b, fx, footing.floor, fz, 3, seed + 17);
    placed.amphora += 1;
  }

  // 散落器物(视觉小件,实例化,无碰撞);连同本组新碰撞一起避让。
  const scatterTransforms = (
    scatter ?? (SITE ? planScatter(SITE, random) : [])
  ).filter((t) => {
    const box = furnitureBox(1, 0.5, 1, t.x, t.y + 0.25, t.z);
    return !blockedByKeepOut(zones, box) && !overlapsHost(queryHosts, box);
  });
  const scatterMeshes = scatterPieces(scatterTransforms, seed + 3);

  b.bucket.build(atlantisMaterials(), root, owned);
  for (const mesh of scatterMeshes) {
    root.add(mesh);
    owned.add({ dispose: () => mesh.dispose() });
  }
  for (const mesh of root.children) {
    if (!mesh.isMesh && !mesh.isInstancedMesh) continue;
    mesh.receiveShadow = true;
    mesh.geometry.computeBoundingSphere();
  }

  if (SITE) {
    const origin = siteOrigin(SITE);
    landmarks.push(
      {
        id: "furniture_lower_hall_banquet",
        position: new THREE.Vector3(
          origin.x + 21.2,
          SITE.levels[1].floorY + 2,
          origin.z + 19.6,
        ),
      },
      {
        id: "furniture_upper_gallery_corner",
        position: new THREE.Vector3(
          origin.x - 29,
          SITE.levels[0].floorY + 2,
          origin.z + 15,
        ),
      },
    );
  }

  const triangles =
    [...owned].reduce((sum, resource) => {
      if (resource.attributes?.position)
        return (
          sum +
          (resource.index?.count ?? resource.attributes.position.count) / 3
        );
      return sum;
    }, 0) +
    scatterMeshes.reduce(
      (sum, mesh) =>
        sum +
        ((mesh.geometry.index?.count ??
          mesh.geometry.attributes.position.count) *
          mesh.count) /
          3,
      0,
    );
  const stats = {
    site: SITE?.id ?? "custom_furnishing_batch",
    placed,
    dropped,
    placedGroups,
    scatter: scatterTransforms.length,
    colliders: colliders.length,
    triangles: Math.round(triangles),
  };
  root.userData.furnitureStats = stats;
  const centerX = SITE ? (SITE.bounds.minX + SITE.bounds.maxX) / 2 : 0,
    centerZ = SITE ? (SITE.bounds.minZ + SITE.bounds.maxZ) / 2 : 0;
  let disposed = false;
  return {
    root,
    colliders,
    lightSources,
    landmarks,
    stats,
    update(time, dt, position, highQuality = true) {
      if (disposed) return;
      root.visible =
        !SITE ||
        !position ||
        Math.hypot(centerX - position.x, centerZ - position.z) <
          (highQuality ? 400 : 330);
      void time;
      void dt;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      parent.remove(root);
      for (const resource of owned) resource.dispose();
      owned.clear();
      root.clear();
      colliders.length = lightSources.length = landmarks.length = 0;
    },
  };
}

/**
 * 复用已验收的雕刻家具，按调用方给出的世界坐标批量组装。
 * @param {THREE.Object3D} parent 父场景。
 * @param {object} options groups 陈设清单、heightAt 支撑采样和 hostColliders 实体避让。
 * @returns {object} 与探索家具相同的碰撞、统计及幂等生命周期接口。
 */
export function createAtlantisFurnitureBatch(parent, options = {}) {
  return createAtlantisExplorationFurniture(parent, {
    ...options,
    customLayout: true,
    facades: [],
    scatter: [],
  });
}
