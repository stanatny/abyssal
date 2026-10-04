import { terrainMeshHeight } from "./terrain_mesh_height.js";
import {
  PENGLAI_SUMMIT_ROUTES,
  besideSummitPath,
  createPenglaiSummitPaths,
} from "./penglai_routes.js";
import { createPenglaiWard } from "./penglai_ward.js";
import { createPenglaiSkyIslands } from "./penglai_sky_islands.js";
import {
  PENGLAI_REWARD_HABITAT,
  penglaiRewardAnchor,
} from "./penglai_rewards.js";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  PENGLAI_WORLD as W,
  PENGLAI_PEAKS,
  PENGLAI_BOSS_INSTANCES,
  penglaiHeightAt,
} from "./penglai_config.js";
import {
  finishScenePreparation,
  prepareScene,
  constructionScope,
} from "./scene_preparation.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 山水、莲池、仙观与桃林一次构造，随后沿共享循环更新，不建立额外 RAF。 */
export function createPenglaiOcean(parent) {
  return finishScenePreparation(createPenglaiOceanSteps(parent));
}
export function createPenglaiOceanAsync(parent, options) {
  return prepareScene(createPenglaiOceanSteps(parent), options);
}
export function* createPenglaiOceanSteps(parent) {
  const root = new THREE.Group();
  root.name = "penglai_mountain_sanctuary";
  parent.add(root);
  const resources = new Set(),
    keep = (r) => (resources.add(r), r),
    scope = constructionScope(root, resources),
    colliders = [],
    buckets = new Map(),
    chunks = [],
    groundStrips = [];
  const mats = {},
    geo = {},
    time = { value: 0 };
  let disposed = false,
    ward,
    skyIslands;
  const material = (key, color, extra = {}) =>
    mats[key] ??
    (mats[key] = keep(
      new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...extra }),
    ));
  const stone = material("stone", "#8da28a"),
    red = material("red", "#9d4c40"),
    roofmat = material("tile", "#2e5454", { side: THREE.DoubleSide }),
    gold = material("bronze", "#b29865", { metalness: 0.32, roughness: 0.47 }),
    wood = material("wood", "#4b5d50"),
    pink = material("blossom", "#e0a5b3"),
    leaf = material("leaf", "#587c43");
  for (const m of [stone, roofmat, wood])
    addSurfaceDetail(m, m === wood ? "wood" : "stone", 0.14);
  const geometry = (key, fn) => geo[key] ?? (geo[key] = keep(fn()));
  const box = geometry("box", () => new THREE.BoxGeometry(1, 1, 1)),
    sphere = geometry("sphere", () => new THREE.IcosahedronGeometry(1, 2)),
    column = geometry("column", () => new THREE.CylinderGeometry(1, 1, 1, 12));
  const transform = new THREE.Object3D();
  const crag = geometry("crag", () => {
    const g = new THREE.IcosahedronGeometry(1, 2),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      const n =
        0.86 +
        0.075 * Math.sin(x * 13 + z * 7) * Math.cos(y * 17) +
        0.035 * Math.sin(z * 23 + y * 9);
      p.setXYZ(i, x * n, y * n, z * n);
    }
    g.computeVertexNormals();
    return g;
  });
  function emit(g, m, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const cx = Math.floor(x / 120),
      cz = Math.floor(z / 120),
      key = `${cx}_${cz}_${g.id}_${m.id}`;
    if (!buckets.has(key)) buckets.set(key, { g, m, cx, cz, matrices: [] });
    transform.position.set(x, y, z);
    transform.scale.set(sx, sy, sz);
    transform.rotation.set(rx, ry, rz);
    transform.updateMatrix();
    buckets.get(key).matrices.push(transform.matrix.clone());
  }
  function solidBox(kind, x, y, z, sx, sy, sz) {
    colliders.push({
      type: "box",
      kind,
      x,
      y,
      z,
      halfSize: { x: sx / 2, y: sy / 2, z: sz / 2 },
    });
  }
  const roofHeight = (x, z, h) => {
    const e = Math.max(Math.abs(x), Math.max(0, (Math.abs(z) - 0.45) / 0.55));
    return (
      h * (1 - e ** 0.75) +
      Math.pow(e, 7) * h * 0.38 +
      Math.pow(Math.abs(x * z), 5) * h * 0.45
    );
  };
  function solidRoof(x, y, z, w, d, h) {
    for (let i = 0; i < 12; i++)
      for (let j = 0; j < 12; j++) {
        const xa = (i / 12) * 2 - 1,
          xb = ((i + 1) / 12) * 2 - 1,
          za = (j / 12) * 2 - 1,
          zb = ((j + 1) / 12) * 2 - 1;
        const ys = [
            roofHeight(xa, za, h),
            roofHeight(xb, za, h),
            roofHeight(xa, zb, h),
            roofHeight(xb, zb, h),
          ],
          low = -0.4,
          high = Math.max(...ys) + 0.3;
        solidBox(
          "curved_tiled_roof",
          x + ((xa + xb) * w) / 4,
          y + (low + high) / 2,
          z + ((za + zb) * d) / 4,
          w / 12 + 0.1,
          high - low,
          d / 12 + 0.1,
        );
      }
  }
  function roof(w, d, h) {
    return geometry(`roof_${w}_${d}_${h}`, () => {
      const g = new THREE.PlaneGeometry(w, d, 32, 24);
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++)
        p.setY(i, roofHeight(p.getX(i) / (w / 2), p.getZ(i) / (d / 2), h));
      const points = Array.from(p.array),
        indices = Array.from(g.index.array),
        boundary = [];
      for (let i = 0; i <= 32; i++) boundary.push(i);
      for (let j = 1; j <= 24; j++) boundary.push(j * 33 + 32);
      for (let i = 31; i >= 0; i--) boundary.push(24 * 33 + i);
      for (let j = 23; j > 0; j--) boundary.push(j * 33);
      // 曲面四周连接到瓦顶底板，形成封闭实体；不是在薄面下面另摆悬空平板。
      const lower = points.length / 3;
      for (const i of boundary) points.push(p.getX(i), 0, p.getZ(i));
      for (let j = 0; j < boundary.length; j++) {
        const k = (j + 1) % boundary.length;
        indices.push(
          boundary[j],
          lower + j,
          boundary[k],
          boundary[k],
          lower + j,
          lower + k,
        );
      }
      const center = points.length / 3;
      points.push(0, 0, 0);
      for (let j = 0; j < boundary.length; j++)
        indices.push(center, lower + ((j + 1) % boundary.length), lower + j);
      g.dispose();
      const closed = new THREE.BufferGeometry();
      closed.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(points, 3),
      );
      closed.setIndex(indices);
      closed.computeVertexNormals();
      return closed;
    });
  }
  function pavilion(x, z, scale = 1, main = false) {
    const y = penglaiHeightAt(x, z),
      w = (main ? 88 : 25) * scale,
      d = (main ? 92 : 25) * scale,
      h = (main ? 27 : 17) * scale;
    emit(box, stone, x, y + 2, z, w + 9, 4, d + 9);
    solidBox("monastery_platform", x, y + 2, z, w + 9, 4, d + 9);
    if (main) {
      const plaster = material("warm_plaster", "#bcb89d"),
        door = material("lacquer_door", "#67493c"),
        lattice = material("lattice_shadow", "#34403a");
      const panel = (kind, m, xp, yp, zp, sx, sy, sz) => {
        emit(box, m, xp, yp, zp, sx, sy, sz);
        solidBox(kind, xp, yp, zp, sx, sy, sz);
      };
      // 殿身是完整实体外壳：侧墙、后墙与闭合正门，柱廊仍保留在墙外。
      for (const side of [-1, 1]) {
        panel(
          "monastery_side_wall",
          plaster,
          x + side * (w / 2 - 9),
          y + 4 + h * 0.46,
          z,
          2.4,
          h * 0.92,
          d - 20,
        );
        for (let j = -2; j <= 2; j++) {
          emit(
            box,
            wood,
            x + side * (w / 2 - 7.7),
            y + 18,
            z + j * 14,
            1,
            12,
            11,
          );
          emit(
            box,
            lattice,
            x + side * (w / 2 - 7.1),
            y + 18,
            z + j * 14,
            0.2,
            9,
            8,
          );
          for (let k = -2; k <= 2; k++)
            emit(
              box,
              gold,
              x + side * (w / 2 - 6.9),
              y + 18,
              z + j * 14 + k * 1.6,
              0.22,
              9,
              0.23,
            );
        }
        for (const sz of [-1, 1])
          panel(
            "monastery_facade_wall",
            plaster,
            x + side * 27,
            y + 16,
            z + sz * (d / 2 - 10),
            22,
            24,
            2.4,
          );
      }
      panel(
        "monastery_rear_wall",
        plaster,
        x,
        y + 16,
        z - d / 2 + 10,
        w - 20,
        24,
        2.4,
      );
      panel(
        "monastery_closed_doors",
        door,
        x,
        y + 16,
        z + d / 2 - 10,
        32,
        24,
        2.6,
      );
      for (let j = -7; j <= 7; j++)
        emit(box, wood, x + j * 2, y + 16, z + d / 2 - 8.6, 0.4, 24, 0.6);
      for (const side of [-1, 1])
        emit(
          sphere,
          gold,
          x + side * 2,
          y + 15,
          z + d / 2 - 7.9,
          0.6,
          0.6,
          0.24,
        );
      panel(
        "monastery_upper_chamber",
        plaster,
        x,
        y + h + 17,
        z,
        w * 0.49,
        17,
        d * 0.45,
      );
      for (const side of [-1, 1]) {
        emit(box, wood, x, y + h + 19, z + side * d * 0.23, w * 0.5, 12, 0.7);
        emit(
          box,
          lattice,
          x,
          y + h + 19,
          z + side * (d * 0.23 + 0.4),
          w * 0.44,
          8,
          0.15,
        );
        for (let j = -8; j <= 8; j++)
          emit(
            box,
            gold,
            x + j * 2.4,
            y + h + 19,
            z + side * (d * 0.23 + 0.55),
            0.3,
            8,
            0.2,
          );
      }
      // 两层瓦顶下面用深色封板封口，消除穿透屋面的空洞；上层房体遮住层间空隙。
      panel(
        "monastery_eave_soffit",
        wood,
        x,
        y + h + 5,
        z,
        w + 12,
        1.8,
        d + 12,
      );
      panel(
        "monastery_upper_soffit",
        wood,
        x,
        y + h + 23,
        z,
        w * 0.7,
        1.8,
        d * 0.65,
      );
    } else {
      // 峰顶亭台落在最高点，四角向实际山坡延伸石墩，避免悬空基座。
      for (const dx of [-w * 0.42, w * 0.42])
        for (const dz of [-d * 0.42, d * 0.42]) {
          const ground = penglaiHeightAt(x + dx, z + dz),
            height = Math.max(1, y + 1 - ground);
          emit(box, stone, x + dx, ground + height / 2, z + dz, 3, height, 3);
          solidBox(
            "summit_pavilion_support",
            x + dx,
            ground + height / 2,
            z + dz,
            3,
            height,
            3,
          );
        }
    }
    // 开放柱间通道；屋顶有独立厚度代理，成年角色可绕殿而非穿屋顶。
    const columns = main ? 5 : 2;
    for (let i = 0; i < columns; i++)
      for (const side of [-1, 1]) {
        const xx = x + (i / (columns - 1) - 0.5) * (w - 5),
          zz = z + side * (d / 2 - 3);
        emit(column, red, xx, y + 4 + h / 2, zz, 1.4 * scale, h, 1.4 * scale);
        solidBox(
          "vermilion_pillar",
          xx,
          y + 4 + h / 2,
          zz,
          2.8 * scale,
          h,
          2.8 * scale,
        );
        emit(column, stone, xx, y + 4.6, zz, 2.2 * scale, 1.2, 2.2 * scale);
        emit(
          column,
          gold,
          xx,
          y + 4 + h - 0.4,
          zz,
          1.6 * scale,
          0.8,
          1.6 * scale,
        );
      }
    for (const side of [-1, 1])
      emit(box, wood, x, y + 4 + h, z + side * (d / 2 - 3), w + 2, 2, 2);
    emit(roof(w + 14, d + 14, main ? 14 : 7), roofmat, x, y + h + 6, z);
    solidRoof(x, y + h + 6, z, w + 14, d + 14, main ? 14 : 7);
    emit(box, gold, x, y + h + (main ? 20 : 13), z, 1.0, 1.0, d * 0.44);
    // 瓦当贴着真实檐口而非悬浮在其上；连续横向瓦纹强化中式屋面。
    for (const side of [-1, 1])
      for (let j = 0; j < 18; j++) {
        const xx = x + (j / 17 - 0.5) * (w + 10),
          zz = z + side * (d / 2 + 6),
          yy =
            y +
            h +
            6 +
            roofHeight(
              (xx - x) / ((w + 14) / 2),
              (zz - z) / ((d + 14) / 2),
              main ? 14 : 7,
            );
        emit(column, roofmat, xx, yy, zz, 0.48, 1.8, 0.48, Math.PI / 2);
        emit(sphere, gold, xx, yy, zz + side * 0.8, 0.28, 0.28, 0.16);
      }
    if (main) {
      emit(roof(w * 0.7, d * 0.65, 12), roofmat, x, y + h + 24, z);
      solidRoof(x, y + h + 24, z, w * 0.7, d * 0.65, 12);
      for (const side of [-1, 1])
        for (const a of [-1, 1]) {
          const xx = x + side * w * 0.26,
            zz = z + a * d * 0.24;
          emit(column, red, xx, y + h + 18, zz, 1.1, 18, 1.1);
          solidBox("upper_pillar", xx, y + h + 18, zz, 2.2, 18, 2.2);
        }
      for (const side of [-1, 1]) {
        emit(box, red, x + side * w * 0.26, y + h + 20, z, 1, 13, d * 0.48);
        emit(box, wood, x, y + h + 25, z + side * d * 0.24, w * 0.52, 1.3, 1.3);
        for (let j = -4; j <= 4; j++) {
          emit(
            box,
            wood,
            x + side * (w * 0.26 + 0.55),
            y + h + 20,
            z + j * 4.2,
            0.35,
            9.8,
            0.4,
          );
          emit(
            box,
            gold,
            x + side * (w * 0.26 + 0.8),
            y + h + 20,
            z + j * 4.2,
            0.24,
            4.2,
            3.1,
            side * 0.6,
            0,
            0,
          );
        }
        for (const row of [-4.5, 0, 4.5])
          emit(
            box,
            wood,
            x + side * (w * 0.26 + 0.65),
            y + h + 20 + row,
            z,
            0.4,
            0.55,
            d * 0.46,
          );
      }
      emit(box, gold, x, y + h + 36, z, 1, 1, d * 0.65 * 0.44);
      // 神像与屏风作为内殿细节，外院与柱廊仍留有完整通路。
      emit(box, red, x, y + 11, z - 31, 54, 14, 2);
      solidBox("temple_screen", x, y + 11, z - 31, 54, 14, 2);
      for (let j = -3; j <= 3; j++)
        emit(box, gold, x + j * 6, y + 12, z - 29.8, 0.35, 9, 0.3);
      for (const s of [-1, 1]) {
        emit(sphere, stone, x + s * 31, y + 8, z + 48, 4, 3, 6);
        emit(column, gold, x + s * 31, y + 12, z + 47, 1.2, 8, 1.2);
      }
      // 台阶从平台前缘向外排布，踏面高于山体并逐级下降，不能与平台共面重叠。
      for (let j = 0; j < 8; j++) {
        const top = y + 3.65 - j * 0.4,
          bottom = y - 0.2,
          height = top - bottom,
          centerY = (top + bottom) / 2,
          centerZ = z + 52.5 + j * 4;
        emit(box, stone, x, centerY, centerZ, 65, height, 4);
        solidBox("monastery_entrance_step", x, centerY, centerZ, 65, height, 4);
      }
      for (const side of [-1, 1])
        for (let j = 0; j < 12; j++) {
          const zz = z - 41 + j * 7;
          emit(column, stone, x + side * 43, y + 7, zz, 0.65, 6, 0.65);
          emit(sphere, stone, x + side * 43, y + 10.3, zz, 0.95, 0.95, 0.95);
          if (j < 11)
            emit(box, stone, x + side * 43, y + 8.5, zz + 3.5, 1, 1.3, 7);
        }
      for (const side of [-1, 1]) {
        emit(sphere, gold, x + side * 26, y + 8, z + 22, 4.5, 2.2, 4.5);
        emit(column, gold, x + side * 26, y + 6, z + 22, 2.7, 4, 2.7);
        for (const a of [-1, 1])
          emit(
            column,
            gold,
            x + side * 26 + a * 3.8,
            y + 8,
            z + 22,
            0.6,
            4,
            0.6,
          );
      }
      for (let j = -4; j <= 4; j++)
        for (let k = 0; k < 5; k++)
          emit(box, gold, x + j * 5, y + 7 + k * 2.2, z - 29.6, 0.3, 2.0, 0.3);
      for (const side of [-1, 1])
        for (let j = 0; j < 5; j++) {
          const xx = x + side * 40,
            zz = z - 32 + j * 16;
          emit(box, red, xx, y + h - 1, zz, 4.2, 1.2, 4.2);
          emit(box, gold, xx, y + h - 2, zz, 3, 1.0, 3);
        }
    }
    return { x, y: y + 10, z };
  }
  function treeKit() {
    const branchParts = [],
      blooms = [],
      farBlooms = [];
    function part(g, p, scale, rot = [0, 0, 0]) {
      const c = g.clone();
      transform.position.set(...p);
      transform.scale.set(...scale);
      transform.rotation.set(...rot);
      transform.updateMatrix();
      c.applyMatrix4(transform.matrix);
      return c;
    }
    const trunk = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.3, 5, 0.2),
        new THREE.Vector3(-0.7, 9, 0),
        new THREE.Vector3(0.2, 13, 0.4),
      ]),
      18,
      0.6,
      7,
      false,
    );
    branchParts.push(trunk);
    for (let j = 0; j < 9; j++) {
      const a = j * 2.399,
        h = 7 + j * 0.55,
        r = 4 + j * 0.16;
      const tip = new THREE.Vector3(Math.cos(a) * r, h + 3, Math.sin(a) * r);
      branchParts.push(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, h, 0),
            new THREE.Vector3(tip.x * 0.65, h + 1, tip.z * 0.65),
            tip,
          ]),
          8,
          0.17,
          5,
        ),
      );
      const floralCore = geometry("organic_bloom_core", () => {
        const g = new THREE.IcosahedronGeometry(1, 1),
          p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i),
            y = p.getY(i),
            z = p.getZ(i),
            r = 1 + 0.1 * Math.sin(x * 11 + z * 17) * Math.cos(y * 9);
          p.setXYZ(i, x * r, y * r, z * r);
        }
        g.computeVertexNormals();
        return g;
      });
      const farCore = geometry(
        "far_bloom_core",
        () => new THREE.IcosahedronGeometry(1, 0),
      );
      for (let k = 0; k < 6; k++) {
        const p = [
            tip.x + Math.sin(k * 2.399 + j) * 1.5,
            tip.y + Math.cos(k * 1.7) * 0.75,
            tip.z + Math.cos(k * 2.399 + j) * 1.5,
          ],
          scale = [1.9, 1.35, 1.65],
          rotation = [0, k, 0];
        blooms.push(part(floralCore, p, scale, rotation));
        farBlooms.push(part(farCore, p, scale, rotation));
      }
      for (let k = 0; k < 10; k++) {
        const phase = k * 2.399 + j,
          radius = 1.1 + ((k * 7 + j) % 9) * 0.14;
        const center = [
          tip.x + Math.sin(phase) * radius,
          tip.y + Math.cos(k * 1.7) * 1.2,
          tip.z + Math.cos(phase) * radius,
        ];
        const twig = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3([tip, new THREE.Vector3(...center)]),
          3,
          0.045,
          4,
          false,
        );
        branchParts.push(twig);
        for (let flower = 0; flower < 4; flower++) {
          const fx = center[0] + Math.sin(flower * 2.4 + j) * 0.52,
            fy = center[1] + Math.cos(flower * 2.7) * 0.35,
            fz = center[2] + Math.cos(flower * 2.4 + j) * 0.52;
          for (let petal = 0; petal < 5; petal++) {
            const a = (petal / 5) * Math.PI * 2;
            const g = new THREE.PlaneGeometry(0.54, 0.62, 1, 2);
            g.translate(0, 0.24, 0);
            blooms.push(
              part(
                g,
                [fx + Math.cos(a) * 0.1, fy, fz + Math.sin(a) * 0.1],
                [1, 1, 1],
                [0.55, a, 0],
              ),
            );
            g.dispose();
          }
        }
      }
    }
    const colorBlooms = (g) => {
      const p = g.attributes.position,
        colors = [],
        base = new THREE.Color("#bb6288"),
        light = new THREE.Color("#f3c5cb"),
        color = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        color
          .copy(base)
          .lerp(
            light,
            0.45 +
              0.22 * Math.sin(p.getX(i) * 2.3 + p.getZ(i) * 1.7) +
              0.12 * Math.sin(p.getY(i) * 4),
          );
        color.toArray(colors, colors.length);
      }
      g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      return g;
    };
    // 远树保留同一枝冠体积与色彩，只移除无法分辨的花瓣、细枝；碰撞始终使用真实树干。
    const farBranches = geometry("peach_far_branches", () =>
        mergeGeometries(branchParts.filter((_, i) => i === 0 || i % 11 === 1)),
      ),
      farFlowers = geometry("peach_far_flowers", () =>
        mergeGeometries(farBlooms),
      );
    colorBlooms(farFlowers);
    farBranches.userData.penglaiDetailLevel = "far";
    farFlowers.userData.penglaiDetailLevel = "far";
    const branches = geometry("peach_branches", () =>
        mergeGeometries(branchParts),
      ),
      flowers = geometry("peach_flowers", () => {
        const parts = blooms.map((g) => (g.index ? g.toNonIndexed() : g)),
          g = mergeGeometries(parts),
          p = g.attributes.position,
          colors = [];
        parts.forEach((g, i) => {
          if (g !== blooms[i]) g.dispose();
        });
        const base = new THREE.Color("#bb6288"),
          light = new THREE.Color("#f3c5cb"),
          color = new THREE.Color();
        for (let i = 0; i < p.count; i++) {
          color
            .copy(base)
            .lerp(
              light,
              0.45 +
                0.22 * Math.sin(p.getX(i) * 2.3 + p.getZ(i) * 1.7) +
                0.12 * Math.sin(p.getY(i) * 4),
            );
          color.toArray(colors, colors.length);
        }
        g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        return g;
      });
    branchParts.forEach((g) => g.dispose());
    blooms.forEach((g) => g.dispose());
    farBlooms.forEach((g) => g.dispose());
    branches.userData.penglaiDetailLevel = "near";
    flowers.userData.penglaiDetailLevel = "near";
    return { branches, flowers, farBranches, farFlowers };
  }
  try {
    const skyMaterial = keep(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { underwater: { value: 0 } },
        vertexShader:
          "varying vec3 skyDirection;void main(){vec4 world=modelMatrix*vec4(position,1.);skyDirection=world.xyz-cameraPosition;gl_Position=projectionMatrix*viewMatrix*world;gl_Position.z=gl_Position.w*.999999;}",
        fragmentShader:
          "varying vec3 skyDirection;uniform float underwater;void main(){float h=smoothstep(-.1,.7,normalize(skyDirection).y);vec3 color=mix(vec3(.63,.75,.73),vec3(.19,.39,.49),h);color=mix(color,vec3(.10,.23,.22),underwater);gl_FragColor=vec4(color,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}",
      }),
    );
    const sky = new THREE.Mesh(
      geometry("painted_sky", () => new THREE.SphereGeometry(3000, 24, 16)),
      skyMaterial,
    );
    sky.name = "jade_ink_sky_gradient";
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    skyMaterial.depthTest = false;
    root.add(sky);
    const terrain = keep(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 }),
    );
    addSurfaceDetail(terrain, "stone", 0.2);
    const colors = {
        water: new THREE.Color("#547c75"),
        rock: new THREE.Color("#697f68"),
        jade: new THREE.Color("#427549"),
        cliff: new THREE.Color("#8da083"),
      },
      c = new THREE.Color();
    for (let z = W.minZ; z < W.maxZ; z += 80) {
      const d = Math.min(80, W.maxZ - z),
        g = keep(new THREE.PlaneGeometry(1200, d, 200, Math.ceil(d / 6)));
      g.rotateX(-Math.PI / 2);
      g.translate(0, 0, z + d / 2);
      const p = g.attributes.position,
        cs = [];
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          zz = p.getZ(i),
          y = penglaiHeightAt(x, zz);
        p.setY(i, y);
        c.copy(y < 0 ? colors.water : colors.jade).lerp(
          colors.rock,
          (Math.sin(y * 0.15 + x * 0.012) + 1) * 0.27,
        );
        const slope =
          Math.hypot(
            penglaiHeightAt(x + 2, zz) - penglaiHeightAt(x - 2, zz),
            penglaiHeightAt(x, zz + 2) - penglaiHeightAt(x, zz - 2),
          ) / 4;
        if (y > 20)
          c.lerp(
            colors.cliff,
            Math.min(0.85, Math.max(0, (slope - 0.8) * 0.55)),
          );
        if (y > 0)
          c.multiplyScalar(0.93 + 0.07 * Math.sin(y * 0.07 + x * 0.006));
        c.toArray(cs, cs.length);
      }
      g.setAttribute("color", new THREE.Float32BufferAttribute(cs, 3));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, terrain);
      groundStrips.push(terrainMeshHeight(g));
      m.name = "same_source_mountain_floor";
      root.add(m);
      yield "mountain-strata";
    }
    // 上表面写入深度并完全遮挡池底；水下单独使用反面材质，保持两种视角的水体感。
    const watermat = keep(
      new THREE.MeshStandardMaterial({
        color: "#356d69",
        roughness: 0.26,
        metalness: 0.22,
        side: THREE.FrontSide,
      }),
    );
    watermat.onBeforeCompile = (shader) => {
      shader.uniforms.penglaiTime = time;
      shader.vertexShader = "varying vec3 vPool;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvPool=position;",
      );
      shader.fragmentShader =
        "uniform float penglaiTime;varying vec3 vPool;\n" +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nfloat wave=sin(vPool.x*.13+penglaiTime*.55)*sin(vPool.z*.17-penglaiTime*.3);diffuseColor.rgb*=.94+.06*wave;",
      );
    };
    const waterg = keep(new THREE.PlaneGeometry(1200, 1560, 1, 1));
    waterg.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(waterg, watermat);
    water.position.set(0, 4, -620);
    water.name = "opaque_lotus_water_top";
    root.add(water);
    const underside = new THREE.Mesh(
      waterg,
      keep(
        new THREE.MeshStandardMaterial({
          color: "#8aa9a0",
          roughness: 0.5,
          transparent: true,
          opacity: 0.35,
          side: THREE.BackSide,
          depthWrite: false,
        }),
      ),
    );
    underside.position.copy(water.position);
    underside.name = "lotus_water_underside";
    root.add(underside);
    const temple = pavilion(0, -650, 1, true);
    const plaqueMap =
      typeof document === "undefined"
        ? null
        : keep(
            new THREE.TextureLoader().load(
              new URL("./assets/penglai/sword_plaque.png", import.meta.url)
                .href,
            ),
          );
    if (plaqueMap) plaqueMap.colorSpace = THREE.SRGBColorSpace;
    const plaque = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(46, 14)),
      keep(
        new THREE.MeshStandardMaterial({
          map: plaqueMap,
          color: plaqueMap ? "#ffffff" : "#37463d",
          roughness: 0.9,
        }),
      ),
    );
    plaque.name = "brush_calligraphy_yi_qi_yu_jian";
    plaque.position.set(0, penglaiHeightAt(0, -650) + 28, -601.3);
    root.add(plaque);
    emit(box, wood, 0, plaque.position.y, -602, 48, 16, 1.2);
    solidBox(
      "monastery_inscribed_plaque",
      0,
      plaque.position.y,
      -602,
      48,
      16,
      1.2,
    );
    ward = scope.own(createPenglaiWard(root));
    skyIslands = scope.own(createPenglaiSkyIslands(root, colliders));
    yield "monastery";
    for (const [x, z] of [
      [-214, -315],
      [230, -380],
      [-175, -785],
      [175, -905],
      [-358, -680],
      [374, -1100],
    ]) {
      pavilion(x, z, 0.85);
      yield "pavilions";
    }
    const gateY = penglaiHeightAt(0, -235),
      gateZ = -235;
    for (const s of [-1, 1]) {
      emit(column, red, s * 28, gateY + 31, gateZ, 2.5, 64, 2.5);
      solidBox("dragon_gate_column", s * 28, gateY + 31, gateZ, 5, 64, 5);
      emit(sphere, gold, s * 28, gateY + 63, gateZ, 3, 3, 3);
    }
    emit(box, red, 0, gateY + 58, gateZ, 63, 4, 5);
    emit(roof(70, 19, 7), roofmat, 0, gateY + 60, gateZ);
    solidBox("dragon_gate_lintel", 0, gateY + 59, gateZ, 63, 6, 8);
    pink.side = THREE.DoubleSide;
    pink.color.set("#ffffff");
    pink.vertexColors = true;
    const tk = treeKit();
    for (const a of skyIslands.treeAnchors) {
      for (const [g, m] of [
        [tk.branches, wood],
        [tk.flowers, pink],
        [tk.farBranches, wood],
        [tk.farFlowers, pink],
      ])
        emit(g, m, a.x, a.y, a.z, 0.62, 0.62, 0.62);
      solidBox("sky_peach_trunk", a.x, a.y + 3.8, a.z, 1, 7.6, 1);
    }
    let peachTrees = 0;
    for (let j = 0; j < 1800; j++) {
      const x = -515 + (j % 45) * 23 + Math.sin(j * 5.37) * 6,
        z = -1240 + Math.floor(j / 45) * 27 + Math.cos(j * 2.399) * 7,
        y = penglaiHeightAt(x, z);
      if (
        y < 8 ||
        y > 160 ||
        (Math.abs(x) < 100 && Math.abs(z + 650) < 135) ||
        Math.hypot(x + 320, z + 650) < 88
      )
        continue;
      // 仙观通往四方的山径留出成年人回转空间，桃林形成连片而非零星点缀。
      if (
        Math.abs(x) < 28 ||
        Math.abs(z + 650) < 24 ||
        besideSummitPath(x, z, 9)
      )
        continue;
      const s = 0.8 + (j % 7) * 0.065,
        a = j * 2.399;
      emit(tk.branches, wood, x, y, z, s, s, s, 0, a);
      emit(tk.flowers, pink, x, y, z, s, s, s, 0, a);
      emit(tk.farBranches, wood, x, y, z, s, s, s, 0, a);
      emit(tk.farFlowers, pink, x, y, z, s, s, s, 0, a);
      peachTrees++;
      colliders.push({
        type: "box",
        kind: "peach_trunk",
        x,
        y: y + 5 * s,
        z,
        halfSize: { x: 0.8 * s, y: 5 * s, z: 0.8 * s },
      });
      if (peachTrees % 20 === 0) yield "peach-groves";
    }
    root.userData.peachTrees = peachTrees;
    root.userData.skyPeachTrees = skyIslands.treeAnchors.length;
    const lotusLeaf = geometry("lotus_leaf", () => {
        const g = new THREE.CircleGeometry(1, 14);
        g.rotateX(-Math.PI / 2);
        return g;
      }),
      petal = geometry("lotus_petal", () => new THREE.SphereGeometry(1, 10, 6));
    for (let j = 0; j < 150; j++) {
      const x = Math.sin(j * 2.4) * 120,
        z = 115 - ((j * 17) % 320);
      if (penglaiHeightAt(x, z) > -8) continue;
      emit(lotusLeaf, leaf, x, 4.12, z, 2.0, 1, 2.0, 0, j);
      emit(column, leaf, x, -8, z, 0.13, 24, 0.13);
      if (j % 3 === 0) {
        emit(sphere, gold, x, 4.8, z, 0.6, 0.4, 0.6);
        for (let p = 0; p < 8; p++) {
          const a = (p / 8) * Math.PI * 2;
          emit(
            petal,
            pink,
            x + Math.cos(a) * 0.8,
            4.65,
            z + Math.sin(a) * 0.8,
            0.6,
            0.22,
            1.0,
            0,
            -a + Math.PI / 2,
          );
        }
      }
    }
    // 山脚沉石、水草与贝壳属于浅水生态，不套用别处海底的发光矿柱。
    for (let j = 0; j < 170; j++) {
      const x = Math.sin(j * 5.8) * 560,
        z = 130 - j * 8.5,
        y = penglaiHeightAt(x, z);
      if (y > 0) continue;
      emit(
        sphere,
        stone,
        x,
        y + 2,
        z,
        3 + (j % 4),
        2 + (j % 3),
        3 + ((j * 3) % 5),
        0,
        j,
      );
      if (j % 3 === 0)
        for (let k = 0; k < 5; k++)
          emit(
            column,
            leaf,
            x + k * 0.5,
            y + 3 + k * 0.3,
            z,
            0.12,
            5 + k,
            0.12,
            0,
            0,
            0.14 * Math.sin(j + k),
          );
    }
    for (const peak of PENGLAI_PEAKS)
      for (let j = 0; j < 18; j++) {
        const a = j * 2.399,
          r = 35 + (j % 4) * 17,
          x = peak.x + Math.cos(a) * r,
          z = peak.z + Math.sin(a) * r,
          y = penglaiHeightAt(x, z);
        if (
          besideSummitPath(x, z, 12) ||
          (Math.abs(x) < 100 && Math.abs(z + 650) < 135) ||
          Math.hypot(x + 320, z + 650) < 88 ||
          Math.hypot(x / 138, (z + 1030) / 125) < 1.3
        )
          continue;
        colliders.push({
          type: "ellipsoid",
          kind: "mountain_outcrop",
          x,
          y: y - 4,
          z,
          axes: {
            x: 9 + (j % 4) * 3,
            y: 13 + (j % 5) * 4,
            z: 10 + (j % 3) * 3,
          },
          rotation: new THREE.Quaternion().setFromEuler(
            new THREE.Euler(0.12, a, 0.13),
          ),
        });
        emit(
          crag,
          stone,
          x,
          y - 4,
          z,
          9 + (j % 4) * 3,
          13 + (j % 5) * 4,
          10 + (j % 3) * 3,
          0.12,
          a,
          0.13,
        );
      }
    createPenglaiSummitPaths(
      root,
      keep,
      material("path_stone", "#b3b5a3", { side: THREE.DoubleSide }),
    );
    for (const route of PENGLAI_SUMMIT_ROUTES) {
      pavilion(route.top.x, route.top.z, 0.72);
      yield "summit-pavilions";
    }
    root.userData.summitRoutes = PENGLAI_SUMMIT_ROUTES;
    // 松林轮廓与修竹强调山水环境；落地树干有细小碰撞代理。
    const pine = material("pine", "#426457"),
      bamboo = material("bamboo", "#779268");
    const crown = geometry("pine_crown", () => new THREE.ConeGeometry(1, 1, 9));
    for (let j = 0; j < 96; j++) {
      const x = Math.sin(j * 2.399) * 480,
        z = -220 - (j % 23) * 46,
        y = penglaiHeightAt(x, z);
      if (
        y < 8 ||
        (Math.abs(x) < 92 && Math.abs(z + 650) < 112) ||
        besideSummitPath(x, z, 9)
      )
        continue;
      if (j % 3 === 0) {
        for (let k = 0; k < 5; k++) {
          const xx = x + (k - 2) * 1.3,
            zz = z + Math.sin(k) * 2,
            h = 15 + k * 1.3;
          emit(column, bamboo, xx, y + h / 2, zz, 0.18, h, 0.18);
          for (let n = 0; n < 5; n++)
            emit(
              sphere,
              leaf,
              xx + (n % 2 ? 2 : -2),
              y + h - 5 + n,
              zz,
              2.6,
              0.2,
              0.5,
              0,
              0.5 * n,
              0.2,
            );
        }
      } else {
        emit(column, wood, x, y + 7, z, 0.7, 14, 0.7);
        colliders.push({ kind: "pine_trunk", x, y: y + 7, z, radius: 1.0 });
        for (let k = 0; k < 4; k++)
          emit(
            crown,
            pine,
            x + Math.sin(k) * 1.3,
            y + 8 + k * 3.0,
            z + Math.cos(k),
            5.6 - k * 0.7,
            4,
            4.5 - k * 0.5,
          );
      }
    }
    // 山泉沿采样地面逐段跌落，透明水带配石底，远处读作细瀑而非发光灯柱。
    const falls = keep(
      new THREE.MeshStandardMaterial({
        color: "#c1d6ce",
        transparent: true,
        opacity: 0.38,
        roughness: 0.25,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    for (const peak of [PENGLAI_PEAKS[1], PENGLAI_PEAKS[5]]) {
      const points = [];
      for (let j = 0; j < 30; j++) {
        const x = peak.x + Math.sin(j * 0.12) * 10,
          z = peak.z + j * 6;
        points.push(new THREE.Vector3(x, penglaiHeightAt(x, z) + 1.4, z));
      }
      const g = keep(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points),
          60,
          1.8,
          6,
          false,
        ),
      );
      const m = new THREE.Mesh(g, falls);
      m.name = "mountain_spring";
      root.add(m);
    }
    yield "lotus-beds";
    // 轻薄云丝使用有界顶点动画，既不遮满天空也不产生逐帧几何重建。
    const cloudmat = keep(
      new THREE.MeshBasicMaterial({
        color: "#d9e1d4",
        transparent: true,
        opacity: 0.045,
        depthWrite: false,
        fog: true,
      }),
    );
    for (let j = 0; j < 26; j++) {
      const cloud = new THREE.Mesh(sphere, cloudmat);
      cloud.position.set(
        Math.sin(j * 2.4) * 420,
        80 + (j % 5) * 55,
        -160 - j * 42,
      );
      cloud.scale.set(110 + (j % 4) * 20, 6, 40);
      cloud.name = "thin_mountain_mist";
      root.add(cloud);
    }
    for (const bucket of buckets.values()) {
      const m = new THREE.InstancedMesh(
        bucket.g,
        bucket.m,
        bucket.matrices.length,
      );
      bucket.matrices.forEach((matrix, i) => m.setMatrixAt(i, matrix));
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
      m.name = "penglai_spatial_details";
      m.userData.anchor = new THREE.Vector3(
        bucket.cx * 120 + 60,
        0,
        bucket.cz * 120 + 60,
      );
      m.userData.detailLevel = bucket.g.userData.penglaiDetailLevel;
      m.userData.anchor.y =
        bucket.matrices.reduce((sum, matrix) => sum + matrix.elements[13], 0) /
          bucket.matrices.length +
        10;
      root.add(m);
      chunks.push(m);
      yield "details";
    }
    const landmarks = [
      { name: "莲池育幼湾", position: new THREE.Vector3(0, -18, 75) },
      { name: "龙门", position: new THREE.Vector3(0, gateY + 35, gateZ) },
      {
        name: "御剑道观",
        position: new THREE.Vector3(temple.x, temple.y, temple.z),
      },
    ];
    const radarPaths = [
      [
        [0, 75],
        [0, -235],
        [0, -355],
        [0, -520],
        [0, -650],
      ],
      Array.from({ length: 25 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return [Math.sin(a) * 325, -650 + Math.cos(a) * 380];
      }),
      [
        [0, -650],
        [315, -650],
      ],
      [
        [0, -650],
        [-320, -650],
      ],
      [
        [0, -650],
        [0, -1030],
      ],
    ];
    function dispose() {
      if (disposed) return;
      disposed = true;
      ward?.dispose();
      skyIslands?.dispose();
      root.removeFromParent();
      root.traverse((n) => {
        if (n.isInstancedMesh) n.dispose();
      });
      resources.forEach((r) => r.dispose());
      resources.clear();
      root.clear();
      groundStrips.length = 0;
    }
    return scope.finish({
      root,
      colliders,
      navigationColliders: colliders,
      heightAt: penglaiHeightAt,
      groundHeightAt: (x, z) => {
        const index = Math.max(
          0,
          Math.min(groundStrips.length - 1, Math.floor((z - W.minZ) / 80)),
        );
        return groundStrips[index]?.(x, z) ?? penglaiHeightAt(x, z);
      },
      landmarks,
      radarPaths,
      obstacles: [],
      barriers: ward.barriers,
      ward,
      reset: () => ward.reset(),
      updateProgress: (...args) => ward.updateProgress(...args),
      guardianWaypoints: PENGLAI_BOSS_INSTANCES,
      rewardHabitat: PENGLAI_REWARD_HABITAT,
      rewardAnchor: penglaiRewardAnchor,
      update(t, position, dt, highQuality, cameraPosition = position) {
        // 天幕随相机平移，最高空域与边角朝向也保持在球内。
        sky.position.copy(cameraPosition);
        time.value = t;
        ward.update(t, position);
        skyMaterial.uniforms.underwater.value = Math.max(
          0,
          Math.min(1, (4 - position.y) / 22),
        );
        for (const m of chunks) {
          const a = m.userData.anchor,
            d = Math.hypot(a.x - position.x, a.z - position.z);
          const level = m.userData.detailLevel;
          const treeDistance = Math.hypot(
            a.x - position.x,
            a.y - position.y,
            a.z - position.z,
          );
          // 同一块近远树共享切换半径，保证任何距离都有完整树冠；不减生态、碰撞或可见范围。
          m.visible =
            d < (highQuality ? 900 : 700) &&
            (!level ||
              (level === "near" ? treeDistance < 170 : treeDistance >= 170));
        }
      },
      dispose,
    });
  } finally {
    scope.close();
  }
}
