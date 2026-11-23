# Bermuda cave motion, floor and runtime follow-up

Date: 2026-11-23. Status: local candidate; no commit, push, version change or
replacement of the accepted public preview. The separate complete-world adult
entry/collection/return gate remains open.

The player reports an unnatural vertical body lift, flickering ground behind the
titan, severe cave stutter and computer heat. These are separate defects and
need separate evidence; lower CPU cost does not establish lower temperature.

## Diagnosis and changes

The actual served preview still uses the preceding front-body deformation. Its
front chest, chin and both palms rise by up to 10.1 metres. Although its root
transform stays fixed, the visible front mass does move vertically. The report
is correct. The local continuous whole-HF candidate instead articulates one real
wrist while keeping the head and the other supporting feet fixed. It is not yet
a replacement playable build: adult access must be completed first. Raw HF
assets, the fixed jewel and the original 8 m pickup rule are preserved.

Both the old fitted resting beds and the current whole-paw support contain
unsupported copies of native seabed. Their different triangulation crosses the
native ground at sub-centimetre depth, causing depth competition. A constant
vertical offset does not solve the crossing. Rendering now omits only the
unsupported duplicate top/skirt faces. Raised support and transition faces stay.
The complete source vertices, normals, indices, support samples and physical
contacts remain available and unchanged; this is not a terrain or collision
excavation. Physical tests explicitly read `sourceGeometry`, rather than treating
the reduced render index as the complete solid.

Four conservative runtime corrections retain population, AI frequency, clocks,
combat rules and exact collision solving:

- Segment queries reject static candidates whose conservative inflated bounds
  cannot intersect the actual segment. Movement/recovery/volume queries keep
  their existing candidate contracts, order and duplicates. Shells retain their
  earlier conservative treatment.
- Dormant lords outside engagement range skip a player sight ray that their
  state machine cannot consume. Persistent pursuit, active attacks, return
  navigation and already-fired projectiles retain their required sight checks.
- Escape waypoint caching timestamps completion of its expensive computation,
  with explicit world/body/dynamic-input keys. Dynamic data retains the existing
  200 ms lifetime; static-only reuse retains its preceding behavior.
- The exact posed-triangle enclosing-sphere calculation reuses actor-private
  scratch vectors. Returned contacts remain independent immutable records and
  previous references stay valid. The 0.006 reference-grid threshold is unchanged.

## Verification

Evidence is retained in ignored `bermuda_cave_motion_perf_20261123`,
`bermuda_ground_flicker_20261123` and `bermuda_titan_pose_20261123` directories
under `.local/`.

- 27 segment/grid/exact-ray/motion cases pass, including 600 seeded mixed-shape
  comparisons with the full solver, tangencies, zero-length rays and shells.
- 101 complete encounters/boss/opening/patrol/recovery cases pass. The new far
  sight test fails against the frozen pre-fix implementation and passes after
  the change; persistent pursuit remains checked.
- Seven waypoint cases pass. The injected expensive-clock case computes once
  for a valid dynamic cache window, rather than repeatedly expiring while being
  computed. This is a cache oracle, not an application frame measurement.
- 28 floor, support, whole-HF, wrist, mouth and dynamic-query cases pass. The two
  physical-geometry tests first reproduce green against frozen old modules;
  only their geometry source changes, preserving 43,200 top samples, 158,328
  exterior samples and the strict 2 m contact envelope.
- The production build passes in 17.49 seconds, and focused formatting passes.
  The served preview HTML/bootstrap/application/Bermuda closure remains byte
  identical, as do all 672 previously fingerprinted asset files. HEAD is unchanged.
- Scratch allocation checks compare 358,055 posed sphere records bitwise against
  the complete pre-fix implementation. Five poses, independent actors, stable
  cached references and disposal pass. No contact cache or model bytes change.

## Matched complete-scene diagnostic

Serial frozen-before/current-after Chrome runs use seed 71523, the same complete
Bermuda population (1,083 entities including the rare slot), High quality,
1280 by 800 pixels, DPR 1, staged protected 10 m positions, natural clocks and
native slow swimming. Both warm for 2.5 seconds before an eight-second sample.
The host is an Apple M6 Mac mini with 32 GB memory; WebGL uses ANGLE Metal.
CDP CPU profiling and WebGL disjoint timer queries are enabled in both runs.

| Diagnostic location | Main-loop CPU ms/frame before → after | World-segment CPU ms/frame before → after | GPU mean ms before → after |
| ------------------- | ------------------------------------- | ----------------------------------------- | -------------------------- |
| Near guarded jewel  | 190.42 → 78.35                        | 89.04 → 10.44                             | 12.22 → 11.70              |
| Rear position       | 88.38 → 48.22                         | 48.11 → below retained top-stack list     | 7.92 → 7.58                |

