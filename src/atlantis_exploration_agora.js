import * as THREE from "three";
import {
  MergeBucket,
  atlantisMaterials,
  cachedGeometry,
  paintStone,
  seededRandom,
} from "./atlantis_art_geometry.js";
import { pearlHabitat, PEARL_LIGHT_INTENSITY } from "./atlantis_pearl.js";
import { createAtlantisExplorationFurniture } from "./atlantis_exploration_furniture.js";
import { AGORA_EXCAVATION_SITE } from "./atlantis_exploration_agora_site.js";

// 本模块由 AGORA_EXCAVATION_SITE 不可变元数据驱动装配:开阔下行井直入
// 下沉内庭,周边回廊(上层)带拱顶残跨,北墙为档案龛墙,南墙拱门接水道
// 沟槽出水面。可见体与碰撞体同尺寸同变换,colliders 装配完成后不再改动。
// 与港湾方盒厅堂刻意区分:无整屋面、无整层平板,结构读作"坍塌的环廊蓄池"。

const WALL_BOTTOM = AGORA_EXCAVATION_SITE.floorY - 4; // 墙脚埋入坑底以下
const WALL_W = 189.5; // 西墙内面(墙厚 4.5m,压住坑缘土坡)
const WALL_E = 242.5; // 东墙内面(墙厚 2.5m)
const WALL_S = -483.5; // 南墙内面(墙厚 2.5m)
const WALL_N = -412.5; // 北墙内面(墙厚 4.5m,档案墙)
const DECK = AGORA_EXCAVATION_SITE.levels[0]; // 上层回廊:楼板顶 -334
const CISTERN = AGORA_EXCAVATION_SITE.levels[1]; // 下层内庭:坑底 -362
const SHAFT = AGORA_EXCAVATION_SITE.shaft; // 中央庭院开口(下行井)
const GATE = AGORA_EXCAVATION_SITE.secondExit; // 南墙拱门
const TRENCH = AGORA_EXCAVATION_SITE.trench; // 南门水道沟槽
const TURN = AGORA_EXCAVATION_SITE.turningCircle;
const RIM_PARAPET_MIN = -316; // 墙顶至少到此,盖住海洋殖民的墙带上沿

/**
 * 在 Agora 桥廊预留区装配双层下沉档案库遗迹。
 * @param {THREE.Object3D} parent 场景父节点(城市根节点)。
 * @param {object} options
 * @param {function} options.heightAt 共享海床高度(预览含本场地挖掘剖面)。
 * @param {object} [options.site] 挖掘场地元数据,默认 AGORA_EXCAVATION_SITE。
 * @param {object[]} [options.hostColliders] 既有碰撞(陈设放置避让复核用)。
 * @returns {object} root、colliders、obstacles、landmarks、lightSources、records、stats、update、dispose。
 */
