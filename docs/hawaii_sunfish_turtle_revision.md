# Hawaii visual audit and Sunfish/Turtle refinement

## Acceptance and local checkpoint — 2026-10-21

All current preview changes accepted — 2026-10-21: the user confirms that all
current effects have passed review and authorizes committing them together.
This includes Contact Mine, the four reef decorations, Sunfish/turtle refinements,
selected combat/lord audio and versioned loading cache. This supersedes earlier
pending and cache-only checkpoint labels for these delivered changes. Preserve
gameplay and existing services. No push or main/Pages publication is requested.
The current AI agent next audits runtime CPU/GPU costs independently.

Earlier candidate-only status below is historical. Technical receipts retain
their actual dates and scope; user acceptance is separate from device testing.

Date: 2026-10-20. Branch: `art/hawaii-lords-hf-redraw`; local checkpoint `46778a7`. The user asks for remaining Hawaii visual/interface issues and small corrections to Sunfish thickness and Green Sea Turtle/Archelon swimming. The current AI agent works independently. These changes await user review; no new commit, push, version bump or formal release is authorized. Preserve the separate reef and Contact Mine candidates.

## Audit scope and priorities

A fresh native Hawaii inventory and home/Guide/play/pause inspection cover the affected presentation. Major creatures (including people and birds), player characters, lords, submarine/torpedo, three surface ships and four seabed landmarks have redraw candidates or previous checkpoints. That does not mean every environmental element has been redrawn or individually accepted. The four reef forms and Contact Mine retain their own pending review status.

Sea grass/kelp, anemones, sea pens, ambient jelly decorations, rocks/arches and some coastal plants/furniture still use procedural models. They are lower-priority environmental details, not automatically defects. The inspected home, Guide and pause layouts show no new blocking overlap or unreachable primary action. This is a bounded review, not certification of every warning/result/input combination. The immediate priority is the three visibly affected creatures. No HUD, labels, game rules or environmental distribution are changed here.

## Reference and diagnosis

- [Monterey Bay Aquarium: Ocean sunfish](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/ocean-sunfish): the adult has a deep, laterally compressed body, dorsal/anal propulsion and a truncated rear rudder. The current HF surface was too thick across its left/right axis, especially in frontal and oblique views.
- [Wild Green Sea Turtle kinematics, Scientific Reports (2022)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9622894/): observed fore-flipper motion includes downstroke, backward sweep and recovery with changing foil orientation; hind flippers trail in the selected steady-swimming sequences. These are adult wild observations, not hatchling or freshwater-turtle paddling.
- [NOAA Green Sea Turtle B-roll](https://videos.fisheries.noaa.gov/detail/video/4084488077001/b-roll:-green-sea-turtle): downloaded the actual public clip and inspected sampled frames, including the 24–32 second swimming sequence. The near and far flippers change depth and foil angle while the shell stays stable. Reference frames remain in the ignored evidence directory; delivery videos contain only the game.
- [Natural History Museum: giant prehistoric turtles](https://www.nhm.ac.uk/discover/giant-prehistoric-turtles.html): Archelon's broad body and large flippers inform its slower visual cadence. Its motion here is an artistic reconstruction, not a claim of observed fossil behavior or direct ancestry from a living species.

## Implementation

Sunfish geometry is scaled to 66% of its previous lateral thickness. Its vertical/depth coordinates, face count, UV atlas, color texture and nominal length remain unchanged. Normals receive the matching geometry transform; both pectoral pivots use the same scale so the animated fin roots stay attached. The change is species-specific in the shared batch-seven factory.

Both turtles retain their original HF meshes, colors, six-bone skeletons and continuous root skinning. Fore-flippers now follow a closed three-dimensional path: a shorter down/back power stroke, foil rotation and a slower return. The rear flippers trail quietly; the shell and head do not flap. Archelon uses a slower cycle than Green Sea Turtle. The shared world clock already integrates effort into phase, so acceleration increases cadence continuously without multiplying the accumulated phase by a newly changed speed. Pausing does not advance the pose. Angles are fitted to these meshes rather than copied from research coordinate systems.

Gameplay lengths, populations, translation speeds, food/combat and collision contracts are unchanged. Shared species receive the same factory correction wherever they occur, including Bermuda turtles. No new HF request or quota usage, texture, mesh, bone, draw call or persistent GPU buffer is introduced.

## Fresh verification

Evidence root: `.local/hawaii_motion_refinement_20261020/`.

- `before/`, `after/` and `comparison/`: same-model views, matched-camera before/after panels and ordinary/accelerated stroke clips. Actual surface positions and normals are inspected, not only bone angles. The model viewer clips demonstrate pose; they do not claim world translation.
- `targeted.log`: 16 focused checks pass, including actual fore-tip vertical/aft travel and a distinct recovery loop, restrained trailing hind fins, rigid shell vertices, UV duplicates, acceleration/pause, unit lengths and the lateral-only Sunfish change.
- `source_regression.json`: Ray, Tuna and the accepted Octopus geometry, skinning, material properties, morph influences and 240 poses each are exactly unchanged against preserved pre-task builders.
- `full_tests.log`, `check.log`: 1,461 tests and formatting pass on the combined working tree, including the separate pending reef candidate. This is not a count for an isolated new commit.
- `world/report.json`: three rounds of Hawaii/Atlantis/Bermuda/Mariana switching; stable populations and shared assets, independent skeletons. Of 81 observed turtle skeletons, 73 are disposed and eight remain in the retained Bermuda pool; disposed bone textures are cleared. This is not an assertion that cached pools are leaks or that every context has been destroyed.
- Three 11-second real-NPC clips use a staged observer camera and an invulnerable player, with normal ecology movement and no per-frame entity pinning. Sunfish position ranges are 8.11/2.39/10.22m, Archelon 13.58/1.43/14.28m and Turtle 8.17/2.62/10.97m across X/Y/Z. Those are coordinate ranges, not path lengths. Pausing freezes all sampled bones; no page errors occurred.
- `delivery/`: encoded game comparisons and real-world clips are decoded and contact-sheet inspected before sending. The original game poses remain available in the preserved builders.

## Restricted production preview

The existing [temporary preview](https://saver-recorded-digit-could.trycloudflare.com/) now serves `index-Be8YVCrn.js`. All 70 runtime files (43,678,819 bytes) match the local build and restricted server byte for byte. Eleven source/private-path probes are rejected at each origin. Original DEV35213, restricted74197, awake74200 and tunnel35419 identities remain unchanged; the tunnel readiness probe passes. The previous runtime is archived.

Native public Chrome passes six affected-species cases: English 1440px and Chinese 390px touch emulation, Guide color readiness, start/ability/pause/Home and same-address reload. The production debug hook is absent, with no page errors or failed resources in the successful pass. The initial attempt encountered a transport-level connection close/TLS failure before app startup; preserved attempt logs and the successful retry are separate evidence. Artifact retry reused only files whose hashes had already been verified in this same round. This is not an availability guarantee.

Fresh receipts: `artifacts.json`, `public/report.json`, `public/attempt1.json`, `verify_preview*.log`, `rebuild.log`, `final_fingerprints.json`, and `source_preservation.json`.

Native desktop Chrome and narrow touch emulation do not constitute a physical-phone test or thermal/performance claim. Visual acceptance remains with the user.
