import * as THREE from "three";
import {
  PoseidonTempleBuilder,
  poseidonTempleMaterials,
} from "./atlantis_poseidon_temple_geometry.js";
import { POSEIDON_TEMPLE_SITE } from "./atlantis_poseidon_site.js";
import { createAtlantisFurnitureBatch } from "./atlantis_exploration_furniture.js";

/*********************************************
 * Public API
 ********************************************/

/**
 * 创建波塞冬主神殿、雕刻祭仪厅及真实地下圣库。
 * @param {THREE.Object3D} parent 城市父节点。
 * @param {object} options heightAt为已注册挖掘的海床函数，hostColliders为保留的宿主实体，site为本模块纯场地合同。
 * @returns {object} root、colliders、landmarks、lightSources、records、stats、update、dispose。
 */
export function createAtlantisPoseidonTemple(
  parent,
  { heightAt, hostColliders = [], site = POSEIDON_TEMPLE_SITE } = {},
) {
  if (!parent?.add || typeof heightAt !== "function")
    throw new Error("Poseidon temple requires a parent and height function");
  if (site !== POSEIDON_TEMPLE_SITE)
    throw new Error("Poseidon temple requires the registered site contract");
  const root = new THREE.Group();
  root.name = "atlantis_poseidon_temple";
  parent.add(root);
  const colliders = [],
    landmarks = [],
    lightSources = [],
    owned = new Set();
  const b = new PoseidonTempleBuilder(colliders);
  buildFoundations(b, heightAt, site);
  buildTemple(b, site, lightSources);
  buildCrypt(b, site, lightSources);
  const furniture = createAtlantisFurnitureBatch(root, {
    heightAt,
    hostColliders: [...hostColliders, ...colliders],
    groups: templeFurniturePlan(site),
    seed: 9667,
  });
  furniture.root.name = "atlantis_poseidon_ritual_furniture";
  for (const collider of furniture.colliders)
    collider.kind = "poseidon_ritual_furniture";
  colliders.push(...furniture.colliders);
  // 家具原型仍由已验收的工厂生成；复制进主殿相同材质批次后释放中间批，
  // 避免每件陈设另外增加绘制调用。仅剔除旧旋转陶器极点处的零面积三角形。
  for (const mesh of furniture.root.children) {
    const clean = withoutZeroAreaTriangles(mesh.geometry);
    b.bucket.add(clean, mesh.name.slice("atlantis_".length));
    clean.dispose();
  }
  const furnitureStats = furniture.stats;
  furniture.dispose();
  b.bucket.build(poseidonTempleMaterials(), root, owned);
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.receiveShadow = true;
    mesh.geometry.computeBoundingSphere();
  });
  landmarks.push(
    {
      id: "main_temple",
      position: new THREE.Vector3(0, site.templeFloorY + 33, -911),
    },
    {
      id: "poseidon_ritual_well",
      position: new THREE.Vector3(0, site.templeFloorY + 5, -922),
    },
    {
      id: "poseidon_crypt_galleries",
      position: new THREE.Vector3(-34, -647, -922),
    },
    { id: "poseidon_sacred_vault", position: new THREE.Vector3(0, -691, -922) },
    {
      id: "poseidon_rear_vault_gate",
      position: new THREE.Vector3(0, -685, -959),
    },
  );
  const stats = {
    site: site.id,
    meshes: root.getObjectsByProperty("isMesh", true).length,
    triangles: [...owned].reduce(
      (sum, g) =>
        sum + (g.index ? g.index.count : g.attributes.position.count) / 3,
      0,
    ),
    colliders: colliders.length,
    levels: site.levels.length,
    openings: 2,
    pearls: lightSources.length,
    dimensions: { width: 130, depth: 100, height: 82 },
    furniture: furnitureStats,
  };
  root.userData.poseidonTempleStats = stats;
  let disposed = false;
  return {
    root,
    colliders,
    obstacles: [],
    landmarks,
    lightSources,
    records: site.routes,
    site,
    stats,
    furniture: { stats: furnitureStats },
    furniturePlacements: furnitureStats.placedGroups,
    update(time, dt, position, highQuality = true) {
      if (disposed) return;
      root.visible =
        !position ||
        Math.hypot(position.x, position.z + 911) < (highQuality ? 430 : 350);
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
      colliders.length = landmarks.length = lightSources.length = 0;
    },
  };
}

/*********************************************
 * Private Helper Functions
 ********************************************/

