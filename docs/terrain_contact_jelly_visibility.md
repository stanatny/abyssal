# Jelly discovery and shared terrain contact

Candidate — 2026-11-11. This follows the uncommitted
[moon-jelly / flying-fish revision](hawaii_jelly_flight_revision.md). The user
reports that the new jelly is too difficult to notice and that shallow sloped
surfaces have incorrect contact. Keep this work uncommitted and unpublished;
formal main/Pages remains v0.11.27. No new generation, release or version change.

## Jelly visibility in normal play

The prior close-up proved the model, but did not establish discoverability from
the ordinary following camera. A 0.4 m jelly at the earlier anchors blended into
the sea at low opacity. The existing HF mesh, scale, skeleton, food values and
12-resident population remain. The material now uses 0.66 base opacity, with a
view-dependent pearly rim giving approximately 0.59–0.82 alpha, lower roughness
and a small ambient-like emission contribution. There is no bloom beacon,
distance-dependent enlargement or extra decorative population. Other batch-10
species materials keep their previous settings.

Hawaii's first eight residents are distributed through the departure water layer
and shallow-reef approach; the first three sit slightly above and ahead of the
starting player. Four more retain an outer-reef/transition presence. Hawaii's
resident radius becomes 10 instead of 18 so slow drift stays nearer those routes.
Other maps retain their existing 18-unit resident radius and anchors. Total
Hawaii stock remains 516 ordinary animals plus one rare, with 12 moon jellies.
All four maps using this species share the clearer material and Guide model.

`discovery.json` records actual start/input at 1280 px High and 390 px Smooth.
The normal follow camera shows the three upper jellies clearly; the nearest is
about 7.1 m away after the short slow-swim input. Ten/eight resident positions
project inside the view respectively; those projection counts alone do not prove
that every animal is unobstructed or visually distinguishable. Both bilingual
Guide views also render without shader/resource errors. Screenshots use the real
follow camera rather than a magnified specimen camera.

## Two contact defects reproduced

First, the shared center-floor callback used only the height beneath the player's
center, plus radius and pitch clearance. The existing multi-sphere sweep checked
props, but did not sample the floor beneath the body's front and back. At the
clear Hawaii witness `(10, -40)` in XZ, a horizontal 30 m body could penetrate
its own collision envelope into the actual floor by 5.641 m, while the solver
reported no obstacle contact. The 32 m case reached 6.043 m.

Second, most regional height callbacks evaluated an analytic formula rather than
the final rendered triangles. Actual constructed-mesh samples and independent
Three.js rays found the following underwater extrema in world units. These are
sampled discrepancies, not a proof of global maxima:

| Region   | Rendered above formula | Rendered below formula |
| -------- | ---------------------: | ---------------------: |
| Hawaii   |                  0.576 |                  0.311 |
| Atlantis |                  1.002 |                  1.478 |
| Bermuda  |                  0.343 |                  0.175 |
| Mariana  |     approximately zero |     approximately zero |
| Amazon   |                  4.718 |                 12.592 |
| Europa   |                 26.018 |                 23.515 |
| Odyssey  |                  6.971 |                  6.814 |
| Penglai  |                 57.858 |                 49.668 |

The pale nursery arch is genuine scenery near `(-3, 9)`; the screenshot alone
does not establish that every pale overhead shape is a terrain defect. The
contact corrections below address reproduced geometry/physics mismatches.

## Shared correction

Eight constructors mark only their authoritative lowest-floor meshes. A new
CPU-only `createTerrainSurface` builds a bounded, multilevel XZ triangle index
from those meshes and their final world transforms. It supports adaptive
triangulation, nonuniform grid columns and transformed Europa floors. Roofs,
bridges, plateaus and other intentional upper structures are excluded; their
existing solid colliders remain responsible for contact. No scenery vertices,
collider layout, food, damage or feeding reach are changed.

