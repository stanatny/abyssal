import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/**
 * 亚特兰蒂斯夜航小船队的原创程序化建模：放样船壳带舷弧、甲板、桅杆、
 * 简化索具与暖色灯笼。三艘 8–16 米级小船（单桅渔船/双桅探险船/小汽艇）
 * 造型互相区分；只构建几何与材质，巡游与碰撞回填在 atlantis_surface.js。
 */

// 确定性伪随机，甲板杂物的位置抖动每次构建一致。
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 夜间船队共享材质：深色船壳按船分色，木件/帆布/金属/暖光全舰队共享。
 * 每艘的 hull 与 accent 不同，合并后仍保持远观辨识度。
 */
export function makeFleetMaterials(keep) {
  const commons = {
    deck: keep(
      new THREE.MeshStandardMaterial({ color: "#5c4a34", roughness: 0.8 }),
    ),
    cloth: keep(
      new THREE.MeshStandardMaterial({ color: "#a89c80", roughness: 0.92 }),
    ),
    metal: keep(
      new THREE.MeshStandardMaterial({
        color: "#2b3038",
        roughness: 0.45,
        metalness: 0.6,
      }),
    ),
    brass: keep(
      new THREE.MeshStandardMaterial({
        color: "#8a6a3c",
        roughness: 0.35,
        metalness: 0.7,
      }),
    ),
    rope: keep(
      new THREE.LineBasicMaterial({
        color: "#1d242b",
        transparent: true,
        opacity: 0.9,
      }),
    ),
    lanternGlass: keep(
      new THREE.MeshStandardMaterial({
        color: "#40260c",
        emissive: "#ffa64d",
        emissiveIntensity: 2.4,
        roughness: 0.4,
      }),
    ),
    windowWarm: keep(
      new THREE.MeshStandardMaterial({
        color: "#2a1a08",
        emissive: "#ff9c3f",
        emissiveIntensity: 1.5,
        roughness: 0.5,
      }),
    ),
    ember: keep(
      new THREE.MeshStandardMaterial({
        color: "#1a0d06",
        emissive: "#ff5a26",
        emissiveIntensity: 1.4,
        roughness: 0.6,
      }),
    ),
  };
  addSurfaceDetail(commons.deck, "wood", 1.0);
  const accents = {
    fisher: {
      hull: keep(
        new THREE.MeshStandardMaterial({
          color: "#26382e",
          roughness: 0.55,
          metalness: 0.1,
        }),
      ),
      accent: keep(
        new THREE.MeshStandardMaterial({ color: "#7a3b28", roughness: 0.62 }),
      ),
    },
    ketch: {
      hull: keep(
        new THREE.MeshStandardMaterial({
          color: "#1d2c47",
          roughness: 0.4,
          metalness: 0.2,
        }),
      ),
      accent: keep(
        new THREE.MeshStandardMaterial({ color: "#b07a3a", roughness: 0.55 }),
      ),
    },
    launch: {
      hull: keep(
        new THREE.MeshStandardMaterial({
          color: "#171c22",
          roughness: 0.42,
          metalness: 0.32,
        }),
      ),
      accent: keep(
        new THREE.MeshStandardMaterial({ color: "#c8bd9c", roughness: 0.7 }),
      ),
    },
  };
  for (const kind of Object.values(accents))
    addSurfaceDetail(kind.hull, "wood", 0.6);
  return { commons, accents };
}

// 每种船的放样截面与舷弧参数；截面从艉(+z)到艏(-z)，beam 为半宽系数。
const HULL_SPECS = {
  fisher: {
    freeboard: 0.85,
    draft: 1.0,
    sheer: 0.3,
    stations: [
      [0.47, 0.66],
      [0.28, 1],
      [-0.18, 1],
      [-0.38, 0.74],
      [-0.5, 0.06],
    ],
  },
  ketch: {
    freeboard: 0.95,
    draft: 1.1,
    sheer: 0.34,
    stations: [
      [0.48, 0.6],
      [0.3, 1],
      [-0.2, 1],
      [-0.38, 0.7],
      [-0.5, 0.05],
    ],
  },
  launch: {
    freeboard: 0.6,
    draft: 0.75,
    sheer: 0.2,
    stations: [
      [0.46, 0.9],
      [0.28, 1],
      [-0.2, 0.98],
      [-0.4, 0.62],
      [-0.48, 0.08],
    ],
  },
};

