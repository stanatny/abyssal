import * as THREE from "three";
import {
  MergeBucket,
  atlantisMaterials,
  cachedGeometry,
  loftGeometry,
  paintStone,
  seededRandom,
} from "./atlantis_art_geometry.js";
import { pearlHabitat } from "./atlantis_pearl.js";
import { ATLANTIS_EXCAVATION_SITES } from "./atlantis_terrain.js";

// 本模块由 ATLANTIS_EXCAVATION_SITES[0] 的不可变元数据驱动装配;
// 可见体与碰撞体同尺寸同变换,colliders 数组装配完成后不再改动。
const SITE = ATLANTIS_EXCAVATION_SITES[0];
const UPPER = SITE.levels[0]; // 上层展厅:楼板顶 -156,顶板底 -135.5
const LOWER = SITE.levels[1]; // 下层正厅:坑底 -194,楼板底 -158
const ROOF_TOP = -133;
const WALL_BOTTOM = LOWER.floorY - 4; // 墙脚埋入坑底以下
const WALL_N = -224.5; // 北墙内面(墙厚 4.5m,压住高侧坑缘土坡)
const WALL_S = -273.5; // 南墙内面(墙厚 2.5m)
const WALL_W = -247.5; // 西墙内面(墙厚 4.5m)
const WALL_E = -180.5; // 东墙内面(墙厚 2.5m)
const STAIR = SITE.entrance; // 塌口大台阶
const SHAFT = SITE.shaft; // 中央开阔竖井
const PORTAL = SITE.secondExit; // 南墙拱门(第二出口)

/**
 * 在港湾圣所预留区装配双层下沉厅堂:北缘塌口大台阶下行到上层展厅,
 * 中央开阔竖井贯通到下层正厅,南墙拱门为第二出口,屋面南缘塌口可翻越
 * 返回街面,构成连续往返环线。厅堂本体全部在挖掘坑内,屋面与原有
 * 圣所下廊地面大致齐平,东南两侧顺坡露出立面。
 * @param {THREE.Object3D} parent 场景父节点(城市根节点)。
 * @param {{heightAt:function}} options 共享海床高度(已含挖掘剖面)。
 * @returns {object} root、colliders、obstacles、landmarks、lightSources、records、stats、update、dispose。
 */
export function createAtlantisHarborRuins(parent, { heightAt } = {}) {
  if (!parent?.add || typeof heightAt !== "function")
    throw new Error("Harbor sunken halls require a parent and height function");
  const root = new THREE.Group();
  root.name = "atlantis_harbor_sunken_halls";
  parent.add(root);
  const owned = new Set(),
    colliders = [],
    obstacles = [],
    landmarks = [],
    lightSources = [];
  const b = new HallBuilder(colliders);

  buildWalls(b);
  buildRoof(b);
  buildUpperSlab(b);
  buildColumns(b);
  buildEntranceStair(b, heightAt);
  buildSouthPortal(b);
  buildInteriorDressing(b);
  buildFurniture(b);
  buildPearlNiches(b, lightSources);

  b.bucket.build(atlantisMaterials(), root, owned);
  for (const mesh of root.children) {
    mesh.receiveShadow = true;
    mesh.geometry.computeBoundingSphere();
  }

  landmarks.push(
    {
      id: "harbor_ruins_entrance",
      position: new THREE.Vector3(STAIR.top.x, STAIR.top.y + 2, STAIR.top.z),
    },
    {
      id: "harbor_ruins_shaft",
      position: new THREE.Vector3((SHAFT.minX + SHAFT.maxX) / 2, -160, -247),
    },
    {
      id: "harbor_ruins_lower_hall",
      position: new THREE.Vector3(
        SITE.turningCircle.x,
        SITE.turningCircle.y,
        SITE.turningCircle.z,
      ),
    },
  );
  // 室内鱼群沿真实墙体避障，不能用整栋包围球把两层水域都排除掉。

  const stats = {
    site: SITE.id,
    meshes: owned.size,
    colliders: colliders.length,
    triangles: [...owned].reduce(
      (sum, geometry) => sum + geometry.attributes.position.count / 3,
      0,
    ),
    levels: SITE.levels.length,
    pearls: 2,
  };
  root.userData.harborRuinsStats = stats;
  let disposed = false;
  return {
    root,
    colliders,
    obstacles,
    landmarks,
    lightSources,
    records: SITE.routes,
    stats,
    update(time, dt, position, highQuality = true) {
      if (disposed) return;
      root.visible =
        !position ||
        Math.hypot(-215 - position.x, -248 - position.z) <
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
        lightSources.length =
          0;
    },
  };
}

/*********************************************
 * 装配工具:可见体与碰撞共用尺寸与变换
 *********************************************/

