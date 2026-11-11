# Black sea nettle revision — 2026-11-11

The player requests a visibly larger jellyfish in Hawaii and suitable additional
seas. Add **Black Sea Nettle / 黑色海荨麻水母**, _Chrysaora achlyos_, as a separate
ordinary species with its own Hugging Face mesh and shared Ocean Guide specimen.
Keep the preceding jelly, flying-fish, terrain-contact and scenery candidate.
This work remains uncommitted and unpushed; published main remains v0.11.27.

## Anatomy, scale and provenance

The [Monterey Bay Aquarium account](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/black-sea-nettle)
and [Aquarium of the Pacific account](https://www.aquariumofpacific.org/onlinelearningcenter/species/black_sea_nettle)
describe a large jellyfish recorded along the North American Pacific coast.
Bell diameter and hanging arm length are different measurements. The species can
have oral arms around 6 m long; that is a natural-history reference, not the size
of this game's mesh. All five regional placements below are explicitly game
ecology adaptations, not claims of native Hawaiian, Atlantic or Mediterranean
distribution.

An original concept image supplies one TRELLIS.2 generation and export through
Hugging Face, seed 761112 and 1024 px input. The recorded generation used
**32.44 seconds of included ZeroGPU allowance**, with zero over-quota usage and
no paid credit use or account changes. The safe receipt and raw source are kept
under `.local/black_sea_nettle_20261111/`; model revision
`af44b45f2e35a493886929c6d786e563ec68364d` records the MIT model license.

Front, side, back and top color/clay inspection found six generated oral columns
on the unseen side. The converter removes the two surplus inferred columns
below the bell, including the fragmented components of one column. It retains
**four source-mesh frilled oral arms** and the source marginal filaments. This is
a recorded cleanup of the generated surface, not a stretched moon jelly or a
set of replacement procedural appendages. The repair requires the exact raw
source SHA-256; raw exports, removed-region records and retained centerlines are
preserved. A closest-source UV rebake retains the source colors.

Uniform normalization sets the bell diameter to **1 m**. Rest-pose total height
is **2.263 m**, including the additional hanging anatomy; the mesh is not stretched
to the species' maximum reported arm length. Bell size remains the ordinary
food/capture size. Flexible arms do not enlarge bite reach or damage volumes.
The species has base nutrition 14, growth 0.025 and swim speed 0.4 game m/s. It
does not actively attack the player, and this addition introduces no poison or
contact-damage mechanic. Hawaii's existing 0.4 m moon jellies remain distinct.

The runtime asset has 9,912 triangles, 14,799 UV-split vertices, one 1024 px WebP
texture and one 26-bone skinned mesh. Packed mesh and texture sizes are 440,844
and 299,840 bytes respectively, down from an approximately 99,000-triangle raw
export. Instances share immutable geometry, material and texture, with private
skeletons. Bell contractions and staggered arm sway use the existing animation
phase callback; there is no additional animation loop or per-frame mesh creation.
The final material follow-up retains 0.92 opacity and writes depth to prevent
rear surfaces from stacking into misleading colors in the Guide. The material comparison captures (`material_original.png`, `material_depth.png`
and `material_opaque.png`) isolate that issue. Final native and performance
rechecks use the corrected depth-writing material.

## Regional homes and retained inventory

| Region   | New nettles | Previous ordinary stock | New ordinary stock |
| -------- | ----------: | ----------------------: | -----------------: |
| Hawaii   |          10 |                     555 |                565 |
| Atlantis |           6 |                     561 |                567 |
| Bermuda  |           6 |                     469 |                475 |
| Mariana  |           6 |                     458 |                464 |
| Odyssey  |           6 |                     323 |                329 |

These are upper open-water residents, including Mariana's upper ocean, rather
than animals placed on the deep trench bottom. Each has an independent home and
an 8 m resident range, with homes distributed between the departure layer and
outer shallow water. Amazon's river, Europa's alien ice ocean and Penglai's
mountain/aether setting receive no new nettles. Their existing stock remains
352, 409 and 393 respectively for Europa, Amazon and Penglai.

`registry_diff.json` compares every prior species row in all eight regions with
the saved immediate baseline: **all old rows match exactly**. The new species is
appended after existing rows to retain their seeded generation prefix. Hawaii
keeps all 36 small moon jellies and 30 flying fish from the preceding candidate;
none are replaced by the ten new nettles. The ordinary-species registry now has 127 kinds; the complete Guide has 193
entries including its other categories. Ordinary
stock totals exclude each region's separate rare creature; native live totals
therefore read 566, 568, 476, 465 and 330 in the table's region order.

The species retains world-up posture through `upright: true` and uses ordinary
resident movement with 4.5 m ground clearance. It does not opt into a new
movement-aligned body solver. Shared ecology supplies per-region homes and
world bounds; shared movement and replacement retain those homes after feeding.
No map-name or species-name branch is added to generic movement or respawn.

All 34 homes are legal against the final rendered terrain and static colliders.
The denser habitat audit samples a conservative envelope hanging 3.6 m below its
root, with a 0.7 m lateral allowance, across each complete 8 m resident sphere.
Its grid is 1 m horizontally and 0.8 m vertically, using the existing runtime's
floor and minimum-depth clamps. It finds no blocked sample; the smallest sampled
pendant-to-floor gap is 0.571 m in Atlantis. This samples a larger hanging
envelope than the actual mesh, but remains a sampled static-world check, not a
guarantee against every moving boat or future movement trajectory.

## Runtime, Guide and lifecycle evidence

Evidence is retained under the ignored
`.local/black_sea_nettle_20261111/` directory:

- `asset_handoff.md`, `asset_tests.log` and `runtime_asset_audit.json` record
  three dedicated asset tests and a separate 361-phase, 36-second vertex scan.
  Checks cover finite skinning, UV seams, four attached arm roots, immutable
  shared positions, independent skeletons, repeat-phase freeze, full/half scale
  and idempotent private disposal. The scan's largest horizontal radius is
  0.621 m and its lowest posed vertex is 2.221 m below the root.
- `habitat_tests_final.log` records six ecology tests covering registry shape,
  immutable independent regional configuration, unsupported-region rejection,
  initial homes, home-preserving replacement and conservative resident-space
  clearance. `habitat_final_summary.json` combines the final habitat and exact
  old-registry comparison. The earlier invalid juvenile fixture and corrected
  final run remain separately recorded rather than discarded.
- `native.json` records ordinary starts in Hawaii, Bermuda, Atlantis, Mariana
  and Odyssey, followed by a return to Hawaii. Each instantiates the expected
  count with the correct ready asset, upright bell and distinct private
  skeletons, while retaining shared geometry/material/texture across regions.
  At the sampled ordinary follow-camera views, 8/4/5/4/4 new nettles are within
  the frame. These are short encounter snapshots, not whole-round discovery
  coverage. The native flow also checks a frozen game clock during pause and
  returns to the menu between expeditions.
- The same native run opens the actual English and Chinese Guide entries,
  verifies the world specimen's shared mesh and texture, and checks the 390 px
  Chinese layout without horizontal overflow. Both languages distinguish the
  1 m bell from hanging arms and real range from game adaptation. The displayed
  24–200 m depth band corresponds to 6–50 world-depth units.
- The feeding check is a separate staged-player fixture, not an ordinary
  discovery run. An actual new resident is consumed through shared feeding,
  increases the meal count once and enters its normal 28-second hidden interval.
  Home-preserving replenishment is additionally covered by the ecology tests;
  the short native feeding capture does not claim to observe a complete
  consumed-to-respawn cycle.

## Measured scene cost

The existing same-machine nursery receipts compare the preceding candidate with
this addition at `[0,-18,55]`, using seed 71523, live simulation, both quality
presets, a warm-up and 120 measured frames per preset. They report Apple M6
through Chrome's ANGLE Metal renderer. The controlled player position is restored
each frame for a matched view; this is a scene-cost sample, not natural player
navigation.

| Preset | Mean frame time, before → after | p95, before → after | Draws, before → after | Triangles, before → after |
| ------ | ------------------------------- | ------------------- | --------------------- | ------------------------- |
| High   | 16.50 → 16.50 ms                | 18.5 → 18.6 ms      | 446 → 459             | 2,366,054 → 2,473,966     |
| Smooth | 16.53 → 16.52 ms                | 18.6 → 18.6 ms      | 360 → 369             | 2,090,471 → 2,169,967     |

Both samples remain near this display's 60 FPS limit. Draw calls and triangle
cost increase: +13/+107,912 in High and +9/+79,496 in Smooth. Small frame-time
differences do not establish a speedup. The baseline receipt is
`.local/hawaii_encounter_followup_20261111/perf_after/report.json`; this
revision's final-material receipt is `perf_final/report.json`. The matched
viewport is 1280 × 800. This recheck ran after other browsers and the earlier
full-suite process had finished. The earlier interim `perf_after/report.json`
is retained separately and is not the source of the final table.
No physical-phone FPS, thermal behavior or long-session resource plateau is
inferred from this desktop sample or narrow Guide layout.

## Integration completion

Final checks completed against the depth-writing material:

- `full_tests_final.log`: all **2,231 tests pass**. The first full run exposed
  four obsolete catalog/count/isolation expectations after adding the shared
  natural species; these were corrected specifically for the new species,
  retaining the old regional isolation checks. Its failure log is preserved.
- `asset_tests_final_material.log` passes all three asset tests;
  `inventory_tests_final.log` passes 42 focused catalog/regional tests.
- `check_final.log` passes the repository-wide Prettier check, and
  `git diff --check` passes. The generated JSON is formatted without changing
  decoded geometry; its formatted file size is 440,844 bytes.
- `native_final_material.log` / `native.json` repeat the five native map starts,
  Hawaii return, feeding fixture, pause and bilingual/narrow Guide checks with
  the corrected material, without browser errors.
- `preview_build.log` records a successful production build followed by the
  existing preview-only bounded cold loader. The candidate contains **976
  artifacts**, with main module `assets/index-DxSY_VDs.js`. The manager retains
  previous hashed resources and an immutable runtime archive for open clients.
- `public.json` passes fresh no-cache Chinese 1280 px and English 390 px touch
  browser contexts: initialization, native start, input, pause/resume/home and
  new Guide membership, no development hook, request failure or browser error.
  Initialization took 50.2 and 49.6 seconds through the tunnel; these are actual
  cold loads, not an instant-loading claim. `public_assets.json` verifies the
  exact public SHA-256 of 20 representative shell, engine, model and texture
  files against the reviewed build. A separate final appearance readiness check
  records the Guide texture after its normal loading indicator clears.
- `media_world.json` records an ordinary fresh Hawaii start with native slow
  swimming, followed by the normal Guide and drag rotation. No animal, pose,
  clock or camera is overridden. `black_sea_nettle_demo.mp4` edits those two
  real captures into 10.8 seconds; `video_probe.json` verifies H.264 and the
  actual cover/late encoded frames were visually inspected. The earlier ascent
  take is retained separately and is not the delivery clip.

The reviewed trial is
[the existing preview](https://store-fun-moon-own.trycloudflare.com/?preview=black-nettle-20261111).
Final identity verification compares all 2,188 recorded source inputs and all
976 currently served build artifacts. Only this completion documentation may
change after the build; runtime code, assets and tests retain the reviewed bytes.
The task-only development server is closed after verification. The authorized
compiled preview, tunnel and older-client resources remain available.

This preview is distinct from main/Pages release. No commit, push, version bump
or personal Skill change is included. Physical-phone rendering/performance,
whole-round encounter frequency and long-session resource plateaus remain
unmeasured.
