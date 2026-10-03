import { createAmazonOceanAsync } from "./amazon_ocean.js";
import { createMechanicalTorpedoes } from "./mechanical_torpedoes.js";
import {
  MECHANICAL_RULES,
  torpedoStatus,
  resetTorpedoTarget,
} from "./mechanical_shark_rules.js";
import { BOSS_REQUIRED_HITS } from "./boss_rules.js";
import { attachDeepVents } from "./deep_vents.js";
import {
  canPredatorRetaliate,
  predatorBiteContact,
} from "./predator_combat.js";
import {
  createExpeditionObjective,
  advanceExpeditionObjective,
  expeditionObjectiveHint,
  ATLANTIS_RELIC,
} from "./expedition_objectives.js";
import { createWorldBoundary, WORLD_EDGE_INSET } from "./world_boundary.js";
import { createEuropaOceanAsync } from "./europa_ocean.js";
import { needsIceRecovery, stepIceSteering } from "./ice_steering.js";
import { stepSteering } from "./steering_rules.js";
import { createMarianaOcean } from "./mariana_ocean.js";
import { MARIANA_GATES, MARIANA_REFUGE } from "./mariana_config.js";
import { createBermudaOcean } from "./bermuda_ocean.js";
import { initializeLanguage, setLanguageEnabled } from "./i18n.js";
import { t, tr, message, setMarkup, onLanguageChange } from "./i18n.js";
import * as THREE from "three";
import "./style.css";
import "./bermuda_ui.css";
import "./overlay_ui.css";
import "./hud_adaptive.css";
import { createCreature } from "./creatures.js";
import { createVisualPipeline } from "./visual_pipeline.js";
import { createLaunchTransition } from "./launch_transition.js";
import { createOcean, seabedHeight as baseSeabedHeight } from "./ocean.js";
import { createAtlantisOceanAsync } from "./atlantis_ocean.js";
import { MOON_DIRECTION } from "./atlantis_art_sky.js";
import { getRegionSpecies } from "./region_ecology.js";
import { regionZone, cityLightBlend } from "./region_appearance.js";
import {
  createPlayer,
  tickVitals,
  canEat,
  consumePrey,
  takeDamage,
  collectPickup,
  getProgress,
  PLAYER_MOVEMENT,
  ROUND_DURATION,
  hungerDrainRate,
} from "./simulation.js";
import { OceanAudio } from "./audio.js";
import { steerWithinHabitat, resolveCreatureMotion } from "./navigation.js";
import { stepSurfaceSteering } from "./surface_steering.js";
import { needsGroundRecovery, stepGroundSteering } from "./ground_steering.js";
import {
  preyCaptureRadius,
  sweptCaptureFraction,
  frenzyPullDistance,
} from "./prey_capture.js";
import { createFrenzyEffect } from "./frenzy_effect.js";
import { WORLD } from "./world_config.js";
import { createReward, REWARDS } from "./rewards.js";
import { RANDOM_REWARD_COUNT } from "./reward_config.js";
import { createSurface } from "./surface.js";
import { createEncounters } from "./encounters.js";
import { createCombatEffects } from "./combat_effects.js";
import { createFeedingTransition } from "./feeding_transition.js";
import { createHunterState, tickHunter } from "./hunter_rules.js";
import { createOceanGuide, OCEAN_CATALOG } from "./ocean_guide.js";
import { createSonar } from "./sonar.js";
import { createSonarMarkers } from "./sonar_markers.js";
import { createSonarWave } from "./sonar_wave.js";
import { createMinimap } from "./minimap.js";
import { createRegionLoading } from "./region_loading.js";
import { createExpeditionSetup } from "./menu_selection.js";
import { createRunRecordsUI } from "./run_records_ui.js";
import { getExpedition } from "./expedition_config.js";
import { stepFlyingFish } from "./flying_fish.js";
import {
  habitatPosition,
  initialSchoolAnchor,
  initialSpeciesAnchor,
  schoolHabitat,
  schoolPopulationGroups,
  schoolSlot,
  sharesHabitat,
  speciesVisibilityDistance,
  steerResidentHabitat,
} from "./ecosystem_population.js";
import { createHumanActivity } from "./human_activity.js";
import {
  isNursery,
  predatorTerritory,
  canPredatorHunt,
  constrainPredatorTerritory,
} from "./nursery_rules.js";
import {
  characterMovement,
  createInkState,
  activateInk,
  inkStatus,
  getCharacter,
} from "./character_rules.js";
import { bodyRadius } from "./collision.js";
import { createZombieMinion } from "./zombie_minion.js";
import { consumeMinionPrey, summonStatus } from "./zombie_shark_rules.js";

import {
  resolveIndexedMotion,
  castIndexedSegment,
} from "./static_collider_grid.js";

initializeLanguage();

const $ = (id) => document.getElementById(id);
const Clamp = THREE.MathUtils.clamp;
const canvas = $("ocean");
const reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");
const touchPointer = matchMedia("(pointer: coarse)");
const targetPanels = document.querySelectorAll(
  "header, .location, .mission, #threat, #boss-panel, #notification, #ink-status, #breach-hint, #round-clock, #buffs, .vitals, .speed, #joystick, #sonar-panel, #sonar-control, #touch-skills, #touch-boost, #touch-slow, #minimap",
);
const regionLoader = createRegionLoading();
regionLoader.begin(t("夏威夷海滩"));
$("loading").hidden = true;
await regionLoader.paint();
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
} catch (error) {
  regionLoader.end();
  $("loading").hidden = false;
  $("loading").textContent = t(
    "无法启动 3D 画面，请使用支持 WebGL 2 的浏览器并开启硬件加速。",
  );
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.03;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const worldBoundary = createWorldBoundary(scene);
scene.background = new THREE.Color("#155568");
scene.fog = new THREE.FogExp2("#155568", 0.009);
const camera = new THREE.PerspectiveCamera(
  60,
  innerWidth / innerHeight,
  0.15,
  650,
);
const ambient = new THREE.HemisphereLight(0xc5e5ef, 0x3d463e, 1.35);
const sun = new THREE.DirectionalLight(0xfff2d6, 2.7);
sun.position.set(-60, 100, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, {
  left: -65,
  right: 65,
  top: 65,
  bottom: -65,
  near: 1,
  far: 230,
});
sun.shadow.bias = -0.00015;
sun.shadow.normalBias = 0.08;
sun.shadow.camera.updateProjectionMatrix();
scene.add(sun.target);
const rim = new THREE.DirectionalLight(0x699da9, 0.85);
rim.position.set(80, -20, -100);
scene.add(ambient, sun, rim);
const playerLight = new THREE.PointLight(0x94ebdf, 12, 45, 1.2);
scene.add(playerLight);
const visuals = createVisualPipeline(renderer, scene, camera);
let ocean = attachDeepVents(createOcean(scene), "hawaii", {
  heightAt: baseSeabedHeight,
});
const terrainColliders = [...ocean.colliders];
let loadedRegion = "hawaii";
let regionLoading = false;
let environmentContainer = null;
const populationCache = new Map();
function prepareEnvironmentShadows(
  root = scene.getObjectByName("ocean_environment"),
) {
  root?.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.material?.isMeshStandardMaterial) return;
    mesh.receiveShadow = true;
    mesh.castShadow =
      !mesh.isInstancedMesh &&
      !mesh.material.transparent &&
      mesh.geometry.attributes.position.count < 20000;
  });
}
prepareEnvironmentShadows();
let avatar = createCreature("orca", 6);
const avatarCache = new Map([["orca", avatar]]);
avatar.traverse((mesh) => {
  if (mesh.isMesh) {
    mesh.castShadow = !mesh.userData.noShadow;
    mesh.receiveShadow = true;
  }
});
scene.add(avatar);
const audio = new OceanAudio();
void audio.preloadHumanVoices();
void audio.preloadFishSounds();
const effects = createCombatEffects(scene);
const frenzyEffect = createFrenzyEffect(scene);
const captureStart = new THREE.Vector3();
const previousPreyPosition = new THREE.Vector3();
// 生物逐个更新；这些中间值不写入持久状态，避免每尾鱼每帧分配向量。
const entityMouth = new THREE.Vector3();
const entityDirection = new THREE.Vector3();
const entityTarget = new THREE.Vector3();
const entityOffset = new THREE.Vector3();
const previousHabitatPosition = new THREE.Vector3();
const entityOrientation = new THREE.Quaternion();
const entityUnitVelocity = new THREE.Vector3();
const modelForward = new THREE.Vector3(0, 0, -1);
const captureContact = new THREE.Vector3();
const preyContact = new THREE.Vector3();
const swallowPoint = new THREE.Vector3();
const feedingDirection = new THREE.Vector3();
const feeding = createFeedingTransition({
  onMist: (point, length) => effects.mealMist(point, length),
});
let minion, torpedoes;
const guide = createOceanGuide($("open-guide"));
const sonar = createSonar($("sonar-panel"));
const sonarMarkers = createSonarMarkers($("sonar-markers"));
const sonarWave = createSonarWave(scene);
const minimap = createMinimap($("minimap"));
const surfaceOptions = {
  worldColliders: terrainColliders,
  castWorld: (from, to, radius = 0) =>
    castIndexedSegment(from, to, { staticColliders: ocean.colliders, radius }),
  onImpact(event) {
    audio.hit?.(event.destroyed ? 1.2 : 0.7);
    notify(
      event.destroyed
        ? "船体破裂 · 船只正在沉没"
        : message`船体受损 · 还需 ${event.health} 次冲撞`,
    );
  },
  onContact(event) {
    if (event.now < nextShipNotice) return;
    notify(
      event.length < event.requiredLength
        ? message`船体坚固 · 达到${event.requiredLength}米后可冲刺撞击`
        : "船体坚固 · 拉开距离后冲刺撞击",
    );
    nextShipNotice = event.now + 4;
  },
  isSwallowing: (mesh) =>
    feeding.has(mesh) || Boolean(minion?.feeding.has(mesh)),
  onEat(point, length, bird) {
    feeding.start(bird.mesh, length);
    effects.bite(point, forward, player.length);
  },
};
let surface = createSurface(scene, audio, notify, surfaceOptions);
const encounters = createEncounters(scene, {
  seabedHeight: activeSeabedHeight,
  audio,
  notify,
  onDamage() {
    hitFlash = 0.9;
    effects.hurt(position, player.length);
  },
  onTorpedoHit(point, length) {
    effects.blood(point, Math.min(length, 8));
  },
  onBite(point, length) {
    effects.blood(point, length);
    effects.bite(
      position.clone().addScaledVector(forward, player.length * 0.36),
      forward,
      player.length,
    );
  },
});
const humans = createHumanActivity(scene, {
  audio,
  notify,
  effects,
  heightAt: activeSeabedHeight,
  worldColliders: terrainColliders,
  castWorld: (from, to, radius = 0) =>
    castIndexedSegment(from, to, {
      staticColliders: ocean.colliders,
      dynamicColliders: [...(ocean.barriers || []), ...surface.colliders],
      radius,
    }),
  isSwallowing: (mesh) =>
    feeding.has(mesh) || Boolean(minion?.feeding.has(mesh)),
  onEat(point, length, entity) {
    feeding.start(entity.mesh, length);
  },
  onDamage() {
    hitFlash = 0.85;
    effects.hurt(position, player.length);
  },
});
minion = createZombieMinion(scene, {
  effects,
  audio,
  blockedBetween,
  resolveMovement: resolveMinionMotion,
  onConsume(entity, state, owner) {
    if (!consumeMinionPrey(state, owner, entity.species)) return false;
    if (entity.alive !== undefined) humans.retireMeal(entity, owner.elapsed);
    else {
      entity.hiddenFor = entity.species.schoolSize > 1 ? 18 : 28;
      entity.chase = 0;
      entity.flight = null;
      entity.mesh.userData.setGliding?.(false);
    }
    return true;
  },
  onMeal(entity) {
    if (entity.sex) audio.eatHuman(entity.species.length, entity.sex);
    else audio.eatFish(entity.species.length);
    notify(message`仆从捕食 ${entity.species.label} · 收益归主角`, 1.4);
  },
});
const entities = [],
  pickups = [],
  bursts = [],
  schools = [];
torpedoes = createMechanicalTorpedoes(scene, {
  castWorld: queryWorldSegment,
  heightAt: activeSeabedHeight,
  waterHeightAt: (x, z) =>
    surface.mode === "ice"
      ? -0.4
      : (surface.waterHeightAt?.(x, z, elapsed) ?? WORLD.surfaceY),
  entities: () => entities,
  bosses: () => encounters.bosses,
  hitBoss: encounters.torpedoHit,
  effects,
  audio,
  onLaunch() {
    avatar.userData.triggerLaunch?.();
  },
  onBlast({ killed, hits, bossHits }) {
    if (killed) notify(message`鱼雷爆炸 · 吞噬${killed}，另命中${hits}`, 2);
    else if (hits > bossHits)
      notify(message`鱼雷爆炸 · 命中${hits}，尚未击杀`, 2);
  },
});
const keys = new Set();
const pointer = { x: 0, y: 0 };
const position = new THREE.Vector3(0, -18, 75);
const forward = new THREE.Vector3(0, 0, -1);
const temp = new THREE.Vector3(),
  lookTarget = new THREE.Vector3();
const rotation = new THREE.Euler(0, 0, 0, "YXZ");
const aimOrigin = new THREE.Vector3(),
  aimProjection = new THREE.Vector3();
let aimPreview = null,
  aimPreviewAt = -Infinity;
const bubbleGeometry = new THREE.SphereGeometry(0.12, 5, 4);
const bubbleMaterial = new THREE.MeshBasicMaterial({
  color: 0xb9ffee,
  transparent: true,
  opacity: 0.65,
});
let player = createPlayer(),
  mode = "menu",
  elapsed = 0,
  yaw = 0,
  pitch = 0,
  speed = 0;
let lastTime = performance.now(),
  notificationUntil = 0,
  lastZone = "",
  lastNursery = null;
let threat = null,
  touchBoost = false,
  touchSlow = false,
  highQuality = true,
  hitFlash = 0,
  uiClock = 0,
  activeBoss = null;
let launchTransition = null;
let worldRenderDirty = true;
let movementLabel = "巡游";
let lureFlash = 0,
  waterMotion = null;
let lastCollision = null;
let groundRecovering = false,
  iceRecovering = false;
let nextShipNotice = 0;
let expedition = getExpedition();
let inkAbility = createInkState();
const jetDirection = new THREE.Vector3(0, 0, -1);
let markersEnabled = true;
let invertVertical = false;
let bestLength = 6;
try {
  bestLength = Number(localStorage.getItem("abyssal_best")) || 6;
  markersEnabled = localStorage.getItem("abyssal_markers") !== "off";
  invertVertical = localStorage.getItem("abyssal_invert_y") === "on";
} catch {
  /* 隐私模式仍可游玩。 */
}