class HallBuilder {
  constructor(colliders) {
    this.bucket = new MergeBucket();
    this.colliders = colliders;
    this.ordinal = 0;
  }
  add(geometry, material, x, y, z, options = {}) {
    const { quaternion = null, tint = null, tile = null } = options;
    paintStone(geometry, {
      base:
        tint ??
        (material === "bronze"
          ? "#668b84"
          : material === "marble"
            ? "#d3d2bc"
            : "#a6b7ae"),
      algaeAmount: material === "stone" ? 0.26 : 0.14,
      seed: 547 + this.ordinal++,
    });
    this.bucket.add(geometry, material, {
      position: [x, y, z],
      quaternion,
      tile: tile ?? (material === "stone" ? 11 : 18),
    });
    geometry.dispose();
  }
  /** 直接并入已带顶点色的构件(贝珠壳体等),不再做石材着色。 */
  addRaw(geometry, materialKey, x, y, z, euler = null) {
    this.bucket.add(geometry, materialKey, { position: [x, y, z], euler });
  }
  box(material, w, h, d, x, y, z, options = {}) {
    const {
      solid = true,
      quaternion = null,
      kind = "harbor_ruin_masonry",
      tint = null,
    } = options;
    this.add(new THREE.BoxGeometry(w, h, d), material, x, y, z, {
      quaternion,
      tint,
    });
    if (solid) {
      const collider = {
        type: "box",
        kind,
        x,
        y,
        z,
        halfSize: { x: w / 2, y: h / 2, z: d / 2 },
      };
      if (quaternion)
        collider.rotation = {
          x: quaternion[0],
          y: quaternion[1],
          z: quaternion[2],
          w: quaternion[3],
        };
      this.colliders.push(collider);
    }
  }
  /** 凹槽柱:方础、放样柱身、环形箍与柱头板;胶囊碰撞与柱身同位。 */
  column(x, z, floorY, topY, radius) {
    const height = topY - floorY;
    this.box("marble", radius * 3, 1, radius * 3, x, floorY + 0.5, z, {
      kind: "harbor_ruin_column",
    });
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
      { radial: 20, subdivision: 0.4, capStart: true, capEnd: true },
    );
    this.add(shaft, "marble", x, floorY + 1, z);
    this.colliders.push({
      type: "capsule",
      kind: "harbor_ruin_column",
      a: { x, y: floorY + radius, z },
      b: { x, y: topY - 1 - radius, z },
      radius: radius * 1.05,
    });
    this.box("marble", radius * 3, 1, radius * 3, x, topY - 0.5, z, {
      kind: "harbor_ruin_column",
    });
    for (const dy of [1.6, height - 1.6])
      this.add(
        new THREE.CylinderGeometry(radius * 1.16, radius * 1.22, 0.45, 20),
        "marble",
        x,
        floorY + dy,
        z,
      );
  }
}

/*********************************************
 * 围合墙体:北墙让出台阶通道,南墙开第二出口拱门
 *********************************************/

function buildWalls(b) {
  const top = UPPER.ceilingY;
  const height = top - WALL_BOTTOM;
  const y = WALL_BOTTOM + height / 2;
  // 北墙入口与屋面同宽，背墙低于斜板最深一侧，不让实心墙顶伸进台阶。
  const entry = STAIR.roofOpening;
  for (const [left, right] of [
    [-252, entry.minX],
    [entry.maxX, -178],
  ])
    b.box("stone", right - left, height, 4.5, (left + right) / 2, y, -222.25);
  const stairSlope =
    (STAIR.bottom.y - STAIR.top.y) / (STAIR.bottom.z - STAIR.top.z);
  const backTop = STAIR.top.y + (WALL_N - STAIR.top.z) * stairSlope - 1.8;
  b.box(
    "stone",
    entry.maxX - entry.minX,
    backTop - WALL_BOTTOM,
    4.5,
    STAIR.top.x,
    (backTop + WALL_BOTTOM) / 2,
    -222.25,
    { kind: "harbor_ruin_masonry" },
  ); // 台阶背墙
  // 南墙(2.5m 厚):拱门开口 x∈[-222,-208]、y∈[-156,-142]
  b.box("stone", 30, height, 2.5, -237, y, -274.75); // 西段
  b.box("stone", 30, height, 2.5, -193, y, -274.75); // 东段
  b.box(
    "stone",
    14,
    -156 - WALL_BOTTOM,
    2.5,
    -215,
    (-156 + WALL_BOTTOM) / 2,
    -274.75,
  ); // 门坎下段
  b.box("stone", 14, top - -142, 2.5, -215, (top + -142) / 2, -274.75); // 门楣
  // 西墙(4.5m 厚)与东墙(2.5m 厚)整面
  b.box("stone", 4.5, height, 56, -249.75, y, -248);
  b.box("stone", 2.5, height, 56, -179.25, y, -248);
  // 墙顶内饰线脚(视觉,贴面不出碰撞)
  for (const ledgeY of [-160.2, -137.6]) {
    b.box("marble", 67, 1.6, 1.1, -214, ledgeY, WALL_N - 0.55, {
      solid: false,
    });
    b.box("marble", 67, 1.6, 1.1, -214, ledgeY, WALL_S + 0.55, {
      solid: false,
    });
    b.box("marble", 1.1, 1.6, 49, WALL_W + 0.55, ledgeY, -249, {
      solid: false,
    });
    b.box("marble", 1.1, 1.6, 49, WALL_E - 0.55, ledgeY, -249, {
      solid: false,
    });
  }
}

