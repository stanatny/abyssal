# Europa research-ship interior expansion — candidate, 2026-10-26

Publication scope — 2026-10-26: the user requests a final audit and main
publication if no blocking work remains. The audit clears this delivered scope
for v0.11.20. Earlier pending, rejected and no-push statements below retain their
dated revision context; superseded appearances are not restored. See the
[release record](release_v0_11_20.md) for final scope, verification and limitations.

The user finds the delivered four-room ship too small and sparsely furnished.
The current AI agent owns this follow-up; prior Europa work is preserved, with
no commit/push. Evidence is in `.local/europa_cabins_20261026/`.

## Brief

Expand the pressure gallery from 184.8 × 79.2 × 66 world metres to
353.6 × 93.6 × 78. Keep the real open ends and side breach, and enlarge the
supporting rock bench without changing map bounds or creature/gameplay values.
Six compartments add a sample archive and an unmanned-probe hangar around the
command, wet laboratory, living and engineering spaces. Wide main doorways
serve adult players; the existing smaller high service route remains a side loop.

Use physically fitted equipment, cable trays, ventilation, worn floor panels,
reinforced doors and distinct room silhouettes. All abandoned machinery remains
unpowered; existing attached organisms supply restrained natural light. Generate
one new original HF sample-analysis workstation and reuse its immutable surfaces.
Other fitted cabinets, pumps, probe cradle and pressure structures are procedural.
This is an explorable wreck, not a new loot, enemy or objective system.

Validate full-footprint support, 32 m continuous routes/turns, normal lighting,
shared asset preparation/release, scene cost and actual native follow-camera
movement. Deliver real scene stills and a tour. Phone performance is unmeasured.

## Implemented candidate

The gallery is 353.6 m long (previously 184.8 m), 93.6 m wide and 78 m high.
This is a 91% length increase and an 18% width/height increase, not a doubling
of every dimension. Five real bulkheads divide six rooms. The main corridor has
46.54 m clear width; both open ends and the existing side breach remain usable.
The raised service loop retains its separate 10/16 m body contract. Main-gallery
and breach tests use a complete 32 m body, including turns and pitch recovery.

The archive contains sealed core canisters and an HF sample analyzer. The wet
laboratory reuses that immutable analyzer surface alongside existing sample tanks.
Command instruments, sleeping restraints, cabinets, engineering vents and pumps
add distinct uses to the original rooms. A pressure-bodied unmanned probe rests
in the new hangar's maintenance cradle, with ducts, folded control surfaces, a
forward lens and hoists. Floor sections, cable runs, ventilation and geometric
room markers add close detail while keeping the central route clear. Machinery
remains unpowered; no extra dynamic lights or rewards were introduced.

An original concept was exported through Microsoft TRELLIS.2 on Hugging Face,
seed 746081, as a 4,612,328-byte GLB. The source had 94,929 triangles; the
fitted/rebaked game analyzer has 12,274 triangles. Its 341,482-byte WebP and
593,512-byte packed mesh are shared by two placements. The source GLB, seven
raw inspection views, conversion and color-projection receipts are retained in
the ignored evidence directory. This is one actual generated machine; the
traversable ship, fitted furnishings and probe are procedural structures.
Included quota only was used; no paid overage was authorized.

The supporting bench was widened across the full ship footprint. Initial tests
found an existing side ledge inside the newly extended hangar. The rock factory
now reserves the complete ship footprint, moving overlapping rock surfaces and
their collision volumes together onto the surrounding bed. A lattice check
across all six interiors finds no external rock penetration. Animal meshes,
movement, combat, population, map bounds and other regions are unchanged in
this follow-up.

## Verification

All paths below are relative to `.local/europa_cabins_20261026/`.

- `tests_04.log`: 11 focused checks pass, including complete hull/foot/debris
  support, visual/solid transforms, 32 m main and breach routes in both
  directions, adult turns, smaller service-loop turns, valid normals and the
  external-rock regression. `full_tests.log`: 1,867 / 1,867 pass on the final code.
- `native/report.json`: two Europa → Hawaii cycles confirm 352 ordinary animals
  plus the exclusive rare, all three scenery textures loading on ordinary entry,
  shared analyzer geometry/material/texture identities and disposal on exit.
  The later room tour runs in the populated actual scene. Resource counters
  include other warming game caches; disposal events are the specific evidence
  for these scenery owners, not a claim that all cached resources disappear.
- The actual 30 m player travels approximately 438 m through the six-room ship,
  from local z=80 to z=-88.459, with the ordinary follow camera and no per-frame
  position override. Final collision state is unblocked, unrecovered and unstuck.
  A subsequent pause freezes simulation time/position. One-time placement and
  invulnerability isolate traversal; this is not a natural full-round playthrough.
