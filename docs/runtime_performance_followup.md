# Active runtime and touch graphics review — 2026-10-10

The user accepts independently stacking meal recovery at local checkpoint `db8dad1`, then reports severe phone stutter and sustained M4 Mac heat. The current AI agent develops and verifies this follow-up alone on `art/mariana-irregular-terrain`. On 2026-10-10, the user authorizes unified main publication as [v0.11.4](release_v0_11_4.md), together with the accepted terrain, rare and recovery checkpoints. The candidate measurements below retain their original method and limits; publication does not establish physical-device thermal performance.

## Diagnosis and selected changes

The current Mariana pit contains **41,750 immutable collision entries**. Its existing grid partitions XZ, so vertically stacked walls and ledges share horizontal buckets. The precise solver must retain these shapes, but its broad phase need not inspect unrelated depths. Headed CPU profiles identify `query`/`resolveCreatureMotion` as a substantial steady-play cost.

The grid now has bounded XYZ buckets for finite-height queries. Wide slabs use separate height buckets; structures that also exceed the height-cell limit remain conservative direct candidates. Queries without usable height, including vertical-projection preparation, retain the original XZ path. Extremely large query volumes retain the full bounds scan. Internal generation stamps avoid repeated bounds tests across cells; each caller still receives its own sorted result in original collider order, including duplicate entries. Shape inflation, exact collision, multi-sphere contact, sweep order, floor projection, dynamic barriers/ships and all movement/AI frequencies are unchanged. The index remains owned by its immutable collider array through the existing weak caches.

Fresh coarse-pointer devices now select the existing **Smooth** setting (`Quality · Low` in English). Desktop default remains High. An explicit selection is saved in the current browser as `abyssal_quality` and wins over the device default after refresh, including an explicit High choice on a phone. Invalid/unavailable storage falls back safely and never blocks manual switching. Smooth retains its established 0.8 render ratio, disabled shadows/bloom, bounded particles and existing distance visibility. High retains the original resolution, effects and accepted art. This is a visible, reversible setting choice; no hidden active-frame cap or new ecology reduction is introduced.

| Method                                  | Existing state / decision                          | Evidence and boundary                                                              |
| --------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Spatial collision partitioning          | Refine existing XZ broad phase with height         | Measured Mariana query hotspot; retain exact ordered results and motion            |
| Batching/shared kits                    | Already implemented in regional art and prototypes | No new batching or anatomy change in this pass                                     |
| DPR/postprocess selection               | Reuse existing Smooth on fresh touch devices       | Lower pixel/effect cost; explicit High remains available and remembered            |
| Reduced bloom resolution                | Trial rejected                                     | GPU benefit was inconsistent across scenes; original pipeline restored             |
| Static-screen demand rendering          | Already implemented                                | Preserve pause/results, resize/settings and context restoration                    |
| AI frequency reduction / active FPS cap | Not selected                                       | Preserve ecology, pursuit, contacts and active gameplay timing                     |
| New LOD / asset compression             | Insufficient evidence for this pass                | Geometry and download costs remain; do not conflate fewer polygons with lower heat |

## Measurement and verification

Evidence lives in ignored `.local/performance_revision_20261010/`. Its baseline is a frozen accepted `db8dad1` source closure with the same installed dependencies and a separate loopback sampling server. The current development, restricted compiled origin and tunnel retain their identities. Baseline and candidate browsers run serially.

`scripts/verify_runtime_performance.mjs` uses headed Chrome, seed71523 and live populated ecology, normal follow camera and native slow swimming. It stages a controlled player pose/length once; it does not freeze NPCs, replace scene art, add lights or reset positions during measurement. Each case warms1.5 seconds and samples180 frames in High/Smooth. Phone viewport390×844/DPR3 is browser emulation; desktop1440×900/DPR2 is also explicit. CDP sampling adds CPU overhead. WebGL disjoint timer queries measure GPU rendering when available; idle time, FPS, GPU time and CPU time are separate metrics. Actual test host is an Apple M6 Mac mini,32GB, Chrome154, Node24/Three.js0.180.0. These results do not measure the user's M4 or physical phone.

The initial six-case baseline, isolated volume-only trial, improved height-bucket trial and rejected bloom trial remain preserved. The bloom experiment is absent from the final source. Final paired samples and native delivery receipts are recorded separately.

Three serial baseline/candidate rounds produce these medians in milliseconds per frame:

| Fixture                      | Main-loop CPU before → candidate | Query CPU before → candidate | GPU before → candidate |
| ---------------------------- | -------------------------------- | ---------------------------- | ---------------------- |
| Mariana High                 | 4.17 → 2.59                      | 2.54 → 0.52                  | 9.06 → 9.14            |
| Mariana Smooth               | 4.33 → 2.78                      | 2.67 → 0.65                  | 2.77 → 2.54            |
| Atlantis High                | 3.48 → 3.17                      | 1.33 → 0.76                  | 8.52 → 8.39            |
| Atlantis Smooth              | 3.15 → 3.36                      | 1.13 → 0.99                  | 3.42 → 3.39            |
| Hawaii phone viewport High   | 3.49 → 3.96                      | 0.42 → 0.50                  | 5.18 → 4.95            |
| Hawaii phone viewport Smooth | 3.40 → 3.05                      | 0.57 → 0.67                  | 1.52 → 1.53            |

Mariana's measured main-loop CPU falls about38% in High and36% in Smooth; query CPU falls about80%/76%. Both retain the selected view's80/52 draws and895,400/620,298 triangles and unchanged scene/population inventories. Normal frame intervals remain near the60Hz refresh ceiling, with p95 about18.2–18.5ms; no normal-device FPS improvement is asserted. Hawaii's High CPU varies3.27–4.39ms in the candidate and shows no established benefit; Atlantis has a smaller mixed result. These rows do not support a uniform all-map speedup or a GPU improvement from the collision change.

The existing quality contrast is much larger than the rejected bloom tweak: current Hawaii's phone viewport measures about4.95ms GPU on High versus1.53ms on Smooth, on this M6 host. Smooth's0.8 ratio submits about28% of High's1.5-ratio main-image pixels and avoids its shadows/bloom. This supports selecting the existing preset, not a claim of70% faster physical-phone gameplay.

A separate Mariana stress comparison applies Chrome's4× CPU throttling only after warmup. Mean frame interval25.12/26.00ms before becomes16.61/16.61ms after in High/Smooth; p95 falls29.0/29.8 to20.3/20.9ms. CPU throttling is an artificial diagnostic, not an emulated M4/phone, a GPU slowdown or a thermal measurement. These samples remain separate from the ordinary three-round table.

Two new grid regressions cover2,400 varied deep sweeps against an independent full bounds oracle, tall oversized walls, exact height boundaries and duplicate order. In the actual Mariana collision data,6,000 candidate queries exactly equal the frozen accepted grid;500 full creature-motion results also match. A five-repeat isolated query batch takes344–349ms before and65–67ms after; this is a query benchmark, not a frame/FPS or heat claim. The full1,066-unit suite passes.

The fresh general browser run exposed obsolete instant-food-healing and fixed post-lord-bite health assertions left in `verify_game.mjs`. Their failed receipts are preserved. The check now allows a valid zero-elapsed meal frame, asserts zero instant healing, one finite2/s layer, gradual actual active-time recovery and retained growth, and subtracts precisely the0.5/s passive recovery after a lord bite while requiring zero food layers. These match the accepted `db8dad1` rules. A separate headless flight fixture exceeded its existing12-second landing timeout; the successful fresh run uses headed Chrome and retains the original landing predicate/timeout. No gameplay rule was changed to pass these tests.

Final validation passes the29-check general browser suite and seven lifecycle checks: four regional pause/time/audio/input/quality/resize/Home/Guide flows, real mid-construction failure/retry,12 switches with stable warmed per-region geometry/texture/population counters, and graphics-context restoration followed by native resume. Counter stability does not establish heap/VRAM size or a long thermal session.

Restricted local and public compiled hosts each pass five no-hook quality cases (desktop English1440, Chinese390, English320, invalid preference and unavailable storage), eight native regional start/pause/resume/Home flows assigned across four roles, and four native Mechanical Shark feeding/recovery/Guide/help/pause/Home/reset/reload cases (English1440/320, Chinese390/780×360). No page errors are observed. Actual default-Smooth phone and High desktop images are inspected. The public visit is this host's HTTPS return path, not a second machine or a physical phone.

The owned frozen-baseline listener is stopped after verifying its PID/start identity, PGID, working directory and port;5288 is released. The accepted recovery runtime is archived before rebuilding the established preview origin. Existing dev/origin/tunnel/awake processes remain. Operations, source/artifact fingerprints, private-path denials and same-address refresh receipts are retained with the evidence. Trial: https://saver-recorded-digit-could.trycloudflare.com/?preview=runtime-20261010.

## Limits and rollback

Desktop refresh-capped samples cannot establish phone FPS, M4 power, battery drain, thermal throttling or long-session comfort. Rendering on High remains materially more expensive than Smooth. Physical-device natural sessions and user feedback remain necessary. No broad asset/population rewrite or unconditional reduction of the desktop's accepted art is claimed.

Rollback the new XYZ/height buckets and generation stamps in `src/static_collider_grid.js` to the accepted checkpoint to restore the old broad phase. Independently restore the initial quality and persistence changes in `src/main.js` to restore High everywhere. Neither change needs a save migration; the optional quality key can be ignored. Preserve the accepted recovery, terrain, rare and Bermuda work.
