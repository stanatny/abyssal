# Guarded treasure and awakening revision

Status: scoped checks, reviewed media and compiled preview verified for user review, 2026-11-22.

The previous G placement was rejected visually and is superseded. The treasure
now rests on a natural support beneath the titan's protective head/forelimbs.
The closed actual skin blocks a complete 30 m body; an unconscious breathing
opening must permit ordinary approach, collection and retreat or turning.
No skin intersection, invisible door, camera concealment or flag-only gate counts
as proof.

Taking the treasure adds one bounded awakening cue (roar/rock tremor) and visible
incipient waking. Camera feedback respects reduced motion and does not alter
movement or aiming. Audio follows actual pickup, with pause/mute/reset and late
loading checked. The original 60 active-second escape and existing hazards remain.

Previous candidate evidence remains in `.local/bermuda_lava_flow_20261121/`; new
evidence belongs to `.local/bermuda_guarded_relic_20261122/`. The previous video
and pass counts do not validate this revision. No commit/push/version bump is
authorized.

## Implementation notes (verification in progress)

- Replaced the wrist placement with a stationary amber crystal cluster on a fitted
  stone dais. The actual closed forelimbs block the approach; a smooth forward-body
  breathing lift opens the head/arm cover. No guard-dependent hiding is used.
- Large arm rotations and shoulder-only lifts were rejected after real mesh
  folding or insufficient clearance. A continuous vertical shear tapering to the
  rear torso preserves the accepted skin; CPU vertices, render normals, mouth
  anchors, dynamic bounds and contacts use the same deformation.
- Collection recovery offers 7.6 active seconds fully open, 1.2 seconds of advance
  closure warning, and 1.4-second transitions. Final-seal promotion preserves the
  exact current pose rather than snapping closed. Post-pickup hazards and the
  original 60-second deadline remain.
- Pickup sends one reused-HF roar/rock cue and a bounded camera tremor, respecting
  mute/pause/reset/reduced motion. Existing eye seams and dorsal material show
  incipient waking; no floating eye geometry or new lights were added.
- First real-world 30m approach correctly rejected a legacy rear-bed edge. Its
  evidence is retained; model-only passes are not gameplay acceptance.

## Verification checkpoints

- The real scene exposed an obsolete rear support edge on approach. Its eastern
  extension now tapers back to the original seabed, handing the foreground to
  the treasure dais; the western chest/rear support and original rear model stay.
- The front assembly is placed 1.8 m higher before fitting its supports. Actual
  30 m orca fin clearance is now +0.406 m at wait and +0.370 m at dock, while
  the real intake/heart distance stays 6.894 m (surface 5.558 m).
- The same real-world path is blocked by the closed forelimbs and clear when
  fully open. A forward turn and longer 36 m outer leg replace the old backwards
  test. The return joins the existing corridor at (-125,-600,-1518).
- A prepared native 30 m orca pickup triggered exactly one accepted-sample
  3.8-second roar through the actual game destination. Its later failed 8-second
  controller watchdog is retained as g03; this is not full-escape acceptance.
  The captured game mix is finite, peak 0.66245, with zero clipped samples.
- The recording environment remains slow: previous successful g06 median was
  69.95 ms, current sampled scene median 100 ms. A six-second CPU profile proved
  zero current velocity during the attempted approach. No player speed, physics
  time, escape clock or AI is replaced to conceal this limitation.
- Additional real-avatar cases and strict contact fitting remain under review.
  The initial 34/43 result and every rejected fold/fixture/collider case are
  retained; those partial results are not final acceptance.

## Supported character clearance

The production growth rule caps body length at 30 m. The current forward-entry,
real-intake pickup and resolved turning/exit checks pass for all four registered
characters at both 25 and 30 m (eight cases, `final_supported_routes.log`). These
use the real terrain, HF skin, visible avatar mesh, unchanged eight-metre pickup
condition and each character's real slow-swim/yaw rules. Zombie Shark requires a
three-metre lateral approach and a 90-degree northward turn; its exit continues
38.7045 m to the actual closed-body boundary rather than stopping at an arbitrary
36 m. Twelve intermediate visible-mesh samples cover its turn.

An earlier positive-route suite also required 32 m characters, which normal play
cannot produce. Its failed Zombie Shark oversized-turn probes remain in the
review evidence; they are not reported as passing or fixed. The positive route
suite now covers the actual 25/30 m product contract. The 32 m fixtures, separate
outside-wait check, Orca intake check and oversized contact-query tests remain.
This changes test scope, not the production length cap, pickup or collision rules.

Strict frontend-contact fitting passed 16 poses and 2,088 independent surface
rays, with no water-gap envelope above two metres (maximum 1.981953697 m). The
current front contains 42,010 contacts; provenance, actual rendered-vertex
coverage and reference query outcomes passed separately. These results do not
substitute for a full native expedition.

