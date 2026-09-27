import * as THREE from "three";
import { createCreature } from "./creatures.js";
import {
  BOSS_SPECIES,
  createBossState,
  tickBoss,
  hitBoss,
  updateBossContact,
  isBossFlankContact,
} from "./boss_rules.js";
import { takeDamage } from "./simulation.js";
import { makeLabel } from "./rewards.js";

/**
 * 检查嘴部小球是否触及领主实际网格或已进入闭合躯干；触腕间空隙不计接触。
 * @param {THREE.Object3D} mesh 已包含体长缩放及游泳动画的领主根节点。
 * @param {THREE.Vector3} mouth 世界坐标中的嘴部中心。
 * @param {number} radius 嘴部接触半径，单位为游戏米。
 * @returns {THREE.Vector3|null} 首个实际接触点；没有接触时返回null。
 */
export function findBossContact(mesh, mouth, radius) {
  if (!Number.isFinite(radius) || radius < 0) return null;
  mesh.updateWorldMatrix(true, true);
  const sphere = new THREE.Sphere();
  const bounds = new THREE.Box3();
  const triangle = new THREE.Triangle();
  const closest = new THREE.Vector3();
  // 使用不平行于常见网格边的射线；双向均为奇数次穿越才判为实体内部。
  // 单面鳍片只挡住其中一向，不会把鳍后大片空水域错误地算进体积。
  const rayDirection = new THREE.Vector3(0.813, 0.451, 0.369).normalize();
  const outwardRay = new THREE.Ray(mouth, rayDirection);
  const inwardRay = new THREE.Ray(mouth, rayDirection.clone().negate());
  const intersection = new THREE.Vector3();
  const radiusSquared = radius * radius;
  let contact = null;
  mesh.traverse((part) => {
    if (contact || !part.isMesh || !part.visible) return;
    const geometry = part.geometry;
    const vertices = geometry.attributes.position;
    if (!vertices) return;
    geometry.boundingSphere || geometry.computeBoundingSphere();
    sphere.copy(geometry.boundingSphere).applyMatrix4(part.matrixWorld);
    if (sphere.distanceToPoint(mouth) > radius) return;
    geometry.boundingBox || geometry.computeBoundingBox();
    bounds.copy(geometry.boundingBox).applyMatrix4(part.matrixWorld);
    if (bounds.distanceToPoint(mouth) > radius) return;
    const couldBeInside = bounds.containsPoint(mouth);
    const forwardCrossings = [];
    const backwardCrossings = [];

    // 仅近身且冷却结束时运行窄相检查，避免把宽大的包围盒当作咬击范围。
    const indices = geometry.index;
    const count = indices ? indices.count : vertices.count;
    for (let index = 0; index < count; index += 3) {
      triangle.a
        .fromBufferAttribute(vertices, indices ? indices.getX(index) : index)
        .applyMatrix4(part.matrixWorld);
      triangle.b
        .fromBufferAttribute(
          vertices,
          indices ? indices.getX(index + 1) : index + 1,
        )
        .applyMatrix4(part.matrixWorld);
      triangle.c
        .fromBufferAttribute(
          vertices,
          indices ? indices.getX(index + 2) : index + 2,
        )
        .applyMatrix4(part.matrixWorld);
      triangle.closestPointToPoint(mouth, closest);
      if (closest.distanceToSquared(mouth) <= radiusSquared) {
        contact = closest.clone();
        break;
      }
      if (couldBeInside) {
        if (
          outwardRay.intersectTriangle(
            triangle.a,
            triangle.b,
            triangle.c,
            false,
            intersection,
          )
        )
          forwardCrossings.push(intersection.distanceToSquared(mouth));
        if (
          inwardRay.intersectTriangle(
            triangle.a,
            triangle.b,
            triangle.c,
            false,
            intersection,
          )
        )
          backwardCrossings.push(intersection.distanceToSquared(mouth));
      }
    }
    if (
      !contact &&
      hasOddCrossings(forwardCrossings) &&
      hasOddCrossings(backwardCrossings)
    )
      contact = mouth.clone();
  });
  return contact;
}

function hasOddCrossings(distances) {
  // 共面三角形在共享边上只算一次穿越。
  distances.sort((a, b) => a - b);
  const distinct = distances.filter(
    (distance, index) =>
      index === 0 || Math.abs(distance - distances[index - 1]) > 1e-6,
  );
  return distinct.length % 2 === 1;
}