function buildFoundations(b, heightAt, site) {
  const floor = site.templeFloorY;
  // 承重台基只位于基坑外侧；后门中央留水道，绝不以整栋方盒封住地下层。
  const supports = [
    { x: -56.5, z: -911, w: 17, d: 100 },
    { x: 56.5, z: -911, w: 17, d: 100 },
    { x: 0, z: -868, w: 96, d: 14 },
    { x: -31, z: -958, w: 34, d: 6 },
    { x: 31, z: -958, w: 34, d: 6 },
  ];
  for (const s of supports) {
    let low = floor - 1;
    for (let ix = 0; ix <= 8; ix++)
      for (let iz = 0; iz <= 12; iz++)
        low = Math.min(
          low,
          heightAt(s.x + (ix / 8 - 0.5) * s.w, s.z + (iz / 12 - 0.5) * s.d) -
            1.8,
        );
    b.box("stone", s.w, floor - low, s.d, s.x, (floor + low) / 2, s.z, {
      kind: "poseidon_foundation",
    });
    for (let z = s.z - s.d / 2 + 5; z < s.z + s.d / 2; z += 11)
      b.box(
        "marble",
        1.1,
        (floor - low) * 0.88,
        1.8,
        s.x < 0 ? s.x - s.w / 2 - 0.1 : s.x + s.w / 2 + 0.1,
        floor - (floor - low) / 2,
        z,
        { solid: false },
      );
  }
  splitRectangle(
    b,
    "marble",
    { minX: -65, maxX: 65, minZ: -961, maxZ: -861 },
    site.shaft,
    floor,
    2.8,
    "poseidon_temple_platform",
  );
  // 外缘的三层线脚顺台基收束，沿中央井口也保留真实可穿行的边缘。
  for (const x of [-64.2, 64.2])
    for (const [dy, width] of [
      [0.25, 1.4],
      [1, 1],
      [1.7, 0.6],
    ])
      b.box("marble", width, 0.4, 100, x, floor + dy, -911, { solid: false });
  for (const z of [-960.2, -861.8])
    for (const dy of [0.25, 1, 1.7])
      b.box("marble", 130, 0.4, 1, 0, floor + dy, z, { solid: false });
  // 井缘薄线脚只在四周；不放整宽装饰地板，防止视觉层盖住下行口。
  for (const x of [-24.7, 24.7])
    b.box("bronze", 1.4, 0.35, 63, x, floor + 0.17, -922, { solid: false });
  for (const z of [-953.7, -890.3])
    b.box("bronze", 48, 0.35, 1.4, 0, floor + 0.17, z, { solid: false });
}

function buildTemple(b, site, lights) {
  const floor = site.templeFloorY;
  for (const x of [-55, 55])
    for (const z of [-884, -898, -912, -926, -940, -954])
      b.column(x, floor, z, 56, 2.55);
  for (const z of [-883, -957])
    for (const x of [-41, -27, 27, 41]) b.column(x, floor, z, 56, 2.55);
  for (const x of [-55, 55]) {
    b.box("marble", 8, 4, 83, x, floor + 57.5, -920.5);
    b.box("stone", 9.4, 2.4, 86, x, floor + 61, -920.5);
    for (let z = -958; z < -881; z += 4.6) {
      b.box(
        "bronze",
        0.45,
        2.1,
        2.3,
        x + Math.sign(x) * 4.25,
        floor + 58.7,
        z,
        { solid: false },
      );
      for (const d of [-0.45, 0, 0.45])
        b.box(
          "marble",
          0.35,
          0.75,
          0.3,
          x + Math.sign(x) * 4.8,
          floor + 61.8,
          z + d,
          { solid: false },
        );
    }
  }
  for (const z of [-883, -957]) {
    b.box("marble", 126, 4, 7.2, 0, floor + 57.5, z);
    b.box("stone", 129, 2.2, 8.8, 0, floor + 61, z);
    b.pediment(0, floor + 63, z, 128, 18, 2.8);
    b.waveRelief(0, floor + 58.7, z + 3.85, 116, 1.3);
    for (let x = -60; x <= 60; x += 3.6)
      b.box("marble", 0.75, 1, 1, x, floor + 61.6, z + 4.8, { solid: false });
  }
  // 双翼斜屋面保留中央48m宽的露天带，结构盒与屋面采用同一旋转。
  for (const sign of [-1, 1]) {
    const angle = -sign * Math.atan2(13, 38);
    b.box("stone", Math.hypot(38, 13), 2, 68, sign * 43, floor + 68.5, -920, {
      euler: [0, 0, angle],
      kind: "poseidon_roof",
    });
    for (let z = -951; z < -887; z += 7)
      b.box(
        "marble",
        Math.hypot(38, 13),
        0.6,
        0.8,
        sign * 43,
        floor + 69.8,
        z,
        { euler: [0, 0, angle], solid: false },
      );
    // 侧礼仪室保留入口和横向水路；用分段壁面而非封闭的整盒。
    for (const z of [-903, -939]) {
      b.box("stone", 2.5, 30, 11, sign * 44, floor + 15, z);
      b.box("marble", 3.2, 1, 12, sign * 44, floor + 30.5, z);
    }
    b.box("stone", 17, 29, 2.5, sign * 34.5, floor + 14.5, -950);
    for (const z of [-903, -926, -944]) {
      b.box("marble", 1.2, 28, 1.2, sign * 42.3, floor + 14, z, {
        solid: false,
      });
      reliefPanel(b, sign * 43.1, floor + 13, z, (-sign * Math.PI) / 2);
    }
  }
  buildAltar(b, 0, floor, -957.1, 1.25);
  for (const sign of [-1, 1]) {
    buildAltar(b, sign * 34, floor, -942, 0.7);
    b.pearl(
      sign * 36,
      floor + 0.6,
      -895,
      0.8,
      lights,
      `poseidon_ritual_shell_${sign}`,
    );
  }
  // 石刻涡纹与贝珠祭仪是古代海洋构图；不创建现代灯具或额外PointLight。
}

