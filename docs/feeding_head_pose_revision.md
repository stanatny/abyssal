# Rear-view feeding head motion — 2026-11-17

Publication accepted — 2026-11-18: the user authorizes committing and pushing
this delivered scope to main as v0.11.30, including the final Orca-only amplitude
refinement. Earlier candidate-only/no-push statements below retain their dated
scope. See [the release record](release_v0_11_30.md) for current verification and
deployment status.

The player reviewed the new prey-intake effect and asked whether a normal rear
view showed cheeks/jaws moving. Inspection found that Orca had no feeding jaw
motion, while real single meals moved Mechanical/Zombie jaws only about 4–5°.
The player then authorized a restrained local animation refinement. This extends
the uncommitted candidate on `fix/cache-air-aim-feeding`; v0.11.29, main and Pages
remain unchanged. No commit, push or asset regeneration is authorized.

## Changes

- Orca adds lower-jaw and head/throat support bones. A real single meal reaches
  about 15° of lower-jaw flex and 8.5% local head-side widening, with a small
  throat contraction/return. Its original closed mouth surface remains continuous;
  this is a swallowing flex, not a newly cut oral cavity or fish-gill animation.
- Mechanical Shark uses its existing jaw plus paired local armor-panel joints.
  Real intake moves the jaw about 15°; head-side plates rotate/slide outward
  modestly, producing about 5.7% local widening without scaling the armor hull.
- Zombie Shark and its same-model companion use about 16° jaw travel and 8.4%
  local head-side widening. Their actual jaw-parented mouth anchors move with
  the posed skin. Each actor retains its own feeding pulse.

The existing feeding clock supplies the smooth pulse and return; no new timers
or animation loop are introduced. Original bone indices 0–6 stay stable. Each
rig gains two local bones; Mechanical hardware explicitly receives the original
seven supports so new cheeks cannot accidentally acquire fin hubs. Source mesh
positions, indices, UVs, textures, triangle counts and materials are retained.
There are no added meshes/lights for this pose. These structural bounds do not
claim unchanged frame rate, battery use or phone thermals.

Tail/flipper swimming, root movement, torpedo launch hardware, original capture
rules, rewards and Giant Squid remain unchanged. Orca's idle mouth coordinates
are preserved exactly. The prey intake continues toward the actual moving mouth.
Normal player-camera behavior is unchanged.

## Verification

- 173 focused Node checks pass, including 10 new geometry/animation regressions
  and existing feeding, Squid, fin-motion, launcher, companion and resource checks.
  Source formatting and diff checks pass; the compiled preview builds successfully.
- Actual deformed vertices are checked through the pulse, not just bone angles:
  normalized weights, coincident UV seams, non-reversed head faces, mouth-to-skin
  attachment through growth/transformed parents, independent instances, pause,
  reset and shared resource lifetime. Sampled head opening combines seven feeding
  levels with swim poses for both sharks. Existing index assertions now validate
  the actual skeleton size instead of assuming seven bones.
- Frozen original source supplied the baseline through a task-only local Vite
  plugin. Native rear, side and lower-quarter views were captured for all three
  exact player avatars before and after the change. The first live baseline run
  was interrupted by development hot reload; the subsequent companion fixture
  initially let the owner reach its prey first. These unsuccessful probes are
  retained separately. Disabling task-server hot reload and placing companion
  prey laterally isolated the intended capture without changing gameplay code.
- The final native candidate completed three consecutive meals for each ordinary
  character and one companion meal, with no page errors. Initial prey placement
  is controlled; capture, movement, intake and animation run through the real game
  loop. This is not an unassisted full expedition or physical-phone test.
- The rebuilt public preview was loaded in a fresh browser and started as Orca
  through the real picker, with no page errors and no production debug export.
- The review video retains the normal chase view at 1× playback. Its labeled inset
  is a magnification of the same frame. The comparison image uses controlled side
  and lower-quarter peak-pose views, with the old pose on the left and new pose
  on the right; it is separate from normal camera evidence.

