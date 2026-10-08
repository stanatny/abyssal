# v0.11.2 — Wreck Exploration and Model Refinement

The user accepted the current work and authorized committing and pushing it to main on 2026-10-08. This patch follows v0.11.1 / `f7dead5`, incorporating the accepted Guide checkpoint `60a48ee`, four-model checkpoint `b132a6f` and subsequent wreck work. No tag or GitHub Release is requested.

## Resulting behavior

Europa's abandoned research craft grows to 184.8 m with command, sampling-laboratory, living and engineering compartments separated by real bulkheads and openings. A broad central passage connects them, while a raised side service loop is traversable by smaller bodies. Its terrain-fitted supports and lateral site relocation preserve the main descent and arch routes. The craft stays unpowered and grants no new food or reward.

Bermuda's liner grows from 396 m to 600 m. Eleven differentiated room records include dining rooms, salons, passenger cabins, a boiler gallery and cargo/luggage holds. Tables, berths, lockers, boilers, gauges, pumps and pipes match their solids. The bounded support bed, routes, existing lights and three existing interior food-school homes scale with the hull; stocks, meal rewards and normal replenishment are unchanged.

The preceding model repair closes Sword Sage head/robe surfaces and improves blade-supported legs, White Tiger limbs and travel-driven gait, Coral Mermaid swimming posture and continuous Kraken tentacle deformation. The desktop Guide selector gains an inset theme-matched arrow with native keyboard access and forced-color fallback. Read [model details](mythic_model_revision.md) and [ship details](wreck_interior_revision.md).

## Evidence and limits

The accepted ship candidate passes 997 unit tests, formatting, 29 shared native-browser checks and 82 actual-input wreck checks, including 64 route cases and 64 turnaround/return probes. All four characters are tested; primary fixtures stage 32 m once, then retain natural meals that can clamp length to the game's 30 m cap. Fixed 32 m geometry sweeps are separate evidence. Three fixed-school captures and original 18 s replenishment pass. Both-language Guide, 320/390 px layouts, production-hook absence, private-path denial and nine active artifact hashes pass on the restricted candidate. The prior model checkpoint retains its independent visual, motion and lifecycle evidence.

These are bounded fixtures, not natural full-round balance, physical-phone or power/heat acceptance. Added ship geometry/colliders carry a documented cost; serial desktop samples remain around 60 FPS without establishing an optimization. Earlier contact and keyboard-guidance diagnostics are preserved rather than omitted.

## Publication and rollback

Before commit, complete fresh formatting, units, localization and production-build checks and capture the actual English home renderer. Fast-forward clean main and push normally. Follow the exact Pages Actions run and its downloaded artifact; compare all served HTML/JavaScript/CSS/audio/image bytes and inspect native formal player flows and bilingual Guide at the repository base path.

Publication receipts remain ignored under `.local/release_v0_11_2/`; [verification](verification.md) separates them from prior candidate records. Retain the preceding restricted runtime and established preview services. Ship geometry and its terrain, solids, route and anchor transforms must be reverted together if a regression appears. The preceding formal checkpoint is `f7dead5`; no data/save migration is required.