function mesh(root, geometry, material, keep, position, scale, rotation) {
  const result = new THREE.Mesh(keep(geometry), material);
  if (position) result.position.set(...position);
  if (scale) result.scale.set(...scale);
  if (rotation) result.rotation.set(...rotation);
  root.add(result);
  return result;
}

function box(root, material, keep, size, position, rotation) {
  return mesh(
    root,
    new RoundedBoxGeometry(...size, 2, Math.min(0.1, Math.min(...size) * 0.2)),
    material,
    keep,
    position,
    null,
    rotation,
  );
}

/**
 * 放样船壳：U 形截面沿艏艉收窄，舷缘带舷弧（两端上翘、艏更高），
 * 法线沿船体连续；附带甲板板、舷缘压条与水线色带。
 */
export function buildHull(root, ship, materials, keep) {
  const { length, width } = ship;
  const spec = HULL_SPECS[ship.kind];
  ship.hullStations = spec.stations;
  ship.hullDraft = spec.draft;
  ship.hullFreeboard = spec.freeboard;
  // 归一化 U 形截面：[-1..1] → 上段乘干舷、下段乘吃水。
  const profile = [
    [-1, 1],
    [-0.99, 0.55],
    [-0.94, 0.02],
    [-0.8, -0.55],
    [-0.56, -0.86],
    [-0.26, -0.98],
    [0, -1],
    [0.26, -0.98],
    [0.56, -0.86],
    [0.8, -0.55],
    [0.94, 0.02],
    [0.99, 0.55],
    [1, 1],
  ];
  const positions = [];
  const indices = [];
  for (const [z, beam] of spec.stations) {
    const half = (width * beam) / 2;
    // 舷弧：舷缘在艏艉段上翘，艏部抬升更多。
    const endT = THREE.MathUtils.smoothstep(Math.abs(z), 0.16, 0.5);
    const lift = spec.sheer * endT * (z < 0 ? 1.2 : 0.75);
    for (const [x, y] of profile) {
      const world = y >= 0 ? y * spec.freeboard : y * spec.draft;
      positions.push(x * half, world + lift * Math.max(0, y), z * length);
    }
  }
  const count = profile.length;
  for (let station = 0; station < spec.stations.length - 1; station++) {
    for (let side = 0; side < count; side++) {
      const a = station * count + side;
      const b = station * count + ((side + 1) % count);
      indices.push(a, a + count, b, b, a + count, b + count);
    }
  }
  for (let i = 1; i < count - 1; i++) indices.push(0, i, i + 1);
  for (let i = 1; i < count - 1; i++) {
    const a = (spec.stations.length - 1) * count;
    indices.push(a, a + i + 1, a + i);
  }
  const hull = new THREE.BufferGeometry();
  hull.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  hull.setIndex(indices);
  hull.computeVertexNormals();
  mesh(root, hull, materials.hull, keep);
  const deckY = spec.freeboard * 0.78;
  ship.deckY = deckY;
  box(
    root,
    materials.deck,
    keep,
    [width * 0.84, 0.1, length * 0.66],
    [0, deckY, length * 0.02],
  );
  // 舷缘压条与水线色带沿放样截面走，保持侧影连贯。
  for (const side of [-1, 1]) {
    const strip = (y, height, material) => {
      const vertices = [];
      const ids = [];
      for (const [z, beam] of spec.stations) {
        const endT = THREE.MathUtils.smoothstep(Math.abs(z), 0.16, 0.5);
        const lift = spec.sheer * endT * (z < 0 ? 1.2 : 0.75);
        const x = side * width * beam * 0.5 * (y > deckY ? 0.995 : 0.94);
        vertices.push(
          x,
          y + lift - height / 2,
          z * length,
          x,
          y + lift + height / 2,
          z * length,
        );
      }
      for (let i = 0; i < spec.stations.length - 1; i++) {
        const a = i * 2;
        if (side > 0) ids.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        else ids.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      const stripe = new THREE.BufferGeometry();
      stripe.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      stripe.setIndex(ids);
      stripe.computeVertexNormals();
      mesh(root, stripe, material, keep);
    };
    strip(deckY + 0.12, 0.12, materials.accent);
    strip(0.02, 0.16, materials.metal);
  }
}

/** 桅杆与横杆，杆上卷好的夜航收帆（中段略鼓的帆捆加三道捆带）。 */
function addMastWithFurledSail(
  root,
  ship,
  materials,
  keep,
  z,
  height,
  boomReach,
) {
  const { deckY } = ship;
  mesh(
    root,
    new THREE.CylinderGeometry(0.05, 0.11, height, 7),
    materials.deck,
    keep,
    [0, deckY + height / 2, z],
  );
  const boomY = deckY + height * 0.32;
  mesh(
    root,
    new THREE.CylinderGeometry(0.04, 0.06, boomReach, 6),
    materials.deck,
    keep,
    [0, boomY, z + boomReach / 2 - 0.3],
    null,
    [Math.PI / 2, 0, 0],
  );
  // 帆捆：两端细中间鼓的收帆包，贴杆下垂。
  const bundle = mesh(
    root,
    new THREE.CapsuleGeometry(0.23, boomReach * 0.8, 4, 8),
    materials.cloth,
    keep,
    [0, boomY - 0.24, z + boomReach / 2 - 0.3],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
  );
  bundle.scale.set(1, 1, 0.82);
  for (const t of [0.2, 0.5, 0.8]) {
    mesh(
      root,
      new THREE.TorusGeometry(0.25, 0.028, 5, 10),
      materials.metal,
      keep,
      [0, boomY - 0.18, z - 0.3 + boomReach * t],
      null,
      [0, 0, 0],
    );
  }
  return { topY: deckY + height, boomY };
}

/** 简化索具：桅顶到艏艉与两舷的静态线段，一次绘制。 */
function addRigging(root, materials, keep, segments) {
  const points = [];
  for (const [a, b] of segments) points.push(...a, ...b);
  const geometry = keep(new THREE.BufferGeometry());
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points, 3),
  );
  root.add(new THREE.LineSegments(geometry, materials.rope));
}

