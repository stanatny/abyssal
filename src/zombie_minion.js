import * as THREE from "three";
import { createCreature } from "./creatures.js";
import { createFeedingTransition } from "./feeding_transition.js";
import { preyCaptureRadius, sweptCaptureFraction } from "./prey_capture.js";
import { isRegionalRare } from "./regional_rare.js";
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
    getOwnerMesh,
    reducedMotion = () => false,
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
    orbitPhase = 0,
    birthAge = 0,
    birthSide = 1,
    framingWeight = 0;
  const direction = new THREE.Vector3(0, 0, -1),
    desired = new THREE.Vector3(),
    delta = new THREE.Vector3();
  const previous = new THREE.Vector3(),
    oldMouth = new THREE.Vector3(),
    mouth = new THREE.Vector3(),
    contact = new THREE.Vector3(),
    preyContact = new THREE.Vector3(),
    preyPrevious = new THREE.Vector3(),
    intakeOffset = new THREE.Vector3(),
    birthOrigin = new THREE.Vector3(),
    birthTarget = new THREE.Vector3(),
    birthHeading = new THREE.Vector3();
  const presentation = { position: birthTarget, weight: 0 };
  const rotation = new THREE.Quaternion(),
    axis = new THREE.Vector3(0, 0, -1),
    side = new THREE.Vector3();
  let previousLength = 0;
  function expire() {
    effects.minionTransition?.(mesh, "depart");
    audio?.corpseBurst?.();
    feeding.reset();
    mesh.visible = false;
    alive = false;
    target = null;
    phase = "expired";
  }
  function move(
    start,
    end,
    player,
    visibleLength = player.length * MINION_RULES.sizeRatio,
  ) {
    const result = resolveMovement?.(start, end, direction, visibleLength);
    mesh.position.copy(result?.position || end);
    // 体积逐渐增大时的重叠推出也不能把中心送到墙另一侧。
    if (blockedBetween?.(start, mesh.position)) mesh.position.copy(start);
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
    if (alive) expire();
    if (!mesh) {
      mesh = createCreature("zombie_shark", 1, 733);
      mesh.name = "zombie_shark_minion";
      scene.add(mesh);
    }
    if (!activateSummon(state, player)) return false;
    feeding.reset();
    mesh.userData.resetMotion?.();
    previousLength = player.length;
    direction.copy(forward);
    // 先选择能够真正容纳仆从的近侧；不在墙外、手机视野外突然生成完整身体。
    birthSide = 1;
    birthDestination(player, position, forward, 1, desired);
    const right = resolveMovement?.(
      position,
      desired,
      forward,
      player.length * MINION_RULES.sizeRatio,
    )?.position;
    const rightDistance = delta
      .copy(right || desired)
      .distanceToSquared(position);
    birthDestination(player, position, forward, -1, desired);
    const left = resolveMovement?.(
      position,
      desired,
      forward,
      player.length * MINION_RULES.sizeRatio,
    )?.position;
    if (
      delta.copy(left || desired).distanceToSquared(position) >
      rightDistance + 0.25
    )
      birthSide = -1;
    birthAge = 0;
    framingWeight = 0;
    mesh.position.copy(position);
    alive = !player.dead;
    mesh.visible = alive;
    phase = alive ? "forming" : "absent";
    target = null;
    if (alive) poseBirth(player, position, forward, 0);
    mesh.userData.getFeedingMouth(mouth);
    oldMouth.copy(mouth);
    nextSearch = player.elapsed;
    orbitPhase = 0;
    presentation.position = mesh.position;
    presentation.weight = 0;
    if (alive) {
      effects.minionTransition?.(mesh, "appear", getOwnerMesh?.());
      audio?.summonUndead?.();
    }
    return true;
  }
  function birthDestination(player, position, forward, sign, out) {
    side.set(-forward.z, 0, forward.x).normalize();
    if (side.lengthSq() < 0.1) side.set(1, 0, 0);
    side.multiplyScalar(sign);
    return out
      .copy(position)
      .addScaledVector(side, player.length * 0.28)
      .addScaledVector(forward, player.length * 0.1)
      .addScaledVector(THREE.Object3D.DEFAULT_UP, player.length * 0.035);
  }
  function poseBirth(player, position, forward, dt) {
    const u = Math.min(1, birthAge / MINION_RULES.fissionDuration);
    const fullLength = player.length * MINION_RULES.sizeRatio;
    birthDestination(player, position, forward, birthSide, birthTarget);
    const owner = getOwnerMesh?.();
    if (owner?.visible && owner.userData.getFissionSource) {
      owner.userData.getFissionSource(birthOrigin, birthTarget);
      birthOrigin.addScaledVector(side, -player.length * 0.085);
    } else
      birthOrigin
        .copy(position)
        .addScaledVector(forward, player.length * 0.035);
    // 同一真实模型在体内起始，头先探出侧腹，再长成完整体积并转入游动方向。
    const growth = THREE.MathUtils.smoothstep(u, 0.04, 0.72);
    const separation = THREE.MathUtils.smoothstep(u, 0.05, 0.86);
    birthHeading
      .copy(side)
      .multiplyScalar(0.86)
      .addScaledVector(forward, 0.51)
      .normalize();
    if (reducedMotion()) birthHeading.copy(forward);
    delta.copy(forward);
    if (target) delta.copy(target.mesh.position).sub(birthTarget).normalize();
    direction
      .copy(birthHeading)
      .lerp(delta, THREE.MathUtils.smoothstep(u, 0.42, 0.94))
      .normalize();
    previous.copy(mesh.position);
    mesh.scale.setScalar(fullLength * THREE.MathUtils.lerp(0.08, 1, growth));
    mesh.userData.fissionVisualLength = fullLength;
    desired.copy(birthOrigin).lerp(birthTarget, separation);
    move(previous, desired, player, mesh.scale.x);
    mesh.quaternion.setFromUnitVectors(axis, direction);
    mesh.userData.animate(player.elapsed, 0.55, { dt, speed: 4, turn: 0 });
    oldMouth.copy(mesh.userData.getFeedingMouth(mouth));
    previousLength = player.length;
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
      expire();
      return;
    }
    if (!Number.isFinite(dt) || dt <= 0) return;
    birthAge += dt;
    framingWeight =
      THREE.MathUtils.smoothstep(birthAge, 0, 0.35) *
      (1 -
        THREE.MathUtils.smoothstep(
          birthAge,
          MINION_RULES.fissionDuration + 0.35,
          MINION_RULES.fissionDuration + 1.25,
        ));
    presentation.weight = framingWeight;
    const returning =
      mesh.position.distanceToSquared(position) > MINION_RULES.leashRadius ** 2;
    const available = (entry, tracking = false) =>
      canMinionEat(player, entry.species) &&
      (entry.hiddenFor || 0) <= 0 &&
      entry.alive !== false &&
      !(entry.protectedUntil > player.elapsed) &&
      accessible(entry) &&
      (entry.mesh.position.distanceToSquared(position) <=
        (tracking && isRegionalRare(entry.species)
          ? MINION_RULES.leashRadius
          : MINION_RULES.searchRadius) **
          2 ||
        (tracking &&
          isRegionalRare(entry.species) &&
          entry.mesh.position.distanceToSquared(mesh.position) <=
            MINION_RULES.searchRadius ** 2));
    // 分裂耗时不能让已合法发现的珍兽因本尊暂时落后而被遗忘；仍受原有牵绳和遮挡限制。
    if (target && (!available(target, true) || returning)) target = null;
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
    if (phase === "forming") {
      poseBirth(player, position, forward, dt);
      if (birthAge >= MINION_RULES.fissionDuration) phase = "orbit";
      return;
    }
    presentation.position = mesh.position;
    oldMouth.copy(mesh.userData.getFeedingMouth(mouth));
    const visibleLength = player.length * MINION_RULES.sizeRatio;
    orbitPhase += dt * 0.7;
    if (target) {
      phase = "hunt";
      if (isRegionalRare(target.species)) {
        // 小型珍兽按实际嘴部偏移对准，有限预判避免高速追近后绕圈错过。
        desired.copy(target.mesh.position);
        if (target.velocity)
          desired.addScaledVector(
            target.velocity,
            target.species.escapeSpeed *
              Math.min(
                MINION_RULES.rareLeadSeconds,
                mesh.position.distanceTo(desired) /
                  MINION_RULES.rarePursuitSpeed,
              ),
          );
        delta.copy(desired).sub(mesh.position).normalize();
        intakeOffset
          .copy(mesh.userData.getFeedingMouth(mouth))
          .sub(mesh.position)
          .applyQuaternion(rotation.copy(mesh.quaternion).invert());
        intakeOffset.applyQuaternion(rotation.setFromUnitVectors(axis, delta));
        desired.sub(intakeOffset);
      } else {
        desired
          .copy(target.mesh.position)
          .addScaledVector(direction, -visibleLength * 0.42);
      }
    } else {
      phase = returning ? "return" : "orbit";
      side.set(-forward.z, 0, forward.x).normalize();
      if (side.lengthSq() < 0.1) side.set(1, 0, 0);
      const settle = THREE.MathUtils.smoothstep(
        birthAge,
        MINION_RULES.fissionDuration,
        MINION_RULES.fissionDuration + 1.5,
      );
      const radius = THREE.MathUtils.lerp(
        player.length * 0.28,
        player.length * 0.58 + 3,
        settle,
      );
      desired
        .copy(position)
        .addScaledVector(side, Math.cos(orbitPhase) * radius * birthSide)
        .addScaledVector(forward, Math.sin(orbitPhase) * radius);
      desired.y += Math.sin(orbitPhase * 0.6) * 1.1;
    }
    previous.copy(mesh.position);
    delta.copy(desired).sub(previous);
    const distance = delta.length();
    const swimSpeed = returning
      ? MINION_RULES.returnSpeed
      : !target
        ? Math.min(
            distance * 3,
            THREE.MathUtils.lerp(
              MINION_RULES.cruiseSpeed,
              MINION_RULES.returnSpeed,
              THREE.MathUtils.smoothstep(
                birthAge,
                MINION_RULES.fissionDuration,
                MINION_RULES.fissionDuration + 1.5,
              ),
            ),
          )
        : isRegionalRare(target.species)
          ? MINION_RULES.rarePursuitSpeed
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
    if (target && available(target, true)) {
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
    effects.minionTransitions?.reset();
    feeding.reset();
    Object.assign(state, createSummonState());
    alive = false;
    target = null;
    phase = "absent";
    nextSearch = 0;
    birthAge = 0;
    framingWeight = 0;
    presentation.weight = 0;
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
    get presentation() {
      return alive && framingWeight > 0 ? presentation : null;
    },
    get active() {
      return alive;
    },
    get forming() {
      return alive && phase === "forming";
    },
    get mesh() {
      return mesh;
    },
    snapshot: () => ({
      alive,
      phase,
      birthAge,
      framingWeight,
      target: target?.species.kind || target?.kind || null,
      meals: state.meals,
      position: mesh?.position.toArray(),
      length: mesh?.scale.x,
      state: { ...state },
      feeding: feeding.snapshot(),
    }),
  };
}