export function createAtlantisAgoraRuins(
  parent,
  { heightAt, site = AGORA_EXCAVATION_SITE, hostColliders = [] } = {},
) {
  if (!parent?.add || typeof heightAt !== "function")
    throw new Error(
      "Agora sunken archive requires a parent and height function",
    );
  // 此区域专属构图只能配套已注册的场地；拒绝忽略自定义元数据的假接口。
  if (site !== AGORA_EXCAVATION_SITE)
    throw new Error("Agora geometry requires the registered excavation site");
  const SITE = site;
  const root = new THREE.Group();
  root.name = "atlantis_agora_sunken_archive";
  parent.add(root);
  const owned = new Set(),
    colliders = [],
    obstacles = [],
    landmarks = [],
    lightSources = [];
  const b = new ArchiveBuilder(colliders);

  buildPitWalls(b, heightAt);
  buildWalkways(b);
  buildVaults(b);
  buildArchiveWall(b);
  buildSouthGate(b, heightAt);
  buildRimMarkers(b, heightAt);
  buildPodiums(b);
  buildInteriorDressing(b);
  buildPearlNiches(b, lightSources);

  b.bucket.build(atlantisMaterials(), root, owned);
  for (const mesh of root.children) {
    mesh.receiveShadow = true;
    mesh.geometry.computeBoundingSphere();
  }

  // 重用已验收的雕纹家具及接触几何，避免在新遗迹复制低精度的整块包围盒。
  const furniture = createAtlantisExplorationFurniture(root, {
    heightAt,
    site: SITE,
    hostColliders: [...hostColliders, ...colliders],
    groups: agoraFurniturePlan(SITE),
    scatter: [],
    seed: 9377,
  });
  furniture.root.name = "atlantis_agora_furniture";
  colliders.push(...furniture.colliders);

  landmarks.push(
    {
      id: "agora_ruins_well",
      position: new THREE.Vector3(
        (SHAFT.minX + SHAFT.maxX) / 2,
        DECK.floorY + 2,
        (SHAFT.minZ + SHAFT.maxZ) / 2,
      ),
    },
    {
      id: "agora_ruins_cistern",
      position: new THREE.Vector3(TURN.x, TURN.y, TURN.z),
    },
    {
      id: "agora_ruins_gate",
      position: new THREE.Vector3(
        (GATE.minX + GATE.maxX) / 2,
        GATE.sillY + 4,
        GATE.z,
      ),
    },
    {
      id: "agora_ruins_archive_wall",
      position: new THREE.Vector3(216, -322, WALL_N),
    },
  );
  // 室内鱼群沿真实墙体避障，不能用整栋包围球把两层水域都排除掉。

  const stats = {
    site: SITE.id,
    meshes: root.getObjectsByProperty("isMesh", true).length,
    colliders: colliders.length,
    triangles: Math.round(
      [...owned].reduce(
        (sum, geometry) => sum + geometry.attributes.position.count / 3,
        0,
      ) + furniture.stats.triangles,
    ),
    levels: SITE.levels.length,
    pearls: 2,
    furniture: furniture.stats,
  };
  root.userData.agoraRuinsStats = stats;
  let disposed = false;
  return {
    root,
    colliders,
    obstacles,
    landmarks,
    lightSources,
    records: SITE.routes,
    stats,
    furniture,
    update(time, dt, position, highQuality = true) {
      if (disposed) return;
      root.visible =
        !position ||
        Math.hypot(215 - position.x, -447.5 - position.z) <
          (highQuality ? 400 : 330);
      furniture.update(time, dt, position, highQuality);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      furniture.dispose();
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
 * 装配工具:可见体与碰撞共用尺寸与变换(沿用港湾厅堂模式)
 *********************************************/

class ArchiveBuilder {
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
      seed: 937 + this.ordinal++,
    });
    this.bucket.add(geometry, material, {
      position: [x, y, z],
      quaternion,
      tile: tile ?? (material === "stone" ? 11 : 18),
    });
    geometry.dispose();
  }
  /** 直接并入已带顶点色的构件(贝珠壳体、缓存器物等),不再做石材着色。 */
  addRaw(geometry, materialKey, x, y, z, euler = null) {
    this.bucket.add(geometry, materialKey, { position: [x, y, z], euler });
  }
  box(material, w, h, d, x, y, z, options = {}) {
    const {
      solid = true,
      quaternion = null,
      kind = "agora_ruin_masonry",
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
}

/*********************************************
 * 四面衬墙:分段跟随坑缘地形,顶缘破碎;北墙见 buildArchiveWall
 *********************************************/

function buildPitWalls(b, heightAt) {
  const pit = AGORA_EXCAVATION_SITE.bounds;
  const WALL_LENGTH = WALL_N - WALL_S; // 71m(z 从南墙内面到北墙内面)
  // 西墙(4.5m 厚)分八段,段顶 = max(坑缘地形 + 1.0, -316) 加破碎抖动。
  for (let i = 0; i < 8; i += 1) {
    const z0 = WALL_S + (WALL_LENGTH / 8) * i,
      z1 = WALL_S + (WALL_LENGTH / 8) * (i + 1);
    const rim = Math.max(
      heightAt(pit.minX - 0.5, (z0 + z1) / 2) + 1.0,
      RIM_PARAPET_MIN,
    );
    const top = rim - (i % 3) * 1.6;
    const h = top - WALL_BOTTOM;
    b.box(
      "stone",
      4.5,
      h,
      z1 - z0,
      pit.minX + 2.25,
      WALL_BOTTOM + h / 2,
      (z0 + z1) / 2,
    );
  }
  // 东墙(2.5m 厚)同样分段。
  for (let i = 0; i < 8; i += 1) {
    const z0 = WALL_S + (WALL_LENGTH / 8) * i,
      z1 = WALL_S + (WALL_LENGTH / 8) * (i + 1);
    const rim = Math.max(
      heightAt(pit.maxX + 0.5, (z0 + z1) / 2) + 1.0,
      RIM_PARAPET_MIN,
    );
    const top = rim - ((i + 1) % 3) * 1.4;
    const h = top - WALL_BOTTOM;
    b.box(
      "stone",
      2.5,
      h,
      z1 - z0,
      pit.maxX - 1.25,
      WALL_BOTTOM + h / 2,
      (z0 + z1) / 2,
    );
  }
  // 南墙(2.5m 厚):中央留拱门开口 x∈[GATE.minX, GATE.maxX]、y∈[-334,-318]。
  const gateTop = GATE.topY;
  for (const [x0, x1] of [
    [WALL_W, GATE.minX],
    [GATE.maxX, WALL_E],
  ]) {
    for (let i = 0; i < 3; i += 1) {
      const xa = x0 + ((x1 - x0) / 3) * i,
        xb = x0 + ((x1 - x0) / 3) * (i + 1);
      const rim = Math.max(
        heightAt((xa + xb) / 2, pit.minZ - 0.5) + 1.0,
        RIM_PARAPET_MIN + 2,
      );
      const top = rim - (i % 2) * 1.8;
      const h = top - WALL_BOTTOM;
      b.box(
        "stone",
        xb - xa,
        h,
        2.5,
        (xa + xb) / 2,
        WALL_BOTTOM + h / 2,
        pit.minZ + 1.25,
      );
    }
  }
  // 门洞下槛段(埋住坑缘残土)与门楣段(楣顶与两侧墙顶线相读)。
  b.box(
    "stone",
    GATE.maxX - GATE.minX,
    -334 - WALL_BOTTOM,
    2.5,
    216,
    (-334 + WALL_BOTTOM) / 2,
    pit.minZ + 1.25,
  );
  b.box(
    "stone",
    GATE.maxX - GATE.minX,
    -313.5 - gateTop,
    2.5,
    216,
    (-313.5 + gateTop) / 2,
    pit.minZ + 1.25,
  );
  // 墙顶内饰线脚(视觉,贴面不出碰撞):回廊楼板标高与拱顶起拱线各一道。
  for (const ledgeY of [DECK.floorY + 0.9, -329.4]) {
    // 墙面线脚在门洞两侧结束，不能把无碰撞的石条悬挂在水道中。
    for (const [x0, x1] of [
      [WALL_W, GATE.minX],
      [GATE.maxX, WALL_E],
    ])
      b.box("marble", x1 - x0, 1.4, 0.9, (x0 + x1) / 2, ledgeY, WALL_S + 0.45, {
        solid: false,
      });
    b.box("marble", 0.9, 1.4, 71, WALL_W + 0.45, ledgeY, -447.5, {
      solid: false,
    });
    b.box("marble", 0.9, 1.4, 71, WALL_E - 0.45, ledgeY, -447.5, {
      solid: false,
    });
  }
}

/*********************************************
 * 周边回廊(上层):环井楼板 + 牛腿 + 内缘断栏;南侧接水门道槛
 *********************************************/

function buildWalkways(b) {
  const deckBottom = DECK.floorY - 2.5; // 楼板厚 2.5m
  const deckY = (DECK.floorY + deckBottom) / 2;
  const runs = [
    // 南回廊(满宽,接南门道槛)
    { x0: WALL_W, x1: WALL_E, z0: -483.5, z1: SHAFT.minZ },
    // 西回廊
    { x0: WALL_W, x1: SHAFT.minX, z0: SHAFT.minZ, z1: SHAFT.maxZ },
    // 东回廊
    { x0: SHAFT.maxX, x1: WALL_E, z0: SHAFT.minZ, z1: SHAFT.maxZ },
    // 北回廊(档案墙脚)
    { x0: SHAFT.minX, x1: SHAFT.maxX, z0: SHAFT.maxZ, z1: WALL_N },
  ];
  for (const run of runs)
    b.box(
      "stone",
      run.x1 - run.x0,
      DECK.floorY - deckBottom,
      run.z1 - run.z0,
      (run.x0 + run.x1) / 2,
      deckY,
      (run.z0 + run.z1) / 2,
      { kind: "agora_ruin_deck" },
    );
  // 悬挑牛腿:沿内缘线每 6.8m 一只,从墙/楼板底托出,不参与回转净区。
  for (const side of ["west", "east"]) {
    const x = side === "west" ? SHAFT.minX - 0.8 : SHAFT.maxX + 0.8;
    for (let z = SHAFT.minZ + 4; z < SHAFT.maxZ - 2; z += 6.8)
      b.box("stone", 1.6, 1.5, 2.2, x, deckBottom - 0.75, z, {
        kind: "agora_ruin_corbel",
      });
  }
  for (let x = SHAFT.minX + 4; x < SHAFT.maxX - 2; x += 6.8) {
    b.box("stone", 2.2, 1.5, 1.6, x, deckBottom - 0.75, SHAFT.minZ - 0.8, {
      kind: "agora_ruin_corbel",
    });
    b.box("stone", 2.2, 1.5, 1.6, x, deckBottom - 0.75, SHAFT.maxZ + 0.8, {
      kind: "agora_ruin_corbel",
    });
  }
  // 内缘断栏:大理石栏段断续残留,约占六成,让井口读作有栏的回廊。
  const random = seededRandom(4409);
  const curb = (w, d, x, z) =>
    b.box("marble", w, 0.95, d, x, DECK.floorY + 0.48, z, {
      kind: "agora_ruin_curb",
    });
  for (let z = SHAFT.minZ + 1.6; z < SHAFT.maxZ - 1; z += 4.4) {
    if (random() < 0.62) curb(0.7, 3.4, SHAFT.minX - 0.35, z);
    if (random() < 0.62) curb(0.7, 3.4, SHAFT.maxX + 0.35, z);
  }
  for (let x = SHAFT.minX + 1.8; x < SHAFT.maxX - 1; x += 4.4) {
    // 南内缘在水道门口走廊(x∈[206,226])不留栏段,保持门进门的俯视净空。
    if (random() < 0.6 && (x < 206 || x > 226))
      curb(3.4, 0.7, x, SHAFT.minZ - 0.35);
    if (random() < 0.55) curb(3.4, 0.7, x, SHAFT.maxZ + 0.35);
  }
  // 楼板面拼花:青铜嵌线沿内缘,不挡游线(视觉)。
  for (const [x, z, w, d] of [
    [SHAFT.minX - 0.9, -448.25, 0.22, 55],
    [SHAFT.maxX + 0.9, -448.25, 0.22, 55],
    [216, SHAFT.minZ - 0.9, 39, 0.22],
    [216, SHAFT.maxZ + 0.9, 39, 0.22],
  ])
    b.box("bronze", w, 0.1, d, x, DECK.floorY + 0.05, z, { solid: false });
}

/*********************************************
 * 拱顶残跨:东西回廊各两跨马蹄拱,部分壳板坍塌
 *********************************************/

function buildVaults(b) {
  // 拱剖面:弦跨 6m(墙面→内缘),矢高 4.3m,半径 3.2m,圆心 (3, -329.1)。
  const R = 3.2,
    CY = DECK.ceilingY + 2,
    SPRING = DECK.ceilingY + 0.9;
  const bays = [
    { side: -1, z0: -462, z1: -450, broken: false },
    { side: -1, z0: -438, z1: -426, broken: true },
    { side: 1, z0: -468, z1: -456, broken: true },
    { side: 1, z0: -442, z1: -430, broken: false },
  ];
  const phiA = Math.PI + 0.3519, // 墙侧起拱角
    phiB = -0.3519; // 内缘起拱角
  for (const bay of bays) {
    const cx = bay.side === -1 ? WALL_W + 3 : WALL_E - 3;
    const ribs = bay.broken ? 2 : 3;
    for (let r = 0; r < ribs; r += 1) {
      const z =
        bay.z0 + 2 + (r * (bay.z1 - bay.z0 - 4)) / Math.max(1, ribs - 1);
      const segments = 11;
      for (let i = 0; i < segments; i += 1) {
        const phi = phiB + ((i + 0.5) / segments) * (phiA - phiB);
        // 残跨的肋在上半部断续缺块,让井口天光漏进廊道。
        if (bay.broken && i > 3 && i < 8 && (r + i) % 2 === 0) continue;
        const px = cx - bay.side * Math.cos(phi) * R;
        const py = CY + Math.sin(phi) * R;
        const rotation = bay.side === -1 ? phi : -phi;
        b.box(
          "stone",
          0.6,
          ((Math.abs(phiA - phiB) * R) / segments) * 1.06,
          1.15,
          px,
          py,
          z,
          {
            kind: "agora_ruin_vault",
            quaternion: new THREE.Quaternion()
              .setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotation)
              .toArray(),
          },
        );
      }
    }
    // 完整跨以五块壳板覆冠(读作连续拱壳);残跨只在起拱线留板根。
    const plateAngles = bay.broken
      ? [phiA - 0.22, phiB + 0.22]
      : [phiA - 0.35, 2.2, Math.PI / 2, 1.05, phiB + 0.35];
    for (const phi of plateAngles) {
      const px = cx - bay.side * Math.cos(phi) * (R - 0.12);
      const py = CY + Math.sin(phi) * (R - 0.12);
      const rotation = bay.side === -1 ? phi + Math.PI / 2 : Math.PI / 2 - phi;
      b.box(
        "stone",
        2.1,
        0.34,
        bay.z1 - bay.z0 - 2.4,
        px,
        py,
        (bay.z0 + bay.z1) / 2,
        {
          kind: "agora_ruin_vault",
          quaternion: new THREE.Quaternion()
            .setFromAxisAngle(new THREE.Vector3(0, 0, 1), rotation)
            .toArray(),
        },
      );
    }
    // 起拱线枕梁(墙侧与内缘各一)。
    for (const u of [0.35, 5.65]) {
      const x = bay.side === -1 ? WALL_W + u : WALL_E - u;
      b.box(
        "marble",
        0.9,
        1.1,
        bay.z1 - bay.z0,
        x,
        SPRING - 0.35,
        (bay.z0 + bay.z1) / 2,
        {
          kind: "agora_ruin_vault",
        },
      );
    }
  }
}

/*********************************************
 * 北墙档案墙:高出的龛墙,壁柱分间,三层卷轴龛
 *********************************************/

function buildArchiveWall(b) {
  const pit = AGORA_EXCAVATION_SITE.bounds;
  // 档案墙本体(4.5m 厚)分六段,顶缘破碎,最高 -288,仍低于北坑缘(-269)。
  const tops = [-289.5, -287.8, -290.6, -288.4, -291.2, -289];
  for (let i = 0; i < 6; i += 1) {
    const x0 = WALL_W + ((WALL_E - WALL_W) / 6) * i,
      x1 = WALL_W + ((WALL_E - WALL_W) / 6) * (i + 1);
    const h = tops[i] - WALL_BOTTOM;
    b.box(
      "stone",
      x1 - x0,
      h,
      4.5,
      (x0 + x1) / 2,
      WALL_BOTTOM + h / 2,
      pit.maxZ - 2.25,
      {
        kind: "agora_ruin_archive",
      },
    );
    // 墙顶断檐帽石。
    b.box(
      "marble",
      x1 - x0 - 1.2,
      1.0,
      5.1,
      (x0 + x1) / 2,
      tops[i] + 0.5,
      pit.maxZ - 2.25,
      {
        kind: "agora_ruin_archive",
      },
    );
  }
  // 壁柱分间:九间,凸出墙面 0.5m,从回廊楼板直到墙顶。
  for (let i = 0; i <= 8; i += 1) {
    const x = WALL_W + 2.5 + ((WALL_E - WALL_W - 5) / 8) * i;
    b.box(
      "marble",
      1.3,
      -296 - DECK.floorY,
      0.9,
      x,
      (DECK.floorY + -296) / 2,
      WALL_N - 0.45,
      {
        solid: false,
      },
    );
  }
  // 卷轴龛:廊道层墙面一register、墙身上两层;龛内六成置卷轴罐。
  const random = seededRandom(7717);
  const niche = (x, y, w = 2.2, h = 2.7) => {
    const z = WALL_N - 0.28;
    b.box("stone", w, h, 0.2, x, y, z + 0.1, { solid: false, tint: "#4d5a58" });
    b.box("marble", w + 0.5, 0.34, 0.42, x, y + h / 2 + 0.17, z, {
      solid: false,
    });
    b.box("marble", w + 0.5, 0.34, 0.42, x, y - h / 2 - 0.17, z, {
      solid: false,
    });
    b.box("marble", 0.34, h, 0.42, x - w / 2 - 0.17, y, z, { solid: false });
    b.box("marble", 0.34, h, 0.42, x + w / 2 + 0.17, y, z, { solid: false });
    if (random() < 0.62) {
      const jar = cachedGeometry("agora_scroll_jar", () => {
        const points = [
          [0, 0],
          [0.22, 0.06],
          [0.3, 0.34],
          [0.24, 0.72],
          [0.15, 0.86],
          [0.19, 0.95],
        ].map(([px, py]) => new THREE.Vector2(px, py));
        const g = new THREE.LatheGeometry(points, 12);
        paintStone(g, { base: "#8f7a66", algaeAmount: 0.18, seed: 55 });
        return g;
      });
      b.addRaw(
        jar,
        "bronze",
        x + (random() - 0.5) * 0.5,
        y - h / 2 + 0.02,
        z - 0.12,
      );
    }
  };
  // 廊道层(北回廊下的侧廊墙面,内庭底层视角)。
  for (const x of [197, 205.5, 214, 222.5, 231])
    niche(x, CISTERN.floorY + 6.5, 2.4, 3.1);
  // 墙身两层(回廊楼板以上,从庭院仰望可见)。
  for (const y of [-326.5, -317.5])
    for (const x of [196, 201.8, 207.6, 213.4, 219.2, 225, 230.8, 236.6, 240.5])
      niche(x, y);
  // 档案墙匾额:青铜徽记带 + 青金石徽标(视觉)。
  b.box("bronze", 34, 0.5, 0.3, 216, -309.4, WALL_N - 0.32, { solid: false });
  b.box("lapisGlow", 2.2, 2.2, 0.3, 216, -306.8, WALL_N - 0.34, {
    solid: false,
  });
}

/*********************************************
 * 南门水道:墙内拱门 + 门翼平台 + 沟槽颊墙 + 口门残柱
 *********************************************/

function buildSouthGate(b, heightAt) {
  const cx = (GATE.minX + GATE.maxX) / 2; // 216
  // 拱门:楔形拱石环绕门洞(沿用城市拱语言),拱脚在槛上 8.5m,门洞净高 16m。
  const spring = GATE.sillY + 8.5; // -325.5
  const radius = (GATE.maxX - GATE.minX) / 2 + 2.1; // 10.1
  const count = 15;
  for (let i = 0; i < count; i += 1) {
    const angle = ((i + 0.5) / count) * Math.PI;
    const seg = ((Math.PI * radius) / count) * 1.03;
    b.box(
      "marble",
      3.0,
      seg,
      3.2,
      cx + Math.cos(angle) * radius,
      spring + Math.sin(angle) * radius,
      GATE.z,
      {
        kind: "agora_ruin_arch",
        quaternion: new THREE.Quaternion()
          .setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle)
          .toArray(),
      },
    );
  }
  // 门洞两侧门框柱与徽记(视觉),门框内缘与槛平齐。
  for (const dz of [-1.4, 1.4]) {
    b.box(
      "marble",
      1.2,
      17,
      0.7,
      GATE.minX - 0.6,
      GATE.sillY + 8.5,
      GATE.z + dz,
      {
        solid: false,
      },
    );
    b.box(
      "marble",
      1.2,
      17,
      0.7,
      GATE.maxX + 0.6,
      GATE.sillY + 8.5,
      GATE.z + dz,
      {
        solid: false,
      },
    );
  }
  b.box("guideTeal", 2.6, 0.5, 0.35, cx, GATE.topY + 1.6, GATE.z + 1.45, {
    solid: false,
  });
  // 道槛:回廊楼板穿墙延伸至沟槽,厚度与楼板一致。
  b.box(
    "stone",
    GATE.maxX - GATE.minX,
    2.5,
    3.6,
    cx,
    DECK.floorY - 1.25,
    GATE.z,
    {
      kind: "agora_ruin_deck",
    },
  );
  // 门翼平台:墙外两侧各一块挑台(海洋殖民的屋面点缀落点),顶面与楼板齐平。
  for (const [x0, x1] of [
    [201, GATE.minX],
    [GATE.maxX, 231],
  ])
    b.box("stone", x1 - x0, 2.0, 5.0, (x0 + x1) / 2, DECK.floorY - 1.0, -486, {
      kind: "agora_ruin_deck",
    });
  // 沟槽颊墙:矮石坎沿沟槽两侧,顶面随沟槽坡(顶不逼门洞游线),标记水道走向。
  for (const side of [-1, 1]) {
    const face = 216 + side * 6.9; // 颊墙内面(海洋殖民附着面)
    for (let i = 0; i < 6; i += 1) {
      const z0 = TRENCH.maxZ - 0.4 - i * 2.1,
        z1 = z0 - 2.1;
      const ground = heightAt(face + side * 0.6, (z0 + z1) / 2);
      const top =
        Math.max(heightAt(face - side * 0.6, (z0 + z1) / 2), ground) +
        2.4 -
        i * 0.15;
      b.box(
        "stone",
        1.15,
        top - (ground - 1.2),
        (z0 - z1) * 1.04,
        face + side * 0.55,
        (top + ground - 1.2) / 2,
        (z0 + z1) / 2,
        {
          kind: "agora_ruin_channel",
        },
      );
    }
  }
  // 口门残柱:沟槽口两侧断柱(海洋殖民附着点),无过梁——过梁已塌落。
  const random = seededRandom(2603);
  for (const side of [-1, 1]) {
    const x = 216 + side * 10.15,
      z = TRENCH.minZ;
    const ground = heightAt(x, z);
    const height = side < 0 ? 13.8 : 11.6;
    b.box("stone", 2.3, height, 2.3, x, ground + height / 2 - 0.3, z, {
      kind: "agora_ruin_gate",
    });
    b.box("marble", 3.1, 0.9, 3.1, x, ground + height - 0.3 + 0.45, z, {
      kind: "agora_ruin_gate",
    });
    b.box("guideTeal", 1.4, 0.4, 0.3, x, ground + height - 2.2, z + 1.3, {
      solid: false,
    });
    // 塌落过梁碎段:口门外的原地面残件(贴合地形)。
    b.box(
      "marble",
      6.5,
      1.1,
      1.6,
      x + side * 3.4,
      heightAt(x + side * 3.4, z - 3) + 0.4,
      z - 3,
      {
        kind: "agora_ruin_gate",
        quaternion: new THREE.Quaternion()
          .setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * 0.9 - 0.45)
          .toArray(),
      },
    );
  }
}

