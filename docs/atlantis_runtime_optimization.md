# Atlantis preparation and runtime review — 2026-10-22

The user accepted the civic architecture, city materials and wall-stability work
and requested a local checkpoint before addressing phone stutter and loading
delay. The accepted work is committed as `5c70e44`; the performance changes below
are a separate, uncommitted candidate. No push or main/Pages publication is
included. Existing appearance, gameplay, ecology, population and collision rules
are preserved.

## Diagnosis and implementation

1. **Furniture construction:** the static host grid already filtered the original
   buildings, but every newly placed furniture collider was appended to every
   subsequent query. Curved chest lids each contribute many small boxes, causing
   millions of irrelevant edge/shape tests against distant furniture. A temporary
   cached world AABB now rejects only fully separated local boxes. Candidate
   order, inclusive boundary handling, existing exact bidirectional edge sweeps
   and all non-box tests remain intact. The cache is released after placement.
   The frozen old-algorithm oracle still produces identical placements,
   colliders and geometry; no expected layout was rewritten.
2. **Packed model decoding:** the shared organic loader, two shark loaders,
   Octopus morph loader and reef far geometry formerly used
   `Uint8Array.from(atob(value), callback)`. Native byte decoding now avoids that
   string iteration and its temporary allocations. Browsers without
   `Uint8Array.fromBase64` use an indexed `atob` copy. Both paths return independent
   buffers and preserve the complete shipped byte corpus. This is feature
   detection, not an assumption about the user's phone. The API's compatibility
   boundary is documented by
   [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromBase64).
3. **Shader preparation:** High renders the world into the HDR composer's target,
   whereas the old precompile ran against the default screen target. In the
   pinned Three.js 0.180.0 implementation, output color space and tone mapping
   enter program selection (`WebGLRenderer.js` and `WebGLPrograms.js`). This
   produced unused screen variants and left HDR variants to compile on first
   draw. `visuals.prepare()` now selects the actual High/Smooth render target for
   `compileAsync`, restores the prior target immediately, then awaits completion.
   Both startup and regional preparation use it. No bloom, resolution, material,
   shader surface, geometry, texture or simulation settings are reduced.

## Reproducible measurements

Host: M6 Mac mini, 32 GiB, Chrome 155.0.8059.85, Node 24.21.0. Native Chrome was
run serially, without concurrent builds or test workloads. These are host
measurements, not physical-phone tests or M4 thermal evidence.

Evidence is under `.local/atlantis_performance_20261022/`. `paired.mjs` performs
baseline → candidate → baseline in fresh pages, 1440×900 DPR2 High, seed 71523.
It routes only the three computation changes back to their original behavior
for baseline. The native menu switches Atlantis → Hawaii → Atlantis, then starts
normal gameplay with one initial 25 m player placement near the upper city and
seven seconds of normal slow movement. The fixture does not pin the player each
frame. Routing disables the browser HTTP cache; the URL is local development.
Thus these results measure preparation and rendering, not public cold download.

| Measurement                                     | Baseline 1 | Candidate | Baseline 2 |
| ----------------------------------------------- | ---------: | --------: | ---------: |
| First Atlantis switch                           |   1,963 ms |  1,234 ms |   1,917 ms |
| Return to Hawaii                                |   1,135 ms |    759 ms |   1,180 ms |
| Warm Atlantis switch                            |   1,376 ms |    967 ms |   1,365 ms |
| First Atlantis switch, total long-task duration |     891 ms |    460 ms |     873 ms |
| First Atlantis switch, largest long task        |     386 ms |    109 ms |     368 ms |
| First Atlantis switch, program-log blocking     |     325 ms |     57 ms |     301 ms |
| First nearby gameplay route, largest long task  |     196 ms |    164 ms |     188 ms |

In this bracketed comparison the first Atlantis switch is about 36% shorter and
warm switching about 29% shorter. These are observations from this host and
route, not a guaranteed mobile percentage. Profiler-assisted separate runs also
show warm city construction falling from approximately 745–747 ms to 382–389 ms.
All raw samples remain available, including an earlier intermediate candidate.

The residual first-route pause is real: about 164 ms remains, including further
first-use program work. This patch does not remove every first-encounter stall.
Program counts at the end of the paired route fall from 401 to 291, consistent
with avoiding redundant output variants. Texture/geometry counts in those live
routes vary with ecology and visible poses; they are not claimed as memory wins.

## Sustained rendering and remaining priorities

`active_profile.mjs` samples 300 active frames after a three-second warm-up with
CDP CPU profiles and asynchronous GPU timer queries, for desktop and 390 px
DPR3 touch emulation, High and Smooth. The same normal movement and initial
placement are used before and after. Desktop High GPU time is approximately
9.83 → 9.91 ms; Smooth 3.65 → 3.60 ms. Mean frames remain around 16.6 ms on this
host. There is no demonstrated steady-state FPS/GPU improvement. The narrow
viewport is desktop emulation, not a physical phone.

