# v0.6.2 Nursery shallows, human feedback, and desktop hints

## Feedback and tradeoffs

Actual playtest feedback: a 2.5-meter juvenile felt too small, shallow-water food was hard to catch, white sharks and other hunters chased the player too early, and difficulty lacked a gradual progression. This round adjusts uncommitted v0.6.1. The old starting values remain historical; no commit or push, and official Pages is unchanged.

Both characters now start at 3 meters for playability, not as a strict newborn-animal scale. They remain smaller than 4-meter hammerheads and 6.4-meter white sharks and cannot swallow them normally. Growth below 6 meters uses `length/6`, replacing the excessively strong squared reduction. At full health, the first coral fish yields about 3.07 meters and the first 12 about 3.76; 17/27/66 fish cross 4/4.5/6 meters respectively. The later growth curve, healing/nutrition, and 30-minute cap remain. The juvenile follow camera moves another roughly 12% closer and smoothly returns to the old distance as the character grows.

## Safe shallows → outer reef → deep water

- Core shallows: world z ≥ −120 and depth ≤72. The player can enter and leave freely without a level barrier. Ordinary hunters cannot pursue, bite, or use abilities inside. Hunter patrol positions and body edges stay beyond z = −145, leaving a buffer. HUD and radar display the Chinese label for “Safe Shallows”; leaving suggests exploring after 4 meters, and returning disengages combat.
- Outer reef: approximately z = −145 to −350, with exactly one hammerhead and one white shark, each with a fixed separate patrol range. Players can avoid or challenge them; ordinary hunters do not continuously replenish into this layer.
- Offshore and deep water: other hunters retain their reference depth ranges and begin horizontally at z ≤ −370. More modern and ancient animals appear along the slope. Leaving safety early can still be dangerous; this is not global juvenile invulnerability.

The cause was more than initial placement. Old white-shark pursuit allowed shallow targets and relaxed depth constraints during pursuit; patrol and nearby replenishment had no nursery boundary. This round enforces territory constraints consistently on spawn, respawn, distant replenishment, pursuit, abilities, contact damage, and after actual movement. Stable within-species indices distinguish the two outer-reef challenges from offshore individuals. Hunters turn before boundaries; final constraints prevent bursts from crossing them.

## Easier-to-find and easier-to-catch schools

Coral fish increase 24→48 and sardines 16→32. The six small-fish groups total 96→136; ordinary population rises 175→215, still across 21 species. Added schools form a revisitable nursery loop at spawn depth, ahead and to either side, rather than laying a food trail into deep water.

Small-fish formations tighten. Near juveniles in the safe area, small fish flee later, move more slowly, and vary less vertically. Contact-feeding range increases moderately by 0.25 game meters. Actually swimming through a school can produce repeated feeding feedback, without free growth or remote feeding. Normal handling resumes after 4.5 meters. Tiny-prey returns still diminish with player size to encourage exploration.

## Verification

Added acceptance covers boundaries, outer-reef counts, legal depths, replenishment, collision constraints, and actual opening feeding. See [verification](verification.md). The 17:52 reference event model does not simulate pathfinding or school respawn and is not a natural full-round duration. Real-phone handling and complete rounds still need playtesting.

## Additional feedback in the same round

Before acceptance, the user also requested swimmer/diver remodeling, separate human/fish feeding sounds, checking orca surface pitch, and larger desktop sonar/control hints. These remain part of this candidate, without another commit or push.

- Humans retain 1.9-meter swimmer and 2.4-meter equipped-diver scale, contact, and nutrition. Replace spherical torsos/single-segment limbs with adult proportions, continuous limbs, and articulated swimming. Guide and live scene continue to use the same model entry point.
- Fish feeding uses a short wet bite, water flow, and bubbles. Adults use a short vowel-like cry and splash. Both are original procedural synthesis, without human recordings. Successful feeding triggers the appropriate cue once; prey gathering and delayed blood remain. Dense-school voice limits, mute, pause, and restart use the unified audio path.
- Surface pitch retains the 85° limit in this historical decision: actual W input reaches the waterline without raising the center further, Space at the surface cannot launch, and S turns into a dive normally. Orcas do perform near-vertical spyhopping; see [NOAA's orca profile](https://www.fisheries.noaa.gov/species/killer-whale). Holding this pose indefinitely is a free-control game choice, not a real-animal claim. Automatic leveling is not restored.
- Desktop sonar text grows 11→16px, key hints 9→14px, breach hints 9→14px, and ordinary notifications 12→15px. Improve background contrast and key hierarchy while keeping active/cooldown text readable. Changes target desktop input conditions; phone survival bars and touch layout remain. A 320×568 stress check found simultaneous lord/chase/ink/long notifications overlapping the joystick. Short portrait screens therefore temporarily hide ordinary notifications when both lord and ink panels are visible, preserving action warnings; notifications return when either ends.

Final model, sound, and layout results are in that day's [verification](verification.md). Offline audio and staged screenshots do not replace real-device listening or a natural full round.