Height queries evaluate the exact indexed triangle. Sphere support computes the
finite face's maximum using its plane interior and constrained edge/vertex
extrema, not a tangent plane extended past a ledge. The player and companion
floor now test every supported body section against this surface. Floor-only
navigation uses a 0.52-length half-span to cover the current HF bodies' roughly
0.5-length ends with motion allowance; ordinary collider/capture lengths retain
their original 0.42 representation. Zombie Shark's low broken jaw receives an
additional 0.008 × length floor clearance, also used by its companion.

The camera uses the actual floor for its target, and checks the camera segment
again after interpolation and prop shortening. This is a bounded 0.4-unit
sampling/bisection scheme with a 0.6-radius camera. It fixes the observed pipeline
gap but is not a mathematical continuous-sweep guarantee for every possible
arbitrarily thin terrain feature.

The surface index is cached by its regional owner and released with that owner's
existing disposal. It creates no GPU geometry or material. Ordinary NPC/flying
fish/benthic habitat logic continues to use its existing regional sampler; this
scope repairs player, companion and camera contact. It does not claim that every
ordinary species now uses a new terrain navigation controller.

## Verification and boundaries

Private evidence: `.local/hawaii_visibility_slope_20261111/`.

- `hawaii_contact_audit.json`, `other_maps_audit.json` and
  `other_maps_subset_audit.json`: original shared body and formula/mesh defects.
- `terrain_surface_review.json`: eight marked-floor sets and exact sphere math;
  4,000 independent 3D nearest-point/bisection comparisons have zero failures
  above 1e-6 m, with maximum error 2.274e-12 m.
- `maps_contact.json`: 528 staged real-terrain probes across all eight maps,
  multiple headings/pitches and 3/30 m bodies. Indexed heights match actual rays
  to less than 1e-5 m, supported sections retain clearance, and camera endpoints
  remain above the floor.
- `native_contact.json`: actual regional loading, real Space movement on legal
  staged 30 m routes, terrain/camera checks, pause/home and eight-map switching.
  Evicted indices report zero retained typed-array bytes. These are inspection
  placements, not natural growth playthroughs or universal route guarantees.
- `navigation_span_report.json`: 160 actual-skin poses. The original horizontal
  four-character witness clears with at least 0.507 m under the 0.52 span.
  Two low rigid Zombie jaw witnesses motivate the additional scaled clearance;
  focused tests check their actual weighted vertices. Cross-slope flexible
  pectoral fins and squid arm tips can still intersect the ground in extreme
  grown-body poses. Their local bending/contact response is a separate existing
  limit; this correction does not claim every animated appendage is rigidly
  contained by a navigation capsule.
- The full pre-final-profile suite passes 2,212 tests. The final endpoint/jaw
  refinement passes 89 focused tests across ten files, including the new
  actual-skin and weighted-jaw regressions. The final eight-map native rerun also
  passes. `npm run check` passes. No unrelated full-suite repeat is claimed.

On this Mac's Node probes, index construction took approximately 13–489 ms and
retained typed arrays/index references used 2.96–31.59 MB per map. Those figures
exclude JavaScript Map/string/object overhead. Maximum candidates per tested
query were 18–240, and maximum measured body-floor evaluation was below 0.125 ms
at the sampled routes. These measurements do not establish physical-phone FPS,
heat or total browser memory. Dense excavation edges and arbitrary future maps
may cost more; no GPU or ecology reduction is used to hide that cost.

## Delivered preview validation

The compiled trial uses `index-CAevzCI_.js`. Ten representative HTML, main,
engine, jelly model and texture resources match the reviewed artifacts by
SHA-256 through the public origin. Chinese desktop (1280 px) and English
touch-emulated (390 px) cold-cache runs pass Hawaii start, native input,
pause/resume/home and the shared Guide, with no browser/resource errors, no
duplicate static modules and no development hook. Cold initialization was
48.2 / 42.5 seconds on this host/network; that does not establish the user's
network or warm-cache startup time. All 969 built runtime artifacts retain
identity after this documentation-only validation note.

The normal follow-camera image is delivered with the temporary trial link.
Existing preview services remain available; the task-owned development server
is stopped after verification. No commit, push or formal Pages change.