## Native test scope

A prepared 30 m Orca really collected the relic and triggered one accepted-sample
roar through the actual game destination. The full g04 escape attempt later died
of hunger after 40.274 active post-pickup seconds; it is retained as a failed
attempt, not a successful escape. The recording environment's slow rendering
limits motion under the existing frame clamp. Player movement, hunger, damage,
AI and the real escape deadline were not replaced or softened for a recording.

The final feature demonstration is deliberately narrower: a labelled stationary,
protected follow-camera inspection of closed/open/closed anatomy, followed by a
real 30 m native pickup followed by a 4.8-second excerpt of ordinary post-pickup
input, survival, camera tremor and the complete 3.8-second game roar. Its prepared seals and pre-pickup protection are
visible in the video. It must not be described as an unassisted expedition or a
complete escape demonstration. The earlier G09 movie belongs to its superseded
source state.

## Lava and support consistency

The new stone support originally inflated its contact top by 0.15 m while the
existing lava floor sits 0.12 m above the actual surface. Only this new stone's
top padding is now 0.05 m; bottom faces, footprints, mesh, floor queries, HF skin
and other supports are unchanged. All 1,600 upward-facing source triangles remain
fully covered by their indexed contacts (zero uncovered area), and 45,414 contact
probes retain the strict two-metre envelope. The stone still has 1,682 contacts and
1,728 visible triangles. Seven stone/site cases passed.

Lava candidates now use their own physical landing volume rather than a tall
character probe. Candidate qualification only rejects impossible static landing
skirts; actual current-pose mouth/flight/landing geometry still passes the full
140-cell check, with the existing eight-candidate/48-attempt budget. All 74 old
roof/impact coordinate pairs remain in the new site set for falling rocks.

The exact outside wait is a natural shelter. A legal 30 m body six metres above
it receives the actual 40-point molten-stream hit; the arrival area is threatened
without making every dodge position harmful. The old G point and current inner
approach point are blocked in the firing pose, so they cannot represent a legal
waterborne damage target. Landing sector labels alone do not establish danger:
complete east/south sheets can cross the actual near approach. Tests use real
body legality and real molten volumes instead.

The 32 protected Bermuda HF source files and the original rear-contact cache
remain byte-identical. No new generation, quota spending, commit, push or version
change belongs to this revision.

## Final source checks

- 72 focused rules, objectives, camera and audio cases passed.
- Eight supported-size character route cases passed (all four at 25/30 m).
- 26 final world/support/site/hazard cases passed, including all eleven world
  cases. Real phase transitions preserve a travelling tail after source shutdown,
  hot-pool damage followed by harmless cooling, actual off-centre cover, reset,
  all original roof coordinates and the exact fatal escape deadline.
- Formatting checks passed for the changed runtime, fixtures and review.

All failed source states, oversized probes, preparation attempts and recordings
remain available in ignored project evidence. No full-suite or physical-device
performance claim is made by these scoped checks.

## Recorded feature excerpt

The current-source raw effects_g05 run observed 10.383 wall seconds after the real
pickup. Health ended at 71.97265, hunger at 68.8561, and 49.6187 escape seconds
remained, with invulnerability zero. The accepted-sample 3.8-second buffer started
exactly once at the real pickup event; no page or console errors were reported.

The reviewed movie contains the labelled closed/open/closed inspection, the real
pickup and its first 4.8 seconds of feedback, including the complete roar. A later
close turn in the raw run lets nearby anatomy obscure the normal follow camera;
that raw view is retained rather than used as a cinematic or successful-escape
claim. The feature excerpt ends before the obstructed view. The raw run, its
original protocol label, full-length encode and all timestamps remain available.

The reviewed H.264/yuv420p and AAC MP4 is 24.821 seconds, 3,013,588 bytes. Its cover
and pickup/closing frames were inspected. The captured game mix is finite with
peak 0.676672 and no clipped samples. The 1,302 runtime-input hashes still match
the frozen capture source. Audio was numerically inspected; no subjective sound-
quality or loudness-comfort claim follows from that check.

## Compiled preview delivery

The production build and preview-loader preparation succeeded. One task-owned
browser exercised the compiled public URL in English and Simplified Chinese:
current stone-pocket Guide text, 390 px close-button/overflow checks, native Start,
Pause, Home and region switching all passed with no page or console errors.
Production debug controls were absent. The narrow viewport is desktop emulation,
not a physical-phone performance test.

Six publicly served files (HTML, bootstrap, entry script, CSS and both HF lava
maps) match the current build byte-for-byte. The same preview address serves a
new HTML hash; repository metadata, local state and source paths are rejected.
This is a host-side public-URL check, not confirmation from the user's network.
The long-lived restricted compiled preview, tunnel, awake process and immutable
runtime archives remain available. Only the task-owned development server is
stopped after verification. No GitHub Pages deployment was made.
