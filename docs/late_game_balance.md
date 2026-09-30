# Late-game combat and rare deep-water hunters

Release status: included in the user-authorized **v0.7.2** commit and push to `main`. See [release verification](verification.md) for current checks and deployment acceptance. Local-only authorization statements and earlier candidate measurements below are historical; they do not override the current release instruction.

## Historical review context

Candidate rules for the global-ocean polish work, September 30, 2026. This document supersedes the older five-hit and recovery-damage descriptions for the candidate; it does not rewrite historical release evidence. Model presentation, bilingual delivery and browser acceptance belong to the integration verification record.

## Three validated lord attacks

Every Abyss Lord still requires an actual player length of at least 25 m. Frenzy changes neither this threshold nor ordinary feeding eligibility. A lord cannot be swallowed through the ordinary feeding route.

`BOSS_REQUIRED_HITS = 3` is shared by Kraken, Gran Maja (the stable internal kind remains `mayan`), Hydra and Leviathan. `createBossState()` initializes the integer `validatedHits` counter to zero. A successful attack uses:

```text
remainingHits = BOSS_REQUIRED_HITS - validatedHits
damage = currentHealth / remainingHits
validatedHits += 1
health = 0 on hit 3; otherwise currentHealth - damage
```

This gives each validated attack one third of the initial health during an uninterrupted fight, with the third attack explicitly clearing any floating-point remainder. Player length, Frenzy and combat phase do not add damage. The existing three-second recovery phase remains a maneuvering and attack opportunity. It has no damage bonus.

| Lord      | Initial health | Nominal damage per validated attack |
| --------- | -------------- | ----------------------------------- |
| Kraken    | 180            | 60                                  |
| Gran Maja | 210            | 70                                  |
| Hydra     | 220            | 73.333…                             |
| Leviathan | 240            | 80                                  |

Validation still requires actual unobstructed model contact from an inward-facing flank. The player-wide and per-lord cooldowns remain 1.2 seconds. Staying in contact cannot add hits: the mouth must leave contact for at least 0.35 seconds before another approach. Rejected attempts do not advance the counter, change lord health or restore hunger. Returning to a lord's home preserves its received attacks; a normal expedition reset creates fresh state.

Each successful damaging bite still restores up to `BOSS_BITE_HUNGER = 8` hunger, capped at 100, without healing or growth. Three bites can supply at most 24 hunger before defeat loot. At 25 m and world depth 500 m or below, the unchanged drain is 1.105 hunger points per second, so 24 points equal approximately 21.7 seconds of food budget. This is an arithmetic reserve, not an observed fight duration. Defeat loot, healing, growth and victory credit settle once after the third hit.

Victory remains actual length at least 30 m plus at least one defeated lord, under the unchanged 30-minute active-play limit. A 25 m character can defeat a lord and continue growing. Existing loot can also bring a sufficiently grown character to 30 m on the third bite. Paused time remains excluded.

## One rare giant species in both regions

Ichthyotitan adds a large ordinary hunter without enlarging real modern animals or replacing existing food. There are two independent individuals per map, outside the juvenile zone, along the established large-prey descent routes.

| Shared value           | Candidate configuration                         |
| ---------------------- | ----------------------------------------------- |
| Kind                   | `ichthyotitan`                                  |
| Classification         | Ancient Giant, ordinary predator, tier 2        |
| Game length            | 28 m                                            |
| Cruise / pursuit       | 24 / 24 game m/s                                |
| World depth            | 300–680 m                                       |
| Displayed depth        | 1200–2720 m                                     |
| Population             | 2 per region                                    |
| Nutrition              | `30 + 2 × 28 = 86`                              |
| Growth                 | `0.2 + (28 / 6)² × 0.25 = 5.644444…` mass units |
| Feeding eligibility    | Player's actual length must exceed 28 m         |
| Hunter ability profile | Existing Mosasaur burst, chosen by data trait   |

