# Region environment loading — 2026-10-23

## Acceptance — 2026-10-23

The user accepts this delivered candidate and authorizes commit and main
publication together with the preceding accepted Atlantis work. All 1,229
reviewed inputs match before these acceptance notes. The measurements below
retain their original scope; the candidate-only labels describe the earlier
delivery state. Physical-phone follow-up remains open.

## Scope and status

The user says “先做优化吧” after the accepted neighborhood checkpoint
`8f27834d7199b0ce1e8e67c0572018cb410a1562`. The current agent independently
implements a bounded loading change on `art/atlantis-hf-redraw`. This candidate
is uncommitted and unpushed. The formal main/Pages release remains v0.11.15.
No model generation, gameplay, population, AI frequency, camera, near/far art,
texture, bloom or resolution changes are retained.

## Implementation

`region_environment.js` defers seven non-Hawaii environment factories until the
user selects that sea. Hawaii remains the synchronous initial environment.
The original preparation transaction constructs the new environment before
replacing the old one, keeps its original progress stages, and owns disposal.
The module loader creates no scene resources; cached module code is distinct
from a live environment. Creature and Guide factories remain shared/static:
this is not complete per-map creature streaming.

The existing immutable, content-hashed asset cache remains in use. Updated HTML
selects new code while unchanged model files reuse their existing identities.
The restricted preview manager preserves old assets for already-open clients.
A first visit to another sea now includes its deferred download; later visits
reuse downloaded code/data but still reconstruct the scene. This moves some
work to actual demand and does not eliminate scene construction.

## Failure paths found during production testing

1. The existing gzip plugin ran before Vite replaced dynamic-import preload
   markers. Its compressed entry contained `__VITE_PRELOAD__`, although the raw
   entry was valid. The plugin now uses the supported final `generateBundle`
   hook order; a real Vite dynamic-import fixture compares compressed and final
   JS bytes. No dependency upgrade was made.
2. Browser ESM caches a failed import in the current document. Repeated same-page
   import is not a dependable network retry. A failed region download now offers
   Return Home (the original sea stays playable) and an explicit Reload page
   action after the connection returns. No automatic reload discards a run.
3. Repeating the same destination reused the loading panel's cached markup,
   including old failure buttons/status. `begin` now clears that local markup
   before rebuilding it. Failure buttons have a keyboard focus loop and both
   locales. Native retry checks require exactly two fresh buttons.

## Final build inventory

The accepted baseline preloads 88 model-data chunks; the candidate preloads 75.
The same model bytes are retained, with 13 chunks deferred. Initial model data
falls from 36,508,587 to 33,436,032 raw bytes and 19,667,814 to 17,996,063 gzip bytes.
Including the entry and all module preloads, compressed startup scripts fall
from 20,542,681 to 18,755,972 bytes (about 1.79MB / 8.7%). These are deterministic
build inventories, not a claim that every network request or texture is saved.

## Distant-detail experiment rejected

A separate index-only LOD trial reduced four decorative kits to about 32% of
their near triangles, preserving original attributes and collision. In the
live populated city, this saved roughly 6% of visible triangles at representative
district views, but serial full/candidate/full frame and GPU comparisons showed
no repeatable overall benefit. High-quality GPU samples drifted substantially;
Smooth district frame p95 was 18.5 /18.4 /19.5ms. Those samples cannot establish a
speedup. The additional runtime branch, far indices and resources were removed.
The accepted city geometry/material source files are byte-identical to HEAD.
The rejected patch, conversion and measurements remain local evidence, not
shipped assets or an accepted optimization.

## Verification and limits

Evidence root: `.local/atlantis_optimization_20261023/`.

The final serial loading bracket uses headed Chrome, Smooth 1440x900, fresh
contexts, 20Mbps/40ms network shaping and the same native menu/play/sea route:

