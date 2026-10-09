# Current follow-up — 2026-10-10

Read [the active runtime review](runtime_performance_followup.md) for height-aware collision queries and touch-device graphics defaults after accepted recovery commit `db8dad1`. The earlier CPU/target-selection review below remains historical evidence; it does not establish the current phone or M4 thermal result.

---

# Runtime CPU review after v0.11.0

The user authorized another performance pass after the v0.11.0 main release. Work is based on `9122033` in `fix/runtime-performance-v0-11`. On 2026-10-05 the user accepted the candidate and authorized publishing it to `main` as v0.11.1; [the release summary](release_v0_11_1.md) supersedes the historical candidate-only status below without changing its measurements. The goal is less redundant active-frame work, without changing food, survival, AI cadence, collisions, draw distance or accepted near-view art.

## Kept changes

- Three ordinary-animal rock scans now reuse the existing weakly cached 80-unit static collider grid. Steering queries retain original rock order. The layered-school overlap check keeps its squared `1e-8` inset. Projection first proves whether any nearby sphere overlaps; if it does, the original complete ordered projection runs from the original point. This fallback is necessary because one push can enter a later rock outside the initial query. Distant rocks no longer require square roots and Vector3 writes.
- Generic target labels project and reject out-of-screen candidates before casting obstruction rays. A ray is needed only when a candidate can improve the current score. Temporary projection vectors are reused; the accepted target owns a separate scratch point. The same label and obstruction rules remain.
- Generic target selection does no work when sonar or dense ink will hide it. Inactive sonar does not request panel geometry; its markers already return immediately. Active sonar, reticle tracking, all HUD layouts and cooldown timing remain unchanged.

All eight ordinary populations remain 516 / 560 / 467 / 453 / 409 / 352 / 437 / 269. Other than the new navigation helper and main-loop wiring, no runtime configuration, model, shader, audio, survival or quest data changes.

## Existing mechanisms retained

Per-material creature merging, decorative instancing/spatial chunks, GPU vegetation sway, skinned appendages with bounded contact geometry, immutable geometry caches, independent skeleton ownership, static collision grids, visibility-gated pose updates, frozen paused/results rendering, and cooperative Atlantis construction are already implemented. This revision does not reintroduce rejected distant-city geometry or stop remote animals from moving/replenishing.

## Experiments removed

Typed visitation stamps for collision-grid deduplication and opt-in Atlantis local-matrix caching were measured separately and then removed. They did not establish a reliable extra benefit; Penglai samples showed higher query/actor costs. Raw trial source and measurements are preserved in ignored evidence. No unused static-transform helper, matrix flags, visitation buffers or alternate runtime path ships.

## Verification and measured boundaries

Evidence is ignored under `.local/runtime_performance_review/`. The frozen baseline is the exact released source. Performance browsers run serially on Apple M2 Pro / macOS / Chrome 154, headed, local Vite, 1440×900, DPR 1, seed 71523, 25 m Orca and real populated ecology, with native slow swimming and a repeatedly held test position. Initial profiles cover 120 frames; longer acceptance profiles cover 240 frames after 1.5 s warmup, separately in High and Smooth. CDP CPU sampling adds overhead; these figures are same-host comparisons, not device power readings. Baseline repetition and rejected trials remain recorded rather than deleted.

| High fixture              | Frames before / candidate        | Main-loop CPU, ms/frame | Actor CPU, ms/frame | FPS before / candidate | p95 frame interval, ms |
| ------------------------- | -------------------------------- | ----------------------- | ------------------- | ---------------------- | ---------------------- |
| Atlantis temple           | 240 / 240                        | 11.54 → 7.34            | 4.66 → 2.71         | 60.07 → 60.30          | 19.2 → 18.5            |
| Hawaii deep feeding route | 120 / 240                        | 8.24 → 5.51             | 4.16 → 1.76         | 60.38 → 60.14          | 18.7 → 18.6            |
| Penglai aerial route      | 240 / 240, two candidate repeats | 7.17 → 7.05–7.41        | 3.28 → 3.54–3.75    | 60.32 → 60.15–60.31    | 18.4 → 18.0–18.4       |