The original [Lomax et al. 2024 study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11023487/) estimates Ichthyotitan around 25 m, or approximately 20–26 m, from incomplete lower-jaw material. The species' full body shape remains uncertain. The game's 28 m length, reconstructed silhouette, deep-water revival, swim speed and attacks on large players are deliberate adaptations, rather than confirmed biology. The new model must meet the accepted Ancient Giant quality reference and convey its own elongated ichthyosaur identity.

The `hunterAbility` trait selects an existing profile through `getHunterAbility(species)`; the creature name is not a special runtime branch. Its warning uses its own species text. The shared burst retains a 1.1-second windup, 1.3-second active interval at 42 m/s, 2.8-second recovery and 18–28 seconds between windup starts while pursuing. Its regular 24 m/s pursuit exceeds the characters' 12 m/s cruise but remains below both ordinary sprint speeds. The burst is a short threat with a warning, directional commitment and recovery, not constant pursuit at 42 m/s.

The existing ordinary-hunter contact path uses 48 damage for animals over 20 m; the profile's active multiplier makes that 67.2 during a burst. The existing 2.2-second individual contact cooldown and 1.5-second player invulnerability remain. One hit cannot kill a full-health character. Both characters at 20–25 m remain unable to swallow this hunter, including during Frenzy; they can use sprint, terrain and their existing active abilities to escape.

| Region   | First independent anchor | Second independent anchor |
| -------- | ------------------------ | ------------------------- |
| Hawaii   | `[-32, -360, -610]`      | `[45, -600, -985]`        |
| Atlantis | `[-22, -370, -665]`      | `[15, -580, -974]`        |

Anchors use world coordinates `[x, y, z]`. Full-map collider checks accept all four original points with a 15.4 m turning clearance, without a fallback shift. Each pair is more than 250 m apart and has more than a full body length of seabed clearance. The shared habitat and territory helpers prevent deep-water replenishment in the nursery. Atlantis continues to use its existing continuous creature collision solver; Hawaii keeps its shared reef avoidance.

Hawaii is now 25 ordinary species / 287 individuals: the original 24 / 285 plus two Ichthyotitans. Atlantis is 18 / 392: its original 17 / 390 plus two. The combined guide has 32 ordinary species. Old species retain their sizes, nutrition, growth, population and feeding layers. Atlantis still has 168 immediately edible nursery animals and the existing city-school profiles. The new hunter is additional food only after the strict 28 m threshold; a full 86-point meal supplies about 66.2 seconds at the 30 m maximum deep-water drain, before the hunger cap. Existing healing-first allocation and the 30 m growth cap still apply.

## Sprint and verification boundaries

The current `characterMovement()` values already give Orca 41.6 m/s and Giant Squid 32 m/s for ordinary sprint: `41.6 / 32 = 1.3`. Source inspection confirms `main.js` directly uses this returned sprint value, with no extra passive multiplier. Squid's 72 m/s Ink Jet remains a separate 1.5-second active ability, not its regular sprint.

Focused Node coverage checks all four lord kinds, both characters, 25/27.5/30 m lengths, Frenzy, all relevant phases, rejected contacts, repeated contact, hunger grants and once-only loot. Non-integer lord health also clears on hit three. The Atlantis encounter fixture additionally performs three independent contacts against each real Kraken mesh for both characters. Ecology checks use the two complete maps' terrain and collision data; a future-species trait test verifies that hunter routing needs no species-name branch.

The conservative event-route tests retain their previous 75-second fight reserve, now described as three attacks, and assume a 60-second interval for a rare Ichthyotitan meal. That interval is an explicit model input, not an encounter measurement; it does not improve the old optimal reference route. Node geometry and numerical routes are not evidence of natural full-round play.

## Independent native-browser ecology and model audit

The September 30 candidate was independently checked in headed native Chrome against the existing development server. Real menu controls selected Hawaii and Atlantis and started both playable characters. The game used its ordinary animation-frame loop, hunter rules, feeding and respawn paths; the harness did not call those rules directly or advance their clocks. The clean runtime run passed 26 focused assertions with no page errors. Evidence is in `.local/global_ocean_review/giant_audit_browser.mjs`, `giant_audit_report.json` and `giant_audit_log.txt`.

