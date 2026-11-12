# Zombie Shark split repair — 2026-11-12

Publication v0.11.29 — 2026-11-12: the user subsequently authorizes committing
and publishing this accepted repair together with startup progress to main.
See [the release record](release_v0_11_29.md). The uncommitted and formal-site
status below records the earlier candidate delivery before this authorization.

Status: separate uncommitted gameplay repair on `fix/zombie-split-ability`.
The user's preceding local-commit request was completed as `d12e612` for the
accepted startup-progress loader. No push, version bump or main/Pages release
is requested for either that checkpoint or this new repair.

## Reproduction and cause

The pre-fix compiled runtime reproduces the player's report through the native
Zombie Shark selector and J key in Hawaiian Waters. Health changes from 100 to
51 after the fixed sacrifice and a short period of normal recovery. The browser
reports `clearance is not defined`. The HUD incorrectly has a companion timer,
but still says Fission rather than offering a living companion's Detonate action.

The actual `resolveMinionMotion()` callback retained an open-water upper bound
of `WORLD.surfaceY - clearance` after a terrain-support revision removed the
local declaration. Formation calls that resolver immediately after the existing
atomic sacrifice. The exception interrupts initial positioning, before the
companion becomes active at the owner. Its model has been allocated, but is
still at the world origin with its initial unit scale. This explains the missing
effect and the apparently consumed skill. Ice and aether surfaces provide an
explicit ceiling callback, so nullish-coalescing can hide the same missing
variable in those capabilities.

## Repair

Restore the previous body-aware clearance in the actual shared world callback:
body radius plus the pitched axial extent and the original 0.4 m margin. Keep
the newer whole-body terrain support, dynamic/static collisions and explicit
ice/aether ceiling callbacks. No model, material, camera, formation, sacrifice,
feeding, blast, lifetime or cooldown tuning changes.

The regression exercises the actual function extracted from `main.js`, bound
to the real indexed collision and terrain-support solvers and the real
companion factory. Prior isolated minion tests supplied their own movement
resolvers and therefore could not detect this integration error. Capability and
synthetic terrain fixtures are distinguished from actual map play below.

## Verification

Evidence is retained in the ignored `zombie_split_20261112` task folder.

- `native_before.json` and its screenshot capture the actual compiled failure;
  the production build has no development game hook.
- The new integration file records 3 passing and 9 failing checks before the
  repair, with the failures caused by the real missing variable. After restoring
  the declaration, all 12 pass without changing assertions or tolerances.
  They cover 3/15/30 m, multiple headings and full-body surface clearance,
  explicit ice/aether precedence, actual formation/release, one payment,
  insufficient-resource rejection, the intentional lethal 50-health boundary,
  synthetic slope support and wall sweeping.
- The existing 49 focused Zombie Shark, emergence, corpse-blast and terrain
  checks pass, including real companion meals, active-clock protection,
  lifetime expiry, no-target commands and reset cleanup. These are new runs,
  separate from historical release-wide test receipts.
- The production build succeeds. Of 979 artifacts, 974 remain byte-identical
  to the startup checkpoint's fresh build. Only HTML and the main entry and
  derived bootstrap fingerprints change; other runtime, mesh, texture, audio
  and stylesheet bytes remain intact.

Nine native compiled flows pass across all eight maps: the six open-water
destinations use the English desktop J key, while Europa, Penglai and a second
Hawaii pass use Chinese at 390 px with emulated touch. Each starts from the
ordinary selector and spawn, produces a living companion, releases formation,
offers Detonate, freezes its countdown on pause and returns home cleanly.
Repeated early desktop input does not pay again. The Hawaii recording also
shows actual companion meals credited to the owner. Browser page/request errors
are empty and production has no development game hook.

`split_demo.mp4` is a 5.52-second H.264 / yuv420p, 1280 × 800 excerpt of that
native follow-camera recording; the cover is from the same first Hawaii flow.
The video and cover were actually delivered, and their separate media receipt
contains both the file and image resource keys.

The existing restricted preview was rebuilt at the same public origin, with its
prior runtime archived and no server/tunnel restart. Fresh public English
Hawaii/J-key and Chinese Mariana/emulated-touch flows both pass split, formation
release, Detonate availability, pause/resume and home. Their page/request error
lists are empty. The served bootstrap bytes match the candidate fingerprint.
All 979 current build artifacts match the served runtime. The two isolated
loopback test servers were stopped by verified PID identity and port ownership;
the player's existing preview remains available.

Current receipts include `focused_tests.log`, `world_motion_before.log`,
`world_motion_after.log`, `build.log`, `check.log`, `native_before.json`,
`native.json`, `public.json`, `artifact_changes.json`, `loader_idempotent.json`,
`video_receipt.json` and `delivery_fingerprints.json`. Formatting and diff checks
pass. This bounded callback repair uses targeted regression and native flows;
the historical full gameplay suite has not been rerun. The new repair remains
uncommitted and unpushed for player review; formal Pages is unchanged.