/** 暖色灯笼：金属座、玻璃罩与叠加光晕 sprite；真实点光由工厂按船添加。 */
function addLantern(root, ship, materials, keep, position, size = 1) {
  const [x, y, z] = position;
  mesh(
    root,
    new THREE.CylinderGeometry(0.05 * size, 0.07 * size, 0.05 * size, 6),
    materials.metal,
    keep,
    [x, y - 0.12 * size, z],
  );
  mesh(
    root,
    new THREE.CylinderGeometry(0.07 * size, 0.055 * size, 0.16 * size, 6),
    materials.lanternGlass,
    keep,
    [x, y, z],
  );
  mesh(
    root,
    new THREE.ConeGeometry(0.09 * size, 0.08 * size, 6),
    materials.metal,
    keep,
    [x, y + 0.12 * size, z],
  );
  const glow = new THREE.Sprite(ship.glowMaterial);
  glow.position.set(x, y, z);
  glow.scale.set(3.0 * size, 3.0 * size, 1);
  glow.renderOrder = 3;
  root.add(glow);
}

/** 甲板杂物：板条箱、缆绳盘、渔网鼓与木桶，位置按种子固定。 */
function addDeckProps(root, ship, materials, keep, seed, spots) {
  const rand = seededRandom(seed);
  const { deckY } = ship;
  for (const [x, z, kind] of spots) {
    const jitter = () => (rand() - 0.5) * 0.06;
    if (kind === "crate") {
      box(
        root,
        materials.deck,
        keep,
        [0.52, 0.4, 0.52],
        [x + jitter(), deckY + 0.25, z + jitter()],
        [0, rand() * 0.6, 0],
      );
    } else if (kind === "barrel") {
      mesh(
        root,
        new THREE.CylinderGeometry(0.2, 0.24, 0.5, 9),
        materials.deck,
        keep,
        [x + jitter(), deckY + 0.3, z + jitter()],
      );
    } else if (kind === "coil") {
      mesh(
        root,
        new THREE.TorusGeometry(0.24, 0.08, 6, 14),
        materials.metal,
        keep,
        [x + jitter(), deckY + 0.12, z + jitter()],
        null,
        [-Math.PI / 2, 0, 0],
      );
    } else if (kind === "netdrum") {
      mesh(
        root,
        new THREE.CylinderGeometry(0.3, 0.3, 0.66, 10),
        materials.accent,
        keep,
        [x, deckY + 0.36, z],
        null,
        [0, 0, Math.PI / 2],
      );
      mesh(
        root,
        new THREE.CylinderGeometry(0.38, 0.38, 0.06, 10),
        materials.metal,
        keep,
        [x - 0.36, deckY + 0.36, z],
        null,
        [0, 0, Math.PI / 2],
      );
      mesh(
        root,
        new THREE.CylinderGeometry(0.38, 0.38, 0.06, 10),
        materials.metal,
        keep,
        [x + 0.36, deckY + 0.36, z],
        null,
        [0, 0, Math.PI / 2],
      );
    }
  }
}