Atlantis retains exactly 275 draws / 914,244 triangles in the paired 240-frame fixtures. Its sampled main-loop CPU reduction is about 36%. Hawaii's earlier 120-frame candidate also matched the baseline's 124 draws / 311,506 triangles; the final longer sample has 109 draws / 300,074 triangles as real animals move and cull. Its 120-to-240 comparison is supporting evidence, not a perfectly time-matched rendering fixture. Repeated Hawaii baselines recorded 8.16–8.24 ms main-loop CPU. Penglai establishes neither a stable benefit nor an FPS improvement; its actor/query costs vary with live routes. Empty-rock maps bypass the new rock queries. Raw `before_*`, repeated baselines, isolated trials and final `release_*` directories retain their measured context; “release” here is only a sample label, not publication.

Measured positions are Atlantis `(0,-688,-895)`, Hawaii `(0,-250,-660)`, Europa `(0,-440,-660)` and Penglai `(0,130,-520)`. The strongest accepted comparison uses the same 240-frame Atlantis fixture. The ocean continues to advance normally, so exact wall-clock pose identity is not claimed between independent runs.

FPS remains near the display's 60 Hz ceiling. Lower measured CPU time is extra headroom, not a claim of a proportional FPS increase. Matching draw/triangle counts and rendering checks establish preserved selected-view content; no GPU, physical-phone temperature, battery or natural 15–30-minute round improvement is asserted. Loading throughput, download cost and long-session memory were not the target of this bounded pass.

The full **967-unit** suite passes, including five new sphere-navigation tests and existing exact collision contracts. The new tests compare 800 randomized three-dimensional habitats against brute-force steering, projection and overlap, and explicitly cover ordered chained pushes, squared inset, tangent/center, empty arrays and replacement ownership. A grid regression retains duplicate-entry order and independent output arrays over 2,000 queries.

Native checks retain all eight ordinary stocks and active play/pause/home flows without observed errors. Thirty-six available target frames in Hawaii, Atlantis and Mariana match the original obstruction-first brute selection. Paused position, survival time and draw counter stay fixed after the required entry paint. Atlantis's selected paused canvas and world matrices are unchanged with normal local-matrix updates enabled. The initial native pause oracle incorrectly counted its pending entry paint as idle work; the corrected check waits two queued animation frames before the idle baseline, without changing game code or weakening the movement/time assertion. Both receipts remain preserved.

The **29-check shared browser suite**, formatting and production build pass. The rebuilt restricted local/public hosts each pass **38 bilingual Guide cases**, **eight regional character play/pause/home flows** and **320/390 px** Guide views. All **nine active artifacts per host** and **301 runtime/build source fingerprints** match. Production debug hooks are absent and private/development paths are denied; a temporary safe asset proves same-address refresh, then is removed. No observed page/console errors. No player-facing value or copy changes, so both existing locales and Guide cards retain their content. The existing large-bundle warning remains; this bounded CPU change does not split download/construction work. Detailed receipts are in [verification](verification.md).

The previous restricted runtime is retained under ignored evidence, and sampling-only ports 5284/5286 are stopped after checking their PID, command and working directory. Established development, preview and tunnel services remain. Candidate: https://satisfactory-keyword-recently-cakes.trycloudflare.com/?preview=runtime-cpu-20261005. Formal Pages stays v0.11.0; this new delta is uncommitted.

## Ownership and rollback

Static sphere locations/radii must remain immutable while indexed; the existing weak grid belongs to its array and is reclaimed with it. Dynamic ships, submarines, seals and actors do not use the sphere helper. Outputs still update only caller-owned coordinates/directions. Reset and region replacement retain their original lifecycle.

Rollback only the sphere helper and its three main-loop call sites to restore full scans. The target/sonar computation ordering can be reverted independently. No save migration, population rebalance, reduced quality or engine change is involved. Existing development and restricted-preview services are retained; baseline-only sampling servers are stopped after verification.
