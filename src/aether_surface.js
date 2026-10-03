import { bodyRadius } from "./collision.js";
/** 神话空域沿用水中操控，不启动破水弹道或自动纠正海面仰角。 */
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
    move() {
      return { airborne: false, reentering: false };
    },
  };
}