/** 单桅渔船：翘艏宽身、船艉小舱、独桅收帆、网鼓与缆绳，桅顶与艉灯。 */
export function buildFisher(root, ship, materials, keep) {
  const { length, width } = ship;
  buildHull(root, ship, materials, keep);
  const deckY = ship.deckY;
  box(
    root,
    materials.deck,
    keep,
    [width * 0.52, 0.85, length * 0.2],
    [0, deckY + 0.48, length * 0.3],
  );
  box(
    root,
    materials.accent,
    keep,
    [width * 0.56, 0.1, length * 0.23],
    [0, deckY + 0.95, length * 0.3],
  );
  // 舱室暖窗：左右两条发光小窗，夜里远观即知有人作业。
  for (const side of [-1, 1]) {
    box(
      root,
      materials.windowWarm,
      keep,
      [0.04, 0.2, length * 0.12],
      [side * width * 0.27, deckY + 0.52, length * 0.3],
    );
  }
  const mast = addMastWithFurledSail(
    root,
    ship,
    materials,
    keep,
    length * 0.02,
    length * 0.92,
    length * 0.42,
  );
  addRigging(root, materials, keep, [
    [
      [0, mast.topY, length * 0.02],
      [0, deckY + 0.5, -length * 0.46],
    ],
    [
      [0, mast.topY, length * 0.02],
      [0, deckY + 0.4, length * 0.45],
    ],
    [
      [0, mast.topY, length * 0.02],
      [-width * 0.42, deckY + 0.2, length * 0.06],
    ],
    [
      [0, mast.topY, length * 0.02],
      [width * 0.42, deckY + 0.2, length * 0.06],
    ],
  ]);
  addDeckProps(root, ship, materials, keep, 11, [
    [-width * 0.22, -length * 0.18, "netdrum"],
    [width * 0.24, -length * 0.05, "crate"],
    [-width * 0.25, length * 0.08, "coil"],
    [width * 0.2, length * 0.14, "barrel"],
  ]);
  addLantern(
    root,
    ship,
    materials,
    keep,
    [0, mast.topY + 0.1, length * 0.02],
    0.9,
  );
  // 艉部灯杆与灯笼。
  mesh(
    root,
    new THREE.CylinderGeometry(0.03, 0.04, 1.1, 6),
    materials.metal,
    keep,
    [0, deckY + 0.6, length * 0.44],
  );
  addLantern(root, ship, materials, keep, [0, deckY + 1.2, length * 0.44], 1);
}

