import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  cachedGeometry,
  loftGeometry,
  seededRandom,
  tubeGeometry,
} from "./atlantis_art_geometry.js";
import {
  addLeafDetail,
  addSurfaceDetail,
  clusterInstances,
  ribbonGeometry,
  seaFanGeometry,
} from "./ocean_visuals.js";
import { ATLANTIS_EXCAVATION_SITES } from "./atlantis_terrain.js";

/**
 * 亚特兰蒂斯城市海洋殖民切片:冷水分枝珊瑚、层叠板状海绵、海扇、海葵与
 * 克制的漂浮植被,有根附着于砌缝、断檐、台面与厅室地面。
 * 当前切片覆盖:港口下厅内部(含竖井缘与柱列)、入口坡道/台阶两侧、
 * 港区一段街区立面。所有布置由 ATLANTIS_EXCAVATION_SITES 元数据、
 * 宿主碰撞(扫墙)与立面锚点驱动,不改动任何既有模块。
 * 风格化的海洋景观,不作生物复原宣称;不新增猎物物种,不影响战斗。
 */

// 原型几何跨场景缓存；材质与动画时钟归每次 create 所有，暂停或销毁一个
// 切片不会改变其他切片。相同着色器仍通过程序缓存复用 GPU 程序。

/** 与 atlantis_art_geometry 内部相同的雾减免注入,深海雾中剪影与城市一致。 */
function applyFogRelief(material, relief) {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms.atlFogRelief = { value: relief };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <fog_pars_fragment>",
        "#include <fog_pars_fragment>\nuniform float atlFogRelief;",
      )
      .replace(
        "#include <fog_fragment>",
        `#ifdef USE_FOG
        #ifdef FOG_EXP2
          float atlFogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
        #else
          float atlFogFactor = smoothstep( fogNear, fogFar, vFogDepth );
        #endif
        gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, atlFogFactor * atlFogRelief );
        #endif`,
      );
  };
}