- Seven native inspection views show the exterior and each compartment, followed
  by ordinary adult traversal. Final encoded delivery footage is reviewed as well
  as the original stills. The first recording export exhausted the Node capture
  harness heap when serializing video bytes as a huge numeric array. The game
  had completed its tour; a bounded base64 export fixes the harness and the full
  final run succeeds. That tool failure is not counted as a game crash.

`final_structure_cost.json` records 64 ship mesh draws, 163,996 triangles,
63 geometries, 9 materials and 418 ship contacts (797 total regional contacts).
Thin floor panels, grille slats and seams use simple sharp boxes instead of
rounded geometry, reducing this new candidate from 272,044 triangles while
preserving its details. The previous four-room ship was 113,588 triangles, so
the final larger ship still adds 50,408 triangles and 26 mesh draws. Actual
scene samples range from 90–141 calls and 296,164–449,032 triangles. These
are rendering-cost counters, not FPS or physical-phone performance measurements.

Native review used the local M6 mini/Chrome environment. Physical-phone heat,
frame rate and a natural full expedition have not been measured. The appearance
awaits user review; this and earlier Europa work remain uncommitted/unpushed.

## Preview and delivery

The existing restricted preview has entry `index-eugRa7nN.js`.
`artifacts.json` compares all 674 runtime files (180,656,722 bytes) against
local restricted service, public origin and the built artifacts. Eleven source/
private paths remain refused on each origin; existing service identities
35213/23118/23120/35419 are preserved, with the previous runtime archived.
Formal main/Pages remains v0.11.19.

`public/report.json` passes native production entry, both landmark Guide entries,
start/ability/pause/Home and same-address reload in English (1440 px) and Chinese
(390 px). Six-room/353.6 m copy and all three scenery color responses are checked.
No console/page/network errors or production debug hooks were found. The narrow
case is desktop touch emulation, not a physical phone.

`source_preservation.json` checks all 1,706 preceding inputs: eleven existing
files change for this cabin/configuration/asset/Guide/test/document scope; none
are deleted. Prior animal assets, animation, gameplay and unrelated work are
byte-identical. Four screenshots and a roughly one-minute H.264 tour show
inspection views followed by actual ordinary-follow-camera adult traversal.
The review record remains a candidate until the user responds.

## Wider pressure halls and travel hitch repair — 2026-10-26

The user found the six-room candidate still too narrow, small and plain, and
reported stepped-looking travel. That delivery is historical evidence, not
acceptance of this revision. Evidence for this follow-up lives in
`.local/europa_cabin_refinement_20261026/`; no commit/push is authorized.

### Space and construction

The pressure gallery now measures 489.6 × 188.25 × 119.25 world metres internally
(previously 353.6 × 93.6 × 78). The central door clearance increases from 46.54
to 131.7 m. This changes the cross-section and raises the ceiling; furniture is
relocated to the expanded wings instead of being stretched across the new width.
Six distinct compartments and the smaller elevated service loop remain. Existing
HF command/analyzer assets are reused; this pass consumes no HF generation quota.

Wider pressure rings have visible webs, flanges and mechanical fasteners. Layered
wall cassettes include recessed borders, locking plates and sections of exposed
thermal insulation. Separate ceiling panels and supported service pipes replace
the empty overhead surface. Floor plates have physical seams and restrained room
markings. Repetitive sinusoidal scratch stripes are removed from the material;
wear is applied to diffuse color before lighting and tone mapping.

The ship moves west within the existing world bounds, with a fitted wider rock
bench and relocated external obstacles. The command module sits over the forward
archive. Main descent still reaches the same habitat anchors, using a measured
west-end detour around the larger solid hull instead of the old straight
landmark-to-landmark test segment. No habitat anchor, game bounds, creature mesh,
swimming rate, combat rule or player-control value changes in this follow-up.

### Measured travel hitch

A fixed-seed, normally populated native-Chrome route at 1440×900/DPR2 reproduced
an isolated stall near a local light boundary. There was no body contact or
zero-displacement movement. The CPU profile spent 1,015 ms in
`getProgramInfoLog` in the Smooth run; the rendered frame took 1,030.6 ms. Europa
was changing `PointLight.visible` while entering/exiting source ranges, producing
new light-count shader variants during play.

The three-light pool now stays visible and switches intensity to zero outside
range. The isolated light repair preserves source position, color, intensity, radius
and the three-light budget; the ship expansion separately moves its existing
colony light with the relocated equipment wing. No exposure, bloom, resolution, frame cap, AI rate or movement value
is reduced to achieve the result.