/*********************************************
 * 屋面顶板:独立静态盒,北缘台阶塌口 + 中央竖井 + 南缘翻越塌口
 *********************************************/

function buildRoof(b) {
  const h = ROOF_TOP - UPPER.ceilingY; // 2.5
  const y = (ROOF_TOP + UPPER.ceilingY) / 2;
  // 开口按元数据切分，可见屋板与实体同时避开整段台阶及成年转向竖井。
  const bounds = { minX: -253.5, maxX: -176.5, minZ: -277.5, maxZ: -218.5 };
  const openings = [
    STAIR.roofOpening,
    SHAFT,
    { minX: -222, maxX: -206, minZ: -277.5, maxZ: -273 },
  ];
  const xs = [
    ...new Set([
      bounds.minX,
      bounds.maxX,
      ...openings.flatMap((o) => [o.minX, o.maxX]),
    ]),
  ].sort((a, b) => a - b);
  const zs = [
    ...new Set([
      bounds.minZ,
      bounds.maxZ,
      ...openings.flatMap((o) => [o.minZ, o.maxZ]),
    ]),
  ].sort((a, b) => a - b);
  for (let ix = 1; ix < xs.length; ix++)
    for (let iz = 1; iz < zs.length; iz++) {
      const x = (xs[ix - 1] + xs[ix]) / 2,
        z = (zs[iz - 1] + zs[iz]) / 2;
      if (
        openings.some(
          (o) => x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ,
        )
      )
        continue;
      b.box("stone", xs[ix] - xs[ix - 1], h, zs[iz] - zs[iz - 1], x, y, z, {
        kind: "harbor_ruin_roof",
      });
    }
  // 竖井在屋面层的井口与楼板层同口对齐;井缘残件与断门标记开口。
  const stubs = [
    [SHAFT.minX - 1.5, SHAFT.minZ - 0.8, 2.6, 1.1],
    [SHAFT.maxX + 1.5, SHAFT.minZ - 0.8, 2.6, 0.8],
    [SHAFT.minX - 1.5, SHAFT.maxZ + 0.8, 2.6, 1.4],
    [SHAFT.maxX + 1.5, SHAFT.maxZ + 0.8, 2.6, 0.9],
    [SHAFT.minX - 0.8, -247, 1.1, 2.2],
    [SHAFT.maxX + 0.8, -247, 1.1, 1.6],
  ];
  for (const [x, z, w, hh] of stubs)
    b.box("marble", w, hh, 1.1, x, ROOF_TOP + hh / 2, z, {
      kind: "harbor_ruin_roof",
    });
  // 井口北侧的断门残框(立于井缘之外,不遮挡竖井)
  b.box("marble", 1.6, 6, 1.6, SHAFT.minX - 1, ROOF_TOP + 3, SHAFT.maxZ + 1, {
    kind: "harbor_ruin_roof",
  });
  b.box("marble", 1.6, 6, 1.6, SHAFT.maxX + 1, ROOF_TOP + 3, SHAFT.maxZ + 1, {
    kind: "harbor_ruin_roof",
  });
  b.box(
    "marble",
    SHAFT.maxX - SHAFT.minX + 3.6,
    1.6,
    1.6,
    (SHAFT.minX + SHAFT.maxX) / 2,
    ROOF_TOP + 6.8,
    SHAFT.maxZ + 1,
    {
      kind: "harbor_ruin_roof",
    },
  );
  // 南缘与东缘的断续栏墙(南缘塌口 x∈[-222,-206] 留空)
  for (const [x0, x1] of [
    [-253, -248],
    [-243, -237],
    [-232, -226],
    [-200, -194],
    [-190, -180],
  ])
    b.box("marble", x1 - x0, 1.1, 0.8, (x0 + x1) / 2, ROOF_TOP + 0.55, -276.9, {
      kind: "harbor_ruin_roof",
    });
  for (const [z0, z1] of [
    [-272, -266],
    [-258, -252],
    [-236, -230],
  ])
    b.box("marble", 0.8, 1.1, z1 - z0, -177.1, ROOF_TOP + 0.55, (z0 + z1) / 2, {
      kind: "harbor_ruin_roof",
    });
  // 屋面翻起与碎裂的铺板(视觉),避免一整块平板的空旷感。
  const random = seededRandom(6201);
  for (let i = 0; i < 12; i++) {
    const x = -248 + random() * 66;
    const z = -272 + random() * 48;
    if (
      (x > SHAFT.minX - 2 &&
        x < SHAFT.maxX + 2 &&
        z > SHAFT.minZ - 2 &&
        z < SHAFT.maxZ + 2) ||
      (x > STAIR.roofOpening.minX - 2 &&
        x < STAIR.roofOpening.maxX + 2 &&
        z > STAIR.roofOpening.minZ - 2)
    )
      continue;
    b.box(
      "stone",
      2.5 + random() * 2.5,
      0.5,
      1.8 + random() * 2,
      x,
      ROOF_TOP + 0.22,
      z,
      { solid: false, tint: "#93a69e" },
    );
  }
}

