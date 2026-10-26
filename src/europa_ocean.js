import { acquireEuropaSceneryAsset } from "./europa_scenery_asset.js";
import {
  addEuropaGeologySurface,
  europaWeatheredStone,
} from "./europa_geology_surfaces.js";
import {
  acquireEuropaColony,
  addEuropaColonyLOD,
  updateEuropaColonyLOD,
} from "./europa_colony_asset.js";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  addEuropaColonySurface,
  addPressureIceSurface,
} from "./europa_environment_geometry.js";
import {
  createEuropaResearchWreckSteps,
  EUROPA_WRECK_SITE,
} from "./europa_research_wreck.js";
import { createEuropaGeochemistrySteps } from "./europa_geochemistry.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import {
  finishScenePreparation,
  prepareScene,
  constructionScope,
} from "./scene_preparation.js";
import {
  EUROPA_LAYOUT_WORLD as W,
  EUROPA_LAYOUT_HABITATS as EUROPA_HABITATS,
  europaLayoutSeabedHeight as europaSeabedHeight,
  europaSeabedHeight as worldHeight,
  EUROPA_EXPANSE_SCALE as S,
  europaWorldPoint,
  europaWorldY,
  europaWorldZ,
} from "./europa_config.js";

/** 冰下海洋的同步入口供测试，浏览器入口按真实建模批次让出主线程。 */
export function createEuropaOcean(parent) {
  return finishScenePreparation(createEuropaOceanSteps(parent));
}
export function createEuropaOceanAsync(parent, options) {
  return prepareScene(createEuropaOceanSteps(parent), options);
}
export function* createEuropaOceanSteps(parent) {
  const root = new THREE.Group();
  root.name = "europa_ice_ocean";
  const worldRoot = new THREE.Group();
  worldRoot.name = "europa_expedition";
  parent.add(worldRoot);
  worldRoot.add(root);
  root.scale.setScalar(S);
  root.position.set(0, W.surfaceY * (1 - S), 75 * (1 - S));
  const resources = new Set(),
    scope = constructionScope(worldRoot, resources),
    keep = (r) => (resources.add(r), r);
  const colliders = [],
    chunks = [],
    lamps = [],
    lightSources = [];
  let disposed = false;
  const colonyTime = { value: 0 },
    colonyBatches = [],
    mineralBatches = [],
    lastColonyView = new THREE.Vector3(Infinity, Infinity, Infinity);
  let lastColonyQuality;
  const material = (name, color, emission = 0) => {
    const m = keep(
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.91,
        emissive: color,
        emissiveIntensity: emission,
      }),
    );
    m.name = name;
    addSurfaceDetail(m, "stone", 0.25);
    return m;
  };
  const ice = material("pressure_ice", "#8ea9b1"),
    rock = material("sulfide_strata", "#526676"),
    rust = material("brine_minerals", "#92674e"),
    amber = material("feeding_mat", "#ad9568", 0.22);
  addPressureIceSurface(ice);
  addEuropaGeologySurface(ice, "ice");
  addEuropaGeologySurface(rock, "rock");
  addEuropaGeologySurface(rust, "rock");
  addEuropaColonySurface(amber, colonyTime);
  try {
    // 地板采用较细网格，实际采样与渲染来自同一公式，按条带分片。
    for (let z = W.minZ; z < W.maxZ; z += 95) {
      const size = Math.min(95, W.maxZ - z),
        g = keep(new THREE.PlaneGeometry(600, size, 120, Math.ceil(size / 5)));
      g.rotateX(-Math.PI / 2);
      g.translate(0, 0, z + size / 2);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++)
        p.setY(i, europaSeabedHeight(p.getX(i), p.getZ(i)));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, rock);
      m.name = "europa_lowest_ground";
      root.add(m);
      yield "floor-strip";
    }
    // 巨型冰层的下表面与实体底面一致；压褶另有对应椭球碰撞。
    const roof = new THREE.Mesh(
      keep(new THREE.BoxGeometry(660, 30, 1200)),
      ice,
    );
    roof.position.set(0, W.surfaceY + 15, -430);
    roof.name = "europa_solid_ice_roof";
    root.add(roof);
    colliders.push({
      type: "box",
      id: "europa_ice_roof",
      x: 0,
      y: W.surfaceY + 15,
      z: -430,
      halfSize: new THREE.Vector3(330, 15, 600),
    });
    const unit = keep(europaWeatheredStone());
    let solidId = 0;
    function stone(group, position, axes, mat, rotation = 0, source = unit) {
      // 扩建船体的完整足迹留空；侧台与碎岩移到外缘，渲染和实体保持一致。
      const extentX =
        Math.abs(Math.cos(rotation)) * axes[0] +
        Math.abs(Math.sin(rotation)) * axes[2];
      const extentZ =
        Math.abs(Math.sin(rotation)) * axes[0] +
        Math.abs(Math.cos(rotation)) * axes[2];
      if (
        position[0] + extentX > -120 &&
        position[0] - extentX < 240 &&
        position[2] + extentZ > -550 &&
        position[2] - extentZ < -390 &&
        position[1] + axes[1] > -455 &&
        position[1] - axes[1] < -355
      ) {
        // 向船首尾外侧迁移，不把岩台堆到原来的南北拱廊航路上。
        const x = position[0] < 60 ? -123 - extentX : 243 + extentX;
        position = [
          x,
          position[1] +
            europaSeabedHeight(x, position[2]) -
            europaSeabedHeight(position[0], position[2]),
          position[2],
        ];
      }
      const g = source.clone();
      g.scale(...axes);
      g.rotateY(rotation);
      g.translate(...position);
      group.get(mat)?.push(g) ?? group.set(mat, [g]);
      colliders.push({
        type: "ellipsoid",
        id: `europa_fold_${solidId++}`,
        x: position[0],
        y: position[1],
        z: position[2],
        axes: new THREE.Vector3(...axes),
        rotation: new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          rotation,
        ),
      });
    }
    function finish(group, name, center) {
      const chunk = new THREE.Group();
      chunk.name = name;
      root.add(chunk);
      for (const [mat, list] of group) {
        const merged = keep(mergeGeometries(list));
        list.forEach((g) => g.dispose());
        chunk.add(new THREE.Mesh(merged, mat));
      }
      chunks.push({ root: chunk, center: new THREE.Vector3(...center) });
    }
    for (let section = 0; section < 12; section++) {
      const z = 100 - section * 95,
        y = europaSeabedHeight(0, z),
        batch = new Map();
      // 远处边界是连续上升的岩冰断壁，内侧净空保持至少四百米。
      for (const side of [-1, 1]) {
        stone(
          batch,
          [side * 304, (W.surfaceY + y) * 0.5, z],
          [22, (W.surfaceY - y) * 0.5 + 12, 57],
          ice,
          side * 0.12,
        );
        for (let i = 0; i < 3; i++)
          stone(
            batch,
            [side * (246 + i * 13), y + 12 + i * 4, z - 20 + i * 20],
            [12, 17 + i * 2, 26],
            i % 2 ? rust : rock,
            side * 0.4,
          );
      }
      // 屋顶压褶仅沿侧缘悬下，不占据育幼湾和主下降路线。
      for (const side of [-1, 1])
        stone(
          batch,
          [side * (165 + (section % 3) * 14), 9, z],
          [19, 16 + (section % 4) * 3, 75],
          ice,
          side * 0.3,
        );
      finish(batch, `europa_wall_chunk_${section}`, [0, (y + 4) * 0.5, z]);
      yield "ice-folds";
    }

    // 层状侧台沿既有岩壁展开，中央下降轴及三个领主的巡游水体保持开放。
    for (let band = 0; band < 5; band++) {
      const z = -175 - band * 145,
        batch = new Map();
      for (const side of [-1, 1])
        for (let level = 0; level < 3; level++) {
          const x = side * (247 - level * 12),
            pz = z + side * 18 + level * 6,
            y = europaSeabedHeight(x, pz);
          stone(
            batch,
            [x, y + level * 12 + 6, pz],
            [28 + level * 5, 7, 40 - level * 5],
            level === 1 ? rust : rock,
            side * 0.2,
          );
        }
      finish(batch, `europa_mineral_terrace_${band}`, [
        0,
        europaSeabedHeight(0, z) + 20,
        z,
      ]);
      yield "mineral-terrace";
    }

    // 拱廊避开主下降轴，侧环拥有七十米以上的真实洞口。
    for (const [x, z, h] of [
      [-115, -170, 75],
      [115, -390, 135],
      [-110, -595, 205],
    ]) {
      const floor = europaSeabedHeight(x, z);
      // 连续岩弧有自然起伏，分段碰撞沿同一中心线排列。
      const arc = keep(new THREE.TorusGeometry(85, 13, 12, 60, Math.PI));
      arc.scale(1, h / 85, 2);
      const p = arc.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const a = Math.atan2((p.getY(i) * 85) / h, p.getX(i)),
          variation = 1 + Math.sin(a * 7) * 0.012;
        p.setXYZ(i, p.getX(i) * variation, p.getY(i) * variation, p.getZ(i));
      }
      arc.translate(x, floor, z);
      arc.computeVertexNormals();
      const arch = new THREE.Mesh(arc, rock);
      arch.name = `europa_continuous_arch_${z}`;
      root.add(arch);
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI;
        colliders.push({
          type: "ellipsoid",
          id: `europa_arch_${z}_${i}`,
          x: x + Math.cos(a) * 85,
          y: floor + Math.sin(a) * h,
          z,
          axes: new THREE.Vector3(13, (13 * h) / 85, 26),
        });
      }
      yield "arch";
    }
    // 花园岩台从侧壁长出，悬生器官与岩台底面相接，留出主航路。
    const shelves = new Map();
    for (const [x, y, z] of [
      [226, -212, -355],
      [-226, -180, -320],
      [224, -265, -440],
    ])
      stone(shelves, [x, y, z], [43, 11, 48], rock);
    finish(shelves, "europa_garden_ledges", [0, -220, -380]);
    yield "garden-ledges";
    // 三座非对称岩根形成终点盆地边界，中央仍是三百米宽的开阔战场。
    const buttresses = new Map();
    for (const [x, z, h] of [
      [-220, -795, 86],
      [222, -780, 115],
      [0, -940, 74],
    ]) {
      const floor = europaSeabedHeight(x, z);
      stone(buttresses, [x, floor + h * 0.5, z], [22, h * 0.5, 36], rock);
      stone(
        buttresses,
        [x + 8, floor + h * 0.6, z + 12],
        [12, h * 0.3, 18],
        rust,
      );
    }
    finish(buttresses, "europa_weaver_root_buttresses", [0, -760, -820]);
    yield "hollow-buttresses";
    const siphonAsset = acquireEuropaColony("siphon"),
      fanAsset = acquireEuropaColony("fan");
    resources.add({ dispose: siphonAsset.release });
    resources.add({ dispose: fanAsset.release });
    const stem = siphonAsset.geometry,
      fan = fanAsset.geometry;
    const flesh = siphonAsset.material(colonyTime, resources),
      fanSkin = fanAsset.material(colonyTime, resources);
    root.userData.prepareMaterials = (options) =>
      Promise.all([siphonAsset.prepare(options), fanAsset.prepare(options)]);
    worldRoot.userData.prepareMaterials = root.userData.prepareMaterials;
    void root.userData.prepareMaterials();
    const hanging = new THREE.InstancedMesh(stem, flesh, 24);
    hanging.name = "europa_suspended_siphons";
    const hangingDummy = new THREE.Object3D();
    for (let i = 0; i < 24; i++) {
      const side = i % 2 ? 1 : -1,
        z =
          side > 0
            ? -338 - Math.floor(i / 2) * 2
            : -303 - Math.floor(i / 2) * 2;
      hangingDummy.position.set(
        side * (219 + (i % 3) * 3),
        side > 0 ? -222 : -190,
        z,
      );
      hangingDummy.rotation.set(Math.PI, i * 0.7, 0);
      hangingDummy.scale.setScalar(1.1 + (i % 3) * 0.2);
      hangingDummy.updateMatrix();
      hanging.setMatrixAt(i, hangingDummy.matrix);
    }
    hanging.computeBoundingSphere();
    root.add(hanging);
    addEuropaColonyLOD(hanging, siphonAsset, colonyBatches);
    const egg = keep(new THREE.SphereGeometry(1, 10, 8));
    const dummy = new THREE.Object3D();
    for (let zone = 0; zone < 5; zone++) {
      const habitat = EUROPA_HABITATS[zone],
        batch = new THREE.Group();
      batch.name = `europa_colonies_${habitat.id}`;
      root.add(batch);
      const count = zone === 0 ? 45 : 65;
      const trunks = new THREE.InstancedMesh(stem, flesh, count),
        eggs = new THREE.InstancedMesh(egg, amber, 24),
        fans = new THREE.InstancedMesh(fan, fanSkin, count);
      trunks.name = "europa_rooted_siphons_hf";
      fans.name = "europa_rooted_fans_hf";
      batch.add(trunks, eggs, fans);
      for (let i = 0; i < count; i++) {
        const a = i * 2.399,
          r = 35 + (i % 9) * 11,
          candidateX = habitat.anchor[0] + Math.cos(a) * r,
          candidateZ = habitat.anchor[2] + Math.sin(a) * r;
        let x = candidateX,
          z = candidateZ;
        // 放大的船体与散热翼留出完整植株足迹；只迁移装饰，不减少生态数量。
        const site = { ...EUROPA_WRECK_SITE, x: 145, z: -470 },
          halfX = site.gallery.length / 2 + 18,
          halfZ = site.gallery.width / 2 + 35,
          dx = x - site.x,
          dz = z - site.z;
        if (Math.abs(dx) < halfX && Math.abs(dz) < halfZ) {
          if (halfX - Math.abs(dx) < halfZ - Math.abs(dz))
            x = site.x + (dx < 0 ? -halfX : halfX);
          else z = site.z + (dz < 0 ? -halfZ : halfZ);
        }
        const scale = 0.6 + (i % 7) * 0.15,
          y = europaSeabedHeight(x, z);
        dummy.position.set(x, y - 0.25, z);
        dummy.rotation.set(0.1 * Math.sin(i), a, 0.13 * Math.cos(i));
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);
        dummy.position.set(x + 2.3 * scale, y, z);
        dummy.rotation.set(0, a, 0);
        dummy.scale.setScalar(scale * (zone === 2 ? 1.4 : 0.8));
        dummy.updateMatrix();
        fans.setMatrixAt(i, dummy.matrix);
        if (i < 24) {
          dummy.position.set(x + 2, y + 1.1, z + 2);
          dummy.rotation.set(0, a, 0);
          dummy.scale.set(1.7, 0.9, 1.2);
          dummy.updateMatrix();
          eggs.setMatrixAt(i, dummy.matrix);
        }
      }
      for (const m of [trunks, eggs, fans]) {
        m.instanceMatrix.needsUpdate = true;
        m.computeBoundingSphere();
      }
      addEuropaColonyLOD(trunks, siphonAsset, colonyBatches);
      addEuropaColonyLOD(fans, fanAsset, colonyBatches);
      chunks.push({
        root: batch,
        center: new THREE.Vector3(...habitat.anchor),
      });
      lightSources.push({
        position: new THREE.Vector3(...habitat.anchor).add(
          new THREE.Vector3(0, 5, 0),
        ),
        color: zone % 2 ? 0xcaa06c : 0x7198ab,
        intensity: 65,
        distance: 70,
      });
      yield "colonies";
    }
    // 热泉烟囱以不同高度叠层，实体与形体保持一致；没有隐形灼伤。
    const ventAsset = acquireEuropaSceneryAsset("vent");
    keep({ dispose: ventAsset.release });
    const vents = new THREE.InstancedMesh(
      ventAsset.geometry,
      ventAsset.material,
      16,
    );
    vents.name = "europa_mineral_seep_towers_hf";
    root.add(vents);
    const plumePositions = [],
      plumePhases = [],
      ventP = ventAsset.geometry.attributes.position;
    for (let i = 0; i < 16; i++) {
      const x = -100 + Math.cos(i * 2.399) * (70 + (i % 3) * 15),
        sourceZ = -590 + Math.sin(i * 2.399) * (60 + (i % 4) * 10),
        // 船体向西扩建后，烟囱和同源碰撞带一起退出整个承压舱足迹。
        z = x > -145 && sourceZ > -565 ? -565 : sourceZ,
        h = 23 + (i % 5) * 5;
      // 最低裙边的整个足迹埋入斜坡，避免只贴中心而让矿塔悬空。
      let supportedY = Infinity;
      const contact = new THREE.Vector3(),
        yaw = i * 0.7;
      for (let v = 0; v < ventP.count; v++) {
        if (ventP.getY(v) > -0.36) continue;
        contact
          .fromBufferAttribute(ventP, v)
          .multiplyScalar(h)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        supportedY = Math.min(
          supportedY,
          europaSeabedHeight(x + contact.x, z + contact.z) - contact.y,
        );
      }
      dummy.position.set(x, supportedY - 0.8, z);
      dummy.rotation.set(0, i * 0.7, 0);
      dummy.scale.setScalar(h);
      dummy.updateMatrix();
      vents.setMatrixAt(i, dummy.matrix);
      // 分层包络沿真实矿塔收窄，裂缝和突出顶端不使用整根宽圆柱挡路。
      const v = new THREE.Vector3();
      for (let band = 0; band < 6; band++) {
        const low = -0.5 + band / 6,
          high = low + 1 / 6,
          box = new THREE.Box3();
        for (let t = 0; t < ventAsset.geometry.index.count; t += 3) {
          const ids = [0, 1, 2].map((j) =>
            ventAsset.geometry.index.getX(t + j),
          );
          if (
            Math.min(...ids.map((n) => ventP.getY(n))) > high ||
            Math.max(...ids.map((n) => ventP.getY(n))) < low
          )
            continue;
          for (const id of ids) {
            v.fromBufferAttribute(ventP, id);
            v.y = Math.max(low, Math.min(high, v.y));
            box.expandByPoint(v);
          }
        }
        if (box.isEmpty()) continue;
        const c = box.getCenter(new THREE.Vector3()).applyMatrix4(dummy.matrix),
          half = box.getSize(new THREE.Vector3()).multiplyScalar(h * 0.5);
        colliders.push({
          type: "box",
          id: `europa_seep_${i}_${band}`,
          x: c.x,
          y: c.y,
          z: c.z,
          halfSize: half,
          rotation: dummy.quaternion.clone(),
        });
      }
      for (let n = 0; n < 16; n++) {
        plumePositions.push(x, supportedY + h * 0.5 - 0.8, z);
        plumePhases.push(n / 16, i * 0.51);
      }
    }
    vents.computeBoundingSphere();
    addEuropaColonyLOD(vents, ventAsset, mineralBatches);
    const prepareColonies = worldRoot.userData.prepareMaterials;
    worldRoot.userData.prepareMaterials = (options) =>
      Promise.all([prepareColonies(options), ventAsset.prepare(options)]);
    void ventAsset.prepare();
    const plumeGeo = keep(new THREE.BufferGeometry());
    plumeGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(plumePositions, 3),
    );
    plumeGeo.setAttribute(
      "plumePhase",
      new THREE.Float32BufferAttribute(plumePhases, 2),
    );
    const plumeMat = keep(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { europaTime: colonyTime },
        vertexShader: `uniform float europaTime; attribute vec2 plumePhase; varying float life;
        void main(){life=fract(plumePhase.x+europaTime*.022);vec3 p=position;
          p.y+=life*32.0;p.x+=sin(plumePhase.y+life*8.0)*life*7.0;p.z+=cos(plumePhase.y+life*6.0)*life*7.0;
          vec4 v=modelViewMatrix*vec4(p,1.0);gl_PointSize=clamp(280.0/max(8.0,-v.z),1.0,12.0);gl_Position=projectionMatrix*v;}`,
        fragmentShader: `varying float life;void main(){float a=(1.0-smoothstep(.1,.5,length(gl_PointCoord-.5)))*(1.0-life)*.10;
        gl_FragColor=vec4(.32,.45,.48,a);
#include <tonemapping_fragment>
#include <colorspace_fragment>}`,
      }),
    );
    const plumes = new THREE.Points(plumeGeo, plumeMat);
    plumes.name = "europa_thermal_plumes";
    plumes.frustumCulled = false;
    root.add(plumes);

    yield "chimneys";
    // 仅地质体随扩展缩放；将碰撞转为世界坐标，动物、群落和船舱仍保持实际体积。
    for (const c of colliders) {
      if (c.a) {
        c.a.fromArray(europaWorldPoint(c.a.toArray()));
        c.b.fromArray(europaWorldPoint(c.b.toArray()));
        c.radius *= S;
      } else {
        [c.x, c.y, c.z] = europaWorldPoint([c.x, c.y, c.z]);
        c.axes?.multiplyScalar(S);
        c.halfSize?.multiplyScalar(S);
      }
    }
    for (const c of chunks)
      c.center.fromArray(europaWorldPoint(c.center.toArray()));
    for (const l of lightSources)
      l.position.fromArray(europaWorldPoint(l.position.toArray()));
    // 每株的形体尺寸保留，扩大的是根系分布与地貌空间。
    for (const b of colonyBatches) {
      for (let i = 0; i < b.count; i++) {
        b.matrix.fromArray(b.matrices, i * 16);
        b.matrix.scale(new THREE.Vector3(1 / S, 1 / S, 1 / S));
        b.matrix.toArray(b.matrices, i * 16);
        b.mesh.setMatrixAt(i, b.matrix);
      }
      b.mesh.computeBoundingSphere();
      b.far.boundingSphere = b.mesh.boundingSphere.clone();
    }
    const wreck = yield* createEuropaResearchWreckSteps(worldRoot, {
      heightAt: worldHeight,
      keep,
      time: colonyTime,
    });
    const prepareTerrain = worldRoot.userData.prepareMaterials;
    worldRoot.userData.prepareMaterials = (options) =>
      Promise.all([prepareTerrain(options), wreck.prepareMaterials?.(options)]);
    colliders.push(...wreck.colliders);
    lightSources.push(...wreck.lightSources);
    chunks.push({ root: wreck.root, center: wreck.landmark.position });
    const minerals = yield* createEuropaGeochemistrySteps(worldRoot, {
      heightAt: worldHeight,
      keep,
      time: colonyTime,
    });
    colliders.push(...minerals.colliders);
    lightSources.push(...minerals.lightSources);
    chunks.push(...minerals.chunks);
    for (let i = 0; i < 3; i++) {
      const lamp = new THREE.PointLight(0x86bbc0, 0, 70, 2);
      lamps.push(lamp);
      worldRoot.add(lamp);
    }
    worldRoot.updateMatrixWorld(true);
    const result = {
      root: worldRoot,
      colonyBatches,
      mineralBatches,
      colliders,
      navigationColliders: colliders,
      barriers: [],
      obstacles: [],
      heightAt: worldHeight,
      landmarks: EUROPA_HABITATS.map((h) => ({
        name: h.name,
        position: new THREE.Vector3(...europaWorldPoint(h.anchor)),
      })).concat([wreck.landmark, minerals.landmark]),
      researchWreck: wreck,
      mineralHabitats: minerals.clusters,
      lightSources,
      update(time, position, dt = 0, highQuality = true) {
        if (disposed) return;
        colonyTime.value = time;
        if (
          lastColonyView.distanceToSquared(position) > 64 ||
          lastColonyQuality !== highQuality
        ) {
          updateEuropaColonyLOD(colonyBatches, position, highQuality);
          updateEuropaColonyLOD(
            mineralBatches,
            position,
            highQuality,
            highQuality ? 170 : 125,
          );
          lastColonyView.copy(position);
          lastColonyQuality = highQuality;
        }
        for (const c of chunks)
          c.root.visible =
            c.center.distanceTo(position) < (highQuality ? 650 : 510);
        const nearest = lightSources
          .slice()
          .sort(
            (a, b) =>
              a.position.distanceToSquared(position) -
              b.position.distanceToSquared(position),
          );
        lamps.forEach((lamp, i) => {
          const a = nearest[i];
          // 固定光源池的着色器数量；只切强度，避免接近舱室时同步编译整批材质。
          lamp.intensity = 0;
          if (a && a.position.distanceTo(position) < 100) {
            lamp.position.copy(a.position);
            lamp.color.set(a.color);
            lamp.intensity = a.intensity;
          }
        });
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        worldRoot.removeFromParent();
        worldRoot.traverse((n) => {
          if (n.isInstancedMesh) n.dispose();
        });
        for (const r of resources) r.dispose();
        resources.clear();
        colliders.length = 0;
        worldRoot.clear();
      },
    };
    return scope.finish(result);
  } finally {
    scope.close();
  }
}
