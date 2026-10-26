import * as THREE from "three";

const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);

/** Mantle-first transit with eight trailing arms; gameplay heading stays untouched. */
export function createLumenSwim(anatomy, base, arms, bones) {
  const chains = arms.map((c, index) => {
    const lengths = c.local.map((p, i) =>
      i ? p.distanceTo(c.local[i - 1]) : 0,
    );
    const total = lengths.reduce((a, b) => a + b, 0);
    let distance = 0;
    const stations = lengths.map((length) => (distance += length) / total);
    const end = c.local[Math.floor(c.local.length * 0.55)];
    const angle = Math.atan2(end.y, end.x);
    const directions = c.local
      .slice(1)
      .map((p, i) => p.clone().sub(c.local[i]).normalize());
    const targets = directions.map((d, i) => {
      const bend = Math.PI * 0.5 * (1 - smooth(0.03, 0.3, stations[i + 1]));
      return new THREE.Vector3(
        Math.cos(angle) * Math.sin(bend),
        Math.sin(angle) * Math.sin(bend),
        -Math.cos(bend),
      );
    });
    const folds = directions.map((d, i) =>
      new THREE.Quaternion().setFromUnitVectors(d, targets[i]),
    );
    return {
      c,
      index,
      lengths,
      stations,
      angle,
      directions,
      targets,
      folds,
      posed: c.local.map(() => new THREE.Vector3()),
      rotations: c.local.map(() => new THREE.Quaternion()),
    };
  });
  const direction = new THREE.Vector3(),
    rotation = new THREE.Quaternion(),
    inverse = new THREE.Quaternion();
  let previous,
    gather = 0,
    facing = 0,
    measuredTravel;
  const state = { gather: 0, facing: 0, travel: 0 };
  return {
    state,
    travel(distance, dt, length) {
      if (dt > 0)
        measuredTravel = THREE.MathUtils.clamp(
          distance / dt / Math.max(1, length * 0.18),
          0,
          1,
        );
    },
    pose(time, effort, phase) {
      const dt =
        previous === undefined || time < previous
          ? 0
          : Math.min(0.3, time - previous);
      const first = previous === undefined;
      previous = time;
      const travelling = measuredTravel ?? smooth(0.15, 0.45, effort);
      const casting = phase === "windup" || phase === "attack";
      // A freshly opened Guide has no world displacement sample; begin in its
      // cruising demonstration pose rather than showing the rejected bind fan.
      if (first && measuredTravel === undefined) {
        gather = casting ? 0 : travelling * 0.98;
        facing = casting ? 0 : 1;
      }
      const blend = 1 - Math.exp((-dt * 1.0) / (1.7 + effort * 1.1));
      gather += ((casting ? 0 : travelling * 0.98) - gather) * blend;
      // Keep the same mantle-leading orientation while hovering; turn to present
      // the arm crown during the existing wind-up, before any lash can hit.
      facing += ((casting ? 0 : 1) - facing) * blend;
      const folded = smooth(0, 1, gather);
      anatomy.rotation.y = Math.PI * smooth(0, 1, facing);
      const cycle = THREE.MathUtils.euclideanModulo(time * 0.12, 1);
      const pulse = smooth(0.42, 0.58, cycle) * (1 - smooth(0.64, 0.95, cycle));
      const squeeze = pulse * folded * 0.035;
      base.scale.set(1 - squeeze, 1 - squeeze, 1 + squeeze * 0.35);
      for (const {
        c,
        index,
        lengths,
        stations,
        angle,
        directions,
        targets,
        folds,
        posed,
        rotations,
      } of chains) {
        // Mantle compression does not scale arm lengths or move their roots.
        c.group.scale.set(1 / base.scale.x, 1 / base.scale.y, 1 / base.scale.z);
        c.group.position.fromArray(c.points[0]).multiply(c.group.scale);
        posed[0].copy(c.local[0]);
        for (let i = 1; i < c.local.length; i++) {
          const t = stations[i];
          const bearing =
            angle +
            Math.sin(time * 0.32 - t * 3.2 + index * 0.6) *
              0.08 *
              smooth(0.2, 1, t);
          const bend =
            Math.PI * 0.5 * (1 - smooth(0.03, 0.3, t)) +
            Math.sin(time * 0.42 - t * 5.2 + index * 0.7) *
              0.16 *
              smooth(0.4, 1, t);
          direction.set(
            Math.cos(bearing) * Math.sin(bend),
            Math.sin(bearing) * Math.sin(bend),
            -Math.cos(bend),
          );
          rotation.setFromUnitVectors(targets[i - 1], direction);
          inverse.identity().slerp(rotation, 0.15 + folded * 0.85);
          rotations[i - 1]
            .identity()
            .slerp(folds[i - 1], folded)
            .premultiply(inverse);
          direction.copy(directions[i - 1]).applyQuaternion(rotations[i - 1]);
          posed[i].copy(posed[i - 1]).addScaledVector(direction, lengths[i]);
        }
        rotations.at(-1).copy(rotations.at(-2));
        for (let i = 0; i < c.ids.length; i++) {
          const bone = bones[c.ids[i]];
          bone.position.copy(posed[i]);
          if (i) {
            inverse.copy(rotations[i - 1]).invert();
            bone.position.sub(posed[i - 1]).applyQuaternion(inverse);
            bone.quaternion.copy(inverse).multiply(rotations[i]);
          } else bone.quaternion.copy(rotations[i]);
        }
      }
      state.gather = gather;
      state.facing = facing;
      state.travel = travelling;
    },
  };
}