const TIPS = {
  vortex: "漩涡锁定游动路径 · 变向离开光圈，借岩柱阻断牵引",
  pulse: "快速上浮或下潜，避开脉冲所在水层",
  volley: "横向变向躲开三连弹，不要直线后退",
  charge: "冲锋锁定后侧向闪避，等待撞击后的硬直",
};
const SKILLS = {
  vortex: "深渊漩涡",
  pulse: "遗迹脉冲",
  volley: "三重吐息",
  charge: "毁灭冲锋",
};
const COLORS = {
  vortex: 0xbc8dff,
  pulse: 0x73ffd0,
  volley: 0xffa16f,
  charge: 0x87dfff,
};

/*********************************************
 * 技能视觉层：只读状态机相位，不改判定、数值与计时。
 ********************************************/

function makeDotTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(32, 32, 1, 32, 32, 31);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.4)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function makeVeilTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  for (let i = 0; i < 30; i += 1) {
    const x = Math.random() * 128,
      width = 1.5 + Math.random() * 4;
    const alpha = 0.08 + Math.random() * 0.26;
    const gradient = context.createLinearGradient(x, 0, x, 64);
    gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
    gradient.addColorStop(0.65, `rgba(255,255,255,${alpha * 0.5})`);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(x - width / 2, 0, width, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function makeRuneTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  context.strokeStyle = "rgba(255,255,255,0.85)";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(128, 128, 118, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 1.6;
  context.beginPath();
  context.arc(128, 128, 96, 0, Math.PI * 2);
  context.stroke();
  // 放射刻痕与节点构成遗迹符文盘。
  for (let i = 0; i < 18; i += 1) {
    const angle = (i / 18) * Math.PI * 2;
    const inner = 96 + (i % 3) * 4,
      outer = 118 - (i % 2) * 5;
    context.beginPath();
    context.moveTo(
      128 + Math.cos(angle) * inner,
      128 + Math.sin(angle) * inner,
    );
    context.lineTo(
      128 + Math.cos(angle) * outer,
      128 + Math.sin(angle) * outer,
    );
    context.stroke();
    if (i % 3 === 0) {
      context.beginPath();
      context.arc(
        128 + Math.cos(angle + 0.17) * 106,
        128 + Math.sin(angle + 0.17) * 106,
        3.2,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }
  }
  return new THREE.CanvasTexture(canvas);
}

function fxSprite(texture, color, opacity = 0.5) {
  return new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
}

/** 为每种主宰技能预建有限的装饰网格与粒子，全部在一次战斗中反复复用。 */
function createAbilityFx(scene, ability, color, textures) {
  const group = new THREE.Group();
  group.name = `boss_fx_${ability}`;
  group.visible = false;
  scene.add(group);
  const fx = { group, ability, spin: 0 };
  const additive = (extra = {}) =>
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      ...extra,
    });
  if (ability === "vortex") {
    fx.rings = [];
    for (let i = 0; i < 3; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.05, 6, 64),
        additive({ opacity: 0.3 }),
      );
      mesh.rotation.x = Math.PI / 2 + (i - 1) * 0.34;
      group.add(mesh);
      fx.rings.push(mesh);
    }
    fx.funnel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 1, 1, 20, 1, true),
      additive({ map: textures.veil, opacity: 0.16 }),
    );
    fx.funnel.position.y = 0;
    group.add(fx.funnel);
    fx.debris = [];
    for (let i = 0; i < 16; i += 1) {
      const sprite = fxSprite(textures.dot, i % 3 ? color : 0xd9c6a8, 0.4);
      sprite.userData = {
        angle: Math.random() * Math.PI * 2,
        radius: 0.35 + Math.random() * 0.6,
        speed: 0.9 + Math.random() * 1.4,
        lift: (Math.random() - 0.5) * 0.5,
      };
      group.add(sprite);
      fx.debris.push(sprite);
    }
  } else if (ability === "pulse") {
    fx.disc = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48),
      additive({ map: textures.rune, opacity: 0.3 }),
    );
    fx.disc.rotation.x = -Math.PI / 2;
    group.add(fx.disc);
    fx.shell = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.11, 8, 72),
      additive({ opacity: 0 }),
    );
    fx.shell.rotation.x = Math.PI / 2;
    group.add(fx.shell);
    fx.sparks = [];
    for (let i = 0; i < 10; i += 1) {
      const sprite = fxSprite(textures.dot, color, 0.55);
      sprite.userData = {
        angle: (i / 10) * Math.PI * 2,
        lane: 0.72 + (i % 3) * 0.14,
      };
      group.add(sprite);
      fx.sparks.push(sprite);
    }
  } else if (ability === "volley") {
    fx.warnOrbs = [];
    for (let i = 0; i < 3; i += 1) {
      const sprite = fxSprite(textures.dot, color, 0);
      group.add(sprite);
      fx.warnOrbs.push(sprite);
    }
  } else if (ability === "charge") {
    fx.streaks = [];
    for (let i = 0; i < 12; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.1, 0.1),
        additive({ opacity: 0 }),
      );
      group.add(mesh);
      fx.streaks.push(mesh);
    }
    fx.lockMark = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.08, 6, 40),
      additive({ opacity: 0 }),
    );
    fx.lockMark.rotation.x = Math.PI / 2;
    group.add(fx.lockMark);
    fx.trail = [];
    for (let i = 0; i < 30; i += 1) {
      const sprite = fxSprite(textures.dot, color, 0);
      sprite.visible = false;
      group.add(sprite);
      fx.trail.push({ sprite, age: 0, life: 0 });
    }
    fx.trailCursor = 0;
    fx.trailEmit = 0;
  }
  return fx;
}

