# Penglai Sanctuary — rejected-candidate redraw

This record describes an earlier candidate. The current 15 m start, physical Four-Symbol ward, riding-sword anatomy, differentiated guardians and verified preview are documented in [the flight and guardian follow-up](penglai_flight_revision.md). Preserve the results below as historical evidence.

## Status and authority

The first playable Penglai candidate passed functional checks but the player rejected its scenery, anatomy and motion. Those checks are historical evidence, not artistic acceptance. This revision remains uncommitted on `feature/penglai`; no push, main integration or formal publication is authorized. Raw baseline sources and fresh evidence belong in ignored `.local/penglai_redraw/`.

## Revision contract

- A central Taoist monastery surrounded by a mountain ring and continuous peach woodland. The Four Symbols guard their traditional directions: eastern mountain/air Dragon, western grounded Tiger court, southern aerial Bird and northern submerged Tortoise pool. The temple and its grown-character approaches remain solid and navigable.
- Redraw all 18 ordinary kinds and all five guardians with different weight-bearing anatomy, fitted appendages and full motion cycles. In particular, the Sword Sage needs forward-facing human features, a sculpted crown, layered draped robes, attached sleeves and recognizable sword-command fingers. He is an original encounter, not a named historical deity.
- Cranes and other flocking flyers use explicit, body-scaled formation data and a moving group heading. Ground residents use separated individual homes instead of schools packed onto a single anchor. Preserve all 418 registered ordinary instances, food values, nursery protection and respawn.
- Ground animals derive support clearance from the finished mesh's feet instead of a generic floating offset. Full-body spawn checks reject head/tail overlaps, and ground navigation rejects collision projections onto roofs while preserving warned leaps. Ground guardian locomotion samples the actual next terrain height before obstruction queries. A warned leap must produce native attack damage and remain avoidable; proximity alone is not proof of a working attack.
- The upward-facing water surface is opaque and writes depth. Its underside has a separate material for underwater views. Actual pool contents must not remain visible from the air through an alpha-blended top sheet.
- Preserve four playable roles, the 25 m damage gate, three separated guardian hits, the four-guardian Sage lock and five-defeat ending. Keep other regions unchanged.

## Production and ownership

Static anatomy is merged only inside each rigid node and material bucket. Animated wings, limbs, tails, robe joints and expressly articulated meshes remain independent. Immutable geometry/material caches remain shared between instances. Do not infer animation correctness from finite matrices alone: inspect pose differences and actual complete cycles. The environment retains bounded construction phases, owned/disposable resources, spatially chunked instances and one shared frame loop.

The peach forest has 522 legal, collidable trees distributed across green mountain shoulders. Near chunks retain curved branches, individual petals and softly varied bloom clusters; distant chunks keep the same tree positions, branch/crown volume and color while dropping subpixel twigs/petals. The two geometry tiers share a 170-unit three-dimensional chunk threshold. This is a visual detail swap, not reduced ecosystem stock or a shorter draw distance.

## Independent runtime review

All five native guardian victories and the four-guardian Sword Sage unlock pass with fifteen separated actual mesh contacts. The original centerline contact fixture was unsuitable for the new spread wings and curved bodies; it now samples current mesh vertices and waits for both actor cooldowns. No gameplay range, threshold, collision tolerance or cooldown was weakened to make it pass.

A separate native Tiger trial records warning, leap and actual health loss; reacting to its windup with an upward sprint avoids damage. After continued simulation, six crane groups retain at least 17.25 units of pairwise spacing, all 418 animals remain present, walking residents stay at their model-derived support heights, and Black Tortoise remains submerged. These are controlled fixtures, not a natural full expedition.

The first-pass evidence and the more expensive pre-LOD forest sample are preserved. Final populated-scene costs, lifecycle and source-matched delivery evidence are recorded below. Earlier preview artifacts must not be presented as this revision.

## Populated cost and lifecycle

The final LOD experiment retains all 522 collidable trees and 418 ordinary animals. Matched short samples use the same M2 Pro / 16 GB / macOS 26.6.2, headed Chrome, 1440×900, DPR1, High, controlled 25 m player, 150 frames per view and serial browser execution. `renderCPU` measures the render call on the CPU, not GPU elapsed time. The final sky far-plane correction subsequently changes background coverage, not ecology or geometry; native rendered checks cover it separately.

| View          | Dense redraw before tree LOD: triangles | With tree LOD: triangles | Final draw calls |   FPS | Frame p95 | Render CPU mean |
| ------------- | --------------------------------------: | -----------------------: | ---------------: | ----: | --------: | --------------: |
| Lotus nursery |                               7,233,684 |                2,441,296 |            1,193 | 60.31 |   18.1 ms |         4.82 ms |
| Monastery     |                               3,815,036 |                  960,284 |              359 | 60.27 |   18.4 ms |         3.16 ms |
| Clouds        |                               3,940,196 |                  907,556 |              332 | 60.28 |   18.4 ms |         3.11 ms |

The LOD removes about 66–77% of the dense redraw's submitted triangles in these views. This is **not** a 66–77% FPS, GPU-time or heat improvement: refresh-capped desktop FPS stays near 60, and the first rejected candidate was cheaper (890,896 / 635,592 / 642,100 triangles). Better art still costs more, especially in the populated nursery. No physical-phone, thermal or natural whole-round acceptance is claimed.

Twenty-one serial switches across all seven destinations show identical geometry/texture/scene-child counts in the second and third warm cycles. Pausing yields zero repeated world renders and freezes active time. Immutable creature geometry and rigid-part batching retain independent motion. Evidence: ignored `cost_before_lod.json`, `cost_report.json`, `models.json`, native/behavior/UI reports and multiview images in `.local/penglai_redraw/`.

## Verification and delivery

803 unit checks pass, including twelve Penglai contract checks. The shared browser regression passes 29 checks. Actual native review covers all seven isolated populations, all four playable roles crossing water/air and feeding/respawning, the five-guardian completion and restart, Tiger damage/dodge, crane formation spacing, opaque top water and submerged Tortoise. All 23 models have fresh front/side/rear/cycle renders through the shared factory. The English/Chinese Guide retains the same models and updated descriptions.

The refreshed restricted candidate passes fourteen native compiled cases on each of the local and public hosts: English desktop and Chinese touch starts, skills, pause and home across all seven destinations, with the Penglai Guide and flight checks included. Both reports contain zero page/console errors. All 243 runtime source fingerprints still match the built source; all eight build artifacts match the local served directory and public responses. Private source/config probes return 404. The source remains uncommitted at base `da0adbe` on `feature/penglai`; formal six-region v0.9.0 and main are unchanged. Current process and fingerprint evidence is recorded in ignored `.local/penglai_redraw/manifest.json`.

Physical touch ergonomics, whole-expedition pacing and subjective art acceptance remain player-review limits. The public preview is a temporary review candidate, not an accepted new art benchmark or a formal release. Rebuild and repeat the affected compiled checks if runtime sources change after delivery.
