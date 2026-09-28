# v0.5 Character, ecology, and interaction expansion

Historical snapshot: this document records the first v0.5 implementation. Later on 2026-09-27, the user requested playable-only squid, a wild octopus replacement, and a commit. The wild roster, distinct creature count, and reference duration were superseded by the [v0.5.1 supplement](feedback_v0_5_1.md); other rules remain.

This round continues from the uncommitted v0.4.4 workspace, retaining controls, sonar, return radar, rewards, collision, and audio. Official GitHub Pages still serves published v0.2 (`96d57ff`); this round includes no new commit or push authorization. Actual tests, builds, and public-preview checks are in [verification](verification.md). This document explains implementation and tradeoffs without presenting plans or simulations as natural-play results.

## Two playable characters

`src/character_rules.js` centralizes character definitions for home selection, ability buttons, movement, and the guide. Orca and Giant Squid both start at 6 meters, **each with one active and one passive ability**. Desktop J triggers the selected active; phones reuse the same slot. Passives need no key. The existing layout supports at most two active slots, with one used per character this round.

| Character   | Active                                                                                                          | Passive and movement differences                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Orca        | Echolocation: range 260, duration 10 seconds, 60-second cooldown from activation                                | Ocean Sprint: 30% above the base sprint of 32, targeting 41.6 game meters/second                                                      |
| Giant Squid | Ink Jet: range 90, disorientation 10 seconds, jet for the first 1.5 seconds, 60-second cooldown from activation | Flexible Turning: faster turning when not sprinting, maximum pitch 85°; normal turning during actual sprint, ordinary sprint speed 32 |

Both cruise at 12 and swim slowly at 5; stamina drain/recovery follow existing rules. Orca sonar retains surrounding 360-degree radar echoes, but world labels appear only within camera-relative horizontal ±30°, vertical ±25°, and the screen. It reveals creatures ahead behind obstacles. Turning updates, text aggregation, orca-centered waves, and restoration of ordinary marker preferences after 10 seconds remain. Squid does not also have sonar.

Squid's active requires an actionable character underwater. At activation, **ordinary hunters already pursuing** and **lords in chase/windup/attack phases** within 90 units become disoriented, stop moving for 10 seconds, and cancel unreleased lord attacks. It does not stop every passing creature or continuously affect newcomers. Already launched projectiles are not guaranteed to disappear, and the player can still take damage.

For the first 1.5 seconds, the squid jets along its activation heading toward 72 game meters/second, using existing continuous collision so it cannot pass through rocks or hulls. It creates visible ink; active duration and cooldown display independently. Pause freezes both. Player ink and wild-squid ink have distinct origins; see verification for actual UI and input checks.

## 21 ordinary species and ecological scale

`src/ecosystem_config.js` becomes the unified ordinary-creature configuration. The four rare lords are outside these 21 species.

| Category                         | Count | Roster and in-game length                                                                                                                                                         |
| -------------------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marine prey                      |    10 | Anchovy 0.18 m, herring 0.26 m, sardine 0.30 m, flying fish 0.40 m, mackerel 0.55 m, coral fish 0.8 m, green sea turtle 1.2 m, ocean sunfish 3 m, bluefin tuna 3 m, manta ray 4 m |
| Ocean Predators (modern hunters) |     5 | Deep-sea anglerfish 1.2 m, hammerhead 4 m, great white shark 6.4 m, Giant Squid 12 m, sperm whale 16 m                                                                            |
| Ancient Giants                   |     6 | Dunkleosteus 6 m, pliosaur 11 m, plesiosaur 12 m, mosasaur 13 m, Basilosaurus 18 m, megalodon 20 m                                                                                |

The five new small fish are anchovy, sardine, herring, mackerel, and flying fish. Green sea turtle, ocean sunfish, hammerhead, sperm whale, and five ancient animals bring the total to 14 new ordinary-creature models. Each has its own silhouette and movement; scene and guide reuse `createCreature`. Flying fish startled at close range in shallow water breach, spread their pectoral fins, glide, and reenter; they do not flap like birds.

Species are ordered by length within categories, not globally. Growth routes, sonar eligibility, and AI must read actual length rather than relying on the old seven-species list, 10-meter white shark, or 21-meter Dunkleosteus. Anglerfish remains a small ambush predator. Ocean Predators is a game category, not a claim that every member threatens a 6-meter player.

Game scale remains: displayed depth is four times world depth. Modern lengths reference larger individuals, not typical adults. Squid total length includes tentacles; rays are commonly measured by wingspan and turtles by carapace length, so these do not imply equivalent body mass. Ancient body reconstructions and sizes, including Dunkleosteus, remain disputed; the guide preserves qualifications.

Detailed references and choices are in [ecological scale and sources](ecology_sources_v0_5.md). All creatures appear in the **Hawaii fantasy region**; this does not claim that northern anchovy, herring, and others naturally occur in Hawaii. Ancient revival and depth ranges, sperm whales pursuing players, growth from 6 to 30 meters, and special abilities are game design. Kraken, Hydra, and Leviathan are fantasy lords. The Maya-inspired monster is an original ruin-inspired design, not a real species or a confidently identified historical deity.

## Flank combat against four lords

Kraken, the Maya-inspired monster, Three-Headed Hydra, and Leviathan retain territories and abilities, with two randomly active per round. Reaching a length threshold does not turn a lord into prey that can be swallowed in one bite.

Automatic attacks require all of the following:

1. Normally at least 24 meters; Abyssal Frenzy lowers this to 21.
2. Mouth contact with the actual model surface/solid without terrain obstruction. Gaps between arms are not hits.
3. The player is on a left or right flank and attacks inward. Frontal, rear, or vertical contact from above is not an effective flank attack.
4. At least 1.2 seconds since the previous successful bite, plus at least 0.35 seconds out of mouth contact after the previous hit before reentry. Staying attached does not cause repeated bites.

