import * as THREE from "three";
import { createCreature } from "./creatures.js";
import { createHunterState } from "./hunter_rules.js";
import {
  DRAGON_GATE,
  MYTHIC_TRANSFORMATION_RULES,
  transformationForm,
} from "./penglai_transformation_species.js";

const forward = new THREE.Vector3(0, 0, -1);
const next = new THREE.Vector3(),
  tangent = new THREE.Vector3();
const orientation = new THREE.Quaternion();
const ease = (x) => x * x * (3 - 2 * x);

/** 同一个体切换形态；模型预建并复用，捕食、鱼雷锁定和结算仍持有原实体。 */
export function prepareMythicTransformations(entities) {
  for (const entity of entities) {
    const rule = MYTHIC_TRANSFORMATION_RULES[entity.species.kind];
    if (!rule || entity.populationIndex >= rule.maxIndividuals) continue;
    let state = entity.transformation;
    if (!state) {
      const alternate = createCreature(rule.form, 1, entity.seed);
      const children = [...entity.mesh.children],
        animate = entity.mesh.userData.animate;
      entity.mesh.add(alternate);
      state = entity.transformation = {
        alternate,
        children,
        scales: children.map((c) => c.scale.clone()),
        animate,
        rule,
      };
      entity.mesh.userData.animate = (time, effort) => {
        if (state.phase !== "formed") animate?.(time, effort);
        if (
          state.phase === "formed" ||
          state.phase === "reveal" ||
          state.phase === "return"
        )
          alternate.userData.animate?.(time, effort);
      };
    }
    state.sourceSpecies = entity.species;
    // 两尾金鲤在真实龙门的开口前蓄势，余下鱼群保持原有航带。
    if (entity.species.kind === "dragon_carp") {
      const x = entity.populationIndex === 0 ? -9 : 9;
      state.start = new THREE.Vector3(
        x,
        DRAGON_GATE.y - 18,
        DRAGON_GATE.z + 44,
      );
      state.end = new THREE.Vector3(x, DRAGON_GATE.y + 23, DRAGON_GATE.z - 55);
      state.idleSpecies = {
        ...entity.species,
        independentMovement: true,
        schoolProfiles: undefined,
        schoolAnchors: undefined,
        spawnAnchors: [state.start.toArray()],
        residentRadius: 14,
        depthMin: -DRAGON_GATE.y - 1,
        depthMax: -DRAGON_GATE.y + 26,
      };
      if (entity.school)
        entity.school.members = entity.school.members.filter(
          (e) => e !== entity,
        );
      entity.school = null;
      entity.mesh.position.copy(state.start);
    }
    restoreMythicForm(entity);
  }
}

/** 复位形态但不重新分配模型；回家、重开和普通补充种群共用。 */
export function restoreMythicForm(entity) {
  const s = entity.transformation;
  if (!s) return;
  entity.species = s.idleSpecies || s.sourceSpecies;
  entity.mesh.scale.setScalar(entity.species.length);
  s.children.forEach((child, i) => {
    child.visible = true;
    child.scale.copy(s.scales[i]);
  });
  s.alternate.visible = false;
  s.alternate.scale.setScalar(1);
  s.phase = "idle";
  s.timer = 0;
  s.wait = s.rule.wait + entity.populationIndex * 6;
  entity.chase = 0;
  entity.hunter = createHunterState(entity.species, entity.seed);
}

function morph(entity, amount) {
  const s = entity.transformation;
  s.alternate.visible = amount > 0;
  s.alternate.scale.setScalar(Math.max(0.001, amount));
  s.children.forEach((child, i) => {
    child.visible = amount < 1;
    child.scale.copy(s.scales[i]).multiplyScalar(Math.max(0.001, 1 - amount));
  });
  const length = THREE.MathUtils.lerp(
    s.sourceSpecies.length,
    transformationForm(s.rule.form).length,
    amount,
  );
  entity.mesh.scale.setScalar(length);
}

/** 只由活动模拟调用；返回 true 时这一帧由跃门/展翼动作负责位移。 */
export function stepMythicTransformation(
  entity,
  dt,
  playerPosition,
  { blocked, heightAt, flash } = {},
) {
  const s = entity.transformation;
  if (!s || entity.hiddenFor > 0) return false;
  const distance = entity.mesh.position.distanceTo(playerPosition);
  if (s.phase === "idle") {
    s.wait = Math.max(0, s.wait - dt);
    if (s.wait > 0 || distance > 170 || entity.chase > 0) return false;
    s.from = entity.mesh.position.clone();
    s.to = s.end?.clone() || s.from.clone().add(new THREE.Vector3(0, 23, -15));
    s.to.y = Math.min(
      s.to.y,
      (entity.species.worldBounds?.maxAltitude ?? 620) -
        entity.species.length * 0.4,
    );
    if (blocked?.(s.from, s.to, entity.species.length * 0.12)) {
      s.wait = 4;
      return false;
    }
    s.phase = "rise";
    s.timer = 0;
    flash?.(entity.mesh.position, 0xb7a15d, 4);
  }
  if (s.phase === "formed") {
    s.timer += dt;
    // 转回金鲤时远离交战中的玩家，避免把正在追捕的大猎手突然缩成小鱼。
    if (s.timer < s.rule.hold || entity.chase > 0 || distance < 60)
      return false;
    s.phase = "return";
    s.timer = 0;
  }
  s.timer += dt;
  if (s.phase === "rise") {
    const p = Math.min(1, s.timer / s.rule.rise);
    next.copy(s.from).lerp(s.to, ease(p));
    next.y += Math.sin(p * Math.PI) * (s.end ? 9 : 5);
    if (
      next.y <
        (heightAt?.(next.x, next.z) ?? -Infinity) +
          entity.species.length * 0.2 ||
      blocked?.(entity.mesh.position, next, entity.species.length * 0.12)
    ) {
      s.phase = "idle";
      s.wait = 4;
      return false;
    }
    tangent.copy(next).sub(entity.mesh.position).normalize();
    if (tangent.lengthSq() > 0.01) {
      entity.velocity.copy(tangent);
      orientation.setFromUnitVectors(forward, tangent);
      entity.mesh.quaternion.slerp(orientation, Math.min(1, dt * 4));
    }
    entity.mesh.position.copy(next);
    if (p === 1) {
      s.phase = "reveal";
      s.timer = 0;
    }
  } else if (s.phase === "reveal" || s.phase === "return") {
    const p = Math.min(1, s.timer / s.rule.reveal);
    morph(entity, s.phase === "reveal" ? ease(p) : 1 - ease(p));
    // 完成展翼后才切换真实战斗参数，中间态不发起攻击。
    if (p === 1) {
      if (s.phase === "return") restoreMythicForm(entity);
      else {
        entity.species = transformationForm(s.rule.form);
        s.phase = "formed";
        s.timer = 0;
        entity.hunter = createHunterState(entity.species, entity.seed);
        entity.heading = Math.atan2(entity.velocity.x, -entity.velocity.z);
        flash?.(entity.mesh.position, 0xb7a15d, 5);
      }
    }
  }
  return true;
}