/*********************************************
 * 坑缘标记:四角残柱与断续栏墙,从原海床标出下行井轮廓
 *********************************************/

function buildRimMarkers(b, heightAt) {
  const pit = AGORA_EXCAVATION_SITE.bounds;
  const random = seededRandom(9151);
  // 角柱:四隅残柱立在坑界外的原地面上,避开四颗既有贝珠。
  for (const [x, z] of [
    [182.6, -405.6],
    [247.4, -405.6],
    [182.6, -488.9],
    [247.4, -488.9],
  ]) {
    const ground = heightAt(x, z);
    const height = 5.4 + random() * 2.6;
    b.box("stone", 2.2, height, 2.2, x, ground + height / 2 - 0.2, z, {
      kind: "agora_ruin_rim",
    });
    b.box("marble", 3.0, 0.8, 3.0, x, ground + height + 0.2, z, {
      kind: "agora_ruin_rim",
    });
  }
  // 坑缘断栏:西/东/北缘断续大理石栏段;南缘只在水道两侧留短段。
  const curb = (x, z, w, d) => {
    const ground = heightAt(x, z);
    b.box("marble", w, 0.95, d, x, ground + 0.42, z, {
      kind: "agora_ruin_rim",
    });
  };
  for (let z = -480; z < -414; z += 7.2) {
    if (random() < 0.6) curb(pit.minX - 1.2, z, 1.1, 3.4);
    if (random() < 0.6) curb(pit.maxX + 1.2, z, 1.1, 3.4);
  }
  for (let x = 190; x < 242; x += 7.2)
    if (random() < 0.55) curb(x, pit.maxZ + 1.2, 3.4, 1.1);
  for (const [x0, x1] of [
    [190, 204],
    [228, 242],
  ])
    for (let x = x0; x < x1; x += 6.4)
      if (random() < 0.55) curb(x, pit.minZ - 1.4, 3.2, 1.1);
}

