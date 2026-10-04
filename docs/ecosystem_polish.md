# Ecosystem polish candidate

Status: uncommitted development candidate on `feature/ecosystem-polish`, based on released v0.10.0 / `78bcfed`. No commit, merge or formal publication is authorized for this work. Runtime evidence is kept in ignored `.local/ecosystem_review/`.

## Scope and visual review

The shared factory inventory contains 130 creature models: 103 ordinary kinds, 13 lord kinds, three birds, four playable characters and seven new regional rares. The two human kinds use the existing separate human factory. Individual bilingual backgrounds cover all 132 living kinds. Ships, hazards and reward orbs retain their existing non-creature Guide entries.

The initial atlas inspected all 123 pre-existing shared creature kinds. The accepted terrestrial fish, Amazon anatomy, Penglai guardians and previous lord redraws are retained rather than replaced indiscriminately. The weakest original Europa forms receive a focused refinement: all sixteen retain their independent silhouettes and articulated structures while receiving better body shading; fifteen gain smoother or thicker geometry, and seven gain fitted sensory organs, head shields, jaw connections or internal volume. Crystalline forms deliberately retain faceted shells. This is not a claim that every accepted model was rebuilt.

New rares use seven distinct bodies: a broad-winged manta, spiral-shell nautilus, tall sailfin, segmented prawn, elongated arowana, six-wing alien and cloud-winged carp. Their eyes, appendage roots and shell/head interfaces are fitted to the actual geometry. Axial motion, mantle/wing strokes and articulated limbs remain individual; no per-frame geometry reconstruction is added. The atlas and multiple-angle posed captures complement finite-vertex and deformation tests; they do not replace natural player visual acceptance.

## Amazon swimming

Both ordinary-creature and lord encounter paths now use dorsal-up yaw/pitch orientation for aquatic reptiles instead of the shortest rotation between two arbitrary directions. Pitch is limited to 0.65 radians for these NPC models; player steering and capture rules are unchanged.

Anaconda, Titanoboa and Yacumama use continuous lateral body waves with successive joint angles derived from tangent differences. The head stays attached and the body no longer accumulates excessive coiling through repeated local rotations. Crocodilians use a rigid trunk and seven tail joints: the propagating side wave starts behind the hip, with armor/crests deformed by the same skeleton. Fast swimming folds the limbs back; slow swimming permits small hind-limb sculling. A seven-second deformation test verifies a stationary trunk and moving tail for all five crocodilian kinds. Fossil and colossal fantasy forms borrow this locomotion pattern; it is not a claim of an observed extinct-animal gait.

See [reference provenance](ecosystem_sources.md) for biological sources. This remains a real-time procedural animation approximation, not a fluid-dynamics simulation.

## Rare search and capture

| Destination | Exclusive rare          | Guide search clue                                           |
| ----------- | ----------------------- | ----------------------------------------------------------- |
| Hawaii      | Gilded Manta            | Secluded outer-reef shelves away from the starting shallows |
| Atlantis    | Pearl Nautilus          | Stone ledges and colonnades around the outer city           |
| Bermuda     | Crimson Sailfin         | Remote storm-sea wreckage fields                            |
| Mariana     | Blue-lantern Prawn      | Secluded walls above the first seal                         |
| Amazon      | Jade Arowana            | Root-covered backwaters in the western branch               |
| Europa      | Six-wing Crystal Seraph | Brine arches and deeper crystal hollows                     |
| Penglai     | Gilded Cloud Carp       | Cloud-veiled mountain shoulders above peach groves          |

Each region has one rare per expedition, separate from ordinary food-density profiles. Each new expedition chooses among three secluded regional search areas and adds local position variation. The shared ecological sampler checks real floor, water layer and solids; it may adjust a candidate within that habitat. The actual selected single home is retained for movement. Map preparation/caching cannot duplicate the individual. A rare does not migrate toward the player or respawn after capture.

Clues describe possible areas, not one predictable coordinate. The resident patrols a 90-unit habitat, detects a player within 45 units, and retains escape intent for 2.5 active seconds after separation. Patrol/escape speeds are 22/27 world units per second, against ordinary player cruise 12 and baseline sprint 32 (Orca sprint remains 41.6). Smooth lateral and modest vertical evasion require anticipation, without teleportation, invulnerability or unbounded acceleration. Terrain and existing navigation constraints still apply. Intercepting a turn can shorten a chase; this is intentional. Existing companions and ranged abilities can assist under their normal rules.