/*********************************************
 * 上层楼板:独立静态盒,中央开竖井口
 *********************************************/

function buildUpperSlab(b) {
  const y = (UPPER.floorY + LOWER.ceilingY) / 2; // -157
  const h = UPPER.floorY - LOWER.ceilingY; // 2
  const frame = [
    [WALL_W, SHAFT.minX, WALL_S, WALL_N], // 西大片
    [SHAFT.maxX, WALL_E, WALL_S, WALL_N], // 东条
    [SHAFT.minX, SHAFT.maxX, WALL_S, SHAFT.minZ], // 南条
    [SHAFT.minX, SHAFT.maxX, SHAFT.maxZ, WALL_N], // 北条
  ];
  for (const [x0, x1, z0, z1] of frame)
    b.box("stone", x1 - x0, h, z1 - z0, (x0 + x1) / 2, y, (z0 + z1) / 2, {
      kind: "harbor_ruin_deck",
    });
  // 井口大理石缘饰(视觉,贴楼板顶面)
  for (const [x, z, w, d] of [
    [
      (SHAFT.minX + SHAFT.maxX) / 2,
      SHAFT.minZ - 0.4,
      SHAFT.maxX - SHAFT.minX + 1.6,
      0.8,
    ],
    [
      (SHAFT.minX + SHAFT.maxX) / 2,
      SHAFT.maxZ + 0.4,
      SHAFT.maxX - SHAFT.minX + 1.6,
      0.8,
    ],
    [SHAFT.minX - 0.4, -247, 0.8, SHAFT.maxZ - SHAFT.minZ + 1.6],
    [SHAFT.maxX + 0.4, -247, 0.8, SHAFT.maxZ - SHAFT.minZ + 1.6],
  ])
    b.box("marble", w, 0.5, d, x, UPPER.floorY + 0.25, z, { solid: false });
  // 楼板底檐口(视觉)与墙顶牛腿共同把跨板读成被支承的结构。
  for (const x of [-240, -228, -216, -204, -192, -184]) {
    b.box("stone", 2.2, 1.4, 1.6, x, LOWER.ceilingY + 0.9, WALL_N + 0.8, {
      kind: "harbor_ruin_corbel",
    });
    b.box("stone", 2.2, 1.4, 1.6, x, LOWER.ceilingY + 0.9, WALL_S - 0.8, {
      kind: "harbor_ruin_corbel",
    });
  }
  for (const z of [-268, -258, -238, -228]) {
    b.box("stone", 1.6, 1.4, 2.2, WALL_W + 0.8, LOWER.ceilingY + 0.9, z, {
      kind: "harbor_ruin_corbel",
    });
    b.box("stone", 1.6, 1.4, 2.2, WALL_E - 0.8, LOWER.ceilingY + 0.9, z, {
      kind: "harbor_ruin_corbel",
    });
  }
}

/*********************************************
 * 柱网:上下两层对位,竖井由柱列框出;西半厅保持无柱回转区
 *********************************************/

function buildColumns(b) {
  // 原柱网占据回转圆及出口斜线；改为沿墙的两排柱廊，保留连续室内水域。
  for (const x of [-241, -202, -184])
    for (const z of [-228, -269.5]) {
      b.column(x, z, LOWER.floorY, LOWER.ceilingY, 1.5);
      b.column(x, z, UPPER.floorY, UPPER.ceilingY, 1.2);
    }
}

/*********************************************
 * 北缘塌口大台阶:街面 → 上层展厅
 *********************************************/

