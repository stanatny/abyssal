# Giant Squid sprint tentacles — 2026-11-10

The user accepts the front/arm capture correction and repaired trial loading.
Those changes are locally committed as `dd953af`. This separate visual refinement
increases the squid's sprinting arm motion and remains uncommitted for review.
No push, release, version bump or new generated asset is included.

## Visible change

The previous animation halved the arm wave during ordinary sprint, making the
trailing crown look stiff. Sprint now restores that wave and adds a bounded
distal increase, slightly larger on the two long feeding tentacles. Existing
phase offsets and joint delays keep the appendages moving at different times;
the added amplitude grows toward their tips rather than swinging the entire
animal. This is an expressive game adaptation, not measured animal kinematics.

The existing smoothed sprint/jet inputs blend the effect continuously. The
strong ink jet still takes over with its streamlined pose. Ordinary cruise,
phase/cadence, mantle and fin motion, feeding/carry overrides, root transforms,
movement physics and capture eligibility are unchanged. No geometry, texture,
material, skeleton, effect pool or render pass is added. The Guide describes the
new motion in both languages.

## Verification

Evidence is retained in ignored `.local/squid_sprint_revision_20261110/`.

- `measurements.json` compares the accepted builder with the candidate using
  actual skinned distal surfaces: twelve fixed vertices per appendage, one
  second of settling, then six seconds at 60 Hz with the same inputs and phase.
  Sprint lateral/vertical RMS rises to 2.36–2.38 times the old sprint on the
  eight arms and 2.52–2.54 times on the two long tentacles. Maximum sampled
  per-frame distal movement is 0.00267 normalized body lengths. Cruise has
  zero sampled difference. Jet differs by at most 0.00000221 body lengths
  during input convergence; at settled jet input the added sprint term is zero.
- The 69 focused tests pass, covering motion, actual distal deformation,
  pause/reset/instance independence, feeding transitions, capture, retaliation,
  Frenzy, rare settlement, progression and localization. The new surface test
  compares sprint against cruise at the same phase; its bounds use a different
  baseline from the before/after measurements above.
- `video.json` records four matched three-second runs: before/after side views
  and before/after native follow views. Native Space input moves a 6 m squid
  about 95.85 m in each run at the unchanged 32 m/s sprint speed. A controlled
  30 Hz clock suspends the normal render loop; staged positions and hidden
  surrounding creatures isolate the motion. The side camera is an inspection
  angle, while the follow camera is the regular gameplay camera.
- The final H.264 comparison is 1280 × 720, 30 fps and twelve seconds long.
  It decodes without errors. Encoded side/follow frames show the continuous
  trailing wave without a detached arm or whole-body flip. The follow view
  naturally shows a smaller silhouette; the side view makes the change clearer.

Eight native capture rechecks also pass (`native_capture/native.json`): front
capture beside a wall at both headings, the original arm intake consuming a
near-sized retaliating hunter before damage, oversized rejection, solid-wall
occlusion, native sprint pursuit of a normally moving Mariana rare, Home cleanup
during carry, and bilingual Guide entry. Carry completion still uses the true
mouth and awards only one meal; pause freezes the in-progress carry.

The preview manager rebuild succeeds and preserves the bounded cold-loading
bootstrap and existing service identities. All 969 compiled files match the
served local runtime. Public HTML, entry, localization, bootstrap and stylesheet
bytes match the build; source, Git and local-evidence paths return 404.

Two fresh public Chrome contexts with HTTP caching disabled pass: Chinese
desktop initializes in 52.7 seconds and English 390 px touch emulation in 44.9
seconds. Both complete native squid/Mariana selection, play, input, pause/resume,
Home and the updated Guide entry. The desktop also uses native sprint input.
Neither run has failed requests, HTTP errors, browser errors, duplicate static
module requests or a production development hook. Observed full-flow peak is
23 concurrent requests, retaining the eight-worker module bootstrap. The
compiled entry is `index-U5zPIrJb.js`.

These controlled desktop checks do not establish natural full expedition
coverage, accessibility on every network, physical-phone behavior or a
frame-rate improvement. Player visual acceptance of the new motion is pending.

## Accepted local checkpoint — 2026-11-10

The user accepts the delivered sprint refinement and authorizes a local commit
before a separate Atlantis awakening revision. All recorded source inputs and
served artifacts match the reviewed candidate before these acceptance-only
notes. Existing verification receipts keep their documented scope. Earlier
pending/uncommitted statements describe the pre-acceptance stage; no push,
release or version bump is included.

## Accepted main integration — 2026-11-10

The user accepts the delivered changes and authorizes their commit and push to
main as v0.11.27. Recorded source inputs match before publication-only metadata
and documentation updates. Earlier uncommitted/unpublished statements retain
their historical scope. See the [integration record](release_v0_11_27.md) for
included checkpoints, validation and formal delivery. No tag, separate GitHub
Release or personal Skill update is included.