/*********************************************
 * 内庭台阶讲台:东北/西北两座两级台阶式读经台
 *********************************************/

function buildPodiums(b) {
  for (const side of [-1, 1]) {
    const cx = 216 + side * 10,
      cz = -424.5;
    b.box("stone", 10, 4, 8, cx, CISTERN.floorY + 2, cz, {
      kind: "agora_ruin_podium",
    });
    b.box("marble", 7, 2, 5.5, cx, CISTERN.floorY + 5, cz, {
      kind: "agora_ruin_podium",
    });
    // 台面青铜镶边(四条边框,露出石板台面)与正面徽记(视觉)。
    for (const [dx, dz, w, d] of [
      [0, -2.71, 7.2, 0.18],
      [0, 2.71, 7.2, 0.18],
      [-3.51, 0, 0.18, 5.6],
      [3.51, 0, 0.18, 5.6],
    ])
      b.box("bronze", w, 0.14, d, cx + dx, CISTERN.floorY + 6.05, cz + dz, {
        solid: false,
      });
    b.box("lapisGlow", 1.5, 0.9, 0.2, cx, CISTERN.floorY + 4.2, cz + 2.82, {
      solid: false,
    });
  }
}

/*********************************************
 * 内部修饰:马赛克圆心、倒柱、墙面嵌条与散落器物
 *********************************************/

