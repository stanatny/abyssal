# Mariana Trench production brief

Current October8 refinement: [layered production brief](mariana_layer_brief.md) and [review](mariana_layer_revision.md) supersede the historical branch/population/scenery descriptions below. Current AI-agent ownership, the single combined branch and final user acceptance control this task.

Status: independent development on `feature/mariana`, based on the reviewed Bermuda candidate `2104223`. The October 1 user authorization now permits a checkpoint commit and push to `origin/feature/mariana`. Main integration and formal Pages publication are separate from this branch checkpoint. Codex owns art, gameplay, sound and integrated review.

## Current October 2 refinement

The authorized, uncommitted `feature/deep-exploration` candidate supersedes the earlier rectangular-terrace and surface-Hydra presentation. See [the focused contract](deep_exploration_brief.md) and [verification](deep_exploration_revision.md). No new commit or publication is authorized.

## Experience and scale

A compact vertical expedition, not a longer horizontal coast: a 420 × 760 world-unit footprint, with a 2,780-unit depth limit (11,120 displayed meters). Existing destinations retain their 740-unit depth limit. The shallow Pacific shelf leads into folded basalt walls, illuminated biological wayfinding, broad switchback passages and four guardian thresholds. Each layer has one clear descent and short optional loops; retreat remains possible after opening a threshold.

The trench is an authored fantasy environment inspired by Mariana geology. It is not a geographic reconstruction. Large prehistoric predators and supernatural guardians at extreme depth are explicitly fantasy ecology. Real small deep-sea species retain biological size.

## Progression contract

- Safe shelf: spawn `[0,-18,75]`, all registered characters start at 15 m; small residents remain for atmosphere, not adult sustenance. No predators enter the nursery. Other destinations still start at 3 m.
- Upper trench: shelf to 650 world meters, 11–13 m edible ancient animals begin along the early descent, followed by 16–20 m prey. The current shared regional roster has 333 animals across 22 ordinary kinds; shared size, nutrition, growth and normal respawn timers remain unchanged.
- First threshold: Hydra patrols the first deep canyon at `[-20,-525,-390]`, with its 98 m territory outside the nursery. From 25 m, defeat it with three flank bites to open the original western seal `[-65,-650,-350]`. All current upper-trench food remains accessible before this first seal. Radar initially targets Hydra's territory and shows ascent/descent to the guardian, not to the locked deep opening.
- Second threshold: Kraken at `[0,-900,-420]` opens an eastern passage `[65,-1000,-420]`. The additional terrace reuses the reviewed gate artwork/collision contract; it does not remove a guardian or alter meal values.
- Third threshold: Gran Maja above the western opening `[-65,-1375,-420]`.
- Fourth threshold: Leviathan above the eastern opening `[65,-2150,-350]`.
- Final refuge: accessible bottom chamber around `[0,-2735,-430]`, with an original procedural SpongeBob/pineapple-house Easter egg.

The shared 25 m lord eligibility, three separated flank bites, hit nutrition and 30-minute clock remain unchanged. Mariana victory additionally requires all four distinct thresholds and arrival at the final refuge; reaching 30 m after the first guardian must not end the dive prematurely. This is a regional completion requirement, not a change to other maps. Defeated gate guardians stay defeated for that expedition, and opening a seal persists until restart. Pressure seals are visible, collidable and represented in the guide/HUD; no invisible progression wall.

## Terrain, routes and rendering

Lowest-ground sampler owns nursery shelf and trench bottom; separate matching solids own intermediate terraces and rock passages. Each terrace has a nominal 170 × 190 irregular throat, with opened adult routes verified in both directions for all registered characters. Broad central chambers support retreat, feeding and flank attacks. The bottom refuge is warm and readable; other layers transition from teal daylight to blue photophores and dim violet geology. Decorative organisms provide local emission; a bounded pool of three nearby lamps provides actual illumination. No new animation loop, audio context or unbounded particle source.

Start with populated shelf + first terrace in the actual runtime, then extend the same geometry/contact contract downward. Inspect normal follow-camera, vertical entry/return, lateral rock routes and close-range materials. Keep shared regional fauna movement data-driven through per-profile world bounds and anchored layers.

## Ecology and music

Regional exclusives: Moorish idol, lanternfish, barreleye, black dragonfish, Mariana snailfish and goblin shark. Shared reef food and mid/large predators fill continuous growth bands; deep large-animal populations are fantasy adaptations. Tiny deep residents are observation detail, not adequate adult nutrition. Every tier receives larger food and repeatable respawn anchors.

Original regional score: suspended glass harmonics, low slow water-pressure tones, sparse descending motifs and a separate urgent pursuit clock. Guardian combat adds a deeper rhythmic layer. Depth affects arrangement, not another hunger multiplier. Existing feeding/impact sounds remain accepted shared assets.

## Acceptance

Verify regional bounds/default isolation, gate locking/unlocking/reset, no duplicate defeat credit, delayed regional victory, actual spawn/respawn layers, four-region switching and resource plateau. Inspect all six models in game and the bilingual guide; check 320/390px and desktop. Trace real pursuit/lord audio and render an offline full phrase with no clipping. Exercise adult Orca/Squid passages both ways and inspect final meshes against contact geometry. Run formatting, relevant/full units, production build and focused browser tests; record evidence and limitations in `docs/mariana_verification.md`.

## Primary references

- [NOAA: Mariana Trench Marine National Monument](https://www.fisheries.noaa.gov/pacific-islands/habitat-conservation/marianas-trench-marine-national-monument): Challenger Deep is approximately 11,000 m deep.
- [NOAA: naming Mariana fish](https://www.fisheries.noaa.gov/science-blog/whats-name-choosing-names-new-fish-species-mariana-archipelago): snailfish observations at 6,198–8,145 m; no claim that ordinary fish live at the deepest refuge.
- [Monterey Bay Aquarium: barreleye](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/barreleye): transparent dome and upward-looking tubular eyes.
- [Natural History Museum: fishes of the deep sea](https://www.nhm.ac.uk/discover/the-fishes-of-the-deep-sea.html): photophores, dragonfish and deep-water body adaptations.
