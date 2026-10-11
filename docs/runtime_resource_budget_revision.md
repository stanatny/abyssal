# Runtime resource-budget revision — 2026-10-11

User-authorized implementation on `perf/runtime-resource-budget`, based on main `f2adc3194ad445d3b0984cacaac0b29e2a54d540` / v0.11.5. The current AI agent implements this alone. The user subsequently accepts the delivered candidate and authorizes commit and main publication as v0.11.6 on2026-10-11. Earlier candidate-only status is historical for this scope; see [the release record](release_v0_11_6.md).

## Changes and boundaries

- Select lord species before building their models. Preserve the registry, two-kind Hawaii selection, fixed regional guardians, duplicate Kraken instances, canonical appearance/patrol seeds and processing order. Previously instantiated disabled lords remain reusable but detach their meshes, labels, rings and ability groups from the live scene. This prevents invisible model traversal and compilation. The random UUID consumption changes with creation order; a global mocked `Math.random` seed does not guarantee identical individual spawn coordinates across versions, although population rules and habitats are unchanged.
- Keep the current population plus the most recently left map. Evict older ordinary populations only after the loading transaction commits or finishes rollback. Release instance skeleton textures, private warning rings and cloned rare-marker materials. Keep shared creature geometry/material/marker texture kits. Mythic alternate rigs are included in traversal. An evicted map rebuilds its original stock when revisited; immediate back-and-forth still reuses both populations. This trades some return preparation time for lower retained memory.
- Build Mariana through one ordered generator used by both synchronous tools and the browser's budgeted task-yield path. Split walls, marine attachment patches, shelves, ecology bands and landmarks without changing their content/order. Registered private resources are disposed when construction/progress/scheduling fails. A frozen authenticated 16-file f2adc31 dependency closure is compared on the same Node/Three runtime: complete mesh attributes/indices/instance transforms and collider data match exactly.
- Profiling exposed another loading hotspot after terrain preparation: `human_activity.reset` spent about663 ms searching safe positions for disabled units in Mariana. Skip only categories explicitly disabled by regional configuration. Enabled humans/submarines/mines retain the original placement logic; resetting into an enabled region restores them normally.

No rendering resolution, bloom, accepted models/effects, AI cadence, ecology counts, combat/rewards, audio routing or active frame cap changes. First-time lord construction moves into existing preparation/reset; no spawn-on-approach stall is introduced. Pools for shared geometry, previously seen lord kinds, Guide models and player avatars still exist; this is a bounded private-population optimization, not zero retained memory.

## Method

Actual host: Apple M6 Mac mini32GB, Chrome154.0.8037.98, Node24.21.0, Three0.180.0. CI Node22 is not a new result here. Native headed browsers run serially. Frozen baseline is exported from f2adc31, with the same node_modules, served only at127.0.0.1:5199 during comparison. Candidate uses the existing127.0.0.1:5188. Existing restricted compiled service/tunnel are preserved.

`scripts/verify_resource_budget.mjs` runs three eight-region circuits through native selectors/start/pause/Home,1440×900/DPR2 High, seed71523, with GC heap and external backing-store samples. Their sum is not total process RAM or VRAM; renderer geometry/texture counts are counts, not bytes. Cold local readiness is separate from network-cold transfer. `scripts/verify_runtime_performance.mjs` separately measures live populated CPU/GPU frames; narrow viewport is emulation, not a physical phone.

The initial staged-only trial retained approximately1-second tasks; that failed performance hypothesis led to the human-placement profile and final fix. Preserved records distinguish lazy-only, cache-only, staged-only and final measurements; none are silently relabeled.

## Verification and delivery

Fresh records are in ignored `.local/runtime_resource_budget_20261011/`. On this host, cold Hawaii post-GC heap plus backing store changes from238.1 MB to145.4 MB (39% lower). After touring all maps and returning to Hawaii, the audit baseline is703.6 MB versus559.6 MB in the final candidate (20% lower). This warm baseline is the preceding three-circuit audit; fresh cold baselines and the final serial resource comparisons are separately retained. GPU texture counts at that stop are969 versus462; do not translate that count into VRAM bytes.

Mariana first switch changes from2475 ms /1028 ms longest task in the fresh baseline to1608 ms /223 ms in the candidate. Its second/third candidate switches are1947/1575 ms with201/166 ms longest tasks. Geometry construction remains about0.7 seconds of aggregate work, split across65 real task yields in the focused profile; the largest measured indivisible construction unit is27.8 ms. Shader/first-frame work still causes longer tasks. The candidate does not promise an8 ms upper bound for all loading work.

