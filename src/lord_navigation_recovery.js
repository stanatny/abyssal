import * as T from "three";
import { lordMoveClear, lordHeadingQuaternion } from "./lord_navigation.js";
import {
  steerPenglaiFlight,
  updatePenglaiFlightAttitude,
} from "./penglai_flight_attitude.js";

const forward = new T.Vector3(0, 0, -1);

/** 只有明确启用的游水守卫使用退让；原有飞行恢复保持独立。 */
export function recoverLordMotion(...args) {
  return args[0].state.species.navigationRecovery === "swim"
    ? recoverSwimmingLordMotion(...args)
    : recoverFlyingLordMotion(...args);
}

/** 长躯碰壁时检查本帧能达到的姿态；仍无路则短暂保持朝向退让，再转身。 */
export function recoverSwimmingLordMotion(
  entry,
  direction,
  speed,
  dt,
  heightAt,
  blocked,
  turnRate,
) {
  if (
    !entry.navigation ||
    entry.state.species.navigationRecovery !== "swim" ||
    !(dt > 0 && speed > 0) ||
    turnRate === 0
  )
    return false;
  const nav = entry.navigation;
  const r = (nav.recovery ??= {
    escape: new T.Vector3(),
    look: new T.Vector3(),
    remaining: 0,
    heading: new T.Vector3(),
    next: new T.Vector3(),
    rotation: new T.Quaternion(),
    goal: new T.Quaternion(),
  });
  const position = entry.mesh.position,
    rotation = entry.mesh.quaternion,
    retreatSpeed = Math.min(speed, 10);
  const clear = () =>
    !blocked(position, r.next) &&
    lordMoveClear(entry, position, r.next, r.rotation, heightAt, blocked);
  const apply = () => {
    position.copy(r.next);
    rotation.copy(r.rotation);
    entry.heading.copy(forward).applyQuaternion(rotation);
    nav.recoveredThisFrame = true;
    return true;
  };
  r.rotation.copy(rotation);
  if (r.remaining > 0) {
    r.next.copy(position).addScaledVector(r.escape, retreatSpeed * dt);
    if (clear()) {
      r.remaining = Math.max(0, r.remaining - dt);
      return apply();
    }
    r.remaining = 0;
  }
  lordHeadingQuaternion(
    r.goal,
    direction,
    false,
    nav.pitchLimit,
    entry.mesh.rotation.y,
  );
  r.rotation.rotateTowards(
    r.goal,
    Math.min(entry.mesh.userData.aquaticTurnRate ?? 2.4, turnRate ?? 2.4) * dt,
  );
  r.heading.copy(forward).applyQuaternion(r.rotation);
  r.next.copy(position).addScaledVector(r.heading, speed * dt);
  if (clear()) return apply();

  // 按完整身体寻找退路，保留一秒，避免每帧左右抖动；不改变领地/高度限制。
  r.rotation.copy(rotation);
  let best = -Infinity;
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        if (!(x || y || z)) continue;
        r.heading.set(x, y, z).normalize();
        r.look.copy(position).addScaledVector(r.heading, 10);
        if (
          blocked(position, r.look) ||
          !lordMoveClear(entry, position, r.look, rotation, heightAt, blocked)
        )
          continue;
        const score = r.heading.dot(direction) - Math.abs(r.heading.y) * 0.1;
        if (score > best) {
          best = score;
          r.escape.copy(r.heading);
        }
      }
  if (best === -Infinity) return false;
  r.next.copy(position).addScaledVector(r.escape, retreatSpeed * dt);
  if (!clear()) return false;
  r.remaining = 1;
  return apply();
}

/** 自由飞行领主遇到长身体转向死锁时，先检查实际小步姿态，再连续抬升脱离障碍。 */
export function recoverFlyingLordMotion(
  entry,
  direction,
  speed,
  dt,
  heightAt,
  blocked,
  turnRate,
) {
  const kind = entry.state.species.kind;
  if (
    !entry.navigation ||
    !["azure_dragon", "vermilion_bird", "sword_sage"].includes(kind) ||
    !(dt > 0) ||
    turnRate === 0
  )
    return false;
  const nav = entry.navigation;
  const r = (nav.recovery ??= {
    escape: new T.Vector3(),
    look: new T.Vector3(),
    remaining: 0,
    heading: new T.Vector3(),
    next: new T.Vector3(),
    rotation: new T.Quaternion(),
    goal: new T.Quaternion(),
  });
  const position = entry.mesh.position,
    rotation = entry.mesh.quaternion;
  if (r.remaining > 0) {
    r.next.copy(position).addScaledVector(r.escape, Math.min(speed, 12) * dt);
    if (lordMoveClear(entry, position, r.next, rotation, heightAt, blocked)) {
      position.copy(r.next);
      r.remaining = Math.max(0, r.remaining - dt);
      entry.heading.copy(forward).applyQuaternion(rotation);
      nav.recoveredThisFrame = true;
      return true;
    }
    r.remaining = 0;
  }
  r.heading.copy(direction);
  r.rotation.copy(rotation);
  if (kind === "sword_sage") {
    lordHeadingQuaternion(r.goal, direction, true);
    r.rotation.slerp(r.goal, Math.min(1, dt * 2));
  } else {
    steerPenglaiFlight(r.heading, rotation, direction, dt, turnRate);
    updatePenglaiFlightAttitude(r.rotation, r.heading, dt);
  }
  r.next.copy(position).addScaledVector(r.heading, speed * dt);
  const clear = () =>
    !blocked(position, r.next) &&
    lordMoveClear(entry, position, r.next, r.rotation, heightAt, blocked);
  let accepted = clear();
  if (!accepted) {
    // 在保持完整朝向的前提下寻找短暂退让通道，绕出柱帽/屋檐后再转向。
    // 只在受阻时计算，选定后保持一秒，避免每帧左右换向。
    r.rotation.copy(rotation);
    let best = -Infinity;
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          if (!(x || y || z)) continue;
          r.heading.set(x, y, z).normalize();
          r.look.copy(position).addScaledVector(r.heading, 12);
          if (
            !lordMoveClear(entry, position, r.look, rotation, heightAt, blocked)
          )
            continue;
          const score = r.heading.dot(direction) + r.heading.y * 0.65;
          if (score > best) {
            best = score;
            r.escape.copy(r.heading);
          }
        }
    if (best > -Infinity) {
      r.remaining = 1;
      r.next.copy(position).addScaledVector(r.escape, Math.min(speed, 12) * dt);
      accepted = clear();
    }
  }
  if (!accepted) return false;
  position.copy(r.next);
  rotation.copy(r.rotation);
  entry.heading.copy(forward).applyQuaternion(rotation);
  nav.recoveredThisFrame = true;
  return true;
}