Evidence, frozen source, raw captures and review artifacts are retained under
`.local/feeding_head_pose_20261117/`. The existing restricted preview is rebuilt
at the same origin with its previous runtime archived. Process identities and
source/runtime fingerprints remain in `.local/mini_preview_20261007/`. Stop only
the task-owned inspection server after verification, preserving the public preview.

## Stronger rear-contour pass after player feedback

The player still found the first motion too subtle. The current candidate therefore
prioritizes the actual rear silhouette rather than a zoomed mouth close-up:

- Orca's bounded cheek/neck support now reaches 32% local widening and clears the
  shoulder outline; nose width, outer flippers, rear body and root stay stable.
  The original rear-camera geometry projects about 16 px extra total width,
  with at least 8 px across 40 sampled rows at 1280 × 800 and 8 m body length.
- Mechanical head panels hinge/slide farther outward and Zombie head sides have
  stronger outward tissue motion. Local widening is about 29.5% and 31.9%.
  A controlled depth raster using the actual follow-camera function, including
  body occlusion, changes visible head spans from 40 to 64 px and 48 to 66 px.
  These are geometric/raster preflight measurements, not screen-size guarantees
  across all devices or camera states.
- Ordinary feeding holds its existing animation target for 0.26 game seconds
  before decay, yielding roughly 0.4–0.5 seconds at the readable open pose and
  then a smooth return. The hold freezes on pause, resets, and refreshes rather
  than accumulating on repeated meals. Giant Squid's original unheld recurrence
  remains bitwise identical across mixed frame steps and retriggers.

179 focused checks pass. New held-clock regressions cover frame rates, pause,
reset, retrigger, elapsed-time callers and exact Squid preservation. Orca retains
continuous seams and non-reversed sampled head/neck faces after excluding its
lower fin-root strip from lateral expansion. For the broader shark deformation,
a prior normal-direction comparison alone was too strict: a valid bulge can turn
a face beyond 90 degrees. Tests now execute the actual weight field and require
positive local deformation Jacobians, noncollapsed faces, consistent seams and
unchanged-mouth facing, alongside body-occluded rear projection. Original assets
already contain interior/rim overlaps; this does not claim a globally
intersection-free or watertight mesh. Native side and lower-quarter inspections
check the visible shell.

The final live-loop footage completes three meals per ordinary character and one
companion meal, including the closing phase, with no page errors. It keeps the
normal chase camera and 1× playback with no inset or magnification. Frozen
prototype sources match the final running code except an explanatory comment;
the exact comparison is recorded. Emulated 390 × 844 views additionally inspect
3 m avatars; no physical-phone playthrough is claimed. A fresh public browser
loads the rebuilt worker and enters the real game as Orca. Source formatting,
build and diff checks pass; the work remains uncommitted and unpublished.

Current evidence and artifacts: `.local/feeding_head_readability_20261117/`.

## Orca-only amplitude refinement

The player then found Orca's opening too large and artificial. Only Orca's visual
amplitudes are reduced: jaw travel 0.27 → 0.16 rad (about 15.5° → 9.2°), lateral
head support 32% → 18%, vertical throat support 3.5% → 2%, and throat drop
0.002 → 0.001 normalized units. The broader smooth support band and readable
feeding dwell remain. Shark poses, companion, shared clock, capture/rewards and
all previous cache/aim changes are byte-checked unchanged for this pass.

The compromise retains approximately 9 px of rear contour widening at the
controlled 1280 × 800, 8 m pose, versus 16 px in the exaggerated pass. The same
skin/anchor and pause/reset tests remain; revised species-specific bounds cap
jaw and local widening at the reduced target while retaining the previous rear
visibility threshold. 42 focused checks pass. Native rear, side and lower-quarter
views verify the lighter pose, and a live-loop three-meal capture verifies intake
and return. This is a controlled fixture, not a complete expedition or physical
phone test. The work stays uncommitted and unpublished.

Current refinement evidence: `.local/orca_feeding_refinement_20261117/`.