| Native 18-second route | Before High / Smooth | Light repair only High / Smooth | Expanded ship High / Smooth |
| ---------------------- | -------------------- | ------------------------------- | --------------------------- |
| Longest frame, ms      | 94.2 / 1045.9        | 19.9 / 21.2                     | 20.6 / 21.6                 |
| Frame p95, ms          | 18.4 / 18.5          | 18.3 / 18.5                     | 18.3 / 18.5                 |
| CPU frame p95, ms      | 4.6 / 5.1            | 4.5 / 5.0                       | 4.6 / 4.9                   |
| GPU mean, ms           | 10.62 / 3.24         | 10.54 / 3.46                    | 10.93 / 3.93                |

These are individual comparable desktop runs, not a sustained-FPS improvement
claim or a physical-phone measurement. The expanded architecture adds some GPU
work; the benefit is removing the reproduced compile hitch. Other causes of
stutter on a particular phone remain unmeasured. Native route reports and CPU
profiles retain raw frames rather than only summary averages.

The first long tour recording exhausted the test player's food and reached the
game-over screen. It is retained as an invalid tour fixture. The replacement
refills hunger during inspection and declares that setup; it does not pin player
position per frame or bypass terrain collision.

### Final verification

- 19 focused checks pass, including the 32 m main/breach routes, continuous
  breach turns, 10/16 m service-loop turns, complete support footprints and
  ordinary 3/15/30 m external descent/arch routes. The bench transition is kept
  outside the older arch foundations so widening the ship does not lower their
  crowns into the swimming lanes. Seep towers and nearby ledges move with their
  visible/physical surfaces, not by suppressing contacts.
- All 1,868 tests and the formatting check pass.
- `native_release/report.json`: two full Europa/Hawaii cycles preserve 352
  ordinary entities and the exclusive rare; all four observed HF scene instances
  prepare and release their shared geometry/material/texture. Nine views show
  the exterior, halls and six compartments. A 30 m player travels 588.006 m
  through the actual ship with the ordinary follow camera, without contacts,
  recovery or stuck state. Pause holds time and position.
- `final_layout/report.json` is the final-layout performance run in the table;
  `before/` and `lights_fixed/` isolate the original stall and its repair.
- Ship cost is 63 meshes, 212,788 triangles, 62 unique geometries and nine
  materials, with 418 ship contacts / 797 regional contacts. The earlier cabin
  candidate was 64 meshes and 163,996 triangles: this pass adds 48,792 triangles
  while removing one merged draw component. This is not a claim of lower GPU
  cost; measured GPU time is reported above.
- The final encoded tour is 85.22 seconds at about 59.88 fps, H.264 1280×800.
  Extracted wall and entry/middle/exit frames were inspected. The first 36
  seconds show inspection views; the remaining segment uses normal following
  and real displacement. Hunger refilling and invulnerability are fixture-only.
- The same restricted preview origin uses `index-Dfz7r0PN.js`. Native production
  EN/1440 and CN/390 desktop-touch flows load all three scenery colors, display
  the new 489.6 m Guide entry, play, pause, return Home and reload with no browser
  errors or exposed development hook. The 390 px case is not a real phone.

This revision remains uncommitted and awaits the user's visual/device review.

The final build has 674 files / 180,659,241 bytes, compared byte-for-byte across
`dist`, the restricted local origin and the public tunnel. Twelve source/private
paths are refused on both origins; no production development hook is present.
Service identities remain DEV 35213, preview 23118, awake 23120 and tunnel
35419, with a healthy metrics endpoint. Unrelated baseline inputs and every
existing model/texture are preserved (`source_preservation.json`).

Four final-layout stills and the 85-second tour were delivered through Lark.
Receipts are retained in the evidence `delivery/` directory. No user acceptance
of this newest revision is implied by delivery or technical checks.

## Staggered compartments, wall joints and bow guardian — 2026-10-26

The user rejects the preceding candidate's flickering walls and the single
end-to-end view through its enlarged gallery. They request distinct explorable
compartments and suggest the octopus-shaped lord as an exterior guard. Earlier
passing tests did not establish acceptance of that appearance.

The 489.6 × 188.25 × 119.25 m gallery envelope and its terrain supports remain.
Five real pressure walls now alternate their openings between port and starboard;
the clear door width is 53.1 m after the projecting metal jambs. Sample archive,
command, wet laboratory, living, engineering and probe-hangar rooms keep their
separate equipment. The side breach enters the laboratory, and the raised service
passage gives smaller bodies a return loop. The main route has broad room turning
bays; it does not require the player to shrink. Opaque-wall ray tests verify that
views from both ends stop before the far compartments. The regional Guide explains
these routes in English and Chinese.