function buildEntranceStair(b, heightAt) {
  const top = STAIR.top,
    bottom = STAIR.bottom;
  const run = Math.hypot(bottom.z - top.z, bottom.y - top.y);
  const quaternion = new THREE.Quaternion()
    .setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      -Math.atan2(top.y - bottom.y, top.z - bottom.z),
    )
    .toArray();
  const cx = (top.x + bottom.x) / 2,
    cy = (top.y + bottom.y) / 2,
    cz = (top.z + bottom.z) / 2;
  // 坡道碰撞与可见基底共面同向;台阶踏步只做视觉。
  b.box("stone", 19, 1.4, run + 2.5, cx, cy - 0.55, cz, {
    quaternion,
    kind: "harbor_ruin_stair",
  });
  const steps = 40;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const z = top.z + (bottom.z - top.z) * t;
    const y = top.y + (bottom.y - top.y) * t;
    // 缺口与错缝让台阶读作坍塌后的残段,而非新建梯段。
    const chip = i % 7 === 3 ? 0.82 : 1;
    b.box(
      "marble",
      19 * chip,
      0.34,
      1.0,
      cx - (19 * (1 - chip)) / 2,
      y + 0.12,
      z,
      {
        solid: false,
      },
    );
  }
  // 两侧护墙顺坡而下,压住沟槽两侧的切土边。
  for (const side of [-1, 1])
    b.box("stone", 0.9, 2.6, run + 2.5, cx + side * 9.8, cy + 1.25, cz, {
      quaternion,
      kind: "harbor_ruin_stair",
    });
  // 沟槽唇口的门柱与过梁,从原海床标出明确入口。
  const lipY = STAIR.top.y,
    gateHeight = STAIR.gateClearHeight;
  for (const side of [-1, 1])
    b.box(
      "marble",
      1.6,
      gateHeight,
      1.6,
      cx + side * 9.3,
      lipY + gateHeight / 2,
      top.z,
      {
        kind: "harbor_ruin_gate",
      },
    );
  b.box("marble", 21.2, 1.8, 1.8, cx, lipY + gateHeight + 0.9, top.z, {
    kind: "harbor_ruin_gate",
  });
  b.box(
    "guideTeal",
    3.2,
    0.5,
    0.35,
    cx,
    lipY + gateHeight + 0.7,
    top.z + 0.91,
    { solid: false },
  );
  // 塌口边缘的落石(贴合沟槽两侧原地面)
  const random = seededRandom(8803);
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const x = cx + side * (11 + random() * 3.5);
      const z = -216 - random() * 14;
      const s = 0.8 + random() * 1.4;
      b.box("stone", s * 1.6, s, s * 1.2, x, heightAt(x, z) + s * 0.32, z, {
        solid: false,
        tint: "#8ba098",
      });
    }
}

/*********************************************
 * 南墙拱门(第二出口):楔形拱石与门框沿用城市语言
 *********************************************/

function buildSouthPortal(b) {
  const cx = (PORTAL.minX + PORTAL.maxX) / 2; // -215
  const spring = PORTAL.sillY + 6.5; // 拱起脚线
  const radius = (PORTAL.maxX - PORTAL.minX) / 2 + 2.1; // 拱中半径 9.1
  const count = 15;
  for (let i = 0; i < count; i++) {
    const angle = ((i + 0.5) / count) * Math.PI;
    const seg = ((Math.PI * radius) / count) * 1.03;
    b.box(
      "marble",
      3.2,
      seg,
      3.4,
      cx + Math.cos(angle) * radius,
      spring + Math.sin(angle) * radius,
      PORTAL.z,
      {
        kind: "harbor_ruin_arch",
        quaternion: new THREE.Quaternion()
          .setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle)
          .toArray(),
      },
    );
  }
  // 门洞内外的门框线与徽记(视觉)
  for (const dz of [-1.45, 1.45]) {
    b.box(
      "marble",
      1.1,
      14,
      0.7,
      PORTAL.minX - 0.55,
      PORTAL.sillY + 7,
      PORTAL.z + dz,
      { solid: false },
    );
    b.box(
      "marble",
      1.1,
      14,
      0.7,
      PORTAL.maxX + 0.55,
      PORTAL.sillY + 7,
      PORTAL.z + dz,
      { solid: false },
    );
  }
  b.box("guideTeal", 2.6, 0.5, 0.35, cx, PORTAL.topY + 2.2, PORTAL.z - 1.45, {
    solid: false,
  });
  // 门外两级塌落条石,接住从门里游出的俯冲。
  b.box("stone", 16, 1.2, 3.2, cx, PORTAL.sillY - 1.2, PORTAL.z - 2.4, {
    kind: "harbor_ruin_masonry",
  });
  b.box("stone", 13, 1.2, 3.0, cx, PORTAL.sillY - 3.2, PORTAL.z - 4.9, {
    kind: "harbor_ruin_masonry",
  });
}

/*********************************************
 * 内部修饰:壁龛辉光、盲拱线脚、断墙、倒柱与马赛克圆心
 *********************************************/

