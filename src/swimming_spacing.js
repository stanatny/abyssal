import * as THREE from "three";

const heading = new THREE.Euler(0, 0, 0, "YXZ");
/** The visible head steers the movement; it must not lag behind a side-slip. */
export function turnSwimmingBody(entity, direction, dt) {
  if (direction.lengthSq() < 1e-10 || dt <= 0) return;
  heading.setFromQuaternion(entity.mesh.quaternion, "YXZ");
  const horizontal = Math.hypot(direction.x, direction.z);
  const yaw =
    horizontal > 1e-5 ? Math.atan2(-direction.x, -direction.z) : heading.y;
  const pitch = THREE.MathUtils.clamp(
    Math.atan2(direction.y, horizontal),
    -1.4,
    1.4,
  );
  const limit = dt * Math.min(3, 1.6 + 16 / entity.species.length);
  const yawDelta =
    THREE.MathUtils.euclideanModulo(yaw - heading.y + Math.PI, Math.PI * 2) -
    Math.PI;
  heading.y += THREE.MathUtils.clamp(yawDelta, -limit, limit);
  heading.x += THREE.MathUtils.clamp(pitch - heading.x, -limit, limit);
  heading.z = 0;
  entity.mesh.quaternion.setFromEuler(heading);
  entity.velocity.set(0, 0, -1).applyQuaternion(entity.mesh.quaternion);
}

/** Opt-in swimming neighbours. Whole-body clearance is separate from player bites. */
export function createSwimmingSpacing() {
  const members = [];
  const delta = new THREE.Vector3();
  const away = new THREE.Vector3();
  const force = new THREE.Vector3();
  const movement = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const radius = (e) => e.species.length * e.species.swimClearance;
  const live = (e) => e.species.swimClearance > 0 && e.hiddenFor <= 0;
  return {
    clear() {
      members.length = 0;
    },
    rebuild(entities) {
      members.length = 0;
      for (const e of entities) if (live(e)) members.push(e);
    },
    steer(entity, direction, speed) {
      if (!live(entity)) return speed;
      force.set(0, 0, 0);
      let throttle = 1;
      for (const other of members) {
        if (other === entity || !live(other)) continue;
        delta.subVectors(entity.mesh.position, other.mesh.position);
        const distance = delta.length();
        const clearance = radius(entity) + radius(other);
        const look = clearance + Math.min(speed * 0.8, clearance * 1.5);
        if (distance >= look) continue;
        away.copy(delta).divideScalar(Math.max(distance, 0.0001));
        const closing = Math.max(0, -direction.dot(away));
        // A head-on pair takes opposite sides, rather than cancelling its
        // velocity and reversing through its own body at the common target.
        if (closing > 0.85) {
          away.addScaledVector(direction, closing);
          if (away.lengthSq() < 0.04) {
            away.set(-direction.z, 0, direction.x);
            if (away.lengthSq() < 0.01)
              away.set(
                entity.populationIndex < other.populationIndex ? 1 : -1,
                0,
                0,
              );
          }
          away.normalize();
        }
        const urgency = THREE.MathUtils.clamp(
          (look - distance) / (look - clearance),
          0,
          1,
        );
        force.addScaledVector(away, urgency * urgency * 2.5);
        if (closing > 0.2)
          throttle = Math.min(
            throttle,
            Math.max(0.15, 1 - urgency * closing * 0.8),
          );
      }
      // Preserve the already telegraphed active charge heading. Contact still
      // stops it below; ordinary navigation separates hunters before wind-up.
      if (entity.hunter?.phase !== "active") direction.add(force).normalize();
      return speed * throttle;
    },
    constrain(entity, previous, position) {
      if (!live(entity)) return false;
      movement.subVectors(position, previous);
      const a = movement.lengthSq();
      if (a < 1e-14) return false;
      let fraction = 1;
      for (const other of members) {
        if (other === entity || !live(other)) continue;
        offset.subVectors(previous, other.mesh.position);
        const clearance = radius(entity) + radius(other);
        const c = offset.lengthSq() - clearance * clearance;
        const b = offset.dot(movement);
        if (c < -1e-6) {
          // A legacy/respawn overlap may leave, but may never deepen. No
          // teleporting either neighbour or pushing an animal through rock.
          if (b < 0) fraction = 0;
          continue;
        }
        if (b >= 0) continue;
        const discriminant = b * b - a * c;
        if (discriminant < 0) continue;
        const hit = (-b - Math.sqrt(discriminant)) / a;
        if (hit >= 0 && hit < fraction) fraction = Math.max(0, hit - 0.0001);
      }
      if (fraction >= 1) return false;
      position.copy(previous).addScaledVector(movement, fraction);
      return true;
    },
  };
}
