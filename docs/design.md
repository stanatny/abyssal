# ABYSSAL · v0.2 Gameplay and Experience Design

## Vision and basis for this iteration

Build a browser-based game of big fish eating small fish. Players begin as a young orca, explore the ocean themselves, and change their place in the food chain as they grow.

The shallows should be bright, varied, and easy to enter. Trench hunters should make players manage stamina and find escape routes. Abyssal lords should feel threatening through their silhouettes, territories, ability warnings, and actual combat. The shallows will not force players out with a barrier; diminishing returns from small prey and rising food needs should encourage deeper exploration.

v0.2 follows seven points of feedback from the first playtest on 2026-09-26. Sources and individual responses are in [feedback_v0_2.md](feedback_v0_2.md). This document describes the code and implementation decisions at that stage; overall feel and final browser acceptance still require separate confirmation.

## Core loop and victory

Find food → feed, recover, and grow → need more food → dive for larger prey → evade mid-tier hunters → prepare for a lord battle → read abilities, dodge, and counterattack → earn an abyssal mark and loot.

The orca starts at 6 m, with a maximum length of 30 m. **Victory requires both reaching 30 m and defeating at least one lord.** Staying in a safe area to accumulate length cannot end the game by itself.

Mass determines length: `length = 6 × cube root of mass`. This is a fantasy growth game; sizes and species combinations are not constrained by real ecology.

## Three ecological tiers

| Tier             | Content at this stage                                            | Main rules                                                                                                                        |
| ---------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Basic prey       | Coral fish, tuna, manta rays, and seagulls at the surface        | Smaller prey can be swallowed automatically; shoals reduce the initial effort of finding food                                     |
| Mid-tier hunters | Great white shark, abyssal anglerfish, giant squid, Dunkleosteus | Chase faster than cruising but slower than sprinting; become edible once the player is large enough                               |
| Deep-sea lords   | Kraken, Maya-inspired beast, three-headed Hydra, Leviathan       | Random rare territories, separate health, and abilities; require repeated active bites and cannot be swallowed like ordinary fish |

Ordinary feeding requires prey to be strictly shorter than the player; contact near the mouth triggers feeding automatically. For prey less than half the player's length, growth and nutrition returns fall with the square of the relative size.

Coral fish are configured for small shoals of 10–14, with smaller groups for tuna and manta rays. Actual distribution and growth pacing still need adjustment against the main loop's spawning logic and natural playtests; having a configuration does not establish that the shoal experience has passed acceptance.

## Feeding prioritizes recovery

Every meal replenishes satiety, applies healing first, and then allocates growth from that meal.

- Healing capacity is 80% of the meal's effective nutrition, capped by missing health.
- More actual healing leaves a smaller share for growth; at most 70% of the growth return is spent on recovery.
- Minor injuries consume only the share actually used for healing; full health preserves the entire growth return.
- Injured players still retain at least 30% of the growth share; they do not have to reach full health before growing again.
- Meals and lord loot share this allocation rule; the interface can use `lastMeal` to show the meal's healing, growth, and satiety returns.

This makes retreating, finding food, and recovering before another attempt a viable route, without permanently denying growth after an injury.

## Survival resources

| Resource | Role at this stage                                                                                  | Gameplay purpose                                         |
| -------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Health   | Lost to bites, abilities, hunger, and hydrothermal hazards; zero means death                        | Leave room for mistakes, recovery, and retreat           |
| Stamina  | Spent on sprinting and restored when sprinting stops; after exhaustion, must recover to a threshold | Preserve an escape reserve and limit sustained sprinting |
| Satiety  | Falls over time, faster at larger sizes; zero causes continuous health loss                         | Encourage finding more valuable food                     |

Exhausting stamina does not directly damage health. A short invulnerability period after an attack prevents repeated contact damage within a few frames; it does not cancel continuous hunger damage.

## Lord territories and combat

Each run randomly activates two of the four lords, placing them near two deep-sea areas with territories of roughly 110 world units in radius. They do not chase a newly spawned player across the whole map. Respawning after defeat takes a long time; damage dealt before retreat is retained so that returning after resupplying remains worthwhile.

When a target approaches, a lord cycles through pursuit, windup, ability, and vulnerable recovery. An ability is followed by a **3-second recovery period**, during which bites deal more damage.

| Lord                | Ability at this stage                                                                       | Main response                                                         |
| ------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Kraken              | Abyssal vortex pulls targets and drains stamina; close targets are constricted by tentacles | Swim sideways out of range and use rock pillars to block the effect   |
| Maya-inspired beast | Ruin pulse attacks a specific water layer                                                   | Rise or dive out of the pulse layer                                   |
| Three-headed Hydra  | Triple breath launches moving projectiles                                                   | Change direction laterally and use terrain as cover                   |
| Leviathan           | High-speed charge after locking its direction                                               | Move sideways after the lock, then counterattack when the charge ends |

At this stage, lords pursue faster than the orca's normal sprint, so accelerating in a straight line is no longer a reliable escape. Leaving their territory, recognizing windups, changing depth, and using terrain matter more.

Players normally need to reach 24 m to actively bite a lord; Abyssal Frenzy lowers this threshold to 21 m. Press F or the left mouse button for a close-range attack, with a 1.2-second bite cooldown. Attacks can deal reduced damage in the normal phase, with extra weak-point damage during recovery. A single hit cannot exceed 24% of the lord's maximum health, preventing size or rewards from bypassing repeated engagements.