The bounded cache introduces a measurable revisit tradeoff: after an eight-map tour, populations must rebuild, while shared geometry/materials are reused. The second/third warm circuits retain identical backing storage for matching regions, with small JS-heap variation and some newly exposed texture resources. A separate12-switch lifecycle fixture has exact warmed population/geometry/texture plateaus. These finite runs do not prove the absence of every long-session leak. Physical-phone/M4 FPS, sustained heat, battery and thermal throttling remain unmeasured. The validated changes target startup, switching and retained memory; they do not establish a sustained High-quality GPU improvement.

## Active-frame comparison

One serial baseline → candidate → baseline run uses the unchanged populated protocol (180 frames per quality/scene). Values are milliseconds per frame; CPU is inclusive sampled `frame`, GPU is the complete render timer. This limited sample is not a sustained-device benchmark.

| Scene                   | CPU baseline 1 / candidate / baseline 2 | GPU baseline 1 / candidate / baseline 2 |
| ----------------------- | --------------------------------------: | --------------------------------------: |
| hawaii_phone High       |                      4.37 / 3.87 / 4.53 |                      4.89 / 4.65 / 4.84 |
| hawaii_phone Smooth     |                      3.21 / 2.64 / 2.77 |                      1.56 / 1.48 / 1.48 |
| atlantis_desktop High   |                      4.92 / 3.39 / 4.78 |                      8.64 / 9.40 / 8.51 |
| atlantis_desktop Smooth |                      4.31 / 2.96 / 3.70 |                      3.34 / 3.24 / 3.28 |
| mariana_desktop High    |                      2.11 / 1.97 / 2.09 |                    9.94 / 10.61 / 10.12 |
| mariana_desktop Smooth  |                      2.29 / 1.90 / 3.23 |                      2.59 / 2.72 / 2.70 |

The candidate reduces Atlantis CPU time in this paired run and removes approximately1,400–1,600 disabled-scene objects. GPU time does not improve consistently and some High samples are higher; the renderer/effects pipeline is unchanged. Frame p95 remains about17.3–18.6 ms on this60 Hz host. Hawaii fauna/culling differs because lazy creation changes global UUID/random consumption; do not treat its draws as pixel-identical. No sustained heat, physical-phone or M4 claim follows from these samples.

A second serial candidate sample gives CPU/GPU (ms): hawaii_phone High 4.34/4.87; hawaii_phone Smooth 3.37/1.43; atlantis_desktop High 4.08/8.49; atlantis_desktop Smooth 3.37/3.20; mariana_desktop High 3.06/9.76; mariana_desktop Smooth 2.67/2.66. This repetition reinforces the limited claim: CPU improvement is scene-dependent; no consistent GPU/thermal improvement is established.

## Regression records

The original general-browser headless pilot timed out waiting12 seconds for Kraken recovery; its runtime snapshot and screenshot are preserved as `general_browser_pilot_failure.*`. No phase/health assertion was removed. The native headed rerun passes all29 checks. The fixed Kraken contact/sonar fixtures now explicitly prepare that kind, instead of relying on all16 models being constructed before selection.

The existing lifecycle script passes pause/time/input, resize, High/Smooth change, resume, Home/Guide,12 warm switches and graphics-context restoration. `verify_resource_transactions.mjs` additionally passes a real Mariana scheduler rejection, a post-swap shader-compile rejection restoring the exact previous root/population, native replay after rollback and eventual private bone-texture disposal after successful eviction.

Operations remain under `.local/mini_preview_20261007/`: `python3 .local/mini_preview_20261007/manage.py status`, `rebuild` for same-address compiled refresh, or identity-checked `stop tunnel awake preview dev` only when the user requests stopping those services. Rebuild archives prior runtime and publishes only `index.html`/`assets`. The task-owned baseline server on5199 is stopped after measurements; its identity and stop receipt remain in the candidate evidence directory. Existing DEV5188/preview7188/awake/tunnel identities remain unchanged. This candidate is for review on the existing trial URL; native compiled/artifact/privacy/refresh receipts are saved separately in that directory.

Fresh full unit verification passes1,175 tests;29 headed general browser checks, the lifecycle and transaction fixtures, and24 final native map samples pass. Formatting/build and final compiled delivery are recorded in the evidence directory and summarized by `completion.json`. At candidate delivery, no CI run or formal publication was performed. The subsequently authorized v0.11.6 release has separate verification and deployment receipts.
