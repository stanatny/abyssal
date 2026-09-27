import * as THREE from "three";
import "./style.css";
import { createCreature } from "./creatures.js";
import { createOcean, seabedHeight } from "./ocean.js";
import {
  createPlayer,
  tickVitals,
  canEat,
  consumePrey,
  takeDamage,
  collectPickup,
  getZone,
  getProgress,
  SPECIES,
  PLAYER_MOVEMENT,
  ROUND_DURATION,
} from "./simulation.js";
import { OceanAudio } from "./audio.js";
import { steerWithinHabitat } from "./navigation.js";
import { WORLD } from "./world_config.js";
import { createReward, REWARDS } from "./rewards.js";
import { createSurface } from "./surface.js";
import { createEncounters } from "./encounters.js";
import { createCombatEffects } from "./combat_effects.js";
import { createHunterState, tickHunter } from "./hunter_rules.js";
import { createOceanGuide } from "./ocean_guide.js";
import { createSonar } from "./sonar.js";
import { createSonarMarkers } from "./sonar_markers.js";
import { createSonarWave } from "./sonar_wave.js";
import { createMinimap } from "./minimap.js";
import { createExpeditionSetup } from "./menu_selection.js";
import { getExpedition } from "./expedition_config.js";
import { stepFlyingFish } from "./flying_fish.js";
import { createHumanActivity } from "./human_activity.js";
import {
  characterMovement,
  createInkState,
  activateInk,
  inkStatus,
  getCharacter,
} from "./character_rules.js";
import {
  bodyRadius,
  resolveMotion,
  castSegment,
  segmentBlocked,
} from "./collision.js";