function buildInteriorDressing(b) {
  // 回转区地面的马赛克圆心:八边形石板 + 青铜三环 + 青金石辐条(视觉,贴地)。
  const medallion = cachedGeometry("agora_mosaic_octagon", () => {
    const g = new THREE.CylinderGeometry(6.4, 6.4, 0.14, 8);
    paintStone(g, { base: "#c9c8b4", algaeAmount: 0.2, seed: 43 });
    return g;
  });
  b.add(medallion.clone(), "marble", TURN.x, CISTERN.floorY + 0.1, TURN.z);
  for (const [radius, tube] of [
    [5.4, 0.16],
    [3.6, 0.13],
    [1.8, 0.1],
  ])
    b.add(
      new THREE.TorusGeometry(radius, tube, 6, 32),
      "bronze",
      TURN.x,
      CISTERN.floorY + 0.2,
      TURN.z,
      {
        quaternion: new THREE.Quaternion()
          .setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)
          .toArray(),
      },
    );
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    b.box(
      "lapisGlow",
      0.32,
      0.08,
      3.1,
      TURN.x + Math.cos(a) * 3.9,
      CISTERN.floorY + 0.22,
      TURN.z + Math.sin(a) * 3.9,
      {
        solid: false,
        quaternion: new THREE.Quaternion()
          .setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a + Math.PI / 2)
          .toArray(),
      },
    );
  }
  // 青金石色嵌条:只反射贝珠柔光,不把墙面做成发亮灯管。
  for (const z of [-470, -455, -440, -425]) {
    b.box("stone", 1.1, 8, 0.3, WALL_W + 0.16, CISTERN.floorY + 7.5, z, {
      solid: false,
      tint: "#526e75",
    });
    b.box("stone", 1.1, 8, 0.3, WALL_E - 0.16, CISTERN.floorY + 7.5, z, {
      solid: false,
      tint: "#526e75",
    });
  }
  for (const x of [200, 210, 226, 236])
    b.box("stone", 1.1, 7, 0.3, x, CISTERN.floorY + 7, WALL_S + 0.16, {
      solid: false,
      tint: "#526e75",
    });
  // 西廊倒塌的柱段(贴地,胶囊碰撞与柱身同位),横陈在凳与箱之间。
  const fallen = cachedGeometry("agora_fallen_column", () => {
    const g = new THREE.CylinderGeometry(1.05, 1.18, 9.5, 18);
    paintStone(g, { base: "#c9c8b4", algaeAmount: 0.32, seed: 61 });
    return g;
  });
  b.addRaw(fallen, "marble", 191.55, CISTERN.floorY + 1.05, -465, [
    0.05,
    Math.PI / 2 + 0.06,
    Math.PI / 2 - 0.04,
  ]);
  b.colliders.push({
    type: "capsule",
    kind: "agora_ruin_column",
    a: { x: 191.3, y: CISTERN.floorY + 1.0, z: -460.6 },
    b: { x: 191.8, y: CISTERN.floorY + 1.0, z: -469.4 },
    radius: 1.2,
  });
  // 散落器物:盘、碗、卷轴罐,沿墙根与讲台点缀,不挡主游线(视觉小件)。
  const random = seededRandom(3377);
  const bowl = cachedGeometry("agora_scatter_bowl", () => {
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
  const disc = cachedGeometry("agora_scatter_disc", () => {
    const g = new THREE.CylinderGeometry(0.55, 0.62, 0.16, 14);
    paintStone(g, { base: "#b9b7a6", algaeAmount: 0.24, seed: 78 });
    return g;
  });
  const spots = [
    [192.6, -455],
    [192.8, -468],
    [239.4, -447],
    [239.6, -461],
    [209, -479.6],
    [223, -479.8],
    [203, -422.6],
    [229, -422.8],
    [196.5, -480.8],
    [236.5, -479.4],
  ];
  for (const [x, z] of spots) {
    if (random() < 0.2) continue;
    b.addRaw(
      random() > 0.45 ? bowl : disc,
      "bronze",
      x,
      CISTERN.floorY + 0.05,
      z,
      [random() > 0.72 ? 1.45 : 0, random() * Math.PI, 0],
    );
  }
}

/*********************************************
 * 古家具陈设:读经凳/石桌/雕纹储物箱/双耳瓶群/宝箱台(全新布置,非港湾平移)
 *********************************************/

/** 档案库沿侧廊与北展台独立构图；坐标为当前区域的世界坐标。 */
function agoraFurniturePlan(site) {
  const lower = site.levels[1].floorY,
    upper = site.levels[0].floorY;
  return [
    { kind: "bench", x: 240.3, z: -442, yaw: Math.PI / 2 },
    { kind: "chest", x: 240.4, z: -452.5 },
    { kind: "amphora", x: 240.2, z: -468, count: 5, seed: 31 },
    { kind: "bench", x: 191.7, z: -444, yaw: Math.PI / 2 },
    { kind: "chest", x: 191.6, z: -456, yaw: 0.2 },
    { kind: "amphora", x: 207, z: -481.3, count: 4, seed: 47 },
    { kind: "table", x: 218.5, z: -480.7 },
    { kind: "bench", x: 218.5, z: -482.4 },
    { kind: "bench", x: 221.1, z: -481.3, yaw: Math.PI / 2 },
    { kind: "chest", x: 230.5, z: -481.2 },
    { kind: "table", x: 237.8, z: -480.7 },
    { kind: "bench", x: 237.8, z: -482.4 },
    { kind: "chest", x: 200.8, z: -416, floor: upper },
    { kind: "chest", x: 212.5, z: -416.3, yaw: -0.25, floor: upper },
    { kind: "chest", x: 225.2, z: -415.2, floor: upper },
    { kind: "bench", x: 231.8, z: -414.3, floor: upper },
  ].map((item) => ({ floor: lower, ...item }));
}

/*********************************************
 * 厅内贝珠生境:复用贝珠壁龛构件,两龛珠光走既有 5 灯池元数据
 *********************************************/

function buildPearlNiches(b, lightSources) {
  const habitat = pearlHabitat({ detail: "niche" });
  for (const [x, floor, z, angle] of [
    // 南廊西端一龛,照亮读经席;北廊道一龛,照亮档案墙脚下层。
    [198, CISTERN.floorY - 0.2, -480.3, 0.08],
    [210, CISTERN.floorY - 0.2, -415.8, -0.12],
  ]) {
    lightSources.push({
      x,
      y: floor + habitat.lightHeight,
      z,
      color: "#ffe3ab",
      intensity: PEARL_LIGHT_INTENSITY,
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
