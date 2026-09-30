import * as THREE from "three";
import {
  createBermudaBuilder,
  bermudaMaterials,
  hullStripGeometry,
} from "./bermuda_geometry.js";

import { BERMUDA_WRECK, wreckWorldPoint } from "./bermuda_sites.js";
export { BERMUDA_WRECK } from "./bermuda_sites.js";
export const WRECK_ROUTES = Object.freeze(
  [
    {
      id: "stern_atrium",
      points: [
        [-65, -451, -511],
        [-65, -451, -589],
        [-65, -451, -635],
      ],
    },
    {
      id: "starboard_atrium",
      points: [
        [-15, -468, -600],
        [-65, -468, -600],
        [-65, -468, -635],
      ],
    },
    {
      id: "atrium_descent",
      points: [
        [-65, -428, -635],
        [-65, -450, -635],
        [-65, -468, -635],
      ],
    },
    {
      id: "bow_hold",
      points: [
        [-65, -468, -635],
        [-65, -468, -713],
        [-65, -468, -776],
      ],
    },
  ].map((route) => ({ ...route, points: route.points.map(wreckWorldPoint) })),
);

/** 原创四烟囱沉没邮轮；真正开放的舱室和多层中庭，使用薄壁碰撞而非整船代理。 */
export function createBermudaWreck(parent, { heightAt } = {}) {
  const resources = new Set(),
    keep = (r) => (resources.add(r), r),
    root = new THREE.Group();
  root.name = "bermuda_ocean_liner_wreck";
  root.position.fromArray(BERMUDA_WRECK.center);
  parent.add(root);
  const m = bermudaMaterials(keep),
    b = createBermudaBuilder(root, keep, root.position);
  let disposed = false;
  const doubleSteel = keep(m.steel.clone());
  doubleSteel.name = "double_hull";
  doubleSteel.side = THREE.DoubleSide;
  for (const side of [-1, 1]) {
    b.add(hullStripGeometry(240, 54, 38, { side, broken: true }), doubleSteel);
    // 船侧薄壁按纵向分段，与可见艏艉的收窄轮廓对应；右舷中段留下大破口。
    for (let z = -108; z < 111; z += 12) {
      const width = 27 * Math.min(1, (120 - Math.abs(z)) / 28);
      for (let level = 0; level < 4; level++) {
        if (side === 1 && z >= 30 && z <= 66 && (level === 1 || level === 2))
          continue;
        const y0 = level * 9.5,
          y1 = y0 + 9.5;
        const x0 =
            side * width * (0.55 + Math.sin(((y0 / 38) * Math.PI) / 2) * 0.45),
          x1 =
            side * width * (0.55 + Math.sin(((y1 / 38) * Math.PI) / 2) * 0.45);
        b.box(
          m.steel,
          [(x0 + x1) / 2, (y0 + y1) / 2, z],
          [0.9, Math.hypot(y1 - y0, x1 - x0), 12],
          true,
          [0, 0, -Math.atan2(x1 - x0, y1 - y0)],
        );
      }
      for (const y of [13, 27, 35]) {
        if (side === 1 && z >= 30 && z <= 66 && y < 35) continue;
        const ring = new THREE.TorusGeometry(0.64, 0.15, 6, 12);
        ring.rotateY(Math.PI / 2);
        b.add(ring, m.brass, [side * (width + 0.22), y, z]);
        b.box(m.dark, [side * (width + 0.1), y, z], [0.18, 0.92, 0.92]);
      }
    }
    for (let z = -100; z <= 104; z += 12) {
      const width = 27 * Math.min(1, (120 - Math.abs(z)) / 28);
      b.beam(m.rust, [side * width, 0, z], [side * width, 38, z], 0.35);
      // 舷缘断续扶栏，没有沿破口凭空封闭的碰撞。
      if (z < 25 || z > 74) {
        b.beam(
          m.brass,
          [side * width, 39, z - 5],
          [side * width, 39, z + 5],
          0.11,
        );
        b.beam(m.brass, [side * width, 36, z], [side * width, 39, z], 0.12);
      }
    }
  }
  // 下层贯通货舱；后/前端保留可游进的开口。
  b.box(m.steel, [0, 1, 0], [29, 2, 220], true);
  for (const y of [23, 44, 62]) {
    // 两侧走廊甲板，中间的大中庭竖向开放。
    for (const side of [-1, 1])
      b.box(m.wood, [side * 20, y, 0], [10, 1.4, 205], true);
    for (const z of [-83, 75]) b.box(m.wood, [0, y, z], [30, 1.4, 47], true);
    // 两端舱壁只封侧翼，中央24米门洞保留。
    for (const z of [-108, 108])
      for (const side of [-1, 1])
        b.box(m.steel, [side * 19, y + 8, z], [10, 16, 1], true);
  }
  // 脱落的顶层板只覆盖真实侧舱，不跨越中庭。
  for (const side of [-1, 1]) {
    b.box(m.pale, [side * 22, 53, 0], [1.1, 20, 190], true);
    for (let z = -78; z < 80; z += 17) {
      b.box(m.pale, [side * 22.7, 53, z], [0.3, 5, 7]);
      b.box(m.dark, [side * 23, 53, z], [0.2, 3.5, 5]);
      b.beam(m.brass, [side * 15, 45, z], [side * 15, 48, z], 0.11);
      b.beam(m.brass, [side * 15, 48, z - 7], [side * 15, 48, z + 7], 0.1);
    }
  }
  // 原邮轮四根倾倒/侵蚀烟囱，顶层保持四烟囱的可辨剪影。
  for (let i = 0; i < 4; i++) {
    const z = -68 + i * 44,
      x = i === 2 ? 18 : 0,
      y = i === 2 ? 54 : 64;
    const tilt = i === 2 ? 0.82 : 0.04;
    if (i === 1) b.box(m.steel, [0, 63, z], [36, 2, 10], true);
    else b.box(m.steel, [x, 63, z], [12, 2, 12], true);
    const funnel = new THREE.CylinderGeometry(4.5, 5.7, 18, 20, 3, true);
    funnel.rotateZ(tilt);
    b.add(funnel, m.red, [x, y + 9, z]);
    const rim = new THREE.TorusGeometry(4.55, 0.35, 8, 24);
    rim.rotateX(Math.PI / 2);
    rim.rotateZ(tilt);
    b.add(rim, m.dark, [x - Math.sin(tilt) * 9, y + 9 + Math.cos(tilt) * 9, z]);
    b.box(m.dark, [x, y + 2, z], [10, 4, 12]);
  }
  // 中庭两边的雕刻柱、悬断楼梯和逐级台阶；主成人路线留在正中。
  for (const side of [-1, 1]) {
    for (const z of [-31, 5, 38]) {
      b.beam(m.brass, [side * 17, 2, z], [side * 17, 62, z], 0.7, 12);
      for (const y of [21, 43, 60])
        b.box(m.brass, [side * 17, y, z], [2.6, 0.65, 2.6]);
    }
    for (let i = 0; i < 14; i++) {
      const y = 23 + i * 1.45,
        z = -42 + i * 1.45;
      b.box(m.wood, [side * 20, y, z], [8, 1, 1.7], true);
      b.beam(m.brass, [side * 15.6, y + 1, z], [side * 15.6, y + 4, z], 0.1);
      if (i)
        b.beam(
          m.brass,
          [side * 15.6, y + 4, z],
          [side * 15.6, y + 2.55, z - 1.45],
          0.12,
        );
    }
    // 有家具的侧舱：桌、抽屉柜、行李箱、黄铜床架与坍塌隔板。
    for (let i = 0; i < 9; i++) {
      const z = -76 + i * 18,
        base = i % 2 ? 44 : 23,
        x = side * 20;
      b.box(m.wood, [x, base + 2.6, z], [5, 0.6, 3.6], true);
      for (const dx of [-1.8, 1.8])
        for (const dz of [-1.2, 1.2])
          b.box(m.brass, [x + dx, base + 1.1, z + dz], [0.2, 2.5, 0.2]);
      b.box(m.rust, [x, base + 0.8, z + 5], [3.7, 1.5, 2.1], true);
      for (const offset of [-1.1, 1.1])
        b.box(m.brass, [x + offset, base + 0.9, z + 5], [0.17, 1.6, 2.25]);
      b.box(m.brass, [x, base + 1, z - 5], [4.5, 0.3, 6]);
      for (const dx of [-2, 2])
        b.beam(
          m.brass,
          [x + dx, base, z - 8],
          [x + dx, base + 2.8, z - 8],
          0.18,
        );
      b.box(m.wood, [x, base + 2.2, z - 8], [4.5, 1.5, 0.3]);
    }
  }
  // 下层货舱的煤舱和木箱沿两翼摆放，中轴贯通。
  for (let i = 0; i < 18; i++) {
    const x = (i % 2 ? 1 : -1) * 11.5,
      z = -87 + Math.floor(i / 2) * 20;
    b.box(i % 3 ? m.wood : m.dark, [x, 5, z], [7, 7, 8], true);
    for (const y of [2.5, 6.5]) b.box(m.brass, [x, y, z], [7.2, 0.18, 8.2]);
    b.beam(m.brass, [x - 3.5, 2, z - 4], [x + 3.5, 8, z - 4], 0.12);
  }
  // 艉舵与螺旋桨，破裂龙骨和掉落锚链。
  b.box(m.rust, [0, 3, 119], [0.9, 9, 8], true);
  for (const x of [-13, 13]) {
    b.beam(m.steel, [x, 5, 101], [x, 5, 127], 0.55);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.BoxGeometry(2.1, 8, 0.6);
      blade.rotateZ((i * Math.PI) / 2 + 0.32);
      b.add(blade, m.brass, [x, 5, 128]);
    }
  }
  // 附着海洋生态与微弱导航亮点，保证内部轮廓而不把沉船照成现代建筑。
  const lightSources = [];
  for (let i = 0; i < 32; i++) {
    const side = i % 2 ? 1 : -1,
      x = side * 24,
      y = [5, 23, 44][i % 3],
      z = -96 + (i % 16) * 12;
    for (let j = 0; j < 4; j++)
      b.beam(
        m.coral,
        [x, y, z],
        [x + side * (0.8 + j * 0.35), y + 1.5 + j * 0.4, z + (j - 1.5) * 0.4],
        0.1,
      );
    if (i % 4 === 0) {
      b.add(new THREE.SphereGeometry(0.6, 10, 6), m.pearl, [
        x - side * 1.3,
        y + 3,
        z,
      ]);
      lightSources.push({
        position: new THREE.Vector3(x - side * 1.3, y + 3, z).add(
          root.position,
        ),
        color: 0x64d9c5,
        intensity: 22,
        distance: 52,
      });
    }
  }
  const colliders = b.finish();
  const scale = BERMUDA_WRECK.scale;
  root.scale.setScalar(scale);
  for (const c of colliders) {
    c.x = root.position.x + (c.x - root.position.x) * scale;
    c.y = root.position.y + (c.y - root.position.y) * scale;
    c.z = root.position.z + (c.z - root.position.z) * scale;
    c.halfSize.multiplyScalar(scale);
  }
  for (const l of lightSources) {
    l.position.sub(root.position).multiplyScalar(scale).add(root.position);
    l.distance *= scale;
    l.intensity *= 1.7;
  }

  const bounds = new THREE.Box3().setFromObject(root);
  let triangles = 0;
  root.traverse((n) => {
    if (n.isMesh)
      triangles +=
        (n.geometry.index?.count ?? n.geometry.attributes.position.count) / 3;
  });
  const landmarks = [
    {
      name: "失落远洋邮轮",
      position: new THREE.Vector3(-65, -389, -650),
      radius: 225,
    },
  ];
  return {
    root,
    colliders,
    obstacles: [],
    landmarks,
    lightSources,
    routes: WRECK_ROUTES,
    stats: {
      triangles,
      meshes: root.children.length,
      colliders: colliders.length,
      bounds: bounds.getSize(new THREE.Vector3()).toArray(),
      supported: !heightAt || heightAt(-65, -650) <= root.position.y,
    },
    update() {},
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      for (const resource of resources) resource.dispose();
      resources.clear();
      root.clear();
      colliders.length = 0;
    },
  };
}
