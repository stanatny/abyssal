# Scenery footing follow-up — 2026-11-11

The player marked a floating nursery rock arch and a round reef colony in Hawaii.
The preceding player/camera terrain-contact fix did not repair these scenery
transforms. This candidate addresses the marked objects and the same construction
errors found in Bermuda, Odyssey and Europa. It extends the uncommitted jelly,
flying-fish and terrain-contact candidate; formal main remains v0.11.27. No commit,
push, version bump or personal Skill change is included.

## Cause and repair

Hawaii's six half-torus arches ended at a horizontal plane sampled at each arch's
center. That plane cannot meet a sloping seabed at both feet: the marked foot's
entire end ring was 3.675–7.469 world meters above the final terrain. Retain every
original arch vertex, curve and collider, and extend only exposed end rings into
the actual rendered terrain. Nine short stone feet add 189 triangles inside the
six existing meshes, with the existing material and no additional draw calls.
Their buried caps are at least 0.52 m below the sampled floor footprint.

Europa had the same error on three much larger arches. Six elliptical feet now
extend into the final seabed, adding 216 triangles inside the original three
meshes. Narrow capsule bundles follow each elliptical foot without widening the
central doorway to a large circular obstacle. Caps are buried at least 2.688 world
meters; source arch positions, normals, UVs and indices remain an identical prefix.

Upright reef placement instead used the _minimum_ bottom gap, which supported only
one high point and left the remaining base floating. Hawaii also retained random
pitch/roll rather than the actual slope. Fit the upright model to the final
terrain normal while preserving yaw, scale and horizontal anchors, then lower it
until the complete sampled base of both near and far meshes is slightly embedded.
Ignore unused buffer vertices in simplified indexed meshes. This corrects all
357 Hawaii colonies, 138 Bermuda colonies and 155 Odyssey upright HF colonies.
The marked brain colony retains its anchor at approximately x −12.319, z 21.529.

Use the final tagged terrain triangles, not an analytic floor that can differ
between rendered vertices. Bermuda and Odyssey own and return the same terrain
index reused by player support; region exit releases it. Placement fitting runs
at construction/preparation, not every frame. Existing shared HF meshes, textures,
LOD thresholds, instancing and fallback lifecycle remain. No new asset generation
is needed for this placement error.

## Collision and preservation

Stone extensions require solid contact: append nine tagged Hawaii foot capsules
and 54 narrow Europa foot capsules after the old ordered collider arrays. Hawaii
also appends matching legacy obstacle markers for NPC navigation. Original 646
Hawaii and 822 Europa collider prefixes remain exact; do not regenerate their
baseline fixtures to hide the necessary additive change.

Food values, species counts, combat, random draws and horizontal scenery anchors
remain. The 12 deliberately fallen Odyssey amphorae preserve their previous
all-vertex minimum-support placement and analytic sampler: their complete matrices
are exactly unchanged. Upright-base fitting must not be applied to fallen props.
The shared Mariana colony code already uses maximum-gap seating; it is not changed.
Independent scene factories on other maps are not assumed correct merely because
they share an art asset, and this is not a claim that every prop has been audited.

## Verification and evidence

Evidence is under the ignored `hawaii_scenery_feet_20261111` directory:

- `before_marked_view.png` and `final_marked_view.png` show the actual rendered
  location with matched, paused observer cameras. Close foot/base captures are
  also retained. Camera staging is diagnostic, not a recording of natural travel.
- `current_hawaii_check.json` tests actual near/far referenced bases and dense
  foot-cap probes. Maximum colony base gap is −0.040 m; every colony remains
  exposed, with a minimum exposed height of 0.363 m. Added foot side normals/UVs
  are finite and outward, and the colliders enclose their visible surfaces.
- `europa_after.json` and `europa_arch_feet_tests.log` cover actual final terrain,
  unmodified geometry prefixes, buried caps, narrow collider envelopes and
  synchronous/asynchronous construction and cancellation cleanup.
- `final_independent_review.json` verifies unchanged fallen-pot matrices, shared
  near/far resource leases and zero retained terrain-index bytes after disposal.
  For six Hawaii arches, 3/15/30 m bodies traversing both directions show no
  change caused by the added feet on 36 isolated central trajectories. Existing
  Europa tests cover its complete 30 m bidirectional arch routes.
- `tests/scenery_grounding.test.js` covers irregular bottoms, unused far vertices,
  all three maps' actual near/far colonies, visibility and terrain-index cleanup.
  The Bermuda LOD test compares exact Float32 instance matrices rather than
  three-decimal strings that can disagree across a rounding boundary.

These are geometry/contact and short browser checks, not complete-round acceptance
or physical-phone performance measurements. Curved organic sides may naturally
overhang their seated bases. The previous player skin/appendage limitations remain
as documented in the separate terrain-contact review.

The final candidate passes all 2,220 tests, `npm run check`, `git diff --check`
and production build. The initial run exposed one existing LOD assertion's
Float64/Float32 decimal-rounding mismatch; replacing rounded strings with exact
Float32 comparisons passes both its focused rerun and the final full suite.
`native.json` records Hawaii → Bermuda → Odyssey → Europa → Hawaii native
start/return flows with no browser errors and ready terrain support. A staged
3.5 m player crosses the marked Hawaii arch in both directions using normal
movement; entering the new foot reports `arch_foot` blocking without a stuck
state. The first fixed-wall-time harness attempt was replaced with positional
waits so CPU contention cannot masquerade as failed travel.

The compiled preview retains its bounded cold-start loader and the earlier runtime
archive. Main chunk `index-COORH7lx.js` and the other reviewed artifacts are served
at the same authorized preview origin. All 62 sampled public HTML, regional,
engine, reef and jelly resources match SHA-256; this is a representative network
sample, not a fetch of all 973 artifacts.

`public.json` passes Chinese desktop (1280 px) and English touch-emulated (390 px)
no-cache loading, Hawaii start, keyboard/touch input, pause/resume/home and the
shared jelly Guide. Neither case exposes the development hook or reports browser,
HTTP or request failures or duplicate static-module fetches. Initialization took
49.1 and 45.0 seconds on these two network runs; these are not FPS measurements.
All 973 local served artifacts match the build; only this review's final validation
notes changed after building. The task-only loopback development server is stopped;
the existing compiled preview and tunnel remain running.
