# v0.11.1 — Runtime CPU Refinement

The user accepted the reviewed runtime-performance candidate and authorized its main publication on 2026-10-05. This patch is based on v0.11.0 / `9122033`; no new tag or GitHub Release is requested. Read [the detailed measurements and rollback](runtime_performance_revision.md) and [verification](verification.md).

## Resulting behavior

Ordinary-animal rock steering and layered overlap now reuse the existing immutable static-collider grid. If projection detects any overlap, the full original ordered rock projection still runs from the original point, preserving chained contacts outside the initial query. Target labels filter screen/score before obstruction rays and reuse temporary projection vectors; dense ink/active sonar skip generic labels that would be hidden. Inactive sonar avoids unused panel layout reads.

All eight ordinary stocks, feeding/growth, survival, AI cadence, collision accuracy, near-view models, quality settings and regional objectives remain. No invisible animal simulation is disabled. Typed query deduplication stamps and Atlantis static-matrix caching were experimentally measured, then removed because their additional benefit was not repeatable.

## Evidence and limits

The accepted candidate passed **967 units**, **29 shared native-browser checks**, eight-region stock/play/pause checks and **36** brute target-equivalence frames. Its restricted compiled local/public each passed **38 bilingual Guide cases**, eight regional play/pause/home flows, 320/390 px views and nine exact artifact hashes; all 301 runtime/build fingerprints matched. These are prior candidate receipts, separate from fresh release preflight and formal deployment.

The strongest same-host High comparison uses 240 frames, M2 Pro / macOS 26.6.2 / Chrome 154, 1440×900/DPR1, a 25 m Orca and real populated Atlantis. Main-loop CPU falls **11.54→7.34 ms/frame**, with **275 draws / 914,244 triangles** unchanged and frame p95 **19.2→18.5 ms**. FPS is already about 60. Supporting Hawaii samples also improve; Penglai repeats do not establish a gain. No GPU, phone temperature, power, download/loading or natural 15–30-minute-session improvement is claimed. The large build chunk remains a known warning.

## Publication and rollback

Fresh formatting, units, localization and build preflight must pass before commit. Fast-forward only the clean primary worktree, push ordinary `main`, and verify the Actions run at the exact commit. Download its Pages artifact and compare served HTML/JS/CSS/audio/image bytes; inspect native formal start/pause/home flows and both-language Guide. Capture the current English home screenshot through the actual renderer, not a manually edited image.

Publication receipts are ignored under `.local/release_v0_11_1/`. Keep the former restricted runtime and current preview services. The preceding accepted v0.11.0 commit is `9122033`. If a regression appears, revert the bounded sphere-helper wiring or target/sonar ordering independently; no data/save migration or ecology changes are needed. Future release authorization is separate.
