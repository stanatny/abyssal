# Responsive preparation and idle rendering — review candidate

**Release follow-up:** The user authorized inclusion in v0.8.0 on October 1. The scope/status below records the earlier review candidate; current release verification and deployment status are in [verification](verification.md).

Uncommitted work on `feature/mariana`, based on the pushed `3292104` checkpoint. The user authorized implementation after the platform review, using the already selected secondary model without delegation. No engine migration, new commit/push, main integration or release is authorized. Formal Pages remains v0.7.2. Personal Skill/knowledge publication remains deferred until a later accepted workflow.

## Implemented changes

- Static pause and result screens draw on entry and invalidation, then retain the last ocean frame. Resize, quality changes and WebGL context restoration request a fresh draw. Active play, the animated home/launch sequence and the independent animated Guide remain intact. A hidden document does not submit ocean frames. No default frame cap or simulation-time change was introduced.
- The serial animal loop reuses its temporary mouth, steering, schooling offset, previous habitat position and orientation objects. Persistent attack headings still own their clones; effects copy the supplied direction immediately. AI order, remote simulation, food, normal respawn and exact movement/contact rules are preserved. This is a modest CPU/allocation reduction, not a demonstrated GC cure.
- Atlantis terrain rows, paving, ordinary lots, instance preparation, lower-gallery sites, residential access checks and furniture placement now expose cooperative construction steps. Browser loading drains those steps with an 8 ms work budget and a genuine task yield (`scheduler.yield` with a timer fallback). Existing synchronous factories drain the **same** iterator for tools and tests. There is no duplicate layout algorithm or worker/streaming claim.
- The existing regional loading transaction, focus/input lock, bilingual status labels, shader preparation, first frame and old-world disposal remain in use. Atlantis advances the existing progress bar during construction. Partial factories own their children and private resources; closing an incomplete iterator cleans its scene before the existing rollback restores the old region.

The budget is checked **between** safe work units. Unsplit art-kit generation, some independent modules, GPU upload/driver preparation and other regions' environment/surface constructors can still produce longer tasks. This first iteration primarily addresses Atlantis's large warm construction block; it is not a claim that every task or every map fits an 8 ms deadline. Total preparation can remain similar or become slightly longer in exchange for responsiveness.

## Far-view experiment: rejected and removed

Two prototype versions used the original architectural plan: fewer column segments and tiny ornaments, identical major roofs/walls/towers and foundations, full near assets, 20-unit switching hysteresis and far district outlines. The first instanced outline raised draw-call cost. Merging static outlines by district/material reduced triangles and calls and showed more distant streets.

Repeated headed asynchronous GPU samples did not demonstrate a consistent improvement beyond noise. Even a diagnostic comparison with every full-detail street district forced visible showed mixed GPU results. The extra outline geometry also raised retained resource counts. The conservative decision is to remove **all** prototype source, cached far kits, default switches and prototype-only tests from the delivered candidate. The original city art and 350/275-unit chunk visibility rules are unchanged. No narrower visibility, inferior near art or unused LOD branch remains.

This does not reject LOD generally. A later experiment should first isolate whether the target device is vertex/geometry bound, measure retained bytes as well as draw calls, and compare a single expensive scenery class or prebuilt district representation. Do not replace the accepted city with primitive shells or confuse distance culling with loading savings.

## Evidence and verification

Frozen source and raw evidence belong in ignored `.local/performance_implementation/`. The archived baseline is the exact `3292104` tree. Both construction paths retain the baseline 20,964 city colliders, complete obstacle data, furniture/layout statistics, and byte-for-byte original near geometry/instance data in a node snapshot. Fixed integrity hashes are asserted in `tests/atlantis_preparation.test.js`. Scheduler/ownership tests cover order, budgets, return values and injected failures.

`verify_performance_lifecycle.mjs` checks native four-region pause/resize/quality/resume/home/Guide interactions, a genuine mid-construction task rejection and retry, and 12 sequential region switches with warmed population/resource plateaus. Performance sampling uses the existing `verify_atlantis_performance.mjs` plus local loading/GPU probes. Performance browsers run serially. An accidentally overlapping diagnostic run is retained locally as discarded evidence, not used for final conclusions.

### Final measurements

