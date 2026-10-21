# Graphics-context recovery — 2026-10-22

## Report and scope

The user reports a real-phone stall when entering the Atlantis plaza gate from
the shallows, followed by dark, detail-free surfaces after pressing Continue.
The supplied screenshot shows Smooth quality, intact HUD/emissive details and a
partly colored shell alongside dark architecture/player surfaces. This is a
rendering failure report, not acceptance of the preceding performance candidate.
The current agent works independently on `art/atlantis-hf-redraw`, preserving the
accepted city checkpoint `5c70e44`, prior uncommitted optimizations, art, gameplay
and existing preview services. No new commit/push or formal release is authorized.

## Confirmed defect and evidence limits

Actual `WEBGL_lose_context` cycles in native Chrome and desktop WebKit demonstrate
that the procedural PMREM environment retains its JavaScript texture reference
but loses its GPU contents. A 32×32 GPU sampling probe changes from a mean RGB
value of 19.8330 with 694 nonblack pixels to completely black after restoration;
pressing Continue does not reconstruct it. Day/night/ice environments are generated
render targets, unlike ordinary textures whose retained CPU images can be uploaded
again. The independent Guide renderer has the same ownership issue.

The complete user screenshot failure was **not** reproduced on this host:
ordinary stone/color maps still render in the initial forced-loss experiment.
The phone's original loss trigger and whether additional driver/texture failures
occur remain unverified. Neither a desktop WebKit engine nor a 390px touch viewport
is physical-phone evidence. Earlier resume-button tests did not compare restored
appearance and cannot establish that this defect was absent.

The [Khronos recovery guidance](https://wikis.khronos.org/webgl/HandlingContextLost)
requires recreating GPU resources after loss. Implementation was checked against
this repository's pinned Three.js 0.180.0 `WebGLRenderer`, `WebGLTextures` and
`PMREMGenerator`, rather than assuming current online APIs match this version.

## Repair

- A bounded environment cache remembers the selected day/night/ice variant,
  invalidates stale generated targets and recreates the active variant. Other
  variants remain lazy. Ordinary asset caches and source images are preserved.
- Recovery freezes world advancement and disables Continue until environment,
  material programs and a first render are ready. It preserves the player's
  paused state and never automatically resumes combat.
- A second loss or disposal invalidates an older async completion. Failed rebuilds
  retain the existing localized refresh guidance and do not reopen Continue.
- The Guide independently restores its own environment. Generated targets are
  retired during the lost phase, before new-context reconstruction; deleting old
  context handles after restoration produced WebKit errors in an intermediate
  candidate and is not treated as a successful verification.
- Pinned Three.js old geometry/instance disposal listeners and texture-property
  records also retain invalid context handles. Retire those GPU buffers and clear
  the lost renderer's property table while its context is lost. Preserve actual
  CPU geometry, instance morph state, source images, texture ownership and
  application disposal subscriptions (including bilingual reward labels).
  Ordinary texture disposal is deliberately not used as a GPU-reset operation.

## Verification record

Raw diagnostics and superseded candidates are preserved in
`.local/atlantis_context_recovery_20261022/`. `baseline_fingerprints.json` describes
the immediate pre-fix performance candidate, not the older accepted commit.
`before/` and `webkit_before/` contain original environment-loss probes;
`candidate/` and `webkit_candidate/` show rebuilt environment pixels.
`verify_graphics_recovery.mjs` exercises real loss/restoration for day/night/ice,
Smooth/High, retained CPU-backed texture pixels, pause/Continue and Guide recovery.
Final measurements and delivery receipts are recorded after completing the repair.

Phone acceptance and the original stall trigger remain open. No physical-phone
FPS, thermal or crash-rate improvement is claimed by a successful forced-loss test.

Final development verification: all 1,552 tests, formatting and build pass. The
serial native Chrome and desktop WebKit runs each cover three regions × two
quality modes × two actual context-loss cycles. All 24 matched restored world
images are pixel-identical to their frozen pre-loss images; sampled ordinary maps
and environment pixels also match exactly. The second recovery has the same GPU
resource counts as the first warmed recovery. Both engines additionally exercise
loss during play, a deliberately delayed rebuild, ignored Continue activation,
a second loss during that rebuild, and independent Guide recovery. Player time,
health and position remain frozen. Final runs report no browser/WebGL errors.
These are controlled desktop-engine tests, not a reproduction of the entire
physical-phone incident or a proof of zero driver/heap memory growth.

The before/final source comparison preserves every earlier candidate input except
the three runtime recovery consumers and their three entry documents. No model,
texture, audio, gameplay or collision input changed in this repair.

Restricted-preview verification: the same origin now serves
`index-ObRTUt1J.js`. All 256 dist/local/public artifacts match byte for byte
(75,082,070 bytes, including compressed companions); eleven source/private paths
are rejected on both origins. Native production flows for four players × English
desktop/Chinese touch emulation pass Guide/start/ability, actual context loss,
restoration, manual Continue, pause/Home and same-address refresh, with no browser
errors, failed resources or production debug hook. The original four service PIDs
and logs remain intact. Formal main/Pages remains v0.11.15 / `3aef21e`.

## Local checkpoint authorization — 2026-10-22

Accepted rendering checkpoint — 2026-10-22: the user requests committing the
current performance and graphics-recovery candidate, then separately improving
Kraken motion and camera clipping through large pursuers. All 1,167 delivered
input hashes match before these acceptance-only notes. The recorded 1,552-test
and native/public evidence keeps its original scope; the original physical-phone
stall and complete black-surface incident remain unconfirmed on this host.
This authorizes a local checkpoint only, without push or main publication.
The following pending labels are historical for this checkpoint. New Kraken and
camera changes require separate review and remain uncommitted by default.
