import * as THREE from "three";
import { MECHANICAL_RULES as RULES } from "./mechanical_shark_rules.js";

/**
 * 前方窄角锁定后持续制导；预览和发射共用选择规则，不跨目标重新锁定。
 * @param {object} options 实体、领主、遮挡和领主真实表面查询。
 * @returns {object} select返回当前候选，steer追踪该目标并保留遮挡与退休检查。
 */
export function createMechanicalAim({ entities, bosses, blocked, bossPoint }) {
  const delta = new THREE.Vector3(),
    desired = new THREE.Vector3(),
    turn = new THREE.Quaternion(),
    identity = new THREE.Quaternion();
  const cone = THREE.MathUtils.degToRad(RULES.aimConeDegrees),
    rate = THREE.MathUtils.degToRad(RULES.aimTurnDegrees);
  function select(origin, direction, player) {
    let best = null,
      score = Infinity;
    function consider(entity, boss = false) {
      if (
        boss ? !entity.enabled || entity.state.defeated : entity.hiddenFor > 0
      )
        return;
      if (!entity.mesh.visible || (!boss && entity.species.vehicle)) return;
      delta.copy(entity.mesh.position).sub(origin);
      const distance = delta.length();
      if (distance < 0.001 || distance > RULES.range) return;
      const angle = direction.angleTo(delta);
      if (angle > cone) return;
      const candidateScore = angle + (distance / RULES.range) * 0.015;
      if (candidateScore >= score) return;
      const point = boss ? bossPoint(origin, entity) : entity.mesh.position;
      if (!point || blocked(origin, point)) return;
      score = candidateScore;
      best = {
        entity,
        boss,
        point: point.clone(),
        distance,
        angle,
        eligible:
          !boss ||
          (!entity.state.locked &&
            player.length >= (entity.state.species.minAttackLength || 25)),
      };
    }
    for (const e of entities()) consider(e);
    for (const b of bosses()) consider(b, true);
    return best;
  }
  function steer(projectile, dt, now) {
    const target = projectile.target;
    if (!target) return;
    const e = target.entity;
    if (target.boss ? !e.enabled || e.state.defeated : e.hiddenFor > 0) {
      projectile.target = null;
      return;
    }
    // mesh.visible也承担玩家距离裁剪，不能把仍存活的远处目标误判为退休。
    desired.copy(e.mesh.position).sub(projectile.mesh.position).normalize();
    if (desired.lengthSq() < 0.99) return;
    if (now >= projectile.aimCheckAt) {
      projectile.aimCheckAt = now + 0.12;
      const point = target.boss
        ? bossPoint(projectile.mesh.position, e)
        : e.mesh.position;
      if (!point || blocked(projectile.mesh.position, point)) {
        projectile.target = null;
        return;
      }
    }
    const angle = projectile.direction.angleTo(desired);
    if (angle > 1e-8) {
      turn.setFromUnitVectors(projectile.direction, desired);
      identity.identity().slerp(turn, Math.min(1, (rate * dt) / angle));
      projectile.direction.applyQuaternion(identity).normalize();
    }
  }
  return { select, steer };
}
