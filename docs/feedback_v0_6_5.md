# v0.6.5 Giant-creature redraw, Echolocation, and feeding

This round follows uncommitted v0.6.4 and addresses five playtest requests. No new commit or push; official GitHub Pages remains v0.5.1. Changes are reviewed through a temporary preview.

## Audio and naming

Adult feeding voices extend from 0.72 to 1.30 seconds, adding an upward cry, rasp, trembling, and a submerged finish. Music briefly ducks to emphasize the event instead of raising overall volume harshly. Existing wet fish-bite audio remains. Voices are still original procedural synthesis, not human recordings. At most one human voice and three feeding sounds play concurrently; mute, pause, and restart suppress or clean them correctly.

Guide categories and current descriptions rename Rare Lords to **Abyss Lords**. Internal kinds, random spawning, and combat thresholds remain, without increased appearance frequency.

## Six Ancient Giants and four Abyss Lords

`creature_ancient.js` rebuilds six ancient animals: layered armor and shearing bone plates for Dunkleosteus; massive broad jaws for pliosaur; a slender long neck and four flippers for plesiosaur; long snout and scaled skin for mosasaur; elongated body and small hindlimbs for Basilosaurus; and a broad head, stocky body, and tooth rows for megalodon. These distinguish in-game animals, not precise paleontological reconstructions.

`creature_lords.js` rebuilds the four lords: thick sucker-lined Kraken arms, jade-and-gold armor on the Maya-inspired monster, three independent long Hydra necks, and Leviathan's head crest and dark-blue scales. Guide and ocean share models and animation, retaining lengths, movement, abilities, and repeated flank attacks.

Models share geometry/materials and keep animation instances independent. No extra scene lights or animation loops are added. Actual screenshots assess faces, jaw cavities, fins, arms, and recognition from different angles rather than accepting geometry counts alone.

## Orca sonar

Echolocation extends from 10 to **20 seconds**. Cooldown remains **60 seconds from activation**, leaving roughly 40 seconds after the effect ends. Pause freezes time; repeated input cannot refresh duration. Detection labels remain forward-angle-limited, with full surrounding radar echoes; 360-degree screen clutter is not restored.

Giant Squid retains 10-second disorientation, a 1.5-second initial jet, and 60-second cooldown. `character_rules.js` is the sole duration source for home descriptions, guide, desktop/touch states, and actual sonar.

## Close-range feeding

Ordinary-fish mouth trigger radius increases by about **24%**, with the extra amount capped at **0.65 game meters**. This tolerates slightly offset contact near schools without scaling into long-range feeding as the player grows.

Length eligibility, mouth proximity, and unobstructed terrain are still required. Normal fish escape AI, human collision range, enemy damage range, and lord flank/repeated-attack rules do not change.

See [verification](verification.md) for results and boundaries.