A gold hollow-diamond marker identifies a visible rare. It accepts depth occlusion, is not a through-wall beacon and does not reveal the whole map. The Guide adds a dedicated regional-rare category with habitat, capture advice, original lore and the exact blessing. A future gray collection-unlock system is deferred; all current entries remain viewable.

### Rare and Guide follow-up

Rares now carry a soft amber halo and four small moving gold glints, alongside the gently pulsing hollow diamond. Six depth-tested sprites use three shared textures and three independent materials per cached individual; normal alpha blending replaces any additive white core. No additional lights, post-processing pass or animation loop is introduced. Visibility fades smoothly between 65 and 180 world units. The existing active-game clock drives the effect; pause freezes it, and reduced-motion users receive a steady emblem and glints. Cached populations remain bounded at one rare per destination. These are decorative markers, not a change to food eligibility, collision or capture range.

Guide categories follow the selected region's full roster, including shared playable characters and rewards. Empty categories are hidden; selecting a region that lacks the active category returns to All. The global scope retains all populated categories. Searching does not make category controls appear and disappear. The original prey meal, nutrition and five-metre retaliation explanations are centralized in the expandable regional introduction instead of being appended to each predator's record. Long introductions retain paragraph breaks and scroll within existing desktop/touch layouts; the regional introduction itself has a bounded scrolling area.

All 58 original/legendary living kinds now have additional individual story paragraphs. Biological/fossil qualifications remain separate. Sword Sage's expanded original biography follows the user-provided arc: youthful travels and pride, destruction of his school by a demon host, secluded training, revenge and mastery across the Three Realms, then reflection and founding of the Skybearer Sword Sect on Penglai's central mountain. His four directional guardians and sword Skybearer belong to this original game story. Player-facing Lumen Stalker copy no longer cites a film; development provenance remains in the existing internal source notes.

Penglai's display names share one registry between Guide and native battle warnings: Dragon Through the Clouds, White Tiger Windstep, Vermilion Skyfire, Abyss-Sealing Shell Ward, Myriad Blades Converge and Skyborne Sword Rush. Ability IDs, timings, range, damage, ward protection, growth and population remain unchanged. Both languages are synchronized, including the individual guardian attack descriptions. Source ownership and effect teardown remain governed by the cached-world lifecycle, rather than disposing shared textures on each capture.

Follow-up verification: the full 830-unit suite and 29 shared-browser checks pass; thirteen focused tests also cover the final text changes. Native review checks 28 region/language/viewport combinations, 116 extended-background details, fallback from an absent category, stable tabs during empty search and the global scope. Three real rendered regions (Hawaii, Europa, Penglai) cover animated glints, 14–40-unit viewing distances, pause, far fade and shared-texture/independent-opacity ownership. Additional native checks exercise real vertical touch gestures through the model preview in both languages and all six Penglai technique names emitted by actual windup transitions. Horizontal dragging still rotates the specimen; vertical panning now reaches the full biography and attack advice. Evidence is in `guide_shimmer_report.json`, `guide_shimmer_followup.json`, `guide_final_unit.log` and `shared_browser_shimmer.log` under the ignored review directory. The refreshed restricted build passes twenty native desktop/touch flows, fourteen regional Guide checks and nine exact served artifact hashes on each local/public host; all 260 runtime fingerprints match, private development paths are denied and no runtime errors are observed. Final compiled receipts are `preview/compiled_shimmer_local_report.json` and `preview/compiled_shimmer_public_report.json`. Phone viewports and CDP touch gestures do not replace physical-device visual and thermal acceptance.

## Blessing and resource limits

A confirmed registered-rare meal raises health, stamina and hunger limits from 100 to 150 and fills all three. It counts as one meal but grants no mass/growth. The blessing lasts for the current expedition only; a new player/round restores the default 100 caps. The rare retires permanently for the round.

Normal contact, companion feeding and confirmed torpedo kills use the same settlement. `vitalLimit(player)` also governs ordinary nutrition/healing, supplies, Flow refill, passive stamina and valid lord-bite hunger. Existing fixed skill sacrifices, starvation damage, growth percentages and combat thresholds remain unchanged. HUD bars normalize to the current limit and show values such as `150/150`; the narrowest phone layout stacks label and value to avoid breaking a two-character label. Pause/loading/terminal behavior remains shared with ordinary gameplay.

