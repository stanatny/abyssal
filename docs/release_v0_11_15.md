# v0.11.15 — Mechanical Shark belly-mounted torpedo

## Authorization and scope

On 2026-10-21 the user accepts the preview, requests commit/push, then explicitly
requests merging it into main. This release follows v0.11.14 / `80839ba` and
integrates `fix/mechanical-launch-presentation`. All 1,086 reviewed inputs match
before release-only version/footer/documentation edits. Earlier candidate-only
or no-push labels are historical for this accepted scope. The current agent
integrates alone; no tag or GitHub Release is requested.

## Delivered behavior

A visible torpedo hangs on a belly rack. Successful firing transfers to the
world projectile at the same nose position and scale. During the existing
two-second cooldown, the empty rack opens, a replacement descends from the
belly armor and the clamps lock shut. Failed casts leave the round loaded;
pause freezes replenishment and restart restores it. The old lower-jaw launch
hardware is removed, preserving the feeding mouth and accepted body/fin/jet
appearance. Guide descriptions and material readiness include the new rack in
both languages.

The physical origin intentionally moves to the actual belly mount. Payment,
instant input response, cooldown, target/homing rules, speed, range, swept
collision, blast and boss damage rules stay unchanged. Juvenile projectile
appearance scales proportionally; trail bubbles emerge only behind the traveled
tail rather than appearing under the body all at once. The torpedo mesh,
material and geometry are shared with the existing vehicle factory without
changing submarine instances. See [the implementation review](mechanical_launch_presentation_revision.md).

## Verification

The accepted candidate passed 35 focused /1,503 full checks. Native Chrome
covers 3/12/30 m, real repeated launches, sprint/turn, pause/resume and restart.
The accepted public preview has 203 byte-matched build files, bilingual Guide
and native play flows, same-address refresh and no production debug hook.
These candidate receipts are separate from release verification.

Release-only edits update package and bilingual footer to v0.11.15. Fresh format
and build checks, exact-main Node22 CI and Pages artifact/native-flow checks
are recorded under `.local/release_v0_11_15/`. A successful push alone does not
establish deployment. Confirm the exact workflow SHA and deployed bytes before
announcing the formal link as updated. Desktop touch emulation is not a
physical-phone test; no FPS or thermal claim is made.

## Operations

Preserve the existing preview/development/tunnel/awake process identities,
logs, archived runtimes and historical worktrees. Production includes only
`index.html` and `assets/`, without development hooks or source maps. The
preceding main checkpoint is `80839ba`; rollback requires an authorized revert
with matching version/footer metadata, without destructive resets or service
cleanup.
