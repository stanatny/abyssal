# Odyssey preparation and geometry memory — 2026-10-28

Accepted local checkpoint: the user approves the delivered result and requests
committing the current Odyssey work on 2026-10-28. All 2,046 delivered inputs
and 929 build artifacts match before acceptance notes and formatting. All 23
normalized JSON files retain identical parsed values, and a fresh build matches
all 929 delivered artifact hashes exactly. The earlier no-commit status below is historical; no push or release is included.

The user authorizes the proposed performance follow-up after the final scenery
review. This change reduces synchronous scene-construction stalls and duplicate
geometry storage. It preserves the delivered art, terrain, ecology, combat,
camera and physical obstacles. No commit, push or official release is included.

## Findings and changes

Native Chrome profiling found two indivisible construction blocks: the Troy
masonry shell took about 84 ms and the fitted deep-water scenery about 60 ms.
Although the surrounding loader already yielded between steps, it could not
yield inside either block.

- Troy masonry now welds each independent brick before merging and yields
  between its 21 rows. Temporary brick geometries are disposed on completion or
  cancellation. The merged result is byte-equivalent to the previous geometry.
- Deep-water scenery yields between each fitted mesh and collision batch.
  Near/far variants share fitted positions and immutable UV/color data while
  retaining separate normals and indices. Each placement and map owns its
  fitted position buffer; no global geometry cache is introduced.
- Both builders retain synchronous wrappers for existing callers and tests.
  The existing ocean construction transaction owns incomplete resources.

## Measured comparison

Evidence: `.local/odyssey_performance_20261028/`. The baseline is the exact
delivered dirty workspace recorded by `baseline_fingerprints.json`, not Git
HEAD (which predates the Odyssey redraw). Four original source files were
snapshotted and verified before preparing import-adjusted local comparison
modules. They are not part of the production bundle.

Native Chrome 155 on this Mac compared original and candidate constructors in
alternating order, with the real 8 ms task-yield scheduler and the application
home mounted. Each version ran once cold and three times warm:

| Measure                                                         |   Original |  Candidate |
| --------------------------------------------------------------- | ---------: | ---------: |
| Warm median longest indivisible construction step               |    80.8 ms |    11.7 ms |
| Warm median component CPU construction                          |   246.6 ms |   239.4 ms |
| Observed tasks over 50 ms per component run, all four runs      |          2 |          0 |
| Unique CPU geometry-buffer bytes, synchronous ocean constructor | 30,477,744 | 27,415,540 |

The buffer saving is 3,062,204 bytes (about 2.92 MiB). It includes the measured
constructor's base and far geometry, but excludes asynchronously loaded coastal
HF assets and renderer allocations. It is not a measured VRAM saving.

The main benefit is shorter uninterrupted loading work; total construction CPU
falls only modestly. These measurements do not include network transfer, shader
compilation or complete first-entry latency. They do not demonstrate higher
steady-play FPS, lower phone temperature or a percentage improvement on phones.
Short active-game CPU profiles were also inspected; this round does not change
AI, collisions or simulation scheduling without a demonstrated safe benefit.

## Correctness and lifecycle evidence

- `equivalence.json`: all 321 mesh/far records have identical attribute and
  index bytes, instance data and transforms; all 4,531 colliders match exactly
  in value and order. Geometry count remains 94 in this constructor audit.
- Fresh full suite: **2,074/2,074** pass. Targeted preparation/scenery suites:
  **21/21** pass. New regressions cover six cancellation boundaries, successful
  retry, near/far sharing and independent map instances.
- `live/report.json`: native actual travel with a staged 30 m player succeeds
  in both directions without getting stuck. Pause freezes time and scenery.
  Four explicit near/far drawing transitions produce no WebGL error.
- Four Hawaii/Odyssey round trips detach the prior scenery and dispose every
  watched local geometry, material and texture exactly once (26 per cycle).
  Each reload restores eight scenery placements, 4,531 colliders and 324
  ordinary/rare entity slots. Global renderer counts also include asynchronously
  prepared creatures; those counts alone are not a proof of leakage or its absence.
- `texture_failure/report.json`: a blocked memorial color texture uses the
  existing vertex-color fallback; unblocking and an online retry restore its
  texture. No fallback or loading policy is changed.
- `performance/report.json`: six short populated-game samples cover crag,
  basin and memorial views in High and Smooth at 1280 × 800 / DPR 1. Frame
  intervals have 16.6–16.7 ms medians and 18.4–19.1 ms p95 on this Apple M6.
  These are candidate smoke checks with a 60 Hz cap and staged observer
  cameras, not before/after FPS evidence. Current screenshots retain the
  textured scenery; no material or asset bytes changed.

The native developer fixtures stage initial player positions and use
invulnerability for reproducible traversal. They do not pin NPCs each frame.
No physical mobile device or power measurement is part of this review.

## Delivery

The restricted same-origin preview is updated after the candidate checks:
`https://saver-recorded-digit-could.trycloudflare.com/?preview=odyssey-performance-20261028`.
The fresh build entry is `index-CBC06Kau.js`; all 929 dist/runtime files
(291,998,541 bytes) match. Five changed artifacts are freshly fetched and
hash-verified from localhost and the public origin. The other 924 public files
retain the prior dated verification; this is not a new full-public download.
Eleven source/private paths remain denied on each origin. Existing dev,
restricted preview, awake and tunnel process identities are preserved.

`public/report.json` records the new entry with no developer hooks or runtime
errors. Native production UI passes region selection, start, steering, sprint,
both quality modes, pause/resume and return-home in English at 1280 px and
Chinese at 390 px. The narrow case is desktop layout emulation, not a phone.

Official main/Pages remain v0.11.21; all Odyssey changes are still uncommitted
and unpushed. `source_preservation.json` compares against all 2,044 prior
delivered inputs, including uncommitted assets: only the four scoped runtime
modules and three entry documents changed, with one review and one regression
test added. No other prior input was changed or removed.
