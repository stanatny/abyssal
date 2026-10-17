import { bodyRadius } from "./collision.js";
import { stepPenglaiFlight } from "./penglai_flight.js";
/** 神话空域以冲刺爬升、巡航滑翔和慢速下坠代替自由悬停，不启动破水弹道。 */
export function createAetherSurface({ worldBounds }) {
  const empty = () => {};
  return {
    mode: "aether",
    birds: [],
    ships: [],
    colliders: [],
    updateColliders: empty,
    onMovement: empty,
    applyCollision: empty,
    update: empty,
    reset: empty,
    dispose: empty,
    launchImpulse: empty,
    airborne: false,
    charge: 0,
    divingRequired: false,
    danger: false,
    ghostThreat: null,
    ceilingHeight(length, forward) {
      const r = bodyRadius(length);
      return (
        worldBounds.maxAltitude -
        r -
        Math.abs(forward.y) * Math.max(0, length * 0.42 - r) -
        0.4
      );
    },
    move(dt, context) {
      if (!context) return { airborne: false, reentering: false };
      return stepPenglaiFlight(dt, {
        ...context,
        surfaceY: worldBounds.surfaceY,
      });
    },
  };
}
