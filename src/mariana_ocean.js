import {
  constructionScope,
  finishScenePreparation,
  prepareScene,
} from "./scene_preparation.js";
import { createMarianaLayer, createMarianaSeal } from "./mariana_layers.js";
import { addMarianaMarineSteps } from "./mariana_marine.js";
import { addMarianaPassage } from "./mariana_passages.js";
import { createMarianaCliff, marianaCliffFace } from "./mariana_cliffs.js";
import * as THREE from "three";
import { createBermudaBuilder } from "./bermuda_geometry.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { createMarianaColonies } from "./mariana_colonies.js";
import { createMarianaRefuge } from "./mariana_refuge.js";
import { addMarianaLandmarksSteps } from "./mariana_landmarks.js";
import { terrainMeshHeight } from "./terrain_mesh_height.js";
import { addMarianaOutcrops } from "./mariana_outcrops.js";
import { createMarianaRockSurfaces } from "./mariana_rock_surfaces.js";
import {
  MARIANA_WORLD as W,
  MARIANA_GATES,
  marianaSeabedHeight,
  marianaProgress,
} from "./mariana_config.js";

/** 海沟由最低地面、可穿行台地与可解锁压力帘构成；所有变化由现有主循环推进。 */
export function* createMarianaOceanSteps(parent) {
  const root = new THREE.Group();
  root.name = "ocean_environment";
  parent.add(root);
  const resources = new Set(),
    keep = (r) => (resources.add(r), r),
    colliders = [],
    barriers = [],
    chunks = [],
    lightSources = [],
    seals = [];
  const scope = constructionScope(root, resources);
  try {
    const defeated = new Set();
    let disposed = false,
      progress = marianaProgress(defeated, { x: 0, y: 0, z: 0 });
    const mat = (name, color) => {
      const m = keep(
        new THREE.MeshStandardMaterial({ color, roughness: 0.95 }),
      );
      m.name = name;
      addSurfaceDetail(m, "stone", 0.12);
      return m;
    };
    const basalt = mat("folded_basalt", 0x71828d),
      pale = mat("pelagic_sediment", 0x9caaa0),
      dark = mat("mineral_seams", 0x445565);
    const glow = keep(
      new THREE.MeshStandardMaterial({
        color: 0x91cec3,
        emissive: 0x48cabe,
        emissiveIntensity: 1.3,
        roughness: 0.65,
      }),
    );
    glow.name = "living_photophores";
    function group(name, y) {
      const g = new THREE.Group();
      g.name = name;
      root.add(g);
      chunks.push({ g, y });
      return g;
    }
    let rockIndex = 0;
    function rock(b, m, c, axes, tilt = 0) {
      const geo = new THREE.SphereGeometry(1, 16, 12);
      const vertices = geo.attributes.position;
      for (let j = 0; j < vertices.count; j++) {
        const x = vertices.getX(j),
          y = vertices.getY(j),
          z = vertices.getZ(j);
        const cut =
          0.91 + 0.085 * Math.sin(x * 8 + z * 3) * Math.sin(y * 9 - z * 5);
        vertices.setXYZ(j, x * cut, y * cut, z * cut);
      }
      geo.computeVertexNormals();
      geo.scale(...axes);
      b.add(geo, m, c, [0, tilt, tilt * 0.25]);
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, tilt, tilt * 0.25),
      );
      b.colliders.push({
        type: "ellipsoid",
        id: `trench_strata_${rockIndex++}`,
        x: c[0],
        y: c[1],
        z: c[2],
        axes: new THREE.Vector3(...axes),
        rotation: q,
      });
    }
    const floorGeo = keep(new THREE.PlaneGeometry(700, 1080, 112, 216));
    floorGeo.rotateX(-Math.PI / 2);
    floorGeo.translate(0, 0, -300);
    const fp = floorGeo.attributes.position;
    for (let i = 0; i < fp.count; i++)
      fp.setY(i, marianaSeabedHeight(fp.getX(i), fp.getZ(i)));
    floorGeo.computeVertexNormals();
    const floor = new THREE.Mesh(floorGeo, pale);
    floor.name = "mariana_lowest_ground";
    const lowestGround = terrainMeshHeight(floorGeo);
    root.add(floor);
    yield "floor";
    const cliffMaterial = keep(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.FrontSide,
        roughness: 0.93,
      }),
    );
    const rockSurfaces = keep(createMarianaRockSurfaces());
    root.userData.marianaRockSurfaces = rockSurfaces;
    rockSurfaces.apply(cliffMaterial, "wall");
    void rockSurfaces.prepare();
    for (let section = 0; section < 16; section++) {
      const top = -section * 180,
        bottom = Math.max(-2780, top - 180),
        g = group(`trench_wall_${section}`, (top + bottom) / 2);
      for (const side of [-1, 1]) {
        colliders.push(
          ...createMarianaCliff(g, keep, {
            top,
            bottom,
            side,
            material: cliffMaterial,
            id: `trench_side_${side}_${section}`,
          }),
        );
        yield "cliff";
      }
      colliders.push(
        ...createMarianaCliff(g, keep, {
          top,
          bottom,
          back: true,
          material: cliffMaterial,
          id: `trench_back_${section}`,
        }),
      );
      yield "cliff";
      colliders.push(
        ...createMarianaCliff(g, keep, {
          top,
          bottom,
          front: true,
          material: cliffMaterial,
          id: `trench_front_${section}`,
        }),
      );
      yield "cliff";
    }
    // 第一层的短旁路：主通道清楚，侧面绕岩可躲避猎手。
    for (const [i, c] of [
      [0, [-96, -200, -280]],
      [1, [94, -370, -390]],
      [2, [-95, -890, -340]],
      [3, [95, -1650, -420]],
      [4, [85, -2420, -400]],
    ]) {
      const side = Math.sign(c[0]);
      c[0] = marianaCliffFace(c[2], c[1], false, side) - side * 42;
      const g = group(`trench_spur_${i}`, c[1]),
        b = createBermudaBuilder(g, keep);
      rock(b, basalt, c, [62, 17, 76], i * 0.15);
      for (let k = 0; k < 4; k++)
        rock(
          b,
          k % 2 ? basalt : dark,
          [c[0] + (k - 1.5) * 22, c[1] + 10, c[2] + (k % 2 ? 22 : -25)],
          [24, 8, 42],
          k * 0.12,
        );
      colliders.push(...b.finish());
      if (i >= 2)
        colliders.push(
          ...addMarianaPassage(
            g,
            keep,
            basalt,
            [c[0], c[1] + 10, c[2]],
            `natural_passage_${i}`,
          ),
        );
      yield "spur";
    }
    const time = { value: 0 };
    for (const gate of MARIANA_GATES) {
      const g = group(`terrace_${gate.id}`, -gate.depth);
      colliders.push(
        ...createMarianaLayer(g, keep, {
          gate,
          material: cliffMaterial,
          bounds: W,
        }),
      );
      const seal = createMarianaSeal(g, keep, gate, time);
      barriers.push(seal.barrier);
      seals.push(seal);
      lightSources.push({
        position: new THREE.Vector3(gate.x, -gate.depth + 20, gate.z),
        color: gate.color,
        intensity: 70,
        distance: 180,
      });
      yield "gate";
    }
    yield* addMarianaMarineSteps({ root, keep, group, floor, time });
    colliders.push(...addMarianaOutcrops({ root, keep, group, rockSurfaces }));
    yield "outcrops";
    const rockGeo = keep(new THREE.IcosahedronGeometry(1, 2));
    const rp = rockGeo.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const k =
        1 +
        0.12 *
          Math.sin(rp.getX(i) * 8) *
          Math.cos(rp.getY(i) * 11 + rp.getZ(i) * 5);
      rp.setXYZ(i, rp.getX(i) * k, rp.getY(i) * k, rp.getZ(i) * k);
    }
    rockGeo.computeVertexNormals();
    const colonies = keep(createMarianaColonies()),
      dummy = new THREE.Object3D(),
      nursery = { reef_branch: [], reef_brain: [] };
    root.userData.marianaColonies = colonies;
    for (let i = 0; i < 56; i++) {
      const brain = i % 4 === 3;
      nursery[brain ? "reef_brain" : "reef_branch"].push({
        x: (i % 2 ? 1 : -1) * (32 + (i % 7) * 6),
        // 三个旧落点已落到陡崖折线，向浅滩内退16米保留完整根座。
        z: 112 - Math.floor(i / 2) * 8 + ([50, 52, 54].includes(i) ? 16 : 0),
        originalZ: 112 - Math.floor(i / 2) * 8,
        yaw: i,
        scale: (2.1 + (i % 4) * 0.8) * (brain ? 0.55 : 0.75),
      });
    }
    const shallowSupport = (_row, x, z) => ({
      y: lowestGround(x, z),
      normal: new THREE.Vector3(
        -(lowestGround(x + 0.05, z) - lowestGround(x - 0.05, z)) / 0.1,
        1,
        -(lowestGround(x, z + 0.05) - lowestGround(x, z - 0.05)) / 0.1,
      ).normalize(),
    });
    for (const [kind, rows] of Object.entries(nursery))
      colonies.add(root, kind, rows, shallowSupport);
    for (let n = 0; n < 15; n++) {
      const y = -120 - n * 177,
        g = group(`trench_ecology_${n}`, y),
        rocks = new THREE.InstancedMesh(rockGeo, basalt, 12),
        polyps = new THREE.InstancedMesh(
          keep(new THREE.SphereGeometry(1, 8, 6)),
          glow,
          32,
        );
      g.add(rocks, polyps);
      const supports = [],
        probe = new THREE.Mesh(rockGeo, basalt);
      probe.matrixAutoUpdate = false;
      const ray = new THREE.Raycaster(),
        down = new THREE.Vector3(0, -1, 0);
      function attachment(index, dx = 0, dz = 0) {
        const support = supports[index % supports.length];
        probe.matrix.copy(support.matrix);
        probe.matrixWorld.copy(support.matrix);
        ray.set(
          new THREE.Vector3(support.x + dx, support.y + 25, support.z + dz),
          down,
        );
        const hit = ray.intersectObject(probe, false)[0];
        if (!hit) throw new Error("Missing marine outcrop support");
        return hit.point.addScaledVector(down, 0.12);
      }
      for (let i = 0; i < 12; i++) {
        const z = -270 - Math.floor(i / 2) * 57,
          rootY = y + ((i % 3) - 1) * 13,
          side = i % 2 ? 1 : -1,
          x = marianaCliffFace(z, rootY, false, side) - side * 2,
          sy = 3 + (i % 4);
        dummy.position.set(x, rootY, z);
        dummy.rotation.set(0.1, i * 0.7, 0.2);
        dummy.scale.set(7, sy, 9);
        dummy.updateMatrix();
        rocks.setMatrixAt(i, dummy.matrix);
        supports.push({
          x,
          y: dummy.position.y,
          z,
          matrix: dummy.matrix.clone(),
        });
        colliders.push({
          type: "ellipsoid",
          id: `mariana_outcrop_${n}_${i}`,
          x,
          y: dummy.position.y,
          z,
          axes: new THREE.Vector3(8, sy * 1.13, 10.2),
          rotation: dummy.quaternion.clone(),
        });
      }
      const fanRows = supports.map((s, i) => ({
        x: s.x,
        z: s.z,
        supportIndex: i,
        yaw: i * 0.71,
        scale: 2 + (i % 3),
      }));
      colonies.add(g, "reef_fan", fanRows, (row, x, z) => {
        const s = supports[row.supportIndex];
        probe.matrix.copy(s.matrix);
        probe.matrixWorld.copy(s.matrix);
        ray.set(new THREE.Vector3(x, s.y + 25, z), down);
        const hit = ray.intersectObject(probe, false)[0];
        return (
          hit && {
            y: hit.point.y,
            normal: hit.face.normal
              .clone()
              .transformDirection(probe.matrixWorld),
          }
        );
      });
      for (let i = 0; i < 32; i++) {
        dummy.position.copy(
          attachment(i, Math.sin(i * 2.3) * 3, Math.cos(i * 1.7) * 3),
        );
        dummy.scale.set(0.35, 0.4, 0.35);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        polyps.setMatrixAt(i, dummy.matrix);
      }
      rocks.computeBoundingSphere();
      polyps.computeBoundingSphere();
      lightSources.push({
        position: new THREE.Vector3(n % 2 ? 165 : -165, y + 13, -400),
        color: n < 4 ? 0x7bcbc2 : n < 10 ? 0x5989dd : 0xa389d4,
        intensity: 125,
        distance: 180,
      });
      yield "ecology";
    }
    const sites = yield* addMarianaLandmarksSteps({
      root,
      keep,
      group,
      materials: { basalt, pale, dark, glow },
    });
    colliders.push(...sites.colliders);
    lightSources.push(...sites.lightSources);
    const refuge = createMarianaRefuge(root, {
      keep,
      heightAt: (x, z) => lowestGround(x, z) ?? marianaSeabedHeight(x, z),
    });
    colliders.push(...refuge.colliders);
    lightSources.push(...refuge.lightSources);
    yield "refuge";
    const lamps = Array.from({ length: 3 }, () => {
      const l = new THREE.PointLight(0x84d2ce, 0, 140, 1.25);
      root.add(l);
      return l;
    });
    const waterMat = keep(
      new THREE.MeshStandardMaterial({
        color: 0x285766,
        metalness: 0.15,
        roughness: 0.32,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.67,
      }),
    );
    const water = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(2400, 2400, 100, 100)),
      waterMat,
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 4, -200);
    root.add(water);
    waterMat.onBeforeCompile = (s) => {
      s.uniforms.trenchTime = time;
      s.vertexShader = s.vertexShader
        .replace(
          "#include <beginnormal_vertex>",
          `#include <beginnormal_vertex>
        float a=position.x*.021+position.y*.028-trenchTime*.65;
        float b=position.x*.047-position.y*.018-trenchTime*.87;
        objectNormal=normalize(vec3(-cos(a)*.62*.021-cos(b)*.28*.047,-cos(a)*.62*.028+cos(b)*.28*.018,1.));`,
        )
        .replace(
          "#include <common>",
          "#include <common>\nuniform float trenchTime;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ntransformed.z+=sin(position.x*.021+position.y*.028-trenchTime*.65)*.62+sin(position.x*.047-position.y*.018-trenchTime*.87)*.28;",
        );
    };
    waterMat.customProgramCacheKey = () => "mariana_pacific_swell_v2";
    function reset() {
      defeated.clear();
      progress = marianaProgress(defeated, { x: 0, y: 0, z: 0 });
      barriers.splice(0, barriers.length, ...seals.map((s) => s.barrier));
      for (const s of seals) s.membrane.visible = true;
    }
    return scope.finish({
      root,
      rockyBoundarySides: true,
      colliders,
      navigationColliders: colliders,
      barriers,
      heightAt: (x, z) => lowestGround(x, z) ?? marianaSeabedHeight(x, z),
      landmarks: [
        ...MARIANA_GATES.map((g) => ({
          id: g.id,
          position: new THREE.Vector3(g.x, -g.depth, g.z),
        })),
        ...refuge.landmarks,
        ...sites.landmarks,
      ],
      obstacles: [],
      get progress() {
        return progress;
      },
      updateProgress(player, position, bosses, notify) {
        for (const boss of bosses)
          if (
            boss.enabled &&
            boss.state.defeated &&
            MARIANA_GATES.some((g) => g.id === boss.id)
          )
            defeated.add(boss.id);
        const next = marianaProgress(defeated, position);
        if (next.opened > progress.opened)
          notify("守卫已败 · 压力帘消散，下一水层开启", 5);
        const changed = next.opened !== progress.opened;
        progress = next;
        if (changed)
          barriers.splice(
            0,
            barriers.length,
            ...seals.slice(progress.opened).map((s) => s.barrier),
          );
        for (let i = 0; i < seals.length; i++)
          seals[i].membrane.visible = i >= progress.opened;
        player.expeditionComplete = progress.arrived;
        player.won =
          !player.dead &&
          !player.timedOut &&
          player.length >= 30 &&
          player.bossesDefeated >= 1 &&
          progress.arrived;
      },
      update(
        elapsed,
        position,
        dt = 0,
        highQuality = true,
        cameraPosition = position,
      ) {
        if (disposed) return;
        time.value = elapsed;
        waterMat.opacity = cameraPosition.y > 4 ? 0.91 : 0.58;
        for (const { g, y } of chunks)
          g.visible = Math.abs(position.y - y) < (highQuality ? 430 : 330);
        colonies.update(elapsed, position);
        const nearest = lightSources
          .map((s) => ({ s, d: s.position.distanceToSquared(position) }))
          .sort((a, b) => a.d - b.d);
        for (let i = 0; i < lamps.length; i++) {
          const s = nearest[i].s;
          lamps[i].position.copy(s.position);
          lamps[i].color.set(s.color);
          lamps[i].intensity = s.intensity;
          lamps[i].distance = s.distance;
        }
        refuge.update(elapsed, position);
      },
      reset,
      dispose() {
        if (disposed) return;
        disposed = true;
        root.traverse((n) => {
          if (n.isInstancedMesh) n.dispose();
        });
        root.removeFromParent();
        root.clear();
        for (const r of resources) r.dispose();
        resources.clear();
        colliders.length = barriers.length = 0;
      },
    });
  } finally {
    scope.close();
  }
}

/** 工具沿用同步入口，浏览器使用同一建模顺序的预算分片。 */
export function createMarianaOcean(parent) {
  return finishScenePreparation(createMarianaOceanSteps(parent));
}
export function createMarianaOceanAsync(parent, options) {
  return prepareScene(createMarianaOceanSteps(parent), options);
}
