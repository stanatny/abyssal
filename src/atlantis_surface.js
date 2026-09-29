import * as THREE from "three";
import { WORLD } from "./world_config.js";
import { createFluidTexture } from "./effect_textures.js";
import {
  buildSkyDome,
  buildStarField,
  buildMoon,
  buildIslands,
} from "./atlantis_art_sky.js";
import {
  makeFleetMaterials,
  SHIP_BUILDERS,
  addShipColliders,
  makeWakeMaterial,
  makeWakeGeometry,
  batchShipMeshes,
} from "./atlantis_art_fleet.js";

/**
 * 亚特兰蒂斯水面模块：夜空（月亮/星空银河/夜岛剪影）与三艘夜航小船。
 * 只导出两个工厂，不创建任何 requestAnimationFrame；动画由集成方在
 * 现有主循环里调用 update 推进。接口字段与 src/ships.js 保持一致。
 */

/**
 * 创建亚特兰蒂斯夜空。update(time, playerPosition, { aboveWater, highQuality })
 * 中 aboveWater=false 时整体淡出隐藏（水下色调由集成方控制）；
 * highQuality=false 时用 setDrawRange 截掉微星与银河星尘、关闭外层月晕，
 * 月亮与主星序两档都完整可见。天穹随玩家平移，保持天体远距感。
 */
export function createAtlantisSky(scene) {
  const root = new THREE.Group();
  root.name = "atlantis_sky";
  scene.add(root);
  const resources = new Set();
  const keep = (resource) => {
    resources.add(resource);
    return resource;
  };
  // 天体组随玩家平移；岛屿留在世界坐标，提供真实视差。
  const celestial = new THREE.Group();
  celestial.name = "atlantis_celestial";
  root.add(celestial);
  const dome = buildSkyDome(keep);
  celestial.add(dome.mesh);
  const stars = buildStarField(keep);
  celestial.add(stars.points);
  const moon = buildMoon(keep);
  celestial.add(moon.group);
  const islands = buildIslands(keep);
  root.add(islands.group);
  let fade = null;
  let lastTime = null;
  let lastQuality = null;

  function applyQuality(highQuality) {
    lastQuality = highQuality;
    // 低质量档只截尾不重排：亮星与中星在缓冲前段，两档都能看到主星序。
    stars.points.geometry.setDrawRange(
      0,
      highQuality ? stars.total : stars.lowCount,
    );
    dome.uniforms.uMilkyWay.value = highQuality ? 1 : 0.55;
    moon.haloOuter.visible = highQuality;
  }

  function update(
    time,
    playerPosition = null,
    { aboveWater = true, highQuality = true } = {},
  ) {
    const dt =
      lastTime === null ? 0 : Math.min(0.2, Math.max(0, time - lastTime));
    lastTime = time;
    const target = aboveWater ? 1 : 0;
    if (fade === null) fade = target;
    fade += (target - fade) * Math.min(1, dt * 2.4);
    if (Math.abs(target - fade) < 0.01) fade = target;
    root.visible = fade > 0.02;
    if (highQuality !== lastQuality) applyQuality(highQuality);
    const px = playerPosition ? playerPosition.x : 0;
    const pz = playerPosition ? playerPosition.z : 0;
    celestial.position.set(px, 0, pz);
    // 月盘始终面向玩家，避免天穹平移后圆盘侧视变形。
    if (playerPosition) moon.group.lookAt(playerPosition);
    stars.uniforms.uTime.value = time;
    stars.uniforms.uFade.value = fade;
    dome.uniforms.uFade.value = fade;
    moon.uniforms.uFade.value = fade;
    // 月晕极缓慢地呼吸，成本只是一次透明度写入。
    const breathe = 0.94 + 0.06 * Math.sin(time * 0.35);
    moon.haloInner.opacity = 0.28 * breathe * fade;
    moon.haloOuter.opacity = 0.07 * breathe * fade;
    islands.material.opacity = fade;
    // 灯塔脉动：慢闪三次一组的暖光。
    const pulse = Math.pow(0.5 + 0.5 * Math.sin(time * 1.4), 3);
    islands.beaconGlow.opacity = (0.18 + 0.62 * pulse) * fade;
    islands.beaconDot.opacity = (0.45 + 0.55 * pulse) * fade;
    islands.villageMaterial.opacity = 0.55 * fade;
  }

  update(0);
  return {
    root,
    update,
    dispose() {
      scene.remove(root);
      for (const resource of resources) resource.dispose();
    },
  };
}

/**
 * 创建亚特兰蒂斯夜航小船队，契约严格对照 src/ships.js 的 createShips：
 * ships 元数据（root/anchor/length/width/heading/colliders/wake 等）、
 * box 格式 colliders（update 内经 root.localToWorld 回填世界坐标）、
 * update(time, playerPosition)、reset() 与 dispose()。
 */
