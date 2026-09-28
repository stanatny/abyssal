# v0.6.1 Playtest fixes

As requested, this round first saved the v0.6 visual upgrade in local commit `94c2a95`, without pushing. The feedback changes below follow that commit and remain uncommitted for review.

## Heading and orientation

The old controls interpolated pitch toward an input-dependent angle every frame. Releasing input set the target to zero, automatically leveling the character. The new rule matches yaw: input changes the angle, and release preserves it. Desktop and touch both support ±85°. Squid's non-sprint passive now accelerates both yaw and pitch turning. The radar's right edge shows a horizontal reference and current pitch; no separate leveling key is added.

## Feeding presentation

Gameplay values still settle once when contact is confirmed. The original prey model then moves toward the live mouth position, compresses, and disappears over about 0.28–0.42 seconds. A small, compact blood cloud and bubbles appear only in the later part of that transition. Ordinary fish, seagulls, and adults share the transition; lords retain their own damage clouds and multistage combat. Pause freezes animation. Restart restores and releases borrowed meshes. No school geometry is cloned and no separate animation loop is added.

## Juvenile start

Both characters start at 2.5 meters, with growth progress measured from zero. The game's representative 6.4-meter white shark and 4-meter hammerhead cannot be swallowed normally at the start. Frenzy retains its 1.6× rule; temporary eligibility must not be mistaken for normal eligibility. Below 6 meters, growth rewards are multiplied by `(length / 6)²`; nutrition and healing are unchanged. The first coral fish adds about 3.5 centimeters; eating the first 12 yields about 2.93 meters. Growth beyond 6 meters and the 30-minute expedition limit remain unchanged. The camera moves closer for juvenile sizes so the character does not become a distant dot.

The juvenile orca reference is the [Aquarium of the Pacific orca profile](https://www.aquariumofpacific.org/onlinelearningcenter/species/killer_whale_orca), which gives roughly 2.1–2.5 meters at birth. Choosing 2.5 meters references a young orca; sharing that starting length with squid is game balance, not the real size of a hatchling. Shark configuration uses large individuals, not a claim that sharks of every age exceed young whales. Adult white-shark scale: [Florida Museum](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/white-shark/).

## Encounter distribution

Investigation confirmed all 21 ordinary-creature registrations and 175 population slots existed. Discoverability was the problem: roster indices placed schools away from routes, tiny and medium animals shared an overly short draw distance, and schools lacked distant relocation. Some swimmers started behind spawn with their entire models submerged; ordinary people did not respawn after feeding.

Schools now have species-specific habitat anchors ahead of spawn and along the main slope, independent of roster order. Depth, seabed, and solid-collision constraints remain. Faraway schools can relocate together within legal depths to destinations outside draw range, avoiding visible pop-in. Deep-sea anglerfish are not replenished into the shallows. Medium creatures get a longer draw distance without increasing total population.

Twelve adult swimmers form three groups ahead, with heads/arms able to cross the waterline, small splashes, and an overhead activity hint. Ten regular divers retain their depths. Ordinary swimmers/divers wait 65/85 seconds respectively, then respawn only once the player is far away. The submarine's three escapees still spawn once and never join the regular respawn loop.

## Verification scope

Targeted scripts, measurements, and screenshots are in `.local/v6_1_*`; final passed checks are in [verification](verification.md). Staged checks prove only the corresponding paths, not a natural 30-minute round or real-phone acceptance. Official GitHub Pages remains v0.5.1; this round updates only the temporary preview.
