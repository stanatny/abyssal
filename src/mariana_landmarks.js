import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { MARIANA_GATES } from "./mariana_config.js";
import { marianaCliffFace } from "./mariana_cliffs.js";

import { MARIANA_MAZE_ROUTE } from "./mariana_outcrops.js";

/** 岩台只是侧游的支撑实体，绝不替代最低海床或四道关卡。 */
export const MARIANA_LANDMARK_SITES = Object.freeze(
  [
    {
      id: "hydra_shoulder",
      guardian: "mariana_hydra",
      center: [95, -355, -510],
      side: 1,
      shape: "three_necks",
      stone: 0x887357,
      pale: 0xd3bd89,
      glow: 0x89bfa8,
    },
    {
      id: "kraken_echo_gallery",
      guardian: "mariana_kraken",
      center: [-95, -710, -540],
      side: -1,
      shape: "echo_shells",
      stone: 0x405a70,
      pale: 0xafd4d1,
      glow: 0x76d7dc,
    },
    {
      id: "maja_fossil_garden",
      guardian: "mariana_maja",
      center: [95, -1090, -545],
      side: 1,
      shape: "fossil_ribs",
      stone: 0x665568,
      pale: 0xc8b9cf,
      glow: 0xafa4dc,
    },
    {
      id: "leviathan_pressure_cathedral",
      guardian: "mariana_leviathan",
      center: [-95, -1740, -495],
      side: -1,
      shape: "folded_buttresses",
      stone: 0x4f5b67,
      pale: 0xb4c1bf,
      glow: 0x98bcca,
    },
    {
      id: "hadal_warm_approach",
      guardian: null,
      center: [-95, -2450, -500],
      side: -1,
      shape: "warm_crown",
      stone: 0x8c8976,
      pale: 0xe5d6af,
      glow: 0xe5bb86,
    },
  ].map((site) =>
    Object.freeze({ ...site, center: Object.freeze(site.center) }),
  ),
);

export const MARIANA_LANDMARK_SPINE = MARIANA_MAZE_ROUTE;

/** 整个新实体须避开守卫、成年猎手和恢复食物的局部活动空间。 */
export const MARIANA_LANDMARK_RESERVATIONS = Object.freeze([
  ...MARIANA_GATES.map((gate) =>
    Object.freeze({ id: gate.id, center: gate.home, radius: 156 }),
  ),
  ...[
    [-35, -480, -330],
    [35, -545, -475],
    [-35, -760, -350],
    [35, -900, -475],
    [-35, -1120, -475],
    [35, -1260, -350],
    [-35, -1540, -350],
    [35, -1970, -475],
  ].map((center, index) =>
    Object.freeze({
      id: `ichthyotitan_${index}`,
      center: Object.freeze(center),
      radius: 65.4,
    }),
  ),
  ...[
    ["recovery_basilosaurus", [55, -790, -400]],
    ["recovery_megalodon_1", [45, -850, -350]],
    ["recovery_megalodon_2", [-45, -1160, -465]],
  ].map(([id, center]) =>
    Object.freeze({ id, center: Object.freeze(center), radius: 38 }),
  ),
]);

const FLOOR_RADIUS = 56;
const FLOOR_DROP = 24;
const FLOOR_THICKNESS = 6;
const RADIAL_STEPS = 3;
const ANGULAR_STEPS = 48;