Each hit is capped at 24% of total lord health, requiring at least five effective attacks even at maximum level, during Frenzy, or in vulnerable windows. The 3 seconds after an attack offer higher damage; flank attacks outside that window still work less efficiently. Nutrition, growth, and victory credit are awarded only after defeat.

Ordinary lord pursuit speeds are 37–40. Orca sprint at 41.6 exceeds that range, so the old statement that all lords outrun normal sprint no longer applies. Threat comes from predictive territorial pursuit, Kraken vortices, Maya pulses, Hydra projectiles, and Leviathan charges up to 100. Straight-line sprinting cannot be described as guaranteed escape.

## Adult human activity, submarines, and torpedoes

`human_activity.js`, `human_rules.js`, and `vehicle_models.js` manage these additions separately within the main loop and collision system, without an additional scene loop.

| Object             | Interaction in this round                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Adult swimmer      | Active in shallow water; contact supplies nutrition and healing priority under ordinary feeding rules                                     |
| Adult diver        | Active underwater and edible; protected for 2 seconds after escaping a submarine                                                          |
| Deep-sea submarine | Cannot be swallowed; a character at least 8 meters long and moving at least 20 game meters/second destroys it with three independent rams |
| Contact torpedo    | Stationary hazard that explodes and disappears on contact, dealing 28 health damage under existing invulnerability rules                  |

After an effective submarine hit, leave the hull before the next ram, which must still meet speed, length, and the 0.8-second interval. Staying against the hull does not repeatedly damage durability. The third valid ram releases exactly three adult divers once. Torpedoes settle a single explosion, do not track the player, and are not food. Human feeding and torpedo damage retain terrain-occlusion checks.

Existing cruise ships and sailboats retain hull/deck collision without destruction or force-driven overturning. The submarine is a separate destructible vehicle; its rules do not apply to every surface ship.

## Guide and region planning

The guide's 32 entries comprise:

- 2 playable characters: Orca and Giant Squid, with their active and passive abilities.
- 21 ordinary creatures: 10 prey, 5 modern hunters, and 6 ancient animals.
- 1 surface seagull and 4 rare lords.
- 4 human-activity entries: adult swimmer, adult diver, submarine, and torpedo.

Player and wild squid have separate guide IDs while sharing the species model cache; selecting one identity cannot select the other entry. Excluding four human entries and the duplicated squid character gives **27 distinct marine creature types**. This includes gulls, fantasy lords, and the artistic coral-fish grouping, so it is not a strict taxonomic species count. Three rewards are separate from the 32 entries.

Only Hawaii is open this round. Mariana Trench, Bermuda Triangle, and Atlantis remain disabled. Character and region configuration are separate, allowing future species allocation by region without reverting Playable Characters to a single-species section.

## Growth and the 30-minute boundary

Victory still requires both 30 meters and at least one defeated lord. Each round allows at most 30 minutes of effective playtime; 20 minutes is not an endpoint and pause does not count. Timeout has its own result rather than automatic death or victory. Growth follows actual feeding rules, with healing first when injured. Staying shallow and eating tiny fish indefinitely cannot match adult-prey growth efficiency.

The reference route in `tests/simulation.test.js` selects edible prey by **actual meal mass gain / assumed feeding interval**, covering modern and ancient species instead of relying on reverse configuration order. Assumptions:

- Start with 12 coral fish, one per second.
- Small fish take 1 second; turtle/sunfish/tuna 7; manta ray 12; anglerfish 11; hammerhead/white shark 10; squid 13; sperm whale/Dunkleosteus/pliosaur/plesiosaur/mosasaur 16; Basilosaurus/megalodon 20. These fixed event durations abstract search and pursuit and are not samples from the actual map.
- At 10 and 18 meters, add 20/30 seconds of travel and 28 damage at each transition.
- At 24 meters, assume Kraken is defeated after 75 seconds and 40 damage, then consume loot under actual rules. Defeat is settled directly; five flank attacks are not simulated.
- Faster/slower routes scale feeding, travel, and lord-battle durations uniformly. Hunger, damage, healing, and growth still run actual rules.

| Reference pace              | Completion time | Ordinary meals (including initial 12) |
| --------------------------- | --------------: | ------------------------------------: |
| Event durations 20% shorter |         13:40.8 |                                    68 |
| Baseline                    |           17:06 |                                    68 |
| Event durations 25% longer  |        22:33.75 |                                    71 |

The slower route is alive but unfinished at 20 minutes and can continue to victory. A separate test covers the 30-minute endpoint. Extra meals on the slower route result from additional hunger and healing allocation, not merely multiplying the final time.

**The model does not simulate real paths, rare-species respawn waits, or natural lord combat, and does not establish those completion times for real players.** Keep growth settings for now; future nutrition, density, and hunger changes should follow natural full-round records rather than changed assumptions to preserve the old 15–20-minute range.

## Acceptance and remaining boundaries

The targeted entry point is `scripts/verify_expansion_v0_5.mjs`. Existing main-flow, sonar, collision, guide/effect, HUD, and audio scripts continue to cover shared functionality. Actual passes and screenshots are recorded in [verification](verification.md). Browser-emulated small screens are not real phones; development scene setup is not natural play; successful builds are not formal deployment.

A natural 30-minute round, difficulty for both characters, rare-prey respawn supply, real-phone multitouch, and low-end performance still need playtesting. The user's overall UI request remains in [next steps](next_steps.md); ecological model expansion does not replace the later full visual redesign.
