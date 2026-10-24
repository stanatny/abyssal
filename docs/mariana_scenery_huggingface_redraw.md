# Mariana shallow coral and ledge fans — 2026-10-24

The user accepts the preceding Shonisaurus/Glass Prawn batch and asks to continue.
The current agent works independently on `art/mariana-hf-redraw`, based on
`1ae99d5` / v0.11.17. This separate scenery candidate awaits visual review;
no commit, push or formal release is requested.

## Scope and source

This pass reuses three **previously accepted actual HF TRELLIS.2 meshes**, whose
original generation and conversion are recorded in
[the Hawaii reef review](hawaii_reef_life_huggingface_redraw.md). It is not a new
HF inference batch or a procedural substitute presented as generated geometry.
The shared prototypes, textures and Hawaii/Bermuda integrations remain unchanged.

The live receipt at **2026-10-24 13:53:54 BJT** returned **135.579738 / 2400 included
seconds**, zero excess usage, and reset at **17:55:01 BJT**. Generation and export
currently require separate 120-second reservations, so a new generation cannot
reliably be exported within that balance. No inference, excess payment, provider
switch or account change is used this round. This timestamped balance is not a
future quota guarantee.

- Replace the 56 shallow procedural colonies with 42 branching and 14 brain
  corals, using uniform prototype scaling rather than stretching each silhouette.
- Replace 180 procedural sea fans on the existing 15 depth groups × 12 ledge rocks.
- Keep all 180 supporting rocks/colliders, 480 luminous polyps, wall organisms,
  terrain, passages, gates, landmarks, actors and gameplay rules exact.
- Three shallow sites (indices 50, 52, 54) retreat 16 m north, at the same X/yaw,
  because their original cliff placements buried the new complete bases by
  1.4–6.7 m. The remaining 233 centers are unchanged. This is an explicit local
  placement correction, not an assertion that every old center was preserved.

The visual target is readable natural branching and surface grooves at ordinary
close range, seated on the real sea floor and ledges. Existing deep lighting,
bioluminescent points and regional atmosphere are retained. Rocks, wall materials,
layer landmarks and the bottom refuge are not claimed redrawn by this batch.

## Integration and ownership

`mariana_colonies.js` owns instance placement and near/far selection; its cache
references use the existing `hawaii_reef_asset.js` API. Base vertices in the
lowest 2.5% of each prototype are sampled against actual rendered floor triangles
or the corresponding rendered support rock. The placed base is embedded by at
least 4 cm in the regression, rather than hiding an unsupported object behind a
new platform. No new colliders or lights are added.

The 17 instance groups use 34 near/far draw objects. Each colony appears in one
LOD only, with 28/34 m hysteresis, existing distant geometry/colors and a 0.35 s
update interval in the normal scene loop. There is no private animation loop or
per-frame geometry allocation. Detailed surfaces remain a local near-view cost;
distant prototypes intentionally retain simpler geometry and vertex color.

Scene teardown owns InstancedMesh disposal; the colony pool releases its three
shared asset references. Async construction cancellation also releases the pool.
The ordinary entry path initiates texture loading and exposes the existing scene
preparation callback. The normal online-recovery event retries failed textures.
No test-only prepare call is needed to make the candidate work.

## Cost and verification

The existing 512×512 color textures add about **3 MiB decoded RGBA before mipmaps**
when this region holds all three; no new texture files are introduced. This is
per WebGL context and excludes geometry, framebuffers and other map resources.

| Matched populated view | Draw calls before → after | Triangles before → after |
| ---------------------- | ------------------------: | -----------------------: |
| Shallow nursery        |                   82 → 93 |        798,688 → 815,980 |
| Branch close-up        |                   74 → 85 |        768,908 → 786,200 |
| Brain coral close-up   |                 155 → 167 |    1,121,875 → 1,147,115 |
| Upper ledge fan        |                   72 → 86 |        841,184 → 898,348 |
| Deep ledge fan         |                   63 → 64 |        615,104 → 636,364 |

These native Chrome renderer counters include the populated scene and render
pipeline, with matched camera/time and alternate old/current ocean roots. Both
versions coexist for this comparison; its memory counters are not independent
baseline memory measurements. The added detail increases visible cost. This is
not evidence of improved physical-phone performance or reduced heating.

Evidence: `.local/mariana_scenery_20261024/`.

- **1,671 / 1,671 tests pass**, including seven focused support, ownership,
  cancellation, frozen-map and LOD checks. Every other map surface, collider,
  obstacle and landmark in the frozen construction oracle remains exact.
- Full-footprint support is tested on rendered geometry, not analytic nominal
  height. All 236 roots remain within the tested embedding bounds.
- Native normal-entry material loading succeeds. Three Mariana → Europa cycles
  each dispose exactly 49 tracked objects once: 34 instance meshes, six geometries,
  six materials and three textures. Europa stabilizes at 254 geometries / 219
  textures after warming; this does not claim all game caches are empty.
- Hawaii → Bermuda → Mariana reuse checks pass. Intentionally failed color
  requests retain shaped fallback meshes; removing the fault and dispatching the
  application's normal online event restores all three textures.
- Matched screenshots include shallow overview, branch/brain close-ups and upper/
  deep fans. Initial inspection cameras were obstructed by the player; a second
  fixture reused a frozen LOD timestamp across locations. Those captures remain
  archived. `review_v3` corrects both fixture errors and is the final comparison.
- Native video/normal movement, production build and public-origin verification
  results are recorded in the accompanying final evidence, not inferred from
  earlier batches. Desktop touch emulation is not a physical-phone test.

The new appearance remains pending user acceptance. Earlier Mariana creature
batches are accepted but remain uncommitted. Formal Pages stays v0.11.17 until
explicit publication authorization.

## Final candidate delivery checks

`npm run check` and the production build pass. The same restricted preview
now serves `index-291ABqn_.js`: **451 artifacts / 113,859,883 bytes** match
dist, local restricted origin and the public origin by SHA-256. 34 source/private
paths are denied at each origin, production hooks are absent, and four native
English-desktop / Chinese-390px Guide/start/ability/pause/Home flows plus same-URL
reload pass without browser or resource errors. Narrow touch emulation remains
explicitly a desktop check. All four original service identities are unchanged.

The 21-second H.264 video contains three paused populated-scene observation
camera clips; it does not pretend to be a player-controlled descent. A separate
normal 30 m player movement check covers 40 m of actual displacement, then pause.
Final encoded frames were inspected and the complete delivery video decodes.
The 1,401-input baseline has exactly six declared existing-file changes (scene,
construction-oracle test and four status documents); all other prior inputs,
including the accepted creatures and shared reef sources, remain exact.
