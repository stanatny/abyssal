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
} from "./simulation.js";
import { OceanAudio } from "./audio.js";
import { steerWithinHabitat } from "./navigation.js";
import { WORLD } from "./world_config.js";
import { createReward, REWARDS } from "./rewards.js";
import { createSurface } from "./surface.js";
import { createEncounters } from "./encounters.js";

const $ = (id) => document.getElementById(id);
const Clamp = THREE.MathUtils.clamp;
const canvas = $("ocean");
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
const avatar = createCreature("orca", 6);
scene.add(avatar);
const audio = new OceanAudio();
const surface = createSurface(scene, audio, notify);
const encounters = createEncounters(scene, {
  seabedHeight,
  audio,
  notify,
  onDamage() {
    hitFlash = 0.9;
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
  lastZone = "",
  sonarUntil = 0,
  sonarCooldown = 0;
let threat = null,
  touchBoost = false,
  highQuality = true,
  hitFlash = 0,
  uiClock = 0,
  activeBoss = null,
  mouseBite = false,
  touchBite = false;
let bestLength = 6;
try {
  bestLength = Number(localStorage.getItem("abyssal_best")) || 6;
} catch {
  /* 隐私模式仍可游玩。 */
}

function random(min, max) {
  return min + Math.random() * (max - min);
}
function floorAt(x, z, margin = 4) {
  return seabedHeight(x, z) + margin;
}
function speciesList() {
  return Array.isArray(SPECIES) ? SPECIES : Object.values(SPECIES);
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
      point.y < -5
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
  };
  entities.push(entity);
  return entity;
}
function seedPopulation() {
  if (!entities.length)
    for (const species of speciesList()) {
      const count =
        {
          fish: 72,
          tuna: 30,
          ray: 14,
          shark: 5,
          angler: 6,
          squid: 5,
          dunkleosteus: 5,
        }[species.kind] || 6;
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
  }
  for (const kind of ["fish", "tuna"]) {
    const members = entities.filter((e) => e.species.kind === kind),
      groupSize = kind === "fish" ? 12 : 6;
    for (let i = 0; i < members.length; i += groupSize) {
      const species = members[i].species,
        center = spawnPosition(species);
      if (kind === "fish")
        center.set(
          (((i / groupSize) % 3) - 1) * 28,
          -18 - Math.floor(i / groupSize / 2) * 12,
          55 - Math.floor(i / groupSize / 2) * 65,
        );
      else
        center.set(
          ((i / groupSize) % 2 ? 1 : -1) * 30,
          -30 - (i / groupSize) * 16,
          5 - (i / groupSize) * 70,
        );
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
  player = createPlayer();
  position.set(0, -18, 75);
  yaw = 0;
  pitch = 0;
  speed = 12;
  elapsed = 0;
  lastZone = "";
  sonarUntil = 0;
  sonarCooldown = 0;
  notificationUntil = 0;
  hitFlash = 0;
  threat = null;
  pointer.x = 0;
  pointer.y = 0;
  keys.clear();
  touchBoost = false;
  mouseBite = false;
  touchBite = false;
  activeBoss = null;
  surface.reset();
  encounters.reset();
  seedPopulation();
  seedPickups();
  avatar.scale.setScalar(6);
  avatar.visible = true;
  mode = "playing";
  $("menu").hidden = true;
  $("overlay").hidden = true;
  $("hud").hidden = false;
  $("pause").hidden = false;
  camera.position.set(0, -12, 93);
  lookTarget.copy(position);
  audio.start();
  audio.setPaused(false);
  notify("追逐成群的小鱼，快速成长\n近水面向上冲刺可以跃起捕食海鸥", 6);
}
function showOverlay(kind) {
  mode = kind;
  mouseBite = false;
  touchBite = false;
  audio.setPaused(kind !== "won");
  if (kind === "won") audio.victory();
  keys.clear();
  touchBoost = false;
  pointer.x = 0;
  pointer.y = 0;
  $("overlay").hidden = false;
  const won = kind === "won",
    dead = kind === "dead";
  $("overlay-kicker").textContent = won
    ? "APEX OF THE ABYSS"
    : dead
      ? "THE OCEAN REMEMBERS"
      : "EXPEDITION PAUSED";
  $("overlay-title").textContent = won
    ? "深渊，已记住你的名字。"
    : dead
      ? "这次，海洋更胜一筹。"
      : "海洋在等你。";
  $("overlay-body").textContent = won
    ? `你已长成 ${player.length.toFixed(1)} 米的顶级掠食者。\n捕食 ${player.eaten} 次 · 生存 ${Math.floor(elapsed / 60)} 分 ${Math.floor(elapsed % 60)} 秒`
    : dead
      ? `最终体长 ${player.length.toFixed(1)} 米 · 捕食 ${player.eaten} 次\n${player.hunger <= 0 ? "饥饿夺走了你的生命。长大后需要更大的猎物。" : activeBoss ? "主宰比冲刺更快。观察技能前摇、侧向闪避，并利用恢复期撤出领地。" : "保留一段冲刺体力，借助岩柱切断追击者的视线。"}`
      : "鼠标 / WASD 转向，空格冲刺，Shift 慢游。\n水面向上冲刺跃起 · E 声呐 · F / 左键咬击主宰。\n受伤时吃鱼优先治疗，主宰技能结束后有反击窗口。";
  $("resume").innerHTML =
    won || dead ? "再次潜入 <span>↗</span>" : "继续探索 <span>→</span>";
  $("restart").hidden = won || dead;
  bestLength = Math.max(bestLength, player.length);
  try {
    localStorage.setItem("abyssal_best", String(bestLength));
  } catch {
    /* 存储不可用不影响本局。 */
  }
}
function resumeGame() {
  if (mode === "paused") {
    mode = "playing";
    $("overlay").hidden = true;
    audio.start();
    audio.setPaused(false);
  } else startGame();
}
function togglePause() {
  if (mode === "playing") showOverlay("paused");
  else if (mode === "paused") resumeGame();
}
function sonar() {
  if (mode !== "playing") return;
  if (elapsed < sonarCooldown) {
    notify(`声呐正在充能 · ${Math.ceil(sonarCooldown - elapsed)} 秒`, 1);
    return;
  }
  sonarUntil = elapsed + 5;
  sonarCooldown = elapsed + 9;
  audio.sonar();
  notify("声呐已展开 · 绿色可捕食 / 橙红色危险\n向前下潜寻找更大的猎物", 3);
}
function blockedBetween(a, b) {
  const segment = temp.copy(b).sub(a),
    length = segment.length();
  if (length < 0.1) return false;
  segment.multiplyScalar(1 / length);
  for (const rock of ocean.obstacles) {
    const dx = rock.x - a.x,
      dy = rock.y - a.y,
      dz = rock.z - a.z;
    const projection = dx * segment.x + dy * segment.y + dz * segment.z;
    if (projection < 0 || projection > length) continue;
    const distanceSq = dx * dx + dy * dy + dz * dz - projection * projection;
    if (distanceSq < rock.radius * rock.radius * 0.8) return true;
  }
  return false;
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
function updatePlayer(dt) {
  const inputX =
    pointer.x + (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
  const inputY =
    -pointer.y + (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
  yaw -= Clamp(inputX, -1, 1) * 1.15 * dt;
  pitch = THREE.MathUtils.damp(pitch, Clamp(inputY, -1, 1) * 0.86, 3.2, dt);
  rotation.set(pitch, yaw, -Clamp(inputX, -1, 1) * 0.24);
  avatar.quaternion.setFromEuler(rotation);
  forward.set(0, 0, -1).applyEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
  const boosting = tickVitals(player, dt, {
    boosting: keys.has("Space") || touchBoost,
    depth: -position.y,
  }).boosting;
  const targetSpeed = boosting
    ? 24
    : keys.has("ShiftLeft") || keys.has("ShiftRight")
      ? 5
      : 12;
  speed = THREE.MathUtils.damp(speed, targetSpeed, 3, dt);
  position.addScaledVector(forward, speed * dt);
  position.x = Clamp(position.x, WORLD.minX + 5, WORLD.maxX - 5);
  position.z = Clamp(position.z, WORLD.minZ + 5, WORLD.maxZ - 5);
  surface.move(dt, {
    position,
    forward,
    speed,
    boosting,
    length: player.length,
  });
  position.y = Math.max(
    position.y,
    floorAt(position.x, position.z, player.length * 0.22 + 1),
  );
  pushFromRocks(position, player.length * 0.18);
  avatar.position.copy(position);
  avatar.scale.setScalar(player.length);
  avatar.userData.animate?.(elapsed, boosting ? 2.2 : 0.9);
  avatar.visible = true;
  avatar.position.y +=
    player.invulnerable > 0 ? Math.sin(elapsed * 35) * 0.05 : 0;
  playerLight.position.copy(position).add(new THREE.Vector3(0, 4, -3));
  $("movement-mode").textContent = surface.airborne
    ? "跃出水面"
    : boosting
      ? "冲刺"
      : player.exhausted
        ? "体力恢复中"
        : targetSpeed === 5
          ? "慢游"
          : "巡游";
  if (boosting && Math.random() < 0.6) burst(position, 1);
  // 饥饿先由规则模块处理，熔岩只在贴近深海海底时灼伤。
  if (
    position.z < -680 &&
    position.y < seabedHeight(position.x, position.z) + 4.5 &&
    takeDamage(player, 12)
  ) {
    hitFlash = 0.55;
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
function updateEntities(dt) {
  threat = null;
  let bestThreat = Infinity;
  const mouth = position.clone().addScaledVector(forward, player.length * 0.36);
  for (const entity of entities) {
    const { species, mesh } = entity;
    entity.cooldown = Math.max(0, entity.cooldown - dt);
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
      }
      continue;
    }
    const distance = mesh.position.distanceTo(position),
      edible = canEat(player, species.length);
    mesh.visible =
      distance < (species.length < 7 ? 85 : highQuality ? 165 : 110);
    const predator = species.predator && !edible;
    let moveSpeed = species.speed || 5;
    const direction = new THREE.Vector3();
    if (
      predator &&
      -position.y >= species.depthMin - 20 &&
      distance < Math.max(52, species.length * 3) &&
      !blockedBetween(mesh.position, position)
    )
      entity.chase = 4;
    else entity.chase = Math.max(0, entity.chase - dt);
    if (predator && entity.chase > 0 && distance < 115 + species.length) {
      direction.copy(position).sub(mesh.position).normalize();
      moveSpeed = Math.min(20, Math.max(15, species.speed || 16));
      const rank = distance / (species.length * 0.35 + 4);
      if (rank < bestThreat) {
        bestThreat = rank;
        threat = { entity, distance };
      }
    } else if (edible && distance < 12 && entity.cooldown <= 0) {
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
    const habitat =
      entity.chase > 0
        ? { ...species, depthMin: Math.max(5, species.depthMin - 20) }
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
    entity.velocity.lerp(direction, Math.min(1, dt * 2));
    mesh.position.addScaledVector(entity.velocity, moveSpeed * dt);
    const floor = floorAt(
      mesh.position.x,
      mesh.position.z,
      species.length * 0.28 + 2,
    );
    mesh.position.x = Clamp(mesh.position.x, WORLD.minX + 8, WORLD.maxX - 8);
    mesh.position.z = Clamp(mesh.position.z, WORLD.minZ + 8, WORLD.maxZ - 8);
    mesh.position.y = Clamp(mesh.position.y, floor, -4 - species.length * 0.25);
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
    const biteRange = player.length * 0.22 + species.length * 0.28;
    if (
      edible &&
      mouth.distanceTo(mesh.position) < biteRange &&
      consumePrey(player, species)
    ) {
      audio.eat();
      burst(mesh.position);
      mesh.visible = false;
      entity.hiddenFor = 14;
      entity.chase = 0;
      notify(
        `捕食 ${species.label}  ·  ${player.lastMeal.healed > 0 ? "生命 +" + Math.round(player.lastMeal.healed) + " · " : ""}体长 ${player.length.toFixed(1)} m`,
        1.7,
      );
    } else if (
      predator &&
      distance < species.length * 0.43 + player.length * 0.2 &&
      entity.cooldown <= 0
    ) {
      if (takeDamage(player, species.length > 20 ? 48 : 28)) {
        audio.hit();
        hitFlash = 0.85;
        burst(position, 12);
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
  ).applyEuler(new THREE.Euler(pitch * 0.45, yaw, 0, "YXZ"));
  const desired = position.clone().add(offset);
  desired.y = Math.max(desired.y, floorAt(desired.x, desired.z, 2));
  camera.position.lerp(desired, 1 - Math.exp(-3.5 * dt));
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
  scene.fog.density = aboveWater ? 0.0018 : 0.01 + blend * 0.003;
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
      : player.length < 15
        ? "下潜海沟，挑战大白鲨"
        : player.length < 22
          ? "狩猎大王乌贼与邓氏鱼"
          : player.bossesDefeated
            ? "深渊印记已得 · 成长至 30 米"
            : "24 米后挑战主宰 · F 咬击";
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
    $("threat-title").textContent = `${threat.entity.species.label} 正在追击`;
    $("threat-distance").textContent = Math.round(threat.distance) + "m";
  }
  let target = null,
    targetScore = Infinity;
  for (const e of entities) {
    if (!e.mesh.visible) continue;
    const d = e.mesh.position.distanceTo(position);
    if (d > 100) continue;
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
      `${e.species.tier === 1 ? "Ⅰ 鱼群" : "Ⅱ 猎手"} · ${e.species.label} · ${e.species.length}m · ${edible ? "可捕食" : "危险"}${sonarUntil > elapsed ? " / " + Math.round(d) + "m" : ""}`;
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
        return: "已脱离领地",
      }[state.phase] || "领地边界";
  }
  $("feeding-mode").textContent =
    player.health < 100 ? "进食优先回血" : "健康成长";
  $("breach-hint").hidden = position.y < -20 || !!activeBoss;
  $("reticle").style.borderColor =
    sonarUntil > elapsed ? "#8cffe5" : "#d6fff52e";
  $("reticle").style.boxShadow =
    sonarUntil > elapsed
      ? "0 0 0 28px #88efd412, 0 0 0 80px #88efd408"
      : "none";
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.04);
  lastTime = now;
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
    updatePlayer(dt);
    updateEntities(dt);
    updatePickups(dt);
    activeBoss = encounters.update(dt, elapsed, player, position, forward, {
      bite: keys.has("KeyF") || mouseBite || touchBite,
      blockedBetween,
    });
    updateCamera(dt);
    surface.update(dt, elapsed, player, position, camera);
    atmosphere(dt);
    ocean.update(elapsed, position);
    audio.update(
      elapsed,
      activeBoss ? 0.85 : threat ? Clamp(1 - threat.distance / 90, 0.1, 1) : 0,
      {
        boss: !!activeBoss,
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
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
window.addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch" || mode !== "playing") return;
  pointer.x = Clamp((e.clientX / innerWidth - 0.5) * 2, -1, 1);
  pointer.y = Clamp((e.clientY / innerHeight - 0.5) * 2, -1, 1);
  if (Math.abs(pointer.x) < 0.06) pointer.x = 0;
  if (Math.abs(pointer.y) < 0.06) pointer.y = 0;
});
window.addEventListener("keydown", (e) => {
  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.code,
    )
  )
    e.preventDefault();
  if (e.repeat) return;
  if (e.code === "Escape" || e.code === "KeyP") togglePause();
  else if (e.code === "KeyE") sonar();
  else keys.add(e.code);
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
$("touch-sonar").addEventListener("click", sonar);
canvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "touch" && e.button === 0 && mode === "playing")
    mouseBite = true;
});
window.addEventListener("pointerup", () => {
  mouseBite = false;
});
$("touch-bite").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.currentTarget.setPointerCapture(e.pointerId);
  touchBite = true;
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  $("touch-bite").addEventListener(event, () => {
    touchBite = false;
  });
const joystick = $("joystick");
let joystickId = null;
function moveJoystick(e) {
  const r = joystick.getBoundingClientRect();
  pointer.x = Clamp((e.clientX - r.left - r.width / 2) / 40, -1, 1);
  pointer.y = Clamp((e.clientY - r.top - r.height / 2) / 40, -1, 1);
  joystick.firstElementChild.style.transform = `translate(${pointer.x * 28}px,${pointer.y * 28}px)`;
}
joystick.addEventListener("pointerdown", (e) => {
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
    sonar,
    setPosition(x, y, z) {
      position.set(x, y, z);
      camera.position.set(x, y + 6, z + 18);
      lookTarget.set(x, y + 1, z - 10);
      avatar.position.copy(position);
    },
    setLength(length) {
      player.length = length;
      player.mass = (length / 6) ** 3;
    },
    takeDamage: (amount) => takeDamage(player, amount),
    collectPickup: (kind) => collectPickup(player, kind),
  };