/** 每帧按相位驱动技能装饰；仅读取 entry.state，不回写任何战斗数据。 */
function updateAbilityFx(fx, entry, dt, time, windup, attack, ringSize) {
  const state = entry.state;
  const active = windup || attack;
  fx.group.visible = active;
  if (!active) {
    if (fx.ability === "charge")
      for (const puff of fx.trail) puff.sprite.visible = false;
    return;
  }
  const phaseT = Math.min(
    1,
    state.timer / Math.max(0.001, state.phaseDuration),
  );
  if (fx.ability === "vortex") {
    fx.group.position.copy(entry.attackOrigin);
    const speed = attack ? 3.1 : 1.1;
    fx.spin += dt * speed;
    for (let i = 0; i < fx.rings.length; i += 1) {
      const ring = fx.rings[i];
      const radius = ringSize * (0.42 + i * 0.26);
      ring.scale.setScalar(radius);
      ring.rotation.z = fx.spin * (i % 2 ? -1.2 : 1) + i * 2.1;
      ring.position.y = (i - 1) * state.species.length * 0.09;
      ring.material.opacity = attack
        ? 0.5
        : 0.16 + 0.14 * Math.sin(time * 9 + i * 2);
    }
    fx.funnel.scale.set(
      ringSize * 0.5,
      state.species.length * 0.8,
      ringSize * 0.5,
    );
    fx.funnel.rotation.y = -fx.spin * 1.6;
    fx.funnel.material.opacity = attack ? 0.22 : 0.08;
    for (const sprite of fx.debris) {
      const d = sprite.userData;
      d.angle += dt * d.speed * (attack ? 2.2 : 0.9);
      const pull = attack ? 0.82 + 0.18 * Math.sin(time * 3 + d.angle) : 1;
      sprite.position.set(
        Math.cos(d.angle) * ringSize * d.radius * pull,
        d.lift * state.species.length * 0.3 +
          Math.sin(time * 1.7 + d.angle * 2) * 1.6,
        Math.sin(d.angle) * ringSize * d.radius * pull,
      );
      sprite.scale.setScalar(attack ? 2.1 : 1.3);
      sprite.material.opacity = attack ? 0.5 : 0.22;
    }
  } else if (fx.ability === "pulse") {
    fx.group.position.copy(entry.attackOrigin);
    const gather = windup ? phaseT : 1;
    fx.disc.scale.setScalar(
      state.species.abilityRadius * (0.35 + gather * 0.65),
    );
    fx.disc.material.opacity = windup
      ? 0.14 + 0.18 * phaseT + 0.08 * Math.sin(time * 7)
      : Math.max(0, 0.3 * (1 - phaseT));
    fx.disc.rotation.z = time * 0.22;
    fx.shell.scale.setScalar(ringSize);
    fx.shell.material.opacity = attack ? Math.max(0, 0.75 * (1 - phaseT)) : 0;
    for (const sprite of fx.sparks) {
      const d = sprite.userData;
      const orbit = windup
        ? state.species.abilityRadius * d.lane * (1 - gather * 0.82)
        : 0;
      sprite.position.set(
        Math.cos(d.angle + time * 0.9) * orbit,
        Math.sin(time * 2.2 + d.angle) * 2.2,
        Math.sin(d.angle + time * 0.9) * orbit,
      );
      sprite.scale.setScalar(2.4);
      sprite.material.opacity = windup ? 0.25 + gather * 0.4 : 0;
    }
  } else if (fx.ability === "volley") {
    fx.group.position.copy(entry.mesh.position);
    const forward = entry.heading,
      side = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
    for (let i = 0; i < 3; i += 1) {
      const sprite = fx.warnOrbs[i];
      const offset = (i - 1) * state.species.length * 0.16;
      sprite.position
        .copy(forward)
        .multiplyScalar(state.species.length * 0.4)
        .addScaledVector(side, offset)
        .add(new THREE.Vector3(0, state.species.length * 0.06, 0));
      const grow = windup
        ? 1.6 + phaseT * 3.4 + Math.sin(time * 11 + i * 2) * 0.5
        : 0;
      sprite.scale.setScalar(Math.max(0.01, grow));
      sprite.material.opacity = windup ? 0.32 + phaseT * 0.4 : 0;
    }
  } else if (fx.ability === "charge") {
    const forward = entry.heading,
      origin = entry.attackOrigin,
      target = entry.lockTarget;
    const lockDistance = origin.distanceTo(target);
    const side = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
    if (windup) {
      fx.group.position.set(0, 0, 0);
      for (let i = 0; i < fx.streaks.length; i += 1) {
        const mesh = fx.streaks[i];
        const flow = (time * 1.35 + i / fx.streaks.length) % 1;
        mesh.position
          .copy(origin)
          .addScaledVector(forward, flow * lockDistance)
          .addScaledVector(side, Math.sin(i * 2.7) * 3.2)
          .add(new THREE.Vector3(0, Math.cos(i * 1.9) * 2.4, 0));
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), forward);
        mesh.scale.set(3.4 + flow * 4.5, 1, 1);
        mesh.material.opacity = 0.1 + flow * 0.3 * (0.4 + phaseT * 0.6);
      }
      fx.lockMark.position.copy(target);
      fx.lockMark.scale.setScalar(
        3.2 + Math.sin(time * 10) * 0.9 + phaseT * 1.6,
      );
      fx.lockMark.material.opacity = 0.3 + phaseT * 0.4;
      for (const puff of fx.trail) puff.sprite.visible = false;
    } else {
      for (const mesh of fx.streaks) mesh.material.opacity = 0;
      fx.lockMark.material.opacity = 0;
      fx.group.position.set(0, 0, 0);
      fx.trailEmit -= dt;
      while (fx.trailEmit <= 0) {
        fx.trailEmit += 0.035;
        const puff = fx.trail[fx.trailCursor++ % fx.trail.length];
        puff.age = 0;
        puff.life = 1.2;
        puff.sprite.position
          .copy(entry.mesh.position)
          .addScaledVector(side, (Math.random() - 0.5) * 4)
          .add(new THREE.Vector3(0, (Math.random() - 0.5) * 3, 0));
        puff.sprite.visible = true;
      }
      for (const puff of fx.trail) {
        if (!puff.sprite.visible) continue;
        puff.age += dt;
        const t = puff.age / puff.life;
        puff.sprite.visible = t < 1;
        puff.sprite.scale.setScalar(4 + t * 9);
        puff.sprite.material.opacity = 0.55 * (1 - t);
      }
    }
  }
}

