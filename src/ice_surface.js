import { EUROPA_WORLD } from "./europa_config.js";
import { bodyRadius } from "./collision.js";

/** 冰下水域不构建船、鸟、天空或破水效果，接口与露天海域一致。 */
export function createIceCoveredSurface({ worldBounds = EUROPA_WORLD } = {}) {
  const empty = () => {};
  return {
    mode: "ice",
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
        worldBounds.surfaceY -
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