The Maya-inspired beast is an original sea monster inspired by fantasy ruins, not a reconstruction of a specific historical mythological figure. Hydra follows the user's three-headed dragon direction as a three-headed sea monster.

## Surface play

Near the surface, facing upward and sprinting fast enough makes the orca breach, then fall back into the water along a parabolic arc. The surface has a sky, clouds, sun, and seagulls. Approaching seagulls in the air triggers automatic feeding, with the same recovery-first allocation.

Seagulls provide a brief, bright, relaxed experience rather than replacing the deep-sea growth route. Large players eating small seagulls still receive diminishing returns.

## Reward recognition and effects

| Name           | Color and symbol   | Effect at this stage                                                                                                                                   |
| -------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stamina Spring | Green cross        | Instantly refill stamina and remove exhaustion                                                                                                         |
| Ocean Current  | Blue double arrows | Sprint without spending stamina for 12 seconds; the player still chooses whether to sprint                                                             |
| Abyssal Frenzy | Orange fangs       | Swallow ordinary prey up to 1.6 times the player's length for 10 seconds; lower the lord bite threshold to 21 m without bypassing its health or phases |

Rewards display a name and effect description, with a distinct collection sound. Picking up the same timed reward refreshes its duration rather than stacking indefinitely.

## Sea regions, scale, and growth guidance

Displayed depth is `-world Y coordinate × 4`. The maximum world depth of 740 corresponds to roughly 2960 m; terrain and character boundaries constrain the depth actually reachable. This multiplier applies only to the depth display.

| Region                | World depth | Displayed depth   | Content direction                                                                         |
| --------------------- | ----------- | ----------------- | ----------------------------------------------------------------------------------------- |
| Coral Shallows        | 0–90        | About 0–360 m     | Sand ripples, caustics, light shafts, coral, seagrass, small shoals, and surface activity |
| Twilight Trench       | 90–250      | About 360–1000 m  | Rock arches, reefs, and mid-tier hunters                                                  |
| Dark Abyss            | 250–500     | About 1000–2000 m | Bioluminescence, ruins, larger prey, and some lord territories                            |
| Molten Exclusion Zone | 500–740     | About 2000–2960 m | Volcanoes, hydrothermal vents, lava, and deeper lord areas                                |

Regions are determined by the player's depth; species habitats may span regions. Terrain descends as exploration proceeds, and a lord's territory is not the whole deep-sea region.

Growth prompts guide players without hard level gates: learn shoals and the surface early, seek larger prey and practice sprint escapes in the middle, prepare for territory battles near 24 m, and finally satisfy both 30 m and at least one lord defeat.

## Music, sound, and visuals

Three.js provides a 3D ocean with a trailing camera. Instanced vegetation, reefs, depth fog, light shafts, and suspended particles provide environmental layers while controlling rendering cost. Characters and monsters still use original procedural geometry and animation.

The Web Audio score has distinct notes, four-bar harmony, and a beat: calm play uses a gentle melody and chords; pursuit adds low string patterns and percussion; lord battles add lower-octave war drums and tense parts. All three layers share a beat clock and smooth volume transitions. A compressor limits peaks, with separate sounds for feeding, damage, sonar, breaching, reentry, rewards, lord abilities, and victory.

The first user gesture activates audio. Pausing stops the audio clock, and restarting does not create an entirely new audio graph. Offline music recordings and targeted state checks have been completed at this stage; listening quality and mix balance still need confirmation on real devices. At this stage, there are no externally recorded sound effects.

## First-version decisions superseded by v0.2

The following preserves the origin of the first implementation on 2026-09-26 for reference. **These decisions must not continue to be implemented as current rules.**

| First-version decision                                      | v0.2 replacement                                                                                | Source                                                              |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Reach 30 m to win immediately                               | Reach 30 m and defeat at least one lord                                                         | First-version design and items 5 and 6 of the seven feedback points |
| Swallow Kraken and Leviathan in one bite according to size  | Lords have separate health, abilities, territories, and repeated bites                          | Items 5 and 6                                                       |
| Kraken is common mid-game prey                              | Giant squid takes the mid-game position; Kraken becomes a larger, rare lord                     | Item 5                                                              |
| Feeding always gives growth and a fixed small heal          | Prioritize recovery when injured, reducing that meal's growth share according to actual healing | Item 7                                                              |
| Roughly 275 world units of depth, displayed as about 1100 m | Increase maximum configured depth to 740, displayed as about 2960 m                             | Item 4                                                              |
| Mainly low-frequency ambience and heartbeat                 | Layered background music with melody, harmony, and rhythm, plus more sound effects              | Item 1                                                              |
| Surface is the upper swimming boundary                      | Allow upward sprint breaches, aerial feeding on seagulls, and water reentry                     | Item 2                                                              |
| Rewards identified mainly by color                          | Combine symbols, names, effect descriptions, and sounds                                         | Item 3                                                              |

## Implementation limits

At this stage, this remains a single-player prototype without selectable player species, refined professional assets, a complete ecosystem, a story, multiplayer, or run saves. Lord abilities are implemented, but their fairness, sense of threat, avoidability, and natural combat pacing still require verification.

First-version verification is recorded in [verification.md](verification.md); its historical results do not automatically count as passes for v0.2. The latest overall verification is updated separately in that record.
