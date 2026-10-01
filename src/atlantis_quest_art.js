import * as THREE from "three";
import { ATLANTIS_KEY_SITES } from "./expedition_objectives.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/**
 * 在真实公共建筑下层悬挂钥匙与铭文，不使用幼体专用住宅或新碰撞。
 * @param {THREE.Object3D} parent 海域根节点。
 * @param {object[]} records 已建成的上下层公共建筑记录。
 * @returns {object} 固定接触点、状态、主循环动画及幂等资源释放。
 */
export function createAtlantisKeyArt(parent, records = []) {
  const root = new THREE.Group();
  root.name = "atlantis_conch_key_and_inscriptions";
  parent.add(root);
  const owned = new Set();
  const keep = (r) => (owned.add(r), r);
  const bronze = keep(
    new THREE.MeshStandardMaterial({
      color: 0xb89c59,
      metalness: 0.65,
      roughness: 0.47,
      emissive: 0x392e0b,
      emissiveIntensity: 0.2,
    }),
  );
  addSurfaceDetail(bronze, "stone", 0.04);
  const stone = keep(
    new THREE.MeshStandardMaterial({ color: 0x4e7777, roughness: 0.87 }),
  );
  addSurfaceDetail(stone, "stone", 0.12);
  const glow = keep(new THREE.MeshBasicMaterial({ color: 0xffd897 }));
  function mesh(group, geometry, material, point = [0, 0, 0], name = "") {
    const m = new THREE.Mesh(keep(geometry), material);
    m.position.fromArray(point);
    m.name = name;
    group.add(m);
    return m;
  }
  function tube(group, points, radius, material) {
    return mesh(
      group,
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        points.length * 5,
        radius,
        6,
        false,
      ),
      material,
    );
  }
  const locations = records
    .filter((r) => ATLANTIS_KEY_SITES.some((s) => s.id === r.id))
    .map((r) => ({
      id: r.id,
      name: ATLANTIS_KEY_SITES.find((s) => s.id === r.id).name,
      point: new THREE.Vector3(
        r.x + (r.variant === "bridges" ? 22 : 0),
        r.lowerY,
        r.z,
      ),
      clue: new THREE.Vector3(r.x, r.lowerY, r.z + 43),
      roofY: r.y - 4,
    }));
  const key = new THREE.Group();
  key.name = "conch_key";
  root.add(key);
  const bow = mesh(
    key,
    new THREE.TorusGeometry(0.9, 0.14, 8, 40),
    bronze,
    [0, 0, 0],
    "key_bow",
  );
  const shaft = mesh(
    key,
    new THREE.CylinderGeometry(0.13, 0.13, 2.8, 10),
    bronze,
    [0, -2.2, 0],
    "key_shaft",
  );
  for (let i = 0; i < 3; i++)
    mesh(key, new THREE.BoxGeometry(0.7, 0.22, 0.3), bronze, [
      0.25,
      -2.7 - i * 0.35,
      0,
    ]);
  tube(
    key,
    Array.from({ length: 49 }, (_, i) => {
      const t = i / 48,
        a = t * Math.PI * 4.5,
        r = 0.06 + t * 0.52;
      return [Math.cos(a) * r, Math.sin(a) * r, 0.13 + t * 0.06];
    }),
    0.055,
    glow,
  );
  const chain = new THREE.Group();
  chain.name = "key_roof_suspension";
  root.add(chain);
  const chainMesh = mesh(
    chain,
    new THREE.CylinderGeometry(0.055, 0.055, 1, 6),
    bronze,
  );
  const plaques = locations.map((site) => {
    const g = new THREE.Group();
    g.position.copy(site.clue);
    root.add(g);
    mesh(
      g,
      new THREE.BoxGeometry(4.8, 5.8, 0.65),
      stone,
      [0, 0, 0],
      "conch_inscription",
    );
    for (const x of [-2.15, 2.15])
      mesh(g, new THREE.BoxGeometry(0.11, 5.4, 0.1), bronze, [x, 0, 0.38]);
    for (const y of [-2.5, 2.5])
      mesh(g, new THREE.BoxGeometry(4.3, 0.11, 0.1), bronze, [0, y, 0.38]);
    tube(
      g,
      Array.from({ length: 36 }, (_, i) => {
        const t = i / 35,
          a = t * Math.PI * 4,
          r = 0.08 + t * 1.35;
        return [Math.cos(a) * r, Math.sin(a) * r, 0.4];
      }),
      0.07,
      glow,
    );
    for (let row = 0; row < 2; row++)
      tube(
        g,
        Array.from({ length: 15 }, (_, i) => [
          -1.8 + i * 0.26,
          -1.85 - row * 0.45 + Math.sin(i * 0.9) * 0.08,
          0.4,
        ]),
        0.025,
        bronze,
      );
    const hang = site.roofY - site.clue.y - 2.9;
    if (hang > 0)
      mesh(g, new THREE.CylinderGeometry(0.06, 0.06, hang, 6), bronze, [
        0,
        2.9 + hang / 2,
        0,
      ]);
    return g;
  });
  let selected = null,
    collected = false,
    disposed = false;
  return {
    root,
    locations,
    key,
    getPoint(id) {
      return locations.find((s) => s.id === id)?.point ?? null;
    },
    setState(state) {
      const site = locations.find((s) => s.id === state.keySiteId);
      if (site && selected !== site.id) {
        selected = site.id;
        key.position.copy(site.point);
        chain.position.copy(site.point);
        const height = site.roofY - site.point.y - 0.9;
        chainMesh.scale.y = Math.max(0, height);
        chainMesh.position.y = 0.9 + height / 2;
      }
      collected = !!state.keyCollected;
    },
    update(time, position, reducedMotion) {
      const visible =
        !!selected &&
        !collected &&
        key.position.distanceToSquared(position) < 200 ** 2;
      key.visible = chain.visible = visible;
      // 接触点保持固定，只摆动饰纹与材质，不让钥匙游出建筑。
      bow.rotation.z = reducedMotion ? 0 : Math.sin(time * 0.6) * 0.025;
      bronze.emissiveIntensity =
        0.2 + (reducedMotion ? 0 : (Math.sin(time * 1.3) + 1) * 0.12);
      plaques.forEach((p) => {
        p.visible = p.position.distanceToSquared(position) < 180 ** 2;
      });
      void shaft;
    },
    reset() {
      selected = null;
      collected = false;
      key.visible = chain.visible = false;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      for (const r of owned) r.dispose();
      root.clear();
    },
  };
}

