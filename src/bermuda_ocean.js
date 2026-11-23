import * as THREE from "three";
import { createTerrainSurface } from "./terrain_surface.js";
import { createBermudaBiomes } from "./bermuda_biomes.js";
import { createBermudaOuterBiomes } from "./bermuda_outer_biomes.js";
import { createBermudaSleepingTitan } from "./bermuda_sleeping_titan.js";
import { createBermudaTitanQuest } from "./bermuda_titan_quest.js";
import { createBermudaTitanHazardSites } from "./bermuda_titan_hazard_sites.js";
import { createBermudaLairPursuer } from "./bermuda_lair_pursuer.js";
import { createBermudaTitanLairLighting } from "./bermuda_titan_lair_lighting.js";
import { resolveCreatureMotion } from "./navigation.js";
import {
  BERMUDA_TITAN_LAYOUT,
  BERMUDA_TITAN_NAVIGATION,
} from "./bermuda_cave_config.js";
import { createBermudaCaves } from "./bermuda_caves.js";
import { createStormWater, stormWaveHeight } from "./bermuda_water.js";
import { BERMUDA_WORLD as WORLD } from "./bermuda_config.js";
import { bermudaSeabedHeight } from "./bermuda_terrain.js";
import { createBermudaTerrainMesh } from "./bermuda_terrain_mesh.js";
import { createBermudaWreck } from "./bermuda_wreck.js";
import { createBermudaWeather } from "./bermuda_weather.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { createBermudaGeology } from "./bermuda_geology.js";
import { createBermudaColonies } from "./bermuda_colonies.js";

