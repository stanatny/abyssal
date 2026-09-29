import * as THREE from "three";
import {
  MergeBucket,
  atlantisMaterials,
  cachedGeometry,
  paintStone,
  seededRandom,
} from "./atlantis_art_geometry.js";
import { buildPoseidon } from "./atlantis_art_poseidon.js";
import {
  createAtlantisUnderways,
  isAtlantisUnderwayReserved,
} from "./atlantis_underways.js";
import { cityArchitecture } from "./atlantis_architecture.js";
import {
  ATLANTIS_CITY_BOUNDS,
  ATLANTIS_DISTRICTS,
  cityCoverage,
  cityLots,
} from "./atlantis_city_plan.js";

/**
 * 创建覆盖海域约70%的亚特兰蒂斯城邦，按真实海床逐街坊建造。
 * @param {THREE.Object3D} parent 场景父节点。
 * @param {{heightAt:function}} options 共享海床高度，不改动生存规则。
 * @returns {object} 场景、静态碰撞、地标、城区统计和生命周期接口。
 */
export function createAtlantisCity(parent, { heightAt } = {}) {
  if (!parent?.add || typeof heightAt !== "function")
    throw new Error("Atlantis requires a scene and seabed height function");
  const root = new THREE.Group();
  root.name = "atlantis_city";
  parent.add(root);
  const materials = atlantisMaterials();
  const owned = new Set(),
    colliders = [],
    obstacles = [],
    landmarks = [],
    chunks = new Map(),
    lights = [];
  const random = seededRandom(9517);
  const records = [];
  let disposed = false;

  function chunkFor(x, z) {
    const cx = Math.floor((x + 300) / 150),
      cz = Math.floor((z + 1100) / 140),
      key = `${cx}:${cz}`;
    if (!chunks.has(key)) {
      const group = new THREE.Group();
      group.name = `city_district_${key}`;
      root.add(group);
      chunks.set(key, {
        group,
        batches: new Map(),
        center: new THREE.Vector3(cx * 150 - 225, 0, cz * 140 - 1030),
      });
    }
    return chunks.get(key);
  }
  function instance(
    geometry,
    material,
    x,
    y,
    z,
    { scale = [1, 1, 1], rotation = 0, color = null } = {},
  ) {
    const chunk = chunkFor(x, z),
      key = `${geometry.uuid}:${material.uuid}`;
    if (!chunk.batches.has(key))
      chunk.batches.set(key, { geometry, material, transforms: [] });
    chunk.batches.get(key).transforms.push({ x, y, z, scale, rotation, color });
  }
  function transformedCollider(c, x, y, z, scale, angle) {
    const sin = Math.sin(angle),
      cos = Math.cos(angle);
    const point = (p) => ({
      x: x + (p.x * cos + p.z * sin) * scale,
      y: y + p.y * scale,
      z: z + (-p.x * sin + p.z * cos) * scale,
    });
    if (c.type === "capsule")
      return { ...c, a: point(c.a), b: point(c.b), radius: c.radius * scale };
    const p = point(c),
      q = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        angle,
      );
    if (c.rotation)
      q.multiply(
        new THREE.Quaternion(
          c.rotation.x,
          c.rotation.y,
          c.rotation.z,
          c.rotation.w,
        ),
      );
    const out = { ...c, ...p, rotation: { x: q.x, y: q.y, z: q.z, w: q.w } };
    if (c.halfSize)
      out.halfSize = {
        x: c.halfSize.x * scale,
        y: c.halfSize.y * scale,
        z: c.halfSize.z * scale,
      };
    if (c.axes)
      out.axes = {
        x: c.axes.x * scale,
        y: c.axes.y * scale,
        z: c.axes.z * scale,
      };
    return out;
  }
  const cube = cachedGeometry("city_foundation_cube_v2", () =>
    paintStone(new THREE.BoxGeometry(1, 1, 1), {
      base: "#a2b5b0",
      algaeAmount: 0.18,
    }),
  );
  function footprintHeights(x, z, w, d) {
    const heights = [];
    for (let ix = 0; ix <= 4; ix++)
      for (let iz = 0; iz <= 4; iz++)
        heights.push(heightAt(x + (ix / 4 - 0.5) * w, z + (iz / 4 - 0.5) * d));
    return { min: Math.min(...heights), max: Math.max(...heights) };
  }
  function foundation(x, z, w, d, top) {
    const low = footprintHeights(x, z, w, d).min - 1.8;
    const h = Math.max(1, top - low);
    instance(cube, materials.stone, x, (top + low) / 2, z, {
      scale: [w, h, d],
    });
    colliders.push({
      type: "box",
      kind: "city_foundation",
      x,
      y: (top + low) / 2,
      z,
      halfSize: { x: w / 2, y: h / 2, z: d / 2 },
    });
    // 连续基座用贴合的垂直扶壁与上缘压顶打破大片空白侧面。
    for (const sx of [-1, 1])
      for (let dz = -d / 2 + 3; dz < d / 2; dz += 9)
        instance(
          cube,
          materials.marble,
          x + sx * (w / 2 + 0.15),
          top - h * 0.46,
          z + dz,
          { scale: [0.7, h * 0.9, 1] },
        );
    instance(cube, materials.marble, x, top + 0.15, z, {
      scale: [w + 0.8, 0.35, d + 0.8],
    });
  }
  function place(
    kind,
    x,
    z,
    {
      scale = 1,
      rotation = 0,
      base = null,
      footing = true,
      allowReserved = false,
    } = {},
  ) {
    const kit = cityArchitecture(kind);
    const width =
      (Math.abs(Math.cos(rotation)) * kit.width +
        Math.abs(Math.sin(rotation)) * kit.depth) *
      scale;
    const depth =
      (Math.abs(Math.sin(rotation)) * kit.width +
        Math.abs(Math.cos(rotation)) * kit.depth) *
      scale;
    if (!allowReserved && isAtlantisUnderwayReserved(x, z, width, depth))
      return null;
    const terrain = footprintHeights(x, z, width, depth);
    const y =
      kind === "pearl" ? terrain.max + 0.35 : (base ?? terrain.max + 0.8);
    if (kind === "pearl") {
      // 贝壳搁在自然礁石上，取整个壳体投影的最高海床，避免斜坡穿过下瓣。
      const rock = cachedGeometry("pearl_reef_base", () => {
        const g = new THREE.IcosahedronGeometry(1, 2);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const n = 1 + 0.055 * Math.sin(p.getX(i) * 19 + p.getZ(i) * 7);
          p.setXYZ(i, p.getX(i) * n, p.getY(i), p.getZ(i) * n);
        }
        g.computeVertexNormals();
        return paintStone(g, { base: "#647e77", algaeAmount: 0.45 });
      });
      const low = terrain.min - 1,
        top = y + 0.5;
      const axes = { x: width * 0.45, y: (top - low) / 2, z: depth * 0.45 };
      const centerY = (top + low) / 2;
      instance(rock, materials.pearlReef, x, centerY, z, {
        scale: [axes.x, axes.y, axes.z],
      });
      colliders.push({
        type: "ellipsoid",
        kind: "pearl_reef",
        x,
        y: centerY,
        z,
        axes,
      });
    }
    if (footing) foundation(x, z, width, depth, y);
    for (const part of kit.parts)
      instance(part.geometry, part.material, x, y, z, {
        scale: [scale, scale, scale],
        rotation,
      });
    for (const c of kit.colliders)
      colliders.push(transformedCollider(c, x, y, z, scale, rotation));
    obstacles.push({
      x,
      y: y + kit.height * scale * 0.4,
      z,
      radius: Math.max(width, depth) * 0.4,
    });
    records.push({ kind, x, z, y, width, depth, height: kit.height * scale });
    return { x, y, z, kit };
  }
  function landmark(id, x, y, z) {
    landmarks.push({ id, position: new THREE.Vector3(x, y, z) });
  }
  function lamp(color, intensity, distance, x, y, z, fixed = false) {
    lights.push({
      position: new THREE.Vector3(x, y, z),
      color,
      intensity,
      distance,
      fixed,
    });
  }

  buildPavement(root, heightAt, owned, materials);
  // 中轴台阶顺海床逐级下降；横街和竞技广场仍开阔，不改变原有地形函数。
  for (const [from, to] of [
    [-124, -660],
    [-956, -1078],
  ]) {
    for (let z = from; z > to; z -= 2) {
      if (Math.abs(((((z + 100) % 138) + 138) % 138) - 69) < 13) continue;
      const floor = footprintHeights(0, z, 38, 2);
      const top = floor.max + 0.28,
        bottom = floor.min - 0.5;
      instance(cube, materials.marble, 0, (top + bottom) / 2, z, {
        scale: [38, top - bottom, 2],
      });
      colliders.push({
        type: "box",
        kind: "city_avenue_step",
        x: 0,
        y: (top + bottom) / 2,
        z,
        halfSize: { x: 19, y: (top - bottom) / 2, z: 1 },
      });
    }
  }
  // 每个64×69m街坊都有两座不完全相同的建筑，留中央圣道与横向巷道。
  for (const lot of cityLots()) {
    if (isAtlantisUnderwayReserved(lot.x, lot.z)) continue;
    const outer = Math.abs(lot.x) > 215;
    const variants =
      lot.district === "harbor"
        ? ["courtyard", "villa"]
        : lot.district === "market"
          ? ["stoa", "courtyard"]
          : lot.district === "necropolis"
            ? ["courtyard", "villa"]
            : ["villa", "courtyard"];
    const a = place(variants[lot.row % 2], lot.x, lot.z + 15, {
      rotation: lot.x < 0 ? Math.PI / 2 : -Math.PI / 2,
      scale: outer ? 0.82 : 0.94,
    });
    place(
      (lot.row + Math.round(lot.x)) % 3 === 0
        ? "ruins"
        : variants[(lot.row + 1) % 2],
      lot.x + (lot.row % 2 ? 4 : -4),
      lot.z - 17,
      {
        rotation: lot.x < 0 ? Math.PI / 2 : -Math.PI / 2,
        scale: 0.7 + random() * 0.15,
      },
    );
    if ((lot.row + Math.round(lot.x)) % 3 === 0)
      place("amphora", lot.x + 18, lot.z, {
        footing: false,
        base: heightAt(lot.x + 18, lot.z) + 0.2,
        scale: 1.8,
      });
    if (a && !outer && lot.row % 3 === 0)
      lamp("#7eb8bd", 950, 80, a.x, a.y + 17, a.z);
  }
  // 外围城门与塔楼形成可辨认的轮廓线，城市向两侧伸展而非夹在内部岩脊之间。
  for (const z of [-175, -450, -645, -955])
    for (const x of [-253, 253])
      place("tower", x, z, { scale: z === -645 ? 1.1 : 0.85 });
  for (const [z, scale] of [
    [-190, 0.9],
    [-475, 1.12],
    [-630, 1.15],
    [-985, 0.8],
  ]) {
    const g = place("gateway", 0, z, { scale });
    landmark(z === -475 ? "grand_arch" : `gate_${-z}`, 0, g.y + 19 * scale, z);
    lamp("#d9bb89", 2100, 125, 0, g.y + 26 * scale, z);
  }
  for (const x of [-177, 177])
    for (const z of [-362, -575, -944])
      place("rotunda", x, z, { scale: z === -575 ? 1.1 : 0.85 });
  // 长途可见的方尖碑和成对柱列标出主轴，横街与街坊入口保持开放。
  for (let z = -125; z > -1080; z -= 35)
    for (const x of [-26, 26]) {
      if (z < -650 && z > -905) continue;
      place("column", x, z, {
        scale: z > -300 ? 0.65 : 0.95,
        footing: false,
        base: heightAt(x, z) + 0.35,
      });
    }
  for (const [x, z] of [
    [-78, -270],
    [78, -270],
    [-103, -555],
    [103, -555],
    [-109, -852],
    [109, -852],
  ])
    place("obelisk", x, z, { scale: z === -852 ? 1.35 : 1 });
  // 宏大王城由开阔竞技广场、两翼神殿及后方巨像构成，克拉肯原领地保持畅通。
  for (const x of [-187, 187]) {
    const t = place("temple", x, -774, {
      scale: 0.96,
      rotation: x < 0 ? Math.PI / 2 : -Math.PI / 2,
    });
    lamp("#edbf83", 4200, 165, t.x, t.y + 27, t.z);
  }
  const rear = place("temple", 0, -911, { scale: 1.3 });
  lamp("#e7b976", 6000, 200, 0, rear.y + 37, -885);
  buildArena(root, instance, colliders, heightAt, materials, cube);
  const arenaY = heightAt(0, -735) + 0.5;
  landmark("arena", 0, arenaY + 1, -735);
  landmark("main_temple", 0, rear.y + 30, -911);
  landmark("entrance_district", 0, heightAt(0, -115) + 12, -115);
  landmark("colonnade", 0, heightAt(0, -550) + 16, -550);
  const statueScale = 1.55,
    origin = { x: 0, y: footprintHeights(0, -865, 42, 36).max + 1, z: -865 };
  foundation(0, -865, 42, 36, origin.y);
  const statueBucket = new MergeBucket();
  const statue = buildPoseidon(
    {
      add(geo, key, transform) {
        statueBucket.add(geo, key, {
          position: [
            origin.x + (transform?.position?.[0] || 0) * statueScale,
            origin.y + (transform?.position?.[1] || 0) * statueScale,
            origin.z + (transform?.position?.[2] || 0) * statueScale,
          ],
          scale: statueScale,
        });
      },
    },
    { x: 0, y: 0, z: 0 },
  );
  const statueGroup = new THREE.Group();
  statueGroup.name = "poseidon_monument";
  root.add(statueGroup);
  statueBucket.build(materials, statueGroup, owned);
  for (const c of statue.colliders)
    colliders.push(
      transformedCollider(c, origin.x, origin.y, origin.z, statueScale, 0),
    );
  const head = statue.headCenter
    .clone()
    .multiplyScalar(statueScale)
    .add(new THREE.Vector3(origin.x, origin.y, origin.z));
  const tip = statue.tridentTip
    .clone()
    .multiplyScalar(statueScale)
    .add(new THREE.Vector3(origin.x, origin.y, origin.z));
  landmark("poseidon_statue", head.x, head.y, head.z);
  landmark("poseidon_trident", tip.x, tip.y, tip.z);
  landmark("rear_shrine", 0, heightAt(0, -1025) + 18, -1025);
  lamp("#d8dec5", 9500, 210, 0, origin.y + 75, -840, true);
  lamp("#6fbbff", 4800, 170, tip.x, tip.y - 2, tip.z, true);
  place("rotunda", 0, -1032, { scale: 1.3 });

  const underways = createAtlantisUnderways(root, { heightAt });
  colliders.push(...underways.colliders);
  obstacles.push(...underways.obstacles);
  landmarks.push(...underways.landmarks);

  // 贝珠柔光沿圣道和横街生长，避开建筑实体与中央战斗通道。
  const pearlSites = [];
  for (let z = -144; z > -1070; z -= 34) {
    if (z < -656 && z > -937) continue;
    for (const x of [-21, 21]) pearlSites.push([x, z]);
  }
  for (const z of [-290, -428, -566, -980])
    for (const x of [-215, -140, -95, 95, 140, 215]) pearlSites.push([x, z]);
  for (const z of [-684, -720, -756, -792, -827])
    for (const x of [-101, 101]) pearlSites.push([x, z]);
  for (const [x, z] of pearlSites) {
    if (
      records.some(
        (r) =>
          Math.abs(x - r.x) < r.width / 2 + 3 &&
          Math.abs(z - r.z) < r.depth / 2 + 3,
      )
    )
      continue;
    const t = place("pearl", x, z, {
      footing: false,
      base: heightAt(x, z) + 0.3,
      rotation: x < 0 ? -0.55 : 0.55,
    });
    if (t) lamp("#ffe3ab", 45, 58, t.x, t.y + 1.65, t.z);
  }

  for (const site of underways.records)
    for (const side of [-1, 1])
      for (const end of [-1, 1]) {
        const x = site.x + side * 26,
          z = site.z + end * 43;
        const t = place("pearl", x, z, {
          footing: false,
          base: heightAt(x, z) + 0.3,
          rotation: end > 0 ? 0 : Math.PI,
          allowReserved: true,
        });
        lamp("#ffe3ab", 45, 58, t.x, t.y + 1.65, t.z);
      }

  // 建造零散残件、柱鼓与陶罐，既有尺度参照，又不让大鱼卡在碎石碰撞中。
  const debris = cachedGeometry("city_rubble_v2", () => {
    const g = new THREE.IcosahedronGeometry(1, 0);
    return paintStone(g, { base: "#879c95", algaeAmount: 0.3 });
  });
  for (let i = 0; i < 700; i++) {
    const x = -266 + random() * 532,
      z = -110 - random() * 960;
    if (Math.abs(x) < 22) continue;
    const s = 0.5 + random() * 1.8;
    instance(debris, materials.stone, x, heightAt(x, z) + s * 0.22, z, {
      scale: [s, s * 0.5, s * 1.35],
      rotation: random() * 6.28,
    });
  }
  const dummy = new THREE.Object3D();
  for (const chunk of chunks.values()) {
    for (const batch of chunk.batches.values()) {
      const mesh = new THREE.InstancedMesh(
        batch.geometry,
        batch.material,
        batch.transforms.length,
      );
      mesh.name = "atlantis_architecture_instances";
      batch.transforms.forEach((t, i) => {
        dummy.position.set(t.x, t.y, t.z);
        dummy.rotation.set(0, t.rotation, 0);
        dummy.scale.set(...t.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      chunk.group.add(mesh);
      owned.add({ dispose: () => mesh.dispose() });
    }
    chunk.batches.clear();
  }
  // 固定数量动态点光复用，按玩家距离选最近灯位，避免全城数十盏灯进入每个着色器。
  const lightPool = Array.from({ length: 5 }, () => {
    const l = new THREE.PointLight(0xffffff, 0, 100, 2);
    root.add(l);
    return l;
  });
  const stats = {
    coverage: cityCoverage(),
    bounds: ATLANTIS_CITY_BOUNDS,
    districts: ATLANTIS_DISTRICTS.length,
    lots: cityLots().length,
    buildings: records.filter(
      (r) => !["column", "amphora", "obelisk", "pearl"].includes(r.kind),
    ).length,
    pearlHabitats: records.filter((r) => r.kind === "pearl").length,
    multilevelComplexes: underways.records.length,
    chunks: chunks.size,
    colliders: colliders.length,
  };
  root.userData.cityStats = stats;
  function update(time, dt, position, highQuality = true) {
    if (disposed) return;
    underways.update(time, dt, position, highQuality);
    const reach = highQuality ? 350 : 275;
    for (const chunk of chunks.values())
      chunk.group.visible =
        !position ||
        Math.hypot(chunk.center.x - position.x, chunk.center.z - position.z) <
          reach;
    const fixed = lights.filter((l) => l.fixed);
    const nearby = position
      ? [...lights]
          .filter((l) => !fixed.includes(l))
          .sort(
            (a, b) =>
              a.position.distanceToSquared(position) -
              b.position.distanceToSquared(position),
          )
      : lights;
    const activeLights = [...fixed, ...nearby];
    lightPool.forEach((light, i) => {
      const source = activeLights[i];
      light.visible = !!source && (highQuality || i < 3);
      if (source) {
        light.position.copy(source.position);
        light.color.set(source.color);
        light.distance = source.distance;
        light.intensity =
          source.intensity * (0.96 + Math.sin(time * 0.8 + i) * 0.04);
      }
    });
    void dt;
  }
  update(0, 0, new THREE.Vector3(0, -18, 75));
  return {
    root,
    colliders,
    obstacles,
    landmarks,
    stats,
    buildings: records,
    underways,
    update,
    dispose() {
      if (disposed) return;
      disposed = true;
      underways.dispose();
      parent.remove(root);
      for (const resource of owned) resource.dispose();
      owned.clear();
      root.clear();
    },
  };
}

/** 铺装跟随共享斜坡；每街区单独网格，路幅、广场与房基共同组成连续城市。 */
function buildPavement(root, heightAt, owned, materials) {
  const bounds = ATLANTIS_CITY_BOUNDS;
  for (let z = bounds.minZ; z < bounds.maxZ; z += 140)
    for (let x = bounds.minX; x < bounds.maxX; x += 137.5) {
      const w = Math.min(137.5, bounds.maxX - x),
        d = Math.min(140, bounds.maxZ - z),
        cx = x + w / 2,
        cz = z + d / 2;
      const geo = new THREE.PlaneGeometry(w, d, 16, 20);
      geo.rotateX(-Math.PI / 2);
      geo.translate(cx, 0, cz);
      const p = geo.attributes.position,
        colors = new Float32Array(p.count * 3),
        uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const px = p.getX(i),
          pz = p.getZ(i);
        p.setY(i, heightAt(px, pz) + 0.22);
        const avenue = Math.abs(px) < 20;
        const cross = Math.abs(((((pz + 100) % 138) + 138) % 138) - 69) < 13;
        const c = new THREE.Color(avenue || cross ? "#afc2bc" : "#758e8d");
        c.multiplyScalar(
          0.94 + 0.035 * Math.cos(px * 0.4) * Math.sin(pz * 0.35),
        );
        c.toArray(colors, i * 3);
        uv.setXY(i, px / 16, pz / 16);
      }
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      owned.add(geo);
      const mesh = new THREE.Mesh(geo, materials.stone);
      mesh.name = "city_paved_district";
      mesh.receiveShadow = true;
      root.add(mesh);
    }
}

/** 竞技场沿真实坡面铺设，侧面层层看台，不用悬空整块方盒垫起整个王城。 */
function buildArena(root, instance, colliders, heightAt, materials, cube) {
  const ringParts = [];
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2,
      b = ((i + 1) / 80) * Math.PI * 2;
    for (const radius of [48, 71, 94]) {
      const r0 = radius - 0.23,
        r1 = radius + 0.23;
      const coords = [
        [Math.cos(a) * r0, Math.sin(a) * r0 - 735],
        [Math.cos(b) * r0, Math.sin(b) * r0 - 735],
        [Math.cos(a) * r1, Math.sin(a) * r1 - 735],
        [Math.cos(b) * r1, Math.sin(b) * r1 - 735],
      ];
      const geo = new THREE.BufferGeometry();
      const vertices = [];
      for (const j of [0, 1, 2, 1, 3, 2]) {
        const [x, z] = coords[j];
        vertices.push(x, heightAt(x, z) + 0.46, z);
      }
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      geo.computeVertexNormals();
      ringParts.push(geo);
    }
  }
  // 环形浅浮雕使用独立一次性几何，生命周期交给其父节点清理。
  const bucket = new MergeBucket();
  for (const g of ringParts) {
    bucket.add(g, "guideTeal");
    g.dispose();
  }
  const owned = new Set();
  bucket.build(materials, root, owned);
  root.userData.arenaResources = owned;
  // 并入父场景的释放事件，保持所有实例重开后无遗留。
  root.addEventListener("removed", () => {
    for (const r of owned) r.dispose();
    owned.clear();
  });
  for (const side of [-1, 1])
    for (let row = 0; row < 4; row++)
      for (let i = 0; i < 8; i++) {
        const z = -684 - i * 14,
          x = side * (111 + row * 6.3),
          top = heightAt(x, z) + 2 + row * 2.3,
          h = 3 + row * 2.3;
        instance(cube, materials.marble, x, top - h / 2, z, {
          scale: [5.8, h, 13],
        });
        colliders.push({
          type: "box",
          kind: "arena_seat",
          x,
          y: top - h / 2,
          z,
          halfSize: { x: 2.9, y: h / 2, z: 6.5 },
        });
      }
}