## Introductions

Every living Guide record has an individual Chinese and English background linked by actual factory kind. Natural history, fossil reconstruction, traditional legend/adaptation and original lore have distinct headings. Observational enlargement and fictional combat rules are kept separate from biological claims. Saltwater Crocodile is explicitly an introduced game interpretation, not an Amazon native. Kun is linked to the Zhuangzi transformation into Peng; Sword Sage and new rare blessings are original game lore. Europa life remains hypothetical fiction. Fossil-derived creatures have qualified reconstruction text.

The native Guide check selects all 132 living entries in both languages (264 rendered detail checks), including the separate human previews. Static dictionaries alone are not used as evidence of completed DOM translation.

## Verification and limits

- 827 unit tests pass, including random habitat isolation, one-time blessings, common nutrition/recovery paths, speed/dodge interception, finite posed rare geometry and crocodilian trunk/tail deformation.
- Native development checks verify one exclusive rare in every region, all three candidate search areas against actual regional terrain/solids, ordinary cruise separation, real input-driven sprint/contact capture, pause, new-round cap reset and four HUD sizes (320×667, 390×844, 844×390, 1440×900).
- Ordinary entity totals remain the preceding baseline plus exactly one: Hawaii 523, Atlantis 569, Bermuda 475, Mariana 474, Amazon 412, Europa 370, Penglai 442. No existing population or individual food/battle value was reduced.
- Model atlases, multiple-angle motion captures, real populated views and browser/resource measurements are recorded under `.local/ecosystem_review/`. The 29 shared-browser regression checks pass with no runtime errors. Native controlled torpedo and companion contacts also grant the same one-time blessing. Twenty-eight serial map switches plateau after warm-up in geometry and texture counts. Native Amazon lord checks cover both rootjaw and Yacumama, retaining dorsal-up orientation through engagement. Six bilingual touch HUD states at 320×667, 390×844 and 667×390 keep labels and values readable. Formatting/build pass. The final restricted build passes twenty native compiled desktop/touch cases per local/public host, all seven rare Guide entries in both languages and nine exact artifact hashes per host. Private source/development probes are denied; no runtime errors are observed. The 49-test focused encounter suite covers the final lord-orientation change. These are candidate checks, not formal publication; Pages remains unchanged.

A controlled pursuit is not a complete natural hunt. Physical-phone performance/thermal behavior, long natural rounds, discovery difficulty and the final artistic judgment remain player acceptance limits. Baseline/candidate measurements must use the same region, camera, seed, quality, device and sample procedure; a refresh-capped FPS reading alone cannot establish unchanged GPU cost.

## Populated performance comparison

A serial baseline → candidate → baseline comparison uses released `78bcfed`, the same seeded Europa scene `[90,-180,-260]`, a 25 m Orca, 1440×900 at DPR 1, headed Chrome on an Apple M2 Pro / macOS 26.6.2 and 120 sampled frames after warm-up in each quality mode. High baseline samples are 60.43/60.77 FPS, p95 18.4/18.8 ms; the candidate is 60.72 FPS, p95 18.5 ms. Sampled main-loop CPU varies within 3.87–4.71 ms per frame. This shows no desktop frame-rate regression in this short scene, not a general performance improvement.

High visible triangles rise from 498,798 to 612,938 (+22.9%), with draw calls 265→272. Smooth candidate draws 526,040 triangles against two baseline samples of 423,288/409,544; moving populations make Smooth counts less directly comparable. Near-scene art refinement has a real GPU workload cost despite the approximately 60 FPS display cap. No population reduction is used to offset it. The atlas reports geometry/draw structure separately and warmed map-switch checks track GPU resource counts. Physical-phone thermals and long sessions remain unmeasured.

## Maintenance and rollback

Keep rare registry, actual spawning, shared reward settlement, both-language Guide copy, introductions and tests synchronized. Revert the candidate as a coherent change if it is rejected; do not leave 150 values with 100-based recovery or a Guide-only rare. The release checkpoint remains untouched. Restricted preview refreshes preserve a prior build and exact source/asset hashes; they are not formal publication.