| Measurement (seconds)    | Baseline | Candidate | Baseline repeat |
| ------------------------ | -------: | --------: | --------------: |
| Cold menu ready          |    12.96 |     10.10 |           12.41 |
| Cold start to playable   |    15.77 |     11.92 |           15.16 |
| First Atlantis selection |     4.32 |      3.80 |            4.91 |
| Warm Atlantis return     |     5.34 |      2.07 |            2.01 |
| Reload menu              |     8.37 |      2.05 |            1.95 |

Cold startup improved in this short bracket. Warm/reload samples vary too much
to establish a new warm-load gain; existing caching already handles them.
The earlier bracket including the rejected LOD trial is separately retained.
Neither bracket is an exclusive-host laboratory or sustained device test.

Fresh native cache checks close and reopen Chrome (171 disk-cache responses),
update the HTML at the same URL (75 unchanged model chunks reused), select the
new deferred Atlantis module, continue playing the old open page, roll back the
HTML and refresh, and disable the cache for network fallback. All five pass.

Fresh development lifecycle checks abort and restore the four neighborhood
textures, verify paused time and perform three Atlantis/Hawaii cycles. Each
cycle owns 71 neighborhood objects/resources, each disposed exactly once.
Forced graphics loss/restoration after the staged Atlantis gate-entry route
preserves the 25 sampled visible texture maps and environment pixels in both
High and Smooth over two cycles. Playing/overlapping restoration and the
separate Guide renderer also pass. This is a regression check of the accepted
repair, not a reproduction of the user's complete phone incident.

The 1,226-input baseline audit finds 1,216 unchanged inputs. All 215 existing asset
inputs, city geometry/collision implementation, creature/animation/materials,
AI, rewards, camera and audio sources remain byte-identical. Changed `main.js`
lines only import/invoke environment factories and route preparation failure.
The rejected LOD files do not enter the final build.

All 1,583 unit checks and project formatting pass. The new compression fixture
builds a real dynamic import; the native environment verifier covers eight
maps, four characters, both locales, Guide isolation, same-address refresh,
failed import, the retained old sea, keyboard navigation and explicit reload.
The first failure-UI attempt exposed cached stale buttons; its failed receipt is
retained alongside the successful focused repair and the final 16-case native
run (`regions_pass/report.json`).

The final restricted preview is
<https://saver-recorded-digit-could.trycloudflare.com/> with entry
`index-B2tOApXl.js`. All 340 artifacts (85,546,168 bytes, including gzip sidecars)
match dist, local preview and fresh public downloads; all 113 gzip sidecars decode
to the corresponding final JS/CSS. Eleven source/private paths per origin remain
denied. Public English 1440 and Chinese 390 touch-emulation flows pass Guide,
start/ability/pause/Home and same-URL refresh, with no page errors or failed
resources and no production debug API.

Original process identities are retained: dev 35213/5188, preview 23118/7188,
awake 23120 and tunnel 35419/20248. The tunnel ready endpoint is healthy. The
preview manager archived the previous runtime at
`.local/mini_preview_20261007/runtime_before_20261023_082803` and retains its
hashed assets for open pages. No service was replaced, and no commit/push occurred.

Reproduction: `npm run check`, `npm test`, `npm run build`, then
`node scripts/verify_region_environment.mjs` against the restricted local build.
`ABYSSAL_ENV_FAILURE_ONLY=1` runs the focused import-failure path. Loading/cache,
rejected-LOD, lifecycle, restoration, source-preservation and public receipts are
under the evidence root. The first public HTTP verifier invocation failed before
network I/O because the current Python lacked `requests`; it was rerun with
TLS-verified standard-library transport, without adding dependencies.

Measurements use serial headed Chrome on the development Mac, with a 1440x900
controlled network route. 390px touch cases are desktop emulation. They do not
establish physical-phone FPS, heat, battery use or resolution of the original
gate-entry black-surface incident. PP-Q055 remains open. Active-play CPU/GPU
improvement is not claimed for this loading-only candidate.