function buildCrypt(b, site, lights) {
  const bottom = site.floorY - 4;
  const top = site.templeFloorY - 2.8;
  const h = top - bottom;
  for (const x of [-46, 46])
    b.box("stone", 4, h, 86, x, (top + bottom) / 2, -918, {
      kind: "poseidon_vault_lining",
    });
  // 厚北墙把坑缘坡度与既有巨像台基都隔在真实内部之外。
  b.box("stone", 96, h, 12, 0, (top + bottom) / 2, -881, {
    kind: "poseidon_vault_lining",
  });
  for (const x of [-30, 30])
    b.box("stone", 36, h, 4, x, (top + bottom) / 2, -959, {
      kind: "poseidon_vault_lining",
    });
  const gate = site.secondExit;
  b.box(
    "stone",
    24,
    gate.sillY - bottom,
    4,
    0,
    (gate.sillY + bottom) / 2,
    -959,
  );
  b.box("stone", 24, top + 665.8, 4, 0, (top - 665.8) / 2, -959);
  b.arch(0, gate.sillY, -959, 24, 40, 4);
  for (const sign of [-1, 1]) {
    b.box("marble", 20, 2.5, 70, sign * 34, -663.25, -922, {
      kind: "poseidon_crypt_floor",
    });
    for (const z of [-900, -923, -947]) {
      b.column(sign * 41, -662, z, 34, 1.55, false);
      reliefPanel(b, sign * 43.75, -690, z, (-sign * Math.PI) / 2);
    }
    for (const z of [-901, -922, -943]) {
      // 独立侧廊桶拱；中间井不横跨任何顶板。
      for (let i = 0; i < 16; i++) {
        const a = ((i + 0.5) * Math.PI) / 16;
        const mid = 10.5;
        b.box(
          "stone",
          1.1,
          (Math.PI * mid) / 16 + 0.06,
          18,
          sign * 34 + Math.cos(a) * mid,
          -627 + Math.sin(a) * mid,
          z,
          { euler: [0, 0, a], kind: "poseidon_crypt_vault" },
        );
      }
    }
    b.box("marble", 1, 1.5, 69, sign * 43.25, -660.9, -922, { solid: false });
    b.waveRelief(sign * 30.5, -656, -887.25, 20, 0.8);
    // 光源落在侧廊及墙龛，避开井、成人回转体和两片营养鱼群。
    b.box("marble", 7, 1.2, 6, sign * 35.5, -661.4, -896);
    b.pearl(
      sign * 35.5,
      -660.8,
      -896,
      0.75,
      lights,
      `poseidon_crypt_shell_${sign}`,
    );
    b.box("marble", 7, 1.1, 6, sign * 37, -709.45, -895);
    b.pearl(
      sign * 37,
      -708.9,
      -895,
      0.9,
      lights,
      `poseidon_vault_shell_${sign}`,
    );
  }
  for (const x of [-32, 32]) {
    b.box("marble", 9, 1.2, 5, x, -709.4, -952);
    buildAltar(b, x, -708.8, -952, 0.55);
  }
  b.waveRelief(0, -680, -887.35, 78, 1.7);
  b.waveRelief(0, -698, -887.35, 78, 1.4);
  reliefPanel(b, -29, -692, -887.45);
  reliefPanel(b, 29, -692, -887.45);
  // 沟槽两侧衬墙藏住切口的平滑带，开放中段保留实体成年角色的往返宽度。
  const trench = site.trench;
  for (const sign of [-1, 1])
    for (let i = 0; i < 10; i++) {
      const z = trench.minZ + ((i + 0.5) * (trench.maxZ - trench.minZ)) / 10;
      const t = (z - trench.topZ) / (trench.bottomZ - trench.topZ);
      const floor = trench.topY + (trench.bottomY - trench.topY) * t;
      b.box("stone", 4, 8, 2.02, sign * 15, floor + 2, z, {
        kind: "poseidon_channel_lining",
      });
    }
}