/** 双桅探险船：长舱楼、前后双桅收帆、艉部栏杆高，舷窗暖光成排。 */
export function buildKetch(root, ship, materials, keep) {
  const { length, width } = ship;
  buildHull(root, ship, materials, keep);
  const deckY = ship.deckY;
  box(
    root,
    materials.deck,
    keep,
    [width * 0.56, 0.8, length * 0.32],
    [0, deckY + 0.45, length * 0.12],
  );
  box(
    root,
    materials.accent,
    keep,
    [width * 0.6, 0.1, length * 0.35],
    [0, deckY + 0.9, length * 0.12],
  );
  // 舱楼两侧各三联暖窗。
  for (const side of [-1, 1]) {
    for (const dz of [-0.09, 0, 0.09]) {
      box(
        root,
        materials.windowWarm,
        keep,
        [0.04, 0.2, 0.28],
        [side * width * 0.29, deckY + 0.5, length * (0.12 + dz)],
      );
    }
  }
  const main = addMastWithFurledSail(
    root,
    ship,
    materials,
    keep,
    -length * 0.04,
    length * 0.95,
    length * 0.4,
  );
  const mizzen = addMastWithFurledSail(
    root,
    ship,
    materials,
    keep,
    length * 0.3,
    length * 0.6,
    length * 0.26,
  );
  addRigging(root, materials, keep, [
    [
      [0, main.topY, -length * 0.04],
      [0, deckY + 0.5, -length * 0.47],
    ],
    [
      [0, main.topY, -length * 0.04],
      [0, mizzen.topY, length * 0.3],
    ],
    [
      [0, mizzen.topY, length * 0.3],
      [0, deckY + 0.4, length * 0.47],
    ],
    [
      [0, main.topY, -length * 0.04],
      [-width * 0.44, deckY + 0.2, 0],
    ],
    [
      [0, main.topY, -length * 0.04],
      [width * 0.44, deckY + 0.2, 0],
    ],
    [
      [0, mizzen.topY, length * 0.3],
      [-width * 0.4, deckY + 0.2, length * 0.34],
    ],
    [
      [0, mizzen.topY, length * 0.3],
      [width * 0.4, deckY + 0.2, length * 0.34],
    ],
  ]);
  addDeckProps(root, ship, materials, keep, 23, [
    [width * 0.22, -length * 0.22, "crate"],
    [-width * 0.2, -length * 0.26, "barrel"],
    [0, -length * 0.32, "coil"],
  ]);
  addLantern(
    root,
    ship,
    materials,
    keep,
    [0, main.topY + 0.1, -length * 0.04],
    0.9,
  );
  mesh(
    root,
    new THREE.CylinderGeometry(0.03, 0.04, 1.2, 6),
    materials.metal,
    keep,
    [0, deckY + 0.65, length * 0.46],
  );
  addLantern(
    root,
    ship,
    materials,
    keep,
    [0, deckY + 1.3, length * 0.46],
    1.05,
  );
}

