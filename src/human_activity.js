import * as THREE from "three";
import { WORLD } from "./world_config.js";
import { bodyRadius, castSegment, isPositionBlocked } from "./collision.js";
import {
  HUMAN_RULES,
  consumeHuman,
  createSubmarineState,
  detonateTorpedo,
  stepSubmarineImpact,
} from "./human_rules.js";
import { HUMAN_CATALOG, createHumanModel } from "./vehicle_models.js";

export { HUMAN_CATALOG, createHumanModel } from "./vehicle_models.js";

/**
 * 创建有限数量的成人、潜艇和接触鱼雷，所有动画由主循环驱动。
 * @param {THREE.Scene} scene 主场景。
 * @param {object} options heightAt、worldColliders、audio、notify、effects、onEat、onDamage。
 * @returns {object} reset/update/onMovement、实体数组、动态碰撞数组与dispose。
 * onMovement 必须在实体碰撞推开前调用，传入本帧移动前与期望位置。
 */
export function createHumanActivity(
  scene,
  {
    audio,
    notify = () => {},
    effects,
    heightAt = () => -WORLD.maxDepth,
    worldColliders = [],
    onEat,
    onDamage,
    random = Math.random,
  } = {},
) {
  const group = new THREE.Group();
  group.name = "human_activity";
  scene.add(group);
  const entities = [],
    submarines = [],
    hazards = [],
    colliders = [];
  const resources = new Set(),
    models = [];
  const keep = (resource) => (resources.add(resource), resource);
  const sphere = keep(new THREE.SphereGeometry(0.22, 7, 5));
  const ring = keep(new THREE.TorusGeometry(1, 0.035, 5, 40));
  let disposed = false,
    effectCursor = 0,
    nextWarning = 0,
    nextHullNotice = 0;
  const particles = Array.from({ length: 48 }, () => {
    const material = keep(
      new THREE.MeshBasicMaterial({
        color: 0xabdfef,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    const mesh = new THREE.Mesh(sphere, material);
    mesh.visible = false;
    group.add(mesh);
    return { mesh, life: 0, age: 0, velocity: new THREE.Vector3(), size: 1 };
  });

  function addModel(kind) {
    const species = HUMAN_CATALOG.find((entry) => entry.kind === kind);
    const mesh = createHumanModel(kind, species.length);
    models.push(mesh);
    group.add(mesh);
    return {
      mesh,
      species: {
        ...species,
        label: species.name,
        tier: 0,
        nutrition: kind === "diver" ? 18 : 13,
        growth: kind === "diver" ? 0.035 : 0.025,
      },
    };
  }
  for (
    let i = 0;
    i <
    HUMAN_RULES.swimmerCount +
      HUMAN_RULES.diverCount +
      HUMAN_RULES.submarineCount * HUMAN_RULES.releaseCount;
    i++
  ) {
    const kind = i < HUMAN_RULES.swimmerCount ? "swimmer" : "diver";
    const reserved = i >= HUMAN_RULES.swimmerCount + HUMAN_RULES.diverCount;
    entities.push({
      ...addModel(kind),
      id: `human_${i}`,
      kind,
      alive: !reserved,
      reserved,
      protectedUntil: 0,
      anchor: new THREE.Vector3(),
      phase: i * 1.618,
      speed: kind === "swimmer" ? 0.7 : 1.1,
      direction: new THREE.Vector3(0, 0, -1),
      cooldown: reserved ? Infinity : 0,
    });
  }
  for (let i = 0; i < HUMAN_RULES.submarineCount; i++) {
    const entry = {
      ...addModel("submarine"),
      id: `submarine_${i}`,
      kind: "submarine",
      state: createSubmarineState(),
      collider: null,
      lights: [],
    };
    const lampMaterial = keep(new THREE.MeshBasicMaterial({ color: 0x85e6cb }));
    for (let n = 0; n < HUMAN_RULES.submarineHits; n++) {
      const lamp = new THREE.Mesh(sphere, lampMaterial);
      lamp.scale.setScalar(1.8);
      group.add(lamp);
      entry.lights.push(lamp);
    }
    submarines.push(entry);
  }
  for (let i = 0; i < HUMAN_RULES.torpedoCount; i++) {
    const warningMaterial = keep(
      new THREE.MeshBasicMaterial({
        color: 0xff6855,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
    );
    const warning = new THREE.Mesh(ring, warningMaterial);
    warning.rotation.x = Math.PI / 2;
    warning.scale.setScalar(6);
    group.add(warning);
    hazards.push({
      ...addModel("torpedo"),
      id: `torpedo_${i}`,
      kind: "torpedo",
      active: true,
      warning,
      phase: i * 1.4,
    });
  }

  function clampPosition(point, margin = 3, maximumY = WORLD.surfaceY - 0.6) {
    point.x = THREE.MathUtils.clamp(point.x, WORLD.minX + 12, WORLD.maxX - 12);
    point.z = THREE.MathUtils.clamp(point.z, WORLD.minZ + 12, WORLD.maxZ - 12);
    point.y = THREE.MathUtils.clamp(
      point.y,
      Math.max(-WORLD.maxDepth + margin, heightAt(point.x, point.z) + margin),
      maximumY,
    );
    return point;
  }
  function safePosition(base, radius, seed) {
    for (let trial = 0; trial < 40; trial++) {
      const point = base.clone();
      if (trial) {
        const angle = seed + trial * 2.4;
        point.x += Math.cos(angle) * (5 + trial * 1.8);
        point.z += Math.sin(angle) * (5 + trial * 1.8);
      }
      clampPosition(point, radius + 2);
      if (!isPositionBlocked(point, { radius, colliders: worldColliders }))
        return point;
    }
    return clampPosition(
      base.clone().add(new THREE.Vector3(0, radius + 18, 0)),
      radius + 2,
    );
  }
  function emit(point, destructive = false) {
    for (let i = 0; i < (destructive ? 20 : 10); i++) {
      const particle = particles[effectCursor++ % particles.length];
      particle.age = 0;
      particle.life = destructive ? 1.9 : 1.2;
      particle.size = destructive ? 2 : 1;
      particle.mesh.position.copy(point);
      particle.mesh.material.color.set(i % 3 ? 0xafe6ee : 0xffc174);
      particle.mesh.material.opacity = 0.9;
      particle.mesh.visible = true;
      particle.velocity.set(
        (random() - 0.5) * 12,
        2 + random() * 7,
        (random() - 0.5) * 12,
      );
    }
    effects?.flash?.(
      point,
      destructive ? 0xffc074 : 0x9de7f2,
      destructive ? 9 : 4,
    );
  }
  function releaseDivers(submarine, now) {
    const index = submarines.indexOf(submarine);
    const first =
      HUMAN_RULES.swimmerCount +
      HUMAN_RULES.diverCount +
      index * HUMAN_RULES.releaseCount;
    for (let i = 0; i < HUMAN_RULES.releaseCount; i++) {
      const entity = entities[first + i];
      const angle = (i / HUMAN_RULES.releaseCount) * Math.PI * 2 + index;
      const point = submarine.mesh.position
        .clone()
        .add(
          new THREE.Vector3(
            Math.cos(angle) * 17,
            4 + i * 2,
            Math.sin(angle) * 17,
          ),
        );
      entity.anchor.copy(safePosition(point, 1.5, angle));
      entity.mesh.position.copy(entity.anchor);
      entity.direction.set(Math.cos(angle), 0.12, Math.sin(angle)).normalize();
      entity.alive = true;
      entity.cooldown = 0;
      entity.protectedUntil = now + HUMAN_RULES.releaseProtection;
      entity.mesh.visible = true;
    }
  }
  function makeSubmarineCollider(submarine) {
    const point = submarine.mesh.position;
    return {
      id: submarine.id,
      type: "capsule",
      a: { x: point.x, y: point.y, z: point.z - 6.2 },
      b: { x: point.x, y: point.y, z: point.z + 6.2 },
      radius: 2.8,
      owner: "submarine",
    };
  }
  function reset() {
    if (disposed) return;
    nextWarning = 0;
    nextHullNotice = 0;
    colliders.length = 0;
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      entity.alive = !entity.reserved;
      entity.cooldown = entity.reserved ? Infinity : 0;
      entity.protectedUntil = 0;
      const n = i - HUMAN_RULES.swimmerCount;
      const base =
        entity.kind === "swimmer"
          ? new THREE.Vector3(
              -85 + (i % 6) * 32,
              WORLD.surfaceY - 1,
              50 + Math.floor(i / 6) * 52,
            )
          : new THREE.Vector3(
              -95 + (n % 5) * 45,
              -28 - (n % 5) * 15,
              -115 - Math.floor(n / 5) * 125,
            );
      entity.anchor.copy(safePosition(base, 1.4, i));
      entity.mesh.position.copy(entity.anchor);
      entity.mesh.visible = entity.alive;
      entity.direction.set(0, 0, -1);
    }
    for (let i = 0; i < submarines.length; i++) {
      const submarine = submarines[i];
      submarine.state = createSubmarineState();
      const base = new THREE.Vector3(
        [-85, 90, -35][i],
        -[185, 285, 395][i],
        -[445, 660, 855][i],
      );
      submarine.mesh.position.copy(safePosition(base, 12, i));
      submarine.mesh.rotation.set(0, 0, 0);
      submarine.mesh.visible = true;
      submarine.collider = makeSubmarineCollider(submarine);
      colliders.push(submarine.collider);
      submarine.mesh.userData.health = HUMAN_RULES.submarineHits;
      submarine.lights.forEach((lamp, n) => {
        lamp.position
          .copy(submarine.mesh.position)
          .add(new THREE.Vector3((n - 1) * 1.3, 4.2, 1.8));
        lamp.visible = true;
      });
    }
    for (let i = 0; i < hazards.length; i++) {
      const hazard = hazards[i];
      hazard.active = true;
      const band = Math.floor(i / 4);
      const base = new THREE.Vector3(
        -165 + (i % 4) * 100,
        -230 - band * 125,
        -570 - band * 220,
      );
      hazard.mesh.position.copy(safePosition(base, 3, i * 1.6));
      hazard.mesh.rotation.y = i * 0.8;
      hazard.mesh.visible = true;
      hazard.warning.position.copy(hazard.mesh.position);
      hazard.warning.visible = true;
    }
    for (const particle of particles) {
      particle.life = 0;
      particle.mesh.visible = false;
    }
  }

  function bodySweep(previous, desired, forward, length, radius, target) {
    const extent = Math.max(0, length * 0.42 - radius);
    for (const offset of [-extent, -extent * 0.5, 0, extent * 0.5, extent]) {
      const from = new THREE.Vector3()
        .copy(previous)
        .addScaledVector(forward, offset);
      const to = new THREE.Vector3()
        .copy(desired)
        .addScaledVector(forward, offset);
      const hit = castSegment(from, to, [target], radius);
      const wall = castSegment(from, to, worldColliders, radius);
      if (hit && (!wall || hit.time <= wall.time)) return true;
      if (!wall && isPositionBlocked(to, { colliders: [target], radius }))
        return true;
    }
    return false;
  }
  function eatAt(player, entity, now, forward) {
    if (!consumeHuman(player, entity, now)) return;
    entity.cooldown = Infinity;
    entity.mesh.visible = false;
    effects?.bite?.(entity.mesh.position, forward, player.length);
    audio?.eat?.(entity.species.length);
    onEat?.(entity.mesh.position.clone(), entity.species.length, entity);
  }
  function onMovement(
    player,
    previous,
    desired,
    forward,
    { speed = 0, now = player.elapsed || 0 } = {},
  ) {
    if (disposed || player.dead || player.won || player.timedOut) return [];
    const contacts = [],
      radius = bodyRadius(player.length);
    for (const submarine of submarines) {
      if (submarine.state.destroyed) continue;
      const touching = bodySweep(
        previous,
        desired,
        forward,
        player.length,
        radius + 0.08,
        submarine.collider,
      );
      const clear = !isPositionBlocked(previous, {
        colliders: [submarine.collider],
        radius: radius + 4,
        length: player.length,
        forward,
      });
      const newContact = touching && (submarine.state.armed || clear);
      const result = stepSubmarineImpact(submarine.state, {
        touching,
        clear,
        speed,
        length: player.length,
        now,
      });
      if (!result.hit) {
        if (newContact && now >= nextHullNotice) {
          notify(
            player.length < HUMAN_RULES.impactLength
              ? "艇壳坚固 · 达到8米后可冲刺撞击"
              : "艇壳坚固 · 拉开距离后冲刺撞击",
          );
          nextHullNotice = now + 4;
        }
        continue;
      }
      submarine.mesh.userData.health = submarine.state.health;
      submarine.lights.forEach((lamp, n) => {
        lamp.visible = n < submarine.state.health;
      });
      emit(desired, result.destroyed);
      audio?.hit?.(result.destroyed ? 1.2 : 0.7);
      contacts.push({ kind: "submarine", entry: submarine, ...result });
      if (result.destroyed) {
        submarine.mesh.visible = false;
        const index = colliders.indexOf(submarine.collider);
        if (index >= 0) colliders.splice(index, 1);
        if (result.release) releaseDivers(submarine, now);
        notify("潜艇艇壳破裂 · 3 名潜水员正在游出");
      } else notify(`艇壳受损 · 还需 ${submarine.state.health} 次冲撞`);
    }
    for (const hazard of hazards) {
      if (!hazard.active) continue;
      const point = hazard.mesh.position;
      const target = { x: point.x, y: point.y, z: point.z, radius: 1.4 };
      const touching = bodySweep(
        previous,
        desired,
        forward,
        player.length,
        radius,
        target,
      );
      const result = detonateTorpedo(player, hazard, touching);
      if (!result.exploded) continue;
      hazard.mesh.visible = false;
      hazard.warning.visible = false;
      emit(point, true);
      audio?.hit?.(1.3);
      if (result.damaged)
        onDamage?.(HUMAN_RULES.torpedoDamage, point.clone(), hazard);
      notify(result.damaged ? "鱼雷爆炸 · 生命 -28" : "鱼雷爆炸 · 已避开伤害");
      contacts.push({ kind: "torpedo", entry: hazard, ...result });
    }
    for (const entity of entities) {
      if (!entity.alive || now < entity.protectedUntil) continue;
      const point = entity.mesh.position;
      const target = {
        x: point.x,
        y: point.y,
        z: point.z,
        radius: entity.species.length * 0.22,
      };
      if (bodySweep(previous, desired, forward, player.length, radius, target))
        eatAt(player, entity, now, forward);
    }
    return contacts;
  }
  function update(dt, now, player, position, forward, { speed = 0 } = {}) {
    if (disposed) return;
    for (const entity of entities) {
      if (!entity.alive) continue;
      const previous = entity.mesh.position.clone();
      const angle = now * 0.065 + entity.phase;
      const target = entity.anchor
        .clone()
        .add(
          new THREE.Vector3(
            Math.sin(angle) * 7,
            Math.sin(angle * 1.8) * (entity.kind === "swimmer" ? 0.12 : 1.7),
            Math.cos(angle) * 5,
          ),
        );
      const step = target.sub(entity.mesh.position);
      if (step.lengthSq() > 0.01) {
        entity.direction.copy(step).normalize();
        const desired = entity.mesh.position
          .clone()
          .addScaledVector(
            entity.direction,
            Math.min(step.length(), dt * entity.speed),
          );
        clampPosition(desired, 1.5, WORLD.surfaceY - 0.6);
        if (!castSegment(previous, desired, worldColliders, 0.65)) {
          entity.mesh.position.copy(desired);
        } else {
          entity.anchor.copy(previous).addScaledVector(entity.direction, -6);
          entity.direction.negate();
        }
        entity.mesh.rotation.y = Math.atan2(
          -entity.direction.x,
          -entity.direction.z,
        );
      }
      entity.mesh.userData.animate?.(now + entity.phase);
      entity.mesh.visible = position.distanceTo(entity.mesh.position) < 200;
      // 人游入静止玩家时也能捕食；模块只结算一次，不依赖上一帧的玩家速度。
      if (
        entity.mesh.position.distanceTo(position) < player.length * 0.4 &&
        previous.distanceTo(position) < player.length * 0.6 &&
        !castSegment(position, entity.mesh.position, worldColliders)
      )
        eatAt(player, entity, now, forward);
    }
    for (const submarine of submarines) {
      if (!submarine.state.destroyed) submarine.mesh.userData.animate?.(now);
    }
    let nearest = Infinity;
    for (const hazard of hazards) {
      if (!hazard.active) continue;
      const distance = position.distanceTo(hazard.mesh.position);
      nearest = Math.min(nearest, distance);
      hazard.mesh.userData.animate?.(now + hazard.phase);
      hazard.warning.material.opacity =
        0.23 + (Math.sin(now * 5 + hazard.phase) + 1) * 0.14;
      hazard.warning.scale.setScalar(
        5.5 + Math.sin(now * 2 + hazard.phase) * 0.6,
      );
      hazard.warning.visible = distance < 90;
    }
    if (nearest < 30 && now >= nextWarning) {
      notify("附近有接触鱼雷 · 避开红色警示圈");
      nextWarning = now + 7;
    }
    for (const particle of particles) {
      if (particle.life <= 0) continue;
      particle.age += dt;
      const remaining = 1 - particle.age / particle.life;
      if (remaining <= 0) {
        particle.life = 0;
        particle.mesh.visible = false;
        continue;
      }
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.velocity.multiplyScalar(Math.exp(-dt * 1.2));
      particle.velocity.y += dt * 2;
      particle.mesh.material.opacity = remaining * 0.8;
      particle.mesh.scale.setScalar(particle.size * (1 + particle.age * 0.5));
    }
    // 静止接触只作兜底；armed 标志保证同一艇壳不会在两条入口重复计数。
    onMovement(player, position, position, forward, { speed, now });
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const model of models) model.userData.dispose();
    for (const resource of resources) resource.dispose();
    colliders.length = 0;
    group.removeFromParent();
  }
  reset();
  return {
    reset,
    update,
    onMovement,
    entities,
    submarines,
    hazards,
    colliders,
    group,
    dispose,
  };
}