function buildInteriorDressing(b) {
  // 青金石色嵌条只反射贝珠柔光，不把墙面做成发亮的灯管。
  for (const x of [-224.6, -205.4])
    b.box("stone", 1.1, 9, 0.32, x, LOWER.floorY + 8, WALL_S + 0.18, {
      solid: false,
      tint: "#526e75",
    });
  for (const x of [-238, -214])
    b.box("stone", 1.1, 7, 0.32, x, LOWER.floorY + 7, WALL_N - 0.18, {
      solid: false,
      tint: "#526e75",
    });
  // 上层展厅保留同样的嵌石图案，真正光源仍是有壳体的贝珠。
  for (const x of [-232, -215, -198])
    b.box("stone", 1.0, 6, 0.3, x, UPPER.floorY + 6, WALL_N - 0.16, {
      solid: false,
      tint: "#526e75",
    });
  for (const x of [-230, -184])
    b.box("stone", 1.0, 6, 0.3, x, UPPER.floorY + 6, WALL_S + 0.16, {
      solid: false,
      tint: "#526e75",
    });
  // 盲拱线脚:下层南北墙内侧的浅拱带(视觉,贴面)
  for (const z of [WALL_N - 0.2, WALL_S + 0.2])
    for (const x of [-240, -228, -216, -204, -192]) {
      b.box("marble", 6.4, 0.7, 0.4, x, LOWER.floorY + 13.2, z, {
        solid: false,
      });
      b.box("marble", 0.7, 9.5, 0.4, x - 3.2, LOWER.floorY + 8.4, z, {
        solid: false,
      });
      b.box("marble", 0.7, 9.5, 0.4, x + 3.2, LOWER.floorY + 8.4, z, {
        solid: false,
      });
    }
  // 回转区地面的马赛克圆心:青铜环带 + 石板拼花(视觉,贴地)
  const medallion = cachedGeometry("harbor_mosaic_medallion", () => {
    const g = new THREE.CylinderGeometry(6, 6, 0.14, 36);
    return g;
  });
  b.add(
    medallion.clone(),
    "marble",
    SITE.turningCircle.x,
    LOWER.floorY + 0.1,
    SITE.turningCircle.z,
  );
  for (const [radius, tube] of [
    [5.2, 0.16],
    [3.1, 0.12],
  ])
    b.add(
      new THREE.TorusGeometry(radius, tube, 6, 40),
      "bronze",
      SITE.turningCircle.x,
      LOWER.floorY + 0.2,
      SITE.turningCircle.z,
      {
        quaternion: new THREE.Quaternion()
          .setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)
          .toArray(),
      },
    );
  // 断墙残段(下层南墙西段)与倒塌的柱段
  const stubs = [
    [-244, 2.6],
    [-240.5, 1.7],
  ];
  for (const [x, hh] of stubs)
    b.box("stone", 3.4, hh, 1.1, x, LOWER.floorY + hh / 2, WALL_S + 1.3, {
      kind: "harbor_ruin_masonry",
    });
  const fallen = cachedGeometry("harbor_fallen_column", () => {
    const g = new THREE.CylinderGeometry(1.05, 1.15, 9.5, 18);
    paintStone(g, { base: "#c9c8b4", algaeAmount: 0.3, seed: 61 });
    return g;
  });
  b.addRaw(fallen, "marble", -209, LOWER.floorY + 1.05, -266, [
    0.06,
    0.35,
    Math.PI / 2 - 0.05,
  ]);
  const fa = -213.2,
    fb = -204.8;
  b.colliders.push({
    type: "capsule",
    kind: "harbor_ruin_column",
    a: { x: fa, y: LOWER.floorY + 1.0, z: -264.6 },
    b: { x: fb, y: LOWER.floorY + 1.0, z: -267.4 },
    radius: 1.15,
  });
  // 散落器物:盘、碗、铜杆,沿墙根点缀,不挡主游线(视觉小件)
  const random = seededRandom(9137);
  const bowl = cachedGeometry("harbor_scatter_bowl", () => {
    const g = new THREE.LatheGeometry(
      [
        [0, 0],
        [0.3, 0.06],
        [0.44, 0.2],
        [0.4, 0.34],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      14,
    );
    paintStone(g, { base: "#9c816a", algaeAmount: 0.2, seed: 77 });
    return g;
  });
  const disc = cachedGeometry("harbor_scatter_disc", () => {
    const g = new THREE.CylinderGeometry(0.55, 0.62, 0.16, 14);
    paintStone(g, { base: "#b9b7a6", algaeAmount: 0.24, seed: 78 });
    return g;
  });
  for (let i = 0; i < 22; i++) {
    const northSide = i % 2 === 0;
    const x = -244 + random() * 58;
    const z = northSide ? -228.5 - random() * 3 : -269.5 + random() * 3;
    const level = random() > 0.55 ? UPPER.floorY : LOWER.floorY;
    // 避开回转区与主游线走廊
    if (
      Math.hypot(x - SITE.turningCircle.x, z - SITE.turningCircle.z) < 19 ||
      Math.abs(z + 247) < 7
    )
      continue;
    b.addRaw(random() > 0.5 ? bowl : disc, "bronze", x, level + 0.05, z, [
      random() > 0.7 ? 1.45 : 0,
      random() * Math.PI,
      0,
    ]);
  }
}

