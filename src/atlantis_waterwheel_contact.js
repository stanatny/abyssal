import { Vector3 } from "three";

/** 鼻端触碰可见轮盘；进入只触发一次，完全离开外圈才重新武装。 */
export function createWaterwheelContact(controls) {
  const latched = controls.map(() => false);
  const delta = new Vector3(),
    closest = new Vector3();
  return {
    sample(from, to, { active = true, front, blocked = () => false } = {}) {
      delta.subVectors(to, from);
      const travel2 = delta.lengthSq();
      let action = -1,
        best = Infinity;
      controls.forEach((point, i) => {
        const end2 = to.distanceToSquared(point);
        const wasLatched = latched[i];
        if (end2 > 3.2 ** 2) latched[i] = false;
        if (wasLatched) return;
        const u =
          travel2 > 0
            ? Math.max(
                0,
                Math.min(
                  1,
                  closest.subVectors(point, from).dot(delta) / travel2,
                ),
              )
            : 1;
        closest.copy(from).addScaledVector(delta, u);
        const distance2 = closest.distanceToSquared(point);
        if (distance2 > 2 ** 2) return;
        latched[i] = true;
        // 传送、关卡切换、死亡、背面擦过都不能当作主动碰触，也不排队补触发。
        if (
          wasLatched ||
          !active ||
          travel2 > 14 ** 2 ||
          (front && front.z <= point.z) ||
          blocked(point)
        )
          return;
        if (distance2 < best) {
          best = distance2;
          action = i;
        }
      });
      return action < 0 ? null : action === 6 ? "test" : `valve${action}`;
    },
    reset() {
      latched.fill(false);
    },
  };
}