At each map's initial menu load, both Ichthyotitans used the correct new model at their exact original anchors, with legal 15.4 m turning clearance and the expected full populations of 287 and 392. The four map/character combinations then checked the following actual behavior:

- A 20 m player triggered ordinary pursuit at the original deep habitat; the hunter moved toward the player without becoming edible.
- A 25 m player triggered windup, active burst and recovery. Observed active physical peaks were 40.81–40.87 m/s, below the 42 m/s profile target because the existing direction smoothing applies. The native hunter cooldown and phase remained untouched.
- Actual 28 m mouth contact rejected consumption. Actual 29 m contact produced exactly one 86-point meal and one increment to the eaten count. The live mesh shrank and converged to the character's anatomical feeding mouth through the ordinary feeding animation. The fixture had taken 48 damage at the preceding rejected contact; its meal healed those 48 points first, with 2.887855… mass growth from the remaining allocation.
- The same consumed individual returned through the unmodified 28-second countdown, within 2 m of its original deep anchor, with legal collision clearance, its correct model and two total giants still present. Measured game-time delays from settlement to the observed return were 28.0583 s (Hawaii/Orca), 28.0317 s (Hawaii/Squid), 28.0750 s (Atlantis/Orca) and 28.0049 s (Atlantis/Squid). No second meal settled during the respawn wait.

These are controlled runtime checks. Development references set player length and viewpoints and prepared hunger at 10 once for the meal. After the 20 m original-habitat pursuit sample, the same giant was positioned in collider-legal open water and player viewpoints followed a 50 m circle to isolate the 25 m ability from nearby lords. Health, hunter state, collision rules, feeding rules, physics and clocks were not altered. This proves the actual paths and eligibility; it does not measure a natural player's discovery rate or a full expedition's pacing. One earlier harness attempt incorrectly nested its read-only audio event observer across resets and double-counted observations; preserving the original callable fixed the observer, and the complete fresh run above passed without changing game rules.

Native keyboard input also verified movement over several seconds in open water. Holding Space produced terminal control speeds of 41.599512 m/s for Orca and 31.999904 m/s for Squid, consistent with the intended 1.3 ratio; actual displacement measurements agreed. Separately, native J activated Squid's temporary Ink Jet above 71.9 m/s and it expired after its ordinary 1.5-second interval. It was excluded from the ordinary-sprint comparison.

The independent visual review used the released v0.6.10 Ancient Giant quality bar and the accepted shared Ancient Giant builder as its reference. Actual English and Chinese guide views showed the 28 m length, 86 nutrition, 24 m/s pursuit, adapted depth and reconstruction qualification. Native guide drag controls exposed side, front and back views, and a 390×667 screenshot checked preview fit. In both oceans, normal follow-camera screenshots and 70 m side, 22 m close head, front, back and top inspection views showed the same model with the unchanged ocean lights, fog and materials. The paused inspection captures use the actual WebGL canvas so the HTML pause panel cannot conceal the model; only the viewpoint was staged.

The long narrow snout, fitted tooth rows and eyes, four attached flippers, dorsal/ventral coloring, narrowing body and vertical lower-lobed tail give the species a distinct ichthyosaur silhouette. The checked views show no obvious detached seams, cracks or self-intersections. Five rendered guide frames and 305 native animation samples over 5.06 seconds show continuous jaw, flipper and lateral tail motion without visible detachment. The live model contains 12 meshes / 9,080 triangles per individual, with finite vertex data in the inspected poses. This cost is a measurement, not a physical-device performance verdict. Visual evidence is recorded in `giant_audit_visuals.mjs`, `giant_audit_visual_report.json`, `giant_audit_guide_*.png`, and `giant_audit_{hawaii,atlantis}_*.png` under the same ignored review directory.

No model, animation or collision defect requiring a source change was found in this focused audit. Natural route discovery, repeated full expeditions, subjective speaker sound and real-phone performance remain separate checks. Lord victory acceptance is recorded by the integration owner; the checks above do not claim to cover a full lord fight.
