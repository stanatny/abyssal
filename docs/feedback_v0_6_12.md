# Reward supplies and stronger suction

Date: 2026-09-28. The user authorized a local commit of the previous shoreline/mine/Frenzy update, then requested further reward adjustments. That checkpoint is `d6ad183`. After review, the user authorized committing and pushing this complete update as v0.6.12 on the same date. The Pages workflow for `main` supplies the deployment record; earlier uncommitted/unpushed notes describe the state during verification.

## Final reward placement

The latest clarification retains **one of each reward in the shallows**, with the remaining rewards placed randomly each round. There are 34 pickups: three starter supplies and 31 random placements. The extra dedicated nursery Frenzy pickup is removed, together with its standalone placement module and obsolete tests. Restart reuses all existing reward models, restores the three starter anchors, and randomizes the other positions. Collection hides a reward for 45 active seconds before it returns to that round's position; pause freezes the timer.

This supersedes the intermediate request to remove every guaranteed shallow Frenzy pickup. The starter trio is retained; no fourth guaranteed reward is added.

## Recovery rules

- **Vitality Supply** replaces the public name Stamina Spring, keeping the internal `stamina` identifier. It restores 50 health, 50 stamina, and 50 hunger, each independently capped at 100, and clears exhaustion. Full attributes do not transfer surplus recovery elsewhere. It neither grants growth nor changes an active timed reward.
- **Ocean Current** immediately refills stamina to 100 and clears exhaustion, then preserves the existing 30-second stamina-free sprint. It does not restore health or hunger. Another pickup refills stamina again and refreshes the duration without stacking it.
- **Abyssal Frenzy** is a 20-second suction-only reward, following the user's subsequent duration adjustment from 30 seconds. Eligibility uses real body length; regular meals still heal and grow the character. There is no temporary body size or growth reserve.

## Suction feel

Live fleeing-prey checks exposed two gaps in the previous controlled, stationary-prey verification: a small target just outside the juvenile's approximately 3.8-meter reach never experienced suction, and a sprinting squid could move its trailing capture point away faster than suction could gather the prey.

The outer suction band now measures `min(10, 5 + 0.16 × real length)` game meters, added to the existing close-contact radius. A 3-meter character reaches roughly 7 meters, depending on prey size and nursery assistance. The final close-contact tolerance is unchanged. Pull speed includes current swimming speed so the effect can gather prey during cruise and sprint, including behind a mantle-leading squid. There is no per-prey retention state, alternate feeding settlement, or new animation loop.

Terrain visibility, already-edible eligibility, waterline, and airborne guards remain. The effect is still local: it does not pull distant schools, larger animals, lords, vehicles, or mines. More visible, curved water trails converge on the actual character-specific capture point. Visual radius reads the same reach helper as gameplay, and buffers/materials/textures are reused and released on disposal.

The guide, reward pickup notifications, scene labels, English translations, and README reflect these rules. Historical records retain their original decisions. Check results, actual screenshots, and limits are recorded in [verification](verification.md).
