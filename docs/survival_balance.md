# Depth and food-chain balance

The current [all-region progression candidate](progression_pacing_revision.md) preserves the shared hunger curve and changes reward placement, selected habitat homes and Mechanical Shark oversized-torpedo growth only. Historical budgets below are not new runtime measurements.

## Current shared survival rule

The shared depth/body-size curve is documented in [the gameplay balance revision](gameplay_balance_revision.md) and AGENTS.md. It is included in published v0.10.2. The current progression candidate leaves hunger rates intact. The original v0.6.13 calculations below are historical evidence, not current survival budgets.

## Historical v0.6.13 record

Status: released in v0.6.13 (`53150df`), following the v0.6.12 baseline (`73574d6`). This includes the earlier reduction to 18 random rewards plus three starters. The player requested forgiving juvenile shallows and a food chain that encourages progressively deeper exploration. The comparison tables retain the earlier baseline and intermediate candidate counts.

## Survival costs

`src/simulation.js` is the source of truth. `hungerDrainRate(length, depth)` uses actual body length and world depth. All depths in player-facing copy and the tables below are **displayed meters**, four times world depth.

The shallow base rate is `0.22 + 0.02 * clamp(length - 3, 0, 3) + 0.03 * max(0, length - 6)` hunger per second. Water above 180 displayed meters has no extra cost. Below that, cost rises linearly to a maximum of +30% at 2000 meters. Returning shallower immediately lowers the rate; crossing a zone boundary never creates a sudden step. Both playable characters share this rule.

| Body length | Shallow drain / second | Deep drain / second | Full bar in shallows | Full bar at 2000 m or deeper |
| ----------- | ---------------------- | ------------------- | -------------------- | ---------------------------- |
| 3 m         | 0.22                   | 0.286               | 455 s                | 350 s                        |
| 6 m         | 0.28                   | 0.364               | 357 s                | 275 s                        |
| 10 m        | 0.40                   | 0.520               | 250 s                | 192 s                        |
| 16 m        | 0.58                   | 0.754               | 172 s                | 133 s                        |
| 25 m        | 0.85                   | 1.105               | 118 s                | 90.5 s                       |
| 30 m        | 1.00                   | 1.300               | 100 s                | 76.9 s                       |

These are no-food budgets, not survival predictions. Previously, depth had no effect and juveniles depleted a full bar in 333 seconds. Simply adding a deep-water penalty to the previous adult curve would make long lord engagements excessively punishing, so the base curve is adjusted at the same time.

Stamina still drains at 14 per second while sprinting and recovers at 19 when resting. Empty stamina does not damage health. Empty hunger continues to deal 7 health per second, accounting only for the starved portion of a frame. Feeding still heals first, replenishes hunger, and allocates the remaining benefit to growth. No ordinary-prey nutrition, growth, capture, ability, pickup effect, or combat threshold changed. The follow-up request adds 8 hunger per valid damaging lord bite, capped at 100, through `BOSS_BITE_HUNGER` in `boss_rules.js`. Failed attempts, cooldown, and continuous contact yield nothing. Per-hit food does not heal or add growth; normal defeat loot still settles once. This supports active battle participation without rewarding idle contact.

## Food supply and progression

Small-fish rewards already diminish strongly relative to the player's length. At 25 m, a coral fish restores approximately 0.033 hunger, a sunfish 1.382, a mosasaur 56, and a megalodon 70. That makes larger prey much more valuable without a second nutrition rule or forced relocation timer. The nursery remains a refuge, including the existing renewable Vitality Supply; this design encourages deeper progression rather than guaranteeing that a player who stays shallow must die.

The same 24 ordinary species now have 285 individuals, up from 235 in v0.6.12. After the first 252-creature candidate still felt sparse during playtesting, a modest follow-up added 33 individuals (13.1%) across juvenile, medium, and deep-water food stages:

| Species                   | v0.6.12 | First candidate | v0.6.13 |
| ------------------------- | ------- | --------------- | ------- |
| Coral fish                | 48      | 48              | 60      |
| Green humphead parrotfish | 8       | 8               | 12      |
| Ocean sunfish             | 6       | 8               | 10      |
| Tuna                      | 18      | 24              | 30      |
| Ray                       | 8       | 10              | 12      |
| Giant Pacific Octopus     | 5       | 6               | 7       |
| Dunkleosteus              | 3       | 4               | 5       |
| Pliosaur                  | 3       | 4               | 5       |
| Plesiosaur                | 3       | 4               | 5       |
| Mosasaur                  | 3       | 4               | 5       |
| Basilosaurus              | 2       | 3               | 4       |
| Megalodon                 | 2       | 3               | 4       |

Other populations, modern animal sizes, and species-wide depth ranges are unchanged. No additional nursery hunters are introduced. One hammerhead and one great white remain the only outer-reef challengers; other predators remain offshore. The safe nursery starts with 182 creatures, including two sunfish near its edge that become edible after growing beyond 3 m.

| Displayed depth | v0.6.12 legal starts | First candidate | v0.6.13 |
| --------------- | -------------------- | --------------- | ------- |
| 0–360 m         | 199                  | 201             | 226     |
| 360–660 m       | 10                   | 19              | 21      |
| 660–1000 m      | 6                    | 6               | 7       |
| 1000–2000 m     | 17                   | 23              | 27      |
| Below 2000 m    | 3                    | 3               | 4       |

The follow-up adds separate coral-fish and parrotfish schools on opposite sides of the nursery and inserts an extra sunfish, tuna, and ray school between existing centers. Schools are not stacked at their old anchors. These are initial placement counts validated against the actual seabed and colliders, not uniform encounter probabilities. Sunfish, tuna, and rays each retain their original group's depth band (anchor ±72 displayed meters, clipped to species limits) during migration, evasion, and respawn. Their movement cannot gradually pull deeper schools into the nursery. Ancient placements cover 12–92% of each existing depth range instead of 12–80%, bringing the deepest large prey to about 2461 m. The deepest lord territory remains a limited excursion with a return trip to feeding water, not an endless buffet.

The practical ladder is dense juvenile shoals and slow reef prey, then sunfish/tuna/rays near the shelf, then octopus/white shark/Dunkleosteus as their sizes become edible, and finally larger Ancient Giants. No food is granted automatically by a size milestone. Ordinary shoal/solitary respawn remains 18/28 seconds; new individuals use existing shared models and stable entity slots.

## Verification and remaining limits

Targeted rule checks cover the depth curve and boundaries, juvenile search grace, returning shallower, lord battle reserves, food-size returns, legal placement, layered migration, and nursery separation. The event-based expedition model now passes representative prey depth into the real survival rules and uses world depth 550 for the lord encounter.

The 3 m reference routes finish in 857.6 / 1072 / 1395 seconds for fast / standard / slow timing. They include healing, two travel delays, battle damage, and a hypothetical lord reward after a 75-second fight (scaled by pace). This reference retains the more conservative no-food-during-combat assumption; the new per-hit hunger is verified separately with actual successful contacts. They do **not** simulate natural navigation, respawn waits, targeting skill, or real flank attacks, and must not be described as observed full-round durations. The 30-minute active-play limit is unchanged.

Actual browser checks and preview receipts belong in [verification](verification.md). The latest population increase is 13.1% over the first survival candidate (21.3% over the published release); a count increase alone does not establish real-phone frame rate. Natural full-session pacing and low-end-device performance still need playtesting.
