import * as THREE from "three";
import { createCreature } from "./creatures.js";
import { createFeedingTransition } from "./feeding_transition.js";
import { preyCaptureRadius, sweptCaptureFraction } from "./prey_capture.js";
import {
  activateSummon,
  canMinionEat,
  createSummonState,
  MINION_RULES,
  summonStatus,
} from "./zombie_shark_rules.js";

/**
 * 一只尸鲨仆从的环游、真实接触捕食和生命周期；复用网格与吞食池，不启动额外RAF。
 * @param {THREE.Scene} scene 游戏场景。
 * @param {object} options resolveMovement、blockedBetween、onConsume、onMeal、effects、audio 回调。
 * @returns {object} activate/update/reset、state、feeding 及只读快照接口。
 */
export function createZombieMinion(
  scene,
  {
    resolveMovement,
    blockedBetween,
    onConsume,
    onMeal,
    effects,
    audio,
    accessible = (entry) => entry.mesh.position.y < 0,
  } = {},
) {
  const state = createSummonState();
  const feeding = createFeedingTransition({
    onMist: (point, length) => effects.mealMist(point, length),
  });
  let mesh = null,
    target = null,
    nextSearch = 0,
    alive = false,
    phase = "absent",
    orbitPhase = 0;
  const direction = new THREE.Vector3(0, 0, -1),
    desired = new THREE.Vector3(),
    delta = new THREE.Vector3();
  const previous = new THREE.Vector3(),
    oldMouth = new THREE.Vector3(),
    mouth = new THREE.Vector3(),
    contact = new THREE.Vector3(),
    preyContact = new THREE.Vector3(),
    preyPrevious = new THREE.Vector3();
  const rotation = new THREE.Quaternion(),
    axis = new THREE.Vector3(0, 0, -1),
    side = new THREE.Vector3();
  let previousLength = 0;
  function expire(player) {
    effects.undeadBurst?.(
      mesh.position,
      player.length * MINION_RULES.sizeRatio,
      true,
    );
    audio?.corpseBurst?.();
    feeding.reset();
    mesh.visible = false;
    alive = false;
    target = null;
    phase = "expired";
  }
  function move(start, end, player) {
    const result = resolveMovement?.(
      start,
      end,
      direction,
      player.length * MINION_RULES.sizeRatio,
    );
    mesh.position.copy(result?.position || end);
    if (result?.contacts?.length) {
      for (const hit of result.contacts) {
        const normal = hit.normal;
        const inward = direction.dot(normal);
        if (inward < 0) direction.addScaledVector(normal, -inward);
      }
      if (direction.lengthSq() < 0.01) direction.set(-axis.z, 0, axis.x);
      direction.normalize();
    }
  }
  function activate(player, position, forward) {
    if (!summonStatus(state, player).usable) return false;
    if (alive) expire(player);
    if (!mesh) {
      mesh = createCreature("zombie_shark", 1, 733);
      mesh.name = "zombie_shark_minion";
      scene.add(mesh);
    }
    if (!activateSummon(state, player)) return false;
    feeding.reset();
    mesh.userData.resetMotion?.();
    previousLength = player.length;
    mesh.scale.setScalar(player.length * MINION_RULES.sizeRatio);
    direction.copy(forward);
    side.set(-forward.z, 0, forward.x).normalize();
    if (side.lengthSq() < 0.1) side.set(1, 0, 0);
    desired.copy(position).addScaledVector(side, player.length * 0.6 + 2);
    move(position, desired, player);
    mesh.quaternion.setFromUnitVectors(axis, direction);
    mesh.userData.getFeedingMouth(mouth);
    oldMouth.copy(mouth);
    alive = !player.dead;
    mesh.visible = alive;
    phase = "orbit";
    target = null;
    nextSearch = player.elapsed;
    orbitPhase = 0;
    effects.undeadBurst?.(
      mesh.position,
      player.length * MINION_RULES.sizeRatio,
      false,
    );
    audio?.summonUndead?.();
    return true;
  }
  function update(dt, player, position, forward, prey, otherPrey = []) {
    if (!alive || !mesh) return;
    if (
      player.dead ||
      player.won ||
      player.timedOut ||
      player.characterId !== "zombie_shark"
    ) {
      reset();
      return;
    }
    const status = summonStatus(state, player);
    if (!status.active) {
      expire(player);
      return;
    }
    if (!Number.isFinite(dt) || dt <= 0) return;
    oldMouth.copy(mesh.userData.getFeedingMouth(mouth));
    const visibleLength = player.length * MINION_RULES.sizeRatio;
    const returning =
      mesh.position.distanceToSquared(position) > MINION_RULES.leashRadius ** 2;
    const available = (entry) =>
      canMinionEat(player, entry.species) &&
      (entry.hiddenFor || 0) <= 0 &&
      entry.alive !== false &&
      !(entry.protectedUntil > player.elapsed) &&
      accessible(entry) &&
      entry.mesh.position.distanceToSquared(position) <=
        MINION_RULES.searchRadius ** 2;
    if (target && (!available(target) || returning)) target = null;
    if (!returning && player.elapsed >= nextSearch) {
      nextSearch = player.elapsed + MINION_RULES.searchInterval;
      // 猎物绕到建筑/船体背后时换目标，不持续顶着墙追逐。
      if (target && blockedBetween(mesh.position, target.mesh.position))
        target = null;
      if (!target) {
        let best = Infinity;
        for (const pool of [prey, otherPrey])
          for (const entry of pool) {
            if (!available(entry)) continue;
            const distance = mesh.position.distanceToSquared(
              entry.mesh.position,
            );
            if (
              distance < best &&
              !blockedBetween(mesh.position, entry.mesh.position)
            ) {
              target = entry;
              preyPrevious.copy(entry.mesh.position);
              best = distance;
            }
          }
      }
    }
    orbitPhase += dt * 0.7;
    if (target) {
      phase = "hunt";
      desired
        .copy(target.mesh.position)
        .addScaledVector(direction, -visibleLength * 0.42);
    } else {
      phase = returning ? "return" : "orbit";
      side.set(-forward.z, 0, forward.x).normalize();
      if (side.lengthSq() < 0.1) side.set(1, 0, 0);
      const radius = player.length * 0.58 + 3;
      desired
        .copy(position)
        .addScaledVector(side, Math.cos(orbitPhase) * radius)
        .addScaledVector(forward, Math.sin(orbitPhase) * radius);
      desired.y += Math.sin(orbitPhase * 0.6) * 1.1;
    }
    previous.copy(mesh.position);
    delta.copy(desired).sub(previous);
    const distance = delta.length();
    const swimSpeed =
      returning || !target
        ? MINION_RULES.returnSpeed
        : MINION_RULES.cruiseSpeed;
    if (distance > 0.01) {
      direction
        .lerp(delta.multiplyScalar(1 / distance), Math.min(1, dt * 5))
        .normalize();
      desired
        .copy(previous)
        .addScaledVector(
          direction,
          Math.min(distance, swimSpeed * Math.min(dt, 0.05)),
        );
    } else desired.copy(previous);
    mesh.scale.setScalar(visibleLength);
    rotation.setFromUnitVectors(axis, direction);
    // direction已平滑，模型与扫掠朝向保持一致，不再叠加一层滞后的转向。
    mesh.quaternion.copy(rotation);
    move(previous, desired, player);
    mesh.quaternion.setFromUnitVectors(axis, direction);
    mesh.userData.animate(player.elapsed, swimSpeed / 12, {
      dt,
      speed: swimSpeed,
      boosting: returning,
      turn: 0,
    });
    mesh.userData.getFeedingMouth(mouth);
    // 成长只影响下帧捕获，不把尺寸跳变当作跨墙吞食扫掠。
    if (player.length !== previousLength) oldMouth.copy(mouth);
    previousLength = player.length;
    if (target && available(target)) {
      const range = preyCaptureRadius(visibleLength, target.species.length);
      const fraction = sweptCaptureFraction(
        oldMouth,
        mouth,
        preyPrevious,
        target.mesh.position,
        range,
      );
      contact.copy(oldMouth).lerp(mouth, fraction ?? 1);
      preyContact.copy(preyPrevious).lerp(target.mesh.position, fraction ?? 1);
      if (
        fraction !== null &&
        !blockedBetween(oldMouth, mouth) &&
        !blockedBetween(contact, preyContact) &&
        !blockedBetween(mouth, target.mesh.position) &&
        onConsume(target, state, player)
      ) {
        mesh.userData.triggerFeed?.();
        effects.bite(mouth, direction, visibleLength);
        feeding.start(target.mesh, target.species.length);
        onMeal?.(target);
        target = null;
      }
    }
    feeding.update(dt, { mouth, direction });
  }
  function reset() {
    feeding.reset();
    Object.assign(state, createSummonState());
    alive = false;
    target = null;
    phase = "absent";
    nextSearch = 0;
    if (mesh) {
      mesh.visible = false;
      mesh.userData.resetMotion?.();
    }
  }
  return {
    state,
    feeding,
    activate,
    update,
    reset,
    beforePreyMotion() {
      if (target) preyPrevious.copy(target.mesh.position);
    },
    get active() {
      return alive;
    },
    get mesh() {
      return mesh;
    },
    snapshot: () => ({
      alive,
      phase,
      target: target?.species.kind || target?.kind || null,
      meals: state.meals,
      position: mesh?.position.toArray(),
      length: mesh?.scale.x,
      state: { ...state },
      feeding: feeding.snapshot(),
    }),
  };
}