/** 稀有领地战的空间表现：技能前摇、可躲避攻击、撤退边界与多次咬击。 */
export function createEncounters(
  scene,
  { seabedHeight, audio, notify, onDamage, onBite },
) {
  const bosses = [],
    projectiles = [];
  let active = null;
  const previousPlayerPosition = new THREE.Vector3();
  const playerVelocity = new THREE.Vector3();
  let hasPlayerPosition = false;
  const fxTextures = {
    dot: makeDotTexture(),
    veil: makeVeilTexture(),
    rune: makeRuneTexture(),
  };
  const ballGeo = new THREE.SphereGeometry(1, 10, 8),
    fxMat = new THREE.MeshBasicMaterial({
      color: 0xffcf9e,
      transparent: true,
      opacity: 0.95,
    });
  for (const species of BOSS_SPECIES) {
    const mesh = createCreature(
      species.kind,
      species.length,
      91 + bosses.length,
    );
    scene.add(mesh);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.018, 6, 72),
      new THREE.MeshBasicMaterial({
        color: COLORS[species.ability],
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
    const label = makeLabel("禁入领地", species.label, "#efbeab");
    scene.add(label);
    bosses.push({
      state: createBossState(species),
      mesh,
      home: new THREE.Vector3(),
      enabled: false,
      radius: 110,
      ring,
      label,
      fx: createAbilityFx(
        scene,
        species.ability,
        COLORS[species.ability],
        fxTextures,
      ),
      previousPhase: "dormant",
      heading: new THREE.Vector3(0, 0, -1),
      attackOrigin: new THREE.Vector3(),
      lockTarget: new THREE.Vector3(),
      respawn: 0,
      contactCooldown: 0,
      phaseHit: false,
      disorientedUntil: 0,
      volleyShots: 0,
      lockedVelocity: new THREE.Vector3(),
      lastBiteResult: null,
      lastAttackSide: false,
    });
  }
  function removeProjectile(p) {
    scene.remove(p.mesh);
    // 光晕材质属于单发弹体，弹体本身的共享几何和材质继续复用。
    for (const child of p.mesh.children)
      if (child.isSprite) child.material.dispose();
    if (p.trail)
      for (const ghost of p.trail) {
        scene.remove(ghost.sprite);
        ghost.sprite.material.dispose();
      }
  }
  function place(entry, index) {
    const species = entry.state.species;
    const x = (index === 0 ? -1 : 1) * (145 + Math.random() * 20);
    const targetDepth = species.depthMin + 25 + Math.random() * 35;
    let z = THREE.MathUtils.clamp(
      -200 - (targetDepth + 75 - 140) / 0.72,
      -1110,
      -520,
    );
    for (
      let i = 0;
      i < 12 &&
      seabedHeight(x, z) + species.length * 0.24 + 35 > -species.depthMin;
      i++
    )
      z = Math.max(-1120, z - 25);
    const floor = seabedHeight(x, z) + species.length * 0.24 + 35;
    const depth = Math.min(targetDepth, -floor, species.depthMax);
    entry.home.set(x, -depth, z);
    entry.mesh.position.copy(entry.home);
    entry.mesh.visible = true;
    entry.enabled = true;
    entry.previousPhase = "dormant";
    entry.contactCooldown = 0;
    entry.disorientedUntil = 0;
    entry.volleyShots = 0;
    entry.lastBiteResult = null;
    entry.lastAttackSide = false;
    entry.respawn = 0;
    entry.slot = index;
    entry.label.position.copy(entry.home).add(new THREE.Vector3(0, 25, 0));
    entry.label.scale.set(30, 7.5, 1);
  }
  function reset(allowedKinds) {
    for (const p of projectiles) removeProjectile(p);
    projectiles.length = 0;
    active = null;
    hasPlayerPosition = false;
    playerVelocity.set(0, 0, 0);
    const shuffled = bosses
      .filter(
        (entry) =>
          !allowedKinds || allowedKinds.includes(entry.state.species.kind),
      )
      .sort(() => Math.random() - 0.5);
    bosses.forEach((entry) => {
      entry.state = createBossState(entry.state.species);
      entry.enabled = false;
      entry.mesh.visible = false;
      entry.label.visible = false;
      entry.ring.visible = false;
      entry.fx.group.visible = false;
      if (entry.fx.ability === "charge")
        for (const puff of entry.fx.trail) puff.sprite.visible = false;
    });
    shuffled.slice(0, 2).forEach((entry, index) => place(entry, index));
  }
  function damage(player, amount, message) {
    if (takeDamage(player, amount)) {
      audio.hit();
      onDamage();
      notify(message, 2.2);
      return true;
    }
    return false;
  }
  function lockAttack(entry, playerPosition) {
    const { state } = entry;
    const distance = entry.mesh.position.distanceTo(playerPosition);
    const flightTime =
      state.ability === "volley"
        ? distance / state.species.projectileSpeed
        : state.ability === "charge"
          ? distance / state.species.chargeSpeed
          : 0.25;
    entry.lockedVelocity.copy(playerVelocity);
    entry.lockTarget
      .copy(playerPosition)
      .addScaledVector(
        playerVelocity,
        Math.min(2.2, state.species.lockWindow + flightTime),
      );
    entry.lockTarget.y = Math.max(
      entry.lockTarget.y,
      seabedHeight(entry.lockTarget.x, entry.lockTarget.z) + 5,
    );
    entry.attackOrigin.copy(entry.mesh.position);
    // 漩涡在预计逃跑路径上封路；脉冲切入玩家当前水层，不只扫过领主自身高度。
    if (state.ability === "vortex") entry.attackOrigin.copy(entry.lockTarget);
    if (state.ability === "pulse") entry.attackOrigin.y = entry.lockTarget.y;
    const targetDirection = entry.lockTarget.clone().sub(entry.mesh.position);
    if (targetDirection.lengthSq() > 0.001)
      entry.heading.copy(targetDirection.normalize());
  }
  function enterPhase(entry, playerPosition) {
    const state = entry.state;
    if (state.phase === "windup") {
      lockAttack(entry, playerPosition);
      entry.phaseHit = false;
      entry.volleyShots = 0;
      notify(
        `${state.species.label} · ${SKILLS[state.ability]}\n${TIPS[state.ability]}`,
        state.species.windupDuration + 0.4,
      );
      audio.bossAttack?.(state.species.kind);
    }
  }
  function fireVolley(entry, headIndex) {
    const { state } = entry;
    const side = new THREE.Vector3(
      -entry.heading.z,
      0,
      entry.heading.x,
    ).normalize();
    const mesh = new THREE.Mesh(ballGeo, fxMat);
    mesh.scale.setScalar(2.6);
    mesh.position
      .copy(entry.mesh.position)
      .addScaledVector(entry.heading, state.species.length * 0.35)
      .addScaledVector(side, (headIndex - 1) * state.species.length * 0.16)
      .add(new THREE.Vector3(0, state.species.length * 0.06, 0));
    const glow = fxSprite(fxTextures.dot, COLORS.volley, 0.75);
    glow.scale.setScalar(9);
    mesh.add(glow);
    scene.add(mesh);
    const trail = [];
    for (let i = 0; i < 8; i += 1) {
      const sprite = fxSprite(fxTextures.dot, COLORS.volley, 0);
      sprite.visible = false;
      scene.add(sprite);
      trail.push({ sprite, age: 1 });
    }
    // 三个头分拍射向各自预判点，发射后不追踪，横向变向仍有稳定的规避空间。
    const target = entry.lockTarget
      .clone()
      .addScaledVector(entry.lockedVelocity, headIndex * 0.45);
    const velocity = target
      .sub(mesh.position)
      .normalize()
      .multiplyScalar(state.species.projectileSpeed);
    projectiles.push({
      mesh,
      velocity,
      life: 4,
      damage: 34,
      trail,
      trailAge: 0,
    });
  }
  function moveBoss(entry, direction, speed, dt, blockedBetween) {
    const step = speed * dt;
    const origin = entry.mesh.position;
    const candidates = [direction];
    const side = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
    // 领地岩柱会实际挡住追猎；主动绕侧面和上方接近，而非卡住或穿石追杀。
    for (const offset of [
      side,
      side.clone().negate(),
      new THREE.Vector3(0, 1, 0),
    ])
      candidates.push(
        direction.clone().addScaledVector(offset, 1.6).normalize(),
      );
    const clear = candidates.find(
      (candidate) =>
        !blockedBetween(
          origin,
          origin.clone().addScaledVector(candidate, Math.max(7, step + 4)),
        ),
    );
    if (!clear) return;
    entry.heading.lerp(clear, 1 - Math.exp(-dt * 3.6)).normalize();
    const next = origin.clone().addScaledVector(entry.heading, step);
    if (!blockedBetween(origin, next)) origin.copy(next);
  }
  /** 喷墨只打断已在交战中的领主；十秒内停留原地，未射出的招式全部取消。 */
  function disorient(center, radius, now, duration = 10) {
    let affected = 0;
    for (const entry of bosses) {
      if (
        !entry.enabled ||
        entry.state.defeated ||
        !["hunt", "windup", "attack", "disoriented"].includes(
          entry.state.phase,
        ) ||
        entry.mesh.position.distanceTo(center) > radius
      )
        continue;
      entry.disorientedUntil = Math.max(entry.disorientedUntil, now + duration);
      tickBoss(entry.state, 0, { inTerritory: true, disoriented: true });
      entry.previousPhase = "disoriented";
      entry.ring.visible = false;
      entry.fx.group.visible = false;
      entry.phaseHit = true;
      entry.volleyShots = 3;
      affected += 1;
    }
    return affected;
  }
  function update(dt, time, player, position, forward, { blockedBetween }) {
    active = null;
    if (player.dead || player.won || player.timedOut) return active;
    if (hasPlayerPosition && dt > 0) {
      const measured = position
        .clone()
        .sub(previousPlayerPosition)
        .divideScalar(dt);
      // 瞬移调试、重生和碰撞修正不应把预判点射到领地之外。
      if (measured.length() > 100) measured.set(0, 0, 0);
      playerVelocity.lerp(measured, 1 - Math.exp(-dt * 8));
    } else playerVelocity.set(0, 0, 0);
    previousPlayerPosition.copy(position);
    hasPlayerPosition = true;
    for (const entry of bosses) {
      const state = entry.state;
      if (!entry.enabled) continue;
      if (state.defeated) {
        entry.mesh.visible = false;
        entry.label.visible = false;
        entry.ring.visible = false;
        entry.fx.group.visible = false;
        if (entry.fx.ability === "charge")
          for (const puff of entry.fx.trail) puff.sprite.visible = false;
        entry.respawn -= dt;
        if (entry.respawn <= 0) {
          entry.state = createBossState(state.species);
          place(entry, entry.slot);
        }
        continue;
      }
      const distance = entry.mesh.position.distanceTo(position),
        homeDistance = entry.home.distanceTo(position),
        inTerritory = homeDistance < entry.radius;
      entry.mesh.visible = distance < 230;
      entry.label.visible = homeDistance < 175 && !inTerritory;
      entry.contactCooldown = Math.max(0, entry.contactCooldown - dt);
      const sight = !blockedBetween(entry.mesh.position, position);
      tickBoss(state, dt, {
        inTerritory,
        distance,
        lineOfSight: sight,
        playerAlive: !player.dead && !player.won && !player.timedOut,
        disoriented: time < entry.disorientedUntil,
      });
      if (state.phase !== entry.previousPhase) {
        enterPhase(entry, position);
        entry.previousPhase = state.phase;
      }
      if (
        state.phase === "windup" &&
        state.timer < state.phaseDuration - state.species.lockWindow
      )
        lockAttack(entry, position);
      const attack = state.phase === "attack",
        windup = state.phase === "windup",
        recover = state.phase === "recover";
      if (state.phase === "hunt") {
        const intercept = position
          .clone()
          .addScaledVector(playerVelocity, Math.min(1.4, distance / 65));
        const huntingDirection = intercept.sub(entry.mesh.position).normalize();
        moveBoss(
          entry,
          huntingDirection,
          state.species.speed,
          dt,
          blockedBetween,
        );
      } else if (state.phase === "return") {
        const back = entry.home.clone().sub(entry.mesh.position);
        if (back.length() > 2) {
          back.normalize();
          moveBoss(entry, back, 22, dt, blockedBetween);
        }
      } else if (state.phase === "dormant") {
        entry.mesh.position
          .copy(entry.home)
          .add(
            new THREE.Vector3(
              Math.sin(time * 0.08) * 17,
              Math.sin(time * 0.2) * 3,
              Math.cos(time * 0.08) * 17,
            ),
          );
        entry.heading.set(Math.cos(time * 0.08), 0, -Math.sin(time * 0.08));
      } else if (attack && state.ability === "charge") {
        const old = entry.mesh.position.clone();
        const next = old
          .clone()
          .addScaledVector(entry.heading, state.species.chargeSpeed * dt);
        if (!blockedBetween(old, next)) entry.mesh.position.copy(next);
        const sweep = new THREE.Line3(
          old,
          entry.mesh.position,
        ).closestPointToPoint(position, true, new THREE.Vector3());
        if (
          !entry.phaseHit &&
          sight &&
          sweep.distanceTo(position) <
            state.species.length * 0.2 + player.length * 0.16
        )
          entry.phaseHit = damage(
            player,
            state.species.damage,
            "毁灭冲锋命中 · 锁定后向侧面闪避",
          );
      }
      if (attack && state.ability === "volley") {
        while (
          entry.volleyShots < 3 &&
          state.timer >= entry.volleyShots * 0.45
        ) {
          fireVolley(entry, entry.volleyShots);
          entry.volleyShots += 1;
        }
      }
      entry.mesh.position.y = Math.max(
        entry.mesh.position.y,
        seabedHeight(entry.mesh.position.x, entry.mesh.position.z) +
          state.species.length * 0.2 +
          3,
      );
      // 领主被限制在自己的领域附近，不会穿越整张地图追杀初生玩家。
      const fromHome = entry.mesh.position.clone().sub(entry.home);
      if (fromHome.length() > entry.radius + 22)
        entry.mesh.position
          .copy(entry.home)
          .add(fromHome.setLength(entry.radius + 22));
      entry.mesh.quaternion.slerp(
        new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, -1),
          entry.heading,
        ),
        Math.min(1, dt * 2),
      );
      if (state.phase !== "disoriented")
        entry.mesh.userData.animate?.(
          time,
          attack ? 2.5 : recover ? 0.35 : 1.2,
        );
      entry.ring.visible = windup || attack;
      entry.ring.position.copy(
        ["pulse", "vortex"].includes(state.ability)
          ? entry.attackOrigin
          : entry.mesh.position,
      );
      const ringSize =
        state.ability === "vortex"
          ? state.species.abilityRadius
          : state.ability === "pulse"
            ? windup
              ? state.species.abilityRadius
              : 8 +
                ((state.species.abilityRadius - 8) * state.timer) /
                  state.phaseDuration
            : state.species.length * 0.65;
      entry.ring.scale.setScalar(ringSize);
      entry.ring.material.opacity = windup
        ? 0.35 + Math.sin(time * 12) * 0.2
        : 0.8;
      updateAbilityFx(entry.fx, entry, dt, time, windup, attack, ringSize);
      if (attack && sight) {
        if (state.ability === "vortex") {
          const toCenter = entry.attackOrigin.clone().sub(position);
          const pullDistance = toCenter.length();
          if (
            pullDistance < state.species.abilityRadius &&
            !blockedBetween(entry.attackOrigin, position)
          ) {
            position.addScaledVector(
              toCenter.normalize(),
              Math.min(19 * dt, pullDistance),
            );
            player.stamina = Math.max(0, player.stamina - 11 * dt);
            if (pullDistance < 13 && !entry.phaseHit)
              entry.phaseHit = damage(
                player,
                state.species.damage,
                "触腕绞击 · 变向游出漩涡！",
              );
          }
        }
        if (state.ability === "pulse") {
          const radial = Math.hypot(
            position.x - entry.attackOrigin.x,
            position.z - entry.attackOrigin.z,
          );
          if (
            Math.abs(radial - ringSize) < 8 &&
            Math.abs(position.y - entry.attackOrigin.y) < 10 &&
            !entry.phaseHit
          )
            entry.phaseHit = damage(
              player,
              state.species.damage,
              "遗迹脉冲命中 · 上下换层可躲避",
            );
        }
      }
      const mouth = position
        .clone()
        .addScaledVector(forward, player.length * 0.38);
      const minimumLength =
        player.buffs.frenzy > 0 ? 21 : state.species.minAttackLength;
      const canAttempt =
        inTerritory &&
        !player.dead &&
        !player.won &&
        !player.timedOut &&
        player.length >= minimumLength;
      if (canAttempt || !state.contactArmed) {
        const radius = Math.max(0.4, player.length * 0.06);
        const contact = findBossContact(entry.mesh, mouth, radius);
        updateBossContact(state, Boolean(contact), dt);
        const bossForward = new THREE.Vector3(0, 0, -1).applyQuaternion(
          entry.mesh.quaternion,
        );
        entry.lastAttackSide = isBossFlankContact({
          bossPosition: entry.mesh.position,
          bossForward,
          bossRight: new THREE.Vector3(1, 0, 0).applyQuaternion(
            entry.mesh.quaternion,
          ),
          playerPosition: position,
          playerForward: forward,
        });
        const result = canAttempt
          ? hitBoss(player, state, {
              inRange: Boolean(contact) && !blockedBetween(mouth, contact),
              isFlank: entry.lastAttackSide,
            })
          : { hit: false, reason: "too_small" };
        entry.lastBiteResult = {
          ...result,
          touching: Boolean(contact),
          contactArmed: state.contactArmed,
        };
        if (result.hit) {
          audio.eat();
          onBite?.(contact, state.species.length);
          notify(
            result.defeated
              ? `击败 ${state.species.label} · 深渊印记已获得`
              : `侧翼咬击 ${Math.round(result.damage)} · ${recover ? "弱点命中，脱离后再进攻" : "脱离接触，等待技能后的侧翼破绽"}`,
            2,
          );
          if (result.defeated) entry.respawn = 150 + Math.random() * 60;
        }
      }
      if (
        !state.defeated &&
        !recover &&
        !windup &&
        state.phase !== "disoriented" &&
        inTerritory &&
        sight &&
        distance < state.species.length * 0.3 + player.length * 0.18 &&
        entry.contactCooldown <= 0
      ) {
        damage(
          player,
          state.species.damage * 0.6,
          `${state.species.label} 撕咬 · 不要贴身硬拼`,
        );
        entry.contactCooldown = 2.4;
      }
      if (inTerritory || state.phase === "return")
        if (!active || distance < active.distance)
          active = {
            entry,
            state,
            distance,
            homeDistance,
            tip:
              state.phase === "disoriented"
                ? "墨汁迷失中 · 趁机离开领地"
                : recover
                  ? "侧翼破绽 · 绕侧咬击，脱离后再进攻"
                  : TIPS[state.ability],
          };
    }
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i],
        old = p.mesh.position.clone();
      p.life -= dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      // 吐息弹体拖尾：沿轨迹留下衰减光点，强化弹幕可读性。
      if (p.trail) {
        p.trailAge += dt;
        if (p.trailAge >= 0.05) {
          p.trailAge = 0;
          const ghost = p.trail.reduce((a, b) => (a.age > b.age ? a : b));
          ghost.age = 0;
          ghost.sprite.position.copy(p.mesh.position);
          ghost.sprite.visible = true;
        }
        for (const ghost of p.trail) {
          if (!ghost.sprite.visible) continue;
          ghost.age += dt;
          const t = ghost.age / 0.6;
          ghost.sprite.visible = t < 1;
          ghost.sprite.scale.setScalar(5.5 * (1 - t) + 1);
          ghost.sprite.material.opacity = 0.5 * Math.max(0, 1 - t);
        }
      }
      if (blockedBetween(old, p.mesh.position)) p.life = 0;
      if (
        p.life > 0 &&
        new THREE.Line3(old, p.mesh.position)
          .closestPointToPoint(position, true, new THREE.Vector3())
          .distanceTo(position) <
          4 + player.length * 0.2
      ) {
        damage(player, p.damage, "三重吐息命中 · 横向变向躲避");
        p.life = 0;
      }
      if (p.life <= 0) {
        removeProjectile(p);
        projectiles.splice(i, 1);
      }
    }
    return active;
  }
  reset();
  return {
    bosses,
    update,
    reset,
    disorient,
    get active() {
      return active;
    },
  };
}
