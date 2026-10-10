import * as THREE from "three";
import { createCreature } from "./creatures.js";
import { createFeedingTransition } from "./feeding_transition.js";
import { preyCaptureRadius, sweptCaptureFraction } from "./prey_capture.js";
import { isRegionalRare } from "./regional_rare.js";
import { createBlastBodyQuery } from "./area_blast.js";
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
    onExpire,
    onNoDetonationTarget,
    detonationTargets = () => [],
    blastBlocked = blockedBetween,
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
  let commanded = false,
    blastTarget = null;
  const blastBodyPoint = createBlastBodyQuery(),
    blastPrevious = new THREE.Vector3();
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
  function expire(player, reason = "detonation") {
    if (!alive) return;
    const point = mesh.position.clone();
    // 先关闭生命周期，避免伤害回调重入造成重复尸爆。重开/终局只调用reset。
    alive = false;
    target = null;
    phase = "expired";
    commanded = false;
    blastTarget = null;
    state.activeUntil = Math.min(state.activeUntil, player.elapsed);
    effects.minionTransition?.(mesh, "depart");
    audio?.corpseBurst?.();
    feeding.reset();
    mesh.visible = false;
    onExpire?.(point, player, reason);
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
    if (alive) expire(player, "lifetime");
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
    commanded = false;
    blastTarget = null;
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
  function validBlastTarget(entry, player) {
    const species = entry.state?.species || entry.species;
    if (!species || entry.hiddenFor > 0 || entry.alive === false) return false;
    if (entry.state)
      return (
        entry.enabled &&
        !entry.state.defeated &&
        !entry.state.locked &&
        player.length >= species.minAttackLength
      );
    return (
      !species.vehicle &&
      !species.boss &&
      species.tier !== 3 &&
      species.category !== "lord" &&
      species.length > 0 &&
      accessible(entry)
    );
  }
  function commandDetonation(player) {
    if (
      !alive ||
      commanded ||
      player.dead ||
      player.won ||
      player.timedOut ||
      player.characterId !== "zombie_shark"
    )
      return false;
    const status = summonStatus(state, player);
    if (!status.active) {
      expire(player, "lifetime");
      return false;
    }
    let best = MINION_RULES.searchRadius ** 2,
      selected = null;
    for (const entry of detonationTargets()) {
      if (!validBlastTarget(entry, player)) continue;
      const point = entry.state
        ? blastBodyPoint(mesh.position, entry, MINION_RULES.searchRadius)
        : entry.mesh.position;
      if (!point || blastBlocked?.(mesh.position, point)) continue;
      const distance = mesh.position.distanceToSquared(point);
      if (distance <= best) {
        selected = entry;
        best = distance;
      }
    }
    // 没有目标时保留原捕食和剩余寿命，避免空按技能就浪费仆从。
    if (!selected) {
      onNoDetonationTarget?.();
      return false;
    }
    blastTarget = selected;
    blastPrevious.copy(selected.mesh.position);
    commanded = true;
    target = null;
    feeding.reset();
    if (phase !== "forming") phase = "detonating";
    return true;
  }
  function updateDetonation(dt, player, ownerPosition) {
    phase = "detonating";
    if (
      !blastTarget ||
      !validBlastTarget(blastTarget, player) ||
      mesh.position.distanceToSquared(ownerPosition) >
        MINION_RULES.leashRadius ** 2
    ) {
      expire(player);
      return;
    }
    const point = blastTarget.state
      ? blastBodyPoint(mesh.position, blastTarget)
      : blastTarget.mesh.position;
    // 锁定目标退场或躲入掩体时就地爆炸，不换目标，也不让最后一段穿墙。
    if (!point || blastBlocked?.(mesh.position, point)) {
      expire(player);
      return;
    }
    desired.copy(point);
    const contactRadius =
      MINION_RULES.detonationContactRadius +
      (blastTarget.state
        ? mesh.scale.x * 0.13
        : Math.max(0.15, blastTarget.species.length * 0.13));
    if (mesh.position.distanceToSquared(desired) <= contactRadius ** 2) {
      expire(player);
      return;
    }
    previous.copy(mesh.position);
    delta.copy(desired).sub(previous).normalize();
    // 四元数限速转弯也能处理正后方目标，避免反向向量插值后始终指向原方向。
    rotation.setFromUnitVectors(axis, delta);
    mesh.quaternion.rotateTowards(
      rotation,
      MINION_RULES.detonationTurnRate * dt,
    );
    direction.copy(axis).applyQuaternion(mesh.quaternion);
    desired
      .copy(previous)
      .addScaledVector(
        direction,
        Math.min(previous.distanceTo(point), MINION_RULES.detonationSpeed * dt),
      );
    move(previous, desired, player);
    mesh.quaternion.setFromUnitVectors(axis, direction);
    mesh.userData.animate(player.elapsed, 1, {
      dt,
      speed: MINION_RULES.detonationSpeed,
      turn: 0,
    });
    if (!blastTarget.state) {
      const time = sweptCaptureFraction(
        previous,
        mesh.position,
        blastPrevious,
        blastTarget.mesh.position,
        contactRadius,
      );
      if (time !== null && !blastBlocked?.(previous, mesh.position)) {
        mesh.position.lerpVectors(previous, mesh.position.clone(), time);
        expire(player);
      }
      blastPrevious.copy(blastTarget?.mesh.position || mesh.position);
    }
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
      expire(player, "lifetime");
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
    if (commanded) {
      if (phase === "forming") {
        poseBirth(player, position, forward, dt);
        if (birthAge >= MINION_RULES.fissionDuration) phase = "detonating";
      } else updateDetonation(dt, player, position);
      return;
    }
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
    commanded = false;
    blastTarget = null;
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
    commandDetonation,
    update,
    reset,
    beforePreyMotion() {
      if (target) preyPrevious.copy(target.mesh.position);
      if (blastTarget) blastPrevious.copy(blastTarget.mesh.position);
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
    get commanded() {
      return alive && commanded;
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
      commanded,
      blastTarget:
        blastTarget?.species.kind || blastTarget?.state?.species.kind || null,
      meals: state.meals,
      position: mesh?.position.toArray(),
      length: mesh?.scale.x,
      state: { ...state },
      feeding: feeding.snapshot(),
    }),
  };
}
