# Atlantis construction optimization

Included in the user-authorized v0.7.2 main-branch release, based on reviewed `ee1fe16`. The user first approved a temporary optimized preview, then explicitly requested a commit and push to `main`. Earlier local-only statuses are superseded. See [release verification](verification.md) for fresh checks and deployment acceptance; the measurements below compare the frozen pre-optimization source with the reviewed cache candidate.

## Change and ownership

Furniture placement repeatedly tested the same immutable host boxes. The construction-local cache in `atlantis_exploration_furniture.js` now reuses their twelve world-space edges. It covers both incoming static architecture and previously placed furniture in the same batch. The cache is cleared by dropping its reference immediately after placement; it is not global, returned, or retained by the runtime interfaces.

Each candidate still separately computes its original bounds and its floor-clearance-adjusted edges. Host ordering, every exact cast, containment checks, rotation, floor contact, non-box shapes, and dropped/placed decisions remain intact. No ecology, food, AI cadence, collision shape, rendering quality, asset, bilingual player copy, or Guide behavior changed. No new loading system, engine, geometry LOD, or resource pool was introduced.

The diagnostic baseline built the actual city: eight furniture batches made 208,242 host-edge calls for 7,125 unique hosts, including 207,918 calls to already placed furniture. Only 324 calls concerned incoming hosts. Thus caching incoming architecture alone would miss almost all repeated work. All geometry fields stayed unchanged during each constructor. The final cache avoids the 201,117 repeated host-edge constructions, about 96.6%; this is an operation reduction, not a claim of 96.6% faster loading.

## Measured effect

Serial headed Chrome 154 / ANGLE Metal on Apple M2 Pro, 1440x900, device and renderer DPR 1, high quality, seed 71523, motion enabled. The frozen `ee1fe16` source and the candidate used native region choices, full populations (Hawaii 287 / Atlantis 392), and the same build type: local Vite development previews. No performance browser, heavy test, or CPU profiler ran concurrently.

Three baseline-before -> candidate -> baseline-after blocks used separate contexts for each leg. Two Atlantis/Hawaii round trips warmed each context; entries three and four supplied the comparison. Twelve baseline and six candidate warm Atlantis samples:

| Metric                            | Baseline median | Candidate median |       Reduction |
| --------------------------------- | --------------: | ---------------: | --------------: |
| Choice to shader-precompile start |       1677.4 ms |        1519.3 ms |  158.2 ms /9.4% |
| Choice to loading completion      |       2066.6 ms |        1885.4 ms |  181.2 ms /8.8% |
| Longest map-switch task           |       1424.0 ms |        1268.5 ms | 155.5 ms /10.9% |

Preparation includes environment/surface/population work and loading paint opportunities, not only the furniture factory. The longest-task metric covers the whole choice-to-loading-completion interval, including compilation/presentation tasks; it is not restricted to preparation. Shader-precompile wait remained about 166 ms; the optimization does not remove shader or presentation cost. Each paired block improved in the same direction, although the second candidate block contained a slower sample. Warm total ranges overlap (baseline 1994-2101 ms; candidate 1844-2054 ms). These results support a modest local loading improvement, not a guaranteed device-independent percentage or higher steady-state FPS. The earlier read-only review found approximately 60 FPS on this Mac, so frame rendering, grass batches and accepted artwork are preserved.

## Verification

- Complete City equivalence: all 20,964 collider values and their order; all city/furniture placement statistics; every mesh attribute/index/instance matrix, recorded material parameters and world transform across 1,100 scene nodes match the frozen baseline hashes exactly. Both scenes dispose idempotently.
- 38 focused furniture, residential and Poseidon temple unit checks pass. A new regression reuses one host object between constructions, changing it from an enclosed table obstruction to a supporting deck: the rebuilt scene reads its current geometry and never mutates the host.
- The existing region-loading browser method was adapted in ignored evidence with the already accepted 287/392 population assertions. English 1440x900 and Chinese 390x844 both pass loading paint/inert/start protection, focus/language restoration, one live environment, native Start/Home/re-entry, and injected compilation-failure rollback. No page errors occurred. The tracked script's old population assertions were not represented as current checks in that optimization run. Release preparation subsequently updates the assertions to 287/392 and runs the tracked script successfully in both scenarios; see the release record.
- Lifecycle smoke: after three warm round trips, five measured round trips retain one environment root and detach the old root every time. Geometry/texture counts stay at Atlantis 405/281 and Hawaii 411/284. Programs rise by two late in each region; forced-GC retained heaps change from 88.8 to 89.5 MB and 63.2 to 63.7 MB, respectively. This short smoke does not establish long-session leak freedom, and its timing is not pooled into the serial performance comparison.
- `npm run check`, targeted `HANDOFF.md` formatting, `git diff --check`, and `npm run build` pass. The existing large-bundle warning remains; this change does not restructure bundles.
- Source-level independent review confirms constructor-local ownership, immutable hosts, read-only cast inputs, unchanged candidate geometry and host order, and release after the last placement query.

Evidence is retained under ignored `.local/engine_optimization_implementation/`: `baseline_manifest.json`, `cache_probe.json`, `equivalence.json`, `loading_comparison.json`, `comparison_summary.json`, `focused_units.log`, `loading_regression/`, `lifecycle_clean_refs.json`, `check.log`, and `build.log`.

The subsequent trial-preview check compares all eight served production artifacts with the current `dist` hashes, locally and via the public HTTPS address. Two successive temporary marker updates are visible at the same address, and private source/document paths remain rejected. The previous hashed assets are retained and the entry HTML is replaced atomically. Evidence is under `preview/public_artifacts.json`. Public native browser checks also pass in English at 1440x900 and Chinese touch emulation at 390x667: both regions, character selection, Start, skill/sprint, Pause and Home. No page or console errors occurred, and the production debug API is absent. Evidence is under `preview/native/`. These checks do not measure production loading speed or establish access from the user's external device.

## Acceptance, rollback and limits

The isolated change is retained because all three paired comparisons improve, preparation/long-task ranges separate, and complete layout/contact/visual data remain identical. The experimental 10% hotspot target is guidance, not a universal threshold; end-to-end improvement is approximately 9% in this sample.

Reverting the constructor cache and its regression restores the baseline algorithm; there is no save/config migration or asset rollback. Do not turn this into a module-wide cache or skip exact collisions. A future change that moves hosts during construction must revise the static-host contract before reusing cached coordinates.

Physical phones, Windows, production/network loading gains, dense pursuit/lord peaks and complete 30-minute rounds are untested. This constructor-only optimization makes no new claims about those scenarios. Object counts are not GPU-memory bytes; short lifecycle checks cannot prove long-session leak freedom.