/** 风暴海域独立海床、育幼礁与可进入的邮轮沉船。 */
export function createBermudaOcean(parent, options = {}) {
  const root = new THREE.Group();
  root.name = "ocean_environment";
  parent.add(root);
  const resources = new Set(),
    keep = (r) => (resources.add(r), r),
    time = { value: 0 };
  let disposed = false;
  const g = keep(createBermudaTerrainMesh());
  const p = g.attributes.position,
    colors = new Float32Array(p.count * 3),
    c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      y = bermudaSeabedHeight(x, z);
    p.setY(i, y);
    c.set(z > -160 ? "#778c87" : "#33434a").multiplyScalar(
      0.9 + 0.09 * Math.sin(x * 0.18 + z * 0.21),
    );
    c.toArray(colors, i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const sand = keep(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 }),
  );
  addSurfaceDetail(sand, "stone", 0.65);
  const floor = new THREE.Mesh(g, sand);
  floor.userData.terrainContact = true;
  floor.name = "bermuda_eroded_seabed";
  root.add(floor);
  const seabedContactSurface = keep(
    createTerrainSurface(root, { fallback: bermudaSeabedHeight }),
  );
  let titan = null;
  const contactSurface = (x, z) =>
    Math.max(
      seabedContactSurface(x, z),
      titan?.floorSurface?.(x, z) ?? -Infinity,
    );
  contactSurface.supportHeight = (x, z, radius) =>
    Math.max(
      seabedContactSurface.supportHeight(x, z, radius),
      titan?.floorSurface?.supportHeight?.(x, z, radius) ?? -Infinity,
    );
  // 组合地形仍公开原海床索引的生命周期统计，资源所有权与销毁路径保持原样。
  Object.defineProperty(contactSurface, "stats", {
    get: () => seabedContactSurface.stats,
  });
  const { material: waterMat } = createStormWater(root, keep, time);
  const shelfArt = createBermudaGeology(root, {
    heightAt: bermudaSeabedHeight,
    shelf: true,
  });
  root.userData.shelfArt = shelfArt;
  const colliders = [...shelfArt.colliders];
  const nurseryArt = createBermudaColonies(root, {
    heightAt: contactSurface,
    nursery: true,
  });
  root.userData.nurseryArt = nurseryArt;
  const wreck = createBermudaWreck(root, { heightAt: bermudaSeabedHeight });
  colliders.push(...wreck.colliders);
  const biomes = createBermudaBiomes(root, {
    heightAt: bermudaSeabedHeight,
    colonyHeightAt: contactSurface,
  });
  colliders.push(...biomes.colliders);
  const outerBiomes = createBermudaOuterBiomes(root, {
    heightAt: contactSurface,
  });
  root.userData.outerBiomes = outerBiomes;
  colliders.push(...outerBiomes.colliders);
  const caves = createBermudaCaves(root, { heightAt: contactSurface });
  root.userData.deepCaves = caves;
  // 三角岩壳可能超过浏览器的函数参数上限，逐项追加仍保留原顺序与实体身份。
  for (const collider of caves.colliders) colliders.push(collider);
  titan = createBermudaSleepingTitan(root, { heightAt: seabedContactSurface });
  for (const collider of titan.colliders) colliders.push(collider);
  const lairLighting = createBermudaTitanLairLighting(root, {
    cave: caves.records[0],
    titan,
    floor,
  });
  root.userData.titanLairLighting = lairLighting;
  const placed = (p) =>
    new THREE.Vector3(p.x, contactSurface(p.x, p.z) + p.floorOffset, p.z);
  const relicPoint = titan.relicPoint;
  const lairPursuer = createBermudaLairPursuer({
    region: "bermuda",
    contains: (p, margin) => caves.records[0].contains(p, margin),
    canTraverse(from, to, { species }) {
      const direction = new THREE.Vector3().copy(to).sub(from).normalize();
      const result = resolveCreatureMotion(from, to, direction, species, {
        colliders,
        heightAt: contactSurface,
        dynamicContacts: titan.dynamicContacts,
      });
      return (
        !result?.blocked &&
        (!result ||
          new THREE.Vector3().copy(result.position).distanceTo(to) < 0.5)
      );
    },
  });
  caves.bindWorldColliders(colliders, titan.dynamicContacts);
  caves.setEscapeApproach(
    [
      titan.turnPoint,
      titan.retreatPoint,
      ...BERMUDA_TITAN_NAVIGATION.route
        .slice(0, 3)
        .map((p) => new THREE.Vector3(...p)),
    ].filter(Boolean),
  );
  // 石碑贴在真实内侧岩壁，刻纹朝水道；不能悬挂在入口中央挡住下潜视线。
  const tabletProbe = new THREE.Vector3(
      -85,
      contactSurface(-85, -1432) + 35,
      -1432,
    ),
    tabletNormal = new THREE.Vector3(1, 0, 0),
    tabletRay = new THREE.Raycaster(
      tabletProbe,
      new THREE.Vector3(-1, 0, 0),
      0.01,
      160,
    );
  caves.records[0].shell.updateWorldMatrix(true, false);
  const tabletWall = tabletRay.intersectObject(
      caves.records[0].shell,
      false,
    )[0],
    tabletPoint = tabletWall
      ? tabletWall.point.clone().addScaledVector(tabletNormal, 1.3)
      : tabletProbe;
  const titanQuest = createBermudaTitanQuest(root, {
    layout: {
      seals: BERMUDA_TITAN_LAYOUT.seals.map((s) => ({
        id: s.id,
        point: placed(s),
      })),
      tablet: tabletPoint,
      tabletNormal,
      relic: relicPoint,
      mouth: titan.mouth,
      direction: titan.direction,
      range: 150,
    },
    heightAt: contactSurface,
    hazardSites: createBermudaTitanHazardSites({
      cave: caves.records[0],
      heightAt: contactSurface,
      colliders,
      dynamicContacts: titan.dynamicContacts,
      anchors: [titan.waitPoint, titan.approachPoint],
      mouth: titan.mouth,
      direction: titan.direction,
    }),
    colliders: () => colliders,
    inLair: (p) => caves.records[0].contains(p, 0),
    canAccessRelic: (data) => titan.canAccessRelic(data),
    dynamicContacts: titan.dynamicContacts,
    syncBreathPose(frame, state) {
      titan.setPose(state);
      titan.setBreathLean(frame.headYaw, frame.headPitch);
      return {
        mouth: titan.mouth,
        direction: titan.direction,
        relicPoint: titan.relicPoint,
        relicQuaternion: titan.relicQuaternion,
      };
    },
    checkEscape: caves.checkEscape,
    isEscapeSafe: caves.isEscapeSafe,
    sealPortals: caves.setSealing,
    resetPortals: caves.resetSealing,
  });
  void titan.prepare();
  void titanQuest.prepare();
  root.userData.sleepingTitan = titan;
  root.userData.titanQuest = titanQuest;
  const weather = createBermudaWeather(root, options);
  const lights = Array.from({ length: 3 }, () => {
    const l = new THREE.PointLight(0x65d7c1, 0, 50, 1.4);
    root.add(l);
    return l;
  });
  const candidates = [
    ...wreck.lightSources,
    ...biomes.lightSources,
    ...caves.lightSources,
    ...titanQuest.lightSources,
    ...titan.lightSources,
    ...lairLighting.lightSources,
  ];
  return {
    root,
    contactSurface,
    heightAt: bermudaSeabedHeight,
    waterHeightAt: (x, z, now) => WORLD.surfaceY + stormWaveHeight(x, z, now),
    colliders,
    navigationColliders: colliders,
    dynamicContacts: titan.dynamicContacts,
    lairPursuer,
    obstacles: [],
    landmarks: [
      ...wreck.landmarks,
      ...biomes.landmarks,
      ...outerBiomes.landmarks,
      ...caves.landmarks,
    ],
    caves,
    titan,
    titanQuest,
    lairLighting,
    wreck,
    weather,
    update(
      elapsed,
      position,
      dt = 0,
      highQuality = true,
      cameraPosition = position,
      reducedMotion = false,
    ) {
      if (disposed) return;
      time.value = elapsed;
      biomes.update(elapsed, position, highQuality);
      outerBiomes.update(elapsed, position, highQuality);
      caves.update(elapsed, position, highQuality);
      titan.update(elapsed, position, titanQuest.state, {
        highQuality,
        reducedMotion,
      });
      titanQuest.update(elapsed, position, { highQuality, reducedMotion });
      lairLighting.update(elapsed, cameraPosition, highQuality, reducedMotion);
      nurseryArt.update(elapsed, position);
      shelfArt.update(elapsed, position);
      waterMat.opacity = cameraPosition.y > WORLD.surfaceY ? 0.94 : 0.62;
      weather.update(
        elapsed,
        position,
        dt,
        highQuality,
        cameraPosition,
        reducedMotion,
      );
      const selectedLights = lairLighting.selectSources(
        candidates,
        position,
        titan.lightSources[0],
        titanQuest.lightSources[0],
      );
      lights.forEach((l, i) => {
        const source = selectedLights[i];
        l.visible =
          !!source &&
          source.position.distanceTo(position) <
            lairLighting.visibilityDistance(source, position);
        if (source) {
          l.position.copy(source.position);
          l.color.set(source.color);
          l.intensity = source.intensity;
          l.distance = source.distance;
        }
      });
    },
    reset() {
      weather.reset();
      lairPursuer.reset();
      titanQuest.reset();
      titan.reset();
      lairLighting.reset();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      lairPursuer.reset();
      weather.dispose();
      wreck.dispose();
      biomes.dispose();
      titanQuest.dispose();
      lairLighting.dispose();
      titan.dispose();
      caves.dispose();
      outerBiomes.dispose();
      root.removeFromParent();
      shelfArt.dispose();
      nurseryArt.dispose();
      for (const r of resources) r.dispose();
      resources.clear();
      colliders.length = 0;
      root.clear();
    },
  };
}
