# Penglai landmark navigation and Kun visibility

Penglai accepted for main release — 2026-10-27: the user explicitly accepts
all current map changes and requests committing and pushing them to main.
All 1,893 delivered input hashes match before release-only edits. This approval
supersedes earlier pending/uncommitted labels for these delivered Penglai
changes, including the repository Skill, ecology, landmark navigation and Kun
visibility fixes. Earlier entries retain their dated evidence and rejected
iterations. The release is v0.11.21; see [the release record](release_v0_11_21.md).
Fresh release CI and deployed-page checks are recorded separately from candidate
validation. Preserve existing services and historical worktrees.

## Report and reproduced cause — 2026-10-27

The user reports Azure Dragon and Sword Sage becoming permanently stationary
at the dragon-column landmark, including after the player changes direction or
leaves. They also have not encountered Kun. This report supersedes the earlier
limited finishing review: the summit patrol test did not cover pursuit around
the eastern columns.

A fixed-route harness uses the real Penglai scenery/colliders, lord
models, body probes and encounter state machine. Before the repair, Sage stops
at approximately `(329.57, 285.06, -596.24)` and stays there for three successive
30-second player destinations. Azure also has a zero-travel 30-second segment.
These are movement deadlocks, not an intended attack opening.

Movement tested an entire desired turn before bounded steering, tried only
forward/side/up approaches, and returned when all were rejected. A second guard
could also roll back the interpolated final attitude without trying another
route. Long bodies and the Sage's riding sword could therefore remain in a
valid pose with no accepted next movement.

## Correction

- Airborne Penglai guardians first try the actual bounded next-step attitude
  when the ordinary path is blocked. If necessary they choose a collision-free
  short retreat/lift, retain it for one second, then resume steering.
- The final attitude rollback also invokes this recovery for a movement request.
  This matters at lower frame rates; the first candidate without that branch
  still produced a long 30 Hz pause and was not delivered.
- Every accepted step retains the full existing body/attachment sweep, terrain,
  height and territory checks. Recovery does not teleport, shrink the collision
  envelope, hide a creature or disable a structure. Locked charge directions
  remain locked. The temporary route is cleared on restart and freezes on pause.
- The bounded fallback applies to Azure Dragon, Vermilion Bird and Sword Sage.
  Ground and underwater lords keep their existing movement. No combat numbers,
  attack timing, art, collision geometry or map shape changes.

## Kun is present, but the original route was too high

There were four Kun, at initial altitudes around 513 and 573 m. Automatic
species-rank altitude spacing had pushed the already high source homes upward.
Their old visibility radius was only 190 m in High and 150 m in Smooth.

There are still four residents. Two now patrol the cloud route north of the
monastery at 345/365 m; two remain high at 470/490 m. The fitted altitude band is
310–525 m. Only Kun/Peng receive the extended 280 m High / 230 m Smooth view
radius, avoiding a scene-wide culling increase. The ordinary population remains
393, plus the one rare creature.

Peng inherits the actual regional Kun habitat and visibility distances when
transforming. Previously its form definition inherited the raw species setup,
which would lose a later regional habitat fit. Entity identity, form/attack
values, transformation duration, respawn and return to Kun remain.

## Evidence and boundaries

Evidence is in `.local/penglai_navigation_20261027/`:

- `before.json`: both real-world navigation failures before edits.
- `trial1.json`, `trial2.json`, `targeted.log`: preserved development candidates,
  including the incomplete first recovery and 30 Hz failure.
- `targeted2.log`: 19 focused checks pass, including 180-second routes for each
  of Azure/Sage at 30 and 60 Hz, every-frame swept-body checks, actual attacks,
  bounded displacement, restart, sealed-obstacle and pause restrictions,
  summit sword clearance, all five lord support habitats, and Kun/Peng continuity.
- `native/` is an intermediate fixture. Its Sage was incorrectly left locked by
  disabling the required guardians; its `return/dormant` motion is not evidence
  of unlocked pursuit. The final native fixture bypasses only the Sage prerequisite for staging and
  checks actual engagement phases; the Node route tests exercise ordinary
  guardian defeat/unlock. A second intermediate fixture accumulated all five
  defeat IDs when switching isolated subjects and entered victory; it is kept
  under `native_fixture_rejected/` and is not final gameplay evidence.

Desktop Chrome
and automated rates are not physical-phone FPS, heat or battery measurements.
No new HF generation/quota, commit, push or main publication is part of this fix.

### Final verification

- `native_verified/report.json`: native Chrome from the recorded pre-fix
  stranded poses; Sage travels 450.3 m and Azure 97.8 m over their staged clips.
  Both naturally enter hunt, windup, attack and recover. No per-frame position,
  heading, visibility or attack forcing. Pausing freezes the actual encounter;
  restarting clears the detour and places exactly four Kun at the fitted homes.
  The near Kun is visible through rise/reveal and then naturally becomes Peng.
- `native_final/` is navigation-only intermediate evidence: its manual hunt
  setup retained an infinite dormant duration. It is not attack evidence and
  is superseded by the final fixture, which starts from dormant and lets the
  state machine establish durations normally.
- `full_tests.log`: **1,992/1,992 pass**; focused checks are **19/19**. Scoped
  formatting and `git diff --check` pass. Production build succeeds.
- `public/report.json`: English 1440 px and Chinese 390 px native browser flows
  select Penglai, start, pause, return home and reload the same address. No
  console/page errors, failed assets or production debug hook. The narrow case
  is desktop touch emulation, not an actual phone.
- `artifacts.json`: all **809** local/runtime files match, **232,472,056 bytes**.
  Fresh public and local HTTP hashes match the three changed artifacts;
  **806 unchanged** public files rely on the dated previous verification. Eleven
  source/config paths are refused; original service identities are preserved.
  The preview entry is `index-Di20e9Ud.js`.
- `source_preservation.json`: all prior model/texture inputs remain byte-exact;
  the ten changed pre-existing inputs are the scoped logic, tests and project
  records. Three new files supply recovery, its regression and this review.
- `delivery/navigation.mp4`: encoded game footage was sampled after encoding;
  it includes the existing passing cloud effect during the Azure segment.

The restricted preview is updated at the same URL; users should reload and
start a new expedition to receive the new code and fitted resident homes.
Formal main/Pages remains v0.11.20. Player acceptance of this fix remains open.
