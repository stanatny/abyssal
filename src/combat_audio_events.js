import { canEat } from "./simulation.js";
import { canPredatorRetaliate } from "./predator_combat.js";
import { isRegionalRare } from "./regional_rare.js";

/** 在食物结算前按目标标记规则取音色，避免成长跨过五米差值后误分类。 */
export function preyFeedingSound(player, species) {
  return !isRegionalRare(species) &&
    species.predator &&
    canEat(player, species.length) &&
    canPredatorRetaliate(
      player.length,
      species.length,
      species.threatCeilingLength,
    )
    ? "yellow"
    : "ordinary";
}
