import { Vector3 } from "three";

/** 固定鼻端接触，不以体型扩大触发器；每次必须完全离开外圈再接近。 */
export function createTideContacts(points, { enter = 3.5, release = 6 } = {}) {
  const latched = points.map(() => true);
  const delta = new Vector3(),
    closest = new Vector3();
  return {
    sample(
      from,
      to,
      {
        active = true,
        continuous = true,
        front,
        normal,
        blocked = () => false,
      } = {},
    ) {
      delta.subVectors(to, from);
      const travel = delta.lengthSq();
      let selected = -1,
        best = Infinity;
      for (let i = 0; i < points.length; i++) {
        const target = points[i],
          was = latched[i];
        if (to.distanceToSquared(target) > release * release)
          latched[i] = false;
        if (was) continue;
        const u =
          travel > 0
            ? Math.max(
                0,
                Math.min(
                  1,
                  closest.subVectors(target, from).dot(delta) / travel,
                ),
              )
            : 1;
        closest.copy(from).addScaledVector(delta, u);
        const d = closest.distanceToSquared(target);
        if (d > enter * enter) continue;
        latched[i] = true;
        // 从背面、静止贴靠、暂停恢复或不连续跳跃都不能排队补交互。
        if (
          !active ||
          !continuous ||
          travel < 1e-10 ||
          (front &&
            normal &&
            closest.copy(front).sub(target).dot(normal) >= 0) ||
          blocked(target)
        )
          continue;
        if (d < best) {
          best = d;
          selected = i;
        }
      }
      return selected;
    },
    reset() {
      latched.fill(true);
    },
  };
}
