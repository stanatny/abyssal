# Mariana refuge loading wrap-up — 2026-10-25

The user asks to finish the preceding Mariana review. This candidate postpones
seven hidden-refuge color textures until the final descent. It preserves the
accepted models, animation, contacts, population and progression. Small buoys,
rock supports and arch/apron finishes remain optional; no further HF generation
or personal Skill change is needed. No commit or push is authorized this turn.

## Loading behavior

`mariana_refuge_buildings.js` and `mariana_residents.js` no longer request their
four and three textures during construction. `mariana_refuge.js` requests them
once at world Y <= -1800, before the final guardian and 600 world units before
the existing Y < -2400 visibility boundary. These are internal coordinates,
not the HUD's converted depth. Geometry and contacts still exist from map entry.

The shared material loader retains its six-request concurrency, deduplication,
fallback vertex colors, bounded retries, online recovery, cancellation and
last-owner disposal. A disposed refuge cannot start new work. Warm returns reuse
the seven loaded assets. A direct arrival under delayed/failed loading remains
visible with the existing fallback colors until preparation succeeds. There is
no new blocking dialog or per-frame retry loop. Long offline play still cannot
supply missing textures; reconnecting retries through the existing loader.

This postpones image transfer/decode only. It does not postpone mesh creation,
change collision readiness, pre-upload seven textures to the GPU, or reduce the
steady-state render detail. First-visible GPU work remains as before.

## Measured result and limits

Fresh native Chrome contexts request **7 -> 0** refuge color images at shallow
entry, with all seven new assets remaining idle and unmapped. An online event at
that depth does not start them. Descent past the threshold prepares all seven
while the refuge remains hidden; none is uploaded to the renderer at that point.

The seven unchanged production image bodies total **1,945,094 bytes (1.85 MiB)**.
Their nominal decoded RGBA8 footprint is **28 MiB**, not a measured process-RAM
saving. The bytes are deferred, not eliminated from a complete descent.

Three local entry observations per implementation were 1573/1595/1584 ms before
and 1735/1702/1587 ms after. These short selector-to-ready samples do **not** show
a stable entry-time gain and are not an FPS, CPU, GPU or thermal benchmark.
The demonstrated benefit is narrower initial resource preparation. There is no
physical-phone measurement or claim that this fixes the earlier device issue.

## Verification

- `npm run check`, **1,691/1,691** full tests and production build pass.
- Twenty-one focused tests include six new lifecycle checks: shallow deferral,
  early preparation/pause/warm return, direct slow arrival, online recovery,
  cancellation and independent shared owners.
- Before/current contracts match all **1,373 colliders**, lights, landmarks,
  **17 render meshes / 85,184 triangles / 3,978,866 geometry bytes**, and resident
  bone matrices at six times. Only three runtime source files change this turn.
- Native Chrome confirms warm reuse without another seven requests, frozen
  elapsed time while paused, direct bottom appearance after network recovery,
  victory's ordinary Visit Refuge control, and exactly-once disposal of 21
  texture/geometry/material objects on switching to Europa. Switching while six
  requests run and one waits leaves all seven assets disposed and unmapped.
- Matching before/after refuge captures were inspected. Accepted buildings,
  residents and plaza remain visually consistent. These are paused observation
  cameras in the populated scene, not ordinary-play performance samples.

Private evidence: `.local/mariana_wrapup_20261025/`, especially `contracts.json`,
`focused.log`, `full_test.log`, `native/report.json`, `native/before.png` and
`native/after.png`. Baseline input fingerprints contain 1,473 files. The frozen
before source is served only through a local test redirect, never publicly.

Two fixture errors are preserved: the first baseline redirect omitted Vite's
query suffix; the next fixture forced a win flag that normal progression
recomputed. The final fixture uses defeated guardians and the victory position,
then clicks the ordinary result control. Initial blank canvas captures occurred
after the drawing buffer had cleared; recapture renders synchronously before
reading. Those discarded images are retained and are not visual evidence.

## Delivery

The existing restricted Cloudflare preview is rebuilt at the same address;
services and the archived old runtime are retained. Entry is `index-CBU1Z_xY.js`.
All **498** files match dist, local restricted service and public origin byte for
byte (**127,555,517 bytes**, including compressed alternatives, not per-play
transfer). All 55 tested private/source paths are denied at both origins.
The tunnel readiness and four original process identities pass. Four production
flows (English 1440 px and Chinese 390 px) pass Guide, Start, ability/sonar,
Pause/Home and same-address reload. All seven refuge image requests remain
absent at shallow entry, with no page/resource errors and no production hook.
The 390 px case is desktop touch emulation, not a physical phone.

The first public-browser attempt encountered `ERR_CONNECTION_CLOSED` through
the machine's existing proxy. A fresh test-browser process using direct access
passes; the OS proxy settings were not changed. The failed proxy report remains
in the evidence directory, alongside the passing direct run.

Input preservation matches 1,466 of the prior 1,473 files exactly. The seven
expected differences are three runtime files and four documents; additions are
this review and the six-test file. Model assets, other maps and gameplay source
remain identical. Final fingerprints and source preservation are in the evidence
directory. Formal Pages/main remains v0.11.17; all Mariana candidates remain
uncommitted on `art/mariana-hf-redraw`.

Original proposal and optional scope: [remaining review](mariana_remaining_scope_review.md).
