# Hawaii performance follow-up

## Scope and result

Baseline: accepted local Atlantis checkpoint `6025348` on `feature/atlantis`. This follow-up is uncommitted and does not change main or official Pages.

Hawaii had 646 static environment colliders but still scanned the entire combined list for player movement, visibility/camera rays and human-world queries. It now uses the same static broad-phase index as Atlantis, followed by the unchanged exact collision solver. Ships and human collision objects are read live on each query. The redundant combined-list cache and region-specific fallback are removed. Do not index `terrainColliders` itself: that reused array is replaced in place on region changes, whereas each ocean's immutable collider array has the correct lifetime.

The change preserves models, geometry, materials, visibility ranges, lighting, 285 ordinary animals, NPC reef navigation, survival rules and audio. Player-facing copy and the bilingual guide require no rule changes. CPU headroom improves; Hawaii already approaches the display's 60 Hz limit in most measured views, so a large mean-FPS improvement is not claimed.

## Measurement

Two sequential before/after passes on the hosting Mac, Google Chrome 154.0.8037.58, ANGLE Metal / Apple M2 Pro, visible headed window at 1440×900. No other verification browser ran during profiling. `scripts/verify_hawaii_performance.mjs` seeds randomness at 71523, starts a real Hawaii expedition, holds slow swim, warms each fixed view for 1.5 seconds and samples 120 animation frames per quality. Three positions are nursery `(0,-18,55)` at 3 m, reef `(35,-70,-150)` at 10 m and volcano `(-20,-525,-900)` at 25 m. Live creatures, audio, collisions and the main loop remain active; positions are reset each frame only to keep the camera view comparable.

The initial baseline ran against unchanged checkpoint source; the repeat used an isolated snapshot of `6025348`. The first after pass predates restoring an accidentally removed map-switch `humans.reset()` call; the final repeat, all passing regressions and the delivered source include it. That call is not reached in the sampled Hawaii run. The initial concurrent unit run caught an unfinished canvas fixture in the new test file; the completed fixture and final full suite pass. Both intermediate results are retained instead of being counted as final verification.

Frame CPU is inclusive sampled `frame()` time divided by animation-frame count; ray CPU is inclusive `castSegment()` time. These are sampled CPU estimates, not GPU times or precision timers. Both runs retain all frame samples, screenshots, draw counts and CPU profiles under `.local/hawaii_performance/`.

| Pass    | Scene   | Quality | Mean FPS before → after | p95 frame ms before → after | Main loop CPU ms before → after | Ray CPU ms before → after |
| ------- | ------- | ------- | ----------------------: | --------------------------: | ------------------------------: | ------------------------: |
| Initial | nursery | High    |             60.3 → 60.3 |                 24.9 → 19.4 |                    12.02 → 9.07 |               2.55 → 0.07 |
| Initial | nursery | Smooth  |             60.2 → 56.1 |                 24.2 → 25.6 |                     8.13 → 7.23 |               2.33 → 0.36 |
| Initial | reef    | High    |             60.6 → 60.5 |                 20.4 → 18.9 |                     5.55 → 5.14 |               1.18 → 0.01 |
| Initial | reef    | Smooth  |             60.3 → 59.9 |                 20.7 → 19.3 |                     5.61 → 4.61 |               0.80 → 0.09 |
| Initial | volcano | High    |             60.6 → 60.5 |                 18.9 → 20.1 |                     4.10 → 3.48 |               1.04 → 0.00 |
| Initial | volcano | Smooth  |             55.3 → 60.5 |                 19.7 → 18.9 |                     5.74 → 2.99 |               0.56 → 0.07 |
| Repeat  | nursery | High    |             60.2 → 60.3 |                 24.1 → 20.0 |                    11.53 → 9.67 |               2.46 → 0.28 |
| Repeat  | nursery | Smooth  |             60.3 → 60.3 |                 24.7 → 19.8 |                     7.85 → 6.76 |               2.63 → 0.33 |
| Repeat  | reef    | High    |             60.3 → 60.5 |                 21.0 → 18.7 |                     6.28 → 4.95 |               0.96 → 0.02 |
| Repeat  | reef    | Smooth  |             60.4 → 60.3 |                 20.4 → 18.9 |                     4.94 → 4.21 |               1.19 → 0.07 |
| Repeat  | volcano | High    |             60.8 → 60.1 |                 19.1 → 18.8 |                     4.13 → 3.54 |               0.54 → 0.02 |
| Repeat  | volcano | Smooth  |             58.5 → 60.6 |                 19.0 → 19.2 |                     4.51 → 3.48 |               0.74 → 0.00 |

Nursery high-quality main-loop CPU falls from 11.5–12.0 to 9.1–9.7 ms/frame, with ray cost around 2.5 to 0.1–0.3 ms/frame. Nursery high-quality p95 falls from 24–25 to 19–20 ms. The first smooth nursery pass regresses to 56.1 FPS; the repeat returns to 60.3. Deep high-quality p95 also varies. Short samples and live populations make this evidence of reduced collision work, not proof that all stutter is eliminated.

Nursery before/after draws and triangles match exactly within each quality (high: 1070 draws / 1,316,572 triangles; smooth: 932 / 1,154,346). Live poses elsewhere cause modest count variation; geometry was not changed. The normal-distance before/after nursery screenshots were inspected: reef, arch, vegetation, ships and school visibility are retained. Phone-sized functional checks do not establish physical-phone performance; no Windows, low-end phone, extended travel or full-round benchmark was performed.

To reproduce on the desired source snapshot, start its dev server and run:

```bash
ABYSSAL_DEV_URL=http://127.0.0.1:5179/ ABYSSAL_PERF_HEADED=1 ABYSSAL_PERF_DIRECTORY=.local/hawaii_performance/review node scripts/verify_hawaii_performance.mjs
```

## Verification

- `npm test`: 408/408 passed, including six real-Hawaii indexed/full-solver equivalence cases. These cover 15 terrain features, rotated reefs, arches, temple, volcanoes, 3/10/25/30 m fast diagonal motion, growth overlap recovery, floor/boundary projection, and the three real ships at moving transforms. Results, collider identities and contact ordering match exactly.
- `npm run test:browser` with the feature dev URL: 29 checks passed, zero browser errors; real keyboard movement, feeding, breach, pursuit, boss contact, death/restart and narrow pause remain functional.
- `verify_region_loading.mjs`: desktop English and 390px Chinese repeated switches pass, with 285/390 populations, one environment, focus/input restoration, failure rollback and re-entry. Both runs record zero page errors.
- Four performance sessions record zero page errors. Formatting/build and production-preview receipts are recorded in the current verification entry.

Secondary costs observed in the audit include CPU marine particles, static transform traversal and idle surface droplet updates. They were not changed without a demonstrated need; this pass removes measured collision waste without reducing the accepted scene quality.
