import { isNursery } from "./nursery_rules.js";
import { takeDamage } from "./simulation.js";

export const BERMUDA_HAZARDS = Object.freeze({
  spoutDamage: 16,
  spoutCooldown: 9,
  liftSeconds: 0.65,
  liftSpeed: 34,
  launchSpeed: 27,
  ghostDamage: 40,
  ghostWindup: 2,
  ghostLockLead: 0.6,
  ghostRange: 150,
  ghostBlastRadius: 12,
  ghostShotSpeed: 70,
  ghostCooldown: 7.5,
  ghostEscapeDepth: 70,
});

/** 危险接触只在活动游戏内结算一次，旋风提升过程与无敌伤害分别计时。 */
export function createWaterspoutState() {
  return { cooldownUntil: 0, liftUntil: 0, source: null, launched: false };
}

/** 扫掠近水面船/鱼身路线进入旋风柱，幼年浅滩始终排除。 */
export function stepWaterspout(
  state,
  player,
  previous,
  position,
  spouts,
  now,
  playing = true,
) {
  if (
    !playing ||
    player.dead ||
    player.won ||
    player.timedOut ||
    isNursery(position)
  )
    return { hit: false, lifting: false, damaged: false };
  let hit = false,
    damaged = false;
  if (now >= state.cooldownUntil && Math.max(previous.y, position.y) > -18) {
    for (const spout of spouts) {
      const dx = position.x - previous.x,
        dz = position.z - previous.z,
        l2 = dx * dx + dz * dz;
      const t = l2
        ? Math.max(
            0,
            Math.min(
              1,
              ((spout.x - previous.x) * dx + (spout.z - previous.z) * dz) / l2,
            ),
          )
        : 0;
      const d = Math.hypot(
        previous.x + dx * t - spout.x,
        previous.z + dz * t - spout.z,
      );
      if (
        d > spout.radius + player.length * 0.13 ||
        previous.y + (position.y - previous.y) * t < -18 - player.length * 0.13
      )
        continue;
      state.cooldownUntil = now + BERMUDA_HAZARDS.spoutCooldown;
      state.liftUntil = now + BERMUDA_HAZARDS.liftSeconds;
      state.source = { x: spout.x, z: spout.z };
      state.launched = false;
      hit = true;
      damaged = takeDamage(player, BERMUDA_HAZARDS.spoutDamage);
      break;
    }
  }
  return { hit, damaged, lifting: now < state.liftUntil, source: state.source };
}