const setup = createExpeditionSetup($("expedition-setup"), {
  markers: markersEnabled,
  invertVertical,
  onInvertVerticalChange: setInvertVertical,
  onMarkersChange: setMarkers,
  onCharacterChange: selectAvatar,
  onRegionChange: selectRegion,
});
const runRecords = createRunRecordsUI(() => setup.getSelection().region.id);
setMarkers(markersEnabled);
function selectAvatar(character) {
  scene.remove(avatar);
  avatar = avatarCache.get(character.kind);
  if (!avatar) {
    avatar = createCreature(character.kind, 6);
    avatar.traverse((mesh) => {
      if (mesh.isMesh) {
        mesh.castShadow = !mesh.userData.noShadow;
        mesh.receiveShadow = true;
      }
    });
    avatarCache.set(character.kind, avatar);
  }
  scene.add(avatar);
  avatar.visible = true;
  const caption = document.querySelector(".specimen");
  if (caption) {
    caption.querySelector("span").textContent = t(
      tr`${character.latin || (character.id === "orca" ? "ORCINUS ORCA" : "ARCHITEUTHIS DUX")} · PLAYER`,
    );
    caption.querySelector("strong").textContent = t(specimenCaption(character));
  }
}
function specimenCaption(character) {
  return expedition.region.startLength
    ? tr`${character.name} · ${expedition.region.startLength}米起步`
    : tr`${character.name} · 幼年个体`;
}
const atlantisPreparationProgress = {
  seabed: 25,
  "city-start": 28,
  temple: 34,
  underways: 38,
  marine: 43,
  residential: 47,
  "city-ready": 50,
};
async function selectRegion(region) {
  if (regionLoading || mode !== "menu" || loadedRegion === region.id) return;
  regionLoading = true;
  setLanguageEnabled(false);
  resetInput();
  regionLoader.begin(region.name);
  const previous = {
    ocean,
    surface,
    environmentContainer,
    expedition,
    loadedRegion,
    entities: [...entities],
    schools: [...schools],
  };
  const container = new THREE.Group();
  container.name = "region_environment";
  let nextOcean, nextSurface;
  let swapped = false;
  let detached = false;
  try {
    await regionLoader.paint();
    regionLoader.stage("正在绘制海底与海岸…", 18);
    await regionLoader.paint();
    // 新环境完整建成后才替换旧环境；失败时仍可回到原海域。
    nextOcean =
      region.id === "amazon"
        ? await createAmazonOceanAsync(container, {
            onStep() {
              regionLoader.stage("正在绘制河道与雨林…", 35);
            },
          })
        : region.id === "europa"
          ? await createEuropaOceanAsync(container, {
              onStep() {
                regionLoader.stage("正在雕刻冰壳与盐脉…", 35);
              },
            })
          : region.id === "mariana"
            ? createMarianaOcean(container)
            : region.id === "atlantis"
              ? await createAtlantisOceanAsync(container, {
                  onStep(label) {
                    const progress = atlantisPreparationProgress[label];
                    if (progress)
                      regionLoader.stage("正在绘制海底与海岸…", progress);
                  },
                })
              : region.id === "bermuda"
                ? createBermudaOcean(container, {
                    audio,
                    notify,
                    onDamage() {
                      hitFlash = 0.9;
                      effects.hurt(position, player.length);
                    },
                  })
                : createOcean(container);
    attachDeepVents(nextOcean, region.id, {
      heightAt: nextOcean.heightAt || baseSeabedHeight,
    });
    await regionLoader.paint();
    regionLoader.stage("正在准备海面与生物…", 52);
    await regionLoader.paint();
    nextSurface = createSurface(container, audio, notify, {
      ...surfaceOptions,
      regionId: region.id,
      surfaceMode: region.surfaceMode,
      worldBounds: region.world || WORLD,
      heightAt: nextOcean.heightAt || baseSeabedHeight,
      waterHeightAt: nextOcean.waterHeightAt,
      onDamage() {
        hitFlash = 0.9;
        effects.hurt(position, player.length);
      },
    });
    await regionLoader.paint();
    feeding.reset();
    minion.reset();
    torpedoes?.reset();
    resetTorpedoAim();
    effects.reset();
    frenzyEffect.reset();
    sonarMarkers.reset();
    sonarWave.reset();
    minimap.reset();
    detached = true;
    for (const entity of entities) {
      scene.remove(entity.mesh);
      if (entity.telegraph) scene.remove(entity.telegraph);
    }
    populationCache.set(loadedRegion, [...entities]);
    entities.length = schools.length = 0;
    previous.ocean.root.visible = false;
    // surface内部根节点由构造容器持有；旧环境留到首帧成功呈现后再释放。
    scene.add(container);
    ocean = nextOcean;
    surface = nextSurface;
    environmentContainer = container;
    expedition = getExpedition(region.id, setup.getSelection().character.id);
    loadedRegion = region.id;
    swapped = true;
    refreshRegionState();
    for (const entity of populationCache.get(region.id) || []) {
      entities.push(entity);
      scene.add(entity.mesh);
      if (entity.telegraph) scene.add(entity.telegraph);
    }
    seedPopulation();
    seedPickups();
    await regionLoader.paint();
    // 提前编译新地图材质；准备期间游戏帧暂停，避免把耗时工作藏在点击后的首帧。
    position.set(0, -18, 75);
    atmosphere(0);
    ocean.update(elapsed, position, 0, highQuality);
    surface.update(0, elapsed, player, position, camera, false, highQuality);
    for (const entity of entities)
      entity.mesh.visible = entity.mesh.position.distanceTo(position) < 120;
    visuals.update({
      time: elapsed,
      depth: 18,
      position,
      night: region.id === "atlantis",
      ice: region.surfaceMode === "ice",
    });
    regionLoader.stage("正在准备光影…", 82);
    await regionLoader.paint();
    await renderer.compileAsync(scene, camera);
    visuals.render();
    regionLoader.stage("准备就绪", 100);
    previous.surface.dispose();
    previous.ocean.dispose();
    previous.environmentContainer?.removeFromParent();
    await regionLoader.paint();
  } catch (error) {
    console.error("Region preparation failed", error);
    if (detached) {
      for (const entity of entities) {
        scene.remove(entity.mesh);
        if (entity.telegraph) scene.remove(entity.telegraph);
      }
      // 已生成的生物保留缓存，重试不会再复制一套模型。
      if (swapped) populationCache.set(region.id, [...entities]);
      ({ ocean, surface, environmentContainer, expedition, loadedRegion } =
        previous);
      entities.splice(0, entities.length, ...previous.entities);
      schools.splice(0, schools.length, ...previous.schools);
      for (const entity of entities) {
        scene.add(entity.mesh);
        if (entity.telegraph) scene.add(entity.telegraph);
      }
      ocean.root.visible = true;
      refreshRegionState();
      seedPickups();
    }
    nextSurface?.dispose();
    nextOcean?.dispose();
    container.removeFromParent();
    setup.setRegion(loadedRegion);
    await regionLoader.fail();
  } finally {
    regionLoader.end();
    regionLoading = false;
    setLanguageEnabled(true);
    lastTime = performance.now();
  }
}

function refreshRegionState() {
  terrainColliders.splice(0, terrainColliders.length, ...ocean.colliders);
  const region = expedition.region;
  humans.reset(region.humanActivity);
  encounters.reset(region.bossKinds, region.bossHomes, region.bossInstances);
  audio.setRegion?.(region.id);
  camera.far = region.id === "hawaii" ? 650 : 2400;
  camera.updateProjectionMatrix();
  prepareEnvironmentShadows(ocean.root);
  guide.setRegion(region.id);
  lastZone = "";
  lastNursery = null;
  threat = activeBoss = null;
  document.body.dataset.region = region.id;
  updateRegionPresentation();
}

function updateRegionPresentation() {
  runRecords.refreshBest();
  document.querySelector(".specimen strong").textContent = t(
    specimenCaption(setup.getSelection().character),
  );
  const ice = expedition.region.surfaceMode === "ice";
  const night = expedition.region.id === "atlantis";
  const storm = expedition.region.id === "bermuda";
  const trench = expedition.region.id === "mariana";
  setMarkup(
    document.querySelector(".intro"),
    expedition.region.surfaceMode === "river"
      ? "沿弯曲河道穿越雨林，两条支流通往巨兽深潭。<br />在沉根与浮叶之间成长，迎战河道的两位主宰。"
      : ice
        ? "潜入冰壳之下，循着盐脉与微光。<br />在陌生生命之间，寻找冰下的深渊领主。"
        : trench
          ? "循着生物微光，潜入世界最深的海沟。<br />突破四道守关，寻找万米深处的秘密。"
          : storm
            ? "风暴遮蔽航路，幽灵炮声穿透浓雾。<br />探索失落沉船，挑战各水层的深渊领主。"
            : night
              ? "循着月光与鱼群，潜入沉没古城。<br />在波塞冬的珠光下，迎战守卫克拉肯。"
              : "穿过阳光与鱼群，潜向未知。<br />从幼年的生命，长成深渊的主宰。",
  );
  const labels =
    expedition.region.surfaceMode === "river"
      ? ["浮叶育幼湾", "淹没雨林", "巨颚沉渊"]
      : ice
        ? ["冰穹育幼", "悬生群落", "星渊深窟"]
        : trench
          ? ["珍珠浅棚", "幽蓝阶渊", "挑战者秘境"]
          : storm
            ? ["宁静礁湾", "风暴外海", "失落沉船"]
            : night
              ? ["月辉浅滩", "沉没外城", "波塞冬古城"]
              : ["珊瑚浅海", "幽蓝海沟", "火山深渊"];
  document.querySelectorAll(".journey b span").forEach((node, index) => {
    node.textContent = t(labels[index]);
  });
  document.querySelector(".menu-stats b").textContent = String(
    OCEAN_CATALOG.length,
  );
  document.querySelectorAll(".menu-stats b")[1].textContent = String(
    OCEAN_CATALOG.filter((entry) => entry.category === "lord").length,
  ).padStart(2, "0");
  document.querySelector(".depth-rail span").textContent = t(
    ice ? "冰穹" : "浅海",
  );
}
function setMarkers(enabled) {
  markersEnabled = enabled;
  for (const input of document.querySelectorAll(".marker-setting"))
    input.checked = enabled;
  if (!enabled) $("target").hidden = true;
  try {
    localStorage.setItem("abyssal_markers", enabled ? "on" : "off");
  } catch {
    /* 隐私模式只保存本次设置。 */
  }
}
function setInvertVertical(enabled) {
  invertVertical = Boolean(enabled);
  const input = $("menu-invert-y");
  if (input) input.checked = invertVertical;
  try {
    localStorage.setItem("abyssal_invert_y", invertVertical ? "on" : "off");
  } catch {
    /* 隐私模式只保存本次设置。 */
  }
}
function toggleMarkers() {
  setMarkers(!markersEnabled);
}

function activateSonar() {
  if (mode !== "playing" || player.dead || player.won || player.timedOut)
    return false;
  if (player.characterId !== "orca") return false;
  if (!sonar.activate(player.elapsed)) return false;
  audio.sonar();
  updateSonar();
  return true;
}
function mechanicalUnderwater() {
  return (
    !surface.airborne &&
    (surface.mode === "ice" ||
      position.y <
        (surface.waterHeightAt?.(position.x, position.z, elapsed) ??
          WORLD.surfaceY) -
          player.length * 0.2)
  );
}
function activateCharacterSkill() {
  if (player.characterId === "mechanical_shark") {
    if (mode !== "playing") return false;
    const underwater = mechanicalUnderwater();
    const status = torpedoStatus(torpedoes.state, player, underwater);
    if (!status.usable) {
      if (status.reason === "resources")
        notify("鱼雷需要生命超过10点、体力至少10点", 2);
      else if (status.reason === "underwater")
        notify("潜入水下后可发射鱼雷", 2);
      return false;
    }
    avatar.userData.getTorpedoMuzzle?.(swallowPoint);
    const active = torpedoes.activate(
      player,
      swallowPoint,
      forward,
      underwater,
    );
    if (active) notify("鱼雷发射 · 生命 -10 · 体力 -10", 2);
    updateSonar();
    return active;
  }

  if (player.characterId === "zombie_shark") {
    if (mode !== "playing") return false;
    const status = summonStatus(minion.state, player);
    if (!status.usable) {
      if (status.reason === "length") notify("体长达到5米后才能分裂", 2);
      else if (status.reason === "resources")
        notify("召唤需要生命、体力、饱食各至少50点", 2);
      return false;
    }
    const activated = minion.activate(player, position, forward);
    if (activated) notify("尸鲨仆从已召唤 · 三项属性各消耗50点", 3);
    updateSonar();
    return activated;
  }
  if (player.characterId !== "squid") return activateSonar();
  if (
    mode !== "playing" ||
    !activateInk(inkAbility, player.elapsed, {
      underwater:
        !surface.airborne && position.y < WORLD.surfaceY - player.length * 0.2,
      alive: !player.dead && !player.won && !player.timedOut,
    })
  )
    return false;
  jetDirection.copy(forward);
  const cloud = effects.spawnInk(
    position.clone().addScaledVector(forward, -5),
    30,
    10,
  );
  cloud.playerOwned = true;
  let confused = 0;
  for (const entity of entities) {
    if (
      entity.hiddenFor > 0 ||
      !entity.species.predator ||
      entity.chase <= 0 ||
      entity.mesh.position.distanceTo(position) > 90
    )
      continue;
    entity.disorientedUntil = player.elapsed + 10;
    entity.chase = 0;
    entity.velocity.set(0, 0, 0);
    entity.hunter = createHunterState(entity.species, entity.seed);
    entity.mesh.userData.setHunterPhase?.(entity.hunter.phase);
    entity.mesh.userData.disoriented = true;
    confused++;
  }
  confused += encounters.disorient?.(position, 90, player.elapsed, 10) || 0;
  effects.flash(position, 0x947acf, 14);
  audio.hunter?.("squid");
  notify(
    message`墨幕喷射 · ${confused ? message`${confused}个追击者迷失10秒` : "向前喷射脱离危险"}`,
    2.5,
  );
  updateSonar();
  return true;
}
function updateSonar() {
  const scan = sonar.update({
    now: player.elapsed,
    position,
    forward,
    entities: [...entities, ...humans.entities.filter((entry) => entry.alive)],
    bosses: encounters.bosses,
    player,
  });
  const visible =
    mode === "playing" && player.characterId === "orca" && scan.active;
  document.body.classList.toggle("sonar-active", visible);
  $("sonar-panel").hidden = !visible;
  if (scan.active) $("target").hidden = true;
  const echoPresentation = sonarMarkers.update({
    active: visible,
    now: player.elapsed,
    contacts: scan.contacts,
    camera,
    viewport: { width: innerWidth, height: innerHeight },
    occlusions: getMarkerOcclusions(),
  });
  sonar.setPresentation(echoPresentation);
  sonarWave.update({
    active: visible,
    now: player.elapsed,
    position,
    startedAt: sonar.state.activatedAt,
  });
  minimap.update({
    position,
    forward,
    spawn: expedition.region.spawn,
    contacts: scan.contacts,
    sonarActive: visible,
    world: activeWorld(),
    riverPaths: ocean.radarPaths,
    waypoints: ocean.progress
      ? ocean.progress.opened === MARIANA_GATES.length
        ? [{ ...MARIANA_REFUGE, open: false, final: true }]
        : MARIANA_GATES.map((g, i) => ({
            x:
              g.guideToGuardian && i >= ocean.progress.opened ? g.home[0] : g.x,
            y:
              g.guideToGuardian && i >= ocean.progress.opened
                ? g.home[1]
                : -g.depth,
            z:
              g.guideToGuardian && i >= ocean.progress.opened ? g.home[2] : g.z,
            guardian: Boolean(g.guideToGuardian && i >= ocean.progress.opened),
            open: i < ocean.progress.opened,
          }))
      : objectiveState?.relicUnlocked && !objectiveState.relicCollected
        ? [{ ...ATLANTIS_RELIC, open: false, relic: true }]
        : objectiveState?.clueRead &&
            !objectiveState.keyCollected &&
            ocean.relic?.keyArt.getPoint(objectiveState.keySiteId)
          ? [
              {
                ...ocean.relic.keyArt.getPoint(objectiveState.keySiteId),
                open: false,
                key: true,
              },
            ]
          : [],
  });
  const character = getCharacter(player.characterId);
  const skill = character.active;
  const statusData =
    player.characterId === "mechanical_shark"
      ? torpedoStatus(torpedoes.state, player, mechanicalUnderwater())
      : player.characterId === "zombie_shark"
        ? summonStatus(minion.state, player)
        : player.characterId === "squid"
          ? inkStatus(inkAbility, player.elapsed)
          : scan;
  const underwater =
    !surface.airborne && position.y < WORLD.surfaceY - player.length * 0.2;
  const usable =
    statusData.ready &&
    (["summon", "torpedo"].includes(skill.id)
      ? statusData.usable
      : player.characterId !== "squid" || underwater);
  // 浮点加减可能让整两秒略大于2，向上取整前消除数值误差，资格仍用原时钟。
  const cooldownSeconds = Math.ceil(
    Math.max(0, statusData.cooldownRemaining - 1e-9),
  );
  const shortName = {
    ink: "喷墨",
    sonar: "声呐",
    summon: "分裂",
    torpedo: "鱼雷",
  }[skill.id];
  const activeLabel = { ink: "墨幕", sonar: "探测", summon: "仆从" }[skill.id];
  const blockedLabel =
    skill.id === "torpedo"
      ? statusData.reason === "resources"
        ? "需生命>10/体力10"
        : "需潜入水下"
      : skill.id === "summon"
        ? statusData.reason === "length"
          ? "需5米体长"
          : "需三项各50"
        : "需潜入水下";
  const status = statusData.active
    ? tr`${activeLabel} ${Math.ceil(statusData.remaining)}s`
    : statusData.ready
      ? usable
        ? statusData.lethal
          ? "致命献祭"
          : "就绪"
        : blockedLabel
      : tr`冷却 ${Math.ceil(statusData.cooldownRemaining)}s`;
  $("sonar-control").textContent = t(tr`J ${shortName} · ${status}`);
  $("touch-sonar").querySelector("span").textContent = t(shortName);
  $("touch-sonar-status").textContent = t(
    statusData.ready
      ? usable
        ? statusData.lethal
          ? "致命献祭"
          : "就绪"
        : ["summon", "torpedo"].includes(skill.id)
          ? blockedLabel
          : "水下使用"
      : tr`${statusData.active ? Math.ceil(statusData.remaining) : cooldownSeconds}s`,
  );
  for (const id of ["touch-sonar", "sonar-control"]) {
    const button = $(id);
    button.dataset.skill = skill.id;
    button.dataset.state = statusData.active
      ? "active"
      : statusData.ready
        ? usable
          ? "ready"
          : "blocked"
        : "cooldown";
    button.disabled = !usable || mode !== "playing";
    button.dataset.remaining = String(cooldownSeconds);
    button.style.setProperty(
      "--skill-progress",
      String(
        Math.max(
          0,
          Math.min(1, 1 - statusData.cooldownRemaining / skill.cooldown),
        ),
      ),
    );
    button.setAttribute("aria-disabled", String(button.disabled));
    button.setAttribute(
      "aria-label",
      t(tr`${character.name}${skill.name}，${status}。${skill.description}`),
    );
    button.title = t(tr`J · ${skill.name} · 冷却${skill.cooldown}秒`);
  }
  return scan;
}