function splitRectangle(b, material, outer, opening, floor, thickness, kind) {
  const boxes = [
    [outer.minX, opening.minX, outer.minZ, outer.maxZ],
    [opening.maxX, outer.maxX, outer.minZ, outer.maxZ],
    [opening.minX, opening.maxX, outer.minZ, opening.minZ],
    [opening.minX, opening.maxX, opening.maxZ, outer.maxZ],
  ];
  for (const [minX, maxX, minZ, maxZ] of boxes)
    b.box(
      material,
      maxX - minX,
      thickness,
      maxZ - minZ,
      (minX + maxX) / 2,
      floor - thickness / 2,
      (minZ + maxZ) / 2,
      { kind },
    );
}

function buildAltar(b, x, floor, z, scale) {
  for (const [w, h, d, y] of [
    [9, 0.65, 4.8, 0.325],
    [7.8, 0.55, 4.2, 0.925],
    [6.6, 2.6, 3.4, 2.5],
    [8.4, 0.65, 4.4, 4.125],
  ])
    b.box("marble", w * scale, h * scale, d * scale, x, floor + y * scale, z, {
      kind: "poseidon_ritual_altar",
    });
  for (const dx of [-2.6, -1.3, 0, 1.3, 2.6]) {
    b.box(
      "bronze",
      0.18 * scale,
      2 * scale,
      0.13 * scale,
      x + dx * scale,
      floor + 2.4 * scale,
      z + 1.77 * scale,
      { solid: false },
    );
  }
  b.waveRelief(
    x,
    floor + 2.5 * scale,
    z + 1.85 * scale,
    5.8 * scale,
    0.38 * scale,
  );
}

function reliefPanel(b, x, y, z, yaw = 0) {
  // 深色凹龛、青金石底与风化铜海马兽印章形成可读的层次，避免白色平板。
  const sin = Math.sin(yaw),
    cos = Math.cos(yaw);
  const point = (dx, dy, dz) => [
    x + dx * cos + dz * sin,
    y + dy,
    z - dx * sin + dz * cos,
  ];
  const add = (material, w, h, d, dx, dy, dz) =>
    b.box(material, w, h, d, ...point(dx, dy, dz), {
      euler: [0, yaw, 0],
      solid: false,
    });
  add("rockDark", 11.8, 15.8, 0.3, 0, 0, 0);
  add("ritualLapis", 9.8, 13.8, 0.34, 0, 0, 0.17);
  for (const dx of [-5.5, 5.5]) add("bronze", 0.85, 16, 0.8, dx, 0, 0.4);
  for (const dy of [-7.7, 7.7]) add("bronze", 11.8, 0.8, 0.8, 0, dy, 0.4);
  for (const dx of [-1.4, 0, 1.4])
    add("marble", 0.48, dx ? 3.4 : 7.8, 0.8, dx, dx ? 3.7 : 1.5, 0.55);
  add("marble", 3.2, 0.48, 0.8, 0, 2.2, 0.55);
  b.seaEmblem(...point(0, -1.3, 0.55), yaw, 0.82);
}

function templeFurniturePlan(site) {
  const groups = [];
  for (const sign of [-1, 1]) {
    for (const [kind, x, floor, z, scale, yaw] of [
      ["chest", 37, site.templeFloorY, -911, 1.3, 0],
      ["amphora", 36, site.templeFloorY, -927, 1.25, 0],
      ["bench", 33, site.templeFloorY, -936, 1.4, 0],
      ["chest", 35, -662, -932, 1.2, 0],
      ["chest", 36, -710, -909, 1.1, 0],
      ["amphora", 37, -710, -928, 1.05, 0],
      ["bench", 36, -710, -943, 1.2, Math.PI / 2],
    ])
      groups.push({
        id: `poseidon_${sign}_${kind}_${floor}_${z}`,
        kind,
        x: sign * x,
        floor,
        z,
        scale,
        yaw,
        count: 3,
        seed: sign < 0 ? 9657 : 9667,
      });
  }
  return groups;
}

function withoutZeroAreaTriangles(geometry) {
  const p = geometry.attributes.position,
    index = geometry.index;
  const indices = [],
    a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  for (let i = 0; i < (index ? index.count : p.count); i += 3) {
    const ids = [0, 1, 2].map((j) => (index ? index.getX(i + j) : i + j));
    a.fromBufferAttribute(p, ids[0]);
    b.fromBufferAttribute(p, ids[1]);
    c.fromBufferAttribute(p, ids[2]);
    if (b.sub(a).cross(c.sub(a)).lengthSq() > 1e-16) indices.push(...ids);
  }
  const clean = geometry.clone();
  clean.setIndex(indices);
  return clean;
}
