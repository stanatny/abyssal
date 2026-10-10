import { createAreaBlast } from "./area_blast.js";
import * as THREE from "three";
import { createAttackTorpedoModel } from "./submarine_defense.js";
import { createMechanicalTorpedoFx } from "./mechanical_torpedo_fx.js";
import { sweptCaptureFraction } from "./prey_capture.js";
import { createMechanicalAim } from "./mechanical_torpedo_aim.js";
import {
  MECHANICAL_RULES as RULES,
  activateTorpedo,
  createTorpedoState,
  resetTorpedoTarget,
} from "./mechanical_shark_rules.js";

/**
 * 机械鲨鱼的锁定制导鱼雷与爆炸结算；普通猎物击杀后沿用共享营养立即结算。
 * @param {THREE.Object3D} parent 场景。
 * @param {object} options solids查询、环境边界、实体、领主命中、音效及捕食特效接口。
 * @returns {object} activate/beforePreyMotion/update/reset/dispose与有界池。
 */
export function createMechanicalTorpedoes(
  parent,
  {
    castWorld = () => null,
    heightAt = () => -Infinity,
    waterHeightAt = () => Infinity,
    entities = () => [],
    bosses = () => [],
    hitBoss = () => ({ hit: false }),
    audio,
    effects,
    onLaunch,
    onBlast,
  } = {},
) {
  let state = createTorpedoState(),
    disposed = false;
  const projectiles = Array.from({ length: RULES.poolSize }, () => {
    const mesh = createAttackTorpedoModel(2.2);
    mesh.visible = false;
    parent.add(mesh);
    return {
      mesh,
      active: false,
      direction: new THREE.Vector3(),
      initialDirection: new THREE.Vector3(),
      target: null,
      aimCheckAt: 0,
      previous: new THREE.Vector3(),
      distance: 0,
      expiresAt: 0,
    };
  });
  const fx = createMechanicalTorpedoFx(parent),
    preyPositions = new Map();
  const to = new THREE.Vector3(),
    relative = new THREE.Vector3(),
    point = new THREE.Vector3(),
    detonation = new THREE.Vector3(),
    axis = new THREE.Vector3(0, 0, -1),
    ray = new THREE.Raycaster();
  const intersections = [],
    forward = new THREE.Vector3();
  function bossPoint(origin, b) {
    const contact = b.mesh.userData.contactRoot || b.mesh;
    contact.updateWorldMatrix(true, true);
    forward.copy(b.mesh.position).sub(origin).normalize();
    ray.set(origin, forward);
    ray.far = RULES.range;
    intersections.length = 0;
    ray.intersectObject(contact, true, intersections);
    return intersections.find(
      (i) => i.object.isMesh && visibleMesh(i.object, contact),
    )?.point;
  }
  const aim = createMechanicalAim({
    entities,
    bosses,
    bossPoint,
    blocked: (a, b) =>
      Boolean(castWorld(a, b, RULES.projectileRadius)) ||
      floorCrossing(a, b) !== null,
  });
  function activate(player, origin, direction, underwater = true) {
    if (disposed) return false;
    const p = projectiles.find((p) => !p.active);
    if (
      !p ||
      !finiteVector(origin) ||
      !finiteVector(direction) ||
      direction.lengthSq() < 0.99
    )
      return false;
    if (!activateTorpedo(state, player, underwater)) return false;
    p.mesh.position.copy(origin);
    p.previous.copy(origin);
    p.direction.copy(direction).normalize();
    p.initialDirection.copy(p.direction);
    const target = aim.select(origin, p.direction, player);
    p.target = target?.eligible ? target : null;
    p.aimCheckAt = player.elapsed + 0.12;
    // 只在发射时锁定前方七度内的目标；之后跟随该目标，不自动换猎物。
    if (p.target) p.direction.copy(target.point).sub(origin).normalize();
    p.mesh.quaternion.setFromUnitVectors(axis, p.direction);
    p.distance = 0;
    p.expiresAt = player.elapsed + RULES.range / RULES.speed;
    p.active = p.mesh.visible = true;
    audio?.mechanicalLaunch?.();
    onLaunch?.(origin);
    return true;
  }
  function beforePreyMotion() {
    if (!projectiles.some((p) => p.active)) return;
    for (const e of entities()) {
      if (!preyPositions.has(e)) preyPositions.set(e, new THREE.Vector3());
      preyPositions.get(e).copy(e.mesh.position);
    }
  }
  function blocked(a, b) {
    return Boolean(castWorld(a, b, 0)) || floorCrossing(a, b, 0) !== null;
  }
  // 地形网格不全部登记碰撞盒；短距采样和二分定位阻止穿过海床或冰顶。
  function floorCrossing(a, b, radius = RULES.projectileRadius) {
    const steps = Math.max(1, Math.ceil(a.distanceTo(b) / 2));
    const inside = (v) =>
      v.y - radius <= heightAt(v.x, v.z) ||
      v.y + radius >= waterHeightAt(v.x, v.z);
    if (inside(a)) return { time: 0, point: a.clone() };
    for (let i = 1; i <= steps; i++) {
      point.copy(a).lerp(b, i / steps);
      if (!inside(point)) continue;
      let low = (i - 1) / steps,
        high = i / steps;
      for (let n = 0; n < 12; n++) {
        const mid = (low + high) / 2;
        point.copy(a).lerp(b, mid);
        if (inside(point)) high = mid;
        else low = mid;
      }
      return { time: high, point: a.clone().lerp(b, high) };
    }
    return null;
  }
  const blast = createAreaBlast({
    entities,
    bosses,
    blocked,
    hitBoss,
    effects,
  });
  function detonate(p, at, player, directBoss = null) {
    detonation.copy(at);
    at = detonation;
    p.active = p.mesh.visible = false;
    p.target = null;
    fx.burst(at, RULES.blastRadius);
    audio?.mechanicalExplosion?.();
    onBlast?.(blast(at, player, directBoss));
  }

  function update(dt, player) {
    if (disposed || !(dt > 0) || player.dead || player.won || player.timedOut)
      return;
    for (const p of projectiles) {
      if (!p.active) continue;
      aim.steer(p, dt, player.elapsed);
      p.mesh.quaternion.setFromUnitVectors(axis, p.direction);
      p.previous.copy(p.mesh.position);
      const distance = Math.min(RULES.speed * dt, RULES.range - p.distance);
      to.copy(p.previous).addScaledVector(p.direction, distance);
      const world = castWorld(p.previous, to, RULES.projectileRadius),
        terrain = floorCrossing(p.previous, to);
      let first =
        world && (!terrain || world.time < terrain.time) ? world : terrain;
      for (const e of entities()) {
        if (e.hiddenFor > 0) continue;
        const old = preyPositions.get(e) || e.mesh.position;
        const radius =
          RULES.projectileRadius + Math.max(0.15, e.species.length * 0.13);
        const t = sweptCaptureFraction(
          p.previous,
          to,
          old,
          e.mesh.position,
          radius,
        );
        if (t !== null && (!first || t < first.time))
          first = { time: t, point: p.previous.clone().lerp(to, t) };
      }
      relative.copy(to).sub(p.previous);
      const segment = relative.length();
      for (const b of bosses()) {
        if (
          !b.enabled ||
          b.state.defeated ||
          b.mesh.position.distanceTo(p.previous) >
            segment + b.state.species.length * 0.8
        )
          continue;
        const contact = b.mesh.userData.contactRoot || b.mesh;
        contact.updateWorldMatrix(true, true);
        if (segment < 1e-8) continue;
        ray.set(p.previous, relative.normalize());
        ray.far = segment;
        intersections.length = 0;
        ray.intersectObject(contact, true, intersections);
        const hit = intersections.find(
          (i) => i.object.isMesh && visibleMesh(i.object, contact),
        );
        if (hit && (!first || hit.distance / segment < first.time))
          first = {
            time: hit.distance / segment,
            point: hit.point.clone(),
            boss: b,
          };
      }
      if (first) {
        detonate(p, first.point, player, first.boss);
        continue;
      }
      p.mesh.position.copy(to);
      p.distance += distance;
      p.mesh.userData.animate(player.elapsed);
      if (p.distance >= RULES.range - 1e-6 || player.elapsed >= p.expiresAt)
        detonate(p, p.mesh.position, player);
    }
    fx.update(dt, projectiles);
  }
  function reset() {
    state = createTorpedoState();
    projectiles.forEach((p) => {
      p.active = p.mesh.visible = false;
      p.target = null;
    });
    fx.reset();
    preyPositions.clear();
    for (const e of entities()) resetTorpedoTarget(e);
  }
  return {
    projectiles,
    fx,
    get state() {
      return state;
    },
    activate,
    previewAim: aim.select,
    blocked,
    beforePreyMotion,
    update,
    reset,
    dispose() {
      if (disposed) return;
      reset();
      disposed = true;
      projectiles.forEach((p) => p.mesh.userData.dispose());
      fx.dispose();
    },
  };
}
function finiteVector(v) {
  return (
    v && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)
  );
}
function visibleMesh(mesh, root) {
  for (let n = mesh; n; n = n.parent) {
    if (!n.visible && n !== root) return false;
    if (n === root) return true;
  }
  return false;
}