Headed Chrome 154 on Apple M2 Pro / macOS 26.6.2, 1440×900 CSS pixels, DPR 1, High, seed 71523, local Vite, serial baseline → final candidate → baseline. The active-play sample stages a 25 m Orca at `(0,-688,-895)` with normal 412-animal ecology and the existing slow-swim control; each existing CPU profile covers 120 frames after 1.5 seconds of warming. Loading probes use native region selection, separate first Atlantis entry from two warm returns, and no CPU profiler. These are browser/session-first samples, not network-cold installation measurements.

| Measurement                         | Baseline before | Final candidate   | Baseline after |
| ----------------------------------- | --------------- | ----------------- | -------------- |
| Pause renders in about 1.1 s        | 66              | **0**             | 59             |
| First Atlantis entry, total         | 4.77 s          | 4.72 s            | 4.54 s         |
| Two warm Atlantis returns, total    | 2.84 / 2.79 s   | **2.50 / 2.36 s** | 3.02 / 3.04 s  |
| Warm return's longest observed task | 1907 / 1568 ms  | **254 / 242 ms**  | 1873 / 1982 ms |
| Active-play High FPS / p95          | 58.9 / 23.5 ms  | 57.2 / 25.3 ms    | 58.6 / 23.8 ms |
| Inclusive actor-loop CPU per frame  | 4.74 ms         | 4.59 ms           | 4.03 ms        |
| Draw calls / triangles in that view | 267 / 914,076   | **267 / 914,076** | 267 / 914,076  |

The clear benefits are eliminating repeated paused ocean submission and splitting the warm city construction block. The warm total is modestly shorter here, but first-entry time is essentially unchanged and a 953 ms first-entry task remains. Active-play FPS/CPU improvement is **not established** by these noisy short samples; retain the small allocation cleanup without claiming a new frame-rate or thermal guarantee. No GPU or pixel-quality reduction ships. Separate non-task host load was observed and left untouched; it is context, not a diagnosis of the user's device.

The rejected outline experiment used controlled frozen-city camera views with actual game fog/lighting and asynchronous GPU timers. In the original-cutoff overview its geometry changed from 2.15M to 1.63M triangles and 784 to 750 calls, but GPU means overlapped and varied around 10–14 ms across alternating runs. Forcing all full-detail street districts visible changed 4.04M to 1.60M triangles and 1171 to 738 calls; GPU repeats were still mixed. Neither geometry reduction alone nor a single favorable run justified shipping the extra resources.

### Completed checks

- 689/689 full unit tests; 12/12 focused construction/ownership/i18n checks after the context-recovery follow-up.
- 29/29 shared native browser checks (feeding, growth, threats, lord contacts, surface breach, pause and round clock).
- Final lifecycle script: all four regions, input/resize/quality/resume/home/Guide, mid-build rejection/retry, 12 warmed switches, and forced graphics-context loss/restoration followed by native resume. Zero page errors. Restoring a lost context now also hides the old blocking error layer; this small follow-up includes both-language recovery copy.
- Formatting and production build pass. The existing >500 KB bundle warning remains; this revision does not introduce code splitting.
- Eight restricted production artifacts match local and public bytes. All four destinations pass English desktop 1440×900 and Chinese touch viewport 390×667 selection/Guide/native-start/home checks on the refreshed public candidate. No development API is exposed. Private paths remain blocked; changing a temporary safe runtime probe is visible on the same public URL.

The final warmed resource counts plateau independently per region; raw reports retain the exact values and conditions. These counts do not measure total VRAM or establish low memory use.

### Limits and rollback

Headed M2 Pro/macOS/Chrome desktop measurements are not physical-phone thermal or battery tests. Phone-sized screenshots are viewport emulation. Natural 15–30-minute play, actual hot-device power/thermal behavior and user-visible stutter remain device review boundaries. The implementation does not claim that active play cannot heat a device. Forced context recovery was checked from paused play, not at every loading-stage interruption.

Rollback is localized: the `worldRenderDirty` guard and temporary objects in `main.js` can be reverted independently of cooperative construction. Atlantis's synchronous public factory interfaces remain available; loading can return to the synchronous factory if a browser/task-yield issue appears. Revert the cooperative constructor modules and `scene_preparation.js` together if needed. No save migration or gameplay data change is involved.