let markerOcclusions = [],
  occlusionsAt = -Infinity;
function getMarkerOcclusions() {
  if (player.elapsed >= occlusionsAt && player.elapsed - occlusionsAt < 0.1)
    return markerOcclusions;
  occlusionsAt = player.elapsed;
  markerOcclusions = [];
  for (const panel of targetPanels) {
    if (
      panel.hidden ||
      (panel.id === "notification" && elapsed >= notificationUntil)
    )
      continue;
    const style = getComputedStyle(panel);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) === 0
    )
      continue;
    // 增益容器横跨整行，只避开实际徽章，为窄屏回声文字留下空白。
    const painted = panel.id === "buffs" ? [...panel.children] : [panel];
    for (const element of painted) {
      const bounds = element.getBoundingClientRect();
      if (bounds.width && bounds.height)
        markerOcclusions.push({
          left: bounds.left,
          top: bounds.top,
          right: bounds.right,
          bottom: bounds.bottom,
        });
    }
  }
  return markerOcclusions;
}
function random(min, max) {
  return min + Math.random() * (max - min);
}
// 动态读取当前海域；回到首页换图或准备失败回滚时，不保留旧地图的海床闭包。
function activeWorld() {
  return expedition.region.world || WORLD;
}
function activeSeabedHeight(x, z) {
  return (ocean.heightAt || baseSeabedHeight)(x, z);
}
function floorAt(x, z, margin = 4) {
  return activeSeabedHeight(x, z) + margin;
}
function speciesList() {
  return getRegionSpecies(expedition.region.id);
}
function spawnPosition(
  species,
  near = false,
  anchor = null,
  populationIndex = 0,
) {
  const context = {
    heightAt: activeSeabedHeight,
    colliders: ocean.colliders,
    playerPosition: position,
    forward,
    highQuality,
    populationIndex,
  };
  const point = habitatPosition(species, {
    ...context,
    near,
    anchor: anchor || initialSpeciesAnchor(species, populationIndex),
  });
  if (point) return point;
  // 玩家水层不合适时回到该物种合法栖息点，不能把深海动物抬进浅滩。
  const fallback = habitatPosition(species, {
    ...context,
    anchor: initialSpeciesAnchor(species, populationIndex),
  });
  if (!fallback)
    throw new Error(tr`No valid habitat position for ${species.kind}`);
  return fallback;
}
function addEntity(species, location, populationIndex = 0) {
  const mesh = createCreature(
    species.kind,
    species.length,
    entities.length + 1,
  );
  mesh.position.copy(
    location || spawnPosition(species, false, null, populationIndex),
  );
  scene.add(mesh);
  const entity = {
    species,
    populationIndex,
    mesh,
    heading: random(-Math.PI, Math.PI),
    chase: 0,
    cooldown: 0,
    seed: random(0, 100),
    velocity: new THREE.Vector3(),
    hiddenFor: 0,
    hunter: createHunterState(species, entities.length + 1),
  };
  if (species.tier === 2) {
    entity.telegraph = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.035, 5, 40),
      new THREE.MeshBasicMaterial({
        color:
          species.hunterAbility === "river_shock"
            ? 0xe8d98a
            : species.kind === "octopus"
              ? 0xd98665
              : 0xffb080,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    );
    entity.telegraph.visible = false;
    scene.add(entity.telegraph);
  }
  entities.push(entity);
  return entity;
}
function seedPopulation() {
  // 切图失败可能留下已生成的一部分缓存；重试补齐缺失个体，不复制已有模型。
  const existing = new Map();
  for (const entity of entities)
    existing.set(
      entity.species.kind,
      (existing.get(entity.species.kind) || 0) + 1,
    );
  for (const species of speciesList()) {
    const count =
      species.population ??
      (species.schoolSize ? 18 : species.category === "ancient" ? 2 : 4);
    for (let i = existing.get(species.kind) || 0; i < count; i++)
      addEntity(species, null, i);
  }
  schools.length = 0;
  const speciesIndices = new Map();
  for (const entity of entities) {
    const index = speciesIndices.get(entity.species.kind) || 0;
    speciesIndices.set(entity.species.kind, index + 1);
    entity.populationIndex = index;
    entity.mesh.position.copy(
      spawnPosition(
        entity.species,
        false,
        initialSpeciesAnchor(entity.species, index),
        index,
      ),
    );
    entity.mesh.visible = true;
    entity.chase = 0;
    entity.cooldown = 0;
    entity.hiddenFor = 0;
    entity.velocity.set(0, 0, 0);
    entity.school = null;
    entity.hunter = createHunterState(entity.species, entity.seed);
    entity.disorientedUntil = 0;
    entity.flight = null;
    entity.flightReadyAt = 0;
    entity.mesh.userData.setGliding?.(false);
    if (entity.telegraph) entity.telegraph.visible = false;
  }
  for (const kind of speciesList()
    .filter((entry) => entry.schoolSize > 1)
    .map((entry) => entry.kind)) {
    const members = entities.filter((e) => e.species.kind === kind);
    if (!members.length) continue;
    const species = members[0].species;
    for (const group of schoolPopulationGroups({
      ...species,
      population: members.length,
    })) {
      const groupMembers = members.slice(
        group.start,
        group.start + group.count,
      );
      const habitat = schoolHabitat(species, group.index);
      const center = spawnPosition(
        habitat,
        false,
        initialSchoolAnchor(species, group.index),
      );
      const school = {
        center,
        seed: random(0, 9),
        kind,
        species,
        habitat,
        members: groupMembers,
        nextMigration: random(16, 30),
      };
      schools.push(school);
      groupMembers.forEach((entity, index) => {
        entity.school = school;
        entity.slot = schoolSlot(species, index);
        const preferred = center.clone().add(entity.slot);
        entity.mesh.position.copy(spawnPosition(habitat, false, preferred));
        entity.slot.copy(entity.mesh.position).sub(center);
      });
    }
  }
}
function seedPickups() {
  for (let i = 0; i < 3 + RANDOM_REWARD_COUNT; i++) {
    let item = pickups[i];
    if (!item) {
      const kind = ["stamina", "flow", "frenzy"][i % 3];
      item = { kind, mesh: createReward(kind), baseY: 0, cooldown: 0 };
      scene.add(item.mesh);
      pickups.push(item);
    }
    // 浅滩各保留一枚入门奖励，其余每局随机；重开复用原有模型。
    const point =
      i < 3
        ? new THREE.Vector3((i - 1) * 13, -19 - i * 5, 40 - i * 28)
        : spawnPosition(
            {
              depthMin: 20,
              depthMax: activeWorld().maxDepth - 30,
              length: 2,
              worldBounds: activeWorld(),
            },
            false,
            ocean.rewardAnchor?.(Math.random) ||
              new THREE.Vector3(
                random(activeWorld().minX + 18, activeWorld().maxX - 18),
                -random(20, activeWorld().maxDepth - 30),
                random(activeWorld().minZ + 18, activeWorld().maxZ - 18),
              ),
          );
    item.mesh.position.copy(point);
    item.baseY = point.y;
    item.cooldown = 0;
    item.mesh.visible = true;
  }
}
let objectiveState;
let currentNotification = "";
function notify(source, duration = 3) {
  currentNotification = source;
  $("notification").textContent = t(source);
  notificationUntil = elapsed + duration;
}
function resetExpedition(preserveWorld = false) {
  delete document.body.dataset.epilogue;
  runRecords.resetRound();
  launchTransition = null;
  document.body.classList.remove("launching");
  $("menu").inert = false;
  $("hud").inert = false;
  expedition = setup.getSelection();
  player = createPlayer(expedition.character.id, expedition.startLength);
  player.expeditionComplete = false;
  objectiveState = createExpeditionObjective(expedition.region);
  ocean.relic?.reset();
  selectAvatar(expedition.character);
  inkAbility = createInkState();
  position.fromArray(expedition.region.spawn);
  yaw = 0;
  pitch = 0;
  speed = PLAYER_MOVEMENT.cruiseSpeed;
  if (!preserveWorld) elapsed = 0;
  forward.set(0, 0, -1);
  lastZone = "";
  lastNursery = null;
  lastCollision = null;
  groundRecovering = iceRecovering = false;
  nextShipNotice = 0;
  notificationUntil = 0;
  hitFlash = 0;
  lureFlash = 0;
  waterMotion = null;
  feeding.reset();
  minion.reset();
  torpedoes?.reset();
  resetTorpedoAim();
  effects.reset();
  frenzyEffect.reset();
  sonar.reset();
  sonarMarkers.reset();
  sonarWave.reset();
  minimap.reset();
  occlusionsAt = -Infinity;
  updateSonar();
  $("ink-overlay").style.opacity = "0";
  $("lure-flash").style.opacity = "0";
  for (const b of bursts) scene.remove(b.mesh);
  bursts.length = 0;
  threat = null;
  resetInput();
  activeBoss = null;
  // 首次出发沿用首页已经显示的世界，避免鱼群和船只在点击时重新随机跳位。
  if (!preserveWorld) {
    surface.reset();
    ocean.reset?.();
    humans.reset(expedition.region.humanActivity);
    encounters.reset(
      expedition.region.bossKinds,
      expedition.region.bossHomes,
      expedition.region.bossInstances,
    );
    seedPopulation();
    seedPickups();
    avatar.userData.resetMotion?.();
  }
}
function startGame({ transition = false } = {}) {
  if (regionLoading) return;
  const fromMenu = mode === "menu";
  resetExpedition(fromMenu);
  setLanguageEnabled(false);
  const pose = followCameraPose();
  if (fromMenu && transition) {
    launchTransition = createLaunchTransition({
      camera,
      avatar,
      destination: position.clone(),
      length: player.length,
      cameraPosition: pose.position,
      cameraTarget: pose.target,
    });
    mode = "launching";
    $("menu").inert = true;
    $("hud").inert = true;
    document.body.style.setProperty("--launch-menu", "1");
    document.body.style.setProperty("--launch-hud", "0");
    document.body.classList.add("launching");
  } else {
    avatar.position.copy(position);
    avatar.scale.setScalar(player.length);
    avatar.rotation.set(pitch, yaw, 0, "YXZ");
    camera.position.copy(pose.position);
    lookTarget.copy(pose.target);
    camera.lookAt(lookTarget);
    mode = "playing";
  }
  capturePoint(captureStart);
  avatar.visible = true;
  $("menu").hidden = !launchTransition;
  $("overlay").hidden = true;
  $("hud").hidden = false;
  $("pause").hidden = false;
  $("pause").textContent = t("暂停");
  $("notification").hidden = false;
  audio.setRegion?.(expedition.region.id);
  audio.start();
  audio.reset?.();
  audio.setPaused(false);
  updateHud();
  updateSonar();
  if (!launchTransition) announceDeparture();
  canvas.focus({ preventScroll: true });
  lastTime = performance.now();
}
function announceDeparture() {
  notify(
    expedition.region.departureHint ||
      "这里是安全浅滩 · 穿过鱼群补给成长\n长到约4米，再探索外礁",
    6,
  );
}
function updateLaunch(roundDt) {
  const progress = launchTransition.advance(roundDt);
  lookTarget.copy(launchTransition.target);
  avatar.userData.animate?.(elapsed, 0.6 + progress * 0.3);
  document.body.style.setProperty(
    "--launch-menu",
    String(1 - THREE.MathUtils.smoothstep(progress, 0, 0.45)),
  );
  document.body.style.setProperty(
    "--launch-hud",
    String(THREE.MathUtils.smoothstep(progress, 0.65, 1)),
  );
  if (progress >= 1) {
    launchTransition = null;
    mode = "playing";
    $("menu").hidden = true;
    $("hud").inert = false;
    document.body.classList.remove("launching");
    resetInput();
    capturePoint(captureStart);
    updateSonar();
    announceDeparture();
  }
}
function showOverlay(kind) {
  if (["dead", "won", "timeup"].includes(kind)) {
    minion.reset();
    torpedoes.reset();
    resetTorpedoAim();
  }
  const returningFromRefuge = mode === "epilogue";
  delete document.body.dataset.epilogue;
  mode = kind;
  worldRenderDirty = true;
  $("sonar-panel").hidden = true;
  sonarMarkers.reset();
  sonarWave.reset();
  minimap.update({
    position,
    forward,
    spawn: expedition.region.spawn,
    contacts: [],
    sonarActive: false,
    world: activeWorld(),
    riverPaths: ocean.radarPaths,
  });
  document.body.classList.remove("sonar-active");
  audio.setPaused(kind !== "won");
  if (kind === "won" && !returningFromRefuge) audio.victory();
  resetInput();
  $("overlay").hidden = false;
  renderOverlay(kind);
  bestLength = Math.max(bestLength, player.length);
  try {
    localStorage.setItem("abyssal_best", String(bestLength));
  } catch {
    /* 存储不可用不影响本局。 */
  }
  $("resume").focus({ preventScroll: true });
}
function renderOverlay(kind) {
  const won = kind === "won",
    dead = kind === "dead",
    timeup = kind === "timeup";
  $("overlay-kicker").textContent = t(
    won
      ? "APEX OF THE ABYSS"
      : dead
        ? "THE OCEAN REMEMBERS"
        : timeup
          ? "EXPEDITION COMPLETE"
          : "EXPEDITION PAUSED",
  );
  $("overlay-title").textContent = t(
    won
      ? "深渊，已记住你的名字。"
      : dead
        ? "这次，海洋更胜一筹。"
        : timeup
          ? "这次远征，到此休整。"
          : "海洋在等你。",
  );
  $("overlay-body").textContent = t(
    won
      ? expedition.region.objective.completed
      : dead
        ? player.hunger <= 0
          ? "饥饿夺走了你的生命。长大后需要更大的猎物。"
          : activeBoss
            ? "主宰比冲刺更快。观察技能前摇、侧向闪避，并利用恢复期撤出领地。"
            : "保留一段冲刺体力，借助岩柱切断追击者的视线。"
        : timeup
          ? "30分钟探索已结束。本次未达成海域目标，可以再次出发。"
          : "远征已暂停，生存与技能计时已停止。",
  );
  const time = `${String(Math.floor(player.elapsed / 60)).padStart(2, "0")}:${String(Math.floor(player.elapsed % 60)).padStart(2, "0")}`;
  setMarkup(
    $("overlay-stats"),
    tr`<div><dt>体长</dt><dd>${player.length.toFixed(1)} <small>m</small></dd></div><div><dt>探索时长</dt><dd>${time}</dd></div><div><dt>捕食次数</dt><dd>${player.eaten}</dd></div><div><dt>击败领主</dt><dd>${player.bossesDefeated}</dd></div>`,
  );
  $("overlay-progress").hidden = won;
  $("overlay-region").textContent = tr`当前任务 · ${expedition.region.name}`;
  $("overlay-step").textContent = $("objective").textContent;
  $("overlay-help").hidden = won || dead || timeup;
  $("pause").hidden = won || dead || timeup;
  $("pause").textContent = t("继续探索");
  $("overlay-help").open = false;
  runRecords.showResult(player, expedition.region);
  const ability = getCharacter(player.characterId).active;
  $("overlay-skill").textContent =
    tr`${ability.name}：${ability.description} 激活起冷却${ability.cooldown}秒。`;
  $("overlay-rule").textContent = t(expedition.region.objective.summary);
  setMarkup(
    $("resume"),
    won || dead || timeup
      ? "再次潜入 <span>↗</span>"
      : "继续探索 <span>→</span>",
  );
  $("return-menu").hidden = false;
  $("visit-refuge").hidden = !(won && expedition.region.id === "mariana");
}
/** 通关后仅在底部避难所游览；计时、食物、敌人和成绩冻结，保留实体碰撞。 */
function visitRefuge() {
  if (mode !== "won" || !player.won || expedition.region.id !== "mariana")
    return;
  mode = "epilogue";
  document.body.dataset.epilogue = "true";
  feeding.reset();
  for (const burst of bursts) scene.remove(burst.mesh);
  bursts.length = 0;
  inkAbility = createInkState();
  minion.reset();
  torpedoes?.reset();
  resetTorpedoAim();
  effects.reset();
  frenzyEffect.reset();
  $("ink-overlay").style.opacity = "0";
  $("lure-flash").style.opacity = "0";
  $("damage").style.opacity = "0";
  $("target").hidden = true;
  $("notification").hidden = true;
  resetInput();
  $("overlay").hidden = true;
  $("pause").hidden = false;
  $("pause").textContent = t("返回结算");
  lastTime = performance.now();
  canvas.focus({ preventScroll: true });
}
/** 结束本局并恢复同一海域的首页，下一次出发仍沿用首页到追尾的转场。 */
function returnToMenu() {
  if (mode === "menu") return;
  resetExpedition();
  mode = "menu";
  avatar.visible = true;
  $("menu").hidden = false;
  $("menu").inert = false;
  $("hud").hidden = true;
  $("overlay").hidden = true;
  $("pause").hidden = true;
  $("target").hidden = true;
  $("notification").hidden = true;
  $("damage").style.opacity = "0";
  document.body.classList.remove("sonar-active");
  audio.setPaused(true);
  audio.reset?.();
  setLanguageEnabled(true);
  $("start").focus({ preventScroll: true });
  lastTime = performance.now();
}
function resumeGame() {
  if (mode === "paused") {
    mode = launchTransition ? "launching" : "playing";
    lastTime = performance.now();
    $("overlay").hidden = true;
    $("pause").textContent = t("暂停");
    audio.start();
    audio.setPaused(false);
    canvas.focus({ preventScroll: true });
  } else startGame();
}
function togglePause() {
  if (mode === "epilogue") return showOverlay("won");
  if (mode === "playing" || mode === "launching") showOverlay("paused");
  else if (mode === "paused") resumeGame();
}
function queryWorldSegment(a, b, radius = 0) {
  return castIndexedSegment(a, b, {
    staticColliders: ocean.colliders,
    dynamicColliders: [
      ...(ocean.barriers || []),
      ...surface.colliders,
      ...humans.colliders,
    ],
    radius,
  });
}
function blockedBetween(a, b) {
  return queryWorldSegment(a, b) !== null;
}
function playerFloorHeight(x, z) {
  const radius = bodyRadius(player.length);
  return floorAt(
    x,
    z,
    radius +
      Math.abs(forward.y) * Math.max(0, player.length * 0.42 - radius) +
      0.4,
  );
}
function resolvePlayerMotion(previous, merge = false) {
  const radius = bodyRadius(player.length);
  // 各海域共用静态地形粗筛；船只与人类每次读取当前碰撞体，不能进入静态缓存。
  const result = resolveIndexedMotion(previous, position, {
    staticColliders: ocean.colliders,
    dynamicColliders: [
      ...(ocean.barriers || []),
      ...surface.colliders,
      ...humans.colliders,
    ],
    radius,
    forward,
    length: player.length,
    floorHeight: playerFloorHeight,
    bounds: {
      minX: mode === "epilogue" ? -85 : activeWorld().minX + WORLD_EDGE_INSET,
      maxX: mode === "epilogue" ? 85 : activeWorld().maxX - WORLD_EDGE_INSET,
      minZ: mode === "epilogue" ? -540 : activeWorld().minZ + WORLD_EDGE_INSET,
      maxZ: mode === "epilogue" ? -360 : activeWorld().maxZ - WORLD_EDGE_INSET,
      minY: -activeWorld().maxDepth + radius,
      maxY:
        mode === "epilogue"
          ? -2660
          : surface.ceilingHeight
            ? surface.ceilingHeight(player.length, forward)
            : surface.airborne
              ? undefined
              : (surface.waterHeightAt?.(position.x, position.z, elapsed) ??
                  WORLD.surfaceY) -
                player.length * 0.15,
    },
  });
  position.copy(result.position);
  surface.applyCollision(result.contacts, position);
  // 领主拉扯后的第二次约束保留本帧首次碰撞，便于观察与回归验证。
  lastCollision =
    merge && lastCollision
      ? {
          ...result,
          contacts: [...lastCollision.contacts, ...result.contacts],
          blocked: lastCollision.blocked || result.blocked,
          recovered: lastCollision.recovered || result.recovered,
          stuck: lastCollision.stuck || result.stuck,
        }
      : result;
  return result;
}
/** 仆从复用世界粗筛和多球扫掠，独立约束海床、冰顶及动态船体，不穿墙追食。 */
function resolveMinionMotion(previous, desired, heading, length) {
  const r = bodyRadius(length);
  const clearance =
    r + Math.abs(heading.y) * Math.max(0, length * 0.42 - r) + 0.4;
  return resolveIndexedMotion(previous, desired, {
    staticColliders: ocean.colliders,
    dynamicColliders: [
      ...(ocean.barriers || []),
      ...surface.colliders,
      ...humans.colliders,
    ],
    radius: r,
    forward: heading,
    length,
    floorHeight: (x, z) => floorAt(x, z, clearance),
    bounds: {
      minX: activeWorld().minX + WORLD_EDGE_INSET,
      maxX: activeWorld().maxX - WORLD_EDGE_INSET,
      minZ: activeWorld().minZ + WORLD_EDGE_INSET,
      maxZ: activeWorld().maxZ - WORLD_EDGE_INSET,
      minY: -activeWorld().maxDepth + r,
      maxY:
        surface.ceilingHeight?.(length, heading) ?? WORLD.surfaceY - clearance,
    },
  });
}
function pushFromRocks(point, radius) {
  for (const rock of ocean.obstacles) {
    temp.set(point.x - rock.x, point.y - rock.y, point.z - rock.z);
    const distance = temp.length(),
      limit = rock.radius + radius;
    if (distance < limit && distance > 0.01)
      point.addScaledVector(temp, (limit - distance) / distance);
  }
}
// 判定遵循可见角色的转向，避免乌贼快速转向时逻辑朝向领先模型。
function capturePoint(out) {
  return (
    out
      // 乌贼默认外套膜领先，腕部在行进方向后侧；捕食范围仍与虎鲸相同。
      .set(
        0,
        0,
        player.length * 0.36 * (player.characterId === "squid" ? 1 : -1),
      )
      .applyQuaternion(avatar.quaternion)
      .add(position)
  );
}
function feedingMouth(out) {
  return avatar.userData.getFeedingMouth?.(out) ?? capturePoint(out);
}
const playerMovementStart = new THREE.Vector3();
const predatorFacing = new THREE.Vector3();
const playerFacing = new THREE.Vector3();
function updatePlayer(dt, roundDt) {
  playerMovementStart.copy(position);
  capturePoint(captureStart);
  const inputX =
    pointer.x + (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
  const inputY =
    (-pointer.y + (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0)) *
    (invertVertical ? -1 : 1);
  const wasAirborne = surface.airborne;
  const jet =
    player.characterId === "squid" &&
    inkStatus(inkAbility, player.elapsed).jet &&
    !wasAirborne;
  const boosting = tickVitals(player, dt, {
    boosting: !wasAirborne && !jet && (keys.has("Space") || touchBoost),
    roundDt,
    depth: -position.y,
  }).boosting;
  const movement = characterMovement(player.characterId, boosting || jet);
  if (wasAirborne || jet) groundRecovering = iceRecovering = false;
  if (!jet) {
    if (iceRecovering && surface.mode === "ice") {
      const recovered = stepIceSteering(
        { yaw, pitch },
        { x: inputX, y: inputY },
        movement,
        dt,
      );
      ({ yaw, pitch } = recovered);
      iceRecovering = recovered.recovering;
    } else if (groundRecovering) {
      const recovered = stepGroundSteering(
        { yaw, pitch },
        { x: inputX, y: inputY },
        movement,
        dt,
      );
      ({ yaw, pitch } = recovered);
      groundRecovering = recovered.recovering;
    } else if (surface.mode === "ice") {
      ({ yaw, pitch } = stepSteering(
        { yaw, pitch },
        { x: inputX, y: inputY },
        movement,
        dt,
      ));
    } else {
      ({ yaw, pitch } = stepSurfaceSteering(
        { yaw, pitch },
        { x: inputX, y: inputY },
        movement,
        dt,
        {
          positionY: position.y,
          length: player.length,
          surfaceY:
            surface.waterHeightAt?.(position.x, position.z, elapsed) ??
            WORLD.surfaceY,
          airborne: wasAirborne,
          reentering: waterMotion?.reentering ?? false,
          boosting,
          divingRequired: surface.divingRequired,
        },
      ));
    }
    forward.set(0, 0, -1).applyEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
  } else forward.copy(jetDirection);
  if (player.timedOut) return;
  surface.updateColliders(elapsed, position);
  const targetSpeed = wasAirborne
    ? speed
    : jet
      ? 72
      : boosting
        ? movement.sprintSpeed
        : keys.has("KeyK") || touchSlow
          ? PLAYER_MOVEMENT.slowSpeed
          : PLAYER_MOVEMENT.cruiseSpeed;
  speed = THREE.MathUtils.damp(speed, targetSpeed, jet ? 18 : 3, dt);
  const previousPosition = position.clone();
  // 离水后由弹道积分负责全部位移，空格不再产生额外向上推力。
  if (!wasAirborne) position.addScaledVector(forward, speed * dt);
  waterMotion = surface.move(dt, {
    position,
    previousPosition,
    forward,
    speed,
    boosting,
    length: player.length,
    now: elapsed,
  });
  const windLaunch = ocean.weather?.onMovement(
    player,
    previousPosition,
    position,
    forward,
    { now: elapsed, dt, airborne: surface.airborne },
  );
  if (windLaunch) surface.launchImpulse(windLaunch, position, player.length);
  const visualPitch = waterMotion?.posePitch ?? pitch;
  const visualYaw = waterMotion?.poseYaw ?? yaw;
  rotation.set(
    visualPitch,
    visualYaw,
    -Clamp(inputX, -1, 1) * (wasAirborne ? 0.09 : 0.24),
  );
  if (ocean.weather?.lifted) rotation.z += Math.sin(elapsed * 8) * 0.5;
  avatar.quaternion.slerp(
    new THREE.Quaternion().setFromEuler(rotation),
    1 - Math.exp(-8 * dt),
  );
  if (surface.airborne)
    forward
      .set(0, 0, -1)
      .applyEuler(new THREE.Euler(visualPitch, visualYaw, 0, "YXZ"));
  humans.onMovement(player, previousPosition, position, forward, {
    speed,
    now: player.elapsed,
  });
  surface.onMovement(player, previousPosition, position, forward, {
    speed,
    now: elapsed,
  });
  const desiredY = position.y;
  const movementCollision = resolvePlayerMotion(previousPosition);
  if (mode !== "epilogue") {
    const jet = ocean.deepVents?.onMovement(
      previousPosition,
      position,
      elapsed,
    );
    if (jet?.warning) notify("热流即将喷发 · 绕开橙色喷口", 3);
    if (jet?.damage && takeDamage(player, jet.damage)) {
      audio.hit();
      hitFlash = 0.65;
      effects.hurt(position, player.length);
      notify("灼热喷流 · 横向游出热流", 2.5);
    }
  }

  if (
    needsGroundRecovery(pitch, {
      desiredY,
      position,
      floorY: playerFloorHeight(position.x, position.z),
      contacts: movementCollision.contacts,
      airborne: surface.airborne,
      jet,
    })
  )
    groundRecovering = true;
  if (
    surface.mode === "ice" &&
    needsIceRecovery(pitch, {
      desiredY,
      position,
      ceilingY: surface.ceilingHeight(player.length, forward),
      contacts: movementCollision.contacts,
      jet,
    })
  )
    iceRecovering = true;
  humans.defense.recordMovement(previousPosition, position);
  avatar.position.copy(position);
  avatar.scale.setScalar(player.length);
  avatar.userData.animate?.(elapsed, jet ? 2.8 : boosting ? 2.2 : 0.9, {
    dt,
    speed,
    boosting,
    jet,
    turn: Clamp(inputX, -1, 1),
    pitchInput: Clamp(inputY, -1, 1),
    airborne: surface.airborne,
  });
  avatar.visible = true;
  avatar.position.y +=
    player.invulnerable > 0 ? Math.sin(elapsed * 35) * 0.05 : 0;
  playerLight.position.copy(position).add(new THREE.Vector3(0, 4, -3));
  movementLabel = surface.airborne
    ? "跃出水面"
    : jet
      ? "喷射逃逸"
      : boosting
        ? "冲刺"
        : player.exhausted
          ? "体力恢复中"
          : targetSpeed === 5
            ? "慢游"
            : "巡游";
  $("movement-mode").textContent = t(movementLabel);
  if ((boosting || jet) && Math.random() < 0.6) burst(position, 1);
  // 饥饿先由规则模块处理，熔岩只在贴近深海海底时灼伤。
  if (
    expedition.region.seabedHeat &&
    position.z < -680 &&
    position.y < activeSeabedHeight(position.x, position.z) + 4.5 &&
    takeDamage(player, 12)
  ) {
    hitFlash = 0.55;
    effects.hurt(position, player.length);
    notify("热液灼伤 · 离开海床", 2);
    audio.hit();
  }
}
function burst(point, count = 8) {
  for (let i = 0; i < count; i++) {
    if (bursts.length > 90) break;
    const mesh = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    mesh.position.copy(point);
    scene.add(mesh);
    bursts.push({
      mesh,
      life: random(0.5, 1.5),
      velocity: new THREE.Vector3(random(-2, 2), random(1, 3), random(-2, 2)),
    });
  }
}
function eatEntity(entity, mouth, previousPrey = entity.mesh.position, dt = 0) {
  const { species, mesh } = entity;
  // 育幼区小鱼适度放宽接触范围，让幼年玩家穿过鱼群即可连贯进食。
  const learning =
    player.length < 4.5 && species.length < 1 && isNursery(position);
  const activeFrenzy =
    player.buffs.frenzy > 0 &&
    !surface.airborne &&
    mouth.y < WORLD.surfaceY &&
    mesh.position.y < WORLD.surfaceY;
  const biteRange = preyCaptureRadius(
    player.length,
    species.length,
    learning,
    activeFrenzy,
  );
  if (entity.hiddenFor > 0 || !canEat(player, species.length)) return false;
  // 狂食吸引仅作用于水下可食普通生物，先筛距离，再检查遮挡。
  if (activeFrenzy) {
    const distance = mouth.distanceTo(mesh.position);
    const pull = frenzyPullDistance(
      distance,
      biteRange,
      player.length,
      dt,
      speed,
    );
    if (pull > 0 && !blockedBetween(mouth, mesh.position))
      mesh.position.lerp(mouth, pull / distance);
  }
  // 末帧已接触时保留原判定；两端皆在外才补查同帧相对轨迹，不增加吞食半径。
  const direct = mouth.distanceToSquared(mesh.position) < biteRange * biteRange;
  const contact = direct
    ? 1
    : sweptCaptureFraction(
        captureStart,
        mouth,
        previousPrey,
        mesh.position,
        biteRange,
      );
  if (contact === null) return false;
  captureContact.copy(captureStart).lerp(mouth, contact);
  preyContact.copy(previousPrey).lerp(mesh.position, contact);
  if (
    (!direct && blockedBetween(captureStart, mouth)) ||
    blockedBetween(captureContact, preyContact) ||
    blockedBetween(mouth, mesh.position) ||
    !consumePrey(player, species)
  )
    return false;
  audio.eatFish(species.length);
  avatar.userData.triggerFeed?.();
  effects.bite(captureContact, forward, player.length);
  entity.hiddenFor = species.schoolSize > 1 ? 18 : 28;
  feeding.start(mesh, species.length);
  resetTorpedoTarget(entity);
  entity.chase = 0;
  entity.flight = null;
  mesh.userData.setGliding?.(false);
  notify(
    message`捕食 ${species.label} · ${player.lastMeal.healed > 0 ? message`生命 +${Math.round(player.lastMeal.healed)} · ` : ""}体长 ${player.length.toFixed(1)} m`,
    1.7,
  );
  return true;
}
function updateSchools() {
  for (const school of schools) {
    // 基础鱼群与缓游礁鱼常驻育幼浅滩，出海后再返航也有稳定补给。
    if (
      school.habitat.cityResident ||
      school.habitat.fixedHabitat ||
      school.habitat.nurseryResident
    )
      continue;
    if (player.elapsed < school.nextMigration) continue;
    school.nextMigration = player.elapsed + random(22, 38);
    if (
      school.center.distanceTo(position) <
        speciesVisibilityDistance(school.species, highQuality) + 18 ||
      !sharesHabitat(
        school.habitat,
        position,
        school.habitat === school.species ? 12 : 0,
      ) ||
      school.members.some((entity) => entity.hiddenFor > 0)
    )
      continue;
    const next = habitatPosition(school.habitat, {
      heightAt: activeSeabedHeight,
      colliders: ocean.colliders,
      playerPosition: position,
      forward,
      near: true,
      highQuality,
      padding: 5,
    });
    if (!next) continue;
    const placements = school.members.map((entity) =>
      habitatPosition(school.habitat, {
        heightAt: activeSeabedHeight,
        colliders: ocean.colliders,
        anchor: next.clone().add(entity.slot),
      }),
    );
    if (placements.some((point) => !point)) continue;
    school.center.copy(next);
    school.members.forEach((entity, index) => {
      entity.mesh.position.copy(placements[index]);
      entity.slot.copy(placements[index]).sub(next);
      entity.velocity.set(0, 0, 0);
    });
  }
}
function updateEntities(dt) {
  updateSchools();
  threat = null;
  let bestThreat = Infinity;
  const mouth = capturePoint(entityMouth);
  for (const entity of entities) {
    previousPreyPosition.copy(entity.mesh.position);
    const { species, mesh } = entity;
    entity.cooldown = Math.max(0, entity.cooldown - dt);
    if (entity.telegraph) entity.telegraph.visible = false;
    if (entity.hiddenFor > 0) {
      if (!feeding.has(mesh) && !minion.feeding.has(mesh)) mesh.visible = false;
      entity.hiddenFor -= dt;
      if (entity.hiddenFor <= 0) {
        mesh.position.copy(
          entity.school
            ? spawnPosition(
                entity.school.habitat,
                false,
                entity.school.center.clone().add(entity.slot),
                entity.populationIndex,
              )
            : spawnPosition(species, true, null, entity.populationIndex),
        );
        resetTorpedoTarget(entity);
        mesh.visible = true;
        entity.hunter = createHunterState(species, entity.seed + elapsed);
      }
      continue;
    }
    if (stepFlyingFish(entity, dt, player.elapsed, position)) {
      mesh.visible = mesh.position.distanceTo(position) < 180;
      mesh.quaternion.setFromUnitVectors(modelForward, entity.velocity);
      mesh.userData.animate?.(elapsed + entity.seed, 1.4);
      eatEntity(entity, mouth, previousPreyPosition, dt);
      continue;
    }
    if (entity.disorientedUntil > player.elapsed) {
      mesh.visible = mesh.position.distanceTo(position) < 180;
      mesh.userData.animate?.(elapsed + entity.seed, 0.05);
      if (entity.telegraph) entity.telegraph.visible = false;
      eatEntity(entity, mouth, previousPreyPosition, dt);
      continue;
    }
    entity.mesh.userData.disoriented = false;
    const distance = mesh.position.distanceTo(position),
      edible = canEat(player, species.length);
    mesh.visible = distance < speciesVisibilityDistance(species, highQuality);
    const allowedHunt = canPredatorHunt(
      species,
      entity.populationIndex,
      mesh.position,
      position,
    );
    const predator =
      species.predator &&
      canPredatorRetaliate(player.length, species.length) &&
      allowedHunt;
    if (!predator) entity.chase = 0;
    const nurseryResident =
      entity.school?.habitat.nurseryResident ?? species.nurseryResident;
    const learning =
      player.length < 4.5 && species.length < 1 && isNursery(position);
    const territory = predatorTerritory(species, entity.populationIndex);
    // 视线只服务猎手交互；小鱼捕食在eatEntity中独立检查，避免新增鱼群重复射线开销。
    const sight =
      allowedHunt &&
      ((predator &&
        (entity.chase > 0 ||
          distance <
            Math.max(
              52,
              species.length * 3,
              species.length * 0.43 + player.length * 0.2,
            ))) ||
        (species.kind === "octopus" && edible && distance < 26)) &&
      !blockedBetween(mesh.position, position);
    // 章鱼即使可被当前角色捕食，也会在近距威胁下防御喷墨。
    const defensiveInk =
      species.kind === "octopus" &&
      edible &&
      allowedHunt &&
      sight &&
      distance < 26;
    let moveSpeed = species.speed || 5;
    const direction = entityDirection.set(0, 0, 0);
    if (
      predator &&
      -position.y >= species.depthMin - 20 &&
      distance < Math.max(52, species.length * 3) &&
      sight
    )
      entity.chase = 4;
    else entity.chase = Math.max(0, entity.chase - dt);
    if (predator && entity.chase > 0 && distance < 115 + species.length) {
      direction.copy(position);
      // 近似体型的猎手迂回侧后方；技能爆发仍保留既有锁向前摇与可躲避速度。
      if (edible && distance < 80) {
        playerFacing.set(0, 0, -1).applyQuaternion(avatar.quaternion);
        const flank = entity.seed % 2 < 1 ? -1 : 1;
        direction.addScaledVector(playerFacing, -player.length * 0.28);
        direction.x += playerFacing.z * player.length * 0.24 * flank;
        direction.z -= playerFacing.x * player.length * 0.24 * flank;
      }
      direction.sub(mesh.position).normalize();
      moveSpeed =
        species.chaseSpeed || Math.min(25, Math.max(15, species.speed || 16));
      const rank = distance / (species.length * 0.35 + 4);
      if (rank < bestThreat) {
        bestThreat = rank;
        threat = { entity, distance };
      }
    } else if (
      edible &&
      (distance < (learning ? 3.5 : nurseryResident ? 6 : 12) ||
        defensiveInk) &&
      entity.cooldown <= 0
    ) {
      direction.copy(mesh.position).sub(position).normalize();
      moveSpeed =
        species.escapeSpeed ??
        Math.min(10, moveSpeed + (nurseryResident ? 0.8 : 1.5));
    } else if (entity.school) {
      const target = entityTarget
        .copy(entity.school.center)
        .add(entity.slot)
        .add(
          entityOffset.set(
            Math.sin(elapsed * 0.2 + entity.school.seed) *
              (learning || nurseryResident ? 2.4 : 8),
            Math.sin(elapsed * 0.35 + entity.seed) *
              (learning || nurseryResident ? 0.45 : 1.5),
            Math.cos(elapsed * 0.2 + entity.school.seed) *
              (learning || nurseryResident ? 2.4 : 8),
          ),
        );
      direction.copy(target).sub(mesh.position).normalize();
      moveSpeed = species.speed * 0.75;
    } else {
      entity.heading += Math.sin(elapsed * 0.18 + entity.seed) * dt * 0.17;
      direction.set(
        Math.sin(entity.heading),
        Math.sin(elapsed * 0.32 + entity.seed) * 0.08,
        -Math.cos(entity.heading),
      );
    }
    if (learning) moveSpeed = Math.min(moveSpeed, 2.6);
    // 接近领地边缘时提前转回，最终钳制仅防止高速技能跨进安全区。
    if (territory) {
      const margin = 24;
      direction.x +=
        Clamp((territory.minX + margin - mesh.position.x) / margin, 0, 1) * 3;
      direction.x -=
        Clamp((mesh.position.x - territory.maxX + margin) / margin, 0, 1) * 3;
      direction.z +=
        Clamp((territory.minZ + margin - mesh.position.z) / margin, 0, 1) * 3;
      direction.z -=
        Clamp((mesh.position.z - territory.maxZ + margin) / margin, 0, 1) * 3;
    }
    const previousPhase = entity.hunter.phase;
    const hunter = tickHunter(entity.hunter, dt, {
      hunting: (predator && entity.chase > 0) || defensiveInk,
      distance,
      lineOfSight: sight,
      playerAlive: !player.dead && !player.won,
    });
    if (predator && entity.chase > 0) moveSpeed *= hunter.speedMultiplier;
    else if (defensiveInk)
      moveSpeed =
        hunter.phase === "active"
          ? hunter.ability.activeSpeed
          : moveSpeed * hunter.speedMultiplier;
    if (hunter.phase === "windup" && previousPhase !== "windup") {
      notify(hunter.tell, hunter.phaseDuration + 1);
      audio.hunter?.(species.kind);
      entity.attackHeading = direction.clone();
    }
    if (entity.telegraph && ["windup", "active"].includes(hunter.phase)) {
      entity.telegraph.visible = mesh.visible;
      entity.telegraph.position.copy(mesh.position);
      if (hunter.type === "shock")
        entity.telegraph.rotation.set(-Math.PI / 2, 0, 0);
      else entity.telegraph.lookAt(camera.position);
      const phase = hunter.timer / hunter.phaseDuration;
      entity.telegraph.scale.setScalar(
        hunter.type === "shock"
          ? hunter.effectRadius
          : species.length *
              (hunter.phase === "windup" ? 0.38 + (1 - phase) * 0.2 : 0.38),
      );
      entity.telegraph.material.opacity =
        hunter.phase === "windup" ? 0.35 + phase * 0.55 : 0.2;
    }
    if (hunter.justTriggered) {
      if (hunter.type === "shock") {
        effects.electricDischarge(mesh.position, hunter.effectRadius);
        if (
          distance <= hunter.effectRadius &&
          sight &&
          takeDamage(player, 18)
        ) {
          effects.hurt(position, player.length);
          hitFlash = 0.5;
          audio.hit();
          notify("电击命中 · 保持距离", 2.5);
        }
      } else if (hunter.type === "ink") {
        effects.spawnInk(
          mesh.position,
          hunter.effectRadius,
          hunter.effectDuration,
        );
        notify("章鱼喷墨 · 横向游出黑色云团", 2.5);
      } else if (hunter.type === "lure") {
        effects.flash(mesh.position, 0xc4ddff, 10);
        if (distance < hunter.effectRadius && sight)
          lureFlash = hunter.effectDuration;
      } else if (hunter.type === "heavy_bite") {
        entity.cooldown = 0;
        effects.bite(
          mesh.position
            .clone()
            .addScaledVector(direction, species.length * 0.35),
          direction,
          species.length,
        );
      }
    }
    // 白鲨爆发时只缓慢修正方向，预警后的横向闪避确实能够躲开。
    if (
      hunter.type === "burst" &&
      hunter.phase === "active" &&
      entity.attackHeading
    ) {
      entity.attackHeading.lerp(direction, Math.min(1, dt * 0.65)).normalize();
      direction.copy(entity.attackHeading);
      if (Math.random() < dt * 18) burst(mesh.position, 1);
    }
    const schoolLayer = entity.school?.habitat;
    const layeredSchool = schoolLayer && schoolLayer !== species;
    const habitat =
      entity.chase > 0 && species.depthMin < 100
        ? { ...species, depthMin: Math.max(5, species.depthMin - 10) }
        : schoolLayer || species;
    const residentDirection = steerResidentHabitat(
      species,
      entity.populationIndex,
      mesh.position,
      direction,
    );
    direction.set(
      residentDirection.x,
      residentDirection.y,
      residentDirection.z,
    );
    const steered = steerWithinHabitat(
      mesh.position,
      direction,
      habitat,
      activeSeabedHeight,
    );
    direction.set(steered.x, steered.y, steered.z);
    if (entity.chase <= 0) entity.heading = Math.atan2(steered.x, -steered.z);
    // 捕食者会绕行岩柱；视线中断后追击记忆逐渐消失。
    for (const rock of ocean.obstacles) {
      temp.set(
        mesh.position.x - rock.x,
        mesh.position.y - rock.y,
        mesh.position.z - rock.z,
      );
      const d = temp.length(),
        safe = rock.radius + species.length * 0.25 + 4;
      if (d < safe && d > 0.01)
        direction.addScaledVector(temp.normalize(), ((safe - d) / safe) * 3);
    }
    direction.normalize();
    previousHabitatPosition.copy(mesh.position);
    if (species.benthic) direction.y = 0;
    entity.velocity.lerp(direction, Math.min(1, dt * 2));
    if (species.benthic) entity.velocity.y = 0;
    mesh.position.addScaledVector(entity.velocity, moveSpeed * dt);
    if (layeredSchool) pushFromRocks(mesh.position, species.length * 0.12);
    let floor = floorAt(
      mesh.position.x,
      mesh.position.z,
      species.benthic ? species.floorOffset : species.length * 0.28 + 2,
    );
    mesh.position.x = Clamp(
      mesh.position.x,
      activeWorld().minX + 8,
      activeWorld().maxX - 8,
    );
    mesh.position.z = Clamp(
      mesh.position.z,
      activeWorld().minZ + 8,
      activeWorld().maxZ - 8,
    );
    // 深海生物遇到浅坡时退回可容纳的水层，不能被海床一路推到浅滩。
    if (
      (habitat.depthMin >= 100 || layeredSchool) &&
      floor > -habitat.depthMin
    ) {
      mesh.position.copy(previousHabitatPosition);
      floor = floorAt(
        mesh.position.x,
        mesh.position.z,
        species.length * 0.28 + 2,
      );
      entity.heading += Math.PI * 0.6;
      entity.velocity.z = -Math.abs(entity.velocity.z);
    } else {
      mesh.position.y = Clamp(
        mesh.position.y,
        floor,
        -Math.max(
          species.kind === "flying_fish" ? 1 : 4,
          species.length * 0.25,
        ),
      );
      if (habitat.depthMin >= 100 || layeredSchool)
        mesh.position.y = Math.min(mesh.position.y, -habitat.depthMin);
    }
    if (entity.chase <= 0) {
      const desired = Clamp(
        mesh.position.y,
        -(habitat.depthMax || 270),
        -(habitat.depthMin || 5),
      );
      // 固定水层的中型鱼不能被追逐或地形挤回浅滩，普通鱼仍保留平滑回游。
      mesh.position.y = layeredSchool
        ? Math.max(floor, desired)
        : THREE.MathUtils.damp(
            mesh.position.y,
            Math.max(floor, desired),
            1,
            dt,
          );
    }
    if (layeredSchool) {
      // 水层钳制可能将刚推出岩石的鱼再次压入岩面；回退一次，避免反复投影抖动。
      const overlapsRock = ocean.obstacles.some(
        (rock) =>
          (mesh.position.x - rock.x) ** 2 +
            (mesh.position.y - rock.y) ** 2 +
            (mesh.position.z - rock.z) ** 2 <
          (rock.radius + species.length * 0.12) ** 2 - 1e-8,
      );
      if (overlapsRock) {
        mesh.position.copy(previousHabitatPosition);
        entity.heading += Math.PI * 0.6;
        entity.velocity.multiplyScalar(-1);
      }
    } else pushFromRocks(mesh.position, species.length * 0.12);
    constrainPredatorTerritory(
      species,
      entity.populationIndex,
      mesh.position,
      entity.velocity,
    );
    const navigationColliders =
      ocean.navigationColliders || ocean.city?.colliders;
    if (navigationColliders) {
      // 地图按能力提供真实静态导航体；未启用的海域保留原有礁石导航。
      const contact = resolveCreatureMotion(
        previousHabitatPosition,
        mesh.position,
        entity.velocity,
        habitat,
        {
          colliders: navigationColliders,
          heightAt: activeSeabedHeight,
          territory,
        },
      );
      if (contact) {
        mesh.position.copy(contact.position);
        if (contact.blocked) {
          entity.velocity.copy(contact.direction);
          entity.heading = Math.atan2(
            contact.direction.x,
            -contact.direction.z,
          );
        }
      }
    }
    if (species.benthic) {
      const floorPoint =
        activeSeabedHeight(mesh.position.x, mesh.position.z) +
        (species.floorOffset ?? 0);
      mesh.position.y = floorPoint;
      if (
        floorPoint > -habitat.depthMin ||
        floorPoint < -habitat.depthMax ||
        blockedBetween(
          previousHabitatPosition,
          mesh.position,
          species.length * 0.15,
        )
      ) {
        mesh.position.copy(previousHabitatPosition);
        entity.heading += Math.PI * 0.6;
        entity.velocity.multiplyScalar(-1);
      }
    }
    mesh.quaternion.slerp(
      entityOrientation.setFromUnitVectors(
        modelForward,
        entityUnitVelocity.copy(entity.velocity).normalize(),
      ),
      Math.min(1, dt * 3),
    );
    if (distance < 180) {
      mesh.userData.setHunterPhase?.(hunter.phase);
      mesh.userData.animate?.(elapsed + entity.seed, moveSpeed / 6);
    }
    if (
      !eatEntity(entity, mouth, previousPreyPosition, dt) &&
      predator &&
      sight &&
      entity.cooldown <= 0 &&
      predatorBiteContact({
        previousPredator: previousPreyPosition,
        predator: mesh.position,
        predatorForward: predatorFacing
          .set(0, 0, -1)
          .applyQuaternion(mesh.quaternion),
        predatorLength: species.length,
        previousPlayer: playerMovementStart,
        player: position,
        playerForward: playerFacing
          .set(0, 0, -1)
          .applyQuaternion(avatar.quaternion),
        playerLength: player.length,
        edible,
      })
    ) {
      if (
        takeDamage(
          player,
          (species.damage || (species.length > 20 ? 48 : 28)) *
            hunter.damageMultiplier,
        )
      ) {
        audio.hit();
        hitFlash = 0.85;
        effects.hurt(position, player.length);
        effects.bite(position, direction, species.length);
        burst(position, 8);
        notify(message`${species.label} 咬伤！冲刺脱离攻击范围`, 2);
        position.addScaledVector(direction, 5);
      }
      entity.cooldown = 2.2;
    }
    // 只在玩家已进入合法水层时补充附近猎手，远处生成点仍在可见半径之外。
    if (
      !entity.school &&
      !(species.residentRadius > 0) &&
      distance > 260 &&
      sharesHabitat(species, position) &&
      Math.random() < dt * 0.055
    ) {
      const next = habitatPosition(species, {
        heightAt: activeSeabedHeight,
        colliders: ocean.colliders,
        playerPosition: position,
        forward,
        near: true,
        highQuality,
        populationIndex: entity.populationIndex,
      });
      if (next) mesh.position.copy(next);
    }
  }
}
function updatePickups(dt) {
  for (const pickup of pickups) {
    if (pickup.cooldown > 0) {
      pickup.cooldown -= dt;
      pickup.mesh.visible = false;
      if (pickup.cooldown <= 0) pickup.mesh.visible = true;
      continue;
    }
    pickup.mesh.userData.core.rotation.y = elapsed * 0.8;
    const pickupDistance = pickup.mesh.position.distanceTo(position);
    pickup.mesh.visible = pickupDistance < 150;
    pickup.mesh.userData.label.visible = pickupDistance < 75;
    pickup.mesh.position.y = pickup.baseY + Math.sin(elapsed * 1.5) * 0.6;
    if (
      pickup.mesh.position.distanceTo(position) <
      player.length * 0.28 + 1.8
    ) {
      collectPickup(player, pickup.kind);
      pickup.cooldown = 45;
      pickup.mesh.visible = false;
      audio.pickup(pickup.kind);
      notify(
        message`${REWARDS[pickup.kind].symbol} ${REWARDS[pickup.kind].name} · ${REWARDS[pickup.kind].effect}`,
      );
      burst(pickup.mesh.position, 15);
    }
  }
}
function followCameraPose() {
  const ratio = player.length / 6;
  // 幼年镜头按体型拉近；桌面端再轻微缩短距离，触屏维持原有视野。
  const juvenileRatio = Clamp(ratio, 0.4, 1);
  const closeView = THREE.MathUtils.lerp(
    0.88,
    1,
    Clamp((player.length - 3) / 3, 0, 1),
  );
  const offset = new THREE.Vector3(
    0,
    4.8 * juvenileRatio + ratio * 1.4,
    (13 * juvenileRatio + ratio * 4) * closeView,
  )
    .multiplyScalar(touchPointer.matches ? 1 : 0.9)
    .applyEuler(
      new THREE.Euler((waterMotion?.posePitch ?? pitch) * 0.35, yaw, 0, "YXZ"),
    );
  const desired = position.clone().add(offset);
  desired.y = Math.max(desired.y, floorAt(desired.x, desired.z, 2));
  shortenCamera(desired);
  return {
    position: desired,
    target: position
      .clone()
      .addScaledVector(forward, 9 * juvenileRatio + ratio * 2)
      .add(new THREE.Vector3(0, 1.1, 0)),
  };
}
function shortenCamera(point) {
  const hit = queryWorldSegment(position, point, 0.6);
  if (hit)
    point
      .copy(hit.point)
      .addScaledVector(new THREE.Vector3().copy(hit.normal), 0.04);
}
function updateCamera(dt) {
  const desired = followCameraPose();
  camera.position.lerp(desired.position, 1 - Math.exp(-3.5 * dt));
  shortenCamera(camera.position);
  lookTarget.lerp(desired.target, 1 - Math.exp(-5 * dt));
  camera.lookAt(lookTarget);
  camera.fov = THREE.MathUtils.damp(camera.fov, speed > 18 ? 69 : 60, 2.5, dt);
  camera.updateProjectionMatrix();
}
function atmosphere(dt) {
  const river = expedition.region.surfaceMode === "river";
  const depth = -position.y;
  const blend = Clamp((depth - 25) / 350, 0, 1);
  const night = expedition.region.id === "atlantis";
  const storm = expedition.region.id === "bermuda";
  const trench = expedition.region.id === "mariana";
  const city = night ? cityLightBlend(position) : 0;
  const color = new THREE.Color(night ? "#103847" : "#155568").lerp(
    new THREE.Color(night ? "#040f1b" : "#030e1c"),
    blend,
  );
  if (night) color.lerp(new THREE.Color("#174652"), city * 0.72);
  const ice = expedition.region.surfaceMode === "ice";
  const aboveWater = !ice && camera.position.y > WORLD.surfaceY;
  if (aboveWater) color.set(night ? "#060d20" : "#a0c7d1");
  if (storm)
    color
      .set(aboveWater ? "#596970" : "#23434d")
      .lerp(new THREE.Color("#081a24"), aboveWater ? 0 : blend * 0.75);
  if (storm && ocean.weather?.flash)
    color.lerp(
      new THREE.Color("#91afbd"),
      ocean.weather.flash * (aboveWater ? 0.55 : 0.14),
    );
  document.body.classList.toggle("above-water", aboveWater);
  scene.background.lerp(color, Math.min(1, dt * (aboveWater ? 10 : 3)));
  scene.fog.color.copy(scene.background);
  scene.fog.density =
    (aboveWater
      ? night
        ? 0.00075
        : 0.0018
      : night
        ? 0.006 + blend * 0.001 - city * 0.0053
        : 0.008 + blend * 0.003) + (aboveWater ? 0 : effects.ink * 0.115);
  if (storm)
    scene.fog.density =
      (aboveWater ? 0.0028 : 0.0065 - blend * 0.0023) +
      (aboveWater ? 0 : effects.ink * 0.115);
  if (trench) {
    const deep = Clamp(depth / 2200, 0, 1);
    const refuge =
      depth > 2550
        ? 1 -
          Clamp(
            Math.hypot(
              position.x - MARIANA_REFUGE.x,
              position.y - MARIANA_REFUGE.y,
              position.z - MARIANA_REFUGE.z,
            ) / 190,
            0,
            1,
          )
        : 0;
    color
      .set(aboveWater ? "#aac4cb" : "#103845")
      .lerp(new THREE.Color("#0b142c"), aboveWater ? 0 : deep);
    color.lerp(new THREE.Color("#354453"), refuge * 0.5);
    scene.background.lerp(color, Math.min(1, dt * 3));
    scene.fog.color.copy(scene.background);
    scene.fog.density =
      (aboveWater ? 0.0013 : 0.0027 + deep * 0.0005) +
      (aboveWater ? 0 : effects.ink * 0.115);
  }
  if (ice) {
    color
      .set("#163442")
      .lerp(new THREE.Color("#111c32"), Clamp(depth / 850, 0, 1));
    scene.background.lerp(color, Math.min(1, dt * 3));
    scene.fog.color.copy(scene.background);
    scene.fog.density = 0.0042 + effects.ink * 0.115;
  }
  if (river) {
    color
      .set(aboveWater ? "#b9cdb6" : "#506c48")
      .lerp(new THREE.Color("#192e27"), aboveWater ? 0 : blend * 0.65);
    scene.background.lerp(color, Math.min(1, dt * 3));
    scene.fog.color.copy(scene.background);
    scene.fog.density =
      (aboveWater ? 0.0018 : 0.006 + blend * 0.001) +
      (aboveWater ? 0 : effects.ink * 0.115);
  }
  if (!aboveWater && effects.ink > 0.01) {
    scene.fog.color.lerp(new THREE.Color("#111120"), effects.ink);
    scene.background.lerp(new THREE.Color("#111120"), effects.ink);
  }
  ambient.color.set(night ? 0x95c3eb : 0xc5e5ef);
  ambient.groundColor.set(night ? 0x243842 : 0x3d463e);
  if (night && !aboveWater) {
    ambient.color.lerp(new THREE.Color("#f1e3c1"), city * 0.72);
    ambient.groundColor.lerp(new THREE.Color("#718d8b"), city * 0.85);
  }
  ambient.intensity = night
    ? aboveWater
      ? 0.7
      : 1.0 - blend * 0.58 + city * 2.5
    : aboveWater
      ? 1.6
      : 1.35 - blend * 0.48;
  sun.color.set(night ? 0xc0d6ff : 0xfff2d6);
  if (night && !aboveWater)
    sun.color.lerp(new THREE.Color("#ffe2ad"), city * 0.62);
  sun.intensity = night
    ? aboveWater
      ? 1.15
      : 1.25 - blend * 0.9 + city * 1.1
    : aboveWater
      ? 3.0
      : 2.7 - blend * 2.45;
  if (storm) {
    ambient.color.set(0xa1bdc5);
    ambient.groundColor.set(0x334850);
    ambient.intensity = aboveWater ? 1.05 : 1.3 - blend * 0.35;
    sun.color.set(0xb8ced7);
    sun.intensity =
      (aboveWater ? 1.25 : 1.5 - blend * 0.9) +
      (ocean.weather?.flash || 0) * 0.7;
  }
  if (trench && aboveWater) {
    ambient.color.set(0xb6c9d4);
    ambient.intensity = 1.6;
    sun.color.set(0xc5d5e0);
    sun.intensity = 1.3;
  }
  if (trench && !aboveWater) {
    ambient.color.set(0x9cbbd9);
    ambient.groundColor.set(0x394761);
    ambient.intensity = 1.45 - Clamp(depth / 2000, 0, 1) * 0.32;
    sun.color.set(0xb3cbdc);
    sun.intensity = 0.8 - Clamp(depth / 900, 0, 1) * 0.58;
  }
  if (river) {
    ambient.color.set(0xe0dfb9);
    ambient.groundColor.set(0x596444);
    ambient.intensity = aboveWater ? 1.75 : 1.65 - blend * 0.3;
    sun.color.set(0xffe2a0);
    sun.intensity = aboveWater ? 3.3 : 2.1 - blend * 1.1;
  }
  rim.intensity = night ? 0.55 + city * 0.55 : 0.85 - blend * 0.35;
  if (night) sun.position.copy(position).addScaledVector(MOON_DIRECTION, 140);
  else sun.position.set(position.x - 50, position.y + 105, position.z + 50);
  sun.target.position.copy(position);
  sun.castShadow = highQuality && depth < 100;
  playerLight.intensity = 7 + blend * 21;
  if (ice) {
    ambient.color.set(0xa1bdcf);
    ambient.groundColor.set(0x33415a);
    ambient.intensity = 1.65 - blend * 0.28;
    sun.color.set(0x9db5c6);
    sun.intensity = 0.65;
    sun.castShadow = false;
    rim.intensity = 0.65;
    playerLight.intensity = 12;
  }
}

function resetTorpedoAim() {
  aimPreview = null;
  aimPreviewAt = -Infinity;
  $("torpedo-aim").hidden = $("torpedo-aim-point").hidden = true;
  $("reticle").classList.remove("aim-assisted", "aim-ineligible");
}

function updateHud() {
  const aiming =
    player.characterId === "mechanical_shark" &&
    mode === "playing" &&
    mechanicalUnderwater();
  if (
    aiming &&
    (player.elapsed >= aimPreviewAt || player.elapsed < aimPreviewAt - 0.11)
  ) {
    avatar.userData.getTorpedoMuzzle?.(aimOrigin);
    aimPreview = torpedoes.previewAim(aimOrigin, forward, player);
    aimPreviewAt = player.elapsed + 0.1;
  } else if (!aiming) {
    aimPreview = null;
    aimPreviewAt = -Infinity;
  }
  const aim = aimPreview;
  const aimAlive =
    aim &&
    (aim.boss
      ? aim.entity.enabled && !aim.entity.state.defeated
      : aim.entity.hiddenFor <= 0);
  $("reticle").classList.toggle("aim-assisted", Boolean(aimAlive));
  $("reticle").classList.toggle(
    "aim-ineligible",
    Boolean(aimAlive && !aim.eligible),
  );
  $("torpedo-aim").hidden = !aimAlive;
  $("torpedo-aim-point").hidden = true;
  if (aimAlive) {
    const species = aim.boss ? aim.entity.state.species : aim.entity.species;
    const hits = aim.boss
      ? aim.entity.state.validatedHits
      : aim.entity.torpedoHits || 0;
    const totalHits = aim.boss
      ? BOSS_REQUIRED_HITS
      : MECHANICAL_RULES.giantHits;
    const needed =
      aim.boss || species.length >= player.length
        ? Math.max(1, totalHits - hits)
        : 1;
    $("torpedo-aim").querySelector("b").textContent = t(species.label);
    $("torpedo-aim").querySelector("small").textContent = t(
      aim.eligible
        ? tr`目标锁定 · 预计${needed}发 · ${Math.round(aim.distance)}m`
        : "领主体型门槛 · 需25米",
    );
    $("torpedo-aim").classList.toggle("ineligible", !aim.eligible);
    aimProjection.copy(aim.entity.mesh.position).project(camera);
    if (
      aimProjection.z >= -1 &&
      aimProjection.z <= 1 &&
      Math.abs(aimProjection.x) < 0.88 &&
      Math.abs(aimProjection.y) < 0.6
    ) {
      const marker = $("torpedo-aim-point");
      marker.hidden = false;
      marker.classList.toggle("ineligible", !aim.eligible);
      marker.style.left = (aimProjection.x * 0.5 + 0.5) * innerWidth + "px";
      marker.style.top = (-aimProjection.y * 0.5 + 0.5) * innerHeight + "px";
      const label = $("torpedo-aim"),
        margin = innerWidth <= 600 ? 93 : 138;
      label.style.left =
        Clamp(
          (aimProjection.x * 0.5 + 0.5) * innerWidth,
          margin,
          innerWidth - margin,
        ) + "px";
      label.style.top =
        (-aimProjection.y * 0.5 + 0.5) * innerHeight + 18 + "px";
    } else {
      $("torpedo-aim").hidden = true;
    }
  }
  for (const key of ["health", "stamina", "hunger"]) {
    $(key + "-value").textContent = t(Math.ceil(player[key]));
    $(key + "-bar").style.width = player[key] + "%";
    $(key + "-bar").parentElement.classList.toggle(
      "low-vital",
      player[key] < 20,
    );
  }
  const remaining = Math.max(0, Math.ceil(ROUND_DURATION - player.elapsed));
  const pressure =
    hungerDrainRate(player.length, -position.y) /
    hungerDrainRate(player.length, 0);
  $("hunger-pressure").textContent =
    pressure > 1.05 ? tr`深潜 ×${pressure.toFixed(1)}` : "";
  $("round-clock").textContent = t(
    tr`远征 ${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`,
  );
  $("round-clock").classList.toggle("urgent", remaining <= 120);
  const zone = regionZone(expedition.region.id, -position.y, position);
  if (zone.name !== lastZone) {
    if (lastZone) notify(message`${zone.name}\n${zone.description}`, 4);
    lastZone = zone.name;
  }
  const nursery = isNursery(position);
  if (lastNursery !== null && lastNursery !== nursery) {
    notify(
      nursery
        ? expedition.region.surfaceMode === "ice"
          ? "回到冰穹育幼湾 · 猎手停止追击"
          : expedition.region.id === "amazon"
            ? "回到浮叶育幼湾 · 猎手停止追击"
            : "回到安全浅滩 · 猎手停止追击"
        : expedition.region.surfaceMode === "ice"
          ? "离开冰穹育幼湾 · 沿盐脉寻找大一些的猎物"
          : expedition.region.id === "amazon"
            ? "离开浮叶育幼湾 · 沿沉根寻找大一些的猎物"
            : expedition.region.startLength
              ? "离开安全浅滩 · 沿岩壁捕捉大鱼，25米后挑战守关领主"
              : "离开安全浅滩 · 外礁有少量猎手，建议4米后探索",
      4,
    );
  }
  lastNursery = nursery;
  $("hud").dataset.nursery = String(nursery);
  $("zone-name").textContent = t(
    nursery
      ? expedition.region.surfaceMode === "ice"
        ? "冰穹育幼湾"
        : expedition.region.id === "amazon"
          ? "浮叶育幼湾"
          : "安全浅滩"
      : zone.name,
  );
  $("zone-code").textContent = t(
    nursery
      ? expedition.region.surfaceMode === "ice"
        ? "ICE CRADLE"
        : expedition.region.id === "amazon"
          ? "RIVER NURSERY"
          : "NURSERY LAGOON"
      : zone.code ||
          {
            reef: "SUNLIT REEF",
            twilight: "THE TWILIGHT",
            abyss: "MIDNIGHT ZONE",
            hadal: "VOLCANIC ABYSS",
          }[zone.id] ||
          "INTO THE BLUE",
  );
  $("depth").textContent = t(
    Math.max(0, Math.round(-position.y * WORLD.displayDepthScale)),
  );
  $("length").textContent = t(player.length.toFixed(1));
  $("eaten").textContent = t(tr`已捕食 ${player.eaten}`);
  $("growth").style.width = getProgress(player) + "%";
  $("speed").textContent = t(Math.round(speed));
  $("depth-dot").style.top =
    Clamp((-position.y / activeWorld().maxDepth) * 100, 0, 100) + "%";
  $("objective").textContent = t(
    expedition.region.id === "amazon" && player.length < 25
      ? player.length < 6
        ? "沿浮叶捕食 · 成长后探索支流"
        : player.length < 16
          ? "狩猎河道猎手 · 沿两侧支流补给"
          : "寻找深潭巨兽 · 25米后挑战河道主宰"
      : expedition.region.surfaceMode === "ice" && player.length < 25
        ? player.length < 6
          ? "捕食冰下游体 · 成长后沿盐脉探索"
          : player.length < 16
            ? "寻找更大的外星猎物 · 探索悬生花园"
            : "在热泉附近补给 · 成长至25米挑战外星领主"
        : nursery && player.length < 4
          ? "安心吃鱼群 · 成长至 4 米"
          : nursery && player.length < 6
            ? "已能探索外礁 · 留意单独猎手"
            : player.length < 10
              ? "捕食鱼群，成长至 10 米"
              : player.length < 16
                ? "狩猎海洋霸主，探索深水区"
                : player.length < 25
                  ? "挑战远古巨兽，成长至 25 米"
                  : expeditionObjectiveHint(objectiveState, player),
  );
  if (
    objectiveState.regionId === "atlantis" &&
    (objectiveState.clueRead || objectiveState.keyCollected)
  )
    $("objective").textContent = t(
      expeditionObjectiveHint(objectiveState, player),
    );
  if (ocean.progress) {
    const { opened, next } = ocean.progress;
    $("objective").textContent = t(
      player.length < 25
        ? "沿岩壁觅食 · 25米后挑战首位守卫"
        : next
          ? tr`击败守卫 ${opened + 1}/${MARIANA_GATES.length} · ${next.guideToGuardian ? "深水海德拉" : next.name}`
          : "四道关卡已开 · 成长至30米，抵达海沟底部",
    );
  }
  $("notification").style.opacity = elapsed < notificationUntil ? "1" : "0";
  setMarkup(
    $("buffs"),
    Object.entries(player.buffs)
      .filter(([, v]) => v > 0)
      .map(([k, v]) =>
        k === "flow"
          ? tr`<span>${"洋流之息"} ${Math.ceil(v)}s</span>`
          : tr`<span>${"深渊狂食 · 吸食"} ${Math.ceil(v)}s</span>`,
      )
      .join(""),
  );
  const ghostThreat = surface.ghostThreat;
  const submarineThreat = humans.defense.threat;
  const showGhost = ghostThreat && (ghostThreat.charging || !threat);
  $("threat").hidden = !threat && !ghostThreat && !submarineThreat;
  $("threat").classList.toggle("spectral-threat", !!showGhost);
  if (showGhost) {
    $("threat-title").textContent = t("飞翔的荷兰人号");
    $("threat-detail").textContent = t(
      ghostThreat.charging
        ? "五炮齐射即将来袭 · 立即横向避开"
        : "敌舰航域 · 深潜至280米以下脱离锁定",
    );
    $("threat-distance").textContent = t(
      ghostThreat.charging ? "锁定" : "危险",
    );
  } else if (submarineThreat) {
    $("threat-title").textContent = t("潜艇鱼雷反击");
    $("threat-detail").textContent = t(
      submarineThreat.phase === "windup"
        ? "鱼雷正在锁定 · 准备横向闪避"
        : "直航鱼雷来袭 · 转向或借实体掩护",
    );
    $("threat-distance").textContent = t(
      submarineThreat.phase === "windup"
        ? `${submarineThreat.remaining.toFixed(1)}s`
        : `${Math.round(submarineThreat.distance)}m`,
    );
  } else if (threat) {
    const hunter = threat.entity.hunter;
    $("threat-title").textContent = t(
      tr`${threat.entity.species.label} · ${hunter.phase === "windup" ? "技能蓄力" : hunter.phase === "active" ? threat.entity.species.ability || hunter.ability.label : "正在追击"}`,
    );
    $("threat-detail").textContent = t(
      hunter.phase === "windup"
        ? hunter.tell
        : hunter.phase === "recover"
          ? "突袭已结束 · 趁恢复期拉开距离"
          : "保留冲刺，借岩石遮挡与横向变向脱险",
    );
    $("threat-distance").textContent = t(Math.round(threat.distance) + "m");
  }
  let target = null,
    targetScore = Infinity;
  for (const e of markersEnabled && !aimAlive ? entities : []) {
    if (!e.mesh.visible) continue;
    const d = e.mesh.position.distanceTo(position);
    if (d > 100 || blockedBetween(position, e.mesh.position)) continue;
    const p = e.mesh.position.clone().project(camera);
    if (p.z > 1 || Math.abs(p.x) > 0.82 || Math.abs(p.y) > 0.7) continue;
    const score = p.x * p.x + p.y * p.y + d * 0.001;
    if (score < targetScore) {
      targetScore = score;
      target = { e, p, d };
    }
  }
  $("target").hidden = !target;
  if (target) {
    const { e, p, d } = target,
      edible = canEat(player, e.species.length),
      retaliates =
        e.species.predator &&
        canPredatorRetaliate(player.length, e.species.length);
    $("target").style.left = (p.x * 0.5 + 0.5) * innerWidth + "px";
    $("target").style.top = (-p.y * 0.5 + 0.5) * innerHeight - 18 + "px";
    $("target").style.color = edible
      ? retaliates
        ? "#f3d36d"
        : "#9ef5d3"
      : e.species.predator
        ? "#ffad8a"
        : "#c1d8dd";
    $("target").textContent = t(
      tr`${{ shoal: "Ⅰ 浅海鱼群", hunter: "Ⅱ 海洋霸主", ancient: "Ⅲ 远古巨兽", alien: "外星生命" }[e.species.category] || "海洋生物"} · ${e.species.label} · ${e.species.length}m${e.torpedoHits ? tr` · 鱼雷伤害${e.torpedoHits}/${MECHANICAL_RULES.giantHits}` : ""} · ${edible ? (retaliates ? "可捕食 · 会反击" : "可捕食") : e.species.predator ? "危险" : "暂不可吞食"} / ${Math.round(d)}m`,
    );
  }
  $("boss-panel").hidden = !activeBoss;
  if (activeBoss) {
    const { state, tip } = activeBoss;
    $("boss-name").textContent = t(state.species.label);
    $("boss-health").style.width = (state.health / state.maxHealth) * 100 + "%";
    $("boss-hp").textContent = t(
      Math.ceil(state.health) + " / " + state.maxHealth,
    );
    $("boss-tip").textContent = t(
      player.length < state.species.minAttackLength
        ? "体型不足 · 借地形与技能间隙撤出领地"
        : player.characterId === "mechanical_shark"
          ? tr`鱼雷/侧咬 · 命中${state.validatedHits}/3 · 保留生命与体力`
          : tip,
    );
    $("boss-phase").textContent = t(
      {
        hunt: "领地主宰",
        windup: "危险 · 技能蓄力",
        attack: "技能释放",
        recover: "弱点暴露",
        disoriented: "墨汁迷失",
        return: "已脱离领地",
      }[state.phase] || "领地边界",
    );
  }
  $("feeding-mode").textContent = t(
    player.health < 100 ? "进食优先回血" : "健康成长",
  );
  $("breach-hint").hidden =
    surface.mode === "ice" || position.y < -35 || !!activeBoss;
  const charge = waterMotion?.charge || 0;
  $("breach-hint").textContent = t(
    surface.airborne
      ? "破浪跃起 · 靠惯性捕食海鸥"
      : waterMotion?.divingRequired
        ? "先潜下水面，重新积蓄破浪动量"
        : charge >= 0.99
          ? "破浪已就绪 · 保持冲刺向上游"
          : tr`水下蓄势 ${Math.round(charge * 100)}% · 持续冲刺后向上破水`,
  );
  $("ink-status").hidden = effects.ink < 0.08;
  $("ink-status").textContent = t(
    effects.ink > 0.35 ? "墨云遮蔽 · 横向游出云团" : "墨云正在散开",
  );
  if (effects.ink > 0.35 || sonar.snapshot.active) $("target").hidden = true;
  keepTargetClear();
  keepTargetClear($("torpedo-aim-point"));
  if ($("torpedo-aim-point").hidden || effects.ink > 0.35)
    $("torpedo-aim").hidden = true;
  keepTargetClear($("torpedo-aim"));
  // 窄屏上目标在雷达旁边时，保留真实方框，将文字收回准星下方。
  if (
    aimAlive &&
    !$("torpedo-aim-point").hidden &&
    effects.ink <= 0.35 &&
    $("torpedo-aim").hidden
  ) {
    const label = $("torpedo-aim");
    label.hidden = false;
    label.style.left = "50%";
    label.style.top = "calc(50% + 22px)";
    keepTargetClear(label);
  }
}
function keepTargetClear(label = $("target")) {
  if (label.hidden) return;
  const bounds = label.getBoundingClientRect();
  // 世界锚定标签遇到重要面板时暂时隐藏，避免挪动后误指向另一条鱼。
  for (const panel of targetPanels) {
    if (
      panel.hidden ||
      (panel.id === "notification" && elapsed >= notificationUntil) ||
      !panel.getClientRects().length
    )
      continue;
    const rect = panel.getBoundingClientRect();
    if (
      rect.width > 0 &&
      rect.height > 0 &&
      bounds.left < rect.right + 4 &&
      bounds.right > rect.left - 4 &&
      bounds.top < rect.bottom + 4 &&
      bounds.bottom > rect.top - 4
    ) {
      label.hidden = true;
      break;
    }
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const roundDt = Math.max(0, (now - lastTime) / 1000);
  const dt = Math.min(roundDt, 0.04);
  // 同帧排队的 RAF 时间戳可能早于刚完成的初始化，不能让时钟倒退。
  lastTime = Math.max(lastTime, now);
  // 图鉴打开时只渲染独立标本，避免两套海洋场景同时消耗图形资源。
  if (guide.isOpen || runRecords.isOpen || regionLoading || document.hidden)
    return;
  // 暂停及结算是静止画面；进入、尺寸或画质变化才重绘，不持续提交 GPU 工作。
  const animatedWorld = ["menu", "launching", "playing", "epilogue"].includes(
    mode,
  );
  if (!animatedWorld && !worldRenderDirty) return;
  if (mode === "menu") {
    elapsed += dt;
    // 首页展示独立构图；开始游戏后按真实体长恢复缩放。
    avatar.position.set(
      innerWidth >= 900 ? 9 : 6,
      innerWidth >= 900 ? -15.5 : -18,
      68,
    );
    avatar.scale.setScalar(innerWidth >= 900 ? 10 : 6);
    avatar.rotation.set(0.05, -0.65 + Math.sin(elapsed * 0.13) * 0.12, -0.05);
    avatar.userData.animate?.(elapsed, 0.6);
    camera.position.set(18, -12, 85);
    camera.lookAt(-0.5, -17, 61);
    position.set(0, -18, 75);
    atmosphere(dt);
    for (const e of entities) {
      e.mesh.visible = e.mesh.position.distanceTo(position) < 120;
      if (e.mesh.visible) e.mesh.userData.animate?.(elapsed + e.seed, 0.5);
    }
    ocean.update(
      elapsed,
      position,
      dt,
      highQuality,
      camera.position,
      reducedMotionQuery.matches,
    );
    surface.update(dt, elapsed, player, position, camera, false, highQuality);
  } else if (mode === "launching") {
    elapsed += dt;
    updateLaunch(roundDt);
    for (const e of entities) {
      if (e.mesh.visible) e.mesh.userData.animate?.(elapsed + e.seed, 0.5);
    }
    atmosphere(dt);
    ocean.update(
      elapsed,
      position,
      dt,
      highQuality,
      camera.position,
      reducedMotionQuery.matches,
    );
    surface.update(dt, elapsed, player, position, camera, false, highQuality);
    audio.update(elapsed, 0, { depth: -position.y });
  } else if (mode === "playing") {
    elapsed += dt;
    updatePlayer(dt, roundDt);
    if (player.timedOut) {
      showOverlay("timeup");
      updateHud();
      visuals.render();
      return;
    }
    const beforeEntities = position.clone();
    const beforeFeedingLength = player.length;
    minion.beforePreyMotion();
    torpedoes.beforePreyMotion();
    updateEntities(dt);
    torpedoes.update(dt, player);
    // 猎手击退与捕食成长也在本帧约束，不能等下一帧再把穿入实体的鱼推出。
    if (
      !position.equals(beforeEntities) ||
      player.length !== beforeFeedingLength
    )
      resolvePlayerMotion(beforeEntities, true);
    updatePickups(dt);
    humans.update(dt, player.elapsed, player, position, forward, { speed });
    const beforeMinionLength = player.length;
    minion.update(dt, player, position, forward, entities, humans.entities);
    if (player.length !== beforeMinionLength)
      resolvePlayerMotion(position, true);
    const beforeEncounter = position.clone();
    const beforeBossLength = player.length;
    activeBoss = encounters.update(
      dt,
      player.elapsed,
      player,
      position,
      forward,
      {
        blockedBetween,
      },
    );
    ocean.updateProgress?.(player, position, encounters.bosses, notify);
    const relicPosition = swallowPoint.set(
      ATLANTIS_RELIC.x,
      ATLANTIS_RELIC.y,
      ATLANTIS_RELIC.z,
    );
    const relicContact =
      expedition.region.id === "atlantis" &&
      capturePoint(captureContact).distanceToSquared(relicPosition) <
        (ATLANTIS_RELIC.radius + player.length * 0.06) ** 2 &&
      !blockedBetween(position, relicPosition);
    const objectiveEvent = advanceExpeditionObjective(
      objectiveState,
      player,
      encounters.bosses,
      {
        relicContact,
        keyContact: (() => {
          const point = ocean.relic?.keyArt.getPoint(objectiveState.keySiteId);
          return (
            !!point &&
            captureContact.distanceToSquared(point) <
              (4 + player.length * 0.06) ** 2 &&
            !blockedBetween(position, point)
          );
        })(),
        clueContact:
          ocean.relic?.keyArt.locations.some(
            (site) =>
              position.distanceToSquared(site.clue) < 16 ** 2 &&
              !blockedBetween(position, site.clue),
          ) || false,
        trenchArrived: !!ocean.progress?.arrived,
      },
    );
    ocean.relic?.setState(objectiveState);
    if (objectiveEvent.clueFound)
      notify(expeditionObjectiveHint(objectiveState, player), 6);
    if (objectiveEvent.keyFound) {
      audio.pickup();
      notify("海螺钥匙已找到 · 保留至神庙地宫开启宝箱", 6);
    }
    if (objectiveEvent.unlocked)
      notify("钥匙与守宝印记齐全 · 波塞冬宝箱已开启", 6);
    if (objectiveEvent.collected) {
      audio.pickup();
      notify("圣珠已吞食 · 亚特兰蒂斯的秘密已解开", 6);
    }
    if (!position.equals(beforeEncounter) || player.length !== beforeBossLength)
      resolvePlayerMotion(beforeEncounter, true);
    avatar.position.copy(position);
    avatar.scale.setScalar(player.length);
    updateCamera(dt);
    surface.update(dt, elapsed, player, position, camera, true, highQuality);
    feeding.update(dt, {
      mouth: feedingMouth(swallowPoint),
      direction: feedingDirection
        .copy(forward)
        .multiplyScalar(player.characterId === "squid" ? -1 : 1),
    });
    effects.update(dt, camera.position, position);
    const intakePosition = capturePoint(captureContact);
    frenzyEffect.update({
      active:
        player.buffs.frenzy > 0 &&
        !surface.airborne &&
        intakePosition.y < WORLD.surfaceY,
      dt,
      time: elapsed,
      position: intakePosition,
      length: player.length,
      highQuality,
    });
    updateSonar();
    $("ink-overlay").style.opacity = effects.ink * 0.83;
    lureFlash = Math.max(0, lureFlash - dt);
    $("lure-flash").style.opacity = Math.min(0.4, lureFlash * 0.18);
    atmosphere(dt);
    ocean.update(
      elapsed,
      position,
      dt,
      highQuality,
      camera.position,
      reducedMotionQuery.matches,
    );
    const bossCombat =
      activeBoss &&
      ["hunt", "windup", "attack", "recover", "disoriented"].includes(
        activeBoss.state.phase,
      );
    audio.update(
      elapsed,
      bossCombat
        ? 0.85
        : threat
          ? Clamp(1 - threat.distance / 90, 0.1, 1)
          : surface.danger || humans.defense.threat
            ? 0.6
            : 0,
      {
        boss: !!bossCombat,
        pursuing: !!threat || !!surface.danger || !!humans.defense.threat,
        ink: effects.ink,
        depth: -position.y,
        aboveWater:
          expedition.region.surfaceMode !== "ice" &&
          camera.position.y > WORLD.surfaceY,
      },
    );
    uiClock += dt;
    if (uiClock > 0.07) {
      updateHud();
      uiClock = 0;
    }
    if (player.dead) showOverlay("dead");
    else if (player.won) showOverlay("won");
  }
  if (mode === "epilogue") {
    elapsed += dt;
    updatePlayer(dt, 0);
    avatar.position.copy(position);
    updateCamera(dt);
    atmosphere(dt);
    ocean.update(
      elapsed,
      position,
      dt,
      highQuality,
      camera.position,
      reducedMotionQuery.matches,
    );
    minimap.update({
      riverPaths: ocean.radarPaths,
      position,
      forward,
      spawn: expedition.region.spawn,
      contacts: [],
      sonarActive: false,
      world: activeWorld(),
      waypoints: [{ ...MARIANA_REFUGE, open: false, final: true }],
    });
    updateHud();
    $("objective").textContent = t(
      "通关后游览 · 菠萝屋与招手海绵 · 用暂停键返回结算",
    );
    $("pause").textContent = t("返回结算");
  }
  if (mode === "playing" || mode === "menu") {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.life -= dt;
      b.mesh.position.addScaledVector(b.velocity, dt);
      b.mesh.scale.setScalar(Math.max(0.1, b.life));
      if (b.life <= 0) {
        scene.remove(b.mesh);
        bursts.splice(i, 1);
      }
    }
    hitFlash = Math.max(0, hitFlash - dt * 1.6);
    $("damage").style.opacity = hitFlash;
  }
  worldBoundary.update(
    elapsed,
    position,
    activeWorld(),
    mode === "playing" || mode === "paused",
    ocean.rockyBoundarySides === true,
  );
  visuals.update({
    time: elapsed,
    depth: -position.y,
    position,
    aboveWater:
      expedition.region.surfaceMode !== "ice" &&
      camera.position.y > WORLD.surfaceY,
    ink: effects.ink,
    night: expedition.region.id === "atlantis",
    ice: expedition.region.surfaceMode === "ice",
  });
  visuals.render();
  worldRenderDirty = false;
}

onLanguageChange(() => {
  updateRegionPresentation();
  $("sound").textContent = t(audio.enabled ? "声音 · 开" : "声音 · 关");
  $("quality").textContent = t(highQuality ? "画质 · 高" : "画质 · 流畅");
  $("notification").textContent = t(currentNotification);
  const selected =
    mode === "menu" ? setup.getSelection().character : expedition.character;
  document.querySelector(".specimen strong").textContent = t(
    specimenCaption(selected),
  );
  occlusionsAt = -Infinity;
  if (["paused", "won", "dead", "timeup"].includes(mode)) renderOverlay(mode);
  $("movement-mode").textContent = t(movementLabel);
  if (mode !== "menu") {
    updateHud();
    updateSonar();
  }
});

$("start").addEventListener("click", () => {
  if (mode !== "menu") return;
  startGame({
    transition: !reducedMotionQuery.matches,
  });
});
$("resume").addEventListener("click", resumeGame);
$("return-menu").addEventListener("click", returnToMenu);
$("visit-refuge").addEventListener("click", visitRefuge);
$("pause").addEventListener("click", togglePause);
$("sound").addEventListener("click", () => {
  $("sound").textContent = t(audio.toggle() ? "声音 · 开" : "声音 · 关");
});
$("quality").addEventListener("click", () => {
  worldRenderDirty = true;
  highQuality = !highQuality;
  renderer.setPixelRatio(highQuality ? Math.min(devicePixelRatio, 1.5) : 0.8);
  renderer.shadowMap.enabled = highQuality;
  visuals.setQuality(highQuality);
  $("quality").textContent = t(highQuality ? "画质 · 高" : "画质 · 流畅");
});
window.addEventListener("resize", () => {
  worldRenderDirty = true;
  occlusionsAt = -Infinity;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  visuals.resize();
});
canvas.addEventListener("webglcontextrestored", () => {
  worldRenderDirty = true;
  $("loading").hidden = true;
});
window.addEventListener("keydown", (e) => {
  if (regionLoading) {
    e.preventDefault();
    return;
  }
  if (guide.isOpen || runRecords.isOpen) return;
  if (!$("overlay").hidden && e.code === "Tab") {
    // 暂停及结算时只在面板内循环，隐藏的重开按钮不参与焦点顺序。
    const buttons = [
      ...$("overlay").querySelectorAll(
        'input, button, select, textarea, summary, [tabindex="0"]',
      ),
    ].filter((button) => !button.disabled && button.getClientRects().length);
    const index = buttons.indexOf(document.activeElement);
    const next =
      index < 0
        ? e.shiftKey
          ? buttons.length - 1
          : 0
        : (index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
    e.preventDefault();
    buttons[next].focus({ preventScroll: true });
    return;
  }
  if (
    e.target instanceof Element &&
    e.target.closest("input, select, textarea")
  )
    return;
  // 按钮保留原生空格激活；开始或继续后焦点回到画布，下一次空格正常冲刺。
  if (
    e.code === "Space" &&
    e.target instanceof Element &&
    e.target.closest("button, input, select, textarea")
  )
    return;
  if (
    (mode === "playing" || mode === "epilogue") &&
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.code,
    )
  )
    e.preventDefault();
  if (e.repeat) return;
  if (e.code === "Escape" || e.code === "KeyP") togglePause();
  else if (mode === "playing" && e.code === "KeyJ") activateCharacterSkill();
  else if (mode === "playing" || mode === "epilogue") keys.add(e.code);
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  resetInput();
  if (mode === "epilogue") return showOverlay("won");
  if (mode === "playing" || mode === "launching") showOverlay("paused");
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && mode === "epilogue") return showOverlay("won");
  if (document.hidden && (mode === "playing" || mode === "launching"))
    showOverlay("paused");
});
$("touch-boost").addEventListener("pointerdown", (e) => {
  if (mode !== "playing") return;
  e.preventDefault();
  boostPointerId = e.pointerId;
  e.currentTarget.setPointerCapture(e.pointerId);
  touchBoost = true;
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  $("touch-boost").addEventListener(event, () => {
    boostPointerId = null;
    touchBoost = false;
  });
// 慢游使用独立触点，不与键盘K互相覆盖；移出按钮后松手也会释放。
$("touch-slow").addEventListener("pointerdown", (e) => {
  if ((mode !== "playing" && mode !== "epilogue") || slowPointerId !== null)
    return;
  e.preventDefault();
  slowPointerId = e.pointerId;
  e.currentTarget.setPointerCapture(e.pointerId);
  touchSlow = true;
  e.currentTarget.setAttribute("aria-pressed", "true");
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  $("touch-slow").addEventListener(event, (e) => {
    if (e.pointerId !== slowPointerId) return;
    slowPointerId = null;
    touchSlow = false;
    e.currentTarget.setAttribute("aria-pressed", "false");
  });
for (const id of ["touch-sonar", "sonar-control"]) {
  $(id).addEventListener("click", () => {
    activateCharacterSkill();
    canvas.focus({ preventScroll: true });
  });
}
const joystick = $("joystick");
let joystickId = null,
  boostPointerId = null,
  slowPointerId = null;
/** 暂停与回首页共同释放旧触点，避免旧手指在下一局继续转向或冲刺。 */
function resetInput() {
  keys.clear();
  touchBoost = false;
  touchSlow = false;
  $("touch-slow").setAttribute("aria-pressed", "false");
  pointer.x = pointer.y = 0;
  const captured = [
    [joystick, joystickId],
    [$("touch-boost"), boostPointerId],
    [$("touch-slow"), slowPointerId],
  ];
  joystickId = boostPointerId = slowPointerId = null;
  for (const [control, id] of captured)
    if (id !== null && control.hasPointerCapture(id))
      control.releasePointerCapture(id);
  joystick.firstElementChild.style.transform = "";
}
function moveJoystick(e) {
  const r = joystick.getBoundingClientRect();
  pointer.x = Clamp((e.clientX - r.left - r.width / 2) / 40, -1, 1);
  pointer.y = Clamp((e.clientY - r.top - r.height / 2) / 40, -1, 1);
  joystick.firstElementChild.style.transform = tr`translate(${pointer.x * 28}px,${pointer.y * 28}px)`;
}
joystick.addEventListener("pointerdown", (e) => {
  if (mode !== "playing" && mode !== "epilogue") return;
  e.preventDefault();
  joystickId = e.pointerId;
  joystick.setPointerCapture(e.pointerId);
  moveJoystick(e);
});
joystick.addEventListener("pointermove", (e) => {
  if (e.pointerId === joystickId) moveJoystick(e);
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  joystick.addEventListener(event, () => {
    joystickId = null;
    pointer.x = 0;
    pointer.y = 0;
    joystick.firstElementChild.style.transform = "";
  });
// 游戏区域不参与文本选择和长按菜单；真正的编辑框仍保留原生操作。
for (const name of [
  "contextmenu",
  "selectstart",
  "copy",
  "cut",
  "paste",
  "dragstart",
]) {
  document.addEventListener(name, (event) => {
    if (
      !(event.target instanceof Element) ||
      !event.target.closest(
        'textarea, input:not([type="checkbox"]), [contenteditable="true"]',
      )
    )
      event.preventDefault();
  });
}
canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  if (mode === "playing" || mode === "launching") showOverlay("paused");
  $("loading").hidden = false;
  $("loading").textContent = t(
    "图形上下文已中断，正在尝试恢复。若未恢复，请刷新页面。",
  );
});
seedPopulation();
seedPickups();
updateRegionPresentation();
regionLoader.stage("正在准备光影…", 82);
await regionLoader.paint();
await renderer.compileAsync(scene, camera);
requestAnimationFrame(frame);
await regionLoader.paint();
regionLoader.end();
lastTime = performance.now();
// 开发环境提供状态观察与场景跳转，用于验证终局与边界；生产构建不导出。
if (import.meta.env.DEV)
  window.__ABYSSAL__ = {
    get player() {
      return player;
    },
    get regionLoading() {
      return regionLoading;
    },
    get mode() {
      return mode;
    },
    entities,
    encounters,
    effects,
    minion,
    frenzyEffect,
    feeding,
    guide,
    get surface() {
      return surface;
    },
    audio,
    pickups,
    get elapsed() {
      return elapsed;
    },
    get activeBoss() {
      return activeBoss;
    },
    position,
    renderer,
    visuals,
    scene,
    startGame,
    returnToMenu,
    toggleMarkers,
    sonar,
    sonarMarkers,
    sonarWave,
    minimap,
    setMarkers,
    activateSonar,
    activateCharacterSkill,
    torpedoes,
    get inkAbility() {
      return inkAbility;
    },
    get avatar() {
      return avatar;
    },
    humans,
    camera,
    get ocean() {
      return ocean;
    },
    forward,
    get markersEnabled() {
      return markersEnabled;
    },
    getCapturePoint: () => capturePoint(new THREE.Vector3()),
    getCaptureStart: () => captureStart.clone(),
    getFeedingMouth: () => feedingMouth(new THREE.Vector3()),
    get controls() {
      return {
        yaw,
        pitch,
        speed,
        pointer: { ...pointer },
        groundRecovering,
        iceRecovering,
      };
    },
    get lastCollision() {
      return lastCollision;
    },
    get objective() {
      return objectiveState;
    },
    get expedition() {
      return expedition;
    },
    setPosition(x, y, z) {
      groundRecovering = iceRecovering = false;
      position.set(x, y, z);
      camera.position.set(x, y + 6, z + 18);
      lookTarget.set(x, y + 1, z - 10);
      avatar.position.copy(position);
      capturePoint(captureStart);
    },
    setFacing(nextYaw, nextPitch = 0) {
      yaw = nextYaw;
      pitch = nextPitch;
      forward.set(0, 0, -1).applyEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
      avatar.rotation.set(pitch, yaw, 0, "YXZ");
      capturePoint(captureStart);
    },
    setLength(length) {
      player.length = length;
      player.mass = (length / 6) ** 3;
    },
    takeDamage: (amount) => takeDamage(player, amount),
    collectPickup: (kind) => collectPickup(player, kind),
  };
