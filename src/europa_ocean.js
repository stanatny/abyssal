import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  createSiphonColonyGeometry,
  createFanColonyGeometry,
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
  EUROPA_WORLD as W,
  EUROPA_HABITATS,
  europaSeabedHeight,
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
  parent.add(root);
  const resources = new Set(),
    scope = constructionScope(root, resources),
    keep = (r) => (resources.add(r), r);
  const colliders = [],
    chunks = [],
    lamps = [],
    lightSources = [];
  let disposed = false;
  const colonyTime = { value: 0 };
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
    flesh = material("rooted_siphon_skin", "#829c91"),
    amber = material("feeding_mat", "#ad9568", 0.22),
    violet = material("recessed_living_organs", "#887a9d", 0.25);
  addPressureIceSurface(ice);
  addEuropaColonySurface(flesh, colonyTime, true);
  addEuropaColonySurface(amber, colonyTime);
  addEuropaColonySurface(violet, colonyTime);
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
    const unit = keep(new THREE.SphereGeometry(1, 16, 12));
    let solidId = 0;
    function stone(group, position, axes, mat, rotation = 0, source = unit) {
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
    const stem = keep(createSiphonColonyGeometry());
    const fan = keep(createFanColonyGeometry());
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
    const crown = keep(
      new THREE.TorusGeometry(1.3, 0.24, 6, 12, Math.PI * 1.7),
    );
    const egg = keep(new THREE.SphereGeometry(1, 10, 8));
    const dummy = new THREE.Object3D();
    for (let zone = 0; zone < 5; zone++) {
      const habitat = EUROPA_HABITATS[zone],
        batch = new THREE.Group();
      batch.name = `europa_colonies_${habitat.id}`;
      root.add(batch);
      const count = zone === 0 ? 45 : 65;
      const trunks = new THREE.InstancedMesh(stem, flesh, count),
        rings = new THREE.InstancedMesh(
          crown,
          zone % 2 ? amber : violet,
          count,
        ),
        eggs = new THREE.InstancedMesh(egg, amber, 24),
        fans = new THREE.InstancedMesh(fan, violet, count);
      batch.add(trunks, rings, eggs, fans);
      for (let i = 0; i < count; i++) {
        const a = i * 2.399,
          r = 35 + (i % 9) * 11,
          candidateX = habitat.anchor[0] + Math.cos(a) * r,
          candidateZ = habitat.anchor[2] + Math.sin(a) * r;
        let x = candidateX,
          z = candidateZ;
        // 放大的船体与散热翼留出完整植株足迹；只迁移装饰，不减少生态数量。
        const site = EUROPA_WRECK_SITE,
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
        dummy.position.y = y + 9 * scale;
        dummy.rotation.x = Math.PI / 2;
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        rings.setMatrixAt(i, dummy.matrix);
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
      for (const m of [trunks, rings, eggs, fans]) {
        m.instanceMatrix.needsUpdate = true;
        m.computeBoundingSphere();
      }
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
    const vents = new Map(),
      ventLip = keep(new THREE.TorusGeometry(4.15, 0.45, 8, 24));
    const ventStone = keep(unit.clone()),
      vp = ventStone.attributes.position;
    // 向原实体内部雕刻矿壳断面，底端仍准确落在海床上。
    for (let v = 0; v < vp.count; v++) {
      const factor =
        0.84 +
        0.16 *
          Math.abs(
            Math.sin(vp.getY(v) * 17 + vp.getX(v) * 13 + vp.getZ(v) * 11),
          );
      vp.setXYZ(v, vp.getX(v) * factor, vp.getY(v), vp.getZ(v) * factor);
    }
    ventStone.computeVertexNormals();
    for (let i = 0; i < 16; i++) {
      const x = -100 + Math.cos(i * 2.399) * (70 + (i % 3) * 15),
        z = -590 + Math.sin(i * 2.399) * (60 + (i % 4) * 10),
        y = europaSeabedHeight(x, z),
        h = 12 + (i % 5) * 6;
      stone(
        vents,
        [x, y + h * 0.5, z],
        [5 + (i % 3), h * 0.5, 5 + (i % 2)],
        rock,
        i * 0.7,
        ventStone,
      );
      stone(vents, [x, y + h, z], [5.5, 1.4, 5.5], rust, 0, ventStone);
      // 泉口唇有不规则侵蚀边缘，避免整齐金属箍式的工业轮廓。
      const lip = ventLip.clone();
      lip.rotateX(Math.PI / 2);
      const lp = lip.attributes.position;
      for (let v = 0; v < lp.count; v++) {
        const angle = Math.atan2(lp.getZ(v), lp.getX(v)),
          factor = 0.88 + 0.12 * Math.sin(angle * 7 + i);
        lp.setXYZ(
          v,
          lp.getX(v) * factor,
          lp.getY(v) + Math.sin(angle * 5 + i) * 0.27,
          lp.getZ(v) * factor,
        );
      }
      lip.computeVertexNormals();
      lip.translate(x, y + h + 0.65, z);
      vents.get(rust).push(lip);
    }
    finish(vents, "europa_thermal_chimneys", [-100, -570, -590]);
    const plumePositions = [],
      plumePhases = [];
    for (let i = 0; i < 16; i++) {
      const x = -100 + Math.cos(i * 2.399) * (70 + (i % 3) * 15),
        z = -590 + Math.sin(i * 2.399) * (60 + (i % 4) * 10),
        y = europaSeabedHeight(x, z) + 12 + (i % 5) * 6;
      for (let n = 0; n < 16; n++) {
        plumePositions.push(x, y, z);
        plumePhases.push(n / 16, i * 0.51);
      }
    }
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
        void main(){life=fract(plumePhase.x+europaTime*.035);vec3 p=position;
          p.y+=life*45.0;p.x+=sin(plumePhase.y+life*8.0)*life*7.0;p.z+=cos(plumePhase.y+life*6.0)*life*7.0;
          vec4 v=modelViewMatrix*vec4(p,1.0);gl_PointSize=clamp(280.0/max(8.0,-v.z),1.0,12.0);gl_Position=projectionMatrix*v;}`,
        fragmentShader: `varying float life;void main(){float a=(1.0-smoothstep(.1,.5,length(gl_PointCoord-.5)))*(1.0-life)*.13;
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
    const wreck = yield* createEuropaResearchWreckSteps(root, {
      heightAt: europaSeabedHeight,
      keep,
      time: colonyTime,
    });
    colliders.push(...wreck.colliders);
    lightSources.push(...wreck.lightSources);
    chunks.push({ root: wreck.root, center: wreck.landmark.position });
    const minerals = yield* createEuropaGeochemistrySteps(root, {
      heightAt: europaSeabedHeight,
      keep,
      time: colonyTime,
    });
    colliders.push(...minerals.colliders);
    lightSources.push(...minerals.lightSources);
    chunks.push(...minerals.chunks);
    for (let i = 0; i < 3; i++) {
      const lamp = new THREE.PointLight(0x86bbc0, 0, 70, 2);
      lamps.push(lamp);
      root.add(lamp);
    }
    const result = {
      root,
      colliders,
      navigationColliders: colliders,
      barriers: [],
      obstacles: [],
      heightAt: europaSeabedHeight,
      landmarks: EUROPA_HABITATS.map((h) => ({
        name: h.name,
        position: new THREE.Vector3(...h.anchor),
      })).concat([wreck.landmark, minerals.landmark]),
      researchWreck: wreck,
      mineralHabitats: minerals.clusters,
      lightSources,
      update(time, position, dt = 0, highQuality = true) {
        if (disposed) return;
        colonyTime.value = time;
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
          lamp.visible = !!a && a.position.distanceTo(position) < 100;
          if (lamp.visible) {
            lamp.position.copy(a.position);
            lamp.color.set(a.color);
            lamp.intensity = a.intensity;
          }
        });
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        root.removeFromParent();
        root.traverse((n) => {
          if (n.isInstancedMesh) n.dispose();
        });
        for (const r of resources) r.dispose();
        resources.clear();
        colliders.length = 0;
        root.clear();
      },
    };
    return scope.finish(result);
  } finally {
    scope.close();
  }
}