The flicker was reproduced as depth competition between coincident pressure-wall
and reinforcement faces, including jamb edges seen from oblique cameras. The
redundant bulkhead rings are removed; the upper service wall is segmented at its
joints; remaining jamb caps project beyond the wall edge. Old overlapping wall
markings are removed. No transparent masking, disabled depth test, global polygon
offset, bloom reduction or renderer quality change is used. Matched 8,772-ray
surface audits find 192 duplicate coplanar hits in the prior builder and zero in
the final candidate. Native oblique movement captures and close-ups are separately
reviewed; finite samples are not a proof against every possible distant alias.

The existing `europa_lumen` instance moves to world (-232, -626.4, -789), outside
the bow, with a 135 m territory and the previous ceiling. Its existing body-sized
navigation is enabled so its mantle respects walls and rocks while hunting,
patrolling and recovering. Sixty-four patrol poses clear the actual terrain and
solids. There is still one Lumen and three Europa lords; health, speed, attack
timing, lash damage, rewards, species descriptions and victory conditions are
unchanged. In a staged native encounter, normal AI proceeds through hunt,
wind-up, attack and recovery. A real lash reduces player health from 100 to 62;
this is not a forced damage call. A separate invulnerable inspection-camera clip
shows its position relative to the ship.

Native verification uses populated Chrome, two Europa/Hawaii cycles, the existing
HF resource disposal checks, nine scenery views and pause. After one initial
placement, a 30 m player follows actual keyboard steering through all staggered
doors: 768.7 m travelled over 67.63 s. There are two brief `lord_body` contacts
outside the bow and no ship-wall contacts or stuck state. No per-frame position
pinning is used. Unit sweeps additionally cover 32 m bodies, both directions,
continuous turning curves, side-breach entry and the smaller-body service loop.
The previous constant-three-light shader-hitch correction remains untouched.

Evidence: `.local/europa_ship_exploration_20261026/` contains immutable before
snapshots, feedback, matched surface audits, pixel probes, patrol audit,
`native/`, `guard_final/` and `guard_show/`. The first guard fixture incorrectly
expected a navigation-ready field before that capability was enabled; its failure
is retained. The subsequent actual-body navigation run passes. Physical-phone
performance is unmeasured. Preview delivery and final check totals are recorded
below when completed. This is an uncommitted candidate, not a main release.

Final checks for this follow-up: **26/26 targeted**, **1,871/1,871 full tests**,
format check and production build pass. Current ship cost is 213,880 triangles,
64 meshes and nine materials (+1,092 triangles / +1 mesh from the rejected
candidate); world contacts are 822, including 443 ship contacts. No other prior
source inputs or generated assets changed, apart from the recorded 11 affected
files and one new guardian regression test.

Current-layout native profiling uses the same desktop/Chrome configuration as
the preceding report (1440×900, DPR2; effective High1.5/Smooth0.8), seeded live
population and actual keyboard steering for 18 seconds per quality, without
recording. High/Smooth frame p95 is 18.3/18.5 ms, maximum 25.2/24.8 ms; CPU p95
9.5/8.5 ms; GPU mean 10.25/3.49 ms. Both runs have zero blocked/recovered samples
and no zero movement. The path now turns through compartments and the guard has
moved, so these are current-layout measurements, **not an identical-route speedup**.

Public native checks pass for English 1440px and Chinese 390px touch emulation:
updated route/guardian Guide text, complete scenery color requests, ordinary
start/controls/pause/Home/reload and no production debug hook. The latter is not
a physical-phone test. The candidate entry is `index-CkqAhMbQ.js` at the existing
restricted preview; formal main/Pages remains unchanged. Final delivery includes
matched wall stills, continuous adult exploration footage and a separate exterior
guard view. These are game captures; the inspection camera and invulnerability
used for the exterior view are labeled separately from actual damage validation.

Final publication verification for the restricted candidate: all **674 artifacts /
180,660,826 bytes** match dist, local preview and the public origin byte-for-byte;
12 source/private paths are denied on both preview origins. The same four service
PIDs remain active. Final fingerprints record 1,712 inputs. The first delivered
exploration MP4 inherited a 1,000 fps container rate from its WebM source; it is
superseded by `compartments_60fps.mp4`, explicitly encoded at 60 fps. The guard clip
is also 60 fps. Raw captures and the superseded export remain in the evidence
folder. The correction concerns delivery encoding, not game simulation.
