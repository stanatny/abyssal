import * as THREE from "three";

const segment = new THREE.Line3();
const closest = new THREE.Vector3();
const start = new THREE.Vector3();
const end = new THREE.Vector3();
const actor = new THREE.Vector3();

/** 扫尾跟踪只保存上一帧真实骨骼锚点；暂停和非攻击帧仍更新基线，不补结算旧攻击。 */
export function createLadonSweepTracker() {
  return { previous: [], current: [], ready: false };
}

/** 可见尾部的分段胶囊按相对运动扫掠，保留有限高度和实体遮挡。 */
export function stepLadonSweep(
  tracker,
  anchors,
  playerStart,
  playerEnd,
  { active = false, radius = 0, scale = 1, blocked = () => false } = {},
) {
  tracker.current.length = anchors.length;
  for (let i = 0; i < anchors.length; i++) {
    tracker.current[i] ||= new THREE.Vector3();
    anchors[i].getWorldPosition(tracker.current[i]);
  }
  let hit = false;
  if (active && tracker.ready && tracker.previous.length === anchors.length) {
    for (let i = 1; i < anchors.length && !hit; i++) {
      const oldA = tracker.previous[i - 1],
        oldB = tracker.previous[i];
      const nextA = tracker.current[i - 1],
        nextB = tracker.current[i];
      const travel = Math.max(
        oldA.distanceTo(nextA),
        oldB.distanceTo(nextB),
        playerStart.distanceTo(playerEnd),
      );
      const tailRadius =
        Math.max(
          anchors[i - 1].userData.radius || 0.012,
          anchors[i].userData.radius || 0.012,
        ) * scale;
      const steps = Math.min(
        64,
        Math.max(
          1,
          Math.ceil((travel / Math.max(0.5, tailRadius + radius)) * 2),
        ),
      );
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        start.copy(oldA).lerp(nextA, t);
        end.copy(oldB).lerp(nextB, t);
        actor.copy(playerStart).lerp(playerEnd, t);
        segment.set(start, end).closestPointToPoint(actor, true, closest);
        if (
          closest.distanceToSquared(actor) <= (tailRadius + radius) ** 2 &&
          !blocked(closest, actor)
        ) {
          hit = true;
          break;
        }
      }
    }
  }
  tracker.previous.length = anchors.length;
  tracker.current.forEach((p, i) =>
    (tracker.previous[i] ||= new THREE.Vector3()).copy(p),
  );
  tracker.ready = true;
  return hit;
}
