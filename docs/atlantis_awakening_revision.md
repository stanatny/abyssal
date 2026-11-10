# Atlantis shared awakening — 2026-11-10

The accepted Giant Squid sprint refinement is locally committed as `f45b12d`.
This separate Atlantis revision remains uncommitted for review. Main/Pages stays
at v0.11.26; no push, release or version bump is authorized.

## Changes

- **Fitted eyes:** the old glowing spheres sat at local Z = 3.35 while the real
  HF eye sockets are around Z = 1.8. The new glow uses the original face's
  triangles, with a soft eye-shaped fragment mask and a small depth bias. It
  adds no projecting eye volume and keeps ordinary depth testing/occlusion.
- **Larger lift:** shoulder/elbow travel increases from 0.8 to 1.35 radians.
  The hand and complete trident retain the same rigid transform. Normalized
  trident-tip rise increases from 4.18 to 7.71, about 85%; the city's 1.55 scale
  makes this about 6.48 to 11.95 world metres. Body and feet stay planted.
  UV-coincident vertices share smoothed arm weights, while fixed body and rigid
  hand/weapon constraints prevent spikes or a sliding grip. The original mesh,
  texture and sculpture identity remain.
- **Shared completion:** the active mechanism's solved state now starts the
  same awakening in the ocean update, covering water, light and mural puzzles.
  Repeated updates continue the existing animation without restarting it.
  Common quest audio/objective settlement stays once-only in its original path.
- **Stronger mistakes:** water-level failures increase from 15 to 30 health;
  mural mistakes increase from 15 to 30 base damage. Water retains its fixed
  health cost; mural retains ordinary armor handling (20 for Mechanical Shark).
  The water puzzle still closes all valves and drains; mural still preserves
  passed gates and retries only the current gate. Both retain three-second
  recovery and contact protection. Light adjustment remains free, with no new
  failure state or penalty. Clues, placement, random exclusivity, keys, guardian
  and chest requirements are unchanged.

Guide, in-world hints, completion/failure notices and English localization are
synchronized. Completion does not reveal a puzzle answer in advance.

## Evidence and limits

Receipts are kept in ignored `.local/atlantis_awakening_revision_20261110/`.

- The accepted sprint checkpoint matches all 2,162 delivered source inputs and
  969 served artifacts before acceptance-only notes and local commit.
- Existing 61 focused checks and two quest-audio checks pass. Added regression
  coverage includes all three awakening families, no unsolved activation,
  pause/restart behavior, exact eye-surface ownership and bounded disposal.
- Independent actual Three.js skinning samples cover 136 angles from 0 to
  1.35. Maximum triangle-edge extension is 2.0282, within the existing 2.2 bound;
  the bound was not relaxed. Fixed-body error is zero and hand/weapon rigid
  displacement agrees within floating-point tolerance. UV duplicate weights
  match, original geometry is unchanged, and instances/resources stay separate.
- One host-side constructor sample is 41.2 ms cold and 6.8 ms with the same
  source's cached binding. This is construction evidence, not a frame-rate or
  whole-load improvement claim. Geometry/material changes are bounded to two
  eye patches and a separate tip-glow material; no texture download is added.
- Matched real-scene front/profile/full-body inspection compares the accepted
  baseline against the candidate with the same material and camera. These
  directly staged poses are visual inspection, not evidence of solving a puzzle.

Seven native main-loop cases pass (`native.json`). Actual waterwheel contacts
and mural crossings charge exactly 30 health for Orca; Mechanical Shark pays
30 for water and 20 for mural. The health setter trace separates the single
damage charge from ordinary regeneration. Continuing contact through recovery
does not repeat it. Water resets every valve; mural preserves its passed gate.
Water, light and mural are then completed separately through native contact or
crossing, each settling one objective, one mechanism cue and one continuing
awakening. Pause freezes progress and reset extinguishes the eyes/restores pose.
The fixture stages station starts, hides ambient enemies/food and places the
mural clock in a known symbol window. It does not prove natural discovery,
memory performance or full-expedition survival. Earlier fixture failures used
an invalid expectation of a returned valve-toggle event or sampled health too
strictly after regeneration; their receipts remain separate.

The compiled preview rebuild succeeds with its bounded cold-loader intact.
All 969 runtime artifacts match the served local build. Public HTML, entry,
localization, bootstrap and stylesheet bytes match; source, Git and local
evidence paths return 404. Two fresh no-cache public contexts pass: Chinese
1280 px desktop initializes in 63.3 seconds; English 390 px touch emulation in
68.0 seconds. Native Atlantis start/pause/resume/Home and both updated Guide
descriptions pass without request, HTTP, console or page errors. Compiled builds
expose no development hook.

The eight-second H.264/1280 × 720/24 fps clip decodes without errors. Encoded
frames show the old floating eye sphere beside the fitted replacement, followed
by the full candidate lift. The clip uses paused-world inspection cameras and
the statue's real update method; it illustrates the effect, while the separate
native checks establish the three puzzle triggers. Physical phones and a full
unassisted survival/memory run remain outside this controlled revision's evidence.

## Accepted main integration — 2026-11-10

The user accepts the delivered changes and authorizes their commit and push to
main as v0.11.27. Recorded source inputs match before publication-only metadata
and documentation updates. Earlier uncommitted/unpublished statements retain
their historical scope. See the [integration record](release_v0_11_27.md) for
included checkpoints, validation and formal delivery. No tag, separate GitHub
Release or personal Skill update is included.
