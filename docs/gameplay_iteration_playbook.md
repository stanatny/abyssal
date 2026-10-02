# Gameplay iteration: food, progression and combat feedback

This playbook records the methods established by the reviewed Mechanical Shark and five-region feeding refinements in commit `d533dee`. It complements the current rules in [AGENTS.md](../AGENTS.md); it does not prescribe fixed populations, rewards or weapon settings for future maps. New tuning still requires actual player review. The documentation follow-up changes no game behavior.

## Diagnose the experience before choosing a lever

“I spend too long finding fish” and “I grow too slowly” can have different causes.

| Symptom                                              | Check in the running game                                                                 | Smallest relevant change                                                                   |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Plenty of food centrally, little on side routes      | Legal edible animals within the actual visibility range at equivalent depth/size stations | Distribute roaming habitat anchors laterally; preserve protected homes                     |
| Fish exist but remain invisible and fail to relocate | Visibility versus migration thresholds, with formation clearance                          | Correct the shared migration boundary rather than adding another map-specific spawn branch |
| Distributed schools are now too thin                 | Actual inventory and local encounters after splitting; not just catalog kind counts       | Raise stock in eligible profiles, constrained by each habitat's capacity                   |
| Frequent adult meals barely advance length           | Actual mass-to-length curve, prey size efficiency, healing allocation and rewards         | Adjust the shared medium/late meal curve rather than increase every food value             |
| Rewards differ between mouth, torpedo and companion  | Effective pre-meal returns and once-only settlement                                       | Use one ordinary-meal helper for all confirmed feeding paths                               |
| A target is edible yet can hurt the player           | Shared eligibility and retaliation flags in HUD, sonar and radar                          | Distinguish warning from lethal danger through color and wording                           |
| Mobile approach control is missing                   | Native touch actions and keyboard behavior, including simultaneous controls               | Add input parity through existing movement state and lifecycle                             |

Check size and depth together: global population, a Guide entry or a good central screenshot cannot establish accessible food at a particular progression stage. Use normal movement and legal habitat placement when measuring encounter availability. Artificially frozen prey are appropriate for isolated hit-accounting tests, not discoverability or pacing claims.

## Tune distribution, inventory and meal economy separately

First verify that every declared feeding habitat receives animals and that visibility, migration and respawn agree. Preserve safe nurseries, city interiors, wreck galleries, exclusive regional species and deep feeding layers. Fixed habitats need explicit metadata; do not spread their residents through walls or out of the structure. A small resident's normal range is different from a roaming food school.

Stock-preserving redistribution solves coverage but can reduce local density. Record both total inventory and nearby eligible prey before deciding whether additional animals are needed. Apply a stock increase once in the shared registry pipeline, honor passage capacity and keep dangerous juveniles' hunters, lords and vehicles outside food multipliers. Verify real initial positions, movement, feeding and habitat-aware respawn across affected maps. The [distribution review](homing_feeding_revision.md) and [density review](feeding_density_revision.md) document why the second intervention was necessary here.

The shared curve is `length = 6 * cbrt(mass)`. Equal mass gains therefore produce progressively smaller length gains. Inspect this conversion together with the relative-size penalty and healing-first allocation before diagnosing slow adult progression. A bounded bonus can favor useful medium/large prey while preserving early growth and diminishing returns from tiny food. Keep lord loot, quest items, pickups and voluntary skill costs separate from ordinary meals. See the [meal progression rule](meal_progression_revision.md) for the implemented curve and its bounds.

Meal-count calculations help compare rules, but exclude search, failed approaches, travel, damage, respawn and battles unless those are explicitly modeled. Report them as calculations, not observed completion times. A useful next playtest follows 10–15, 15–20 and 20–25 m stages on representative side/deep routes, recording time between meals, hunger/injury pressure and time spent searching. Do not infer that higher stock or a faster synthetic feeding ladder guarantees a better full expedition.

## Keep combat truth and feedback together

Separate ordinary durability from lord battle rules. Use shared constants for actual impacts, remaining-hit estimates and target fractions; preserve the lord size gate and mixed bite/torpedo progress. Determine relative size at impact when that is the contract. A nonlethal hit grants no food; a confirmed kill credits one shared meal, then retires the animal and resets its durability before normal respawn. Test equality, growth between hits, blocked shots, duplicate settlement and cleanup. The [two-hit review](torpedo_durability_revision.md) records the current ordinary/lord distinction.

Target acquisition and pursuit are separate decisions. The reviewed weapon acquires one forward, visible, unobstructed target, then tracks that target through lateral movement. Retirement or obstruction releases it; render-distance culling alone does not imply death. Preserve finite flight and actual contact, without silently retargeting. A preview that claims a lock must agree with launch selection and flight. The old nine-degree flight corridor was superseded by explicit player feedback; remove contradictory live rules instead of allowing future work to restore it accidentally.

Use green for harmless edible prey, yellow plus “can retaliate” for edible threats, and red plus danger wording for non-edible hunters. Keep the distinction consistent across ordinary hints, sonar and radar, and retain text so color is not the only signal. Preserve separate lord styling and avoid covering skills or alerts with aim labels. Both languages and the Guide must describe actual rules, not an older balance revision.

## Mobile parity includes release behavior

A momentary Slow swim control should reuse the existing movement path. Track keyboard and touch independently, aggregate them without one release cancelling the other, and preserve intentional sprint priority. Handle pointer capture, release outside, cancellation, lost capture, pause, page suspension and home. Exercise joystick, slow, sprint and skill together; an isolated button tap misses the important state transitions.

Review short portrait, narrow landscape and tablet heights with long translated labels. Inspect both control bounds and the usable world view. The [touch-control review](touch_slow_torpedo_revision.md) records the observed cases; viewport emulation does not establish physical-phone ergonomics.

## Evidence and maintenance

Keep three layers distinct: rule/economy calculations, controlled runtime contracts, and natural player experience. In this checkpoint, 780 units and real desktop/touch torpedo casts establish hit/reward behavior; local/public compiled checks establish the delivered Guide and controls. They do not prove whole-round balance or phone temperature. Density measurements show local encounter and resource changes under recorded conditions, not a general performance improvement. Reuse the existing representative performance and repeated-switch checks when stock or ownership changes; do not rerun every historical suite for a text-only correction.

Preserve failed test receipts and repair invalid oracles. For example, a retired target correctly clears its hit counter; expecting it to retain two hits would test the wrong lifecycle. Waiting for an exact player scale also requires isolating unintended meals. Correct the fixture without weakening the actual gameplay invariant.

Update shared rules, both locales, selection/help, Guide, HUD/radar/reticle, README, current HANDOFF and affected tests together. Supersede old measurements explicitly instead of silently rewriting their evidence. Capture an accepted source baseline before the next experiment, and roll back only that experiment's delta. Do not reset away earlier accepted improvements. Keep reusable methodology separate from current tuning constants and raw local evidence; a future map should inherit the method, not blindly copy another map's numbers.