/** 小汽艇：低舷黑壳、铜箍烟囱余烬、带顶棚的座舱与艏灯杆。 */
export function buildLaunch(root, ship, materials, keep) {
  const { length, width } = ship;
  buildHull(root, ship, materials, keep);
  const deckY = ship.deckY;
  // 机舱矮台与烟囱，烟囱口留一点余烬光。
  box(
    root,
    materials.metal,
    keep,
    [width * 0.5, 0.5, length * 0.2],
    [0, deckY + 0.3, -length * 0.05],
  );
  mesh(
    root,
    new THREE.CylinderGeometry(0.16, 0.2, 1.5, 9),
    materials.metal,
    keep,
    [0, deckY + 1.15, -length * 0.08],
  );
  mesh(
    root,
    new THREE.CylinderGeometry(0.21, 0.21, 0.12, 9),
    materials.brass,
    keep,
    [0, deckY + 1.65, -length * 0.08],
  );
  mesh(
    root,
    new THREE.CylinderGeometry(0.13, 0.13, 0.06, 9),
    materials.ember,
    keep,
    [0, deckY + 1.92, -length * 0.08],
  );
  // 座舱顶棚：四根细柱撑一块微拱棚布，棚下吊一盏灯。
  const canopyZ = length * 0.22;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      mesh(
        root,
        new THREE.CylinderGeometry(0.025, 0.025, 1.15, 5),
        materials.metal,
        keep,
        [sx * width * 0.34, deckY + 0.62, canopyZ + sz * length * 0.13],
      );
    }
  }
  box(
    root,
    materials.accent,
    keep,
    [width * 0.84, 0.07, length * 0.34],
    [0, deckY + 1.24, canopyZ],
  );
  // 座舱长凳与舵轮（舵轮下有小立柱，不是悬浮环）。
  box(
    root,
    materials.deck,
    keep,
    [width * 0.6, 0.12, 0.3],
    [0, deckY + 0.32, length * 0.36],
  );
  box(
    root,
    materials.metal,
    keep,
    [0.08, 0.5, 0.08],
    [0, deckY + 0.45, length * 0.06],
  );
  mesh(
    root,
    new THREE.TorusGeometry(0.2, 0.03, 6, 14),
    materials.brass,
    keep,
    [0, deckY + 0.72, length * 0.06],
    null,
    [0.3, 0, 0],
  );
  // 艏部灯杆前倾，灯笼就挂在杆顶。
  mesh(
    root,
    new THREE.CylinderGeometry(0.025, 0.04, 1.3, 6),
    materials.metal,
    keep,
    [0, deckY + 0.7, -length * 0.42],
    null,
    [0.22, 0, 0],
  );
  addLantern(
    root,
    ship,
    materials,
    keep,
    [
      0,
      deckY + 0.7 + 0.65 * Math.cos(0.22) + 0.1,
      -length * 0.42 - 0.65 * Math.sin(0.22),
    ],
    0.95,
  );
  addLantern(root, ship, materials, keep, [0, deckY + 1.05, canopyZ], 0.8);
}

export const SHIP_BUILDERS = {
  fisher: buildFisher,
  ketch: buildKetch,
  launch: buildLaunch,
};

/**
 * 船队碰撞：与 ships.js 相同的 box 格式（shipKind + localPosition），
 * 船壳沿截面分段、吃水仅覆盖干舷以下约 1 米，深潜可从船底穿行。
 */