/** 地图拥有最终资源；每个地点只生成三个合批，动态与销毁仍由海域主循环管理。 */
export function addMarianaLandmarks({ root, keep, group, materials }) {
  if (!root || !keep || !group || !materials?.basalt || !materials?.pale)
    throw new TypeError(
      "Mariana landmarks require the regional owner contract",
    );
  const stone = keep(materials.basalt.clone());
  stone.name = "mariana_landmark_colored_strata";
  stone.color.set(0xffffff);
  stone.vertexColors = true;
  addSurfaceDetail(stone, "stone", 0.48);
  const pale = keep(materials.pale.clone());
  pale.name = "mariana_landmark_weathered_reliefs";
  pale.color.set(0xffffff);
  pale.vertexColors = true;
  addSurfaceDetail(pale, "stone", 0.26);
  const vein = keep(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      emissive: 0x769392,
      emissiveIntensity: 0.3,
      roughness: 0.8,
    }),
  );
  vein.name = "mariana_landmark_mineral_inlays";
  const colliders = [],
    landmarks = [],
    lightSources = [],
    routes = [],
    solidRecords = [],
    supportRecords = [],
    stats = { meshes: 0, triangles: 0, colliders: 0, sites: [] };
  for (const site of MARIANA_LANDMARK_SITES) {
    const parent = group(`mariana_landmark_${site.id}`, site.center[1]);
    const buckets = new Map();
    const siteColliders = [],
      cx = site.center[0],
      cy = site.center[1],
      cz = site.center[2];
    function add(geometry, material, color) {
      const positions = geometry.attributes.position;
      if (!geometry.attributes.uv)
        geometry.setAttribute(
          "uv",
          new THREE.Float32BufferAttribute(
            new Float32Array(positions.count * 2),
            2,
          ),
        );
      const tint = new THREE.Color(color),
        colors = new Float32Array(positions.count * 3);
      for (let i = 0; i < positions.count; i++) {
        const shade =
          0.86 +
          0.12 * Math.sin(positions.getY(i) * 0.21 + positions.getZ(i) * 0.095);
        colors[i * 3] = tint.r * shade;
        colors[i * 3 + 1] = tint.g * shade;
        colors[i * 3 + 2] = tint.b * shade;
      }
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      if (!geometry.index)
        geometry.setIndex(Array.from({ length: positions.count }, (_, i) => i));
      if (!buckets.has(material)) buckets.set(material, []);
      const prior = buckets.get(material),
        firstVertex = prior.reduce(
          (sum, g) => sum + g.attributes.position.count,
          0,
        ),
        firstTriangle = prior.reduce((sum, g) => sum + g.index.count / 3, 0);
      buckets.get(material).push(geometry);
      return {
        site: site.id,
        host: `${parent.name}_${material === stone ? "stone" : material === pale ? "relief" : "inlay"}`,
        vertexRange: [firstVertex, firstVertex + positions.count],
        faceRange: [firstTriangle, firstTriangle + geometry.index.count / 3],
      };
    }
    const floor = apronGeometry(site);
    solidRecords.push({
      ...add(floor.geometry, stone, site.stone),
      id: "apron",
      colliderIds: floor.colliders.map((c) => c.id),
    });
    siteColliders.push(...floor.colliders);
    const probe = new THREE.Mesh(floor.geometry, stone);
    probe.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(),
      down = new THREE.Vector3(0, -1, 0);
    function supportedPoint(x, z, label, record = true) {
      ray.set(new THREE.Vector3(x, cy + 10, z), down);
      ray.far = 60;
      const hit = ray.intersectObject(probe, false)[0];
      if (!hit) throw new Error(`Missing ${site.id} support: ${label}`);
      if (record)
        supportRecords.push({
          site: site.id,
          host: `${parent.name}_stone`,
          id: label,
          root: hit.point.toArray(),
          normal: hit.face.normal.toArray(),
          hostFaceRange: [0, floor.geometry.index.count / 3],
        });
      return hit.point;
    }
    // 侧向支撑插入真实岩壁，避免一块悬在海水中的圆盘。
    const wallX = marianaCliffFace(cz, cy - FLOOR_DROP, false, site.side);
    const bridgeStart = cx + site.side * 43,
      bridgeEnd = wallX + site.side * 8;
    const bridge = new THREE.BoxGeometry(
      Math.abs(bridgeEnd - bridgeStart),
      9,
      34,
      4,
      1,
      4,
    );
    bridge.translate((bridgeStart + bridgeEnd) / 2, cy - 29, cz);
    solidRecords.push({
      ...add(bridge, stone, site.stone),
      id: "wall_support",
      colliderIds: [`landmark_${site.id}_wall_support`],
    });
    siteColliders.push({
      type: "box",
      id: `landmark_${site.id}_wall_support`,
      x: (bridgeStart + bridgeEnd) / 2,
      y: cy - 29,
      z: cz,
      halfSize: new THREE.Vector3(
        Math.abs(bridgeEnd - bridgeStart) / 2,
        4.5,
        17,
      ),
    });

    function column(points, radius, segments, label, material = stone) {
      const curve = new THREE.CatmullRomCurve3(
        points.map((point) => new THREE.Vector3(...point)),
      );
      const profile = (t) =>
        radius * (0.57 + 0.43 * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5));
      const geometry = sculptedTube(curve, profile, 48, 12);
      // 柱脚完整截面贴合最终岩台，而非只把中心放在地面。
      const vertices = geometry.attributes.position;
      const footprint = [];
      for (let i = 0; i <= 12; i++) {
        const support = supportedPoint(
          vertices.getX(i),
          vertices.getZ(i),
          label,
          false,
        );
        vertices.setY(i, support.y + 0.015);
        footprint.push(support.toArray());
      }
      const foot = new THREE.Vector3(...points[0]);
      const anchor = supportRecords.findLast(
        (record) =>
          record.site === site.id &&
          new THREE.Vector3(...record.root).distanceToSquared(foot) < 1e-6,
      );
      anchor.footprint = footprint;
      geometry.computeVertexNormals();
      const solid = add(
        geometry,
        material,
        material === pale ? site.pale : site.stone,
      );
      const colliderIds = [];
      for (let i = 0; i < segments; i++) {
        const a = curve.getPointAt(i / segments),
          b = curve.getPointAt((i + 1) / segments),
          segment = new THREE.Line3(a, b);
        let bound = 0;
        for (let sample = 0; sample <= 8; sample++) {
          const t = (i + sample / 8) / segments,
            p = curve.getPointAt(t),
            closest = segment.closestPointToPoint(p, true, new THREE.Vector3());
          bound = Math.max(bound, profile(t) + p.distanceTo(closest));
        }
        const id = `landmark_${site.id}_${label}_${i}`;
        colliderIds.push(id);
        siteColliders.push({
          type: "capsule",
          id,
          a,
          b,
          radius: bound + 0.12,
        });
      }
      solidRecords.push({ ...solid, id: label, colliderIds });
      // 条纹是贴合柱身的浅浮雕，根部由同一个弯曲表面定义。
      for (let strand = 0; strand < 3; strand++) {
        const samples = [];
        const frames = curve.computeFrenetFrames(32, false);
        for (let i = 0; i <= 32; i++) {
          const t = i / 32,
            angle = (strand * (Math.PI * 2)) / 3 + t * 4.5,
            p = curve.getPointAt(t);
          p.addScaledVector(
            frames.normals[i],
            Math.cos(angle) * profile(t) * 0.9,
          );
          p.addScaledVector(
            frames.binormals[i],
            Math.sin(angle) * profile(t) * 0.9,
          );
          samples.push(p);
        }
        const line = new THREE.CatmullRomCurve3(samples);
        add(
          sculptedTube(line, () => 0.17, 40, 5),
          vein,
          site.glow,
        );
      }
    }
    const bases =
      site.shape === "fossil_ribs"
        ? []
        : [-24, 0, 24].map((x, i) =>
            i === 1 && ["echo_shells", "warm_crown"].includes(site.shape)
              ? null
              : supportedPoint(
                  cx + x,
                  cz -
                    (site.shape === "folded_buttresses" && i === 1 ? 49 : 43),
                  `sculpture_foot_${i}`,
                ),
          );
    if (site.shape === "three_necks") {
      for (let i = 0; i < 3; i++) {
        const foot = bases[i];
        const direction = i - 1;
        column(
          [
            foot.toArray(),
            [foot.x + direction * 4, cy + 3, cz - 43],
            [foot.x + direction * 10, cy + 32, cz - 45],
            [foot.x + direction * 2, cy + 46, cz - 37],
            [foot.x + direction * 2, cy + 43, cz - 28],
          ],
          5.2,
          8,
          `serpent_${i}`,
        );
      }
    } else if (site.shape === "echo_shells") {
      for (const side of [-1, 1]) {
        const foot = bases[side < 0 ? 0 : 2];
        column(
          [
            foot.toArray(),
            // 卷曲石雕完整留在上方旧台地的真实底面以下。
            [cx + side * 27, cy - 18, cz - 51],
            [cx + side * 29, cy - 4, cz - 52],
            [cx + side * 15, cy + 4, cz - 51],
            [cx + side * 5, cy - 4, cz - 50],
            [cx + side * 11, cy - 12, cz - 50],
          ],
          4.7,
          10,
          `spiral_${side}`,
          pale,
        );
      }
    } else if (site.shape === "fossil_ribs") {
      for (let i = 0; i < 4; i++) {
        const x = cx - 22 + i * 14.5,
          foot = supportedPoint(x, cz - 43, `fossil_foot_${i}`);
        column(
          [
            foot.toArray(),
            [x, cy + 7, cz - 43],
            [x - 7, cy + 27 + i * 3, cz - 40],
            [x - 18, cy + 34 + i * 3, cz - 37],
          ],
          3.5,
          6,
          `fossil_${i}`,
          pale,
        );
      }
    } else if (site.shape === "folded_buttresses") {
      for (let i = 0; i < 3; i++) {
        const foot = bases[i];
        column(
          [
            foot.toArray(),
            [foot.x, cy + 5, cz - (i === 1 ? 49 : 43)],
            [foot.x + (i - 1) * 5, cy + 36 + i * 5, cz - (i === 1 ? 49 : 45)],
            [cx + (i - 1) * 14, cy + 65 - i * 4, cz - (i === 1 ? 49 : 43)],
          ],
          5.6,
          8,
          `buttress_${i}`,
        );
      }
    } else {
      for (const side of [-1, 1]) {
        const foot = bases[side < 0 ? 0 : 2];
        column(
          [
            foot.toArray(),
            [cx + side * 28, cy + 7, cz - 43],
            [cx + side * 20, cy + 34, cz - 43],
            [cx + side * 5, cy + 44, cz - 42],
          ],
          3.8,
          6,
          `crown_${side}`,
          pale,
        );
      }
    }

    // 矿脉与扇形沉积在岩台上形成可读路标，不铺满成年鱼的主视野。
    for (let i = 0; i < 7; i++) {
      const x = cx + (i - 3) * 6,
        z = cz - 13 + Math.sin(i * 1.8) * 6,
        foot = supportedPoint(x, z, `sediment_mark_${i}`);
      const curve = new THREE.CatmullRomCurve3([
        foot.clone().add(new THREE.Vector3(-3, 0.05, -1.5)),
        foot.clone().add(new THREE.Vector3(0, 0.2, 0)),
        foot.clone().add(new THREE.Vector3(3.5, 0.08, 1.7)),
      ]);
      add(
        sculptedTube(curve, () => 0.13, 10, 5),
        vein,
        site.glow,
      );
      const shell = reliefFan(foot, 2.6 + (i % 3) * 0.6, i * 0.6);
      const vertices = shell.attributes.position;
      const footprint = [];
      for (let j = 0; j < vertices.count; j++) {
        const support = supportedPoint(
          vertices.getX(j),
          vertices.getZ(j),
          "relief",
          false,
        );
        vertices.setY(j, vertices.getY(j) + support.y - foot.y);
        footprint.push(support.toArray());
      }
      supportRecords[supportRecords.length - 1].footprint = footprint;
      shell.computeVertexNormals();
      add(shell, pale, site.pale);
    }
    let triangles = 0,
      meshes = 0;
    for (const [material, geometries] of buckets) {
      const geometry = keep(mergeGeometries(geometries));
      for (const temporary of geometries) temporary.dispose();
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${parent.name}_${material === stone ? "stone" : material === pale ? "relief" : "inlay"}`;
      parent.add(mesh);
      triangles += geometry.index.count / 3;
      meshes++;
    }
    colliders.push(...siteColliders);
    landmarks.push({ id: site.id, position: new THREE.Vector3(cx, cy, cz) });
    lightSources.push({
      position: new THREE.Vector3(cx, cy + 12, cz - 20),
      color: site.glow,
      intensity: site.guardian ? 65 : 90,
      distance: 145,
    });
    const loop = Array.from({ length: 17 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      return [cx + Math.cos(a) * 32, cy, cz + Math.sin(a) * 32];
    });
    routes.push({
      id: site.id,
      bodyLength: 32,
      turnRadius: 32,
      floor: cy - FLOOR_DROP,
      points: loop,
      // 裂渊入口放在巨岩底缘之后，成人从岩棚间的横向水道进入。
      entrance: [
        0,
        cy +
          (site.id === "kraken_echo_gallery"
            ? 0
            : site.id === "leviathan_pressure_cathedral"
              ? 10
              : 30),
        site.id === "hadal_warm_approach" ? -470 : -390,
      ],
      center: [...site.center],
    });
    stats.meshes += meshes;
    stats.triangles += triangles;
    stats.sites.push({
      id: site.id,
      meshes,
      triangles,
      colliders: siteColliders.length,
    });
  }
  stats.colliders = colliders.length;
  root.userData.marianaLandmarkGeometry = {
    sites: MARIANA_LANDMARK_SITES,
    routes,
    solidRecords,
    supportRecords,
    stats,
    provenance:
      "Original procedural fantasy geology and weathered guardian reliefs",
  };
  return {
    colliders,
    landmarks,
    lightSources,
    routes,
    solidRecords,
    supportRecords,
    stats,
  };
}

/** 极坐标岩台有完整上下表面及裙边，每个保守格子的实体来自相同最终顶点。 */
function apronGeometry(site) {
  const positions = [],
    indices = [],
    colliders = [];
  const [x, y, z] = site.center;
  const top = y - FLOOR_DROP;
  const rows = 1 + RADIAL_STEPS * ANGULAR_STEPS;
  function id(ring, angle, layer = 0) {
    return (
      layer * rows +
      (ring === 0
        ? 0
        : 1 + (ring - 1) * ANGULAR_STEPS + (angle % ANGULAR_STEPS))
    );
  }
  for (let layer = 0; layer < 2; layer++) {
    positions.push(x, top - layer * FLOOR_THICKNESS, z);
    for (let ring = 1; ring <= RADIAL_STEPS; ring++)
      for (let i = 0; i < ANGULAR_STEPS; i++) {
        const a = (i / ANGULAR_STEPS) * Math.PI * 2,
          r =
            (ring / RADIAL_STEPS) *
            FLOOR_RADIUS *
            (0.99 +
              Math.sin(a * 3 + y * 0.01) * 0.04 +
              Math.cos(a * 7 - site.side * 0.2) * 0.025),
          px = x + Math.cos(a) * r,
          pz = z + Math.sin(a) * r,
          relief =
            (ring / RADIAL_STEPS) *
            (Math.sin(a * 5) * 0.55 + Math.sin(a * 9) * 0.22);
        positions.push(px, top + relief - layer * FLOOR_THICKNESS, pz);
      }
  }
  for (let layer = 0; layer < 2; layer++)
    for (let ring = 1; ring <= RADIAL_STEPS; ring++)
      for (let i = 0; i < ANGULAR_STEPS; i++) {
        const a = id(ring, i, layer),
          b = id(ring, i + 1, layer),
          c = id(ring - 1, i, layer),
          d = id(ring - 1, i + 1, layer);
        const face = ring === 1 ? [c, b, a] : [c, d, a, a, d, b];
        if (layer)
          for (let n = 0; n < face.length; n += 3)
            indices.push(face[n], face[n + 2], face[n + 1]);
        else indices.push(...face);
      }
  for (let i = 0; i < ANGULAR_STEPS; i++) {
    const a = id(RADIAL_STEPS, i),
      b = id(RADIAL_STEPS, i + 1);
    indices.push(a, b, a + rows, b, b + rows, a + rows);
  }
  for (let ring = 1; ring <= RADIAL_STEPS; ring++)
    for (let sector = 0; sector < 12; sector++) {
      const box = new THREE.Box3();
      for (const r of [ring - 1, ring])
        for (let i = sector * 4; i <= (sector + 1) * 4; i++)
          for (const layer of [0, 1]) {
            const index = id(r, i, layer) * 3;
            box.expandByPoint(
              new THREE.Vector3(...positions.slice(index, index + 3)),
            );
          }
      const center = box.getCenter(new THREE.Vector3()),
        halfSize = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
      colliders.push({
        type: "box",
        id: `landmark_${site.id}_apron_${ring}_${sector}`,
        x: center.x,
        y: center.y,
        z: center.z,
        halfSize,
      });
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return { geometry, colliders };
}

/** 切面与纵向风化纹来自连续封闭曲面，半径始终留在对应接触包络内。 */
function sculptedTube(curve, radiusAt, segments, sides) {
  const positions = [],
    indices = [],
    frames = curve.computeFrenetFrames(segments, false);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments,
      center = curve.getPointAt(t);
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2,
        fold =
          0.91 +
          0.055 * Math.cos(a * 5 + t * 7) +
          0.025 * Math.sin(t * 29 + a * 3),
        radius = radiusAt(t) * fold,
        point = center
          .clone()
          .addScaledVector(frames.normals[i], Math.cos(a) * radius)
          .addScaledVector(frames.binormals[i], Math.sin(a) * radius);
      positions.push(point.x, point.y, point.z);
    }
  }
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j,
        b = a + sides + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  for (const end of [0, segments]) {
    const center = curve.getPointAt(end / segments),
      index = positions.length / 3,
      start = end * (sides + 1);
    positions.push(center.x, center.y, center.z);
    for (let j = 0; j < sides; j++)
      if (end) indices.push(index, start + j, start + j + 1);
      else indices.push(index, start + j + 1, start + j);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** 薄而有起伏的扇状矿物化石，外缘卷起而根部嵌入最终岩台。 */
function reliefFan(root, radius, angle) {
  const p = [],
    idx = [];
  const radial = 4,
    sectors = 14;
  for (let layer = 0; layer < 2; layer++)
    for (let ring = 0; ring <= radial; ring++)
      for (let i = 0; i <= sectors; i++) {
        const a = angle + (i / sectors - 0.5) * Math.PI * 1.25,
          r = radius * (0.13 + (ring / radial) * 0.87),
          y =
            0.035 +
            0.09 * (ring / radial) +
            Math.pow(ring / radial, 2) * (0.3 + Math.cos(i * 2.2) * 0.12) -
            layer * 0.055;
        p.push(root.x + Math.cos(a) * r, root.y + y, root.z + Math.sin(a) * r);
      }
  const row = sectors + 1,
    stride = (radial + 1) * row;
  for (let ring = 0; ring < radial; ring++)
    for (let i = 0; i < sectors; i++) {
      const a = ring * row + i,
        b = a + row;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
      idx.push(
        a + stride,
        b + stride,
        a + 1 + stride,
        b + stride,
        b + 1 + stride,
        a + 1 + stride,
      );
    }
  for (const ring of [0, radial])
    for (let i = 0; i < sectors; i++) {
      const a = ring * row + i,
        b = a + 1;
      if (ring === 0) idx.push(a, a + stride, b, b, a + stride, b + stride);
      else idx.push(a, b, a + stride, b, b + stride, a + stride);
    }
  for (const i of [0, sectors])
    for (let ring = 0; ring < radial; ring++) {
      const a = ring * row + i,
        b = a + row;
      if (i === 0) idx.push(a, b, a + stride, b, b + stride, a + stride);
      else idx.push(a, a + stride, b, b, a + stride, b + stride);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  geometry.setIndex(idx);
  geometry.computeVertexNormals();
  return geometry;
}