/** 真实宝箱的拱顶箱盖、铜箍、铆钉与钥孔，返回独立开盖关节。 */
export function createAtlantisQuestChest(root, keep, stone, bronze) {
  const dark = keep(
    new THREE.MeshStandardMaterial({ color: 0x345352, roughness: 0.74 }),
  );
  addSurfaceDetail(dark, "stone", 0.09);
  const box = (parent, geo, mat, x, y, z) => {
    const m = new THREE.Mesh(keep(geo), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const bodyOutline = new THREE.Shape();
  bodyOutline.moveTo(-3.5, -1.55);
  bodyOutline.lineTo(3.5, -1.55);
  bodyOutline.lineTo(3.5, 1.55);
  bodyOutline.lineTo(-3.5, 1.55);
  bodyOutline.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(bodyOutline, {
    depth: 4.7,
    bevelEnabled: true,
    bevelSize: 0.08,
    bevelThickness: 0.08,
    bevelSegments: 2,
  });
  bodyGeo.translate(0, 0, -2.35);
  box(root, bodyGeo, dark, 0, 4, 0);
  const engraving = (parent, points, mat, radius = 0.045) =>
    box(
      parent,
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        points.length * 5,
        radius,
        6,
        false,
      ),
      mat,
      0,
      0,
      0,
    );
  for (const side of [-1, 1]) {
    const x = side * 1.4;
    // 海神三叉与波浪铜嵌，保持盖子和箱体分离，开盖时不会穿帮。
    engraving(
      root,
      [
        [x, 2.9, -2.48],
        [x, 4.9, -2.48],
      ],
      bronze,
    );
    for (const offset of [-0.43, 0, 0.43])
      engraving(
        root,
        [
          [x, 4.1, -2.48],
          [x + offset, 4.5, -2.48],
          [x + offset, 4.94, -2.48],
        ],
        bronze,
        0.035,
      );
    for (const y of [3.15, 5.16])
      engraving(
        root,
        Array.from({ length: 14 }, (_, i) => [
          x - 0.82 + i * 0.126,
          y + Math.sin(i * 0.8) * 0.055,
          -2.48,
        ]),
        bronze,
        0.025,
      );
    box(
      root,
      new THREE.BoxGeometry(0.25, 3.15, 0.25),
      bronze,
      side * 3.34,
      4,
      -2.22,
    );
    box(
      root,
      new THREE.BoxGeometry(0.25, 3.15, 0.25),
      bronze,
      side * 3.34,
      4,
      2.22,
    );
  }
  box(root, new THREE.BoxGeometry(6.6, 0.3, 4.4), stone, 0, 2.5, 0);
  const lid = new THREE.Group();
  lid.name = "sacred_chest_lid";
  lid.position.set(0, 5.6, 2.35);
  root.add(lid);
  const shape = new THREE.Shape();
  shape.moveTo(-2.35, 0);
  shape.lineTo(2.35, 0);
  shape.absarc(0, 0, 2.35, 0, Math.PI, false);
  shape.closePath();
  const shell = new THREE.ExtrudeGeometry(shape, {
    depth: 7,
    bevelEnabled: true,
    bevelSize: 0.08,
    bevelThickness: 0.08,
    bevelSegments: 2,
    curveSegments: 32,
  });
  // 挤出轴为箱宽；拱顶横跨前后，后缘为真实开盖铰链。
  shell.rotateY(Math.PI / 2);
  shell.translate(-3.5, 0, -2.35);
  box(lid, shell, dark, 0, 0, 0);
  for (const side of [-1, 1])
    for (let ray = 0; ray < 7; ray++) {
      const a = (ray / 6) * Math.PI;
      engraving(
        lid,
        [
          [side * 3.59, 0.15, -2.35],
          [side * 3.59, Math.sin(a) * 1.8 + 0.15, -2.35 + Math.cos(a) * 1.8],
        ],
        bronze,
        0.03,
      );
    }
  for (const x of [-2.6, 0, 2.6]) {
    box(root, new THREE.BoxGeometry(0.19, 3.15, 4.82), bronze, x, 4, 0);
    const band = new THREE.TorusGeometry(2.42, 0.08, 6, 48, Math.PI);
    band.rotateY(Math.PI / 2);
    box(lid, band, bronze, x, 0, -2.35);
    for (const y of [2.8, 3.7, 4.6, 5.3])
      box(root, new THREE.SphereGeometry(0.12, 8, 6), bronze, x, y, -2.43);
  }
  box(root, new THREE.BoxGeometry(0.8, 1.4, 0.18), bronze, 0, 4.5, -2.55);
  box(
    root,
    new THREE.CylinderGeometry(0.2, 0.2, 0.2, 12),
    dark,
    0,
    4.7,
    -2.68,
  ).rotation.x = Math.PI / 2;
  box(root, new THREE.BoxGeometry(0.12, 0.45, 0.12), dark, 0, 4.4, -2.69);
  return lid;
}