const $ = (id) => document.getElementById(id);
const Clamp = THREE.MathUtils.clamp;
const canvas = $("ocean");
const targetPanels = document.querySelectorAll(
  "header, .location, .mission, #threat, #boss-panel, #notification, #ink-status, #breach-hint, #round-clock, #buffs, .vitals, .speed, #joystick, #sonar-panel, #sonar-control, #touch-skills, #touch-boost, #minimap",
);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
} catch (error) {
  $("loading").textContent =
    "无法启动 3D 画面，请使用支持 WebGL 2 的浏览器并开启硬件加速。";
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#147a8b");
scene.fog = new THREE.FogExp2("#147a8b", 0.013);
const camera = new THREE.PerspectiveCamera(
  60,
  innerWidth / innerHeight,
  0.15,
  650,
);
const ambient = new THREE.HemisphereLight(0xb1ffff, 0x102b46, 2.3);
const sun = new THREE.DirectionalLight(0xc5f9ff, 3.2);
sun.position.set(-60, 100, 60);
const rim = new THREE.DirectionalLight(0x36a8ca, 1.7);
rim.position.set(80, -20, -100);
scene.add(ambient, sun, rim);
const playerLight = new THREE.PointLight(0x94ebdf, 12, 45, 1.2);
scene.add(playerLight);
const ocean = createOcean(scene);
let avatar = createCreature("orca", 6);
const avatarCache = new Map([["orca", avatar]]);
scene.add(avatar);
const audio = new OceanAudio();
const effects = createCombatEffects(scene);
const guide = createOceanGuide($("open-guide"));
const sonar = createSonar($("sonar-panel"));
const sonarMarkers = createSonarMarkers($("sonar-markers"));
const sonarWave = createSonarWave(scene);
const minimap = createMinimap($("minimap"));
const surface = createSurface(scene, audio, notify, {
  onEat(point, length) {
    effects.blood(point, length);
    effects.bite(point, forward, player.length);
  },
});
const encounters = createEncounters(scene, {
  seabedHeight,
  audio,
  notify,
  onDamage() {
    hitFlash = 0.9;
    effects.hurt(position, player.length);
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
  heightAt: seabedHeight,
  worldColliders: ocean.colliders,
  onEat(point, length) {
    effects.blood(point, length);
  },
  onDamage() {
    hitFlash = 0.85;
    effects.hurt(position, player.length);
  },
});
const entities = [],
  pickups = [],
  bursts = [],
  schools = [];
const keys = new Set();
const pointer = { x: 0, y: 0 };
const position = new THREE.Vector3(0, -18, 75);
const forward = new THREE.Vector3(0, 0, -1);
const temp = new THREE.Vector3(),
  lookTarget = new THREE.Vector3();
const rotation = new THREE.Euler(0, 0, 0, "YXZ");
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
  lastZone = "";
let threat = null,
  touchBoost = false,
  highQuality = true,
  hitFlash = 0,
  uiClock = 0,
  activeBoss = null;
let lureFlash = 0,
  waterMotion = null;
const solidColliders = [...ocean.colliders, ...surface.colliders];
const staticColliderCount = solidColliders.length;
function refreshDynamicColliders() {
  solidColliders.length = staticColliderCount;
  solidColliders.push(...humans.colliders);
}
refreshDynamicColliders();
let lastCollision = null;
let expedition = getExpedition();
let inkAbility = createInkState();
const jetDirection = new THREE.Vector3(0, 0, -1);
let markersEnabled = true;
let bestLength = 6;
try {
  bestLength = Number(localStorage.getItem("abyssal_best")) || 6;
  markersEnabled = localStorage.getItem("abyssal_markers") !== "off";
} catch {
  /* 隐私模式仍可游玩。 */
}

const setup = createExpeditionSetup($("expedition-setup"), {
  markers: markersEnabled,
  onMarkersChange: setMarkers,
  onCharacterChange: selectAvatar,
});
setMarkers(markersEnabled);
function selectAvatar(character) {
  scene.remove(avatar);
  avatar = avatarCache.get(character.kind);
  if (!avatar) {
    avatar = createCreature(character.kind, 6);
    avatarCache.set(character.kind, avatar);
  }
  scene.add(avatar);
  avatar.visible = true;
  const caption = document.querySelector(".specimen");
  if (caption) {
    caption.querySelector("span").textContent =
      `${character.id === "orca" ? "ORCINUS ORCA" : "ARCHITEUTHIS DUX"} · PLAYER`;
    caption.querySelector("strong").textContent =
      `${character.name} · 幼年个体`;
  }
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
function activateCharacterSkill() {
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
    entity.mesh.userData.disoriented = true;
    confused++;
  }
  confused += encounters.disorient?.(position, 90, player.elapsed, 10) || 0;
  effects.flash(position, 0x947acf, 14);
  audio.hunter?.("squid");
  notify(
    `墨幕喷射 · ${confused ? `${confused}个追击者迷失10秒` : "向前喷射脱离危险"}`,
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
  });
  const character = getCharacter(player.characterId);
  const skill = character.active;
  const statusData =
    player.characterId === "squid"
      ? inkStatus(inkAbility, player.elapsed)
      : scan;
  const underwater =
    !surface.airborne && position.y < WORLD.surfaceY - player.length * 0.2;
  const usable =
    statusData.ready && (player.characterId !== "squid" || underwater);
  const shortName = player.characterId === "squid" ? "喷墨" : "声呐";
  const status = statusData.active
    ? `${player.characterId === "squid" ? "墨幕" : "探测"} ${Math.ceil(statusData.remaining)}s`
    : statusData.ready
      ? usable
        ? "就绪"
        : "需潜入水下"
      : `冷却 ${Math.ceil(statusData.cooldownRemaining)}s`;
  $("sonar-control").textContent = `J ${shortName} · ${status}`;
  $("touch-sonar").querySelector("span").textContent = shortName;
  $("touch-sonar-status").textContent = statusData.ready
    ? usable
      ? "就绪"
      : "水下使用"
    : `${Math.ceil(statusData.active ? statusData.remaining : statusData.cooldownRemaining)}s`;
  for (const id of ["touch-sonar", "sonar-control"]) {
    const button = $(id);
    button.dataset.skill = skill.id;
    button.dataset.state = statusData.active
      ? "active"
      : statusData.ready
        ? "ready"
        : "cooldown";
    button.disabled = !usable || mode !== "playing";
    button.dataset.remaining = String(Math.ceil(statusData.cooldownRemaining));
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
      `${character.name}${skill.name}，${status}。${skill.description}`,
    );
    button.title = `J · ${skill.name} · 冷却${skill.cooldown}秒`;
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
function floorAt(x, z, margin = 4) {
  return seabedHeight(x, z) + margin;
}
function speciesList() {
  return SPECIES.filter((species) =>
    expedition.region.speciesKinds.includes(species.kind),
  );
}
function spawnPosition(species, near = false) {
  const minimum = species.depthMin ?? 5,
    maximum = Math.min(species.depthMax ?? 710, 715);
  const point = new THREE.Vector3();
  for (let attempt = 0; attempt < 40; attempt++) {
    if (near) {
      const angle = random(-Math.PI, Math.PI),
        radius = random(40, 110);
      point.set(
        Clamp(
          position.x + Math.sin(angle) * radius,
          WORLD.minX + 15,
          WORLD.maxX - 15,
        ),
        Clamp(position.y + random(-30, 25), -maximum, -minimum),
        Clamp(
          position.z + Math.cos(angle) * radius,
          WORLD.minZ + 15,
          WORLD.maxZ - 15,
        ),
      );
    } else {
      point.set(
        random(WORLD.minX + 40, WORLD.maxX - 40),
        -random(minimum, maximum),
        random(WORLD.minZ + 40, WORLD.maxZ - 30),
      );
    }
    if (
      point.y > floorAt(point.x, point.z, species.length * 0.35 + 3) &&
      point.y < -Math.min(5, Math.max(0.3, minimum))
    )
      return point;
  }
  const depth = (minimum + maximum) * 0.5;
  point.set(
    random(-170, 170),
    -depth,
    Clamp(-200 - (depth + 45 - 140) / 0.72, WORLD.minZ + 20, 90),
  );
  point.y = Math.max(
    point.y,
    floorAt(point.x, point.z, species.length * 0.35 + 3),
  );
  return point;
}
function addEntity(species, location) {
  const mesh = createCreature(
    species.kind,
    species.length,
    entities.length + 1,
  );
  mesh.position.copy(location || spawnPosition(species));
  scene.add(mesh);
  const entity = {
    species,
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
        color: species.kind === "octopus" ? 0xd98665 : 0xffb080,
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
  if (!entities.length)
    for (const species of speciesList()) {
      const count =
        species.population ??
        (species.schoolSize ? 18 : species.category === "ancient" ? 2 : 4);
      for (let i = 0; i < count; i++) addEntity(species);
    }
  schools.length = 0;
  for (const entity of entities) {
    entity.mesh.position.copy(spawnPosition(entity.species));
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
    const members = entities.filter((e) => e.species.kind === kind),
      groupSize = members[0]?.species.schoolSize || 6;
    if (!members.length) continue;
    for (let i = 0; i < members.length; i += groupSize) {
      const species = members[i].species,
        center = spawnPosition(species);
      if (kind === "fish")
        center.set(
          (((i / groupSize) % 3) - 1) * 28,
          -18 - Math.floor(i / groupSize / 2) * 12,
          55 - Math.floor(i / groupSize / 2) * 65,
        );
      else if (kind === "tuna")
        center.set(
          ((i / groupSize) % 2 ? 1 : -1) * 30,
          -30 - (i / groupSize) * 16,
          5 - (i / groupSize) * 70,
        );
      if (!["fish", "tuna"].includes(kind)) {
        const index = speciesList()
          .filter((entry) => entry.schoolSize > 1)
          .findIndex((entry) => entry.kind === kind);
        center.set(
          (index % 2 ? 1 : -1) * (24 + index * 8),
          -Math.min(
            species.depthMax - 1,
            Math.max(species.depthMin + 1, 4 + index * 3),
          ),
          74 - index * 24 - i * 2,
        );
      }
      center.y = Math.max(center.y, floorAt(center.x, center.z, 5));
      if (kind === "fish" && i === 0) center.set(0, -18, 54);
      const school = { center, seed: random(0, 9), kind };
      schools.push(school);
      members.slice(i, i + groupSize).forEach((entity, index) => {
        entity.school = school;
        entity.slot = new THREE.Vector3(
          ((index % 4) - 1.5) * 2.4,
          Math.sin(index * 2) * 1.5,
          (Math.floor(index / 4) - 1) * 3,
        );
        entity.mesh.position.copy(center).add(entity.slot);
      });
    }
  }
  const shark = entities.find((e) => e.species.kind === "shark");
  if (shark) shark.mesh.position.set(45, -75, -150);
}
function seedPickups() {
  if (pickups.length) {
    for (const item of pickups) {
      item.cooldown = 0;
      item.mesh.visible = true;
    }
    return;
  }
  for (let i = 0; i < 34; i++) {
    const kind = ["stamina", "flow", "frenzy"][i % 3],
      mesh = createReward(kind);
    const point =
      i < 3
        ? new THREE.Vector3((i - 1) * 13, -19 - i * 5, 40 - i * 28)
        : spawnPosition({ depthMin: 20, depthMax: 710, length: 2 });
    mesh.position.copy(point);
    scene.add(mesh);
    pickups.push({ kind, mesh, baseY: point.y, cooldown: 0 });
  }
}
function notify(message, duration = 3) {
  $("notification").textContent = message;
  notificationUntil = elapsed + duration;
}
function startGame() {
  expedition = setup.getSelection();
  player = createPlayer(expedition.character.id);
  selectAvatar(expedition.character);
  inkAbility = createInkState();
  player.length = expedition.character.startLength;
  player.mass = (player.length / 6) ** 3;
  position.fromArray(expedition.region.spawn);
  yaw = 0;
  pitch = 0;
  speed = PLAYER_MOVEMENT.cruiseSpeed;
  elapsed = 0;
  lastZone = "";
  lastCollision = null;
  notificationUntil = 0;
  hitFlash = 0;
  lureFlash = 0;
  waterMotion = null;
  effects.reset();
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
  pointer.x = 0;
  pointer.y = 0;
  keys.clear();
  touchBoost = false;
  activeBoss = null;
  surface.reset();
  humans.reset();
  refreshDynamicColliders();
  encounters.reset(expedition.region.bossKinds);
  seedPopulation();
  seedPickups();
  avatar.scale.setScalar(player.length);
  avatar.visible = true;
  mode = "playing";
  lastTime = performance.now();
  $("menu").hidden = true;
  $("overlay").hidden = true;
  $("hud").hidden = false;
  $("pause").hidden = false;
  camera.position.set(0, -12, 93);
  lookTarget.copy(position);
  audio.start();
  audio.reset?.();
  audio.setPaused(false);
  notify("追逐成群的小鱼，快速成长\n先在水下持续冲刺蓄势，再上冲破水", 6);
  canvas.focus({ preventScroll: true });
}
function showOverlay(kind) {
  mode = kind;
  $("sonar-panel").hidden = true;
  sonarMarkers.reset();
  sonarWave.reset();
  minimap.update({
    position,
    forward,
    spawn: expedition.region.spawn,
    contacts: [],
    sonarActive: false,
  });
  document.body.classList.remove("sonar-active");
  audio.setPaused(kind !== "won");
  if (kind === "won") audio.victory();
  keys.clear();
  touchBoost = false;
  pointer.x = 0;
  pointer.y = 0;
  $("overlay").hidden = false;
  const won = kind === "won",
    dead = kind === "dead",
    timeup = kind === "timeup";
  $("overlay-kicker").textContent = won
    ? "APEX OF THE ABYSS"
    : dead
      ? "THE OCEAN REMEMBERS"
      : timeup
        ? "EXPEDITION COMPLETE"
        : "EXPEDITION PAUSED";
  $("overlay-title").textContent = won
    ? "深渊，已记住你的名字。"
    : dead
      ? "这次，海洋更胜一筹。"
      : timeup
        ? "这次远征，到此休整。"
        : "海洋在等你。";
  $("overlay-body").textContent = won
    ? `你已长成 ${player.length.toFixed(1)} 米的顶级掠食者。\n捕食 ${player.eaten} 次 · 生存 ${Math.floor(player.elapsed / 60)} 分 ${Math.floor(player.elapsed % 60)} 秒`
    : dead
      ? `最终体长 ${player.length.toFixed(1)} 米 · 捕食 ${player.eaten} 次\n${player.hunger <= 0 ? "饥饿夺走了你的生命。长大后需要更大的猎物。" : activeBoss ? "主宰比冲刺更快。观察技能前摇、侧向闪避，并利用恢复期撤出领地。" : "保留一段冲刺体力，借助岩柱切断追击者的视线。"}`
      : timeup
        ? `30 分钟探索结束 · 最终体长 ${player.length.toFixed(1)} 米\n捕食 ${player.eaten} 次 · 击败领主 ${player.bossesDefeated} 位\n本次未达成深渊霸主；继续积累经验，再次出发。`
        : "WASD 转向，空格冲刺，J 声呐，K 慢游。标记偏好在出发前设置。\n声呐探测10秒，冷却60秒；接触猎物或领主时自动咬击。水下蓄势后向上破水，受伤进食优先治疗。";
  $("resume").innerHTML =
    won || dead || timeup
      ? "再次潜入 <span>↗</span>"
      : "继续探索 <span>→</span>";
  $("restart").hidden = won || dead || timeup;
  bestLength = Math.max(bestLength, player.length);
  try {
    localStorage.setItem("abyssal_best", String(bestLength));
  } catch {
    /* 存储不可用不影响本局。 */
  }
  $("resume").focus({ preventScroll: true });
}
function resumeGame() {
  if (mode === "paused") {
    mode = "playing";
    lastTime = performance.now();
    $("overlay").hidden = true;
    audio.start();
    audio.setPaused(false);
    canvas.focus({ preventScroll: true });
  } else startGame();
}
function togglePause() {
  if (mode === "playing") showOverlay("paused");
  else if (mode === "paused") resumeGame();
}
function blockedBetween(a, b) {
  return segmentBlocked(a, b, solidColliders);
}
function resolvePlayerMotion(previous, merge = false) {
  const radius = bodyRadius(player.length);
  const result = resolveMotion(previous, position, {
    colliders: solidColliders,
    radius,
    forward,
    length: player.length,
    floorHeight: (x, z) =>
      floorAt(
        x,
        z,
        radius +
          Math.abs(forward.y) * Math.max(0, player.length * 0.42 - radius) +
          0.4,
      ),
    bounds: {
      minX: WORLD.minX + 5,
      maxX: WORLD.maxX - 5,
      minZ: WORLD.minZ + 5,
      maxZ: WORLD.maxZ - 5,
      minY: -WORLD.maxDepth + radius,
      maxY: surface.airborne
        ? undefined
        : WORLD.surfaceY - player.length * 0.15,
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
function updatePlayer(dt, roundDt) {
  const inputX =
    pointer.x + (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
  const inputY =
    -pointer.y + (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
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
  if (!jet) {
    yaw -= Clamp(inputX, -1, 1) * movement.yawRate * dt;
    pitch = THREE.MathUtils.damp(
      pitch,
      Clamp(inputY, -1, 1) * movement.pitchLimit,
      movement.pitchResponse,
      dt,
    );
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
        : keys.has("KeyK")
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
  });
  const visualPitch = waterMotion?.posePitch ?? pitch;
  const visualYaw = waterMotion?.poseYaw ?? yaw;
  rotation.set(
    visualPitch,
    visualYaw,
    -Clamp(inputX, -1, 1) * (wasAirborne ? 0.09 : 0.24),
  );
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
  refreshDynamicColliders();
  resolvePlayerMotion(previousPosition);
  avatar.position.copy(position);
  avatar.scale.setScalar(player.length);
  avatar.userData.animate?.(elapsed, boosting ? 2.2 : 0.9);
  avatar.visible = true;
  avatar.position.y +=
    player.invulnerable > 0 ? Math.sin(elapsed * 35) * 0.05 : 0;
  playerLight.position.copy(position).add(new THREE.Vector3(0, 4, -3));
  $("movement-mode").textContent = surface.airborne
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
  if ((boosting || jet) && Math.random() < 0.6) burst(position, 1);
  // 饥饿先由规则模块处理，熔岩只在贴近深海海底时灼伤。
  if (
    position.z < -680 &&
    position.y < seabedHeight(position.x, position.z) + 4.5 &&
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
function eatEntity(entity, mouth) {
  const { species, mesh } = entity;
  const biteRange = player.length * 0.22 + species.length * 0.28;
  if (
    entity.hiddenFor > 0 ||
    !canEat(player, species.length) ||
    mouth.distanceTo(mesh.position) >= biteRange ||
    blockedBetween(mouth, mesh.position) ||
    !consumePrey(player, species)
  )
    return false;
  audio.eat();
  effects.blood(mesh.position, species.length);
  effects.bite(mouth, forward, player.length);
  burst(mesh.position, 4);
  mesh.visible = false;
  entity.hiddenFor = species.schoolSize > 1 ? 18 : 28;
  entity.chase = 0;
  entity.flight = null;
  mesh.userData.setGliding?.(false);
  notify(
    `捕食 ${species.label} · ${player.lastMeal.healed > 0 ? "生命 +" + Math.round(player.lastMeal.healed) + " · " : ""}体长 ${player.length.toFixed(1)} m`,
    1.7,
  );
  return true;
}
function updateEntities(dt) {
  threat = null;
  let bestThreat = Infinity;
  const mouth = position.clone().addScaledVector(forward, player.length * 0.36);
  for (const entity of entities) {
    const { species, mesh } = entity;
    entity.cooldown = Math.max(0, entity.cooldown - dt);
    if (entity.telegraph) entity.telegraph.visible = false;
    if (entity.hiddenFor > 0) {
      mesh.visible = false;
      entity.hiddenFor -= dt;
      if (entity.hiddenFor <= 0) {
        mesh.position.copy(
          entity.school
            ? entity.school.center.clone().add(entity.slot)
            : spawnPosition(species, true),
        );
        mesh.visible = true;
        entity.hunter = createHunterState(species, entity.seed + elapsed);
      }
      continue;
    }
    if (stepFlyingFish(entity, dt, player.elapsed, position)) {
      mesh.visible = mesh.position.distanceTo(position) < 180;
      mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        entity.velocity,
      );
      mesh.userData.animate?.(elapsed + entity.seed, 1.4);
      eatEntity(entity, mouth);
      continue;
    }
    if (entity.disorientedUntil > player.elapsed) {
      mesh.visible = mesh.position.distanceTo(position) < 180;
      mesh.userData.animate?.(elapsed + entity.seed, 0.05);
      if (entity.telegraph) entity.telegraph.visible = false;
      eatEntity(entity, mouth);
      continue;
    }
    entity.mesh.userData.disoriented = false;
    const distance = mesh.position.distanceTo(position),
      edible = canEat(player, species.length);
    mesh.visible =
      distance < (species.length < 7 ? 85 : highQuality ? 165 : 110);
    const predator = species.predator && !edible;
    const sight = !blockedBetween(mesh.position, position);
    // 章鱼即使可被当前角色捕食，也会在近距威胁下防御喷墨。
    const defensiveInk =
      species.kind === "octopus" && edible && sight && distance < 26;
    let moveSpeed = species.speed || 5;
    const direction = new THREE.Vector3();
    if (
      predator &&
      -position.y >= species.depthMin - 20 &&
      distance < Math.max(52, species.length * 3) &&
      sight
    )
      entity.chase = 4;
    else entity.chase = Math.max(0, entity.chase - dt);
    if (predator && entity.chase > 0 && distance < 115 + species.length) {
      direction.copy(position).sub(mesh.position).normalize();
      moveSpeed =
        species.chaseSpeed || Math.min(25, Math.max(15, species.speed || 16));
      const rank = distance / (species.length * 0.35 + 4);
      if (rank < bestThreat) {
        bestThreat = rank;
        threat = { entity, distance };
      }
    } else if (
      edible &&
      (distance < 12 || defensiveInk) &&
      entity.cooldown <= 0
    ) {
      direction.copy(mesh.position).sub(position).normalize();
      moveSpeed = Math.min(10, moveSpeed + 1.5);
    } else if (entity.school) {
      const target = entity.school.center
        .clone()
        .add(entity.slot)
        .add(
          new THREE.Vector3(
            Math.sin(elapsed * 0.2 + entity.school.seed) * 8,
            Math.sin(elapsed * 0.35 + entity.seed) * 1.5,
            Math.cos(elapsed * 0.2 + entity.school.seed) * 8,
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
      entity.telegraph.lookAt(camera.position);
      const phase = hunter.timer / hunter.phaseDuration;
      entity.telegraph.scale.setScalar(
        species.length *
          (hunter.phase === "windup" ? 0.38 + (1 - phase) * 0.2 : 0.38),
      );
      entity.telegraph.material.opacity =
        hunter.phase === "windup" ? 0.35 + phase * 0.55 : 0.2;
    }
    if (hunter.justTriggered) {
      if (hunter.type === "ink") {
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
    const habitat =
      entity.chase > 0 && species.depthMin < 100
        ? { ...species, depthMin: Math.max(5, species.depthMin - 10) }
        : species;
    const steered = steerWithinHabitat(
      mesh.position,
      direction,
      habitat,
      seabedHeight,
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
    const previousHabitatPosition = mesh.position.clone();
    entity.velocity.lerp(direction, Math.min(1, dt * 2));
    mesh.position.addScaledVector(entity.velocity, moveSpeed * dt);
    const floor = floorAt(
      mesh.position.x,
      mesh.position.z,
      species.length * 0.28 + 2,
    );
    mesh.position.x = Clamp(mesh.position.x, WORLD.minX + 8, WORLD.maxX - 8);
    mesh.position.z = Clamp(mesh.position.z, WORLD.minZ + 8, WORLD.maxZ - 8);
    // 深海生物遇到浅坡时退回可容纳的水层，不能被海床一路推到浅滩。
    if (species.depthMin >= 100 && floor > -species.depthMin) {
      mesh.position.copy(previousHabitatPosition);
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
      if (species.depthMin >= 100)
        mesh.position.y = Math.min(mesh.position.y, -species.depthMin);
    }
    if (entity.chase <= 0) {
      const desired = Clamp(
        mesh.position.y,
        -(species.depthMax || 270),
        -(species.depthMin || 5),
      );
      mesh.position.y = THREE.MathUtils.damp(
        mesh.position.y,
        Math.max(floor, desired),
        1,
        dt,
      );
    }
    pushFromRocks(mesh.position, species.length * 0.12);
    mesh.quaternion.slerp(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        entity.velocity.clone().normalize(),
      ),
      Math.min(1, dt * 3),
    );
    if (distance < 180)
      mesh.userData.animate?.(elapsed + entity.seed, moveSpeed / 6);
    if (
      !eatEntity(entity, mouth) &&
      predator &&
      sight &&
      distance < species.length * 0.43 + player.length * 0.2 &&
      entity.cooldown <= 0
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
        notify(`${species.label} 咬伤！冲刺脱离攻击范围`, 2);
        position.addScaledVector(direction, 5);
      }
      entity.cooldown = 2.2;
    }
    // 远处不可见的小型鱼重分布到同类栖息深度，保持探索途中有食物。
    if (
      !entity.school &&
      distance > 240 &&
      species.length < 22 &&
      Math.random() < dt * 0.04
    )
      mesh.position.copy(
        entity.school
          ? entity.school.center.clone().add(entity.slot)
          : spawnPosition(species, true),
      );
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
        `${REWARDS[pickup.kind].symbol} ${REWARDS[pickup.kind].name} · ${REWARDS[pickup.kind].effect}`,
      );
      burst(pickup.mesh.position, 15);
    }
  }
}
function updateCamera(dt) {
  const ratio = player.length / 6;
  const offset = new THREE.Vector3(
    0,
    4.8 + ratio * 1.4,
    13 + ratio * 4,
  ).applyEuler(
    new THREE.Euler((waterMotion?.posePitch ?? pitch) * 0.35, yaw, 0, "YXZ"),
  );
  const desired = position.clone().add(offset);
  desired.y = Math.max(desired.y, floorAt(desired.x, desired.z, 2));
  const shorten = (point) => {
    const hit = castSegment(position, point, solidColliders, 0.6);
    if (hit)
      point
        .copy(hit.point)
        .addScaledVector(new THREE.Vector3().copy(hit.normal), 0.04);
  };
  shorten(desired);
  camera.position.lerp(desired, 1 - Math.exp(-3.5 * dt));
  shorten(camera.position);
  lookTarget.lerp(
    position
      .clone()
      .addScaledVector(forward, 9 + ratio * 2)
      .add(new THREE.Vector3(0, 1.1, 0)),
    1 - Math.exp(-5 * dt),
  );
  camera.lookAt(lookTarget);
  camera.fov = THREE.MathUtils.damp(camera.fov, speed > 18 ? 69 : 60, 2.5, dt);
  camera.updateProjectionMatrix();
}
function atmosphere(dt) {
  const depth = -position.y,
    blend = Clamp((depth - 25) / 350, 0, 1);
  const color = new THREE.Color("#1a8091").lerp(
    new THREE.Color("#030d25"),
    blend,
  );
  const aboveWater = camera.position.y > WORLD.surfaceY;
  if (aboveWater) color.set("#82bdcf");
  document.body.classList.toggle("above-water", aboveWater);
  scene.background.lerp(color, Math.min(1, dt * (aboveWater ? 10 : 3)));
  scene.fog.color.copy(scene.background);
  scene.fog.density = aboveWater
    ? 0.0018
    : 0.01 + blend * 0.003 + effects.ink * 0.115;
  if (!aboveWater && effects.ink > 0.01) {
    scene.fog.color.lerp(new THREE.Color("#111120"), effects.ink);
    scene.background.lerp(new THREE.Color("#111120"), effects.ink);
  }
  ambient.intensity = aboveWater ? 2.5 : 2.2 - blend * 0.85;
  sun.intensity = aboveWater ? 3.5 : 3.0 - blend * 2.5;
  playerLight.intensity = 9 + blend * 19;
}
function updateHud() {
  for (const key of ["health", "stamina", "hunger"]) {
    $(key + "-value").textContent = Math.ceil(player[key]);
    $(key + "-bar").style.width = player[key] + "%";
    $(key + "-bar").parentElement.classList.toggle(
      "low-vital",
      player[key] < 20,
    );
  }
  const remaining = Math.max(0, Math.ceil(ROUND_DURATION - player.elapsed));
  $("round-clock").textContent =
    `远征 ${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  $("round-clock").classList.toggle("urgent", remaining <= 120);
  const zone = getZone(-position.y);
  if (zone.id !== lastZone) {
    if (lastZone) notify(`${zone.name}\n${zone.description}`, 4);
    lastZone = zone.id;
  }
  $("zone-name").textContent = zone.name;
  $("zone-code").textContent =
    {
      reef: "SUNLIT REEF",
      twilight: "THE TWILIGHT",
      abyss: "MIDNIGHT ZONE",
      hadal: "VOLCANIC ABYSS",
    }[zone.id] || "INTO THE BLUE";
  $("depth").textContent = Math.max(
    0,
    Math.round(-position.y * WORLD.displayDepthScale),
  );
  $("length").textContent = player.length.toFixed(1);
  $("eaten").textContent = `已捕食 ${player.eaten}`;
  $("growth").style.width = getProgress(player) + "%";
  $("speed").textContent = Math.round(speed);
  $("depth-dot").style.top =
    Clamp((-position.y / WORLD.maxDepth) * 100, 0, 100) + "%";
  $("objective").textContent =
    player.length < 10
      ? "捕食鱼群，成长至 10 米"
      : player.length < 16
        ? "狩猎海洋霸主，探索深水区"
        : player.length < 24
          ? "挑战远古巨兽，成长至 24 米"
          : player.bossesDefeated
            ? "深渊印记已得 · 成长至 30 米"
            : "24 米后挑战主宰 · 接触咬击";
  $("notification").style.opacity = elapsed < notificationUntil ? "1" : "0";
  $("buffs").innerHTML = Object.entries(player.buffs)
    .filter(([, v]) => v > 0)
    .map(
      ([k, v]) =>
        `<span>${k === "flow" ? "洋流之息" : "深渊狂食"} ${Math.ceil(v)}s</span>`,
    )
    .join("");
  $("threat").hidden = !threat;
  if (threat) {
    const hunter = threat.entity.hunter;
    $("threat-title").textContent =
      `${threat.entity.species.label} · ${hunter.phase === "windup" ? "技能蓄力" : hunter.phase === "active" ? hunter.ability.label : "正在追击"}`;
    $("threat-detail").textContent =
      hunter.phase === "windup"
        ? hunter.tell
        : hunter.phase === "recover"
          ? "突袭已结束 · 趁恢复期拉开距离"
          : "保留冲刺，借岩石遮挡与横向变向脱险";
    $("threat-distance").textContent = Math.round(threat.distance) + "m";
  }
  let target = null,
    targetScore = Infinity;
  for (const e of markersEnabled ? entities : []) {
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
      edible = canEat(player, e.species.length);
    $("target").style.left = (p.x * 0.5 + 0.5) * innerWidth + "px";
    $("target").style.top = (-p.y * 0.5 + 0.5) * innerHeight - 18 + "px";
    $("target").style.color = edible ? "#9ef5d3" : "#ffad8a";
    $("target").textContent =
      `${{ shoal: "Ⅰ 浅海鱼群", hunter: "Ⅱ 海洋霸主", ancient: "Ⅲ 远古巨兽" }[e.species.category] || "海洋生物"} · ${e.species.label} · ${e.species.length}m · ${edible ? "可捕食" : "危险"} / ${Math.round(d)}m`;
  }
  $("boss-panel").hidden = !activeBoss;
  if (activeBoss) {
    const { state, tip } = activeBoss;
    $("boss-name").textContent = state.species.label;
    $("boss-health").style.width = (state.health / state.maxHealth) * 100 + "%";
    $("boss-hp").textContent =
      Math.ceil(state.health) + " / " + state.maxHealth;
    $("boss-tip").textContent =
      player.length < 24 && !(player.buffs.frenzy > 0 && player.length >= 21)
        ? "体型不足 · 借地形与技能间隙撤出领地"
        : tip;
    $("boss-phase").textContent =
      {
        hunt: "领地主宰",
        windup: "危险 · 技能蓄力",
        attack: "技能释放",
        recover: "弱点暴露",
        disoriented: "墨汁迷失",
        return: "已脱离领地",
      }[state.phase] || "领地边界";
  }
  $("feeding-mode").textContent =
    player.health < 100 ? "进食优先回血" : "健康成长";
  $("breach-hint").hidden = position.y < -35 || !!activeBoss;
  const charge = waterMotion?.charge || 0;
  $("breach-hint").textContent = surface.airborne
    ? "破浪跃起 · 靠惯性捕食海鸥"
    : waterMotion?.divingRequired
      ? "先潜下水面，重新积蓄破浪动量"
      : charge >= 0.99
        ? "破浪已就绪 · 保持冲刺向上游"
        : `水下蓄势 ${Math.round(charge * 100)}% · 持续冲刺后向上破水`;
  $("ink-status").hidden = effects.ink < 0.08;
  $("ink-status").textContent =
    effects.ink > 0.35 ? "墨云遮蔽 · 横向游出云团" : "墨云正在散开";
  if (effects.ink > 0.35 || sonar.snapshot.active) $("target").hidden = true;
  keepTargetClear();
}
function keepTargetClear() {
  const label = $("target");
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
  lastTime = now;
  // 图鉴打开时只渲染独立标本，避免两套海洋场景同时消耗图形资源。
  if (guide.isOpen) return;
  if (mode === "menu") {
    elapsed += dt;
    avatar.position.set(6, -18, 66);
    avatar.rotation.set(0.05, -0.65 + Math.sin(elapsed * 0.13) * 0.12, -0.05);
    avatar.userData.animate?.(elapsed, 0.6);
    camera.position.set(18, -12, 85);
    camera.lookAt(-0.5, -17, 61);
    position.set(0, -18, 75);
    for (const e of entities) {
      e.mesh.visible = e.mesh.position.distanceTo(position) < 120;
      if (e.mesh.visible) e.mesh.userData.animate?.(elapsed + e.seed, 0.5);
    }
    ocean.update(elapsed, position);
    surface.update(dt, elapsed, player, position, camera, false);
  } else if (mode === "playing") {
    elapsed += dt;
    updatePlayer(dt, roundDt);
    if (player.timedOut) {
      showOverlay("timeup");
      updateHud();
      renderer.render(scene, camera);
      return;
    }
    const beforeEntities = position.clone();
    const beforeFeedingLength = player.length;
    updateEntities(dt);
    // 猎手击退与捕食成长也在本帧约束，不能等下一帧再把穿入实体的鱼推出。
    if (
      !position.equals(beforeEntities) ||
      player.length !== beforeFeedingLength
    )
      resolvePlayerMotion(beforeEntities, true);
    updatePickups(dt);
    humans.update(dt, player.elapsed, player, position, forward, { speed });
    refreshDynamicColliders();
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
    if (!position.equals(beforeEncounter) || player.length !== beforeBossLength)
      resolvePlayerMotion(beforeEncounter, true);
    avatar.position.copy(position);
    avatar.scale.setScalar(player.length);
    updateCamera(dt);
    surface.update(dt, elapsed, player, position, camera);
    effects.update(dt, camera.position, position);
    updateSonar();
    $("ink-overlay").style.opacity = effects.ink * 0.83;
    lureFlash = Math.max(0, lureFlash - dt);
    $("lure-flash").style.opacity = Math.min(0.4, lureFlash * 0.18);
    atmosphere(dt);
    ocean.update(elapsed, position);
    audio.update(
      elapsed,
      activeBoss ? 0.85 : threat ? Clamp(1 - threat.distance / 90, 0.1, 1) : 0,
      {
        boss: !!activeBoss,
        ink: effects.ink,
        depth: -position.y,
        aboveWater: camera.position.y > WORLD.surfaceY,
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
  renderer.render(scene, camera);
}

$("start").addEventListener("click", startGame);
$("resume").addEventListener("click", resumeGame);
$("restart").addEventListener("click", startGame);
$("pause").addEventListener("click", togglePause);
$("sound").addEventListener("click", () => {
  $("sound").textContent = audio.toggle() ? "声音 · 开" : "声音 · 关";
});
$("quality").addEventListener("click", () => {
  highQuality = !highQuality;
  renderer.setPixelRatio(highQuality ? Math.min(devicePixelRatio, 1.5) : 0.8);
  $("quality").textContent = highQuality ? "画质 · 高" : "画质 · 流畅";
});
window.addEventListener("resize", () => {
  occlusionsAt = -Infinity;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
window.addEventListener("keydown", (e) => {
  if (guide.isOpen) return;
  if (!$("overlay").hidden && e.code === "Tab") {
    // 暂停及结算时只在面板内循环，隐藏的重开按钮不参与焦点顺序。
    const buttons = [...$("overlay").querySelectorAll("input, button")].filter(
      (button) => !button.hidden && button.getClientRects().length,
    );
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
  // 按钮保留原生空格激活；开始或继续后焦点回到画布，下一次空格正常冲刺。
  if (
    e.code === "Space" &&
    e.target instanceof Element &&
    e.target.closest("button, input, select, textarea")
  )
    return;
  if (
    mode === "playing" &&
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.code,
    )
  )
    e.preventDefault();
  if (e.repeat) return;
  if (e.code === "Escape" || e.code === "KeyP") togglePause();
  else if (mode === "playing" && e.code === "KeyJ") activateCharacterSkill();
  else if (mode === "playing") keys.add(e.code);
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  keys.clear();
  touchBoost = false;
  if (mode === "playing") showOverlay("paused");
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && mode === "playing") showOverlay("paused");
});
$("touch-boost").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.currentTarget.setPointerCapture(e.pointerId);
  touchBoost = true;
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  $("touch-boost").addEventListener(event, () => {
    touchBoost = false;
  });
for (const id of ["touch-sonar", "sonar-control"]) {
  $(id).addEventListener("click", () => {
    activateCharacterSkill();
    canvas.focus({ preventScroll: true });
  });
}
const joystick = $("joystick");
let joystickId = null;
function moveJoystick(e) {
  const r = joystick.getBoundingClientRect();
  pointer.x = Clamp((e.clientX - r.left - r.width / 2) / 40, -1, 1);
  pointer.y = Clamp((e.clientY - r.top - r.height / 2) / 40, -1, 1);
  joystick.firstElementChild.style.transform = `translate(${pointer.x * 28}px,${pointer.y * 28}px)`;
}
joystick.addEventListener("pointerdown", (e) => {
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
  if (mode === "playing") showOverlay("paused");
  $("loading").hidden = false;
  $("loading").textContent = "图形上下文已中断，请刷新页面重新潜入。";
});
seedPopulation();
seedPickups();
$("loading").hidden = true;
requestAnimationFrame(frame);
// 开发环境提供状态观察与场景跳转，用于验证终局与边界；生产构建不导出。
if (import.meta.env.DEV)
  window.__ABYSSAL__ = {
    get player() {
      return player;
    },
    get mode() {
      return mode;
    },
    entities,
    encounters,
    effects,
    guide,
    surface,
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
    scene,
    startGame,
    toggleMarkers,
    sonar,
    sonarMarkers,
    sonarWave,
    minimap,
    setMarkers,
    activateSonar,
    activateCharacterSkill,
    get inkAbility() {
      return inkAbility;
    },
    get avatar() {
      return avatar;
    },
    humans,
    camera,
    ocean,
    forward,
    get markersEnabled() {
      return markersEnabled;
    },
    get controls() {
      return { yaw, pitch, speed, pointer: { ...pointer } };
    },
    get lastCollision() {
      return lastCollision;
    },
    get expedition() {
      return expedition;
    },
    setPosition(x, y, z) {
      position.set(x, y, z);
      camera.position.set(x, y + 6, z + 18);
      lookTarget.set(x, y + 1, z - 10);
      avatar.position.copy(position);
    },
    setFacing(nextYaw, nextPitch = 0) {
      yaw = nextYaw;
      pitch = nextPitch;
      forward.set(0, 0, -1).applyEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
    },
    setLength(length) {
      player.length = length;
      player.mass = (length / 6) ** 3;
    },
    takeDamage: (amount) => takeDamage(player, amount),
    collectPickup: (kind) => collectPickup(player, kind),
  };