/*********************************************
 * 古家具陈设:石凳、石桌、双耳瓶群、雕纹储物箱与宝箱台
 *********************************************/

function buildFurniture(b) {
  // 石凳:下层北墙四张、上层南墙三张
  for (const [x, z, floor] of [
    [-244, -226.3, LOWER.floorY],
    [-236, -226.3, LOWER.floorY],
    [-218, -226.3, LOWER.floorY],
    [-210, -226.3, LOWER.floorY],
    [-228, -271.8, UPPER.floorY],
    [-212, -271.8, UPPER.floorY],
    [-196, -271.8, UPPER.floorY],
  ])
    stoneBench(b, x, floor, z);
  // 石桌:下层两张,远离回转区
  stoneTable(b, -242, LOWER.floorY, -264);
  stoneTable(b, -214, LOWER.floorY, -268.5);
  // 雕纹储物箱:做旧铜带与贝嵌
  storageChest(b, -214, UPPER.floorY, -226.5);
  storageChest(b, -200, UPPER.floorY, -226.5);
  storageChest(b, -236, LOWER.floorY, -226.6);
  // 双耳瓶群:一座一组,整组一个贴合碰撞
  amphoraCluster(b, -188, LOWER.floorY, -269, 5, 11);
  amphoraCluster(b, -183.8, UPPER.floorY, -228.2, 3, 23);
  amphoraCluster(b, -224, UPPER.floorY, -268.5, 4, 37);
  // 宝箱台:下层东端壁龛,两级台阶托起雕纹宝箱
  treasureDais(b, -186.5, LOWER.floorY, -262.5);
}

function stoneBench(b, x, floor, z) {
  b.box("stone", 3.5, 0.72, 1.05, x, floor + 0.36, z, { solid: false });
  b.box("marble", 3.9, 0.28, 1.35, x, floor + 0.86, z, { solid: false });
  b.box("bronze", 3.7, 0.1, 0.12, x, floor + 0.62, z + 0.56, { solid: false });
  b.colliders.push({
    type: "box",
    kind: "harbor_ruin_furniture",
    x,
    y: floor + 0.5,
    z,
    halfSize: { x: 1.95, y: 0.5, z: 0.68 },
  });
}

function stoneTable(b, x, floor, z) {
  b.box("stone", 1.8, 0.3, 1.8, x, floor + 0.15, z, { solid: false });
  b.box("stone", 1.0, 0.85, 1.0, x, floor + 0.72, z, { solid: false });
  b.box("marble", 2.7, 0.3, 2.7, x, floor + 1.3, z, { solid: false });
  b.box("bronze", 2.75, 0.08, 2.75, x, floor + 1.16, z, { solid: false });
  b.colliders.push({
    type: "box",
    kind: "harbor_ruin_furniture",
    x,
    y: floor + 0.72,
    z,
    halfSize: { x: 1.35, y: 0.72, z: 1.35 },
  });
}

function storageChest(b, x, floor, z) {
  b.box("stone", 2.2, 1.05, 1.4, x, floor + 0.55, z, {
    solid: false,
    tint: "#8d9a90",
  });
  b.box("marble", 2.3, 0.5, 1.5, x, floor + 1.32, z, { solid: false });
  for (const dx of [-0.75, 0, 0.75])
    b.box("bronze", 0.18, 1.62, 1.52, x + dx, floor + 0.83, z, {
      solid: false,
    });
  for (const dx of [-0.52, 0.52]) {
    const shell = cachedGeometry("harbor_chest_inlay", () => {
      const g = new THREE.CylinderGeometry(0.2, 0.2, 0.07, 12);
      const colors = new Float32Array(g.attributes.position.count * 3).fill(
        0.9,
      );
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      return g;
    });
    b.addRaw(shell, "nacre", x + dx, floor + 1.34, z + 0.76, [
      Math.PI / 2,
      0,
      0,
    ]);
  }
  b.colliders.push({
    type: "box",
    kind: "harbor_ruin_furniture",
    x,
    y: floor + 0.8,
    z,
    halfSize: { x: 1.15, y: 0.8, z: 0.75 },
  });
}