The first row supports a substantial reduction in measured main-thread work.
GPU cost changes only modestly. The rear camera is partly occluded and serves
only as a CPU-location diagnostic, not as visual floor acceptance. Different
frame counts and capped simulation steps produce slightly different final
positions; these are matched fixtures, not pixel-identical runs. Long contact
index rebuilds can still occur during wrist transitions.

Headless frame intervals include substantial scheduling/profiling overhead and
are not presented as native playable FPS. These short samples do not measure
the user's computer temperature, power, thermal throttling or long-session
comfort. A physical-device thermal improvement is unverified.

A separate, unintegrated swept-patch broad-phase prototype is retained under
`swept_patch`. It bounds posed contact spheres over the complete existing wrist
arc rather than rebuilding a complete instantaneous grid for every reference
pose. Its finite exact-query checks pass, but it has not been measured in the
complete scene and is not included in the runtime changes or the table above.

## Actual-scene visual check

The fixed-time paused complete scene yields three legal rear-floor camera
stations, each with 16 frames over a 3.2 m camera translation. Every camera
passes cave containment, original-floor clearance, the real static/dynamic
camera-body solver and actual upward-floor first-hit rays. The complete walls,
model and original scene lighting remain. Four legal near/wide stills show
closed/open wrist poses; source hashes remain unchanged and no browser errors
occur. The north sequence has readable rear-body and ground context. The south
sequence mostly shows the steep floor and remains auxiliary evidence.

Representative first/last north frames show the native ground consistently
without the former duplicated render surface. This is a bounded moving-camera
visual inspection, not proof that every cave pixel is artifact-free. The actual-scene observer is paused. A separate fresh model-inspection recording
shows a complete 10.8 s whole-body cycle and a second 10.8 s wrist/jewel cycle,
using neutral inspection lights without cave terrain. Both cycles reach fully
closed/open poses with zero jewel drift and no browser error. Only 51 distinct
renders per cycle are captured in this headless run; the encoded output cadence
must not be confused with live game FPS. The first recorder attempt failed on
an obsolete import-parser endpoint and is retained; a new task-local script
reads the current whole module and succeeds. The delivered combined video burns
in the inspection/paused-camera scope because canvas recording excludes DOM
captions. The observed sequence must not be presented as measured live
FPS or a completed adult expedition. The initial setup's `lights: 0` field is
an invalid mesh-only count, not an assertion that the scene lacks lights.

## Remaining playable gate

The present local paw model is not fully accepted for 30 m play. The original
portal south closure intersects ordinary wait/body volumes, and the Squid30
approach still conflicts with the joint palm/seat/common-floor envelope.

An isolated cave-only widening moves the south opening from row 6 to row 3 and
widens the annex by 10 m on each side. Fifteen tested wait/dock avatar poses then
clear actual shell triangles and the unchanged common body solver. That isolated
result does not validate full-ocean food placement, single-exit traversal or
native escape and is not integrated merely to turn a fixture green.

Finite Squid30 investigations retain the real avatar, complete physical stone,
original seabed and exact palm. At the tested side approach, palm intrusion
begins before the unchanged 8 m pickup range. Two small yaw/pitch alternatives
clear the palm but are raised by the real jewel-seat south ring, leaving the
mouth 8.37–8.56 m from the jewel. Cutting only the outer south ramp cannot solve
that floor constraint. A separate, unintegrated 0.30 rad wrist trial finds a genuine local Squid30
geometric pickup point at 7.999 m, with 0.291 m palm clearance and no actual
avatar/skin/stone triangle intersections. Four static contact leaves and
18 instantaneous moving spheres still falsely block that point. The existing
continuous-contact proof covers only 0.26 rad; no angle, cache, contact or route
change from that trial is integrated. A local geometric point is not a
continuous movement or escape pass. Failed trials and their geometry witnesses
are retained.
Do not turn actor-only or protected small-player observations into a claim of
complete adult collection/escape acceptance.

## Rollback boundaries

The independent segment filter, far-lord sight guard, waypoint cache and scratch
allocation can each be reverted without changing saves, populations or gameplay
constants. Rendering can independently restore its original index while keeping
the same complete source geometry and contacts. Preserve all prior accepted
preview services, raw assets, source snapshots and rejected trials. The task-owned
baseline listener, verification browsers and development listener are stopped;
the existing preview, tunnel and awake processes remain.