/** 只摆动植被上端,根部保持锚固;相位来自实例平移,避免整片同相摇摆。 */
function addSway(material, strength, time) {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms.marineTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float marineTime;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float marinePhase = 0.0;
        #ifdef USE_INSTANCING
          marinePhase = instanceMatrix[3].x*0.21+instanceMatrix[3].z*0.13;
        #endif
        transformed.x += sin(marineTime*0.6+marinePhase+position.y)*pow(max(0.0,position.y),2.0)*${strength.toFixed(3)};`,
      );
  };
}

/**
 * 当前切片拥有的材质集，切片内批次共享，dispose 时释放。
 * 颜色全部来自顶点色/实例色,材质本体保持浅灰白便于多物种复用;
 * 每个材质的着色器组合(表面细节/摇曳/叶面/雾减免)有独立缓存键。
 */
function marineMaterials(time) {
  const coral = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.82,
    metalness: 0.02,
  });
  addSurfaceDetail(coral, "coral", 1.35);
  applyFogRelief(coral, 0.9);
  coral.customProgramCacheKey = () => "marine_coral_v1";
  const sponge = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.02,
  });
  addSurfaceDetail(sponge, "coral", 0.85);
  applyFogRelief(sponge, 0.9);
  sponge.customProgramCacheKey = () => "marine_sponge_v1";
  const fan = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.72,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });
  addSway(fan, 0.017, time);
  applyFogRelief(fan, 0.86);
  fan.customProgramCacheKey = () => "marine_fan_v1";
  const anemone = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.66,
    metalness: 0.02,
  });
  addSurfaceDetail(anemone, "coral", 0.55);
  applyFogRelief(anemone, 0.9);
  anemone.customProgramCacheKey = () => "marine_anemone_v1";
  const kelp = new THREE.MeshStandardMaterial({
    color: "#dce8e2",
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  addLeafDetail(kelp);
  addSway(kelp, 0.11, time);
  applyFogRelief(kelp, 0.9);
  kelp.customProgramCacheKey = () => "marine_kelp_v1";
  return { coral, sponge, fan, anemone, kelp };
}

/*********************************************
 * 顶点着色工具:有机体的基色、尖端渐色、根部附着垫
 *********************************************/

/** 按高度比例在两种颜色间渐变,并做低频深浅起伏;写入 color 属性。 */
function paintGradient(geometry, { bottom, top, seed = 1, darkenDown = 0.72 }) {
  const position = geometry.attributes.position;
  geometry.computeBoundingBox();
  const min = geometry.boundingBox.min.y,
    span = Math.max(1e-5, geometry.boundingBox.max.y - min);
  const low = new THREE.Color(bottom),
    high = new THREE.Color(top),
    color = new THREE.Color();
  const colors = new Float32Array(position.count * 3);
  const normal = geometry.attributes.normal;
  for (let i = 0; i < position.count; i += 1) {
    const t = (position.getY(i) - min) / span;
    color.copy(low).lerp(high, t * t * (3 - 2 * t));
    const grain =
      0.86 +
      0.14 *
        Math.sin(
          position.getX(i) * 6.1 +
            position.getZ(i) * 5.3 +
            seed * 3.7 +
            t * 9.4,
        );
    color.multiplyScalar(grain);
    if (normal && normal.getY(i) < -0.3) color.multiplyScalar(darkenDown);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** 附着根垫:压扁的侵蚀丘,把殖民体视觉锚进砌缝/台面,颜色贴近宿主石材。 */
function rootPad(radius, seed) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 1) {
    const n =
      1 +
      0.16 * Math.sin(p.getX(i) * 9 + seed) * Math.cos(p.getZ(i) * 7 - seed);
    p.setXYZ(
      i,
      p.getX(i) * n * radius,
      p.getY(i) * 0.14 * radius,
      p.getZ(i) * n * radius,
    );
  }
  g.computeVertexNormals();
  const colors = new Float32Array(p.count * 3);
  const base = new THREE.Color("#6d7f78"),
    algae = new THREE.Color("#486a55"),
    color = new THREE.Color();
  for (let i = 0; i < p.count; i += 1) {
    color
      .copy(base)
      .lerp(algae, 0.3 + 0.3 * Math.sin(i * 1.7 + seed))
      .multiplyScalar(0.8 + 0.2 * Math.sin(i * 2.3 + seed * 2));
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

/** 合并带 position/normal/uv/color 的部件为单几何(全部转非索引)。 */
function mergeParts(parts) {
  const ready = parts.map((g) => {
    const geometry = g.index ? g.toNonIndexed() : g;
    if (!geometry.attributes.uv) {
      const count = geometry.attributes.position.count;
      geometry.setAttribute(
        "uv",
        new THREE.BufferAttribute(new Float32Array(count * 2), 2),
      );
    }
    if (!geometry.attributes.color) {
      const count = geometry.attributes.position.count;
      const white = new Float32Array(count * 3).fill(1);
      geometry.setAttribute("color", new THREE.BufferAttribute(white, 3));
    }
    for (const name of Object.keys(geometry.attributes))
      if (!["position", "normal", "uv", "color"].includes(name))
        geometry.deleteAttribute(name);
    return geometry;
  });
  const merged = mergeGeometries(ready, false);
  for (const geometry of ready) geometry.dispose();
  for (const g of parts) if (!ready.includes(g)) g.dispose();
  merged.computeBoundingSphere();
  return merged;
}

/*********************************************
 * 物种原型几何(模块级缓存;每个原型含根垫)
 *********************************************/

/**
 * 冷水分枝珊瑚群落:主干分叉两代,末端带膨大的珊瑚虫球;
 * 沿骨架由象牙白过渡到玫瑰尖,根部压在石色附着垫上。
 */
function branchingCoralGeometry(variant) {
  return cachedGeometry(`marine_branching_coral_v${variant}`, () => {
    const random = seededRandom(5300 + variant * 17);
    const parts = [];
    const tips = [];
    const grow = (from, yaw, tilt, length, radius, depth) => {
      const mid = from
        .clone()
        .addScaledVector(
          new THREE.Vector3(
            Math.sin(yaw) * Math.sin(tilt),
            Math.cos(tilt),
            Math.cos(yaw) * Math.sin(tilt),
          ),
          length * 0.5,
        );
      mid.x += (random() - 0.5) * length * 0.16;
      mid.z += (random() - 0.5) * length * 0.16;
      const end = from
        .clone()
        .addScaledVector(
          new THREE.Vector3(
            Math.sin(yaw) * Math.sin(tilt),
            Math.cos(tilt),
            Math.cos(yaw) * Math.sin(tilt),
          ),
          length,
        );
      parts.push(
        tubeGeometry(
          null,
          [from, mid, end],
          [radius, radius * 0.78, radius * 0.5],
          { radial: 6, samples: 5 },
        ),
      );
      if (depth <= 0) {
        tips.push(end);
        return;
      }
      for (let c = 0; c < 2; c += 1) {
        const branchYaw = yaw + (c ? 1 : -1) * (0.5 + random() * 0.45);
        const branchTilt = Math.min(1.25, tilt + 0.35 + random() * 0.4);
        grow(
          end,
          branchYaw + (random() - 0.5) * 0.5,
          branchTilt,
          length * (0.62 + random() * 0.14),
          radius * 0.58,
          depth - 1,
        );
      }
    };
    // 两到三股骨架,剪影互不相同。
    const trunks = variant % 2 === 0 ? 2 : 3;
    for (let t = 0; t < trunks; t += 1) {
      const yaw = (t / trunks) * Math.PI * 2 + random() * 0.8;
      grow(
        new THREE.Vector3(Math.cos(yaw) * 0.1, 0.12, Math.sin(yaw) * 0.1),
        yaw,
        0.12 + random() * 0.3,
        0.85 + random() * 0.3,
        0.16 - t * 0.02,
        2,
      );
    }
    for (const tip of tips) {
      const polyp = new THREE.IcosahedronGeometry(0.055, 0);
      polyp.translate(tip.x, tip.y, tip.z);
      parts.push(polyp);
    }
    parts.push(rootPad(0.34, variant * 3 + 1));
    const geometry = mergeParts(parts);
    return paintGradient(geometry, {
      bottom: "#ce6958",
      top: "#ffba8e",
      seed: variant * 11 + 3,
      darkenDown: 0.75,
    });
  });
}

/** 层叠板状海绵:波浪边圆盘层叠错落,顶部点缀两支带唇口的管状海绵。 */
function plateSpongeGeometry(variant) {
  return cachedGeometry(`marine_plate_sponge_v${variant}`, () => {
    const random = seededRandom(7700 + variant * 31);
    const parts = [];
    const plates = 3 + (variant % 2);
    for (let i = 0; i < plates; i += 1) {
      const radius = 0.85 - i * 0.16 + random() * 0.08;
      const plate = loftGeometry(
        null,
        [
          { y: 0, rx: radius * 0.55, rz: radius * 0.5 },
          {
            y: 0.1,
            rx: radius,
            rz: radius * 0.88,
            wave: 8 + (variant % 3),
            waveAmp: 0.075,
          },
          {
            y: 0.2,
            rx: radius * 0.94,
            rz: radius * 0.84,
            wave: 8 + (variant % 3),
            waveAmp: 0.09,
            wavePhase: 0.6,
          },
        ],
        {
          radial: 14,
          subdivision: 2,
          capStart: true,
          capEnd: true,
          seed: variant * 7 + i,
        },
      );
      plate.rotateY(random() * Math.PI * 2);
      plate.rotateX((random() - 0.5) * 0.22);
      plate.translate(
        (random() - 0.5) * 0.3,
        0.1 + i * (0.22 + random() * 0.06),
        (random() - 0.5) * 0.3,
      );
      parts.push(plate);
    }
    // 管状海绵:外翻唇口,不再是光管。
    for (let v = 0; v < 2; v += 1) {
      const height = 0.55 + random() * 0.3;
      const vase = loftGeometry(
        null,
        [
          { y: 0, rx: 0.1, rz: 0.1 },
          { y: height * 0.55, rx: 0.16, rz: 0.15 },
          { y: height * 0.88, rx: 0.19, rz: 0.18 },
          { y: height, rx: 0.23, rz: 0.21, wave: 7, waveAmp: 0.08 },
        ],
        { radial: 10, subdivision: 3, capStart: true, capEnd: false },
      );
      const yaw = random() * Math.PI * 2;
      vase.translate(
        Math.cos(yaw) * 0.24,
        0.1 + (plates - 1) * 0.22,
        Math.sin(yaw) * 0.24,
      );
      parts.push(vase);
    }
    parts.push(rootPad(0.38, variant * 5 + 2));
    const geometry = mergeParts(parts);
    return paintGradient(geometry, {
      bottom: "#8f6d3d",
      top: "#cfa75c",
      seed: variant * 13 + 5,
      darkenDown: 0.6,
    });
  });
}

/** 海扇:复用育幼礁分叉细带骨架,补顶点色与根垫;孔隙真实镂空而非透明贴图。 */
function marineSeaFanGeometry() {
  return cachedGeometry("marine_sea_fan_v1", () => {
    const fan = seaFanGeometry();
    const pad = rootPad(0.15, 9);
    pad.translate(0, -0.02, 0);
    const geometry = mergeParts([fan, pad]);
    return paintGradient(geometry, {
      bottom: "#8a7498",
      top: "#dcc4e8",
      seed: 21,
      darkenDown: 0.8,
    });
  });
}

/** 海葵:柱状体 + 环绕口盘的触手冠,触手尖端泛白,根部吸盘贴地。 */
function anemoneGeometry(variant) {
  return cachedGeometry(`marine_anemone_v${variant}`, () => {
    const random = seededRandom(9100 + variant * 13);
    const parts = [];
    const column = loftGeometry(
      null,
      [
        { y: 0, rx: 0.3, rz: 0.3 },
        { y: 0.16, rx: 0.24, rz: 0.24 },
        { y: 0.34, rx: 0.27, rz: 0.26, wave: 10, waveAmp: 0.05 },
        { y: 0.4, rx: 0.34, rz: 0.33 },
      ],
      { radial: 12, subdivision: 3, capStart: true, capEnd: true },
    );
    parts.push(column);
    const tentacles = 16 + (variant % 3) * 3;
    for (let i = 0; i < tentacles; i += 1) {
      const a = (i / tentacles) * Math.PI * 2 + random() * 0.2;
      const ring = i % 3 === 2 ? 0.12 : 0.24;
      const from = new THREE.Vector3(
        Math.cos(a) * ring,
        0.4,
        Math.sin(a) * ring,
      );
      const lean = 0.5 + random() * 0.4;
      const end = from
        .clone()
        .add(
          new THREE.Vector3(
            Math.cos(a) * lean * 0.32,
            0.28 + random() * 0.14,
            Math.sin(a) * lean * 0.32,
          ),
        );
      const mid = from.clone().lerp(end, 0.5);
      mid.y += 0.05;
      parts.push(
        tubeGeometry(null, [from, mid, end], [0.045, 0.038, 0.016], {
          radial: 4,
          samples: 4,
        }),
      );
    }
    parts.push(rootPad(0.28, variant * 7 + 4));
    const geometry = mergeParts(parts);
    return paintGradient(geometry, {
      bottom: "#633c50",
      top: "#e3c4bb",
      seed: variant * 17 + 7,
      darkenDown: 0.7,
    });
  });
}

/** 漂浮叶丛:复用育幼礁三叶束拉高,色相交给实例色与叶面细节着色器。 */
function kelpTuftGeometry() {
  return cachedGeometry("marine_kelp_tuft_v1", () => {
    const ribbon = ribbonGeometry(true);
    ribbon.scale(1, 2.6, 1);
    const pad = rootPad(0.18, 15);
    return mergeParts([ribbon, pad]);
  });
}

/*********************************************
 * 布置引擎:避让体、宿主墙面扫描、宿主重叠剔除
 *********************************************/

// 避让体:竖井、回转区、两条路线走廊、台阶通道、南门走廊一律不放置。
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
  // 回转净区只约束游泳平面(turn.y)上下各 8m;厅底植被在其下方十余米。
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
    tag: "stair",
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

function blockedByKeepOut(zones, x, y, z, margin = 0, skipTag = null) {
  for (const zone of zones) {
    if (zone.tag && zone.tag === skipTag) continue;
    if (zone.circle) {
      if (y < zone.minY || y > zone.maxY) continue;
      if (
        Math.hypot(x - zone.circle.x, z - zone.circle.z) <
        zone.circle.radius + margin
      )
        return true;
      continue;
    }
    if (zone.segment) {
      const [a, b] = zone.segment;
      const abx = b.x - a.x,
        aby = b.y - a.y,
        abz = b.z - a.z;
      const length2 = abx * abx + aby * aby + abz * abz;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((x - a.x) * abx + (y - a.y) * aby + (z - a.z) * abz) / length2,
        ),
      );
      const dx = x - (a.x + abx * t),
        dy = y - (a.y + aby * t),
        dz = z - (a.z + abz * t);
      if (Math.hypot(dx, dy, dz) < zone.radius + margin) return true;
      continue;
    }
    if (
      x > zone.minX - margin &&
      x < zone.maxX + margin &&
      z > zone.minZ - margin &&
      z < zone.maxZ + margin &&
      y > zone.minY - margin &&
      y < zone.maxY + margin
    )
      return true;
  }
  return false;
}

/**
 * 放置点是否撞进宿主实体(既有家具、贝珠壁龛、倒柱、墙体):
 * 轴对齐 Minkowski 测试;站在盒顶面(baseY 不低于盒顶 0.3m)不算相交。
 */
function overlapsHost(hostColliders, x, baseY, topY, z, halfX, halfZ) {
  for (const c of hostColliders ?? []) {
    if (c.type === "box") {
      if (c.rotation) continue;
      const cMinY = c.y - c.halfSize.y,
        cMaxY = c.y + c.halfSize.y;
      if (baseY >= cMaxY - 0.3) continue; // 立于其顶面
      if (
        Math.abs(x - c.x) < c.halfSize.x + halfX &&
        Math.abs(z - c.z) < c.halfSize.z + halfZ &&
        baseY < cMaxY - 0.05 &&
        topY > cMinY + 0.05
      )
        return true;
    } else if (c.type === "capsule") {
      const capMinY = Math.min(c.a.y, c.b.y),
        capMaxY = Math.max(c.a.y, c.b.y);
      if (baseY >= capMaxY - 0.3) continue;
      if (topY < capMinY + 0.05) continue;
      const reach = c.radius + Math.max(halfX, halfZ);
      const abx = c.b.x - c.a.x,
        aby = c.b.y - c.a.y,
        abz = c.b.z - c.a.z;
      const length2 = abx * abx + aby * aby + abz * abz || 1e-6;
      const midY = (baseY + topY) / 2;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((x - c.a.x) * abx + (midY - c.a.y) * aby + (z - c.a.z) * abz) /
            length2,
        ),
      );
      if (
        Math.hypot(
          x - (c.a.x + abx * t),
          midY - (c.a.y + aby * t),
          z - (c.a.z + abz * t),
        ) < reach
      )
        return true;
    }
  }
  return false;
}

/**
 * 从宿主碰撞扫描厅室内墙面:取与基坑相交的无旋转盒,找出朝向坑内的
 * 竖直面,返回可附着的墙带(法线、所在平面、沿墙区间、高度区间)。
 * 扫描失败时回退到由 site.bounds 与墙体常规厚度推导的四面内墙。
 */
function scanWallBands(hostColliders, site) {
  const pit = site.bounds;
  const cx = (pit.minX + pit.maxX) / 2,
    cz = (pit.minZ + pit.maxZ) / 2;
  const y0 = site.levels[1].floorY,
    y1 = site.levels[0].ceilingY;
  const minY = (c) => c.y - c.halfSize.y;
  const maxY = (c) => c.y + c.halfSize.y;
  const bands = [];
  for (const c of hostColliders ?? []) {
    if (c.type !== "box" || c.rotation) continue;
    if (typeof c.kind !== "string" || !c.kind.endsWith("_ruin_masonry"))
      continue;
    const minX = c.x - c.halfSize.x,
      maxX = c.x + c.halfSize.x,
      minZ = c.z - c.halfSize.z,
      maxZ = c.z + c.halfSize.z;
    if (
      maxX < pit.minX ||
      minX > pit.maxX ||
      maxZ < pit.minZ ||
      minZ > pit.maxZ
    )
      continue;
    const faces = [
      {
        axis: "x",
        plane: maxX,
        normal: [1, 0],
        toward: maxX <= cx,
        span: [minZ, maxZ],
      },
      {
        axis: "x",
        plane: minX,
        normal: [-1, 0],
        toward: minX >= cx,
        span: [minZ, maxZ],
      },
      {
        axis: "z",
        plane: maxZ,
        normal: [0, 1],
        toward: maxZ <= cz,
        span: [minX, maxX],
      },
      {
        axis: "z",
        plane: minZ,
        normal: [0, -1],
        toward: minZ >= cz,
        span: [minX, maxX],
      },
    ];
    for (const face of faces) {
      if (!face.toward) continue;
      // 墙面必须落在基坑内缘附近,且盒子高度跨越大半个厅高。
      if (
        face.axis === "x" &&
        (face.plane < pit.minX - 0.5 || face.plane > pit.maxX + 0.5)
      )
        continue;
      if (
        face.axis === "z" &&
        (face.plane < pit.minZ - 0.5 || face.plane > pit.maxZ + 0.5)
      )
        continue;
      const height = Math.min(maxY(c), y1) - Math.max(minY(c), y0);
      if (height < 8) continue;
      bands.push({
        axis: face.axis,
        plane: face.plane,
        normal: face.normal,
        span: face.span,
        y0: Math.max(minY(c), y0),
        y1: Math.min(maxY(c), y1),
      });
    }
  }
  if (bands.length >= 3) return bands;
  // 回退:按港湾厅堂墙体合同(北/西墙 4.5m,南/东墙 2.5m)推内面。
  return [
    {
      axis: "z",
      plane: pit.maxZ - 4.5,
      normal: [0, -1],
      span: [pit.minX + 4.5, pit.maxX - 2.5],
      y0,
      y1,
    },
    {
      axis: "z",
      plane: pit.minZ + 2.5,
      normal: [0, 1],
      span: [pit.minX + 4.5, pit.maxX - 2.5],
      y0,
      y1,
    },
    {
      axis: "x",
      plane: pit.minX + 4.5,
      normal: [1, 0],
      span: [pit.minZ + 2.5, pit.maxZ - 4.5],
      y0,
      y1,
    },
    {
      axis: "x",
      plane: pit.maxX - 2.5,
      normal: [-1, 0],
      span: [pit.minZ + 2.5, pit.maxZ - 4.5],
      y0,
      y1,
    },
  ];
}

/** 放置记录:每物种一组 {position, quaternion, scale, tint}。 */
class PlacementSet {
  constructor() {
    this.byKind = new Map();
  }
  add(kind, position, quaternion, scale, tint) {
    if (!this.byKind.has(kind)) this.byKind.set(kind, []);
    const placement = { position, quaternion, scale, tint };
    this.byKind.get(kind).push(placement);
    return placement;
  }
  count() {
    let total = 0;
    for (const list of this.byKind.values()) total += list.length;
    return total;
  }
}

const UP = new THREE.Vector3(0, 1, 0);
/** 让 +Y 贴合法线方向的姿态(墙面附着时根系朝墙、冠部朝外),roll 绕自身轴。 */
function orientationFromNormal(nx, ny, nz, roll = 0) {
  const normal = new THREE.Vector3(nx, ny, nz).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, normal);
  if (roll) q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, roll));
  return q;
}

/*********************************************
 * 分区布置:下厅、柱列、竖井缘与屋面、入口台阶、街区立面
 *********************************************/

function planLowerHall(
  set,
  site,
  wallBands,
  zones,
  hostColliders,
  heightAt,
  random,
) {
  const lower = site.levels[1],
    upper = site.levels[0];
  const pit = site.bounds;
  const inset = {
    minX: pit.minX + 5.2,
    maxX: pit.maxX - 3.4,
    minZ: pit.minZ + 3.4,
    maxZ: pit.maxZ - 5.4,
  };
  // 地面周缘带:珊瑚与海绵贴墙脚散布,回转区、路线与既有家具由避让兜底。
  const floorSpots = 26;
  for (let i = 0; i < floorSpots; i += 1) {
    const side = i % 4;
    const t = random();
    let x, z;
    if (side === 0) {
      x = inset.minX + 0.6 + random() * 1.6;
      z = inset.minZ + t * (inset.maxZ - inset.minZ);
    } else if (side === 1) {
      x = inset.maxX - 0.6 - random() * 1.6;
      z = inset.minZ + t * (inset.maxZ - inset.minZ);
    } else if (side === 2) {
      z = inset.minZ + 0.6 + random() * 1.6;
      x = inset.minX + t * (inset.maxX - inset.minX);
    } else {
      z = inset.maxZ - 0.6 - random() * 1.6;
      x = inset.minX + t * (inset.maxX - inset.minX);
    }
    if (blockedByKeepOut(zones, x, lower.floorY + 1, z, 0.5)) continue;
    if (
      overlapsHost(
        hostColliders,
        x,
        lower.floorY,
        lower.floorY + 2.6,
        z,
        1.0,
        1.0,
      )
    )
      continue;
    const pick = random();
    const kind =
      pick < 0.34
        ? "coral"
        : pick < 0.62
          ? "sponge"
          : pick < 0.85
            ? "anemone"
            : "kelp";
    const scale =
      kind === "coral" ? 0.9 + random() * 0.9 : 0.7 + random() * 0.8;
    const placement = set.add(
      kind,
      new THREE.Vector3(x, lower.floorY - 0.04, z),
      orientationFromNormal(0, 1, 0, random() * Math.PI * 2),
      scale,
      null,
    );
    // 保留实际实例记录，装配原型变体后按真实几何范围生成碰撞。
    placement.solid = (kind === "coral" || kind === "sponge") && scale > 1.15;
  }
  // 墙面砌缝带:海扇垂直墙面向厅内展开,海绵与小型海葵咬合同一灰缝。
  for (const band of wallBands) {
    const length = band.span[1] - band.span[0];
    const fans = Math.max(2, Math.round(length / 9));
    for (let i = 0; i < fans; i += 1) {
      const along = THREE.MathUtils.clamp(
        band.span[0] + ((i + 0.5) / fans) * length + (random() - 0.5) * 2.4,
        band.span[0] + Math.min(0.35, length / 4),
        band.span[1] - Math.min(0.35, length / 4),
      );
      const levelPick = random();
      const desiredY =
        levelPick < 0.55
          ? lower.floorY + 1.2 + random() * 6
          : levelPick < 0.8
            ? lower.floorY + 10.5 + random() * 3.5 // 盲拱线脚上下一带
            : upper.floorY + 1 + random() * 4;
      const x = band.axis === "x" ? band.plane + band.normal[0] * 0.12 : along;
      const z = band.axis === "z" ? band.plane + band.normal[1] * 0.12 : along;
      // 实墙下沿与坑缘过渡地形共同限定附着高度，不能把整座厅堂的地板
      // 标高套在门洞侧墙或坡缘上。抖动也不能越过实际墙面端点。
      const y = Math.max(desiredY, band.y0 + 0.3, heightAt(x, z) + 0.3);
      if (y > band.y1 - 1) continue;
      if (blockedByKeepOut(zones, x, y, z, 1.2)) continue;
      set.add(
        "fan",
        new THREE.Vector3(x, y, z),
        orientationFromNormal(
          band.normal[0],
          0.25,
          band.normal[1],
          (random() - 0.5) * 0.5,
        ),
        1.5 + random() * 1.3,
        null,
      );
      if (random() < 0.55) {
        const desiredSY = y - 0.9 - random() * 1.2;
        const smallAlong = THREE.MathUtils.clamp(
          along + (random() - 0.5) * 2,
          band.span[0] + Math.min(0.25, length / 4),
          band.span[1] - Math.min(0.25, length / 4),
        );
        const sx =
          band.axis === "x" ? band.plane + band.normal[0] * 0.1 : smallAlong;
        const sz =
          band.axis === "z" ? band.plane + band.normal[1] * 0.1 : smallAlong;
        const sy = Math.max(desiredSY, band.y0 + 0.2, heightAt(sx, sz) + 0.2);
        if (sy < band.y1 - 0.5 && !blockedByKeepOut(zones, sx, sy, sz, 1.0))
          set.add(
            random() < 0.6 ? "wallSponge" : "wallAnemone",
            new THREE.Vector3(sx, sy, sz),
            orientationFromNormal(
              band.normal[0],
              0.1,
              band.normal[1],
              random() * Math.PI * 2,
            ),
            0.45 + random() * 0.4,
            null,
          );
      }
    }
  }
}

function planColumns(set, site, hostColliders, zones, random) {
  const lower = site.levels[1];
  const columns = (hostColliders ?? []).filter(
    (c) =>
      c.type === "capsule" &&
      c.kind === "harbor_ruin_column" &&
      c.a.y < c.b.y &&
      c.a.x >= site.bounds.minX &&
      c.a.x <= site.bounds.maxX &&
      c.a.z >= site.bounds.minZ &&
      c.a.z <= site.bounds.maxZ,
  );
  for (const column of columns) {
    const x = column.a.x,
      z = column.a.z,
      radius = column.radius;
    const floorY = column.a.y - radius;
    const onLower = Math.abs(floorY - lower.floorY) < 1;
    // 柱脚一圈海葵与小型海绵,不占柱间水道。
    const ring = 3 + Math.floor(random() * 2);
    for (let i = 0; i < ring; i += 1) {
      const a = random() * Math.PI * 2;
      const px = x + Math.cos(a) * (radius + 0.5),
        pz = z + Math.sin(a) * (radius + 0.5);
      if (blockedByKeepOut(zones, px, floorY + 1, pz, 0.4)) continue;
      set.add(
        random() < 0.6 ? "anemone" : "sponge",
        new THREE.Vector3(px, floorY - 0.03, pz),
        orientationFromNormal(0, 1, 0, random() * Math.PI * 2),
        0.55 + random() * 0.35,
        null,
      );
    }
    // 柱身 40%~65% 高度一张海扇,像从凹槽里长出。
    if (random() < (onLower ? 0.85 : 0.55)) {
      const y = floorY + (column.b.y - column.a.y) * (0.45 + random() * 0.2);
      const a = random() * Math.PI * 2;
      const nx = Math.cos(a),
        nz = Math.sin(a);
      const px = x + nx * (radius + 0.1),
        pz = z + nz * (radius + 0.1);
      if (!blockedByKeepOut(zones, px, y, pz, 1.2))
        set.add(
          "fan",
          new THREE.Vector3(px, y, pz),
          orientationFromNormal(nx, 0.3, nz, (random() - 0.5) * 0.4),
          1.2 + random() * 0.9,
          null,
        );
    }
  }
}

function planShaftRim(set, site, zones, random, hostColliders) {
  const shaft = site.shaft;
  const upper = site.levels[0];
  // 在实际楼板顶面种植，不能把另一种遗迹的井缘尺寸当作实心屋面。
  const supported = (x, y, z) =>
    hostColliders.some(
      (c) =>
        c.type === "box" &&
        !c.rotation &&
        Math.abs(c.y + c.halfSize.y - y) < 0.15 &&
        Math.abs(c.x - x) <= c.halfSize.x &&
        Math.abs(c.z - z) <= c.halfSize.z,
    );
  // 楼板断檐:沿竖井缘外侧布置叶丛与海扇,井内保持完全通畅。
  const edges = [
    {
      from: [shaft.minX, shaft.minZ],
      to: [shaft.maxX, shaft.minZ],
      normal: [0, -1],
    },
    {
      from: [shaft.minX, shaft.maxZ],
      to: [shaft.maxX, shaft.maxZ],
      normal: [0, 1],
    },
    {
      from: [shaft.minX, shaft.minZ],
      to: [shaft.minX, shaft.maxZ],
      normal: [-1, 0],
    },
    {
      from: [shaft.maxX, shaft.minZ],
      to: [shaft.maxX, shaft.maxZ],
      normal: [1, 0],
    },
  ];
  for (const edge of edges) {
    const length = Math.hypot(
      edge.to[0] - edge.from[0],
      edge.to[1] - edge.from[1],
    );
    const count = Math.max(1, Math.round(length / 9));
    for (let i = 0; i < count; i += 1) {
      if (random() < 0.35) continue;
      const t = (i + 0.5) / count + (random() - 0.5) * 0.1;
      const bx = edge.from[0] + (edge.to[0] - edge.from[0]) * t,
        bz = edge.from[1] + (edge.to[1] - edge.from[1]) * t;
      // 附着点退到檐口外缘 1.1m,冠部随姿态外倾;只挡真正探入井口的个体,
      // 不使用竖井护圈(护圈是为 30m 游体预留的,会误伤檐口附着)。
      const x = bx + edge.normal[0] * 1.1,
        z = bz + edge.normal[1] * 1.1;
      const overOpening =
        x > shaft.minX - 0.4 &&
        x < shaft.maxX + 0.4 &&
        z > shaft.minZ - 0.4 &&
        z < shaft.maxZ + 0.4;
      if (overOpening) continue;
      if (!supported(x, upper.floorY, z)) continue;
      const kind = random() < 0.55 ? "kelp" : "fan";
      set.add(
        kind,
        new THREE.Vector3(x, upper.floorY + 0.02, z),
        orientationFromNormal(
          edge.normal[0] * 0.4,
          1,
          edge.normal[1] * 0.4,
          random() * Math.PI * 2,
        ),
        kind === "kelp" ? 0.9 + random() * 0.5 : 1.1 + random() * 0.7,
        null,
      );
    }
  }
  // 屋面井口与南缘塌口外侧的屋面殖民:从街面俯冲下来时第一眼看到。
  const roofY = site.shaft.topY;
  const roofSpots = [
    [shaft.minX - 2.6, shaft.minZ - 2.2, "coral"],
    [shaft.maxX + 2.4, shaft.maxZ + 2.6, "coral"],
    [shaft.minX - 3.1, shaft.maxZ + 3.4, "fan"],
    [shaft.maxX + 3.2, shaft.minZ - 3.0, "sponge"],
    [site.secondExit.minX - 3.4, site.secondExit.z - 2.6, "coral"],
    [site.secondExit.maxX + 3.8, site.secondExit.z - 2.2, "fan"],
  ];
  for (const [x, z, kind] of roofSpots) {
    if (!supported(x, roofY, z)) continue;
    if (blockedByKeepOut(zones, x, roofY + 1, z, 0.6)) continue;
    set.add(
      kind,
      new THREE.Vector3(x, roofY - 0.05, z),
      orientationFromNormal(0, 1, 0, random() * Math.PI * 2),
      kind === "coral" ? 1.0 + random() * 0.5 : 0.8 + random() * 0.5,
      null,
    );
  }
}

function planEntranceStair(set, site, heightAt, zones, random) {
  const stair = site.entrance;
  const steps = 9;
  // 台阶通道中心线:护墙附着件只需避让净宽本身,护圈留给通道级复核。
  const axis = [
    { x: stair.top.x, y: stair.top.y, z: stair.top.z },
    { x: stair.bottom.x, y: stair.bottom.y, z: stair.bottom.z },
  ];
  const channelDistance = (x, y, z) => {
    const [a, b] = axis;
    const abx = b.x - a.x,
      aby = b.y - a.y,
      abz = b.z - a.z;
    const length2 = abx * abx + aby * aby + abz * abz;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((x - a.x) * abx + (y - a.y) * aby + (z - a.z) * abz) / length2,
      ),
    );
    return Math.hypot(
      x - (a.x + abx * t),
      y - (a.y + aby * t),
      z - (a.z + abz * t),
    );
  };
  // 台阶两侧护墙内面:海扇与海绵顺坡而下,中央通道按 clearWidth 留空。
  for (const sideSign of [-1, 1]) {
    for (let i = 0; i < steps; i += 1) {
      if (random() < 0.3) continue;
      const t = (i + 0.5) / steps;
      const z = stair.top.z + (stair.bottom.z - stair.top.z) * t;
      const y = stair.top.y + (stair.bottom.y - stair.top.y) * t;
      const x = stair.top.x + sideSign * (stair.clearWidth / 2 - 0.12);
      if (channelDistance(x, y + 0.9, z) < stair.clearWidth / 2 - 0.3) continue;
      // 护墙附着件豁免台阶护圈(护圈为通道净宽而设),其余避让体仍然生效。
      if (blockedByKeepOut(zones, x, y + 1, z, 0, "stair")) continue;
      const pick = random();
      const kind =
        pick < 0.5 ? "fan" : pick < 0.78 ? "wallSponge" : "wallAnemone";
      set.add(
        kind,
        new THREE.Vector3(x, y + 0.7 + random() * 0.8, z),
        orientationFromNormal(-sideSign, 0.35, 0, (random() - 0.5) * 0.6),
        kind === "fan" ? 1.1 + random() * 0.8 : 0.5 + random() * 0.4,
        null,
      );
    }
  }
  // 塌口唇口的门柱外侧海扇,沟槽唇口一丛水叶,共同标记入口。
  const gateY = stair.top.y;
  for (const sideSign of [-1, 1]) {
    const x = stair.top.x + sideSign * 10.15;
    for (let i = 0; i < 2; i += 1) {
      const y = gateY + 4 + i * 7 + random() * 2;
      set.add(
        "fan",
        new THREE.Vector3(x, y, stair.top.z + (random() - 0.5)),
        orientationFromNormal(sideSign, 0.3, 0, (random() - 0.5) * 0.5),
        1.4 + random() * 0.8,
        null,
      );
    }
  }
  const lipX = stair.top.x - 7.4,
    lipZ = stair.top.z + 2.2;
  set.add(
    "kelp",
    new THREE.Vector3(lipX, heightAt(lipX, lipZ) + 0.02, lipZ),
    orientationFromNormal(0, 1, 0, random() * Math.PI * 2),
    1.2,
    null,
  );
  // 沟槽两侧原地面落石间的零星珊瑚,把入口编进海床生态。
  for (const sideSign of [-1, 1]) {
    for (let i = 0; i < 3; i += 1) {
      const x = stair.top.x + sideSign * (11.5 + random() * 4);
      const z = stair.top.z + 2 + random() * 8 * (i % 2 ? 1 : -0.4);
      if (blockedByKeepOut(zones, x, heightAt(x, z) + 1, z, 0.4)) continue;
      set.add(
        random() < 0.6 ? "coral" : "sponge",
        new THREE.Vector3(x, heightAt(x, z) - 0.05, z),
        orientationFromNormal(0, 1, 0, random() * Math.PI * 2),
        0.7 + random() * 0.6,
        null,
      );
    }
  }
}

/** 街区立面:锚点由集成方按城市建筑记录给出(中心、外法线、面宽、基顶标高)。 */
function planStreetFacades(set, facades, heightAt, random) {
  for (const facade of facades ?? []) {
    const normal = new THREE.Vector2(
      facade.normal.x,
      facade.normal.z,
    ).normalize();
    const tangent = new THREE.Vector2(-normal.y, normal.x);
    const width = facade.width,
      baseY = facade.baseY,
      topY = facade.topY;
    const at = (along, y, proud = 0) =>
      new THREE.Vector3(
        facade.center.x + tangent.x * along + normal.x * proud,
        y,
        facade.center.z + tangent.y * along + normal.y * proud,
      );
    // 立面灰缝上的海扇与板状海绵,按开间节奏分布,不盖满整面墙。
    const bays = Math.max(2, Math.round(width / 7.5));
    for (let i = 0; i < bays; i += 1) {
      const along =
        -width / 2 + ((i + 0.5) / bays) * width + (random() - 0.5) * 1.6;
      const y = baseY + 1.6 + random() * Math.max(2, (topY - baseY) * 0.55);
      set.add(
        "fan",
        at(along, y, 0.14),
        orientationFromNormal(normal.x, 0.22, normal.y, (random() - 0.5) * 0.5),
        1.6 + random() * 1.2,
        null,
      );
      if (random() < 0.7)
        set.add(
          random() < 0.55 ? "wallSponge" : "wallAnemone",
          at(along + (random() - 0.5) * 2.4, baseY + 1 + random() * 2.6, 0.12),
          orientationFromNormal(
            normal.x,
            0.08,
            normal.y,
            random() * Math.PI * 2,
          ),
          0.5 + random() * 0.45,
          null,
        );
    }
    // 檐口线下一排水叶,立面顶部读得出殖民轮廓。
    const kelps = Math.max(2, Math.round(width / 9));
    for (let i = 0; i < kelps; i += 1) {
      const along =
        -width / 2 + ((i + 0.5) / kelps) * width + (random() - 0.5) * 2;
      set.add(
        "kelp",
        at(along, topY - 0.4, 0.05),
        orientationFromNormal(normal.x, 0, normal.y, random() * Math.PI * 2),
        1.0 + random() * 0.6,
        null,
      );
    }
    // 墙脚街沿的珊瑚与海绵簇,衔接街面铺装。
    const feet = Math.max(2, Math.round(width / 8));
    for (let i = 0; i < feet; i += 1) {
      const along =
        -width / 2 + ((i + 0.5) / feet) * width + (random() - 0.5) * 2.2;
      const foot = at(along, 0, 1.2 + random() * 1.2);
      foot.y = heightAt(foot.x, foot.z) - 0.05;
      set.add(
        random() < 0.5 ? "coral" : "sponge",
        foot,
        orientationFromNormal(0, 1, 0, random() * Math.PI * 2),
        0.8 + random() * 0.7,
        null,
      );
    }
  }
}

/*********************************************
 * 装配:物种原型 → 实例化 → 空间分块
 *********************************************/

const KIND_BUILDERS = {
  coral: () => [
    branchingCoralGeometry(0),
    branchingCoralGeometry(1),
    branchingCoralGeometry(2),
  ],
  sponge: () => [plateSpongeGeometry(0), plateSpongeGeometry(1)],
  wallSponge: () => [plateSpongeGeometry(2), plateSpongeGeometry(3)],
  fan: () => [marineSeaFanGeometry()],
  anemone: () => [anemoneGeometry(0), anemoneGeometry(1)],
  wallAnemone: () => [anemoneGeometry(2)],
  kelp: () => [kelpTuftGeometry()],
};
const KIND_MATERIAL = {
  coral: "coral",
  sponge: "sponge",
  wallSponge: "sponge",
  fan: "fan",
  anemone: "anemone",
  wallAnemone: "anemone",
  kelp: "kelp",
};
// 每物种实例的色相抖动,避免整片同色塑料感。
const KIND_TINTS = {
  coral: ["#ffad90", "#ffceaa", "#f58379", "#ffd3bc"],
  sponge: ["#d8b96e", "#c9a558", "#bfa06a", "#d2b06a"],
  wallSponge: ["#c7ad6a", "#b89a58"],
  fan: ["#ff9b83", "#e98679", "#dbb4d8", "#f7baa0"],
  anemone: ["#d8a3b4", "#c48ba0", "#b49ac4", "#e0b4a8"],
  wallAnemone: ["#c99aae", "#b48ba4"],
  kelp: ["#5d8a7a", "#4f7a6b", "#6a9484"],
};

/**
 * 按最终原型及完整实例变换拟合实体核心。稀疏枝尖保留视觉细节；胶囊的
 * 上下端（包含端帽半径）与真实顶点范围一致，不能伸出模型形成隐形障碍。
 */
function growthCollider(geometry, matrix, kind) {
  const bounds = new THREE.Box3();
  const point = new THREE.Vector3();
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1)
    bounds.expandByPoint(
      point.fromBufferAttribute(position, i).applyMatrix4(matrix),
    );
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = Math.min(size.x, size.y, size.z) / 2;
  return {
    type: "capsule",
    kind: "marine_growth",
    a: { x: center.x, y: bounds.min.y + radius, z: center.z },
    b: { x: center.x, y: bounds.max.y - radius, z: center.z },
    radius,
    species: kind,
  };
}

/**
 * 创建城市海洋殖民切片。
 * @param {THREE.Object3D} parent 场景父节点(城市根节点)。
 * @param {object} options
 * @param {function} options.heightAt 共享海床高度(参考包 atlantisSeabedHeight)。
 * @param {object} [options.site] 挖掘场地元数据,默认 ATLANTIS_EXCAVATION_SITES[0]。
 * @param {object[]} [options.hostColliders] 厅堂既有碰撞,用于扫墙与避让。
 * @param {object[]} [options.facades] 街区立面锚点(中心/法线/面宽/基顶标高)。
 * @param {number} [options.seed] 布置随机种子,多次构建结果一致。
 * @returns {object} root、colliders、lightSources、landmarks、update、dispose、stats。
 */
export function createAtlantisCityMarine(
  parent,
  { heightAt, site, hostColliders = [], facades = [], seed = 4171 } = {},
) {
  if (!parent?.add || typeof heightAt !== "function")
    throw new Error(
      "Marine colonization requires a parent and height function",
    );
  const SITE = site ?? ATLANTIS_EXCAVATION_SITES[0];
  const root = new THREE.Group();
  root.name = "atlantis_city_marine";
  parent.add(root);
  const owned = new Set(),
    colliders = [],
    landmarks = [],
    lightSources = [];
  const random = seededRandom(seed);
  const zones = keepOuts(SITE);
  const wallBands = scanWallBands(hostColliders, SITE);
  const set = new PlacementSet();

  planLowerHall(set, SITE, wallBands, zones, hostColliders, heightAt, random);
  planColumns(set, SITE, hostColliders, zones, random);
  planShaftRim(set, SITE, zones, random, hostColliders);
  if (SITE.entrance.kind === "collapsed_grand_stair")
    planEntranceStair(set, SITE, heightAt, zones, random);
  planStreetFacades(set, facades, heightAt, random);

  const marineTime = { value: 0 };
  const materials = marineMaterials(marineTime);
  for (const material of Object.values(materials)) owned.add(material);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const perKind = {};
  for (const [kind, list] of set.byKind) {
    const geometries = KIND_BUILDERS[kind]();
    const material = materials[KIND_MATERIAL[kind]];
    // 按原型变体拆分 InstancedMesh,再按空间块拆分供视锥剔除。
    const buckets = geometries.map(() => []);
    list.forEach((item, index) =>
      buckets[index % geometries.length].push(item),
    );
    const sources = [];
    buckets.forEach((bucket, variantIndex) => {
      if (!bucket.length) return;
      const mesh = new THREE.InstancedMesh(
        geometries[variantIndex],
        material,
        bucket.length,
      );
      mesh.name = `marine_${kind}_v${variantIndex}`;
      bucket.forEach((item, i) => {
        dummy.position.copy(item.position);
        dummy.quaternion.copy(item.quaternion);
        dummy.scale.setScalar(item.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        if (item.solid)
          colliders.push(
            growthCollider(geometries[variantIndex], dummy.matrix, kind),
          );
        const tints = KIND_TINTS[kind];
        color
          .set(item.tint ?? tints[(i + variantIndex) % tints.length])
          .multiplyScalar(0.9 + ((i * 37 + variantIndex * 11) % 10) * 0.02);
        mesh.setColorAt(i, color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      sources.push(mesh);
    });
    let clusters = 0;
    for (const source of sources) {
      const group = clusterInstances(source, 34);
      // 分批不继承源名,补回物种名便于调试与取样。
      for (const batch of group.children) batch.name = source.name;
      root.add(group);
      clusters += group.children.length;
      group.traverse((node) => {
        if (node.isInstancedMesh) {
          node.receiveShadow = true;
          owned.add({ dispose: () => node.dispose() });
        }
      });
    }
    perKind[kind] = { instances: list.length, clusters };
  }

  const centerX = (SITE.bounds.minX + SITE.bounds.maxX) / 2,
    centerZ = (SITE.bounds.minZ + SITE.bounds.maxZ) / 2;
  landmarks.push(
    {
      id: "marine_lower_hall_garden",
      position: new THREE.Vector3(
        SITE.turningCircle.x,
        SITE.levels[1].floorY + 3,
        SITE.turningCircle.z,
      ),
    },
    {
      id: "marine_entrance_stair",
      position: new THREE.Vector3(
        SITE.entrance.top.x,
        SITE.entrance.top.y + 4,
        SITE.entrance.top.z,
      ),
    },
  );
  if (facades.length)
    landmarks.push({
      id: "marine_street_facade",
      position: new THREE.Vector3(
        facades[0].center.x,
        facades[0].baseY + 4,
        facades[0].center.z,
      ),
    });

  const triangles = [...set.byKind].reduce((sum, [kind, list]) => {
    const geometries = KIND_BUILDERS[kind]();
    return (
      sum +
      list.reduce(
        (s, _item, index) =>
          s +
          geometries[index % geometries.length].attributes.position.count / 3,
        0,
      )
    );
  }, 0);
  const stats = {
    site: SITE.id,
    instances: set.count(),
    colliders: colliders.length,
    triangles: Math.round(triangles),
    perKind,
    wallBands: wallBands.length,
    facades: facades.length,
  };
  root.userData.marineStats = stats;
  let disposed = false;
  return {
    root,
    colliders,
    lightSources,
    landmarks,
    stats,
    update(time, dt, position, highQuality = true) {
      if (disposed) return;
      marineTime.value = time;
      root.visible =
        !position ||
        Math.hypot(centerX - position.x, centerZ - position.z) <
          (highQuality ? 400 : 330);
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