function amphoraCluster(b, x, floor, z, count, seed) {
  const random = seededRandom(seed);
  b.box("stone", 3.6, 0.35, 2.8, x, floor + 0.17, z, {
    solid: false,
    tint: "#97a79e",
  });
  const jar = cachedGeometry("harbor_amphora", () => {
    const points = [
      [0, 0],
      [0.36, 0.1],
      [0.5, 0.3],
      [0.64, 0.85],
      [0.52, 1.4],
      [0.23, 1.62],
      [0.2, 1.9],
      [0.31, 2.0],
    ].map(([px, py]) => new THREE.Vector2(px, py));
    const g = new THREE.LatheGeometry(points, 16);
    paintStone(g, { base: "#9c816a", algaeAmount: 0.22, seed: 91 });
    return g;
  });
  const handle = cachedGeometry("harbor_amphora_handle", () => {
    const g = new THREE.TorusGeometry(0.3, 0.07, 6, 14, Math.PI * 1.65);
    const colors = new Float32Array(g.attributes.position.count * 3).fill(0.62);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  });
  for (let i = 0; i < count; i++) {
    const angle = i * 2.399 + random() * 0.4;
    const px = x + Math.cos(angle) * (0.4 + (i % 3) * 0.55);
    const pz = z + Math.sin(angle) * (0.4 + (i % 2) * 0.6);
    const tipped = i === count - 1 && count > 3;
    const yaw = random() * Math.PI * 2;
    b.addRaw(
      jar,
      "bronze",
      px,
      floor + 0.36 + (tipped ? 0.35 : 0),
      pz,
      tipped ? [0, yaw, 1.32] : [0, yaw, 0],
    );
    if (!tipped)
      for (const side of [-1, 1])
        b.addRaw(
          handle,
          "bronze",
          px + Math.cos(yaw) * side * 0.45,
          floor + 0.36 + 1.5,
          pz - Math.sin(yaw) * side * 0.45,
          [0, yaw + (side * Math.PI) / 2, 0],
        );
  }
  b.colliders.push({
    type: "box",
    kind: "harbor_ruin_furniture",
    x,
    y: floor + 1.15,
    z,
    halfSize: { x: 1.8, y: 1.15, z: 1.4 },
  });
}

function treasureDais(b, x, floor, z) {
  b.box("stone", 5.2, 0.5, 5.2, x, floor + 0.25, z, {
    kind: "harbor_ruin_furniture",
  });
  b.box("marble", 3.9, 0.5, 3.9, x, floor + 0.75, z, {
    kind: "harbor_ruin_furniture",
  });
  // 宝箱:石胎箱体、做旧铜带、贝嵌与青金石锁孔;场景陈设,不是掉落系统。
  const y = floor + 1.0;
  b.box("stone", 2.8, 1.15, 1.8, x, y + 0.58, z, {
    solid: false,
    tint: "#7e8f86",
  });
  b.box("marble", 2.95, 0.55, 1.95, x, y + 1.42, z, { solid: false });
  for (const dx of [-0.95, 0, 0.95])
    b.box("bronze", 0.24, 1.85, 2.0, x + dx, y + 0.9, z, { solid: false });
  b.box("lapisGlow", 0.5, 0.7, 0.14, x, y + 0.95, z + 0.98, { solid: false });
  for (const dx of [-1.15, 1.15]) {
    const pearlDot = cachedGeometry("harbor_dais_pearl_inlay", () => {
      const g = new THREE.SphereGeometry(0.16, 10, 8);
      return g;
    });
    b.addRaw(pearlDot, "pearl", x + dx, y + 1.45, z + 0.99);
  }
  b.colliders.push({
    type: "box",
    kind: "harbor_ruin_furniture",
    x,
    y: y + 0.95,
    z,
    halfSize: { x: 1.48, y: 0.95, z: 1.0 },
  });
}

/*********************************************
 * 厅内贝珠生境:复用贝珠壁龛构件,提供柔和珠光而非电灯
 *********************************************/

function buildPearlNiches(b, lightSources) {
  const habitat = pearlHabitat({ detail: "niche" });
  for (const [x, floor, z, angle] of [
    [-238, LOWER.floorY - 0.2, -269.2, 0.35],
    [-188, UPPER.floorY - 0.2, -269.4, -0.3],
  ]) {
    lightSources.push({
      x,
      y: floor + habitat.lightHeight,
      z,
      color: "#ffe3ab",
      intensity: 800,
      distance: 60,
    });
    for (const part of habitat.parts)
      b.addRaw(part.geometry, part.key, x, floor, z, [0, angle, 0]);
    const sin = Math.sin(angle),
      cos = Math.cos(angle);
    for (const c of habitat.colliders) {
      const rotate = (p) => ({
        x: x + p.x * cos + p.z * sin,
        y: floor + p.y,
        z: z + (-p.x * sin + p.z * cos),
      });
      if (c.type === "capsule")
        b.colliders.push({
          ...c,
          a: rotate(c.a),
          b: rotate(c.b),
        });
      else {
        const rotation = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          angle,
        );
        if (c.rotation)
          rotation.multiply(
            new THREE.Quaternion(
              c.rotation.x,
              c.rotation.y,
              c.rotation.z,
              c.rotation.w,
            ),
          );
        b.colliders.push({
          ...c,
          ...rotate(c),
          rotation: {
            x: rotation.x,
            y: rotation.y,
            z: rotation.z,
            w: rotation.w,
          },
        });
      }
    }
  }
}