export function addShipColliders(ship, colliders) {
  const addCollider = (size, position, kind = "ship_hull") => {
    const collider = {
      type: "box",
      kind,
      shipKind: ship.kind,
      x: 0,
      y: 0,
      z: 0,
      halfSize: { x: size[0] / 2, y: size[1] / 2, z: size[2] / 2 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      localPosition: new THREE.Vector3(...position),
    };
    ship.colliders.push(collider);
    colliders.push(collider);
  };
  const stations = ship.hullStations;
  // 碰撞高度从龙骨到甲板，吃水浅，竖直中心随干舷/吃水差值偏移。
  const height = ship.hullDraft + ship.hullFreeboard * 0.8;
  const centerY = (ship.hullFreeboard * 0.8 - ship.hullDraft) / 2;
  for (let index = 1; index < stations.length; index++) {
    const [frontZ, frontBeam] = stations[index];
    const [backZ, backBeam] = stations[index - 1];
    for (let half = 0; half < 2; half++) {
      const t0 = half / 2;
      const t1 = (half + 1) / 2;
      const z0 = frontZ + (backZ - frontZ) * t0;
      const z1 = frontZ + (backZ - frontZ) * t1;
      const beam0 = frontBeam + (backBeam - frontBeam) * t0;
      const beam1 = frontBeam + (backBeam - frontBeam) * t1;
      addCollider(
        [ship.width * Math.max(beam0, beam1), height, ship.length * (z1 - z0)],
        [0, centerY, (ship.length * (z0 + z1)) / 2],
      );
    }
  }
  // 舱室/顶棚的可站立碰撞，按船型给薄盒。
  if (ship.kind === "fisher") {
    addCollider(
      [ship.width * 0.52, 0.95, ship.length * 0.2],
      [0, ship.deckY + 0.5, ship.length * 0.3],
      "ship_cabin",
    );
  } else if (ship.kind === "ketch") {
    addCollider(
      [ship.width * 0.56, 0.9, ship.length * 0.32],
      [0, ship.deckY + 0.47, ship.length * 0.12],
      "ship_cabin",
    );
  } else {
    addCollider(
      [ship.width * 0.8, 1.1, ship.length * 0.34],
      [0, ship.deckY + 0.65, ship.length * 0.22],
      "ship_cabin",
    );
    addCollider(
      [0.44, 1.6, 0.44],
      [0, ship.deckY + 1.0, -ship.length * 0.08],
      "ship_funnel",
    );
  }
}

/** 夜航尾迹：沿用 ships.js 的条带思路，月色下更淡更冷。 */
export function makeWakeMaterial(keep, timeUniform) {
  return keep(
    new THREE.ShaderMaterial({
      uniforms: { time: timeUniform },
      vertexShader: `varying vec2 vUv; varying vec3 vWorld;
      void main() { vUv = uv; vec4 p = modelMatrix * vec4(position, 1.0); vWorld = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }`,
      fragmentShader: `uniform float time; varying vec2 vUv; varying vec3 vWorld;
      void main() {
        float edge = pow(max(0.0, sin(vUv.x * 3.14159)), 0.65);
        float tail = 1.0 - smoothstep(0.4, 1.0, vUv.y);
        float streak = pow(0.5 + 0.5 * sin(vUv.y * 67.0 - time * 2.6 + sin(vUv.x * 19.0 + time * 0.2) * 2.0), 2.0);
        streak = mix(streak, 0.13, vUv.y);
        float distanceFade = exp(-distance(cameraPosition, vWorld) * 0.0035);
        gl_FragColor = vec4(0.72, 0.8, 0.84, edge * tail * streak * distanceFade * 0.4);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
}

export function makeWakeGeometry(length, width) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const ribbon = (start, end, fromWidth, toWidth) => {
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const distance = Math.hypot(dx, dz);
    const nx = dz / distance;
    const nz = -dx / distance;
    const offset = positions.length / 3;
    for (const [x, z, half, u, v] of [
      [start[0], start[1], -fromWidth, 0, 0],
      [start[0], start[1], fromWidth, 1, 0],
      [end[0], end[1], -toWidth, 0, 1],
      [end[0], end[1], toWidth, 1, 1],
    ]) {
      positions.push(x + nx * half, 0.18, z + nz * half);
      uvs.push(u, v);
    }
    indices.push(
      offset,
      offset + 2,
      offset + 1,
      offset + 1,
      offset + 2,
      offset + 3,
    );
  };
  ribbon([0, length * 0.45], [0, length * 1.4], width * 0.28, width * 0.62);
  for (const side of [-1, 1]) {
    ribbon(
      [side * width * 0.43, -length * 0.17],
      [side * width * 1.4, length * 0.8],
      0.14,
      1.0,
    );
    // 船艏两侧挤出的月色泡沫弧。
    ribbon(
      [0, -length * 0.47],
      [side * width * 1.0, -length * 0.08],
      0.13,
      0.8,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** 小型附着件按材质合批，不为每根栏杆、每扇舷窗增加绘制调用。 */
export function batchShipMeshes(root, keep) {
  const groups = new Map();
  for (const child of root.children) {
    if (!child.isMesh || child.isInstancedMesh) continue;
    if (!groups.has(child.material)) groups.set(child.material, []);
    groups.get(child.material).push(child);
  }
  for (const [material, children] of groups) {
    const geometries = children.map((child) => {
      child.updateMatrix();
      const g = child.geometry.index
        ? child.geometry.toNonIndexed()
        : child.geometry.clone();
      g.applyMatrix4(child.matrix);
      if (!material.map) g.deleteAttribute("uv");
      return g;
    });
    const merged = keep(mergeGeometries(geometries));
    for (const g of geometries) g.dispose();
    for (const child of children) root.remove(child);
    const batch = new THREE.Mesh(merged, material);
    batch.name = "ship_detail_batch";
    root.add(batch);
  }
}