export function createAtlantisFleet(scene) {
  const group = new THREE.Group();
  group.name = "atlantis_fleet";
  scene.add(group);
  const resources = new Set();
  const keep = (resource) => {
    resources.add(resource);
    return resource;
  };
  const { commons, accents } = makeFleetMaterials(keep);
  const timeUniform = { value: 0 };
  const wakeMaterial = makeWakeMaterial(keep, timeUniform);
  const configs = [
    {
      kind: "fisher",
      label: "月汐号渔船",
      length: 12,
      width: 3.9,
      anchor: [-70, -60],
      radiusX: 26,
      radiusZ: 34,
      phase: 0.7,
      rate: 0.017,
      lightAnchor: [0, 2.6, 1.4],
      lightColor: "#ff9a44",
    },
    {
      kind: "ketch",
      label: "远星号探险船",
      length: 15.5,
      width: 4.3,
      anchor: [60, -12],
      radiusX: 30,
      radiusZ: 26,
      phase: 2.2,
      rate: 0.013,
      lightAnchor: [0, 3.0, 0.6],
      lightColor: "#ffab5e",
    },
    {
      kind: "launch",
      label: "汽灯号小艇",
      length: 9.5,
      width: 2.9,
      anchor: [120, -280],
      radiusX: 34,
      radiusZ: 48,
      phase: 4.0,
      rate: 0.02,
      lightAnchor: [0, 1.25, 1.9],
      lightColor: "#ffc06a",
    },
  ];
  const colliders = [];
  const ships = configs.map((config) => {
    const root = new THREE.Group();
    root.name = config.kind;
    group.add(root);
    const ship = {
      ...config,
      root,
      anchor: new THREE.Vector3(
        config.anchor[0],
        WORLD.surfaceY,
        config.anchor[1],
      ),
      heading: 0,
      edible: false,
      collidable: true,
      colliders: [],
      // 每艘船独立的灯笼光晕材质，update 里做各自明暗呼吸。
      glowMaterial: keep(
        new THREE.SpriteMaterial({
          map: keep(createFluidTexture("mist")),
          color: "#ff9a3c",
          transparent: true,
          opacity: 0.62,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        }),
      ),
    };
    const materials = { ...commons, ...accents[config.kind] };
    SHIP_BUILDERS[config.kind](root, ship, materials, keep);
    // 每艘一盏真实点光，照亮甲板与船壳近岸一侧。
    const light = new THREE.PointLight(config.lightColor, 8, 30, 2);
    light.position.set(...config.lightAnchor);
    root.add(light);
    ship.lanternLight = light;
    batchShipMeshes(root, keep);
    const wake = new THREE.Mesh(
      keep(makeWakeGeometry(config.length, config.width)),
      wakeMaterial,
    );
    wake.name = "ship_wake";
    wake.renderOrder = 2;
    root.add(wake);
    ship.wake = wake;
    addShipColliders(ship, colliders);
    return ship;
  });

  function update(time, playerPosition = null) {
    timeUniform.value = time;
    for (const ship of ships) {
      const phase = time * ship.rate + ship.phase;
      ship.root.position.set(
        THREE.MathUtils.clamp(
          ship.anchor.x + Math.sin(phase) * ship.radiusX,
          WORLD.minX + 70,
          WORLD.maxX - 70,
        ),
        WORLD.surfaceY - 0.05 + Math.sin(time * 0.63 + ship.phase) * 0.08,
        THREE.MathUtils.clamp(
          ship.anchor.z + Math.cos(phase) * ship.radiusZ,
          WORLD.minZ + 100,
          WORLD.maxZ - 90,
        ),
      );
      ship.heading = Math.atan2(
        -Math.cos(phase) * ship.radiusX,
        Math.sin(phase) * ship.radiusZ,
      );
      ship.root.rotation.set(
        Math.sin(time * 0.48 + ship.phase) * 0.009,
        ship.heading,
        Math.sin(time * 0.39 + ship.phase) * 0.011,
      );
      ship.root.updateWorldMatrix(true, false);
      for (const collider of ship.colliders) {
        const point = ship.root.localToWorld(collider.localPosition.clone());
        collider.x = point.x;
        collider.y = point.y;
        collider.z = point.z;
        collider.rotation.x = ship.root.quaternion.x;
        collider.rotation.y = ship.root.quaternion.y;
        collider.rotation.z = ship.root.quaternion.z;
        collider.rotation.w = ship.root.quaternion.w;
      }
      // 灯火呼吸：两路不同频率正弦叠加，像风里的油灯。
      const flicker =
        0.88 +
        0.09 * Math.sin(time * 6.3 + ship.phase) +
        0.05 * Math.sin(time * 11.7 + ship.phase * 2);
      ship.lanternLight.intensity = 8 * flicker;
      ship.glowMaterial.opacity = 0.62 * flicker;
      ship.root.visible =
        !playerPosition ||
        (playerPosition.y > -65 &&
          ship.root.position.distanceTo(playerPosition) < 500);
    }
  }

  update(0);
  return {
    ships,
    colliders,
    update,
    reset() {
      update(0);
    },
    dispose() {
      scene.remove(group);
      for (const resource of resources) resource.dispose();
    },
  };
}
