# Atlantis performance and loading follow-up

This candidate remains on `feature/atlantis`. It is not a main-branch release. The user's follow-up covers the floating surface lighthouse, more city schools, audible pursuit music, destination-switch feedback, and runtime stutter.

## Changes

- The lighthouse now uses the final rendered island triangles for its foundation, rather than the island's nominal height. The former tower base was 4.36 world meters above its supporting terrain. Its base and six coastal buildings now overlap their support surfaces. Island face winding is corrected without changing the four silhouettes. See [surface fit](atlantis_surface_fit.md).
- City schools increase from 88 to 114 members: 80 small fish and 34 medium prey. Total ordinary stock increases from 374 to 390, with 168 juvenile-edible nursery residents retained. New small schools lie near the deep avenue and memorial route. Ten existing offshore medium animals are reassigned into existing city groups; the 90–165-depth transition band and total medium/large stock are retained. See [ecology](atlantis_city_ecology.md).
- Actual hunter pursuit now explicitly drives the audio mix, independently of the hunter's special-ability phase. Dormant and returning lords do not trigger battle music. Atlantis chase uses an independent 104 BPM pulse, immediate entry, a minimum audible pursuit layer, and exploration ducking. Accepted exploration composition and effects/voices remain unchanged. See [music](atlantis_music.md).
- Destination selection closes its picker before asynchronous preparation. A bilingual loading layer paints before construction, locks underlying controls, retains keyboard focus, and prevents starting a half-built map. Construction, population preparation and shader warm-up yield between stages. The previous environment stays available until the new frame succeeds; an injected preparation failure restores it and provides a return action. The loader is indeterminate and does not invent a completion percentage.

## Collision and spawn work

Profiling isolated two avoidable CPU costs. Ordinary predators cast world-length visibility rays even when outside their interaction range. Large NPCs touching architecture could repeatedly trigger full-city recovery scans, with one megalodon taking roughly 8–14 ms per frame in the diagnostic sample.

The static XZ grid now also rejects nonintersecting height ranges using conservative bounds for spheres, rotated boxes, capsules and rotated/inflated ellipsoids. More importantly, the exact collision solver accepts a candidate-query function. **Every sweep, slide, overlap and recovery probe queries at its actual position**, preserving original collider order and all exact contact mathematics. A recovery may leave its original cell or be projected onto a different floor without relying on the initial candidate list. Dynamic ships and people are read afresh. NPCs continue moving and respawning offscreen; simulation frequency and combat rules are unchanged.

Spawn and school-migration placement also use the static grid for dense immutable obstacle arrays. Candidate ordering and the original exact blocked-position test are preserved; random sampling, habitat limits, retry policy and food rules are unchanged. Visibility rays are skipped only when neither pursuit acquisition/maintenance, damage contact nor defensive octopus ink can use the result.

## Rendering work

Architectural pearl niches previously baked the full landmark shell mesh into each tiny recess. They now use a compact geometry template while retaining shell angular ribs, material identity and collision shapes. Full-size pearl habitats retain their original mesh. Column height subdivisions are reduced without removing their radial silhouette, capitals or scrollwork. This reduces redundant vertex work rather than hiding buildings sooner or dimming the city. See [architecture budget](atlantis_geometry_budget.md) for geometric equivalence and mesh counts.

## Verification method and limits

`verify_region_loading.mjs` covers English desktop and Chinese 390px layouts, repeated region changes, loading paint opportunities, inert controls, focus restoration, attempted start during loading, one live environment, ordinary start/Home/re-entry, and injected shader preparation failure with rollback. Its initial concurrent-browser run passed both viewports; its measured durations are not a single-browser performance baseline.