The accepted city remains complex. Reducing sustained mobile GPU load would
need a separate measured pass over visible geometry, shadows, material sampling
and fill cost. This candidate deliberately does not hide creatures, drop ecology
updates, lower bloom or replace accepted surfaces. Real phone model/browser,
quality selection and route feedback are still needed to distinguish sustained
GPU pressure from first-use CPU pauses and network waits. A future render
optimization must be compared visually before replacing the accepted scene.

Existing content-hashed HTTP caching and gzip remain unchanged. This patch does
not reduce model download bytes or promise a faster first download on every
network. It makes cached bytes cheaper to prepare and avoids part of the
synchronous shader work. Existing old-page/update behavior must remain valid.

## Validation and limits

- Twelve focused furniture, residential and frozen-oracle checks preserve exact
  layouts and collision outputs.
- The new decoder tests compare 340 packed arrays in 77 model files against
  independently decoded bytes, including morph targets, for both native and
  fallback implementations. Independent returned buffers are also checked.
- Native High/Smooth tests cover the selected compilation target, immediate
  restoration during a pending promise, synchronous throw and asynchronous
  rejection. A real regional compile failure restores Hawaii, and retrying
  Atlantis succeeds.
- Pausing leaves time, position and render-frame count frozen. Context loss and
  restoration redraw the paused scene and permit native resume without advancing
  game time.
- Matching temple, crypt and Poseidon views are recorded in both quality modes.
  Draw and triangle counts match in all six pairs. Images retain the accepted
  surfaces; they are not bit-identical (mean channel difference 0.007–0.396 on a
  0–255 scale, maximum 23 in the recorded captures). No appearance reduction is
  claimed or intended.
- Fresh full suite: 1,546/1,546 tests, formatting, build and whitespace checks
  pass. Four-region pause/resize/quality/resume/Guide checks pass. The older
  lifecycle script's strict texture equality assertion fails on one Bermuda
  sample (392 versus 391); its original log is preserved, not relabeled a pass.
  Menu-frustum-dependent first bone uploads make that snapshot unsuitable as a
  standalone leak assertion. A separate 16-switch audit explicitly initializes
  all resident scene bone textures after material readiness. Its final two
  rounds have identical texture, geometry, population and skeleton counts in
  all four regions. This is a bounded resource/disposal audit, not a normal-play
  memory reduction claim; the specific one-texture UUID was not traced.
- Production checks: all 256 files (75,079,582 bytes including gzip companions)
  match dist, the restricted local origin and the HTTPS preview byte-for-byte;
  eleven source/private paths are denied on each origin. Entry changes from
  `index-I8birVp4.js` to `index-BE75HNIz.js`. All four players pass native Guide,
  start, boost/ability, pause and Home flows in English desktop and Chinese
  390 px touch emulation, with no browser/resource errors or production debug
  hook. Both locales refresh successfully at the same URL.
- Local and public HTTP checks retain fresh (`no-store`) HTML, immutable hashed
  resources, gzip and 304 conditional reuse. The prior entry is still available
  with unchanged bytes for already-open pages. This checks cache compatibility,
  not an internet download-speed gain. The initial audit script assumed text
  decoding/no-cache headers; it was corrected to byte comparison and the actual
  existing no-store contract without changing the server.
- All 1,149 unaffected checkpoint inputs, including every existing asset, retain
  their exact hashes. The eleven changed existing inputs comprise eight runtime
  files and three project status documents. The decoder, its test and this review
  are new. Services keep their existing identities and logs; the prior runtime
  is archived by the existing manager. No active preview URL is a formal release.

No new generated assets, HF inference, personal Skill changes, service replacement
or repository publication is part of this work. Rollback consists of restoring
the eight changed runtime files to the accepted checkpoint and removing the new
decoder module/test, then rebuilding the existing restricted preview. Preserve
other work and its recorded acceptance state.

## Local checkpoint authorization — 2026-10-22

Accepted rendering checkpoint — 2026-10-22: the user requests committing the
current performance and graphics-recovery candidate, then separately improving
Kraken motion and camera clipping through large pursuers. All 1,167 delivered
input hashes match before these acceptance-only notes. The recorded 1,552-test
and native/public evidence keeps its original scope; the original physical-phone
stall and complete black-surface incident remain unconfirmed on this host.
This authorizes a local checkpoint only, without push or main publication.
The following pending labels are historical for this checkpoint. New Kraken and
camera changes require separate review and remain uncommitted by default.
