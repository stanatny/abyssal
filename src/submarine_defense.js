import { createHawaiiVehicleModel } from "./vehicle_hf_models.js";
import * as THREE from "three";
import { message } from "./i18n.js";
import { SUBMARINE_DEFENSE_RULES as RULES } from "./human_rules.js";
import { takeDamage } from "./simulation.js";
import { bodyRadius, castSegment } from "./collision.js";
import { isNursery } from "./nursery_rules.js";

/** HF 直航鱼雷与图鉴共用艇身；独立尾桨保持原有主循环动画接口。 */
export function createAttackTorpedoModel(length = 3) {
  return createHawaiiVehicleModel("attack_torpedo", length);
}

/**
 * 有限鱼雷池及独立潜艇预警状态；共享主循环时钟，不创建额外计时器。
 * @param {THREE.Object3D} parent 人类活动根节点。
 * @param {object} options submarines、castWorld、audio、notify、explode、onDamage。
 * @returns {object} update/reset/dispose、projectiles与当前最近预警。
 */
export function createSubmarineDefense(
  parent,
  { submarines, castWorld, audio, notify, explode, onDamage } = {},
) {
  const states = new Map(),
    projectiles = Array.from({ length: RULES.poolSize }, () => {
      const mesh = createAttackTorpedoModel();
      mesh.visible = false;
      parent.add(mesh);
      return {
        mesh,
        active: false,
        owner: null,
        age: 0,
        previous: new THREE.Vector3(),
        direction: new THREE.Vector3(),
      };
    });
  const from = new THREE.Vector3(),
    to = new THREE.Vector3(),
    relative = new THREE.Vector3(),
    target = new THREE.Vector3();
  const trailMaterial = new THREE.MeshBasicMaterial({
    color: 0xbee6ee,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const trailGeometry = new THREE.SphereGeometry(0.09, 5, 4);
  const bubbles = new THREE.InstancedMesh(
    trailGeometry,
    trailMaterial,
    RULES.poolSize * 12,
  );
  bubbles.frustumCulled = false;
  bubbles.visible = false;
  parent.add(bubbles);
  const dummy = new THREE.Object3D(),
    playerPrevious = new THREE.Vector3();
  let threat = null,
    disposed = false,
    hasMovement = false;
  function reset() {
    states.clear();
    for (const s of submarines) s.mesh.userData.resetDefenseVisual?.();
    submarines.forEach((s, i) =>
      states.set(s.id, {
        phase: "idle",
        remaining: 0,
        nextAt: 6 + i * 4,
        aim: new THREE.Vector3(),
      }),
    );
    projectiles.forEach((p) => {
      p.active = false;
      p.mesh.visible = false;
      p.owner = null;
    });
    bubbles.visible = false;
    threat = null;
    hasMovement = false;
  }
  function detonate(p, point, player, direct = false, playerPosition = point) {
    p.active = false;
    p.mesh.visible = false;
    explode?.(point, true);
    audio?.hit?.(1.15);
    const healthBefore = player.health;
    if (
      direct &&
      player.length >= RULES.minimumLength &&
      !isNursery(playerPosition) &&
      takeDamage(player, RULES.damage)
    ) {
      const actualDamage = healthBefore - player.health;
      onDamage?.(actualDamage, point.clone(), p);
      notify?.(message`潜艇鱼雷命中 · 生命 -${Math.round(actualDamage)}`, 3);
    }
  }
  function update(dt, now, player, position, forward, allowed = true) {
    if (disposed || !(dt > 0) || player.dead || player.won || player.timedOut)
      return;
    threat = null;
    for (const s of submarines) {
      const state = states.get(s.id);
      s.mesh.userData.setDefenseVisual?.(null, null, now);
      if (!allowed || s.state.destroyed) {
        state.phase = "idle";
        continue;
      }
      const distance = s.mesh.position.distanceTo(position),
        eligible =
          player.length >= RULES.minimumLength &&
          !isNursery(position) &&
          distance < RULES.range;
      if (
        state.phase === "idle" &&
        eligible &&
        now >= state.nextAt &&
        !castWorld(s.mesh.position, position, 0.2)
      ) {
        state.phase = "windup";
        state.remaining = RULES.windup;
        notify?.("潜艇正在锁定 · 鱼雷即将发射，准备横向闪避", RULES.windup + 1);
        audio?.hunter?.("shark");
      }
      if (state.phase === "windup") {
        if (!eligible || castWorld(s.mesh.position, position, 0.2)) {
          state.phase = "idle";
          state.nextAt = now + 3;
          continue;
        }
        state.aim.copy(position).sub(s.mesh.position).normalize();
        state.remaining -= dt;
        if (!threat || distance < threat.distance)
          threat = {
            phase: "windup",
            distance,
            remaining: Math.max(0, state.remaining),
            source: s,
          };
        // 艇身鼻部的信号灯闪烁，不影响原耐久指示灯的显隐。
        s.mesh.userData.defenseWarning = state.remaining;
        s.mesh.userData.setDefenseVisual?.(state.remaining, state.aim, now);
        if (state.remaining <= 0) {
          const p = projectiles.find((p) => !p.active);
          state.phase = "idle";
          state.nextAt = now + RULES.cooldown;
          if (!p) continue;
          from.copy(s.mesh.position).addScaledVector(state.aim, 11);
          if (castWorld(s.mesh.position, from, RULES.radius)) continue;
          p.active = true;
          p.owner = s.id;
          p.age = 0;
          p.direction.copy(state.aim);
          p.mesh.position.copy(from);
          p.previous.copy(from);
          p.mesh.visible = true;
          p.mesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 0, -1),
            p.direction,
          );
          s.mesh.userData.launchTorpedoVisual?.(state.aim, now);
          audio?.hit?.(0.25);
          notify?.("鱼雷已发射 · 直线航行，横向避开白色尾迹", 3);
        }
      }
    }
    let active = 0;
    for (let index = 0; index < projectiles.length; index++) {
      const p = projectiles[index];
      if (p.active) {
        p.previous.copy(p.mesh.position);
        p.age += dt;
        to.copy(p.previous).addScaledVector(p.direction, RULES.speed * dt);
        const wall = castWorld(p.previous, to, RULES.radius);
        const extent = Math.max(
          0,
          player.length * 0.42 - bodyRadius(player.length),
        );
        from.copy(position).addScaledVector(forward, -extent);
        target.copy(position).addScaledVector(forward, extent);
        // 相对扫掠考虑鱼身和鱼雷同时移动，不能只测试本帧末尾的鱼。
        relative.copy(p.previous);
        if (hasMovement) relative.sub(playerPrevious).add(position);
        const contact = castSegment(
          relative,
          to,
          [
            {
              type: "capsule",
              a: from,
              b: target,
              radius: bodyRadius(player.length),
            },
          ],
          RULES.radius,
        );
        if (wall && (!contact || wall.time < contact.time))
          detonate(p, wall.point, player);
        else if (contact)
          detonate(
            p,
            relative.copy(p.previous).lerp(to, contact.time),
            player,
            true,
            position,
          );
        else if (p.age >= RULES.lifetime) {
          p.active = false;
          p.mesh.visible = false;
        } else {
          p.mesh.position.copy(to);
          p.mesh.userData.animate(now);
          active++;
          if (!threat)
            threat = {
              phase: "active",
              distance: p.mesh.position.distanceTo(position),
              source: p,
            };
        }
      }
      for (let n = 0; n < 12; n++) {
        relative
          .copy(p.mesh.position)
          .addScaledVector(p.direction, -1.5 - n * 0.65);
        relative.y += Math.sin(n * 1.7 + now * 3) * 0.12;
        dummy.position.copy(relative);
        dummy.scale.setScalar(p.active ? 0.7 + (n % 3) * 0.25 : 0);
        dummy.updateMatrix();
        bubbles.setMatrixAt(index * 12 + n, dummy.matrix);
      }
    }
    bubbles.visible = active > 0;
    if (active) bubbles.instanceMatrix.needsUpdate = true;
    hasMovement = false;
  }
  reset();
  return {
    projectiles,
    states,
    bubbles,
    update,
    reset,
    recordMovement(previous, desired) {
      if (previous.distanceToSquared(desired) > 1e-10) {
        if (!hasMovement) playerPrevious.copy(previous);
        hasMovement = true;
      }
    },
    get threat() {
      return threat;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      projectiles.forEach((p) => p.mesh.userData.dispose());
      bubbles.removeFromParent();
      bubbles.dispose();
      trailGeometry.dispose();
      trailMaterial.dispose();
      states.clear();
      for (const s of submarines) s.mesh.userData.resetDefenseVisual?.();
    },
  };
}