`verify_atlantis_performance.mjs` samples 120 running animation frames per quality level, records frame intervals and CPU samples, and uses a seeded world on the same Chrome/Metal GPU. It holds the player at a controlled deep-city viewpoint while ordinary AI, collisions, hunger, animation and rendering continue. Before/after runs use separate local Vite roots. This is a repeatable bottleneck comparison, not a natural full-round playtest or a physical-phone frame-rate claim. Scene construction and first shader compilation can still take time, even with visible loading feedback. Automated audio levels and scheduling checks do not replace subjective listening on the user's speakers.

## Recorded comparison on 2026-09-29

Tests ran sequentially on the hosting Mac, Chrome 154 using ANGLE Metal / Apple M2 Pro, without another verification browser running. The former 374-animal candidate at port 5192 and the current 390-animal candidate at port 5179 used the same seed, 25 m player, viewpoint, viewport and per-quality sampling procedure. Animals remained live, so poses and exact visible counts can differ. CPU values are inclusive sampled `frame()` time per measured animation frame, not GPU time.

| Browser / viewport | Version | Quality | Mean frame (ms) | Mean FPS | p95 frame (ms) | Sampled main loop (ms/frame) | Submitted triangles |
| ------------------ | ------- | ------- | --------------: | -------: | -------------: | ---------------------------: | ------------------: |
| Visible 1440×900   | Before  | High    |           19.53 |     51.2 |           25.3 |                        18.32 |           1,903,144 |
| Visible 1440×900   | Before  | Smooth  |           18.26 |     54.7 |             23 |                         15.9 |           1,434,834 |
| Visible 1440×900   | After   | High    |           16.91 |     59.1 |           25.3 |                         8.65 |           1,169,928 |
| Visible 1440×900   | After   | Smooth  |            16.8 |     59.5 |           19.8 |                         7.55 |             823,568 |
| Headless 1440×900  | Before  | High    |           82.73 |     12.1 |          149.2 |                        27.53 |           1,910,572 |
| Headless 1440×900  | Before  | Smooth  |           78.72 |     12.7 |          143.3 |                        28.84 |           1,445,368 |
| Headless 1440×900  | After   | High    |           74.42 |     13.4 |          141.7 |                        10.76 |           1,185,086 |
| Headless 1440×900  | After   | Smooth  |           73.01 |     13.7 |          141.7 |                         9.01 |             841,994 |
| Headless 390×844   | Before  | High    |           69.56 |     14.4 |          143.8 |                         29.8 |           1,305,502 |
| Headless 390×844   | Before  | Smooth  |           75.09 |     13.3 |          145.5 |                        31.04 |             942,072 |
| Headless 390×844   | After   | High    |           81.51 |     12.3 |          144.9 |                        10.75 |             821,546 |
| Headless 390×844   | After   | Smooth  |           64.22 |     15.6 |          148.9 |                         8.91 |             600,562 |

The visible-window high-quality mean improved from 51.2 to 59.1 FPS; smooth improved from 54.7 to 59.5 FPS. High-quality p95 remained approximately 25.3 ms, so this does **not** prove that every hitch is removed. Submitted triangles decreased about 39–43% at that view and visible-window sampled main-loop cost fell by roughly half.

Headless total frame rate remained noisy, including a regression in the narrow high-quality sample despite lower CPU and geometry cost. Those runs are retained, rather than reported as a smoothness acceptance result. The visible-window comparison is a separate controlled run on the same Mac, not an explanation proven for the headless behavior. No physical phone or Windows hardware was benchmarked.

Destination selection-to-ready measurements (including the script's fixed 800 ms settling delay) were 3.087→2.665 seconds in desktop headless and 2.975→2.463 seconds in the narrow headless runs. These are one cold switch per fresh browser, not network speed guarantees or a construction-only timing. The separate loading verifier established visible paint opportunities and correct repeated-switch behavior, including warm returns.

Evidence is retained under `.local/performance_final/` with raw frame intervals, CPU profiles, rendered screenshots, GPU identity and errors. All six browser sessions recorded zero page errors. The baseline snapshot hashes live under `.local/performance_baseline/baseline_hashes.json`.
