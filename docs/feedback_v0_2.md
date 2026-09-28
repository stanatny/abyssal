# v0.2 playtest feedback and response

Recorded: 2026-09-26. Source: seven improvements requested by the user in this project thread after the first temporary preview.

This record preserves the user's intent and this round's decisions for implementation, review, and continuation. A completed targeted check means only that the corresponding code or check is complete; it does not mean that all seven requests have passed browser and natural-play acceptance. On 2026-09-27, the user authorized one commit of the current version.

Round closeout: 26 rules tests and 21 browser flows passed. All seven features were integrated and received targeted or key-flow verification. Natural play, listening on real devices, and difficulty tuning remain pending below. See [verification](verification.md).

## 1. Background music and interaction sounds

**User intent:** Add background music that feels relaxed normally and tense when dangerous animals give chase, plus sounds for eating small fish and being bitten.

**Decision:** Use original procedural music with calm, chase, and lord layers sharing a beat and blending smoothly. Preserve recognizable melody, harmony, and rhythm; add sounds for feeding, damage, sonar, breaching, reentry, rewards, monster attacks, and victory.

**Progress:** The audio module was implemented. An 18-second browser offline recording confirmed non-silent output in all three music stages, with RMS around 0.042 / 0.031 / 0.044 and peaks below 0.38. Targeted checks passed for initial toggle activation, audio-graph reuse across repeated starts, and freezing the audio clock while paused. Browser checks covered main-loop activation and pause integration. Real-speaker listening and final mixing still require playtesting.

## 2. Breaching and catching seagulls

**User intent:** Sprint out of the water and eat seagulls.

**Decision:** An upward sprint near the surface triggers a breach. Airborne motion follows a parabola; nearby gulls are eaten automatically, and reentry produces a splash and sound. Add sky elements to distinguish the above-water and underwater experience.

**Progress:** Browser checks passed for breaching, gull capture, reentry, and restart. The public production preview also completed a breach with actual W + Space input. Handling at different body sizes and camera behavior on real devices still require playtesting.

## 3. Recognizable rewards

**User intent:** Make it clear what the objects in the water are and what they do.

**Decision:** Use a green cross for Stamina Spring, blue double arrows for Ocean Current, and orange fangs for Abyssal Frenzy. Show names and effect descriptions and play a corresponding pickup cue. Frenzy still allows oversized ordinary prey; against lords, it only lowers the attack threshold.

**Progress:** Browser checks and actual screenshots confirmed the three distinct shapes, names, and descriptions. Reward rules tests passed. Real phone sizes and complex occlusion remain pending.

## 4. More underwater features and greater depth

**User intent:** Add underwater elements and make the ocean deeper.

**Decision:** Expand maximum configured depth from roughly 275 to 740 world units. At the existing display multiplier of 4, this represents about 2,960 meters. Extend terrain and environmental zones with bioluminescence, ruins, volcanoes, hydrothermal features, and separate territories.

**Progress:** Terrain and landmarks were complete, and the browser reached and rendered depths beyond 2,500 meters. Random lord spawn positions were checked for seabed clearance. Exploration density, near-bottom camera behavior, and sustained performance remain pending.

## 5. New dangerous animals and higher-tier monsters

**User intent:** Add a Maya-inspired monster, Dunkleosteus, and a three-headed dragon. The existing Kraken resembles a Giant Squid; a true Kraken should be larger and more advanced. High-tier monsters should be rare, lethal, have special abilities, and be difficult to escape with ordinary acceleration.

**Decision:** Classify Giant Squid and Dunkleosteus as intermediate hunters and upgrade Kraken to a giant lord. The four lords are Kraken, an original Maya-inspired monster, Three-Headed Hydra, and Leviathan, using vortex, pulse, breath, and charge attacks respectively. Their pursuit speeds exceed the orca's sprint speed, so escape requires dodging abilities, using terrain, or leaving their territories.

**Progress:** New models received individual screenshot checks. Spatial-module checks covered the four abilities and defeat sequence; browser checks covered windup/recovery and repeated bites. Escape fairness still needs natural play. Hydra follows the requested three-headed design. The Maya-inspired monster is fantasy artwork, not a claimed reconstruction of a historical mythological figure.

## 6. Fish tiers, schools, and repeated territorial battles

**User intent:** Schools of small fish in shallow water should support early growth. Intermediate hunters such as white sharks, Giant Squid, and anglerfish should catch a cruising player but be escapable by sprinting. Rare, randomly selected deep-sea monsters should have territories and require several frontal bites near maximum player size.

**Decision:** Separate starter prey, intermediate hunters, and lords. Activate two of the four lords randomly each round, each with a territory and independent health. Attacks normally become available at 24 meters, or 21 during Frenzy. F or the left mouse button bites; the 3 seconds after an ability form a high-damage counterattack window. Cap each hit at 24% of maximum lord health to require repeated encounters. Victory requires 30 meters and at least one lord defeated.

**Progress:** Checks passed for school spawning, two lords per round, windups and weak points, repeated bites while holding F or the mouse button, and the new victory condition. Two hundred spawn points met seabed and depth constraints. Natural growth time and a full round without state-assisted setup remain pending.

## 7. Healing after damage

**User intent:** Provide recovery after losing health, for example by using food to heal before growing.

**Decision:** Each meal heals first, consuming growth benefit in proportion to actual repair; at full health, growth proceeds normally. Allocate at most 70% of that meal's growth to repair, retaining a minimum growth share. Hunger replenishment is unaffected. Lord loot and seagulls use the same rule.

**Progress:** `applyNutrition` is shared by ordinary feeding and lord loot. Rules tests passed for benefit allocation with light injury, heavy injury, and full health, plus the victory condition. Browser checks confirmed actual fish consumption, healing, and notifications. Healing strength versus growth still needs natural playtesting.

## Further acceptance principles

- Complete module rules checks and browser integration before organizing a naturally played full round.
- Entering a lord battle through development state proves a specific flow is testable; it does not establish sensible normal growth pacing.
- Distinguish this round's results from the first version's historical results in [verification.md](verification.md).
- Review and commit authorization are separate. The 2026-09-27 authorization covers this version and does not automatically extend to later changes.
